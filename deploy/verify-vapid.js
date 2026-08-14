const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = process.env.SSH_HOST;
const PORT = Number(process.env.SSH_PORT || 22);
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(label, cmd, timeout) {
  timeout = timeout || 60000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    await ssh('Check dotenv in server.js', 'grep -n "dotenv" /opt/soha/server/server.js | head -3', 20000);
    await ssh('Working dir', 'systemctl cat soha-backend | grep -E "WorkingDirectory" | head -2', 20000);
    const k = await ssh('Restart + keys echo', 'systemctl restart soha-backend && sleep 3 && node -e "require(\'/opt/soha/server/node_modules/dotenv\').config({path:\'/opt/soha/server/.env\'});console.log(process.env.VAPID_PUBLIC_KEY?\'PUB-FOUND\':\'NOT\', process.env.VAPID_PRIVATE_KEY?\'PRIV-FOUND\':\'NOT\')"', 40000);
    console.log('ENV CHECK:', k.trim());
    const p = await ssh('public-key after restart', 'curl -s http://localhost:5000/api/notifications/public-key', 20000);
    console.log('PUBLIC KEY NOW:', p.trim());
    console.log('(should start with BL4y19G5Sa)');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();