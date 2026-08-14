const url = 'https://soha-sima.ir/album/27141/';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t = await res.text();

const thumbPatterns = [/class="[^"]*entry-thumb[^"]*"/, /class="[^"]*post-thumb[^"]*"/, /class="[^"]*featured[^"]*"/, /class="[^"]*hero[^"]*"/, /class="[^"]*single-post[^"]*"/];
for (const p of thumbPatterns) {
  const m = t.match(p);
  if (m) console.log('PATTERN', p.source, '=>', m[0]);
}

const uploads = [...t.matchAll(/data-src="(https:\/\/soha-sima\.ir\/wp-content\/uploads\/[^"]+)"/g)].map(m => m[1]);
console.log('DATA-SRC UPLOADS:', [...new Set(uploads)]);
const srcs = [...t.matchAll(/src="(https:\/\/soha-sima\.ir\/wp-content\/uploads\/[^"]+)"/g)].map(m => m[1]);
console.log('SRC UPLOADS:', [...new Set(srcs)]);

const entry = t.match(/<article[\s\S]{0,3000}/);
if (entry) console.log('\nARTICLE HEAD:', entry[0].slice(0, 2000));
