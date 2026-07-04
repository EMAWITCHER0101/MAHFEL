const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function run(label, cmd, timeout) {
  timeout = timeout || 600000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
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
    // Test various registries
    await run('Test npmjs', "curl -4 -s --connect-timeout 5 -o /dev/null -w '%{http_code}' https://registry.npmjs.org/ 2>&1", 15000);
    await run('Test npmmirror', "curl -4 -s --connect-timeout 5 -o /dev/null -w '%{http_code}' https://registry.npmmirror.com/ 2>&1", 15000);
    await run('Test verdaccio', "curl -4 -s --connect-timeout 5 -o /dev/null -w '%{http_code}' https://registry.verdaccio.org/ 2>&1", 15000);
    
    // Set npm to npmmirror and install
    await run('Set npmmirror', "npm config set registry https://registry.npmmirror.com/", 10000);
    await run('Test npm install', "NODE_OPTIONS='--dns-result-order=ipv4first' npm ping 2>&1", 30000);
    
    // Try install
    await run('npm install root', "cd /opt/soha && rm -rf node_modules package-lock.json && NODE_OPTIONS='--dns-result-order=ipv4first' npm install 2>&1 | tail -15", 600000);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
