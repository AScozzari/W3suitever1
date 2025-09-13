#!/bin/bash

# Install brand frontend dependencies if needed
if [ ! -d "apps/frontend/brand-web/node_modules" ]; then
  echo "Installing brand frontend dependencies..."
  cd apps/frontend/brand-web && npm install && cd ../../../
fi

# Start both backend API and brand frontend concurrently
echo "🚀 Starting W3 Suite with Brand Interface..."
npx concurrently \
  --names "BACKEND-API,BRAND-FRONTEND" \
  --prefix-colors "blue,green" \
  "NODE_ENV=development tsx apps/backend/api/src/index.ts" \
  "cd apps/frontend/brand-web && npm run dev"