const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendPushNotification } = require('../notifications/push');

// Map of userId -> socket.id for real-time routing
const onlineUsers = new Map();

function initSocket(io) {
  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    // Register online presence
    onlineUsers.set(userId, socket.id);
    io.emit('users:online', Array.from(onlineUsers.keys()));

    // --- Location Update ---
    socket.on('location:update', async ({ lat, lng, accuracy }) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      try {
        // Check if user has location sharing enabled
        const userRes = await db.query(
          'SELECT is_sharing_location FROM users WHERE id = $1',
          [userId]
        );
        if (!userRes.rows[0]?.is_sharing_location) return;

        // Upsert location
        await db.query(
          `INSERT INTO user_locations (user_id, location, accuracy, last_seen)
           VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, NOW())
           ON CONFLICT (user_id) DO UPDATE
           SET location = EXCLUDED.location,
               accuracy = EXCLUDED.accuracy,
               last_seen = NOW()`,
          [userId, lng, lat, accuracy || null]
        );

        // Broadcast updated location to all clients
        const userInfoRes = await db.query(
          'SELECT id, name, avatar_url FROM users WHERE id = $1',
          [userId]
        );
        const userInfo = userInfoRes.rows[0];

        io.emit('location:updated', {
          userId,
          name: userInfo.name,
          avatarUrl: userInfo.avatar_url,
          lat,
          lng,
          lastSeen: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Socket] Location update error:', err.message);
      }
    });

    // --- Stop Location Sharing ---
    socket.on('location:stop', async () => {
      try {
        await db.query('UPDATE users SET is_sharing_location = false WHERE id = $1', [userId]);
        await db.query('DELETE FROM user_locations WHERE user_id = $1', [userId]);
        io.emit('location:stopped', { userId });
      } catch (err) {
        console.error('[Socket] Location stop error:', err.message);
      }
    });

    // --- Resume Location Sharing ---
    socket.on('location:resume', async () => {
      try {
        await db.query('UPDATE users SET is_sharing_location = true WHERE id = $1', [userId]);
      } catch (err) {
        console.error('[Socket] Location resume error:', err.message);
      }
    });

    // --- Private Message ---
    socket.on('message:send', async ({ receiverId, content }) => {
      if (!receiverId || !content?.trim()) return;

      try {
        // Save to DB
        const result = await db.query(
          `INSERT INTO messages (sender_id, receiver_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, sender_id, receiver_id, content, read, created_at`,
          [userId, receiverId, content.trim()]
        );
        const message = result.rows[0];

        // Attach sender name
        const senderRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
        message.sender_name = senderRes.rows[0]?.name;

        // Emit to sender
        socket.emit('message:received', message);

        // Emit to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:received', message);
        } else {
          // Send push notification if receiver is offline
          const receiverRes = await db.query(
            'SELECT push_subscription, name FROM users WHERE id = $1',
            [receiverId]
          );
          if (receiverRes.rows[0]?.push_subscription) {
            await sendPushNotification(receiverRes.rows[0].push_subscription, {
              title: `Ny melding fra ${message.sender_name}`,
              body: content.trim().substring(0, 100),
              icon: '/icon-192.png',
              data: { type: 'message', senderId: userId },
            });
          }
        }
      } catch (err) {
        console.error('[Socket] Message send error:', err.message);
        socket.emit('message:error', { error: 'Could not send message' });
      }
    });

    // --- Join chat room (for typing indicators) ---
    socket.on('chat:join', ({ partnerId }) => {
      const room = [userId, partnerId].sort().join('-');
      socket.join(room);
    });

    socket.on('chat:leave', ({ partnerId }) => {
      const room = [userId, partnerId].sort().join('-');
      socket.leave(room);
    });

    socket.on('chat:typing', ({ partnerId, isTyping }) => {
      const room = [userId, partnerId].sort().join('-');
      socket.to(room).emit('chat:typing', { userId, isTyping });
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${userId}`);
      onlineUsers.delete(userId);
      io.emit('users:online', Array.from(onlineUsers.keys()));
    });
  });

  // --- Proximity check job (every 30 seconds) ---
  setInterval(async () => {
    await checkProximity(io);
  }, 30_000);
}

async function checkProximity(io) {
  try {
    // Find pairs of users within 5km that haven't been notified in the last hour
    const result = await db.query(`
      SELECT
        a.user_id AS user_a_id,
        b.user_id AS user_b_id,
        ua.name AS user_a_name,
        ub.name AS user_b_name,
        ua.push_subscription AS sub_a,
        ub.push_subscription AS sub_b
      FROM user_locations a
      JOIN user_locations b ON a.user_id < b.user_id
      JOIN users ua ON ua.id = a.user_id AND ua.is_sharing_location = true
      JOIN users ub ON ub.id = b.user_id AND ub.is_sharing_location = true
      WHERE ST_DWithin(
        a.location::geography,
        b.location::geography,
        5000
      )
      AND a.last_seen > NOW() - INTERVAL '5 minutes'
      AND b.last_seen > NOW() - INTERVAL '5 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM proximity_notifications pn
        WHERE (pn.user_a = a.user_id AND pn.user_b = b.user_id)
           OR (pn.user_a = b.user_id AND pn.user_b = a.user_id)
        AND pn.last_notified_at > NOW() - INTERVAL '1 hour'
      )
    `);

    for (const row of result.rows) {
      const { user_a_id, user_b_id, user_a_name, user_b_name, sub_a, sub_b } = row;

      // Upsert notification record
      await db.query(
        `INSERT INTO proximity_notifications (user_a, user_b, last_notified_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_a, user_b) DO UPDATE SET last_notified_at = NOW()`,
        [user_a_id, user_b_id]
      );

      const notifA = {
        title: 'NearMe — Noen i nærheten!',
        body: `${user_b_name} er i nærheten av deg!`,
        icon: '/icon-192.png',
        data: { type: 'proximity', userId: user_b_id },
      };
      const notifB = {
        title: 'NearMe — Noen i nærheten!',
        body: `${user_a_name} er i nærheten av deg!`,
        icon: '/icon-192.png',
        data: { type: 'proximity', userId: user_a_id },
      };

      // Emit in-app notification
      const socketA = onlineUsers.get(user_a_id);
      const socketB = onlineUsers.get(user_b_id);
      if (socketA) io.to(socketA).emit('proximity:alert', { userId: user_b_id, name: user_b_name });
      if (socketB) io.to(socketB).emit('proximity:alert', { userId: user_a_id, name: user_a_name });

      // Push notifications for offline users
      if (!socketA && sub_a) await sendPushNotification(sub_a, notifA);
      if (!socketB && sub_b) await sendPushNotification(sub_b, notifB);
    }
  } catch (err) {
    console.error('[Proximity] Check error:', err.message);
  }
}

module.exports = { initSocket };
