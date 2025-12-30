import { enqueueActivityLog, isActivityLogQueueAvailable, ActivityLogJobData } from '../queue/activity-log-queue.js';
import { getLogContext } from '../core/logger.js';
import { db } from '../db/index.js';
import { activityLogs } from '../db/schema/w3suite.js';

export type ActivityService = 'SYSTEM' | 'AUTH' | 'WMS' | 'CRM' | 'HR' | 'POS' | 'ANALYTICS' | 'VOIP' | 'WORKFLOW' | 'SETTINGS' | 'AI';
export type ActivityLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface ActivityLogParams {
  service: ActivityService;
  module?: string;
  action: string;
  actionCategory?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  level?: ActivityLevel;
  status?: 'success' | 'failure' | 'pending';
  message?: string;
  payloadBefore?: any;
  payloadAfter?: any;
  diff?: Record<string, any>;
  metadata?: Record<string, any>;
  latencyMs?: number;
  source?: string;
  platform?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

function buildLogData(params: ActivityLogParams): ActivityLogJobData {
  const context = getLogContext();
  
  return {
    tenantId: params.tenantId || context?.tenantId || '00000000-0000-0000-0000-000000000001',
    service: params.service,
    module: params.module,
    action: params.action,
    actionCategory: params.actionCategory,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    actorId: params.actorId || context?.userId,
    actorEmail: params.actorEmail || context?.userEmail,
    actorRole: params.actorRole,
    actorType: 'user',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    sessionId: params.sessionId,
    correlationId: context?.correlationId,
    level: params.level || 'INFO',
    status: params.status || 'success',
    message: params.message,
    payloadBefore: params.payloadBefore,
    payloadAfter: params.payloadAfter,
    diff: params.diff,
    metadata: params.metadata,
    latencyMs: params.latencyMs,
    source: params.source || 'api',
    platform: params.platform || 'web',
    executedAt: new Date(),
  };
}

async function persistSync(logData: ActivityLogJobData): Promise<void> {
  try {
    await db.insert(activityLogs).values(logData);
  } catch (error) {
    console.error('[ActivityLogger] Sync persist failed:', error);
  }
}

export const activityLogger = {
  async log(params: ActivityLogParams): Promise<void> {
    const logData = buildLogData(params);
    
    if (isActivityLogQueueAvailable()) {
      await enqueueActivityLog(logData);
    } else {
      await persistSync(logData);
    }
  },

  async wms(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'WMS', action, ...params });
  },

  async crm(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'CRM', action, ...params });
  },

  async hr(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'HR', action, ...params });
  },

  async pos(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'POS', action, ...params });
  },

  async voip(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'VOIP', action, ...params });
  },

  async auth(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'AUTH', action, ...params });
  },

  async system(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'SYSTEM', action, ...params });
  },

  async workflow(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'WORKFLOW', action, ...params });
  },

  async settings(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'SETTINGS', action, ...params });
  },

  async ai(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'AI', action, ...params });
  },

  async analytics(action: string, params: Omit<ActivityLogParams, 'service' | 'action'>): Promise<void> {
    await this.log({ service: 'ANALYTICS', action, ...params });
  },

  async audit(service: ActivityService, action: string, params: {
    entityType: string;
    entityId: string;
    entityName?: string;
    before?: any;
    after?: any;
    metadata?: Record<string, any>;
    tenantId?: string;
  }): Promise<void> {
    const diff = params.before && params.after ? computeDiff(params.before, params.after) : undefined;
    
    await this.log({
      service,
      action,
      actionCategory: 'audit',
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      payloadBefore: params.before,
      payloadAfter: params.after,
      diff,
      metadata: params.metadata,
      tenantId: params.tenantId,
    });
  },

  async error(service: ActivityService, action: string, error: Error, params?: Partial<ActivityLogParams>): Promise<void> {
    await this.log({
      service,
      action,
      level: 'ERROR',
      status: 'failure',
      message: error.message,
      metadata: {
        errorName: error.name,
        stack: error.stack,
        ...params?.metadata,
      },
      ...params,
    });
  },
};

function computeDiff(before: any, after: any): Record<string, { old: any; new: any }> | undefined {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    return undefined;
  }
  
  const diff: Record<string, { old: any; new: any }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    const oldVal = before[key];
    const newVal = after[key];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  
  return Object.keys(diff).length > 0 ? diff : undefined;
}
