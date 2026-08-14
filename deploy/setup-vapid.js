const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

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
    console.log('=== SETUP FIXED VAPID KEYS ===');

    const keys = await ssh('Generate keys on server', 'node -e "const w=require(\'/opt/soha/server/node_modules/web-push\');const k=w.generateVAPIDKeys();console.log(k.publicKey+\\"|\\"+k.privateKey)"', 30000);
    const [pub, priv] = keys.trim().split('|');
    if (!pub || !priv) throw new Error('key generation failed: ' + keys);

    await ssh('Write to /opt/soha/server/.env', 'touch /opt/soha/server/.env && grep -q VAPID_PUBLIC_KEY /opt/soha/server/.env && echo EXISTS || echo NEW', 20000);
    await ssh('Append VAPID_PUBLIC_KEY', 'grep -q VAPID_PUBLIC_KEY /opt/soha/server/.env || echo "VAPID_PUBLIC_KEY=' + pub + '" >> /opt/soha/server/.env', 20000);
    await ssh('Append VAPID_PRIVATE_KEY', 'grep -q VAPID_PRIVATE_KEY /opt/soha/server/.env || echo "VAPID_PRIVATE_KEY=' + priv + '" >> /opt/soha/server/.env', 20000);
    await ssh('Append VAPID_SUBJECT', 'grep -q VAPID_SUBJECT /opt/soha/server/.env || echo "VAPID_SUBJECT=mailto:admin@soha-sima.ir" >> /opt/soha/server/.env', 20000);

    await ssh('Check NextEnvFromEnvFile', 'systemctl cat soha-backend | grep -A2 EnvironmentFile | head -5', 20000);

    const pub2 = 'PUB=' + pub.slice(0, 10) + '...';
    const priv2 = 'PRIV=' + priv.slice(0, 10) + '...';
    console.log('KEYS: ' + pub2 + ' / ' + priv2);

    await ssh('Check service env file', 'systemctl cat soha-backend | grep -E "EnvironmentFile|ExecStart" | head -4', 20000);

    console.log('\n=== DONE (restart manually if needed) ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();