const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

function run(label, cmd, timeout) {
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
      .connect({host: '87.248.145.44', port: 9011, username: 'root', password: 'emadch82', readyTimeout: 60000, keepaliveInterval: 10000});
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
      .connect({host: '87.248.145.44', port: 9011, username: 'root', password: 'emadch82', readyTimeout: 60000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    // Upload tarball
    await uploadFile('E:\\soha-deploy-standalone.tar.gz', '/opt/soha/soha-deploy-standalone.tar.gz');

    // Extract on server (remove old standalone, extract new)
    await run('Extract standalone',
      'cd /opt/soha && rm -rf .next/standalone.bak && mv .next/standalone .next/standalone.bak && tar -xzf soha-deploy-standalone.tar.gz -C .next/ && cp .next/standalone.bak/server/node_modules .next/standalone/server/ -rf 2>/dev/null; echo "Extract done"',
      60000);

    // Restart frontend
    await run('Restart frontend', 'systemctl restart soha-frontend && sleep 2 && systemctl status soha-frontend | head -5', 20000);

    // Verify
    await run('Verify HTTP', 'sleep 1 && curl -s -o /dev/null -w "HTTP %{http_code}\\n" http://localhost:3000/', 15000);

    console.log('\n=== DEPLOY COMPLETE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
