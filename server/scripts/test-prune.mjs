// Test the sendWebPush error/prune logic in isolation by importing the route logic
// We simulate: a sub whose endpoint points to an unreachable host (fast connection refused)
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/soha');

const testEndpoint = 'https://127.0.0.1:1/fcm/send/dead'; // connection refused → immediate error

const vapid = webpush.generateVAPIDKeys();
webpush.setVapidDetails('mailto:admin@soha-sima.ir', vapid.publicKey, vapid.privateKey);

// Insert a test subscription with keys from generateVAPIDKeys (valid p256dh format)
const sub = await PushSubscription.create({
  userId: new mongoose.Types.ObjectId(),
  endpoint: testEndpoint,
  keys: { p256dh: webpush.generateVAPIDKeys().publicKey, auth: Buffer.from('0123456789abcdef').toString('base64url') },
  deviceLabel: 'prune-test',
});
console.log('test sub created:', sub._id);

// Mimic sendWebPush single delivery (no payload required for empty? we use payload)
let statusCode = null;
let pruned = false;
try {
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: sub.keys },
    JSON.stringify({ title: 't', body: 'b' }),
    { TTL: 3600 }
  );
  console.log('send succeeded (unexpected for dead endpoint)');
} catch (e) {
  statusCode = e.statusCode;
  console.log('send threw, statusCode =', statusCode, 'message:', e.message.split('\n')[0]);
  if (statusCode === 404 || statusCode === 410) pruned = true;
}

// Verify DB state + prune behavior
const stillThere = await PushSubscription.findById(sub._id);
console.log('still in DB:', !!stillThere, '| would prune (404/410):', pruned);

if (stillThere) await PushSubscription.deleteOne({ _id: sub._id });
console.log('DONE');
process.exit(0);