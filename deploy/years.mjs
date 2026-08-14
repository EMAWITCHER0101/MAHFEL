const base = 'https://soha-sima.ir/';
async function sitemapUrls(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const t = await res.text();
  return [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

console.log('YEAR PAGES:');
const years = await sitemapUrls(base + 'wp-sitemap-posts-aed_year-1.xml');
for (const y of years) console.log('  ' + decodeURIComponent(y));

console.log('\nALBUM PAGES:');
const albums = await sitemapUrls(base + 'wp-sitemap-posts-album-1.xml');
for (const a of albums) console.log('  ' + decodeURIComponent(a));
