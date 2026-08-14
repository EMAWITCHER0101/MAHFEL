// دیپلوی بک‌اند: چت محفل (باز/بسته)، پروفایل کاربر، نوتیفیکیشن پیام‌ها، آمار books/buyers
//   node deploy/deploy-community.js
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(label, cmd, timeout) {
  timeout = timeout || 120000;
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
    const name = path.basename(localPath);
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
    console.log('=== DEPLOY COMMUNITY (BACKEND) ===');

    await uploadFile('E:\\soha\\server\\models\\Setting.js', '/opt/soha/server/models/Setting.js');
    await uploadFile('E:\\soha\\server\\routes\\community.js', '/opt/soha/server/routes/community.js');
    await uploadFile('E:\\soha\\server\\routes\\users.js', '/opt/soha/server/routes/users.js');
    await uploadFile('E:\\soha\\server\\routes\\posts.js', '/opt/soha/server/routes/posts.js');
    await uploadFile('E:\\soha\\server\\routes\\purchaseRequests.js', '/opt/soha/server/routes/purchaseRequests.js');
    await uploadFile('E:\\soha\\server\\server.js', '/opt/soha/server/server.js');

    await ssh('Restart backend', 'cd /opt/soha/server && systemctl restart soha-backend && sleep 3 && systemctl is-active soha-backend', 60000);
    await ssh('Check health', 'curl -s http://localhost:5000/api/health', 10000);
    await ssh('Check community settings', 'curl -s http://localhost:5000/api/community/settings', 10000);

    console.log('\n=== DEPLOY COMPLETE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();