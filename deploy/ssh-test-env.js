const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'deploy', '.env.deploy') });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const c = new Client();
c.on('ready', () => {
  console.log('READY');
  c.exec('echo SSH_OK', {}, (e, s) => {
    if (e) { console.log('EXEC ERR:', e.message); process.exit(1); }
    s.on('data', d => process.stdout.write(String(d)));
    s.on('close', () => { c.end(); process.exit(0); });
  });
})
.on('error', e => { console.log('ERR:', e.message); process.exit(1); })
.connect({
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '9011'),
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASS,
  readyTimeout: 30000,
});
setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 40000);
