const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = process.env.SSH_HOST;
const PORT = Number(process.env.SSH_PORT || 22);
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(label, cmd, timeout) {
  timeout = timeout || 60000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  await ssh('source public/sw.js', 'grep -c push /opt/soha/public/sw.js; ls -la /opt/soha/public/sw.js; wc -c /opt/soha/public/sw.js', 20000);
  await ssh('standalone public/sw.js', 'ls -la /opt/soha/.next/standalone/public/sw.js 2>&1; grep -c push /opt/soha/.next/standalone/public/sw.js 2>&1', 20000);
  await ssh('all sw.js on disk', 'find /opt/soha -name sw.js -newer /opt/soha/package.json 2>/dev/null | head; find /opt/soha -name "sw.js" 2>/dev/null | head -20', 30000);
  await ssh('curl from 127.0.0.1:3000', 'curl -s http://127.0.0.1:3000/sw.js | grep -c push', 20000);
})();