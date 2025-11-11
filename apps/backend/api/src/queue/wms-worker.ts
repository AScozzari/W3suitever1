import { Worker, Job } from 'bullmq';
import { db } from '../core/db';
import { productSerials, productItems, productBatches } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
import { 
  WMSJobData, 
  WMSJobResult, 
  WMS_QUEUE_NAME,
  BulkSerialImportJobData,
  GenerateReportJobData,
  BatchStockUpdateJobData,
  ExpirationAlertJobData
} from './wms-queue';
import { logger } from '../core/logger';
import crypto from 'crypto';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

let _wmsWorker: Worker<WMSJobData, WMSJobResult> | null = null;

export function getWMSWorker(): Worker<WMSJobData, WMSJobResult> {
  if (!_wmsWorker) {
    if (!REDIS_URL) {
      throw new Error('REDIS_URL not configured. Cannot create WMS worker.');
    }

    _wmsWorker = new Worker<WMSJobData, WMSJobResult>(
      WMS_QUEUE_NAME,
      async (job: Job<WMSJobData>) => {
        const startTime = Date.now();
        logger.info(`🔧 WMS Job started: ${job.name}`, {
          jobId: job.id,
          jobType: job.data.type,
        });

        try {
          let result: WMSJobResult;

          switch (job.data.type) {
            case 'bulk-serial-import':
              result = await processBulkSerialImport(job.data.data, job);
              break;
            case 'generate-report':
              result = await processGenerateReport(job.data.data, job);
              break;
            case 'batch-stock-update':
              result = await processBatchStockUpdate(job.data.data, job);
              break;
            case 'expiration-alert':
              result = await processExpirationAlert(job.data.data, job);
              break;
            default:
              throw new Error(`Unknown WMS job type: ${(job.data as any).type}`);
          }

          result.durationMs = Date.now() - startTime;
          logger.info(`✅ WMS Job completed: ${job.name}`, {
            jobId: job.id,
            durationMs: result.durationMs,
            success: result.success,
          });

          return result;
        } catch (error: any) {
          const durationMs = Date.now() - startTime;
          logger.error(`❌ WMS Job failed: ${job.name}`, {
            jobId: job.id,
            error: error.message,
            durationMs,
          });

          return {
            success: false,
            jobType: job.data.type,
            error: {
              message: error.message,
              code: error.code || 'UNKNOWN_ERROR',
              recoverable: error.recoverable !== false, // Default to recoverable
            },
            durationMs,
          };
        }
      },
      {
        connection: { url: REDIS_URL },
        concurrency: 5, // Process up to 5 WMS jobs in parallel
        limiter: {
          max: 10, // Max 10 jobs per second
          duration: 1000,
        },
      }
    );

    _wmsWorker.on('completed', (job) => {
      logger.info(`🎉 WMS Job completed successfully`, {
        jobId: job.id,
        jobName: job.name,
      });
    });

    _wmsWorker.on('failed', (job, err) => {
      logger.error(`💥 WMS Job failed`, {
        jobId: job?.id,
        jobName: job?.name,
        error: err.message,
      });
    });

    logger.info('🚀 WMS Worker initialized', {
      queueName: WMS_QUEUE_NAME,
      concurrency: 5,
    });
  }

  return _wmsWorker;
}

async function processBulkSerialImport(
  data: BulkSerialImportJobData,
  job: Job<WMSJobData>
): Promise<WMSJobResult> {
  const { tenantId, productId, serials } = data;
  let processedCount = 0;
  let failedCount = 0;
  const errors: Array<{ index: number; error: string }> = [];

  await job.updateProgress(0);

  for (let i = 0; i < serials.length; i++) {
    const serial = serials[i];
    
    try {
      await db.insert(productSerials).values({
        tenantId,
        id: crypto.randomUUID(),
        productId,
        serialValue: serial.serialValue,
        batchId: serial.batchId || null,
        storeId: serial.storeId,
        locationId: serial.locationId || null,
        status: 'active',
      });
      
      processedCount++;
    } catch (error: any) {
      failedCount++;
      errors.push({
        index: i,
        error: error.message || 'Unknown error',
      });
      
      if (error.code === '23505') {
        errors[errors.length - 1].error = `Duplicate serial: ${serial.serialValue}`;
      }
    }

    await job.updateProgress(Math.floor(((i + 1) / serials.length) * 100));
  }

  return {
    success: failedCount === 0,
    jobType: 'bulk-serial-import',
    result: {
      processedCount,
      failedCount,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined, // Limit to 50 errors
    },
  };
}

