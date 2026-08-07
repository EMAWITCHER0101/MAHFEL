import { Router } from 'express';
import Notification from '../models/Notification.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(30);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: 'خطا در دریافت نوتیفیکیشن' });
  }
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { title, body, target } = req.body;
    if (!title || !body || !title.trim() || !body.trim()) {
      return res.status(400).json({ error: 'عنوان و متن نوتیفیکیشن الزامی است' });
    }
    const notification = await Notification.create({
      title: title.trim(),
      body: body.trim(),
      target: target || 'all',
    });
    res.status(201).json(notification);
  } catch (e) {
    res.status(500).json({ error: 'خطا در ارسال نوتیفیکیشن' });
  }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطا در حذف نوتیفیکیشن' });
  }
});

export default router;
