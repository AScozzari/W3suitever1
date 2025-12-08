#!/bin/bash
set -e

echo "================================================"
echo "🚀 W3 Suite FULL DEPLOYMENT"
echo "   Complete VPS Setup & Deployment"
echo "================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📍 Script directory: ${SCRIPT_DIR}"
echo ""

# Make all scripts executable
chmod +x ${SCRIPT_DIR}/*.sh

# ===========================================
# PHASE 1: Install Dependencies
# ===========================================
echo ""
echo "=========================================="
echo "🔧 PHASE 1: System Dependencies"
echo "=========================================="
bash ${SCRIPT_DIR}/install-dependencies.sh

# ===========================================
# PHASE 2: Setup Database
# ===========================================
echo ""
echo "=========================================="
echo "🐘 PHASE 2: Database Setup"
echo "=========================================="
bash ${SCRIPT_DIR}/setup-database.sh

# ===========================================
# PHASE 3: Deploy Application
# ===========================================
echo ""
echo "=========================================="
echo "📦 PHASE 3: Application Deployment"
echo "=========================================="
bash ${SCRIPT_DIR}/deploy-app.sh

# ===========================================
# PHASE 4: Configure Nginx
# ===========================================
echo ""
echo "=========================================="
echo "🌐 PHASE 4: Nginx Configuration"
echo "=========================================="
bash ${SCRIPT_DIR}/setup-nginx.sh

# ===========================================
# FINAL SUMMARY
# ===========================================
echo ""
echo "================================================"
echo "🎉 W3 SUITE DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "Your application is now running at:"
echo ""
echo "  🌐 Main App:        http://82.165.16.223/"
echo "  🏢 Brand Interface: http://82.165.16.223/brandinterface/"
echo "  🔌 API Health:      http://82.165.16.223/api/health"
echo ""
echo "Service Status:"
pm2 list
echo ""
echo "Database credentials: /var/www/w3suite/.db-credentials"
echo "Environment config:   /var/www/w3suite/.env.production"
echo ""
echo "Useful commands:"
echo "  pm2 logs           - View application logs"
echo "  pm2 status         - Check service status"
echo "  pm2 restart all    - Restart all services"
echo "  systemctl status nginx - Check Nginx status"
echo ""
