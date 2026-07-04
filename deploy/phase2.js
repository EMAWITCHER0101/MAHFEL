const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const c = new Client();
c.on('ready', () => {
  console.log('Connected');

  function runCmd(cmd, label) {
    return new Promise((resolve, reject) => {
      console.log(`\n>>> ${label}`);
      c.exec(cmd, {}, (e, s) => {
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { process.stderr.write(d); o += d; });
        s.on('close', () => resolve(o));
      });
    });
  }

  (async () => {
    await runCmd('kill 1071 2>/dev/null; echo KILLED OLD SCRIPT', 'Kill old script');

    // MongoDB - try apt package instead
    await runCmd('dpkg -l | grep mongo || echo "No MongoDB installed"', 'Check MongoDB');
    await runCmd('echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list 2>/dev/null || echo MONGO_REPO_EXISTS', 'Add MongoDB repo');
    await runCmd('curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add - 2>/dev/null && echo GPG_OK || echo GPG_FAIL', 'MongoDB GPG key');
    await runCmd('DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>&1 | tail -3', 'apt update');
    await runCmd('DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org 2>&1 | tail -10', 'Install MongoDB', 180000);

    await runCmd('systemctl enable mongod && systemctl start mongod && echo MONGO_STARTED || echo MONGO_FAILED', 'Start MongoDB');
    await runCmd('mongod --version | head -1 || echo "MongoDB not installed"', 'MongoDB version');

    // PM2 + Nginx
    await runCmd('npm install -g pm2 2>&1 | tail -3', 'Install PM2');
    await runCmd('DEBIAN_FRONTEND=noninteractive apt-get install -y nginx 2>&1 | tail -3', 'Install Nginx');

    console.log('\n=== BASE PACKAGES DONE ===');
    c.end();
  })();
}).on('error', e => console.log('ERR:', e.message))
  .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 30000});
