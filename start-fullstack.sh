#!/bin/bash

# Install frontend dependencies if needed
if [ ! -d "apps/frontend/web/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd apps/frontend/web && npm install && cd ../../../
fi

# Start both backend and frontend concurrently
echo "🚀 Starting W3 Suite fullstack application..."
npx concurrently \
  --names "BACKEND,FRONTEND" \
  --prefix-colors "blue,green" \
  "NODE_ENV=development tsx apps/backend/api/src/index.ts" \
  "cd apps/frontend/web && npm run dev"