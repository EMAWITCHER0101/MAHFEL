const cats = [
  'https://soha-sima.ir/category/صوت/جلسات-سال-1402/گفتگوها1402/شب-های-غزه/',
  'https://soha-sima.ir/category/صوت/جلسات-سال-1402/گفتگوها1402/',
  'https://soha-sima.ir/category/صوت/جلسات-سال-1403/تک-جلسه-ای-۱۴۰۳/',
];
for (const u of cats) {
  const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const t = await res.text();
  console.log('\n== ' + decodeURIComponent(u) + ' HTTP ' + res.status + ' len ' + t.length);
  const links = [...t.matchAll(/<h[23][^>]*>[\s\S]{0,300}?<\/h[23]>/g)].map(m => m[0].replace(/<[^>]+>/g, '').trim());
  console.log('HEADINGS:', links.slice(0, 20));
  const postLinks = [...t.matchAll(/<a[^>]+href="(https:\/\/soha-sima\.ir\/\d+\/)"[^>]*>([^<]*)<\/a>/g)].map(m => m[2].trim() + ' => ' + m[1]);
  console.log('POST LINKS:', [...new Set(postLinks)].slice(0, 25));
  await new Promise(r => setTimeout(r, 300));
}
