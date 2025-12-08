#!/bin/bash
# =============================================================================
# W3 SUITE - VPS Production Setup Script
# Ubuntu 22.04/24.04 LTS
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Configuration - MODIFY THESE VALUES
# =============================================================================
DOMAIN="your-domain.com"
APP_USER="w3suite"
APP_DIR="/var/www/w3suite"
NODE_VERSION="20"
POSTGRES_VERSION="16"
POSTGRES_DB="w3suite_production"
POSTGRES_USER="w3suite_user"
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

# =============================================================================
# Pre-flight checks
# =============================================================================
echo ""
echo "=============================================="
echo "   W3 SUITE - VPS Production Setup"
echo "=============================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu" /etc/os-release; then
    log_error "This script is designed for Ubuntu. Detected: $(cat /etc/os-release | grep PRETTY_NAME)"
    exit 1
fi

log_info "Starting W3 Suite production setup..."
log_info "Domain: $DOMAIN"
log_info "App Directory: $APP_DIR"

# =============================================================================
# Step 1: System Update
# =============================================================================
log_info "Step 1/10: Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release git build-essential
log_success "System updated"

# =============================================================================
# Step 2: Create Application User
# =============================================================================
log_info "Step 2/10: Creating application user..."
if id "$APP_USER" &>/dev/null; then
    log_warn "User $APP_USER already exists, skipping..."
else
    useradd -m -s /bin/bash $APP_USER
    mkdir -p $APP_DIR
    chown -R $APP_USER:$APP_USER $APP_DIR
    log_success "User $APP_USER created"
fi

# =============================================================================
# Step 3: Install Node.js 20 LTS
# =============================================================================
log_info "Step 3/10: Installing Node.js $NODE_VERSION LTS..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
npm install -g npm@latest

# Verify installation
NODE_VER=$(node -v)
NPM_VER=$(npm -v)
log_success "Node.js $NODE_VER and npm $NPM_VER installed"

# =============================================================================
# Step 4: Install PM2 Process Manager
# =============================================================================
log_info "Step 4/10: Installing PM2..."
npm install -g pm2
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
log_success "PM2 installed and configured for startup"

# =============================================================================
# Step 5: Install PostgreSQL 16 + pgvector (AI/RAG)
# =============================================================================
log_info "Step 5/10: Installing PostgreSQL $POSTGRES_VERSION with pgvector..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt-get update -y
apt-get install -y postgresql-$POSTGRES_VERSION postgresql-contrib-$POSTGRES_VERSION

# Install pgvector extension for AI embeddings/RAG
apt-get install -y postgresql-$POSTGRES_VERSION-pgvector

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user with all required extensions
sudo -u postgres psql <<EOF
CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';
CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;
GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
\c $POSTGRES_DB

-- Core extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Vector extension for AI embeddings (RAG system)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Grant vector extension privileges
GRANT USAGE ON SCHEMA public TO $POSTGRES_USER;
GRANT ALL ON ALL TABLES IN SCHEMA public TO $POSTGRES_USER;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;
EOF

log_success "PostgreSQL $POSTGRES_VERSION with pgvector installed"
log_info "  └─ Extensions: uuid-ossp, pgcrypto, vector (AI/RAG)"

# =============================================================================
# Step 6: Install Redis 7
# =============================================================================
log_info "Step 6/10: Installing Redis..."
apt-get install -y redis-server

# Configure Redis for production
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

systemctl restart redis-server
systemctl enable redis-server
log_success "Redis installed and configured"

# =============================================================================
# Step 7: Install Nginx
# =============================================================================
log_info "Step 7/10: Installing Nginx..."
apt-get install -y nginx

# Remove default config
rm -f /etc/nginx/sites-enabled/default

# Create W3 Suite Nginx config
cat > /etc/nginx/sites-available/w3suite <<EOF
# W3 Suite Production Nginx Configuration
# Generated by setup script

upstream w3suite_backend {
    server 127.0.0.1:3004;
    keepalive 64;
}

upstream w3suite_frontend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login_limit:10m rate=5r/m;

# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS - Main server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
    
    # Client body size (for file uploads)
    client_max_body_size 50M;
    
    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://w3suite_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket endpoints
    location /ws/ {
        proxy_pass http://w3suite_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
    
    # Brand Interface
    location /brandinterface/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://w3suite_frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend (catch-all)
    location / {
        proxy_pass http://w3suite_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/w3suite /etc/nginx/sites-enabled/

# Test nginx config (will fail until SSL is setup, that's ok)
log_warn "Nginx config created (SSL certificates needed before starting)"

# =============================================================================
# Step 8: Install Certbot for SSL
# =============================================================================
log_info "Step 8/10: Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

mkdir -p /var/www/certbot

log_success "Certbot installed"
log_warn "Run 'sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN' after DNS is configured"

# =============================================================================
# Step 9: Configure Firewall (UFW)
# =============================================================================
log_info "Step 9/10: Configuring firewall..."
apt-get install -y ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall (non-interactive)
echo "y" | ufw enable

log_success "Firewall configured and enabled"

# =============================================================================
# Step 10: Create PM2 Ecosystem File
# =============================================================================
log_info "Step 10/10: Creating PM2 ecosystem file..."

cat > $APP_DIR/ecosystem.config.js <<EOF
// PM2 Ecosystem Configuration for W3 Suite
module.exports = {
  apps: [
    {
      name: 'w3suite-backend',
      script: 'dist/index.js',
      cwd: '$APP_DIR',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        DATABASE_URL: 'postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: '$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)',
        AUTH_MODE: 'oauth2',
      },
      max_memory_restart: '1G',
      error_file: '/var/log/w3suite/backend-error.log',
      out_file: '/var/log/w3suite/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'w3suite-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '$APP_DIR/apps/frontend/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/w3suite/frontend-error.log',
      out_file: '/var/log/w3suite/frontend-out.log',
    },
    {
      name: 'brand-backend',
      script: 'dist/index.js',
      cwd: '$APP_DIR/apps/brand/api',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/log/w3suite/brand-backend-error.log',
      out_file: '/var/log/w3suite/brand-backend-out.log',
    },
    {
      name: 'brand-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '$APP_DIR/apps/brand/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/w3suite/brand-frontend-error.log',
      out_file: '/var/log/w3suite/brand-frontend-out.log',
    },
  ],
};
EOF

# Create log directory
mkdir -p /var/log/w3suite
chown -R $APP_USER:$APP_USER /var/log/w3suite
chown -R $APP_USER:$APP_USER $APP_DIR

log_success "PM2 ecosystem file created"

# =============================================================================
# Create environment file
# =============================================================================
cat > $APP_DIR/.env.production <<EOF
# W3 Suite Production Environment
# Generated: $(date)

NODE_ENV=production
PORT=3004

# Database
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
AUTH_MODE=oauth2
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)

# Domain
APP_URL=https://$DOMAIN
CORS_ORIGIN=https://$DOMAIN

# Email (configure your provider)
# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=your-api-key
# EMAIL_FROM=noreply@$DOMAIN

# VoIP (optional)
# EDGVOIP_API_URL=https://your-pbx.edgvoip.it/api/v2
# EDGVOIP_API_KEY=your-api-key
EOF

chown $APP_USER:$APP_USER $APP_DIR/.env.production
chmod 600 $APP_DIR/.env.production

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "   W3 SUITE - Setup Complete!"
echo "=============================================="
echo ""
log_success "All components installed successfully!"
echo ""
echo "📋 INSTALLED COMPONENTS:"
echo "   - Node.js $NODE_VER"
echo "   - npm $NPM_VER"
echo "   - PM2 (process manager)"
echo "   - PostgreSQL $POSTGRES_VERSION"
echo "   - Redis"
echo "   - Nginx"
echo "   - Certbot"
echo "   - UFW Firewall"
echo ""
echo "🔐 DATABASE CREDENTIALS (SAVE THESE!):"
echo "   Database: $POSTGRES_DB"
echo "   User: $POSTGRES_USER"
echo "   Password: $POSTGRES_PASSWORD"
echo "   Connection: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB"
echo ""
echo "📁 PATHS:"
echo "   App Directory: $APP_DIR"
echo "   Logs: /var/log/w3suite/"
echo "   Environment: $APP_DIR/.env.production"
echo "   PM2 Config: $APP_DIR/ecosystem.config.js"
echo ""
echo "🚀 NEXT STEPS:"
echo "   1. Configure DNS to point $DOMAIN to this server"
echo "   2. Upload your application code to $APP_DIR"
echo "   3. Run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "   4. Build: cd $APP_DIR && npm install && npm run build"
echo "   5. Start: pm2 start ecosystem.config.js"
echo "   6. Save PM2: pm2 save"
echo ""
echo "📖 For deployment script, run: ./deploy.sh"
echo ""
log_warn "IMPORTANT: Save the database password above! It won't be shown again."
echo ""
