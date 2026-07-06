const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
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

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = path.basename(localPath);
    const size = fs.statSync(localPath).size;
    console.log('>>> Upload ' + name + ' (' + Math.round(size/1024) + ' KB)');
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  OK: ' + Math.round(total/1024) + ' KB'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== DEPLOY AI PAGE ===');
    console.log('Target: ' + HOST + ':' + PORT);

    // 1. Start MongoDB (may not be running after reboot)
    console.log('\n--- Starting MongoDB ---');
    const mongoCheck = await ssh('pgrep mongod || echo not_running');
    if (mongoCheck.includes('not_running')) {
      console.log(await ssh('/usr/local/bin/mongod --dbpath /data/db --fork --logpath /var/log/mongod.log 2>&1'));
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log('MongoDB already running');
    }

    // 2. Stop frontend
    console.log('\n--- Stopping frontend ---');
    await ssh('systemctl stop soha-frontend');

    // 3. Clean old build
    console.log('\n--- Cleaning ---');
    await ssh('rm -rf /opt/soha/.next/standalone /opt/soha/.next/cache');

    // 4. Upload tarball
    console.log('\n--- Uploading build ---');
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');

    // 5. Extract
    console.log('\n--- Extracting ---');
    console.log(await ssh('cd /opt/soha && tar -xzf /tmp/soha-fe.tar.gz -C .next/', 30000));

    // 6. Sync static into standalone
    console.log('\n--- Syncing static into standalone ---');
    console.log(await ssh('rm -rf /opt/soha/.next/standalone/.next/static && cp -r /opt/soha/.next/static /opt/soha/.next/standalone/.next/static'));

    // 7. Sync public to both locations
    console.log('\n--- Syncing public ---');
    console.log(await ssh('cp -r /opt/soha/.next/public/* /opt/soha/public/ 2>/dev/null; echo OK'));
    console.log(await ssh('rm -rf /opt/soha/.next/standalone/public && cp -r /opt/soha/public /opt/soha/.next/standalone/public'));

    // 8. Verify
    console.log('\n--- Verifying ---');
    const hasChunks = await ssh('ls /opt/soha/.next/static/chunks/ | head -3');
    console.log('Chunks:', hasChunks.trim());
    const hasPublic = await ssh('ls /opt/soha/public/logo.jpg 2>/dev/null && echo OK || echo MISSING');
    console.log('Logo:', hasPublic.trim());

    // 9. Start frontend
    console.log('\n--- Starting frontend ---');
    console.log(await ssh('systemctl start soha-frontend', 15000));
    await new Promise(r => setTimeout(r, 3000));
    const feStatus = await ssh('systemctl is-active soha-frontend');
    console.log('Frontend:', feStatus.trim());

    // 10. Test
    console.log('\n--- Testing ---');
    console.log(await ssh('curl -sI http://localhost:3000/ 2>&1 | head -3'));
    console.log(await ssh('curl -sI http://localhost:5000/api/health 2>&1 | head -3'));

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
