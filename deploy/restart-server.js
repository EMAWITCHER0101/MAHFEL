const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
require('dotenv').config({ path: 'E:\\soha\\deploy\\.env.deploy' });
const c = new Client();
c.on('ready', () => {
  c.exec('systemctl restart soha-server 2>&1; sleep 4; systemctl is-active soha-server; curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health', (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.error(e.message); process.exit(1); })
  .connect({ host: process.env.SSH_HOST, port: +process.env.SSH_PORT, username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000, keepaliveInterval: 10000 });