#!/bin/bash
set -e
cd /var/www/w3suite
echo "📦 Installing dependencies..."
npm ci --production=false
echo "🔨 Building backend..."
npx esbuild apps/backend/api/src/index.ts --bundle --platform=node --target=node18 --external:pg-native --external:sharp --external:canvas --outfile=/var/www/w3suite/current/server.cjs
echo "🔄 Restarting PM2..."
pm2 restart w3-api --update-env
sleep 3
echo "🏥 Health check..."
curl -s http://localhost:3004/api/health
echo ""
echo "🎨 Building frontend..."
cd apps/frontend/web
npm ci
VITE_FONT_SCALE=80 npm run build
echo "✅ Deploy complete!"
