const res = await fetch('https://eitaa.com/soha_sima', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' } });
const t = await res.text();
const i = t.indexOf('download_');
console.log('CONTEXT AROUND FIRST IMG:');
console.log(t.slice(Math.max(0, i - 3000), i + 500));
