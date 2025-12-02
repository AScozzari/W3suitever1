#!/bin/bash
# =============================================================================
# W3 SUITE - SSL Certificate Setup
# Configures Let's Encrypt SSL certificates with auto-renewal
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get domain from argument or prompt
DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain (e.g., w3suite.example.com): " DOMAIN
fi

if [ -z "$EMAIL" ]; then
    read -p "Enter your email for SSL notifications: " EMAIL
fi

echo ""
echo "=============================================="
echo "   W3 SUITE - SSL Setup"
echo "=============================================="
echo ""
log_info "Domain: $DOMAIN"
log_info "Email: $EMAIL"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# =============================================================================
# Step 1: Create temporary Nginx config for domain verification
# =============================================================================
log_info "Step 1/4: Creating temporary Nginx config..."

# Create a simple HTTP-only config for initial verification
cat > /etc/nginx/sites-available/w3suite-temp <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 "Waiting for SSL setup...";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable temp config, disable main
rm -f /etc/nginx/sites-enabled/w3suite
ln -sf /etc/nginx/sites-available/w3suite-temp /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t && systemctl reload nginx
log_success "Temporary config active"

# =============================================================================
# Step 2: Obtain SSL Certificate
# =============================================================================
log_info "Step 2/4: Obtaining SSL certificate..."

mkdir -p /var/www/certbot

certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

log_success "SSL certificate obtained"

# =============================================================================
# Step 3: Update Nginx config with domain
# =============================================================================
log_info "Step 3/4: Updating Nginx configuration..."

# Update the main config with actual domain
sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/w3suite

# Remove temp config, enable main
rm -f /etc/nginx/sites-enabled/w3suite-temp
ln -sf /etc/nginx/sites-available/w3suite /etc/nginx/sites-enabled/

# Test and reload
nginx -t && systemctl reload nginx
log_success "Nginx configured with SSL"

# =============================================================================
# Step 4: Setup Auto-Renewal
# =============================================================================
log_info "Step 4/4: Setting up auto-renewal..."

# Create renewal hook
cat > /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh <<EOF
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh

# Test renewal
certbot renew --dry-run

log_success "Auto-renewal configured"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "   SSL Setup Complete!"
echo "=============================================="
echo ""
log_success "Your site is now secured with HTTPS!"
echo ""
echo "🔒 Certificate Details:"
certbot certificates 2>/dev/null | grep -A5 "$DOMAIN" || echo "   Certificate installed for $DOMAIN"
echo ""
echo "🔄 Auto-renewal: Enabled (runs twice daily via systemd)"
echo ""
echo "🌐 Your site is available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "📋 Useful Commands:"
echo "   certbot certificates      - View certificate details"
echo "   certbot renew --dry-run   - Test renewal"
echo "   certbot renew             - Force renewal"
echo ""
