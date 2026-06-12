const router = require('express').Router();
const { db, addLog } = require('../db/database');
const auth = require('../middleware/auth');
const wa = require('../services/whatsapp');

function canSend(req) {
  return ['admin', 'developer'].includes(req.user.role);
}

function agentScope(req) {
  if (req.user.role === 'developer') return db.prepare(`SELECT id, name, username, phone FROM users WHERE role = 'admin' ORDER BY name`).all();
  return db.prepare(`SELECT id, name, username, phone FROM users WHERE role = 'agent' AND created_by = ? ORDER BY name`).all(req.user.id);
}

function rowToNotification(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    senderId: row.sender_id,
    senderName: row.sender_name || '',
    scheduledAt: row.scheduled_at || '',
    sendWhatsapp: !!row.send_whatsapp,
    createdAt: row.created_at,
    readAt: row.read_at || '',
    whatsappSent: !!row.whatsapp_sent,
    whatsappError: row.whatsapp_error || '',
  };
}

async function sendDueNotification(notificationId, senderId) {
  const n = db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(notificationId);
  if (!n || !n.send_whatsapp) return;

  const recipients = db.prepare(`
    SELECT nr.*, u.name, u.phone
      FROM notification_recipients nr
      JOIN users u ON u.id = nr.user_id
     WHERE nr.notification_id = ?
       AND nr.whatsapp_sent = 0
       AND COALESCE(nr.whatsapp_error, '') = ''
  `).all(notificationId);

  wa.start(senderId);
  for (const recipient of recipients) {
    if (!recipient.phone) {
      db.prepare(`UPDATE notification_recipients SET whatsapp_error = ? WHERE notification_id = ? AND user_id = ?`)
        .run('No phone number', notificationId, recipient.user_id);
      continue;
    }
    try {
      await wa.sendMessage(senderId, recipient.phone, `*${n.title}*\n\n${n.message}`);
      db.prepare(`UPDATE notification_recipients SET whatsapp_sent = 1, whatsapp_error = '' WHERE notification_id = ? AND user_id = ?`)
        .run(notificationId, recipient.user_id);
      addLog('success', `Notification WhatsApp sent to ${recipient.name}`, recipient.name, senderId);
    } catch (error) {
      db.prepare(`UPDATE notification_recipients SET whatsapp_error = ? WHERE notification_id = ? AND user_id = ?`)
        .run(error.message || 'WhatsApp failed', notificationId, recipient.user_id);
      addLog('error', `Notification WhatsApp failed for ${recipient.name}: ${error.message}`, recipient.name, senderId);
    }
  }
}

router.get('/agents', auth, (req, res) => {
  if (!canSend(req)) return res.status(403).json({ error: 'Owner only' });
  res.json(agentScope(req));
});

router.get('/unread-count', auth, (req, res) => {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
      FROM notification_recipients
     WHERE user_id = ? AND COALESCE(read_at, '') = ''
  `).get(req.user.id);
  res.json({ count: row.count || 0 });
});

router.get('/', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, nr.read_at, nr.whatsapp_sent, nr.whatsapp_error, u.name AS sender_name
      FROM notification_recipients nr
      JOIN notifications n ON n.id = nr.notification_id
      LEFT JOIN users u ON u.id = n.sender_id
     WHERE nr.user_id = ?
     ORDER BY COALESCE(nr.read_at, '') = '', n.created_at DESC
  `).all(req.user.id);

  const sent = canSend(req)
    ? db.prepare(`
        SELECT n.*, u.name AS sender_name,
               COUNT(nr.user_id) AS recipient_count,
               SUM(CASE WHEN COALESCE(nr.read_at, '') != '' THEN 1 ELSE 0 END) AS read_count
          FROM notifications n
          LEFT JOIN notification_recipients nr ON nr.notification_id = n.id
          LEFT JOIN users u ON u.id = n.sender_id
         WHERE n.sender_id = ?
         GROUP BY n.id
         ORDER BY n.created_at DESC
      `).all(req.user.id)
    : [];

  res.json({
    inbox: rows.map(rowToNotification),
    sent: sent.map(row => ({
      id: row.id,
      title: row.title,
      message: row.message,
      scheduledAt: row.scheduled_at || '',
      sendWhatsapp: !!row.send_whatsapp,
      createdAt: row.created_at,
      recipientCount: row.recipient_count || 0,
      readCount: row.read_count || 0,
    })),
  });
});

router.post('/', auth, async (req, res) => {
  if (!canSend(req)) return res.status(403).json({ error: 'Owner only' });
  const { title, message, targetAll, recipientIds, scheduledAt, sendWhatsapp } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

  const allowed = new Set(agentScope(req).map(user => Number(user.id)));
  const recipients = targetAll
    ? [...allowed]
    : (recipientIds || []).map(Number).filter(id => allowed.has(id));
  if (recipients.length === 0) return res.status(400).json({ error: 'Select at least one person' });

  const normalizedSchedule = scheduledAt ? String(scheduledAt).replace('T', ' ').slice(0, 19) : '';
  const result = db.prepare(`
    INSERT INTO notifications (title, message, sender_id, target_all, scheduled_at, send_whatsapp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, message, req.user.id, targetAll ? 1 : 0, normalizedSchedule, sendWhatsapp ? 1 : 0);

  const insertRecipient = db.prepare(`INSERT OR IGNORE INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`);
  const addRecipients = db.transaction(() => recipients.forEach(id => insertRecipient.run(result.lastInsertRowid, id)));
  addRecipients();

  const shouldSendNow = sendWhatsapp && (!normalizedSchedule || new Date(normalizedSchedule).getTime() <= Date.now());
  if (shouldSendNow) await sendDueNotification(result.lastInsertRowid, req.user.id);

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

router.put('/:id/read', auth, (req, res) => {
  const existing = db.prepare(`SELECT notification_id FROM notification_recipients WHERE notification_id = ? AND user_id = ?`)
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Notification not found' });
  db.prepare(`UPDATE notification_recipients SET read_at = datetime('now') WHERE notification_id = ? AND user_id = ?`)
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

async function processDueNotifications() {
  const due = db.prepare(`
    SELECT n.id, n.sender_id
      FROM notifications n
     WHERE n.send_whatsapp = 1
       AND COALESCE(n.scheduled_at, '') != ''
       AND datetime(n.scheduled_at) <= datetime('now')
       AND EXISTS (
         SELECT 1 FROM notification_recipients nr
          WHERE nr.notification_id = n.id
            AND nr.whatsapp_sent = 0
            AND COALESCE(nr.whatsapp_error, '') = ''
       )
     ORDER BY n.scheduled_at ASC
     LIMIT 20
  `).all();
  for (const item of due) {
    await sendDueNotification(item.id, item.sender_id);
  }
}

module.exports = router;
module.exports.processDueNotifications = processDueNotifications;
