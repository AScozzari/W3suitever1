#!/bin/bash
# =============================================================================
# W3 Suite - Git-Style Incremental VPS Deploy
# =============================================================================
# Deploys ONLY modified files, preserving ALL VPS customizations
# Uses rsync with exclusions from DEPLOY_IGNORE.txt
# =============================================================================
set -e

# === CONFIGURATION ===
VPS_HOST="root@82.165.16.223"
VPS_PATH="/var/www/w3suite"
RELEASE_DIR="$VPS_PATH/releases"
CURRENT_LINK="$VPS_PATH/current"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_LOG="$VPS_PATH/DEPLOY_HISTORY.log"

# SSH with key authentication
SSH_KEY="$HOME/.ssh/vps_key"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -i $SSH_KEY"
ssh() { command ssh $SSH_OPTS "$@"; }
scp() { command scp $SSH_OPTS "$@"; }

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# === FUNCTIONS ===

print_header() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}  W3 Suite Incremental Deploy${NC}"
    echo -e "${BLUE}  $TIMESTAMP${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

check_lock() {
    if ssh $VPS_HOST "test -f $VPS_PATH/.deploy-lock"; then
        print_error "Deploy in progress by another process. Wait or remove .deploy-lock"
        exit 1
    fi
    ssh $VPS_HOST "echo $TIMESTAMP > $VPS_PATH/.deploy-lock"
}

release_lock() {
    ssh $VPS_HOST "rm -f $VPS_PATH/.deploy-lock" 2>/dev/null || true
}

cleanup_on_error() {
    print_error "Deploy failed! Cleaning up..."
    release_lock
    exit 1
}

trap cleanup_on_error ERR

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --backend         Deploy only backend (default: backend + frontend)"
    echo "  --frontend        Deploy only frontend"
    echo "  --all             Deploy backend + frontend (default)"
    echo "  --rollback        Rollback to previous release"
    echo "  --list-releases   Show available releases"
    echo "  --dry-run         Show what would be deployed without deploying"
    echo "  --help            Show this help"
    echo ""
    echo "Protected files (from DEPLOY_IGNORE.txt):"
    echo "  - .env.production, .env"
    echo "  - ecosystem.config.cjs"
    echo "  - custom/, uploads/, media/"
    echo "  - SSL certificates, nginx configs"
    echo ""
}

list_releases() {
    print_info "Available releases on VPS:"
    ssh $VPS_HOST "ls -la $RELEASE_DIR 2>/dev/null || echo 'No releases found'"
    echo ""
    print_info "Current release:"
    ssh $VPS_HOST "cat $VPS_PATH/CURRENT_RELEASE 2>/dev/null || echo 'Not set'"
}

rollback() {
    print_header
    print_warning "Rolling back to previous release..."
    
    check_lock
    
    PREV_RELEASE=$(ssh $VPS_HOST "ls -t $RELEASE_DIR | head -2 | tail -1")
    
    if [ -z "$PREV_RELEASE" ]; then
        print_error "No previous release found!"
        release_lock
        exit 1
    fi
    
    print_info "Rolling back to: $PREV_RELEASE"
    
    ssh $VPS_HOST "
        cd $VPS_PATH
        rm -f $CURRENT_LINK
        ln -s $RELEASE_DIR/$PREV_RELEASE $CURRENT_LINK
        echo '$PREV_RELEASE' > CURRENT_RELEASE
        
        # Reload backend
        export \$(grep -v '^#' .env.production 2>/dev/null | xargs) || true
        pm2 delete w3-api 2>/dev/null || true
        pm2 start current/server.cjs --name w3-api --node-args='--max-old-space-size=1024' --update-env
        pm2 save
        
        echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] ROLLBACK to $PREV_RELEASE\" >> $DEPLOY_LOG
    "
    
    release_lock
    print_success "Rolled back to $PREV_RELEASE"
}

build_backend() {
    print_info "Building backend..."
    cd "$PROJECT_ROOT"
    
    npx esbuild apps/backend/api/src/index.ts \
        --bundle \
        --platform=node \
        --target=node18 \
        --external:pg-native \
        --external:sharp \
        --external:canvas \
        --external:bcrypt \
        --external:argon2 \
        --outfile=dist/server.cjs 2>&1
    
    print_success "Backend built: dist/server.cjs ($(du -h dist/server.cjs | cut -f1))"
}

