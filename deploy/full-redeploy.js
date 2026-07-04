const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
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
    const size = require('fs').statSync(localPath).size;
    console.log('>>> Upload ' + name + ' (' + Math.round(size/1024) + ' KB)');
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = require('fs').createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== FULL REDPLOY ===');
    
    // Upload tar
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');
    
    // Extract and restart
    console.log(await ssh(`
      cd /opt/soha
      rm -rf .next/standalone
      tar -xzf /tmp/soha-fe.tar.gz -C .next/
      cp -r .next/standalone/public/* public/ 2>/dev/null || true
      rm -rf .next/cache
      pkill -f "next-server" 2>/dev/null || true
      sleep 1
      systemctl restart soha-frontend
      sleep 3
      systemctl is-active soha-frontend
    `, 30000));
    
    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
