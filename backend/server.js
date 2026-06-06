require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { db, getSettings, addLog } = require('./db/database');
const wa = require('./services/whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/logs', require('./routes/logs'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}

function scheduleCron() {
  cron.schedule('0 * * * *', async () => {
    console.log('Running daily reminder check...');
    const users = db.prepare(`SELECT id FROM users`).all();
    const today = new Date();
    const todayDay = today.getDate();
    const currentHour = today.getHours();

    for (const user of users) {
      const settings = getSettings(user.id);
      const hour = parseInt(settings.scheduleHour, 10) || 9;
      if (hour !== currentHour) continue;

      wa.start(user.id);
      const tenants = db.prepare(`SELECT * FROM tenants WHERE user_id = ?`).all(user.id);

      for (const tenant of tenants) {
        const payDay = parseInt(tenant.pay_day, 10) || 1;
        const diff = payDay - todayDay;

        if (diff === 1) {
          const pending = db.prepare(
            `SELECT * FROM payments WHERE tenant_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1`
          ).get(tenant.id);
          if (!pending) continue;

          const msg = (settings.msgReminder || 'Hi {{name}}, your rent of {{rent}} {{currency}} is due tomorrow (day {{payDay}}). Please prepare payment for {{apt}}.')
            .replace(/{{name}}/g, tenant.name)
            .replace(/{{apt}}/g, tenant.apt)
            .replace(/{{rent}}/g, tenant.rent)
            .replace(/{{currency}}/g, settings.currency || 'USD')
            .replace(/{{payDay}}/g, payDay)
            .replace(/{{days}}/g, 1);

          try {
            await wa.sendMessage(user.id, tenant.phone, msg);
            addLog('success', `Reminder (1 day before) sent to ${tenant.name}`, tenant.name, user.id);
          } catch (e) {
            addLog('error', `Failed reminder for ${tenant.name}: ${e.message}`, tenant.name, user.id);
          }
        }

        if (diff === -1) {
          const pending = db.prepare(
            `SELECT * FROM payments WHERE tenant_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1`
          ).get(tenant.id);
          if (!pending) continue;

          db.prepare(`UPDATE payments SET status = 'late' WHERE id = ?`).run(pending.id);

          const msg = (settings.msgLate || 'Hi {{name}}, your rent of {{rent}} {{currency}} for {{apt}} was due yesterday. Please pay as soon as possible.')
            .replace(/{{name}}/g, tenant.name)
            .replace(/{{apt}}/g, tenant.apt)
            .replace(/{{rent}}/g, tenant.rent)
            .replace(/{{currency}}/g, settings.currency || 'USD')
            .replace(/{{payDay}}/g, payDay);

          try {
            await wa.sendMessage(user.id, tenant.phone, msg);
            addLog('success', `Late alert sent to ${tenant.name}`, tenant.name, user.id);
          } catch (e) {
            addLog('error', `Failed late alert for ${tenant.name}: ${e.message}`, tenant.name, user.id);
          }
        }
      }
    }
  }, { timezone: process.env.TIMEZONE || 'Asia/Baghdad' });
}

app.listen(PORT, () => {
  console.log(`\nRentPro API running on http://localhost:${PORT}\n`);
  scheduleCron();
});
