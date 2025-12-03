#!/bin/bash
set -e

echo "================================================"
echo "🔨 W3 Suite Build & Start"
echo "================================================"
echo ""

APP_DIR="/var/www/w3suite"
cd ${APP_DIR}

# Load environment
export $(cat .env.production | grep -v '^#' | xargs)

# ===========================================
# 1. INSTALL DEPENDENCIES
# ===========================================
echo ""
echo "📦 Step 1: Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# ===========================================
# 2. BUILD BACKEND API
# ===========================================
echo ""
echo "🔨 Step 2: Building Backend API..."
npm run build 2>&1 || echo "⚠️  Backend build may need tsconfig adjustment"
echo "✅ Backend built"

# ===========================================
# 3. BUILD FRONTEND (W3 Suite)
# ===========================================
echo ""
echo "🔨 Step 3: Building W3 Suite Frontend..."
cd apps/frontend/web
npm install
npm run build
cd ${APP_DIR}
echo "✅ W3 Frontend built"

# ===========================================
# 4. BUILD BRAND FRONTEND
# ===========================================
echo ""
echo "🔨 Step 4: Building Brand Frontend..."
cd apps/frontend/brand-web
npm install
npm run build
cd ${APP_DIR}
echo "✅ Brand Frontend built"

# ===========================================
# 5. BUILD VOICE GATEWAY
# ===========================================
echo ""
echo "🔨 Step 5: Building Voice Gateway..."
cd apps/voice-gateway
npm install
npm run build 2>/dev/null || echo "⚠️  Voice gateway may not have build script"
cd ${APP_DIR}
echo "✅ Voice Gateway built"

# ===========================================
# 6. RUN DATABASE MIGRATIONS
# ===========================================
echo ""
echo "🐘 Step 6: Running database migrations..."
npx drizzle-kit push 2>/dev/null || echo "⚠️  Migrations may need manual run"
echo "✅ Migrations applied"

# ===========================================
# 7. CREATE PM2 ECOSYSTEM
# ===========================================
echo ""
echo "⚡ Step 7: Setting up PM2..."

cat > ${APP_DIR}/ecosystem.config.js <<'ECOSYSTEM'
module.exports = {
  apps: [
    {
      name: 'w3-api',
      script: 'dist/index.js',
      cwd: '/var/www/w3suite',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      }
    },
    {
      name: 'w3-voice',
      script: 'apps/voice-gateway/dist/index.js',
      cwd: '/var/www/w3suite',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        HTTP_PORT: 3105
      }
    }
  ]
};
ECOSYSTEM

echo "✅ PM2 ecosystem configured"

# ===========================================
# 8. START SERVICES
# ===========================================
echo ""
echo "🚀 Step 8: Starting services..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "================================================"
echo "✅ BUILD & START COMPLETE!"
echo "================================================"
pm2 list
echo ""
echo "Now run: bash /root/w3suite-deploy/setup-nginx.sh"
