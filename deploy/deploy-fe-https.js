const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

const tarPath = 'C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\fe.tar';
const REMOTE_TAR = '/tmp/fe.tar';
const EXTRACT_TO = '/opt/soha/.next/standalone';

const c = new Client();
function run(cmd, tag) {
  return new Promise((res, rej) => {
    c.exec(cmd, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('close', code => { console.log(`--- ${tag} (exit ${code}) ---`); if (out.trim()) console.log(out.trim().slice(-1500)); res(code); })
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
      sftp.fastPut(tarPath, REMOTE_TAR, e => e ? rej(e) : res());
    });
  });
  console.log('uploaded fe.tar:', fs.statSync(tarPath).size, 'bytes');
  const b1 = await run(`rm -rf /opt/soha/.next/standalone.bak3 2>/dev/null; mv /opt/soha/.next/standalone /opt/soha/.next/standalone.bak3 && mkdir -p ${EXTRACT_TO} && tar -xf ${REMOTE_TAR} -C ${EXTRACT_TO} && rm -rf ${EXTRACT_TO}/.next/static && mv ${EXTRACT_TO}/static ${EXTRACT_TO}/.next/static`, 'swap+extract');
  if (b1 === 0) {
    await run('systemctl restart soha-frontend', 'restart FE');
    await run('sleep 3 && curl -s -o /dev/null -w "FE local :3000 -> %{http_code}\n" http://127.0.0.1:3000/ ; curl -s -o /dev/null -w "via nginx https -> %{http_code}\n" https://app.soha-sima.ir/ -k', 'self-test');
  }
  c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });