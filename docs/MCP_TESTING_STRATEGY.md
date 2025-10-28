# MCP Testing Strategy Guide
**W3 Suite - Model Context Protocol Integration**

## Overview
This document provides a comprehensive testing strategy for validating the MCP (Model Context Protocol) refactoring from hybrid architecture (direct APIs + MCP) to pure MCP protocol implementation.

---

## Testing Phases

### Phase 1: MCP Server Installation & Discovery ✅

#### Test Case 1.1: NPM Package Installation
**Objective**: Verify wizard can install MCP servers from npm registry

**Steps**:
1. Navigate to `/[tenant]/settings/mcp`
2. Click "Install New Server" button
3. Select "NPM Package" tab in wizard
4. Enter package name: `@modelcontextprotocol/server-slack`
5. Click "Next" → "Install"
6. Verify installation progress and success message

**Expected Results**:
- ✅ Package downloads and installs successfully
- ✅ Server appears in "Installed Servers" list
- ✅ Status badge shows "⚠️ Needs Config" (OAuth required)
- ✅ Tools auto-discovered and listed in ServerDetailsPanel

**Backend Verification**:
```bash
# Check server record in database
SELECT * FROM mcp_servers WHERE package_name = '@modelcontextprotocol/server-slack';

# Verify tools discovered
SELECT * FROM mcp_tools WHERE server_id = '[server_id_from_above]';
```

---

#### Test Case 1.2: GitHub Repository Import
**Objective**: Verify wizard can clone and install custom MCP servers from GitHub

**Steps**:
1. Navigate to `/[tenant]/settings/mcp`
2. Click "Install New Server"
3. Select "GitHub Repository" tab
4. Enter URL: `https://github.com/example/custom-mcp-server`
5. Click "Next" → "Install"
6. Verify clone + npm install process

**Expected Results**:
- ✅ Repository clones successfully
- ✅ Dependencies install (`npm install` runs)
- ✅ Server registered with status "⚠️ Needs Config"
- ✅ Tools auto-discovered from server manifest

---

#### Test Case 1.3: ZIP File Upload
**Objective**: Verify manual MCP server upload from ZIP archive

**Steps**:
1. Navigate to `/[tenant]/settings/mcp`
2. Click "Install New Server"
3. Select "Upload ZIP" tab
4. Upload `custom-mcp-server.zip` file
5. Click "Next" → "Install"

**Expected Results**:
- ✅ ZIP extracts to server directory
- ✅ Server registered with "⚠️ Needs Config"
- ✅ Manual configuration UI shown

---

#### Test Case 1.4: Custom Code Entry
**Objective**: Verify inline MCP server creation from code editor

**Steps**:
1. Navigate to `/[tenant]/settings/mcp`
2. Click "Install New Server"
3. Select "Custom Code" tab
4. Paste MCP server implementation code
5. Click "Next" → "Install"

**Expected Results**:
- ✅ Code validates (TypeScript/JavaScript check)
- ✅ Server registered and started
- ✅ Tools extracted from code

---

### Phase 2: OAuth Configuration & Multi-User Isolation ✅

#### Test Case 2.1: Single User OAuth Flow
**Objective**: Verify OAuth2 connection for individual user

**Steps**:
1. Select installed Google Workspace server
2. Click "Configure" in ServerDetailsPanel
3. Click "Connect with Google" OAuth button
4. Complete OAuth consent flow
5. Verify token stored with user isolation

**Expected Results**:
- ✅ OAuth popup opens with correct scopes
- ✅ User grants permissions
- ✅ Token stored in `mcp_credentials` with `userId` foreign key
- ✅ Server status changes to "✅ Active"
- ✅ User email appears in server label: "Google Workspace (mario@windtre.it)"

**Backend Verification**:
```sql
SELECT * FROM mcp_credentials 
WHERE server_id = '[server_id]' AND user_id = '[user_id]';
```

---

