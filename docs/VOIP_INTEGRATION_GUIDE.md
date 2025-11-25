# W3 Suite VoIP Integration Guide

## Panoramica

Il sistema VoIP di W3 Suite è integrato con **edgvoip PBX** (FreeSWITCH) e offre:

- **SIP Trunks**: Gestione trunk SIP multi-store sincronizzati da edgvoip
- **Extensions**: Gestione completa estensioni WebRTC per utenti W3 Suite
- **AI Voice Agent**: Agente AI inbound customer care powered by OpenAI Realtime API
- **CDR Analytics**: Call Detail Records per analytics e reportistica
- **Contact Policies**: Regole business hours e fallback per chiamate

---

## 🏗️ Architettura Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        edgvoip PBX                               │
│                    (FreeSWITCH Infrastructure)                   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ SIP      │  │ DIDs     │  │ Routes   │  │ Trunks   │       │
│  │ Domains  │  │          │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            FreeSWITCH Dialplan                         │    │
│  │  - AI Voice Agent (Lua Script + HTTP Streaming)       │    │
│  │  - Extension Routing                                   │    │
│  │  - Transfer Logic                                      │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌────────────────────┐
│  W3 Suite     │              │  W3 Voice Gateway  │
│  Backend API  │◄─────────────│  (Port 3105)       │
│  (Port 3004)  │   WebSocket  │                    │
└───────────────┘              └────────────────────┘
        │                               │
        │ PostgreSQL                    │ WebSocket
        │ RLS                           │
        ▼                               ▼
┌───────────────┐              ┌────────────────────┐
│  Database     │              │  OpenAI Realtime   │
│  w3suite      │              │  API (gpt-4o)      │
│  - trunks     │              └────────────────────┘
│  - extensions │
│  - ai_sessions│
│  - cdrs       │
└───────────────┘
```

---

## 🔐 Environment Variables

Per abilitare la sincronizzazione bidirezionale con edgvoip, configurare le seguenti variabili d'ambiente:

```bash
# edgvoip API Configuration
EDGVOIP_API_URL=https://api.edgvoip.it
EDGVOIP_ACCESS_TOKEN=your_oauth_bearer_token_here
EDGVOIP_WEBHOOK_SECRET=your_webhook_signing_secret_here
```

**Descrizione**:
- `EDGVOIP_API_URL`: Base URL dell'API edgvoip (es. `https://api.edgvoip.it`)
- `EDGVOIP_ACCESS_TOKEN`: Token OAuth/Bearer per autenticazione API (fornito da edgvoip)
- `EDGVOIP_WEBHOOK_SECRET`: Secret condiviso per firma HMAC-SHA256 dei webhook e delle API request

**Security Note**: Il sistema usa **doppia autenticazione**:
1. **OAuth Bearer Token** (header `Authorization: Bearer ${token}`) per identificazione
2. **HMAC-SHA256 Signature** (header `X-W3-Signature`) per integrità richieste

Senza queste variabili configurate, gli endpoint di refresh ritorneranno `503 Service Unavailable`.

---

## 📊 Database Schema

### 1. VoIP Trunks (`voip_trunks`)

**Source of Truth**: edgvoip (read-only in W3 Suite)

