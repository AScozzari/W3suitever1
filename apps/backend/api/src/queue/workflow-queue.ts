import { Queue, Worker, Job } from 'bullmq';
import { createHash } from 'crypto';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

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

let _workflowQueue: Queue<WorkflowJobData> | null = null;

export function getWorkflowQueue(): Queue<WorkflowJobData> {
  if (!_workflowQueue) {
    if (!REDIS_URL) {
      throw new Error('REDIS_URL not configured. Cannot create workflow queue.');
    }
    _workflowQueue = new Queue<WorkflowJobData>(
      WORKFLOW_QUEUE_NAME,
      {
        connection: { url: REDIS_URL },
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
  }
  return _workflowQueue;
}

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

  const queue = getWorkflowQueue();
  const job = await queue.add(
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
  const queue = getWorkflowQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
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
  const queue = getWorkflowQueue();
  await queue.clean(graceMs, 1000, 'completed');
  await queue.clean(graceMs, 1000, 'failed');
}
