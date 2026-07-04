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
    // Try different registries
    await run('Try Iran mirror', "NODE_OPTIONS='--dns-result-order=ipv4first' npm config set registry https://registry.npmjs.org/ && curl -s --connect-timeout 10 https://registry.npmjs.org/react 2>&1 | head -1", 30000);
    
    await run('Try npmmirror', "curl -s --connect-timeout 10 https://registry.npmmirror.com/react 2>&1 | head -1", 30000);
    
    await run('Try taobao', "curl -s --connect-timeout 10 https://registry.npmmirror.com/ 2>&1 | head -1", 30000);
    
    await run('Check DNS', "dig registry.npmjs.org 2>/dev/null | head -5 || nslookup registry.npmjs.org 2>/dev/null | head -5 || host registry.npmjs.org 2>/dev/null || echo NO_DNS_TOOL", 15000);
    
    await run('Test connectivity', "curl -4 -s --connect-timeout 10 -o /dev/null -w '%{http_code}' https://registry.npmjs.org/ 2>&1", 30000);

    console.log('\n=== NETWORK CHECK DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
