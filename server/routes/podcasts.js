import { Router } from 'express';
import Podcast from '../models/Podcast.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { trackEvent } from '../utils/analyticsEvent.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, category, speaker, sort = '-createdAt' } = req.query;
    const filter = {};

    if (search) filter.$text = { $search: search };
    if (category) filter.categories = category;
    if (speaker) filter.speakerId = speaker;

    const podcasts = await Podcast.find(filter)
      .populate('speakerId', 'name avatar role')
      .populate('authorId', 'name avatar role')
      .sort(sort);

    res.json(podcasts);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id)
      .populate('speakerId', 'name avatar role')
      .populate('authorId', 'name avatar role');
    if (!podcast) return res.status(404).json({ error: 'مجموعه یافت نشد' });
    res.json(podcast);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const podcast = new Podcast(req.body);
    await podcast.save();
    broadcast('data-changed', { type: 'podcasts', action: 'create', item: podcast.toObject() });
    res.status(201).json(podcast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const podcast = await Podcast.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!podcast) return res.status(404).json({ error: 'مجموعه یافت نشد' });
    res.json(podcast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
const podcast = await Podcast.findByIdAndDelete(req.params.id);
    if (!podcast) return res.status(404).json({ error: 'پادکست یافت نشد' });
    broadcast('data-changed', { type: 'podcasts', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/episodes', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) return res.status(404).json({ error: 'مجموعه یافت نشد' });
    podcast.episodes.push(req.body);
    await podcast.save();
    broadcast('data-changed', { type: 'podcasts', action: 'update', item: podcast.toObject() });
    res.json(podcast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:podcastId/episodes/:episodeIndex', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.podcastId);
    if (!podcast) return res.status(404).json({ error: 'مجموعه یافت نشد' });
    const idx = parseInt(req.params.episodeIndex);
    if (idx < 0 || idx >= podcast.episodes.length) {
      return res.status(400).json({ error: 'ایندکس نامعتبر' });
    }
    podcast.episodes[idx] = { ...podcast.episodes[idx].toObject(), ...req.body };
    await podcast.save();
    broadcast('data-changed', { type: 'podcasts', action: 'update', item: podcast.toObject() });
    res.json(podcast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:podcastId/episodes/:episodeIndex', requireAuth, requireRole('admin', 'author'), async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.podcastId);
    if (!podcast) return res.status(404).json({ error: 'مجموعه یافت نشد' });
    const idx = parseInt(req.params.episodeIndex);
    if (idx < 0 || idx >= podcast.episodes.length) {
      return res.status(400).json({ error: 'ایندکس نامعتبر' });
    }
    podcast.episodes.splice(idx, 1);
    await podcast.save();
    broadcast('data-changed', { type: 'podcasts', action: 'update', item: podcast.toObject() });
    res.json(podcast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/like', async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) return res.status(404).json({ error: 'مجموعه یافت نشد' });
    const identifier = req.body?.phoneNumber || req.ip || 'anonymous';
    if (!podcast.likedBy) podcast.likedBy = [];
    const idx = podcast.likedBy.indexOf(identifier);
    if (idx > -1) {
      podcast.likedBy.splice(idx, 1);
      podcast.likes = Math.max(0, (podcast.likes || 0) - 1);
    } else {
      podcast.likedBy.push(identifier);
      podcast.likes = (podcast.likes || 0) + 1;
    }
    await podcast.save();
    trackEvent('podcast_like', 'podcast', podcast._id, podcast.title, req, { like: idx === -1 });
    res.json({ likes: podcast.likes, liked: idx === -1 });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) return res.status(404).json({ error: 'مجموعه یافت نشد' });
    const { episodeIndex = 0 } = req.body;
    podcast.viewCount = (podcast.viewCount || 0) + 1;
    if (podcast.episodes[episodeIndex]) {
      podcast.episodes[episodeIndex].viewCount = (podcast.episodes[episodeIndex].viewCount || 0) + 1;
    }
    await podcast.save();
    trackEvent('podcast_play', 'podcast', podcast._id, podcast.title, req, {
      episodeIndex,
      episodeTitle: podcast.episodes[episodeIndex]?.title || '',
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
