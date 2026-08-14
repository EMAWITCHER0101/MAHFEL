import { Router } from 'express';
import SupportMessage from '../models/SupportMessage.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// ثبت پیام پشتیبانی (کاربران — نیازی به ورود ندارد)
router.post('/', auth, async (req, res) => {
  try {
    const { name, contact, category, message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'متن پیام الزامی است' });
    }
    const doc = await SupportMessage.create({
      name: String(name || (req.user?.name || 'کاربر')).slice(0, 60),
      contact: String(contact || '').slice(0, 200),
      category: ['bug', 'suggestion', 'question', 'other'].includes(category) ? category : 'other',
      message: String(message).trim().slice(0, 2000),
      userId: req.user?._id || null,
    });
    res.status(201).json(doc);
  } catch (error) {
    console.error('CREATE SUPPORT MESSAGE ERROR', error);
    res.status(500).json({ error: 'خطا در ثبت پیام' });
  }
});

// لیست پیام‌های پشتیبانی (فقط ادمین)
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const filter = {};
    if (req.query.isRead === 'true') filter.isRead = true;
    if (req.query.isRead === 'false') filter.isRead = false;
    const total = await SupportMessage.countDocuments(filter);
    const messages = await SupportMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ messages, total, page, limit });
  } catch (error) {
    console.error('GET SUPPORT MESSAGES ERROR', error);
    res.status(500).json({ error: 'خطا در دریافت پیام‌ها' });
  }
});

// علامت‌گذاری خوانده‌شده (ادمین)
router.put('/:id/read', auth, requireRole('admin'), async (req, res) => {
  try {
    await SupportMessage.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطا در به‌روزرسانی' });
  }
});

// حذف پیام (ادمین)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await SupportMessage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطا در حذف پیام' });
  }
});

export default router;
