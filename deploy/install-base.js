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
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // Fix npm - force IPv4 by editing gai.conf
    await run('Force IPv4', 'sed -i "s/#precedence ::ffff:0:0\\/96  100/precedence ::ffff:0:0\\/96  100/" /etc/gai.conf 2>/dev/null; echo done', 10000);

    // Install PM2
    await run('Install PM2', 'NODE_OPTIONS="--dns-result-order=ipv4first" npm install -g pm2 2>&1 | tail -5', 180000);
    await run('Check PM2', 'pm2 -v 2>&1', 10000);

    // MongoDB - continue from GPG key
    await run('MongoDB GPG key', 'wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc 2>/dev/null | apt-key add - 2>&1 || curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc 2>/dev/null | apt-key add - 2>&1 || echo "GPG_KEY_SKIPPED"', 60000);
    await run('MongoDB repo', 'echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list', 10000);
    await run('apt update', 'DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>&1 | tail -3', 120000);
    await run('Install MongoDB', 'DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org 2>&1 | tail -10', 300000);

    // Start MongoDB
    await run('Start MongoDB', 'systemctl enable mongod && systemctl start mongod && sleep 2 && systemctl is-active mongod', 30000);
    await run('Verify MongoDB', 'mongod --version | head -1', 10000);

    console.log('\n=== ALL BASE PACKAGES DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
