import { Router } from 'express';
import VideoPlaylist from '../models/VideoPlaylist.js';
import Video from '../models/Video.js';
import Notification from '../models/Notification.js';
import { sendWebPushToAll } from '../utils/webpush.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

const normalize = (s) => String(s || '').replace(/[\u200c\u200f\u200e\u200d]/g, '').replace(/\s+/g, ' ').trim();

const EXTRA = {
  'اربعین 1398': ['اربعین سال ۱۳۹۸', 'اربعین 1398', 'اربعین همراه'],
  'اربعین 1397': ['اربعین سال ۱۳۹۷', 'اربعین 1397'],
  'استاد طاهرزاده': ['طاهرزاده'],
  'ضیافتح': ['ضیافتح', 'ضیافت ح'],
  'قرآن و اشارات آفاقی و انفسی': ['اشارات آفاقی'],
  'انقلاب اسلامی، انتظار، وارستگی': ['انقلاب اسلامی، انتظار'],
  'خون ایران؛ به مناسبت شهادت حاج قاسم سلیمانی': ['خون ایران'],
};

const epNum = (t) => {
  const o = String(t);
  const m = o.match(/(?:جلسه|قسمت|نشست|شب)\s*([0-9\u06F0-\u06F9]+)/g);
  if (!m) return NaN;
  const digits = m[0].match(/[0-9\u06F0-\u06F9]+/);
  if (!digits) return NaN;
  const fa = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';
  return parseInt(digits[0].split('').map(ch => {
    const i = fa.indexOf(ch);
    return i >= 0 ? String(i) : ch;
  }).join(''), 10);
};

async function assignVideos(playlist, videoIds) {
  const name = normalize(playlist.name);
  const keywords = (EXTRA[name] || []).concat([name]);
  const all = await Video.find({}, 'embedId title').lean();
  const hits = new Set((videoIds || []).filter(Boolean));
  for (const v of all) {
    const t = normalize(v.title);
    for (const kw of keywords) {
      if (kw && kw.trim() && t.includes(kw.trim())) { hits.add(v.embedId); break; }
    }
  }
  const matched = all.filter(v => hits.has(v.embedId));
  matched.sort((a, b) => {
    const na = epNum(a.title), nb = epNum(b.title);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return String(a.title).localeCompare(String(b.title), 'fa');
  });
  playlist.videoIds = matched.map(v => v.embedId);
  return playlist.videoIds.length;
}

router.get('/', async (req, res) => {
  try {
    const playlists = await VideoPlaylist.find({ visible: true }).sort({ order: 1 });
    const all = await Video.find({}, { embedId: 1, thumbnailUrl: 1 }).lean();
    const thum = {};
    all.forEach(v => { thum[v.embedId] = v.thumbnailUrl; });
    res.json(playlists.map(p => ({
      id: p._id, name: p.name, slug: p.slug, description: p.description,
      cover: p.cover || (p.videoIds && thum[p.videoIds[0]]) || '',
      count: (p.videoIds || []).length, order: p.order,
    })));
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/admin/all', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const playlists = await VideoPlaylist.find({}).sort({ order: 1 }).lean();
    const all = await Video.find({}, { embedId: 1, thumbnailUrl: 1 }).lean();
    const thum = {};
    all.forEach(v => { thum[v.embedId] = v.thumbnailUrl; });
    res.json(playlists.map(p => ({
      id: p._id, name: p.name, slug: p.slug, description: p.description,
      cover: p.cover || (p.videoIds && thum[p.videoIds[0]]) || '',
      count: (p.videoIds || []).length, order: p.order, visible: p.visible,
    })));
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const playlist = await VideoPlaylist.findOne({ slug: req.params.slug, visible: true });
    if (!playlist) return res.status(404).json({ error: 'پلی‌لیست یافت نشد' });
    const videos = await Video.find({ embedId: { $in: playlist.videoIds || [] } }).lean();
    const orderMap = {};
    (playlist.videoIds || []).forEach((id, i) => { orderMap[id] = i; });
    videos.sort((a, b) => (orderMap[a.embedId] ?? 0) - (orderMap[b.embedId] ?? 0));
    res.json({ ...playlist.toObject(), videos });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, slug, description, cover, videoIds, order } = req.body;
    const playlist = await VideoPlaylist.create({
      name,
      slug: slug || String(name).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/-+/g, '-'),
      description: description || '',
      cover: cover || '',
      videoIds: videoIds || [],
      order: order || 0,
    });
    await assignVideos(playlist, playlist.videoIds);
    await playlist.save();
    broadcast('data-changed', { type: 'playlists', action: 'create', item: playlist.toObject() });
    // نوتیفیکیشن همگانی: پلی‌لیست جدید
    try {
      const notif = await Notification.create({
        title: '📺 پلی‌لیست جدید',
        body: playlist.name || 'پلی‌لیست جدید اضافه شد',
        link: '/mahfel/videos',
        type: 'playlist',
      });
      await sendWebPushToAll({ title: notif.title, body: notif.body, url: notif.link, id: String(notif._id) });
    } catch (ignored) {}
    res.status(201).json(playlist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const playlist = await VideoPlaylist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'پلی‌لیست یافت نشد' });
    Object.assign(playlist, req.body);
    if (req.body.autoFill !== false) await assignVideos(playlist, playlist.videoIds || []);
    await playlist.save();
    res.json(playlist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await VideoPlaylist.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;