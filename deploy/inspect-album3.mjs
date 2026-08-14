const url = 'https://soha-sima.ir/album/27141/';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t = await res.text();
console.log('HTTP', res.status, 'len', t.length);
const ai = t.match(/audioigniter[^"]*|data-[a-z]+="[^"]*"/gi);
console.log('AI ATTRS:', ai ? [...new Set(ai)].slice(0, 30) : 'none');
const scripts = [...t.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) {
  if (s.includes('audioigniter') || s.includes('wp.apiFetch') || s.includes('tracks')) {
    console.log('---SCRIPT---');
    console.log(s.slice(0, 2500));
  }
}
const api = t.match(/audioigniter\/v1\/[^"'\\]+/gi);
console.log('API CALLS:', api ? [...new Set(api)] : 'none');
