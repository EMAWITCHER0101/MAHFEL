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
        r.on('data', d => { total += d.length; if (total % (5*1024*1024) < d.length) process.stdout.write('  ' + Math.round(total/1024/1024) + ' MB\n'); });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  Total: ' + Math.round(total/1024/1024) + ' MB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    await uploadFile('E:\\mongo\\mongodb-linux-x86_64-ubuntu2204-7.0.12.tgz', '/tmp/mongodb.tgz');
    await run('Extract', 'cd /tmp && tar -xzf mongodb.tgz && ls mongodb-linux-*/bin/', 60000);
    await run('Install mongod', 'cp /tmp/mongodb-linux-x86_64-ubuntu2204-7.0.12/bin/mongod /usr/local/bin/ && cp /tmp/mongodb-linux-x86_64-ubuntu2204-7.0.12/bin/mongos /usr/local/bin/ && chmod +x /usr/local/bin/mongod /usr/local/bin/mongos && mongod --version | head -1', 30000);
    await run('Create data dir', 'mkdir -p /data/db', 5000);
    await run('Start mongod', 'mongod --dbpath /data/db --fork --logpath /var/log/mongod.log && echo MONGOD_STARTED', 15000);
    await run('Verify', 'sleep 2 && curl -s http://localhost:27017 2>&1 | head -3', 15000);
    await run('Restart backend', 'systemctl restart soha-backend && sleep 3 && systemctl status soha-backend | head -8', 20000);
    await run('Test login', 'curl -s http://localhost:5000/api/health 2>&1', 15000);
    console.log('\n=== MONGODB + BACKEND DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
