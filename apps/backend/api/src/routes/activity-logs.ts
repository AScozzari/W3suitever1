import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { activityLogs } from '../db/schema/w3suite.js';
import { eq, and, gte, lte, desc, sql, count, ilike, or } from 'drizzle-orm';

const router = Router();

type ActivityService = 'SYSTEM' | 'AUTH' | 'WMS' | 'CRM' | 'HR' | 'POS' | 'ANALYTICS' | 'VOIP' | 'WORKFLOW' | 'SETTINGS' | 'AI';
type ActivityLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
    
    const {
      service,
      level,
      action,
      actorId,
      entityType,
      entityId,
      status,
      search,
      from,
      to,
      page = '1',
      limit = '50',
      sortBy = 'executedAt',
      sortDir = 'desc'
    } = req.query as Record<string, string | undefined>;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    
    const conditions = [eq(activityLogs.tenantId, tenantId)];
    
    if (service) {
      conditions.push(eq(activityLogs.service, service as ActivityService));
    }
    if (level) {
      conditions.push(eq(activityLogs.level, level as ActivityLevel));
    }
    if (action) {
      conditions.push(ilike(activityLogs.action, `%${action}%`));
    }
    if (actorId) {
      conditions.push(eq(activityLogs.actorId, actorId));
    }
    if (entityType) {
      conditions.push(eq(activityLogs.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(activityLogs.entityId, entityId));
    }
    if (status) {
      conditions.push(eq(activityLogs.status, status));
    }
    if (from) {
      conditions.push(gte(activityLogs.executedAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(activityLogs.executedAt, new Date(to)));
    }
    if (search) {
      conditions.push(or(
        ilike(activityLogs.action, `%${search}%`),
        ilike(activityLogs.message, `%${search}%`),
        ilike(activityLogs.actorEmail, `%${search}%`),
        ilike(activityLogs.entityName, `%${search}%`)
      )!);
    }
    
    const whereClause = and(...conditions);
    
    const [logs, totalResult] = await Promise.all([
      db.select()
        .from(activityLogs)
        .where(whereClause)
        .orderBy(sortDir === 'asc' ? activityLogs.executedAt : desc(activityLogs.executedAt))
        .limit(limitNum)
        .offset(offset),
      db.select({ count: count() })
        .from(activityLogs)
        .where(whereClause)
    ]);
    
    const total = totalResult[0]?.count || 0;
    
    res.json({
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('[ActivityLogs] List error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
    const { from, to, service } = req.query as Record<string, string | undefined>;
    
    const conditions = [eq(activityLogs.tenantId, tenantId)];
    
    if (from) conditions.push(gte(activityLogs.executedAt, new Date(from)));
    if (to) conditions.push(lte(activityLogs.executedAt, new Date(to)));
    if (service) conditions.push(eq(activityLogs.service, service as ActivityService));
    
    const whereClause = and(...conditions);
    
    const [byService, byLevel, byStatus, byHour, topActors, recentActivity, totalCount] = await Promise.all([
      db.select({
        service: activityLogs.service,
        count: count()
      })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.service),
      
      db.select({
        level: activityLogs.level,
        count: count()
      })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.level),
      
      db.select({
        status: activityLogs.status,
        count: count()
      })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.status),
      
      db.select({
        hour: sql<number>`EXTRACT(HOUR FROM ${activityLogs.executedAt})`.as('hour'),
        count: count()
      })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(sql`EXTRACT(HOUR FROM ${activityLogs.executedAt})`),
      
      db.select({
        actorEmail: activityLogs.actorEmail,
        count: count()
      })
        .from(activityLogs)
        .where(and(...conditions, sql`${activityLogs.actorEmail} IS NOT NULL`))
        .groupBy(activityLogs.actorEmail)
        .orderBy(desc(count()))
        .limit(10),
      
      db.select({
        date: sql<string>`DATE(${activityLogs.executedAt})`.as('date'),
        count: count()
      })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(sql`DATE(${activityLogs.executedAt})`)
        .orderBy(desc(sql`DATE(${activityLogs.executedAt})`))
        .limit(30),
      
      db.select({ count: count() })
        .from(activityLogs)
        .where(whereClause)
    ]);
    
    res.json({
      total: totalCount[0]?.count || 0,
      byService,
      byLevel,
      byStatus,
      byHour,
      topActors,
      recentActivity
    });
  } catch (error) {
    console.error('[ActivityLogs] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log stats' });
  }
});

router.get('/export', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
    const { format = 'json', from, to, service, limit: maxLimit = '1000' } = req.query as Record<string, string>;
    
    const conditions = [eq(activityLogs.tenantId, tenantId)];
    if (from) conditions.push(gte(activityLogs.executedAt, new Date(from)));
    if (to) conditions.push(lte(activityLogs.executedAt, new Date(to)));
    if (service) conditions.push(eq(activityLogs.service, service as ActivityService));
    
    const logs = await db.select()
      .from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.executedAt))
      .limit(Math.min(10000, parseInt(maxLimit)));
    
    if (format === 'csv') {
      const headers = ['id', 'executedAt', 'service', 'module', 'action', 'level', 'status', 'actorEmail', 'entityType', 'entityId', 'message', 'ipAddress'];
      const csvRows = [headers.join(',')];
      
      for (const log of logs) {
        const row = headers.map(h => {
          const value = log[h as keyof typeof log];
          if (value === null || value === undefined) return '';
          const str = String(value);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        });
        csvRows.push(row.join(','));
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=activity_logs_${new Date().toISOString().split('T')[0]}.json`);
      res.json(logs);
    }
  } catch (error) {
    console.error('[ActivityLogs] Export error:', error);
    res.status(500).json({ error: 'Failed to export activity logs' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
    const { id } = req.params;
    
    const [log] = await db.select()
      .from(activityLogs)
      .where(and(
        eq(activityLogs.id, id),
        eq(activityLogs.tenantId, tenantId)
      ))
      .limit(1);
    
    if (!log) {
      return res.status(404).json({ error: 'Activity log not found' });
    }
    
    res.json(log);
  } catch (error) {
    console.error('[ActivityLogs] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

export default router;
