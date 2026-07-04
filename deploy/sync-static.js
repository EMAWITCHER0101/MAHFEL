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
    console.log(await ssh('rm -rf /opt/soha/.next/static && cp -r /opt/soha/.next/standalone/.next/static /opt/soha/.next/static && cp -r /opt/soha/.next/standalone/public/* /opt/soha/public/'));
    console.log(await ssh('systemctl reload nginx'));
    console.log(await ssh('curl -sI http://localhost:80/_next/static/chunks/41bu9dtuf3k3b.css 2>&1 | head -3'));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
