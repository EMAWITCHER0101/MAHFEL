import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

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

/** ارسال push به همهٔ دستگاه‌های مشترک (fire-and-forget) — برای همگام‌سازی فوری حتی وقتی تب اپ بسته/پس‌زمینه است */
export async function sendWebPushToAll({ title, body, url, icon = '/logo.png', id = '' }) {
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

export default sendWebPushToAll;