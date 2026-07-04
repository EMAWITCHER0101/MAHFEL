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
    // Kill any existing processes on ports 3000 and 5000
    await run('Kill old', 'kill $(lsof -ti:3000) 2>/dev/null; kill $(lsof -ti:5000) 2>/dev/null; echo DONE', 10000);

    // Check standalone structure
    await run('Check structure', 'ls -la /opt/soha/.next/standalone/ | head -10', 10000);
    await run('Check server.js', 'ls /opt/soha/.next/standalone/server.js 2>&1 || ls /opt/soha/.next/standalone/*.js 2>&1', 10000);
    await run('Check node_modules', 'ls /opt/soha/.next/standalone/node_modules | head -5', 10000);

    // Create systemd services
    await run('Backend service', `cat > /etc/systemd/system/soha-backend.service << 'EOF'
[Unit]
Description=SOHA Backend
After=network.target mongod.service

[Service]
Type=simple
WorkingDirectory=/opt/soha
ExecStart=/usr/local/bin/node server/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
`, 10000);

    await run('Frontend service', `cat > /etc/systemd/system/soha-frontend.service << 'EOF'
[Unit]
Description=SOHA Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/soha
ExecStart=/usr/local/bin/node .next/standalone/server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF
`, 10000);

    // Copy static files to standalone
    await run('Copy static', 'cp -r /opt/soha/.next/static /opt/soha/.next/standalone/.next/ 2>/dev/null; cp -r /opt/soha/public /opt/soha/.next/standalone/ 2>/dev/null; echo DONE', 30000);

    // Start services
    await run('Enable backend', 'systemctl daemon-reload && systemctl enable soha-backend && systemctl start soha-backend', 15000);
    await run('Enable frontend', 'systemctl enable soha-frontend && systemctl start soha-frontend', 15000);

    // Check status
    await run('Backend status', 'sleep 2 && systemctl status soha-backend | head -10', 15000);
    await run('Frontend status', 'systemctl status soha-frontend | head -10', 15000);

    // Nginx config
    await run('Nginx config', `cat > /etc/nginx/sites-available/soha << 'XEOF'
server {
    listen 80;
    server_name 87.107.165.104;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
    }
}
XEOF
ln -sf /etc/nginx/sites-available/soha /etc/nginx/sites-enabled/soha
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1`, 15000);

    await run('Restart Nginx', 'systemctl restart nginx', 15000);

    // Verify
    await run('Verify backend', 'sleep 3 && curl -s http://localhost:5000/api/health', 15000);
    await run('Verify frontend', 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', 15000);

    console.log('\n=========================================');
    console.log('  DEPLOYMENT COMPLETE!');
    console.log('  http://87.107.165.104');
    console.log('=========================================');

  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
