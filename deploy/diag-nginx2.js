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
    console.log('1. list nginx confs:');
    console.log(await ssh('ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>&1'));
    console.log('2. find proxy_pass anywhere:');
    console.log(await ssh('grep -rn "proxy_pass" /etc/nginx/ 2>/dev/null | head -10'));
    console.log('3. find server blocks listening 80/443:');
    console.log(await ssh('grep -rn "listen" /etc/nginx/ 2>/dev/null | head -10'));
    console.log('4. what serves soha-sima.ir (404 page source):');
    console.log(await ssh('curl -s https://soha-sima.ir/api/health 2>&1 | head -c 300; echo'));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();