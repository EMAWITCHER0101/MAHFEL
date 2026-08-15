const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
require('dotenv').config({ path: 'E:\\soha\\deploy\\.env.deploy' });
const fs = require('fs');
const c = new Client();
c.on('ready', () => {
  console.log('ready');
  c.sftp((err, sftp) => {
    if (err) { console.error('sftp err', err.message); process.exit(1); }
    const upload = (local, remote) => new Promise((res, rej) => {
      const w = sftp.createWriteStream(remote);
      w.on('close', () => { console.log('up ok', remote); res(); });
      w.on('error', (e) => { console.error('up err', remote, e.message); rej(e); });
      fs.createReadStream(local).pipe(w);
    });
    (async () => {
      try {
        await upload('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\pdfx\\books-content.json', '/opt/soha/server/books-content.json');
        console.log('first done');
        await upload('C:\\Users\\EMAD\\AppData\\Local\\Temp\\opencode\\pdfx\\update-db.mjs', '/opt/soha/server/update-db.mjs');
        console.log('second done');
        c.exec('cd /opt/soha/server && node update-db.mjs; rm -f update-db.mjs books-content.json', (e, s) => {
          if (e) { console.error('exec err', e.message); c.end(); return; }
          let o = '';
          s.on('data', d => o += d);
          s.stderr.on('data', d => o += d);
          s.on('close', () => { console.log(o); c.end(); });
        });
      } catch (err) { console.error('FATAL', err.message); process.exit(1); }
    })();
  });
}).on('error', e => { console.error('conn err', e.message); process.exit(1); })
  .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 30000, keepaliveInterval: 5000, keepaliveCountMax: 20, debug: (m) => { if (String(m).includes('ERROR')) console.error('dbg', m); } });