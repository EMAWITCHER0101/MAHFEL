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
    console.log('>>> Upload ' + path.basename(lp) + ' (' + Math.round(size/1024) + ' KB) -> ' + rp);
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
    console.log('=== DEPLOY WELCOME VIDEOS ===');
    console.log('Target: ' + HOST);

    console.log('\n--- 1. Locate videopage dirs on server ---');
    console.log(await ssh('ls -la /opt/soha/public/videopage 2>&1; echo ---; ls -la /opt/soha/.next/standalone/public/videopage 2>&1; echo ---; find /opt/soha -maxdepth 4 -type d -name videopage 2>/dev/null'));

    console.log('\n--- 2. Upload videos to all found locations ---');
    await uploadFile('E:\\soha\\public\\videopage\\welcomemobile.mp4', '/opt/soha/public/videopage/welcomemobile.mp4');
    await uploadFile('E:\\soha\\public\\videopage\\welcomepage.mp4', '/opt/soha/public/videopage/welcomepage.mp4');
    await uploadFile('E:\\soha\\public\\videopage\\welcomemobile.mp4', '/opt/soha/.next/standalone/public/videopage/welcomemobile.mp4').catch(e => console.log('standalone mobile:', e.message));
    await uploadFile('E:\\soha\\public\\videopage\\welcomepage.mp4', '/opt/soha/.next/standalone/public/videopage/welcomepage.mp4').catch(e => console.log('standalone page:', e.message));

    console.log('\n--- 3. Verify remote files ---');
    console.log(await ssh('ls -la /opt/soha/public/videopage; echo ---; ls -la /opt/soha/.next/standalone/public/videopage 2>&1'));

    console.log('\n--- 4. Verify over HTTP ---');
    console.log(await ssh('curl -s -o /dev/null -w "welcomemobile: %{http_code} size=%{size_download}\\n" http://localhost/videopage/welcomemobile.mp4'));
    console.log(await ssh('curl -s -o /dev/null -w "welcomepage: %{http_code} size=%{size_download}\\n" http://localhost/videopage/welcomepage.mp4'));

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
