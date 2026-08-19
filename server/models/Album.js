import mongoose from 'mongoose';

const albumItemSchema = new mongoose.Schema({
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast', default: null },
  episodeIndex: { type: Number, default: null },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublishedBook', default: null },
  title: { type: String, default: '' },
  cover: { type: String, default: '' },
  content: { type: String, default: '' },
}, { _id: true });

const albumSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['audio', 'video'], default: 'audio' },
  title: { type: String, required: true, trim: true },
  cover: { type: String, default: '' },
  items: { type: [albumItemSchema], default: [] },
  shared: { type: Boolean, default: false },
}, { timestamps: true });

albumSchema.index({ userId: 1 });
albumSchema.index({ shared: 1 });

export default mongoose.model('Album', albumSchema);