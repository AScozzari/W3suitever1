#!/bin/bash
set -eo pipefail

# ============================================================
# W3 Suite - Backend Deploy Script
# ============================================================
# Deploys ONLY the backend (server.cjs) to VPS
# NEVER overwrites: .env.production, .env, ecosystem.config.cjs
# ============================================================

VPS_HOST="root@82.165.16.223"
VPS_PATH="/var/www/w3suite"
RELEASE_DIR="$VPS_PATH/releases"
SSH_KEY="$HOME/.ssh/vps_deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  W3 Suite - Backend Deploy${NC}"
echo -e "${BLUE}  Release: $TIMESTAMP${NC}"
echo -e "${BLUE}============================================================${NC}"

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    echo -e "${YELLOW}   Run: ssh-keygen -t ed25519 -f ~/.ssh/vps_deploy${NC}"
    exit 1
fi

# 1. Build backend
echo -e "\n${YELLOW}📦 Building backend...${NC}"
cd "$(dirname "$0")/.."
npx esbuild apps/backend/api/src/index.ts \
    --bundle \
    --platform=node \
    --target=node18 \
    --external:pg-native \
    --external:sharp \
    --external:canvas \
    --outfile=dist/server.cjs

FILE_SIZE=$(du -h dist/server.cjs | cut -f1)
echo -e "${GREEN}✅ Build completed: dist/server.cjs ($FILE_SIZE)${NC}"

# 2. Create release directory on VPS
echo -e "\n${YELLOW}📁 Creating release directory on VPS...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "mkdir -p $RELEASE_DIR/$TIMESTAMP"

# 3. Upload artifact
echo -e "\n${YELLOW}📤 Uploading to VPS...${NC}"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no dist/server.cjs $VPS_HOST:$RELEASE_DIR/$TIMESTAMP/server.cjs
echo -e "${GREEN}✅ Upload completed${NC}"

# 4. Update symlink
echo -e "\n${YELLOW}🔗 Updating symlink...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "
    cd $VPS_PATH
    rm -f current
    ln -s $RELEASE_DIR/$TIMESTAMP current
    echo '$TIMESTAMP' > CURRENT_RELEASE
    echo \"$TIMESTAMP - Backend deploy\" >> DEPLOY_HISTORY.log
"
echo -e "${GREEN}✅ Symlink updated: current → releases/$TIMESTAMP${NC}"

# 5. Reload PM2 (preserves .env.production)
echo -e "\n${YELLOW}♻️ Restarting PM2...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "
    cd $VPS_PATH
    export \$(grep -v '^#' .env.production | xargs)
    pm2 delete w3-api 2>/dev/null || true
    pm2 start current/server.cjs --name w3-api --node-args='--max-old-space-size=1024' --update-env
    pm2 save
"
echo -e "${GREEN}✅ PM2 restarted${NC}"

# 6. Cleanup old releases (keep last 5)
echo -e "\n${YELLOW}🧹 Cleaning old releases...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "cd $RELEASE_DIR && ls -t | tail -n +6 | xargs -r rm -rf"
echo -e "${GREEN}✅ Old releases cleaned${NC}"

# 7. Health check
echo -e "\n${YELLOW}🏥 Health check...${NC}"
sleep 8
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $VPS_HOST "curl -sf http://localhost:3004/api/tenants/resolve?slug=staging > /dev/null"; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo -e "${YELLOW}   Check logs: ssh -i $SSH_KEY $VPS_HOST 'pm2 logs w3-api --lines 50'${NC}"
    exit 1
fi

echo -e "\n${BLUE}============================================================${NC}"
echo -e "${GREEN}🎉 Backend deploy completed: $TIMESTAMP${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "\n${YELLOW}📋 Files NEVER overwritten:${NC}"
echo -e "   - .env.production (secrets, DB, Redis)"
echo -e "   - .env (local overrides)"
echo -e "   - ecosystem.config.cjs (PM2 config)"
