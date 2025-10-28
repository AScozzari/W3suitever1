# MCP Migration Guide
**Upgrading Workflows to Pure MCP Protocol Architecture**

## Overview

W3 Suite has migrated from a **hybrid architecture** (direct API calls + MCP protocol) to a **pure MCP protocol implementation**. This change provides:

✅ **Unified server management** - All external integrations via MCP servers  
✅ **Multi-user OAuth isolation** - Each user authenticates their own accounts  
✅ **Better security** - Centralized credential management with encryption  
✅ **AI orchestration** - Intelligent multi-service workflows  
✅ **Future-proof** - Standard protocol supported by industry

---

## What Changed?

### Before (Hybrid Architecture)
```typescript
// Old workflow node config (direct API)
{
  "type": "mcp-google-gmail-send",
  "config": {
    "to": ["test@example.com"],
    "subject": "Hello",
    "body": "Test email"
    // ❌ No server connection specified
    // ❌ Used shared OAuth tokens
  }
}
```

### After (Pure MCP Architecture)
```typescript
// New workflow node config (MCP protocol)
{
  "type": "mcp-google-gmail-send",
  "config": {
    "serverId": "google-workspace-mario",  // ✅ Explicit server selection
    "toolName": "gmail.send",              // ✅ Explicit tool name
    "to": ["test@example.com"],
    "subject": "Hello",
    "body": "Test email"
  }
}
```

### Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Server Connection** | Implicit (tenant-wide token) | Explicit (`serverId` required) |
| **OAuth Isolation** | Shared tenant token | Per-user OAuth tokens |
| **Tool Execution** | Direct API calls | MCP protocol `executeTool()` |
| **UI Configuration** | No dropdown | MCP Server dropdown with status badges |
| **Multi-Account Support** | ❌ Not supported | ✅ Multiple accounts per user |

---

## Migration Impact

### Workflows Affected ✅

All workflows containing **MCP OUTBOUND nodes** (v1.0.0) require migration:

**Google Workspace** (5 nodes):
- `mcp-google-gmail-send`
- `mcp-google-drive-upload`
- `mcp-google-calendar-create`
- `mcp-google-sheets-append`
- `mcp-google-docs-create`

**AWS** (5 nodes):
- `mcp-aws-s3-upload`
- `mcp-aws-lambda-invoke`
- `mcp-aws-sns-publish`
- `mcp-aws-sqs-send`
- `mcp-aws-dynamodb-put`

**META/Instagram** (4 nodes):
- `mcp-meta-instagram-post`
- `mcp-meta-instagram-story`
- `mcp-meta-instagram-comment`
- `mcp-meta-instagram-dm`

**Microsoft 365** (3 nodes):
- `mcp-microsoft-outlook-send`
- `mcp-microsoft-onedrive-upload`
- `mcp-microsoft-teams-message`

**Stripe** (3 nodes):
- `mcp-stripe-payment-create`
- `mcp-stripe-subscription-create`
- `mcp-stripe-invoice-create`

**Google Tag Manager** (6 nodes):
- `mcp-gtm-track-event`
- `mcp-gtm-track-pageview`
- `mcp-gtm-track-conversion`
- `mcp-gtm-setup-tag`
- `mcp-gtm-update-tag`
- `mcp-gtm-delete-tag`

**PostgreSQL** (9 nodes):
- `mcp-postgresql-execute-query`
- `mcp-postgresql-raw-sql`
- `mcp-postgresql-insert`
- `mcp-postgresql-update`
- `mcp-postgresql-delete`
- `mcp-postgresql-begin-transaction`
- `mcp-postgresql-commit-transaction`
- `mcp-postgresql-rollback-transaction`
- `mcp-postgresql-create-table`

**Total**: 35 nodes requiring migration

### Workflows NOT Affected ✅

**INBOUND nodes** (triggers/webhooks) do NOT require migration:
- `mcp-google-webhook-trigger`
- `mcp-meta-webhook-trigger`
- `mcp-stripe-webhook-trigger`
- All form/calendar triggers

These nodes remain unchanged because they receive data from external sources, not send requests.

---

## Step-by-Step Migration Guide

### Step 1: Install MCP Servers

