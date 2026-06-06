const router = require('express').Router();
const { db } = require('../db/database');
const auth = require('../middleware/auth');

function serialize(row) {
  let values = {};
  try {
    values = JSON.parse(row.values_json || '{}');
  } catch {
    values = {};
  }

  return {
    id: String(row.id),
    kind: row.kind,
    values,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function metaFrom(kind, values) {
  const title = kind === 'sell'
    ? values.firstParty || values.secondParty || values.propertyNumber || 'Sell Contract'
    : values.ownerParty || values.tenantParty || values.propertyNumber || 'Rent Contract';
  const contractDate = values.contractDate || (kind === 'sell'
    ? values.surrenderDate || values.paymentDateLeft || ''
    : values.onDate || values.forDate || values.surrenderDate || '');
  const price = kind === 'sell' ? values.price || '' : values.amount || '';

  return {
    title,
    contractNo: values.contractNo || '',
    contractDate,
    price,
  };
}

router.get('/', auth, (req, res) => {
  const kind = req.query.kind;
  const rows = kind
    ? db.prepare(`SELECT * FROM contracts WHERE kind = ? AND user_id = ? ORDER BY id DESC`).all(kind, req.user.id)
    : db.prepare(`SELECT * FROM contracts WHERE user_id = ? ORDER BY id DESC`).all(req.user.id);
  res.json(rows.map(serialize));
});

router.get('/:id', auth, (req, res) => {
  const row = db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Contract not found' });
  res.json(serialize(row));
});

router.post('/', auth, (req, res) => {
  const { kind, values } = req.body;
  if (!['sell', 'rent'].includes(kind)) return res.status(400).json({ error: 'kind must be sell or rent' });
  if (!values || typeof values !== 'object') return res.status(400).json({ error: 'values required' });

  const meta = metaFrom(kind, values);
  const result = db.prepare(`
    INSERT INTO contracts (kind, title, contract_no, contract_date, price, values_json, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(kind, meta.title, meta.contractNo, meta.contractDate, meta.price, JSON.stringify(values), req.user.id);

  res.status(201).json(serialize(db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(result.lastInsertRowid, req.user.id)));
});

router.put('/:id', auth, (req, res) => {
  const { kind, values } = req.body;
  const existing = db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Contract not found' });
  const nextKind = ['sell', 'rent'].includes(kind) ? kind : existing.kind;
  if (!values || typeof values !== 'object') return res.status(400).json({ error: 'values required' });

  const meta = metaFrom(nextKind, values);
  db.prepare(`
    UPDATE contracts
       SET kind = ?, title = ?, contract_no = ?, contract_date = ?, price = ?,
           values_json = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?
  `).run(nextKind, meta.title, meta.contractNo, meta.contractDate, meta.price, JSON.stringify(values), req.params.id, req.user.id);

  res.json(serialize(db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id)));
});

router.delete('/:id', auth, (req, res) => {
  db.prepare(`DELETE FROM contracts WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
