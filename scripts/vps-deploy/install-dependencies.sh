#!/bin/bash
set -e

echo "================================================"
echo "🚀 W3 Suite VPS Installation Script"
echo "   Debian 12 (Bookworm) - Full Stack Setup"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_info() { echo "📦 $1"; }

# ===========================================
# 1. SYSTEM UPDATE
# ===========================================
echo ""
echo "=========================================="
echo "📦 Step 1: System Update"
echo "=========================================="

apt-get update
apt-get upgrade -y
log_success "System updated"

# ===========================================
# 2. BUILD DEPENDENCIES
# ===========================================
echo ""
echo "=========================================="
echo "🔧 Step 2: Build Dependencies"
echo "=========================================="

apt-get install -y \
    curl \
    wget \
    gnupg2 \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    build-essential \
    git \
    ufw \
    htop \
    nano \
    unzip

log_success "Build dependencies installed"

# ===========================================
# 3. NODE.JS 20 LTS
# ===========================================
echo ""
echo "=========================================="
echo "🟢 Step 3: Node.js 20 LTS"
echo "=========================================="

if command -v node &> /dev/null; then
    log_warning "Node.js already installed: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    log_success "Node.js installed: $(node --version)"
fi

# Install PM2 globally
npm install -g pm2
log_success "PM2 installed: $(pm2 --version)"

# ===========================================
# 4. POSTGRESQL 16
# ===========================================
echo ""
echo "=========================================="
echo "🐘 Step 4: PostgreSQL 16"
echo "=========================================="

if command -v psql &> /dev/null; then
    log_warning "PostgreSQL already installed"
else
    # Add PostgreSQL repository
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    apt-get install -y postgresql-16 postgresql-contrib-16
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    log_success "PostgreSQL 16 installed and running"
fi

# ===========================================
# 5. REDIS
# ===========================================
echo ""
echo "=========================================="
echo "🔴 Step 5: Redis"
echo "=========================================="

if command -v redis-server &> /dev/null; then
    log_warning "Redis already installed"
else
    apt-get install -y redis-server
    
    # Configure Redis for production
    sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory <bytes>/maxmemory 512mb/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    
    # Bind to localhost only for security
    sed -i 's/^bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf
    
    systemctl restart redis-server
    systemctl enable redis-server
    
    log_success "Redis installed and configured"
fi

# ===========================================
# 6. NGINX
# ===========================================
echo ""
echo "=========================================="
echo "🌐 Step 6: Nginx"
echo "=========================================="

if command -v nginx &> /dev/null; then
    log_warning "Nginx already installed"
else
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    log_success "Nginx installed and running"
fi

# ===========================================
# 7. FIREWALL (UFW)
# ===========================================
echo ""
echo "=========================================="
echo "🔒 Step 7: Firewall Configuration"
echo "=========================================="

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log_success "Firewall configured (SSH, HTTP, HTTPS allowed)"

# ===========================================
# 8. CREATE APP USER
# ===========================================
echo ""
echo "=========================================="
echo "👤 Step 8: Create Application User"
echo "=========================================="

if id "w3suite" &>/dev/null; then
    log_warning "User w3suite already exists"
else
    useradd -m -s /bin/bash w3suite
    usermod -aG sudo w3suite
    log_success "User w3suite created"
fi

# Create application directories
mkdir -p /var/www/w3suite
mkdir -p /var/log/w3suite
chown -R w3suite:w3suite /var/www/w3suite
chown -R w3suite:w3suite /var/log/w3suite

log_success "Application directories created"

# ===========================================
# SUMMARY
# ===========================================
echo ""
echo "================================================"
echo "✅ INSTALLATION COMPLETE!"
echo "================================================"
echo ""
echo "Installed versions:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - PM2: $(pm2 --version)"
echo "  - PostgreSQL: $(psql --version | head -1)"
echo "  - Redis: $(redis-server --version | cut -d' ' -f3)"
echo "  - Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo ""
echo "Services running:"
systemctl is-active --quiet postgresql && echo "  - PostgreSQL: ✅ Active" || echo "  - PostgreSQL: ❌ Inactive"
systemctl is-active --quiet redis-server && echo "  - Redis: ✅ Active" || echo "  - Redis: ❌ Inactive"
systemctl is-active --quiet nginx && echo "  - Nginx: ✅ Active" || echo "  - Nginx: ❌ Inactive"
echo ""
echo "Next steps:"
echo "  1. Run: ./setup-database.sh"
echo "  2. Run: ./deploy-app.sh"
echo ""
