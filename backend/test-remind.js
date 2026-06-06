require('dotenv').config();
const { db, getSettings } = require('./db/database');
const wa = require('./services/whatsapp');
wa.start(async () => {
  const s = getSettings();
  const tenants = db.prepare('SELECT * FROM tenants WHERE pay_day = 10').all();
  console.log('Found', tenants.length, 'tenants with pay_day=10');
  for (const t of tenants) {
    const pending = db.prepare('SELECT * FROM payments WHERE tenant_id = ? AND status IN (\'pending\',\'late\') LIMIT 1').get(t.id);
    if (!pending) { console.log('SKIP - no pending:', t.name); continue; }
    const msg = s.msgReminder
      .replace(/{{name}}/g, t.name)
      .replace(/{{apt}}/g, t.apt)
      .replace(/{{rent}}/g, t.rent)
      .replace(/{{currency}}/g, s.currency||'USD')
      .replace(/{{payDay}}/g, t.pay_day)
      .replace(/{{days}}/g, 1);
    try {
      await wa.sendMessage(t.phone, msg);
      console.log('SENT:', t.name, t.phone);
    } catch(e) {
      console.log('FAILED:', t.name, e.message);
    }
  }
  console.log('--- Done ---');
  process.exit(0);
});
