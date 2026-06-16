const router = require('express').Router();
const { db, addLog } = require('../db/database');
const auth = require('../middleware/auth');

const TARGETS = {
  profit: {
    table: 'profits',
    ownerColumn: 'user_id',
    title: row => row.contract_title || row.contract_no || `Profit #${row.id}`,
    applyEdit: (id, next) => {
      db.prepare(`
        UPDATE profits
           SET amount = ?, currency = ?, notes = ?
         WHERE id = ?
      `).run(Number(next.amount || 0), next.currency || 'USD', next.notes || '', id);
    },
  },
  contract: {
    table: 'contracts',
    ownerColumn: 'user_id',
    title: row => row.title || row.contract_no || `Contract #${row.id}`,
    applyEdit: (id, next) => {
      db.prepare(`
        UPDATE contracts
           SET kind = ?, title = ?, contract_no = ?, contract_date = ?, price = ?,
               values_json = ?, updated_at = datetime('now')
         WHERE id = ?
      `).run(
        next.kind,
        next.title || '',
        next.contract_no || '',
        next.contract_date || '',
        next.price || '',
        next.values_json || '{}',
        id
      );
    },
  },
  receipt: {
    table: 'receipts',
    ownerColumn: 'user_id',
    title: row => row.receipt_no || row.tenant_name || `Receipt #${row.id}`,
    applyEdit: (id, next) => {
      db.prepare(`
        UPDATE receipts SET
          receipt_no = ?, payment_id = ?, tenant_id = ?, tenant_name = ?, tenant_phone = ?,
          apt = ?, location = ?, owner = ?, owner_phone = ?, month = ?, amount = ?,
          currency = ?, paid_date = ?, receiver_name = ?, instead = ?, notes = ?, wa_sent = ?
        WHERE id = ?
      `).run(
        next.receipt_no || '',
        next.payment_id || null,
        next.tenant_id || null,
        next.tenant_name || '',
        next.tenant_phone || '',
        next.apt || '',
        next.location || '',
        next.owner || '',
        next.owner_phone || '',
        next.month || '',
        Number(next.amount || 0),
        next.currency || 'USD',
        next.paid_date || '',
        next.receiver_name || '',
        next.instead || '',
        next.notes || '',
        next.wa_sent ? 1 : 0,
        id
      );
    },
  },
};

function isManager(user) {
  return ['admin', 'developer'].includes(user.role);
}

function getTargetConfig(type) {
  const config = TARGETS[type];
  if (!config) throw new Error('Unsupported change request type');
  return config;
}

function findTarget(type, id, userId = null) {
  const config = getTargetConfig(type);
  const where = userId ? `WHERE id = ? AND ${config.ownerColumn} = ?` : 'WHERE id = ?';
  const params = userId ? [id, userId] : [id];
  return db.prepare(`SELECT * FROM ${config.table} ${where}`).get(...params);
}

function createChangeRequest({ req, targetType, targetId, action, before, after = null, title = '', status = 'pending' }) {
  const ownerId = req.user.created_by || before?.user_id || null;
  const isPending = status === 'pending';
  const duplicate = isPending ? db.prepare(`
    SELECT id FROM change_requests
     WHERE requester_id = ? AND target_type = ? AND target_id = ? AND action = ? AND status = 'pending'
     ORDER BY id DESC LIMIT 1
  `).get(req.user.id, targetType, targetId, action) : null;

  if (duplicate) return { id: duplicate.id, duplicate: true };

  const result = db.prepare(`
    INSERT INTO change_requests
      (requester_id, owner_id, target_type, target_id, action, status, title, before_json, after_json, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    ownerId,
    targetType,
    targetId,
    action,
    status,
    title,
    JSON.stringify(before || {}),
    after ? JSON.stringify(after) : '',
    isPending ? '' : new Date().toISOString()
  );

  addLog('info', `${isPending ? 'Change request created' : 'Change logged'}: ${action} ${targetType} #${targetId}`, title, req.user.id);
  return { id: result.lastInsertRowid, duplicate: false };
}

function serialize(row) {
  let before = {};
  let after = {};
  try { before = JSON.parse(row.before_json || '{}'); } catch {}
  try { after = JSON.parse(row.after_json || '{}'); } catch {}
  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: row.requester_name || row.requester_username || '',
    ownerId: row.owner_id,
    targetType: row.target_type,
    targetId: row.target_id,
    action: row.action,
    status: row.status,
    title: row.title || '',
    before,
    after,
    reviewedBy: row.reviewer_name || '',
    reviewedAt: row.reviewed_at || '',
    createdAt: row.created_at,
  };
}

