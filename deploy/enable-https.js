const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(label, cmd, timeout) {
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

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = require('path').basename(localPath);
    console.log('>>> Upload ' + name);
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const fs = require('fs');
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  ' + Math.round(total/1024) + ' KB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

const nginxConfig = `server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/nginx/ssl/self-signed.crt;
    ssl_certificate_key /etc/nginx/ssl/self-signed.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`;

(async () => {
  try {
    // 1. Create SSL directory
    await ssh('Create SSL dir', 'mkdir -p /etc/nginx/ssl', 5000);

    // 2. Generate self-signed certificate (valid for 10 years)
    await ssh('Generate SSL cert', 
      'openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout /etc/nginx/ssl/self-signed.key -out /etc/nginx/ssl/self-signed.crt -subj "/C=IR/ST=Tehran/L=Tehran/O=MAHFEL/CN=87.107.165.104" 2>&1', 
      30000);

    // 3. Write nginx config
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\mahfel-https.conf', nginxConfig);
    await uploadFile('C:\\Users\\EMAD\\AppData\\Local\\Temp\\mahfel-https.conf', '/etc/nginx/sites-available/mahfel');

    // 4. Enable site and test
    await ssh('Enable site', 'ln -sf /etc/nginx/sites-available/mahfel /etc/nginx/sites-enabled/mahfel && rm -f /etc/nginx/sites-enabled/default', 5000);
    await ssh('Test nginx', 'nginx -t 2>&1', 10000);

    // 5. Reload nginx
    await ssh('Reload nginx', 'systemctl reload nginx', 10000);

    // 6. Verify HTTPS
    await ssh('Verify HTTPS', 'curl -sk https://localhost 2>&1 | head -5', 15000);
    await ssh('Check ports', 'ss -tlnp | grep -E ":80|:443"', 10000);

    console.log('\n=== HTTPS ENABLED ===');
    console.log('Access: https://87.107.165.104');
    console.log('(Browser will show warning for self-signed cert - click Advanced -> Proceed)');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
