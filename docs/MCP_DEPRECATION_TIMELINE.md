# MCP Deprecation Timeline
**Legacy Executors Sunset Plan**

## Overview

With the migration to pure MCP protocol architecture, the following **legacy dedicated executors** will be deprecated and eventually removed:

- `google-workspace-executors.ts` (Gmail, Drive, Calendar, Sheets, Docs)
- `aws-executors.ts` (S3, Lambda, SNS, SQS, DynamoDB)
- `meta-executors.ts` (Instagram Post, Story, Comment, DM)
- `microsoft-executors.ts` (Outlook, OneDrive, Teams)
- `stripe-executors.ts` (Payment, Subscription, Invoice)
- `gtm-executors.ts` (Track Event, Pageview, Conversion, Tags)
- `postgresql-executors.ts` (Query, Insert, Update, Delete, Transactions)

**Total**: 7 files, ~2,500 lines of code to be removed.

---

## Deprecation Phases

### Phase 1: Soft Deprecation (Month 1-2)
**Status**: 🟡 Warning Mode  
**Date**: November 2025 - December 2025

#### Actions:
1. **Add deprecation warnings** to legacy executors:
   ```typescript
   // google-workspace-executors.ts
   logger.warn('⚠️ [DEPRECATION] google-workspace-executors.ts is deprecated. Please migrate to MCPConnectorExecutor with serverId config.');
   ```

2. **Update documentation**:
   - Add deprecation notice to `replit.md`
   - Publish migration guide
   - Send email announcement to all tenants

3. **UI warnings** for legacy workflows:
   ```tsx
   {workflowUsesLegacyExecutors && (
     <Alert variant="warning">
       ⚠️ This workflow uses deprecated executors. 
       Please migrate to MCP server connections before January 2026.
       <Link to="/migration-guide">View Migration Guide</Link>
     </Alert>
   )}
   ```

4. **Metrics tracking**:
   - Count workflows using legacy executors
   - Track migration progress per tenant
   - Dashboard: `Admin → MCP Migration Status`

#### Success Criteria:
- [ ] All users notified of deprecation
- [ ] Migration guide published
- [ ] <30% of workflows still using legacy executors

---

### Phase 2: Hard Deprecation (Month 3)
**Status**: 🟠 Error Mode  
**Date**: January 2026

#### Actions:
1. **Block new workflow creation** with legacy executors:
   ```typescript
   // workflow-service.ts
   if (usesLegacyExecutors(workflowDefinition)) {
     throw new Error(
       'Legacy executors are deprecated. Please use MCP server connections. See migration guide: /docs/mcp-migration'
     );
   }
   ```

2. **Execution warnings** for existing workflows:
   ```typescript
   logger.error('❌ [DEPRECATION] Workflow uses deprecated executor. Execution allowed but will fail after Feb 2026.');
   ```

3. **UI blocking** for new nodes:
   ```tsx
   // Disable legacy nodes in workflow canvas
   if (nodeDefinition.version === '1.0.0') {
     return <NodeDisabledOverlay reason="deprecated" />;
   }
   ```

4. **Email reminders** to tenants with unmigrated workflows:
   ```
   Subject: Action Required: Migrate Your Workflows by Feb 2026
   
   Dear [Tenant],
   
   You have [X] workflows still using deprecated executors.
   These will stop working on February 1, 2026.
   
   Please migrate before then: [Migration Guide Link]
   ```

#### Success Criteria:
- [ ] No new workflows with legacy executors
- [ ] <10% of active workflows using legacy executors
- [ ] All tenants contacted via email

---

### Phase 3: Final Removal (Month 4)
**Status**: 🔴 Deleted  
**Date**: February 2026

#### Actions:
1. **Disable legacy executor execution**:
   ```typescript
   // action-executors-registry.ts
   const LEGACY_EXECUTORS = [
     'google-gmail-send-executor',
     'aws-s3-upload-executor',
     // ... all legacy executors
   ];
   
   if (LEGACY_EXECUTORS.includes(executorId)) {
     throw new Error(
       `Executor ${executorId} has been removed. Migrate to MCPConnectorExecutor.`
     );
   }
   ```

2. **Delete executor files**:
   ```bash
   git rm apps/backend/api/src/executors/google-workspace-executors.ts
   git rm apps/backend/api/src/executors/aws-executors.ts
   git rm apps/backend/api/src/executors/meta-executors.ts
   git rm apps/backend/api/src/executors/microsoft-executors.ts
   git rm apps/backend/api/src/executors/stripe-executors.ts
   git rm apps/backend/api/src/executors/gtm-executors.ts
   git rm apps/backend/api/src/executors/postgresql-executors.ts
   ```

