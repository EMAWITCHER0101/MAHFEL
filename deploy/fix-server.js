const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function run(label, cmd, timeout) {
  timeout = timeout || 120000;
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
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 30000});
  });
}

(async () => {
  try {
    // First: disable unattended-upgrades and kill any apt processes
    await run('Disable auto-updates', 'systemctl stop unattended-upgrades 2>/dev/null; systemctl disable unattended-upgrades 2>/dev/null; echo DONE', 15000);
    await run('Kill apt processes', 'killall apt-get 2>/dev/null; killall dpkg 2>/dev/null; rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock /var/lib/apt/lists/lock; dpkg --configure -a 2>/dev/null; echo DONE', 30000);

    // Force IPv4 for DNS
    await run('Force IPv4 DNS', "sed -i 's/#precedence ::ffff:0:0\\/96  100/precedence ::ffff:0:0\\/96  100/' /etc/gai.conf 2>/dev/null; echo DONE", 10000);

    // Install PM2
    await run('Install PM2', 'NODE_OPTIONS=--dns-result-order=ipv4first npm install -g pm2 2>&1 | tail -5', 300000);
    await run('Verify PM2', 'pm2 -v', 10000);

    console.log('\n=== PM2 DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
