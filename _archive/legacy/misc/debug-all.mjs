const allPosts = [];
let page = 1;
while (true) {
  const res = await fetch('https://soha-sima.ir/wp-json/wp/v2/posts?_embed&per_page=100&page=' + page, { headers: { 'User-Agent': 'SohaApp/1.0' } });
  if (!res.ok) break;
  const posts = await res.json();
  if (posts.length === 0) break;
  allPosts.push(...posts);
  page++;
}
console.log('Total WP posts: ' + allPosts.length);

const targets = [
  'نگاهی پدیدارشناسانه به مقاومت',
  'گفتگو درباره پویش سلام فرمانده',
  'زن انقلاب',
  'قدس',
  'واره',
  'ایران مسائل',
];
for (const target of targets) {
  const match = allPosts.find(p => p.title.rendered.includes(target));
  if (match) {
    const media = match._embedded?.['wp:featuredmedia'];
    const cover = media?.[0]?.source_url;
    const m = match.content.rendered.match(/<img[^>]+src="([^"]+)"/);
    const img = m ? m[1] : null;
    console.log(target + ': "' + match.title.rendered + '"  cover=' + (cover || 'NONE') + '  img=' + (img || 'NONE'));
  } else {
    console.log(target + ': NOT FOUND');
  }
}
