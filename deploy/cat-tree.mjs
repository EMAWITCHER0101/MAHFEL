import fs from 'fs';

const strip = s => String(s || '').replace(/[\u200c\u200f]/g, '').trim();

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return { status: res.status, text: await res.text() };
}

const results = [];
const visited = new Set();
const queue = ['https://soha-sima.ir/category/صوت/'];
let guard = 0;

while (queue.length && guard < 200) {
  const url = queue.shift();
  if (visited.has(url)) continue;
  visited.add(url);
  guard++;
  const { status, text } = await get(url);
  console.log('VISIT', guard, status, decodeURIComponent(url).slice(0, 80));
  if (status !== 200) continue;

  const cats = [...text.matchAll(/<a[^>]+href="(https:\/\/soha-sima\.ir\/category\/[^"]+)"[^>]*>([^<]{2,80})<\/a>/g)];
  const links = new Set();
  for (const [_, href, title] of cats) {
    const t = strip(title).replace(/&#8211;|&raquo;|&amp;/g, ' ').trim();
    if (!t || /صفحه|درباره|نوشته|دیدگاه|بیشتر|بازگشت/.test(t)) continue;
    results.push({ cat: url, title: t, href });
    links.add(href);
  }
  for (const l of links) if (!visited.has(l) && /category/.test(l)) queue.push(l);
  await new Promise(r => setTimeout(r, 200));
}

fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\cat-tree.json', JSON.stringify(results, null, 2));
console.log('\nTOTAL CATEGORY ENTRIES:', results.length);
const uniq = new Map();
for (const r of results) if (!uniq.has(r.title)) uniq.set(r.title, r.href);
console.log('UNIQUE TITLES:', uniq.size);
for (const [t, h] of uniq) console.log(t, '=>', decodeURIComponent(h).slice(0, 100));
