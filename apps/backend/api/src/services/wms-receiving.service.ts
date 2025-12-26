/**
 * 📦 WMS RECEIVING SERVICE
 * 
 * Servizio per la gestione del carico merce (goods receiving).
 * Gestisce il flusso completo di ricezione merci includendo:
 * - Creazione DDT passivo
 * - Creazione movimenti inbound
 * - Gestione seriali (IMEI, ICCID, MAC, SN)
 * - Creazione/aggiornamento lotti
 * - Aggiornamento inventario
 * - Registrazione status history
 */

import crypto from 'crypto';
import { db } from '../core/db';
import { eq, and, sql } from 'drizzle-orm';
import { 
  products,
  productItems,
  productSerials,
  productBatches,
  wmsStockMovements,
  wmsMovementDocuments,
  wmsInventoryBalances,
  suppliers
} from '../db/schema/w3suite';
import { logger } from '../core/logger';
import { wmsStatusHistoryService } from './wms-status-history.service';

export interface ReceivingItem {
  productId: string;
  productSku: string;
  quantity: number;
  serials?: string[];
  lot?: string;
  unitPrice?: number;
  expectedQuantity?: number;
}

export interface ReceivingRequest {
  tenantId: string;
  storeId: string;
  supplierId: string;
  orderId?: string;
  documentNumber: string;
  documentDate: string;
  notes?: string;
  items: ReceivingItem[];
  createdBy?: string;
  createdByName?: string;
}

export interface ReceivingResult {
  success: boolean;
  documentId: string;
  documentNumber: string;
  movementIds: string[];
  serialsCreated: number;
  batchesCreated: number;
  itemsReceived: number;
  hasDiscrepancies: boolean;
  discrepancies: Array<{
    productId: string;
    productSku: string;
    expected: number;
    received: number;
    delta: number;
  }>;
}

class WmsReceivingService {

