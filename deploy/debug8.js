const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd, timeout) {
  timeout = timeout || 20000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== MAIN PAGE HTML ===');
    console.log(await ssh('curl -s http://localhost:3000/ | head -30'));
    console.log('\n=== FRONTEND ERRORS ===');
    console.log(await ssh('journalctl -u soha-frontend --no-pager -n 10'));
    console.log('\n=== API TEST FROM BROWSER PERSPECTIVE ===');
    console.log(await ssh('curl -s -w "\\n%{http_code}" http://localhost:80/api/health'));
    console.log(await ssh('curl -s -w "\\n%{http_code}" http://localhost:80/'));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
