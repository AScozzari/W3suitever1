#!/bin/bash
set -e
cd /var/www/w3suite/app/apps/frontend/web
echo "🎨 Building frontend (skip tsc, only vite build)..."
VITE_FONT_SCALE=80 npx vite build
echo "✅ Frontend build complete!"
ls -la dist/