  /**
   * 📦 Processa un carico merce completo
   */
  async processReceiving(request: ReceivingRequest): Promise<ReceivingResult> {
    const groupId = crypto.randomUUID();
    
    logger.info('📦 [RECEIVING] Starting goods receiving process', {
      tenantId: request.tenantId,
      storeId: request.storeId,
      supplierId: request.supplierId,
      documentNumber: request.documentNumber,
      itemsCount: request.items.length,
      groupId
    });

    try {
      const result = await db.transaction(async (tx) => {
        const documentId = crypto.randomUUID();
        const now = new Date();
        const movementIds: string[] = [];
        let serialsCreated = 0;
        let batchesCreated = 0;
        let itemsReceived = 0;
        const discrepancies: ReceivingResult['discrepancies'] = [];

        const [supplierData] = await tx
          .select({ name: suppliers.name })
          .from(suppliers)
          .where(eq(suppliers.id, request.supplierId))
          .limit(1);

        const [document] = await tx
          .insert(wmsMovementDocuments)
          .values({
            id: documentId,
            tenantId: request.tenantId,
            storeId: request.storeId,
            documentNumber: request.documentNumber,
            documentType: 'ddt',
            documentCategory: 'operational',
            documentDirection: 'passive',
            status: 'completed',
            documentDate: new Date(request.documentDate),
            supplierId: request.supplierId,
            supplierName: supplierData?.name || 'Fornitore sconosciuto',
            notes: request.notes,
            totalQuantity: request.items.reduce((sum, item) => sum + item.quantity, 0),
            totalAmount: request.items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0),
            createdBy: request.createdBy,
            orderId: request.orderId
          })
          .returning();

        logger.info('📄 [RECEIVING] DDT passivo created', {
          documentId,
          documentNumber: request.documentNumber,
          tenantId: request.tenantId
        });

        for (const item of request.items) {
          const [product] = await tx
            .select()
            .from(products)
            .where(
              and(
                eq(products.tenantId, request.tenantId),
                eq(products.id, item.productId)
              )
            )
            .limit(1);

          if (!product) {
            logger.warn('⚠️ [RECEIVING] Product not found, skipping', {
              productId: item.productId,
              productSku: item.productSku
            });
            continue;
          }

          const movementId = crypto.randomUUID();
          movementIds.push(movementId);

          await tx
            .insert(wmsStockMovements)
            .values({
              id: movementId,
              tenantId: request.tenantId,
              productId: item.productId,
              storeId: request.storeId,
              movementType: 'purchase',
              movementDirection: 'inbound',
              quantityDelta: item.quantity,
              unitCost: item.unitPrice,
              totalCost: item.unitPrice ? item.unitPrice * item.quantity : null,
              referenceType: 'document',
              referenceId: documentId,
              notes: `Carico da DDT ${request.documentNumber}`,
              status: 'completed',
              createdBy: request.createdBy
            });

          if (product.isSerializable && item.serials && item.serials.length > 0) {
            for (const serialValue of item.serials) {
              const serialId = crypto.randomUUID();
              const productItemId = crypto.randomUUID();

              await tx
                .insert(productSerials)
                .values({
                  id: serialId,
                  tenantId: request.tenantId,
                  serialType: product.serialType || 'other',
                  serialValue: serialValue,
                  productId: item.productId,
                  status: 'active'
                });

              await tx
                .insert(productItems)
                .values({
                  id: productItemId,
                  tenantId: request.tenantId,
                  productId: item.productId,
                  productSerialId: serialId,
                  logisticStatus: 'in_stock',
                  storeId: request.storeId,
                  purchaseCost: item.unitPrice,
                  movementDocumentId: documentId,
                  batchNumber: item.lot
                });

              await wmsStatusHistoryService.recordItemStatusChangeWithTx({
                productItemId,
                tenantId: request.tenantId,
                toStatus: 'in_stock',
                forceInitialEntry: true,
                changedBy: request.createdBy,
                changedByName: request.createdByName,
                movementId: movementId,
                movementDocumentId: documentId,
                documentType: 'ddt',
                documentDirection: 'passive',
                notes: `Carico merce da ${supplierData?.name || 'fornitore'}`,
                statusChangeGroupId: groupId
              }, tx);

              serialsCreated++;
            }
          } else {
            let batchId = item.lot ? undefined : undefined;
            
            if (item.lot) {
              const [existingBatch] = await tx
                .select()
                .from(productBatches)
                .where(
                  and(
                    eq(productBatches.tenantId, request.tenantId),
                    eq(productBatches.productId, item.productId),
                    eq(productBatches.batchNumber, item.lot)
                  )
                )
                .limit(1);

              if (existingBatch) {
                batchId = existingBatch.id;
                await tx
                  .update(productBatches)
                  .set({ 
                    quantity: sql`${productBatches.quantity} + ${item.quantity}`,
                    updatedAt: now
                  })
                  .where(eq(productBatches.id, existingBatch.id));
                
                logger.info('📦 [RECEIVING] Updated existing batch', {
                  batchId: existingBatch.id,
                  batchNumber: item.lot,
                  quantityAdded: item.quantity
                });
              } else {
                batchId = crypto.randomUUID();
                await tx
                  .insert(productBatches)
                  .values({
                    id: batchId,
                    tenantId: request.tenantId,
                    productId: item.productId,
                    storeId: request.storeId,
                    batchNumber: item.lot,
                    quantity: item.quantity,
                    reserved: 0,
                    status: 'available',
                    receivedAt: now,
                    unitCost: item.unitPrice,
                    supplierId: request.supplierId
                  });
                
                batchesCreated++;
                logger.info('📦 [RECEIVING] Created new batch', {
                  batchId,
                  batchNumber: item.lot,
                  quantity: item.quantity
                });
              }

              if (batchId) {
                await wmsStatusHistoryService.recordBatchStatusChangeWithTx({
                  productBatchId: batchId,
                  tenantId: request.tenantId,
                  toStatus: 'available',
                  quantityAffected: item.quantity,
                  forceInitialEntry: true,
                  changedBy: request.createdBy,
                  changedByName: request.createdByName,
                  movementId: movementId,
                  movementDocumentId: documentId,
                  documentType: 'ddt',
                  documentDirection: 'passive',
                  notes: `Carico merce da ${supplierData?.name || 'fornitore'}`,
                  statusChangeGroupId: groupId
                }, tx);
              }
            }
          }

          await tx
            .update(products)
            .set({ 
              quantityInStock: sql`${products.quantityInStock} + ${item.quantity}`,
              quantityAvailable: sql`${products.quantityAvailable} + ${item.quantity}`,
              updatedAt: now
            })
            .where(eq(products.id, item.productId));

          const [existingBalance] = await tx
            .select()
            .from(wmsInventoryBalances)
            .where(
              and(
                eq(wmsInventoryBalances.tenantId, request.tenantId),
                eq(wmsInventoryBalances.storeId, request.storeId),
                eq(wmsInventoryBalances.productId, item.productId)
              )
            )
            .limit(1);

          if (existingBalance) {
            await tx
              .update(wmsInventoryBalances)
              .set({ 
                quantityOnHand: sql`${wmsInventoryBalances.quantityOnHand} + ${item.quantity}`,
                quantityAvailable: sql`${wmsInventoryBalances.quantityAvailable} + ${item.quantity}`,
                lastMovementAt: now,
                updatedAt: now
              })
              .where(eq(wmsInventoryBalances.id, existingBalance.id));
          } else {
            await tx
              .insert(wmsInventoryBalances)
              .values({
                id: crypto.randomUUID(),
                tenantId: request.tenantId,
                storeId: request.storeId,
                productId: item.productId,
                quantityOnHand: item.quantity,
                quantityReserved: 0,
                quantityAvailable: item.quantity,
                lastMovementAt: now
              });
          }

          itemsReceived += item.quantity;

          if (item.expectedQuantity && item.quantity !== item.expectedQuantity) {
            discrepancies.push({
              productId: item.productId,
              productSku: item.productSku,
              expected: item.expectedQuantity,
              received: item.quantity,
              delta: item.quantity - item.expectedQuantity
            });
          }
        }

        logger.info('✅ [RECEIVING] Goods receiving completed', {
          documentId,
          documentNumber: request.documentNumber,
          movementCount: movementIds.length,
          serialsCreated,
          batchesCreated,
          itemsReceived,
          discrepanciesCount: discrepancies.length,
          groupId
        });

        return {
          success: true,
          documentId,
          documentNumber: request.documentNumber,
          movementIds,
          serialsCreated,
          batchesCreated,
          itemsReceived,
          hasDiscrepancies: discrepancies.length > 0,
          discrepancies
        };
      });

      return result;

    } catch (error) {
      logger.error('❌ [RECEIVING] Failed to process goods receiving', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: request.tenantId,
        documentNumber: request.documentNumber,
        groupId
      });
      throw error;
    }
  }

  /**
   * 🔢 Genera un numero di lotto automatico
   */
  generateLotNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `LOT-${year}-${random}`;
  }

  /**
   * 🔍 Verifica duplicati seriale nel tenant
   */
  async checkSerialDuplicates(tenantId: string, serials: string[]): Promise<string[]> {
    if (serials.length === 0) return [];

    const existing = await db
      .select({ serialValue: productSerials.serialValue })
      .from(productSerials)
      .where(
        and(
          eq(productSerials.tenantId, tenantId),
          sql`${productSerials.serialValue} = ANY(${serials})`
        )
      );

    return existing.map(e => e.serialValue);
  }
}

export const wmsReceivingService = new WmsReceivingService();
