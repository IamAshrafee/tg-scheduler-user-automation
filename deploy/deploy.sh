#!/bin/bash
set -e

echo "🚀 Deploying Telegram Automation Platform..."
echo "============================================="

PROJECT_DIR="/var/www/tg-platform"

# ─── Backend ───
echo ""
echo "📦 Updating backend..."
cd "$PROJECT_DIR/backend"
source "$PROJECT_DIR/venv/bin/activate"
pip install -r requirements.txt --quiet
echo "✅ Backend dependencies updated"

echo "🔄 Restarting backend..."
pm2 restart tg-backend
echo "✅ Backend restarted"

# ─── Frontend ───
echo ""
echo "🌐 Frontend: upload dist/ manually via SCP first, then run this script."
echo "   scp -r frontend/dist/ ashrafee@62.72.42.124:/var/www/tg-platform/frontend/dist/"
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
