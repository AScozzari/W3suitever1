# 🔴 Meta/Instagram OAuth Testing Guide

## Prerequisites

### 1. Create Meta App (Required)
Before testing, you need a Meta App with Instagram Graph API permissions:

1. **Go to Meta for Developers**:
   - Visit: https://developers.facebook.com/apps
   - Click **"Create App"**

2. **App Setup**:
   - Choose **"Business"** type
   - App Name: **"W3 Suite OAuth Integration"** (or your choice)
   - App Contact Email: your email

3. **Add Instagram Graph API**:
   - In Dashboard, click **"Add Product"**
   - Find **"Instagram"** and click **"Set Up"**
   - Enable **Instagram Graph API**

4. **Configure OAuth Settings**:
   - Go to **Settings → Basic**
   - Note your **App ID** and **App Secret**
   - Go to **Settings → Advanced → Security**
   - Add **Allowed Redirect URI**:
     ```
     https://your-replit-domain.replit.app/api/mcp/oauth/meta/callback
     ```

5. **Request Permissions**:
   - In **Instagram → App Review → Permissions and Features**
   - Request these permissions:
     - `instagram_basic` (default)
     - `instagram_content_publish`
     - `pages_show_list`
     - `pages_read_engagement`
     - `pages_manage_posts`

### 2. Link Facebook Page to Instagram
- Your Facebook Page must be connected to an Instagram Business Account
- Go to Facebook Page Settings → Instagram → Connect Account

---

## Testing Checklist

### ✅ Phase 1: Database Schema Verification
```sql
-- Check mcpConnectedAccountType enum exists
SELECT enum_range(NULL::mcp_connected_account_type);
-- Expected: {facebook_page,instagram_business}

-- Check mcpConnectedAccounts table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'w3suite' 
  AND table_name = 'mcp_connected_accounts';
-- Expected: id, credential_id, account_type, account_id, etc.
```

### ✅ Phase 2: Frontend UI Access
1. Navigate to W3 Suite
2. Go to **Settings → MCP Integration**
3. Click **Meta/Instagram** tab
4. Verify you see:
   - ✅ Info panel with instructions
   - ✅ "Connetti Pagine Facebook" button
   - ✅ "Nessuna pagina Facebook connessa" message (empty state)

### ✅ Phase 3: OAuth Flow Testing

#### Step 1: Store Meta App Credentials
Currently, the Meta App credentials (App ID and Secret) are **global configuration** (not per-tenant).

**Option A: Environment Variables** (Recommended for Production)
```bash
# Add to Replit Secrets
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
```

**Option B: Database Storage** (Current Implementation)
The system expects Meta credentials to be stored in `mcpServers` table:
```sql
-- Insert Meta server configuration
INSERT INTO w3suite.mcp_servers (
  tenant_id,
  name,
  display_name,
  description,
  server_type,
  status,
  transport,
  transport_config
) VALUES (
  'your-tenant-id',
  'meta-instagram',
  'Meta/Instagram',
  'Meta/Instagram OAuth Integration',
  'oauth',
  'active',
  'http',
  jsonb_build_object(
    'app_id', 'your_meta_app_id',
    'app_secret', 'your_meta_app_secret'
  )
);
```

#### Step 2: Initiate OAuth Flow
1. Click **"Connetti Pagine Facebook"** button
2. Verify redirect to Meta OAuth URL:
   ```
   https://www.facebook.com/v19.0/dialog/oauth?
     client_id=YOUR_APP_ID
     &redirect_uri=https://your-domain.replit.app/api/mcp/oauth/meta/callback
     &scope=pages_show_list,instagram_basic,instagram_content_publish
     &state=BASE64_ENCODED_STATE
   ```

#### Step 3: Meta Authorization
1. Log in to Facebook (if not already)
2. Select **Facebook Pages** to authorize
3. Grant permissions:
   - ✅ Manage your Pages
   - ✅ Access Instagram accounts
   - ✅ Publish content to Instagram
4. Click **"Continue"** / **"Confirm"**

#### Step 4: Callback & Page Discovery
1. After authorization, you'll be redirected to callback URL
2. System automatically:
   - ✅ Exchanges authorization code for long-lived User Access Token (60 days)
   - ✅ Discovers all authorized Facebook Pages
   - ✅ For each page, retrieves Page Access Token (never expires)
   - ✅ Detects linked Instagram Business Account (if any)
   - ✅ Stores all data in `mcpConnectedAccounts` table
3. Success page displays:
   ```
   ✅ Meta/Instagram Connected!
   Successfully connected X Facebook Pages
   (auto-close in 3 seconds)
   ```

#### Step 5: Verify Connected Accounts
1. Return to MCP Settings → Meta tab
2. Verify **connected pages list** shows:
   - ✅ Facebook Page name with blue badge
   - ✅ Instagram account name with pink badge (if linked)
   - ✅ Last sync timestamp
   - ✅ Sync button (refresh icon)
   - ✅ Remove button (trash icon)

### ✅ Phase 4: Account Management Testing

#### Test Sync Functionality
1. Click **sync button** (🔄) on any page
2. Verify:
   - ✅ Button shows spinning animation
   - ✅ Toast notification: "Sincronizzazione Completata"
   - ✅ Last sync timestamp updates
   - ✅ No errors in console/network tab

