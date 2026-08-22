import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  type: { type: String, enum: ['podcast', 'video', 'book'], required: true },
  author: { type: String, required: true },
  authorAvatarUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  text: { type: String, required: true },
  date: { type: String, default: '' },
  isoDate: { type: String, default: () => new Date().toISOString() },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  isFeatured: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast' },
  episodeIndex: Number,
  podcastTitle: String,
  episodeTitle: String,
  timestamp: Number,
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  videoTitle: String,
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublishedBook' },
  videoTimestamp: { type: Number, default: null },
  audioTimestamp: { type: Number, default: null },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  quotedText: String,
  media: [{ type: { type: String, enum: ['image', 'video', 'audio'] }, url: { type: String } }],
}, { timestamps: true });

commentSchema.index({ author: 'text', text: 'text' });
commentSchema.index({ type: 1, videoId: 1 });
commentSchema.index({ type: 1, podcastId: 1 });
commentSchema.index({ type: 1, bookId: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ userId: 1 });

export default mongoose.model('Comment', commentSchema);