#### Test Case 2.2: Multiple Users Same Server
**Objective**: Verify multi-user OAuth isolation

**Steps**:
1. User A: Connect Google Workspace → mario@windtre.it
2. User B: Connect same Google Workspace server → luca@windtre.it
3. Verify both users see their own email in dropdown
4. Verify backend has 2 separate credential records

**Expected Results**:
- ✅ 2 credential records with different `userId`
- ✅ Each user sees only their own connection
- ✅ Workflow execution uses correct user's token based on `requesterId`

**Backend Verification**:
```sql
SELECT user_id, oauth_token_encrypted FROM mcp_credentials 
WHERE server_id = '[google_workspace_server_id]';
-- Should return 2 rows with different user_ids
```

---

#### Test Case 2.3: Token Refresh Mechanism
**Objective**: Verify automatic OAuth token refresh before expiry

**Steps**:
1. Wait for token to near expiry (expires_at - 30 minutes)
2. Trigger workflow execution
3. Verify token refresh occurs automatically

**Expected Results**:
- ✅ Token refreshed before expiry
- ✅ `updated_at` timestamp updated
- ✅ Workflow executes without auth errors

**Backend Logs**:
```
info: 🔄 [Token Refresh] Starting refresh cycle
info: 📋 [Token Refresh] Found credentials to refresh {"count":1}
info: ✅ [Token Refresh] Token refreshed {"serverId":"...","userId":"..."}
```

---

### Phase 3: Workflow Canvas Integration ✅

#### Test Case 3.1: MCPServerSelector Auto-Select
**Objective**: Verify dropdown auto-selects when only 1 server available

**Steps**:
1. Create new workflow
2. Add "[G] Gmail Send" node to canvas
3. Open NodeConfigPanel
4. Verify "MCP Connection" dropdown

**Expected Results**:
- ✅ If only 1 Google Workspace server connected → auto-selected
- ✅ If multiple servers → dropdown shows all with labels:
  - "Google Workspace (mario@windtre.it) • 5 tools"
  - "Google Workspace (luca@windtre.it) • 5 tools"
- ✅ Status badge shown next to each option

---

#### Test Case 3.2: Server Filtering by Tool
**Objective**: Verify dropdown filters servers by required tool

**Steps**:
1. Install Slack MCP server (has `chat.postMessage` tool)
2. Install Google Workspace server (has `gmail.send` tool)
3. Add "[G] Gmail Send" node
4. Open dropdown

**Expected Results**:
- ✅ Only Google Workspace server shown (has `gmail.send` tool)
- ✅ Slack server hidden (no `gmail.send` tool)
- ✅ Backend query: `GET /api/mcp/servers/by-tool/gmail.send`

---

#### Test Case 3.3: Warning for Unconfigured Server
**Objective**: Verify UI warns when selected server needs OAuth

**Steps**:
1. Install Google Workspace server (no OAuth yet)
2. Add "[G] Gmail Send" node
3. Select unconfigured server in dropdown

**Expected Results**:
- ✅ Warning banner appears:
  ```
  ⚠️ The selected server needs configuration. Please configure it in Settings → MCP.
  ```
- ✅ "Configure Server" button shown
- ✅ Save disabled until server configured

---

### Phase 4: Workflow Execution ✅

#### Test Case 4.1: Simple MCP Connector Execution
**Objective**: Verify workflow executes MCP tool successfully

**Workflow Setup**:
```json
{
  "nodes": [
    {
      "id": "start",
      "type": "workflow-trigger",
      "data": { "triggerType": "manual" }
    },
    {
      "id": "send_email",
      "type": "mcp-google-gmail-send",
      "data": {
        "config": {
          "serverId": "google-workspace-mario",
          "toolName": "gmail.send",
          "to": ["test@example.com"],
          "subject": "MCP Test Email",
          "body": "Testing MCP workflow execution"
        }
      }
    }
  ],
  "edges": [
    { "source": "start", "target": "send_email" }
  ]
}
```

