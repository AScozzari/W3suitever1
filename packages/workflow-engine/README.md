# @w3suite/workflow-engine

Shared workflow execution engine for W3 Suite and Brand Interface.

## Overview

This package provides:
- **29+ Workflow Executors**: Email, AI decisions, routing, webhooks, approvals, etc.
- **Type Definitions**: Shared interfaces for executor implementation
- **Validation Utilities**: Config validation and override field checking
- **Metadata Registry**: UI/UX display information for workflow builders

## Architecture

**Hybrid Minimal Approach**:
- Executors currently remain in `apps/backend/api/src/services/action-executors-registry.ts`
- This package provides types, metadata, and validation
- CI/CD enforces version lock between brand and tenant apps
- Gradual migration path for future executor extraction

## Usage

```typescript
import { 
  CORE_EXECUTOR_IDS,
  EXECUTOR_METADATA,
  isFieldOverridable,
  validateExecutorConfig,
  type ActionExecutor,
  type ExecutionContext
} from '@w3suite/workflow-engine';

// Get metadata for executor
const metadata = EXECUTOR_METADATA['email-action-executor'];
console.log(metadata.displayName); // "Send Email"

// Validate config
const result = validateExecutorConfig('team-routing-executor', {
  assignmentMode: 'manual',
  teamId: 'uuid-here'
});

// Check if field is overridable by tenant
const canOverride = isFieldOverridable('email-action-executor', 'teamId'); // true
```

## Executors

### Actions
- `email-action-executor` - Send email notifications
- `approval-action-executor` - Manual approval requests
- `auto-approval-executor` - Rule-based auto-approval
- `webhook-action-executor` - HTTP webhooks
- `sms-action-executor` - SMS notifications
- `task-action-executor` - Create/update tasks

### Routing
- `team-routing-executor` - Route to team (auto/manual)
- `user-routing-executor` - Route to specific user
- `lead-routing-executor` - CRM lead assignment
- `ai-lead-routing-executor` - AI-powered lead routing

### AI & Decisions
- `ai-decision-executor` - AI-powered decisions via workflow-assistant
- `decision-evaluator` - Simple conditional evaluation
- `ai-mcp-executor` - MCP-based AI orchestration
- `ai-funnel-orchestrator-executor` - Funnel routing via AI

### CRM Funnel Management
- `funnel-stage-transition-executor` - Move deal between stages
- `funnel-pipeline-transition-executor` - Move deal between pipelines
- `funnel-exit-executor` - Finalize deal (won/lost/churned)
- `deal-stage-webhook-trigger-executor` - Webhook on stage change

### Control Flow
- `if-condition-executor` - Conditional branching
- `switch-case-executor` - Multi-branch routing
- `while-loop-executor` - Loop execution
- `parallel-fork-executor` - Parallel execution
- `join-sync-executor` - Synchronize parallel branches

### Triggers
- `form-trigger-executor` - Form submission triggers
- `task-trigger-executor` - Task event triggers

### MCP Connectors
- `mcp-connector-executor` - Generic MCP connector actions

### Utilities
- `generic-action-executor` - Fallback for simple actions
- `delay-executor` - Time delays
- `data-transform-executor` - Data transformation

## Override System

Tenants can override specific fields in brand-deployed workflows:

**Allowed override fields per executor**:
- `email-action-executor`: `from`, `teamId`
- `team-routing-executor`: `teamId`
- `ai-decision-executor`: `teamId`
- `webhook-action-executor`: `teamId`

All other fields are **locked** from tenant modification for governance.

## Version Lock Enforcement

CI/CD workflow `.github/workflows/verify-workflow-sync.yml` ensures:
1. Brand API and W3 Suite API use same `@w3suite/workflow-engine` version
2. Build fails on version mismatch
3. Prevents executor divergence across 300+ tenants

## Development

```bash
# Build package
npm run build

# Watch mode
npm run dev
```

## Migration Status

**⚠️ Dependency Injection Refactoring In Progress**

The package is currently undergoing migration to use Dependency Injection pattern:

- ✅ **Phase 1**: Executors extracted from monolithic file (Completed)
- ✅ **Phase 2**: ExecutorRuntime interface defined (Completed)
- 🚧 **Phase 3**: Refactor executors to accept runtime via constructor (In Progress)
- ⏳ **Phase 4**: Create backend & brand runtime implementations
- ⏳ **Phase 5**: Package becomes fully standalone and buildable

**Current State**: Executors extracted but still have direct imports to backend services. System is operational but package build requires runtime refactoring completion.

## License

Proprietary - W3 Suite © 2025
