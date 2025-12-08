/**
 * 🎯 @w3suite/workflow-engine
 * 
 * Shared workflow execution engine for W3 Suite and Brand Interface.
 * Provides unified executor registry, type definitions, and validation utilities.
 * 
 * Architecture: Fully extracted executor implementation
 * - All 29 executors extracted from monolithic file
 * - Shared between Brand Interface and W3 Suite tenant apps
 * - Version lock enforced via CI/CD to prevent divergence
 */

export * from './types';
export * from './registry/core-executors';
export * from './executors';

export type { 
  ActionExecutor,
  ActionExecutionResult,
  ExecutionContext,
  ExecutorMetadata,
  ExecutorConfigField
} from './types';

export {
  CORE_EXECUTOR_IDS,
  EXECUTOR_METADATA,
  isFieldOverridable,
  validateExecutorConfig,
  type CoreExecutorId
} from './registry/core-executors';
