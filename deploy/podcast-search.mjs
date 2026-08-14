import fs from 'fs';

const QUERIES = [
  'راز سکوت', 'ایده پردازی', 'صعود اقتصادی', 'طراحی ستاره', 'سکرات ایمان', 'اقیانوس یگانگی',
  'بهشتی شدن', 'خانوادگی شدن انقلاب', 'طوفان الاقصی', 'زبان انگلیسی', 'واژه ها در نسبت با اربعین',
  'ملک سلیمانی', 'خوبان بهشتی', 'بخشش و انفاق', 'شاعری هنرمندی', 'آینده را چگونه می بینید',
  'انقلاب دارد حرکت می کند', 'ستاره در زندگی',
];
const out = {};
for (const q of QUERIES) {
  try {
    const url = `https://soha-sima.ir/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=4`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    out[q] = j.map(r => ({ id: r.id, type: r.subtype, title: r.title }));
    console.log('### ' + q + ' (' + j.length + ')');
    for (const r of out[q]) console.log('   [' + r.type + '] ' + r.title + '  (id=' + r.id + ')');
  } catch (e) { out[q] = { error: e.message }; }
  await new Promise(r => setTimeout(r, 250));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\podcast-search.json', JSON.stringify(out, null, 2));
