const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

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

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = localPath.split('\\').pop();
    console.log('>>> Upload ' + name);
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  ' + Math.round(total/1024) + ' KB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== DEPLOY BACKEND PUSH ===');

    await ssh('Check env web-push in package.json', 'cd /opt/soha/server && grep -c web-push package.json || echo MISSING', 20000);

    await uploadFile('E:\\soha\\server\\routes\\notifications.js', '/opt/soha/server/routes/notifications.js');
    await uploadFile('E:\\soha\\server\\models\\PushSubscription.js', '/opt/soha/server/models/PushSubscription.js');

    await ssh('Restart backend', 'systemctl restart soha-backend && sleep 3 && systemctl is-active soha-backend', 40000);

    await ssh('public-key endpoint', 'curl -s http://localhost:5000/api/notifications/public-key 2>&1 | head -c 400', 20000);
    await ssh('subscribe endpoint (no auth)', 'curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/notifications/subscribe -H "Content-Type: application/json" -d "{}"', 20000);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();