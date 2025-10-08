# MCP OAuth E2E Testing Guide

## 🎯 Obiettivo Task 7
Testare il sistema multi-user OAuth completo con almeno 2 provider (Google + Microsoft) e 2+ utenti diversi per verificare:
- ✅ Isolamento credenziali per utente
- ✅ OAuth flow completo con consent screen
- ✅ Token refresh automatico
- ✅ Cross-provider support
- ✅ UI badge real-time updates

---

## 📋 Prerequisiti

### 1. **Setup OAuth Apps Esterni**

#### Google Workspace OAuth
1. Vai a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea nuovo progetto "W3Suite MCP Testing"
3. Abilita APIs: Gmail API, Calendar API, Drive API
4. Crea OAuth 2.0 Client ID (Web Application)
5. Redirect URI: `https://<your-replit-domain>/api/mcp/oauth/google/callback`
6. Copia **Client ID** e **Client Secret**
7. Aggiungi ai secrets Replit:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

#### Microsoft 365 OAuth
1. Vai a [Azure Portal](https://portal.azure.com/)
2. App Registrations → New Registration "W3Suite MCP"
3. Platform: Web, Redirect URI: `https://<your-replit-domain>/api/mcp/oauth/microsoft/callback`
4. API Permissions: Microsoft Graph (Mail.Read, Calendars.Read, Files.Read)
5. Certificates & Secrets → New Client Secret
6. Copia **Application (client) ID** e **Client Secret**
7. Aggiungi ai secrets Replit:
   ```
   MICROSOFT_CLIENT_ID=your_app_id
   MICROSOFT_CLIENT_SECRET=your_client_secret
   MICROSOFT_TENANT_ID=common
   ```

### 2. **Setup Utenti Test**
Crea almeno 2 utenti diversi nel sistema W3Suite:
- **User A**: admin@test.com (Google account personale)
- **User B**: sales@test.com (Microsoft 365 account aziendale)

---

## 🧪 Test Cases

### **TC1: Google OAuth Flow - User A**

**Steps:**
1. Login come `admin@test.com`
2. Vai su **Workflow Editor** → **Impostazioni MCP**
3. Tab **Google Workspace**
4. Verifica status badge: `Non configurato` (grigio)
5. Click **"Connetti Google Workspace"**
6. Verifica redirect a Google consent screen
7. Accetta permessi richiesti (Gmail, Calendar, Drive)
8. Verifica redirect back to W3Suite
9. Badge deve mostrare:
   - ✅ Dot verde animato + icon CheckCircle
   - ✅ Status "Attiva"
   - ✅ Timestamp connessione (formato IT)
   - ✅ Scadenza token (1 ora da adesso)
   - ✅ Scope count (es. "3 scope(s)")

**Expected:**
- Credenziali salvate con `userId = User A ID`
- Tokens encrypted in DB (`mcp_credentials` table)
- Server `google-workspace` auto-creato se mancante

---

### **TC2: Microsoft OAuth Flow - User B**

**Steps:**
1. **Logout** User A
2. Login come `sales@test.com`
3. Vai su **Workflow Editor** → **Impostazioni MCP**
4. Tab **Microsoft 365**
5. Verifica status: `Non configurato` (User B non vede credenziali di User A)
6. Click **"Connetti Microsoft 365"**
7. Consent screen Microsoft (lavoro/scuola)
8. Accetta permessi (Mail, Calendar, Files)
9. Redirect back to W3Suite
10. Badge mostra status "Attiva" con dettagli User B

**Expected:**
- Credenziali salvate con `userId = User B ID`
- **NO cross-user leakage**: User B non vede Google di User A
- Server `microsoft-365` auto-creato se mancante

---

### **TC3: Multi-Provider Support - User A**

**Steps:**
1. Login come `admin@test.com` (User A)
2. Vai su **Impostazioni MCP** → **Microsoft 365** tab
3. Click **"Connetti Microsoft 365"**
4. Completa OAuth flow
5. Torna su **Impostazioni MCP**
6. Verifica **entrambi** i tab:
   - ✅ **Google Workspace**: Attiva (credenziali precedenti)
   - ✅ **Microsoft 365**: Attiva (nuove credenziali)

**Expected:**
- User A ha **2 provider** attivi simultaneamente
- Ogni provider ha badge separato con timestamp differenti
- Isolation: User B non vede le credenziali Microsoft di User A

---

### **TC4: Credential Isolation Test**

**Steps:**
1. Login User A → Vai su **Google Workspace** tab
2. Annota timestamp connessione (es. "08/10/2025 15:30:22")
3. **Logout** User A
4. Login User B → Vai su **Google Workspace** tab
5. Verifica status: `Non configurato` (User B non vede credenziali User A)
6. Login User A di nuovo
7. Badge Google deve mostrare **stesso timestamp** di step 2

**Expected:**
- ✅ Credentials filtered by `userId` server-side
- ✅ No cross-user credential visibility
- ✅ Persistent state per user dopo logout/login

---

### **TC5: Token Refresh Automatico**

**Background Service Check:**
1. Apri terminal Replit
2. Check logs token refresh service:
   ```bash
   grep "Token Refresh" /tmp/logs/Start_application_*.log | tail -20
   ```
3. Deve mostrare cicli ogni 15 minuti:
   ```
   [Token Refresh] Starting refresh cycle
   [Token Refresh] Found credentials to refresh: count=X
   [Token Refresh] Refreshing token for user=<userId> provider=google
   [Token Refresh] Token refreshed successfully
   ```

**Manual Trigger Test:**
1. Login User A con Google credentials
2. Vai su Database → `mcp_credentials` table
3. Modifica manualmente `expiresAt` a 10 minuti nel futuro (simula token expiring)
4. Attendi 15 minuti (prossimo ciclo refresh)
5. Check logs: deve mostrare refresh per User A Google
6. Check DB: `expiresAt` deve essere aggiornato a +1 ora

**Expected:**
- ✅ Token refresh automatico ogni 15min
- ✅ Refresh se `expiresAt < now + 30min` (buffer)
- ✅ Multi-user: ogni utente ha token refresh indipendente

---

### **TC6: Credential Revocation**

**Steps:**
1. Login User A → **Google Workspace** tab
2. Badge mostra "Attiva"
3. Click **trash icon** (Delete button)
4. Verifica toast success: "Credential Rimossa"
5. Badge deve **immediatamente** cambiare a "Non configurato"
6. **NO page reload** richiesto (TanStack Query invalidation)
7. Login User B → verifica che le sue credenziali (se esistenti) non siano affette

**Expected:**
- ✅ DELETE mutation invalida query key `/api/mcp/my-credentials`
- ✅ UI refresh immediato (no stale data)
- ✅ Backend validation: solo owner può delete
- ✅ Other users non affected

---

### **TC7: Connection Pool Isolation**

**Backend Verification:**
1. Login User A → Connetti Google
2. Login User B → Connetti Google (stesso provider)
3. Apri terminal → Check connection pool:
   ```bash
   grep "MCP Client Service" /tmp/logs/Start_application_*.log | grep "google-workspace"
   ```
4. Deve mostrare **2 connessioni separate**:
   ```
   [MCP Client Service] Created connection pool key: google-workspace:user_a_id
   [MCP Client Service] Created connection pool key: google-workspace:user_b_id
   ```

**Expected:**
- ✅ Connection pooling usa `${serverId}:${userId}` composite key
- ✅ Nessun credential sharing tra utenti
- ✅ Ogni utente ha connessione MCP isolata

---

## 🐛 Troubleshooting

### **Problema: Redirect Loop su OAuth Callback**
**Causa:** OAuth app non configurata correttamente  
**Fix:** Verifica Redirect URI identica in Google/Microsoft console e `.env`:
```
https://<exact-replit-domain>/api/mcp/oauth/google/callback
```

### **Problema: "Invalid Credentials" Error**
**Causa:** State parameter mismatch (CSRF protection)  
**Fix:** Check logs per state validation:
```bash
grep "OAuth state" /tmp/logs/Start_application_*.log
```

### **Problema: Token Refresh Fallisce**
**Causa:** Refresh token non salvato  
**Fix:** Verifica DB `mcp_credentials` table che `credentials.refresh_token` non sia NULL

### **Problema: UI Non Si Aggiorna Dopo Delete**
**Causa:** Query key invalidation sbagliata (BUG FIXATO in Task 6.4)  
**Fix:** Verifica `deleteCredentialMutation` invalidi `['/api/mcp/my-credentials']`

---

## ✅ Success Criteria

Task 7 è considerato **PASSED** se:

1. ✅ **Multi-User OAuth**: 2+ utenti possono connettere Google/Microsoft indipendentemente
2. ✅ **Credential Isolation**: User A non vede credenziali User B (e viceversa)
3. ✅ **Cross-Provider**: Singolo utente può connettere Google + Microsoft simultaneamente
4. ✅ **Token Refresh**: Background service refresh tokens automaticamente ogni 15min
5. ✅ **UI Real-Time**: Badge si aggiorna immediatamente dopo connessione/revocazione
6. ✅ **Connection Pooling**: Chiavi composite `${serverId}:${userId}` verificate nei logs
7. ✅ **Error Handling**: OAuth errors mostrano toast messages appropriati

---

## 📊 Test Results Template

Compila dopo i test:

```markdown
## Test Results - [Data]

### TC1: Google OAuth - User A
- [ ] OAuth flow completo
- [ ] Badge "Attiva" visibile
- [ ] Timestamp corretto
- [ ] Token expiry mostrato

### TC2: Microsoft OAuth - User B
- [ ] OAuth flow completo
- [ ] Isolation verificato (non vede Google User A)
- [ ] Badge Microsoft "Attiva"

### TC3: Multi-Provider - User A
- [ ] Google + Microsoft attivi simultaneamente
- [ ] Badge separati con timestamp differenti

### TC4: Isolation Test
- [ ] User B non vede credenziali User A
- [ ] Persistent state dopo logout/login

### TC5: Token Refresh
- [ ] Cicli ogni 15min nei logs
- [ ] Refresh automatico con buffer 30min
- [ ] Multi-user refresh indipendente

### TC6: Revocation
- [ ] DELETE immediato UI refresh
- [ ] Toast success mostrato
- [ ] Other users non affetti

### TC7: Connection Pool
- [ ] Composite keys verificati: `serverId:userId`
- [ ] Connessioni separate per user

### Overall Result: ✅ PASS / ❌ FAIL
```

---

## 🚀 Next Steps After Task 7

Una volta Task 7 passato:

1. **Production Deployment**:
   - Setup OAuth apps production (Google/Microsoft)
   - Configure secrets production environment
   - Enable HTTPS redirect URIs

2. **Monitoring**:
   - Setup alerts per token refresh failures
   - Dashboard per OAuth credential health
   - Audit log per credential access

3. **Additional Providers**:
   - Meta/Instagram OAuth (usa stesso pattern)
   - Stripe OAuth (usa stesso pattern)
   - AWS (service account, non OAuth)

4. **Documentation**:
   - User guide OAuth setup
   - Admin guide OAuth app configuration
   - Developer guide nuovi provider

---

**Document Version:** 1.0  
**Last Updated:** October 8, 2025  
**Status:** Ready for Testing
