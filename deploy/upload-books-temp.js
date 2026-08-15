const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
require('dotenv').config({ path: 'E:\\soha\\deploy\\.env.deploy' });
const fs = require('fs');

const files = [
  'BakhteNojavan ver1.31.pdf',
  'Do Maghale Ketab Ver. Final.pdf',
  'Ma va Jahan Tech ver2.5.pdf',
  'Ma-Va-Rahe-Karbalaei-Sh.Raeisi-Ver2.3.pdf',
  'pishraft ver1.pdf',
  'Raze Mdari 2.1.pdf',
];

const c = new Client();
c.on('ready', () => {
  c.sftp((err, sftp) => {
    if (err) { console.error('sftp err', err.message); process.exit(1); }
    let i = 0;
    const next = () => {
      if (i >= files.length) { console.log('ALL_UPLOADED'); c.end(); return; }
      const f = files[i];
      console.log('uploading', f, fs.statSync('E:\\soha\\book\\' + f).size);
      const w = sftp.createWriteStream('/opt/soha/server/uploads/books/' + f);
      w.on('open', () => console.log('stream open', f));
      w.on('close', () => { console.log('ok', f); i++; next(); });
      w.on('error', e => { console.error('stream err', e.message); c.end(); });
      fs.createReadStream('E:\\soha\\book\\' + f).pipe(w);
    };
    next();
  });
}).on('error', e => { console.error('conn err', e.message); process.exit(1); })
  .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000, keepaliveInterval: 10000 });