// Admin uploads: images and files for products
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { requireAdmin } from '../middleware/requireAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const uploadsDir = path.join(rootDir, 'uploads');

// Ensure directory exists
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const now = new Date();
    const sub = path.join(uploadsDir, `${now.getFullYear()}`, String(now.getMonth() + 1).padStart(2, '0'));
    fs.mkdirSync(sub, { recursive: true });
    cb(null, sub);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, base + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Basic allowlist by mime
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf'
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type'));
  }
});

export function mountAdminUploadRoutes(app, baseUrl) {
  // POST /api/admin/upload single file field name: file
  app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file' });
    }
    const rel = req.file.path.split('uploads').pop();
    const url = `${baseUrl}/uploads${rel.replace(/\\/g, '/')}`;
    res.json({ ok: true, url, name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
  });
}


