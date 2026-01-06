#!/bin/bash
set -e

VPS_HOST="root@82.165.16.223"
VPS_APP_DIR="/var/www/w3suite"
SSH_KEY="$(dirname "$0")/keys/vps_key"

echo "🚀 W3Suite Incremental Deploy"
echo "=============================="

if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at $SSH_KEY"
    exit 1
fi

DEPLOY_TYPE="${1:-backend}"
echo "📦 Deploy type: $DEPLOY_TYPE"
echo "📋 Available types: backend, frontend, full, brand-backend, brand-frontend, brand-full"

# Ensure VPS directory exists
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" "mkdir -p $VPS_APP_DIR"

# Create tar archive locally, excluding protected configs
echo "📦 Creating source archive..."
tar -czf /tmp/w3suite-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='.env.production' \
    --exclude='.git' \
    --exclude='ecosystem.config.cjs' \
    --exclude='*.log' \
    --exclude='attached_assets' \
    --exclude='.replit' \
    --exclude='replit.nix' \
    apps/ package.json package-lock.json tsconfig.json

echo "📤 Uploading source files..."
scp -o StrictHostKeyChecking=no -i "$SSH_KEY" /tmp/w3suite-deploy.tar.gz "$VPS_HOST:/tmp/"

echo "📂 Extracting on VPS..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" "cd $VPS_APP_DIR && tar -xzf /tmp/w3suite-deploy.tar.gz --strip-components=0 && rm /tmp/w3suite-deploy.tar.gz"

rm /tmp/w3suite-deploy.tar.gz

if [ "$DEPLOY_TYPE" == "backend" ] || [ "$DEPLOY_TYPE" == "full" ]; then
    echo "🔧 Building backend on VPS..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" << 'ENDSSH'
        cd /var/www/w3suite
        
        if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
            echo "📦 Installing dependencies..."
            npm ci --production=false 2>&1 || npm install 2>&1
        fi
        
        echo "🔨 Building server bundle..."
        npx esbuild apps/backend/api/src/index.ts \
            --bundle \
            --platform=node \
            --target=node18 \
            --external:pg-native \
            --external:sharp \
            --external:canvas \
            --outfile=apps/backend/api/dist/server.cjs
        
        echo "🔄 Restarting PM2..."
        pm2 restart w3-api --update-env || pm2 start apps/backend/api/dist/server.cjs --name w3-api
        
        sleep 3
        
        echo "🏥 Health check..."
        curl -s http://localhost:3004/api/health || echo "Health check failed but continuing..."
ENDSSH
fi

if [ "$DEPLOY_TYPE" == "frontend" ] || [ "$DEPLOY_TYPE" == "full" ]; then
    echo "🎨 Building frontend on VPS..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" << 'ENDSSH'
        cd /var/www/w3suite/apps/frontend/web
        
        echo "📦 Installing frontend dependencies..."
        npm ci 2>&1 || npm install 2>&1
        
        echo "🔨 Building frontend with production settings..."
        VITE_AUTH_MODE=oauth2 VITE_FONT_SCALE=80 npx vite build
        
        echo "✅ Frontend build completed"
ENDSSH
fi

# ========== BRAND INTERFACE DEPLOY ==========

if [ "$DEPLOY_TYPE" == "brand-backend" ] || [ "$DEPLOY_TYPE" == "brand-full" ]; then
    echo "🏭 Building Brand Backend on VPS..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" << 'ENDSSH'
        cd /var/www/w3suite
        
        if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
            echo "📦 Installing dependencies..."
            npm ci --production=false 2>&1 || npm install 2>&1
        fi
        
        echo "🔨 Building Brand API server bundle..."
        npx esbuild apps/backend/brand-api/src/index.ts \
            --bundle \
            --platform=node \
            --target=node18 \
            --external:pg-native \
            --external:sharp \
            --external:canvas \
            --outfile=apps/backend/brand-api/dist/server.cjs
        
        echo "🔄 Restarting PM2 brand-api..."
        pm2 restart brand-api --update-env || pm2 start apps/backend/brand-api/dist/server.cjs --name brand-api --env production
        
        sleep 3
        
        echo "🏥 Health check..."
        curl -s http://localhost:3002/brand-api/health || echo "Health check failed but continuing..."
ENDSSH
fi

if [ "$DEPLOY_TYPE" == "brand-frontend" ] || [ "$DEPLOY_TYPE" == "brand-full" ]; then
    echo "🎨 Building Brand Frontend on VPS..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VPS_HOST" << 'ENDSSH'
        cd /var/www/w3suite/apps/frontend/brand-web
        
        echo "📦 Installing Brand frontend dependencies..."
        npm ci 2>&1 || npm install 2>&1
        
        echo "🔨 Building Brand frontend with production settings (VITE_FONT_SCALE=80)..."
        VITE_AUTH_MODE=oauth2 VITE_FONT_SCALE=80 npx vite build
        
        echo "✅ Brand Frontend build completed"
ENDSSH
fi

echo ""
echo "✅ Deploy completed successfully!"
