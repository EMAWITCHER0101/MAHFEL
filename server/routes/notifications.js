import { Router } from 'express';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
import { auth, requireAuth, requireRole } from '../middleware/auth.js';
import webpush from 'web-push';

const router = Router();

// VAPID keys — use env if present, else ephemeral (generated on first run and cached in process for the session)
let vapidKeys = null;
const getVapidKeys = () => {
  if (vapidKeys) return vapidKeys;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@soha-sima.ir';
  if (pub && priv) {
    vapidKeys = { publicKey: pub, privateKey: priv, subject: sub };
  } else {
    const gen = webpush.generateVAPIDKeys();
    vapidKeys = { publicKey: gen.publicKey, privateKey: gen.privateKey, subject: sub };
  }
  webpush.setVapidDetails(vapidKeys.subject, vapidKeys.publicKey, vapidKeys.privateKey);
  return vapidKeys;
};

router.get('/public-key', async (req, res) => {
  try {
    const keys = getVapidKeys();
    res.json({ publicKey: keys.publicKey });
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

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(30);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: 'خطا در دریافت نوتیفیکیشن' });
  }
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { title, body, target } = req.body;
    if (!title || !body || !title.trim() || !body.trim()) {
      return res.status(400).json({ error: 'عنوان و متن نوتیفیکیشن الزامی است' });
    }
    const notification = await Notification.create({
      title: title.trim(),
      body: body.trim(),
      target: target || 'all',
    });

    // Web-push delivery to subscribed devices (fire-and-forget)
    res.status(201).json(notification);
    sendWebPush(notification);
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