3. **Database cleanup**:
   ```sql
   -- Archive workflows using legacy executors
   UPDATE workflows 
   SET status = 'archived', 
       archived_reason = 'Uses deprecated legacy executors'
   WHERE definition::text LIKE '%google-gmail-send-executor%';
   ```

4. **Remove shared OAuth tokens** (if no longer needed):
   ```sql
   -- Remove tenant-wide OAuth tokens
   DELETE FROM oauth_credentials 
   WHERE scope = 'tenant' AND provider IN ('google', 'aws', 'meta', 'microsoft', 'stripe');
   ```

5. **Update imports** across codebase:
   ```typescript
   // Remove from action-executors-registry.ts
   - import { GoogleWorkspaceExecutors } from './executors/google-workspace-executors';
   - import { AWSExecutors } from './executors/aws-executors';
   // ... etc
   ```

#### Success Criteria:
- [ ] 0% workflows using legacy executors
- [ ] All executor files deleted
- [ ] All tests passing without legacy code
- [ ] Documentation updated

---

## Migration Progress Dashboard

### Tenant Migration Status (Example)

| Tenant | Total Workflows | Migrated | Pending | Progress |
|--------|----------------|----------|---------|----------|
| Staging | 45 | 40 | 5 | 89% ✅ |
| Production | 150 | 120 | 30 | 80% 🟡 |
| Demo | 20 | 20 | 0 | 100% ✅ |

### Executor Usage Breakdown

| Executor | Active Workflows | Status |
|----------|-----------------|--------|
| `google-gmail-send-executor` | 35 | 🟡 Deprecated |
| `aws-s3-upload-executor` | 12 | 🟡 Deprecated |
| `mcp-connector-executor` | 120 | ✅ Active |
| `ai-mcp-executor` | 45 | ✅ Active |

---

## Rollout Checklist

### Phase 1 Preparation
- [ ] Add deprecation warnings to all legacy executors
- [ ] Publish migration guide (docs/MCP_MIGRATION_GUIDE.md)
- [ ] Update replit.md with deprecation notice
- [ ] Email all tenants about upcoming deprecation
- [ ] Create migration dashboard (Admin → MCP Status)
- [ ] Set up metrics tracking (Grafana/DataDog)

### Phase 2 Hard Deprecation
- [ ] Block new workflow creation with legacy executors
- [ ] Add execution errors for legacy workflows
- [ ] Disable legacy nodes in canvas UI
- [ ] Send reminder emails to unmigrated tenants
- [ ] Offer migration assistance via support

### Phase 3 Final Removal
- [ ] Verify 100% migration or archive unmigrated workflows
- [ ] Delete all 7 legacy executor files
- [ ] Remove imports from action-executors-registry.ts
- [ ] Clean up database (archive old workflows)
- [ ] Update tests to remove legacy references
- [ ] Deploy removal to production

---

## Communication Plan

### Email 1: Announcement (Month 1)
**Subject**: Introducing Pure MCP Architecture - Migration Required

**Content**:
```
Hi [Tenant Name],

We're excited to announce W3 Suite's migration to a pure MCP (Model Context Protocol) architecture!

What's New:
✅ Multi-user OAuth isolation
✅ Better security with encrypted credentials
✅ AI-powered workflow orchestration
✅ Support for multiple accounts per user

Action Required:
Please migrate your workflows before February 2026 using our migration guide:
[Migration Guide Link]

Need Help?
Our team is here to assist! Contact support@w3suite.com

Best regards,
W3 Suite Team
```

### Email 2: Reminder (Month 2)
**Subject**: Reminder: Migrate Your Workflows by January 2026

**Content**:
```
Hi [Tenant Name],

You have [X] workflows that need migration to our new MCP architecture.

Timeline:
- NOW: Soft deprecation (warnings only)
- January 2026: Hard deprecation (no new legacy workflows)
- February 2026: Legacy executors removed

Migrate Now:
[Migration Guide Link]

Questions? Reply to this email or contact support.
```

### Email 3: Final Notice (Month 3)
**Subject**: URGENT: Legacy Executors Will Be Removed in 30 Days

**Content**:
```
Hi [Tenant Name],

⚠️ IMPORTANT: Your workflows will STOP WORKING on February 1, 2026.

Unmigrated Workflows:
[List of workflow names]

What You Need to Do:
1. Visit [Migration Guide]
2. Install MCP servers for your integrations
3. Update workflows to use new server connections
4. Test execution

Need Assistance?
Our migration team can help: migration@w3suite.com
Book a 1-on-1 session: [Calendly Link]
```

---

## Support Resources

