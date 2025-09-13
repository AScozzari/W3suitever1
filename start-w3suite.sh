#!/bin/bash
echo "🚀 Starting W3 Suite Direct Mode (Frontend: 3000, Backend: 3004)..."
echo "No Gateway - Direct Communication with JWT Auth"
echo ""

# Ensure frontend dependencies are installed
if [ ! -d "apps/frontend/web/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm --prefix apps/frontend/web install
fi

# Start backend in background
echo "Starting backend API on port 3004..."
NODE_ENV=development API_PORT=3004 tsx apps/backend/api/src/index.ts &
BACKEND_PID=$!

# Give backend time to start
sleep 2

# Start frontend in foreground on port 3000
echo "Starting frontend on port 3000..."
cd apps/frontend/web && npm run dev -- --port 3000 --host 0.0.0.0

# Kill backend when script exits
trap "kill $BACKEND_PID 2>/dev/null" EXIT
