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
  timeout = timeout || 60000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
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
    console.log('=== DEPLOY FRONTEND (NEW MEDIA PLAYER) ===');
    console.log('Target: ' + HOST);

    console.log('\n--- 1. Stop frontend ---');
    console.log(await ssh('systemctl stop soha-frontend 2>/dev/null || true'));

    console.log('\n--- 2. Clean old build ---');
    console.log(await ssh('rm -rf /opt/soha/.next/standalone /opt/soha/.next/cache'));

    console.log('\n--- 3. Upload tarballs ---');
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');
    await uploadFile('C:\\Temp\\soha-static.tar.gz', '/tmp/soha-static.tar.gz');
    await uploadFile('C:\\Temp\\soha-public.tar.gz', '/tmp/soha-public.tar.gz');

    console.log('\n--- 4. Extract ---');
    console.log(await ssh('cd /opt/soha && tar -xzf /tmp/soha-fe.tar.gz -C .next/', 60000));
    console.log(await ssh('rm -rf /opt/soha/.next/static && cd /opt/soha/.next && tar -xzf /tmp/soha-static.tar.gz', 60000));
    console.log(await ssh('rm -rf /opt/soha/public && cd /opt/soha && tar -xzf /tmp/soha-public.tar.gz', 60000));

    console.log('\n--- 5. Sync static + public into standalone ---');
    console.log(await ssh('rm -rf /opt/soha/.next/standalone/.next/static && cp -r /opt/soha/.next/static /opt/soha/.next/standalone/.next/static', 30000));
    console.log(await ssh('rm -rf /opt/soha/.next/standalone/public && cp -r /opt/soha/public /opt/soha/.next/standalone/public', 30000));

    console.log('\n--- 6. Start frontend ---');
    console.log(await ssh('systemctl start soha-frontend', 15000));
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n--- 7. Verify ---');
    console.log('Frontend:', (await ssh('systemctl is-active soha-frontend')).trim());
    console.log('Health:', (await ssh('curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}"')).trim());
    console.log('BUILD_ID:', (await ssh('cat /opt/soha/.next/BUILD_ID 2>/dev/null')).trim());
    console.log('API:', (await ssh('curl -s http://localhost:5000/api/health -o /dev/null -w "%{http_code}"')).trim());

    console.log('\n--- 8. Cleanup ---');
    console.log(await ssh('rm -f /tmp/soha-fe.tar.gz /tmp/soha-static.tar.gz /tmp/soha-public.tar.gz'));

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();