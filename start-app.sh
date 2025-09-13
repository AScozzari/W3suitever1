#!/bin/bash
echo "🚀 Starting W3 Suite Application (Frontend: 3000, Backend: 3004)..."
echo ""

# Ensure frontend dependencies are installed
if [ ! -d "apps/frontend/web/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd apps/frontend/web && npm install && cd ../../..
fi

# Start backend in background
echo "✅ Starting backend API on port 3004..."
NODE_ENV=development API_PORT=3004 tsx apps/backend/api/src/index.ts &
BACKEND_PID=$!

# Give backend time to start
sleep 3

# Start frontend in foreground on port 3000
echo "✅ Starting frontend on port 3000..."
cd apps/frontend/web && npm run dev -- --port 3000 --host 0.0.0.0 &
FRONTEND_PID=$!

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to clean up on script exit
trap cleanup EXIT INT TERM

# Keep script running and show both outputs
echo ""
echo "✨ Both services are now running!"
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend API: http://localhost:3004"
echo ""
echo "Press Ctrl+C to stop all services"
echo "----------------------------------------"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID