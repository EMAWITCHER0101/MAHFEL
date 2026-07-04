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
    // Check CSS hash in HTML
    console.log('CSS hash in HTML:', await ssh('curl -s http://localhost:3000/ | grep -oE "chunks/[a-z0-9_-]+\\.css" | head -1'));
    // Check what CSS files exist
    console.log('CSS files on disk:', await ssh('ls /opt/soha/.next/static/chunks/*.css'));
    console.log('CSS files in standalone:', await ssh('ls /opt/soha/.next/standalone/.next/static/chunks/*.css'));
    // Check public
    console.log('logo.jpg:', await ssh('ls -la /opt/soha/public/logo.jpg 2>&1'));
    console.log('font-awesome:', await ssh('ls /opt/soha/public/font-awesome/ 2>&1'));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
