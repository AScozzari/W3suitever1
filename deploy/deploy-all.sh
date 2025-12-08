#!/bin/bash
set -eo pipefail

# ============================================================
# W3 Suite - Full Deploy Script
# ============================================================
# Deploys BOTH backend and frontend to VPS
# Runs deploy-be.sh then deploy-fe.sh in sequence
# ============================================================

SCRIPT_DIR="$(dirname "$0")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           W3 Suite - Full Deploy                           ║${NC}"
echo -e "${CYAN}║           Release: $TIMESTAMP                       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

# Parse arguments
SKIP_BE=false
SKIP_FE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-be) SKIP_BE=true ;;
        --skip-fe) SKIP_FE=true ;;
        --be-only) SKIP_FE=true ;;
        --fe-only) SKIP_BE=true ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --skip-be    Skip backend deploy"
            echo "  --skip-fe    Skip frontend deploy"
            echo "  --be-only    Deploy only backend"
            echo "  --fe-only    Deploy only frontend"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

START_TIME=$(date +%s)

# Deploy Backend
if [ "$SKIP_BE" = false ]; then
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  STEP 1: Backend Deploy${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    bash "$SCRIPT_DIR/deploy-be.sh"
else
    echo -e "\n${YELLOW}⏭️ Skipping backend deploy${NC}"
fi

# Deploy Frontend
if [ "$SKIP_FE" = false ]; then
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  STEP 2: Frontend Deploy${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    bash "$SCRIPT_DIR/deploy-fe.sh"
else
    echo -e "\n${YELLOW}⏭️ Skipping frontend deploy${NC}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}✅ Full deploy completed in ${DURATION}s${NC}                         ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "\n${YELLOW}📋 What was deployed:${NC}"
[ "$SKIP_BE" = false ] && echo -e "   ✅ Backend (server.cjs)"
[ "$SKIP_FE" = false ] && echo -e "   ✅ Frontend (web app)"
echo -e "\n${YELLOW}📋 Files NEVER touched:${NC}"
echo -e "   🔒 .env.production"
echo -e "   🔒 .env"
echo -e "   🔒 ecosystem.config.cjs"
echo -e "\n${YELLOW}🔗 Test URL: http://82.165.16.223/staging/login${NC}"
