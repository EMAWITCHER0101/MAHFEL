const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(label, cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    await ssh('List users', "node -e \"const m=require('/opt/soha/server/node_modules/mongoose');m.connect('mongodb://localhost:27017/soha').then(async()=>{const u=await m.connection.db.collection('users').find({},{projection:{name:1,email:1,role:1,phoneNumber:1}}).toArray();console.log(JSON.stringify(u,null,2));process.exit(0)})\"", 20000);
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
