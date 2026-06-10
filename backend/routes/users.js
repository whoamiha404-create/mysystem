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
  if (req.user.role === 'developer') return 'admin';
  return 'agent';
}

function canTouch(req, target) {
  if (!target) return false;
  if (req.user.role === 'developer') return target.role !== 'developer' || target.id === req.user.id;
  return target.role === 'agent' && Number(target.created_by) === Number(req.user.id);
}

function userStats(userId) {
  const receipts = db.prepare(`SELECT * FROM receipts WHERE user_id = ? ORDER BY id DESC`).all(userId);
  const contracts = db.prepare(`SELECT * FROM contracts WHERE user_id = ? ORDER BY id DESC`).all(userId);
  const logs = db.prepare(`SELECT * FROM logs WHERE user_id = ? ORDER BY id DESC LIMIT 50`).all(userId);
  const expenses = db.prepare(`SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC`).all(userId);
  const payments = db.prepare(`
    SELECT p.*, t.name AS tenant_name, t.apt
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
     WHERE t.user_id = ?
     ORDER BY p.id DESC
  `).all(userId);

  const receiveReceipts = receipts.filter(row => !String(row.receipt_no || '').startsWith('G-'));
  const giveReceipts = receipts.filter(row => String(row.receipt_no || '').startsWith('G-'));
  const sellContracts = contracts.filter(row => row.kind === 'sell');
  const rentContracts = contracts.filter(row => row.kind === 'rent');
  const paidPayments = payments.filter(row => row.status === 'paid');
  const pendingPayments = payments.filter(row => row.status === 'pending');
  const latePayments = payments.filter(row => row.status === 'late');

  return {
    totals: {
      receipts: receiveReceipts.length,
      receiptAmount: receiveReceipts.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      giveReceipts: giveReceipts.length,
      giveAmount: giveReceipts.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      sellContracts: sellContracts.length,
      rentContracts: rentContracts.length,
      expenses: expenses.length,
      expenseAmount: expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      paidPayments: paidPayments.length,
      paidAmount: paidPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      pendingPayments: pendingPayments.length,
      latePayments: latePayments.length,
      activity: logs.length,
    },
    receipts: receipts.map(row => ({ ...row, wa_sent: !!row.wa_sent })),
    contracts: contracts.map(row => {
      let values = {};
      try { values = JSON.parse(row.values_json || '{}'); } catch {}
      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        contract_no: row.contract_no,
        contract_date: row.contract_date,
        price: row.price,
        created_at: row.created_at,
        updated_at: row.updated_at,
        values,
      };
    }),
    expenses,
    payments,
    logs,
  };
}

router.get('/reports', auth, managerOnly, (req, res) => {
  if (req.user.role === 'developer') {
    const admins = db.prepare(`
      SELECT u.*, COUNT(a.id) AS agent_count
        FROM users u
        LEFT JOIN users a ON a.created_by = u.id AND a.role = 'agent'
       WHERE u.role = 'admin'
       GROUP BY u.id
       ORDER BY u.id ASC
    `).all();
    const allUsers = db.prepare(`
      SELECT u.*, creator.name AS creator_name, creator.username AS creator_username
        FROM users u
        LEFT JOIN users creator ON creator.id = u.created_by
       ORDER BY u.role = 'developer' DESC, u.role = 'admin' DESC, u.id ASC
    `).all();
    return res.json({
      role: 'developer',
      admins: admins.map(row => ({ ...safe(row), agent_count: row.agent_count || 0 })),
      allUsers: allUsers.map(row => ({ ...safe(row), creator_name: row.creator_name || '', creator_username: row.creator_username || '' })),
    });
  }

  const agents = db.prepare(`SELECT * FROM users WHERE role = 'agent' AND created_by = ? ORDER BY id ASC`).all(req.user.id);
  res.json({
    role: 'admin',
    agents: agents.map(agent => ({
      ...safe(agent),
      ...userStats(agent.id),
    })),
  });
});

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
