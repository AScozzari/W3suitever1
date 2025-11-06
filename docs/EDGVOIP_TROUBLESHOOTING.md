# 🚨 edgvoip FreeSWITCH - Troubleshooting Guide

## ❌ Problema: AI Agent Non Risponde (Solo Musica)

### Sintomi
- ✅ Voice Gateway riceve la chiamata (crea sessione)
- ✅ OpenAI si connette correttamente
- ❌ **FreeSWITCH NON invia audio** al Voice Gateway
- ❌ L'utente sente solo musica d'attesa

---

## 🔍 Diagnostica Step-by-Step

### STEP 1: Verifica Script Caricato

Connettiti al server FreeSWITCH e verifica:

```bash
ssh root@pbx.edgvoip.it
ls -la /usr/share/freeswitch/scripts/ | grep ai_http
```

**Deve mostrare:**
```
-rw-r--r-- 1 freeswitch freeswitch 8234 Nov 05 23:00 ai_http_streaming_realtime_FIXED.lua
-rw-r--r-- 1 freeswitch freeswitch 2145 Nov 05 23:15 test_audio_simple.lua
```

Se NON esiste, carica lo script:
```bash
scp edgvoip_scripts/ai_http_streaming_realtime_FIXED.lua root@pbx.edgvoip.it:/usr/share/freeswitch/scripts/
chmod 644 /usr/share/freeswitch/scripts/ai_http_streaming_realtime_FIXED.lua
chown freeswitch:freeswitch /usr/share/freeswitch/scripts/ai_http_streaming_realtime_FIXED.lua
```

---

### STEP 2: Test Script Diagnostico

Carica e testa lo script minimale:

```bash
scp edgvoip_scripts/test_audio_simple.lua root@pbx.edgvoip.it:/usr/share/freeswitch/scripts/
```

Modifica temporaneamente il dialplan per usare lo script di test:

```xml
<extension name="ai-voice-test">
  <condition field="destination_number" expression="^(NUMERO_TRUNK)$">
    <action application="lua" data="test_audio_simple.lua"/>
  </condition>
</extension>
```

Ricarica dialplan:
```bash
fs_cli -x "reloadxml"
```

**Chiama il numero** e controlla i log:

```bash
fs_cli -x "console loglevel debug"
# Cerca: [TEST_AUDIO]
```

**Risultati Attesi:**
```
[TEST_AUDIO] TEST 1: Health check HTTP code: 200
[TEST_AUDIO] TEST 2: ✅ Audio file created: 96044 bytes
[TEST_AUDIO] File header: 52 49 46 46 (RIFF WAV)
[TEST_AUDIO] TEST 3: ✅ Base64 works: dGVzdAo=
[TEST_AUDIO] TEST 4: POST result: 200
```

---

### STEP 3: Controlla Logs FreeSWITCH

Cerca errori durante la chiamata:

```bash
tail -f /var/log/freeswitch/freeswitch.log | grep -i "ai_http\|error\|fail"
```

**Errori Comuni:**

#### A) **Permission denied** su `/tmp/`
```
[ERR] mod_lua.cpp:203 cannot open /tmp/audio_chunk_XXX.wav: Permission denied
```

**Fix:**
```bash
chmod 777 /tmp
chown freeswitch:freeswitch /tmp
```

#### B) **Curl non trovato**
```
[ERR] mod_commands.c:5367 system: Command not found
```

**Fix:**
```bash
apt-get install curl
# Verifica:
which curl  # Deve mostrare: /usr/bin/curl
```

#### C) **Base64 non funziona**
```
[ERR] base64: command not found
```

**Fix:**
```bash
apt-get install coreutils
```

---

### STEP 4: Verifica Dialplan

Controlla che il dialplan chiami correttamente lo script:

```bash
fs_cli
> xml_locate dialplan
```

Cerca la configurazione del trunk. Deve contenere:

```xml
<extension name="inbound-trunk-messagenet">
  <condition field="destination_number" expression="^(0510510510)$">
    <action application="set" data="bypass_media=false"/>
    <action application="answer"/>
    <action application="sleep" data="500"/>
    <action application="lua" data="ai_http_streaming_realtime_FIXED.lua"/>
  </condition>
</extension>
```

