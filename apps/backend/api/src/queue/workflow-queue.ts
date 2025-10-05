import { Queue, Worker, Job } from 'bullmq';
import { createHash } from 'crypto';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

const connectionConfig = REDIS_URL
  ? { connection: { url: REDIS_URL } }
  : { connection: { host: 'localhost', port: 6379 } };

export interface WorkflowJobData {
  instanceId: string;
  tenantId: string;
  stepId: string;
  stepName: string;
  attemptNumber: number;
  inputData: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StepExecutionResult {
  success: boolean;
  outputData?: Record<string, any>;
  errorDetails?: {
    message: string;
    stack?: string;
    code?: string;
    recoverable: boolean;
  };
  durationMs: number;
}

export const WORKFLOW_QUEUE_NAME = 'workflow-executions';

export const workflowQueue = new Queue<WorkflowJobData>(
  WORKFLOW_QUEUE_NAME,
  {
    ...connectionConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }
);

export function generateIdempotencyKey(
  instanceId: string,
  stepId: string,
  attemptNumber: number
): string {
  const data = `${instanceId}:${stepId}:${attemptNumber}`;
  return createHash('sha256').update(data).digest('hex');
}

export async function enqueueWorkflowStep(
  data: WorkflowJobData,
  priority: number = 1
): Promise<Job<WorkflowJobData>> {
  const idempotencyKey = generateIdempotencyKey(
    data.instanceId,
    data.stepId,
    data.attemptNumber
  );

  const job = await workflowQueue.add(
    `step-${data.stepId}`,
    data,
    {
      jobId: idempotencyKey,
      priority,
    }
  );

  return job;
}

export async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    workflowQueue.getWaitingCount(),
    workflowQueue.getActiveCount(),
    workflowQueue.getCompletedCount(),
    workflowQueue.getFailedCount(),
    workflowQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function cleanQueue(graceMs: number = 86400000) {
  await workflowQueue.clean(graceMs, 1000, 'completed');
  await workflowQueue.clean(graceMs, 1000, 'failed');
}
