#!/bin/bash

echo "🔥 W3 Suite Enterprise - Starting All Services..."
echo "=================================================="
echo "🌐 Enterprise Reverse Proxy: http://localhost:5000"
echo "📱 W3 Suite Frontend: http://localhost:3000"
echo "🔧 W3 Suite Backend: http://localhost:3101"
echo "🏢 Brand Interface Frontend: http://localhost:3001"
echo "⚡ Brand Interface Backend: http://localhost:3102"
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

# Fixed port configuration - no alternatives
export W3_FRONTEND_PORT=3000
export W3_BACKEND_PORT=3004
export BRAND_FRONTEND_PORT=3001
export BRAND_BACKEND_PORT=3002
export PROXY_PORT=5000

echo "🔧 Environment Configuration:"
echo "  NODE_ENV: $NODE_ENV"
echo "  JWT_SECRET: [CONFIGURED]"
echo "  Service Ports: W3 FE:$W3_FRONTEND_PORT | W3 BE:$W3_BACKEND_PORT | Brand FE:$BRAND_FRONTEND_PORT | Brand BE:$BRAND_BACKEND_PORT"
echo "  Reverse Proxy: $PROXY_PORT"
echo ""

# Function to kill processes on specific port
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null)
  if [ ! -z "$pids" ]; then
    echo "🔪 Killing processes on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

# Kill processes on required ports
echo "🔪 Freeing required ports..."
kill_port 3000  # W3 Frontend
kill_port 3001  # Brand Frontend
kill_port 3002  # Brand Backend
kill_port 3004  # W3 Backend
kill_port 5000  # Reverse Proxy

echo "✅ All required ports freed"

echo ""
echo "🚀 Starting all enterprise services in proper order..."

# Start backends first, then frontends, then proxy
echo "🔥 Phase 1: Starting Backend Services..."
npx concurrently \
  --names "W3-Backend,Brand-Backend" \
  --colors "cyan,yellow" \
  --prefix "[{name}]" \
  --kill-others-on-fail \
  --success "first" \
  "cd apps/backend/api && NODE_ENV=development JWT_SECRET=w3suite-dev-secret-2025 tsx src/index.ts" \
  "cd apps/backend/brand-api && NODE_ENV=development tsx src/index.ts" &

# Wait for backends to start
sleep 8

echo "🎨 Phase 2: Starting Frontend Services..."
npx concurrently \
  --names "W3-Frontend,Brand-Frontend" \
  --colors "blue,magenta" \
  --prefix "[{name}]" \
  --kill-others-on-fail \
  --success "first" \
  "cd apps/frontend/web && npm run dev" \
  "cd apps/frontend/brand-web && npm run dev" &

# Wait for frontends to start
sleep 5

echo "🌐 Phase 3: Starting Reverse Proxy..."
cd apps/reverse-proxy && NODE_ENV=development tsx src/index.ts