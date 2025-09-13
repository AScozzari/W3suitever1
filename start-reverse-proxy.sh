#!/bin/bash
# W3 Suite Enterprise Reverse Proxy Startup Script
# This script starts the reverse proxy server on port 5000

echo "🚀 Starting W3 Suite Enterprise Reverse Proxy..."
echo "=================================================="

# Set environment variables if not already set
export NODE_ENV=${NODE_ENV:-development}
export PROXY_PORT=${PROXY_PORT:-5000}
export W3_FRONTEND_PORT=${W3_FRONTEND_PORT:-3000}
export W3_BACKEND_PORT=${W3_BACKEND_PORT:-3004}
export BRAND_FRONTEND_PORT=${BRAND_FRONTEND_PORT:-3001}
export BRAND_BACKEND_PORT=${BRAND_BACKEND_PORT:-3002}

echo "Environment: $NODE_ENV"
echo "Proxy Port: $PROXY_PORT"
echo "Upstream Services:"
echo "  - W3 Suite Frontend: localhost:$W3_FRONTEND_PORT"
echo "  - W3 Suite Backend: localhost:$W3_BACKEND_PORT"
echo "  - Brand Interface Frontend: localhost:$BRAND_FRONTEND_PORT"
echo "  - Brand Interface Backend: localhost:$BRAND_BACKEND_PORT"
echo "=================================================="

# Create logs directory if in production
if [ "$NODE_ENV" = "production" ]; then
  mkdir -p logs
fi

# Start the reverse proxy
npx tsx apps/reverse-proxy/src/index.ts