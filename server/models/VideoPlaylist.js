import mongoose from 'mongoose';

const videoPlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  videoIds: [{ type: String, ref: 'Video' }],
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('VideoPlaylist', videoPlaylistSchema);
