const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');

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

(async () => {
  try {
    console.log('=== HTTPS PROBE ===');
    console.log(await ssh('echo "--- http soha-sima.ir ---"; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\\n" http://soha-sima.ir; echo "--- https soha-sima.ir ---"; curl -s -o /dev/null -w "%{http_code} %{ssl_verify_result}\\n" https://soha-sima.ir 2>&1; echo "--- https 87.248.145.44 ---"; curl -s -o /dev/null -w "%{http_code}\\n" https://87.248.145.44 2>&1; echo "--- nginx sites ---"; ls /etc/nginx/sites-enabled/ 2>&1; echo "--- ssl in nginx ---"; grep -rl "listen 443" /etc/nginx 2>/dev/null | head -5; echo "--- letsencrypt ---"; ls /etc/letsencrypt/live 2>&1; echo "--- certbot ---"; which certbot; certbot --version 2>&1 | head -1; echo "--- nginx.conf includes ---"; grep -E "include|ssl_certificate" /etc/nginx/nginx.conf 2>/dev/null | head -10'));
    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();