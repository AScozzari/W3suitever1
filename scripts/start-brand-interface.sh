#!/bin/bash

# Start Brand Interface Backend and Frontend
echo "🚀 Starting Brand Interface HQ System..."

# Start Brand API on port 3002
echo "📡 Starting Brand API on port 3002..."
cd apps/backend/brand-api && npm run dev &

# Wait a moment for backend to start
sleep 2

# Start Brand Web Frontend on port 3001
echo "🌐 Starting Brand Web Frontend on port 3001..."
cd apps/frontend/brand-web && npm run dev &

echo "✅ Brand Interface is starting..."
echo "🔗 Brand API: http://localhost:3002/brand-api/health"
echo "🔗 Brand Web: http://localhost:3001/"

# Keep script running
wait