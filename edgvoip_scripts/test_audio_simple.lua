-- test_audio_simple.lua - Script di test minimale per diagnostica
local W3_GATEWAY_URL = "https://990d2e08-e877-47ab-86e4-4ab1ec4a5b18-00-a7zlal1jz3uk.worf.replit.dev"

function log_msg(level, message)
    freeswitch.consoleLog(level, '[TEST_AUDIO] ' .. message .. '\n')
end

if session:ready() then
    local uuid = session:get_uuid()
    log_msg("notice", "========== TEST AUDIO STARTED ==========")
    log_msg("notice", "Call UUID: " .. uuid)
    
    session:answer()
    session:sleep(500)
    
    -- TEST 1: Verifica connettività
    log_msg("notice", "TEST 1: Verifying connectivity to Voice Gateway...")
    local api = freeswitch.API()
    local test_curl = string.format("curl -s -w '%%{http_code}' -o /dev/null '%s/health'", W3_GATEWAY_URL)
    local http_code = api:execute("system", test_curl)
    log_msg("notice", "Health check HTTP code: " .. tostring(http_code))
    
    -- TEST 2: Registra audio di test
    log_msg("notice", "TEST 2: Recording 3 seconds of test audio...")
    local test_file = "/tmp/test_audio_" .. uuid .. ".wav"
    session:execute("record", test_file .. " 3 200 5")
    
    -- Verifica file creato
    local file = io.open(test_file, "rb")
    if file then
        local size = file:seek("end")
        file:close()
        log_msg("notice", "✅ Audio file created: " .. tostring(size) .. " bytes")
        
        -- Mostra primi 8 bytes (header WAV)
        file = io.open(test_file, "rb")
        local header = file:read(8)
        file:close()
        
        local hex = ""
        for i = 1, #header do
            hex = hex .. string.format("%02X ", string.byte(header, i))
        end
        log_msg("notice", "File header: " .. hex)
        
        os.remove(test_file)
    else
        log_msg("err", "❌ Failed to create audio file!")
    end
    
    -- TEST 3: Verifica base64
    log_msg("notice", "TEST 3: Testing base64 encoding...")
    local test_data = "/tmp/test_b64_" .. uuid .. ".txt"
    os.execute("echo 'test' | base64 > " .. test_data)
    local f = io.open(test_data, "r")
    if f then
        local b64 = f:read("*all")
        log_msg("notice", "✅ Base64 works: " .. b64:gsub("\n", ""))
        f:close()
        os.remove(test_data)
    else
        log_msg("err", "❌ Base64 encoding failed!")
    end
    
    -- TEST 4: Curl POST test
    log_msg("notice", "TEST 4: Testing HTTP POST to Voice Gateway...")
    local curl_test = string.format(
        "curl -X POST '%s/api/voice/session/create' -H 'Content-Type: application/json' -H 'X-API-Key: openssl rand -hex 32' -H 'X-Tenant-ID: 00000000-0000-0000-0000-000000000001' -d '{\"callId\":\"%s\",\"tenantId\":\"00000000-0000-0000-0000-000000000001\",\"storeId\":\"50000000-0000-0000-0000-000000000010\",\"did\":\"test\",\"callerNumber\":\"test\",\"aiAgentRef\":\"customer-care-voice\"}' -s -w '\\n%%{http_code}'",
        W3_GATEWAY_URL, uuid
    )
    local result = api:execute("system", curl_test)
    log_msg("notice", "POST result: " .. tostring(result))
    
    log_msg("notice", "========== TEST COMPLETED ==========")
    
    session:execute("playback", "ivr/ivr-thank_you_for_calling.wav")
    session:hangup()
else
    log_msg("err", "Session not ready")
end
