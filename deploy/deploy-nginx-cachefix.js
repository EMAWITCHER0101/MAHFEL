const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join('E:\\soha\\deploy', '.env.deploy') });
const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

const c = new Client();
function run(cmd, tag) {
  return new Promise((res, rej) => {
    c.exec(cmd, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('close', code => { console.log(`--- ${tag} (exit ${code}) ---`); if (out.trim()) console.log(out.trim().slice(-1200)); res(code); })
        .on('data', d => out += d.toString())
        .stderr.on('data', d => out += d.toString());
    });
  });
}

(async () => {
  await new Promise((res, rej) => c.on('ready', res).on('error', rej)
    .connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 20000 }));
  console.log('connected');
  const sftp = await new Promise((res, rej) => c.sftp((e, s) => e ? rej(e) : res(s)));
  await new Promise((res, rej) => sftp.fastPut('C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\mahfel-nginx-v2.conf', '/etc/nginx/sites-enabled/mahfel', e => e ? rej(e) : res()));
  console.log('uploaded nginx conf');
  await run('cp /etc/nginx/sites-enabled/mahfel /root/mahfel-nginx-backup.conf && nginx -t', 'nginx -t');
  await run('systemctl reload nginx && sleep 1 && curl -s -o /dev/null -w "html cache-control check -> %{http_code} " https://app.soha-sima.ir/ -k -D - 2>&1 | grep -i cache-control | head -3', 'reload + verify');
  c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });