import { Router } from 'express';
import PublishedBook from '../models/PublishedBook.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, type, authorName } = req.query;
    const filter = { isDraft: { $ne: true } };

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
    const notes = await PublishedBook.find({ authorId: req.params.id, isDraft: { $ne: true } }).sort('-createdAt');
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

router.post('/', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const book = new PublishedBook(req.body);
    book.authorId = req.user._id;
    if (book.type === 'note' && !book.authorName) book.authorName = req.user.name;
    await book.save();
    broadcast('data-changed', { type: 'publishedBooks', action: 'create', item: book.toObject() });
    res.status(201).json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const existing = await PublishedBook.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'کتاب یافت نشد' });
    if (req.user.role !== 'admin' && String(existing.authorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    const book = await PublishedBook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    broadcast('data-changed', { type: 'publishedBooks', action: 'update', item: book.toObject() });
    res.json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const existing = await PublishedBook.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'کتاب یافت نشد' });
    if (req.user.role !== 'admin' && String(existing.authorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    await PublishedBook.findByIdAndDelete(req.params.id);
    broadcast('data-changed', { type: 'publishedBooks', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
