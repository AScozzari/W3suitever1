import { Worker, Job } from 'bullmq';
import { db } from '../core/db';
import { workflowStepExecutions, workflowInstances } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
import {
  WorkflowJobData,
  StepExecutionResult,
  WORKFLOW_QUEUE_NAME,
  generateIdempotencyKey,
} from './workflow-queue';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

const connectionConfig = REDIS_URL
  ? { connection: { url: REDIS_URL } }
  : { connection: { host: 'localhost', port: 6379 } };

async function executeWorkflowStep(
  job: Job<WorkflowJobData>
): Promise<StepExecutionResult> {
  const { instanceId, tenantId, stepId, stepName, attemptNumber, inputData } = job.data;
  const startTime = Date.now();

  try {
    const idempotencyKey = generateIdempotencyKey(instanceId, stepId, attemptNumber);

    const existingExecution = await db.query.workflowStepExecutions.findFirst({
      where: eq(workflowStepExecutions.idempotencyKey, idempotencyKey),
    });

    if (existingExecution && existingExecution.status === 'completed') {
      console.log(`[WORKER] Step ${stepId} already completed (idempotent), skipping...`);
      return {
        success: true,
        outputData: existingExecution.outputData as Record<string, any>,
        durationMs: existingExecution.durationMs || 0,
      };
    }

    if (!existingExecution) {
      await db.insert(workflowStepExecutions).values({
        tenantId,
        instanceId,
        stepId,
        stepName,
        idempotencyKey,
        attemptNumber,
        status: 'running',
        inputData,
        startedAt: new Date(),
      });
    } else {
      await db
        .update(workflowStepExecutions)
        .set({
          status: 'running',
          startedAt: new Date(),
          retryCount: (existingExecution.retryCount || 0) + 1,
        })
        .where(eq(workflowStepExecutions.id, existingExecution.id));
    }

    const outputData = await performStepAction(stepId, inputData);

    const durationMs = Date.now() - startTime;

    await db
      .update(workflowStepExecutions)
      .set({
        status: 'completed',
        outputData,
        completedAt: new Date(),
        durationMs,
      })
      .where(
        and(
          eq(workflowStepExecutions.idempotencyKey, idempotencyKey),
          eq(workflowStepExecutions.tenantId, tenantId)
        )
      );

    return {
      success: true,
      outputData,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const errorDetails = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      recoverable: error.recoverable !== false,
    };

    const idempotencyKey = generateIdempotencyKey(instanceId, stepId, attemptNumber);

    await db
      .update(workflowStepExecutions)
      .set({
        status: 'failed',
        errorDetails,
        completedAt: new Date(),
        durationMs,
      })
      .where(
        and(
          eq(workflowStepExecutions.idempotencyKey, idempotencyKey),
          eq(workflowStepExecutions.tenantId, tenantId)
        )
      );

    throw error;
  }
}

async function performStepAction(
  stepId: string,
  inputData: Record<string, any>
): Promise<Record<string, any>> {
  console.log(`[WORKER] Executing step ${stepId} with input:`, inputData);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    executed: true,
    stepId,
    timestamp: new Date().toISOString(),
    result: `Step ${stepId} completed successfully`,
  };
}

let workerInstance: Worker<WorkflowJobData> | null = null;

export function startWorkflowWorker(): Worker<WorkflowJobData> {
  if (workerInstance) {
    console.log('[WORKER] Workflow worker already running');
    return workerInstance;
  }

  workerInstance = new Worker<WorkflowJobData>(
    WORKFLOW_QUEUE_NAME,
    async (job: Job<WorkflowJobData>) => {
      console.log(`[WORKER] Processing job ${job.id} for step ${job.data.stepId}`);
      const result = await executeWorkflowStep(job);
      return result;
    },
    {
      ...connectionConfig,
      concurrency: 5,
    }
  );

  workerInstance.on('completed', (job, result) => {
    console.log(`[WORKER] Job ${job.id} completed in ${result.durationMs}ms`);
  });

  workerInstance.on('failed', (job, err) => {
    console.error(`[WORKER] Job ${job?.id} failed:`, err.message);
  });

  workerInstance.on('error', (err) => {
    console.error('[WORKER] Worker error:', err);
  });

  console.log('[WORKER] Workflow worker started with concurrency 5');
  return workerInstance;
}

export function stopWorkflowWorker(): Promise<void> {
  if (!workerInstance) {
    return Promise.resolve();
  }

  return workerInstance.close().then(() => {
    workerInstance = null;
    console.log('[WORKER] Workflow worker stopped');
  });
}

export { workerInstance };