**Execution Steps**:
1. Save workflow above
2. Click "Execute Workflow" button
3. Monitor execution logs

**Expected Results**:
- ✅ Backend calls `MCPConnectorExecutor.execute()`
- ✅ `mcpClientService.executeTool()` invoked with:
  ```typescript
  {
    serverId: 'google-workspace-mario',
    toolName: 'gmail.send',
    arguments: { to: ['test@example.com'], subject: '...', body: '...' },
    tenantId: '...',
    userId: 'mario_user_id' // Extracted from context.requesterId
  }
  ```
- ✅ Email sent via Gmail API
- ✅ Workflow completes with success status

**Backend Logs**:
```
info: 🔌 [EXECUTOR] Executing MCP Connector {"stepId":"send_email"}
info: 🔌 [MCP] Executing tool {"serverId":"...","toolName":"gmail.send","attempt":1}
info: ✅ [MCP] Tool executed successfully {"serverId":"...","toolName":"gmail.send"}
```

---

#### Test Case 4.2: MCP Connector with Retry Logic
**Objective**: Verify retry mechanism on transient failures

**Workflow Config**:
```json
{
  "config": {
    "serverId": "google-workspace-mario",
    "toolName": "gmail.send",
    "retryPolicy": {
      "enabled": true,
      "maxRetries": 3,
      "retryDelayMs": 1000
    },
    "errorHandling": {
      "onError": "retry"
    }
  }
}
```

**Simulation**:
1. Temporarily disable network connection
2. Execute workflow
3. Observe retry attempts
4. Re-enable network before max retries
5. Verify eventual success

**Expected Results**:
- ✅ 3 retry attempts with exponential backoff (1s, 2s, 4s)
- ✅ Logs show retry warnings
- ✅ Success after network restored
- ✅ `result.data.attempts` = 2 (succeeded on 2nd attempt)

---

#### Test Case 4.3: MCP Connector Error Handling
**Objective**: Verify error handling strategies (fail/continue)

**Test 4.3a - onError: 'fail'**:
```json
{
  "errorHandling": { "onError": "fail" }
}
```
- ✅ Workflow stops immediately on error
- ✅ Error propagated to user
- ✅ Subsequent nodes not executed

**Test 4.3b - onError: 'continue'**:
```json
{
  "errorHandling": { "onError": "continue", "fallbackValue": "Email send failed" }
}
```
- ✅ Workflow continues despite error
- ✅ `result.success = true` (fake success)
- ✅ `result.data.fallbackValue` used in next nodes
- ✅ Error logged but not thrown

---

### Phase 5: AI MCP Orchestration ✅

#### Test Case 5.1: Single Server AI Orchestration
**Objective**: Verify AI selects correct tools from 1 MCP server

**Workflow Config**:
```json
{
  "type": "mcp-ai-orchestrator",
  "config": {
    "mcpServerIds": ["google-workspace-mario"],
    "aiInstructions": "Send an email to team@example.com with subject 'Meeting Reminder' and create a calendar event for tomorrow at 10 AM",
    "model": "gpt-4o",
    "temperature": 0.7
  }
}
```

**Expected Results**:
- ✅ AI agent loads 5 Google Workspace tools (gmail.send, calendar.create, etc.)
- ✅ AI executes 2 tools:
  1. `gmail.send` with correct parameters
  2. `calendar.create` with tomorrow's date
- ✅ Both tools execute successfully
- ✅ Result includes both tool outputs

**Backend Logs**:
```
info: 🤖 [AI-MCP] Loaded MCP tools {"toolCount":5,"servers":["google-workspace-mario"]}
info: 🔧 [AI-MCP] AI selected tool {"toolName":"gmail.send"}
info: 🔧 [AI-MCP] AI selected tool {"toolName":"calendar.create"}
```

---

#### Test Case 5.2: Multi-Server AI Orchestration
**Objective**: Verify AI orchestrates across multiple MCP servers

