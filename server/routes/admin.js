import { Router } from 'express';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import Podcast from '../models/Podcast.js';
import Author from '../models/Author.js';
import Book from '../models/Book.js';
import { broadcast } from '../utils/broadcast.js';
import PublishedBook from '../models/PublishedBook.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateText } from '../utils/aiClient.js';
import { deleteUserContent } from '../utils/deleteUserContent.js';
import { sendWebPushToAll } from '../utils/webpush.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'superadmin'));

const DAY = 24 * 60 * 60 * 1000;

// نوتیفیکیشن همگانی + پوش وقتی یادداشت/کتابی تازه منتشر می‌شود (ادمین تأیید کرد یا خودش منتشر کرد)
async function notifyPublishedNote(note) {
  try {
    const notif = await Notification.create({
      title: note.type === 'book' ? '📚 کتاب جدید' : '📝 یادداشت جدید',
      body: (note.title || 'محتوا') + (note.authorName ? ' — ' + note.authorName : ''),
      link: `/mahfel/book/${note._id}`,
      type: note.type === 'book' ? 'book' : 'note',
    });
    await sendWebPushToAll({ title: notif.title, body: notif.body, url: notif.link, id: String(notif._id) });
  } catch (ignored) {}
}

function periodRange(period = '7d') {
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const since = new Date(Date.now() - days * DAY);
  const prevSince = new Date(since.getTime() - days * DAY);
  return { days, since, prevSince };
}

function pctChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

