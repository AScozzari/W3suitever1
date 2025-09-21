#!/bin/bash

echo "🚀 Starting W3 Suite without file watching for stable development"

# Set environment
export NODE_ENV=development

# Start without TSX file watching
exec node --loader tsx/esm apps/backend/api/src/index.ts