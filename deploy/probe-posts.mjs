const posts = [27871, 4949, 27856, 3916, 3897];
for (const id of posts) {
  try {
    const res = await fetch(`https://soha-sima.ir/wp-json/wp/v2/posts/${id}?_embed=1`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    console.log('== ' + id, 'HTTP', res.status);
    console.log('  title:', j.title?.rendered);
    const m = j._embedded?.['wp:featuredmedia'];
    console.log('  featuredmedia:', m ? m[0]?.source_url : 'NONE');
    if (j._embedded?.author) console.log('  author:', j._embedded.author[0]?.name);
  } catch (e) { console.log('ERR', id, e.message); }
}
