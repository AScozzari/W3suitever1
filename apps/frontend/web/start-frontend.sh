#!/bin/bash

# W3 Suite Frontend Standalone Startup Script
# Starts the frontend on port 3000 with proxy to backend on port 3004

echo "🚀 Starting W3 Suite Frontend (standalone)..."
echo "📱 Frontend will be available at: http://localhost:3000"
echo "🔗 API calls will be proxied to: http://localhost:3004"
echo ""

# Set environment for development
export NODE_ENV=development

# Start Vite dev server
echo "⚡ Starting Vite dev server..."
npm run dev