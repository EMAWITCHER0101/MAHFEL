const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

function uploadFile(lp, rp) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + lp.split('\\').pop());
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(lp);
        const w = sftp.createWriteStream(rp);
        w.on('close', () => { c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== DEPLOY AUTHOR NOTES BACKEND ===');

    console.log('1. Upload PublishedBook.js...');
    await uploadFile('E:\\soha\\server\\models\\PublishedBook.js', '/opt/soha/server/models/PublishedBook.js');

    console.log('2. Upload publishedBooks.js...');
    await uploadFile('E:\\soha\\server\\routes\\publishedBooks.js', '/opt/soha/server/routes/publishedBooks.js');

    console.log('2b. Upload admin.js...');
    await uploadFile('E:\\soha\\server\\routes\\admin.js', '/opt/soha/server/routes/admin.js');

    console.log('2c. Upload seed-notes-soha.js...');
    await uploadFile('E:\\soha\\server\\seed-notes-soha.js', '/opt/soha/server/seed-notes-soha.js');

    console.log('2d. Run seed...');
    console.log(await ssh('cd /opt/soha/server && node seed-notes-soha.js 2>&1', 120000));

    console.log('3. Restart backend...');
    console.log(await ssh('systemctl restart soha-backend'));
    await new Promise(r => setTimeout(r, 3000));

    console.log('4. Status...');
    console.log(await ssh('systemctl is-active soha-backend'));
    console.log(await ssh('curl -sI http://localhost:5000/api/health 2>&1 | head -2'));
    console.log(await ssh('curl -s http://localhost:5000/api/published-books?type=note 2>&1 | head -c 600'));

    console.log('\nDONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
