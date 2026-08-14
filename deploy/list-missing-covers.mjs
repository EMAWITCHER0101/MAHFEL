import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Podcast from './models/Podcast.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/soha', { serverSelectionTimeoutMS: 8000 });

const all = await Podcast.find({}, 'title cover speakerId episodes').lean();
const missing = all.filter(p => !p.cover || p.cover === '');
console.log('TOTAL PODCASTS:', all.length);
console.log('WITHOUT COVER:', missing.length);
for (const p of missing) {
  console.log(JSON.stringify({ id: p._id, title: p.title, speakerId: p.speakerId, epCount: p.episodes?.length }));
}
await mongoose.disconnect();
