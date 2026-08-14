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
    console.log('1. DNS soha-sima.ir:');
    console.log(await ssh('dig +short soha-sima.ir 2>/dev/null; echo "---"; dig +short www.soha-sima.ir 2>/dev/null'));
    console.log('2. DNS soha-mal.ir:');
    console.log(await ssh('dig +short soha-mal.ir 2>/dev/null'));
    console.log('3. what does 127.0.0.1:3000 serve:');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>&1; echo'));
    console.log('4. whats listening on 3000:');
    console.log(await ssh('ss -tlnp | grep 3000 | head -3'));
    console.log('5. full URL from public on this host:');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" -H "Host: soha-sima.ir" http://127.0.0.1/ 2>&1; echo'));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();