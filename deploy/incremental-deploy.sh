#!/bin/bash
set -e

VPS_HOST="root@82.165.16.223"
VPS_APP_DIR="/var/www/w3suite"
VPS_RELEASES_DIR="/var/www/w3suite/releases"
VPS_CURRENT_LINK="/var/www/w3suite/current"
SSH_KEY="$(dirname "$0")/keys/vps_key"
EXCLUDE_FILE="deploy/rsync-exclude.txt"

echo "🚀 W3Suite Incremental Deploy"
echo "=============================="

if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at $SSH_KEY"
    exit 1
fi

DEPLOY_TYPE="${1:-backend}"
echo "📦 Deploy type: $DEPLOY_TYPE"

ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" "mkdir -p $VPS_APP_DIR"

echo "📤 Syncing source files (excluding configs)..."
rsync -avz --progress \
    --exclude-from="$EXCLUDE_FILE" \
    -e "ssh -o StrictHostKeyChecking=no -i $SSH_KEY" \
    ./apps/ "$VPS_HOST:$VPS_APP_DIR/apps/"

rsync -avz --progress \
    --exclude-from="$EXCLUDE_FILE" \
    -e "ssh -o StrictHostKeyChecking=no -i $SSH_KEY" \
    ./package.json ./package-lock.json ./tsconfig.json \
    "$VPS_HOST:$VPS_APP_DIR/"

if [ "$DEPLOY_TYPE" == "backend" ] || [ "$DEPLOY_TYPE" == "full" ]; then
    echo "🔧 Building backend on VPS..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" << 'ENDSSH'
        cd /var/www/w3suite
        
        if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
            echo "📦 Installing dependencies..."
            npm ci --production=false
        fi
        
        echo "🔨 Building server bundle..."
        npx esbuild apps/backend/api/src/index.ts \
            --bundle \
            --platform=node \
            --target=node18 \
            --external:pg-native \
            --external:sharp \
            --external:canvas \
            --outfile=/var/www/w3suite/current/server.cjs
        
        echo "🔄 Restarting PM2..."
        pm2 restart w3-api --update-env
        
        sleep 3
        
        echo "🏥 Health check..."
        curl -s http://localhost:3004/api/health
ENDSSH
fi

if [ "$DEPLOY_TYPE" == "frontend" ] || [ "$DEPLOY_TYPE" == "full" ]; then
    echo "🎨 Building frontend on VPS..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" << 'ENDSSH'
        cd /var/www/w3suite
        
        echo "📦 Installing frontend dependencies..."
        cd apps/frontend/web
        npm ci
        
        echo "🔨 Building frontend..."
        VITE_FONT_SCALE=80 npx vite build
        
        echo "📁 Copying to static dir..."
        cp -r dist/* /var/www/w3suite/apps/frontend/web/dist/
ENDSSH
fi

echo ""
echo "✅ Incremental deploy completed!"
echo "📊 Only modified files were synced"
