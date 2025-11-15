/**
 * 🎯 CORE EXECUTORS REGISTRY
 * 
 * Central registry metadata for workflow executors shared between
 * Brand Interface and W3 Suite tenant apps.
 * 
 * NOTE: This registry contains METADATA only (IDs, descriptions, config schemas).
 * Actual executor instances are created by backend with ExecutorRuntime injection.
 * 
 * Package contains 26 infrastructure executors.
 * Domain-specific executors (TaskAction, TeamRouting, AILeadRouting) remain in apps/backend/api.
 */

import type { ExecutorMetadata } from '../types';

/**
 * List of all 22 shared executor IDs
 * (7 executors remain in apps/backend/api due to domain-specific dependencies)
 */
export const CORE_EXECUTOR_IDS = [
  // Action Executors (4)
  'email-action-executor',
  'approval-action-executor',
  'auto-approval-executor',
  'generic-action-executor',
  
  // Decision & Trigger Executors (4)
  'decision-evaluator',
  'ai-decision-executor',
  'form-trigger-executor',
  'task-trigger-executor',
  
  // Routing Executors (3)
  'lead-routing-executor',
  'deal-routing-executor',
  'customer-routing-executor',
  
  // Campaign & Pipeline Executors (2)
  'campaign-lead-intake-executor',
  'pipeline-assignment-executor',
  
  // Funnel Executors (5)
  'funnel-stage-transition-executor',
  'funnel-pipeline-transition-executor',
  'ai-funnel-orchestrator-executor',
  'funnel-exit-executor',
  'deal-stage-webhook-trigger-executor',
  
  // Control Flow Executors (4)
  'switch-case-executor',
  'while-loop-executor',
  'parallel-fork-executor',
  'join-sync-executor'
] as const;

export type CoreExecutorId = typeof CORE_EXECUTOR_IDS[number];

/**
 * Executor metadata registry for UI/UX display and validation
 */
