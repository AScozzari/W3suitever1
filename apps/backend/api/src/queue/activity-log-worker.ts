import { Worker, Job } from 'bullmq';
import { ACTIVITY_LOG_QUEUE_NAME, ActivityLogJobData } from './activity-log-queue';
import { db } from '../core/db';
import { activityLogs } from '../db/schema/w3suite';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

let _activityLogWorker: Worker<ActivityLogJobData> | null = null;

async function processActivityLog(job: Job<ActivityLogJobData>): Promise<void> {
  const logData = job.data;
  
  try {
    await db.insert(activityLogs).values({
      ...logData,
      executedAt: logData.executedAt instanceof Date ? logData.executedAt : 
                  typeof logData.executedAt === 'string' ? new Date(logData.executedAt) : new Date(),
    });
  } catch (error) {
    console.error(`[ActivityLogWorker] Failed to persist log:`, error);
    throw error;
  }
}

export function startActivityLogWorker(): Worker<ActivityLogJobData> | null {
  if (!REDIS_URL) {
    console.log('[ActivityLogWorker] Redis not available, worker not started');
    return null;
  }
  
  if (_activityLogWorker) {
    return _activityLogWorker;
  }
  
  _activityLogWorker = new Worker<ActivityLogJobData>(
    ACTIVITY_LOG_QUEUE_NAME,
    processActivityLog,
    {
      connection: { url: REDIS_URL },
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 1000,
      },
    }
  );
  
  _activityLogWorker.on('completed', (job) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ActivityLogWorker] Log persisted: ${job.id}`);
    }
  });
  
  _activityLogWorker.on('failed', (job, err) => {
    console.error(`[ActivityLogWorker] Job ${job?.id} failed:`, err.message);
  });
  
  console.log('[ActivityLogWorker] Started with concurrency 10');
  return _activityLogWorker;
}

export function getActivityLogWorker(): Worker<ActivityLogJobData> | null {
  return _activityLogWorker;
}

export async function stopActivityLogWorker(): Promise<void> {
  if (_activityLogWorker) {
    await _activityLogWorker.close();
    _activityLogWorker = null;
    console.log('[ActivityLogWorker] Stopped');
  }
}
