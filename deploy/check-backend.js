const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
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
    console.log('=== BACKEND LOGS ===');
    console.log(await ssh('journalctl -u soha-backend --no-pager -n 30', 10000));
    console.log('\n=== CORS CHECK ===');
    console.log(await ssh('curl -s -H "Origin: capacitor://localhost" http://localhost:5000/api/health'));
    console.log(await ssh('curl -s -I -H "Origin: capacitor://localhost" http://localhost:5000/api/podcasts 2>&1 | head -15'));
    console.log('\n=== APK API CHECK ===');
    console.log(await ssh('curl -s http://87.248.145.44/api/health'));
    console.log(await ssh('curl -s -H "Origin: capacitor://localhost" http://87.248.145.44/api/health'));
  } catch(e) { console.error(e.message); }
})();
