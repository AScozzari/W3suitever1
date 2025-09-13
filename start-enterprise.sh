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
pkill -9 -f "tsx" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "node.*3000" 2>/dev/null || true
pkill -9 -f "node.*3001" 2>/dev/null || true
pkill -9 -f "node.*3002" 2>/dev/null || true  
pkill -9 -f "node.*3004" 2>/dev/null || true
pkill -9 -f "node.*5000" 2>/dev/null || true
pkill -9 -f "concurrently" 2>/dev/null || true
sleep 3

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

# Function to aggressively kill processes on specific port
kill_port() {
  local port=$1
  
  # Method 1: lsof + kill
  local pids=$(lsof -ti :$port 2>/dev/null)
  if [ ! -z "$pids" ]; then
    echo "🔪 Killing processes on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
  fi
  
  # Method 2: netstat + kill (backup)
  local netstat_pids=$(netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | grep -E '^[0-9]+$' 2>/dev/null)
  if [ ! -z "$netstat_pids" ]; then
    echo "🔪 Netstat kill on port $port: $netstat_pids"
    echo "$netstat_pids" | xargs -r kill -9 2>/dev/null || true
  fi
  
  # Method 3: fuser (if available)
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -9 $port/tcp 2>/dev/null || true
  fi
  
  # Wait and verify
  sleep 2
  local remaining=$(lsof -ti :$port 2>/dev/null)
  if [ ! -z "$remaining" ]; then
    echo "⚠️  Port $port still has processes: $remaining"
    kill -9 $remaining 2>/dev/null || true
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