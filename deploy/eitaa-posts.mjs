import fs from 'fs';

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
  return { status: res.status, text: await res.text() };
}

function parseMessages(text) {
  const blocks = [...text.matchAll(/<div class="etme_widget_message_wrap[^"]*"[\s\S]*?<div class="etme_widget_message[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g)].map(m => m[0]);
  if (!blocks.length) {
    const alt = [...text.matchAll(/<div class="etme_widget_message_wrap[^"]*"[\s\S]*?<div class="etme_widget_message[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/g)].map(m => m[0]);
    return alt;
  }
  return blocks;
}

const out = [];
let next = 'https://eitaa.com/soha_sima';
for (let page = 0; page < 3; page++) {
  const { status, text } = await fetchPage(next);
  if (status !== 200) { console.log('HTTP', status, next); break; }
  const blocks = parseMessages(text);
  console.log('PAGE', page, 'blocks:', blocks.length);
  for (const b of blocks) {
    const img = (b.match(/<img[^>]+src="(\/download_[^"]+)"[^>]*>/) || [])[1] || null;
    const txtEl = b.match(/<div class="etme_widget_message_text"[^>]*>([\s\S]*?)<\/div>/);
    let txt = '';
    if (txtEl) {
      txt = txtEl[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }
    const date = (b.match(/<span class="etme_widget_message_date"[^>]*>([\s\S]*?)<\/span>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
    if (img || txt) out.push({ img: img ? 'https://eitaa.com' + img : null, txt, date });
  }
  const m = text.match(/href="(\/soha_sima\?before=\d+)"[^>]*>([^<]*)/);
  const before = text.match(/<a[^>]+href="(\/soha_sima\?before=\d+)"[^>]*class="etme_widget_message_btn[^"]*"[^>]*>/);
  if (before) { next = 'https://eitaa.com' + before[1]; } else { break; }
  await new Promise(r => setTimeout(r, 500));
}

console.log('TOTAL MESSAGES:', out.length);
for (const o of out) {
  console.log('---');
  console.log('date:', o.date);
  console.log('img:', o.img ? 'YES' : 'no');
  console.log('txt:', (o.txt || '').slice(0, 120));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\eitaa-posts.json', JSON.stringify(out, null, 2));
