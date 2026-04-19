const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:userId — fetch conversation history between logged-in user and :userId
router.get('/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const myId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await db.query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.read, m.created_at,
              s.name AS sender_name, r.name AS receiver_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.receiver_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [myId, userId, limit, offset]
    );

    // Mark received messages as read
    await db.query(
      `UPDATE messages SET read = true
       WHERE receiver_id = $1 AND sender_id = $2 AND read = false`,
      [myId, userId]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages — list of conversations (unique partner users)
router.get('/', authMiddleware, async (req, res) => {
  const myId = req.user.id;
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (partner_id)
              partner_id,
              partner_name,
              last_message,
              last_at,
              unread_count
       FROM (
         SELECT
           CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
           CASE WHEN m.sender_id = $1 THEN r.name ELSE s.name END AS partner_name,
           m.content AS last_message,
           m.created_at AS last_at,
           (SELECT COUNT(*) FROM messages
            WHERE receiver_id = $1
            AND sender_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
            AND read = false) AS unread_count
         FROM messages m
         JOIN users s ON s.id = m.sender_id
         JOIN users r ON r.id = m.receiver_id
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         ORDER BY m.created_at DESC
       ) sub
       ORDER BY partner_id, last_at DESC`,
      [myId]
    );
    res.json({ conversations: result.rows });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
