import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminRequestSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  message: { type: String, default: '' },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  grantedPermissions: [{ type: String }],
}, { _id: true });

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'author', 'admin', 'superadmin'], default: 'user' },
  adminPermissions: [{ type: String }],
  adminRequests: [adminRequestSchema],
  warnings: { type: Number, default: 0 },
  banned: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  mutedUntil: { type: Date, default: null },
  mutedReason: { type: String, default: '' },
  interests: [{ type: String }],
  securityKey: String,
  fcmTokens: [{ type: String }],
  library: {
    podcasts: [{ type: String }],
    episodes: [{ podcastId: String, episodeIndex: Number }],
    videos: [{ type: String }],
    books: [{ type: Number }],
    notes: [{ type: Number }],
    posts: [{ type: String }],
    bookmarks: [{ bookId: String, bookTitle: String, page: Number, text: String }],
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (this.isModified('securityKey') && this.securityKey) {
    this.securityKey = await bcrypt.hash(this.securityKey, 10);
  }
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.compareSecurityKey = async function (candidateKey) {
  if (!this.securityKey) return false;
  return bcrypt.compare(candidateKey, this.securityKey);
};

// ایندکس‌های سرعت برای مدیریت کاربران/نویسندگان
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 1 });

export default mongoose.model('User', userSchema);
