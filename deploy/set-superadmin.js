const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

function ssh(label, cmd) {
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, 30000);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '9011'), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + path.basename(localPath));
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '9011'), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    const nodeScript = `
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/soha').then(async () => {
  const r = await mongoose.connection.db.collection('users').updateOne(
    {phoneNumber: '09130245369'},
    {$set: {role: 'superadmin', name: 'emad admin'}}
  );
  console.log('Updated:', JSON.stringify(r));
  const u = await mongoose.connection.db.collection('users').findOne(
    {phoneNumber: '09130245369'},
    {projection: {name:1, role:1, phoneNumber:1}}
  );
  console.log('User:', JSON.stringify(u));
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
`;
    fs.writeFileSync('E:\\temp\\set-superadmin-node.cjs', nodeScript);
    await uploadFile('E:\\temp\\set-superadmin-node.cjs', '/opt/soha/server/set-superadmin-node.cjs');
    const result = await ssh('set superadmin', 'cd /opt/soha/server && node set-superadmin-node.cjs');
    console.log(result);
    await ssh('cleanup', 'rm /opt/soha/server/set-superadmin-node.cjs');
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
