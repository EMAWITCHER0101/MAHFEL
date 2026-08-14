const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  timeout = timeout || 15000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o.trim()); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== HEALTH CHECK ===');
    console.log('Backend:', await ssh('curl -s http://localhost:5000/api/health'));
    console.log('WS:', await ssh('curl -s http://localhost:5001/health'));
    console.log('Frontend:', await ssh('systemctl is-active soha-frontend'));
    console.log('HTTP:', await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/'));
    console.log('Nginx WS:', await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:80/ws'));
    console.log('Nginx WS health:', await ssh('curl -s -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:80/ws 2>&1 | head -1'));
    console.log('WS clients:', await ssh('curl -s http://localhost:5001/health'));
    console.log('Firewall 5001:', await ssh('ss -tlnp | grep 5001'));
    console.log('=== DONE ===');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
