const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { c.end(); resolve(o); });
      });
    }).on('error', e => reject(e))
      .connect({host:'87.248.145.44', port:9011, username:'root', password:'emadch82', readyTimeout:15000});
  });
}

(async () => {
  try {
    console.log('=== Server .env ===');
    console.log(await ssh('cat /opt/soha/server/.env'));
    
    console.log('\n=== MongoDB config ===');
    console.log(await ssh('cat /etc/mongod.conf 2>/dev/null | head -30'));
    
    console.log('\n=== MongoDB port check ===');
    console.log(await ssh('ss -tlnp | grep 27017'));
    
    console.log('\n=== MongoDB replica set status ===');
    console.log(await ssh('mongosh --eval "rs.status().ok" --quiet 2>&1 || mongo --eval "rs.status().ok" --quiet 2>&1'));
    
  } catch(e) {
    console.error('ERROR:', e.message);
  }
})();
