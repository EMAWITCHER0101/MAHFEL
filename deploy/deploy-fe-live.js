const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

function ssh(label, cmd, timeout) {
  timeout = timeout || 90000;
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
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 20000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = path.basename(localPath);
    const size = fs.statSync(localPath).size;
    console.log('>>> Upload ' + name + ' (' + Math.round(size / 1024 / 1024 * 10) / 10 + ' MB)');
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT upload ' + name)); }, 300000);
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { clearTimeout(timer); c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { clearTimeout(timer); console.log('  OK: ' + Math.round(total / 1024 / 1024 * 10) / 10 + ' MB'); c.end(); resolve(); });
        w.on('error', e => { clearTimeout(timer); c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 20000});
  });
}

(async () => {
  try {
    await ssh('Stop FE', 'systemctl stop soha-frontend 2>/dev/null || true');
    await ssh('Clean', 'rm -rf /opt/soha/.next/standalone /opt/soha/.next/cache', 30000);
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');
    await ssh('Extract standalone', 'cd /opt/soha && tar -xzf /tmp/soha-fe.tar.gz -C .next/', 60000);
    await uploadFile('C:\\Temp\\soha-static.tar.gz', '/tmp/soha-static.tar.gz');
    await ssh('Extract static', 'cd /opt/soha/.next/standalone/.next && rm -rf static && tar -xzf /tmp/soha-static.tar.gz', 60000);
    await uploadFile('C:\\Temp\\soha-public.tar.gz', '/tmp/soha-public.tar.gz');
    await ssh('Extract public', 'cd /opt/soha && tar -xzf /tmp/soha-public.tar.gz', 60000);
    await ssh('Copy public', 'rm -rf /opt/soha/.next/standalone/public && cp -r /opt/soha/public /opt/soha/.next/standalone/public 2>/dev/null || true');
    await ssh('Start FE', 'systemctl start soha-frontend', 30000);
    await new Promise(r => setTimeout(r, 3000));
    await ssh('Verify', 'systemctl is-active soha-frontend; curl -s http://localhost:3000/ -o /dev/null -w "HTTP: %{http_code}\n"');
    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();