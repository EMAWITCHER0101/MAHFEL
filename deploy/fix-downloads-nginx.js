// افزودن location /downloads به nginx و ری‌لود — اجرای دستی:
//   node deploy/fix-downloads-nginx.js
const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(label, cmd, timeout) {
  timeout = timeout || 30000;
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
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== FIX NGINX /downloads ===');
    const block = "location /downloads/ {\n        alias /opt/soha/public/downloads/;\n        default_type application/octet-stream;\n    }";
    const esc = block.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    await ssh('Check already exists', "grep -c 'location /downloads' /etc/nginx/sites-enabled/mahfel || true", 15000);
    await ssh('Insert location block',
      "sed -i 's|location /ws {|" + esc + "\\n\\n    location /ws {|' /etc/nginx/sites-enabled/mahfel", 15000);
    await ssh('Test nginx', 'nginx -t', 15000);
    await ssh('Reload nginx', 'systemctl reload nginx && echo RELOADED', 15000);
    await ssh('Verify HTTP', "curl -s -o /dev/null -w '%{http_code} %{size_download}' http://localhost/downloads/Mahfel-Setup.exe", 20000);
    console.log('\n=== COMPLETE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
