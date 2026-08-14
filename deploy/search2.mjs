const searches = [
  'ما و حضور اربعینی پیش رو',
  'در جستجوی اشک',
  'روایت فتح',
  'غزه و وظیفه',
  'واره',
  'قدس افق حیات',
  'نقد فیلم',
  '00 پادکست',
  'ایران مسایل',
  'قرارگاه قدس',
  'حریف زمستان',
  'اسرائیل',
];
for (const q of searches) {
  try {
    const url = `https://soha-sima.ir/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=5&_embed=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    console.log('\n### ' + q + ' (' + j.length + ')');
    for (const r of j) {
      const m = r._embedded?.['wp:featuredmedia'];
      console.log('  [' + r.subtype + '] ' + (r.title || '') + ' | id=' + r.id + ' | img: ' + (m ? m[0]?.source_url : 'no'));
    }
  } catch (e) { console.log('ERR', q, e.message); }
  await new Promise(r => setTimeout(r, 300));
}
