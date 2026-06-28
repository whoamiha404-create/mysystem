const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../db/database');
const auth = require('../middleware/auth');

const mapsRoot = path.join(__dirname, '..', 'uploads', 'maps');
const maxMapBytes = Number(process.env.MAP_UPLOAD_LIMIT_MB || 50) * 1024 * 1024;

function safeName(value) {
  return String(value || 'map')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'map';
}

function userMapDir(userId) {
  const dir = path.join(mapsRoot, `user-${userId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    file_name: row.file_name,
    original_name: row.original_name,
    mime_type: row.mime_type,
    file_size: row.file_size,
    url: row.url,
    created_at: row.created_at,
  };
}

const allowedExtensions = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif', '.heic', '.heif', '.tif', '.tiff',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, userMapDir(req.user.id)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
      cb(null, `${Date.now()}-${safeName(path.basename(file.originalname || 'map', ext))}${ext}`);
    },
  }),
  limits: { fileSize: maxMapBytes },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = file.mimetype || '';
    const ok = allowedExtensions.has(ext) || mime.startsWith('image/') || mime === 'application/pdf';
    if (ok) cb(null, true);
    else cb(new Error('Only map images and PDF files are allowed'));
  },
});

router.get('/', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM maps
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
  `).all(req.user.id);
  res.json(rows.map(toClient));
});

router.post('/', auth, (req, res) => {
  upload.single('map')(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: error.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No map file uploaded' });
    const name = String(req.body.name || '').trim();
    if (!name) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ error: 'Map name is required' });
    }

    const url = `/uploads/maps/user-${req.user.id}/${req.file.filename}`;
    const result = db.prepare(`
      INSERT INTO maps (user_id, name, file_name, original_name, mime_type, file_size, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name, req.file.filename, req.file.originalname || '', req.file.mimetype || '', req.file.size || 0, url);

    const row = db.prepare(`SELECT * FROM maps WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json(toClient(row));
  });
});

router.delete('/:id', auth, (req, res) => {
  const row = db.prepare(`SELECT * FROM maps WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Map not found' });

  const filePath = path.join(userMapDir(req.user.id), row.file_name);
  fs.rmSync(filePath, { force: true });
  db.prepare(`DELETE FROM maps WHERE id = ? AND user_id = ?`).run(row.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
