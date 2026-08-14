const res = await fetch('https://eitaa.com/soha_sima', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
const t = await res.text();
const classes = [...new Set([...t.matchAll(/class="(etme_[a-z_]+)/g)].map(m => m[1]))];
console.log('ETME CLASSES:', classes.join(', '));
const idx = t.indexOf('etme_widget_message');
console.log('MSG IDX:', idx);
if (idx > 0) console.log(t.slice(idx - 500, idx + 3000));
