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
    console.log('=== MongoDB Log ===');
    console.log(await ssh('tail -50 /var/log/mongod.log 2>/dev/null'));
    
    console.log('\n=== Data dir ===');
    console.log(await ssh('ls -la /var/lib/mongodb/ 2>/dev/null | head -10'));
    
    console.log('\n=== Try start foreground to see error ===');
    console.log(await ssh('timeout 5 mongod --dbpath /var/lib/mongodb 2>&1 || true'));
    
    console.log('\n=== Try with repair ===');
    console.log(await ssh('mongod --dbpath /var/lib/mongodb --repair --fork --logpath /var/log/mongod-repair.log 2>&1 || true'));
    
    console.log('\n=== Check disk space ===');
    console.log(await ssh('df -h /'));
    
  } catch(e) {
    console.error('ERROR:', e.message);
  }
})();
