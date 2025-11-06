-- ai_http_streaming_realtime_FIXED.lua
-- FreeSWITCH Lua script for REAL-TIME bidirectional HTTP streaming with W3 Voice Gateway
-- FIXED: Uses RAW PCM16 audio format (no WAV header) for OpenAI compatibility

local json = require("cjson")

-- Configuration
local W3_GATEWAY_URL = "https://990d2e08-e877-47ab-86e4-4ab1ec4a5b18-00-a7zlal1jz3uk.worf.replit.dev"
local TENANT_ID = "00000000-0000-0000-0000-000000000001"
local STORE_ID = "50000000-0000-0000-0000-000000000010"
local AI_AGENT_REF = "customer-care-voice"
local API_KEY = "openssl rand -hex 32"

-- Helper: Log with prefix
function log_msg(level, message)
    freeswitch.consoleLog(level, '[AI_REALTIME] ' .. message .. '\n')
end

-- Helper function for HTTP requests
function http_request(method, url, data)
    local api = freeswitch.API()
    local curl_cmd
    
    local auth_header = string.format('-H "X-API-Key: %s" -H "X-Auth-Session: authenticated" -H "X-Tenant-ID: %s"', API_KEY, TENANT_ID)
    
    if data then
        local json_data = json.encode(data)
        json_data = json_data:gsub("'", "'\\''")
        
        curl_cmd = string.format(
            "curl -X %s '%s' %s -H 'Content-Type: application/json' -d '%s' -s -w '\\n%%{http_code}' --max-time 3",
            method, url, auth_header, json_data
        )
    else
        curl_cmd = string.format(
            "curl -X %s '%s' %s -s -w '\\n%%{http_code}' --max-time 3",
            method, url, auth_header
        )
    end
    
    local output = api:execute("system", curl_cmd)
    
    if not output then
        return nil, 0
    end
    
    local lines = {}
    for line in output:gmatch("[^\n]+") do
        table.insert(lines, line)
    end
    
    local http_code = tonumber(lines[#lines]) or 0
    local response_body = table.concat(lines, "\n", 1, #lines - 1)
    
    if response_body and response_body ~= "" then
        local success, result = pcall(json.decode, response_body)
        if success then
            return result, http_code
        else
            return { raw = response_body }, http_code
        end
    end
    
    return {}, http_code
end

-- Main script execution
if session:ready() then
    local uuid = session:get_uuid()
    local did = session:getVariable("destination_number") or ""
    local caller = session:getVariable("caller_id_number") or ""
    
    log_msg("notice", "========== STARTING REALTIME SESSION ==========")
    log_msg("notice", string.format("UUID: %s, DID: %s, Caller: %s", uuid, did, caller))
    
    -- Answer the call
    session:answer()
    session:sleep(500)
    
    -- Set audio codec to PCM16@16kHz (CRITICAL for OpenAI compatibility)
    session:execute("set", "absolute_codec_string=PCMU,PCMA")
    
    log_msg("info", "Audio codec set to PCM16@16kHz mono")
    
    -- Step 1: Create session
    log_msg("info", "Creating session with W3 Voice Gateway...")
    
    local create_session_data = {
        callId = uuid,
        tenantId = TENANT_ID,
        storeId = STORE_ID,
        did = did,
        callerNumber = caller,
        aiAgentRef = AI_AGENT_REF
    }
    
    local session_response, http_code = http_request(
        "POST",
        W3_GATEWAY_URL .. "/api/voice/session/create",
        create_session_data
    )
    
    if http_code ~= 200 and http_code ~= 201 then
        log_msg("err", "Failed to create session: HTTP " .. tostring(http_code))
        if session:ready() then
            session:execute("playback", "ivr/ivr-call_rejected.wav")
            session:hangup()
        end
        return
    end
    
    log_msg("notice", "✅ Session created successfully")
    if session_response.sessionId then
        log_msg("info", "OpenAI Session ID: " .. session_response.sessionId)
    end
    
    -- Play welcome message while AI warms up
    session:execute("playback", "silence_stream://500")
    
    -- Step 2: REALTIME Audio streaming loop
    local chunk_num = 0
    local max_chunks = 600  -- 2 minutes max (600 x 200ms)
    local running = true
    local poll_counter = 0
    local silence_counter = 0
    local max_silence = 30  -- 30 chunks (~6 seconds) of silence before timeout
    
    log_msg("notice", "========== STARTING REALTIME AUDIO STREAMING ==========")
    
    while session:ready() and running and chunk_num < max_chunks do
        chunk_num = chunk_num + 1
        
        -- Record audio chunk in RAW PCM16 format (NO WAV HEADER!)
        -- Format: PCM16, 16kHz, mono, 200ms duration = 6400 bytes
        local chunk_file = "/tmp/audio_chunk_" .. uuid .. "_" .. tostring(chunk_num) .. ".raw"
        
        -- Use record_session for better quality and correct format
        -- silence_thresh: 200 (detect silence)
        -- silence_hits: 3 (number of silence frames before stopping)
        session:execute("record", chunk_file .. " 0.2 200 3")
        
        -- Check if file exists and has content
        local file = io.open(chunk_file, "rb")
        if file then
            local content = file:read("*all")
            file:close()
            
            -- Check if we have actual audio data (minimum 1000 bytes for 200ms@16kHz)
            if content and #content > 1000 then
                silence_counter = 0  -- Reset silence counter
                
                -- Encode RAW PCM to base64 (NO WAV HEADER!)
                local b64_file = "/tmp/audio_b64_" .. uuid .. "_" .. tostring(chunk_num) .. ".txt"
                os.execute("base64 -w 0 " .. chunk_file .. " > " .. b64_file)
                
                local b64 = io.open(b64_file, "r")
                if b64 then
                    local audio_base64 = b64:read("*all")
                    b64:close()
                    
                    audio_base64 = audio_base64:gsub("\n", ""):gsub("\r", ""):gsub(" ", "")
                    
                    if #audio_base64 > 100 then
                        -- Stream to W3 Gateway
                        local stream_data = { audio = audio_base64 }
                        local stream_response, stream_code = http_request(
                            "POST",
                            W3_GATEWAY_URL .. "/api/voice/stream/" .. uuid,
                            stream_data
                        )
                        
                        if stream_code == 200 then
                            log_msg("debug", "✅ Chunk " .. tostring(chunk_num) .. " sent (" .. tostring(#content) .. " bytes)")
                        else
                            log_msg("warn", "❌ Failed to send chunk: HTTP " .. tostring(stream_code))
                        end
                    end
                    
                    os.remove(b64_file)
                end
            else
                silence_counter = silence_counter + 1
                log_msg("debug", "Silence detected (" .. tostring(silence_counter) .. "/" .. tostring(max_silence) .. ")")
                
                if silence_counter > max_silence then
                    log_msg("notice", "Extended silence detected, ending session")
                    running = false
                end
            end
            
            os.remove(chunk_file)
        end
        
        -- Poll for AI response EVERY 2 chunks (~400ms)
        poll_counter = poll_counter + 1
        if poll_counter >= 2 then
            poll_counter = 0
            
            local response, resp_code = http_request(
                "GET",
                W3_GATEWAY_URL .. "/api/voice/stream/" .. uuid .. "/response?timeout=800",
                nil
            )
            
            if resp_code == 200 and response and response.audio then
                log_msg("notice", "🎙️ AI SPEAKING! Playing response...")
                
                -- Decode AI audio (already in PCM16 format from OpenAI)
                local ai_b64_file = "/tmp/ai_audio_b64_" .. uuid .. ".txt"
                local ai_audio_file = "/tmp/ai_audio_" .. uuid .. ".raw"
                
                local f = io.open(ai_b64_file, "w")
                f:write(response.audio)
                f:close()
                
                -- Decode from base64 to RAW PCM
                os.execute("base64 -d " .. ai_b64_file .. " > " .. ai_audio_file)
                
                -- Convert RAW PCM16 to WAV with header for FreeSWITCH compatibility
                -- OpenAI returns: PCM16, 16kHz, mono, little-endian
                local ai_wav_file = "/tmp/ai_audio_" .. uuid .. ".wav"
                local sox_cmd = string.format(
                    "sox -r 16000 -e signed -b 16 -c 1 %s %s",
                    ai_audio_file,
                    ai_wav_file
                )
                os.execute(sox_cmd)
                
                -- Play WAV file (universal FreeSWITCH support)
                session:execute("playback", ai_wav_file)
                
                -- Cleanup
                os.remove(ai_b64_file)
                os.remove(ai_audio_file)
                os.remove(ai_wav_file)
                
                log_msg("info", "✅ AI audio played successfully")
                
                -- Reset silence counter after AI speaks
                silence_counter = 0
            end
            
            -- Check if session should end
            if response and response.hasMore == false then
                log_msg("notice", "Session complete (hasMore=false)")
                running = false
            end
        end
    end
    
    -- Step 3: End session
    log_msg("info", "Ending session...")
    local end_response, end_code = http_request(
        "POST",
        W3_GATEWAY_URL .. "/api/voice/session/" .. uuid .. "/end",
        {}
    )
    
    if end_code == 200 then
        log_msg("notice", "✅ Session ended successfully")
    end
    
    log_msg("notice", "========== SESSION COMPLETED ==========")
    log_msg("notice", "Total chunks processed: " .. tostring(chunk_num))
    
    -- Play goodbye message
    if session:ready() then
        session:execute("playback", "ivr/ivr-thank_you_for_calling.wav")
        session:hangup()
    end
else
    log_msg("err", "Session not ready")
end
