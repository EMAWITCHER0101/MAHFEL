import fs from 'fs';

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return { status: res.status, text: await res.text() };
}

const out = {};

async function featuredFromPage(url) {
  const { status, text } = await get(url);
  if (status !== 200) return { status };
  const f = text.match(/<figure class="single-featured-image">[\s\S]{0,800}?<\/figure>/);
  if (!f) return { status, featured: null };
  const ds = f[0].match(/data-src="([^"]+)"/);
  const src = f[0].match(/src="([^"]+)"/);
  const title = (text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, '').trim();
  return { status, title, featured: ds ? ds[1] : src ? src[1] : null };
}

const albums = [
  'https://soha-sima.ir/album/بلای-بی-تاریخی-و-جهان-بی-آینده/',
  'https://soha-sima.ir/album/آزادی،-قانون،-سازمان/',
  'https://soha-sima.ir/album/27141/',
  'https://soha-sima.ir/album/حضور-نهایی-انسان-در-جهانی-که-با-اسلام-شر/',
  'https://soha-sima.ir/album/گرافیک-به-مثابه-کارگردانی/',
  'https://soha-sima.ir/album/ما-و-برکات-یگانگی-و-خطر-تقابل-بزرگ/',
  'https://soha-sima.ir/album/آوینی-و-زبان-بعثت/',
  'https://soha-sima.ir/album/اربعین-و-حضور-در-عهد-آقای-شهید-ایران/',
  'https://soha-sima.ir/album/ما-و-حضور-اربعینی-پیش-رو/',
  'https://soha-sima.ir/album/27988/',
  'https://soha-sima.ir/album/من-به-خال-لبت-ای-دوست-گرفتار-شدم/',
];
for (const u of albums) {
  const r = await featuredFromPage(u);
  out[u] = r;
  console.log('ALBUM', r.status, '|', r.title || '', '| img:', r.featured ? 'YES' : 'no');
  await new Promise(r => setTimeout(r, 250));
}

const posts = [];
for (const cat of [
  'https://soha-sima.ir/category/صوت/پادکست/',
  'https://soha-sima.ir/category/صوت/جلسات-سال-1403/تک-جلسه-ای-۱۴۰۳/',
  'https://soha-sima.ir/category/صوت/جلسات-سال-1401/تک-جلسه-ای-1401/',
  'https://soha-sima.ir/category/صوت/جلسات-سال-1400/تک-جلسه-ای-1400/',
  'https://soha-sima.ir/category/صوت/جلسات-سال-1402/تک-جلسه-ای-1402/',
  'https://soha-sima.ir/category/صوت/جلسات-سال-1405/تکجلسهای-1405/',
]) {
  const { status, text } = await get(cat);
  if (status !== 200) { console.log('CAT', status, cat); continue; }
  const ls = [...text.matchAll(/<a[^>]+href="(https:\/\/soha-sima\.ir\/\d+\/)"[^>]*>([^<]{3,90})<\/a>/g)];
  const uniq = new Map();
  for (const [_, href, title] of ls) if (!uniq.has(href)) uniq.set(href, title.trim());
  posts.push({ cat, items: [...uniq] });
  console.log('CAT', cat, '->', uniq.size, 'posts');
  await new Promise(r => setTimeout(r, 250));
}

fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\album-featured.json', JSON.stringify({ albums: out, posts }, null, 2));

for (const p of posts) {
  console.log('\n== ' + p.cat);
  for (const [href, title] of p.items) console.log('   ' + title + '  =>  ' + href);
}
