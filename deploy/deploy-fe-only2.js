// Deploy frontend only (standalone + static + public) to MAHFEL server
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST || '87.107.165.104';
const PORT = parseInt(process.env.SSH_PORT || '9011', 10);
const USER = process.env.SSH_USER || 'root';
const PASS = process.env.SSH_PASS || 'BRykm7zfs3';

function ssh(cmd, timeout) {
  timeout = timeout || 60000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout);
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

function uploadFile(local, remote) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(local);
        const w = sftp.createWriteStream(remote);
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
    console.log('=== DEPLOY FRONTEND ONLY ===');

    console.log('\n--- 1. Stop frontend ---');
    console.log(await ssh('systemctl stop soha-frontend 2>/dev/null || true', 15000));

    console.log('\n--- 2. Clean old build ---');
    console.log(await ssh('rm -rf /opt/soha/.next/standalone /opt/soha/.next/cache', 20000));

    console.log('\n--- 3. Upload standalone ---');
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');
    console.log(await ssh('cd /opt/soha && tar -xzf /tmp/soha-fe.tar.gz -C .next/ && rm -f /tmp/soha-fe.tar.gz', 60000));

    console.log('\n--- 4. Upload static ---');
    await uploadFile('C:\\Temp\\soha-static.tar.gz', '/tmp/soha-static.tar.gz');
    console.log(await ssh('cd /opt/soha/.next/standalone/.next && rm -rf static && tar -xzf /tmp/soha-static.tar.gz && rm -f /tmp/soha-static.tar.gz', 30000));

    console.log('\n--- 5. Upload public ---');
    await uploadFile('C:\\Temp\\soha-public.tar.gz', '/tmp/soha-public.tar.gz');
    console.log(await ssh('cd /opt/soha && tar -xzf /tmp/soha-public.tar.gz && rm -f /tmp/soha-public.tar.gz', 30000));
    console.log(await ssh('rm -rf /opt/soha/.next/standalone/public && cp -r /opt/soha/public /opt/soha/.next/standalone/public 2>/dev/null || true', 15000));

    console.log('\n--- 6. Start frontend ---');
    console.log(await ssh('systemctl start soha-frontend', 20000));
    await new Promise(r => setTimeout(r, 4000));

    console.log('\n--- 7. Verify ---');
    console.log('Frontend:', (await ssh('systemctl is-active soha-frontend')).trim());
    console.log('HTTP:', (await ssh("curl -s http://localhost:3000/ -o /dev/null -w '%{http_code}'")).trim());

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
