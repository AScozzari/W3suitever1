#!/bin/bash
set -e

echo "=== Fixing Build Process ==="
cd /var/www/w3suite
export $(cat .env.production | grep -v "^#" | xargs)
export PATH="$PATH:/var/www/w3suite/node_modules/.bin"

echo ""
echo "Step 1: Building Backend API..."
npx esbuild apps/backend/api/src/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo ""
echo "Step 2: Building W3 Frontend..."
cd apps/frontend/web
npm i --legacy-peer-deps
npx tsc
npx vite build
cd /var/www/w3suite

echo ""
echo "Step 3: Building Brand Frontend..."
cd apps/frontend/brand-web
npm i --legacy-peer-deps
npx tsc 2>/dev/null || true
npx vite build
cd /var/www/w3suite

echo ""
echo "Step 4: Configuring Nginx..."
cat > /etc/nginx/sites-available/w3suite << 'NGINX'
upstream w3_api {
    server 127.0.0.1:3004;
    keepalive 64;
}

server {
    listen 80;
    server_name 82.165.16.223 _;
    root /var/www/w3suite/apps/frontend/web/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location /api/ {
        proxy_pass http://w3_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /brand/ {
        alias /var/www/w3suite/apps/frontend/brand-web/dist/;
        try_files $uri $uri/ /brand/index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/w3suite /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "Step 5: Setting up PM2..."
cat > /var/www/w3suite/ecosystem.config.js << 'PM2'
module.exports = {
  apps: [{
    name: "w3-api",
    script: "dist/index.js",
    cwd: "/var/www/w3suite",
    instances: 2,
    exec_mode: "cluster",
    autorestart: true,
    max_memory_restart: "1G",
    env: { NODE_ENV: "production", PORT: 3004 }
  }]
};
PM2

chown -R w3suite:w3suite /var/www/w3suite
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
pm2 list
