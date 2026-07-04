const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const SSH_CONFIG = {
  host: '87.107.165.104',
  port: 9011,
  username: 'root',
  password: 'BRykm7zfs3',
  readyTimeout: 30000,
};

function run(conn, cmd, label, timeout = 120000) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${label}`);
    const timer = setTimeout(() => { reject(new Error('Timeout: ' + label)); }, timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); return reject(err); }
      let out = '';
      stream.on('data', (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on('data', (d) => { process.stderr.write(d); });
      stream.on('close', (code) => { clearTimeout(timer); resolve({ out, code }); });
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((r, j) => conn.on('ready', r).on('error', j).connect(SSH_CONFIG));
  console.log('✅ SSH Connected!\n');

  // Handle pending sshd_config prompt
  await run(conn, 'DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade', 'System upgrade (force keep configs)', 300000);

  // Install Node.js
  const nodeCheck = await run(conn, 'node -v 2>/dev/null || echo NONE');
  if (nodeCheck.out.includes('NONE')) {
    await run(conn, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -', 'Installing Node.js repo', 60000);
    await run(conn, 'DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs', 'Installing Node.js', 120000);
  }
  await run(conn, 'node -v && npm -v', 'Node version');

  // Install MongoDB
  const mongoCheck = await run(conn, 'mongod --version 2>/dev/null || echo NONE');
  if (mongoCheck.out.includes('NONE')) {
    await run(conn, 'curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg', 'Adding MongoDB GPG key');
    await run(conn, 'echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list');
    await run(conn, 'apt-get update', 'apt update', 120000);
    await run(conn, 'DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org', 'Installing MongoDB', 180000);
    await run(conn, 'systemctl enable mongod && systemctl start mongod', 'Starting MongoDB');
  }
  await run(conn, 'mongod --version | head -1', 'MongoDB version');

  // Install PM2 + Nginx
  await run(conn, 'npm install -g pm2', 'Installing PM2', 60000);
  await run(conn, 'DEBIAN_FRONTEND=noninteractive apt-get install -y nginx', 'Installing Nginx', 120000);

  // Create dirs
  await run(conn, 'mkdir -p /opt/soha/logs /opt/soha/server/uploads /opt/soha/public');

  // Upload zip
  console.log('\n>>> Uploading soha-deploy.zip...');
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const r = require('fs').createReadStream('E:\\soha-deploy.zip');
      const w = sftp.createWriteStream('/opt/soha/soha-deploy.zip');
      w.on('close', () => { console.log('✅ ZIP uploaded'); resolve(); });
      w.on('error', reject);
      r.pipe(w);
    });
  });

  // Upload ecosystem config
  console.log('>>> Uploading ecosystem.config.cjs...');
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const r = require('fs').createReadStream('E:\\soha\\ecosystem.config.cjs');
      const w = sftp.createWriteStream('/opt/soha/ecosystem.config.cjs');
      w.on('close', () => { console.log('✅ Config uploaded'); resolve(); });
      w.on('error', reject);
      r.pipe(w);
    });
  });

  // Unzip
  await run(conn, 'cd /opt/soha && unzip -o soha-deploy.zip', 'Unzipping project', 60000);

  // Install deps
  await run(conn, 'cd /opt/soha && npm install --prefer-offline 2>&1 | tail -5', 'Installing root deps', 300000);
  await run(conn, 'cd /opt/soha/server && npm install 2>&1 | tail -5', 'Installing server deps', 120000);

  // Create .env
  await run(conn, `JWT=$(openssl rand -hex 32) && cat > /opt/soha/server/.env << ENVEOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/soha
JWT_SECRET=$JWT
JWT_EXPIRES_IN=7d
NODE_ENV=production
ADMIN_SECURITY_KEY=admin123
ENVEOF
echo "JWT=$JWT"`, 'Creating .env');

  // Build Next.js
  await run(conn, 'cd /opt/soha && npm run build 2>&1 | tail -10', 'Building Next.js', 600000);

  // Start PM2
  await run(conn, 'pm2 delete all 2>/dev/null; true', 'Cleaning PM2');
  await run(conn, 'cd /opt/soha && pm2 start server/server.js --name soha-backend', 'Starting backend');
  await run(conn, 'cd /opt/soha && pm2 start node_modules/.bin/next --name soha-frontend -- start -p 3000', 'Starting frontend');
  await run(conn, 'pm2 save', 'Saving PM2');

  // Nginx
  await run(conn, `cat > /etc/nginx/sites-available/soha << 'NXEOF'
server {
    listen 80;
    server_name 87.107.165.104;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        client_max_body_size 50M;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \\$host;
    }
}
NXEOF`, 'Writing Nginx config');

  await run(conn, 'ln -sf /etc/nginx/sites-available/soha /etc/nginx/sites-enabled/soha');
  await run(conn, 'rm -f /etc/nginx/sites-enabled/default');
  await run(conn, 'nginx -t', 'Testing Nginx');
  await run(conn, 'systemctl restart nginx', 'Restarting Nginx');

  // Verify
  await run(conn, 'sleep 3 && pm2 status', 'PM2 Status');
  await run(conn, 'curl -s http://localhost:5000/api/health', 'Backend health');
  await run(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', 'Frontend status');

  console.log('\n=========================================');
  console.log('  ✅ DEPLOYMENT COMPLETE!');
  console.log('  http://87.107.165.104');
  console.log('=========================================\n');

  conn.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
