const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 60000;
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
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    console.log('1. frontend status:');
    console.log(await ssh('systemctl is-active soha-frontend'));
    console.log('2. nginx api location:');
    console.log(await ssh('grep -rn "location /api" /etc/nginx/sites-enabled/ 2>/dev/null | head -5'));
    console.log('3. curl localhost:3100 api health:');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/api/health 2>&1; echo'));
    console.log('4. which port is nginx proxying to:');
    console.log(await ssh('grep -rn "proxy_pass" /etc/nginx/sites-enabled/ 2>/dev/null | head -8'));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();