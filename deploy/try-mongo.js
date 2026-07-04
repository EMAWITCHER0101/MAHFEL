const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function run(label, cmd, timeout) {
  timeout = timeout || 120000;
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
    // Try various download sources from the server
    await run('Test google', 'curl -4 -s --connect-timeout 5 -o /dev/null -w "%{http_code}" https://www.google.com 2>&1', 15000);
    await run('Test github', 'curl -4 -s --connect-timeout 5 -o /dev/null -w "%{http_code}" https://github.com 2>&1', 15000);
    await run('Test npmjs', 'curl -4 -s --connect-timeout 5 -o /dev/null -w "%{http_code}" https://registry.npmjs.org 2>&1', 15000);
    
    // Try npm install directly on server with registry
    await run('npm install mongodb-memory-server', "NODE_OPTIONS='--dns-result-order=ipv4first' npm install mongodb-memory-server --save 2>&1 | tail -10", 300000);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