#### Test Remove Functionality
1. Click **remove button** (🗑️) on any page
2. Confirm deletion dialog
3. Verify:
   - ✅ Page removed from list
   - ✅ Toast notification: "Account Rimosso"
   - ✅ Database record soft-deleted (`removed_at` set, `is_active = false`)

#### Test Re-authorization (Add More Pages)
1. Click **"Connetti Pagine Facebook"** again
2. Select different/additional Facebook Pages
3. Verify:
   - ✅ New pages appear in list
   - ✅ Existing pages remain unchanged
   - ✅ Each page has unique Page Access Token

---

## Database Verification Queries

### Check Connected Accounts
```sql
SELECT 
  id,
  account_type,
  account_name,
  instagram_account_name,
  is_active,
  last_synced_at,
  created_at
FROM w3suite.mcp_connected_accounts
WHERE tenant_id = 'your-tenant-id'
  AND removed_at IS NULL
ORDER BY created_at DESC;
```

### Check Page Access Tokens
```sql
SELECT 
  ca.account_name,
  ca.account_type,
  ca.instagram_account_name,
  LENGTH(ca.access_token) as token_length,
  ca.token_expires_at
FROM w3suite.mcp_connected_accounts ca
WHERE ca.tenant_id = 'your-tenant-id'
  AND ca.removed_at IS NULL;
```

### Check User Access Token (in credentials)
```sql
SELECT 
  sc.id,
  sc.oauth_provider,
  sc.scope,
  sc.expires_at,
  sc.created_at
FROM w3suite.mcp_server_credentials sc
WHERE sc.tenant_id = 'your-tenant-id'
  AND sc.oauth_provider = 'meta'
  AND sc.revoked_at IS NULL
ORDER BY sc.created_at DESC
LIMIT 1;
```

---

## Expected API Responses

### GET /api/mcp/credentials/connected-accounts/:serverId
```json
{
  "success": true,
  "accounts": [
    {
      "id": "uuid",
      "accountType": "facebook_page",
      "accountId": "123456789",
      "accountName": "My Business Page",
      "instagramAccountId": "987654321",
      "instagramAccountName": "@mybusiness",
      "isActive": true,
      "lastSyncedAt": "2025-10-08T21:00:00Z",
      "createdAt": "2025-10-08T20:00:00Z"
    }
  ]
}
```

### DELETE /api/mcp/credentials/connected-accounts/:accountId
```json
{
  "success": true,
  "message": "Account removed successfully"
}
```

### POST /api/mcp/credentials/connected-accounts/:accountId/sync
```json
{
  "success": true,
  "message": "Account synced successfully",
  "lastSyncedAt": "2025-10-08T21:30:00Z"
}
```

---

## Troubleshooting

### OAuth Redirect Fails
**Problem**: Redirect URI mismatch error
**Solution**: 
1. Check Meta App Settings → OAuth Redirect URIs
2. Ensure exact match (including https/http and trailing slash)
3. Use: `https://your-domain.replit.app/api/mcp/oauth/meta/callback`

### No Instagram Account Detected
**Problem**: Facebook Page connected but no Instagram shown
**Solution**:
1. Verify Facebook Page is linked to Instagram Business Account
2. Go to Facebook Page Settings → Instagram → Connect Account
3. Re-authorize in W3 Suite

### Page Access Token Expires
**Problem**: Token shows expiration date
**Solution**:
- Page Access Tokens should **never expire** when derived from long-lived User Access Token
- If expires, there's an issue with token exchange flow
- Check `MetaOAuthService.handleCallback()` implementation

### Missing Permissions
**Problem**: Cannot publish to Instagram
**Solution**:
1. Go to Meta App → App Review → Permissions
2. Request: `instagram_content_publish`, `pages_manage_posts`
3. Submit for review (if in production mode)
4. Use test users for development

---

## Meta Graph API Endpoints Used

### Authorization
```
GET https://www.facebook.com/v19.0/dialog/oauth
```

### Token Exchange
```
GET https://graph.facebook.com/v19.0/oauth/access_token
```

### Long-Lived Token
```
GET https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token
```

### Get User Pages
```
GET https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token
```

### Get Instagram Account
```
GET https://graph.facebook.com/v19.0/{page-id}?fields=instagram_business_account
GET https://graph.facebook.com/v19.0/{ig-account-id}?fields=id,username
```

---

## Success Criteria

✅ **Complete Success**:
- [ ] OAuth flow redirects correctly
- [ ] User can select Facebook Pages
- [ ] System detects Instagram Business accounts automatically
- [ ] Page Access Tokens stored correctly (never expire)
- [ ] Frontend displays all connected pages
- [ ] Sync functionality works
- [ ] Remove functionality works
- [ ] Can re-authorize to add more pages
- [ ] Database has all required data
- [ ] No errors in browser/server console

---

## Support & Resources

- **Meta for Developers**: https://developers.facebook.com
- **Instagram Graph API Docs**: https://developers.facebook.com/docs/instagram-api
- **OAuth Flow Guide**: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
- **W3 Suite Implementation**: `apps/backend/api/src/services/meta-oauth-service.ts`
