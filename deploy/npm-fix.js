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
    // Force IPv4 permanently
    await run('Set IPv4', "echo 'precedence ::ffff:0:0/96  100' > /etc/gai.conf", 10000);
    
    // Set NODE_OPTIONS globally
    await run('Set NODE_OPTIONS', "echo 'export NODE_OPTIONS=\"--dns-result-order=ipv4first\"' >> /etc/environment && export NODE_OPTIONS='--dns-result-order=ipv4first'", 10000);

    // Verify IPv4 works
    await run('Test npm registry', "NODE_OPTIONS='--dns-result-order=ipv4first' npm ping 2>&1", 30000);

    // Clean and reinstall server deps
    await run('Clean server', 'rm -rf /opt/soha/server/node_modules /opt/soha/server/package-lock.json', 30000);
    await run('Install server deps', "cd /opt/soha/server && NODE_OPTIONS='--dns-result-order=ipv4first' npm install 2>&1 | tail -15", 600000);

    // Clean and reinstall root deps
    await run('Clean root', 'rm -rf /opt/soha/node_modules /opt/soha/package-lock.json', 30000);
    await run('Install root deps', "cd /opt/soha && NODE_OPTIONS='--dns-result-order=ipv4first' npm install 2>&1 | tail -15", 600000);

    // Install PM2
    await run('Install PM2', "NODE_OPTIONS='--dns-result-order=ipv4first' npm install -g pm2 2>&1 | tail -5", 300000);

    console.log('\n=== NPM DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
