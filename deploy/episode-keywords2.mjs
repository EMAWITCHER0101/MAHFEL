import fs from 'fs';

const base = 'https://soha-sima.ir/';
async function sitemapUrls(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const t = await res.text();
  return [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

const KEYWORDS = ['واژه', 'آینده-را-چگونه', 'لایبلی', 'شاعری', 'حرکت', 'ایده', 'بخشش', 'راز-سکوت', 'انگلیسی', 'صعود', 'ستاره', 'الاقصی', 'خانوادگی', 'بهشتی', 'اقیانوس', 'خوبان', 'سکرات', 'مسایل', 'مشکلاتش', 'غزه', 'روایت-فتح', 'افق-حیات', 'واره', 'پدیدار', 'فرمانده', 'جستجوی-اشک'];
const hits = new Map();
let total = 0;
for (let i = 1; i <= 12; i++) {
  const urls = await sitemapUrls(base + `wp-sitemap-posts-episode-${i}.xml`);
  if (!urls.length) break;
  total += urls.length;
  for (const u of urls) {
    const dec = decodeURIComponent(u);
    for (const k of KEYWORDS) {
      if (dec.includes(k)) {
        if (!hits.has(k)) hits.set(k, []);
        hits.get(k).push(u);
        break;
      }
    }
  }
  console.log('sitemap', i, 'done', '(', urls.length, ')');
  await new Promise(r => setTimeout(r, 200));
}
console.log('TOTAL EPISODES:', total);
const out = {};
for (const [k, urls] of hits) { out[k] = urls; console.log('\n### ' + k + ' (' + urls.length + ')'); for (const u of urls.slice(0, 10)) console.log('  ', decodeURIComponent(u)); }
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\episode-hits2.json', JSON.stringify(out, null, 2));
