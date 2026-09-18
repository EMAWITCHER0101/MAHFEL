import fs from 'fs';

const base = 'https://soha-sima.ir/';
async function sitemapUrls(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const t = await res.text();
  return [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

const posts = await sitemapUrls(base + 'wp-sitemap-posts-post-1.xml');
const pages = await sitemapUrls(base + 'wp-sitemap-posts-page-1.xml');
const products = await sitemapUrls(base + 'wp-sitemap-posts-product-1.xml');

const KEYWORDS = [
  'غزه', 'وظیفه-فراموش', 'روایت-فتح', 'قدس', 'افق-حیات', 'واره', 'زبان-قرآن',
  'نقد-فیلم', 'پادکست', 'سلام-فرمانده', 'پدیدارشناسانه', 'ایران-مسایل', 'مسایل-و-مشکلات',
  'در-جستجوی-اشک', 'بانوی-ایرانی', 'برکات', 'اربعین', 'آوینی', 'انگلیسی', 'واژه', 'ملک-سلیمانی',
];
const strip = s => String(s || '').replace(/[\u200c\u200f]/g, '').trim();

const hits = new Map();
for (const u of posts.concat(pages, products)) {
  const dec = strip(decodeURIComponent(u));
  for (const k of KEYWORDS) {
    if (dec.includes(k)) {
      if (!hits.has(k)) hits.set(k, []);
      hits.get(k).push(u);
      break;
    }
  }
}

console.log('POSTS:', posts.length, 'PAGES:', pages.length, 'PRODUCTS:', products.length);
const out = {};
for (const [k, urls] of hits) { out[k] = urls; console.log('### ' + k + ' (' + urls.length + ')'); for (const u of urls.slice(0, 15)) console.log('  ', decodeURIComponent(u)); }
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\slug-hits.json', JSON.stringify(out, null, 2));
