const router = require('express').Router();
const { db } = require('../db/database');
const auth   = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  res.json(db.prepare(`SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC`).all(req.user.id));
});

router.post('/', auth, (req, res) => {
  const { date, description, category, property, amount } = req.body;
  if (!date || !description || !amount) return res.status(400).json({ error: 'Date, description and amount required' });

  const result = db.prepare(`INSERT INTO expenses (date, description, category, property, amount, user_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(date, description, category || 'maintenance', property || '', amount, req.user.id);

  res.status(201).json(db.prepare(`SELECT * FROM expenses WHERE id = ? AND user_id = ?`).get(result.lastInsertRowid, req.user.id));
});

router.put('/:id', auth, (req, res) => {
  const { date, description, category, property, amount } = req.body;
  const e = db.prepare(`SELECT id FROM expenses WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!e) return res.status(404).json({ error: 'Expense not found' });

  db.prepare(`UPDATE expenses SET date=?, description=?, category=?, property=?, amount=? WHERE id=? AND user_id=?`)
    .run(date, description, category, property, amount, req.params.id, req.user.id);

  res.json(db.prepare(`SELECT * FROM expenses WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id));
});

router.delete('/:id', auth, (req, res) => {
  db.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