### Migration Assistance
- **Email**: migration@w3suite.com
- **Slack**: #mcp-migration-help
- **1-on-1 Sessions**: Book via [Calendly](https://calendly.com/w3suite/mcp-migration)

### Documentation
- **Migration Guide**: `/docs/MCP_MIGRATION_GUIDE.md`
- **Testing Strategy**: `/docs/MCP_TESTING_STRATEGY.md`
- **Video Tutorial**: [YouTube Link - Coming Soon]

### Automated Tools
- **Bulk Migration Script**: `npm run migrate:mcp-workflows`
- **Workflow Analyzer**: `npm run analyze:legacy-executors`
- **Health Check**: `npm run check:mcp-servers`

---

## Risk Mitigation

### Risk 1: Users Don't Migrate in Time
**Mitigation**:
- Proactive email reminders (3 waves)
- Dashboard showing migration progress
- Offer free migration assistance
- Extend deadline if <90% migrated

### Risk 2: Migration Breaks Workflows
**Mitigation**:
- Comprehensive testing guide
- Rollback procedure documented
- Database backups before migration
- Phased rollout (10% → 50% → 100%)

### Risk 3: OAuth Configuration Issues
**Mitigation**:
- Step-by-step OAuth guides per provider
- Video tutorials for complex flows
- Support team available for troubleshooting
- Pre-configured MCP servers in marketplace

---

## Success Metrics

### Phase 1 (Soft Deprecation)
- ✅ 70% of workflows migrated
- ✅ 100% of tenants notified
- ✅ <10 support tickets per week

### Phase 2 (Hard Deprecation)
- ✅ 90% of workflows migrated
- ✅ 0 new workflows with legacy executors
- ✅ Migration dashboard live

### Phase 3 (Final Removal)
- ✅ 100% of active workflows migrated
- ✅ All legacy code removed
- ✅ Documentation updated
- ✅ No production incidents

---

## Post-Removal Cleanup

### Code Cleanup
```bash
# Remove legacy executor imports
grep -r "google-workspace-executors" apps/backend --files-with-matches | xargs sed -i '/google-workspace-executors/d'

# Remove unused dependencies (if any)
npm uninstall @google-cloud/gmail-api # Example, if no longer needed

# Run tests
npm test

# Verify build
npm run build
```

### Database Cleanup
```sql
-- Archive unmigrated workflows
UPDATE workflows 
SET status = 'archived', 
    archived_reason = 'Uses removed legacy executors. Contact support to migrate.'
WHERE definition::text ~* '(google-gmail-send-executor|aws-s3-upload-executor)';

-- Remove shared OAuth tokens (if confirmed unused)
DELETE FROM oauth_credentials 
WHERE scope = 'tenant' 
  AND created_at < '2025-01-01' 
  AND NOT EXISTS (
    SELECT 1 FROM workflows 
    WHERE status = 'active' 
      AND uses_shared_oauth = true
  );
```

### Documentation Updates
- [ ] Remove legacy executor references from API docs
- [ ] Update architecture diagrams
- [ ] Archive migration guides (keep for reference)
- [ ] Update onboarding documentation for new users

---

## Rollback Plan (Emergency Only)

If critical issues occur during removal:

### Step 1: Revert Code
```bash
git revert [commit-hash-of-removal]
git push origin main
```

### Step 2: Restore Database
```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE < backup_before_removal.sql
```

### Step 3: Communication
```
Email Subject: Legacy Executors Temporarily Restored

We've temporarily restored legacy executors while we investigate
an issue reported by [affected tenants].

Your workflows will continue working. We'll provide an update
within 48 hours.

Apologies for any inconvenience.
```

### Step 4: Root Cause Analysis
- Identify issue causing rollback
- Fix in MCP architecture
- Re-plan removal timeline
- Re-test thoroughly

---

## Lessons Learned (Post-Mortem)

### What Went Well
- [ ] Migration guide comprehensive and clear
- [ ] Automated tools reduced manual work
- [ ] Communication plan kept users informed
- [ ] Phased approach minimized risk

### What Could Be Improved
- [ ] Earlier start to migration (more time)
- [ ] More 1-on-1 support sessions
- [ ] Video tutorials in addition to written docs
- [ ] Better metrics dashboard for tracking

### Action Items for Future Deprecations
- [ ] Create deprecation playbook template
- [ ] Build automated migration tools first
- [ ] Allow 6 months instead of 4 for complex migrations
- [ ] Invest in better testing infrastructure

---

**Deprecation Status**: 📝 Plan Complete | ⏳ Execution Pending  
**Last Updated**: 2025-10-28  
**Owner**: W3 Suite Platform Engineering Team  
**Approval Required**: CTO Sign-off before Phase 3
