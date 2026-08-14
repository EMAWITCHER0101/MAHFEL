import { Router } from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { requireAuth, requireRole, auth } from '../middleware/auth.js';
import { containsProfanity } from '../utils/profanityFilter.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { sort = '-isoDate', limit = 50, skip = 0 } = req.query;
    const posts = await Post.find()
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const allAuthors = new Set();
    posts.forEach(p => { if (p.author) allAuthors.add(p.author); });
    posts.forEach(p => (p.comments || []).forEach(c => { if (c.author) allAuthors.add(c.author); }));
    const users = await User.find({ name: { $in: [...allAuthors] } }).select('name avatar');
    const avatarMap = {};
    const nameById = {};
    users.forEach(u => { if (u.avatar) avatarMap[u.name] = u.avatar; nameById[u._id.toString()] = u.name; });
    const userIds = new Set();
    posts.forEach(p => { if (p.userId) userIds.add(p.userId.toString()); });
    posts.forEach(p => (p.comments || []).forEach(c => { if (c.userId) userIds.add(c.userId.toString()); }));
    if (userIds.size) {
      const usersById = await User.find({ _id: { $in: [...userIds] } }).select('name avatar');
      usersById.forEach(u => { if (u.avatar) avatarMap[u._id.toString()] = u.avatar; nameById[u._id.toString()] = u.name; });
    }

    const result = posts.map(p => {
      const obj = p.toObject();
      if (obj.userId && nameById[obj.userId.toString()]) obj.author = nameById[obj.userId.toString()];
      if (obj.userId && avatarMap[obj.userId.toString()]) obj.authorAvatarUrl = avatarMap[obj.userId.toString()];
      if (!obj.authorAvatarUrl && avatarMap[obj.author]) obj.authorAvatarUrl = avatarMap[obj.author];
      if (obj.comments) {
        obj.comments = obj.comments.map(c => {
          if (c.userId && nameById[c.userId.toString()]) c.author = nameById[c.userId.toString()];
          if (c.userId && avatarMap[c.userId.toString()]) c.authorAvatarUrl = avatarMap[c.userId.toString()];
          if (!c.authorAvatarUrl && avatarMap[c.author]) c.authorAvatarUrl = avatarMap[c.author];
          return c;
        });
      }
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.banned) {
      return res.status(403).json({ error: 'شما به دلیل تخلفات مکرر از سایت اخراج شده‌اید.', banned: true });
    }
    if (req.user.muted) {
      const until = req.user.mutedUntil ? new Date(req.user.mutedUntil).toLocaleString('fa-IR') : 'نامحدود';
      return res.status(403).json({ error: `شما در حالت سکوت هستید تا ${until}`, muted: true, mutedUntil: req.user.mutedUntil });
    }
    const body = { ...req.body };
    if (body.text) {
      const check = containsProfanity(body.text);
      if (check.hasProfanity) {
        req.user.warnings = (req.user.warnings || 0) + 1;
        if (req.user.warnings >= 3) {
          req.user.banned = true;
          await req.user.save();
          return res.status(403).json({ error: 'شما به دلیل ۳ بار تخلف از سایت اخراج شدید.', banned: true, warnings: req.user.warnings });
        }
        await req.user.save();
        return res.status(400).json({ error: `متن شما نامناسب است. اخطار ${req.user.warnings} از ۳`, warnings: req.user.warnings });
      }
    }
    const clientAvatar = body.authorAvatarUrl || '';
    delete body.authorAvatarUrl;
    const avatarUrl = req.user.avatar || clientAvatar || '';
    if (avatarUrl && !req.user.avatar) {
      req.user.avatar = avatarUrl;
      await req.user.save();
    }
    const post = new Post({
      ...body,
      author: req.user.name,
      authorAvatarUrl: avatarUrl,
      userId: req.user._id,
      isoDate: new Date().toISOString(),
      date: 'همین الان',
    });
    await post.save();
    broadcast('data-changed', { type: 'posts', action: 'create', item: post.toObject() });
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.banned) {
      return res.status(403).json({ error: 'شما به دلیل تخلفات مکرر از سایت اخراج شده‌اید.', banned: true });
    }
    if (req.user.muted) {
      const until = req.user.mutedUntil ? new Date(req.user.mutedUntil).toLocaleString('fa-IR') : 'نامحدود';
      return res.status(403).json({ error: `شما در حالت سکوت هستید تا ${until}`, muted: true, mutedUntil: req.user.mutedUntil });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });
    if (post.author !== req.user.name && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    if (req.body.text) {
      const check = containsProfanity(req.body.text);
      if (check.hasProfanity) {
        req.user.warnings = (req.user.warnings || 0) + 1;
        if (req.user.warnings >= 3) {
          req.user.banned = true;
          await req.user.save();
          return res.status(403).json({ error: 'شما به دلیل ۳ بار تخلف از سایت اخراج شدید.', banned: true, warnings: req.user.warnings });
        }
        await req.user.save();
        return res.status(400).json({ error: `متن شما نامناسب است. اخطار ${req.user.warnings} از ۳`, warnings: req.user.warnings });
      }
    }
    Object.assign(post, req.body, { isEdited: true });
    await post.save();
    broadcast('data-changed', { type: 'posts', action: 'update', item: post.toObject() });
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });
    if (post.author !== req.user.name && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    await Post.findByIdAndDelete(req.params.id);
    broadcast('data-changed', { type: 'posts', action: 'delete', id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/like', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });
    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });

    if (comment.author !== req.user.name && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'شما نمی‌توانید نظر دیگران را حذف کنید' });
    }

    const getCommentId = (c) => String(c._id);

    const deleteReplies = (parentId) => {
      const replies = post.comments.filter(c => c.replyTo === parentId);
      replies.forEach(r => {
        deleteReplies(getCommentId(r));
        post.comments.pull(r._id);
      });
    };

    deleteReplies(req.params.commentId);
    post.comments.pull(req.params.commentId);
    await post.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    if (req.user.banned) {
      return res.status(403).json({ error: 'شما به دلیل تخلفات مکرر از سایت اخراج شده‌اید.', banned: true });
    }
    if (req.user.muted) {
      const until = req.user.mutedUntil ? new Date(req.user.mutedUntil).toLocaleString('fa-IR') : 'نامحدود';
      return res.status(403).json({ error: `شما در حالت سکوت هستید تا ${until}`, muted: true, mutedUntil: req.user.mutedUntil });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'نظر یافت نشد' });

    if (comment.author !== req.user.name && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'شما نمی‌توانید نظر دیگران را ویرایش کنید' });
    }

    if (req.body.text !== undefined) {
      const check = containsProfanity(req.body.text);
      if (check.hasProfanity) {
        req.user.warnings = (req.user.warnings || 0) + 1;
        if (req.user.warnings >= 3) {
          req.user.banned = true;
          await req.user.save();
          return res.status(403).json({ error: 'شما به دلیل ۳ بار تخلف از سایت اخراج شدید.', banned: true, warnings: req.user.warnings });
        }
        await req.user.save();
        return res.status(400).json({ error: `متن شما نامناسب است. اخطار ${req.user.warnings} از ۳`, warnings: req.user.warnings });
      }
      comment.text = req.body.text;
    }
    if (req.body.media !== undefined) comment.media = req.body.media;
    comment.isEdited = true;

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    if (req.user.banned) {
      return res.status(403).json({ error: 'شما به دلیل تخلفات مکرر از سایت اخراج شده‌اید.', banned: true });
    }
    if (req.user.muted) {
      const until = req.user.mutedUntil ? new Date(req.user.mutedUntil).toLocaleString('fa-IR') : 'نامحدود';
      return res.status(403).json({ error: `شما در حالت سکوت هستید تا ${until}`, muted: true, mutedUntil: req.user.mutedUntil });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'پست یافت نشد' });

    if (req.body.text) {
      const check = containsProfanity(req.body.text);
      if (check.hasProfanity) {
        req.user.warnings = (req.user.warnings || 0) + 1;
        if (req.user.warnings >= 3) {
          req.user.banned = true;
          await req.user.save();
          return res.status(403).json({ error: 'شما به دلیل ۳ بار تخلف از سایت اخراج شدید.', banned: true, warnings: req.user.warnings });
        }
        await req.user.save();
        return res.status(400).json({ error: `متن شما نامناسب است. اخطار ${req.user.warnings} از ۳`, warnings: req.user.warnings });
      }
    }

    const clientAvatar = req.body.authorAvatarUrl || '';
    const avatarUrl = req.user.avatar || clientAvatar || '';
    if (avatarUrl && !req.user.avatar) {
      req.user.avatar = avatarUrl;
      await req.user.save();
    }

    const comment = {
      author: req.user.name,
      authorAvatarUrl: avatarUrl,
      userId: req.user._id,
      text: req.body.text,
      date: 'همین الان',
      isoDate: new Date().toISOString(),
      replyTo: req.body.replyTo,
      quotedText: req.body.quotedText,
      likes: 0,
      media: req.body.media || [],
      audioTimestamp: req.body.audioTimestamp || null,
    };

    post.comments.push(comment);
    await post.save();
    broadcast('data-changed', { type: 'posts', action: 'update', item: post.toObject() });

    // نوتیفیکیشن پاسخ: اگر ریپلای باشد → برای صاحب نظر اصلی
    try {
      if (comment.replyTo && req.user) {
        const parent = post.comments.find(c =>
          c._id && (String(c._id) === String(comment.replyTo) || String(c.id || '') === String(comment.replyTo)));
        if (parent && parent.userId && String(parent.userId) !== String(req.user._id)) {
          await Notification.create({
            title: '💬 پاسخ جدید',
            body: `${req.user.name} به نظر شما پاسخ داد`,
            userId: parent.userId,
            link: `/mahfel/post/${req.params.id}`,
            type: 'reply',
          });
        }
      }
    } catch (ignored) {}

    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
