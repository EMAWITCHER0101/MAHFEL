const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  // 1) Emulator (main repo) - find the WINDOWS archive
  let main = null;
  try { main = await fetch('https://dl.google.com/android/repository/repository2-3.xml'); } catch (e) { console.log('main repo: ' + e.message); }
  let emuUrl = 'NOT FOUND';
  if (main) {
    const emuBlock = main.match(/<remotePackage path="emulator">[\s\S]*?<\/remotePackage>/);
    if (emuBlock) {
      const urls = [...emuBlock[0].matchAll(/<url>(.*?)<\/url>/g)].map(m => m[1]);
      emuUrl = urls.find(u => u.includes('windows_x64')) || urls[0] || 'NOT FOUND';
    }
  }
  console.log('EMULATOR_URL=' + emuUrl);

  // 2) System image (separate sys-img repo)
  let sys = null;
  for (const name of ['sys-img2-3.xml', 'sys-img2-1.xml']) {
    try { sys = await fetch('https://dl.google.com/android/repository/' + name); break; } catch (e) { console.log(name + ': ' + e.message); }
  }
  let sysUrl = 'NOT FOUND';
  if (sys) {
    const block = sys.match(/<remotePackage path="system-images;android-34;google_apis;x86_64">[\s\S]*?<\/remotePackage>/);
    if (block) {
      const m = block[0].match(/<archive>[\s\S]*?<url>(.*?)<\/url>/);
      if (m) sysUrl = m[1];
    }
  }
  console.log('SYSTEM_IMAGE_URL=' + sysUrl);
})();
