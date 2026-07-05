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
        s.on('data', d => { o += d; process.stdout.write(d.toString()); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString()); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'emadch82', readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    // Try installing mongod via apt
    console.log('=== Installing MongoDB ===');
    console.log(await ssh('apt-get update -qq 2>&1 | tail -3', 60000));
    console.log(await ssh('apt-get install -y -qq mongosh 2>&1 | tail -5', 60000));
    
    // Check if mongod binary exists now
    console.log('=== Checking mongod ===');
    console.log(await ssh('which mongod || find / -name mongod -type f 2>/dev/null'));
    
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
