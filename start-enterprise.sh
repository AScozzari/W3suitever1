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

# NUCLEAR process cleanup - multiple rounds with escalation
echo "💥 Starting NUCLEAR process cleanup..."

# Round 1: Kill by name
echo "🔪 Round 1: Kill by process name"
killall -9 node 2>/dev/null || true
killall -9 tsx 2>/dev/null || true  
killall -9 vite 2>/dev/null || true
killall -9 concurrently 2>/dev/null || true
sleep 2

# Round 2: Kill by pattern
echo "🔪 Round 2: Kill by pattern matching"
pkill -9 -f "tsx" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "node.*tsx" 2>/dev/null || true
pkill -9 -f "node.*vite" 2>/dev/null || true
pkill -9 -f "concurrently" 2>/dev/null || true
pkill -9 -f "apps/" 2>/dev/null || true
sleep 2

# Round 3: Kill by port patterns in process list
echo "🔪 Round 3: Kill by port patterns"
ps aux | grep -E "(tsx|vite|node.*3[0-9]{3}|node.*5000|:3000|:3001|:3002|:3004|:5000)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
sleep 2

# Round 4: Kill anything that looks like our services
echo "🔪 Round 4: Kill W3 Suite processes"
ps aux | grep -E "(w3suite|brand-api|reverse-proxy)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
sleep 3

echo "✅ Process cleanup completed"

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

# Function to NUCLEAR kill processes on specific port  
kill_port() {
  local port=$1
  echo "💥 NUCLEAR kill for port $port..."
  
  # Method 1: Direct lsof kill with force
  echo "  🔪 Method 1: Direct lsof kill"
  lsof -ti :$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  
  # Method 2: Find and kill by port pattern in process list
  echo "  🔪 Method 2: Process pattern kill"
  ps aux | grep -E ":$port|$port.*node|tsx.*$port" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
  
  # Method 3: netstat and kill
  echo "  🔪 Method 3: Netstat kill"
  netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | grep -E '^[0-9]+$' | xargs -r kill -9 2>/dev/null || true
  
  # Method 4: fuser aggressive kill
  echo "  🔪 Method 4: Fuser kill"
  fuser -k -9 $port/tcp 2>/dev/null || true
  
  # Method 5: killall by common process names for the port
  echo "  🔪 Method 5: Killall by name"
  killall -9 node 2>/dev/null || true
  killall -9 tsx 2>/dev/null || true
  killall -9 vite 2>/dev/null || true
  
  # Wait and check multiple times
  for check in 1 2 3 4 5; do
    sleep 1
    if ! lsof -ti :$port >/dev/null 2>&1; then
      echo "  ✅ Port $port freed after $check attempts"
      return 0
    fi
    echo "  🔄 Check $check: Port $port still occupied, retrying..."
    lsof -ti :$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  done
  
  # Final status
  if lsof -ti :$port >/dev/null 2>&1; then
    echo "  💀 Port $port STUBBORNLY OCCUPIED - continuing anyway"
    lsof -ti :$port 2>/dev/null || echo "    (no processes found)"
  else
    echo "  ✅ Port $port successfully freed"
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