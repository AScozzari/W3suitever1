/**
 * 📸 WMS SNAPSHOT SERVICE
 * 
 * Servizio per la creazione automatica di snapshot inventario.
 * Esegue alle 12:00 e 23:00 (Europe/Rome) per catturare lo stato
 * del magazzino in punti chiave della giornata.
 * 
 * Features:
 * - Scheduler automatico con node-cron
 * - Crea snapshot per tutti i tenant attivi
 * - Cattura quantità, riservati e valore economico
 * - API per query storica e confronto delta
 */

import cron from 'node-cron';
import { db } from '../core/db';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { 
  wmsInventoryBalances,
  wmsInventorySnapshots,
  tenants,
  productVersions,
  products
} from '../db/schema/w3suite';
import { logger } from '../core/logger';

const STAGING_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const WMS_ALL_TENANTS = process.env.WMS_SNAPSHOT_ALL_TENANTS === 'true';

export interface SnapshotResult {
  tenantId: string;
  tenantName: string;
  snapshotsCreated: number;
  snapshotAt: Date;
  durationMs: number;
}

export interface SnapshotQueryParams {
  tenantId: string;
  storeId?: string;
  productId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface SnapshotDeltaParams {
  tenantId: string;
  storeId?: string;
  productId?: string;
  dateFrom: Date;
  dateTo: Date;
}

export interface SnapshotDeltaResult {
  productId: string;
  productName?: string;
  storeId: string;
  storeName?: string;
  startQuantity: number;
  endQuantity: number;
  quantityDelta: number;
  startValue: string;
  endValue: string;
  valueDelta: string;
  percentChange: number;
}

class WmsSnapshotService {
  private isInitialized = false;
  private scheduledJobs: cron.ScheduledTask[] = [];

  /**
   * 🚀 Inizializza lo scheduler per snapshot automatici
   * Esegue alle 12:00 e 23:00 ora italiana (Europe/Rome)
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.info('📸 [WMS-SNAPSHOT] Scheduler already initialized');
      return;
    }

    logger.info('📸 [WMS-SNAPSHOT] Initializing snapshot scheduler...');

    const job12 = cron.schedule('0 12 * * *', async () => {
      logger.info('📸 [WMS-SNAPSHOT] Running 12:00 snapshot job...');
      await this.createAllTenantsSnapshots('12:00');
    }, {
      timezone: 'Europe/Rome'
    });

    const job23 = cron.schedule('0 23 * * *', async () => {
      logger.info('📸 [WMS-SNAPSHOT] Running 23:00 snapshot job...');
      await this.createAllTenantsSnapshots('23:00');
    }, {
      timezone: 'Europe/Rome'
    });

    this.scheduledJobs.push(job12, job23);
    this.isInitialized = true;

    logger.info('📸 [WMS-SNAPSHOT] Scheduler initialized successfully', {
      schedule: ['12:00 Europe/Rome', '23:00 Europe/Rome']
    });
  }

  /**
   * 🛑 Ferma lo scheduler
   */
  shutdown(): void {
    logger.info('📸 [WMS-SNAPSHOT] Shutting down scheduler...');
    for (const job of this.scheduledJobs) {
      job.stop();
    }
    this.scheduledJobs = [];
    this.isInitialized = false;
  }

  /**
   * 🕐 Calcola il timestamp deterministico per lo snapshot (12:00 o 23:00 Europe/Rome)
   */
  private getScheduledSnapshotTime(timeLabel: string): Date {
    const now = new Date();
    const [hours] = timeLabel.split(':').map(Number);
    
    const romeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const dateStr = romeFormatter.format(now);
    
    const snapshotTime = new Date(`${dateStr}T${timeLabel.padStart(5, '0')}:00+01:00`);
    
    const isDST = now.toLocaleString('en-US', { timeZone: 'Europe/Rome', timeZoneName: 'short' }).includes('CEST');
    if (isDST) {
      snapshotTime.setHours(snapshotTime.getHours() - 1);
    }
    
    return snapshotTime;
  }

