#!/bin/bash
set -e

echo "=== PHASE 1: Fix apt locks ==="
fuser -k /var/lib/dpkg/lock-frontend 2>/dev/null || true
fuser -k /var/lib/dpkg/lock 2>/dev/null || true
fuser -k /var/cache/apt/archives/lock 2>/dev/null || true
dpkg --configure -a 2>/dev/null || true
apt-get install -f -y 2>/dev/null || true

echo "=== PHASE 2: Install packages ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# Node.js
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v) NPM: $(npm -v)"

# MongoDB
if ! command -v mongod &> /dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -qq
  apt-get install -y mongodb-org
fi
echo "MongoDB: $(mongod --version | head -1)"

# PM2
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi
echo "PM2: $(pm2 -v)"

# Nginx
if ! command -v nginx &> /dev/null; then
  apt-get install -y nginx
fi
echo "Nginx: $(nginx -v 2>&1)"

echo "=== PHASE 3: Start MongoDB ==="
systemctl enable mongod
systemctl start mongod
sleep 2
mongod --version | head -1

echo "=== PHASE 4: Create dirs ==="
mkdir -p /opt/soha/logs /opt/soha/server/uploads /opt/soha/public

echo "=== PHASE 5: Extract project ==="
cd /opt/soha
unzip -o soha-deploy.zip
ls -la

echo "=== PHASE 6: Install deps ==="
npm install 2>&1 | tail -3
cd /opt/soha/server
npm install 2>&1 | tail -3
cd /opt/soha

echo "=== PHASE 7: Create .env ==="
JWT=$(openssl rand -hex 32)
cat > /opt/soha/server/.env << ENVEOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/soha
JWT_SECRET=$JWT
JWT_EXPIRES_IN=7d
NODE_ENV=production
ADMIN_SECURITY_KEY=admin123
ENVEOF
echo "JWT: $JWT"

echo "=== PHASE 8: Build Next.js ==="
npm run build 2>&1 | tail -15

echo "=== PHASE 9: Configure Nginx ==="
cat > /etc/nginx/sites-available/soha << 'NGXEOF'
server {
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
}
NGXEOF

ln -sf /etc/nginx/sites-available/soha /etc/nginx/sites-enabled/soha
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "=== PHASE 10: Start PM2 ==="
pm2 delete all 2>/dev/null || true
cd /opt/soha
pm2 start server/server.js --name soha-backend
pm2 start node_modules/.bin/next --name soha-frontend -- start -p 3000
pm2 save

echo "=== PHASE 11: Verify ==="
sleep 5
pm2 list
echo "--- Backend health ---"
curl -s http://localhost:5000/api/health || echo "BACKEND DOWN"
echo ""
echo "--- Frontend status ---"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000 || echo "FRONTEND DOWN"
echo ""
echo ""
echo "=== DONE! ==="
echo "http://87.107.165.104"
