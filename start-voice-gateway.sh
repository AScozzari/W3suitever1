#!/bin/bash

echo "🎙️ Starting W3 Voice Gateway..."
echo "================================"

# Check if required environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY is not set"
    echo "Please set the OPENAI_API_KEY environment variable"
    exit 1
fi

if [ -z "$W3_VOICE_GATEWAY_API_KEY" ]; then
    echo "❌ Error: W3_VOICE_GATEWAY_API_KEY is not set"
    echo "Please set the W3_VOICE_GATEWAY_API_KEY environment variable"
    exit 1
fi

# Navigate to voice gateway directory
cd apps/voice-gateway

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the Voice Gateway
echo "🚀 Starting Voice Gateway on port 3005 (WebSocket) and 3105 (HTTP)..."
npm run dev