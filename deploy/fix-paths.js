const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
require('dotenv').config({ path: 'E:\\soha\\deploy\\.env.deploy' });
const fs = require('fs');
const c = new Client();
c.on('ready', () => {
  c.sftp((err, sftp) => {
    if (err) { console.error(err.message); process.exit(1); }
    const w = sftp.createWriteStream('/opt/soha/server/fix-paths.mjs');
    w.on('close', () => {
      console.log('uploaded');
      c.exec('cd /opt/soha/server && node fix-paths.mjs; rm -f fix-paths.mjs', (e, s) => {
        let o = '';
        s.on('data', d => o += d);
        s.stderr.on('data', d => o += d);
        s.on('close', () => { console.log(o); c.end(); });
      });
    });
    w.on('error', err2 => { console.error(err2.message); process.exit(1); });
    fs.createReadStream('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\pdfx\\fix-paths.mjs').pipe(w);
  });
}).on('error', e => { console.error(e.message); process.exit(1); })
  .connect({ host: process.env.SSH_HOST, port: +process.env.SSH_PORT, username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000, keepaliveInterval: 10000 });