  /**
   * 📸 Crea snapshot per tenant attivi (STAGING only in dev, all in prod with WMS_SNAPSHOT_ALL_TENANTS=true)
   */
  async createAllTenantsSnapshots(timeLabel: string): Promise<SnapshotResult[]> {
    const results: SnapshotResult[] = [];
    const scheduledTime = this.getScheduledSnapshotTime(timeLabel);

    try {
      let activeTenants;
      
      if (WMS_ALL_TENANTS) {
        activeTenants = await db
          .select({ id: tenants.id, name: tenants.name })
          .from(tenants)
          .where(eq(tenants.status, 'active'));
      } else {
        activeTenants = await db
          .select({ id: tenants.id, name: tenants.name })
          .from(tenants)
          .where(and(
            eq(tenants.status, 'active'),
            eq(tenants.id, STAGING_TENANT_ID)
          ));
        
        logger.info('📸 [WMS-SNAPSHOT] Running in STAGING-ONLY mode (set WMS_SNAPSHOT_ALL_TENANTS=true for all tenants)');
      }

      logger.info('📸 [WMS-SNAPSHOT] Starting snapshot creation', {
        timeLabel,
        scheduledTime: scheduledTime.toISOString(),
        tenantsCount: activeTenants.length
      });

      for (const tenant of activeTenants) {
        try {
          const result = await this.createTenantSnapshot(tenant.id, tenant.name || 'Unknown', scheduledTime);
          results.push(result);
        } catch (err) {
          logger.error('📸 [WMS-SNAPSHOT] Failed to create snapshot for tenant', {
            tenantId: tenant.id,
            tenantName: tenant.name,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      const totalSnapshots = results.reduce((sum, r) => sum + r.snapshotsCreated, 0);
      logger.info('📸 [WMS-SNAPSHOT] Snapshot creation completed', {
        timeLabel,
        tenantsProcessed: results.length,
        totalSnapshots
      });

    } catch (err) {
      logger.error('📸 [WMS-SNAPSHOT] Failed to run snapshot job', {
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return results;
  }

  /**
   * 📸 Crea snapshot per un singolo tenant
   * @param scheduledTime - Timestamp deterministico (12:00 o 23:00 Europe/Rome)
   */
  async createTenantSnapshot(tenantId: string, tenantName: string, scheduledTime?: Date): Promise<SnapshotResult> {
    const startTime = Date.now();
    const snapshotAt = scheduledTime || new Date();

    const balances = await db
      .select({
        tenantId: wmsInventoryBalances.tenantId,
        storeId: wmsInventoryBalances.storeId,
        productId: wmsInventoryBalances.productId,
        quantityAvailable: wmsInventoryBalances.quantityAvailable,
        quantityReserved: wmsInventoryBalances.quantityReserved,
        totalValue: wmsInventoryBalances.totalValue
      })
      .from(wmsInventoryBalances)
      .where(eq(wmsInventoryBalances.tenantId, tenantId));

    if (balances.length === 0) {
      return {
        tenantId,
        tenantName,
        snapshotsCreated: 0,
        snapshotAt,
        durationMs: Date.now() - startTime
      };
    }

    const currentVersions = await db
      .select({
        productId: productVersions.productId,
        versionId: productVersions.id
      })
      .from(productVersions)
      .where(
        and(
          eq(productVersions.tenantId, tenantId),
          sql`${productVersions.validTo} IS NULL`
        )
      );

    const versionMap = new Map(currentVersions.map(v => [v.productId, v.versionId]));

    const snapshotRecords = balances.map(balance => ({
      tenantId: balance.tenantId,
      storeId: balance.storeId,
      productId: balance.productId,
      snapshotAt,
      quantityAtTime: balance.quantityAvailable,
      reservedAtTime: balance.quantityReserved,
      valueAtTime: balance.totalValue,
      productVersionId: versionMap.get(balance.productId) || null
    }));

    if (snapshotRecords.length > 0) {
      await db
        .insert(wmsInventorySnapshots)
        .values(snapshotRecords)
        .onConflictDoUpdate({
          target: [
            wmsInventorySnapshots.tenantId,
            wmsInventorySnapshots.storeId,
            wmsInventorySnapshots.productId,
            wmsInventorySnapshots.snapshotAt
          ],
          set: {
            quantityAtTime: sql`EXCLUDED.quantity_at_time`,
            reservedAtTime: sql`EXCLUDED.reserved_at_time`,
            valueAtTime: sql`EXCLUDED.value_at_time`,
            productVersionId: sql`EXCLUDED.product_version_id`
          }
        });
    }

    logger.info('📸 [WMS-SNAPSHOT] Tenant snapshot created', {
      tenantId,
      tenantName,
      snapshotsCreated: snapshotRecords.length,
      durationMs: Date.now() - startTime
    });

    return {
      tenantId,
      tenantName,
      snapshotsCreated: snapshotRecords.length,
      snapshotAt,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * 🔍 Query snapshot storici
   */
  async querySnapshots(params: SnapshotQueryParams): Promise<{
    snapshots: any[];
    total: number;
    hasMore: boolean;
  }> {
    const { tenantId, storeId, productId, dateFrom, dateTo, limit = 100, offset = 0 } = params;

    const conditions = [eq(wmsInventorySnapshots.tenantId, tenantId)];

    if (storeId) {
      conditions.push(eq(wmsInventorySnapshots.storeId, storeId));
    }
    if (productId) {
      conditions.push(eq(wmsInventorySnapshots.productId, productId));
    }
    if (dateFrom) {
      conditions.push(gte(wmsInventorySnapshots.snapshotAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(wmsInventorySnapshots.snapshotAt, dateTo));
    }

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(wmsInventorySnapshots)
      .where(and(...conditions));

    const snapshots = await db
      .select({
        id: wmsInventorySnapshots.id,
        tenantId: wmsInventorySnapshots.tenantId,
        storeId: wmsInventorySnapshots.storeId,
        productId: wmsInventorySnapshots.productId,
        snapshotAt: wmsInventorySnapshots.snapshotAt,
        quantityAtTime: wmsInventorySnapshots.quantityAtTime,
        reservedAtTime: wmsInventorySnapshots.reservedAtTime,
        valueAtTime: wmsInventorySnapshots.valueAtTime,
        productVersionId: wmsInventorySnapshots.productVersionId,
        createdAt: wmsInventorySnapshots.createdAt,
        productName: products.name,
        productSku: products.sku
      })
      .from(wmsInventorySnapshots)
      .leftJoin(products, and(
        eq(products.tenantId, wmsInventorySnapshots.tenantId),
        eq(products.id, wmsInventorySnapshots.productId)
      ))
      .where(and(...conditions))
      .orderBy(desc(wmsInventorySnapshots.snapshotAt))
      .limit(limit)
      .offset(offset);

    return {
      snapshots,
      total: countResult?.count || 0,
      hasMore: offset + snapshots.length < (countResult?.count || 0)
    };
  }

  /**
   * 📊 Calcola delta tra due periodi
   */
  async calculateDelta(params: SnapshotDeltaParams): Promise<SnapshotDeltaResult[]> {
    const { tenantId, storeId, productId, dateFrom, dateTo } = params;

    const baseConditions = [eq(wmsInventorySnapshots.tenantId, tenantId)];
    if (storeId) baseConditions.push(eq(wmsInventorySnapshots.storeId, storeId));
    if (productId) baseConditions.push(eq(wmsInventorySnapshots.productId, productId));

    const startSnapshots = await db
      .select({
        productId: wmsInventorySnapshots.productId,
        storeId: wmsInventorySnapshots.storeId,
        quantityAtTime: wmsInventorySnapshots.quantityAtTime,
        valueAtTime: wmsInventorySnapshots.valueAtTime
      })
      .from(wmsInventorySnapshots)
      .where(and(
        ...baseConditions,
        sql`DATE(${wmsInventorySnapshots.snapshotAt}) = DATE(${dateFrom})`
      ))
      .orderBy(wmsInventorySnapshots.snapshotAt)
      .limit(1000);

    const endSnapshots = await db
      .select({
        productId: wmsInventorySnapshots.productId,
        storeId: wmsInventorySnapshots.storeId,
        quantityAtTime: wmsInventorySnapshots.quantityAtTime,
        valueAtTime: wmsInventorySnapshots.valueAtTime
      })
      .from(wmsInventorySnapshots)
      .where(and(
        ...baseConditions,
        sql`DATE(${wmsInventorySnapshots.snapshotAt}) = DATE(${dateTo})`
      ))
      .orderBy(desc(wmsInventorySnapshots.snapshotAt))
      .limit(1000);

    const startMap = new Map<string, { quantity: number; value: string }>();
    for (const s of startSnapshots) {
      const key = `${s.productId}|${s.storeId}`;
      if (!startMap.has(key)) {
        startMap.set(key, { quantity: s.quantityAtTime, value: s.valueAtTime });
      }
    }

    const endMap = new Map<string, { quantity: number; value: string }>();
    for (const s of endSnapshots) {
      const key = `${s.productId}|${s.storeId}`;
      if (!endMap.has(key)) {
        endMap.set(key, { quantity: s.quantityAtTime, value: s.valueAtTime });
      }
    }

    const allKeys = new Set([...startMap.keys(), ...endMap.keys()]);
    const results: SnapshotDeltaResult[] = [];

    for (const key of allKeys) {
      const [prodId, strId] = key.split('|');
      const start = startMap.get(key) || { quantity: 0, value: '0' };
      const end = endMap.get(key) || { quantity: 0, value: '0' };

      const startQty = start.quantity;
      const endQty = end.quantity;
      const startVal = parseFloat(start.value);
      const endVal = parseFloat(end.value);

      const qtyDelta = endQty - startQty;
      const valDelta = endVal - startVal;
      const pctChange = startQty > 0 ? ((endQty - startQty) / startQty) * 100 : (endQty > 0 ? 100 : 0);

      results.push({
        productId: prodId,
        storeId: strId,
        startQuantity: startQty,
        endQuantity: endQty,
        quantityDelta: qtyDelta,
        startValue: startVal.toFixed(2),
        endValue: endVal.toFixed(2),
        valueDelta: valDelta.toFixed(2),
        percentChange: Math.round(pctChange * 100) / 100
      });
    }

    results.sort((a, b) => Math.abs(b.quantityDelta) - Math.abs(a.quantityDelta));

    return results;
  }

  /**
   * 🔧 Trigger manuale per test (non usa scheduler)
   */
  async triggerManualSnapshot(tenantId: string): Promise<SnapshotResult> {
    const [tenant] = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    logger.info('📸 [WMS-SNAPSHOT] Manual snapshot triggered', { tenantId });
    return this.createTenantSnapshot(tenant.id, tenant.name || 'Unknown');
  }
}

export const wmsSnapshotService = new WmsSnapshotService();
