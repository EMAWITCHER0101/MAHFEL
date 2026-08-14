const url = 'https://soha-sima.ir/album/' + encodeURIComponent('در جستجوی اشک') + '/';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t = await res.text();
console.log('HTTP', res.status, 'len', t.length);
for (const pat of [/wp-json\/[a-z0-9\/_-]+/gi, /aed[a-z0-9\/_-]*/gi, /album[s]?\/api[^"']*/gi, /fetch\([^)]*\)/gi, /\.ajax\([^)]*\)/gi]) {
  const m = t.match(pat);
  if (m) { console.log('PAT', pat.source, '=>', [...new Set(m)].slice(0, 10)); }
}
const uploads = [...t.matchAll(/(https?:\/\/[^"'\s]+wp-content\/uploads\/[^"'\s]+)/g)].map(m => m[1]);
console.log('UPLOADS:', [...new Set(uploads)]);
const noscript = t.match(/<noscript>[\s\S]{0,2000}<\/noscript>/g);
if (noscript) console.log('NOSCRIPT:', noscript[0].slice(0, 1000));
