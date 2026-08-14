const res = await fetch('https://soha-sima.ir/1405/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t = await res.text();
console.log('HTTP', res.status, 'len', t.length);
const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map(m => [m[1], m[2].trim()]).filter(x => x[1].length > 2 && x[1].length < 80 && /soha-sima\.ir/.test(x[0]) && !/wp-content|wp-json|wp-includes|#|category|page\//.test(x[0]));
console.log('LINKS:', links.length);
for (const [u, txt] of links.slice(0, 40)) console.log('  ' + txt + '  =>  ' + decodeURIComponent(u));
