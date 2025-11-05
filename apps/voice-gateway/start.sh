#!/bin/bash

# W3 Voice Gateway Launcher Script
# Keeps the Voice Gateway running in the background

echo "🎙️ W3 Voice Gateway Launcher"
echo "================================"
echo "Starting Voice Gateway service..."
echo ""

# Change to voice gateway directory
cd "$(dirname "$0")"

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Kill any existing processes on our ports
if port_in_use 3005; then
    echo "⚠️ Port 3005 already in use, cleaning up..."
    lsof -ti :3005 | xargs -r kill -9 2>/dev/null
    sleep 1
fi

if port_in_use 3105; then
    echo "⚠️ Port 3105 already in use, cleaning up..."
    lsof -ti :3105 | xargs -r kill -9 2>/dev/null
    sleep 1
fi

# Start the Voice Gateway
echo "🚀 Launching Voice Gateway..."
echo "   WebSocket: ws://localhost:3005"
echo "   Health: http://localhost:3105/health"
echo ""

# Run tsx with the watch flag to keep it running
exec tsx watch src/index.ts