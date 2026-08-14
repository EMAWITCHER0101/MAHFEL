const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

function ssh(cmd, timeout) {
  timeout = timeout || 20000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '9011'), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('== ls server/node_modules ==');
    console.log(await ssh('ls /opt/soha/server/node_modules 2>/dev/null | head -5'));
    console.log('== ls /opt/soha/node_modules ==');
    console.log(await ssh('ls /opt/soha/node_modules 2>/dev/null | head -8'));
    console.log('== systemd backend unit ==');
    console.log(await ssh('cat /etc/systemd/system/soha-backend.service 2>/dev/null || systemctl cat soha-backend 2>/dev/null | head -15'));
  } catch (e) { console.error('FAILED:', e.message); }
})();
