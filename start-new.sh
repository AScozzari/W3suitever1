#!/bin/bash
echo "🚀 Starting W3 Suite Direct Mode (Frontend: 3000, Backend: 3004)..."
echo "No Gateway - Direct Communication with JWT Auth"
echo ""

# Start backend and frontend concurrently
concurrently \
  --names "Backend,Frontend" \
  --colors "yellow,blue" \
  "NODE_ENV=development PORT=3004 tsx apps/backend/api/src/index.ts" \
  "cd apps/frontend/web && npm run dev"