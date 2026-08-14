import { Router } from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

const router = Router();

// پروفایل عمومی کاربر (برای نمایش روی پیام‌ها — مثل تلگرام)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name avatar role createdAt banned muted mutedUntil warnings');
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });

    const [postCount, commentCount] = await Promise.all([
      Post.countDocuments({ userId: user._id }),
      Comment.countDocuments({ userId: user._id }),
    ]);

    res.json({
      id: user._id,
      name: user.name || 'کاربر',
      avatar: user.avatar || '',
      role: user.role || 'user',
      createdAt: user.createdAt,
      banned: !!user.banned,
      muted: !!user.muted,
      mutedUntil: user.mutedUntil || null,
      warnings: user.warnings || 0,
      postCount,
      commentCount,
    });
  } catch (e) {
    console.error('GET USER PROFILE ERROR', e);
    res.status(500).json({ error: 'خطا در دریافت پروفایل' });
  }
});

export default router;