```sql
CREATE TABLE w3suite.voip_trunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES w3suite.stores(id) ON DELETE CASCADE,
  
  -- Sync metadata
  edgvoip_trunk_id VARCHAR(255) UNIQUE,
  sync_source VARCHAR(20) DEFAULT 'edgvoip' NOT NULL,
  last_sync_at TIMESTAMP,
  
  -- Trunk configuration
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),              -- "Telecom Italia", "Vodafone"
  host VARCHAR(255),                  -- "sip.provider.it"
  port INTEGER DEFAULT 5060,
  protocol VARCHAR(10) DEFAULT 'udp', -- udp|tcp|tls
  did_range VARCHAR(100),             -- "+39 02 1234xxxx"
  max_channels INTEGER DEFAULT 10,
  current_channels INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active|inactive|suspended
  
  -- AI Voice Agent configuration
  ai_agent_enabled BOOLEAN DEFAULT false,
  ai_agent_ref VARCHAR(100),          -- "customer-care-voice"
  ai_time_policy JSONB,               -- Business hours
  ai_failover_extension VARCHAR(20),  -- Fallback extension
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE w3suite.voip_trunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON w3suite.voip_trunks
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**AI Time Policy Example**:
```json
{
  "monday": {"start": "09:00", "end": "18:00"},
  "tuesday": {"start": "09:00", "end": "18:00"},
  "wednesday": {"start": "09:00", "end": "18:00"},
  "thursday": {"start": "09:00", "end": "18:00"},
  "friday": {"start": "09:00", "end": "18:00"},
  "saturday": null,
  "sunday": null
}
```

### 2. VoIP Extensions (`voip_extensions`)

**Source of Truth**: W3 Suite (full CRUD)

```sql
CREATE TABLE w3suite.voip_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES w3suite.users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL,
  
  -- Extension config
  extension VARCHAR(20) NOT NULL,         -- "1001", "1002"
  sip_username VARCHAR(100) NOT NULL,     -- "user1001"
  sip_password TEXT NOT NULL,             -- Encrypted
  display_name VARCHAR(255),              -- "John Doe"
  email VARCHAR(255),
  
  -- SIP Server settings
  sip_server VARCHAR(255) DEFAULT 'sip.edgvoip.it',
  sip_port INTEGER DEFAULT 5060,
  ws_port INTEGER DEFAULT 7443,           -- WebRTC WebSocket
  transport VARCHAR(20) DEFAULT 'WSS',    -- WSS for WebRTC
  
  -- Caller ID
  caller_id_name VARCHAR(100),
  caller_id_number VARCHAR(50),           -- E.164 format
  
  -- Codecs (comma-separated, priority order)
  allowed_codecs VARCHAR(255) DEFAULT 'OPUS,G722,PCMU,PCMA',
  
  -- Security
  auth_realm VARCHAR(255),
  encryption_enabled BOOLEAN DEFAULT true,
  
  -- Features
  voicemail_enabled BOOLEAN DEFAULT true,
  voicemail_password VARCHAR(50),
  call_recording_enabled BOOLEAN DEFAULT false,
  call_forwarding_enabled BOOLEAN DEFAULT false,
  call_forwarding_number VARCHAR(50),
  do_not_disturb BOOLEAN DEFAULT false,
  
  -- Limits
  max_concurrent_calls INTEGER DEFAULT 4,
  registration_expiry INTEGER DEFAULT 3600,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',    -- active|inactive|suspended
  provisioning_status VARCHAR(20) DEFAULT 'pending',
  last_registration TIMESTAMP,
  user_agent VARCHAR(255),
  ip_address VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE w3suite.voip_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON w3suite.voip_extensions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 3. VoIP AI Sessions (`voip_ai_sessions`)

Traccia sessioni AI Voice Agent per analytics e debugging.

