import webpush from 'web-push';
import fs from 'fs';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';

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

export const getPublicKey = () => getVapidKeys().publicKey;

/* ════ FCM (اندروید — اپ بسته هم دریافت می‌کند) ════ */

let fcmApp = null;

const getFcmApp = async () => {
  if (fcmApp) return fcmApp;
  try {
    const path = process.env.FCM_SERVICE_ACCOUNT || '/opt/soha/service-account.json';
    if (!fs.existsSync(path)) return null;
    const admin = (await import('firebase-admin')).default;
    const sa = JSON.parse(fs.readFileSync(path, 'utf8'));
    fcmApp = admin.initializeApp({ credential: admin.credential.cert(sa) });
    return fcmApp;
  } catch (e) {
    console.error('FCM INIT ERROR', e && e.message);
    return null;
  }
};

/** ارسال FCM multicast (chunk 500) — fire-and-forget */
async function sendFcm(tokens, { title, body, url, id = '' }) {
  try {
    const app = await getFcmApp();
    if (!app || !tokens || !tokens.length) return;
    const messaging = app.messaging();
    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);
      await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: title || 'محفل', body: body || '' },
        data: { url: url || '/', id: String(id || '') },
        android: { priority: 'high' },
      });
    }
  } catch (e) {
    console.error('FCM SEND ERROR', e && e.message);
  }
}

async function sendFcmToUser(userId, payload) {
  try {
    const u = await User.findById(userId).select('fcmTokens').lean();
    if (!u || !u.fcmTokens || !u.fcmTokens.length) return;
    await sendFcm(u.fcmTokens, payload);
  } catch { /* ignore */ }
}

async function sendFcmToAdmins(payload) {
  try {
    const admins = await User.find({ role: 'admin', 'fcmTokens.0': { $exists: true } }).select('fcmTokens').lean();
    if (!admins.length) return;
    const tokens = [];
    admins.forEach(a => { if (a.fcmTokens) tokens.push(...a.fcmTokens); });
    await sendFcm(tokens, payload);
  } catch { /* ignore */ }
}

async function sendFcmToAll(payload) {
  try {
    const users = await User.find({ 'fcmTokens.0': { $exists: true } }).select('fcmTokens').lean();
    if (!users.length) return;
    const tokens = [];
    users.forEach(u => { if (u.fcmTokens) tokens.push(...u.fcmTokens); });
    await sendFcm(tokens, payload);
  } catch { /* ignore */ }
}

/** ارسال push به همهٔ دستگاه‌های مشترک (fire-and-forget) — برای همگام‌سازی فوری حتی وقتی تب اپ بسته/پس‌زمینه است */
export async function sendWebPushToAll({ title, body, url, icon = '/logo.png', id = '' }) {
  sendFcmToAll({ title, body, url, id });
  try {
    const keys = getVapidKeys();
    const subs = await PushSubscription.find({}).select('endpoint keys userId').limit(2000);
    if (!subs.length) return;

    const payload = JSON.stringify({ title, body, icon, data: { url: url || '/', id } });

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

/** ارسال push فقط به دستگاه‌های ادمین‌ها (fire-and-forget) — برای پیام‌ها/فعالیت‌های محفل */
export async function sendWebPushToAdmins({ title, body, url, icon = '/logo.png', id = '' }) {
  sendFcmToAdmins({ title, body, url, id });
  try {
    const keys = getVapidKeys();
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    if (!admins.length) return;
    const adminIds = admins.map(a => a._id);
    const subs = await PushSubscription.find({ userId: { $in: adminIds } }).select('endpoint keys userId').limit(500);
    if (!subs.length) return;

    const payload = JSON.stringify({ title, body, icon, data: { url: url || '/', id } });

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
    console.error('WEBPUSH SEND ADMINS ERROR', e && e.message);
  }
}

/** ارسال push فقط به دستگاه‌های یک کاربر خاص (fire-and-forget) */
export async function sendWebPushToUser(userId, { title, body, url, icon = '/logo.png', id = '' }) {
  sendFcmToUser(userId, { title, body, url, id });
  try {
    const keys = getVapidKeys();
    const subs = await PushSubscription.find({ userId }).select('endpoint keys userId').limit(50);
    if (!subs.length) return;

    const payload = JSON.stringify({ title, body, icon, data: { url: url || '/', id } });

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
    console.error('WEBPUSH SEND USER ERROR', e && e.message);
  }
}

export default sendWebPushToAll;