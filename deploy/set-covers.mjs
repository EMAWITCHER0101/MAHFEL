import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Podcast from './models/Podcast.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/soha', { serverSelectionTimeoutMS: 8000 });

const UPDATES = [
  { id: '6a79267d859c4c6b63996562', cover: 'https://soha-sima.ir/wp-content/uploads/2024/01/داوری-اردکانی-1-e1705145557746.jpg', title: 'ایران مسایل و مشکلاتش' },
  { id: '6a79267e859c4c6b6399685d', cover: 'https://soha-sima.ir/wp-content/uploads/2026/06/photo_2026-06-20_19-10-07.webp', title: 'روضه محرم 1405 - در جستجوی اشک' },
  { id: '6a79267e859c4c6b63996867', cover: 'https://soha-sima.ir/wp-content/uploads/2026/07/411134_845-e1785278056634.webp', title: 'آوینی و زبان بعثت' },
  { id: '6a79267e859c4c6b63996869', cover: 'https://soha-sima.ir/wp-content/uploads/2026/06/بانوی-ایرانی-اصلی-1.1-scaled.jpg', title: 'بانوی ایرانی' },
  { id: '6a79267e859c4c6b6399686b', cover: 'https://soha-sima.ir/wp-content/uploads/2026/07/ما-و-حضور-اربعینی.webp', title: 'ما و حضور اربعینی پیش‌رو' },
];

let updated = 0;
for (const u of UPDATES) {
  const p = await Podcast.findById(u.id);
  if (!p) { console.log('NOT FOUND:', u.id, u.title); continue; }
  p.cover = u.cover;
  if (p.episodes?.[0] && p.episodes.length === 1) p.episodes[0].cover = u.cover;
  await p.save();
  console.log('UPDATED:', u.title);
  updated++;
}
console.log('DONE. Updated:', updated);
await mongoose.disconnect();
