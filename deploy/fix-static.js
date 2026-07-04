const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
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
    // Extract tar again, then copy static and public into standalone
    console.log(await ssh(`
      cd /opt/soha
      rm -rf .next/standalone
      tar -xzf /tmp/soha-fe.tar.gz -C .next/
      mkdir -p .next/standalone/.next/static
      cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null || true
      cp -r public/* .next/standalone/public/ 2>/dev/null || true
      ls .next/standalone/.next/static/ | head -5
      echo "---"
      ls .next/standalone/public/ | head -5
      echo "---"
      ls .next/standalone/public/font-awesome/ 2>/dev/null | head -5
    `, 30000));
    
    // Restart
    console.log(await ssh('systemctl restart soha-frontend && sleep 2 && systemctl is-active soha-frontend', 20000));
    
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
