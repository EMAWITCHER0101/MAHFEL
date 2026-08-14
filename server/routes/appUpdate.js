import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AppUpdate from '../models/AppUpdate.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// آخرین نسخه‌های منتشرشده (عمومی - برای چک‌آپدیت کلاینت‌ها)
router.get('/latest', async (req, res) => {
  try {
    const doc = await AppUpdate.findOne().sort({ updatedAt: -1 });
    if (!doc) return res.json(null);
    res.json({
      apkVersion: doc.apkVersion || '',
      apkUrl: doc.apkUrl || '',
      apkMessage: doc.apkMessage || '',
      desktopVersion: doc.desktopVersion || '',
      desktopUrl: doc.desktopUrl || '',
      desktopMessage: doc.desktopMessage || '',
      updatedAt: doc.updatedAt,
    });
  } catch (e) {
    res.status(500).json({ error: 'خطا در دریافت نسخه' });
  }
});

// ذخیره نسخه‌ها توسط ادمین (upsert تک‌سند)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { apkVersion, apkUrl, apkMessage, desktopVersion, desktopUrl, desktopMessage } = req.body || {};
    let doc = await AppUpdate.findOne().sort({ updatedAt: -1 });
    if (!doc) doc = new AppUpdate();
    if (typeof apkVersion === 'string') doc.apkVersion = apkVersion.trim();
    if (typeof apkUrl === 'string') doc.apkUrl = apkUrl.trim();
    if (typeof apkMessage === 'string') doc.apkMessage = apkMessage.trim();
    if (typeof desktopVersion === 'string') doc.desktopVersion = desktopVersion.trim();
    if (typeof desktopUrl === 'string') doc.desktopUrl = desktopUrl.trim();
    if (typeof desktopMessage === 'string') doc.desktopMessage = desktopMessage.trim();
    doc.updatedAt = new Date();
    await doc.save();
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: 'خطا در ذخیره نسخه' });
  }
});

// آپلود فایل APK توسط ادمین
const apkDir = path.resolve('uploads', 'apk');
if (!fs.existsSync(apkDir)) fs.mkdirSync(apkDir, { recursive: true });

const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, apkDir),
  filename: (req, file, cb) => {
    const name = 'mahfel-' + Date.now() + '.apk';
    cb(null, name);
  },
});

const apkUpload = multer({
  storage: apkStorage,
  limits: { fileSize: 300 * 1024 * 1024 },
});

router.post('/upload-apk', auth, requireRole('admin'), (req, res) => {
  apkUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'حجم فایل حداکثر ۳۰۰ مگابایت است' });
      return res.status(400).json({ error: err.message || 'خطا در آپلود' });
    }
    if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
    const url = `/uploads/apk/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, size: req.file.size });
  });
});

export default router;
