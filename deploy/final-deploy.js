const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
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
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // 1. Stop
    console.log('=== STOP ===');
    await ssh('systemctl stop soha-frontend');

    // 2. Clean
    console.log('=== CLEAN ===');
    await ssh('rm -rf /opt/soha/.next/standalone /opt/soha/.next/cache');

    // 3. Upload
    console.log('=== UPLOAD ===');
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');

    // 4. Extract (no extra copy needed - static + public already in tar)
    console.log('=== EXTRACT ===');
    console.log(await ssh('cd /opt/soha && tar -xzf /tmp/soha-fe.tar.gz -C .next/', 30000));

    // 5. Verify
    console.log('=== VERIFY ===');
    console.log(await ssh('ls /opt/soha/.next/standalone/.next/static/chunks/*.css'));
    console.log(await ssh('ls /opt/soha/.next/standalone/public/font-awesome/'));
    console.log(await ssh('ls /opt/soha/.next/standalone/public/logo.jpg 2>/dev/null'));

    // 6. Start
    console.log('=== START ===');
    console.log(await ssh('systemctl start soha-frontend && sleep 3 && systemctl is-active soha-frontend', 20000));

    // 7. Test
    console.log('=== TEST ===');
    console.log(await ssh('curl -sI http://localhost:3000/_next/static/chunks/13tahokxrjv6d.css 2>&1 | head -3'));
    console.log(await ssh('curl -sI http://localhost:3000/font-awesome/all.min.css 2>&1 | head -3'));
    console.log(await ssh('curl -sI http://localhost:3000/logo.jpg 2>&1 | head -3'));

    console.log('DONE');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
