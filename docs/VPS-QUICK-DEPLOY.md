# W3 Suite VPS Quick Deployment Guide

## Current Fixes (2025-12-05)

This deployment includes critical fixes:

1. **OAuth2 JWT Fix**: JWT tokens now include `roles` and `email` fields for proper RBAC authorization
2. **Brand Interface DB Fix**: All dynamic imports converted to static imports for VPS bundle compatibility
3. **AI Agents Registry**: Added to API schema for direct database access

## Deployment Files

The VPS bundle is ready at: `dist-vps/server.js` (81.0mb)

## Manual Deployment Steps

### 1. Transfer Bundle to VPS

From your local machine or Replit shell:

```bash
# Option A: Using scp (if you have SSH key access)
scp dist-vps/server.js w3suite@82.165.16.223:/var/www/w3suite/dist/

# Option B: Using rsync
rsync -avz dist-vps/server.js w3suite@82.165.16.223:/var/www/w3suite/dist/

# Option C: Download from Replit
# 1. Download dist-vps/server.js from Replit Files panel
# 2. Upload to VPS using SFTP or web panel
```

### 2. SSH into VPS

```bash
ssh w3suite@82.165.16.223
# or
ssh root@82.165.16.223
```

### 3. Deploy on VPS

```bash
# Navigate to app directory
cd /var/www/w3suite

# Backup current bundle (optional but recommended)
cp dist/server.js dist/server.js.backup

# Copy new bundle (if transferred to a temp location)
mv /tmp/server.js dist/server.js

# Set correct ownership
chown w3suite:w3suite dist/server.js

# Restart the application
pm2 restart w3-api
# or restart all services
pm2 restart all

# Check logs
pm2 logs w3-api --lines 50
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3004/api/health

# Check JWT includes roles (test login)
# After login, decode JWT to verify roles field is present
```

### 5. User Action Required

**IMPORTANT**: Users must logout and login again after deployment to get new JWT tokens with roles included. Old tokens will continue to cause 403 errors until refreshed.

## Troubleshooting

### 500 Errors on /api/ai/agents

If you see 500 errors on AI agents endpoint:
- Verify `brand_interface.ai_agents_registry` table exists in database
- Run the seed script if needed:
  ```bash
  cd /var/www/w3suite
  node scripts/seed-ai-agents.js
  ```

### 403 Forbidden Errors

After deployment, if users still get 403:
1. Clear browser cookies/storage
2. Logout and login again
3. Verify new JWT contains `roles` field (decode token at jwt.io)

### PM2 Commands

```bash
pm2 status           # View all processes
pm2 logs w3-api      # View API logs
pm2 restart w3-api   # Restart API only
pm2 restart all      # Restart all services
pm2 save             # Save current process list
```

## VPS SSH Credentials

If SSH access fails, verify:
1. Correct username (w3suite or root)
2. Correct password stored in VPS_SSH_PASSWORD secret
3. SSH service is running on VPS
4. Firewall allows port 22

Contact system administrator if credentials are not working.
