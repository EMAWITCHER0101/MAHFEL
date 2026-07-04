const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('tail -50 /opt/soha/setup.log 2>/dev/null', {}, (e, s) => {
    let o = '';
    s.on('data', d => { o += d; });
    s.on('close', () => { console.log(o); c.end(); });
  });
}).on('error', e => console.log('ERR:', e.message))
  .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 30000});
