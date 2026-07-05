const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.248.145.44', port: 9011, username: 'root', password: 'emadch82', readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    // Start MongoDB
    console.log('Starting MongoDB...');
    console.log(await ssh('/usr/local/bin/mongod --dbpath /data/db --fork --logpath /var/log/mongod.log 2>&1'));
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Check MongoDB
    console.log('MongoDB status:');
    console.log(await ssh('pgrep mongod && echo running || echo not running'));
    
    // Restart backend
    console.log('Restarting backend...');
    console.log(await ssh('systemctl restart soha-backend'));
    
    // Restart frontend
    console.log('Restarting frontend...');
    console.log(await ssh('systemctl restart soha-frontend'));
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Test
    console.log('Testing...');
    console.log(await ssh('curl -sI http://localhost:80/ 2>&1 | head -3'));
    console.log(await ssh('curl -sI http://localhost:5000/api/comments 2>&1 | head -3'));
    
    // All services
    console.log('Services:');
    console.log(await ssh('systemctl is-active soha-frontend soha-backend nginx'));
    console.log(await ssh('pgrep mongod'));
    
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
