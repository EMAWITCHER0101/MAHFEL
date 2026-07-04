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
    console.log('Backend health:', await ssh('curl -s http://localhost:5000/api/health 2>&1'));
    console.log('Frontend code:', await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1'));
    console.log('Public health:', await ssh('curl -s -o /dev/null -w "%{http_code}" http://87.107.165.104:3000/ 2>&1'));
    console.log('Nginx check:', await ssh('cat /etc/nginx/sites-enabled/default 2>/dev/null | head -40'));
    console.log('Nginx status:', await ssh('systemctl is-active nginx'));
    console.log('Ports:', await ssh('ss -tlnp | grep -E "3000|5000|80|443"'));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
