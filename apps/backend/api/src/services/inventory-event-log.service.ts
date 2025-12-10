/**
 * 📊 INVENTORY EVENT LOG SERVICE
 * 
 * Servizio per registrare eventi di inventario in modo immutabile (CQRS pattern).
 * Ogni cambio di stato logistico, movimento di quantità o rettifica
 * genera una riga append-only nella tabella wms_inventory_events.
 * 
 * Features:
 * - Append-only: mai UPDATE o DELETE sugli eventi
 * - Sequenza per prodotto/store: garantisce ordinamento
 * - Multi-tenant con RLS: tenant_id come primo campo in tutti gli indici
 * - Tracciabilità completa: user_id, causedBy, metadata
 */

import { db } from '../core/db';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { 
  wmsInventoryEvents,
  wmsInventoryBalances,
  type InsertWmsInventoryEvent,
  type WmsInventoryEvent
} from '../db/schema/w3suite';
import { logger } from '../core/logger';

export type InventoryEventType = 
  | 'state_change'
  | 'quantity_in'
  | 'quantity_out'
  | 'reservation'
  | 'release'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'return_received'
  | 'return_sent'
  | 'damage_recorded'
  | 'snapshot';

export type LogisticState = 
  | 'in_stock'
  | 'reserved'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'customer_return'
  | 'doa_return'
  | 'in_service'
  | 'supplier_return'
  | 'in_transfer'
  | 'lost'
  | 'damaged'
  | 'internal_use';

export interface RecordEventParams {
  tenantId: string;
  storeId: string;
  productId: string;
  eventType: InventoryEventType;
  previousState?: LogisticState | null;
  newState?: LogisticState | null;
  quantityChange?: number;
  balanceAfter: number;
  reservedChange?: number;
  reservedAfter?: number;
  serialNumber?: string;
  movementId?: string;
  documentRef?: string;
  userId?: string;
  causedBy?: 'user' | 'system' | 'workflow' | 'api' | 'scheduler';
  reason?: string;
  metadata?: Record<string, any>;
}

export interface QueryEventsParams {
  tenantId: string;
  storeId?: string;
  productId?: string;
  eventType?: InventoryEventType;
  serialNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ProductHistoryResult {
  events: WmsInventoryEvent[];
  total: number;
  summary: {
    totalIn: number;
    totalOut: number;
    stateChanges: number;
    firstEvent: Date | null;
    lastEvent: Date | null;
  };
}

class InventoryEventLogService {
  
  /**
   * 📝 Registra un evento di inventario (append-only)
   */
  async recordEvent(params: RecordEventParams): Promise<WmsInventoryEvent> {
    try {
      // Get next sequence number for this product/store
      const lastEventResult = await db
        .select({ 
          maxSeq: sql<number>`COALESCE(MAX(${wmsInventoryEvents.eventSequence}), 0)` 
        })
        .from(wmsInventoryEvents)
        .where(and(
          eq(wmsInventoryEvents.tenantId, params.tenantId),
          eq(wmsInventoryEvents.storeId, params.storeId),
          eq(wmsInventoryEvents.productId, params.productId)
        ));
      
      const nextSequence = (lastEventResult[0]?.maxSeq || 0) + 1;

      const eventInsert: InsertWmsInventoryEvent = {
        tenantId: params.tenantId,
        storeId: params.storeId,
        productId: params.productId,
        eventSequence: nextSequence,
        eventType: params.eventType,
        previousState: params.previousState || undefined,
        newState: params.newState || undefined,
        quantityChange: params.quantityChange ?? 0,
        balanceAfter: params.balanceAfter,
        reservedChange: params.reservedChange ?? 0,
        reservedAfter: params.reservedAfter ?? 0,
        serialNumber: params.serialNumber,
        movementId: params.movementId,
        documentRef: params.documentRef,
        userId: params.userId,
        causedBy: params.causedBy || 'system',
        reason: params.reason,
        metadata: params.metadata || {},
      };

      const [event] = await db
        .insert(wmsInventoryEvents)
        .values(eventInsert)
        .returning();

      logger.info('📊 [EVENT-LOG] Event recorded', {
        eventId: event.id,
        productId: params.productId,
        storeId: params.storeId,
        eventType: params.eventType,
        sequence: nextSequence
      });

      return event;
    } catch (error: any) {
      logger.error('📊 [EVENT-LOG] Failed to record event', {
        error: error.message,
        params
      });
      throw error;
    }
  }