Before migrating workflows, ensure required MCP servers are installed and configured.

#### 1.1 Navigate to MCP Settings
```
Dashboard → Settings → MCP Settings
```

#### 1.2 Install Required Server
Click **"Install New Server"** → Choose installation method:

**Option A: NPM Package** (Recommended)
```bash
# Example: Google Workspace
Package Name: @modelcontextprotocol/server-google-workspace

# Example: Slack
Package Name: @modelcontextprotocol/server-slack
```

**Option B: GitHub Repository**
```
Repository URL: https://github.com/your-org/custom-mcp-server
```

**Option C: Upload ZIP**
```
Upload your custom MCP server as .zip file
```

#### 1.3 Configure OAuth
After installation:
1. Select installed server from list
2. Click **"Configure"** button
3. Click **"Connect with [Provider]"** OAuth button
4. Complete OAuth consent flow
5. Verify status badge changes to **"✅ Active"**

**Example: Google Workspace**
```
1. Click "Connect with Google"
2. Select your Google account (mario@windtre.it)
3. Grant permissions:
   - Gmail API (send emails)
   - Calendar API (create events)
   - Drive API (upload files)
4. Return to W3 Suite
5. Server status: ✅ Active
```

---

### Step 2: Identify Workflows Needing Migration

#### 2.1 Check Workflow Library
```
Dashboard → Workflows → My Workflows
```

Look for workflows containing nodes with **version 1.0.0** (legacy schema).

#### 2.2 Migration Warning Banner
When opening a legacy workflow, you'll see:
```
⚠️ This workflow uses an older configuration format. 
   Please re-save to update to the new MCP server connection system.
```

#### 2.3 Automatic Detection
The system detects missing `serverId` in node config and flags workflow for migration.

---

### Step 3: Migrate Individual Workflow

#### 3.1 Open Workflow for Editing
```
Workflows → Select workflow → Click "Edit"
```

#### 3.2 Update Each MCP Node
For each **MCP OUTBOUND node** (Gmail, Drive, S3, etc.):

1. **Click node** on canvas
2. **NodeConfigPanel** opens on right side
3. **Find "MCP Connection" dropdown** (new field)
4. **Select your MCP server**:
   - If only 1 server configured → auto-selected ✅
   - If multiple servers → choose correct one from dropdown
   - Label format: `"Google Workspace (mario@windtre.it) • 5 tools"`
5. **Verify status badge**: ✅ Active, ⚠️ Needs Config, ❌ Error
6. **Save node** (schema auto-updated to v1.1.0)

#### 3.3 Example: Migrating Gmail Node

**Before (v1.0.0)**:
```json
{
  "id": "send_email",
  "type": "mcp-google-gmail-send",
  "data": {
    "config": {
      "to": ["team@example.com"],
      "subject": "Weekly Report",
      "body": "Attached is this week's report."
    }
  }
}
```

**After (v1.1.0)**:
```json
{
  "id": "send_email",
  "type": "mcp-google-gmail-send",
  "data": {
    "config": {
      "serverId": "google-workspace-mario",  // ✅ Added
      "toolName": "gmail.send",              // ✅ Auto-filled
      "to": ["team@example.com"],
      "subject": "Weekly Report",
      "body": "Attached is this week's report."
    }
  }
}
```

#### 3.4 Save Workflow
Click **"Save Workflow"** button. Migration complete! ✅

---

### Step 4: Test Migrated Workflow

#### 4.1 Execute Workflow
```
Workflows → Select workflow → Click "Execute"
```

#### 4.2 Verify Execution Logs
Check logs for successful MCP tool execution:
```
info: 🔌 [EXECUTOR] Executing MCP Connector {"stepId":"send_email"}
info: 🔌 [MCP] Executing tool {"serverId":"google-workspace-mario","toolName":"gmail.send"}
info: ✅ [MCP] Tool executed successfully
```

#### 4.3 Check Result
Verify external action completed (email sent, file uploaded, etc.).

---

## Migration Scenarios

### Scenario 1: Single User, Single Account

**Setup**:
- 1 user: Mario (mario@windtre.it)
- 1 Google Workspace account connected