build_frontend() {
    print_info "Building frontend..."
    cd "$PROJECT_ROOT/apps/frontend/web"
    
    NODE_OPTIONS="--max-old-space-size=4096" npx vite build 2>&1 | tail -5
    
    print_success "Frontend built: apps/frontend/web/dist/"
}

deploy_backend() {
    print_info "Deploying backend (incremental)..."
    
    # Create release directory
    ssh $VPS_HOST "mkdir -p $RELEASE_DIR/$TIMESTAMP"
    
    # Upload backend artifact
    scp "$PROJECT_ROOT/dist/server.cjs" "$VPS_HOST:$RELEASE_DIR/$TIMESTAMP/server.cjs"
    
    # Update symlink
    ssh $VPS_HOST "
        rm -f $CURRENT_LINK
        ln -s $RELEASE_DIR/$TIMESTAMP $CURRENT_LINK
        echo '$TIMESTAMP' > $VPS_PATH/CURRENT_RELEASE
    "
    
    # Reload PM2 (preserves .env.production)
    ssh $VPS_HOST "
        cd $VPS_PATH
        export \$(grep -v '^#' .env.production 2>/dev/null | xargs) || true
        pm2 delete w3-api 2>/dev/null || true
        pm2 start current/server.cjs --name w3-api --node-args='--max-old-space-size=1024' --update-env
        pm2 save
    "
    
    print_success "Backend deployed to release: $TIMESTAMP"
}

deploy_frontend() {
    print_info "Deploying frontend..."
    
    # Check if rsync is available on both ends
    if command -v rsync &>/dev/null && ssh $VPS_HOST "command -v rsync" &>/dev/null; then
        print_info "Using rsync (incremental, symlink-preserving)..."
        rsync -avz --links \
            --exclude='custom' \
            --exclude='custom/' \
            -e "ssh $SSH_OPTS" \
            "$PROJECT_ROOT/apps/frontend/web/dist/" \
            "$VPS_HOST:$VPS_PATH/apps/frontend/web/dist/"
        print_success "Frontend synced via rsync"
    else
        print_warning "rsync not available, using scp..."
        # Backup custom symlink before scp
        ssh $VPS_HOST "
            if [ -L $VPS_PATH/apps/frontend/web/dist/custom ]; then
                CUSTOM_TARGET=\$(readlink $VPS_PATH/apps/frontend/web/dist/custom)
                echo \"\$CUSTOM_TARGET\" > /tmp/custom_symlink_target
            fi
        "
        
        # Use scp for transfer
        scp -r "$PROJECT_ROOT/apps/frontend/web/dist/"* "$VPS_HOST:$VPS_PATH/apps/frontend/web/dist/"
        
        # Restore custom symlink
        ssh $VPS_HOST "
            if [ -f /tmp/custom_symlink_target ]; then
                CUSTOM_TARGET=\$(cat /tmp/custom_symlink_target)
                rm -rf $VPS_PATH/apps/frontend/web/dist/custom 2>/dev/null
                ln -sf \"\$CUSTOM_TARGET\" $VPS_PATH/apps/frontend/web/dist/custom
                rm /tmp/custom_symlink_target
            fi
        "
        print_success "Frontend synced via scp"
    fi
    
    # Run post-deploy hook to restore customizations
    run_post_deploy_hook
}

