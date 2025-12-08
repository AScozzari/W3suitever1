# W3 Suite - Production Deployment Guide

## 📋 Overview

This folder contains all scripts needed to deploy W3 Suite on a production VPS.

## 🖥️ VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

## 📁 Scripts

| Script | Description |
|--------|-------------|
| `vps-setup.sh` | Initial server setup (run once) |
| `deploy.sh` | Deploy/update application |
| `ssl-setup.sh` | Configure SSL certificates |
| `backup.sh` | Backup database and files |
| `monitoring.sh` | System monitoring dashboard |

## 🚀 Quick Start

### 1. Prepare VPS

```bash
# SSH into your server
ssh root@your-server-ip

# Download scripts
git clone https://github.com/your-repo/w3suite.git /tmp/w3suite-setup
cd /tmp/w3suite-setup/deploy

# Make scripts executable
chmod +x *.sh
```

### 2. Initial Setup

```bash
# Edit configuration in vps-setup.sh
nano vps-setup.sh
# Change DOMAIN="your-domain.com"

# Run setup
sudo ./vps-setup.sh
```

**IMPORTANT:** Save the database credentials shown at the end!

### 3. Configure DNS

Point your domain to your server IP:
```
A    @              → your-server-ip
A    www            → your-server-ip
```

### 4. Setup SSL

```bash
sudo ./ssl-setup.sh your-domain.com your-email@example.com
```

### 5. Deploy Application

```bash
# Option A: From Git repository
sudo ./deploy.sh https://github.com/your-org/w3suite.git main

# Option B: Upload manually, then
sudo ./deploy.sh
```

## 🔧 Configuration

### Environment Variables

Edit `/var/www/w3suite/.env.production`:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/w3suite_production
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-secret-key
AUTH_MODE=oauth2
APP_URL=https://your-domain.com

# Email (choose one)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-key
EMAIL_FROM=noreply@your-domain.com

# Or AWS SES
EMAIL_PROVIDER=aws
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=eu-west-1
EMAIL_FROM=noreply@your-domain.com

# VoIP (optional)
EDGVOIP_API_URL=https://your-pbx.edgvoip.it/api/v2
EDGVOIP_API_KEY=your-api-key
```

## 📊 Monitoring

### View Application Status
```bash
./monitoring.sh
```

### PM2 Commands
```bash
pm2 status              # View all processes
pm2 logs                # View all logs
pm2 logs w3suite-backend # View specific logs
pm2 monit               # Real-time monitoring
pm2 restart all         # Restart all
pm2 reload all          # Zero-downtime reload
```

### View Logs
```bash
# Application logs
tail -f /var/log/w3suite/backend-out.log
tail -f /var/log/w3suite/backend-error.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
journalctl -u postgresql -f
```

## 💾 Backups

### Manual Backup
```bash
sudo ./backup.sh
```

### Automatic Backups (Cron)
```bash
# Edit crontab
sudo crontab -e

# Add daily backup at 3 AM
0 3 * * * /var/www/w3suite/deploy/backup.sh >> /var/log/w3suite/backup.log 2>&1
```

### Restore Database
```bash
pg_restore -d w3suite_production /var/backups/w3suite/db_YYYYMMDD_HHMMSS.dump
```

## 🔒 Security Checklist

- [ ] Change default SSH port (edit `/etc/ssh/sshd_config`)
- [ ] Disable root SSH login
- [ ] Setup SSH key authentication
- [ ] Configure fail2ban
- [ ] Enable automatic security updates
- [ ] Review firewall rules regularly
- [ ] Keep SSL certificates renewed (auto via certbot)
- [ ] Rotate JWT secrets periodically
- [ ] Monitor for unusual activity

### Optional: SSH Hardening
```bash
# Install fail2ban
sudo apt install fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

## 🔄 Updates

### Update Application
```bash
cd /var/www/w3suite/deploy
sudo ./deploy.sh
```

### Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Update Node.js
```bash
# Check current version
node -v

# Update to latest LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 🆘 Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs w3suite-backend --lines 100

# Check if ports are in use
sudo lsof -i :3004
sudo lsof -i :3000

# Restart from scratch
pm2 delete all
pm2 start ecosystem.config.js
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U w3suite_user -d w3suite_production -h localhost

# Check logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Nginx Errors
```bash
# Test config
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log

# Reload after fixing
sudo systemctl reload nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## 📞 Support

For issues specific to W3 Suite, check:
- Application logs in `/var/log/w3suite/`
- PM2 logs via `pm2 logs`
- Nginx logs in `/var/log/nginx/`

## 📜 License

W3 Suite is proprietary software. See LICENSE file for details.
