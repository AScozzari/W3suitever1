/**
 * 🎯 WORKFLOW ENGINE TYPES
 * 
 * Shared TypeScript interfaces for workflow execution across
 * Brand Interface and W3 Suite tenant apps.
 */

export * from './runtime';

/**
 * Base interface for all action executors
 */
export interface ActionExecutor {
  executorId: string;
  description: string;
  execute(
    step: any, 
    inputData?: Record<string, any>, 
    context?: any
  ): Promise<ActionExecutionResult>;
}

/**
 * Standard result interface for all executors
 */
export interface ActionExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  decision?: string;
  nextAction?: string;
  error?: string;
}

/**
 * Execution context passed to executors
 */
export interface ExecutionContext {
  tenantId: string;
  requesterId: string;
  instanceId: string;
  templateId: string;
  currentAssigneeId?: string;
  storeId?: string;
  legalEntityId?: string;
  department?: string;
  requesterEmail?: string;
  requesterRole?: string;
  metadata?: Record<string, any>;
}

/**
 * Executor config field validation schema
 */
export interface ExecutorConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'uuid';
  required: boolean;
  description: string;
  allowedInOverride?: boolean;
}

/**
 * Executor metadata for registry
 */
export interface ExecutorMetadata {
  executorId: string;
  displayName: string;
  description: string;
  category: 'action' | 'decision' | 'trigger' | 'ai' | 'routing' | 'control' | 'campaign' | 'pipeline' | 'funnel' | 'webhook';
  configSchema: ExecutorConfigField[];
  overridableFields: string[];
  icon?: string;
}
