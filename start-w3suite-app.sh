#!/bin/bash

echo "🚀 Starting W3 Suite Application (Backend + Frontend)..."

# Start backend on port 3001
echo "Starting W3 Suite backend on port 3001..."
NODE_ENV=development tsx apps/backend/api/src/index.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start W3 Suite frontend 
echo "Starting W3 Suite frontend..."
cd apps/frontend/web && npm run dev &
FRONTEND_PID=$!

# Cleanup function
cleanup() {
    echo "🚫 Shutting down W3 Suite..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT

# Wait for either process to exit
wait