import { Router } from 'express';
import Album from '../models/Album.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const mine = userId ? await Album.find({ userId }).sort({ createdAt: -1 }) : [];
    const shared = await Album.find({ shared: true, ...(userId ? { userId: { $ne: userId } } : {}) }).sort({ createdAt: -1 }).limit(60);
    res.json({ mine, shared });
  } catch (e) {
    res.status(500).json({ error: 'خطا در دریافت آلبوم‌ها' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'ورود لازم است' });
    const { type = 'audio', title, items = [] } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'عنوان آلبوم لازم است' });
    const album = new Album({
      userId: req.user._id,
      type: type === 'video' ? 'video' : 'audio',
      title: String(title).trim().slice(0, 80),
      items: (Array.isArray(items) ? items : []).slice(0, 200).map((it) => ({
        podcastId: it.podcastId || null,
        episodeIndex: it.episodeIndex != null ? Number(it.episodeIndex) : null,
        videoId: it.videoId || null,
        noteId: it.noteId || null,
        title: it.title || '',
        cover: it.cover || '',
        content: it.content || '',
      })),
    });
    await album.save();
    res.status(201).json(album);
  } catch (e) {
    res.status(500).json({ error: 'خطا در ساخت آلبوم' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'ورود لازم است' });
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ error: 'آلبوم یافت نشد' });
    if (String(album.userId) !== String(req.user._id)) return res.status(403).json({ error: 'دسترسی ندارید' });
    const { title, items, shared } = req.body || {};
    if (title != null) album.title = String(title).trim().slice(0, 80);
    if (Array.isArray(items)) {
      album.items = items.slice(0, 200).map((it) => ({
        podcastId: it.podcastId || null,
        episodeIndex: it.episodeIndex != null ? Number(it.episodeIndex) : null,
        videoId: it.videoId || null,
        noteId: it.noteId || null,
        title: it.title || '',
        cover: it.cover || '',
        content: it.content || '',
      }));
    }
    if (shared != null) album.shared = !!shared;
    await album.save();
    res.json(album);
  } catch (e) {
    res.status(500).json({ error: 'خطا در ویرایش آلبوم' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'ورود لازم است' });
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ error: 'آلبوم یافت نشد' });
    if (String(album.userId) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ error: 'دسترسی ندارید' });
    await Album.deleteOne({ _id: album._id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطا در حذف آلبوم' });
  }
});

export default router;