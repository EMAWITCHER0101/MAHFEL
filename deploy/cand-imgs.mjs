import fs from 'fs';

const candidates = [27916, 27881, 27887, 3568, 4984, 3318, 4593, 4902, 4845, 4852, 3745, 27957, 27928, 27969, 27954, 27869, 4598, 3897, 3916];
const out = {};
for (const id of candidates) {
  try {
    const res = await fetch(`https://soha-sima.ir/wp-json/wp/v2/posts/${id}?_embed=1`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    const m = j._embedded?.['wp:featuredmedia'];
    out[id] = { title: j.title?.rendered, img: m ? m[0]?.source_url : null };
    console.log(id, '|', (j.title?.rendered || '').slice(0, 60), '| img:', m ? 'YES' : 'no');
  } catch (e) { out[id] = { error: e.message }; console.log(id, 'ERR', e.message); }
  await new Promise(r => setTimeout(r, 250));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\cand-imgs.json', JSON.stringify(out, null, 2));
