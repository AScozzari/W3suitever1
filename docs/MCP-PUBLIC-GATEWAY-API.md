# W3 Suite MCP Gateway - Guida Completa

## Panoramica Rapida

W3 Suite espone i suoi strumenti (tool) attraverso **tre metodi di connessione** diversi, ognuno pensato per un caso d'uso specifico:

| Vuoi connettere... | Usa questo endpoint | Protocollo |
|--------------------|---------------------|------------|
| **ChatGPT, Claude Desktop** | `/api/mcp-public/mcp` o `/api/mcp-public/sse` | MCP (JSON-RPC) |
| **n8n, Zapier, Script** | `/api/mcp-gateway/execute` | REST (HTTP) |
| **EdgeVoIP, client moderni** | `/api/mcp-public/mcp` | HTTP Streamable |

---

## I Tre Protocolli Spiegati

### 1. MCP SSE (Legacy)
**Endpoint:** `https://w3suite.it/api/mcp-public/sse`

Il protocollo originale MCP basato su Server-Sent Events. Funziona con:
- ChatGPT (configurazione MCP Server)
- Claude Desktop (via mcp-remote)
- AI agent che supportano MCP 2024-11-05

**Caratteristiche:**
- Connessione unidirezionale (server → client)
- Il client deve usare richieste POST separate per inviare comandi
- Può avere problemi con alcuni firewall/proxy

---

### 2. MCP HTTP Streamable (Raccomandato)
**Endpoint:** `https://w3suite.it/api/mcp-public/mcp`

Il nuovo standard MCP (spec 2025-03-26) che sostituisce SSE. Funziona con:
- EdgeVoIP e altri client moderni
- Nuove versioni di Claude Desktop
- Qualsiasi client MCP che supporta HTTP Streamable

**Caratteristiche:**
- Connessione bidirezionale
- Compatibile con firewall e proxy (sembra traffico HTTP normale)
- Supporta session management (`Mcp-Session-Id` header)
- Due modalità:
  - **Batch mode**: richiesta → risposta JSON singola
  - **Stream mode**: richiesta → eventi SSE in streaming

**Come funziona il rilevamento automatico:**
```
POST /api/mcp-public/mcp
Accept: application/json     → Batch mode (risposta JSON)
Accept: text/event-stream    → Stream mode (risposta SSE)
```

---

### 3. REST Gateway (Per automazioni)
**Endpoint:** `https://w3suite.it/api/mcp-gateway/execute`

API REST classica per chiamare tool direttamente. Funziona con:
- n8n (workflow automation)
- Zapier
- Script Python/Node.js/Bash
- Qualsiasi sistema che fa chiamate HTTP

**Caratteristiche:**
- Chiamata diretta: tu scegli quale tool chiamare
- Richiesta HTTP standard con JSON
- Nessun protocollo MCP, solo REST

---

## Autenticazione

Tutti e tre i metodi supportano le stesse opzioni di autenticazione:

### API Key (Raccomandato per automazioni)

```bash
# Nel URL (per ChatGPT/Claude)
https://w3suite.it/api/mcp-public/mcp?api_key=sk_live_xxx

# Nel header (per script/automazioni)
Authorization: Bearer sk_live_xxx
# oppure
X-MCP-Key: sk_live_xxx
```

**Formato API Key:**
- `sk_live_{tenant_slug}_{random}` - Produzione
- `sk_test_{tenant_slug}_{random}` - Test

### OAuth2 (Per browser/app)

Per integrazioni avanzate che richiedono login utente:

| Endpoint | URL |
|----------|-----|
| Authorize | `https://w3suite.it/oauth2/authorize` |
| Token | `https://w3suite.it/oauth2/token` |
| Revoke | `https://w3suite.it/oauth2/revoke` |

**Scopes:**
- `mcp_read` - Lettura tool (query)
- `mcp_write` - Scrittura tool (azioni operative)
- `tenant_access` - Accesso dati tenant

---

## Configurazione per Client Specifici

### ChatGPT

**Metodo semplice (API Key nel URL):**
1. Vai su ChatGPT → Settings → Connected Apps → MCP
2. Aggiungi:
   ```
   URL: https://w3suite.it/api/mcp-public/sse?api_key=sk_live_YOUR_KEY
   Authentication: None
   ```

**Metodo OAuth2:**
1. Aggiungi:
   ```
   URL: https://w3suite.it/api/mcp-public/sse
   Authentication: OAuth 2.0
   Authorization URL: https://w3suite.it/oauth2/authorize
   Token URL: https://w3suite.it/oauth2/token
   Scopes: openid tenant_access mcp_read mcp_write
   ```

---

### Claude Desktop

Aggiungi a `claude_desktop_config.json`:

**Con API Key (semplice):**
```json
{
  "mcpServers": {
    "w3suite": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://w3suite.it/api/mcp-public/mcp?api_key=sk_live_YOUR_KEY"
      ]
    }
  }
}
```

**Con OAuth2:**
```json
{
  "mcpServers": {
    "w3suite": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://w3suite.it/api/mcp-public/mcp",
        "--oauth-client-id", "claude-mcp-client",
        "--oauth-authorize-url", "https://w3suite.it/oauth2/authorize",
        "--oauth-token-url", "https://w3suite.it/oauth2/token",
        "--oauth-scopes", "openid tenant_access mcp_read mcp_write"
      ]
    }
  }
}
```

