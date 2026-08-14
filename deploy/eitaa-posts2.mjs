import fs from 'fs';

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
  return { status: res.status, text: await res.text() };
}

function strip(s) {
  return s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function parsePage(text) {
  const msgs = [];
  const parts = text.split('<div class="etme_widget_message_wrap');
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const id = (p.match(/id="(\d+)"/) || [])[1] || '';
    const post = (p.match(/data-post="([^"]+)"/) || [])[1] || '';
    const img = (p.match(/<img[^>]+src="(\/download_[^"]+)"[^>]*>/) || [])[1] || null;
    const txtEl = p.match(/<div class="etme_widget_message_text"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
    let txt = txtEl ? strip(txtEl[1]) : '';
    if (!txt) {
      const t2 = p.match(/<div class="etme_widget_message_text"[^>]*>([\s\S]*?)<div class="etme_widget_message_footer/);
      if (t2) txt = strip(t2[1]);
    }
    const date = (p.match(/<span class="etme_widget_message_date"[^>]*>([\s\S]*?)<\/span>/) || [])[1] ? strip((p.match(/<span class="etme_widget_message_date"[^>]*>([\s\S]*?)<\/span>/) || [])[1]) : '';
    const isVideo = /etme_widget_message_video_player/.test(p);
    const isDoc = /etme_widget_message_document/.test(p);
    if (img || txt || isVideo || isDoc) msgs.push({ id, post, img: img ? 'https://eitaa.com' + img : null, txt, date, isVideo, isDoc });
  }
  return msgs;
}

const out = [];
let next = 'https://eitaa.com/soha_sima';
let pages = 0;
while (next && pages < 30) {
  const { status, text } = await fetchPage(next);
  if (status !== 200) { console.log('HTTP', status, next); break; }
  const msgs = parsePage(text);
  console.log('PAGE', pages, 'msgs:', msgs.length, 'url:', next);
  out.push(...msgs);
  const linkNext = text.match(/<a[^>]+href="(\/soha_sima\?before=\d+)"[^>]*>/);
  const canonical = (text.match(/rel="canonical" href="\/soha_sima\/(\d+)"/) || [])[1];
  const last = msgs.length ? Math.min(...msgs.map(m => parseInt(m.id)).filter(n => !isNaN(n))) : 0;
  if (last && last > 1 && msgs.length >= 20) {
    next = 'https://eitaa.com/soha_sima?before=' + last;
  } else if (linkNext && msgs.length >= 20) {
    next = 'https://eitaa.com' + linkNext[1];
  } else {
    next = null;
  }
  pages++;
  await new Promise(r => setTimeout(r, 700));
}

console.log('\nTOTAL MESSAGES:', out.length);
for (const o of out) {
  console.log('---');
  console.log('id:', o.id, '| img:', o.img ? 'YES' : 'no', '| video:', o.isVideo, '| doc:', o.isDoc);
  console.log('txt:', (o.txt || '').slice(0, 200));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\eitaa-all.json', JSON.stringify(out, null, 2));
