import mongoose from 'mongoose';
import PublishedBook from './models/PublishedBook.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soha';
const WP_API = 'https://soha-sima.ir/wp-json/wp/v2/posts?categories=11&per_page=40&_embed';

const persianDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
};

const plainText = (html) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const seedNotes = async () => {
  const list = await fetch(WP_API);
  const posts = await list.json();
  if (!Array.isArray(posts) || posts.length === 0) {
    console.log('NO POSTS');
    process.exit(1);
  }

  let inserted = 0, updated = 0, skipped = 0;

  for (const post of posts) {
    const title = (post.title?.rendered || '').replace(/<[^>]+>/g, '').trim();
    const authorName = post._embedded?.author?.[0]?.name || 'سُها';
    const contentHtml = (post.content?.rendered || '').trim();
    const description = plainText(contentHtml).slice(0, 140);
    if (!title || !contentHtml || contentHtml.length < 200) { skipped++; continue; }

    const note = {
      type: 'note',
      title,
      authorName: authorName === 'سُها' ? 'سیمای هنر و اندیشه' : authorName,
      date: persianDate(post.date),
      description,
      contentHtml,
      isDraft: false,
      authorId: null,
    };

    const existing = await PublishedBook.findOne({ title, type: 'note' });
    if (existing) {
      await PublishedBook.updateOne({ _id: existing._id }, note);
      updated++;
    } else {
      await PublishedBook.create(note);
      inserted++;
    }
  }

  const total = await PublishedBook.countDocuments({ type: 'note' });
  console.log(`INSERTED: ${inserted}, UPDATED: ${updated}, SKIPPED: ${skipped}, TOTAL NOTES: ${total}`);
  await mongoose.disconnect();
  process.exit(0);
};

try {
  await mongoose.connect(MONGODB_URI);
} catch (e) {
  console.log('MONGO_ERROR', e.message);
  process.exit(1);
}
await seedNotes();