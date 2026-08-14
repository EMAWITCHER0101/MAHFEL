const res = await fetch('https://soha-sima.ir/year/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t = await res.text();
console.log('HTTP', res.status, 'len', t.length);
const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map(m => [m[1], m[2].trim()]).filter(x => x[1].length > 2 && x[1].length < 80);
for (const [u, txt] of links.slice(0, 60)) console.log('  ' + txt + '  =>  ' + decodeURIComponent(u));
