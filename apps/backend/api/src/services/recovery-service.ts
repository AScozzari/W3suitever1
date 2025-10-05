import { db } from '../core/db';
import { workflowInstances, workflowStepExecutions } from '../db/schema/w3suite';
import { eq, and, sql, lt, inArray } from 'drizzle-orm';
import { eventSourcingService, type WorkflowState } from './event-sourcing-service';
import logger from '../core/logger';

export interface RecoveryOptions {
  maxStaleMinutes?: number; // Consider workflow stale after N minutes
  batchSize?: number; // Process N workflows at a time
  autoResume?: boolean; // Automatically resume recovered workflows
}

export interface RecoveryResult {
  instanceId: string;
  previousState: string;
  recoveredState: WorkflowState;
  action: 'resumed' | 'failed' | 'manual_review_required';
  error?: string;
}

export class RecoveryService {
  
  private readonly defaultOptions: Required<RecoveryOptions> = {
    maxStaleMinutes: 30,
    batchSize: 10,
    autoResume: true,
  };

  /**
   * Detect workflow instances that may have crashed (stale running workflows)
   */
  async detectStalledWorkflows(tenantId: string, options?: RecoveryOptions): Promise<string[]> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Find workflows that are "running" but haven't updated in X minutes
    const staleThreshold = new Date(Date.now() - opts.maxStaleMinutes * 60 * 1000);

    const stalledInstances = await db
      .select({ id: workflowInstances.id })
      .from(workflowInstances)
      .where(
        and(
          eq(workflowInstances.tenantId, tenantId),
          eq(workflowInstances.status, 'running'),
          lt(workflowInstances.updatedAt, staleThreshold)
        )
      )
      .limit(opts.batchSize);

