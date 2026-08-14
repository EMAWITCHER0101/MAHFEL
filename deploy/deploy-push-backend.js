const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

const HOST = process.env.SSH_HOST;
const PORT = Number(process.env.SSH_PORT || 22);
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  timeout = timeout || 120000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

function uploadFile(lp, rp) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + lp.split('\\').pop());
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(lp);
        const w = sftp.createWriteStream(rp);
        w.on('close', () => { c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== DEPLOY PUSH NOTIFICATIONS BACKEND ===');

    console.log('1. Upload PushSubscription.js...');
    await uploadFile('E:\\soha\\server\\models\\PushSubscription.js', '/opt/soha/server/models/PushSubscription.js');

    console.log('2. Upload notifications.js...');
    await uploadFile('E:\\soha\\server\\routes\\notifications.js', '/opt/soha/server/routes/notifications.js');

    console.log('3. Upload package.json...');
    await uploadFile('E:\\soha\\server\\package.json', '/opt/soha/server/package.json');

    console.log('4. npm install web-push...');
    console.log(await ssh('cd /opt/soha/server && npm install 2>&1 | tail -5', 180000));

    console.log('5. Restart backend...');
    console.log(await ssh('systemctl restart soha-backend'));
    await new Promise(r => setTimeout(r, 3000));

    console.log('6. Status...');
    console.log(await ssh('systemctl is-active soha-backend'));
    console.log(await ssh('curl -s http://localhost:5000/api/notifications/public-key 2>&1 | head -c 300'));

    console.log('\nDONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();