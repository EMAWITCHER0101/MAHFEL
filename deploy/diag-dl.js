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
    console.log('=== dl.soha-sima.ir deep diagnostics ===');
    console.log('1. DNS resolution:');
    console.log(await ssh('dig +short dl.soha-sima.ir 2>/dev/null || nslookup dl.soha-sima.ir 2>&1 | head -6'));

    console.log('2. HTTPS verbose:');
    console.log(await ssh('curl -sv --connect-timeout 10 https://dl.soha-sima.ir/ 2>&1 | head -25'));

    console.log('3. HTTP attempt:');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 http://dl.soha-sima.ir/ 2>&1; echo'));

    console.log('4. Same-host test (soha-sima.ir):');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 https://soha-sima.ir/ 2>&1; echo'));

    console.log('5. IP of dl host with curl -v IP connect:');
    console.log(await ssh('curl -skv --connect-timeout 10 -H "Host: dl.soha-sima.ir" https://127.0.0.1/ 2>&1 | head -10'));

    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();