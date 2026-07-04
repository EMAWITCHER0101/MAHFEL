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
    // Check frontend .next/standalone .env
    console.log('=== STANDALONE .env ===');
    console.log(await ssh('cat /opt/soha/.next/standalone/.env 2>/dev/null || echo "NONE"'));
    console.log(await ssh('cat /opt/soha/.env 2>/dev/null || echo "NONE"'));
    
    // Check how frontend connects to backend
    console.log('\n=== NGINX FILES ===');
    console.log(await ssh('ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>&1'));
    console.log(await ssh('cat /etc/nginx/nginx.conf 2>/dev/null | grep -A 20 "server {"'));
    
    // Check the frontend API_BASE from the built JS
    console.log('\n=== FRONTEND API URL ===');
    console.log(await ssh('grep -r "API_BASE\\|api_base\\|5000\\|localhost" /opt/soha/.next/standalone/.next/static/ 2>/dev/null | head -5 || echo "NONE"'));
    
    // Try public API through nginx
    console.log('\n=== PUBLIC API VIA PORT 80 ===');
    console.log(await ssh('curl -s -w "\\nHTTP %{http_code}" http://87.107.165.104/api/health 2>&1'));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
