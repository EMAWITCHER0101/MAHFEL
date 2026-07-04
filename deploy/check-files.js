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
    console.log(await ssh('ls /opt/soha/.next/standalone/.next/static/ 2>/dev/null || echo "NO STATIC DIR"'));
    console.log(await ssh('ls /opt/soha/.next/standalone/public/ 2>/dev/null | head -10 || echo "NO PUBLIC DIR"'));
    console.log(await ssh('ls /opt/soha/public/ 2>/dev/null | head -10 || echo "NO MAIN PUBLIC"'));
    console.log(await ssh('ls /opt/soha/public/font-awesome/ 2>/dev/null || echo "NO FONTAWESOME"'));
    console.log(await ssh('ls /opt/soha/.next/standalone/ 2>/dev/null | head -20'));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
