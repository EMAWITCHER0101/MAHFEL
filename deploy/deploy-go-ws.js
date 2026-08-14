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
  await run('systemctl stop soha-ws', 'stop soha-ws');
  await new Promise((res, rej) => sftp.fastPut('E:\\soha\\ws-server\\soha-ws-linux', '/opt/soha/soha-ws', e => e ? rej(e) : res()));
  console.log('uploaded new soha-ws binary');
  await run('chmod +x /opt/soha/soha-ws && systemctl start soha-ws && sleep 3 && systemctl is-active soha-ws', 'start soha-ws');
  await run('curl -s http://127.0.0.1:5001/health; echo; journalctl -u soha-ws -n 8 --no-pager | grep -E "Mongo|starting" | tail -4', 'health + mongo watch log');
  c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });