const res = await fetch('https://eitaa.com/soha_sima', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
const t = await res.text();
const idx = t.indexOf('etme_widget_message_photo_wrap');
console.log('PHOTO IDX:', idx);
if (idx > 0) console.log(t.slice(idx - 200, idx + 2500));
const tidx = t.indexOf('etme_widget_message_text');
console.log('\nTEXT IDX:', tidx);
if (tidx > 0) console.log(t.slice(tidx - 400, tidx + 1200));
