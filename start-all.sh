#!/bin/bash
echo "🔥 Starting Both Systems..."
echo "W3 Suite: http://localhost:3004"
echo "Brand Interface: http://localhost:5001"
echo ""
concurrently \
  --names "W3-Suite,Brand-API" \
  --colors "blue,magenta" \
  "NODE_ENV=development tsx apps/backend/api/src/index.ts" \
  "NODE_ENV=development tsx apps/backend/brand-api/src/index.ts"
