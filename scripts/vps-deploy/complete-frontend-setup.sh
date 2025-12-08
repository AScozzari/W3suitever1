#!/bin/bash
set -e

cd /var/www/w3suite
export $(cat .env.production | grep -v "^#" | xargs)

echo "=== W3 Frontend Full Setup ==="
cd apps/frontend/web

rm -rf node_modules package-lock.json
npm i --legacy-peer-deps

echo ""
echo "Building..."
npx vite build

echo ""
ls -la dist/

cd /var/www/w3suite

echo ""
echo "=== Brand Frontend Full Setup ==="
cd apps/frontend/brand-web

rm -rf node_modules package-lock.json
npm i --legacy-peer-deps

echo ""
echo "Building..."
npx vite build

echo ""
ls -la dist/

cd /var/www/w3suite

echo ""
echo "=== Configuring Nginx ==="
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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
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
echo "=== Starting PM2 ==="
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
echo "=== COMPLETE ==="
pm2 list
echo ""
echo "http://82.165.16.223"
