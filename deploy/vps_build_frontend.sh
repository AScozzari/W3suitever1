#!/bin/bash
set -e
cd /var/www/w3suite/app/apps/frontend/web
echo "📦 Installing frontend dependencies..."
npm install
echo "🎨 Building frontend with VITE_FONT_SCALE=80..."
VITE_FONT_SCALE=80 npm run build
echo "✅ Frontend build complete!"
ls -la dist/
