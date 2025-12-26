/**
 * 📜 WMS STATUS HISTORY SERVICE
 * 
 * Gestisce lo storico dei cambiamenti di stato logistico per prodotti serializzati e batch.
 * Ogni cambio di stato viene registrato con:
 * - Stato precedente e nuovo
 * - Timestamp del cambio
 * - Documento/movimento che ha causato il cambio
 * - Utente che ha effettuato l'operazione
 * 
 * Tabelle:
 * - product_item_status_history: Prodotti serializzati (IMEI, SN)
 * - product_batch_status_history: Prodotti a lotto/quantità
 */

import crypto from 'crypto';
import { db } from '../core/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { 
  productItems,
  productItemStatusHistory,
  productBatches,
  productBatchStatusHistory,
  wmsMovementDocuments,
  wmsStockMovements
} from '../db/schema/w3suite';
import { logger } from '../core/logger';
import { DOCUMENT_STATUS_MAP, getTargetLogisticStatus } from '../utils/wms-document-rules';

export type ProductLogisticStatus = 
  | 'in_stock' | 'reserved' | 'preparing' | 'shipping' | 'delivered' | 'sold'
  | 'customer_return' | 'doa_return' | 'in_service' | 'supplier_return'
  | 'in_transfer' | 'lost' | 'damaged' | 'internal_use';

export type ProductBatchStatus = 'available' | 'reserved' | 'damaged' | 'expired';

export type DocumentType = 
  | 'order' | 'ddt' | 'receipt' | 'invoice' | 'fiscal_receipt' 
  | 'credit_note' | 'debit_note' | 'movement_specific' | 'packing_list' 
  | 'customs_declaration' | 'quality_certificate' | 'other';

export type DocumentDirection = 'active' | 'passive';

export interface StatusChangeContext {
  tenantId: string;
  changedBy?: string;
  changedByName?: string;
  notes?: string;
  movementId?: string;
  movementDocumentId?: string;
  documentType?: DocumentType;
  documentDirection?: DocumentDirection;
  statusChangeGroupId?: string;
}

export interface ItemStatusChangeParams extends StatusChangeContext {
  productItemId: string;
  toStatus: ProductLogisticStatus;
}

export interface BatchStatusChangeParams extends StatusChangeContext {
  productBatchId: string;
  toStatus: ProductBatchStatus;
  quantityAffected: number;
  targetLogisticStatus?: ProductLogisticStatus;
}

export interface BulkItemStatusChangeParams extends StatusChangeContext {
  productItemIds: string[];
  toStatus: ProductLogisticStatus;
}

class WmsStatusHistoryService {
  
