// Server-side prep: create an admin test user + an author test user
import mongoose from 'mongoose';
import User from './models/User.js';
import PublishedBook from './models/PublishedBook.js';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soha';

try {
  await mongoose.connect(URI);
} catch (e) {
  console.log('MONGO_ERROR', e.message);
  process.exit(1);
}

const upsert = async (phone, role, name) => {
  await User.deleteOne({ phoneNumber: phone });
  const user = new User({
    name,
    phoneNumber: phone,
    password: 'test1234',
    role,
    interests: [],
    library: { podcasts: [], episodes: [], videos: [], books: [], notes: [] },
  });
  await user.save();
  console.log('CREATED', role, phone, user._id.toString());
  return user._id.toString();
};

const adminId = await upsert('09900000001', 'admin', 'تست-مدیر');
const authorId = await upsert('09900000002', 'author', 'تست نویسنده');

// Count current notes
const total = await PublishedBook.countDocuments({ type: 'note' });
const drafts = await PublishedBook.countDocuments({ type: 'note', isDraft: true });
console.log(`NOTES total=${total} drafts=${drafts}`);
console.log('ADMIN_ID', adminId);
console.log('AUTHOR_ID', authorId);
await mongoose.disconnect();
process.exit(0);