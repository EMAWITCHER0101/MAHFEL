const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(label, cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
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
    await ssh('Services status', 'systemctl status soha-backend --no-pager -l 2>&1 | head -20');
    await ssh('Frontend status', 'systemctl status soha-frontend --no-pager -l 2>&1 | head -20');
    await ssh('Backend logs', 'journalctl -u soha-backend --no-pager -n 30 2>&1');
    await ssh('Frontend logs', 'journalctl -u soha-frontend --no-pager -n 20 2>&1');
    await ssh('Test curl', 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