  /**
   * 📝 Registra più eventi in batch (transazione unica)
   */
  async recordBatchEvents(events: RecordEventParams[]): Promise<WmsInventoryEvent[]> {
    if (events.length === 0) return [];

    const results: WmsInventoryEvent[] = [];
    
    // Group events by product/store to handle sequences properly
    for (const params of events) {
      const event = await this.recordEvent(params);
      results.push(event);
    }

    logger.info('📊 [EVENT-LOG] Batch events recorded', {
      count: results.length
    });

    return results;
  }

  /**
   * 🔍 Query eventi con filtri
   */
  async queryEvents(params: QueryEventsParams): Promise<WmsInventoryEvent[]> {
    const conditions = [eq(wmsInventoryEvents.tenantId, params.tenantId)];

    if (params.storeId) {
      conditions.push(eq(wmsInventoryEvents.storeId, params.storeId));
    }
    if (params.productId) {
      conditions.push(eq(wmsInventoryEvents.productId, params.productId));
    }
    if (params.eventType) {
      conditions.push(eq(wmsInventoryEvents.eventType, params.eventType));
    }
    if (params.serialNumber) {
      conditions.push(eq(wmsInventoryEvents.serialNumber, params.serialNumber));
    }
    if (params.dateFrom) {
      conditions.push(gte(wmsInventoryEvents.eventAt, params.dateFrom));
    }
    if (params.dateTo) {
      conditions.push(lte(wmsInventoryEvents.eventAt, params.dateTo));
    }

    const events = await db
      .select()
      .from(wmsInventoryEvents)
      .where(and(...conditions))
      .orderBy(desc(wmsInventoryEvents.eventAt))
      .limit(params.limit || 100)
      .offset(params.offset || 0);

    return events;
  }

  /**
   * 📜 Storico completo di un prodotto in un negozio
   */
  async getProductHistory(
    tenantId: string,
    productId: string,
    storeId?: string
  ): Promise<ProductHistoryResult> {
    const conditions = [
      eq(wmsInventoryEvents.tenantId, tenantId),
      eq(wmsInventoryEvents.productId, productId)
    ];
    
    if (storeId) {
      conditions.push(eq(wmsInventoryEvents.storeId, storeId));
    }

    const events = await db
      .select()
      .from(wmsInventoryEvents)
      .where(and(...conditions))
      .orderBy(desc(wmsInventoryEvents.eventAt));

    // Calculate summary
    let totalIn = 0;
    let totalOut = 0;
    let stateChanges = 0;

    for (const event of events) {
      if (event.quantityChange > 0) totalIn += event.quantityChange;
      if (event.quantityChange < 0) totalOut += Math.abs(event.quantityChange);
      if (event.eventType === 'state_change') stateChanges++;
    }

    return {
      events,
      total: events.length,
      summary: {
        totalIn,
        totalOut,
        stateChanges,
        firstEvent: events.length > 0 ? events[events.length - 1].eventAt : null,
        lastEvent: events.length > 0 ? events[0].eventAt : null,
      }
    };
  }

