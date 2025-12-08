#!/bin/bash
set -e

echo "================================================"
echo "W3 Suite Full Production Deployment"
echo "================================================"

cd /tmp
rm -rf pgvector 2>/dev/null || true

echo ""
echo "Step 1: Installing pgvector..."
apt-get update -qq
apt-get install -y postgresql-server-dev-16 build-essential git
git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git
cd pgvector
make && make install
sudo -u postgres psql -d w3suite_prod -c "CREATE EXTENSION IF NOT EXISTS vector;"
echo "pgvector installed"

echo ""
echo "Step 2: Installing dependencies..."
cd /var/www/w3suite
export $(cat .env.production | grep -v "^#" | xargs)
npm install --legacy-peer-deps

echo ""
echo "Step 3: Building applications..."
npm run build 2>&1 || true

cd apps/frontend/web
npm install --legacy-peer-deps
npm run build
cd /var/www/w3suite

cd apps/frontend/brand-web
npm install --legacy-peer-deps
npm run build
cd /var/www/w3suite

echo "All applications built"

echo ""
echo "Step 4: Running database migrations..."
npx drizzle-kit push 2>&1 || true

echo ""
echo "Step 5: Configuring Nginx..."

cat > /etc/nginx/sites-available/w3suite << 'NGINX'
upstream w3_api {
    server 127.0.0.1:3004;
    keepalive 64;
}

upstream w3_voice {
    server 127.0.0.1:3005;
    keepalive 32;
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

    location /voice-ws {
        proxy_pass http://w3_voice;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
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
echo "Step 6: Setting up PM2..."

cat > /var/www/w3suite/ecosystem.config.js << 'PM2'
module.exports = {
  apps: [
    {
      name: "w3-api",
      script: "dist/index.js",
      cwd: "/var/www/w3suite",
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "1G",
      env: { NODE_ENV: "production", PORT: 3004 }
    },
    {
      name: "w3-voice",
      script: "apps/voice-gateway/dist/index.js",
      cwd: "/var/www/w3suite",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: { NODE_ENV: "production", PORT: 3005, HTTP_PORT: 3105 }
    }
  ]
};
PM2

chown -R w3suite:w3suite /var/www/w3suite
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "================================================"
echo "DEPLOYMENT COMPLETE!"
echo "================================================"
pm2 list
echo ""
echo "Access: http://82.165.16.223"
