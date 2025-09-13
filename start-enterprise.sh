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

# Ultra-aggressive process cleanup - multiple rounds
for round in 1 2 3; do
  echo "🔪 Cleanup round $round..."
  pkill -9 -f "tsx" 2>/dev/null || true
  pkill -9 -f "vite" 2>/dev/null || true
  pkill -9 -f "node.*tsx" 2>/dev/null || true
  pkill -9 -f "node.*vite" 2>/dev/null || true
  pkill -9 -f "concurrently" 2>/dev/null || true
  pkill -9 -f "apps/backend" 2>/dev/null || true
  pkill -9 -f "apps/frontend" 2>/dev/null || true
  pkill -9 -f "apps/reverse-proxy" 2>/dev/null || true
  
  # Kill by specific process patterns
  ps aux | grep -E "(tsx|vite|node.*3[0-9]{3}|node.*5000)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
  
  sleep 2
done

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

# Function to ultra-aggressively kill processes on specific port
kill_port() {
  local port=$1
  echo "🔪 Ultra-aggressive kill for port $port..."
  
  # Round 1: Standard methods
  for attempt in 1 2 3; do
    echo "  Attempt $attempt for port $port"
    
    # Method 1: lsof + kill
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
      echo "    lsof kill: $pids"
      echo "$pids" | xargs -r kill -9 2>/dev/null || true
    fi
    
    # Method 2: netstat + kill  
    local netstat_pids=$(netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | grep -E '^[0-9]+$' 2>/dev/null)
    if [ ! -z "$netstat_pids" ]; then
      echo "    netstat kill: $netstat_pids"
      echo "$netstat_pids" | xargs -r kill -9 2>/dev/null || true
    fi
    
    # Method 3: fuser
    if command -v fuser >/dev/null 2>&1; then
      fuser -k -9 $port/tcp 2>/dev/null || true
    fi
    
    # Method 4: ss command (modern alternative to netstat)
    if command -v ss >/dev/null 2>&1; then
      local ss_pids=$(ss -tulpn | grep ":$port " | sed 's/.*pid=\([0-9]*\).*/\1/' | grep -E '^[0-9]+$' 2>/dev/null)
      if [ ! -z "$ss_pids" ]; then
        echo "    ss kill: $ss_pids"
        echo "$ss_pids" | xargs -r kill -9 2>/dev/null || true
      fi
    fi
    
    sleep 1
    
    # Check if port is free
    if ! lsof -ti :$port >/dev/null 2>&1; then
      echo "  ✅ Port $port is now free"
      return 0
    fi
  done
  
  # Final verification
  local remaining=$(lsof -ti :$port 2>/dev/null)
  if [ ! -z "$remaining" ]; then
    echo "  ⚠️  Port $port STILL has processes after all attempts: $remaining"
    # Nuclear option
    echo "$remaining" | xargs -r kill -9 2>/dev/null || true
    sleep 2
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