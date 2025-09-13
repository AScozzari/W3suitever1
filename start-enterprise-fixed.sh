#!/bin/bash

echo "🔥 W3 Suite Enterprise - Starting All Services..."
echo "=================================================="
echo "🌐 Enterprise Reverse Proxy: http://localhost:6000"
echo "📱 W3 Suite Frontend: http://localhost:3000"
echo "🔧 W3 Suite Backend: http://localhost:3004"
echo "🏢 Brand Interface Frontend: http://localhost:3001"
echo "⚡ Brand Interface Backend: http://localhost:3002"
echo "=================================================="

# Create logs directory
mkdir -p /tmp/w3suite-logs

# Kill processes on enterprise ports only (targeted cleanup)
echo "🔪 Freeing enterprise ports..."
fuser -k 3000/tcp 3001/tcp 3002/tcp 3004/tcp 6000/tcp 2>/dev/null || true

# Wait for ports to be freed
sleep 2

# Export environment variables
export NODE_ENV=${NODE_ENV:-development}
export JWT_SECRET=${JWT_SECRET:-w3suite-dev-secret-2025}
export DB_DISABLED=1

echo "🔧 Environment Configuration:"
echo "  NODE_ENV: $NODE_ENV"
echo "  JWT_SECRET: [CONFIGURED]"
echo "  Service Ports: W3 FE:3000 | W3 BE:3004 | Brand FE:3001 | Brand BE:3002"
echo "  Reverse Proxy: 6000"
echo ""

# Function for graceful shutdown (only if not in Replit workflow)
if [ -z "$REPLIT_WORKFLOW" ]; then
    cleanup() {
        echo "🛑 Shutting down all enterprise services..."
        kill $(jobs -p) 2>/dev/null || true
        exit 0
    }
    trap cleanup INT TERM
fi

echo "🚀 Starting all enterprise services..."

# Start Port 5000 Shim (keeps Replit workflow happy)
echo "🔗 Starting Port 5000 Shim..."
(cd scripts && setsid nohup node port-5000-shim.js >>/tmp/w3suite-logs/port-shim.log 2>&1 & echo $! >/tmp/w3suite-logs/port-shim.pid; disown)

# Start Brand Interface Frontend (detached)
echo "🏢 Starting Brand Interface Frontend..."
(cd apps/frontend/brand-web && setsid nohup npm run dev >>/tmp/w3suite-logs/brand-frontend.log 2>&1 & echo $! >/tmp/w3suite-logs/brand-frontend.pid; disown)

# Start W3 Suite Frontend (detached)
echo "📱 Starting W3 Suite Frontend..."
(cd apps/frontend/web && setsid nohup npm run dev >>/tmp/w3suite-logs/w3-frontend.log 2>&1 & echo $! >/tmp/w3suite-logs/w3-frontend.pid; disown)

# Start Brand Interface Backend (detached)
echo "⚡ Starting Brand Interface Backend..."
(cd apps/backend/brand-api && setsid nohup env NODE_ENV=development tsx src/index.ts >>/tmp/w3suite-logs/brand-backend.log 2>&1 & echo $! >/tmp/w3suite-logs/brand-backend.pid; disown)

# Start W3 Suite Backend (detached)
echo "🔧 Starting W3 Suite Backend..."
(cd apps/backend/api && setsid nohup env NODE_ENV=development JWT_SECRET=w3suite-dev-secret-2025 tsx src/index.ts >>/tmp/w3suite-logs/w3-backend.log 2>&1 & echo $! >/tmp/w3suite-logs/w3-backend.pid; disown)

# Wait for backends to start
echo "⏳ Waiting for backends to initialize..."
sleep 10

# Start Enterprise Reverse Proxy in FOREGROUND (keeps workflow alive)
echo "🌐 Starting Enterprise Reverse Proxy (foreground)..."
cd apps/reverse-proxy && exec env NODE_ENV=development tsx src/index.ts