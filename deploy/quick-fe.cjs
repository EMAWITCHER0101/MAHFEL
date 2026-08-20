// دیپلوی سریع فقط فرانت (آپلود تار + اکسترکت + ریاستارت)
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

function ssh(label, cmd) {
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, 120000);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '9011'), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + path.basename(localPath));
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '9011'), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    console.log('=== QUICK FRONTEND DEPLOY ===');
    await ssh('stop frontend', 'systemctl stop soha-frontend 2>/dev/null || true');
    await sleep(1500);
    await uploadFile('E:\\temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');
    await uploadFile('E:\\temp\\soha-static.tar.gz', '/tmp/soha-static.tar.gz');
    await ssh('extract fe', 'rm -rf /opt/soha/.next/standalone && mkdir -p /opt/soha/.next/standalone && tar -xzf /tmp/soha-fe.tar.gz -C /opt/soha/.next/standalone');
    await sleep(1500);
    await ssh('extract static', 'cd /opt/soha/.next/standalone/.next && rm -rf static && mkdir -p static && tar -xzf /tmp/soha-static.tar.gz -C static');
    await sleep(1500);
    await ssh('copy public', 'rm -rf /opt/soha/.next/standalone/public && cp -r /opt/soha/public /opt/soha/.next/standalone/public 2>/dev/null || true');
    await ssh('start frontend', 'systemctl start soha-frontend');
    await sleep(6000);
    console.log('status:', (await ssh('status', 'systemctl is-active soha-frontend')).trim());
    console.log('http:', (await ssh('http', 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000')).trim());
    console.log('\n=== COMPLETE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();