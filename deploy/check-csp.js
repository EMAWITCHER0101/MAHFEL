require('dotenv').config({ path: __dirname + '/.env.deploy' });
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec("curl -sI http://87.248.145.44/ 2>/dev/null | grep -i 'content-security'", (e, stream) => {
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stdout.write(d));
    stream.on('close', () => c.end());
  });
}).connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '9011'), username: process.env.SSH_USER, password: process.env.SSH_PASS });