export const EXECUTOR_METADATA: Record<string, ExecutorMetadata> = {
  // Action Executors (4)
  'email-action-executor': {
    executorId: 'email-action-executor',
    displayName: 'Send Email',
    description: 'Sends email notifications using notification service',
    category: 'action',
    configSchema: [],
    overridableFields: ['from', 'teamId']
  },
  'approval-action-executor': {
    executorId: 'approval-action-executor',
    displayName: 'Approval Request',
    description: 'Handles approval requests and notifications',
    category: 'action',
    configSchema: [],
    overridableFields: ['teamId']
  },
  'auto-approval-executor': {
    executorId: 'auto-approval-executor',
    displayName: 'Auto Approval',
    description: 'Automatically approves workflow based on predefined rules',
    category: 'action',
    configSchema: [],
    overridableFields: []
  },
  'generic-action-executor': {
    executorId: 'generic-action-executor',
    displayName: 'Generic Action',
    description: 'Executes custom workflow actions',
    category: 'action',
    configSchema: [],
    overridableFields: []
  },
  
  // Decision & Trigger Executors (4)
  'decision-evaluator': {
    executorId: 'decision-evaluator',
    displayName: 'Decision Evaluator',
    description: 'Evaluates conditions and routes workflow accordingly',
    category: 'decision',
    configSchema: [],
    overridableFields: []
  },
  'ai-decision-executor': {
    executorId: 'ai-decision-executor',
    displayName: 'AI Decision',
    description: 'Uses AI agent for intelligent decision-making',
    category: 'ai',
    configSchema: [],
    overridableFields: ['teamId']
  },
  'form-trigger-executor': {
    executorId: 'form-trigger-executor',
    displayName: 'Form Trigger',
    description: 'Triggers workflow on form submission',
    category: 'trigger',
    configSchema: [],
    overridableFields: []
  },
  'task-trigger-executor': {
    executorId: 'task-trigger-executor',
    displayName: 'Task Trigger',
    description: 'Triggers workflow on task events',
    category: 'trigger',
    configSchema: [],
    overridableFields: []
  },
  
  // Routing Executors (3)
  'lead-routing-executor': {
    executorId: 'lead-routing-executor',
    displayName: 'Route Lead',
    description: 'Routes leads to appropriate teams or users',
    category: 'routing',
    configSchema: [],
    overridableFields: ['teamId']
  },
  'deal-routing-executor': {
    executorId: 'deal-routing-executor',
    displayName: 'Route Deal',
    description: 'Routes deals to appropriate pipelines or stages',
    category: 'routing',
    configSchema: [],
    overridableFields: ['teamId']
  },
  'customer-routing-executor': {
    executorId: 'customer-routing-executor',
    displayName: 'Route Customer',
    description: 'Routes customers to appropriate teams or workflows',
    category: 'routing',
    configSchema: [],
    overridableFields: ['teamId']
  },
  
  // Campaign & Pipeline Executors (2)
  'campaign-lead-intake-executor': {
    executorId: 'campaign-lead-intake-executor',
    displayName: 'Campaign Lead Intake',
    description: 'Processes incoming leads from campaigns',
    category: 'campaign',
    configSchema: [],
    overridableFields: []
  },
  'pipeline-assignment-executor': {
    executorId: 'pipeline-assignment-executor',
    displayName: 'Pipeline Assignment',
    description: 'Assigns deals to specific pipelines',
    category: 'pipeline',
    configSchema: [],
    overridableFields: []
  },
  
  // Funnel Executors (5)
  'funnel-stage-transition-executor': {
    executorId: 'funnel-stage-transition-executor',
    displayName: 'Funnel Stage Transition',
    description: 'Transitions deals between funnel stages',
    category: 'funnel',
    configSchema: [],
    overridableFields: []
  },
  'funnel-pipeline-transition-executor': {
    executorId: 'funnel-pipeline-transition-executor',
    displayName: 'Funnel Pipeline Transition',
    description: 'Transitions deals between pipelines within funnel',
    category: 'funnel',
    configSchema: [],
    overridableFields: []
  },
  'ai-funnel-orchestrator-executor': {
    executorId: 'ai-funnel-orchestrator-executor',
    displayName: 'AI Funnel Orchestrator',
    description: 'AI-powered intelligent funnel routing and optimization',
    category: 'ai',
    configSchema: [],
    overridableFields: []
  },
  'funnel-exit-executor': {
    executorId: 'funnel-exit-executor',
    displayName: 'Funnel Exit',
    description: 'Handles deal exit from funnel workflow',
    category: 'funnel',
    configSchema: [],
    overridableFields: []
  },
  'deal-stage-webhook-trigger-executor': {
    executorId: 'deal-stage-webhook-trigger-executor',
    displayName: 'Deal Stage Webhook',
    description: 'Triggers webhooks on deal stage changes',
    category: 'webhook',
    configSchema: [],
    overridableFields: []
  },
  
  // Control Flow Executors (4)
  'switch-case-executor': {
    executorId: 'switch-case-executor',
    displayName: 'Switch Case',
    description: 'Routes workflow based on multiple conditions',
    category: 'control',
    configSchema: [],
    overridableFields: []
  },
  'while-loop-executor': {
    executorId: 'while-loop-executor',
    displayName: 'While Loop',
    description: 'Repeats workflow steps while condition is true',
    category: 'control',
    configSchema: [],
    overridableFields: []
  },
  'parallel-fork-executor': {
    executorId: 'parallel-fork-executor',
    displayName: 'Parallel Fork',
    description: 'Executes multiple workflow branches in parallel',
    category: 'control',
    configSchema: [],
    overridableFields: []
  },
  'join-sync-executor': {
    executorId: 'join-sync-executor',
    displayName: 'Join Sync',
    description: 'Synchronizes parallel workflow branches',
    category: 'control',
    configSchema: [],
    overridableFields: []
  }
};

/**
 * Validate if field is allowed to be overridden by tenant
 */
export function isFieldOverridable(executorId: string, fieldName: string): boolean {
  const metadata = EXECUTOR_METADATA[executorId];
  if (!metadata) return false;
  return metadata.overridableFields.includes(fieldName);
}

/**
 * Validate executor configuration against schema
 */
export function validateExecutorConfig(
  executorId: string, 
  config: Record<string, any>
): { valid: boolean; errors: string[] } {
  const metadata = EXECUTOR_METADATA[executorId];
  
  if (!metadata) {
    return { valid: false, errors: [`Unknown executor: ${executorId}`] };
  }

  const errors: string[] = [];
  
  metadata.configSchema.forEach(field => {
    if (field.required && !(field.name in config)) {
      errors.push(`Required field missing: ${field.name}`);
    }
  });

  return { valid: errors.length === 0, errors };
}
