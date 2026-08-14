const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const https = require('https');

const HOST = process.env.SSH_HOST, PORT = Number(process.env.SSH_PORT || 22);
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

function ssh(cmd) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { c.end(); return reject(e); }
        let o = '';
        s.on('data', d => o += d);
        s.stderr.on('data', d => o += d);
        s.on('close', () => { c.end(); resolve(o); });
      });
    }).on('error', e => reject(e))
      .connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000 });
  });
}

function fetchHttps(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

(async () => {
  // 1) سرور: آیا فایل‌های جدید روی سرور هستند؟
  const server = await ssh("grep -rl 'پخش در پس‌زمینه فعال شد' /opt/soha/.next/standalone/.next/static/chunks 2>/dev/null | head -3; echo '---'; ls -la /opt/soha/.next/standalone/.next/static/chunks/webpack-*.js 2>/dev/null | head -5");
  console.log('SERVER CHUNKS:', server.trim().slice(0, 1200));

  // 2) سرور: آخرین زمان build در standalone
  const times = await ssh("ls -la --time-style=full-iso /opt/soha/.next/standalone/.next/static/chunks/ 2>/dev/null | head -8; echo '---'; stat -c '%y %n' /opt/soha/.next/standalone/.next/BUILD_ID 2>/dev/null; cat /opt/soha/.next/standalone/.next/BUILD_ID 2>/dev/null");
  console.log('SERVER TIMES:', times.trim().slice(0, 1500));

  // 3) سایت زنده: BUILD_ID و chunk ها
  const home = await fetchHttps('https://soha-sima.ir/');
  console.log('LIVE STATUS:', home.status, 'CT:', (home.headers['content-type'] || '').slice(0, 60));
  const ids = (home.body.match(/[a-z0-9]{12}(?=\/[a-z0-9]+\.js)/g) || []).slice(0, 4);
  const buildIds = (home.body.match(/"[a-f0-9]{12}"/g) || []).slice(0, 4);
  console.log('LIVE buildIds:', JSON.stringify(buildIds));
  const m = home.body.match(/static\/chunks\/[^"']+\.js/g) || [];
  console.log('LIVE chunks (first 6):', JSON.stringify(m.slice(0, 6)));

  // 4) BUILD_ID محلی
  const fs = require('fs');
  const localId = fs.existsSync('E:\\soha\\.next\\BUILD_ID') ? fs.readFileSync('E:\\soha\\.next\\BUILD_ID', 'utf8').trim() : '?';
  console.log('LOCAL BUILD_ID:', localId);
})();
