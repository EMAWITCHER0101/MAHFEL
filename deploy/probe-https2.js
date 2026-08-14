const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  timeout = timeout || 40000;
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

(async () => {
  try {
    console.log('=== HTTPS DETAILS ===');
    console.log(await ssh('echo "--- sites-enabled/mahfel (head 60) ---"; head -60 /etc/nginx/sites-enabled/mahfel 2>&1; echo; echo "--- default site 443 block? ---"; grep -l "listen 443" /etc/nginx/sites-available/default 2>/dev/null && grep -A5 "listen 443" /etc/nginx/sites-available/default | head -20; echo "--- listening ports ---"; ss -tlnp 2>/dev/null | grep -E ":443|:80 |:3000|:5000" | head; echo "--- DNS ---"; getent hosts soha-sima.ir; echo "--- cloudflare? ---"; curl -sI https://soha-sima.ir 2>&1 | head -12'));
    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();