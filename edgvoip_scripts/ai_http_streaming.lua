-- ai_http_streaming.lua
-- FreeSWITCH Lua script for HTTP streaming with W3 Voice Gateway
-- This script streams audio to W3 Suite via HTTP instead of WebSocket

local json = require("cjson")

-- Configuration (update these for production)
local W3_GATEWAY_URL = "https://990d2e08-e877-47ab-86e4-4ab1ec4a5b18-00-a7zlal1jz3uk.worf.replit.dev"
local TENANT_ID = "00000000-0000-0000-0000-000000000001"
local STORE_ID = "50000000-0000-0000-0000-000000000010"
local AI_AGENT_REF = "customer-care-voice"
local API_KEY = "your-secure-api-key-here"  -- IMPORTANT: Set this to match W3_VOICE_GATEWAY_API_KEY

-- Helper function for HTTP requests with authentication
function http_request(method, url, data)
    local api = freeswitch.API()
    local curl_cmd
    
    -- Add authentication header
    local auth_header = string.format('-H "X-API-Key: %s"', API_KEY)
    
    if data then
        -- Prepare JSON data for curl
        local json_data = json.encode(data)
        -- Escape quotes for shell
        json_data = json_data:gsub('"', '\\"')
        curl_cmd = string.format(
            'curl -X %s "%s" %s -H "Content-Type: application/json" -d "%s" -s',
            method, url, auth_header, json_data
        )
    else
        curl_cmd = string.format('curl -X %s "%s" %s -s', method, url, auth_header)
    end
    
    -- Execute curl via system API
    local response = api:execute("system", curl_cmd)
    
    -- Try to parse JSON response
    local success, result = pcall(json.decode, response)
    if success then
        return result
    else
        return { error = response }
    end
end

