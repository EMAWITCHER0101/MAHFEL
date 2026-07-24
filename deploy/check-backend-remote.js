const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

if (!HOST || !PASS) {
  console.error('Missing SSH_HOST or SSH_PASS in .env.deploy');
  process.exit(1);
}

function ssh(cmd, timeout) {
  timeout = timeout || 20000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

function uploadFile(lp, rp) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + lp.split('\\').pop());
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(lp);
        const w = sftp.createWriteStream(rp);
        w.on('close', () => { c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== FIX BACKEND ON ' + HOST + ' ===\n');

    console.log('--- 1. Checking MongoDB ---');
    const mongoStatus = await ssh('systemctl is-active mongod 2>/dev/null || pgrep mongod || echo "NOT_RUNNING"');
    console.log('MongoDB status:', mongoStatus.trim());
    if (mongoStatus.includes('NOT_RUNNING') || mongoStatus.includes('inactive')) {
      console.log('Starting MongoDB...');
      console.log(await ssh('systemctl start mongod 2>/dev/null || /usr/local/bin/mongod --dbpath /data/db --fork --logpath /var/log/mongod.log 2>&1'));
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n--- 2. Checking Backend ---');
    const backendStatus = await ssh('systemctl is-active soha-backend 2>/dev/null || pm2 pid soha-backend 2>/dev/null || echo "NOT_RUNNING"');
    console.log('Backend status:', backendStatus.trim());

    console.log('\n--- 3. Checking Backend Health ---');
    const health = await ssh('curl -s http://localhost:5000/api/health 2>&1 || echo "FAILED"');
    console.log('Health:', health.trim());

    console.log('\n--- 4. Checking Nginx ---');
    const nginxStatus = await ssh('systemctl is-active nginx 2>/dev/null || echo "NOT_RUNNING"');
    console.log('Nginx status:', nginxStatus.trim());

    const nginxConfig = await ssh('cat /etc/nginx/sites-available/soha 2>/dev/null || cat /etc/nginx/conf.d/soha.conf 2>/dev/null || echo "NO_CONFIG"');
    console.log('Nginx config:\n', nginxConfig);

    console.log('\n--- 5. Checking /opt/soha structure ---');
    const structure = await ssh('ls /opt/soha/server/server.js 2>/dev/null && echo "EXISTS" || echo "MISSING"');
    console.log('server.js:', structure.trim());

    const serverEnv = await ssh('cat /opt/soha/server/.env 2>/dev/null || echo "NO_ENV"');
    console.log('server/.env:\n', serverEnv);

    console.log('\n--- 6. Checking PM2 ---');
    const pm2Status = await ssh('pm2 list 2>/dev/null || echo "PM2_NOT_FOUND"');
    console.log('PM2:', pm2Status);

    console.log('\n--- 7. Checking port 5000 ---');
    const port5000 = await ssh('ss -tlnp | grep 5000 || echo "PORT_5000_FREE"');
    console.log('Port 5000:', port5000.trim());

    console.log('\n--- 8. Checking port 3000 ---');
    const port3000 = await ssh('ss -tlnp | grep 3000 || echo "PORT_3000_FREE"');
    console.log('Port 3000:', port3000.trim());

    console.log('\n=== DIAGNOSIS COMPLETE ===');
    console.log('Now run "node deploy/fix-backend-apply.js" to apply fixes based on this diagnosis.');

  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
