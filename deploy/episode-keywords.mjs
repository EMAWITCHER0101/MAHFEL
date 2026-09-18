import fs from 'fs';

const base = 'https://soha-sima.ir/';
async function sitemapUrls(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const t = await res.text();
  return [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

const KEYWORDS = ['غزه', 'روایت-فتح', 'قدس', 'واره', 'نقد-فیلم', '00', 'پادکست', 'پدیدارشناسانه', 'ایران-مسایل', 'مشکلاتش', 'سلام-فرمانده', 'انگلیسی'];
const hits = new Map();
let total = 0;
for (let i = 1; i <= 12; i++) {
  const urls = await sitemapUrls(base + `wp-sitemap-posts-episode-${i}.xml`);
  if (!urls.length) { console.log('episode sitemap', i, 'empty/404'); break; }
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
  console.log('fetched episode sitemap', i, '(', urls.length, ')');
  await new Promise(r => setTimeout(r, 200));
}
console.log('TOTAL EPISODES:', total);
const out = {};
for (const [k, urls] of hits) { out[k] = urls; console.log('\n### ' + k + ' (' + urls.length + ')'); for (const u of urls.slice(0, 12)) console.log('  ' + decodeURIComponent(u)); }
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\episode-hits.json', JSON.stringify(out, null, 2));