  /**
   * 📝 Registra un cambio di stato per un prodotto serializzato
   */
  async recordItemStatusChange(params: ItemStatusChangeParams): Promise<string> {
    try {
      const [item] = await db
        .select({ logisticStatus: productItems.logisticStatus })
        .from(productItems)
        .where(eq(productItems.id, params.productItemId))
        .limit(1);
      
      if (!item) {
        throw new Error(`ProductItem ${params.productItemId} not found`);
      }
      
      const fromStatus = item.logisticStatus as ProductLogisticStatus | null;
      
      if (fromStatus === params.toStatus) {
        logger.debug('📜 [STATUS-HISTORY] No status change needed (same status)', {
          productItemId: params.productItemId,
          status: params.toStatus
        });
        return 'no_change';
      }
      
      const [historyRecord] = await db.transaction(async (tx) => {
        await tx
          .update(productItems)
          .set({ 
            logisticStatus: params.toStatus,
            updatedAt: new Date()
          })
          .where(eq(productItems.id, params.productItemId));
        
        return tx
          .insert(productItemStatusHistory)
          .values({
            productItemId: params.productItemId,
            tenantId: params.tenantId,
            fromStatus: fromStatus,
            toStatus: params.toStatus,
            changedBy: params.changedBy,
            changedByName: params.changedByName,
            notes: params.notes,
            movementId: params.movementId,
            movementDocumentId: params.movementDocumentId,
            documentType: params.documentType,
            documentDirection: params.documentDirection,
            statusChangeGroupId: params.statusChangeGroupId
          })
          .returning({ id: productItemStatusHistory.id });
      });
      
      logger.info('📜 [STATUS-HISTORY] Item status change recorded', {
        historyId: historyRecord.id,
        productItemId: params.productItemId,
        fromStatus,
        toStatus: params.toStatus,
        documentType: params.documentType
      });
      
      return historyRecord.id;
      
    } catch (error) {
      logger.error('❌ [STATUS-HISTORY] Failed to record item status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }
  
  /**
   * 📝 Registra cambio di stato per multipli prodotti serializzati (atomico)
   */
  async recordBulkItemStatusChange(params: BulkItemStatusChangeParams): Promise<string[]> {
    const groupId = params.statusChangeGroupId ?? crypto.randomUUID();
    
    try {
      const items = await db
        .select({ id: productItems.id, logisticStatus: productItems.logisticStatus })
        .from(productItems)
        .where(and(
          eq(productItems.tenantId, params.tenantId),
          inArray(productItems.id, params.productItemIds)
        ));
      
      const itemsToUpdate = items.filter(item => 
        item.logisticStatus !== params.toStatus
      );
      
      if (itemsToUpdate.length === 0) {
        logger.debug('📜 [STATUS-HISTORY] No items need status change');
        return [];
      }
      
      const historyIds = await db.transaction(async (tx) => {
        const ids: string[] = [];
        
        for (const item of itemsToUpdate) {
          await tx
            .update(productItems)
            .set({ 
              logisticStatus: params.toStatus,
              updatedAt: new Date()
            })
            .where(eq(productItems.id, item.id));
          
          const [record] = await tx
            .insert(productItemStatusHistory)
            .values({
              productItemId: item.id,
              tenantId: params.tenantId,
              fromStatus: item.logisticStatus as ProductLogisticStatus,
              toStatus: params.toStatus,
              changedBy: params.changedBy,
              changedByName: params.changedByName,
              notes: params.notes,
              movementId: params.movementId,
              movementDocumentId: params.movementDocumentId,
              documentType: params.documentType,
              documentDirection: params.documentDirection,
              statusChangeGroupId: groupId
            })
            .returning({ id: productItemStatusHistory.id });
          
          ids.push(record.id);
        }
        
        return ids;
      });
      
      logger.info('📜 [STATUS-HISTORY] Bulk item status change recorded', {
        groupId,
        itemCount: historyIds.length,
        toStatus: params.toStatus
      });
      
      return historyIds;
      
    } catch (error) {
      logger.error('❌ [STATUS-HISTORY] Failed to record bulk item status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        groupId
      });
      throw error;
    }
  }
  
  /**
   * 📝 Registra un cambio di stato per un batch di prodotti
   */
  async recordBatchStatusChange(params: BatchStatusChangeParams): Promise<string> {
    try {
      const [batch] = await db
        .select({ status: productBatches.status })
        .from(productBatches)
        .where(eq(productBatches.id, params.productBatchId))
        .limit(1);
      
      if (!batch) {
        throw new Error(`ProductBatch ${params.productBatchId} not found`);
      }
      
      const fromStatus = batch.status as ProductBatchStatus;
      
      const [historyRecord] = await db.transaction(async (tx) => {
        if (fromStatus !== params.toStatus) {
          await tx
            .update(productBatches)
            .set({ 
              status: params.toStatus,
              updatedAt: new Date()
            })
            .where(eq(productBatches.id, params.productBatchId));
        }
        
        return tx
          .insert(productBatchStatusHistory)
          .values({
            productBatchId: params.productBatchId,
            tenantId: params.tenantId,
            fromStatus: fromStatus,
            toStatus: params.toStatus,
            quantityAffected: params.quantityAffected,
            changedBy: params.changedBy,
            changedByName: params.changedByName,
            notes: params.notes,
            movementId: params.movementId,
            movementDocumentId: params.movementDocumentId,
            documentType: params.documentType,
            documentDirection: params.documentDirection,
            targetLogisticStatus: params.targetLogisticStatus,
            statusChangeGroupId: params.statusChangeGroupId
          })
          .returning({ id: productBatchStatusHistory.id });
      });
      
      logger.info('📜 [STATUS-HISTORY] Batch status change recorded', {
        historyId: historyRecord.id,
        productBatchId: params.productBatchId,
        fromStatus,
        toStatus: params.toStatus,
        quantityAffected: params.quantityAffected
      });
      
      return historyRecord.id;
      
    } catch (error) {
      logger.error('❌ [STATUS-HISTORY] Failed to record batch status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }
  
  /**
   * 📋 Ottiene lo storico cambiamenti di stato per un prodotto serializzato
   */
  async getItemStatusHistory(productItemId: string, tenantId: string): Promise<any[]> {
    return db
      .select()
      .from(productItemStatusHistory)
      .where(and(
        eq(productItemStatusHistory.productItemId, productItemId),
        eq(productItemStatusHistory.tenantId, tenantId)
      ))
      .orderBy(desc(productItemStatusHistory.changedAt));
  }
  
  /**
   * 📋 Ottiene lo storico cambiamenti di stato per un batch
   */
  async getBatchStatusHistory(productBatchId: string, tenantId: string): Promise<any[]> {
    return db
      .select()
      .from(productBatchStatusHistory)
      .where(and(
        eq(productBatchStatusHistory.productBatchId, productBatchId),
        eq(productBatchStatusHistory.tenantId, tenantId)
      ))
      .orderBy(desc(productBatchStatusHistory.changedAt));
  }
  
  /**
   * 🔄 Processa un documento e registra i cambiamenti di stato appropriati
   * Usa DOCUMENT_STATUS_MAP per determinare lo stato target
   */
  async processDocumentStatusChange(
    documentId: string,
    movementId: string | null,
    productItemIds: string[],
    batchInfo: { batchId: string; quantity: number }[],
    context: StatusChangeContext
  ): Promise<{ itemHistoryIds: string[]; batchHistoryIds: string[] }> {
    try {
      const [doc] = await db
        .select({
          documentType: wmsMovementDocuments.documentType,
          documentDirection: wmsMovementDocuments.documentDirection,
        })
        .from(wmsMovementDocuments)
        .where(eq(wmsMovementDocuments.id, documentId))
        .limit(1);
      
      if (!doc) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      const docType = doc.documentType as DocumentType;
      const docDirection = doc.documentDirection as DocumentDirection;
      const targetStatus = getTargetLogisticStatus(docType, docDirection);
      
      if (!targetStatus) {
        logger.info('📜 [STATUS-HISTORY] Document type does not trigger status change', {
          documentId,
          documentType: docType
        });
        return { itemHistoryIds: [], batchHistoryIds: [] };
      }
      
      const groupId = crypto.randomUUID();
      const itemHistoryIds: string[] = [];
      const batchHistoryIds: string[] = [];
      
      if (productItemIds.length > 0) {
        const ids = await this.recordBulkItemStatusChange({
          tenantId: context.tenantId,
          productItemIds,
          toStatus: targetStatus,
          changedBy: context.changedBy,
          changedByName: context.changedByName,
          notes: context.notes,
          movementId: movementId ?? undefined,
          movementDocumentId: documentId,
          documentType: docType,
          documentDirection: docDirection,
          statusChangeGroupId: groupId
        });
        itemHistoryIds.push(...ids);
      }
      
      for (const batch of batchInfo) {
        const historyId = await this.recordBatchStatusChange({
          tenantId: context.tenantId,
          productBatchId: batch.batchId,
          toStatus: 'available',
          quantityAffected: batch.quantity,
          targetLogisticStatus: targetStatus,
          changedBy: context.changedBy,
          changedByName: context.changedByName,
          notes: context.notes,
          movementId: movementId ?? undefined,
          movementDocumentId: documentId,
          documentType: docType,
          documentDirection: docDirection,
          statusChangeGroupId: groupId
        });
        batchHistoryIds.push(historyId);
      }
      
      logger.info('📜 [STATUS-HISTORY] Document processed for status changes', {
        documentId,
        targetStatus,
        itemsChanged: itemHistoryIds.length,
        batchesChanged: batchHistoryIds.length,
        groupId
      });
      
      return { itemHistoryIds, batchHistoryIds };
      
    } catch (error) {
      logger.error('❌ [STATUS-HISTORY] Failed to process document status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId
      });
      throw error;
    }
  }
}

export const wmsStatusHistoryService = new WmsStatusHistoryService();
