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
    // Test various mirrors
    await run('Test arvancloud', 'curl -4 -s --connect-timeout 5 -o /dev/null -w "%{http_code}" https://arvancloud.ir 2>&1', 10000);
    await run('Test iranserver', 'curl -4 -s --connect-timeout 5 -o /dev/null -w "%{http_code}" https://dl.iranserver.com 2>&1', 10000);
    await run('Test apt repos', 'curl -4 -s --connect-timeout 5 -o /dev/null -w "%{http_code}" http://archive.ubuntu.com 2>&1', 10000);
    await run('Test npmmirror', 'curl -4 -s --connect-timeout 10 -o /dev/null -w "%{http_code}" https://registry.npmmirror.com 2>&1', 15000);
    await run('Test cdnjs', 'curl -4 -s --connect-timeout 10 -o /dev/null -w "%{http_code}" https://cdnjs.cloudflare.com 2>&1', 15000);
    await run('Test jsdelivr', 'curl -4 -s --connect-timeout 10 -o /dev/null -w "%{http_code}" https://cdn.jsdelivr.net 2>&1', 15000);
    
    // Try npm install with different registry
    await run('npm with npmmirror', "NODE_OPTIONS='--dns-result-order=ipv4first' npm config set registry https://registry.npmmirror.com && cd /opt/soha/server && NODE_OPTIONS='--dns-result-order=ipv4first' npm install 2>&1 | tail -5", 300000);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
