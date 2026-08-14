const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

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
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== NETWORK STATUS ===');
    console.log(await ssh('ip route show default', 5000));
    console.log(await ssh('ping -c 2 -W 3 8.8.8.8', 10000));
    console.log(await ssh('ping -c 2 -W 3 1.1.1.1', 10000));
    console.log(await ssh('cat /etc/resolv.conf', 5000));
    console.log(await ssh('nslookup aparat.com 2>&1 | head -10', 10000));
    console.log(await ssh('curl -s --connect-timeout 5 -o /dev/null -w "%{http_code}" http://8.8.8.8', 10000));
    console.log(await ssh('iptables -L FORWARD -n 2>/dev/null | head -10', 5000));
    console.log(await ssh('systemctl is-active networking 2>/dev/null || echo "n/a"', 5000));
    console.log(await ssh('ip addr show | grep -E "inet " | head -10', 5000));
  } catch(e) { console.error('ERROR:', e.message); }
})();
