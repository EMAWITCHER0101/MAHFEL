const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

const mode = process.argv[2] || 'auth';
const token = process.env.CERTBOT_TOKEN || '';
const validation = process.env.CERTBOT_VALIDATION || '';
const remoteFile = `/opt/soha/acme-webroot/.well-known/acme-challenge/${token}`;

function withSftp(fn) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        fn(sftp, c).then(resolve).catch(e => { c.end(); reject(e); });
      });
    }).on('error', e => reject(e))
      .connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000 });
  });
}

(async () => {
  try {
    if (!token) throw new Error('CERTBOT_TOKEN missing');
    if (mode === 'auth') {
      await withSftp(async (sftp, c) => {
        await new Promise((res, rej) => sftp.mkdir('/opt/soha/acme-webroot/.well-known/acme-challenge', { recursive: true }, e => e ? rej(e) : res()));
        const w = sftp.createWriteStream(remoteFile);
        w.on('close', () => { console.log('ACME auth file uploaded:', token); c.end(); });
        w.on('error', e => { c.end(); });
        w.end(validation);
      });
    } else {
      await withSftp(async (sftp, c) => {
        sftp.unlink(remoteFile, () => { console.log('ACME cleanup done:', token); c.end(); });
      });
    }
  } catch (e) {
    console.error('ACME HOOK FAILED:', e.message);
    process.exit(1);
  }
})();