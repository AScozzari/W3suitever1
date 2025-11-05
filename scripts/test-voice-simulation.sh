#!/bin/bash
# Test completo Voice Gateway SENZA FreeSWITCH
# Simula una chiamata reale inviando audio fittizio

set -e

GATEWAY_URL="http://localhost:3105"
API_KEY="openssl rand -hex 32"
TENANT_ID="00000000-0000-0000-0000-000000000001"
STORE_ID="50000000-0000-0000-0000-000000000010"
CALL_ID="test-sim-$(date +%s)"

echo "🎙️  W3 Voice Gateway - Test Simulazione Chiamata"
echo "=================================================="
echo ""
echo "📞 Call ID: $CALL_ID"
echo ""

# Step 1: Create session
echo "1️⃣  Creating session..."
CREATE_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/voice/session/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d "{
    \"callId\": \"$CALL_ID\",
    \"tenantId\": \"$TENANT_ID\",
    \"storeId\": \"$STORE_ID\",
    \"did\": \"0510510510\",
    \"callerNumber\": \"+393401234567\",
    \"aiAgentRef\": \"customer-care-voice\"
  }")

echo "   Response: $CREATE_RESPONSE"
SESSION_ID=$(echo $CREATE_RESPONSE | jq -r '.sessionId')

if [ "$SESSION_ID" != "$CALL_ID" ]; then
  echo "   ❌ FAILED to create session!"
  exit 1
fi

echo "   ✅ Session created: $SESSION_ID"
echo ""

# Step 2: Generate fake audio (silence - 16kHz mono PCM16)
echo "2️⃣  Generating fake audio (1 second of silence = 32000 bytes)..."
# PCM16 @ 16kHz mono: 16000 samples/sec * 2 bytes/sample = 32000 bytes/sec
dd if=/dev/zero bs=32000 count=1 2>/dev/null | base64 > /tmp/fake_audio.txt

AUDIO_B64=$(cat /tmp/fake_audio.txt | tr -d '\n')
echo "   Audio size: 32000 bytes (1 second)"
echo "   Base64 length: ${#AUDIO_B64} chars"
echo ""

# Step 3: Stream audio chunks (5 chunks = 5 seconds)
echo "3️⃣  Streaming 5 audio chunks (5 seconds total)..."
for i in {1..5}; do
  echo "   Chunk $i/5..."
  
  STREAM_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/voice/stream/$CALL_ID" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -H "X-Tenant-ID: $TENANT_ID" \
    -d "{\"audio\": \"$AUDIO_B64\"}")
  
  STATUS=$(echo $STREAM_RESPONSE | jq -r '.status')
  
  if [ "$STATUS" != "streamed" ]; then
    echo "   ❌ FAILED to stream chunk $i: $STREAM_RESPONSE"
    exit 1
  fi
  
  echo "   ✅ Chunk $i streamed"
  sleep 1
done

echo ""

# Step 4: Check for AI response
echo "4️⃣  Polling for AI response (max 10 seconds)..."
for i in {1..10}; do
  echo "   Poll attempt $i/10..."
  
  RESPONSE=$(curl -s "$GATEWAY_URL/api/voice/stream/$CALL_ID/response?timeout=2000" \
    -H "X-API-Key: $API_KEY" \
    -H "X-Tenant-ID: $TENANT_ID")
  
  HAS_AUDIO=$(echo $RESPONSE | jq -r '.audio // "null"')
  
  if [ "$HAS_AUDIO" != "null" ]; then
    AUDIO_LEN=${#HAS_AUDIO}
    echo "   🎙️  GOT AI RESPONSE! Audio length: $AUDIO_LEN chars"
    echo "   Transcript: $(echo $RESPONSE | jq -r '.transcript // "N/A"')"
    break
  fi
  
  sleep 1
done

echo ""

# Step 5: Get diagnostic info
echo "5️⃣  Getting diagnostic info..."
DIAGNOSTIC=$(curl -s "$GATEWAY_URL/api/voice/diagnostic/$CALL_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant-ID: $TENANT_ID")

echo "   📊 Session diagnostics:"
echo "   - Duration: $(echo $DIAGNOSTIC | jq -r '.duration')ms"
echo "   - OpenAI connected: $(echo $DIAGNOSTIC | jq -r '.openaiConnected')"
echo "   - Transcript items: $(echo $DIAGNOSTIC | jq -r '.transcript | length')"
echo "   - Actions: $(echo $DIAGNOSTIC | jq -r '.actions | length')"
echo "   - Has response audio: $(echo $DIAGNOSTIC | jq -r '.hasResponseAudio')"
echo ""

# Step 6: End session
echo "6️⃣  Ending session..."
END_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/voice/session/$CALL_ID/end" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant-ID: $TENANT_ID")

echo "   Response: $END_RESPONSE"
echo ""

# Cleanup
rm -f /tmp/fake_audio.txt

echo "=================================================="
echo "✅ Test completato!"
echo ""
echo "📋 PROSSIMI PASSI:"
echo "1. Se questo test funziona → il problema è FreeSWITCH"
echo "2. Se fallisce → controlla logs Voice Gateway"
echo "3. Usa: curl http://localhost:3105/api/voice/diagnostic/$CALL_ID"
