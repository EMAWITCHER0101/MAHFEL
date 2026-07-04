const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function run(label, cmd, timeout) {
  timeout = timeout || 300000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // Fix IPv4
    await run('Fix IPv4', "grep -q 'precedence' /etc/gai.conf && echo ALREADY || echo 'precedence ::ffff:0:0/96  100' >> /etc/gai.conf", 10000);
    
    // Clean npm cache and old installs
    await run('Clean', 'cd /opt/soha/server && rm -rf node_modules package-lock.json && cd /opt/soha && rm -rf node_modules package-lock.json', 30000);
    
    // Install server deps first (smaller)
    await run('Install server deps', 'cd /opt/soha/server && NODE_OPTIONS=--dns-result-order=ipv4first npm install 2>&1 | tail -10', 600000);
    
    // Install root deps
    await run('Install root deps', 'cd /opt/soha && NODE_OPTIONS=--dns-result-order=ipv4first npm install 2>&1 | tail -10', 600000);
    
    console.log('\n=== NPM INSTALL DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
