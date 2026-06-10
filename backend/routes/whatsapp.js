const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { db, getSettings, addLog } = require('../db/database');
const wa      = require('../services/whatsapp');
const auth    = require('../middleware/auth');

const RENEWAL_DEFAULT_MESSAGE = `سڵاو {{name}}، بەرواری نوێکردنەوەی گرێبەستی کرێ بۆ {{apt}} نزیکە. کۆتایی گرێبەست: {{contractEnd}} ({{days}} ڕۆژ ماوە). تکایە بۆ نوێکردنەوە و پارەدانی تێچووی نوێکردنەوە/باج سەردانمان بکە. {{company}}`;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateText) {
  if (!dateText) return null;
  const target = new Date(dateText);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((startOfDay(target) - startOfDay()) / 86400000);
}

function applyTemplate(template, values) {
  return String(template || '').replace(/{{(\w+)}}/g, (_, key) => values[key] ?? '');
}

function renewalMessage(tenant, settings, days) {
  return applyTemplate(settings.msgRenewal || RENEWAL_DEFAULT_MESSAGE, {
    name: tenant.name,
    apt: tenant.apt,
    rent: tenant.rent,
    currency: settings.currency || 'USD',
    payDay: tenant.pay_day,
    contractStart: tenant.contract_start || '',
    contractEnd: tenant.contract_end || '',
    days,
    company: settings.companyName || settings.appName || '',
  });
}

function getRenewalWindow(settings, bodyDays) {
  if (Number.isFinite(Number(bodyDays))) return Math.max(0, Number(bodyDays));
  try {
    const days = JSON.parse(settings.renewalReminderDays || '[]').map(Number).filter(Number.isFinite);
    return days.length ? Math.max(...days) : 7;
  } catch {
    return 7;
  }
}

// ── Multer setup — save template image ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, wa.uploadDirFor(req.user.id)),
  filename: (req, file, cb) => {
    const uploadsDir = wa.uploadDirFor(req.user.id);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    // Delete old image first
    for (const e of ['jpg','jpeg','png','webp']) {
      const old = path.join(uploadsDir, 'wa-template-image.' + e);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    cb(null, 'wa-template-image' + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// GET /api/whatsapp/status
router.get('/status', auth, (req, res) => {
  wa.start(req.user.id);
  res.json(wa.getStatus(req.user.id));
});

// GET /api/whatsapp/image — serve the template image
router.get('/image', auth, (req, res) => {
  const imgPath = wa.getTemplateImagePath(req.user.id);
  if (!imgPath) return res.status(404).json({ error: 'No image set' });
  res.sendFile(imgPath);
});

// POST /api/whatsapp/image — upload template image
router.post('/image', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ ok: true, filename: req.file.filename });
});

// DELETE /api/whatsapp/image — remove template image
router.delete('/image', auth, (req, res) => {
  const uploadsDir = wa.uploadDirFor(req.user.id);
  for (const e of ['jpg','jpeg','png','webp']) {
    const p = path.join(uploadsDir, 'wa-template-image.' + e);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  res.json({ ok: true });
});

// POST /api/whatsapp/send
router.post('/send', auth, async (req, res) => {
  const { phone, message, withImage } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
  try {
    await wa.sendMessage(req.user.id, phone, message, withImage);
    addLog('success', `Message sent to ${phone}`, '', req.user.id);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/whatsapp/remind/:tenantId
router.post('/remind/:tenantId', auth, async (req, res) => {
  const t = db.prepare(`SELECT * FROM tenants WHERE id = ? AND user_id = ?`).get(req.params.tenantId, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tenant not found' });
  const s = getSettings(req.user.id);
  const withImage = req.body.withImage !== false; // default true if image exists

  const pending = db.prepare(`SELECT * FROM payments WHERE tenant_id = ? AND status IN ('pending','late') ORDER BY id DESC LIMIT 1`).get(t.id);
  const isLate  = pending && pending.status === 'late';
  const template = isLate ? s.msgLate : s.msgReminder;

  const msg = template
    .replace(/{{name}}/g,     t.name)
    .replace(/{{apt}}/g,      t.apt)
    .replace(/{{rent}}/g,     t.rent)
    .replace(/{{currency}}/g, s.currency || 'USD')
    .replace(/{{payDay}}/g,   t.pay_day)
    .replace(/{{days}}/g,     '—')
    .replace(/{{count}}/g,    '1');

  try {
    await wa.sendMessage(req.user.id, t.phone, msg, withImage);
    addLog('success', `Reminder sent to ${t.name}`, t.name, req.user.id);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/whatsapp/remind-all
router.post('/remind-all', auth, async (req, res) => {
  const tenants = db.prepare(`
    SELECT DISTINCT t.* FROM tenants t
    JOIN payments p ON p.tenant_id = t.id
    WHERE p.status IN ('pending','late') AND t.user_id = ?
  `).all(req.user.id);

  const s = getSettings(req.user.id);
  const withImage = req.body.withImage !== false;
  const results = [];

  for (const t of tenants) {
    try {
      const msg = s.msgReminder
        .replace(/{{name}}/g,     t.name)
        .replace(/{{apt}}/g,      t.apt)
        .replace(/{{rent}}/g,     t.rent)
        .replace(/{{currency}}/g, s.currency || 'USD')
        .replace(/{{payDay}}/g,   t.pay_day)
        .replace(/{{days}}/g,     '—')
        .replace(/{{count}}/g,    '1');
      await wa.sendMessage(req.user.id, t.phone, msg, withImage);
      results.push({ name: t.name, ok: true });
      addLog('success', `Bulk reminder sent to ${t.name}`, t.name, req.user.id);
    } catch(e) {
      results.push({ name: t.name, error: e.message });
    }
  }

  res.json({ results });
});

// POST /api/whatsapp/renewal/:tenantId
router.post('/renewal/:tenantId', auth, async (req, res) => {
  const t = db.prepare(`SELECT * FROM tenants WHERE id = ? AND user_id = ?`).get(req.params.tenantId, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tenant not found' });
  if (!t.phone) return res.status(400).json({ error: 'Tenant phone is missing' });
  if (!t.contract_end) return res.status(400).json({ error: 'Contract end date is missing' });

  const settings = getSettings(req.user.id);
  const days = daysUntil(t.contract_end);
  const withImage = req.body.withImage === true;
  const msg = renewalMessage(t, settings, days ?? '');

  try {
    await wa.sendMessage(req.user.id, t.phone, msg, withImage);
    addLog('success', `Renewal reminder sent to ${t.name}`, t.name, req.user.id);
    res.json({ ok: true, days });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/whatsapp/renewal-all
router.post('/renewal-all', auth, async (req, res) => {
  const settings = getSettings(req.user.id);
  const windowDays = getRenewalWindow(settings, req.body.days);
  const withImage = req.body.withImage === true;
  const tenants = db.prepare(`SELECT * FROM tenants WHERE user_id = ? AND contract_end <> '' ORDER BY contract_end ASC`).all(req.user.id);
  const results = [];

  for (const t of tenants) {
    const days = daysUntil(t.contract_end);
    if (days === null || days < 0 || days > windowDays) continue;
    try {
      await wa.sendMessage(req.user.id, t.phone, renewalMessage(t, settings, days), withImage);
      results.push({ id: t.id, name: t.name, ok: true, days });
      addLog('success', `Bulk renewal reminder sent to ${t.name}`, t.name, req.user.id);
    } catch(e) {
      results.push({ id: t.id, name: t.name, error: e.message, days });
    }
  }

  res.json({ results });
});

module.exports = router;