-- Main script execution
if session:ready() then
    -- Get call information
    local uuid = session:get_uuid()
    local did = session:getVariable("destination_number") or ""
    local caller = session:getVariable("caller_id_number") or ""
    
    session:consoleLog("info", string.format(
        "[AI HTTP] Starting HTTP streaming session - UUID: %s, DID: %s, Caller: %s",
        uuid, did, caller
    ))
    
    -- Answer the call
    session:answer()
    
    -- Play initial greeting while we set up
    session:streamFile("silence_stream://500")
    session:speak("Connecting to AI assistant, please wait...")
    
    -- Step 1: Create HTTP streaming session
    local create_session_data = {
        callId = uuid,
        tenantId = TENANT_ID,
        storeId = STORE_ID,
        did = did,
        callerNumber = caller,
        aiAgentRef = AI_AGENT_REF
    }
    
    local session_response = http_request(
        "POST",
        W3_GATEWAY_URL .. "/api/voice/session/create",
        create_session_data
    )
    
    if session_response.error then
        session:consoleLog("error", "[AI HTTP] Failed to create session: " .. tostring(session_response.error))
        session:speak("Sorry, I cannot connect to the AI assistant right now. Please try again later.")
        session:hangup()
        return
    end
    
    session:consoleLog("info", "[AI HTTP] Session created successfully")
    
    -- Step 2: Stream audio loop
    local chunk_duration_ms = 100  -- Send audio chunks every 100ms
    local sample_rate = 16000      -- 16kHz
    local bytes_per_chunk = (sample_rate * 2 * chunk_duration_ms) / 1000  -- PCM16 = 2 bytes per sample
    
    -- Function to encode PCM audio to base64 (safe file-based approach)
    function pcm_to_base64(pcm_data, uuid, chunk_num)
        local temp_pcm = "/tmp/pcm_" .. uuid .. "_" .. chunk_num .. ".raw"
        local temp_b64 = "/tmp/b64_" .. uuid .. "_" .. chunk_num .. ".txt"
        
        -- Write PCM data to temp file
        local file = io.open(temp_pcm, "wb")
        file:write(pcm_data)
        file:close()
        
        -- Encode to base64 using system command (safe with files)
        os.execute("base64 " .. temp_pcm .. " > " .. temp_b64)
        
        -- Read base64 result
        file = io.open(temp_b64, "r")
        local base64_data = file:read("*all")
        file:close()
        
        -- Cleanup temp files
        os.remove(temp_pcm)
        os.remove(temp_b64)
        
        return base64_data
    end
    
    -- Start bi-directional audio streaming
    session:setVariable("playback_terminators", "none")
    session:setInputCallback("on_audio_input")
    
    local audio_buffer = ""
    local running = true
    local chunk_counter = 0
    
    -- Audio input callback
    function on_audio_input(s, input_type, input_data)
        if input_type == "dtmf" then
            -- Handle DTMF if needed
            session:consoleLog("info", "[AI HTTP] DTMF received: " .. input_data)
        elseif input_type == "audio" then
            -- Accumulate audio buffer
            audio_buffer = audio_buffer .. input_data
            
            -- Send chunk when buffer is full
            if string.len(audio_buffer) >= bytes_per_chunk then
                local chunk = string.sub(audio_buffer, 1, bytes_per_chunk)
                audio_buffer = string.sub(audio_buffer, bytes_per_chunk + 1)
                
                -- Convert to base64 (safe file-based method)
                chunk_counter = chunk_counter + 1
                local audio_base64 = pcm_to_base64(chunk, uuid, chunk_counter)
                
                -- Send to W3 Gateway
                local stream_data = {
                    audio = audio_base64
                }
                
                http_request(
                    "POST",
                    W3_GATEWAY_URL .. "/api/voice/stream/" .. uuid,
                    stream_data
                )
            end
        end
        
        return ""
    end
    
    -- Response polling loop
    local temp_audio_file = "/tmp/ai_audio_" .. uuid .. ".pcm"
    
    while session:ready() and running do
        -- Poll for AI response
        local response = http_request(
            "GET",
            W3_GATEWAY_URL .. "/api/voice/stream/" .. uuid .. "/response?timeout=1000",
            nil
        )
        
        if response.audio then
            -- Write base64 audio to temp file for safe decoding
            local temp_b64_file = "/tmp/ai_b64_" .. uuid .. ".txt"
            local file = io.open(temp_b64_file, "w")
            file:write(response.audio)
            file:close()
            
            -- Decode base64 to PCM using safe file-based approach
            os.execute("base64 -d " .. temp_b64_file .. " > " .. temp_audio_file)
            
            -- Play audio to caller
            -- Note: FreeSWITCH expects raw PCM at 16kHz mono
            session:execute("playback", temp_audio_file .. "@@16000")
            
            session:consoleLog("info", "[AI HTTP] Played audio response to caller")
            
            -- Cleanup temp files
            os.remove(temp_b64_file)
            os.remove(temp_audio_file)
        end
        
        if response.transcript then
            session:consoleLog("info", "[AI HTTP] Transcript: " .. response.transcript)
        end
        
        -- Check if session is still active
        if not response.hasMore then
            running = false
        end
        
        -- Small delay to prevent busy loop
        session:sleep(50)
    end
    
    -- Step 3: End session
    http_request(
        "POST",
        W3_GATEWAY_URL .. "/api/voice/session/" .. uuid .. "/end",
        nil
    )
    
    session:consoleLog("info", "[AI HTTP] Session ended")
    
    -- Hangup
    session:hangup()
else
    -- Session not ready
    freeswitch.consoleLog("error", "[AI HTTP] Session not ready")
end

--[[ 
INSTALLATION INSTRUCTIONS FOR EDGVOIP:

1. Copy this script to FreeSWITCH scripts directory:
   /usr/share/freeswitch/scripts/ai_http_streaming.lua

2. Update the configuration variables at the top of this script:
   - W3_GATEWAY_URL: Your Replit app URL
   - TENANT_ID: Your tenant ID
   - STORE_ID: Your store ID  
   - AI_AGENT_REF: Your AI agent reference

3. Update your dialplan to use this script:
   <extension name="ai_http_streaming">
     <condition field="destination_number" expression="^(5406594427)$">
       <action application="lua" data="ai_http_streaming.lua"/>
     </condition>
   </extension>

4. Reload XML configuration:
   fs_cli -x "reloadxml"

5. Test with a call to 5406594427

NOTE: This is a simplified example. Production implementation should:
- Use proper audio file handling for playback
- Implement better error handling
- Use asynchronous processing for better performance
- Handle call events (hangup, transfer, etc.)
- Add proper logging and monitoring
--]]