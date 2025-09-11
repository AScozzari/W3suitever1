#!/bin/bash

echo "🚀 Starting W3 Suite with API Gateway Architecture..."
echo ""

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Start all services in the background
echo ""
echo "📡 Starting API Gateway on port 5000..."
NODE_ENV=development npx tsx gateway/index.js &
GATEWAY_PID=$!

sleep 2

echo "🌐 Starting W3 Suite on port 3000..."
NODE_ENV=development npx tsx apps/backend/api/src/index.ts &
W3_PID=$!

sleep 2

echo "🏢 Starting Brand Interface on port 3001..."
NODE_ENV=development npx tsx apps/backend/brand-api/src/index.ts &
BRAND_PID=$!

echo ""
echo "✅ All services started!"
echo ""
echo "📌 Service PIDs:"
echo "  - API Gateway: $GATEWAY_PID"
echo "  - W3 Suite: $W3_PID"
echo "  - Brand Interface: $BRAND_PID"
echo ""
echo "🌐 Access Points:"
echo "  - W3 Suite: http://localhost:5000"
echo "  - Brand Interface: http://localhost:5000/brandinterface/login"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🚫 Shutting down all services..."
    kill $GATEWAY_PID 2>/dev/null
    kill $W3_PID 2>/dev/null
    kill $BRAND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Wait for all background processes
wait