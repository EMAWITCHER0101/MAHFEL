import mongoose from 'mongoose';

const appUpdateSchema = new mongoose.Schema({
  // آخرین نسخه اندروید (APK)
  apkVersion: { type: String, default: '' },
  apkUrl: { type: String, default: '' },
  apkMessage: { type: String, default: '' },
  // آخرین نسخه دسکتاپ (Windows)
  desktopVersion: { type: String, default: '' },
  desktopUrl: { type: String, default: '' },
  desktopMessage: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

// فقط یک سند واحد نگه‌داری می‌شود (بیشترین نسخه آخرین نسخه است)
export default mongoose.model('AppUpdate', appUpdateSchema);