```sql
CREATE TABLE w3suite.voip_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES w3suite.stores(id) ON DELETE SET NULL,
  trunk_id UUID REFERENCES w3suite.voip_trunks(id) ON DELETE SET NULL,
  cdr_id UUID REFERENCES w3suite.voip_cdrs(id) ON DELETE SET NULL,
  
  call_id VARCHAR(255) NOT NULL,              -- FreeSWITCH UUID
  session_id VARCHAR(255) NOT NULL,           -- OpenAI session ID
  ai_agent_ref VARCHAR(100) NOT NULL,         -- "customer-care-voice"
  
  caller_number VARCHAR(50),
  did_number VARCHAR(50),
  
  start_ts TIMESTAMP NOT NULL,
  end_ts TIMESTAMP,
  duration_seconds INTEGER,
  
  transcript TEXT,                            -- Full conversation
  actions_taken JSONB,                        -- AI actions executed
  transferred_to VARCHAR(50),                 -- Extension if transferred
  transfer_reason VARCHAR(255),
  
  sentiment VARCHAR(50),                      -- positive|neutral|negative
  satisfaction_score INTEGER,                 -- 1-5
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE w3suite.voip_ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON w3suite.voip_ai_sessions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Actions Taken Example**:
```json
[
  {
    "action": "create_ticket",
    "timestamp": "2025-11-25T10:30:15Z",
    "params": {
      "subject": "Richiesta informazioni prodotto X",
      "priority": "medium"
    },
    "result": {
      "ticketId": "TKT-12345",
      "status": "success"
    }
  },
  {
    "action": "transfer_to_human",
    "timestamp": "2025-11-25T10:31:45Z",
    "params": {
      "extension": "1002",
      "reason": "customer_request"
    },
    "result": {
      "status": "completed"
    }
  }
]
```

### 4. VoIP CDRs (`voip_cdrs`)

Call Detail Records per analytics e billing.

```sql
CREATE TABLE w3suite.voip_cdrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES w3suite.stores(id) ON DELETE SET NULL,
  trunk_id UUID REFERENCES w3suite.voip_trunks(id) ON DELETE SET NULL,
  extension_id UUID REFERENCES w3suite.voip_extensions(id) ON DELETE SET NULL,
  
  call_id VARCHAR(255) NOT NULL UNIQUE,
  direction VARCHAR(20) NOT NULL,         -- inbound|outbound|internal
  call_type VARCHAR(20),                  -- voice|ai_voice|transfer
  
  caller_number VARCHAR(50),
  caller_name VARCHAR(255),
  called_number VARCHAR(50),
  called_name VARCHAR(255),
  
  start_time TIMESTAMP NOT NULL,
  answer_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  billable_seconds INTEGER,
  
  hangup_cause VARCHAR(50),               -- NORMAL_CLEARING, BUSY, etc.
  sip_status INTEGER,
  
  recording_url TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voip_cdrs_tenant ON w3suite.voip_cdrs(tenant_id);
CREATE INDEX idx_voip_cdrs_store ON w3suite.voip_cdrs(store_id);
CREATE INDEX idx_voip_cdrs_start_time ON w3suite.voip_cdrs(start_time DESC);

-- RLS Policy
ALTER TABLE w3suite.voip_cdrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON w3suite.voip_cdrs
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 🔌 API Endpoints

### Base URL
```
https://[your-domain].replit.dev/api/voip
```

### Authentication
Tutti gli endpoint richiedono:
- Header `X-Tenant-ID`: UUID del tenant
- Cookie di sessione autenticata

---

### Trunks API (Read-Only)

#### `GET /api/voip/trunks`
Lista tutti i trunk del tenant con informazioni store.

**Query Parameters**:
- `storeId` (optional): Filtra per store specifico

**Response**:
```json
[
  {
    "trunk": {
      "id": "uuid",
      "tenantId": "uuid",
      "storeId": "uuid",
      "edgvoipTrunkId": "b773a426-c646-47e4-ba13-1320dc8724cb",
      "name": "Messagenet Bologna Centrale",
      "provider": "Messagenet",
      "host": "sip.messagenet.it",
      "port": 5060,
      "protocol": "udp",
      "didRange": "+39 051 xxxxxxx",
      "maxChannels": 30,
      "currentChannels": 2,
      "status": "active",
      "aiAgentEnabled": true,
      "aiAgentRef": "customer-care-voice",
      "aiTimePolicy": {...},
      "aiFailoverExtension": "1000",
      "lastSyncAt": "2025-11-25T09:30:00Z",
      "extensionsCount": 15
    },
    "storeName": "Bologna Centro"
  }
]
```

#### `GET /api/voip/trunks/:id`
Dettagli trunk singolo.

**Response**:
```json
{
  "trunk": {...},
  "storeName": "Bologna Centro",
  "extensions": [
    {
      "id": "uuid",
      "extension": "1001",
      "displayName": "Mario Rossi",
      "status": "active"
    }
  ]
}
```

---

### Extensions API (Full CRUD)

#### `GET /api/voip/extensions`
Lista tutte le extension del tenant.