**Workflow Config**:
```json
{
  "mcpServerIds": ["google-workspace-mario", "slack-company"],
  "aiInstructions": "Send email to team@example.com AND post message in #general Slack channel about the new product launch"
}
```

**Expected Results**:
- ✅ AI loads tools from both servers (Gmail + Slack)
- ✅ AI executes:
  1. `gmail.send` from Google Workspace server
  2. `chat.postMessage` from Slack server
- ✅ Both servers use correct user credentials (multi-user OAuth)
- ✅ Workflow completes successfully

---

#### Test Case 5.3: AI Fallback Response
**Objective**: Verify fallback when no tools available

**Workflow Config**:
```json
{
  "mcpServerIds": ["unconfigured-server"],
  "aiInstructions": "Send an email",
  "fallbackResponse": "Email functionality not available. Please configure MCP server."
}
```

**Expected Results**:
- ✅ Server has no tools (unconfigured OAuth)
- ✅ AI returns fallback response
- ✅ `result.success = true`
- ✅ `result.data.fallbackUsed = true`
- ✅ Workflow continues with fallback message

---

### Phase 6: Migration & Backward Compatibility ⏳

#### Test Case 6.1: Legacy Workflow without serverId
**Objective**: Verify migration shim handles old workflows

**Legacy Workflow** (created before refactoring):
```json
{
  "nodes": [
    {
      "id": "send_email",
      "type": "mcp-google-gmail-send",
      "data": {
        "config": {
          // NO serverId field (old schema)
          "to": ["test@example.com"],
          "subject": "Test"
        }
      }
    }
  ]
}
```

**Expected Results**:
- ✅ Workflow loader detects missing `serverId`
- ✅ UI shows migration warning banner:
  ```
  ⚠️ This workflow uses an older configuration format. Please re-save to update to the new MCP server connection system.
  ```
- ✅ Execution blocked until user re-saves with server selection
- ✅ After re-save, `serverId` added and workflow works

---

### Phase 7: Performance & Scale Testing ⏳

#### Test Case 7.1: Concurrent Workflow Executions
**Objective**: Verify MCP executor handles concurrent requests

**Setup**:
1. Create 10 identical workflows
2. Execute all simultaneously
3. Monitor server performance

**Expected Results**:
- ✅ All 10 workflows execute successfully
- ✅ No token collision (multi-user OAuth isolation)
- ✅ Response time < 5 seconds per workflow
- ✅ No memory leaks or connection pool exhaustion

---

#### Test Case 7.2: Large Tool Library
**Objective**: Verify AI performance with 50+ tools

**Setup**:
1. Install 5 MCP servers (Google, AWS, Meta, Microsoft, Stripe)
2. Total tools: ~48 tools
3. Configure AI orchestrator with all 5 servers

**Expected Results**:
- ✅ Tool loading completes in < 2 seconds
- ✅ AI function calling handles 48 tools
- ✅ AI selects correct tools from large set
- ✅ No timeout errors

---

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Fresh database migration (`npm run db:push`)
- [ ] All services running (backend, frontend, brand-api)
- [ ] Test tenant created: `staging`
- [ ] Test users: mario@windtre.it, luca@windtre.it

### Phase 1: Installation ✅
- [ ] Test Case 1.1: NPM Package Installation
- [ ] Test Case 1.2: GitHub Repository Import
- [ ] Test Case 1.3: ZIP File Upload
- [ ] Test Case 1.4: Custom Code Entry

### Phase 2: OAuth ✅
- [ ] Test Case 2.1: Single User OAuth
- [ ] Test Case 2.2: Multiple Users Same Server
- [ ] Test Case 2.3: Token Refresh

### Phase 3: Canvas Integration ✅
- [ ] Test Case 3.1: Auto-Select
- [ ] Test Case 3.2: Server Filtering
- [ ] Test Case 3.3: Warning for Unconfigured

