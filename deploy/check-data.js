const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function run(label, cmd, timeout) {
  timeout = timeout || 60000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
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
    // Check what APIs return
    await run('Health', 'curl -s http://localhost:5000/api/health', 10000);
    await run('Posts', 'curl -s http://localhost:5000/api/posts | head -100', 10000);
    await run('Podcasts', 'curl -s http://localhost:5000/api/podcasts | head -100', 10000);
    await run('Videos', 'curl -s http://localhost:5000/api/videos | head -100', 10000);
    await run('Books', 'curl -s http://localhost:5000/api/books | head -100', 10000);
    await run('Admin check', 'curl -s http://localhost:5000/api/admin/stats -H "Authorization: Bearer test" | head -50', 10000);
    
    // Check MongoDB collections
    await run('MongoDB collections', 'mongosh --quiet --eval "db = db.getSiblingDB(\'soha\'); db.getCollectionNames()" 2>&1', 15000);
    await run('MongoDB count', 'mongosh --quiet --eval "db = db.getSiblingDB(\'soha\'); db.getCollectionNames().forEach(c => print(c + \': \' + db[c].countDocuments()))" 2>&1', 15000);
    
    // Check DB name in .env
    await run('Check .env', 'cat /opt/soha/server/.env', 5000);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
