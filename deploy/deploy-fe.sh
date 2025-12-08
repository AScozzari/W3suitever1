#!/bin/bash
set -eo pipefail

# ============================================================
# W3 Suite - Frontend Deploy Script
# ============================================================
# Deploys ONLY the frontend (web app) to VPS
# No restart needed - static files served by Nginx
# ============================================================

VPS_HOST="root@82.165.16.223"
VPS_PATH="/var/www/w3suite"
FE_DIST="$VPS_PATH/apps/frontend/web/dist"
SSH_KEY="$HOME/.ssh/vps_deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  W3 Suite - Frontend Deploy${NC}"
echo -e "${BLUE}  Release: $TIMESTAMP${NC}"
echo -e "${BLUE}============================================================${NC}"

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    echo -e "${YELLOW}   Run: ssh-keygen -t ed25519 -f ~/.ssh/vps_deploy${NC}"
    exit 1
fi

# 1. Build frontend
echo -e "\n${YELLOW}📦 Building frontend...${NC}"
cd "$(dirname "$0")/../apps/frontend/web"
npx vite build

FILE_COUNT=$(ls -1 dist/assets | wc -l)
echo -e "${GREEN}✅ Build completed: $FILE_COUNT asset files${NC}"

# 2. Backup current frontend on VPS (optional)
echo -e "\n${YELLOW}💾 Backing up current frontend...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "
    if [ -d $FE_DIST/assets ]; then
        cp -r $FE_DIST/assets $FE_DIST/assets.backup.$TIMESTAMP 2>/dev/null || true
    fi
"
echo -e "${GREEN}✅ Backup created${NC}"

# 3. Upload frontend
echo -e "\n${YELLOW}📤 Uploading frontend to VPS...${NC}"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r dist/* $VPS_HOST:$FE_DIST/
echo -e "${GREEN}✅ Upload completed${NC}"

# 4. Set permissions
echo -e "\n${YELLOW}🔐 Setting permissions...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "
    chown -R w3suite:w3suite $FE_DIST
    chmod -R 755 $FE_DIST
    echo \"$TIMESTAMP - Frontend deploy\" >> $VPS_PATH/DEPLOY_HISTORY.log
"
echo -e "${GREEN}✅ Permissions set${NC}"

# 5. Cleanup old backups (keep last 3)
echo -e "\n${YELLOW}🧹 Cleaning old backups...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "
    cd $FE_DIST
    ls -d assets.backup.* 2>/dev/null | sort -r | tail -n +4 | xargs -r rm -rf
"
echo -e "${GREEN}✅ Old backups cleaned${NC}"

# 6. Verify deployment
echo -e "\n${YELLOW}🏥 Verifying deployment...${NC}"
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "curl -sf -o /dev/null -w '%{http_code}' http://localhost/staging/login" | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend accessible!${NC}"
else
    echo -e "${YELLOW}⚠️ Could not verify - check manually${NC}"
fi

echo -e "\n${BLUE}============================================================${NC}"
echo -e "${GREEN}🎉 Frontend deploy completed: $TIMESTAMP${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "\n${YELLOW}💡 Note: Users should do Ctrl+F5 to see new version${NC}"
