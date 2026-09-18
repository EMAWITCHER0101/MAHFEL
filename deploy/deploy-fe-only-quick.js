const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
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

function uploadFile(lp, rp) {
  return new Promise((resolve, reject) => {
    const size = fs.statSync(lp).size;
    console.log('>>> Upload ' + path.basename(lp) + ' (' + Math.round(size/1024) + ' KB)');
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
    console.log('=== DEPLOY FRONTEND ONLY (QUICK) ===');

    console.log('\n--- 1. Stop frontend ---');
    console.log(await ssh('systemctl stop soha-frontend 2>/dev/null || true'));

    console.log('\n--- 2. Upload & extract ---');
    console.log(await ssh('rm -rf /opt/soha/.next'));
    console.log(await ssh('mkdir -p /opt/soha/.next/standalone'));
    await uploadFile('E:\\temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');
    console.log(await ssh('tar -xzf /tmp/soha-fe.tar.gz -C /opt/soha/.next/standalone', 60000));
    await uploadFile('E:\\temp\\soha-static.tar.gz', '/tmp/soha-static.tar.gz');
    console.log(await ssh('cd /opt/soha/.next/standalone/.next && rm -rf static && mkdir -p static && tar -xzf /tmp/soha-static.tar.gz -C static', 30000));
    await uploadFile('E:\\temp\\soha-public.tar.gz', '/tmp/soha-public.tar.gz');
    console.log(await ssh('mkdir -p /opt/soha/public && tar -xzf /tmp/soha-public.tar.gz -C /opt/soha/public', 30000));
    console.log(await ssh('rm -rf /opt/soha/.next/standalone/public && cp -r /opt/soha/public /opt/soha/.next/standalone/public 2>/dev/null || true'));

    console.log('\n--- 3. Start frontend ---');
    console.log(await ssh('systemctl start soha-frontend', 15000));
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n--- 4. Verify ---');
    console.log('Frontend:', (await ssh('systemctl is-active soha-frontend')).trim());
    console.log('HTTP:', (await ssh("curl -s http://localhost:3000/ -o /dev/null -w '%{http_code}'")).trim());

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