**Query Parameters**:
- `storeId` (optional): Filtra per store
- `status` (optional): Filtra per stato (active, inactive, suspended)

**Response**:
```json
[
  {
    "extension": {
      "id": "uuid",
      "tenantId": "uuid",
      "userId": "user-id",
      "extension": "1001",
      "sipUsername": "user1001",
      "displayName": "Mario Rossi",
      "email": "mario.rossi@example.com",
      "sipServer": "sip.edgvoip.it",
      "sipPort": 5060,
      "wsPort": 7443,
      "transport": "WSS",
      "callerIdName": "Mario Rossi",
      "callerIdNumber": "+390512345678",
      "allowedCodecs": "OPUS,G722,PCMU,PCMA",
      "voicemailEnabled": true,
      "status": "active",
      "provisioningStatus": "provisioned",
      "lastRegistration": "2025-11-25T09:45:00Z",
      "userAgent": "Z3-r15346 rv2.8.20",
      "ipAddress": "192.168.1.50"
    },
    "userName": "Mario Rossi",
    "userEmail": "mario.rossi@example.com",
    "storeAccess": [
      {
        "storeId": "uuid",
        "storeName": "Bologna Centro",
        "canReceiveCalls": true,
        "canMakeCalls": true,
        "isPrimary": true
      }
    ]
  }
]
```

#### `POST /api/voip/extensions`
Crea nuova extension.

**Request Body**:
```json
{
  "userId": "user-id",
  "extension": "1005",
  "sipUsername": "user1005",
  "displayName": "Giovanni Bianchi",
  "email": "giovanni.bianchi@example.com",
  "callerIdName": "Giovanni Bianchi",
  "callerIdNumber": "+390512345679",
  "voicemailEnabled": true,
  "voicemailPassword": "1234",
  "maxConcurrentCalls": 4
}
```

**Response**:
```json
{
  "extension": {...},
  "sipCredentials": {
    "extension": "1005",
    "sipUsername": "user1005",
    "sipPassword": "generated-secure-password",
    "sipServer": "sip.edgvoip.it",
    "sipPort": 5060,
    "wsPort": 7443
  }
}
```

#### `PATCH /api/voip/extensions/:id`
Aggiorna extension esistente.

**Request Body** (campi opzionali):
```json
{
  "displayName": "Giovanni Bianchi Updated",
  "callerIdName": "G. Bianchi",
  "voicemailEnabled": false,
  "status": "inactive"
}
```

#### `DELETE /api/voip/extensions/:id`
Elimina extension.

**Response**:
```json
{
  "success": true,
  "message": "Extension deleted successfully"
}
```

#### `GET /api/voip/extensions/:id/credentials`
Recupera credenziali SIP (richiede permesso voip.extensions.view_credentials).

**Response**:
```json
{
  "extension": "1005",
  "sipUsername": "user1005",
  "sipPassword": "password",
  "sipServer": "sip.edgvoip.it",
  "sipPort": 5060,
  "wsPort": 7443
}
```

---

### AI Sessions API

#### `GET /api/voip/ai-sessions`
Lista sessioni AI Voice Agent.

**Query Parameters**:
- `storeId` (optional)
- `startDate` (optional): ISO 8601
- `endDate` (optional): ISO 8601
- `sentiment` (optional): positive|neutral|negative

**Response**:
```json
[
  {
    "id": "uuid",
    "callId": "freeswitch-uuid",
    "sessionId": "openai-session-id",
    "aiAgentRef": "customer-care-voice",
    "callerNumber": "+393297626144",
    "didNumber": "0510510510",
    "startTs": "2025-11-25T10:30:00Z",
    "endTs": "2025-11-25T10:35:30Z",
    "durationSeconds": 330,
    "transcript": "...",
    "actionsTaken": [...],
    "transferredTo": "1002",
    "transferReason": "customer_request",
    "sentiment": "positive",
    "satisfactionScore": 5
  }
]
```

#### `GET /api/voip/ai-sessions/:id`
Dettagli sessione singola con transcript completo.

---

### CDRs API

#### `GET /api/voip/cdrs`
Lista Call Detail Records.

