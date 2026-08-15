const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
require('dotenv').config({ path: 'E:\\soha\\deploy\\.env.deploy' });
const c = new Client();
c.on('ready', () => {
  c.exec('ls /opt/soha/uploads/book-pages/ ; echo --- ; ls /opt/soha/uploads/book-pages/6a2460604e951b50feb9306e/ | head -5 ; echo --- ; ls /opt/soha/uploads/book-pages/6a2460604e951b50feb9306e/ | wc -l', (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => { console.error(e.message); process.exit(1); })
  .connect({ host: process.env.SSH_HOST, port: +process.env.SSH_PORT, username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000, keepaliveInterval: 10000 });