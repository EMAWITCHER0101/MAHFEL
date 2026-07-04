#!/bin/bash
set -e

echo "========================================="
echo "  Uploading MAHFEL to Server"
echo "  Server: 87.107.165.104:9011"
echo "========================================="

SERVER="87.107.165.104"
SSH_PORT=9011
REMOTE_DIR="/opt/soha"

echo ""
echo "[1/3] Creating remote directory..."
ssh -p $SSH_PORT root@$SERVER "mkdir -p $REMOTE_DIR/logs $REMOTE_DIR/deploy"

echo ""
echo "[2/3] Uploading project files..."
# Upload only essential files (exclude node_modules, .next, logs, etc.)
rsync -avz --progress \
  -e "ssh -p $SSH_PORT" \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'out' \
  --exclude 'dist' \
  --exclude 'android' \
  --exclude 'logs' \
  --exclude '*.log' \
  --exclude '.git' \
  --exclude 'server/node_modules' \
  E:\soha/ root@$SERVER:$REMOTE_DIR/

echo ""
echo "[3/3] Uploading config files..."
scp -P $SSH_PORT E:\soha\ecosystem.config.cjs root@$SERVER:$REMOTE_DIR/
scp -P $SSH_PORT E:\soha\deploy\nginx-soha root@$SERVER:$REMOTE_DIR/deploy/
scp -P $SSH_PORT E:\soha\deploy\setup.sh root@$SERVER:$REMOTE_DIR/deploy/
ssh -p $SSH_PORT root@$SERVER "chmod +x $REMOTE_DIR/deploy/setup.sh"

echo ""
echo "========================================="
echo "  Upload Complete!"
echo "========================================="
echo ""
echo "  Next step: SSH into server and run:"
echo "  ssh -p $SSH_PORT root@$SERVER"
echo "  bash /opt/soha/deploy/setup.sh"
echo "========================================="
