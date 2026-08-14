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
    console.log('1. Node version:');
    console.log(await ssh('node --version'));
    console.log('2. undici available?:');
    console.log(await ssh('node -e "const {Agent}=require(\'undici\'); console.log(\'undici ok\')" 2>&1'));
    console.log('3. cert expiry details:');
    console.log(await ssh('echo | openssl s_client -connect dl.soha-sima.ir:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "no openssl cert info"'));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();