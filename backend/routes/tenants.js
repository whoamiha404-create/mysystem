const router = require('express').Router();
const { db } = require('../db/database');
const auth   = require('../middleware/auth');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function withPayments(tenant) {
  if (!tenant) return null;
  const payments = db.prepare(`SELECT * FROM payments WHERE tenant_id = ? ORDER BY id ASC`).all(tenant.id);
  return { ...tenant, payments };
}

function getTenant(id, userId) {
  return db.prepare(`SELECT * FROM tenants WHERE id = ? AND user_id = ?`).get(id, userId);
}

// Generate 12 months from contract_start date
function generateMonths(tenantId, contractStart, rent) {
  if (!contractStart) return;
  const start = new Date(contractStart);
  const startMon = start.getMonth();   // 0-11
  const startYr  = start.getFullYear();

  const existing = db.prepare(`SELECT month FROM payments WHERE tenant_id = ?`).all(tenantId).map(p => p.month);
  const ins = db.prepare(`INSERT OR IGNORE INTO payments (tenant_id, month, status, paid_date, amount) VALUES (?, ?, 'pending', null, ?)`);

  for (let i = 0; i < 12; i++) {
    const mIdx = (startMon + i) % 12;
    const yr   = startYr + Math.floor((startMon + i) / 12);
    const label = MONTHS[mIdx] + ' ' + yr;
    if (!existing.includes(label)) {
      ins.run(tenantId, label, rent || 0);
    }
  }
}

// GET /api/tenants
router.get('/', auth, (req, res) => {
  const tenants = db.prepare(`SELECT * FROM tenants WHERE user_id = ? ORDER BY name ASC`).all(req.user.id);
  res.json(tenants.map(withPayments));
});

// GET /api/tenants/:id
router.get('/:id', auth, (req, res) => {
  const t = getTenant(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tenant not found' });
  res.json(withPayments(t));
});

// POST /api/tenants — create + auto generate 12 months
router.post('/', auth, (req, res) => {
  const { name, phone, apt, location, owner, owner_phone, rent, pay_day, type, contract_start, contract_end, notes } = req.body;
  if (!name || !phone || !apt) return res.status(400).json({ error: 'Name, phone and apartment are required' });

  const result = db.prepare(`
    INSERT INTO tenants (name, phone, apt, location, owner, owner_phone, rent, pay_day, type, contract_start, contract_end, notes, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, apt, location||'', owner||'', owner_phone||'', rent||0, pay_day||1, type||'residential', contract_start||'', contract_end||'', notes||'', req.user.id);

  const id = result.lastInsertRowid;

  // Auto-generate 12 months from contract start
  if (contract_start) generateMonths(id, contract_start, rent||0);

  const tenant = getTenant(id, req.user.id);
  res.status(201).json(withPayments(tenant));
});

// PUT /api/tenants/:id — update + regenerate months if contract changed
router.put('/:id', auth, (req, res) => {
  const { name, phone, apt, location, owner, owner_phone, rent, pay_day, type, contract_start, contract_end, notes, regenerate_months } = req.body;
  const old = getTenant(req.params.id, req.user.id);
  if (!old) return res.status(404).json({ error: 'Tenant not found' });

  db.prepare(`
    UPDATE tenants SET name=?, phone=?, apt=?, location=?, owner=?, owner_phone=?, rent=?, pay_day=?, type=?, contract_start=?, contract_end=?, notes=?
    WHERE id=? AND user_id=?
  `).run(name, phone, apt, location||'', owner||'', owner_phone||'', rent||0, pay_day||1, type||'residential', contract_start||'', contract_end||'', notes||'', req.params.id, req.user.id);

  // If contract_start changed OR regenerate_months flag sent → delete old pending months + generate new
  const contractChanged = contract_start && contract_start !== old.contract_start;
  if (contractChanged || regenerate_months) {
    // Only delete PENDING months (keep paid ones)
    db.prepare(`DELETE FROM payments WHERE tenant_id = ? AND status = 'pending'`).run(req.params.id);
    if (contract_start) generateMonths(req.params.id, contract_start, rent||0);
  }

  res.json(withPayments(getTenant(req.params.id, req.user.id)));
});

// DELETE /api/tenants/:id
router.delete('/:id', auth, (req, res) => {
  const t = getTenant(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tenant not found' });
  db.prepare(`DELETE FROM tenants WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
