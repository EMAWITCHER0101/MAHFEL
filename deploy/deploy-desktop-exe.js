// آپلود نصاب دسکتاپ (Mahfel-Setup.exe) روی سرور — اجرای دستی:
//   node deploy/deploy-desktop-exe.js
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

const LOCAL_EXE = 'E:\\soha\\Mahfel-Setup.exe';
const REMOTE_DIR = '/opt/soha/public/downloads';

function ssh(label, cmd, timeout) {
  timeout = timeout || 120000;
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

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const size = fs.statSync(localPath).size;
    console.log('>>> Upload ' + path.basename(localPath) + ' (' + Math.round(size/1024/1024) + ' MB)');
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  ' + Math.round(total/1024/1024) + ' MB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== UPLOAD DESKTOP INSTALLER ===');
    if (!fs.existsSync(LOCAL_EXE)) throw new Error('Mahfel-Setup.exe پیدا نشد: ' + LOCAL_EXE);

    await ssh('Create downloads dir', 'mkdir -p ' + REMOTE_DIR + ' && chmod 755 ' + REMOTE_DIR, 15000);
    await uploadFile(LOCAL_EXE, REMOTE_DIR + '/Mahfel-Setup.exe');
    await ssh('Verify', 'ls -la ' + REMOTE_DIR, 15000);

    console.log('\n=== COMPLETE ===');
    console.log('URL: https://app.soha-sima.ir/downloads/Mahfel-Setup.exe');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();