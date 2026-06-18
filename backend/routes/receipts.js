const router = require('express').Router();
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const { createChangeRequest, isManager } = require('./changeRequests');

function paymentOwned(paymentId, userId) {
  if (!paymentId) return null;
  return db.prepare(`
    SELECT p.*
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
     WHERE p.id = ? AND t.user_id = ?
  `).get(paymentId, userId);
}

function tenantOwned(tenantId, userId) {
  if (!tenantId) return null;
  return db.prepare(`SELECT id FROM tenants WHERE id = ? AND user_id = ?`).get(tenantId, userId);
}

// GET /api/receipts
router.get('/', auth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM receipts WHERE user_id = ? ORDER BY id DESC`).all(req.user.id);
  res.json(rows.map(r => ({ ...r, wa_sent: !!r.wa_sent })));
});

// POST /api/receipts
router.post('/', auth, (req, res) => {
  const {
    receipt_no,
    payment_id,
    tenant_id,
    tenant_name,
    tenant_phone,
    apt,
    location,
    property_type,
    owner,
    owner_phone,
    month,
    amount,
    currency,
    paid_date,
    receiver_name,
    instead,
    notes,
    wa_sent,
  } = req.body;

  if (!receipt_no) return res.status(400).json({ error: 'receipt_no required' });
  if (payment_id && !paymentOwned(payment_id, req.user.id)) return res.status(404).json({ error: 'Payment not found' });
  if (tenant_id && !tenantOwned(tenant_id, req.user.id)) return res.status(404).json({ error: 'Tenant not found' });

  const result = db.prepare(`
    INSERT INTO receipts (
      receipt_no, payment_id, tenant_id, tenant_name, tenant_phone, apt, location,
      property_type, owner, owner_phone, month, amount, currency, paid_date, receiver_name, instead, notes, wa_sent, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    receipt_no,
    payment_id || null,
    tenant_id || null,
    tenant_name || '',
    tenant_phone || '',
    apt || '',
    location || '',
    property_type || '',
    owner || '',
    owner_phone || '',
    month || '',
    Number(amount) || 0,
    currency || 'USD',
    paid_date || new Date().toISOString().slice(0, 10),
    receiver_name || '',
    instead || '',
    notes || '',
    wa_sent ? 1 : 0,
    req.user.id
  );

  if (payment_id) {
    db.prepare(`UPDATE payments SET status = 'paid', paid_date = COALESCE(?, paid_date) WHERE id = ?`)
      .run(paid_date || new Date().toISOString().slice(0, 10), payment_id);
  }

  const row = db.prepare(`SELECT * FROM receipts WHERE id = ? AND user_id = ?`).get(result.lastInsertRowid, req.user.id);
  res.status(201).json({ ...row, wa_sent: !!row.wa_sent });
});

// PUT /api/receipts/:id
router.put('/:id', auth, (req, res) => {
  const {
    receipt_no,
    payment_id,
    tenant_id,
    tenant_name,
    tenant_phone,
    apt,
    location,
    property_type,
    owner,
    owner_phone,
    month,
    amount,
    currency,
    paid_date,
    receiver_name,
    instead,
    notes,
    wa_sent,
  } = req.body;

  const existing = db.prepare(`SELECT * FROM receipts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Receipt not found' });
  if (payment_id && !paymentOwned(payment_id, req.user.id)) return res.status(404).json({ error: 'Payment not found' });
  if (tenant_id && !tenantOwned(tenant_id, req.user.id)) return res.status(404).json({ error: 'Tenant not found' });

  db.prepare(`
    UPDATE receipts SET
      receipt_no = ?,
      payment_id = ?,
      tenant_id = ?,
      tenant_name = ?,
      tenant_phone = ?,
      apt = ?,
      location = ?,
      property_type = ?,
      owner = ?,
      owner_phone = ?,
      month = ?,
      amount = ?,
      currency = ?,
      paid_date = ?,
      receiver_name = ?,
      instead = ?,
      notes = ?,
      wa_sent = ?
    WHERE id = ? AND user_id = ?
  `).run(
    receipt_no || existing.receipt_no,
    payment_id ?? existing.payment_id,
    tenant_id ?? existing.tenant_id,
    tenant_name ?? existing.tenant_name,
    tenant_phone ?? existing.tenant_phone,
    apt ?? existing.apt,
    location ?? existing.location,
    property_type ?? existing.property_type,
    owner ?? existing.owner,
    owner_phone ?? existing.owner_phone,
    month ?? existing.month,
    Number(amount) || 0,
    currency ?? existing.currency,
    paid_date ?? existing.paid_date,
    receiver_name ?? existing.receiver_name,
    instead ?? existing.instead,
    notes ?? existing.notes,
    wa_sent ? 1 : 0,
    req.params.id,
    req.user.id
  );

  const row = db.prepare(`SELECT * FROM receipts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!isManager(req.user)) {
    createChangeRequest({
      req,
      targetType: 'receipt',
      targetId: existing.id,
      action: 'edit',
      before: existing,
      after: row,
      title: row.receipt_no || row.tenant_name || `Receipt #${existing.id}`,
      status: 'approved',
    });
  }
  res.json({ ...row, wa_sent: !!row.wa_sent, changeLogged: !isManager(req.user) });
});

// DELETE /api/receipts/:id
router.delete('/:id', auth, (req, res) => {
  const existing = db.prepare(`SELECT * FROM receipts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Receipt not found' });

  if (!isManager(req.user)) {
    const request = createChangeRequest({
      req,
      targetType: 'receipt',
      targetId: existing.id,
      action: 'delete',
      before: existing,
      title: existing.receipt_no || existing.tenant_name || `Receipt #${existing.id}`,
    });
    return res.status(202).json({ ok: true, requiresApproval: true, requestId: request.id });
  }

  db.prepare(`DELETE FROM receipts WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
