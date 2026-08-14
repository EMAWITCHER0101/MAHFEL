const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

const SRC = 'C:\\Certbot\\config\\archive\\app.soha-sima.ir';
const REMOTE_DIR = '/etc/letsencrypt/live/app.soha-sima.ir';
const FILES = [
  ['fullchain1.pem', 'fullchain.pem'],
  ['privkey1.pem', 'privkey.pem'],
  ['chain1.pem', 'chain.pem'],
  ['cert1.pem', 'cert.pem'],
];

function exec(c, cmd) {
  return new Promise((res, rej) => {
    c.exec(cmd, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('close', (code) => res({ code, out }))
        .on('data', d => out += d.toString())
        .stderr.on('data', d => out += 'ERR:' + d.toString());
    });
  });
}

(async () => {
  const c = new Client();
  await new Promise((res, rej) => {
    c.on('ready', res).on('error', rej);
    c.connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000 });
  });
  console.log('connected');
  const mk = await exec(c, `mkdir -p ${REMOTE_DIR} && chmod 700 ${REMOTE_DIR}`);
  console.log('mkdir:', mk.code);
  await new Promise((res, rej) => {
    c.sftp((err, sftp) => {
      if (err) return rej(err);
      (async () => {
        for (const [local, remote] of FILES) {
          const lp = path.join(SRC, local);
          const rp = `${REMOTE_DIR}/${remote}`;
          await new Promise((r2, rej2) => {
            sftp.fastPut(lp, rp, (e) => e ? rej2(e) : r2());
          });
          console.log('uploaded', remote, fs.statSync(lp).size, 'bytes');
        }
        const ch = await exec(c, `chmod 644 ${REMOTE_DIR}/*.pem && chmod 600 ${REMOTE_DIR}/privkey.pem && ls -la ${REMOTE_DIR}`);
        console.log(ch.out);
        c.end();
        res();
      })().catch(rej);
    });
  });
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });