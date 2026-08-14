import { Router } from 'express';
import Book from '../models/Book.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, category, author } = req.query;
    const filter = {};

    if (search) filter.$text = { $search: search };
    if (category) filter.categories = category;
    if (author) filter.authorId = author;

    const books = await Book.find(filter)
      .populate('authorId', 'name avatar role')
      .sort('-addedDate');

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('authorId', 'name avatar role');
    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد' });
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    broadcast('data-changed', { type: 'books', action: 'create', item: book.toObject() });
    res.status(201).json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد' });
    res.json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'کتاب یافت نشد' });
    broadcast('data-changed', { type: 'books', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
