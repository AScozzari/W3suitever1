import { Queue, Job } from 'bullmq';
import type { InsertActivityLog } from '../db/schema/w3suite.js';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

export type ActivityLogJobData = Omit<InsertActivityLog, 'id' | 'ingestedAt'>;

export const ACTIVITY_LOG_QUEUE_NAME = 'activity-logs';

let _activityLogQueue: Queue<ActivityLogJobData> | null = null;

export function isActivityLogQueueAvailable(): boolean {
  return !!REDIS_URL;
}

export function getActivityLogQueue(): Queue<ActivityLogJobData> {
  if (!_activityLogQueue) {
    if (!REDIS_URL) {
      throw new Error('Redis is required for async activity logging. Set REDIS_URL environment variable.');
    }
    _activityLogQueue = new Queue<ActivityLogJobData>(
      ACTIVITY_LOG_QUEUE_NAME,
      {
        connection: { url: REDIS_URL },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }
    );
  }
  return _activityLogQueue;
}

export async function enqueueActivityLog(
  logData: ActivityLogJobData
): Promise<Job<ActivityLogJobData> | null> {
  if (!isActivityLogQueueAvailable()) {
    return null;
  }
  
  try {
    const queue = getActivityLogQueue();
    const job = await queue.add('log', logData, {
      priority: 10,
    });
    return job;
  } catch (error) {
    console.error('[ActivityLogQueue] Failed to enqueue log:', error);
    return null;
  }
}

export async function enqueueActivityLogBatch(
  logs: ActivityLogJobData[]
): Promise<number> {
  if (!isActivityLogQueueAvailable() || logs.length === 0) {
    return 0;
  }
  
  try {
    const queue = getActivityLogQueue();
    const jobs = logs.map(log => ({
      name: 'log',
      data: log,
      opts: { priority: 10 }
    }));
    await queue.addBulk(jobs);
    return logs.length;
  } catch (error) {
    console.error('[ActivityLogQueue] Failed to enqueue batch:', error);
    return 0;
  }
}
