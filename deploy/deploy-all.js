const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function ssh(label, cmd, timeout) {
  timeout = timeout || 60000;
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
    // 1. Create utils dir on server
    console.log('\n=== CREATING DIRS ===');
    await ssh('Mkdir utils', 'mkdir -p /opt/soha/server/utils', 10000);

    // 2. Upload all changed server files
    console.log('\n=== UPLOADING SERVER FILES ===');
    await uploadFile('E:\\soha\\server\\utils\\profanityFilter.js', '/opt/soha/server/utils/profanityFilter.js');
    await uploadFile('E:\\soha\\server\\routes\\posts.js', '/opt/soha/server/routes/posts.js');
    await uploadFile('E:\\soha\\server\\routes\\auth.js', '/opt/soha/server/routes/auth.js');
    await uploadFile('E:\\soha\\server\\models\\User.js', '/opt/soha/server/models/User.js');
    await uploadFile('E:\\soha\\server\\middleware\\auth.js', '/opt/soha/server/middleware/auth.js');

    // 3. Restart backend
    console.log('\n=== RESTARTING BACKEND ===');
    await ssh('Restart backend', 'systemctl restart soha-backend && sleep 2 && systemctl is-active soha-backend', 20000);

    // 4. Upload frontend build
    console.log('\n=== UPLOADING FRONTEND ===');
    const tarPath = 'C:\\Temp\\soha-fe.tar.gz';
    await uploadFile(tarPath, '/tmp/soha-fe.tar.gz');

    console.log('\n=== DEPLOYING FRONTEND ===');
    await ssh('Deploy frontend', `
      cd /opt/soha
      rm -rf .next/standalone
      tar -xzf /tmp/soha-fe.tar.gz -C .next/
      cp -r .next/standalone/public/* public/ 2>/dev/null || true
      systemctl restart soha-frontend
      sleep 2
      systemctl is-active soha-frontend
    `, 30000);

    // 5. Cleanup
    await ssh('Cleanup', 'rm -f /tmp/soha-fe.tar.gz', 10000);

    console.log('\n=== ALL DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
