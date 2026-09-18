const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
require('dotenv').config({ path: 'E:\\soha\\deploy\\.env.deploy' });
const fs = require('fs');
const c = new Client();
c.on('ready', () => {
  c.sftp((err, sftp) => {
    if (err) { console.error(err.message); process.exit(1); }
    const up = (local, remote) => new Promise((res, rej) => {
      const w = sftp.createWriteStream(remote);
      w.on('close', res); w.on('error', rej);
      fs.createReadStream(local).pipe(w);
    });
    (async () => {
      try {
        await up('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\pdfx\\render-and-set.mjs', '/opt/soha/server/render-and-set.mjs');
        console.log('uploaded');
        c.exec('cd /opt/soha/server && node render-and-set.mjs; rm -f render-and-set.mjs', (e, s) => {
          if (e) { console.error(e.message); c.end(); return; }
          let o = '';
          s.on('data', d => o += d);
          s.stderr.on('data', d => o += d);
          s.on('close', () => { console.log(o); c.end(); });
        });
      } catch (err) { console.error(err.message); process.exit(1); }
    })();
  });
}).on('error', e => { console.error(e.message); process.exit(1); })
  .connect({ host: process.env.SSH_HOST, port: +process.env.SSH_PORT, username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000, keepaliveInterval: 10000 });