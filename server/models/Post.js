import mongoose from 'mongoose';

const mediaItemSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video', 'audio'], required: true },
  url: { type: String, required: true },
}, { _id: false });

const postCommentSchema = new mongoose.Schema({
  author: { type: String, required: true },
  authorAvatarUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  text: { type: String, required: true },
  date: { type: String, default: '' },
  isoDate: { type: String, default: () => new Date().toISOString() },
  replyTo: String,
  quotedText: String,
  likes: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  media: { type: [mediaItemSchema], default: [] },
  audioTimestamp: { type: Number, default: null },
  videoTimestamp: { type: Number, default: null },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: { type: String, required: true },
  authorAvatarUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: String, default: '' },
  isoDate: { type: String, default: () => new Date().toISOString() },
  text: { type: String, default: '' },
  media: { type: [mediaItemSchema], default: [] },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast' },
  episodeIndex: Number,
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublishedBook' },
  albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
  timestamp: Number,
  comments: [postCommentSchema],
  likes: { type: Number, default: 0 },
  reactions: { type: Map, of: Number },
  isPinned: { type: Boolean, default: false },
  replyToId: Number,
  isEdited: { type: Boolean, default: false },
  sourceText: String,
  isLive: { type: Boolean, default: false },
  liveStatus: { type: String, enum: ['streaming', 'ended'] },
}, { timestamps: true });

postSchema.index({ author: 'text', text: 'text' });
postSchema.index({ author: 1 });
postSchema.index({ isoDate: -1 });
postSchema.index({ videoId: 1 });
postSchema.index({ podcastId: 1 });
postSchema.index({ bookId: 1 });
postSchema.index({ userId: 1 });

export default mongoose.model('Post', postSchema);
