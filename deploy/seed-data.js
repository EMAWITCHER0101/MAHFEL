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
    .on('error', e => { clearTimeout(timer); reject(e); })
  });
}

(async () => {
  try {
    await run('Install mongoose', "cd /opt/soha/server && NODE_OPTIONS='--dns-result-order=ipv4first' npm install mongoose dotenv 2>&1 | tail -3", 120000);
    await run('Run seed', 'cd /opt/soha && node seed.cjs 2>&1', 60000);
    
    // Verify data
    await run('Posts count', 'curl -s http://localhost:5000/api/posts | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || curl -s http://localhost:5000/api/posts | wc -c', 15000);
    
    console.log('\n=== SEED DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
