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
    await run('Check server deps', 'ls /opt/soha/server/node_modules/mongoose/package.json 2>&1 && echo HAS_MONGOOSE || echo NO_MONGOOSE', 10000);
    await run('Run seed', 'cd /opt/soha/server && node seed.js 2>&1', 60000);
    await run('Check posts', 'curl -s http://localhost:5000/api/posts 2>&1 | head -1', 10000);
    await run('Check podcasts', 'curl -s http://localhost:5000/api/podcasts 2>&1 | head -1', 10000);
    await run('Check videos', 'curl -s http://localhost:5000/api/videos 2>&1 | head -1', 10000);
    await run('Check books', 'curl -s http://localhost:5000/api/books 2>&1 | head -1', 10000);
    console.log('\n=== SEED DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