    return stalledInstances.map(i => i.id);
  }

  /**
   * Recover a single workflow instance from event history
   */
  async recoverWorkflow(instanceId: string, options?: RecoveryOptions): Promise<RecoveryResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Get current DB state
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, instanceId))
        .limit(1);

      if (!instance) {
        throw new Error(`Workflow instance ${instanceId} not found`);
      }

      const previousState = instance.status;

      // Rebuild state from events
      const recoveredState = await eventSourcingService.rebuildState(instanceId);

      if (!recoveredState) {
        logger.warn(`⚠️ No events found for workflow ${instanceId}, cannot recover`);
        return {
          instanceId,
          previousState,
          recoveredState: { 
            status: 'failed', 
            completedSteps: [], 
            pendingSteps: [], 
            executionContext: {}, 
            metadata: {} 
          },
          action: 'manual_review_required',
          error: 'No event history available',
        };
      }

      // Update workflow instance with recovered state
      await db
        .update(workflowInstances)
        .set({
          status: recoveredState.status,
          currentState: recoveredState,
          updatedAt: new Date(),
        })
        .where(eq(workflowInstances.id, instanceId));

      logger.info(`✅ Workflow ${instanceId} state recovered: ${previousState} -> ${recoveredState.status}`);

      // Determine action
      let action: 'resumed' | 'failed' | 'manual_review_required' = 'manual_review_required';

      if (opts.autoResume && recoveredState.status === 'running') {
        action = 'resumed';
        // Workflow will be picked up by the worker automatically
      } else if (recoveredState.status === 'failed' || recoveredState.status === 'cancelled') {
        action = 'failed';
      }

      return {
        instanceId,
        previousState,
        recoveredState,
        action,
      };

    } catch (error: any) {
      logger.error(`❌ Failed to recover workflow ${instanceId}:`, error);
      return {
        instanceId,
        previousState: 'unknown',
        recoveredState: { 
          status: 'failed', 
          completedSteps: [], 
          pendingSteps: [], 
          executionContext: {}, 
          metadata: {} 
        },
        action: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Batch recovery of multiple workflows
   */
  async recoverStalledWorkflows(tenantId: string, options?: RecoveryOptions): Promise<RecoveryResult[]> {
    const opts = { ...this.defaultOptions, ...options };

    // Detect stalled workflows
    const stalledInstanceIds = await this.detectStalledWorkflows(tenantId, opts);

    if (stalledInstanceIds.length === 0) {
      logger.info(`✅ No stalled workflows found for tenant ${tenantId}`);
      return [];
    }

    logger.info(`🔍 Found ${stalledInstanceIds.length} stalled workflows for recovery`);

    // Recover each workflow
    const results: RecoveryResult[] = [];
    
    for (const instanceId of stalledInstanceIds) {
      const result = await this.recoverWorkflow(instanceId, opts);
      results.push(result);
    }

    // Summary logging
    const resumed = results.filter(r => r.action === 'resumed').length;
    const failed = results.filter(r => r.action === 'failed').length;
    const manualReview = results.filter(r => r.action === 'manual_review_required').length;

    logger.info(`📊 Recovery summary: ${resumed} resumed, ${failed} failed, ${manualReview} require manual review`);

    return results;
  }

  /**
   * Verify workflow integrity (compare DB state vs event-sourced state)
   */
  async verifyWorkflowIntegrity(instanceId: string): Promise<{
    isValid: boolean;
    dbState: any;
    eventSourcedState: WorkflowState | null;
    discrepancies: string[];
  }> {
    
    // Get DB state
    const [instance] = await db
      .select()
      .from(workflowInstances)
      .where(eq(workflowInstances.id, instanceId))
      .limit(1);

    if (!instance) {
      return {
        isValid: false,
        dbState: null,
        eventSourcedState: null,
        discrepancies: ['Workflow instance not found in database'],
      };
    }

    // Get event-sourced state
    const eventSourcedState = await eventSourcingService.rebuildState(instanceId);

    const discrepancies: string[] = [];

    if (!eventSourcedState) {
      discrepancies.push('No event history available for verification');
    } else {
      // Compare states
      if (instance.status !== eventSourcedState.status) {
        discrepancies.push(`Status mismatch: DB=${instance.status}, Events=${eventSourcedState.status}`);
      }

      // Compare completed steps
      const dbCompletedSteps = instance.currentState?.completedSteps || [];
      const eventCompletedSteps = eventSourcedState.completedSteps || [];

      if (JSON.stringify(dbCompletedSteps.sort()) !== JSON.stringify(eventCompletedSteps.sort())) {
        discrepancies.push(`Completed steps mismatch: DB=${dbCompletedSteps.length}, Events=${eventCompletedSteps.length}`);
      }
    }

    return {
      isValid: discrepancies.length === 0,
      dbState: instance.currentState,
      eventSourcedState,
      discrepancies,
    };
  }

  /**
   * Create recovery checkpoint (snapshot) for a running workflow
   */
  async createRecoveryCheckpoint(instanceId: string): Promise<void> {
    
    // Get current workflow instance
    const [instance] = await db
      .select()
      .from(workflowInstances)
      .where(eq(workflowInstances.id, instanceId))
      .limit(1);

    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    // Get completed steps from step executions
    const completedExecutions = await db
      .select({ stepId: workflowStepExecutions.stepId })
      .from(workflowStepExecutions)
      .where(
        and(
          eq(workflowStepExecutions.instanceId, instanceId),
          eq(workflowStepExecutions.status, 'completed')
        )
      );

    const completedSteps = completedExecutions.map(e => e.stepId);

    // Get pending steps (all steps in template minus completed)
    // For simplicity, we'll use the instance's current state if available
    const pendingSteps = instance.currentState?.pendingSteps || [];

    const workflowState: WorkflowState = {
      status: instance.status,
      currentStepId: instance.currentState?.currentStepId,
      completedSteps,
      pendingSteps,
      executionContext: instance.currentState?.executionContext || {},
      metadata: instance.currentState?.metadata || {},
    };

    // Create snapshot
    await eventSourcingService.createSnapshot({
      tenantId: instance.tenantId,
      instanceId: instance.id,
      workflowState,
    });

    logger.info(`✅ Recovery checkpoint created for workflow ${instanceId}`);
  }

  /**
   * Cleanup old recovery data (expired snapshots and old events)
   */
  async cleanupOldRecoveryData(instanceId: string): Promise<{
    snapshotsDeleted: number;
  }> {
    
    // Cleanup old snapshots (keep last 5)
    const snapshotsDeleted = await eventSourcingService.cleanupOldSnapshots(instanceId, 5);

    logger.info(`🧹 Cleaned up ${snapshotsDeleted} old snapshots for workflow ${instanceId}`);

    return {
      snapshotsDeleted,
    };
  }

  /**
   * Get recovery status for a tenant
   */
  async getRecoveryStatus(tenantId: string): Promise<{
    totalWorkflows: number;
    runningWorkflows: number;
    stalledWorkflows: number;
    workflowsWithSnapshots: number;
    oldestStalled?: Date;
  }> {
    
    const [totalResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workflowInstances)
      .where(eq(workflowInstances.tenantId, tenantId));

    const [runningResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workflowInstances)
      .where(
        and(
          eq(workflowInstances.tenantId, tenantId),
          eq(workflowInstances.status, 'running')
        )
      );

    const stalledIds = await this.detectStalledWorkflows(tenantId);

    // Get oldest stalled workflow
    let oldestStalled: Date | undefined;
    if (stalledIds.length > 0) {
      const [oldestResult] = await db
        .select({ updatedAt: workflowInstances.updatedAt })
        .from(workflowInstances)
        .where(inArray(workflowInstances.id, stalledIds))
        .orderBy(workflowInstances.updatedAt)
        .limit(1);

      oldestStalled = oldestResult?.updatedAt;
    }

    return {
      totalWorkflows: Number(totalResult?.count || 0),
      runningWorkflows: Number(runningResult?.count || 0),
      stalledWorkflows: stalledIds.length,
      workflowsWithSnapshots: 0, // TODO: Query snapshot table
      oldestStalled,
    };
  }
}

export const recoveryService = new RecoveryService();
