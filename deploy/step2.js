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
    console.log(await ssh('cd /opt/soha && tar -xzf /tmp/soha-fe.tar.gz -C .next/ && cp -r .next/static .next/standalone/.next/static && mkdir -p .next/standalone/public && cp -r public/* .next/standalone/public/ && echo DEPLOYED'));
    console.log(await ssh('cat /opt/soha/.next/standalone/.next/BUILD_ID'));
    console.log(await ssh('ls /opt/soha/.next/standalone/.next/static/chunks/*.css 2>/dev/null'));
    console.log(await ssh('systemctl start soha-frontend && sleep 3 && systemctl is-active soha-frontend', 20000));
    console.log(await ssh('curl -s http://localhost:3000/ 2>&1 | grep -oE "chunks/[a-z0-9_-]+\\.css" | head -3'));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
