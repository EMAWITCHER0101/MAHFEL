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
    // Kill all node processes and restart fresh
    await ssh('pkill -f "next-server" 2>/dev/null; sleep 1; systemctl restart soha-frontend; sleep 3; systemctl is-active soha-frontend');
    console.log('Frontend restarted');
    
    // Also restart nginx
    await ssh('systemctl restart nginx');
    console.log('Nginx restarted');
    
    // Clear standalone cache
    await ssh('rm -rf /opt/soha/.next/cache 2>/dev/null; echo "Cache cleared"');
    
    // Verify
    console.log(await ssh('systemctl is-active soha-frontend'));
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/'));
    console.log(await ssh('journalctl -u soha-frontend --no-pager -n 5'));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
