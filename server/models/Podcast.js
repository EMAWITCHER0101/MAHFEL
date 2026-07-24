import mongoose from 'mongoose';

const episodeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  description: { type: String, default: '' },
  duration: { type: String, default: '00:00' },
  audioUrl: { type: String, default: '' },
  date: { type: String, default: '' },
  isNew: { type: Boolean, default: true },
  cover: String,
  relatedFileUrl: String,
  viewCount: { type: Number, default: 0 },
  fullText: { type: String, default: '' },
}, { suppressReservedKeysWarning: true });

const podcastSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  speakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
  duration: { type: String, default: '0' },
  episodes: [episodeSchema],
  year: { type: Number, default: new Date().getFullYear() },
  categories: [{ type: String }],
  isSquare: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
}, { timestamps: true });

podcastSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Podcast', podcastSchema);
