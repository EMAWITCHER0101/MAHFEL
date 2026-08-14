import { Router } from 'express';
import Expense from '../models/Expense.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

function periodSince(period) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
  if (!days) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// لیست هزینه‌ها (ادمین) — با فیلتر بازه
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { period } = req.query;
    const since = periodSince(period);
    const filter = since ? { date: { $gte: since } } : {};
    const expenses = await Expense.find(filter).sort({ date: -1 }).limit(500);
    res.json(expenses);
  } catch (e) {
    console.error('LIST EXPENSES ERROR', e);
    res.status(500).json({ error: 'خطا در دریافت هزینه‌ها' });
  }
});

// ثبت هزینه جدید (ادمین)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { title, amount, note, date } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'عنوان هزینه الزامی است' });
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'مبلغ نامعتبر است' });
    const expense = await Expense.create({
      title: String(title).trim(),
      amount: value,
      note: note || '',
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json(expense);
  } catch (e) {
    console.error('CREATE EXPENSE ERROR', e);
    res.status(500).json({ error: 'خطا در ثبت هزینه' });
  }
});

// حذف هزینه (ادمین)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'هزینه یافت نشد' });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE EXPENSE ERROR', e);
    res.status(500).json({ error: 'خطا در حذف هزینه' });
  }
});

export default router;
