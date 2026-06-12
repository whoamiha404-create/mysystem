const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const bcrypt   = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rentpro.db');

// Ensure directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key     TEXT NOT NULL,
    value   TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'agent',
    phone      TEXT DEFAULT '',
    email      TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    apt        TEXT NOT NULL,
    location   TEXT DEFAULT '',
    owner      TEXT DEFAULT '',
    owner_phone TEXT DEFAULT '',
    rent       REAL NOT NULL DEFAULT 0,
    pay_day    INTEGER NOT NULL DEFAULT 1,
    type       TEXT NOT NULL DEFAULT 'residential',
    contract_start TEXT DEFAULT '',
    contract_end   TEXT DEFAULT '',
    notes      TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id  INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    month      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    paid_date  TEXT,
    amount     REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'maintenance',
    property    TEXT DEFAULT '',
    amount      REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS logs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    type    TEXT NOT NULL,
    message TEXT NOT NULL,
    name    TEXT DEFAULT '',
    time    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no    TEXT NOT NULL,
    payment_id    INTEGER,
    tenant_id     INTEGER,
    tenant_name   TEXT DEFAULT '',
    tenant_phone  TEXT DEFAULT '',
    apt           TEXT DEFAULT '',
    location      TEXT DEFAULT '',
    owner         TEXT DEFAULT '',
    owner_phone   TEXT DEFAULT '',
    month         TEXT DEFAULT '',
    amount        REAL NOT NULL DEFAULT 0,
    currency      TEXT DEFAULT 'USD',
    paid_date     TEXT DEFAULT '',
    receiver_name TEXT DEFAULT '',
    instead       TEXT DEFAULT '',
    notes         TEXT DEFAULT '',
    wa_sent       INTEGER NOT NULL DEFAULT 0,
    printed_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT NOT NULL CHECK (kind IN ('sell', 'rent')),
    title       TEXT DEFAULT '',
    contract_no TEXT DEFAULT '',
    contract_date TEXT DEFAULT '',
    price       TEXT DEFAULT '',
    values_json TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    sender_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_all    INTEGER NOT NULL DEFAULT 0,
    scheduled_at  TEXT DEFAULT '',
    send_whatsapp INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_recipients (
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at         TEXT DEFAULT '',
    whatsapp_sent   INTEGER NOT NULL DEFAULT 0,
    whatsapp_error  TEXT DEFAULT '',
    PRIMARY KEY (notification_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS profits (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    contract_id   INTEGER,
    contract_kind TEXT DEFAULT '',
    contract_title TEXT DEFAULT '',
    contract_no   TEXT DEFAULT '',
    contract_date TEXT DEFAULT '',
    source        TEXT DEFAULT 'contract',
    amount        REAL NOT NULL DEFAULT 0,
    currency      TEXT DEFAULT 'USD',
    notes         TEXT DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
  if (!columns.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

ensureColumn('receipts', 'instead', "TEXT DEFAULT ''");
ensureColumn('tenants', 'user_id', 'INTEGER');
ensureColumn('expenses', 'user_id', 'INTEGER');
ensureColumn('receipts', 'user_id', 'INTEGER');
ensureColumn('contracts', 'user_id', 'INTEGER');
ensureColumn('logs', 'user_id', 'INTEGER');
ensureColumn('users', 'created_by', 'INTEGER');

// ── Seed default settings ────────────────────────────────────────────
function setSetting(key, value) {
  db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(key, value);
}

setSetting('appName',      'RentPro');
setSetting('companyName',  '');
setSetting('contractCoordinator', '');
setSetting('currency',     process.env.CURRENCY  || 'USD');
setSetting('timezone',     process.env.TIMEZONE  || 'Asia/Baghdad');
setSetting('reminderDays', JSON.stringify([5, 3, 1]));
setSetting('renewalReminderDays', JSON.stringify([5, 3, 1]));
setSetting('scheduleHour', '9');
setSetting('msgReminder',  `🏠 *Rent Reminder*\n\nHello *{{name}}*,\n\nYour rent of *{{currency}}{{rent}}* for *{{apt}}* is due in *{{days}} day(s)* (on the *{{payDay}}* of this month).\n\nPlease pay on time.\n\nThank you! 🙏`);
setSetting('msgLate',      `⚠️ *Late Payment Alert*\n\nHello *{{name}}*,\n\nYou have *{{count}} overdue payment(s)* for *{{apt}}*.\n\nMonthly rent: *{{currency}}{{rent}}*\n\nPlease contact us immediately.\n\nThank you! 🙏`);
setSetting('msgRenewal',   `سڵاو {{name}}، بەرواری نوێکردنەوەی گرێبەستی کرێ بۆ {{apt}} نزیکە. کۆتایی گرێبەست: {{contractEnd}} ({{days}} ڕۆژ ماوە). تکایە بۆ نوێکردنەوە و پارەدانی تێچووی نوێکردنەوە/باج سەردانمان بکە. {{company}}`);

// ── Seed admin user ──────────────────────────────────────────────────
const developerExists = db.prepare(`SELECT id FROM users WHERE role = 'developer' LIMIT 1`).get();
if (!developerExists) {
  const hash = bcrypt.hashSync(process.env.DEVELOPER_PASS || 'developer123', 10);
  db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, 'developer')`)
    .run('Developer', process.env.DEVELOPER_USER || 'developer', hash);
}

const legacyOwner = db.prepare(`SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`).get();
if (legacyOwner) {
  const migrateLegacy = db.transaction(() => {
    for (const table of ['tenants', 'expenses', 'receipts', 'contracts', 'logs']) {
      db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(legacyOwner.id);
    }
    db.prepare(`UPDATE users SET created_by = ? WHERE role = 'agent' AND created_by IS NULL`).run(legacyOwner.id);
  });
  migrateLegacy();
}

// ── Seed demo tenants ────────────────────────────────────────────────
/*const tenantCount = db.prepare(`SELECT COUNT(*) as c FROM tenants`).get().c;
if (tenantCount === 0) {
  const insert  = db.prepare(`INSERT INTO tenants (name, phone, apt, location, owner, owner_phone, rent, pay_day, type, contract_start, contract_end, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const payIns  = db.prepare(`INSERT INTO payments (tenant_id, month, status, paid_date, amount) VALUES (?, ?, ?, ?, ?)`);

  const t1 = insert.run('Ahmed Al-Rashid',  '9647701234567', 'Apt 4B - Babylon Tower',    'Baghdad, Al-Mansour', 'Khalid Hassan',    '9647509876543', 850,  15, 'residential', '2024-01-15', '2024-12-15', 'Good tenant, always communicates early.').lastInsertRowid;
  const t2 = insert.run('Sara Nouri',        '9647712345678', 'Villa 12 - Green Gardens',  'Erbil, Ankawa',       'Fatima Al-Azzawi', '9647518765432', 1200, 20, 'villa',        '2024-03-20', '2025-03-20', '').lastInsertRowid;
  const t3 = insert.run('Omar Khaleel',      '9647723456789', 'Office 7 - Al-Noor Center', 'Basra, Al-Ashar',     'Sami Dawood',      '9647527654321', 600,  25, 'commercial',   '2024-06-25', '2025-06-25', 'Needs receipt every month.').lastInsertRowid;

  const pays1 = [
    ['Jan 2024','paid','2024-01-14'],['Feb 2024','paid','2024-02-13'],['Mar 2024','paid','2024-03-15'],
    ['Apr 2024','paid','2024-04-16'],['May 2024','paid','2024-05-14'],['Jun 2024','paid','2024-06-15'],
    ['Jul 2024','paid','2024-07-15'],['Aug 2024','late',null],        ['Sep 2024','paid','2024-09-14'],
    ['Oct 2024','paid','2024-10-15'],['Nov 2024','pending',null],     ['Dec 2024','pending',null]
  ];
  pays1.forEach(([m,s,d]) => payIns.run(t1, m, s, d, 850));

  const pays2 = [
    ['Mar 2024','paid','2024-03-19'],['Apr 2024','paid','2024-04-20'],['May 2024','paid','2024-05-21'],
    ['Jun 2024','paid','2024-06-19'],['Jul 2024','paid','2024-07-20'],['Aug 2024','paid','2024-08-20'],
    ['Sep 2024','paid','2024-09-20'],['Oct 2024','paid','2024-10-18'],['Nov 2024','late',null],['Dec 2024','pending',null]
  ];
  pays2.forEach(([m,s,d]) => payIns.run(t2, m, s, d, 1200));

  const pays3 = [
    ['Jun 2024','paid','2024-06-24'],['Jul 2024','paid','2024-07-25'],
    ['Aug 2024','paid','2024-08-24'],['Sep 2024','paid','2024-09-25'],
    ['Oct 2024','paid','2024-10-25'],['Nov 2024','pending',null]
  ];
  pays3.forEach(([m,s,d]) => payIns.run(t3, m, s, d, 600));
}
*/
// ── Helpers ──────────────────────────────────────────────────────────
function getSettings(userId = null) {
  const globalRows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = Object.fromEntries(globalRows.map(r => [r.key, r.value]));
  if (userId) {
    const userRows = db.prepare(`SELECT key, value FROM user_settings WHERE user_id = ?`).all(userId);
    for (const row of userRows) settings[row.key] = row.value;
  }
  return settings;
}

function addLog(type, message, name = '', userId = null) {
  db.prepare(`INSERT INTO logs (type, message, name, user_id) VALUES (?, ?, ?, ?)`).run(type, message, name, userId);
  // keep last 500
  db.prepare(`DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 500)`).run();
}

module.exports = { db, getSettings, addLog };
