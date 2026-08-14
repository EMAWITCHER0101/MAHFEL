import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Podcast from './models/Podcast.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/soha', { serverSelectionTimeoutMS: 8000 });

const FILES = [
  'پادکست - واژه‌ها در نسبت با اربعین.mp3',
  'پادکست آینده را چگونه می‌بینید؟.mp3',
  'پادکست از ملک لایبلی تا ملک سلیمانی.mp3',
  'پادکست استاد مجید - ما خودمان شاعری‌م، هنرمندی‌م.mp3',
  'پادکست انقلاب دارد حرکت می‌کند.mp3',
  'پادکست ایده‌پردازی.mp3',
  'پادکست بخشش و انفاق به واسطه توجه به طلاب.mp3',
  'پادکست راز سکوت.mp3',
  'پادکست سخنرانی به زبان انگلیسی.mp3',
  'پادکست صعود اقتصادی.mp3',
  'پادکست طراحی ستاره در زندگی.mp3',
  'پادکست طوفان الاقصی - مشخص نیست.mp3',
  'پادکست خانوادگی شدن انقلاب اسلامی.mp3',
  'پادکست تا بهشتی شدن.mp3',
  'پادکست اقیانوس یگانگی.mp3',
  'پادکست خوبان بهشتی یا تاریخ‌سازان حسینی.mp3',
  'پادکست سکرات ایمان در این زمان.mp3',
];

const BASE = 'https://dl.soha-sima.ir/آرشیو/پادکست/';
const strip = s => String(s || '').replace(/[\u200c\u200f]/g, '').trim();

try {
  const all = await Podcast.find({}, 'episodes speakerId');
  const existing = new Set(all.flatMap(p => p.episodes.map(e => e.audioUrl).filter(Boolean)).map(u => strip(decodeURIComponent(u))));
  const anyPod = all[0];
  if (!anyPod) { console.log('NO PODCASTS IN DB'); process.exit(1); }
  const speaker = anyPod.speakerId;

  let created = 0;
  for (const f of FILES) {
    const url = BASE + encodeURIComponent(f);
    if (existing.has(strip(decodeURIComponent(url)))) { console.log('SKIP (exists):', f); continue; }
    const title = f.replace(/\.mp3$/i, '');
    const p = new Podcast({
      title,
      description: '',
      cover: '',
      speakerId: speaker,
      duration: '00:00',
      episodes: [{
        title,
        subtitle: '',
        description: '',
        duration: '00:00',
        audioUrl: url,
        isNew: true,
        date: '',
        cover: '',
        viewCount: 0,
        fullText: '',
      }],
      year: 2026,
      categories: [],
      isSquare: false,
      likes: 0,
      likedBy: [],
      viewCount: 0,
    });
    await p.save();
    console.log('CREATED:', title);
    created++;
  }
  console.log('DONE. Created:', created);
} catch (e) {
  console.error('ERR:', e.message);
}
await mongoose.disconnect();
