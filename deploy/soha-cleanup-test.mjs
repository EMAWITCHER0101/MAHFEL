// حذف کاربران تست و محتوایشان + ریست تنظیمات چت
// اجرا روی سرور: cd /opt/soha/server && node /tmp/soha-cleanup-test.mjs
import { createRequire } from 'module';
const require = createRequire('/opt/soha/server/');
const mongoose = require('/opt/soha/server/node_modules/mongoose/index.js');
require('/opt/soha/server/node_modules/dotenv/config.js');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soha';
await mongoose.connect(MONGODB_URI);
console.log('connected');

const { default: User } = await import('file:///opt/soha/server/models/User.js');
const { default: Post } = await import('file:///opt/soha/server/models/Post.js');
const { default: Notification } = await import('file:///opt/soha/server/models/Notification.js');
const { default: PurchaseRequest } = await import('file:///opt/soha/server/models/PurchaseRequest.js');
const { default: Expense } = await import('file:///opt/soha/server/models/Expense.js');
const { default: Setting } = await import('file:///opt/soha/server/models/Setting.js');

const phones = ['09350000001', '09350000002'];
const users = await User.find({ phoneNumber: { $in: phones } }).select('_id name');
for (const u of users) {
  await Post.deleteMany({ $or: [{ userId: u._id }, { 'comments.userId': u._id }] });
  await PurchaseRequest.deleteMany({ userId: u._id });
  console.log('content deleted for', u.name || u._id);
}
await User.deleteMany({ phoneNumber: { $in: phones } });
console.log('users deleted:', users.length);

const notifDel = await Notification.deleteMany({ type: 'admin', body: { $regex: /کاربر تست|ادمین تست/ } });
console.log('test notifications deleted:', notifDel.deletedCount);

await Expense.deleteMany({});
console.log('expenses cleared');

await Setting.updateOne(
  { key: 'community_chat' },
  { $set: { value: { chatEnabled: true, chatMessage: '' } } },
  { upsert: true }
);
console.log('chat settings reset to OPEN');

await mongoose.disconnect();
console.log('DONE');