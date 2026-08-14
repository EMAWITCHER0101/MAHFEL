import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  name: { type: String, default: 'کاربر' },
  contact: { type: String, default: '' },
  category: { type: String, default: 'other' },
  message: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('SupportMessage', supportMessageSchema);
