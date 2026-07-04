const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    // Copy static files from standalone to main .next for nginx
    console.log('Syncing static...');
    console.log(await ssh('rm -rf /opt/soha/.next/static && cp -r /opt/soha/.next/standalone/.next/static /opt/soha/.next/static'));
    
    console.log('Syncing public...');
    console.log(await ssh('rm -rf /opt/soha/public && cp -r /opt/soha/.next/standalone/public /opt/soha/public'));
    
    // Reload nginx
    console.log('Reloading nginx...');
    console.log(await ssh('nginx -t 2>&1 && systemctl reload nginx'));
    
    // Restart frontend
    console.log('Restarting frontend...');
    console.log(await ssh('systemctl restart soha-frontend'));
    await new Promise(r => setTimeout(r, 3000));
    console.log(await ssh('systemctl is-active soha-frontend'));
    
    // Verify CSS exists
    console.log('Verifying...');
    console.log(await ssh('ls /opt/soha/.next/static/chunks/*.css | head -3'));
    
    // Test
    console.log('Testing...');
    console.log(await ssh('curl -sI http://localhost:80/ 2>&1 | head -3'));
    
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
