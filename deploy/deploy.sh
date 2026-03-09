#!/bin/bash
set -e

echo "🚀 Deploying Telegram Automation Platform..."
echo "============================================="

PROJECT_DIR="/var/www/tg-scheduler-user-automation"

# ─── Git Pull ───
echo ""
echo "� Pulling latest changes..."
cd "$PROJECT_DIR"
git pull origin main
echo "✅ Code updated"

# ─── Backend ───
echo ""
echo "📦 Updating backend dependencies..."
source "$PROJECT_DIR/venv/bin/activate"
cd "$PROJECT_DIR/backend"
pip install -r requirements.txt --quiet
echo "✅ Backend dependencies updated"

echo "🔄 Restarting backend..."
pm2 restart tg-backend
echo "✅ Backend restarted"

# ─── Frontend ───
echo ""
echo "🌐 Building frontend..."
cd "$PROJECT_DIR/frontend"
npm install --silent
npm run build
echo "✅ Frontend built"

echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx reloaded"

# ─── Status ───
echo ""
echo "============================================="
pm2 status
echo ""
echo "🎉 Deployment complete!"
echo "   Site: https://tg-auto-schedular.giize.com"
echo "   Health: https://tg-auto-schedular.giize.com/api/v1/health"
