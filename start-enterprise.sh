#!/bin/bash

echo "🔥 W3 Suite Enterprise - Starting All Services..."
echo "=================================================="
echo "🌐 Enterprise Reverse Proxy: http://localhost:5000"
echo "📱 W3 Suite Frontend: http://localhost:3000"
echo "🔧 W3 Suite Backend: http://localhost:3004"
echo "🏢 Brand Interface Frontend: http://localhost:3001"
echo "⚡ Brand Interface Backend: http://localhost:3002"
echo "=================================================="
echo ""

# Export environment variables for consistent configuration
export NODE_ENV=${NODE_ENV:-development}
export JWT_SECRET=${JWT_SECRET:-w3suite-dev-secret-2025}
export PROXY_PORT=${PROXY_PORT:-5000}
export W3_FRONTEND_PORT=${W3_FRONTEND_PORT:-3000}
export W3_BACKEND_PORT=${W3_BACKEND_PORT:-3004}
export BRAND_FRONTEND_PORT=${BRAND_FRONTEND_PORT:-3001}
export BRAND_BACKEND_PORT=${BRAND_BACKEND_PORT:-3002}

echo "🔧 Environment Configuration:"
echo "  NODE_ENV: $NODE_ENV"
echo "  JWT_SECRET: [CONFIGURED]"
echo "  Service Ports: W3 FE:$W3_FRONTEND_PORT | W3 BE:$W3_BACKEND_PORT | Brand FE:$BRAND_FRONTEND_PORT | Brand BE:$BRAND_BACKEND_PORT"
echo "  Reverse Proxy: $PROXY_PORT"
echo ""

# Use concurrently to start all services with proper naming and colors
echo "🚀 Starting all enterprise services..."
npx concurrently \
  --names "W3-Frontend,W3-Backend,Brand-Frontend,Brand-Backend,ReverseProxy" \
  --colors "blue,cyan,magenta,yellow,green" \
  --prefix "[{name}]" \
  --kill-others-on-fail \
  "cd apps/frontend/web && npm run dev" \
  "cd apps/backend/api && NODE_ENV=development JWT_SECRET=w3suite-dev-secret-2025 tsx src/index.ts" \
  "cd apps/frontend/brand-web && npm run dev" \
  "cd apps/backend/brand-api && NODE_ENV=development tsx src/index.ts" \
  "cd apps/reverse-proxy && NODE_ENV=development tsx src/index.ts"