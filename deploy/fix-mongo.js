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
    console.log('=== Check mongod binary ===');
    console.log(await ssh('which mongod 2>&1 || ls /usr/bin/mongod 2>&1 || ls /usr/local/bin/mongod 2>&1'));
    
    console.log('\n=== Check mongosh ===');
    console.log(await ssh('which mongosh 2>&1 || ls /usr/bin/mongosh 2>&1'));
    
    console.log('\n=== Check mongod process ===');
    console.log(await ssh('ps aux | grep mongo | grep -v grep'));
    
    console.log('\n=== Check port 27017 ===');
    console.log(await ssh('ss -tlnp | grep 27017'));
    
    console.log('\n=== Try start mongod ===');
    console.log(await ssh('mongod --fork --logpath /var/log/mongod.log --dbpath /var/lib/mongodb 2>&1 || mongod --fork --logpath /var/log/mongod.log --dbpath /data/db 2>&1'));
    
    console.log('\n=== After start - check port ===');
    console.log(await ssh('sleep 3 && ss -tlnp | grep 27017'));
    
    console.log('\n=== Test API after restart ===');
    console.log(await ssh('curl -s --max-time 5 http://localhost:5000/api/podcasts 2>&1 | head -c 300'));
    
  } catch(e) {
    console.error('ERROR:', e.message);
  }
})();