**Migration**:
```
1. Install Google Workspace MCP server
2. Connect mario@windtre.it via OAuth
3. Edit workflow → Select "Google Workspace (mario@windtre.it)"
4. Save → Done ✅
```

**Result**: All Gmail nodes use Mario's account automatically.

---

### Scenario 2: Multiple Users, Shared Workflow

**Setup**:
- User A: Mario (mario@windtre.it)
- User B: Luca (luca@windtre.it)
- Both need to execute same workflow

**Migration**:
```
1. Mario: Install Google Workspace → Connect mario@windtre.it
2. Luca: Install Google Workspace → Connect luca@windtre.it
3. Edit shared workflow → Select "Google Workspace"
4. Save
```

**Result**: 
- When Mario executes → Uses mario@windtre.it credentials
- When Luca executes → Uses luca@windtre.it credentials
- **Multi-user OAuth isolation** ensures correct credentials per user

---

### Scenario 3: Multiple Accounts for Same User

**Setup**:
- Mario has 2 Google accounts:
  - mario@windtre.it (work)
  - mario.rossi@gmail.com (personal)

**Migration**:
```
1. Install Google Workspace server #1
2. Connect mario@windtre.it
3. Install Google Workspace server #2 (or clone #1)
4. Connect mario.rossi@gmail.com
5. Edit workflow → Choose which account to use:
   - "Google Workspace (mario@windtre.it)" for work emails
   - "Google Workspace (mario.rossi@gmail.com)" for personal emails
```

**Result**: Mario can choose which account to use per workflow node.

---

### Scenario 4: Migrating AI MCP Orchestrator Node

**Old Config** (v1.0.0):
```json
{
  "type": "mcp-ai-orchestrator",
  "config": {
    "aiInstructions": "Send email and create calendar event",
    "model": "gpt-4o"
    // ❌ No server selection
  }
}
```

**New Config** (v1.1.0):
```json
{
  "type": "mcp-ai-orchestrator",
  "config": {
    "mcpServerIds": [                    // ✅ Added
      "google-workspace-mario",
      "slack-company"
    ],
    "aiInstructions": "Send email and create calendar event",
    "model": "gpt-4o"
  }
}
```

**Migration Steps**:
1. Open AI orchestrator node config
2. **New field**: "MCP Servers" (multi-select)
3. Select 1+ servers AI should use:
   - ✅ Google Workspace (for email/calendar)
   - ✅ Slack (for messages)
4. Save → AI now orchestrates across selected servers

---

## Bulk Migration (Advanced)

For teams with **100+ workflows**, use the migration script:

### Step 1: Backup Database
```bash
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE > backup_before_migration.sql
```

### Step 2: Run Migration Script
```bash
npm run migrate:mcp-workflows
```

**What it does**:
1. Scans all workflows for MCP nodes v1.0.0
2. For each node:
   - Detects ecosystem (Google/AWS/Meta/etc.)
   - Finds first configured MCP server for that ecosystem
   - Injects `serverId` and `toolName`
   - Updates node version to v1.1.0
3. Logs migration report

**Example Output**:
```
🔄 Starting MCP workflow migration...
✅ Migrated workflow "Lead Nurture Email" (5 nodes updated)
✅ Migrated workflow "Invoice Generator" (3 nodes updated)
❌ Skipped workflow "Social Media Post" (no MCP server configured for Meta)
📊 Summary:
   - Total workflows scanned: 150
   - Successfully migrated: 142
   - Skipped (no server): 8
   - Errors: 0
```

### Step 3: Manual Review
Review the 8 skipped workflows and install missing MCP servers.

---

## Rollback Procedure

If migration causes issues, rollback to previous state:

### Option 1: Restore Database Backup
```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE < backup_before_migration.sql
```

### Option 2: Manual Revert (Single Workflow)
1. Open workflow
2. Remove `serverId` and `toolName` from nodes
3. Change version back to `1.0.0`
4. Save

**Note**: Rollback returns to legacy architecture. You'll need to re-configure shared tenant OAuth tokens.

---

## Troubleshooting

### Issue 1: "Server not found in dropdown"

