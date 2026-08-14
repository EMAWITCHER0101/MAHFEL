import { Router } from 'express';
import Author from '../models/Author.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, role } = req.query;
    const filter = {};

    if (search) filter.$text = { $search: search };
    if (role) filter.role = role;

    const authors = await Author.find(filter).sort('name');
    res.json(authors);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ error: 'نویسنده یافت نشد' });
    res.json(author);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const author = new Author(req.body);
    await author.save();
    broadcast('data-changed', { type: 'authors', action: 'create', item: author.toObject() });
    res.status(201).json(author);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!author) return res.status(404).json({ error: 'نویسنده یافت نشد' });
    broadcast('data-changed', { type: 'authors', action: 'update', item: author.toObject() });
    res.json(author);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) return res.status(404).json({ error: 'نویسنده یافت نشد' });
    broadcast('data-changed', { type: 'authors', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
