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
    // Check JS chunk from HTML
    const jsHash = await ssh('curl -s http://localhost:3000/ | grep -oE "chunks/[a-z0-9_-]+\\.js" | head -3');
    console.log('JS in HTML:', jsHash);
    
    // Check if those JS files exist
    const hashes = jsHash.trim().split('\n');
    for (const h of hashes) {
      const name = h.replace('chunks/', '');
      const r = await ssh('ls -la /opt/soha/.next/static/chunks/' + name + ' 2>&1');
      console.log(name + ':', r.trim());
    }

    // Check public JS
    console.log('public js files:', await ssh('ls /opt/soha/public/*.js 2>/dev/null | head -3'));
    
    // Check the actual page HTML for profile keywords
    console.log('Profile in HTML:', await ssh('curl -s http://localhost:3000/ | grep -c "پروفایل"'));
    
    // The SPA is client-side rendered - check if the main bundle is correct
    console.log('Main JS:', await ssh('curl -s http://localhost:3000/ | grep -oE "chunks/[a-z0-9_-]+\\.js" | wc -l'));
    
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
