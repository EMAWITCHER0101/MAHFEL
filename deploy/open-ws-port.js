const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

const c = new Client();
c.on('ready', () => {
  c.exec('ufw allow 5001/tcp 2>/dev/null; firewall-cmd --permanent --add-port=5001/tcp 2>/dev/null; firewall-cmd --reload 2>/dev/null; iptables -I INPUT -p tcp --dport 5001 -j ACCEPT 2>/dev/null; echo PORT_OPEN', {pty: true}, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('data', d => process.stdout.write(d));
    s.stderr.on('data', d => process.stderr.write(d));
    s.on('close', () => c.end());
  });
}).on('error', e => { console.error(e.message); c.end(); })
  .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
