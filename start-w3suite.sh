#!/bin/bash
echo "🚀 Starting W3 Suite (Platform Port ${PORT:-3000})..."
NODE_ENV=development tsx apps/backend/api/src/index.ts
