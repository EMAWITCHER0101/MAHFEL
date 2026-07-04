const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '87.107.165.104';
const PORT = 9011;
const USER = 'root';
const PASS = 'BRykm7zfs3';

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
    // 1. Upload frontend tarball
    await uploadFile('E:\\soha-deploy-standalone.tar.gz', '/opt/soha/soha-deploy-standalone.tar.gz');

    // 2. Extract frontend
    await ssh('Extract frontend', 'cd /opt/soha && rm -rf .next/standalone.bak && mv .next/standalone .next/standalone.bak && tar -xzf soha-deploy-standalone.tar.gz -C .next/ && cp .next/standalone.bak/server/node_modules .next/standalone/server/ -rf 2>/dev/null; echo "OK"', 60000);

    // 3. Upload server files (routes/auth.js, models/User.js)
    await uploadFile('E:\\soha\\server\\routes\\auth.js', '/opt/soha/server/routes/auth.js');
    await uploadFile('E:\\soha\\server\\models\\User.js', '/opt/soha/server/models/User.js');

    // 4. Restart both services
    await ssh('Restart backend', 'systemctl restart soha-backend && sleep 2 && systemctl is-active soha-backend', 20000);
    await ssh('Restart frontend', 'systemctl restart soha-frontend && sleep 2 && systemctl is-active soha-frontend', 20000);

    // 5. Verify
    await ssh('Check health', 'curl -s http://localhost:5000/api/health', 10000);

    console.log('\n=== DEPLOY COMPLETE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