**Query Parameters**:
- `storeId` (optional)
- `startDate` (optional)
- `endDate` (optional)
- `direction` (optional): inbound|outbound|internal
- `page` (optional): Numero pagina (default: 1)
- `limit` (optional): Records per pagina (default: 50)

**Response**:
```json
{
  "cdrs": [
    {
      "id": "uuid",
      "callId": "freeswitch-uuid",
      "direction": "inbound",
      "callType": "ai_voice",
      "callerNumber": "+393297626144",
      "calledNumber": "0510510510",
      "startTime": "2025-11-25T10:30:00Z",
      "answerTime": "2025-11-25T10:30:02Z",
      "endTime": "2025-11-25T10:35:30Z",
      "durationSeconds": 330,
      "billableSeconds": 328,
      "hangupCause": "NORMAL_CLEARING",
      "recordingUrl": "https://...",
      "storeName": "Bologna Centro"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "pages": 5
  }
}
```

---

## 🤖 AI Voice Agent Integration

### Overview
Il sistema AI Voice Agent utilizza OpenAI Realtime API (`gpt-4o-realtime-preview-2024-10-01`) per gestire chiamate inbound customer care.

### Flusso Chiamata

```
1. Cliente chiama DID (es. 0510510510)
   ↓
2. FreeSWITCH riceve chiamata su trunk
   ↓
3. Dialplan check: AI Agent abilitato + Business Hours?
   ├─ SI → Esegue Lua script (ai_http_streaming_realtime_FIXED.lua)
   └─ NO → Route a extension/IVR normale
   ↓
4. Lua script:
   - POST /api/voice/session/create (crea sessione OpenAI)
   - Loop: invia audio chunk ogni 20ms → POST /api/voice/stream/:callId
   - Loop: riceve risposta AI → GET /api/voice/stream/:callId/response
   - Playback audio AI al cliente
   ↓
5. AI Agent può:
   - Rispondere a domande
   - Creare ticket in W3 CRM
   - Trasferire a operatore umano (extension)
   - Raccogliere dati cliente
   ↓
6. Fine chiamata:
   - POST /api/voice/session/:callId/end
   - Salva transcript + actions in voip_ai_sessions
   - Crea CDR in voip_cdrs
```

### Configurazione AI Agent in Trunk

```json
{
  "aiAgentEnabled": true,
  "aiAgentRef": "customer-care-voice",
  "aiTimePolicy": {
    "monday": {"start": "09:00", "end": "18:00"},
    "tuesday": {"start": "09:00", "end": "18:00"},
    "wednesday": {"start": "09:00", "end": "18:00"},
    "thursday": {"start": "09:00", "end": "18:00"},
    "friday": {"start": "09:00", "end": "18:00"},
    "saturday": null,
    "sunday": null
  },
  "aiFailoverExtension": "1000"
}
```

**Logica Business Hours**:
- Se chiamata arriva in orario (`aiTimePolicy`) → AI Agent risponde
- Se fuori orario → Transfer automatico a `aiFailoverExtension`

### Voice Gateway API

Base URL: `https://[your-domain].replit.dev`

#### `POST /api/voice/session/create`
Inizializza sessione OpenAI.

**Headers**:
- `X-API-Key`: API key configurata in `W3_VOICE_GATEWAY_API_KEY`

**Request**:
```json
{
  "callId": "freeswitch-uuid",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "storeId": "50000000-0000-0000-0000-000000000010",
  "did": "0510510510",
  "callerNumber": "+393297626144",
  "aiAgentRef": "customer-care-voice"
}
```

**Response**:
```json
{
  "sessionId": "freeswitch-uuid",
  "status": "created"
}
```

#### `POST /api/voice/stream/:callId`
Invia chunk audio PCM16 @ 16kHz mono.

**Headers**:
- `X-API-Key`: API key
- `Content-Type`: application/json

**Request**:
```json
{
  "audio": "base64_encoded_pcm16_audio"
}
```

**Response**:
```json
{
  "status": "streamed"
}
```

