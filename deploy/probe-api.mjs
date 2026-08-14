const endpoints = [
  'https://soha-sima.ir/wp-json/',
  'https://soha-sima.ir/wp-json/audioigniter/v1/',
  'https://soha-sima.ir/wp-json/wp/v2/posts/27871?_embed=1',
  'https://soha-sima.ir/wp-json/wp/v2/posts/4949?_embed=1',
  'https://soha-sima.ir/wp-json/wp/v2/posts/27856?_embed=1',
  'https://soha-sima.ir/wp-json/wp/v2/posts/3916?_embed=1',
  'https://soha-sima.ir/wp-json/wp/v2/posts/3897?_embed=1',
];
for (const u of endpoints) {
  try {
    const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    if (u.includes('wp-json/')) {
      console.log('\n== ' + u);
      console.log('HTTP', res.status, '| routes:', Object.keys(j.routes || {}).slice(0, 25).join(', '));
    } else {
      console.log('\n== ' + u);
      console.log('HTTP', res.status, '| title:', j.title?.rendered);
      const m = j._embedded?.['wp:featuredmedia'];
      console.log('featuredmedia:', m ? m[0]?.source_url : 'NONE');
    }
  } catch (e) { console.log('ERR', u, e.message); }
}
