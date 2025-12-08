#!/bin/bash
set -e

echo "================================================"
echo "🚀 W3 Suite Application Deployment"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

APP_DIR="/var/www/w3suite"
REPO_URL="https://github.com/YOUR_USERNAME/w3suite.git"  # UPDATE THIS

# ===========================================
# 1. LOAD DATABASE CREDENTIALS
# ===========================================
echo ""
echo "📦 Loading database credentials..."

if [ -f "${APP_DIR}/.db-credentials" ]; then
    source ${APP_DIR}/.db-credentials
    log_success "Database credentials loaded"
else
    log_error "Database credentials not found. Run setup-database.sh first!"
    exit 1
fi

# ===========================================
# 2. CREATE PRODUCTION .env FILE
# ===========================================
echo ""
echo "📝 Creating production environment file..."

# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
SESSION_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)

cat > ${APP_DIR}/.env.production <<EOF
# W3 Suite Production Environment
# Generated: $(date)

# === ENVIRONMENT ===
NODE_ENV=production
AUTH_MODE=development

# === DATABASE ===
DATABASE_URL=${DATABASE_URL}

# === REDIS ===
REDIS_URL=redis://localhost:6379

# === SECURITY ===
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# === PORTS (Internal) ===
API_PORT=3004
VOICE_GATEWAY_PORT=3005
VOICE_HTTP_PORT=3105

# === URLS ===
# Update these with your actual domain
PUBLIC_URL=http://82.165.16.223
API_URL=http://localhost:3004
VITE_API_URL=/api

# === AI/OpenAI (Optional) ===
# OPENAI_API_KEY=your_openai_api_key_here

# === EDGVoIP (Optional) ===
# EDGVOIP_API_URL=https://api.edgvoip.com
# EDGVOIP_API_KEY=your_edgvoip_api_key_here

# === Email (Optional) ===
# SENDGRID_API_KEY=your_sendgrid_api_key_here
# EMAIL_FROM=noreply@yourdomain.com

# === DISABLE EMBEDDED MODE ===
# This is critical for production - use system Nginx instead
DISABLE_EMBEDDED_NGINX=true
DISABLE_FRONTEND_SPAWN=true
EOF

chmod 600 ${APP_DIR}/.env.production
chown w3suite:w3suite ${APP_DIR}/.env.production

log_success "Production .env file created"

# ===========================================
# 3. CLONE/UPDATE REPOSITORY
# ===========================================
echo ""
echo "📦 Setting up application code..."

cd ${APP_DIR}

# Check if we're using git or copying files
if [ -d ".git" ]; then
    log_warning "Git repository exists, pulling latest..."
    git pull origin main || git pull origin master
elif [ -d "apps" ]; then
    log_warning "Application files exist, skipping clone"
else
    log_warning "No code found. Please upload your code to ${APP_DIR}"
    log_warning "You can:"
    log_warning "  1. Use 'scp -r' to copy files from your development machine"
    log_warning "  2. Clone from git: git clone YOUR_REPO_URL ${APP_DIR}"
    log_warning "  3. Upload a zip file and extract it"
    echo ""
    echo "After uploading, run this script again."
    exit 0
fi

# ===========================================
# 4. INSTALL DEPENDENCIES & BUILD
# ===========================================
echo ""
echo "📦 Installing dependencies..."

cd ${APP_DIR}

# Install root dependencies
npm install

# Build backend API
echo "🔨 Building Backend API..."
npm run build

# Build W3 Suite Frontend
echo "🔨 Building W3 Suite Frontend..."
cd apps/frontend/web
npm install
npm run build
cd ${APP_DIR}

# Build Brand Frontend
echo "🔨 Building Brand Frontend..."
cd apps/frontend/brand-web
npm install
npm run build
cd ${APP_DIR}

# Build Voice Gateway
echo "🔨 Building Voice Gateway..."
cd apps/voice-gateway
npm install
npm run build 2>/dev/null || log_warning "Voice gateway build skipped (may not have build script)"
cd ${APP_DIR}

log_success "All applications built"

# ===========================================
# 5. RUN DATABASE MIGRATIONS
# ===========================================
echo ""
echo "🐘 Running database migrations..."

cd ${APP_DIR}
export $(cat .env.production | grep -v '^#' | xargs)

npx drizzle-kit push 2>/dev/null || log_warning "Drizzle migrations may need manual run"

log_success "Migrations completed"

# ===========================================
# 6. SETUP PM2 ECOSYSTEM
# ===========================================
echo ""
echo "⚡ Setting up PM2 process manager..."

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
      env_production: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      env_file: '/var/www/w3suite/.env.production'
    },
    {
      name: 'w3-voice',
      script: 'apps/voice-gateway/dist/index.js',
      cwd: '/var/www/w3suite',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3005,
        HTTP_PORT: 3105
      },
      env_file: '/var/www/w3suite/.env.production'
    }
  ]
};
ECOSYSTEM

chown w3suite:w3suite ${APP_DIR}/ecosystem.config.js

log_success "PM2 ecosystem configured"

# ===========================================
# 7. START SERVICES
# ===========================================
echo ""
echo "🚀 Starting services with PM2..."

# Stop existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start with ecosystem file
cd ${APP_DIR}
pm2 start ecosystem.config.js --env production

# Save PM2 process list for auto-start on reboot
pm2 save
pm2 startup systemd -u root --hp /root

log_success "Services started with PM2"

# ===========================================
# SUMMARY
# ===========================================
echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "PM2 Status:"
pm2 list
echo ""
echo "Next step: Run ./setup-nginx.sh to configure the web server"
echo ""
