const router = require('express').Router();
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const { createChangeRequest, isManager } = require('./changeRequests');

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
  const seen = new Set();
  const uniqueRows = rows.filter(row => {
    const key = `${row.user_id}|${row.kind}|${row.contract_no || row.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  res.json(uniqueRows.map(serialize));
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
  if (meta.contractNo) {
    const matches = db.prepare(`
      SELECT * FROM contracts
       WHERE user_id = ? AND kind = ? AND contract_no = ?
       ORDER BY id DESC
    `).all(req.user.id, kind, meta.contractNo);

    if (matches.length) {
      const existing = matches[0];
      db.prepare(`
        UPDATE contracts
           SET title = ?, contract_date = ?, price = ?,
               values_json = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?
      `).run(meta.title, meta.contractDate, meta.price, JSON.stringify(values), existing.id, req.user.id);
      if (matches.length > 1) {
        const duplicateIds = matches.slice(1).map(row => row.id);
        const placeholders = duplicateIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM contracts WHERE id IN (${placeholders}) AND user_id = ?`).run(...duplicateIds, req.user.id);
      }

      return res.json(serialize(db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(existing.id, req.user.id)));
    }
  }

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
  if (!isManager(req.user)) {
    const after = {
      ...existing,
      kind: nextKind,
      title: meta.title,
      contract_no: meta.contractNo,
      contract_date: meta.contractDate,
      price: meta.price,
      values_json: JSON.stringify(values),
    };
    db.prepare(`
      UPDATE contracts
         SET kind = ?, title = ?, contract_no = ?, contract_date = ?, price = ?,
             values_json = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?
    `).run(nextKind, meta.title, meta.contractNo, meta.contractDate, meta.price, JSON.stringify(values), req.params.id, req.user.id);
    createChangeRequest({
      req,
      targetType: 'contract',
      targetId: existing.id,
      action: 'edit',
      before: existing,
      after,
      title: meta.title || existing.title || existing.contract_no || `Contract #${existing.id}`,
      status: 'approved',
    });
    return res.json({ ...serialize(db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id)), changeLogged: true });
  }

  db.prepare(`
    UPDATE contracts
       SET kind = ?, title = ?, contract_no = ?, contract_date = ?, price = ?,
           values_json = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?
  `).run(nextKind, meta.title, meta.contractNo, meta.contractDate, meta.price, JSON.stringify(values), req.params.id, req.user.id);

  res.json(serialize(db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id)));
});

router.delete('/:id', auth, (req, res) => {
  const existing = db.prepare(`SELECT * FROM contracts WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Contract not found' });

  if (!isManager(req.user)) {
    const request = createChangeRequest({
      req,
      targetType: 'contract',
      targetId: existing.id,
      action: 'delete',
      before: existing,
      title: existing.title || existing.contract_no || `Contract #${existing.id}`,
    });
    return res.status(202).json({ ok: true, requiresApproval: true, requestId: request.id });
  }

  if (existing.contract_no) {
    db.prepare(`
      DELETE FROM contracts
       WHERE user_id = ? AND kind = ? AND contract_no = ?
    `).run(existing.user_id, existing.kind, existing.contract_no);
  } else {
    db.prepare(`DELETE FROM contracts WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id);
  }
  res.json({ ok: true });
});

module.exports = router;
