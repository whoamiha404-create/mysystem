const router = require('express').Router();
const { db, getSettings } = require('../db/database');
const auth   = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  res.json(getSettings(req.user.id));
});

router.put('/', auth, (req, res) => {
  const allowed = ['appName','companyName','contractCoordinator','currency','timezone','reminderDays','scheduleHour','msgReminder','msgLate'];
  const upsert  = db.prepare(`
    INSERT INTO user_settings (user_id, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
  `);
  const updates = db.transaction(() => {
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) {
        upsert.run(req.user.id, k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }
  });
  updates();
  res.json(getSettings(req.user.id));
});

module.exports = router;
