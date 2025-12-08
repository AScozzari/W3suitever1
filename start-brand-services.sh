#!/bin/bash
echo "🚀 Starting Brand Interface Services (Frontend: 3001, Backend: 3002)..."

# Start backend in background
echo "Starting Brand Backend..."
cd apps/backend/brand-api
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "Starting Brand Frontend..."
cd ../../../apps/frontend/brand-web
npm run dev &
FRONTEND_PID=$!

echo "✅ Brand Services started!"
echo "📱 Frontend: http://localhost:3001"
echo "🔌 Backend API: http://localhost:3002/brand-api/health"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for any process to exit
wait $BACKEND_PID $FRONTEND_PID