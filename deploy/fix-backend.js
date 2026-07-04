const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd, timeout) {
  timeout = timeout || 20000;
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
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    // Restart backend
    console.log('Restarting backend...');
    console.log(await ssh('systemctl restart soha-backend'));
    await new Promise(r => setTimeout(r, 3000));
    
    // Check status
    console.log(await ssh('systemctl is-active soha-backend'));
    
    // Test API
    console.log('Testing API...');
    console.log(await ssh('curl -sI http://localhost:5000/api/comments 2>&1 | head -3'));
    
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
