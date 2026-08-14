const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const c = new Client();
c.on('ready', () => {
  const cmd = "systemctl cat soha-backend | grep -E 'ExecStart|WorkingDirectory'; echo ---; ls /opt/soha/server; echo ---; ls /opt/soha/server/models 2>/dev/null; echo ---; ls /opt/soha/server.js /opt/soha/package.json 2>/dev/null";
  c.exec(cmd, (e, s) => {
    if (e) { c.end(); return; }
    s.on('data', d => process.stdout.write(d));
    s.stderr.on('data', d => process.stderr.write(d));
    s.on('close', () => c.end());
  });
}).on('error', e => { console.error('ERR:', e.message); })
  .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '9011'), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
