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
    console.log('1. Try login 09900000001 / test1234:');
    console.log(await ssh('curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d \'{"phoneNumber":"09900000001","password":"test1234"}\' 2>&1 | head -c 200; echo'));
    console.log('2. Try login 09900000002 / test1234:');
    console.log(await ssh('curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d \'{"phoneNumber":"09900000002","password":"test1234"}\' 2>&1 | head -c 200; echo'));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();