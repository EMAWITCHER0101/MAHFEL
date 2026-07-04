const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '87.107.165.104',
  port: 9011,
  username: 'root',
  password: 'BRykm7zfs3',
  readyTimeout: 30000,
};

function runCommand(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${label}`);
    console.log(`$ ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('data', (data) => { stdout += data; process.stdout.write(data); });
      stream.stderr.on('data', (data) => { stderr += data; process.stderr.write(data); });
      stream.on('close', (code) => {
        if (code !== 0 && !cmd.includes('apt') && !cmd.includes('npm')) {
          console.log(`⚠️ Exit code: ${code}`);
        }
        resolve({ stdout, stderr, code });
      });
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> Uploading: ${localPath} → ${remotePath}`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on('close', () => { console.log('✅ Upload done'); resolve(); });
      writeStream.on('error', reject);
      readStream.pipe(writeStream);
    });
  });
}

async function main() {
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect(SSH_CONFIG);
  });
  console.log('✅ SSH Connected!\n');

  // Phase 1: System setup
  console.log('\n=========================================');
  console.log('  Phase 1: System Setup');
  console.log('=========================================');

  await runCommand(conn, 'apt update && apt upgrade -y', 'Updating system packages');

  // Install Node.js 20
  const nodeCheck = await runCommand(conn, 'node -v 2>/dev/null || echo "NOT_INSTALLED"', 'Check Node.js');
  if (nodeCheck.stdout.includes('NOT_INSTALLED') || !nodeCheck.stdout.includes('v')) {
    await runCommand(conn, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -', 'Installing Node.js 20.x repo');
    await runCommand(conn, 'apt install -y nodejs', 'Installing Node.js');
  }
  await runCommand(conn, 'node -v && npm -v', 'Node.js version');

  // Install MongoDB 7
  const mongoCheck = await runCommand(conn, 'mongod --version 2>/dev/null || echo "NOT_INSTALLED"', 'Check MongoDB');
  if (mongoCheck.stdout.includes('NOT_INSTALLED')) {
    await runCommand(conn, 'curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg', 'Adding MongoDB GPG key');
    await runCommand(conn, 'echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list', 'Adding MongoDB repo');
    await runCommand(conn, 'apt update', 'Updating apt');
    await runCommand(conn, 'apt install -y mongodb-org', 'Installing MongoDB');
    await runCommand(conn, 'systemctl enable mongod && systemctl start mongod', 'Starting MongoDB');
  }
  await runCommand(conn, 'mongod --version | head -1', 'MongoDB version');

  // Install PM2 + Nginx
  await runCommand(conn, 'npm install -g pm2', 'Installing PM2');
  await runCommand(conn, 'apt install -y nginx', 'Installing Nginx');

  // Phase 2: Upload project
  console.log('\n=========================================');
  console.log('  Phase 2: Upload Project');
  console.log('=========================================');

  await runCommand(conn, 'mkdir -p /opt/soha/logs /opt/soha/server/uploads', 'Creating directories');
  await uploadFile(conn, 'E:\\soha-deploy.zip', '/opt/soha/soha-deploy.zip');
  await uploadFile(conn, 'E:\\soha\\ecosystem.config.cjs', '/opt/soha/ecosystem.config.cjs');

  // Phase 3: Unzip & Install
  console.log('\n=========================================');
  console.log('  Phase 3: Unzip & Install Dependencies');
  console.log('=========================================');

  await runCommand(conn, 'cd /opt/soha && unzip -o soha-deploy.zip', 'Unzipping project');
  await runCommand(conn, 'cd /opt/soha && npm install', 'Installing root dependencies (may take a while)');
  await runCommand(conn, 'cd /opt/soha/server && npm install', 'Installing server dependencies');

  // Phase 4: Environment
  console.log('\n=========================================');
  console.log('  Phase 4: Create Production .env');
  console.log('=========================================');

  await runCommand(conn, `JWT_SECRET=$(openssl rand -hex 32) && cat > /opt/soha/server/.env << 'EOF'
PORT=5000
MONGODB_URI=mongodb://localhost:27017/soha
JWT_SECRET=\${JWT_SECRET}
JWT_EXPIRES_IN=7d
NODE_ENV=production
ADMIN_SECURITY_KEY=admin123
EOF
echo "JWT secret: \${JWT_SECRET}"`, 'Creating production .env');

  // Phase 5: Build
  console.log('\n=========================================');
  console.log('  Phase 5: Build Next.js');
  console.log('=========================================');

  await runCommand(conn, 'cd /opt/soha && npm run build', 'Building Next.js (this takes a while)');

  // Phase 6: Start Services
  console.log('\n=========================================');
  console.log('  Phase 6: Start Services with PM2');
  console.log('=========================================');

  await runCommand(conn, 'pm2 delete all 2>/dev/null; true', 'Cleaning old PM2 processes');
  await runCommand(conn, 'cd /opt/soha && pm2 start server/server.js --name "soha-backend"', 'Starting backend');
  await runCommand(conn, 'cd /opt/soha && pm2 start node_modules/.bin/next --name "soha-frontend" -- start -p 3000', 'Starting frontend');
  await runCommand(conn, 'pm2 save && pm2 startup 2>&1 | head -3', 'Saving PM2 config');

  // Phase 7: Nginx
  console.log('\n=========================================');
  console.log('  Phase 7: Configure Nginx');
  console.log('=========================================');

  const nginxConf = `server {
    listen 80;
    server_name 87.107.165.104;
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

  // Write nginx config
  await new Promise((resolve, reject) => {
    conn.exec(`cat > /etc/nginx/sites-available/soha << 'NGINXEOF'
${nginxConf}
NGINXEOF`, (err, stream) => {
      if (err) return reject(err);
      stream.on('close', resolve);
    });
  });

  await runCommand(conn, 'ln -sf /etc/nginx/sites-available/soha /etc/nginx/sites-enabled/soha', 'Enabling Nginx site');
  await runCommand(conn, 'rm -f /etc/nginx/sites-enabled/default', 'Removing default site');
  await runCommand(conn, 'nginx -t', 'Testing Nginx config');
  await runCommand(conn, 'systemctl restart nginx', 'Restarting Nginx');

  // Phase 8: Verify
  console.log('\n=========================================');
  console.log('  Phase 8: Verification');
  console.log('=========================================');

  await runCommand(conn, 'pm2 status', 'PM2 Status');
  await runCommand(conn, 'sleep 3 && curl -s http://localhost:5000/api/health', 'Backend Health Check');
  await runCommand(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', 'Frontend Status');

  console.log('\n=========================================');
  console.log('  ✅ DEPLOYMENT COMPLETE!');
  console.log('=========================================');
  console.log('  Website:  http://87.107.165.104');
  console.log('  API:      http://87.107.165.104/api/health');
  console.log('  PM2:      pm2 status');
  console.log('  Logs:     pm2 logs');
  console.log('=========================================\n');

  conn.end();
}

main().catch(err => {
  console.error('❌ Fatal Error:', err.message);
  process.exit(1);
});
