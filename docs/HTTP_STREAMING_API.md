# W3 Voice Gateway HTTP Streaming API

## Overview
The W3 Voice Gateway now supports HTTP streaming for audio communication, allowing FreeSWITCH to send audio chunks via HTTP POST instead of WebSocket. This follows the same pattern used by Google Dialogflow, Amazon Lex, and IBM Watson.

## Architecture

```
FreeSWITCH → HTTP POST (audio chunks) → W3 Voice Gateway
                                            ↓
                                        OpenAI Realtime API
                                            ↓
FreeSWITCH ← HTTP Response (audio) ← W3 Voice Gateway
```

## API Endpoints

### 1. Create Session
**POST** `/api/voice/session/create`

Creates a new audio streaming session with OpenAI.

**Request:**
```json
{
  "callId": "unique-call-id",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "storeId": "50000000-0000-0000-0000-000000000010",
  "did": "5406594427",
  "callerNumber": "393297626144",
  "aiAgentRef": "customer-care-voice"
}
```

**Response:**
```json
{
  "sessionId": "unique-call-id",
  "status": "created" | "existing"
}
```

### 2. Stream Audio
**POST** `/api/voice/stream/:callId`

Sends audio chunk to the AI agent.

**Request:**
```json
{
  "audio": "base64_encoded_pcm16_audio"
}
```

**Response:**
```json
{
  "status": "streamed" | "session_not_found" | "invalid_audio"
}
```

### 3. Get Response
**GET** `/api/voice/stream/:callId/response?timeout=5000`

Retrieves audio response from AI agent (long polling).

**Query Parameters:**
- `timeout`: Maximum wait time in milliseconds (default: 5000)

**Response:**
```json
{
  "audio": "base64_encoded_pcm16_audio",
  "transcript": "[AI]: Hello, how can I help you?",
  "hasMore": true
}
```

### 4. End Session
**POST** `/api/voice/session/:callId/end`

Closes the streaming session and cleans up resources.

**Response:**
```json
{
  "status": "ended",
  "summary": {
    "callId": "unique-call-id",
    "duration": 120000,
    "transcript": ["[User]: Hello", "[AI]: Hi there!"],
    "actions": []
  }
}
```

### 5. Get Session Info
**GET** `/api/voice/session/:callId`

Gets current session information.

**Response:**
```json
{
  "callId": "unique-call-id",
  "status": "active",
  "createdAt": "2025-11-05T15:00:00.000Z",
  "lastActivity": "2025-11-05T15:01:00.000Z",
  "transcriptCount": 5,
  "actionsCount": 2
}
```

### 6. Get All Sessions
**GET** `/api/voice/sessions`

Lists all active streaming sessions.

**Response:**
```json
{
  "sessions": [...],
  "count": 3
}
```

## Audio Format
- **Format**: PCM16 (16-bit linear PCM)
- **Sample Rate**: 16000 Hz (16 kHz)
- **Channels**: 1 (Mono)
- **Encoding**: Base64

## Implementation Guide for FreeSWITCH

### 1. Using mod_curl
FreeSWITCH can use `mod_curl` to send HTTP requests:

```xml
<action application="curl" data="http://gateway.example.com/api/voice/session/create json {'callId':'${uuid}'}"/>
```

### 2. Using Lua Script
See `ai_http_streaming.lua` for a complete implementation that:
- Creates session on call start
- Streams audio chunks every 100ms
- Polls for responses
- Plays AI audio to caller
- Ends session on hangup

### 3. Dialplan Configuration
```xml
<extension name="ai_voice_agent">
  <condition field="destination_number" expression="^(5406594427)$">
    <action application="lua" data="ai_http_streaming.lua"/>
  </condition>
</extension>
```

## Session Management
- Sessions are stateful and maintained by `callId`
- Sessions auto-expire after 10 minutes of inactivity
- Multiple concurrent sessions are supported
- Each session maintains its own OpenAI connection

## Error Handling
- Invalid audio format returns `400 Bad Request`
- Session not found returns `404 Not Found`
- Server errors return `500 Internal Server Error`
- All errors include descriptive JSON error messages

## Performance Considerations
- Audio chunks should be sent every 20-100ms for smooth conversation
- Use long polling (5-10 seconds) for response retrieval
- Session cleanup happens automatically after timeout
- Maximum request body size: 10MB

## Security
- API requires valid `callId` for all operations
- Sessions are isolated by `tenantId`
- HTTPS recommended for production deployment
- Consider adding API key authentication for production

## Testing
Use the provided `test_http_streaming.sh` script to verify the API:

```bash
chmod +x test_http_streaming.sh
./test_http_streaming.sh
```

## Production Deployment for edgvoip

1. **Update Lua Script Configuration:**
   ```lua
   local W3_GATEWAY_URL = "https://your-replit-app.replit.dev"
   local TENANT_ID = "your-tenant-id"
   local STORE_ID = "your-store-id"
   ```

2. **Install on FreeSWITCH:**
   ```bash
   cp ai_http_streaming.lua /usr/share/freeswitch/scripts/
   ```

3. **Configure Dialplan:**
   ```bash
   vi /etc/freeswitch/dialplan/default.xml
   # Add extension for AI routing
   fs_cli -x "reloadxml"
   ```

4. **Test with Real Call:**
   - Call the configured DID (5406594427)
   - Verify audio streaming in logs
   - Check OpenAI sessions are created

## Advantages Over WebSocket/SIP
- ✅ Works through any HTTP proxy/firewall
- ✅ No persistent connection required
- ✅ Simple stateless protocol
- ✅ Easy to debug with curl
- ✅ Same pattern as major AI providers
- ✅ No SIP/RTP complexity
- ✅ Works perfectly with Replit's limitations

## Support
For issues or questions:
- Check Voice Gateway logs: `http://localhost:3105/health`
- Verify OpenAI API key is configured
- Ensure W3 backend is accessible
- Test with curl before FreeSWITCH integration