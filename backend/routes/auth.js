const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db }  = require('../db/database');
const auth    = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'rentpro_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role }
  });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const user = db.prepare(`SELECT id, name, username, role, phone, email FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /api/auth/password
router.put('/password', auth, (req, res) => {
  const { currentPass, newPass, newUser } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPass, user.password))
    return res.status(401).json({ error: 'Current password is incorrect' });

  const updates = {};
  if (newPass) updates.password = bcrypt.hashSync(newPass, 10);
  if (newUser) updates.username = newUser;

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'Nothing to update' });

  if (updates.password && updates.username) {
    db.prepare(`UPDATE users SET password = ?, username = ? WHERE id = ?`)
      .run(updates.password, updates.username, user.id);
  } else if (updates.password) {
    db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(updates.password, user.id);
  } else {
    db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(updates.username, user.id);
  }

  res.json({ ok: true });
});

module.exports = router;
