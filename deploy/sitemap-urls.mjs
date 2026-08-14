const base = 'https://soha-sima.ir/';

async function sitemapUrls(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const t = await res.text();
  return [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

const album = await sitemapUrls(base + 'wp-sitemap-posts-album-1.xml');
const ep = [];
for (let i = 1; i <= 12; i++) {
  const u = await sitemapUrls(base + `wp-sitemap-posts-episode-${i}.xml`);
  if (!u.length) break;
  ep.push(...u);
  await new Promise(r => setTimeout(r, 200));
}
console.log('ALBUM:', album.length);
console.log('EPISODE:', ep.length);
console.log('--- ALBUMS ---');
for (const u of album) console.log(u);
