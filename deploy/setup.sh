#!/bin/bash
set -e

echo "========================================="
echo "  MAHFEL Server Deployment Script"
echo "  Server: 87.107.165.104"
echo "========================================="

echo ""
echo "[1/7] Updating system..."
sudo apt update && sudo apt upgrade -y

echo ""
echo "[2/7] Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node.js $(node -v) installed"

echo ""
echo "[3/7] Installing MongoDB 7.x..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl enable mongod
    sudo systemctl start mongod
fi
echo "MongoDB installed and running"

echo ""
echo "[4/7] Installing PM2 and Nginx..."
sudo npm install -g pm2
sudo apt install -y nginx

echo ""
echo "[5/7] Setting up project..."
cd /opt/soha

# Create logs directory
mkdir -p logs

# Install dependencies
echo "Installing root dependencies..."
npm install --production=false
echo "Installing server dependencies..."
cd server && npm install && cd ..

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create production .env
cat > server/.env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/soha
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
NODE_ENV=production
ADMIN_SECURITY_KEY=admin123
EOF

echo "Production .env created with secure JWT secret"

echo ""
echo "[6/7] Building Next.js..."
npm run build

echo ""
echo "[7/7] Starting services with PM2..."
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | grep "sudo env" | head -1

# Setup Nginx
sudo cp /opt/soha/deploy/nginx-soha /etc/nginx/sites-available/soha
sudo ln -sf /etc/nginx/sites-available/soha /etc/nginx/sites-enabled/soha
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "  Frontend: http://87.107.165.104"
echo "  Backend:  http://87.107.165.104/api/health"
echo ""
echo "  PM2 Status: pm2 status"
echo "  PM2 Logs:   pm2 logs"
echo ""
echo "  MongoDB: mongodb://localhost:27017/soha"
echo "========================================="
