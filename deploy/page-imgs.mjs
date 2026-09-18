import fs from 'fs';

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return { status: res.status, text: await res.text() };
}

async function featuredFromPage(url) {
  const { status, text } = await get(url);
  if (status !== 200) return { status };
  const f = text.match(/<figure class="single-featured-image">[\s\S]{0,800}?<\/figure>/);
  const img = f ? (f[0].match(/data-src="([^"]+)"/) || [])[1] || (f[0].match(/src="([^"]+)"/) || [])[1] : null;
  const title = (text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, '').trim();
  return { status, title, featured: img || null };
}

const PAGES = [
  'https://soha-sima.ir/3576/',   // گفتگو/ ایران، مسائل و مشکلاتش
  'https://soha-sima.ir/27856/',  // ما و برکات «یگانگی»
  'https://soha-sima.ir/3897/',   // نگاهی پدیدارشناسانه
  'https://soha-sima.ir/3916/',   // گفتگو درباره پویش سلام فرمانده
  'https://soha-sima.ir/3590/',   // گفتگو درباره فیلم منصور
  'https://soha-sima.ir/4057/',   // نامه ای به سعید
  'https://soha-sima.ir/4018/',   // فرار از غزه
  'https://soha-sima.ir/4155/',   // پادکست مجال
  'https://soha-sima.ir/3568/',   // گفتگوها/ روضه آوینی (26 جلسه)
];

const out = {};
for (const u of PAGES) {
  const r = await featuredFromPage(u);
  out[u] = r;
  console.log(u, '|', r.status, '|', r.title || '', '| img:', r.featured ? r.featured : 'no');
  await new Promise(r => setTimeout(r, 250));
}

const cats = [
  'https://soha-sima.ir/category/موضوعات/نقد-فیلم/',
  'https://soha-sima.ir/category/صوت/پادکست/',
];
for (const u of cats) {
  const { status, text } = await get(u);
  if (status !== 200) { console.log('CAT', status, u); continue; }
  const desc = text.match(/<div class="category"[^>]*>[\s\S]{0,1500}?<\/div>/);
  const hero = text.match(/<img[^>]+class="[^"]*category-image[^"]*"[^>]+data-src="([^"]+)"/) || text.match(/<img[^>]+data-src="([^"]+)"[^>]*class="[^"]*category-image/);
  const allImgs = [...text.matchAll(/data-src="(https:\/\/soha-sima\.ir\/wp-content\/uploads\/[^"]+)"/g)].map(m => m[1]);
  const uniq = [...new Set(allImgs)].filter(u => !u.includes('logo') && !u.includes('سرای-هنر') && !u.includes('icons8') && !u.includes('eitaa'));
  console.log('CAT', decodeURIComponent(u), '| hero:', hero ? hero[1] : 'none', '| content imgs:', uniq.slice(0, 6));
  out[u] = { hero: hero ? hero[1] : null, contentImgs: uniq.slice(0, 6) };
  await new Promise(r => setTimeout(r, 250));
}

fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\page-imgs.json', JSON.stringify(out, null, 2));
