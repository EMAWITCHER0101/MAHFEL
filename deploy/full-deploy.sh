#!/bin/bash
set -e

echo "========================================="
echo "  MAHFEL Full Deployment Script"
echo "  Server: 87.107.165.104"
echo "  Run as root on Ubuntu 24.04"
echo "========================================="

# --- Phase 1: System Setup ---
echo ""
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo ""
echo "[2/8] Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node: $(node -v) | NPM: $(npm -v)"

echo ""
echo "[3/8] Installing MongoDB 7.x..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl enable mongod
    sudo systemctl start mongod
fi
echo "MongoDB: $(mongod --version | head -1)"

echo ""
echo "[4/8] Installing PM2 + Nginx..."
sudo npm install -g pm2
sudo apt install -y nginx -y

# --- Phase 2: Project Setup ---
echo ""
echo "[5/8] Setting up project..."
cd /opt/soha
mkdir -p logs server/uploads

echo "Installing root dependencies..."
npm install

echo "Installing server dependencies..."
cd server && npm install && cd ..

echo ""
echo "[6/8] Generating production .env..."
JWT_SECRET=$(openssl rand -hex 32)
cat > server/.env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/soha
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
NODE_ENV=production
ADMIN_SECURITY_KEY=admin123
EOF
echo "  JWT_SECRET generated and saved"

# --- Phase 3: Build ---
echo ""
echo "[7/8] Building Next.js (this may take a while)..."
npm run build

# --- Phase 4: Start Services ---
echo ""
echo "[8/8] Starting services..."

# Start backend
pm2 start server/server.js --name "soha-backend" --cwd /opt/soha

# Start frontend
pm2 start node_modules/.bin/next --name "soha-frontend" -- start -p 3000 --cwd /opt/soha

pm2 save
pm2 startup

# --- Phase 5: Nginx ---
echo ""
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/soha > /dev/null << 'NGINX'
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

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/soha /etc/nginx/sites-enabled/soha
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "========================================="
echo ""
echo "  Website:  http://87.107.165.104"
echo "  API:      http://87.107.165.104/api/health"
echo ""
echo "  PM2 Status:  pm2 status"
echo "  PM2 Logs:    pm2 logs"
echo "  PM2 Restart: pm2 restart all"
echo ""
echo "  MongoDB:  mongodb://localhost:27017/soha"
echo "========================================="
