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
    console.log('=== CHECK WS SERVER ===');
    console.log('WS status:', (await ssh('systemctl is-active soha-ws')).trim());
    console.log('WS health:', (await ssh('curl -s http://localhost:5001/health')).trim());
    console.log('WS process:', (await ssh('ps aux | grep soha-ws | grep -v grep')).trim());
    console.log('Port 5001:', (await ssh('ss -tlnp | grep 5001')).trim());
    console.log('Firewall:', (await ssh('iptables -L INPUT -n | grep 5001')).trim());
    console.log('UFW:', (await ssh('ufw status 2>/dev/null | grep 5001 || echo "ufw not active"')).trim());
  } catch(e) { console.error(e.message); }
})();