---

### EdgeVoIP / Client HTTP Streamable

Usa l'endpoint `/api/mcp-public/mcp` con transport `streamable-http`:

```javascript
const response = await fetch('https://w3suite.it/api/mcp-public/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_YOUR_KEY',
    'Content-Type': 'application/json',
    'Accept': 'application/json' // o 'text/event-stream' per streaming
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  })
});

// Il server risponde con Mcp-Session-Id header
const sessionId = response.headers.get('Mcp-Session-Id');
```

---

### n8n

1. Aggiungi nodo **HTTP Request**
2. Configura:
   - Method: `POST`
   - URL: `https://w3suite.it/api/mcp-gateway/execute`
   - Authentication: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer sk_live_YOUR_KEY`
3. Body:
   ```json
   {
     "tool": "mcp_hr_list_shifts",
     "params": {
       "limit": 10,
       "dateFrom": "2025-01-01"
     }
   }
   ```

---

### Zapier

1. Usa l'azione **Webhooks by Zapier**
2. Scegli **Custom Request**
3. Configura:
   - Method: `POST`
   - URL: `https://w3suite.it/api/mcp-gateway/execute`
   - Headers: `Authorization: Bearer sk_live_YOUR_KEY`
   - Data: come n8n

---

### Script Python

```python
import requests

API_KEY = 'sk_live_YOUR_KEY'

# Per MCP tool (HTTP Streamable)
response = requests.post(
    'https://w3suite.it/api/mcp-public/mcp',
    headers={
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    },
    json={
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'tools/call',
        'params': {
            'name': 'mcp_hr_list_shifts',
            'arguments': {'limit': 10}
        }
    }
)

print(response.json())
```

---

### cURL

```bash
# MCP (HTTP Streamable)
curl -X POST https://w3suite.it/api/mcp-public/mcp \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# REST Gateway
curl -X POST https://w3suite.it/api/mcp-gateway/execute \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool":"mcp_hr_list_shifts","params":{"limit":10}}'
```

---

## Formato Richieste e Risposte

### MCP (JSON-RPC 2.0)

**Richiesta:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "mcp_hr_list_shifts",
    "arguments": {
      "dateFrom": "2025-01-01",
      "dateTo": "2025-01-31",
      "limit": 100
    }
  }
}
```

**Risposta:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{"type": "text", "text": "[...]"}],
    "data": [...],
    "meta": {"rowCount": 10, "tool": "mcp_hr_list_shifts"}
  }
}
```

### REST Gateway

**Richiesta:**
```json
{
  "tool": "mcp_hr_list_shifts",
  "params": {
    "dateFrom": "2025-01-01",
    "limit": 100
  }
}
```

**Risposta:**
```json
{
  "success": true,
  "data": [...],
  "meta": {"rowCount": 10}
}
```

---

## Tool Disponibili

I tool disponibili dipendono dai permessi della tua API Key. Categorie principali:

| Categoria | Prefisso | Esempi |
|-----------|----------|--------|
| HR | `mcp_hr_*` | `mcp_hr_list_shifts`, `mcp_hr_leave_requests` |
| WMS | `mcp_wms_*` | `mcp_wms_inventory_summary`, `mcp_wms_movements` |
| CRM | `mcp_crm_*` | `mcp_crm_customers`, `mcp_crm_leads` |
| Sales | `mcp_sales_*` | `mcp_sales_transactions` |

Per vedere i tool disponibili per la tua API Key:
```bash
curl -X POST https://w3suite.it/api/mcp-public/mcp \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Rate Limiting

| Limite | Default | Configurabile |
|--------|---------|---------------|
| Per minuto | 60 req/min | Sì, per API Key |
| Per giorno | 1000 req/day | Sì, per API Key |

Headers di risposta:
- `X-RateLimit-Limit`: Limite massimo
- `X-RateLimit-Remaining`: Richieste rimanenti
- `X-RateLimit-Reset`: Timestamp reset

---

## Sicurezza

- **Tenant Isolation**: Ogni API Key è legata a un tenant specifico
- **SQL Injection Protection**: Query parametrizzate
- **Rate Limiting**: Per prevenire abusi
- **Origin Validation**: Protezione DNS rebinding per HTTP Streamable
- **Session Management**: `Mcp-Session-Id` per HTTP Streamable

---

## Troubleshooting

### "SSE non funziona"
Prova HTTP Streamable (`/api/mcp-public/mcp`) invece di SSE (`/sse`). Alcuni firewall/proxy bloccano connessioni SSE.

### "Tool not found"
Verifica che il tool sia abilitato per la tua API Key nelle impostazioni MCP Gateway.

### "Rate limit exceeded"
Attendi il reset o richiedi un aumento del limite.

### "Tenant mismatch"
L'API Key appartiene a un tenant diverso da quello nel token OAuth2.

---

## Riferimenti

- **Spec MCP 2025-03-26**: https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/
- **HTTP Streamable Deep Dive**: https://www.claudemcp.com/blog/mcp-streamable-http
