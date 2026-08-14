import { Router } from 'express';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { requireAuth, auth } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, podcastId, videoId, bookId, sort = '-createdAt' } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (podcastId) filter.podcastId = podcastId;
    if (videoId) filter.videoId = videoId;
    if (bookId) filter.bookId = bookId;

    const comments = await Comment.find(filter).sort(sort);

    const authorNames = [...new Set(comments.map(c => c.author).filter(Boolean))];
    const userIds = [...new Set(comments.map(c => c.userId).filter(Boolean))];
    const users = await User.find({ $or: [{ name: { $in: authorNames } }, { _id: { $in: userIds } }] }).select('name avatar');
    const avatarMap = {};
    const nameById = {};
    users.forEach(u => { if (u.avatar) { avatarMap[u.name] = u.avatar; avatarMap[u._id.toString()] = u.avatar; } nameById[u._id.toString()] = u.name; });

    const commentMap = {};
    const rootComments = [];

    comments.forEach(c => {
      const obj = c.toObject();
      obj.id = obj._id;
      obj.replies = [];
      const byId = obj.userId ? nameById[obj.userId.toString()] : null;
      if (byId) obj.author = byId;
      const fromName = avatarMap[obj.author];
      const fromId = obj.userId ? avatarMap[obj.userId.toString()] : null;
      if (fromId || fromName) {
        obj.authorAvatarUrl = fromId || fromName;
      }
      commentMap[obj._id.toString()] = obj;
    });

    comments.forEach(c => {
      const obj = commentMap[c._id.toString()];
      if (obj.parentId) {
        const parent = commentMap[obj.parentId.toString()];
        if (parent) {
          parent.replies.push(obj);
        } else {
          rootComments.push(obj);
        }
      } else {
        rootComments.push(obj);
      }
    });

    res.json(rootComments);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/flat', async (req, res) => {
  try {
    const { videoId } = req.query;
    const filter = {};
    if (videoId) filter.videoId = videoId;

    const comments = await Comment.find(filter).sort('-createdAt');

    const authorNames = [...new Set(comments.map(c => c.author).filter(Boolean))];
    const userIds = [...new Set(comments.map(c => c.userId).filter(Boolean))];
    const users = await User.find({ $or: [{ name: { $in: authorNames } }, { _id: { $in: userIds } }] }).select('name avatar');
    const avatarMap = {};
    const nameById = {};
    users.forEach(u => { if (u.avatar) { avatarMap[u.name] = u.avatar; avatarMap[u._id.toString()] = u.avatar; } nameById[u._id.toString()] = u.name; });

    res.json(comments.map(c => {
      const obj = c.toObject();
      obj.id = c._id;
      const byId = obj.userId ? nameById[obj.userId.toString()] : null;
      if (byId) obj.author = byId;
      const fromName = avatarMap[obj.author];
      const fromId = obj.userId ? avatarMap[obj.userId.toString()] : null;
      if (fromId || fromName) {
        obj.authorAvatarUrl = fromId || fromName;
      }
      return obj;
    }));
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const body = { ...req.body };
    const clientAvatar = body.authorAvatarUrl || '';
    delete body.authorAvatarUrl;

    const avatarUrl = req.user.avatar || clientAvatar || '';

    if (avatarUrl && !req.user.avatar) {
      req.user.avatar = avatarUrl;
      await req.user.save();
    }

    const comment = new Comment({
      ...body,
      author: req.user.name,
      authorAvatarUrl: avatarUrl,
      userId: req.user._id,
      isoDate: new Date().toISOString(),
      date: 'همین الان',
    });
    await comment.save();

    const obj = comment.toObject();
    obj.id = obj._id;
    obj.replies = [];

    broadcast('data-changed', { type: 'comments', action: 'create', item: obj });

    // نوتیفیکیشن پاسخ: اگر ریپلای باشد → برای صاحب نظر اصلی
    try {
      if (comment.parentId && req.user) {
        const parent = await Comment.findById(comment.parentId);
        if (parent && parent.userId && String(parent.userId) !== String(req.user._id)) {
          let link = '';
          if (comment.podcastId) link = `/mahfel/podcast/${comment.podcastId}`;
          else if (comment.videoId) link = `/mahfel/video/${comment.videoId}`;
          else if (comment.bookId) link = `/mahfel/book/${comment.bookId}`;
          await Notification.create({
            title: '💬 پاسخ جدید',
            body: `${req.user.name} به نظر شما پاسخ داد`,
            userId: parent.userId,
            link,
            type: 'reply',
          });
        }
      }
    } catch (ignored) {}

    res.status(201).json(obj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });
    if (comment.author !== req.user.name && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    const { text } = req.body;
    if (text && text.trim()) {
      comment.text = text.trim();
      await comment.save();
    }
    res.json({ success: true, text: comment.text });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });
    if (comment.author !== req.user.name && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const deleteRecursive = async (parentId) => {
      const children = await Comment.find({ parentId });
      for (const child of children) {
        await deleteRecursive(String(child._id));
        await Comment.findByIdAndDelete(child._id);
      }
    };
    await deleteRecursive(req.params.id);
    await Comment.findByIdAndDelete(req.params.id);
    broadcast('data-changed', { type: 'comments', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });
    const userId = req.user?.phoneNumber || req.ip;
    if (comment.likedBy?.includes(userId)) {
      comment.likedBy = comment.likedBy.filter(id => id !== userId);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy = [...(comment.likedBy || []), userId];
      comment.likes = comment.likes + 1;
    }
    await comment.save();
    res.json({ likes: comment.likes, liked: comment.likedBy.includes(userId) });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
