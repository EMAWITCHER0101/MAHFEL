const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

function run(label, cmd, timeout) {
  timeout = timeout || 600000;
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
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + require('path').basename(localPath));
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  ' + Math.round(total/1024/1024) + ' MB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // Upload server node_modules
    await run('Clean old', 'rm -rf /opt/soha/server/node_modules', 30000);
    await uploadFile('C:\\Users\\EMAD\\AppData\\Local\\Temp\\server_nm.tar.gz', '/tmp/server_nm.tar.gz');
    await run('Extract server', 'cd /opt/soha/server && tar -xzf /tmp/server_nm.tar.gz && echo OK', 60000);
    await run('Verify server', 'ls /opt/soha/server/node_modules/express 2>/dev/null && echo SERVER_OK || echo SERVER_FAIL', 10000);

    // Now install root deps with --prefer-offline since server has some packages
    await run('npm install root', "cd /opt/soha && rm -rf node_modules package-lock.json && NODE_OPTIONS='--dns-result-order=ipv4first' npm install --prefer-offline 2>&1 | tail -15", 600000);

    console.log('\n=== NPM DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
