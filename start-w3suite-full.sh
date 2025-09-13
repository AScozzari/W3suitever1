#!/bin/bash

echo "🚀 Starting W3 Suite Enterprise - Full Stack with Reverse Proxy"

# Function to wait for port
wait_for_port() {
    local port=$1
    local service=$2
    echo "⏳ Waiting for $service on port $port..."
    while ! nc -z localhost $port; do
        sleep 1
    done
    echo "✅ $service ready on port $port"
}

# Start W3 Suite Backend (port 3004)
echo "Starting W3 Suite Backend on port 3004..."
NODE_ENV=development tsx apps/backend/api/src/index.ts &
BACKEND_PID=$!

# Start Brand Backend (port 3002) 
echo "Starting Brand Backend on port 3002..."
(cd apps/backend/brand-api && NODE_ENV=development tsx src/index.ts) &
BRAND_BACKEND_PID=$!

# Wait for backends
sleep 4

# Start W3 Suite Frontend (port 3000)
echo "Starting W3 Suite Frontend on port 3000..."
if [ -d "apps/frontend/web" ]; then
    (cd apps/frontend/web && npm run dev) &
    W3_FRONTEND_PID=$!
else
    echo "⚠️  W3 Suite Frontend directory not found"
    W3_FRONTEND_PID=0
fi

# Start Brand Frontend (port 3001)
echo "Starting Brand Frontend on port 3001..."
if [ -d "apps/frontend/brand-web" ]; then
    (cd apps/frontend/brand-web && npm run dev) &
    BRAND_FRONTEND_PID=$!
else
    echo "⚠️  Brand Frontend directory not found"
    BRAND_FRONTEND_PID=0
fi

# Wait for frontends to start
sleep 6

# Start Reverse Proxy (port 5000 - main entry point)
echo "Starting Reverse Proxy on port 5000..."
if [ -d "apps/reverse-proxy" ]; then
    (cd apps/reverse-proxy && NODE_ENV=development tsx src/index.ts) &
    PROXY_PID=$!
else
    echo "⚠️  Reverse Proxy directory not found - running backend only on port 5000"
    # Fallback: restart W3 backend on port 5000
    kill $BACKEND_PID 2>/dev/null
    W3_BACKEND_PORT=5000 NODE_ENV=development tsx apps/backend/api/src/index.ts &
    PROXY_PID=$!
fi

echo ""
echo "🎉 W3 Suite Enterprise started successfully!"
echo "🌍 Main URL: http://localhost:5000"
echo "🏢 W3 Suite: http://localhost:5000"
echo "🏷️  Brand Interface: http://localhost:5000/brandinterface"
echo ""
echo "Services:"
echo "  - Reverse Proxy: port 5000"
echo "  - W3 Frontend: port 3000"
echo "  - Brand Frontend: port 3001"
echo "  - Brand Backend: port 3002"
echo "  - W3 Backend: port 3004"

# Cleanup function
cleanup() {
    echo ""
    echo "🚫 Shutting down W3 Suite Enterprise..."
    kill $PROXY_PID $W3_FRONTEND_PID $BRAND_FRONTEND_PID $BRAND_BACKEND_PID $BACKEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT

# Wait for any process to exit
wait