#### `GET /api/voice/stream/:callId/response?timeout=5000`
Long polling per ricevere risposta AI.

**Query Parameters**:
- `timeout`: Millisecondi di attesa (default: 5000)

**Response**:
```json
{
  "audio": "base64_encoded_pcm16_audio",
  "transcript": "[AI]: Buongiorno, come posso aiutarla?",
  "hasMore": true
}
```

#### `POST /api/voice/session/:callId/end`
Chiude sessione e salva dati.

**Response**:
```json
{
  "status": "ended",
  "summary": {
    "callId": "freeswitch-uuid",
    "duration": 330000,
    "transcript": ["[User]: ...", "[AI]: ..."],
    "actions": [...]
  }
}
```

---

## 📱 WebRTC Client Setup

### 1. Ottenere Credenziali Extension

```javascript
const response = await fetch('/api/voip/extensions/MY_EXTENSION_ID/credentials', {
  headers: {
    'X-Tenant-ID': 'tenant-uuid'
  }
});

const credentials = await response.json();
// {
//   extension: "1001",
//   sipUsername: "user1001",
//   sipPassword: "password",
//   sipServer: "sip.edgvoip.it",
//   sipPort: 5060,
//   wsPort: 7443
// }
```

### 2. Configurare SIP.js Client

```javascript
import { Web as SIP } from 'sip.js';

const userAgent = new SIP.SimpleUser({
  aor: `sip:${credentials.sipUsername}@${credentials.sipServer}`,
  media: {
    constraints: { audio: true, video: false },
    remote: { audio: document.getElementById('remoteAudio') }
  },
  userAgentOptions: {
    authorizationUsername: credentials.sipUsername,
    authorizationPassword: credentials.sipPassword,
    transportOptions: {
      server: `wss://${credentials.sipServer}:${credentials.wsPort}`,
      connectionTimeout: 10
    },
    sessionDescriptionHandlerFactoryOptions: {
      peerConnectionConfiguration: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    }
  }
});

// Connetti
await userAgent.connect();
await userAgent.register();

// Effettua chiamata
await userAgent.call(`sip:${targetExtension}@${credentials.sipServer}`);

// Riaggancia
await userAgent.hangup();
```

### 3. Gestire Eventi

```javascript
userAgent.delegate = {
  onCallCreated: () => {
    console.log('Call created');
  },
  onCallReceived: async () => {
    console.log('Incoming call');
    await userAgent.answer();
  },
  onCallAnswered: () => {
    console.log('Call answered');
  },
  onCallHangup: () => {
    console.log('Call ended');
  },
  onRegistered: () => {
    console.log('Registered with SIP server');
  },
  onUnregistered: () => {
    console.log('Unregistered');
  }
};
```

---

## 🔧 Provisioning Extension su edgvoip

### Workflow Automatico

1. **W3 Suite crea extension** → `POST /api/voip/extensions`
2. **W3 Backend invia webhook a edgvoip**:
   ```bash
   POST https://api.edgvoip.it/v1/extensions
   {
     "tenantId": "...",
     "extension": "1005",
     "sipUsername": "user1005",
     "sipPassword": "...",
     "displayName": "Giovanni Bianchi",
     "domainId": "uuid"
   }
   ```
3. **edgvoip provisiona extension in FreeSWITCH**
4. **edgvoip risponde con conferma**
5. **W3 Suite aggiorna `provisioning_status` → `provisioned`**

### Sync Bidirezionale

- **W3 → edgvoip**: Creazione/modifica/cancellazione extension
- **edgvoip → W3**: Webhook per aggiornamenti stato registrazione, IP address, user agent

---

## 📞 Call Flow Examples

### Esempio 1: Chiamata Inbound a AI Agent

```
1. Cliente chiama: +39 051 0510510
2. FreeSWITCH riceve su trunk "Messagenet Bologna"
3. Dialplan check:
   - AI Agent enabled: YES
   - Business hours (Lunedì 10:30): YES
