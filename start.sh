#!/bin/bash

# Enterprise Stack Launcher - W3 Suite + Brand Interface
# ======================================================

echo "╔══════════════════════════════════════════════════════╗"
echo "║         W3 SUITE ENTERPRISE STACK LAUNCHER          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Starting API Gateway Architecture..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencies not installed. Running npm install..."
    npm install
fi

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx gateway" 2>/dev/null
pkill -f "tsx apps/backend" 2>/dev/null
sleep 1

# Start services
echo "📡 Starting services..."
echo ""

# Start Gateway (Port 5000)
NODE_ENV=development npx tsx gateway/index.js &
GATEWAY_PID=$!
echo "  ✅ API Gateway started (PID: $GATEWAY_PID, Port: 5000)"

# Wait for gateway to initialize
sleep 2

# Start W3 Suite (Port 3000)
NODE_ENV=development npx tsx apps/backend/api/src/index.ts &
W3_PID=$!
echo "  ✅ W3 Suite started (PID: $W3_PID, Port: 3000)"

# Start Brand Interface (Port 3001)
NODE_ENV=development npx tsx apps/backend/brand-api/src/index.ts &
BRAND_PID=$!
echo "  ✅ Brand Interface started (PID: $BRAND_PID, Port: 3001)"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                  SERVICES RUNNING                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  🌐 W3 Suite:        http://localhost:5000          ║"
echo "║  🎯 Brand Interface: http://localhost:5000/brandinterface/login ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  📊 Health Check:    http://localhost:5000/health   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Handle shutdown
trap cleanup INT

cleanup() {
    echo ""
    echo "⏹️  Stopping all services..."
    kill $GATEWAY_PID $W3_PID $BRAND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Keep script running
wait