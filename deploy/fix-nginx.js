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

const nginxConfig = `server {
    listen 80;
    server_name _;
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
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`;

(async () => {
  try {
    // Remove the conflicting soha config
    await ssh('rm -f /etc/nginx/sites-enabled/soha');
    
    // Write new clean config
    await ssh(`cat > /etc/nginx/sites-enabled/mahfel << 'NGINX_EOF'\n${nginxConfig}\nNGINX_EOF`);
    
    // Test and reload
    console.log(await ssh('nginx -t 2>&1'));
    console.log(await ssh('systemctl reload nginx'));
    
    // Verify
    console.log(await ssh('curl -sI http://localhost:80/_next/static/chunks/1j-t7w37g6lg4.js 2>&1 | head -5'));
    
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