4. Esegue lua script
5. Script POST /api/voice/session/create
6. Loop audio streaming:
   - Ogni 20ms: POST /api/voice/stream/CALL_ID (audio cliente)
   - Ogni 100ms: GET /api/voice/stream/CALL_ID/response (audio AI)
   - Playback audio AI a cliente
7. AI risponde: "Buongiorno, come posso aiutarla?"
8. Cliente: "Vorrei informazioni sul prodotto X"
9. AI crea ticket CRM:
   {
     "action": "create_ticket",
     "params": {"subject": "Info prodotto X"}
   }
10. Cliente: "Vorrei parlare con un operatore"
11. AI transfer a extension 1002
12. POST /api/voice/session/CALL_ID/end
13. Salva transcript + actions in DB
```

### Esempio 2: Chiamata Extension-to-Extension

```
1. Extension 1001 chiama extension 1002
2. FreeSWITCH route interna
3. 1002 squilla (se registrato)
4. Conversazione
5. CDR salvato con:
   - direction: "internal"
   - caller_number: "1001"
   - called_number: "1002"
```

### Esempio 3: Chiamata Outbound da Extension

```
1. Extension 1001 chiama +39 02 12345678
2. FreeSWITCH seleziona trunk con DIDs disponibili
3. Imposta Caller ID: "+39 051 2345678" (trunk DID)
4. Chiamata esce via trunk SIP
5. CDR salvato con:
   - direction: "outbound"
   - caller_number: "1001"
   - called_number: "+390212345678"
```

---

## 🛠️ Troubleshooting

### Extension non si registra

**Problema**: Extension mostra `provisioningStatus: "pending"` o `lastRegistration: null`

**Soluzioni**:
1. Verificare credenziali SIP corrette
2. Controllare firewall blocchi porta 7443 (WSS)
3. Verificare certificato SSL valido per `sip.edgvoip.it`
4. Log FreeSWITCH: `fs_cli -x "sofia status profile internal"`

### AI Agent non risponde

**Problema**: Chiamata a DID con AI abilitato ma nessuna risposta

**Soluzioni**:
1. Verificare `aiAgentEnabled: true` su trunk
2. Controllare business hours in `aiTimePolicy`
3. Verificare Voice Gateway raggiungibile: `curl https://[domain]/health`
4. Log FreeSWITCH: cercare `[AI_REALTIME_FIXED]` in console
5. Verificare API Key corretta in Lua script

### One-way Audio

**Problema**: Si sente solo in una direzione

**Soluzioni**:
1. Verificare `bypass_media=false` in dialplan FreeSWITCH
2. Controllare codec supportati: `OPUS,G722,PCMU,PCMA`
3. Verificare STUN server configurato in WebRTC client
4. Firewall: aprire porte RTP 16384-32768

### CDR mancanti

**Problema**: Chiamate non appaiono in analytics

**Soluzioni**:
1. Verificare webhook edgvoip → W3 configurato
2. Controllare RLS policy su `voip_cdrs` table
3. Verificare `tenant_id` corretto in CDR
4. Log backend: cercare errori INSERT in `voip_cdrs`

---

## 📚 Riferimenti

- **OpenAI Realtime API**: https://platform.openai.com/docs/guides/realtime
- **SIP.js Documentation**: https://sipjs.com/
- **FreeSWITCH Docs**: https://freeswitch.org/confluence/
- **WebRTC Best Practices**: https://webrtc.org/getting-started/overview

---

## 🔐 Sicurezza

### Best Practices

1. **SIP Passwords**: Generare password casuali lunghe (min 32 caratteri)
2. **API Keys**: Rotazione periodica ogni 90 giorni
3. **TLS/WSS**: Sempre usare transport criptato per WebRTC
4. **RLS**: Row Level Security abilitata su tutte le tabelle VoIP
5. **Rate Limiting**: Limitare chiamate API per prevenire abuse
6. **Audit Log**: Tracciare tutte le operazioni CRUD su extensions

### Encrypted Storage

```sql
-- Encrypt SIP passwords at application level before insert
-- Use AES-256-GCM with tenant-specific encryption keys
```

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2025-11-25  
**Autore**: W3 Suite Development Team
