#!/bin/bash
# =============================================================================
# W3 SUITE - Backup Script
# Creates backups of database and application files
# =============================================================================

set -e

# Configuration
BACKUP_DIR="/var/backups/w3suite"
APP_DIR="/var/www/w3suite"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo ""
echo "=============================================="
echo "   W3 SUITE - Backup"
echo "=============================================="
echo ""

# Create backup directory
mkdir -p $BACKUP_DIR

# =============================================================================
# Database Backup
# =============================================================================
log_info "Backing up database..."

# Load credentials from env
if [ -f "$APP_DIR/.env.production" ]; then
    export $(grep -v '^#' $APP_DIR/.env.production | xargs)
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

pg_dump -Fc $DB_NAME > "$BACKUP_DIR/db_$DATE.dump"
log_success "Database backed up to: db_$DATE.dump"

# =============================================================================
# Application Files Backup
# =============================================================================
log_info "Backing up application files..."

tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.next' \
    -C /var/www w3suite

log_success "Application backed up to: app_$DATE.tar.gz"

# =============================================================================
# Environment Backup
# =============================================================================
log_info "Backing up environment..."

cp $APP_DIR/.env.production "$BACKUP_DIR/env_$DATE.backup"
chmod 600 "$BACKUP_DIR/env_$DATE.backup"
log_success "Environment backed up to: env_$DATE.backup"

# =============================================================================
# Cleanup Old Backups
# =============================================================================
log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

find $BACKUP_DIR -name "db_*.dump" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "app_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "env_*.backup" -mtime +$RETENTION_DAYS -delete

log_success "Cleanup complete"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "   Backup Complete!"
echo "=============================================="
echo ""
echo "📁 Backup Location: $BACKUP_DIR"
echo ""
echo "📋 Files Created:"
ls -lh $BACKUP_DIR/*_$DATE* 2>/dev/null || echo "   (none)"
echo ""
echo "💾 Total Backup Size:"
du -sh $BACKUP_DIR
echo ""
echo "🔄 To restore database:"
echo "   pg_restore -d $DB_NAME $BACKUP_DIR/db_$DATE.dump"
echo ""
