// ساخت دو کاربر تست (کاربر عادی + ادمین) برای تست ویژگی‌های جدید
// اجرا روی سرور: cd /opt/soha/server && node /tmp/soha-create-test-users.mjs
import { createRequire } from 'module';
const require = createRequire('/opt/soha/server/');
const mongoose = require('/opt/soha/server/node_modules/mongoose/index.js');
require('/opt/soha/server/node_modules/dotenv/config.js');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soha';
await mongoose.connect(MONGODB_URI);
console.log('connected');

const { default: User } = await import('file:///opt/soha/server/models/User.js');

const SPECS = [
  { phoneNumber: '09350000001', password: 'test12345', name: 'کاربر تست', role: 'user', avatar: '' },
  { phoneNumber: '09350000002', password: 'test12345', name: 'ادمین تست', role: 'admin', avatar: '' },
];

for (const s of SPECS) {
  const existing = await User.findOne({ phoneNumber: s.phoneNumber });
  if (existing) {
    console.log('exists, deleting:', s.phoneNumber);
    await User.deleteMany({ phoneNumber: s.phoneNumber });
  }
  const u = await User.create({ ...s, warnings: 0, banned: false, muted: false, interests: [], library: {} });
  console.log('created', s.phoneNumber, s.role, '->', String(u._id));
}

await mongoose.disconnect();
console.log('DONE');