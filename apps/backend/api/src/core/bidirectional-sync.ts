/**
 * BidirectionalSyncService - Hub-Spoke Entity Synchronization
 * 
 * Architecture:
 * - Hub: w3suite.legal_entities (central entity with role flags)
 * - Spokes: w3suite.suppliers, w3suite.financial_entities (child tables)
 * 
 * Sync Rules:
 * 1. When legal_entity.is_supplier = true → auto-create/update supplier
 * 2. When legal_entity.is_financial_entity = true → auto-create/update financial_entity
 * 3. When supplier/financial_entity created → auto-create/update legal_entity with role flag
 * 
 * Matching Key: P.IVA (vatNumber/piva) - prevents duplicates
 */

import { db } from '../db';
import { legalEntities, suppliers, financialEntities } from '../db/schema/w3suite';
import { countries } from '../db/schema/public';
import { eq, and, or, sql, isNull } from 'drizzle-orm';
import { logger } from './logger';

const BRAND_TENANT_ID = '00000000-0000-0000-0000-000000000000';

interface LegalEntityData {
  id: string;
  tenantId: string;
  codice: string;
  nome: string;
  pIva?: string | null;
  codiceFiscale?: string | null;
  isSupplier?: boolean;
  isOperator?: boolean;
  isFinancialEntity?: boolean;
  indirizzo?: string | null;
  citta?: string | null;
  provincia?: string | null;
  cap?: string | null;
  telefono?: string | null;
  email?: string | null;
  pec?: string | null;
  iban?: string | null;
  bic?: string | null;
  website?: string | null;
}

interface SupplierData {
  id?: string;
  tenantId: string;
  code: string;
  name: string;
  vatNumber?: string | null;
  taxCode?: string | null;
  legalEntityId?: string | null;
  origin: 'brand' | 'tenant';
  createdBy: string;
}

interface FinancialEntityData {
  id?: string;
  tenantId: string;
  code: string;
  name: string;
  vatNumber?: string | null;
  taxCode?: string | null;
  legalEntityId?: string | null;
  origin: 'brand' | 'tenant';
}

export class BidirectionalSyncService {
  
