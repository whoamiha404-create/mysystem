const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { addLog } = require('../db/database');

const sessions = new Map();
const DEFAULT_USER = 'system';
const UPLOADS_ROOT = path.join(__dirname, '../uploads');
const SESSION_ROOT = path.join(__dirname, '../.wa_session');

function safeUserId(userId = DEFAULT_USER) {
  return String(userId || DEFAULT_USER).replace(/[^\w-]/g, '_');
}

function uploadDirFor(userId = DEFAULT_USER) {
  const key = safeUserId(userId);
  const dir = key === DEFAULT_USER ? UPLOADS_ROOT : path.join(UPLOADS_ROOT, `user-${key}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function imageBaseFor(userId = DEFAULT_USER) {
  return path.join(uploadDirFor(userId), 'wa-template-image');
}

function sessionDirFor(userId = DEFAULT_USER) {
  const key = safeUserId(userId);
  const dir = key === DEFAULT_USER ? SESSION_ROOT : path.join(SESSION_ROOT, `user-${key}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getSession(userId = DEFAULT_USER) {
  const key = safeUserId(userId);
  if (!sessions.has(key)) {
    sessions.set(key, {
      userId: key,
      state: 'disconnected',
      qrImg: null,
      client: null,
      onReady: null,
      starting: false,
    });
  }
  return sessions.get(key);
}

function walkForChrome(dir, depth) {
  if (depth < 0) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && /^(chrome|chrome\.exe|chromium|chromium-browser)$/i.test(e.name)) {
        return path.join(dir, e.name);
      }
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        const found = walkForChrome(path.join(dir, e.name), depth - 1);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  try {
    const pup = require('puppeteer');
    const p = typeof pup.executablePath === 'function' ? pup.executablePath() : null;
    if (p && fs.existsSync(p)) return p;
  } catch {}
  const os = require('os');
  const caches = [
    '/root/.cache/puppeteer',
    path.join(os.homedir(), '.cache', 'puppeteer'),
  ];
  for (const cr of caches) {
    if (fs.existsSync(cr)) {
      const found = walkForChrome(cr, 6);
      if (found) return found;
    }
  }
  const sys = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/local/bin/chromium',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
  ];
  for (const p of sys) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return undefined;
}

function start(userIdOrReady = DEFAULT_USER, maybeReady) {
  const userId = typeof userIdOrReady === 'function' ? DEFAULT_USER : userIdOrReady;
  const onReady = typeof userIdOrReady === 'function' ? userIdOrReady : maybeReady;
  const session = getSession(userId);
  if (onReady) session.onReady = onReady;
  if (session.client || session.starting) return;

  console.log(`\nStarting WhatsApp for user ${safeUserId(userId)}...`);
  session.state = 'init';
  session.qrImg = null;
  session.starting = true;

  const chromePath = findChrome();
  if (!chromePath) {
    session.state = 'disconnected';
    session.starting = false;
    addLog('error', 'Chrome not found. Run: npx puppeteer browsers install chrome', '', userId === DEFAULT_USER ? null : userId);
    setTimeout(() => start(userId), 30000);
    return;
  }

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionDirFor(userId) }),
    webVersionCache: { type: 'none' },
    puppeteer: {
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--no-zygote', '--disable-extensions', '--mute-audio'],
    },
  });

  session.client = client;

  client.on('qr', async qr => {
    session.state = 'qr';
    session.qrImg = await qrcode.toDataURL(qr);
    addLog('info', 'QR code ready', '', userId === DEFAULT_USER ? null : userId);
  });

  client.on('authenticated', () => {
    session.state = 'init';
    session.qrImg = null;
  });

  client.on('ready', () => {
    session.state = 'ready';
    session.qrImg = null;
    session.starting = false;
    addLog('success', 'WhatsApp connected', '', userId === DEFAULT_USER ? null : userId);
    if (session.onReady) session.onReady();
  });

  client.on('disconnected', reason => {
    session.state = 'disconnected';
    session.qrImg = null;
    session.client = null;
    session.starting = false;
    addLog('error', 'Disconnected: ' + reason, '', userId === DEFAULT_USER ? null : userId);
    setTimeout(() => start(userId), 8000);
  });

  client.initialize().catch(err => {
    session.state = 'disconnected';
    session.qrImg = null;
    session.client = null;
    session.starting = false;
    addLog('error', 'Init failed: ' + err.message.slice(0, 120), '', userId === DEFAULT_USER ? null : userId);
    setTimeout(() => start(userId), 15000);
  });
}

function getTemplateImagePath(userId = DEFAULT_USER) {
  const base = imageBaseFor(userId);
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const p = `${base}.${ext}`;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function sendMessage(userIdOrPhone, phoneOrMsg, msgOrImage, maybeImage = false) {
  const legacyCall = arguments.length <= 3;
  const userId = legacyCall ? DEFAULT_USER : userIdOrPhone;
  const phone = legacyCall ? userIdOrPhone : phoneOrMsg;
  const msg = legacyCall ? phoneOrMsg : msgOrImage;
  const withImage = legacyCall ? !!msgOrImage : !!maybeImage;
  const session = getSession(userId);
  if (!session.client && session.state === 'disconnected') start(userId);
  if (session.state !== 'ready' || !session.client) throw new Error('WhatsApp not connected');

  const id = String(phone || '').replace(/\D/g, '') + '@c.us';
  if (withImage) {
    const imgPath = getTemplateImagePath(userId);
    if (imgPath) {
      const media = MessageMedia.fromFilePath(imgPath);
      await session.client.sendMessage(id, media, { caption: msg });
      return;
    }
  }
  await session.client.sendMessage(id, msg);
}

function getStatus(userId = DEFAULT_USER) {
  const session = getSession(userId);
  return {
    state: session.state,
    qr: session.qrImg,
    hasImage: !!getTemplateImagePath(userId),
  };
}

module.exports = {
  start,
  sendMessage,
  getStatus,
  getTemplateImagePath,
  uploadDirFor,
  IMAGE_PATH: imageBaseFor(DEFAULT_USER),
};