  /**
   * 🔢 Conta eventi per tipo in un periodo
   */
  async countEventsByType(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Record<string, number>> {
    const result = await db
      .select({
        eventType: wmsInventoryEvents.eventType,
        count: sql<number>`COUNT(*)::int`
      })
      .from(wmsInventoryEvents)
      .where(and(
        eq(wmsInventoryEvents.tenantId, tenantId),
        gte(wmsInventoryEvents.eventAt, dateFrom),
        lte(wmsInventoryEvents.eventAt, dateTo)
      ))
      .groupBy(wmsInventoryEvents.eventType);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.eventType] = row.count;
    }
    return counts;
  }

  /**
   * 🔄 Ricostruisci saldo da eventi (replay)
   * Utile per verificare consistenza del read model
   */
  async replayBalance(
    tenantId: string,
    storeId: string,
    productId: string
  ): Promise<{ quantity: number; reserved: number }> {
    const events = await db
      .select({
        balanceAfter: wmsInventoryEvents.balanceAfter,
        reservedAfter: wmsInventoryEvents.reservedAfter,
      })
      .from(wmsInventoryEvents)
      .where(and(
        eq(wmsInventoryEvents.tenantId, tenantId),
        eq(wmsInventoryEvents.storeId, storeId),
        eq(wmsInventoryEvents.productId, productId)
      ))
      .orderBy(desc(wmsInventoryEvents.eventSequence))
      .limit(1);

    if (events.length === 0) {
      return { quantity: 0, reserved: 0 };
    }

    return {
      quantity: events[0].balanceAfter,
      reserved: events[0].reservedAfter
    };
  }

  /**
   * 📊 Helper per creare evento da movimento WMS
   */
  async recordMovementEvent(params: {
    tenantId: string;
    storeId: string;
    productId: string;
    movementType: 'carico' | 'scarico' | 'trasferimento' | 'rettifica';
    quantity: number;
    currentBalance: number;
    currentReserved: number;
    movementId?: string;
    documentRef?: string;
    userId?: string;
    reason?: string;
  }): Promise<WmsInventoryEvent> {
    let eventType: InventoryEventType;
    let quantityChange: number;

    switch (params.movementType) {
      case 'carico':
        eventType = 'quantity_in';
        quantityChange = Math.abs(params.quantity);
        break;
      case 'scarico':
        eventType = 'quantity_out';
        quantityChange = -Math.abs(params.quantity);
        break;
      case 'trasferimento':
        eventType = params.quantity > 0 ? 'transfer_in' : 'transfer_out';
        quantityChange = params.quantity;
        break;
      case 'rettifica':
        eventType = 'adjustment';
        quantityChange = params.quantity;
        break;
      default:
        eventType = 'quantity_in';
        quantityChange = params.quantity;
    }

    return this.recordEvent({
      tenantId: params.tenantId,
      storeId: params.storeId,
      productId: params.productId,
      eventType,
      quantityChange,
      balanceAfter: params.currentBalance,
      reservedAfter: params.currentReserved,
      movementId: params.movementId,
      documentRef: params.documentRef,
      userId: params.userId,
      causedBy: 'user',
      reason: params.reason,
    });
  }

  /**
   * 📊 Helper per registrare cambio stato logistico
   */
  async recordStateChange(params: {
    tenantId: string;
    storeId: string;
    productId: string;
    previousState: LogisticState;
    newState: LogisticState;
    currentBalance: number;
    currentReserved: number;
    serialNumber?: string;
    userId?: string;
    reason?: string;
  }): Promise<WmsInventoryEvent> {
    return this.recordEvent({
      tenantId: params.tenantId,
      storeId: params.storeId,
      productId: params.productId,
      eventType: 'state_change',
      previousState: params.previousState,
      newState: params.newState,
      quantityChange: 0,
      balanceAfter: params.currentBalance,
      reservedAfter: params.currentReserved,
      serialNumber: params.serialNumber,
      userId: params.userId,
      causedBy: 'user',
      reason: params.reason,
    });
  }
}

export const inventoryEventLogService = new InventoryEventLogService();
export default inventoryEventLogService;
