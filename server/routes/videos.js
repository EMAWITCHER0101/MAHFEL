import { Router } from 'express';
import Video from '../models/Video.js';
import Notification from '../models/Notification.js';
import { auth, requireAuth, requireRole } from '../middleware/auth.js';
import { trackEvent } from '../utils/analyticsEvent.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

const streamCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchAparatStream(embedId) {
  const cached = streamCache.get(embedId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  const aparatRes = await fetch(`https://www.aparat.com/etc/api/video/videohash/${embedId}`);
  if (!aparatRes.ok) throw new Error('Aparat fetch failed');
  const aparatData = await aparatRes.json();
  streamCache.set(embedId, { data: aparatData, ts: Date.now() });
  return aparatData;
}

router.get('/', async (req, res) => {
  try {
    const { search, category, sort = '-createdAt' } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (category) filter.categories = category;
    const videos = await Video.find(filter).sort(sort);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id/stream', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'ویدیو یافت نشد' });
    const aparatData = await fetchAparatStream(video.embedId);
    const sources = aparatData?.video?.file_link_all || [];
    const qualities = sources.map((s) => ({
      profile: s.profile,
      label: s.text,
      url: s.urls?.[0] || null,
      size: s.size,
    })).filter(q => q.url);
    const defaultUrl = aparatData?.video?.file_link || qualities[qualities.length - 1]?.url || null;
    res.json({ defaultUrl, qualities });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'ویدیو یافت نشد' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const video = new Video({ ...req.body, source: 'aparat' });
    await video.save();
    broadcast('data-changed', { type: 'videos', action: 'create', item: video.toObject() });
    // نوتیفیکیشن همگانی: ویدیوی جدید — کلیک → باز شدن صفحه همان ویدیو
    try {
      await Notification.create({
        title: '🎬 ویدیوی جدید',
        body: video.title || 'ویدیوی جدید اضافه شد',
        link: `/mahfel/video/${video._id}`,
        type: 'video',
      });
    } catch (ignored) {}
    res.status(201).json(video);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!video) return res.status(404).json({ error: 'ویدیو یافت نشد' });
    broadcast('data-changed', { type: 'videos', action: 'update', item: video.toObject() });
    res.json(video);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: 'ویدیو یافت نشد' });
    broadcast('data-changed', { type: 'videos', action: 'delete', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'ویدیو یافت نشد' });
    video.viewCount = (video.viewCount || 0) + 1;
    await video.save();
    trackEvent('video_view', 'video', video._id, video.title, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'ویدیو یافت نشد' });
    const userId = req.user?.phoneNumber || req.ip;
    if (video.likedBy?.includes(userId)) {
      video.likedBy = video.likedBy.filter(id => id !== userId);
      video.likes = Math.max(0, video.likes - 1);
    } else {
      video.likedBy = [...(video.likedBy || []), userId];
      video.likes = video.likes + 1;
    }
    await video.save();
    trackEvent('video_like', 'video', video._id, video.title, req, { like: video.likedBy.includes(userId) });
    res.json({ likes: video.likes, liked: video.likedBy.includes(userId) });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
