import { Router } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import { auth, requireAuth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';
import { sendWebPushToAll, sendWebPushToUser, getPublicKey } from '../utils/webpush.js';

const router = Router();

router.get('/public-key', async (req, res) => {
  try {
    res.json({ publicKey: getPublicKey() });
  } catch (e) {
    res.status(500).json({ error: 'خطا' });
  }
});

// Client registers an FCM token (APK device) — push حتی وقتی اپ بسته است
router.post('/push/register', requireAuth, async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    if (!token) return res.status(400).json({ error: 'token required' });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { fcmTokens: token } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطا' });
  }
});

// Remove FCM token (logout)
router.post('/push/unregister', requireAuth, async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    if (token) await User.findByIdAndUpdate(req.user._id, { $pull: { fcmTokens: token } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطا' });
  }
});

// Client registers a push subscription (auth'd user)
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'اطلاعات اشتراک ناقص است' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        userAgent: req.headers['user-agent'] || '',
        deviceLabel: (req.body.deviceLabel || '').slice(0, 60),
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('SUBSCRIBE ERROR', e);
    res.status(500).json({ error: 'خطا در ثبت اشتراک' });
  }
});

router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطا' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    // همه‌گانی (target: all) + اختصاصیِ کاربرِ لاگین‌شده (userId) + فعالیت‌های ادمین (target: admins فقط برای ادمین)
    const filter = req.user
      ? {
          $or: [
            { userId: req.user._id },
            { userId: null, target: 'all' },
            ...(req.user.role === 'admin' ? [{ userId: null, target: 'admins' }] : []),
          ],
        }
      : { userId: null, target: 'all' };
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(30);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: 'خطا در دریافت نوتیفیکیشن' });
  }
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { title, body, target, link, type, userId } = req.body;
    if (!title || !body || !title.trim() || !body.trim()) {
      return res.status(400).json({ error: 'عنوان و متن نوتیفیکیشن الزامی است' });
    }
    const targeted = !!userId && mongoose.isValidObjectId(userId);
    const notification = await Notification.create({
      title: title.trim(),
      body: body.trim(),
      target: targeted ? 'user' : (target || 'all'),
      userId: targeted ? userId : null,
      link: link || '',
      type: type || 'admin',
    });

    // Web-push delivery to subscribed devices (fire-and-forget)
    res.status(201).json(notification);
    const pushData = {
      title: notification.title,
      body: notification.body,
      url: notification.link || '/',
      id: String(notification._id || ''),
    };
    if (targeted) {
      sendWebPushToUser(userId, pushData);
    } else {
      sendWebPushToAll(pushData);
    }
  } catch (e) {
    res.status(500).json({ error: 'خطا در ارسال نوتیفیکیشن' });
  }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطا در حذف نوتیفیکیشن' });
  }
});

async function sendWebPush(notification) {
  try {
    const keys = getVapidKeys();
    const subs = await PushSubscription.find({}).select('endpoint keys userId').limit(500);
    if (!subs.length) return;

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: '/logo.png',
      data: { url: '/', id: String(notification._id || '') },
    });

    const pruned = [];
    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload
        );
      } catch (e) {
        const code = e && e.statusCode;
        if (code === 404 || code === 410) pruned.push(sub._id);
      }
    }));
    if (pruned.length) await PushSubscription.deleteMany({ _id: { $in: pruned } });
  } catch (e) {
    console.error('WEBPUSH SEND ERROR', e && e.message);
  }
}

export default router;