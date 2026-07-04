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
    // Try different MongoDB download methods
    await run('Try apt MongoDB', 'DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb 2>&1 | tail -5', 120000);
    await run('Check mongod', 'which mongod 2>/dev/null && mongod --version | head -1 || echo NO_MONGOD', 10000);
    
    // If still no mongod, try wget from various mirrors
    await run('Try wget mirror1', 'wget -q --timeout=30 "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.12.tgz" -O /tmp/mongo.tgz 2>&1 && echo DL_OK || echo DL_FAIL', 60000);
    await run('Try wget mirror2', 'wget -q --timeout=30 "http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.12.tgz" -O /tmp/mongo.tgz 2>&1 && echo DL_OK || echo DL_FAIL', 60000);
    
    // If downloaded, install
    await run('Install mongod', 'cd /tmp && tar -xzf mongo.tgz && cp mongodb-linux-*/bin/mongod /usr/local/bin/ && cp mongodb-linux-*/bin/mongos /usr/local/bin/ && mongod --version | head -1', 60000);

    // Start mongod
    await run('Create data dir', 'mkdir -p /data/db', 5000);
    await run('Start mongod', 'mongod --dbpath /data/db --fork --logpath /var/log/mongod.log && echo MONGOD_STARTED', 15000);
    await run('Verify mongod', 'sleep 2 && mongosh --eval "db.runCommand({ping:1})" 2>/dev/null || mongo --eval "db.runCommand({ping:1})" 2>/dev/null || curl -s http://localhost:27017 && echo MONGOD_OK', 15000);

    console.log('\n=== MONGODB DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
