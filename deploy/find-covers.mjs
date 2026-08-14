import fs from 'fs';

const BASE = 'https://soha-sima.ir/wp-json/wp/v2/';

const MISSING = [
  'ما و حضور اربعینی پیشرو',
  'آوینی و زبان بعثت',
  'بانوی ایرانی',
  'ما و برکات یگانگی و خطر تقابل بزرگ',
  'روضه محرم 1405 دهه اول در جستجوی اشک',
  'اربوعین و حضور در عهد آقای شهید ایران',
  'قدس افق حیات مسلمین',
  'روایت فتح سال 1403',
  'غزه و وظیفه فراموش شده',
  'واره ما و زبان قرآن',
  'نقد فیلم',
  'گفتگو درباره پویش سلام فرمانده',
  '00 پادکست',
  'نگاهی پدیدارشناسانه به مقاومت',
  'ایران مسایل و مشکلاتش',
];

const results = {};
for (const q of MISSING) {
  try {
    const url = `${BASE}posts?search=${encodeURIComponent(q)}&per_page=5&_embed=1&orderby=relevance`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { results[q] = { error: 'HTTP ' + res.status }; continue; }
    const posts = await res.json();
    results[q] = posts.map(p => ({
      title: p.title?.rendered,
      link: p.link,
      img: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
    }));
  } catch (e) {
    results[q] = { error: e.message };
  }
  await new Promise(r => setTimeout(r, 400));
}

fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\covers-search.json', JSON.stringify(results, null, 2));
for (const [q, r] of Object.entries(results)) {
  console.log('### ' + q);
  if (r.error) { console.log('  ERR: ' + r.error); continue; }
  if (!r.length) { console.log('  (no results)'); continue; }
  for (const p of r) console.log('  - ' + (p.title || '?') + '  |  img: ' + (p.img ? 'YES' : 'no') + '  |  ' + p.link);
}
console.log('\nSaved to covers-search.json');
