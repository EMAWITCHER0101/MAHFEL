const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = process.env.SSH_HOST;
const PORT = Number(process.env.SSH_PORT || 22);
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = localPath.split('\\').pop();
    console.log('>>> Upload ' + name);
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  ' + Math.round(total/1024) + ' KB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

const fs = require('fs');

(async () => {
  await uploadFile('E:\\soha\\public\\sw.js', '/opt/soha/public/sw.js');
  await uploadFile('E:\\soha\\public\\sw.js', '/opt/soha/.next/standalone/public/sw.js');
  await uploadFile('E:\\soha\\public\\sw.js', '/opt/soha/.next/public/sw.js');
  await uploadFile('E:\\soha\\public\\sw.js', '/opt/soha/.next/dist/sw.js');
  console.log('DONE');
})();