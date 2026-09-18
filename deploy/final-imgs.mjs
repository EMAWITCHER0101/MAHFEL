import fs from 'fs';

const ids = [27881, 27871, 4949, 27916, 27856, 3576, 3916, 3897];
const out = {};
for (const id of ids) {
  try {
    const res = await fetch(`https://soha-sima.ir/wp-json/wp/v2/posts/${id}?_embed=1`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    const m = j._embedded?.['wp:featuredmedia'];
    const img = m?.[0]?.source_url || null;
    const md = m?.[0]?.media_details;
    const sizes = md?.sizes ? Object.entries(md.sizes).map(([k, v]) => k + ':' + v.width + 'x' + v.height).join(', ') : '';
    out[id] = { title: j.title?.rendered, img, sizes };
    console.log(id, '|', j.title?.rendered?.slice(0, 50), '| img:', img ? img : 'NULL', sizes ? ('| sizes: ' + sizes) : '');
  } catch (e) { out[id] = { error: e.message }; console.log(id, 'ERR', e.message); }
  await new Promise(r => setTimeout(r, 250));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\final-imgs.json', JSON.stringify(out, null, 2));
