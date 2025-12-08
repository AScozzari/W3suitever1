#!/bin/bash
# W3 Suite Backend Standalone Script
# Avvia solo il backend W3 Suite su porta 3004

echo "🚀 Starting W3 Suite Backend (standalone)..."
echo "📍 Port: 3004"
echo "🔌 API Base: http://localhost:3004/api"

# Set environment variables
export NODE_ENV=development
export JWT_SECRET=${JWT_SECRET:-"w3suite-dev-secret-2025"}

# Navigate to API directory
cd "$(dirname "$0")"

# Start the backend server
npx tsx src/index.ts