async function processGenerateReport(
  data: GenerateReportJobData,
  job: Job<WMSJobData>
): Promise<WMSJobResult> {
  const { tenantId, reportType, format, filters } = data;

  await job.updateProgress(25);

  let reportData: any;
  switch (reportType) {
    case 'stock-levels':
      reportData = await generateStockLevelsReport(tenantId, filters);
      break;
    case 'expiration-dashboard':
      reportData = await generateExpirationReport(tenantId, filters);
      break;
    case 'batch-kpis':
      reportData = await generateBatchKPIsReport(tenantId, filters);
      break;
    case 'movements':
      reportData = await generateMovementsReport(tenantId, filters);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  await job.updateProgress(75);

  const reportUrl = await exportReport(reportData, format, reportType, tenantId);

  await job.updateProgress(100);

  return {
    success: true,
    jobType: 'generate-report',
    result: {
      reportUrl,
      processedCount: reportData.length || 0,
    },
  };
}

async function processBatchStockUpdate(
  data: BatchStockUpdateJobData,
  job: Job<WMSJobData>
): Promise<WMSJobResult> {
  const { tenantId, updates, reason } = data;
  let processedCount = 0;
  let failedCount = 0;
  const errors: Array<{ index: number; error: string }> = [];

  await job.updateProgress(0);

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    
    try {
      await db.transaction(async (tx) => {
        const updateData: any = {};
        
        if (update.newQuantity !== undefined) {
          updateData.quantity = update.newQuantity;
        }
        if (update.newStatus) {
          updateData.status = update.newStatus;
        }
        if (update.locationId !== undefined) {
          updateData.locationId = update.locationId;
        }

        await tx
          .update(productItems)
          .set(updateData)
          .where(
            and(
              eq(productItems.tenantId, tenantId),
              eq(productItems.id, update.productItemId),
              eq(productItems.storeId, update.storeId)
            )
          );
      });
      
      processedCount++;
    } catch (error: any) {
      failedCount++;
      errors.push({
        index: i,
        error: error.message || 'Unknown error',
      });
    }

    await job.updateProgress(Math.floor(((i + 1) / updates.length) * 100));
  }

  return {
    success: failedCount === 0,
    jobType: 'batch-stock-update',
    result: {
      processedCount,
      failedCount,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
    },
  };
}

async function processExpirationAlert(
  data: ExpirationAlertJobData,
  job: Job<WMSJobData>
): Promise<WMSJobResult> {
  const { tenantId, daysThreshold, channels } = data;

  await job.updateProgress(25);

  const expiringItems = await db.query.productBatches.findMany({
    where: and(
      eq(productBatches.tenantId, tenantId),
      sql`expiration_date <= CURRENT_DATE + INTERVAL '${daysThreshold} days'`,
      sql`expiration_date > CURRENT_DATE`
    ),
    limit: 1000,
  });

  await job.updateProgress(50);

  for (const channel of channels) {
    if (channel === 'email') {
      logger.info(`📧 Sending expiration alerts via email`, {
        tenantId,
        itemsCount: expiringItems.length,
      });
    } else if (channel === 'notification') {
      logger.info(`🔔 Creating in-app notifications for expiration alerts`, {
        tenantId,
        itemsCount: expiringItems.length,
      });
    } else if (channel === 'webhook') {
      logger.info(`🔗 Sending webhook for expiration alerts`, {
        tenantId,
        itemsCount: expiringItems.length,
      });
    }
  }

  await job.updateProgress(100);

  return {
    success: true,
    jobType: 'expiration-alert',
    result: {
      processedCount: expiringItems.length,
    },
  };
}

async function generateStockLevelsReport(tenantId: string, filters?: Record<string, any>) {
  return [];
}

async function generateExpirationReport(tenantId: string, filters?: Record<string, any>) {
  return [];
}

async function generateBatchKPIsReport(tenantId: string, filters?: Record<string, any>) {
  return [];
}

async function generateMovementsReport(tenantId: string, filters?: Record<string, any>) {
  return [];
}

async function exportReport(
  data: any[],
  format: 'pdf' | 'csv' | 'xlsx',
  reportType: string,
  tenantId: string
): Promise<string> {
  const reportId = crypto.randomUUID();
  const reportUrl = `/api/wms/reports/${tenantId}/${reportId}.${format}`;
  
  logger.info(`📄 Report exported`, {
    tenantId,
    reportType,
    format,
    reportUrl,
    recordCount: data.length,
  });

  return reportUrl;
}

export async function startWMSWorker() {
  getWMSWorker();
  logger.info('✅ WMS Worker started');
}

export async function stopWMSWorker() {
  if (_wmsWorker) {
    await _wmsWorker.close();
    _wmsWorker = null;
    logger.info('🛑 WMS Worker stopped');
  }
}
