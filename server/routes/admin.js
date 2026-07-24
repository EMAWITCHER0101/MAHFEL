import { Router } from 'express';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Podcast from '../models/Podcast.js';
import Author from '../models/Author.js';
import Book from '../models/Book.js';
import PublishedBook from '../models/PublishedBook.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/stats', async (req, res) => {
  try {
    const [users, videos, posts, comments, podcasts, authors, books, publishedBooks] = await Promise.all([
      User.countDocuments(), Video.countDocuments(), Post.countDocuments(), Comment.countDocuments(),
      Podcast.countDocuments(), Author.countDocuments(), Book.countDocuments(), PublishedBook.countDocuments(),
    ]);
    const recentUsers = await User.find().sort('-createdAt').limit(5).select('name phoneNumber role avatar createdAt');
    const recentPosts = await Post.find().sort('-createdAt').limit(5).select('author text createdAt likes');
    const roleStats = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const commentsByType = await Comment.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
    const totalLikes = await Comment.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }]);
    const totalPostLikes = await Post.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }]);
    const popularPodcasts = await Podcast.find().sort('-viewCount').limit(5).select('title cover viewCount episodes');
    const popularVideos = await Video.find().sort('-viewCount').limit(5).select('title thumbnailUrl viewCount likes');
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    const newPostsThisWeek = await Post.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    const newCommentsThisWeek = await Comment.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    const dailyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const dailyPosts = await Post.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({
      users, videos, posts, comments, podcasts, authors, books, publishedBooks,
      recentUsers, recentPosts, roleStats, commentsByType,
      totalLikes: (totalLikes[0]?.total || 0) + (totalPostLikes[0]?.total || 0),
      popularPodcasts, popularVideos,
      newUsersThisWeek, newPostsThisWeek, newCommentsThisWeek,
      dailyUsers, dailyPosts,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [newUsers, newPosts, newComments, topAuthors, topCommenters, postsWithMostComments] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      Post.countDocuments({ createdAt: { $gte: since } }),
      Comment.countDocuments({ createdAt: { $gte: since } }),
      Post.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$author', count: { $sum: 1 }, totalLikes: { $sum: '$likes' } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]),
      Comment.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$author', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]),
      Post.find({ createdAt: { $gte: since } }).sort({ 'comments': -1 }).limit(10).select('author text comments likes createdAt'),
    ]);
    const hourlyActivity = await Post.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ newUsers, newPosts, newComments, topAuthors, topCommenters, postsWithMostComments, hourlyActivity, period });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { search, role, sort = '-createdAt', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phoneNumber: { $regex: search, $options: 'i' } }];
    if (role) filter.role = role;
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort(sort).skip((page - 1) * limit).limit(parseInt(limit)).select('-securityKey');
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'author', 'admin'].includes(role)) return res.status(400).json({ error: 'نقش نامعتبر' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-securityKey');
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { name, avatar, role } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (avatar !== undefined) update.avatar = avatar;
    if (role !== undefined) update.role = role;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-securityKey');
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (user.role === 'admin') return res.status(403).json({ error: 'حذف ادمین مجاز نیست' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/users/bulk', async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'لیست کاربران خالی است' });
    if (action === 'delete') {
      await User.deleteMany({ _id: { $in: ids }, role: { $ne: 'admin' } });
      return res.json({ success: true, deleted: ids.length });
    }
    if (action === 'role' && ['user', 'author', 'admin'].includes(value)) {
      await User.updateMany({ _id: { $in: ids } }, { role: value });
      return res.json({ success: true, updated: ids.length });
    }
    res.status(400).json({ error: 'عملیات نامعتبر' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const { search, sort = '-createdAt', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [{ author: { $regex: search, $options: 'i' } }, { text: { $regex: search, $options: 'i' } }];
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter).sort(sort).skip((page - 1) * limit).limit(parseInt(limit)).lean();

    const podcastIds = [...new Set(posts.filter(p => p.podcastId).map(p => String(p.podcastId)))];
    const videoIds = [...new Set(posts.filter(p => p.videoId).map(p => String(p.videoId)))];
    const bookIds = [...new Set(posts.filter(p => p.bookId).map(p => String(p.bookId)))];

    let podcastsMap = {}, videosMap = {}, booksMap = {};
    if (podcastIds.length) {
      (await Podcast.find({ _id: { $in: podcastIds } }).lean()).forEach(p => { podcastsMap[String(p._id)] = p; });
    }
    if (videoIds.length) {
      (await Video.find({ _id: { $in: videoIds } }).lean()).forEach(v => { videosMap[String(v._id)] = v; });
    }
    if (bookIds.length) {
      (await PublishedBook.find({ _id: { $in: bookIds } }).lean()).forEach(b => { booksMap[String(b._id)] = b; });
    }

    const enriched = posts.map(p => ({
      ...p,
      podcastData: p.podcastId ? podcastsMap[String(p.podcastId)] || null : null,
      videoData: p.videoId ? videosMap[String(p.videoId)] || null : null,
      bookData: p.bookId ? booksMap[String(p.bookId)] || null : null,
    }));

    res.json({ posts: enriched, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/posts/:id', async (req, res) => {
  try {
    const { text, isPinned } = req.body;
    const update = {};
    if (text !== undefined) update.text = text;
    if (isPinned !== undefined) update.isPinned = isPinned;
    update.isEdited = true;
    const post = await Post.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/posts/bulk', async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'لیست پست‌ها خالی است' });
    if (action === 'delete') {
      await Post.deleteMany({ _id: { $in: ids } });
      return res.json({ success: true, deleted: ids.length });
    }
    if (action === 'pin') {
      await Post.updateMany({ _id: { $in: ids } }, { isPinned: true });
      return res.json({ success: true, updated: ids.length });
    }
    if (action === 'unpin') {
      await Post.updateMany({ _id: { $in: ids } }, { isPinned: false });
      return res.json({ success: true, updated: ids.length });
    }
    res.status(400).json({ error: 'عملیات نامعتبر' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const { type, search, sort = '-createdAt', page = 1, limit = 30 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (search) filter.$or = [{ author: { $regex: search, $options: 'i' } }, { text: { $regex: search, $options: 'i' } }, { podcastTitle: { $regex: search, $options: 'i' } }, { videoTitle: { $regex: search, $options: 'i' } }];
    const total = await Comment.countDocuments(filter);
    const comments = await Comment.find(filter).sort(sort).skip((page - 1) * limit).limit(parseInt(limit)).lean();

    const podcastIds = [...new Set(comments.filter(c => c.podcastId).map(c => String(c.podcastId)))];
    const videoIds = [...new Set(comments.filter(c => c.videoId).map(c => String(c.videoId)))];
    const bookIds = [...new Set(comments.filter(c => c.bookId).map(c => String(c.bookId)))];

    let podcastsMap = {};
    let videosMap = {};
    let booksMap = {};
    if (podcastIds.length) {
      const podcasts = await Podcast.find({ _id: { $in: podcastIds } }).lean();
      podcasts.forEach(p => { podcastsMap[String(p._id)] = p; });
    }
    if (videoIds.length) {
      const videos = await Video.find({ _id: { $in: videoIds } }).lean();
      videos.forEach(v => { videosMap[String(v._id)] = v; });
    }
    if (bookIds.length) {
      const books = await PublishedBook.find({ _id: { $in: bookIds } }).lean();
      books.forEach(b => { booksMap[String(b._id)] = b; });
    }

    const enriched = comments.map(c => ({
      ...c,
      podcastData: c.podcastId ? podcastsMap[String(c.podcastId)] || null : null,
      videoData: c.videoId ? videosMap[String(c.videoId)] || null : null,
      bookData: c.bookId ? booksMap[String(c.bookId)] || null : null,
    }));

    res.json({ comments: enriched, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });
    await Comment.deleteMany({ parentId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/comments/:id', async (req, res) => {
  try {
    const { text, isFeatured } = req.body;
    const update = {};
    if (text !== undefined) update.text = text;
    if (isFeatured !== undefined) update.isFeatured = isFeatured;
    const comment = await Comment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/comments/bulk', async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'لیست نظرات خالی است' });
    if (action === 'delete') {
      await Comment.deleteMany({ _id: { $in: ids } });
      return res.json({ success: true, deleted: ids.length });
    }
    if (action === 'feature') {
      await Comment.updateMany({ _id: { $in: ids } }, { isFeatured: true });
      return res.json({ success: true, updated: ids.length });
    }
    if (action === 'unfeature') {
      await Comment.updateMany({ _id: { $in: ids } }, { isFeatured: false });
      return res.json({ success: true, updated: ids.length });
    }
    res.status(400).json({ error: 'عملیات نامعتبر' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/activity', async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const [recentUsers, recentPosts, recentComments] = await Promise.all([
      User.find().sort('-createdAt').limit(parseInt(limit)).select('name phoneNumber role createdAt'),
      Post.find().sort('-createdAt').limit(parseInt(limit)).select('author text likes comments createdAt'),
      Comment.find().sort('-createdAt').limit(parseInt(limit)).select('author text type podcastId videoId createdAt'),
    ]);
    const activity = [
      ...recentUsers.map(u => ({ type: 'user_joined', user: u.name, phone: u.phoneNumber, role: u.role, date: u.createdAt })),
      ...recentPosts.map(p => ({ type: 'post_created', author: p.author, text: p.text?.substring(0, 50), likes: p.likes, comments: p.comments?.length || 0, date: p.createdAt })),
      ...recentComments.map(c => ({ type: 'comment_created', author: c.author, text: c.text?.substring(0, 50), contentType: c.type, date: c.createdAt })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, parseInt(limit));
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { type } = req.query;
    let data;
    if (type === 'users') data = await User.find().select('-securityKey').lean();
    else if (type === 'posts') data = await Post.find().lean();
    else if (type === 'comments') data = await Comment.find().lean();
    else if (type === 'podcasts') data = await Podcast.find().lean();
    else if (type === 'videos') data = await Video.find().lean();
    else return res.status(400).json({ error: 'نوع داده نامعتبر' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-export.json`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [], posts: [], comments: [], podcasts: [], videos: [] });
    const regex = { $regex: q, $options: 'i' };
    const [users, posts, comments, podcasts, videos] = await Promise.all([
      User.find({ $or: [{ name: regex }, { phoneNumber: regex }] }).limit(5).select('name phoneNumber role avatar'),
      Post.find({ $or: [{ author: regex }, { text: regex }] }).limit(5).select('author text likes createdAt'),
      Comment.find({ $or: [{ author: regex }, { text: regex }] }).limit(5).select('author text type createdAt'),
      Podcast.find({ title: regex }).limit(5).select('title cover episodes'),
      Video.find({ $or: [{ title: regex }, { description: regex }] }).limit(5).select('title thumbnailUrl viewCount'),
    ]);
    res.json({ users, posts, comments, podcasts, videos });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/users/:userId/mute', async (req, res) => {
  try {
    const { userId } = req.params;
    const { minutes, reason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (user.role === 'admin') return res.status(400).json({ error: 'نمی‌توان ادمین را سکوت کرد' });

    if (minutes && minutes > 0) {
      user.mutedUntil = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      user.mutedUntil = null;
    }
    user.muted = true;
    user.mutedReason = reason || '';
    await user.save();

    res.json({ success: true, muted: true, mutedUntil: user.mutedUntil, mutedReason: user.mutedReason });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/users/:userId/unmute', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });

    user.muted = false;
    user.mutedUntil = null;
    user.mutedReason = '';
    await user.save();

    res.json({ success: true, muted: false });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/users/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });

    user.banned = false;
    user.warnings = 0;
    await user.save();

    res.json({ success: true, banned: false });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/users/:userId/reset-warnings', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });

    user.warnings = 0;
    await user.save();

    res.json({ success: true, warnings: 0 });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
