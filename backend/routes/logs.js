const router = require('express').Router();
const { db } = require('../db/database');
const auth   = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  if (req.query.all === '1' && req.user.role === 'developer') {
    return res.json(db.prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT ?`).all(limit));
  }
  if (req.query.all === '1' && req.user.role === 'admin') {
    return res.json(db.prepare(`
      SELECT l.*
        FROM logs l
        LEFT JOIN users u ON u.id = l.user_id
       WHERE l.user_id = ? OR u.created_by = ?
       ORDER BY l.id DESC
       LIMIT ?
    `).all(req.user.id, req.user.id, limit));
  }
  res.json(db.prepare(`SELECT * FROM logs WHERE user_id = ? ORDER BY id DESC LIMIT ?`).all(req.user.id, limit));
});

router.delete('/', auth, (req, res) => {
  db.prepare(`DELETE FROM logs WHERE user_id = ?`).run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
