#!/bin/bash
# =============================================================================
# W3 SUITE - Deployment Script
# Run this after initial setup to deploy/update the application
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
APP_DIR="/var/www/w3suite"
APP_USER="w3suite"
REPO_URL="${1:-}"
BRANCH="${2:-main}"

echo ""
echo "=============================================="
echo "   W3 SUITE - Deployment"
echo "=============================================="
echo ""

# Check if running as correct user
if [[ $EUID -eq 0 ]]; then
    log_warn "Running as root, switching to $APP_USER for app operations..."
fi

# =============================================================================
# Step 1: Pull Latest Code
# =============================================================================
log_info "Step 1/6: Pulling latest code..."

cd $APP_DIR

if [ -d ".git" ]; then
    # Existing repo - pull updates
    sudo -u $APP_USER git fetch origin
    sudo -u $APP_USER git checkout $BRANCH
    sudo -u $APP_USER git pull origin $BRANCH
    log_success "Code updated from $BRANCH"
elif [ -n "$REPO_URL" ]; then
    # Clone new repo
    cd /var/www
    rm -rf w3suite
    sudo -u $APP_USER git clone -b $BRANCH $REPO_URL w3suite
    cd $APP_DIR
    log_success "Repository cloned"
else
    log_warn "No git repository found and no REPO_URL provided"
    log_warn "Please manually upload code to $APP_DIR or provide repo URL"
    log_info "Usage: ./deploy.sh <git-repo-url> [branch]"
fi

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
log_info "Step 2/6: Installing dependencies..."

sudo -u $APP_USER npm ci --production=false
log_success "Dependencies installed"

# =============================================================================
# Step 3: Run Database Migrations
# =============================================================================
log_info "Step 3/6: Running database migrations..."

# Load environment variables
if [ -f "$APP_DIR/.env.production" ]; then
    export $(grep -v '^#' $APP_DIR/.env.production | xargs)
fi

sudo -u $APP_USER npm run db:push --force 2>/dev/null || {
    log_warn "db:push not available, trying migration..."
    sudo -u $APP_USER npm run db:migrate 2>/dev/null || log_warn "No migration script found"
}
log_success "Database updated"

# =============================================================================
# Step 4: Build Application
# =============================================================================
log_info "Step 4/6: Building application..."

sudo -u $APP_USER npm run build
log_success "Application built"

# =============================================================================
# Step 5: Restart Services
# =============================================================================
log_info "Step 5/6: Restarting services..."

# Check if PM2 processes exist
if sudo -u $APP_USER pm2 list | grep -q "w3suite"; then
    sudo -u $APP_USER pm2 reload ecosystem.config.js --update-env
else
    sudo -u $APP_USER pm2 start ecosystem.config.js
fi

# Save PM2 configuration
sudo -u $APP_USER pm2 save

log_success "Services restarted"

# =============================================================================
# Step 6: Health Check
# =============================================================================
log_info "Step 6/6: Running health check..."

sleep 5

# Check backend
if curl -s http://localhost:3004/api/health > /dev/null 2>&1; then
    log_success "Backend is healthy"
else
    log_error "Backend health check failed!"
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "Frontend is healthy"
else
    log_warn "Frontend may still be starting..."
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "   Deployment Complete!"
echo "=============================================="
echo ""
log_success "W3 Suite has been deployed successfully!"
echo ""
echo "📊 PM2 Status:"
sudo -u $APP_USER pm2 status
echo ""
echo "📋 Useful Commands:"
echo "   pm2 logs              - View all logs"
echo "   pm2 logs w3suite-backend - View backend logs"
echo "   pm2 monit             - Real-time monitoring"
echo "   pm2 restart all       - Restart all services"
echo ""
