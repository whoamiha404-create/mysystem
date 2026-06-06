const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { db }  = require('../db/database');
const auth    = require('../middleware/auth');

const MANAGER_ROLES = new Set(['developer', 'admin']);
const VALID_ROLES = new Set(['developer', 'admin', 'agent']);

function managerOnly(req, res, next) {
  if (!MANAGER_ROLES.has(req.user.role)) return res.status(403).json({ error: 'Manager only' });
  next();
}

const safe = u => ({ id: u.id, name: u.name, username: u.username, role: u.role, phone: u.phone, email: u.email, created_at: u.created_at, created_by: u.created_by });

function selectableRole(req, requestedRole = 'agent') {
  const role = VALID_ROLES.has(requestedRole) ? requestedRole : 'agent';
  if (role === 'developer') return null;
  if (req.user.role === 'developer') return role;
  return 'agent';
}

function canTouch(req, target) {
  if (!target) return false;
  if (req.user.role === 'developer') return target.role !== 'developer' || target.id === req.user.id;
  return target.role === 'agent' && Number(target.created_by) === Number(req.user.id);
}

router.get('/', auth, managerOnly, (req, res) => {
  const rows = req.user.role === 'developer'
    ? db.prepare(`SELECT * FROM users ORDER BY role = 'developer' DESC, role = 'admin' DESC, id ASC`).all()
    : db.prepare(`SELECT * FROM users WHERE role = 'agent' AND created_by = ? ORDER BY id ASC`).all(req.user.id);
  res.json(rows.map(safe));
});

router.post('/', auth, managerOnly, (req, res) => {
  const { name, username, password, role, phone, email } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Name, username and password required' });
  const nextRole = selectableRole(req, role);
  if (!nextRole) return res.status(403).json({ error: 'Only one developer account is allowed' });

  const exists = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
  if (exists) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`INSERT INTO users (name, username, password, role, phone, email, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(name, username, hash, nextRole, phone || '', email || '', req.user.id);

  res.status(201).json(safe(db.prepare(`SELECT * FROM users WHERE id = ?`).get(result.lastInsertRowid)));
});

router.put('/:id', auth, managerOnly, (req, res) => {
  const { name, username, password, role, phone, email } = req.body;
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (!canTouch(req, u)) return res.status(403).json({ error: 'You cannot edit this user' });
  const nextRole = u.role === 'developer' ? 'developer' : selectableRole(req, role || u.role);
  if (!nextRole) return res.status(403).json({ error: 'Only one developer account is allowed' });

  const newPass = password ? bcrypt.hashSync(password, 10) : u.password;
  db.prepare(`UPDATE users SET name=?, username=?, password=?, role=?, phone=?, email=? WHERE id=?`)
    .run(name || u.name, username || u.username, newPass, nextRole, phone || '', email || '', req.params.id);

  res.json(safe(db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id)));
});

router.delete('/:id', auth, managerOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "Can't delete yourself" });
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (!canTouch(req, u)) return res.status(403).json({ error: 'You cannot delete this user' });
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