**IMPORTANTE:** 
- `bypass_media=false` - Necessario per registrare audio!
- `answer` prima dello script - Risponde alla chiamata
- `sleep 500` - Stabilizza la connessione

---

### STEP 5: Test Manuale Recording

Testa se FreeSWITCH può registrare audio:

```bash
fs_cli
> originate sofia/internal/1000@demo.edgvoip.it &record(/tmp/test_manual.wav)
```

Poi verifica:
```bash
ls -lh /tmp/test_manual.wav
file /tmp/test_manual.wav  # Deve dire: RIFF (little-endian) data, WAVE audio
```

Se **NON funziona**, il problema è la configurazione audio di FreeSWITCH.

---

### STEP 6: Fix Audio Playback (AI Genera Audio Ma Non Si Sente)

#### Sintomi
- ✅ Voice Gateway riceve audio dal chiamante
- ✅ OpenAI genera risposta (vedi log: "310KB audio generato")
- ✅ FreeSWITCH riceve audio AI in formato base64
- ❌ **L'utente NON sente l'audio AI** (silenzio)

#### Causa
Il metodo `file_string://` non funziona su tutti i setup FreeSWITCH. OpenAI restituisce PCM16 raw senza header WAV, che FreeSWITCH non riproduce correttamente.

#### Soluzione: Conversione PCM → WAV con Sox

Lo script `ai_http_streaming_realtime_FIXED.lua` è stato aggiornato (righe 222-233) per convertire il PCM raw in formato WAV standard prima del playback:

```lua
-- Convert RAW PCM16 to WAV with header for FreeSWITCH compatibility
-- OpenAI returns: PCM16, 16kHz, mono, little-endian
local ai_wav_file = "/tmp/ai_audio_" .. uuid .. ".wav"
local sox_cmd = string.format(
    "sox -t raw -r 16000 -e signed-integer -b 16 -c 1 -L %s %s",
    ai_audio_file,
    ai_wav_file
)
local sox_result = os.execute(sox_cmd)

-- Only play if conversion succeeded
if sox_result == 0 or sox_result == true then
    session:execute("playback", ai_wav_file)
else
    -- Log error and skip playback
    log_msg("err", "Sox conversion failed")
end
```

#### Requisiti

**1. Installa Sox su FreeSWITCH**

```bash
ssh root@pbx.edgvoip.it
apt-get update
apt-get install sox libsox-fmt-all -y

# Verifica installazione
sox --version
# Deve mostrare: SoX v14.4.2 o superiore
```

**2. Testa Conversione Sox Manuale**

```bash
# Crea file PCM raw di test (silenzio 1 secondo)
dd if=/dev/zero of=/tmp/test.raw bs=32000 count=1

# Converti in WAV (IMPORTANTE: -t raw -L per specificare formato input)
sox -t raw -r 16000 -e signed-integer -b 16 -c 1 -L /tmp/test.raw /tmp/test.wav

# Verifica header WAV
file /tmp/test.wav
# Deve mostrare: RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 16000 Hz
```

**3. Deploy Script Aggiornato**

```bash
# Dal tuo computer (dentro la repo W3 Suite)
scp edgvoip_scripts/ai_http_streaming_realtime_FIXED.lua root@pbx.edgvoip.it:/usr/share/freeswitch/scripts/

# Su FreeSWITCH
chmod 644 /usr/share/freeswitch/scripts/ai_http_streaming_realtime_FIXED.lua
chown freeswitch:freeswitch /usr/share/freeswitch/scripts/ai_http_streaming_realtime_FIXED.lua

# NON serve restart FreeSWITCH - lo script viene ricaricato ad ogni chiamata
```

**4. Test Chiamata Reale**

Chiama il numero trunk e controlla i log:

```bash
fs_cli -x "console loglevel debug" | grep -i "AI_REALTIME\|sox"
```

**Log Attesi:**
```
[AI_REALTIME] 🎙️ AI SPEAKING! Playing response...
[AI_REALTIME] ✅ AI audio played successfully
```

**Se vedi errore Sox:**
```bash
# Errore comune: sox: command not found
# Fix: Installa sox come indicato sopra

# Errore: sox: SoX failed to determine format
# Fix: Verifica che il file raw esista prima della conversione
```

