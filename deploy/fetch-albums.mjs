import fs from 'fs';

const PAGES = [
  'https://soha-sima.ir/album/%d8%a8%d9%84%d8%a7%db%8c-%d8%a8%db%8c-%d8%aa%d8%a7%d8%b1%db%8c%d8%ae%db%8c-%d9%88-%d8%ac%d9%87%d8%a7%d9%86-%d8%a8%db%8c-%d8%a2%db%8c%d9%86%d8%af%d9%87/',
  'https://soha-sima.ir/album/%d8%a2%d8%b2%d8%a7%d8%af%db%8c%d8%8c-%d9%82%d8%a7%d9%86%d9%88%d9%86%d8%8c-%d8%b3%d8%a7%d8%b2%d9%85%d8%a7%d9%86/',
  'https://soha-sima.ir/album/27141/',
  'https://soha-sima.ir/album/%d8%ad%d8%b6%d9%88%d8%b1-%d9%86%d9%87%d8%a7%db%8c%db%8c-%d8%a7%d9%86%d8%b3%d8%a7%d9%86-%d8%af%d8%b1-%d8%ac%d9%87%d8%a7%d9%86%db%8c-%da%a9%d9%87-%d8%a8%d8%a7-%d8%a7%d8%b3%d9%84%d8%a7%d9%85-%d8%b4%d8%b1/',
  'https://soha-sima.ir/album/%da%af%d8%b1%d8%a7%d9%81%db%8c%da%a9-%d8%a8%d9%87-%d9%85%d8%ab%d8%a7%d8%a8%d9%87-%da%a9%d8%a7%d8%b1%da%af%d8%b1%d8%af%d8%a7%d9%86%db%8c/',
  'https://soha-sima.ir/album/%d9%85%d8%a7-%d9%88-%d8%a8%d8%b1%da%a9%d8%a7%d8%aa-%db%8c%da%af%d8%a7%d9%86%da%af%db%8c-%d9%88-%d8%ae%d8%b7%d8%b1-%d8%aa%d9%82%d8%a7%d8%a8%d9%84-%d8%a8%d8%b2%d8%b1%da%af/',
  'https://soha-sima.ir/album/%d8%a2%d9%88%db%8c%d9%86%db%8c-%d9%88-%d8%b2%d8%a8%d8%a7%d9%86-%d8%a8%d8%b9%d8%ab%d8%aa/',
  'https://soha-sima.ir/album/%d8%a7%d8%b1%d8%a8%d8%b9%db%8c%d9%86-%d9%88-%d8%ad%d8%b6%d9%88%d8%b1-%d8%af%d8%b1-%d8%b9%d9%87%d8%af-%d8%a2%d9%82%d8%a7%db%8c-%d8%b4%d9%87%db%8c%d8%af-%d8%a7%db%8c%d8%b1%d8%a7%d9%86/',
  'https://soha-sima.ir/album/%d9%85%d8%a7-%d9%88-%d8%ad%d8%b6%d9%88%d8%b1-%d8%a7%d8%b1%d8%a8%d8%b9%db%8c%d9%86%db%8c-%d9%be%db%8c%d8%b4-%d8%b1%d9%88/',
  'https://soha-sima.ir/album/27988/',
  'https://soha-sima.ir/album/%d9%85%d9%86-%d8%a8%d9%87-%d8%ae%d8%a7%d9%84-%d9%84%d8%a8%d8%aa-%d8%a7%db%8c-%d8%af%d9%88%d8%b3%d8%aa-%da%af%d8%b1%d9%81%d8%aa%d8%a7%d8%b1-%d8%b4%d8%af%d9%85/',
  'https://soha-sima.ir/27871/',
  'https://soha-sima.ir/4949/',
  'https://soha-sima.ir/27856/',
  'https://soha-sima.ir/3916/',
  'https://soha-sima.ir/3897/',
];

const out = {};
for (const url of PAGES) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const t = await res.text();
    const title = (t.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const og = (t.match(/property="og:image" content="([^"]+)"/) || t.match(/property='og:image' content='([^']+)'/) || [])[1] || '';
    const can = (t.match(/rel="canonical" href="([^"]+)"/) || [])[1] || url;
    out[url] = { title, og, canonical: can, http: res.status };
    console.log((res.status === 200 ? 'OK ' : 'ERR') + ' | ' + (title || url) + ' | og: ' + (og ? 'YES' : 'no'));
  } catch (e) {
    out[url] = { error: e.message };
    console.log('FAIL | ' + url + ' | ' + e.message);
  }
  await new Promise(r => setTimeout(r, 300));
}
fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\albums-og.json', JSON.stringify(out, null, 2));