**Cause**: MCP server not installed or not configured  
**Solution**:
1. Navigate to Settings → MCP
2. Install required server (NPM/GitHub/ZIP)
3. Complete OAuth configuration
4. Return to workflow editor → Server now appears

---

### Issue 2: "Selected server needs configuration"

**Cause**: OAuth token missing or expired  
**Solution**:
1. Click "Configure Server" link in warning banner
2. Complete OAuth flow
3. Return to workflow → Warning disappears

---

### Issue 3: "Workflow execution fails after migration"

**Cause**: Wrong server selected or tool not available  
**Diagnosis**:
```bash
# Check execution logs
grep "MCP Connector" /tmp/logs/Start_application*.log

# Expected error:
# ❌ [MCP] Tool 'gmail.send' not found in server 'aws-server'
```

**Solution**:
1. Open workflow node config
2. Select correct server (e.g., Google Workspace for Gmail)
3. Save and re-execute

---

### Issue 4: "AI orchestrator executes wrong tool"

**Cause**: Multiple servers with similar tools (e.g., Slack + Teams both have messaging)  
**Solution**:
1. Make AI instructions more specific:
   ```
   ❌ "Send a message"
   ✅ "Send a Slack message to #general channel"
   ```
2. Reduce selected servers (only include what's needed)
3. Lower temperature (less creativity, more precision)

---

## Migration Checklist

### Pre-Migration
- [ ] Backup database (`pg_dump`)
- [ ] Document existing workflows (screenshot configs)
- [ ] Install all required MCP servers
- [ ] Complete OAuth for all servers
- [ ] Test MCP servers individually (Settings → MCP → Test Connection)

### During Migration
- [ ] Update each workflow node with `serverId`
- [ ] Verify server status badges (✅ Active)
- [ ] Test execution before saving
- [ ] Update workflow documentation

### Post-Migration
- [ ] Execute all migrated workflows
- [ ] Monitor logs for MCP errors
- [ ] Verify external actions (emails sent, files uploaded, etc.)
- [ ] Update team documentation
- [ ] Train users on new MCP server selection UI

---

## Migration Timeline

### Phase 1: Preparation (Week 1)
- [ ] Install MCP servers for all ecosystems
- [ ] Configure OAuth for all users
- [ ] Test MCP connections
- [ ] Backup production database

### Phase 2: Pilot Migration (Week 2)
- [ ] Migrate 10% of workflows (low-risk, non-critical)
- [ ] Monitor for issues
- [ ] Gather user feedback
- [ ] Fix any bugs

### Phase 3: Full Migration (Week 3-4)
- [ ] Migrate remaining 90% of workflows
- [ ] Run bulk migration script
- [ ] Manual review of skipped workflows
- [ ] Final testing

### Phase 4: Deprecation (Week 5+)
- [ ] Mark legacy executors as deprecated
- [ ] Remove shared tenant OAuth tokens
- [ ] Delete old executor files
- [ ] Update documentation

---

## Support & Help

### Get Help
- **Slack**: #w3suite-support
- **Email**: support@w3suite.com
- **Documentation**: https://docs.w3suite.com/mcp-migration

### Report Issues
- **GitHub**: https://github.com/w3suite/platform/issues
- **Template**: Use "MCP Migration Issue" template

---

## FAQ

**Q: Do I need to migrate immediately?**  
A: No. Legacy workflows (v1.0.0) continue working with shared OAuth tokens during a 3-month grace period. However, new features (multi-account, AI orchestration) require migration.

**Q: Can I use both old and new workflows?**  
A: Yes, during the grace period. But we recommend migrating all workflows to avoid confusion.

**Q: What happens to my OAuth tokens after migration?**  
A: Shared tenant tokens are preserved. New per-user tokens are added alongside them. After migration complete, shared tokens can be safely deleted.

**Q: How do I migrate workflows I didn't create?**  
A: You can edit any workflow you have access to. Select your own MCP server connection when migrating shared workflows.

**Q: Can I automate migration testing?**  
A: Yes, see `docs/MCP_TESTING_STRATEGY.md` for automated test scripts.

---

**Migration Status**: ✅ Guide Complete | ⏳ Rollout Pending  
**Last Updated**: 2025-10-28  
**Maintained By**: W3 Suite Platform Team
