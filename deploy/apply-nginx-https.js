const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

const confPath = 'C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\new-mahfel.conf';
const b64 = fs.readFileSync(confPath).toString('base64');

const c = new Client();
let ran = 0;
function run(cmd, tag) {
  return new Promise((res, rej) => {
    c.exec(cmd, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('close', code => { console.log(`--- ${tag} (exit ${code}) ---`); console.log(out.trim()); res(code); })
        .on('data', d => out += d.toString())
        .stderr.on('data', d => out += d.toString());
    });
  });
}

(async () => {
  await new Promise((res, rej) => c.on('ready', res).on('error', rej)
    .connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000 }));
  console.log('connected');
  await run(`cp /etc/nginx/sites-enabled/mahfel /root/mahfel.bak.https-$(date +%s)`, 'backup');
  await run(`echo ${b64} | base64 -d > /etc/nginx/sites-enabled/mahfel`, 'write');
  const t = await run('nginx -t', 'nginx-t');
  if (t === 0) {
    await run('systemctl reload nginx || nginx -s reload', 'reload');
  }
  c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });