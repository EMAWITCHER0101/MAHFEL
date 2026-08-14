const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

const src = 'E:\\soha\\server\\server.js';
const remote = '/opt/soha/server/server.js';

const c = new Client();
function run(cmd, tag) {
  return new Promise((res, rej) => {
    c.exec(cmd, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('close', code => { console.log(`--- ${tag} (exit ${code}) ---`); if (out.trim()) console.log(out.trim().slice(-800)); res(code); })
        .on('data', d => out += d.toString())
        .stderr.on('data', d => out += d.toString());
    });
  });
}

(async () => {
  await new Promise((res, rej) => c.on('ready', res).on('error', rej)
    .connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 20000 }));
  console.log('connected');
  await new Promise((res, rej) => {
    c.sftp((err, sftp) => {
      if (err) return rej(err);
      sftp.fastPut(src, remote, e => e ? rej(e) : res());
    });
  });
  console.log('server.js uploaded');
  await run('cp /opt/soha/server/server.js /opt/soha/server/server.js.bak-https && systemctl restart soha-backend && sleep 3 && curl -s -o /dev/null -w "backend 5000 -> %{http_code}\n" http://127.0.0.1:5000/api/health && curl -s -o /dev/null -w "api via https -> %{http_code}\n" https://app.soha-sima.ir/api/health -k', 'restart BE');
  c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });