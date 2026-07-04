import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'author', 'admin'], default: 'user' },
  warnings: { type: Number, default: 0 },
  banned: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  mutedUntil: { type: Date, default: null },
  mutedReason: { type: String, default: '' },
  interests: [{ type: String }],
  securityKey: String,
  library: {
    podcasts: [{ type: String }],
    episodes: [{ podcastId: String, episodeIndex: Number }],
    videos: [{ type: String }],
    books: [{ type: Number }],
    notes: [{ type: Number }],
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

export default mongoose.model('User', userSchema);
