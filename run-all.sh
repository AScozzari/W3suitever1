#!/bin/bash

echo "🚀 Starting Enterprise Stack with API Gateway..."

# Start all services in the background
NODE_ENV=development npx tsx gateway/index.js &
GATEWAY_PID=$!

sleep 2

NODE_ENV=development npx tsx apps/backend/api/src/index.ts &
W3_PID=$!

NODE_ENV=development npx tsx apps/backend/brand-api/src/index.ts &
BRAND_PID=$!

echo "✅ Services started:"
echo "  - Gateway (PID $GATEWAY_PID) on port 5000"
echo "  - W3 Suite (PID $W3_PID) on port 3000"
echo "  - Brand Interface (PID $BRAND_PID) on port 3001"
echo ""
echo "📡 Access Points:"
echo "  W3 Suite:        http://localhost:5000"
echo "  Brand Interface: http://localhost:5000/brandinterface/login"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $GATEWAY_PID $W3_PID $BRAND_PID; exit" INT
wait