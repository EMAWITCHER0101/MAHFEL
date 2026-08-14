import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\eitaa-all.json', 'utf8'));
console.log('TOTAL:', data.length);

const KWS = ['پادکست', 'کاور', 'بنر', 'پوستر', 'واره', 'روایت فتح', 'غزه', 'نقد فیلم', 'قدس', 'مسایل', 'مشکلاتش', 'سلام فرمانده', 'پدیدار', 'سکرات', 'اقیانوس', 'صعود اقتصادی', 'طراحی ستاره', 'ایده', 'راز سکوت', 'انگلیسی', 'بهشتی', 'ملک لایبلی', 'واژه', 'استاد مجید', 'خانوادگی شدن انقلاب', 'بخشش و انفاق', 'سخنرانی'];

const matches = [];
for (const m of data) {
  if (!m.txt) continue;
  const hit = KWS.find(k => m.txt.includes(k));
  if (hit) matches.push({ ...m, hit });
}

console.log('MATCHES:', matches.length);
const out = matches.map(m => ({
  id: m.id, date: m.date, hit: m.hit, img: m.img,
  txt: m.txt.slice(0, 400),
}));
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\eitaa-matches.json', JSON.stringify(out, null, 2));
for (const m of matches) {
  console.log('== id=' + m.id + ' | ' + m.date + ' | hit: ' + m.hit + ' | img: ' + (m.img && m.img.startsWith('http') ? 'URL' : 'BASE64'));
  console.log('   ' + m.txt.slice(0, 150));
}