#### Alternative se Sox Non Funziona

Se sox non è disponibile, puoi usare `ffmpeg`:

```lua
-- Alternative: FFmpeg invece di Sox
local ffmpeg_cmd = string.format(
    "ffmpeg -f s16le -ar 16000 -ac 1 -i %s %s -y -loglevel quiet",
    ai_audio_file,
    ai_wav_file
)
local ffmpeg_result = os.execute(ffmpeg_cmd)

-- Check success before playback
if ffmpeg_result == 0 or ffmpeg_result == true then
    session:execute("playback", ai_wav_file)
end
```

Installa ffmpeg:
```bash
apt-get install ffmpeg -y
```

---

## 🛠️ Soluzioni Alternative IMMEDIATE

### SOLUZIONE A: Greeting Automatico (TEMPORANEA)

Se lo script Lua non funziona, usa un greeting pre-registrato mentre sistemi:

```xml
<extension name="ai-greeting-fallback">
  <condition field="destination_number" expression="^(0510510510)$">
    <action application="answer"/>
    <action application="sleep" data="500"/>
    <action application="playback" data="/usr/share/freeswitch/sounds/greeting_w3suite.wav"/>
    <action application="transfer" data="2000 XML demo.edgvoip.it"/>
  </condition>
</extension>
```

Crea il file audio:
```bash
# Usa text-to-speech o registra manualmente:
echo "Buongiorno, sono l'assistente vocale di W3 Suite. Per favore riprova più tardi." | \
  espeak -v it -s 150 -w /usr/share/freeswitch/sounds/greeting_w3suite.wav
```

---

### SOLUZIONE B: Bypass FreeSWITCH - SIP.js Diretto

Se FreeSWITCH crea troppi problemi, usa SIP.js nel browser per chiamare **direttamente** W3 Voice Gateway (WebSocket mode):

**Frontend React:**
```typescript
import { Web } from 'sip.js';

const simpleUser = new Web.SimpleUser('wss://voice-gateway.w3suite.com', {
  media: { remote: { audio: remoteAudio } },
  userAgentOptions: { authorizationUsername: 'customer', authorizationPassword: 'secret' }
});

await simpleUser.connect();
await simpleUser.call('sip:ai-agent@w3suite.com');
```

**Pro:** Nessuna dipendenza da FreeSWITCH  
**Contro:** Solo da browser, non da telefono PSTN

---

## 📞 Contatta Supporto edgvoip

Se dopo questi test il problema persiste, **apri ticket con edgvoip** includendo:

```
Oggetto: Script Lua AI Agent non registra audio

Descrizione:
- Trunk ID: b773a426-c646-47e4-ba13-1320dc8724cb (Messagenet Bologna)
- DID: 0510510510
- Script: ai_http_streaming_realtime_FIXED.lua
- Problema: FreeSWITCH non esegue comando `record`, nessun file creato in /tmp/

Log allegati:
- /var/log/freeswitch/freeswitch.log (ultimi 500 righe)
- Output test_audio_simple.lua

Richiesta:
Verificare permessi /tmp/, codec audio trunk, configurazione mod_lua
```

---

## ✅ Checklist Finale

Prima di contattare supporto, verifica:

- [ ] Script caricato in `/usr/share/freeswitch/scripts/`
- [ ] Permessi corretti (644, freeswitch:freeswitch)
- [ ] Dialplan modificato e ricaricato (`reloadxml`)
- [ ] Test script diagnostico eseguito
- [ ] Logs FreeSWITCH controllati per errori
- [ ] Voice Gateway health check passa (200 OK)
- [ ] Recording manuale funziona (`&record(/tmp/test.wav)`)

---

## 🎯 Next Steps

1. **Ora:** Esegui test diagnostico con `test_audio_simple.lua`
2. **Entro 1h:** Controlla logs FreeSWITCH per errori specifici
3. **Se fallisce:** Contatta edgvoip con log completi
4. **Alternativa:** Usa greeting pre-registrato mentre sistemi

**Il Voice Gateway W3 funziona perfettamente. Il problema è solo la configurazione FreeSWITCH lato edgvoip.** 🚀
