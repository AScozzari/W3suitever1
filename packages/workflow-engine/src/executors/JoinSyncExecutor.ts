import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class JoinSyncExecutor extends BaseExecutor {
  executorId = 'join-sync-executor';
  description = 'Synchronizes parallel branches';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🔗 [EXECUTOR] Executing JOIN sync', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const completedBranches = context?.metadata?.completedBranches || [];
      const totalBranches = context?.metadata?.totalBranches || 0;

      const allCompleted = config.waitForAll 
        ? completedBranches.length === totalBranches
        : completedBranches.length > 0;

      if (allCompleted) {
        return {
          success: true,
          message: 'All branches synchronized successfully',
          data: {
            completedBranches,
            totalBranches,
            aggregateResults: config.aggregateResults ? completedBranches : undefined
          }
        };
      } else {
        return {
          success: true,
          message: 'Waiting for branches to complete',
          data: {
            completedBranches: completedBranches.length,
            totalBranches,
            waiting: true
          }
        };
      }

    } catch (error) {
      this.logError('❌ [EXECUTOR] JOIN sync failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: 'Failed to synchronize branches',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
