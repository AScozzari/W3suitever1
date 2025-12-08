import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class ParallelForkExecutor extends BaseExecutor {
  executorId = 'parallel-fork-executor';
  description = 'Forks workflow into parallel branches';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🌿 [EXECUTOR] Executing PARALLEL fork', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const branches = config.branches || [];

      const branchNodes = branches.map((b: any) => b.startNode).filter(Boolean);

      return {
        success: true,
        message: `Forked into ${branches.length} parallel branches`,
        data: {
          branches: branches.map((b: any) => ({
            name: b.name,
            startNode: b.startNode
          })),
          waitFor: config.waitFor,
          timeout: config.timeout
        },
        nextAction: branchNodes.join(',')
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] PARALLEL fork failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: 'Failed to fork parallel branches',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
