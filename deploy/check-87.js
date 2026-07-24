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
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, (e, s) => {
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
    console.log('=== DIAGNOSE ===\n');

    console.log('1. Nginx:');
    console.log((await ssh('systemctl is-active nginx')).trim());

    console.log('\n2. Backend:');
    console.log((await ssh('systemctl is-active soha-backend')).trim());

    console.log('\n3. Port 5000:');
    console.log((await ssh('ss -tlnp | grep 5000 || echo FREE')).trim());

    console.log('\n4. Port 3000:');
    console.log((await ssh('ss -tlnp | grep 3000 || echo FREE')).trim());

    console.log('\n5. Frontend service:');
    console.log((await ssh('systemctl status soha-frontend 2>&1 | head -10')).trim());

    console.log('\n6. PM2:');
    console.log((await ssh('pm2 list 2>/dev/null || echo NO_PM2')).trim());

    console.log('\n7. /opt/soha structure:');
    console.log((await ssh('ls /opt/soha/.next/ 2>/dev/null || echo NO_NEXT')).trim());

    console.log('\n8. Nginx config:');
    console.log((await ssh('cat /etc/nginx/sites-available/soha 2>/dev/null || echo NO_CONFIG')).trim());

    console.log('\n9. Test backend:');
    console.log((await ssh('curl -s http://localhost:5000/api/health')).trim());

    console.log('\n10. Test frontend:');
    console.log((await ssh('curl -sI http://localhost:3000/ 2>&1 | head -3')).trim());

  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
