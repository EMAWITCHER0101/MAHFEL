const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;
const cmd = process.argv[2] || 'cat /etc/nginx/sites-enabled/mahfel';
const c = new Client();
c.on('ready', () => {
  c.exec(cmd, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    let out = '';
    stream.on('close', code => { console.log('EXIT:', code); console.log(out); c.end(); })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => out += d.toString());
  });
}).on('error', e => { console.error('SSH ERR:', e.message); process.exit(1); })
  .connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000 });