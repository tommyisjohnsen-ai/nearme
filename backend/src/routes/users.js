const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/users — all users with their current location (if sharing)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.avatar_url, u.is_sharing_location,
              ST_X(ul.location::geometry) AS lng,
              ST_Y(ul.location::geometry) AS lat,
              ul.last_seen
       FROM users u
       LEFT JOIN user_locations ul ON ul.user_id = u.id
       WHERE u.id != $1
       ORDER BY u.name`,
      [req.user.id]
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/push-subscription — save Web Push subscription
router.post('/push-subscription', authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  try {
    await db.query('UPDATE users SET push_subscription = $1 WHERE id = $2', [
      JSON.stringify(subscription),
      req.user.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
