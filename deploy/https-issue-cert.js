const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  timeout = timeout || 120000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    console.log('=== HTTPS SETUP ===');

    console.log('\n--- 1. DNS check ---');
    console.log(await ssh('nslookup app.soha-sima.ir 2>&1 | tail -5'));

    console.log('\n--- 2. Backup current nginx config ---');
    console.log(await ssh('cp /etc/nginx/sites-enabled/mahfel /root/mahfel.bak.$(date +%s) && echo backed-up'));

    console.log('\n--- 3. Add ACME location to nginx (port 80) ---');
    const acmeLoc = "\n    # Let's Encrypt ACME challenge\n    location /.well-known/acme-challenge/ {\n        root /opt/soha/acme-webroot;\n    }\n";
    const cfgFile = '/etc/nginx/sites-enabled/mahfel';
    // Insert acme location right before `    location /api/ {`
    console.log(await ssh(`python3 -c "
import re
p='${cfgFile}'
s=open(p).read()
if 'acme-challenge' not in s:
    s=s.replace('    location /api/ {', '''    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /opt/soha/acme-webroot;
    }

    location /api/ {''', 1)
    open(p,'w').write(s)
    print('patched')
else:
    print('already present')
"`));

    console.log('\n--- 4. nginx test + reload ---');
    console.log(await ssh('nginx -t 2>&1; systemctl reload nginx && echo RELOADED'));

    console.log('\n--- 5. Issue certificate ---');
    console.log(await ssh("mkdir -p /opt/soha/acme-webroot && certbot certonly --webroot -w /opt/soha/acme-webroot -d app.soha-sima.ir --non-interactive --agree-tos --email admin@soha-sima.ir 2>&1 | tail -18"));

    console.log('\n--- 6. Verify cert ---');
    console.log(await ssh('ls /etc/letsencrypt/live/app.soha-sima.ir/ 2>&1'));

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();