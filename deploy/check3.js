const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function run(cmd, timeout) {
  timeout = timeout || 20000;
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
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000, keepaliveInterval: 5000});
  });
}

(async () => {
  try {
    // Check if the change is in the deployed JS
    const r = await run('grep -c "lg:block" /opt/soha/.next/standalone/server/chunks/app/page*.js 2>/dev/null || echo "0"');
    console.log('lg:block in build:', r.trim());

    // Check CSS has lg:block
    const r2 = await run('grep -c "lg\\\\:block" /opt/soha/.next/standalone/.next/static/chunks/*.css 2>/dev/null | head -5');
    console.log('lg:block in CSS:', r2.trim());

    // Check if BottomTabs exists in the page bundle
    const r3 = await run('ls /opt/soha/.next/standalone/server/chunks/app/page*.js 2>/dev/null');
    console.log('Page chunks:', r3.trim());

  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
