const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

const HOST = process.env.SSH_HOST;
const PORT = Number(process.env.SSH_PORT || 22);
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(label, cmd, timeout) {
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
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = localPath.split('\\').pop();
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
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== DEPLOY FE (notes + push) ===');

    console.log('1. Stop frontend');
    await ssh('Stop', 'systemctl stop soha-frontend 2>/dev/null || true', 20000);

    console.log('2. Remove old standalone');
    await ssh('Clean', 'rm -rf /opt/soha/.next/standalone /opt/soha/.next/cache', 30000);

    console.log('3. Upload standalone tar');
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');

    console.log('4. Extract standalone');
    await ssh('Extract', 'cd /opt/soha && tar -xzf /tmp/soha-fe.tar.gz -C .next/', 120000);

    console.log('5. Upload static tar');
    await uploadFile('C:\\Temp\\soha-static.tar.gz', '/tmp/soha-static.tar.gz');

    console.log('6. Extract static');
    await ssh('Extract static', 'cd /opt/soha/.next/standalone/.next && rm -rf static && tar -xzf /tmp/soha-static.tar.gz', 60000);

    console.log('7. Upload public tar (includes new sw.js)');
    await uploadFile('C:\\Temp\\soha-public.tar.gz', '/tmp/soha-public.tar.gz');

    console.log('8. Extract public');
    await ssh('Extract public', 'cd /opt/soha && tar -xzf /tmp/soha-public.tar.gz', 60000);

    console.log('9. Verify sw.js on server');
    await ssh('Verify sw', 'ls -la /opt/soha/public/sw.js && head -c 80 /opt/soha/public/sw.js', 20000);

    console.log('10. Copy public into standalone');
    await ssh('Public', 'rm -rf /opt/soha/.next/standalone/public && cp -r /opt/soha/public /opt/soha/.next/standalone/public 2>/dev/null || true', 30000);

    console.log('11. Start frontend');
    await ssh('Start', 'systemctl start soha-frontend && sleep 2 && systemctl is-active soha-frontend', 30000);

    console.log('12. Smoke test');
    await ssh('sw.js reachable', 'curl -s -o /dev/null -w "%{http_code}" https://soha-sima.ir/sw.js', 20000);
    await ssh('api', 'curl -s http://localhost:5000/api/notifications/public-key 2>&1 | head -c 300', 20000);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();