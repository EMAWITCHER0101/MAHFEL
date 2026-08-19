const fs = require('fs');
const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const APK = 'E:\\soha\\android\\app\\build\\outputs\\apk\\release\\app-release.apk';
const REMOTE = '/opt/soha/public/downloads/mahfel.apk';
const size = fs.statSync(APK).size;
console.log('APK size:', size);

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH ready (port 9011)');
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); conn.end(); return; }
    const src = fs.createReadStream(APK);
    const dst = sftp.createWriteStream(REMOTE);
    dst.on('close', () => {
      sftp.stat(REMOTE, (e, stat) => {
        console.log('REMOTE size:', stat ? stat.size : 'unknown');
        conn.end();
      });
    });
    dst.on('error', (e) => { console.log('WRITE ERR:', e.message); conn.end(); });
    src.pipe(dst);
  });
}).on('error', (err) => {
  console.log('SSH error:', err.message);
}).connect({
  host: '87.248.145.44',
  port: 9011,
  username: 'root',
  password: 'emadch82',
  readyTimeout: 30000,
});