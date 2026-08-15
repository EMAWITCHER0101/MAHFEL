import { Router } from 'express';
import PurchaseRequest from '../models/PurchaseRequest.js';
import Expense from '../models/Expense.js';
import Notification from '../models/Notification.js';
import { auth, requireAuth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';
import { sendWebPushToAll } from '../utils/webpush.js';

const router = Router();

function periodSince(period) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
  if (!days) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// آمار فروش، سود و هزینه‌ها (ادمین)
router.get('/admin/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const { period } = req.query;
    const since = periodSince(period);

    // مجموع و تعداد به تفکیک وضعیت
    const byStatus = await PurchaseRequest.aggregate([
      { $match: since ? { createdAt: { $gte: since } } : {} },
      { $group: { _id: '$status', count: { $sum: 1 }, sum: { $sum: '$totalPrice' } } },
    ]);
    const totals = { confirmed: { count: 0, sum: 0 }, pending: { count: 0, sum: 0 }, rejected: { count: 0, sum: 0 } };
    for (const s of byStatus) {
      if (totals[s._id]) { totals[s._id].count = s.count; totals[s._id].sum = s.sum || 0; }
    }

    // فروش روزانه (فقط تایید شده) — پر کردن روزهای خالی با صفر
    const dailyRaw = await PurchaseRequest.aggregate([
      { $match: { status: 'confirmed', ...(since ? { createdAt: { $gte: since } } : {}) } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, value: { $sum: '$totalPrice' } } },
      { $sort: { _id: 1 } },
    ]);
    const dailyMap = {};
    for (const d of dailyRaw) dailyMap[d._id] = d.value;
    const daily = [];
    if (since) {
      const start = new Date(since);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
        const iso = new Date(t).toISOString().slice(0, 10);
        daily.push({ date: iso, value: dailyMap[iso] || 0 });
      }
    } else {
      daily.push(...dailyRaw.map(d => ({ date: d._id, value: d.value })));
    }

    // پرفروش‌ترین کتاب‌ها (تایید شده) — محاسبه در JS چون قیمت‌ها ممکن است فارسی ذخیره شده باشند
    const toNum = (v) => {
      const s = String(v ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[،,]/g, '').trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    };

    // تعداد فروش هر کتاب + خریداران (تایید شده)
    const bookOrders = await PurchaseRequest.find(
      { status: 'confirmed', ...(since ? { createdAt: { $gte: since } } : {}) },
      { items: 1, userName: 1, userPhone: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).limit(500);
    const booksMap = new Map();
    for (const o of bookOrders) {
      for (const it of o.items) {
        const t = String(it.title || 'بدون عنوان');
        if (!booksMap.has(t)) booksMap.set(t, { title: t, qty: 0, revenue: 0, orders: 0, buyers: [] });
        const b = booksMap.get(t);
        const rev = toNum(it.price) * toNum(it.quantity);
        b.qty += toNum(it.quantity);
        b.revenue += rev;
        b.orders += 1;
        b.buyers.push({ name: o.userName || 'کاربر', phone: o.userPhone || '', qty: toNum(it.quantity), date: o.createdAt });
      }
    }
    const books = [...booksMap.values()]
      .map(b => ({ ...b, buyers: b.buyers.slice(0, 50) }))
      .sort((a, b) => b.revenue - a.revenue);
    const topBooks = books.slice(0, 10).map(b => ({ title: b.title, revenue: b.revenue, qty: b.qty }));

    // هزینه‌ها در بازه
    const expenseFilter = since ? { date: { $gte: since } } : {};
    const expenseRes = await Expense.aggregate([
      { $match: expenseFilter },
      { $group: { _id: null, count: { $sum: 1 }, sum: { $sum: '$amount' } } },
    ]);
    const expenses = expenseRes[0] || { count: 0, sum: 0 };

    const confirmedSum = totals.confirmed.sum;
    const netProfit = confirmedSum - expenses.sum;

    res.json({
      period,
      totals,
      daily,
      topBooks: topBooks.map(b => ({ title: b.title, revenue: b.revenue || 0, qty: b.qty || 0 })),
      books,
      expenses: { count: expenses.count, sum: expenses.sum },
      netProfit,
    });
  } catch (e) {
    console.error('SALES STATS ERROR', e);
    res.status(500).json({ error: 'خطا در محاسبه آمار فروش' });
  }
});

