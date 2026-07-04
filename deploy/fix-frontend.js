const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function run(label, cmd, timeout) {
  timeout = timeout || 120000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    await run('Copy static', 'cp -r /opt/soha/.next/static /opt/soha/.next/standalone/.next/', 30000);
    await run('Copy public', 'cp -r /opt/soha/public /opt/soha/.next/standalone/', 30000);
    await run('Copy uploads', 'cp -r /opt/soha/uploads /opt/soha/.next/standalone/ 2>/dev/null; echo DONE', 10000);
    await run('Restart frontend', 'systemctl restart soha-frontend', 15000);
    await run('Frontend status', 'sleep 3 && systemctl status soha-frontend | head -10', 15000);
    await run('Test frontend', 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', 15000);
    await run('Test backend', 'curl -s http://localhost:5000/api/health', 15000);
    await run('Test nginx', 'curl -s -o /dev/null -w "%{http_code}" http://localhost:80', 15000);
    console.log('\nDONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
