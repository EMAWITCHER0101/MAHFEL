const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

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
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + localPath);
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  Uploaded ' + Math.round(total/1024/1024) + ' MB'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // 1. Upload Node 20
    await uploadFile('C:\\Users\\EMAD\\AppData\\Local\\Temp\\node-v20.15.1-linux-x64.tar.xz', '/tmp/node20.tar.xz');

    // 2. Install Node 20
    await run('Install Node 20', 'cd /tmp && tar -xf node20.tar.xz && cp -f node-v20.15.1-linux-x64/bin/node /usr/local/bin/node && cp -rf node-v20.15.1-linux-x64/lib/node_modules /usr/local/lib/node_modules && ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx && echo DONE', 60000);
    
    await run('Verify Node 20', 'node -v && npm -v', 10000);

    // 3. Install PM2
    await run('Install PM2', 'NODE_OPTIONS=--dns-result-order=ipv4first npm install -g pm2 2>&1 | tail -5', 300000);
    await run('Verify PM2', 'pm2 -v', 10000);

    console.log('\n=== NODE + PM2 DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
