# W3 Suite VPS Production Deployment Guide

## Overview

This guide covers deploying W3 Suite to a VPS (Virtual Private Server) with:
- **Production configuration** with OAuth2/JWT authentication
- **Multi-tenant architecture** with PostgreSQL RLS
- **System nginx** as reverse proxy (not embedded)
- **PM2** for process management

## Architecture

### Environment Separation

| Environment | Nginx Mode | Port | Purpose |
|-------------|-----------|------|---------|
| Replit (Development) | Embedded | 5000 | Staging, testing |
| VPS (Production) | System | 80/443 | Production |

### Services

| Service | Port | Description |
|---------|------|-------------|
| W3 Suite Frontend | 3000 | Main tenant application |
| Brand Interface Frontend | 3001 | HQ management portal |
| W3 Suite API | 3004 | Main backend API |
| Brand Interface API | 3002 | Brand management API |
| Voice Gateway (WS) | 3005 | AI Voice WebSocket |
| Voice Gateway (HTTP) | 3105 | Voice API endpoints |

## Prerequisites

### VPS Requirements
- Ubuntu 22.04+ or Debian 12+
- Node.js 20.x (via nvm)
- PostgreSQL 16+
- Redis 7+ (for async workflows)
- Nginx 1.18+
- 4GB+ RAM recommended

### Install Dependencies

```bash
# Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# PM2 and tsx globally
npm install -g pm2 tsx

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Redis
sudo apt install redis-server

# Nginx
sudo apt install nginx
```

## Environment Variables

### Required Production Variables

Create `/home/app/.env.production`:

```env
# Core Settings
NODE_ENV=production
AUTH_MODE=oauth2
DISABLE_EMBEDDED_NGINX=true

# Ports
PORT=3004
BRAND_BACKEND_PORT=3002
WS_PORT=3005
HTTP_PORT=3105

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/w3suite
BRAND_DATABASE_URL=postgresql://user:password@localhost:5432/w3suite

# Redis
REDIS_URL=redis://localhost:6379

# Security (generate secure values!)
JWT_SECRET=<generate-64-char-secret>
SESSION_SECRET=<generate-64-char-secret>

# OAuth2 Configuration
OAUTH2_ISSUER=https://your-identity-provider
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret

# VoIP (if using EDGVoIP integration)
EDGVOIP_API_URL=https://api.edgvoip.com
```

### Generate Secure Secrets

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32
```

## Deployment Steps

### 1. Clone Repository

```bash
cd /home/app
git clone https://github.com/your-org/w3-suite.git
cd w3-suite
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE w3suite;
CREATE USER w3user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE w3suite TO w3user;
\q

# Apply schema
npm run db:push
```

### 4. Configure Nginx

```bash
# Copy configuration
sudo cp nginx/vps-production.conf /etc/nginx/sites-available/w3suite

# Edit SSL certificate paths
sudo nano /etc/nginx/sites-available/w3suite

# Enable site
sudo ln -s /etc/nginx/sites-available/w3suite /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Start Services

```bash
# Make script executable
chmod +x scripts/start-production.sh

# Start all services
./scripts/start-production.sh start
```

### 6. Enable PM2 Startup

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

## SSL/HTTPS Setup

### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### Option B: Custom Certificate

Update paths in `/etc/nginx/sites-available/w3suite`:

```nginx
ssl_certificate /path/to/fullchain.pem;
ssl_certificate_key /path/to/privkey.pem;
```

## Management Commands

```bash
# Start all services
./scripts/start-production.sh start

# Stop all services
./scripts/start-production.sh stop

# Restart all services
./scripts/start-production.sh restart

# View status
./scripts/start-production.sh status

# View logs
./scripts/start-production.sh logs

# Build frontends only
./scripts/start-production.sh build

# Reload nginx
./scripts/start-production.sh nginx
```

## PM2 Commands

```bash
# View all processes
pm2 status

# View logs for specific service
pm2 logs w3-api

# Restart specific service
pm2 restart w3-api

# Monitor resources
pm2 monit
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
pm2 logs w3-api --lines 100

# Check port in use
sudo lsof -i :3004
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Change default database password
- [ ] Generate secure JWT_SECRET and SESSION_SECRET
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall (ufw)
- [ ] Disable password SSH authentication
- [ ] Set up fail2ban
- [ ] Configure log rotation
- [ ] Set up monitoring (optional)

## Monitoring

### PM2 Keymetrics (Optional)

```bash
pm2 link <public-key> <secret-key>
pm2 plus
```

### Health Checks

```bash
# W3 Suite API
curl http://localhost:3004/api/health

# Brand API
curl http://localhost:3002/brand-api/health

# Voice Gateway
curl http://localhost:3105/health

# Nginx (external)
curl http://localhost/health
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /home/app/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/home/app/backups
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > $BACKUP_DIR/w3suite_$DATE.sql
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /home/app/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/app/backup.sh
```

## Updates

### Deploying Updates

```bash
cd /home/app/w3-suite

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild frontends
./scripts/start-production.sh build

# Restart services
./scripts/start-production.sh restart
```
