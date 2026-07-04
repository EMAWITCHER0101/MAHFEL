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
    // Check current state
    await run('Node version', 'node -v', 10000);
    await run('Check npm processes', 'ps aux 2>/dev/null | grep -c npm', 10000);
    await run('Check /opt/soha', 'ls /opt/soha/package.json /opt/soha/node_modules/.package-lock.json 2>&1', 10000);
    await run('Check server/node_modules', 'ls /opt/soha/server/node_modules 2>&1 | head -5', 10000);
    await run('Check PM2', 'which pm2 2>/dev/null || echo NO_PM2', 10000);
    await run('Check MongoDB', 'which mongod 2>/dev/null || echo NO_MONGOD', 10000);

    console.log('\n=== STATE CHECK DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
