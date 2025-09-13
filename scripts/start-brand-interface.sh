#!/bin/bash

# Start Brand Interface Backend and Frontend
echo "🚀 Starting Brand Interface HQ System..."

# Start Brand API on port 5001
echo "📡 Starting Brand API on port 5001..."
cd apps/backend/brand-api && npm run dev &

# Wait a moment for backend to start
sleep 2

# Start Brand Web Frontend
echo "🌐 Starting Brand Web Frontend..."
cd apps/frontend/brand-web && npm run dev &

echo "✅ Brand Interface is starting..."
echo "🔗 Brand API: http://localhost:5001"
echo "🔗 Brand Web: http://localhost:5000/brandinterface"

# Keep script running
wait