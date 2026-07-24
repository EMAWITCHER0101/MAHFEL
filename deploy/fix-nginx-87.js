const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

function uploadFile(lp, rp) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + path.basename(lp));
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(lp);
        const w = sftp.createWriteStream(rp);
        w.on('close', () => { c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

const nginxConf = `server {
    listen 80 default_server;
    server_name 87.248.145.44 _;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }
}`;

(async () => {
  try {
    console.log('=== FIX NGINX ===\n');

    const tmpFile = path.join(__dirname, '_tmp_nginx.conf');
    fs.writeFileSync(tmpFile, nginxConf);

    console.log('1. Upload nginx config...');
    await uploadFile(tmpFile, '/tmp/soha-nginx.conf');

    console.log('2. Apply config...');
    console.log(await ssh('cp /tmp/soha-nginx.conf /etc/nginx/sites-available/soha'));
    
    console.log('3. Remove default...');
    await ssh('rm -f /etc/nginx/sites-enabled/default').catch(() => {});

    console.log('4. Test nginx...');
    console.log(await ssh('nginx -t'));

    console.log('5. Restart nginx...');
    console.log(await ssh('systemctl restart nginx'));

    console.log('6. Test API...');
    console.log(await ssh('curl -s http://localhost/api/health'));

    fs.unlinkSync(tmpFile);
    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
