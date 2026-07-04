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
    console.log(await ssh(`
      mkdir -p /opt/soha/.next/standalone/public
      cp -r /opt/soha/public/* /opt/soha/.next/standalone/public/
      ls /opt/soha/.next/standalone/public/font-awesome/
      echo "---STATIC---"
      ls /opt/soha/.next/standalone/.next/static/chunks/ | head -10
    `, 20000));
    
    console.log(await ssh('systemctl restart soha-frontend && sleep 2 && systemctl is-active soha-frontend', 20000));
    
    // Verify
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/font-awesome/all.min.css'));
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/_next/static/chunks/1j-t7w37g6lg4.js'));
    
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
