const res = await fetch('https://eitaa.com/soha_sima', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
const t = await res.text();
const start = t.indexOf('etme_widget_message_wrap');
console.log(t.slice(start - 100, start + 4000));
