
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

# Stop any existing processes first
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

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

# Function to check if port is free
check_port() {
  local port=$1
  if lsof -i :$port >/dev/null 2>&1; then
    echo "❌ Port $port is occupied"
    return 1
  else
    echo "✅ Port $port is free"
    return 0
  fi
}

# Check critical ports
echo "🔍 Checking port availability..."
check_port 3000 || echo "  W3 Frontend will use alternative port"
check_port 3001 || echo "  Brand Frontend will use alternative port"  
check_port 3002 || exit 1
check_port 3004 || exit 1
check_port 5000 || exit 1

echo ""
echo "🚀 Starting all enterprise services in proper order..."

# Use concurrently with better error handling
npx concurrently \
  --names "W3-Backend,Brand-Backend,W3-Frontend,Brand-Frontend,ReverseProxy" \
  --colors "cyan,yellow,blue,magenta,green" \
  --prefix "[{name}]" \
  --restart-tries 3 \
  --restart-after 2000 \
  --kill-others-on-fail \
  "cd apps/backend/api && NODE_ENV=development JWT_SECRET=w3suite-dev-secret-2025 tsx src/index.ts" \
  "cd apps/backend/brand-api && NODE_ENV=development tsx src/index.ts" \
  "cd apps/frontend/web && npm run dev" \
  "cd apps/frontend/brand-web && npm run dev" \
  "sleep 5 && cd apps/reverse-proxy && NODE_ENV=development tsx src/index.ts"