router.get('/', auth, (req, res) => {
  const status = req.query.status || 'pending';
  const params = [];
  const where = [];

  if (status !== 'all') {
    where.push('cr.status = ?');
    params.push(status);
  }

  if (req.user.role === 'admin') {
    where.push('(cr.owner_id = ? OR requester.created_by = ?)');
    params.push(req.user.id, req.user.id);
  } else if (req.user.role === 'developer') {
    // Developer sees all requests.
  } else {
    where.push('cr.requester_id = ?');
    params.push(req.user.id);
  }

  const rows = db.prepare(`
    SELECT cr.*, requester.name AS requester_name, requester.username AS requester_username,
           reviewer.name AS reviewer_name
      FROM change_requests cr
      LEFT JOIN users requester ON requester.id = cr.requester_id
      LEFT JOIN users reviewer ON reviewer.id = cr.reviewed_by
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY cr.created_at DESC
  `).all(...params);
  res.json(rows.map(serialize));
});

router.get('/pending-count', auth, (req, res) => {
  if (!isManager(req.user)) return res.json({ count: 0 });
  const params = [];
  const where = [`cr.status = 'pending'`, `cr.action = 'delete'`];
  if (req.user.role === 'admin') {
    where.push('(cr.owner_id = ? OR requester.created_by = ?)');
    params.push(req.user.id, req.user.id);
  }
  const row = db.prepare(`
    SELECT COUNT(*) AS count
      FROM change_requests cr
      LEFT JOIN users requester ON requester.id = cr.requester_id
     WHERE ${where.join(' AND ')}
  `).get(...params);
  res.json({ count: row.count || 0 });
});

router.post('/:id/approve', auth, (req, res) => {
  if (!isManager(req.user)) return res.status(403).json({ error: 'Manager only' });
  const request = db.prepare(`SELECT * FROM change_requests WHERE id = ? AND status = 'pending'`).get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Change request not found' });
  if (req.user.role === 'admin' && Number(request.owner_id) !== Number(req.user.id)) {
    const requester = db.prepare(`SELECT created_by FROM users WHERE id = ?`).get(request.requester_id);
    if (Number(requester?.created_by) !== Number(req.user.id)) return res.status(403).json({ error: 'Not your agent request' });
  }

  const config = getTargetConfig(request.target_type);
  const current = findTarget(request.target_type, request.target_id);
  if (!current) return res.status(404).json({ error: 'Target record not found' });

  if (request.action === 'delete') {
    if (request.target_type === 'contract' && current.contract_no) {
      db.prepare(`
        DELETE FROM contracts
         WHERE id = ?
            OR (user_id = ? AND kind = ? AND contract_no = ?)
      `).run(request.target_id, current.user_id, current.kind, current.contract_no);
    } else {
      db.prepare(`DELETE FROM ${config.table} WHERE id = ?`).run(request.target_id);
    }
    db.prepare(`
      UPDATE change_requests
         SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now')
       WHERE status = 'pending'
         AND target_type = ?
         AND target_id = ?
         AND action = 'delete'
    `).run(req.user.id, request.target_type, request.target_id);
  } else {
    let after = {};
    try { after = JSON.parse(request.after_json || '{}'); } catch {}
    config.applyEdit(request.target_id, after);
    db.prepare(`
      UPDATE change_requests
         SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now')
       WHERE id = ?
    `).run(req.user.id, request.id);
  }
  addLog('success', `Change request approved: ${request.action} ${request.target_type} #${request.target_id}`, request.title, request.requester_id);
  res.json({ ok: true });
});

router.post('/:id/reject', auth, (req, res) => {
  if (!isManager(req.user)) return res.status(403).json({ error: 'Manager only' });
  const request = db.prepare(`SELECT * FROM change_requests WHERE id = ? AND status = 'pending'`).get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Change request not found' });
  if (req.user.role === 'admin' && Number(request.owner_id) !== Number(req.user.id)) {
    const requester = db.prepare(`SELECT created_by FROM users WHERE id = ?`).get(request.requester_id);
    if (Number(requester?.created_by) !== Number(req.user.id)) return res.status(403).json({ error: 'Not your agent request' });
  }

  db.prepare(`
    UPDATE change_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now')
     WHERE id = ?
  `).run(req.user.id, request.id);
  addLog('info', `Change request rejected: ${request.action} ${request.target_type} #${request.target_id}`, request.title, request.requester_id);
  res.json({ ok: true });
});

module.exports = {
  router,
  createChangeRequest,
  findTarget,
  isManager,
};
