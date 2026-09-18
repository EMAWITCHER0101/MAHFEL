import fs from 'fs';

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
  return { status: res.status, text: await res.text() };
}

function strip(s) {
  return s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function parsePage(text) {
  const msgs = [];
  const parts = text.split('<div class="etme_widget_message_wrap');
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const id = (p.match(/id="(\d+)"/) || [])[1] || '';
    const post = (p.match(/data-post="([^"]+)"/) || [])[1] || '';
    const bg = (p.match(/background-image:\s*url\('([^']+)'\)/) || [])[1] || (p.match(/background-image:\s*url\("([^"]+)"\)/) || [])[1] || null;
    const imgEl = (p.match(/<img[^>]+src="(\/download_[^"]+)"[^>]*>/) || [])[1] || null;
    const img = bg || imgEl;
    const txtM = p.match(/<div class="etme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
    const txt = txtM ? strip(txtM[1]) : '';
    const dateM = p.match(/<time datetime="([^"]+)"/);
    const date = dateM ? dateM[1] : '';
    const isVideo = /etme_widget_message_video_player/.test(p);
    const isDoc = /etme_widget_message_document_wrap/.test(p);
    if (img || txt) msgs.push({ id, post, img: img ? 'https://eitaa.com' + img : null, txt, date, isVideo, isDoc });
  }
  return msgs;
}

const out = [];
const seen = new Set();
let next = 'https://eitaa.com/soha_sima';
let pages = 0;
while (next && pages < 100) {
  const { status, text } = await fetchPage(next);
  if (status !== 200) { console.log('HTTP', status, next); break; }
  const msgs = parsePage(text);
  let newOnes = 0;
  for (const m of msgs) {
    if (!seen.has(m.id)) { seen.add(m.id); out.push(m); newOnes++; }
  }
  const last = msgs.length ? Math.min(...msgs.map(o => parseInt(o.id)).filter(n => !isNaN(n))) : 0;
  console.log('PAGE', pages, 'new:', newOnes, 'total:', out.length, 'lastId:', last, '| url:', next.slice(0, 60));
  const prevLink = text.match(/<link rel="prev" href="(\/soha_sima\?before=\d+)"/);
  if (prevLink) next = 'https://eitaa.com' + prevLink[1];
  else if (last > 1 && newOnes > 0) next = 'https://eitaa.com/soha_sima?before=' + last;
  else break;
  pages++;
  await new Promise(r => setTimeout(r, 800));
}

console.log('\nTOTAL MESSAGES:', out.length);
for (const o of out) {
  console.log('---');
  console.log('id:', o.id, '| date:', o.date, '| img:', o.img ? 'YES' : 'no');
  console.log('txt:', (o.txt || '').slice(0, 250));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\eitaa-all.json', JSON.stringify(out, null, 2));
