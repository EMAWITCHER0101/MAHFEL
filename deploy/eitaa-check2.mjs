const res = await fetch('https://eitaa.com/soha_sima', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
const t = await res.text();
const msgBlocks = t.match(/<div class="etme-message[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g);
console.log('MSG BLOCKS:', msgBlocks ? msgBlocks.length : 'none');
const sample = t.match(/<div class="etme-message[^"]*"[^>]*>[\s\S]{0,2500}/);
console.log(sample ? sample[0] : 'NONE');
const imgs = [...t.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)].map(m => m[1]);
console.log('IMGS:', [...new Set(imgs)].slice(0, 30));
