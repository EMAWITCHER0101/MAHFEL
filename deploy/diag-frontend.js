const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011'), USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout || 30000);
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
    console.log('=== DIAG soha-frontend ===');
    console.log(await ssh('systemctl status soha-frontend --no-pager -l 2>&1 | tail -25'));
    console.log('\n--- last logs ---');
    console.log(await ssh('journalctl -u soha-frontend --no-pager -n 30 2>&1'));
    console.log('\n--- unit file ---');
    console.log(await ssh('cat /etc/systemd/system/soha-frontend.service 2>/dev/null || systemctl cat soha-frontend 2>&1'));
    console.log('\n--- standalone dir ---');
    console.log(await ssh('ls /opt/soha/.next/standalone/ && ls /opt/soha/.next/standalone/.next/ 2>&1 | head -10'));
  } catch (e) { console.error('FAILED:', e.message); }
})();
