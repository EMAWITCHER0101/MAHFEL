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
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
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
    // Check what's done
    let r = await run('State check', 'node -v 2>&1 && ls /opt/soha/node_modules/.package-lock.json 2>&1 && ls /opt/soha/server/node_modules/.package-lock.json 2>&1 && which pm2 2>/dev/null && which mongod 2>/dev/null || echo CHECK_DONE', 30000);
    
    let hasRootDeps = r.includes('.package-lock.json');
    let hasServerDeps = r.includes('server/node_modules');
    let hasPM2 = r.includes('/pm2');
    let hasMongo = r.includes('/mongod');
    
    console.log('\nRoot deps:', hasRootDeps, 'Server deps:', hasServerDeps, 'PM2:', hasPM2, 'MongoDB:', hasMongo);
    
    // Kill any stuck npm
    await run('Kill stuck npm', 'killall npm 2>/dev/null; killall node 2>/dev/null; echo done', 10000);
    
    // Install root deps if needed
    if (!hasRootDeps) {
      await run('npm install root', 'cd /opt/soha && npm install --prefer-offline 2>&1 | tail -10', 600000);
    }
    
    // Server deps if needed
    if (!hasServerDeps) {
      await run('npm install server', 'cd /opt/soha/server && npm install 2>&1 | tail -5', 300000);
    }
    
    // PM2
    if (!hasPM2) {
      await run('Install PM2', 'cd /opt/soha && NODE_OPTIONS=--dns-result-order=ipv4first npm install -g pm2 2>&1 | tail -5', 300000);
    }
    
    // MongoDB - upload debs
    if (!hasMongo) {
      // Try apt first
      await run('MongoDB GPG', 'curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc 2>/dev/null | apt-key add - 2>&1 || echo GPG_FAIL', 60000);
      await run('MongoDB repo', 'echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list', 10000);
      await run('apt update', 'DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>&1 | tail -3', 120000);
      
      let mongoResult = await run('Install MongoDB', 'DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org 2>&1 | tail -10', 300000);
      
      if (!mongoResult.includes('mongod') && !mongoResult.includes('Setting up')) {
        console.log('\nMongoDB apt failed, uploading mongod binary...');
        await uploadFile('C:\\Users\\EMAD\\AppData\\Local\\Temp\\mongod-linux', '/usr/local/bin/mongod');
      }
      
      await run('Start MongoDB', 'chmod +x /usr/local/bin/mongod 2>/dev/null; mkdir -p /data/db; mongod --version | head -1', 15000);
    }
    
    // Create .env
    await run('Create .env', 'JWT=$(openssl rand -hex 32) && cat > /opt/soha/server/.env << ENVEOF\nPORT=5000\nMONGODB_URI=mongodb://localhost:27017/soha\nJWT_SECRET=$JWT\nJWT_EXPIRES_IN=7d\nNODE_ENV=production\nADMIN_SECURITY_KEY=admin123\nENVEOF\necho .env_created', 15000);
    
    // Build Next.js
    await run('Build Next.js', 'cd /opt/soha && NODE_OPTIONS=--dns-result-order=ipv4first npm run build 2>&1 | tail -15', 600000);
    
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
    
    // Start PM2
    await run('Start backend', 'cd /opt/soha && pm2 delete all 2>/dev/null; pm2 start server/server.js --name soha-backend', 30000);
    await run('Start frontend', 'cd /opt/soha && pm2 start node_modules/.bin/next --name soha-frontend -- start -p 3000', 30000);
    await run('PM2 save', 'pm2 save', 15000);
    
    // Verify
    await run('Verify', 'sleep 5 && pm2 list && echo === && curl -s http://localhost:5000/api/health && echo "" && curl -s -o /dev/null -w "Frontend: HTTP %{http_code}" http://localhost:3000', 30000);
    
    console.log('\n=========================================');
    console.log('  DEPLOYMENT COMPLETE!');
    console.log('  http://87.107.165.104');
    console.log('=========================================');
    
  } catch (e) {
    console.error('\nFAILED:', e.message);
    console.log('Fix the issue and re-run this script.');
  }
})();
