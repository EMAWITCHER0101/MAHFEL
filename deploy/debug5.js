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
    // Check nginx config
    console.log('=== NGINX CONFIG ===');
    console.log(await ssh('cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo "NO CONFIG FOUND"'));
    console.log('\n=== API FROM PUBLIC ===');
    console.log(await ssh('curl -s -w "\\n%{http_code}" http://87.107.165.104/api/health 2>&1'));
    console.log('\n=== FRONTEND .env.local ===');
    console.log(await ssh('cat /opt/soha/.env.local 2>/dev/null'));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
