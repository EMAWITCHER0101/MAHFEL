const BASE = 'https://soha-sima.ir/wp-json/wp/v2/';

async function getAll(type) {
  const out = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${BASE}${type}?per_page=100&page=${page}&_embed=1`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { console.log(type, 'page', page, 'HTTP', res.status); break; }
    const items = await res.json();
    if (!items.length) break;
    for (const p of items) {
      out.push({
        id: p.id,
        title: p.title?.rendered,
        slug: p.slug,
        link: p.link,
        img: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      });
    }
    if (items.length < 100) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return out;
}

const albums = await getAll('album');
const episodes = await getAll('episode');
const all = albums.map(a => ({ ...a, type: 'album' })).concat(episodes.map(e => ({ ...e, type: 'episode' })));

console.log('TOTAL:', all.length, '(albums:', albums.length + ', episodes:', episodes.length + ')');
for (const a of all) console.log(`[${a.type}] ${a.title} | img: ${a.img ? 'YES' : 'no'} | ${a.link}`);
