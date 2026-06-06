const router = require('express').Router();
const { db } = require('../db/database');
const auth   = require('../middleware/auth');

function tenantOwned(tenantId, userId) {
  return db.prepare(`SELECT id FROM tenants WHERE id = ? AND user_id = ?`).get(tenantId, userId);
}

function paymentOwned(paymentId, userId) {
  return db.prepare(`
    SELECT p.*
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
     WHERE p.id = ? AND t.user_id = ?
  `).get(paymentId, userId);
}

// GET /api/payments?tenant_id=X
router.get('/', auth, (req, res) => {
  const { tenant_id } = req.query;
  if (tenant_id && !tenantOwned(tenant_id, req.user.id)) return res.status(404).json({ error: 'Tenant not found' });
  const rows = tenant_id
    ? db.prepare(`SELECT * FROM payments WHERE tenant_id = ? ORDER BY id ASC`).all(tenant_id)
    : db.prepare(`
        SELECT p.*, t.name as tenant_name, t.apt
          FROM payments p
          JOIN tenants t ON p.tenant_id = t.id
         WHERE t.user_id = ?
         ORDER BY p.id ASC
      `).all(req.user.id);
  res.json(rows);
});

// POST /api/payments  — add a month
router.post('/', auth, (req, res) => {
  const { tenant_id, month, status, paid_date, amount } = req.body;
  if (!tenant_id || !month) return res.status(400).json({ error: 'tenant_id and month required' });
  if (!tenantOwned(tenant_id, req.user.id)) return res.status(404).json({ error: 'Tenant not found' });

  const existing = db.prepare(`SELECT id FROM payments WHERE tenant_id = ? AND month = ?`).get(tenant_id, month);
  if (existing) return res.status(409).json({ error: 'Payment for this month already exists' });

  const result = db.prepare(`INSERT INTO payments (tenant_id, month, status, paid_date, amount) VALUES (?, ?, ?, ?, ?)`)
    .run(tenant_id, month, status || 'pending', paid_date || null, amount || 0);

  res.status(201).json(db.prepare(`SELECT * FROM payments WHERE id = ?`).get(result.lastInsertRowid));
});

// PUT /api/payments/:id  — toggle status
router.put('/:id', auth, (req, res) => {
  const { status, paid_date } = req.body;
  const p = paymentOwned(req.params.id, req.user.id);
  if (!p) return res.status(404).json({ error: 'Payment not found' });

  db.prepare(`UPDATE payments SET status = ?, paid_date = ? WHERE id = ?`)
    .run(status, status === 'paid' ? (paid_date || new Date().toISOString().slice(0,10)) : null, req.params.id);

  res.json(paymentOwned(req.params.id, req.user.id));
});

// DELETE /api/payments/:id
router.delete('/:id', auth, (req, res) => {
  const p = paymentOwned(req.params.id, req.user.id);
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  db.prepare(`DELETE FROM payments WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
