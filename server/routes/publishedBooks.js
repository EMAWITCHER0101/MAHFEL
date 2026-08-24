import { Router } from 'express';
import PublishedBook from '../models/PublishedBook.js';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';
import { sendWebPushToAll } from '../utils/webpush.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, type, authorName } = req.query;
    const filter = { isDraft: { $ne: true }, pendingApproval: { $ne: true } };

    if (search) filter.$text = { $search: search };
    if (type) filter.type = type;
    if (authorName) filter.authorName = authorName;

    const books = await PublishedBook.find(filter).sort('-createdAt');
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Public profile: published notes of a given author (authorId => notes + author user info)
router.get('/author/:id', async (req, res) => {
  try {
    const notes = await PublishedBook.find({ authorId: req.params.id, isDraft: { $ne: true }, pendingApproval: { $ne: true } }).sort('-createdAt');
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Author's own notes (drafts + published)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const notes = await PublishedBook.find({ authorId: req.user._id }).sort('-createdAt');
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const book = await PublishedBook.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد' });
    if (book.isDraft && (!req.user || String(book.authorId) !== String(req.user._id))) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.body.type !== 'note' && req.user.role !== 'admin' && req.user.role !== 'author') {
      return res.status(403).json({ error: 'فقط نویسنده‌ها می‌توانند کتاب منتشر کنند' });
    }
    const book = new PublishedBook(req.body);
    book.authorId = req.user._id;
    if (book.type === 'note' && !book.authorName) book.authorName = req.user.name;
    if (book.isDraft === false && req.user.role !== 'admin') book.pendingApproval = true;
    await book.save();
    broadcast('data-changed', { type: 'publishedBooks', action: 'create', item: book.toObject() });
    // درخواست انتشار یادداشت جدید → نوتیفیکیشن به ادمین‌ها
    try {
      if (book.pendingApproval && book.type === 'note') {
        const adminNotif = await Notification.create({
          title: '📝 درخواست انتشار یادداشت',
          body: `${book.authorName || 'نویسنده'} یادداشت «${book.title || 'بدون عنوان'}» را برای انتشار ارسال کرد`,
          link: '/admin?tab=notes',
          type: 'note_request',
          targetTab: 'notes',
        });
        await sendWebPushToAll({ title: adminNotif.title, body: adminNotif.body, url: adminNotif.link, id: String(adminNotif._id) });
      }
    } catch (ignored) {}
    // نوتیفیکیشن همگانی: یادداشت/کتاب جدید منتشرشده (فقط وقتی واقعاً منتشر شده)
    try {
      if (book.type && !book.isDraft && !book.pendingApproval) {
        const notif = await Notification.create({
          title: book.type === 'note' ? '📝 یادداشت جدید' : '📚 کتاب جدید',
          body: (book.title || 'محتوا') + (book.authorName ? ' — ' + book.authorName : ''),
          link: `/mahfel/book/${book._id}`,
          type: book.type === 'note' ? 'note' : 'book',
        });
        await sendWebPushToAll({ title: notif.title, body: notif.body, url: notif.link, id: String(notif._id) });
      }
    } catch (ignored) {}
    res.status(201).json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await PublishedBook.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'کتاب یافت نشد' });
    if (req.user.role !== 'admin' && String(existing.authorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    if (existing.type !== 'note' && req.user.role !== 'admin' && req.user.role !== 'author') {
      return res.status(403).json({ error: 'فقط نویسنده‌ها می‌توانند کتاب ویرایش کنند' });
    }
    if (req.body.isDraft === false && existing.isDraft === true && req.user.role !== 'admin') req.body.pendingApproval = true;
    const book = await PublishedBook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    broadcast('data-changed', { type: 'publishedBooks', action: 'update', item: book.toObject() });
    // درخواست انتشار یادداشت توسط نویسنده → نوتیفیکیشن به ادمین‌ها
    try {
      if (book && book.pendingApproval && !existing.pendingApproval) {
        const adminNotif = await Notification.create({
          title: '📝 درخواست انتشار یادداشت',
          body: `${book.authorName || 'نویسنده'} یادداشت «${book.title || 'بدون عنوان'}» را برای انتشار ارسال کرد`,
          link: '/admin?tab=notes',
          type: 'note_request',
          targetTab: 'notes',
        });
        await sendWebPushToAll({ title: adminNotif.title, body: adminNotif.body, url: adminNotif.link, id: String(adminNotif._id) });
      }
    } catch (ignored) {}
    // تازه منتشر شده (ادمین پیش‌نویس را منتشر کرد) → نوتیفیکیشن همگانی
    try {
      if (book && !book.isDraft && !book.pendingApproval && (existing.isDraft || existing.pendingApproval)) {
        const notif = await Notification.create({
          title: book.type === 'note' ? '📝 یادداشت جدید' : '📚 کتاب جدید',
          body: (book.title || 'محتوا') + (book.authorName ? ' — ' + book.authorName : ''),
          link: `/mahfel/book/${book._id}`,
          type: book.type === 'note' ? 'note' : 'book',
        });
        await sendWebPushToAll({ title: notif.title, body: notif.body, url: notif.link, id: String(notif._id) });
      }
    } catch (ignored) {}
    res.json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await PublishedBook.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'کتاب یافت نشد' });
    if (req.user.role !== 'admin' && String(existing.authorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    if (existing.type !== 'note' && req.user.role !== 'admin' && req.user.role !== 'author') {
      return res.status(403).json({ error: 'فقط نویسنده‌ها می‌توانند کتاب حذف کنند' });
    }
    await PublishedBook.findByIdAndDelete(req.params.id);
    broadcast('data-changed', { type: 'publishedBooks', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const note = await PublishedBook.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'یادداشت یافت نشد' });
    const uid = String(req.user._id);
    const likes = (note.likes || []).map(l => String(l));
    const liked = likes.includes(uid);
    note.likes = liked ? likes.filter(l => l !== uid) : [...likes, uid];
    await note.save();
    broadcast('data-changed', { type: 'publishedBooks', action: 'update', item: note.toObject() });
    res.json({ liked: !liked, likes: note.likes });
  } catch (error) {
    res.status(500).json({ error: 'خطا در لایک' });
  }
});

export default router;
