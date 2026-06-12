const router = require('express').Router();
const { db } = require('../db/database');
const auth = require('../middleware/auth');

function canSeeAll(req) {
  return ['admin', 'developer'].includes(req.user.role);
}

function parseDate(value) {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
}

function parseValues(row) {
  try {
    return JSON.parse(row.values_json || '{}');
  } catch {
    return {};
  }
}

router.get('/pending-contracts', auth, (req, res) => {
  const params = [];
  const where = [
    `NOT EXISTS (
      SELECT 1 FROM profits p
       WHERE p.source IN ('contract', 'contract-print')
         AND (
           p.contract_id = c.id
           OR (
             COALESCE(c.contract_no, '') != ''
             AND p.user_id = c.user_id
             AND p.contract_kind = c.kind
             AND p.contract_no = c.contract_no
           )
         )
    )`,
  ];

  if (!canSeeAll(req)) {
    where.push('c.user_id = ?');
    params.push(req.user.id);
  } else if (req.query.user_id) {
    where.push('c.user_id = ?');
    params.push(req.query.user_id);
  }

  const rows = db.prepare(`
    SELECT c.*, u.name AS user_name, u.username
      FROM contracts c
      LEFT JOIN users u ON u.id = c.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY c.updated_at DESC, c.created_at DESC
  `).all(...params);

  const uniqueRows = [];
  const seen = new Set();
  rows.forEach(row => {
    const key = `${row.user_id}|${row.kind}|${row.contract_no || row.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueRows.push(row);
  });

  res.json(uniqueRows.map(row => ({
    id: row.id,
    kind: row.kind,
    title: row.title || '',
    contractNo: row.contract_no || '',
    contractDate: row.contract_date || '',
    price: row.price || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    userName: row.user_name || row.username || '',
    values: parseValues(row),
  })));
});

router.get('/', auth, (req, res) => {
  const { from = '', to = '', user_id = '' } = req.query;
  const params = [];
  const where = [];

  if (!canSeeAll(req)) {
    where.push('p.user_id = ?');
    params.push(req.user.id);
  } else if (user_id) {
    where.push('p.user_id = ?');
    params.push(user_id);
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate) {
    where.push('date(p.created_at) >= date(?)');
    params.push(fromDate);
  }
  if (toDate) {
    where.push('date(p.created_at) <= date(?)');
    params.push(toDate);
  }

  const sql = `
    SELECT p.*, u.name AS user_name, u.username
      FROM profits p
      LEFT JOIN users u ON u.id = p.user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.created_at DESC
  `;
  const profits = db.prepare(sql).all(...params);

  const expenseParams = [];
  const expenseWhere = [];
  if (!canSeeAll(req)) {
    expenseWhere.push('e.user_id = ?');
    expenseParams.push(req.user.id);
  } else if (user_id) {
    expenseWhere.push('e.user_id = ?');
    expenseParams.push(user_id);
  }
  if (fromDate) {
    expenseWhere.push('date(e.date) >= date(?)');
    expenseParams.push(fromDate);
  }
  if (toDate) {
    expenseWhere.push('date(e.date) <= date(?)');
    expenseParams.push(toDate);
  }
  const expenses = db.prepare(`
    SELECT e.*, u.name AS user_name, u.username
      FROM expenses e
      LEFT JOIN users u ON u.id = e.user_id
     ${expenseWhere.length ? `WHERE ${expenseWhere.join(' AND ')}` : ''}
     ORDER BY e.date DESC
  `).all(...expenseParams);

  res.json({ profits, expenses });
});

router.post('/', auth, (req, res) => {
  const { contractId, contractKind, contractTitle, contractNo, contractDate, amount, currency, notes, source } = req.body;
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) return res.status(400).json({ error: 'Profit amount is invalid' });

  const result = db.prepare(`
    INSERT INTO profits (user_id, contract_id, contract_kind, contract_title, contract_no, contract_date, source, amount, currency, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    contractId || null,
    contractKind || '',
    contractTitle || '',
    contractNo || '',
    contractDate || '',
    source || 'contract',
    numericAmount,
    currency || 'USD',
    notes || ''
  );

  res.status(201).json(db.prepare(`SELECT * FROM profits WHERE id = ?`).get(result.lastInsertRowid));
});

module.exports = router;
