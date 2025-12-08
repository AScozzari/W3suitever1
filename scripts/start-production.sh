#!/bin/bash
# ==============================================================================
# W3 Suite VPS Production Startup Script
# ==============================================================================
# 
# Usage: ./scripts/start-production.sh [command]
# 
# Commands:
#   start     - Build and start all services with PM2
#   stop      - Stop all PM2 services
#   restart   - Restart all PM2 services
#   status    - Show status of all services
#   logs      - Show logs from all services
#   build     - Build frontends for production
#   nginx     - Reload nginx configuration
#
# Requirements:
# - Node.js 20+ with npm
# - PM2 installed globally (npm install -g pm2)
# - tsx installed globally (npm install -g tsx)
# - Nginx installed and configured
#
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} W3 Suite VPS Production Manager${NC}"
echo -e "${BLUE}========================================${NC}"

# Check dependencies
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js not found. Please install Node.js 20+${NC}"
        exit 1
    fi
    
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}PM2 not found. Installing...${NC}"
        npm install -g pm2
    fi
    
    if ! command -v tsx &> /dev/null; then
        echo -e "${RED}tsx not found. Installing...${NC}"
        npm install -g tsx
    fi
    
    echo -e "${GREEN}All dependencies OK${NC}"
}

# Build frontend applications
build_frontends() {
    echo -e "${YELLOW}Building frontend applications...${NC}"
    
    echo "  -> Building W3 Suite Frontend..."
    cd "$PROJECT_ROOT/apps/frontend/web"
    npm run build
    
    echo "  -> Building Brand Interface Frontend..."
    cd "$PROJECT_ROOT/apps/frontend/brand-web"
    npm run build
    
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}Frontend builds complete${NC}"
}

# Start all services with PM2
start_services() {
    echo -e "${YELLOW}Starting all services with PM2...${NC}"
    
    # Stop existing services first
    pm2 delete all 2>/dev/null || true
    
    # Start services with production environment
    pm2 start ecosystem.config.cjs --env production
    
    # Save PM2 process list
    pm2 save
    
    echo -e "${GREEN}All services started${NC}"
    pm2 status
}

# Stop all services
stop_services() {
    echo -e "${YELLOW}Stopping all PM2 services...${NC}"
    pm2 stop all
    echo -e "${GREEN}All services stopped${NC}"
}

# Restart all services
restart_services() {
    echo -e "${YELLOW}Restarting all PM2 services...${NC}"
    pm2 restart all
    echo -e "${GREEN}All services restarted${NC}"
    pm2 status
}

# Show service status
show_status() {
    echo -e "${YELLOW}PM2 Service Status:${NC}"
    pm2 status
    
    echo ""
    echo -e "${YELLOW}Port Usage:${NC}"
    echo "  - W3 API:        http://localhost:3004"
    echo "  - Brand API:     http://localhost:3002"
    echo "  - W3 Frontend:   http://localhost:3000"
    echo "  - Brand Frontend: http://localhost:3001"
    echo "  - Voice Gateway: http://localhost:3005 (WS), http://localhost:3105 (HTTP)"
    echo "  - Nginx Proxy:   http://localhost:80, https://localhost:443"
}

# Show logs
show_logs() {
    echo -e "${YELLOW}Showing PM2 logs (Ctrl+C to exit)...${NC}"
    pm2 logs
}

# Reload nginx
reload_nginx() {
    echo -e "${YELLOW}Reloading nginx configuration...${NC}"
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}Nginx reloaded${NC}"
}

# Main script
case "${1:-start}" in
    start)
        check_dependencies
        build_frontends
        start_services
        show_status
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    build)
        build_frontends
        ;;
    nginx)
        reload_nginx
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|build|nginx}"
        exit 1
        ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Done!${NC}"