### Phase 4: Execution ✅
- [ ] Test Case 4.1: Simple Execution
- [ ] Test Case 4.2: Retry Logic
- [ ] Test Case 4.3: Error Handling

### Phase 5: AI Orchestration ✅
- [ ] Test Case 5.1: Single Server
- [ ] Test Case 5.2: Multi-Server
- [ ] Test Case 5.3: Fallback Response

### Phase 6: Migration ⏳
- [ ] Test Case 6.1: Legacy Workflow

### Phase 7: Performance ⏳
- [ ] Test Case 7.1: Concurrent Executions
- [ ] Test Case 7.2: Large Tool Library

---

## Automated Testing Scripts

### Backend Unit Tests
```bash
# Run MCP executor tests
npm test -- --grep "MCPConnectorExecutor"
npm test -- --grep "AIMCPExecutor"

# Run MCP client service tests
npm test -- --grep "MCPClientService"
```

### Frontend Component Tests
```bash
# Test MCPServerSelector component
npm test -- MCPServerSelector.test.tsx

# Test NodeConfigPanel integration
npm test -- NodeConfigPanel.test.tsx
```

### Integration Tests
```bash
# Full end-to-end workflow execution
npm run test:e2e -- mcp-workflow-execution.spec.ts
```

---

## Success Criteria

### Functional Requirements ✅
- ✅ All MCP servers install successfully (npm/GitHub/ZIP/custom)
- ✅ OAuth flow completes for all providers
- ✅ Multi-user isolation enforced (separate tokens)
- ✅ Workflow nodes show correct server dropdown
- ✅ MCPConnectorExecutor executes tools successfully
- ✅ AIMCPExecutor orchestrates multiple servers
- ✅ Error handling strategies work (fail/continue/retry)

### Performance Requirements
- ⏳ Workflow execution latency < 3 seconds (simple tool)
- ⏳ AI orchestration latency < 10 seconds (2-3 tools)
- ⏳ Token refresh completes in < 500ms
- ⏳ Support 100+ concurrent workflow executions

### Security Requirements ✅
- ✅ OAuth tokens encrypted at rest (`oauth_token_encrypted` column)
- ✅ Multi-user isolation prevents credential leakage
- ✅ RBAC enforced (user can only use their own connections)
- ✅ Audit logs for all MCP tool executions

---

## Known Limitations

1. **Backward Compatibility**: Legacy workflows without `serverId` require manual re-save
2. **Tool Discovery**: Custom MCP servers must implement standard MCP manifest
3. **Rate Limiting**: Google/AWS rate limits apply per user OAuth token
4. **AI Orchestration**: Limited to 128 function calls per conversation (OpenAI limit)

---

## Troubleshooting Guide

### Issue: "MCP Server not appearing in dropdown"
**Cause**: Server not configured or no OAuth token  
**Solution**: Navigate to Settings → MCP → Configure server → Complete OAuth flow

### Issue: "Tool execution timeout"
**Cause**: Network latency or API rate limiting  
**Solution**: Increase timeout in node config, enable retry policy

### Issue: "Invalid OAuth token"
**Cause**: Token expired and refresh failed  
**Solution**: Re-authenticate via Settings → MCP → Reconnect

### Issue: "AI selects wrong tool"
**Cause**: Ambiguous AI instructions  
**Solution**: Make instructions more specific, reduce temperature parameter

---

## Next Steps After Testing

1. **Document Migration Path**: Create user guide for migrating legacy workflows
2. **Deprecation Timeline**: Plan sunset for legacy executors (google-workspace-executors.ts, etc.)
3. **Production Deployment**: Gradual rollout with feature flag
4. **Monitoring**: Set up alerts for MCP execution failures and token refresh issues

---

**Testing Status**: ✅ Architecture Verified | ⏳ Manual Testing Pending  
**Last Updated**: 2025-10-28  
**Maintained By**: W3 Suite Development Team