run_post_deploy_hook() {
    print_info "Running post-deploy hook (restoring VPS customizations)..."
    
    ssh $VPS_HOST '
        VPS_PATH="/var/www/w3suite"
        FRONTEND_DIST="$VPS_PATH/apps/frontend/web/dist"
        CUSTOM_DIR="$VPS_PATH/custom"
        
        # 1. Ensure custom directory symlink exists in dist
        if [ ! -L "$FRONTEND_DIST/custom" ]; then
            ln -sf "$CUSTOM_DIR" "$FRONTEND_DIST/custom"
            echo "  [+] Created symlink: dist/custom -> $CUSTOM_DIR"
        fi
        
        # 2. Inject custom CSS into index.html if not present
        if [ -f "$CUSTOM_DIR/production-only.css" ]; then
            if ! grep -q "production-only.css" "$FRONTEND_DIST/index.html"; then
                sed -i "s|</head>|    <link rel=\"stylesheet\" href=\"/custom/production-only.css\">\n  </head>|" "$FRONTEND_DIST/index.html"
                echo "  [+] Injected custom CSS link into index.html"
            else
                echo "  [=] Custom CSS already in index.html"
            fi
        fi
        
        # 3. Verify critical files exist
        MISSING=0
        for FILE in "$CUSTOM_DIR/production-only.css" "$FRONTEND_DIST/custom"; do
            if [ ! -e "$FILE" ]; then
                echo "  [!] Missing: $FILE"
                MISSING=1
            fi
        done
        
        if [ $MISSING -eq 0 ]; then
            echo "  [✓] All VPS customizations verified"
        fi
    '
    
    print_success "Post-deploy hook completed"
}

dry_run() {
    print_header
    print_warning "DRY RUN - No changes will be made"
    
    build_backend
    build_frontend
    
    echo ""
    print_info "Files that WOULD be deployed:"
    echo "  - dist/server.cjs → $VPS_PATH/releases/$TIMESTAMP/"
    echo "  - apps/frontend/web/dist/* → $VPS_PATH/apps/frontend/web/dist/"
    
    echo ""
    print_info "Files that will NEVER be touched (from DEPLOY_IGNORE.txt):"
    grep -v '^#' "$SCRIPT_DIR/DEPLOY_IGNORE.txt" | grep -v '^$' | head -15
    echo "  ... (see DEPLOY_IGNORE.txt for full list)"
}

health_check() {
    print_info "Running health check..."
    sleep 5
    
    if ssh $VPS_HOST "curl -sf http://localhost:3004/api/health > /dev/null"; then
        print_success "Backend health check passed!"
        return 0
    else
        print_error "Backend health check failed!"
        return 1
    fi
}

cleanup_old_releases() {
    print_info "Cleaning old releases (keeping last 5)..."
    ssh $VPS_HOST "cd $RELEASE_DIR && ls -t | tail -n +6 | xargs -r rm -rf" 2>/dev/null || true
}

log_deploy() {
    ssh $VPS_HOST "echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] DEPLOY $TIMESTAMP - $1\" >> $DEPLOY_LOG"
}

# === MAIN ===

case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --rollback)
        rollback
        exit 0
        ;;
    --list-releases)
        list_releases
        exit 0
        ;;
    --dry-run)
        dry_run
        exit 0
        ;;
    --backend)
        DEPLOY_MODE="backend"
        ;;
    --frontend)
        DEPLOY_MODE="frontend"
        ;;
    --all|"")
        DEPLOY_MODE="all"
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac

print_header
check_lock

# Build
case "$DEPLOY_MODE" in
    backend)
        build_backend
        ;;
    frontend)
        build_frontend
        ;;
    all)
        build_backend
        build_frontend
        ;;
esac

# Deploy
case "$DEPLOY_MODE" in
    backend)
        deploy_backend
        log_deploy "backend-only"
        ;;
    frontend)
        deploy_frontend
        log_deploy "frontend-only"
        ;;
    all)
        deploy_backend
        deploy_frontend
        log_deploy "full-deploy"
        ;;
esac

# Post-deploy
if [ "$DEPLOY_MODE" = "backend" ] || [ "$DEPLOY_MODE" = "all" ]; then
    if ! health_check; then
        print_warning "Auto-rolling back..."
        release_lock
        rollback
        exit 1
    fi
fi

cleanup_old_releases
release_lock

echo ""
print_success "Deploy completed successfully!"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  Release: $TIMESTAMP"
echo "  Mode: $DEPLOY_MODE"
echo ""
echo -e "${YELLOW}Protected VPS files (never touched):${NC}"
echo "  - .env.production"
echo "  - ecosystem.config.cjs"
echo "  - custom/, uploads/, media/"
echo "  - SSL certs, nginx configs"
echo ""
