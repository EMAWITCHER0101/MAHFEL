const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function sshExec(cmd, label, timeout) {
  timeout = timeout || 120000;
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${label}`);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);

    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { process.stderr.write(d); o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // Step 1: GPG key
    await sshExec('curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add - && echo GPG_OK', 'MongoDB GPG key', 30000);

    // Step 2: apt update
    await sshExec('DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>&1 | tail -3', 'apt update', 120000);

    // Step 3: Install MongoDB
    await sshExec('DEBIAN_FRONTEND=noninteractive apt-get install -y mongosh mongodb-mongosh 2>&1 | tail -5 || echo "mongosh done"', 'mongosh', 120000);

    await sshExec('DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org 2>&1 | tail -10', 'Install MongoDB', 300000);

    // Step 4: Start MongoDB
    await sshExec('systemctl enable mongod && systemctl start mongod && sleep 2 && systemctl status mongod | head -5', 'Start MongoDB', 30000);

    // Step 5: Install PM2
    await sshExec('npm install -g pm2 2>&1 | tail -3', 'Install PM2', 120000);

    // Step 6: Install Nginx
    await sshExec('DEBIAN_FRONTEND=noninteractive apt-get install -y nginx 2>&1 | tail -5', 'Install Nginx', 120000);

    console.log('\n=== ALL BASE PACKAGES INSTALLED ===');
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
