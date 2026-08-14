import fs from 'fs';

const strip = s => String(s || '').replace(/[\u200c\u200f]/g, '').trim();

const MISSING = [
  'ایران مسایل و مشکلاتش',
  'نگاهی پدیدارشناسانه به مقاومت',
  'گفتگو درباره پویش سلام فرمانده',
  '00 پادکست',
  'نقد فیلم',
  'واره - ما و زبان قرآن',
  'روایت فتح سال 1403',
  'غزه و وظیفه فراموش شده',
  'قدس؛ افق حیات مسلمین',
  'ما و برکات یگانگی',
  'پادکست - واژه‌ها در نسبت با اربعین',
  'پادکست آینده را چگونه می‌بینید؟',
  'پادکست از ملک لایبلی تا ملک سلیمانی',
  'پادکست استاد مجید',
  'پادکست انقلاب دارد حرکت می‌کند',
  'پادکست ایده‌پردازی',
  'پادکست بخشش و انفاق',
  'پادکست راز سکوت',
  'پادکست سخنرانی به زبان انگلیسی',
  'پادکست صعود اقتصادی',
  'پادکست طراحی ستاره در زندگی',
  'پادکست طوفان الاقصی',
  'پادکست خانوادگی شدن انقلاب اسلامی',
  'پادکست تا بهشتی شدن',
  'پادکست اقیانوس یگانگی',
  'پادکست خوبان بهشتی یا تاریخ‌سازان حسینی',
  'پادکست سکرات ایمان در این زمان',
];

const out = {};
for (const q of MISSING) {
  try {
    const url = `https://soha-sima.ir/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=6`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { out[q] = { error: 'HTTP ' + res.status }; console.log('### ' + q + ' | ERR ' + res.status); continue; }
    const j = await res.json();
    out[q] = j.map(r => ({ id: r.id, type: r.subtype, title: r.title }));
    console.log('### ' + q);
    for (const r of out[q]) console.log('   [' + r.type + '] ' + r.title + '  (id=' + r.id + ')');
  } catch (e) { out[q] = { error: e.message }; console.log('### ' + q + ' | ' + e.message); }
  await new Promise(r => setTimeout(r, 250));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\final-search.json', JSON.stringify(out, null, 2));
