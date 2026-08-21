const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const REMOTE = '/opt/soha';

function ssh(label, cmd) {
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, 60000);
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
    console.log('=== DEPLOY ALL BACKEND FILES ===');

    await uploadFile(path.join(__dirname, '..', 'server', 'models', 'User.js'), REMOTE + '/server/models/User.js');
    await uploadFile(path.join(__dirname, '..', 'server', 'middleware', 'auth.js'), REMOTE + '/server/middleware/auth.js');
    await uploadFile(path.join(__dirname, '..', 'server', 'routes', 'admin.js'), REMOTE + '/server/routes/admin.js');
    await uploadFile(path.join(__dirname, '..', 'server', 'routes', 'adminRoles.js'), REMOTE + '/server/routes/adminRoles.js');
    await uploadFile(path.join(__dirname, '..', 'server', 'server.js'), REMOTE + '/server/server.js');

    await sleep(1000);
    await ssh('restart backend', 'systemctl restart soha-backend');
    await sleep(3000);

    console.log('status:', (await ssh('status', 'systemctl is-active soha-backend')).trim());
    console.log('health:', (await ssh('health', 'curl -s http://localhost:5000/api/health')).trim());
    console.log('\n=== COMPLETE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();