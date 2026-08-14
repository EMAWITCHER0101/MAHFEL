const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== COPY UPPERCASE ALIAS (for old APKs) ===');
    console.log(await ssh('cp /opt/soha/videopage/WELCOMEMOBILE.mp4 /opt/soha/public/videopage/WELCOMEMOBILE.mp4 && cp /opt/soha/videopage/WELCOMEMOBILE.mp4 /opt/soha/.next/standalone/public/videopage/WELCOMEMOBILE.mp4 && ls -la /opt/soha/.next/standalone/public/videopage/'));
    console.log('--- verify ---');
    console.log(await ssh('curl -s -o /dev/null -w "WELCOMEMOBILE: %{http_code} %{size_download}\\n" http://localhost/videopage/WELCOMEMOBILE.mp4'));
  } catch (e) { console.error('FAILED:', e.message); }
})();
