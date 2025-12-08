#!/bin/bash
echo "🎨 Starting Brand Interface Frontend on port 3001..."

# Navigate to brand-web directory  
cd apps/frontend/brand-web

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing brand frontend dependencies..."
  npm install
fi

# Start the Vite dev server
echo "🚀 Launching Vite dev server on port 3001..."
npm run dev