// درخواست خرید جدید (کاربر لاگین‌شده)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, totalPrice, transferDate, transferTime, trackingCode, cardNumber, orderNumber } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'اقلام سفارش خالی است' });
    }
    if (!transferDate || !transferTime || !trackingCode) {
      return res.status(400).json({ error: 'تاریخ، ساعت و کد پیگیری الزامی است' });
    }
    const normalizeEn = (s) => String(s || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    const enDate = normalizeEn(transferDate);
    const enTime = normalizeEn(transferTime);
    const enTracking = normalizeEn(trackingCode).toUpperCase();
    const dateMatch = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(enDate);
    if (!dateMatch) return res.status(400).json({ error: 'فرمت تاریخ معتبر نیست' });
    const [, , m, d] = dateMatch.map(Number);
    const lastDay = m >= 1 && m <= 6 ? 31 : m >= 7 && m <= 11 ? 30 : m === 12 ? 29 : 0;
    if (!lastDay || d < 1 || d > lastDay) return res.status(400).json({ error: 'تاریخ نامعتبر است' });
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(enTime);
    if (!timeMatch) return res.status(400).json({ error: 'فرمت ساعت معتبر نیست' });
    const [, hh, mm] = timeMatch.map(Number);
    if (hh > 23 || mm > 59) return res.status(400).json({ error: 'ساعت نامعتبر است' });
    if (!/^[A-Z0-9]{8,40}$/.test(enTracking)) return res.status(400).json({ error: 'کد پیگیری باید حداقل ۸ کاراکتر باشد' });
    const computedTotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const code = String(orderNumber || 'S-' + Date.now().toString().slice(-8));

    const request = await PurchaseRequest.create({
      userId: req.user._id,
      userName: req.user.name || '',
      userPhone: req.user.phoneNumber || '',
      orderNumber: code,
      items,
      totalPrice: Number(totalPrice) > 0 ? Number(totalPrice) : computedTotal,
      cardNumber: cardNumber || '',
      transferDate: enDate,
      transferTime: enTime,
      trackingCode: enTracking,
      status: 'pending',
    });

    // نوتیفیکیشن به ادمین برای بررسی پرداخت
    try {
      await Notification.create({
        title: 'درخواست خرید جدید 🛒',
        body: `${req.user.name || req.user.phoneNumber || 'کاربر'} — ${items.length} کتاب — مبلغ ${Number(totalPrice).toLocaleString('fa-IR')} تومان — کد پیگیری ${trackingCode}`,
        type: 'admin',
        link: `/purchases/${request._id}`,
      });
      broadcast('data-changed', { type: 'notifications', action: 'create' });
      sendWebPushToAll({
        title: 'درخواست خرید جدید 🛒',
        body: `${req.user.name || 'کاربر'} — ${items.length} کتاب — ${Number(totalPrice).toLocaleString('fa-IR')} تومان — کد پیگیری ${trackingCode}`,
        url: '/',
        id: '',
      });
    } catch (e) {
      console.error('PURCHASE NOTIFY ERROR', e);
    }

    broadcast('data-changed', { type: 'purchase-requests', action: 'create', item: request.toObject() });
    res.status(201).json(request);
  } catch (e) {
    console.error('CREATE PURCHASE ERROR', e);
    res.status(500).json({ error: 'خطا در ثبت درخواست خرید' });
  }
});

// درخواست‌های خودِ کاربر
router.get('/', auth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
    const requests = await PurchaseRequest.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: 'خطا در دریافت درخواست‌ها' });
  }
});

// لیست همه درخواست‌ها برای ادمین
router.get('/admin', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await PurchaseRequest.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: 'خطا در دریافت درخواست‌ها' });
  }
});

// تایید / رد توسط ادمین
router.patch('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'درخواست یافت نشد' });

    request.status = status;
    request.adminNote = adminNote || '';
    request.reviewedAt = new Date();
    await request.save();

    // حذف نوتیفیکیشن «درخواست تایید» برای ادمین — چون پرداخت بررسی شده، دیگر نمایش داده نشود
    try {
      await Notification.deleteMany({ type: 'admin', link: `/purchases/${request._id}` });
      broadcast('data-changed', { type: 'notifications', action: 'delete' });
    } catch (e) {
      console.error('PURCHASE NOTIF CLEANUP ERROR', e);
    }

    // نوتیفیکیشن به خریدار
    try {
      const titles = request.items.map(i => i.title).join('، ');
      await Notification.create({
        title: status === 'confirmed' ? 'خرید شما تایید شد ✅' : 'درخواست خرید رد شد ❌',
        body: status === 'confirmed'
          ? `دسترسی کتاب «${titles}» فعال شد — از بخش سفارشات قابل مطالعه است`
          : `سفارش ${request.orderNumber} تایید نشد${adminNote ? ` — ${adminNote}` : ''}. برای پیگیری با پشتیبانی تماس بگیرید`,
        type: status === 'confirmed' ? 'purchase' : 'admin',
        userId: request.userId,
        link: '/',
      });
      broadcast('data-changed', { type: 'notifications', action: 'create' });
      sendWebPushToAll({
        title: status === 'confirmed' ? 'خرید شما تایید شد ✅' : 'درخواست خرید رد شد ❌',
        body: status === 'confirmed'
          ? `دسترسی کتاب «${titles}» فعال شد`
          : `سفارش ${request.orderNumber} تایید نشد`,
        url: '/',
        id: '',
      });
    } catch (e) {
      console.error('PURCHASE REVIEW NOTIFY ERROR', e);
    }

    broadcast('data-changed', { type: 'purchase-requests', action: 'update', item: request.toObject() });
    res.json(request);
  } catch (e) {
    console.error('REVIEW PURCHASE ERROR', e);
    res.status(500).json({ error: 'خطا در بررسی درخواست' });
  }
});

export default router;