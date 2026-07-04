const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

function run(label, cmd, timeout) {
  timeout = timeout || 300000;
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
    console.log('>>> Upload ' + require('path').basename(localPath));
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  ' + Math.round(total/1024/1024) + ' MB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // Clean old
    await run('Clean', 'rm -rf /opt/soha/.next /opt/soha/public /opt/soha/server', 30000);

    // Upload tar
    await uploadFile('C:\\Users\\EMAD\\AppData\\Local\\Temp\\standalone-deploy.tar', '/tmp/deploy.tar');

    // Extract
    await run('Extract', 'cd /opt/soha && tar -xf /tmp/deploy.tar && echo EXTRACTED', 120000);

    // Create .env
    await run('Create .env', "JWT=$(openssl rand -hex 32) && cat > /opt/soha/server/.env << ENVEOF\nPORT=5000\nMONGODB_URI=mongodb://localhost:27017/soha\nJWT_SECRET=$JWT\nJWT_EXPIRES_IN=7d\nNODE_ENV=production\nADMIN_SECURITY_KEY=admin123\nENVEOF\necho .env_created", 15000);

    // Install PM2 (only thing that needs npm)
    await run('Install PM2', "NODE_OPTIONS='--dns-result-order=ipv4first' npm install -g pm2 --registry https://registry.npmmirror.com 2>&1 | tail -5", 300000);
    
    // If PM2 install fails, try alternative
    await run('Check PM2', 'which pm2 2>/dev/null && pm2 -v || echo NO_PM2', 10000);

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

    // Start with PM2 (or use node directly)
    await run('Start backend', 'cd /opt/soha && node server/server.js &', 15000);
    await run('Start frontend', 'cd /opt/soha && node .next/standalone/server.js &', 15000);

    // Verify
    await run('Verify', 'sleep 3 && curl -s http://localhost:5000/api/health && echo "" && curl -s -o /dev/null -w "Frontend: HTTP %{http_code}" http://localhost:3000', 30000);

    console.log('\n=========================================');
    console.log('  DEPLOYMENT COMPLETE!');
    console.log('  http://87.107.165.104');
    console.log('=========================================');

  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
