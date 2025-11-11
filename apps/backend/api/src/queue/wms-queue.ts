import { Queue, Job } from 'bullmq';
import { createHash } from 'crypto';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

export interface BulkSerialImportJobData {
  tenantId: string;
  userId: string;
  productId: string;
  serials: Array<{
    serialValue: string;
    batchId?: string;
    storeId: string;
    locationId?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface GenerateReportJobData {
  tenantId: string;
  userId: string;
  reportType: 'stock-levels' | 'expiration-dashboard' | 'batch-kpis' | 'movements';
  format: 'pdf' | 'csv' | 'xlsx';
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface BatchStockUpdateJobData {
  tenantId: string;
  userId: string;
  updates: Array<{
    productItemId: string;
    storeId: string;
    newQuantity?: number;
    newStatus?: string;
    locationId?: string;
  }>;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ExpirationAlertJobData {
  tenantId: string;
  daysThreshold: number; // Alert for items expiring within X days
  channels: Array<'email' | 'notification' | 'webhook'>;
  metadata?: Record<string, any>;
}

export type WMSJobData =
  | { type: 'bulk-serial-import'; data: BulkSerialImportJobData }
  | { type: 'generate-report'; data: GenerateReportJobData }
  | { type: 'batch-stock-update'; data: BatchStockUpdateJobData }
  | { type: 'expiration-alert'; data: ExpirationAlertJobData };

export interface WMSJobResult {
  success: boolean;
  jobType: string;
  result?: {
    processedCount?: number;
    failedCount?: number;
    reportUrl?: string;
    errors?: Array<{ index: number; error: string }>;
  };
  error?: {
    message: string;
    code?: string;
    recoverable: boolean;
  };
  durationMs: number;
}

export const WMS_QUEUE_NAME = 'wms-operations';

let _wmsQueue: Queue<WMSJobData> | null = null;

export function isRedisAvailable(): boolean {
  return !!REDIS_URL;
}

export function getWMSQueue(): Queue<WMSJobData> {
  if (!_wmsQueue) {
    if (!REDIS_URL) {
      throw new Error('Redis is required for async WMS jobs. Set REDIS_URL environment variable.');
    }
    _wmsQueue = new Queue<WMSJobData>(
      WMS_QUEUE_NAME,
      {
        connection: { url: REDIS_URL },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s delay
          },
          removeOnComplete: 50, // Keep last 50 completed jobs
          removeOnFail: 200, // Keep last 200 failed jobs for debugging
        },
      }
    );
  }
  return _wmsQueue;
}

export function generateWMSJobId(
  tenantId: string,
  jobType: string,
  uniqueKey: string
): string {
  const data = `${tenantId}:${jobType}:${uniqueKey}:${Date.now()}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export async function enqueueBulkSerialImport(
  data: BulkSerialImportJobData,
  priority: number = 5
): Promise<Job<WMSJobData>> {
  const jobId = generateWMSJobId(data.tenantId, 'bulk-serial-import', data.productId);
  const queue = getWMSQueue();
  
  const job = await queue.add(
    'bulk-serial-import',
    { type: 'bulk-serial-import', data },
    {
      jobId,
      priority,
    }
  );

  return job;
}

export async function enqueueGenerateReport(
  data: GenerateReportJobData,
  priority: number = 3
): Promise<Job<WMSJobData>> {
  const jobId = generateWMSJobId(data.tenantId, 'generate-report', `${data.reportType}-${Date.now()}`);
  const queue = getWMSQueue();
  
  const job = await queue.add(
    'generate-report',
    { type: 'generate-report', data },
    {
      jobId,
      priority,
    }
  );

  return job;
}

export async function enqueueBatchStockUpdate(
  data: BatchStockUpdateJobData,
  priority: number = 4
): Promise<Job<WMSJobData>> {
  const jobId = generateWMSJobId(data.tenantId, 'batch-stock-update', `${data.updates.length}-items`);
  const queue = getWMSQueue();
  
  const job = await queue.add(
    'batch-stock-update',
    { type: 'batch-stock-update', data },
    {
      jobId,
      priority,
    }
  );

  return job;
}

export async function enqueueExpirationAlert(
  data: ExpirationAlertJobData,
  priority: number = 2
): Promise<Job<WMSJobData>> {
  const jobId = generateWMSJobId(data.tenantId, 'expiration-alert', `threshold-${data.daysThreshold}`);
  const queue = getWMSQueue();
  
  const job = await queue.add(
    'expiration-alert',
    { type: 'expiration-alert', data },
    {
      jobId,
      priority,
    }
  );

  return job;
}

export async function getWMSQueueMetrics() {
  const queue = getWMSQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    queueName: WMS_QUEUE_NAME,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function cleanWMSQueue(graceMs: number = 86400000) {
  const queue = getWMSQueue();
  await queue.clean(graceMs, 1000, 'completed');
  await queue.clean(graceMs, 1000, 'failed');
}
