const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('echo OK && curl -s -o /dev/null -w %s http://localhost:5000/api/health', {pty: true}, (e, s) => {
    let o = '';
    s.on('data', d => { o += d; });
    s.on('close', () => { console.log('RESULT:', o); c.end(); });
  });
}).on('error', e => { console.log('ERROR:', e.message); })
  .on('close', () => { console.log('CLOSED'); })
  .connect({host: '87.248.145.44', port: 9011, username: 'root', password: 'emadch82', readyTimeout: 30000});
setTimeout(() => { console.log('TIMEOUT'); process.exit(); }, 45000);
