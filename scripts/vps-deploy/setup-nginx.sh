#!/bin/bash
set -e

echo "================================================"
echo "🌐 W3 Suite Nginx Configuration"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

SERVER_IP="82.165.16.223"
APP_DIR="/var/www/w3suite"

# ===========================================
# 1. CREATE NGINX CONFIGURATION
# ===========================================
echo ""
echo "📝 Creating Nginx configuration..."

cat > /etc/nginx/sites-available/w3suite <<'NGINX_CONFIG'
# W3 Suite Production Configuration
# Reverse proxy for all services

upstream w3_api {
    server 127.0.0.1:3004;
    keepalive 64;
}

upstream w3_voice {
    server 127.0.0.1:3005;
    keepalive 32;
}

upstream w3_voice_http {
    server 127.0.0.1:3105;
    keepalive 32;
}

# Main server block
server {
    listen 80;
    listen [::]:80;
    server_name 82.165.16.223;  # Update with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Client body size (for file uploads)
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/w3suite.access.log;
    error_log /var/log/nginx/w3suite.error.log;

    # ===========================================
    # API Endpoints
    # ===========================================
    location /api/ {
        proxy_pass http://w3_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ===========================================
    # WebSocket for Notifications
    # ===========================================
    location /ws/ {
        proxy_pass http://w3_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # ===========================================
    # Voice Gateway WebSocket
    # ===========================================
    location /ws/voice/ {
        proxy_pass http://w3_voice;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # ===========================================
    # Voice Gateway HTTP Streaming
    # ===========================================
    location /voice/ {
        proxy_pass http://w3_voice_http;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # ===========================================
    # Brand Interface
    # ===========================================
    location /brandinterface/ {
        alias /var/www/w3suite/apps/frontend/brand-web/dist/;
        try_files $uri $uri/ /brandinterface/index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Brand Interface API (if separate)
    location /brand-api/ {
        proxy_pass http://w3_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # ===========================================
    # W3 Suite Frontend (Main App)
    # ===========================================
    location / {
        root /var/www/w3suite/apps/frontend/web/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINX_CONFIG

log_success "Nginx configuration created"

# ===========================================
# 2. ENABLE SITE
# ===========================================
echo ""
echo "🔗 Enabling site..."

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Enable w3suite site
ln -sf /etc/nginx/sites-available/w3suite /etc/nginx/sites-enabled/w3suite

log_success "Site enabled"

# ===========================================
# 3. TEST CONFIGURATION
# ===========================================
echo ""
echo "🧪 Testing Nginx configuration..."

nginx -t

if [ $? -eq 0 ]; then
    log_success "Nginx configuration valid"
else
    log_error "Nginx configuration has errors!"
    exit 1
fi

# ===========================================
# 4. RELOAD NGINX
# ===========================================
echo ""
echo "🔄 Reloading Nginx..."

systemctl reload nginx

log_success "Nginx reloaded"

# ===========================================
# SUMMARY
# ===========================================
echo ""
echo "================================================"
echo "✅ NGINX SETUP COMPLETE!"
echo "================================================"
echo ""
echo "Your W3 Suite is now accessible at:"
echo ""
echo "  🌐 Main App:        http://${SERVER_IP}/"
echo "  🏢 Brand Interface: http://${SERVER_IP}/brandinterface/"
echo "  🔌 API:             http://${SERVER_IP}/api/"
echo "  📞 Voice Gateway:   ws://${SERVER_IP}/ws/voice/"
echo ""
echo "To add SSL (HTTPS), run:"
echo "  apt-get install certbot python3-certbot-nginx"
echo "  certbot --nginx -d your-domain.com"
echo ""
