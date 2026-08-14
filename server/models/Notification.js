import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  target: { type: String, default: 'all' },
  // userId = null → همگانی؛ مقداردهی → فقط برای همان کاربر (مثل پاسخ به نظر)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // لینک مقصد هنگام لمس نوتیفیکیشن
  link: { type: String, default: '' },
  // نوع: admin | reply | video | playlist
  type: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