  /**
   * Propagate legal_entity with is_supplier=true to suppliers table
   * Called after creating/updating a legal_entity
   */
  async propagateToSuppliers(legalEntity: LegalEntityData, userId: string): Promise<{ synced: boolean; supplierId?: string; action?: 'created' | 'updated' | 'skipped' }> {
    try {
      if (!legalEntity.isSupplier) {
        logger.debug('[BIDIRECTIONAL-SYNC] Skipping supplier propagation - is_supplier=false', { legalEntityId: legalEntity.id });
        return { synced: false, action: 'skipped' };
      }

      const isBrand = legalEntity.tenantId === BRAND_TENANT_ID;
      const origin = isBrand ? 'brand' : 'tenant';

      // Check if supplier already exists by legal_entity_id OR vatNumber
      const existingSupplier = await db.query.suppliers.findFirst({
        where: or(
          eq(suppliers.legalEntityId, legalEntity.id),
          legalEntity.pIva ? eq(suppliers.vatNumber, legalEntity.pIva) : sql`false`
        )
      });

      // Get Italy country_id for required field
      const italy = await db.query.countries.findFirst({
        where: eq(countries.name, 'Italia')
      });
      const countryId = italy?.id || null;

      if (existingSupplier) {
        // Update existing supplier
        await db.update(suppliers)
          .set({
            legalEntityId: legalEntity.id,
            name: legalEntity.nome,
            vatNumber: legalEntity.pIva,
            taxCode: legalEntity.codiceFiscale,
            pecEmail: legalEntity.pec,
            iban: legalEntity.iban,
            bic: legalEntity.bic,
            updatedAt: new Date(),
            updatedBy: userId
          })
          .where(eq(suppliers.id, existingSupplier.id));

        logger.info('[BIDIRECTIONAL-SYNC] Updated supplier from legal_entity', {
          legalEntityId: legalEntity.id,
          supplierId: existingSupplier.id,
          vatNumber: legalEntity.pIva
        });

        return { synced: true, supplierId: existingSupplier.id, action: 'updated' };
      } else {
        // Create new supplier
        if (!countryId) {
          logger.warn('[BIDIRECTIONAL-SYNC] Cannot create supplier - country Italia not found');
          return { synced: false, action: 'skipped' };
        }

        const [newSupplier] = await db.insert(suppliers)
          .values({
            legalEntityId: legalEntity.id,
            tenantId: legalEntity.tenantId,
            origin: origin as any,
            code: legalEntity.codice,
            name: legalEntity.nome,
            vatNumber: legalEntity.pIva,
            taxCode: legalEntity.codiceFiscale,
            supplierType: 'distributore' as any,
            countryId,
            pecEmail: legalEntity.pec,
            iban: legalEntity.iban,
            bic: legalEntity.bic,
            status: 'active' as any,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        logger.info('[BIDIRECTIONAL-SYNC] Created supplier from legal_entity', {
          legalEntityId: legalEntity.id,
          supplierId: newSupplier.id,
          vatNumber: legalEntity.pIva
        });

        return { synced: true, supplierId: newSupplier.id, action: 'created' };
      }
    } catch (error) {
      logger.error('[BIDIRECTIONAL-SYNC] Error propagating to suppliers', { error, legalEntityId: legalEntity.id });
      return { synced: false, action: 'skipped' };
    }
  }

  /**
   * Propagate legal_entity with is_financial_entity=true to financial_entities table
   */
  async propagateToFinancialEntities(legalEntity: LegalEntityData): Promise<{ synced: boolean; financialEntityId?: string; action?: 'created' | 'updated' | 'skipped' }> {
    try {
      if (!legalEntity.isFinancialEntity) {
        logger.debug('[BIDIRECTIONAL-SYNC] Skipping financial_entity propagation - is_financial_entity=false', { legalEntityId: legalEntity.id });
        return { synced: false, action: 'skipped' };
      }

      const isBrand = legalEntity.tenantId === BRAND_TENANT_ID;
      const origin = isBrand ? 'brand' : 'tenant';

      // Check if financial_entity already exists by legal_entity_id OR vatNumber
      const existingFE = await db.query.financialEntities.findFirst({
        where: or(
          eq(financialEntities.legalEntityId, legalEntity.id),
          legalEntity.pIva ? eq(financialEntities.vatNumber, legalEntity.pIva) : sql`false`
        )
      });

      if (existingFE) {
        // Update existing financial_entity
        await db.update(financialEntities)
          .set({
            legalEntityId: legalEntity.id,
            name: legalEntity.nome,
            vatNumber: legalEntity.pIva,
            taxCode: legalEntity.codiceFiscale,
            pecEmail: legalEntity.pec,
            iban: legalEntity.iban,
            bic: legalEntity.bic,
            website: legalEntity.website,
            updatedAt: new Date()
          })
          .where(eq(financialEntities.id, existingFE.id));

        logger.info('[BIDIRECTIONAL-SYNC] Updated financial_entity from legal_entity', {
          legalEntityId: legalEntity.id,
          financialEntityId: existingFE.id,
          vatNumber: legalEntity.pIva
        });

        return { synced: true, financialEntityId: existingFE.id, action: 'updated' };
      } else {
        // Create new financial_entity
        const [newFE] = await db.insert(financialEntities)
          .values({
            legalEntityId: legalEntity.id,
            tenantId: legalEntity.tenantId,
            origin: origin as any,
            code: legalEntity.codice,
            name: legalEntity.nome,
            vatNumber: legalEntity.pIva,
            taxCode: legalEntity.codiceFiscale,
            pecEmail: legalEntity.pec,
            iban: legalEntity.iban,
            bic: legalEntity.bic,
            website: legalEntity.website,
            status: 'active' as any,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        logger.info('[BIDIRECTIONAL-SYNC] Created financial_entity from legal_entity', {
          legalEntityId: legalEntity.id,
          financialEntityId: newFE.id,
          vatNumber: legalEntity.pIva
        });

        return { synced: true, financialEntityId: newFE.id, action: 'created' };
      }
    } catch (error) {
      logger.error('[BIDIRECTIONAL-SYNC] Error propagating to financial_entities', { error, legalEntityId: legalEntity.id });
      return { synced: false, action: 'skipped' };
    }
  }

  /**
   * Propagate supplier to legal_entities table (reverse sync)
   * Called when creating a new supplier without existing legal_entity link
   */
  async propagateSupplierToLegalEntity(supplier: SupplierData, userId: string): Promise<{ synced: boolean; legalEntityId?: string; action?: 'created' | 'updated' | 'linked' | 'skipped' }> {
    try {
      if (supplier.legalEntityId) {
        // Already linked - just update the is_supplier flag
        await db.update(legalEntities)
          .set({ isSupplier: true, updatedAt: new Date() })
          .where(eq(legalEntities.id, supplier.legalEntityId));
        
        logger.info('[BIDIRECTIONAL-SYNC] Updated legal_entity is_supplier flag', {
          supplierId: supplier.id,
          legalEntityId: supplier.legalEntityId
        });

        return { synced: true, legalEntityId: supplier.legalEntityId, action: 'updated' };
      }

      // Try to find existing legal_entity by vatNumber
      if (supplier.vatNumber) {
        const existingLE = await db.query.legalEntities.findFirst({
          where: and(
            eq(legalEntities.pIva, supplier.vatNumber),
            or(
              eq(legalEntities.tenantId, supplier.tenantId),
              eq(legalEntities.tenantId, BRAND_TENANT_ID)
            )
          )
        });

        if (existingLE) {
          // Link supplier to existing legal_entity and set is_supplier=true
          await db.update(legalEntities)
            .set({ isSupplier: true, updatedAt: new Date() })
            .where(eq(legalEntities.id, existingLE.id));

          logger.info('[BIDIRECTIONAL-SYNC] Linked supplier to existing legal_entity by P.IVA', {
            supplierId: supplier.id,
            legalEntityId: existingLE.id,
            vatNumber: supplier.vatNumber
          });

          return { synced: true, legalEntityId: existingLE.id, action: 'linked' };
        }
      }

      // Create new legal_entity
      const [newLE] = await db.insert(legalEntities)
        .values({
          tenantId: supplier.tenantId,
          codice: supplier.code,
          nome: supplier.name,
          pIva: supplier.vatNumber,
          codiceFiscale: supplier.taxCode,
          isSupplier: true,
          isOperator: false,
          isFinancialEntity: false,
          stato: 'attiva',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('[BIDIRECTIONAL-SYNC] Created legal_entity from supplier', {
        supplierId: supplier.id,
        legalEntityId: newLE.id,
        vatNumber: supplier.vatNumber
      });

      return { synced: true, legalEntityId: newLE.id, action: 'created' };
    } catch (error) {
      logger.error('[BIDIRECTIONAL-SYNC] Error propagating supplier to legal_entity', { error, supplierId: supplier.id });
      return { synced: false, action: 'skipped' };
    }
  }

  /**
   * Propagate financial_entity to legal_entities table (reverse sync)
   */
  async propagateFinancialEntityToLegalEntity(fe: FinancialEntityData): Promise<{ synced: boolean; legalEntityId?: string; action?: 'created' | 'updated' | 'linked' | 'skipped' }> {
    try {
      if (fe.legalEntityId) {
        // Already linked - just update the is_financial_entity flag
        await db.update(legalEntities)
          .set({ isFinancialEntity: true, updatedAt: new Date() })
          .where(eq(legalEntities.id, fe.legalEntityId));
        
        logger.info('[BIDIRECTIONAL-SYNC] Updated legal_entity is_financial_entity flag', {
          financialEntityId: fe.id,
          legalEntityId: fe.legalEntityId
        });

        return { synced: true, legalEntityId: fe.legalEntityId, action: 'updated' };
      }

      // Try to find existing legal_entity by vatNumber
      if (fe.vatNumber) {
        const existingLE = await db.query.legalEntities.findFirst({
          where: and(
            eq(legalEntities.pIva, fe.vatNumber),
            or(
              eq(legalEntities.tenantId, fe.tenantId),
              eq(legalEntities.tenantId, BRAND_TENANT_ID)
            )
          )
        });

        if (existingLE) {
          // Link to existing legal_entity and set is_financial_entity=true
          await db.update(legalEntities)
            .set({ isFinancialEntity: true, updatedAt: new Date() })
            .where(eq(legalEntities.id, existingLE.id));

          logger.info('[BIDIRECTIONAL-SYNC] Linked financial_entity to existing legal_entity by P.IVA', {
            financialEntityId: fe.id,
            legalEntityId: existingLE.id,
            vatNumber: fe.vatNumber
          });

          return { synced: true, legalEntityId: existingLE.id, action: 'linked' };
        }
      }

      // Create new legal_entity
      const [newLE] = await db.insert(legalEntities)
        .values({
          tenantId: fe.tenantId,
          codice: fe.code,
          nome: fe.name,
          pIva: fe.vatNumber,
          codiceFiscale: fe.taxCode,
          isSupplier: false,
          isOperator: false,
          isFinancialEntity: true,
          stato: 'attiva',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info('[BIDIRECTIONAL-SYNC] Created legal_entity from financial_entity', {
        financialEntityId: fe.id,
        legalEntityId: newLE.id,
        vatNumber: fe.vatNumber
      });

      return { synced: true, legalEntityId: newLE.id, action: 'created' };
    } catch (error) {
      logger.error('[BIDIRECTIONAL-SYNC] Error propagating financial_entity to legal_entity', { error, financialEntityId: fe.id });
      return { synced: false, action: 'skipped' };
    }
  }

  /**
   * Full sync for a legal_entity - propagates to all applicable child tables
   */
  async syncLegalEntity(legalEntity: LegalEntityData, userId: string): Promise<{
    suppliers: { synced: boolean; action?: string };
    financialEntities: { synced: boolean; action?: string };
  }> {
    const [suppliersResult, feResult] = await Promise.all([
      this.propagateToSuppliers(legalEntity, userId),
      this.propagateToFinancialEntities(legalEntity)
    ]);

    return {
      suppliers: suppliersResult,
      financialEntities: feResult
    };
  }
}

export const bidirectionalSyncService = new BidirectionalSyncService();
