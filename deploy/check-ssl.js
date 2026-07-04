const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(label, cmd, timeout) {
  timeout = timeout || 60000;
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
    await ssh('nginx version', 'nginx -v 2>&1', 10000);
    await ssh('nginx config test', 'nginx -t 2>&1', 10000);
    await ssh('check nginx status', 'systemctl status nginx 2>&1 | head -5', 10000);
    await ssh('check certbot', 'which certbot 2>&1; certbot --version 2>&1', 10000);
    await ssh('check openssl', 'openssl version 2>&1', 10000);
    await ssh('check ports', 'ss -tlnp | grep -E ":80|:443"', 10000);
    await ssh('check domain', 'cat /etc/hostname 2>&1', 10000);
    await ssh('check internet', 'curl -sI https://letsencrypt.org 2>&1 | head -3', 15000);
    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