router.get('/stats', async (req, res) => {
  try {
    const [users, videos, posts, comments, podcasts, authors, books, publishedBooks, publishedNotes] = await Promise.all([
      User.countDocuments(), Video.countDocuments(), Post.countDocuments(), Comment.countDocuments(),
      Podcast.countDocuments(), Author.countDocuments(), Book.countDocuments(),
      PublishedBook.countDocuments({ type: 'book' }),
      PublishedBook.countDocuments({ type: 'note' }),
    ]);
    const recentUsers = await User.find().sort('-createdAt').limit(5).select('name phoneNumber role avatar createdAt');
    const recentPosts = await Post.find().sort('-createdAt').limit(5).select('author text createdAt likes');
    const roleStats = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const commentsByType = await Comment.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
    const totalLikes = await Comment.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }]);
    const totalPostLikes = await Post.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }]);
    const popularPodcasts = await Podcast.aggregate([
      { $project: { title: 1, cover: 1, episodes: 1, viewCount: 1, likes: 1, totalViews: { $ifNull: ['$viewCount', 0] } } },
      { $sort: { totalViews: -1 } },
      { $limit: 8 },
    ]);
    const popularVideos = await Video.find().sort('-viewCount').limit(5).select('title thumbnailUrl viewCount likes');
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * DAY) } });
    const newPostsThisWeek = await Post.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * DAY) } });
    const newCommentsThisWeek = await Comment.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * DAY) } });
    const dailyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * DAY) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const dailyPosts = await Post.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * DAY) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const podcastViews = await Podcast.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ['$viewCount', 0] } } } },
    ]);
    const videoViews = await Video.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]);
    const podcastLikes = await Podcast.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$likes', 0] } } } }]);
    const videoLikes = await Video.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$likes', 0] } } } }]);
    const dailyPlays = await AnalyticsEvent.aggregate([
      { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: new Date(Date.now() - 14 * DAY) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const dailyPlaysByType = await AnalyticsEvent.aggregate([
      { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: new Date(Date.now() - 14 * DAY) } } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, event: '$event' }, count: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]);
    const eventBreakdown = await AnalyticsEvent.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * DAY) } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({
      users, videos, posts, comments, podcasts, authors, books, publishedBooks, publishedNotes,
      recentUsers, recentPosts, roleStats, commentsByType,
      totalLikes: (totalLikes[0]?.total || 0) + (totalPostLikes[0]?.total || 0),
      totalPlays: (podcastViews[0]?.total || 0) + (videoViews[0]?.total || 0),
      podcastViews: podcastViews[0]?.total || 0,
      videoViews: videoViews[0]?.total || 0,
      podcastLikes: podcastLikes[0]?.total || 0,
      videoLikes: videoLikes[0]?.total || 0,
      popularPodcasts, popularVideos,
      newUsersThisWeek, newPostsThisWeek, newCommentsThisWeek,
      dailyUsers, dailyPosts, dailyPlays, dailyPlaysByType, eventBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const { days, since, prevSince } = periodRange(period);
    const [newUsers, newPosts, newComments, prevNewUsers, prevNewPosts, prevNewComments] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      Post.countDocuments({ createdAt: { $gte: since } }),
      Comment.countDocuments({ createdAt: { $gte: since } }),
      User.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
      Post.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
      Comment.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
    ]);
    const [topAuthors, topCommenters, postsWithMostComments] = await Promise.all([
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
      Post.aggregate([
        { $project: { title: 1, text: 1, author: 1, commentsCount: { $size: { $ifNull: ['$comments', []] } } } },
        { $sort: { commentsCount: -1 } }, { $limit: 10 }
      ]),
    ]);

    const [topPodcastEvents, topVideoEvents, dailyPlays, peakHours, weekdayActivity] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: { event: 'podcast_play', createdAt: { $gte: since } } },
        { $group: { _id: { refId: '$refId', refTitle: '$refTitle' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]),
      AnalyticsEvent.aggregate([
        { $match: { event: 'video_view', createdAt: { $gte: since } } },
        { $group: { _id: { refId: '$refId', refTitle: '$refTitle' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]),
      AnalyticsEvent.aggregate([
        { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      AnalyticsEvent.aggregate([
        { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      AnalyticsEvent.aggregate([
        { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
        { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
    ]);

    const totalPlays = dailyPlays.reduce((s, d) => s + d.count, 0);
    const prevPlays = await AnalyticsEvent.countDocuments({
      event: { $in: ['podcast_play', 'video_view'] },
      createdAt: { $gte: prevSince, $lt: since },
    });

    const hotPodcastIds = topPodcastEvents.map(p => String(p._id.refId)).filter(Boolean).slice(0, 20);
    const podcastsMap = {};
    if (hotPodcastIds.length) {
      (await Podcast.find({ _id: { $in: hotPodcastIds } }).lean()).forEach(p => { podcastsMap[String(p._id)] = p; });
    }
    const topPodcasts = topPodcastEvents.map(e => {
      const p = podcastsMap[String(e._id.refId)];
      return { _id: e._id.refId, title: p?.title || e._id.refTitle || 'بدون عنوان', cover: p?.cover || '', count: e.count, categories: p?.categories || [] };
    });
    const topVideos = topVideoEvents.map(e => ({ _id: e._id.refId, title: e._id.refTitle || 'بدون عنوان', count: e.count }));

    const categoryCounts = {};
    topPodcasts.forEach(p => (p.categories || []).forEach(c => { categoryCounts[c] = (categoryCounts[c] || 0) + p.count; }));
    const topCategories = Object.entries(categoryCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    const hourlyActivity = await Post.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const peakHour = peakHours.reduce((m, h) => (h.count > m.count ? h : m), { count: 0, _id: -1 });
    const busiestWeekday = weekdayActivity.reduce((m, d) => (d.count > m.count ? d : m), { count: 0, _id: -1 });
    const weekdayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    const weekdayEvents = weekdayActivity.map(w => ({ ...w, name: weekdayNames[w._id - 1] || '' }));

    const weeklyHeatmap = await AnalyticsEvent.aggregate([
      { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
      { $group: { _id: { day: { $dayOfWeek: '$createdAt' }, hour: { $hour: '$createdAt' } }, count: { $sum: 1 } } },
    ]);
    const dailyPlaysByType = await AnalyticsEvent.aggregate([
      { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, event: '$event' }, count: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({
      newUsers, newPosts, newComments,
      userGrowth: pctChange(newUsers, prevNewUsers),
      postGrowth: pctChange(newPosts, prevNewPosts),
      commentGrowth: pctChange(newComments, prevNewComments),
      totalPlays, playsGrowth: pctChange(totalPlays, prevPlays),
      topAuthors, topCommenters, postsWithMostComments, topPodcasts, topVideos, topCategories,
      hourlyActivity, dailyPlays, dailyPlaysByType, peakHours, weekdayEvents,
      weeklyHeatmap: weeklyHeatmap.map(h => ({ day: h._id.day, hour: h._id.hour, count: h.count })),
      peakHour: peakHour.count > 0 ? peakHour : null,
      busiestWeekday: busiestWeekday.count > 0 ? busiestWeekday : null,
      period, days,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const insightsCache = new Map();
const INSIGHTS_TTL = 5 * 60 * 1000;

async function segmentEventData(event, since, { withCovers = false } = {}) {
  const prevSince = new Date(since.getTime() - (Date.now() - since.getTime()));
  const [total, prev, daily, hours, heatmap, topAgg] = await Promise.all([
    AnalyticsEvent.countDocuments({ event, createdAt: { $gte: since } }),
    AnalyticsEvent.countDocuments({ event, createdAt: { $gte: prevSince, $lt: since } }),
    AnalyticsEvent.aggregate([
      { $match: { event, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { event, createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { event, createdAt: { $gte: since } } },
      { $group: { _id: { day: { $dayOfWeek: '$createdAt' }, hour: { $hour: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { event, createdAt: { $gte: since } } },
      { $group: { _id: { refId: '$refId', refTitle: '$refTitle' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 },
    ]),
  ]);
  let top = topAgg.map(t => ({ _id: t._id.refId, title: t._id.refTitle || 'بدون عنوان', count: t.count }));
  if (withCovers && top.length) {
    const ids = top.map(t => String(t._id)).filter(Boolean);
    const pods = {};
    if (ids.length) (await Podcast.find({ _id: { $in: ids } }).lean()).forEach(p => { pods[String(p._id)] = p; });
    top = top.map(t => ({ ...t, cover: pods[String(t._id)]?.cover || '', subtitle: pods[String(t._id)]?.categories?.slice(0, 2).join(' • ') || '' }));
  }
return {
      total, growth: pctChange(total, prev),
      daily: daily.map(d => ({ date: d._id, count: d.count })),
      hours: hours.map(h => ({ hour: h._id, count: h.count })),
      heatmap: heatmap.map(h => ({ day: h._id.day, hour: h._id.hour, count: h.count })),
      top,
    };
}

router.get('/analytics/segments', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const { days, since } = periodRange(period);

    const [audioPlays, videoViews] = await Promise.all([
      segmentEventData('podcast_play', since, { withCovers: true }),
      segmentEventData('video_view', since),
    ]);

    const [audioLikesTotal, audioLikesPrev, videoLikesTotal, videoLikesPrev] = await Promise.all([
      AnalyticsEvent.countDocuments({ event: 'podcast_like', createdAt: { $gte: since } }),
      AnalyticsEvent.countDocuments({ event: 'podcast_like', createdAt: { $gte: new Date(since.getTime() - (Date.now() - since.getTime())), $lt: since } }),
      AnalyticsEvent.countDocuments({ event: 'video_like', createdAt: { $gte: since } }),
      AnalyticsEvent.countDocuments({ event: 'video_like', createdAt: { $gte: new Date(since.getTime() - (Date.now() - since.getTime())), $lt: since } }),
    ]);

    const [newUsers, prevUsers, dailyUsers, newPosts, prevPosts, dailyPosts, newComments, prevComments, topAuthors, topVideos, postsWithMostComments, topCommenters] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      User.countDocuments({ createdAt: { $gte: new Date(since.getTime() - (Date.now() - since.getTime())), $lt: since } }),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Post.countDocuments({ createdAt: { $gte: since } }),
      Post.countDocuments({ createdAt: { $gte: new Date(since.getTime() - (Date.now() - since.getTime())), $lt: since } }),
      Post.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Comment.countDocuments({ createdAt: { $gte: since } }),
      Comment.countDocuments({ createdAt: { $gte: new Date(since.getTime() - (Date.now() - since.getTime())), $lt: since } }),
      Post.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$author', count: { $sum: 1 }, totalLikes: { $sum: { $ifNull: ['$likedBy', []] } } } },
        { $sort: { count: -1 } }, { $limit: 5 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { event: 'video_view', createdAt: { $gte: since } } },
        { $group: { _id: { refId: '$refId', refTitle: '$refTitle' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Post.aggregate([
        { $project: { title: 1, text: 1, commentsCount: { $size: { $ifNull: ['$comments', []] } } } },
        { $sort: { commentsCount: -1 } }, { $limit: 5 },
      ]),
      Comment.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$author', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 5 },
      ]),
    ]);

    res.json({
      period, days,
      audio: {
        plays: audioPlays.total,
        playsGrowth: audioPlays.growth,
        likes: audioLikesTotal,
        likesGrowth: pctChange(audioLikesTotal, audioLikesPrev),
        daily: audioPlays.daily,
        hours: audioPlays.hours,
        heatmap: audioPlays.heatmap,
        top: audioPlays.top,
      },
      video: {
        views: videoViews.total,
        viewsGrowth: videoViews.growth,
        likes: videoLikesTotal,
        likesGrowth: pctChange(videoLikesTotal, videoLikesPrev),
        daily: videoViews.daily,
        hours: videoViews.hours,
        heatmap: videoViews.heatmap,
        top: videoViews.top,
      },
      community: {
        newUsers, userGrowth: pctChange(newUsers, prevUsers),
        newPosts, postGrowth: pctChange(newPosts, prevPosts),
        newComments, commentGrowth: pctChange(newComments, prevComments),
        dailyUsers: dailyUsers.map(d => ({ date: d._id, count: d.count })),
        dailyPosts: dailyPosts.map(d => ({ date: d._id, count: d.count })),
        topAuthors,
        topVideos,
        postsWithMostComments,
        topCommenters,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

function toFaDigits(n) {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

router.get('/insights', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const key = `insights-${period}`;
    const cached = insightsCache.get(key);
    if (cached && Date.now() - cached.at < INSIGHTS_TTL) {
      return res.json({ ...cached.payload, cached: true });
    }
    const { days, since, prevSince } = periodRange(period);
    const [totalUsers, prevUsers, newUsers, newPosts, newComments, totalComments, totalPosts, prevPlays, playsToday] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
      User.countDocuments({ createdAt: { $gte: since } }),
      Post.countDocuments({ createdAt: { $gte: since } }),
      Comment.countDocuments({ createdAt: { $gte: since } }),
      Comment.countDocuments(),
      Post.countDocuments(),
      AnalyticsEvent.countDocuments({ event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: prevSince, $lt: since } }),
      AnalyticsEvent.countDocuments({ event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } }),
    ]);
    const podcastPlays = await AnalyticsEvent.countDocuments({ event: 'podcast_play', createdAt: { $gte: since } });
    const videoViews = await AnalyticsEvent.countDocuments({ event: 'video_view', createdAt: { $gte: since } });

    const topByCount = await AnalyticsEvent.aggregate([
      { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
      { $group: { _id: { refId: '$refId', refTitle: '$refTitle' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 8 },
    ]);
    const idList = topByCount.map(t => String(t._id.refId)).filter(Boolean).slice(0, 20);
    const podMap = {};
    if (idList.length) {
      (await Podcast.find({ _id: { $in: idList } }).select('title cover').lean()).forEach(p => { podMap[String(p._id)] = p; });
    }

    const hoursAgg = await AnalyticsEvent.aggregate([
      { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const daysAgg = await AnalyticsEvent.aggregate([
      { $match: { event: { $in: ['podcast_play', 'video_view'] }, createdAt: { $gte: since } } },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const peakHour = hoursAgg.reduce((m, h) => (h.count > m.count ? h : m), { count: 0, _id: -1 });
    const weekdayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    const busyDay = daysAgg.reduce((m, d) => (d.count > m.count ? d : m), { count: 0, _id: -1 });

    const insights = [];
    const playsGrowth = pctChange(playsToday, prevPlays);
    const userGrowth = pctChange(newUsers, prevUsers);

    if (playsGrowth >= 15) {
      insights.push({ level: 'success', icon: 'fa-arrow-trend-up', title: 'رشد بازدید', detail: `بازدیدها در این بازه ${toFaDigits(Math.abs(playsGrowth))}٪ نسبت به بازه قبل رشد کرده است. روند صعودی است؛ با انتشار منظم محتوا این مسیر تثبیت می‌شود.` });
    } else if (playsGrowth <= -15) {
      insights.push({ level: 'danger', icon: 'fa-arrow-trend-down', title: 'ریزش بازدید', detail: `بازدیدها در این بازه ${toFaDigits(Math.abs(playsGrowth))}٪ کاهش یافته است. بررسی کیفیت محتوا، فرکانس انتشار و اطلاع‌رسانی به کاربران توصیه می‌شود.` });
    } else {
      insights.push({ level: 'info', icon: 'fa-equals', title: 'ثبات بازدید', detail: `بازدیدها در این بازه تقریباً ثابت مانده است (نوسان ${toFaDigits(Math.abs(playsGrowth))}٪). برای عبور از سطح فعلی، محتوای جدید یا چالش تعامل پیشنهاد می‌شود.` });
    }

    if (userGrowth > 0) {
      insights.push({ level: 'success', icon: 'fa-user-plus', title: 'رشد کاربران', detail: `${toFaDigits(newUsers)} کاربر طی این بازه ثبت‌نام کردند (${toFaDigits(userGrowth)}٪ رشد نسبت به قبل). این روند نشان‌دهنده جذابیت پلتفرم است.` });
    } else if (newUsers === 0) {
      insights.push({ level: 'warning', icon: 'fa-user-slash', title: 'ثبت‌نام متوقف', detail: 'در این بازه کاربر جدیدی ثبت‌نام نکرده است. جستجو در کانال‌های جذب و کمپین‌های دعوت را بررسی کنید.' });
    }

    if (topByCount.length) {
      const t = topByCount[0];
      const title = podMap[String(t._id.refId)]?.title || t._id.refTitle || 'محتوای بالاترین';
      insights.push({ level: 'success', icon: 'fa-fire', title: 'محتوای داغ', detail: `«${title}» با ${toFaDigits(t.count)} پخش، پربازدیدترین محتوای این بازه است. ایده‌آل است محتوای مشابه یا جلسات ادامه‌دهنده آن منتشر شود.` });
    }

    if (peakHour.count > 0) {
      insights.push({ level: 'info', icon: 'fa-clock', title: 'ساعت طلایی', detail: `حجم‌ترین ساعت پخش، ساعت ${toFaDigits(peakHour._id)} است. انتشار اپیزودهای اصلی باز همین ساعت، بازدید بالاتری خواهد داشت.` });
    }
    if (busyDay.count > 0) {
      insights.push({ level: 'info', icon: 'fa-calendar-day', title: 'روز پرترافیک', detail: `${weekdayNames[busyDay._id - 1] || ''} فعال‌ترین روز هفته است؛ بهترین روز برای انتشار مهم‌ترین محتواها است.` });
    }

    if (podcastPlays > 0 && videoViews === 0) {
      insights.push({ level: 'warning', icon: 'fa-video', title: 'ویدیوها بدون پخش', detail: 'در این بازه هیچ ویدیویی پخش نشده. بررسی لینک ویدیوها و افزودن ویدیوی جدید با استقبال بهتر پیشنهاد می‌شود.' });
    } else if (videoViews > podcastPlays) {
      insights.push({ level: 'info', icon: 'fa-video', title: 'ویدیو پیشتاز', detail: `ویدیوها (${toFaDigits(videoViews)} بازدید) بیشتر از پادکست‌ها (${toFaDigits(podcastPlays)} پخش) استفاده شده‌اند. سرمایه‌گذاری بر محتوای ویدیو رشد سریع‌تری می‌آورد.` });
    } else if (podcastPlays > videoViews) {
      insights.push({ level: 'info', icon: 'fa-headphones', title: 'پادکست پیشتاز', detail: `پادکست‌ها با ${toFaDigits(podcastPlays)} پخش در برابر ${toFaDigits(videoViews)} بازدید ویدیو، موتور اصلی پلتفرم هستند.` });
    }

    const activeRefs = new Set(topByCount.map(t => String(t._id.refId)));
    const recentPodcasts = await Podcast.find().sort({ createdAt: -1 }).limit(40).select('title').lean();
    const dormant = recentPodcasts.filter(p => !activeRefs.has(String(p._id))).slice(0, 3);
    if (dormant.length) {
      insights.push({ level: 'warning', icon: 'fa-bed', title: 'محتوای راکد', detail: `${dormant.map(p => `«${p.title}»`).join('، ')} در این بازه هیچ پخشی نداشته‌اند؛ تازه‌سازی کاور، عنوان یا بازنشر می‌تواند آن را احیا کند.` });
    }

    if (totalUsers > 0 && totalComments > 0) {
      insights.push({ level: 'info', icon: 'fa-comment-dots', title: 'تعامل کاربران', detail: `به‌ازای هر کاربر ${toFaDigits((totalComments / totalUsers).toFixed(1))} نظر ثبت شده است. نظرات بالاتر یعنی وفاداری بیشتر.` });
    }

    insights.push({ level: 'info', icon: 'fa-lightbulb', title: 'پیشنهاد اقدام امروز', detail: 'بر اساس الگوی بازدید، انتشار ۱ تا ۲ محتوای جدید در ساعت پیک و اطلاع‌رسانی به کاربران فعال بهترین تثبیت برای رشد پایدار است.' });

    // Optional LLM narrative (non-fatal)
    const statsSnapshot = {
      period: { days }, totalUsers, newUsers, userGrowth: Number(userGrowth || 0), newPosts, newComments,
      podcastPlays, videoViews, totalPlays: playsToday, playsGrowth: Number(playsGrowth || 0),
      topContent: topByCount.slice(0, 5).map(t => ({ title: podMap[String(t._id.refId)]?.title || t._id.refTitle || '', count: t.count })),
      peakHour: peakHour.count ? peakHour._id : null,
      peakDay: busyDay.count ? weekdayNames[busyDay._id - 1] : null,
    };
    let narrative = '';
    try {
      const prompt = `بر اساس داده‌های زیر یک تحلیل هوشمند فارسی (حداکثر ۸۰ کلمه) برای مدیر یک پلتفرم محتوا بنویس؛ شامل وضعیت کلی، قوت‌ها، هشدارها و یک پیشنهاد عملی. فقط متن تحلیل را برگردان: ${JSON.stringify(statsSnapshot)}`;
      const raw = await generateText(prompt, 'شما یک تحلیلگر داده و دیتاساینس فارسی هستید. فقط متن تحلیل فارسی برگردان، بدون توضیح اضافه.');
      if (raw && raw.trim().length > 20) narrative = raw.trim();
    } catch (aiErr) {
      console.error('Insights LLM failed:', aiErr?.message);
    }

    const payload = {
      period: { days },
      summary: narrative,
      insights: insights.slice(0, 10),
      generatedAt: new Date().toISOString(),
      usingLLM: Boolean(narrative),
    };
    insightsCache.set(key, { at: Date.now(), payload });
    res.json({ ...payload, cached: false });
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
    broadcast('data-changed', { type: 'users', action: 'update', item: user.toObject() });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ─── Admin: Notes (یادداشت‌ها) ────────────────────────────────────────────
router.get('/notes', async (req, res) => {
  try {
    const { search, status, authorName, page = 1, limit = 20 } = req.query;
    const filter = { type: 'note' };
    if (status === 'draft') filter.isDraft = true;
    else if (status === 'published') filter.isDraft = { $ne: true };
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    if (authorName) filter.authorName = authorName;
    const total = await PublishedBook.countDocuments(filter);
    const notes = await PublishedBook.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(parseInt(limit));
    const userIds = notes.map(n => n.authorId).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('name avatar role');
    const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));
    res.json({
      notes: notes.map(n => ({
        ...n.toObject(),
        user: n.authorId ? userMap[String(n.authorId)] || null : null,
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Create note as admin (draft or published)
router.post('/notes', async (req, res) => {
  try {
    const note = new PublishedBook({ ...req.body, type: 'note' });
    if (!note.authorId) note.authorId = req.user._id;
    await note.save();
    broadcast('data-changed', { type: 'publishedBooks', action: 'create', item: note.toObject() });
    if (!note.isDraft) await notifyPublishedNote(note);
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update any note (admin overrides ownership)
router.put('/notes/:id', async (req, res) => {
  try {
    const prev = await PublishedBook.findById(req.params.id);
    if (!prev) return res.status(404).json({ error: 'یادداشت یافت نشد' });
    const note = await PublishedBook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!note) return res.status(404).json({ error: 'یادداشت یافت نشد' });
    if (!note.isDraft && !note.pendingApproval && (prev.isDraft || prev.pendingApproval)) {
      await notifyPublishedNote(note);
    }
    broadcast('data-changed', { type: 'publishedBooks', action: 'update', item: note.toObject() });
    res.json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete any note
router.delete('/notes/:id', async (req, res) => {
  try {
    const note = await PublishedBook.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'یادداشت یافت نشد' });
    broadcast('data-changed', { type: 'publishedBooks', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ─── Admin: Authors management ─────────────────────────────────────────────
router.get('/authors', async (req, res) => {
  try {
    // یک‌مرحله‌ای با $lookup — بدون دو کوئری جداگانه (خیلی سریع‌تر)
    const rows = await User.aggregate([
      { $match: { role: { $in: ['author', 'admin'] } } },
      { $sort: { createdAt: -1 } },
      { $lookup: {
          from: 'publishedbooks',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$authorId', '$$id'] }, { $eq: ['$type', 'note'] }] } } },
            { $group: { _id: null,
                published: { $sum: { $cond: [{ $ne: ['$isDraft', true] }, 1, 0] } },
                drafts: { $sum: { $cond: [{ $eq: ['$isDraft', true] }, 1, 0] } } } },
          ],
          as: 'counts' } },
      { $addFields: {
          noteCount: { $ifNull: [{ $arrayElemAt: ['$counts.published', 0] }, 0] },
          draftCount: { $ifNull: [{ $arrayElemAt: ['$counts.drafts', 0] }, 0] },
      } },
      { $project: { counts: 0, securityKey: 0, password: 0 } },
    ]);
    res.json(rows.map(r => ({ ...r, _id: String(r._id) })));
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
    broadcast('data-changed', { type: 'users', action: 'update', item: user.toObject() });
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
    // حذف کامل تمام پیام‌ها و محتوای کاربر
    await deleteUserContent(req.params.id);
    broadcast('data-changed', { type: 'users', action: 'delete', id: req.params.id });
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
      const targets = await User.find({ _id: { $in: ids }, role: { $ne: 'admin' } }).select('_id');
      await User.deleteMany({ _id: { $in: targets.map(t => t._id) } });
      // حذف کامل محتوای همهٔ کاربران حذف‌شده (به‌صورت موازی)
      await Promise.all(targets.map(t => deleteUserContent(t._id)));
      broadcast('data-changed', { type: 'users', action: 'ids-delete', ids: targets.map(t => String(t._id)) });
      return res.json({ success: true, deleted: targets.length });
    }
    if (action === 'role' && ['user', 'author', 'admin'].includes(value)) {
      await User.updateMany({ _id: { $in: ids } }, { role: value });
      broadcast('data-changed', { type: 'users', action: 'ids-update', ids });
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
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });
    const commentIds = (post.comments || []).map((c) => String(c._id));
    await Post.findByIdAndDelete(req.params.id);
    try { await Notification.deleteMany({ sourceId: { $in: [req.params.id, ...commentIds] } }); } catch (ignored) {}
    // هماهنگی: حذف پست محفل برای یک کتاب → نظرات گفتگوی همان کتاب هم حذف شوند
    try {
      if (post.bookId) {
        const bookComments = await Comment.find({ type: 'book', bookId: post.bookId }).select('_id').lean();
        const bookCommentIds = bookComments.map((c) => String(c._id));
        if (bookCommentIds.length) {
          await Comment.deleteMany({ type: 'book', bookId: post.bookId });
          try { await Notification.deleteMany({ sourceId: { $in: bookCommentIds } }); } catch (ignored) {}
          broadcast('data-changed', { type: 'comments', action: 'ids-delete', ids: bookCommentIds });
        }
      }
    } catch (ignored) {}
    broadcast('data-changed', { type: 'posts', action: 'delete', id: req.params.id });
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
    broadcast('data-changed', { type: 'posts', action: 'update', item: post.toObject() });
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
      const posts = await Post.find({ _id: { $in: ids } }).select('comments').lean();
      const notifIds = [];
      posts.forEach((p) => {
        notifIds.push(String(p._id));
        (p.comments || []).forEach((c) => notifIds.push(String(c._id)));
      });
      await Post.deleteMany({ _id: { $in: ids } });
      try { if (notifIds.length) await Notification.deleteMany({ sourceId: { $in: notifIds } }); } catch (ignored) {}
      broadcast('data-changed', { type: 'posts', action: 'ids-delete', ids });
      return res.json({ success: true, deleted: ids.length });
    }
    if (action === 'pin') {
      await Post.updateMany({ _id: { $in: ids } }, { isPinned: true });
      broadcast('data-changed', { type: 'posts', action: 'ids-pin', ids });
      return res.json({ success: true, updated: ids.length });
    }
    if (action === 'unpin') {
      await Post.updateMany({ _id: { $in: ids } }, { isPinned: false });
      broadcast('data-changed', { type: 'posts', action: 'ids-unpin', ids });
      return res.json({ success: true, updated: ids.length });
    }
    res.status(400).json({ error: 'عملیات نامعتبر' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// دستور پاکسازی: حذف تمام پیام‌های محفل (فقط برای ادمین)
router.post('/posts/purge', async (req, res) => {
  try {
    const postIds = await Post.find({}, '_id').lean();
    const notifIds = [];
    postIds.forEach((p) => notifIds.push(String(p._id)));
    const deleted = await Post.deleteMany({});
    try {
      if (notifIds.length) await Notification.deleteMany({ sourceId: { $in: notifIds } });
    } catch (ignored) {}
    broadcast('data-changed', { type: 'posts', action: 'purge' });
    res.json({ success: true, deleted: deleted.deletedCount || 0 });
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
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });
    const deleteRecursive = async (parentId) => {
      const children = await Comment.find({ parentId });
      for (const child of children) {
        await deleteRecursive(String(child._id));
        try { await Notification.deleteMany({ sourceId: child._id }); } catch (ignored) {}
        await Comment.findByIdAndDelete(child._id);
      }
    };
    await deleteRecursive(req.params.id);
    try { await Notification.deleteMany({ sourceId: req.params.id }); } catch (ignored) {}
    await Comment.findByIdAndDelete(req.params.id);
    // هماهنگی: حذف نظر کتاب در پنل ادمین → پست محفل مربوط به همان کتاب هم حذف شود
    try {
      if (comment.type === 'book' && comment.bookId) {
        const relatedPost = await Post.findOne({ bookId: comment.bookId });
        if (relatedPost) {
          const relatedCommentIds = (relatedPost.comments || []).map((c) => String(c._id));
          await Post.findByIdAndDelete(relatedPost._id);
          try { await Notification.deleteMany({ sourceId: { $in: [String(relatedPost._id), ...relatedCommentIds] } }); } catch (ignored) {}
          broadcast('data-changed', { type: 'posts', action: 'delete', id: String(relatedPost._id) });
        }
      }
    } catch (ignored) {}
    broadcast('data-changed', { type: 'comments', action: 'delete', id: req.params.id });
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
    broadcast('data-changed', { type: 'comments', action: 'update', item: comment.toObject() });
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
      const comments = await Comment.find({ _id: { $in: ids } }).select('_id').lean();
      const notifIds = new Set(comments.map((c) => String(c._id)));
      await Comment.deleteMany({ _id: { $in: ids } });
      try { if (notifIds.size) await Notification.deleteMany({ sourceId: { $in: [...notifIds] } }); } catch (ignored) {}
      broadcast('data-changed', { type: 'comments', action: 'ids-delete', ids });
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

router.post('/users/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (user.role === 'superadmin') return res.status(400).json({ error: 'امکان بن مدیر سیستم وجود ندارد' });

    user.banned = true;
    await user.save();

    const deleted = await deleteUserContent(userId);

    broadcast('data-changed', { type: 'users', action: 'update', item: { _id: userId, banned: true } });

    res.json({ success: true, banned: true, deleted });
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
