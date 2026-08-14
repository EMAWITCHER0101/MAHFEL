import mongoose from 'mongoose';

const publishedBookSchema = new mongoose.Schema({
  cover: { type: String, default: '' },
  backCover: String,
  title: { type: String, required: true, index: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  authorName: { type: String, default: 'نشر سرای هنر و اندیشه' },
  pdfUrl: String,
  buyUrl: String,
  isNew: { type: Boolean, default: false },
  price: { type: String, default: '۰' },
  contentHtml: { type: String, default: '' },
  tableOfContents: String,
  type: { type: String, enum: ['book', 'pamphlet', 'note'], default: 'book' },
  date: String,
  relatedAudioIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Podcast' }],
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDraft: { type: Boolean, default: false },
}, { timestamps: true, suppressReservedKeysWarning: true });

publishedBookSchema.index({ title: 'text', description: 'text' });
publishedBookSchema.index({ authorId: 1, type: 1 });
publishedBookSchema.index({ type: 1, isDraft: 1, createdAt: -1 });

export default mongoose.model('PublishedBook', publishedBookSchema);
