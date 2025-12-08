#!/bin/bash
set -e

VPS_HOST="root@82.165.16.223"
VPS_PATH="/var/www/w3suite"
RELEASE_DIR="$VPS_PATH/releases"
CURRENT_LINK="$VPS_PATH/current"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 W3 Suite VPS Deploy - $TIMESTAMP"
echo "================================================"

# 1. Build backend
echo "📦 Building backend..."
cd "$(dirname "$0")/.."
npx esbuild apps/backend/api/src/index.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --external:pg-native \
  --external:sharp \
  --external:canvas \
  --outfile=dist/server.cjs

echo "✅ Build completed: dist/server.cjs"

# 2. Create release directory on VPS
echo "📁 Creating release directory..."
ssh $VPS_HOST "mkdir -p $RELEASE_DIR/$TIMESTAMP"

# 3. Upload ONLY the compiled artifact
echo "📤 Uploading artifact..."
scp dist/server.cjs $VPS_HOST:$RELEASE_DIR/$TIMESTAMP/server.cjs

# 4. Update symlink
echo "🔗 Updating current symlink..."
ssh $VPS_HOST "
  rm -f $CURRENT_LINK
  ln -s $RELEASE_DIR/$TIMESTAMP $CURRENT_LINK
  echo '$TIMESTAMP' > $VPS_PATH/CURRENT_RELEASE
"

# 5. Reload PM2 (preserves .env.production - NEVER OVERWRITTEN)
echo "♻️ Reloading PM2..."
ssh $VPS_HOST "
  cd $VPS_PATH
  export \$(grep -v '^#' .env.production | xargs)
  pm2 delete w3-api 2>/dev/null || true
  pm2 start current/server.cjs --name w3-api --node-args='--max-old-space-size=1024' --update-env
  pm2 save
"

# 6. Cleanup old releases (keep last 5)
echo "🧹 Cleaning old releases..."
ssh $VPS_HOST "cd $RELEASE_DIR && ls -t | tail -n +6 | xargs -r rm -rf"

# 7. Health check
echo "🏥 Health check..."
sleep 8
if ssh $VPS_HOST "curl -sf http://localhost:3004/api/health > /dev/null"; then
  echo "✅ Deploy successful!"
else
  echo "❌ Health check failed - rolling back..."
  ssh $VPS_HOST "
    cd $VPS_PATH
    export \$(grep -v '^#' .env.production | xargs)
    PREV=\$(ls -t $RELEASE_DIR | head -2 | tail -1)
    rm -f $CURRENT_LINK
    ln -s $RELEASE_DIR/\$PREV $CURRENT_LINK
    pm2 delete w3-api 2>/dev/null || true
    pm2 start current/server.cjs --name w3-api --node-args='--max-old-space-size=1024' --update-env
    pm2 save
  "
  echo "⚠️ Rolled back to previous release"
  exit 1
fi

echo "================================================"
echo "🎉 Deploy completed: $TIMESTAMP"
echo ""
echo "📋 Files NEVER overwritten on VPS:"
echo "   - .env.production (secrets, DB, Redis, VITE_FONT_SCALE)"
echo "   - .env (local overrides)"
echo "   - ecosystem.config.cjs"
echo ""
echo "📐 Frontend scale controlled by VITE_FONT_SCALE in .env.production"
echo "   Current value: 70 (70% zoom, like browser zoom)"
echo ""
echo "🎨 To deploy frontend separately:"
echo "   cd apps/frontend/web && npx vite build"
echo "   scp -r dist/* $VPS_HOST:$VPS_PATH/apps/frontend/web/dist/"
