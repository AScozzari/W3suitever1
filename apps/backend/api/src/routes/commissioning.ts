import { Router, Request, Response } from "express";
import { db } from "../core/db";
import { eq, and, ilike, or, desc, asc, sql, inArray, isNull, count } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../core/logger";
import { tenantMiddleware, rbacMiddleware } from "../middleware/tenant";

const router = Router();

router.get("/races", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { type } = req.query;
    const raceTypeFilter = type === 'operatore' ? 'operatore' : type === 'interna' ? 'interna' : null;

    const result = await db.execute(sql`
      SELECT 
        r.id,
        r.tenant_id,
        r.race_type,
        r.name,
        r.description,
        r.valid_from,
        r.valid_to,
        r.is_evergreen,
        r.operator_id,
        r.channel_id,
        r.status,
        r.created_at,
        r.updated_at,
        o.name as operator_name,
        ch.name as channel_name,
        COUNT(c.id)::int as configurators_count
      FROM w3suite.commissioning_races r
      LEFT JOIN public.operators o ON o.id = r.operator_id
      LEFT JOIN public.channels ch ON ch.id = r.channel_id
      LEFT JOIN w3suite.commissioning_configurators c ON c.race_id = r.id
      WHERE (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
        ${raceTypeFilter ? sql`AND r.race_type = ${raceTypeFilter}` : sql``}
      GROUP BY r.id, o.name, ch.name
      ORDER BY r.valid_from DESC
    `);

    const races = result.rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      raceType: row.race_type,
      name: row.name,
      description: row.description,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isEvergreen: row.is_evergreen,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      channelId: row.channel_id,
      channelName: row.channel_name,
      status: row.status,
      configuratorsCount: row.configurators_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(races);
  } catch (error) {
    logger.error("Error fetching commissioning races", { error });
    res.status(500).json({ error: "Failed to fetch races" });
  }
});

router.get("/races/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }
    const { id } = req.params;

    const result = await db.execute(sql`
      SELECT 
        r.*,
        o.name as operator_name,
        ch.name as channel_name
      FROM w3suite.commissioning_races r
      LEFT JOIN public.operators o ON o.id = r.operator_id
      LEFT JOIN public.channels ch ON ch.id = r.channel_id
      WHERE r.id = ${id}
        AND (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Race not found" });
    }

    const row: any = result.rows[0];
    res.json({
      id: row.id,
      tenantId: row.tenant_id,
      raceType: row.race_type,
      name: row.name,
      description: row.description,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isEvergreen: row.is_evergreen,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      channelId: row.channel_id,
      channelName: row.channel_name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    logger.error("Error fetching race", { error });
    res.status(500).json({ error: "Failed to fetch race" });
  }
});

const createRaceSchema = z.object({
  raceType: z.enum(['operatore', 'interna']),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  validFrom: z.string(),
  validTo: z.string().optional().nullable(),
  isEvergreen: z.boolean().default(false),
  operatorId: z.string().uuid().optional().nullable(),
  channelId: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
});

async function validateOperatorChannel(operatorId: string | null | undefined, channelId: string | null | undefined) {
  if (operatorId) {
    const opResult = await db.execute(sql`SELECT id FROM public.operators WHERE id = ${operatorId}`);
    if (opResult.rows.length === 0) {
      return { valid: false, error: "Invalid operator_id" };
    }
  }
  if (channelId) {
    const chResult = await db.execute(sql`SELECT id FROM public.channels WHERE id = ${channelId}`);
    if (chResult.rows.length === 0) {
      return { valid: false, error: "Invalid channel_id" };
    }
  }
  return { valid: true };
}

async function validateEntityIds(tenantId: string, entityType: string, entityIds: string[]) {
  if (entityIds.length === 0) return { valid: true };
  
  for (const id of entityIds) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { valid: false, error: `Invalid UUID format: ${id}` };
    }
  }
  
  let result;
  switch (entityType) {
    case 'RS':
      result = await db.execute(sql`
        SELECT id FROM w3suite.legal_entities 
        WHERE tenant_id = ${tenantId}::uuid AND id = ANY(${entityIds}::uuid[])
      `);
      break;
    case 'PDV':
      result = await db.execute(sql`
        SELECT id FROM w3suite.stores 
        WHERE tenant_id = ${tenantId}::uuid AND id = ANY(${entityIds}::uuid[])
      `);
      break;
    case 'RISORSA':
      result = await db.execute(sql`
        SELECT id FROM w3suite.users 
        WHERE tenant_id = ${tenantId}::uuid AND id = ANY(${entityIds}::uuid[])
      `);
      break;
    default:
      return { valid: false, error: "Invalid entity_type" };
  }
  
  if (result.rows.length !== entityIds.length) {
    return { valid: false, error: `Some entity IDs are invalid or don't belong to your tenant` };
  }
  return { valid: true };
}

async function validateDriverIds(tenantId: string, driverIds: string[]) {
  if (driverIds.length === 0) return { valid: true };
  
  for (const id of driverIds) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { valid: false, error: `Invalid UUID format: ${id}` };
    }
  }
  
  const result = await db.execute(sql`
    SELECT id FROM w3suite.drivers 
    WHERE tenant_id = ${tenantId}::uuid AND id = ANY(${driverIds}::uuid[])
  `);
  
  if (result.rows.length !== driverIds.length) {
    return { valid: false, error: `Some driver IDs are invalid or don't belong to your tenant` };
  }
  return { valid: true };
}

router.post("/races", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const data = createRaceSchema.parse(req.body);

    const validation = await validateOperatorChannel(data.operatorId, data.channelId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_races (
        tenant_id, race_type, name, description, valid_from, valid_to, 
        is_evergreen, operator_id, channel_id, status, created_by, modified_by
      ) VALUES (
        ${tenantId}, ${data.raceType}, ${data.name}, ${data.description || null}, 
        ${data.validFrom}::date, ${data.validTo ? sql`${data.validTo}::date` : sql`NULL`},
        ${data.isEvergreen}, ${data.operatorId || null}, ${data.channelId || null}, 
        ${data.status}, ${userId || null}, ${userId || null}
      )
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    logger.error("Error creating race", { error });
    res.status(500).json({ error: "Failed to create race" });
  }
});

router.patch("/races/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;

    const existingResult = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_races WHERE id = ${id}
    `);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Race not found" });
    }

    const existing: any = existingResult.rows[0];
    if (existing.tenant_id === null) {
      return res.status(403).json({ error: "Cannot modify brand-pushed races" });
    }
    if (existing.tenant_id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const data = createRaceSchema.partial().parse(req.body);

    const validation = await validateOperatorChannel(data.operatorId, data.channelId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_races SET
        name = COALESCE(${data.name ?? null}, name),
        description = COALESCE(${data.description ?? null}, description),
        valid_from = COALESCE(${data.validFrom ? sql`${data.validFrom}::date` : sql`NULL`}, valid_from),
        valid_to = ${data.validTo ? sql`${data.validTo}::date` : data.isEvergreen ? sql`NULL` : sql`valid_to`},
        is_evergreen = COALESCE(${data.isEvergreen ?? null}, is_evergreen),
        operator_id = COALESCE(${data.operatorId ?? null}, operator_id),
        channel_id = COALESCE(${data.channelId ?? null}, channel_id),
        status = COALESCE(${data.status ?? null}, status),
        modified_by = ${userId || null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    logger.error("Error updating race", { error });
    res.status(500).json({ error: "Failed to update race" });
  }
});

router.get("/clusters", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const result = await db.execute(sql`
      SELECT 
        c.*,
        COUNT(DISTINCT ce.id)::int as entities_count,
        COUNT(DISTINCT cd.id)::int as drivers_count
      FROM w3suite.commissioning_clusters c
      LEFT JOIN w3suite.commissioning_cluster_entities ce ON ce.cluster_id = c.id
      LEFT JOIN w3suite.commissioning_cluster_drivers cd ON cd.cluster_id = c.id
      WHERE c.tenant_id = ${tenantId}
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    const clusters = result.rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      entityType: row.entity_type,
      description: row.description,
      isActive: row.is_active,
      entitiesCount: row.entities_count,
      driversCount: row.drivers_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(clusters);
  } catch (error) {
    logger.error("Error fetching clusters", { error });
    res.status(500).json({ error: "Failed to fetch clusters" });
  }
});

router.get("/clusters/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    const clusterResult = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_clusters 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    if (clusterResult.rows.length === 0) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    const entitiesResult = await db.execute(sql`
      SELECT entity_id FROM w3suite.commissioning_cluster_entities WHERE cluster_id = ${id}
    `);

    const driversResult = await db.execute(sql`
      SELECT driver_id FROM w3suite.commissioning_cluster_drivers WHERE cluster_id = ${id}
    `);

    const row: any = clusterResult.rows[0];
    res.json({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      entityType: row.entity_type,
      description: row.description,
      isActive: row.is_active,
      entityIds: entitiesResult.rows.map((e: any) => e.entity_id),
      driverIds: driversResult.rows.map((d: any) => d.driver_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    logger.error("Error fetching cluster", { error });
    res.status(500).json({ error: "Failed to fetch cluster" });
  }
});

const createClusterSchema = z.object({
  name: z.string().min(1).max(255),
  entityType: z.enum(['RS', 'PDV', 'RISORSA']),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  entityIds: z.array(z.string().uuid()).default([]),
  driverIds: z.array(z.string().uuid()).default([]),
});

router.post("/clusters", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const data = createClusterSchema.parse(req.body);

    const entityValidation = await validateEntityIds(tenantId, data.entityType, data.entityIds);
    if (!entityValidation.valid) {
      return res.status(400).json({ error: entityValidation.error });
    }

    const driverValidation = await validateDriverIds(tenantId, data.driverIds);
    if (!driverValidation.valid) {
      return res.status(400).json({ error: driverValidation.error });
    }

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_clusters (
        tenant_id, name, entity_type, description, is_active, created_by, modified_by
      ) VALUES (
        ${tenantId}, ${data.name}, ${data.entityType}, ${data.description || null}, 
        ${data.isActive}, ${userId || null}, ${userId || null}
      )
      RETURNING *
    `);

    const clusterId = (result.rows[0] as any).id;

    if (data.entityIds.length > 0) {
      for (const entityId of data.entityIds) {
        await db.execute(sql`
          INSERT INTO w3suite.commissioning_cluster_entities (cluster_id, entity_id, entity_type)
          VALUES (${clusterId}, ${entityId}, ${data.entityType})
        `);
      }
    }

    if (data.driverIds.length > 0) {
      for (const driverId of data.driverIds) {
        await db.execute(sql`
          INSERT INTO w3suite.commissioning_cluster_drivers (cluster_id, driver_id)
          VALUES (${clusterId}, ${driverId})
        `);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    logger.error("Error creating cluster", { error });
    res.status(500).json({ error: "Failed to create cluster" });
  }
});

router.patch("/clusters/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;

    const existingResult = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_clusters WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    const data = createClusterSchema.partial().parse(req.body);
    const existing: any = existingResult.rows[0];

    if (data.entityIds !== undefined) {
      const entityValidation = await validateEntityIds(tenantId as string, existing.entity_type, data.entityIds);
      if (!entityValidation.valid) {
        return res.status(400).json({ error: entityValidation.error });
      }
    }

    if (data.driverIds !== undefined) {
      const driverValidation = await validateDriverIds(tenantId as string, data.driverIds);
      if (!driverValidation.valid) {
        return res.status(400).json({ error: driverValidation.error });
      }
    }

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_clusters SET
        name = COALESCE(${data.name ?? null}, name),
        description = COALESCE(${data.description ?? null}, description),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        modified_by = ${userId || null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    if (data.entityIds !== undefined) {
      await db.execute(sql`DELETE FROM w3suite.commissioning_cluster_entities WHERE cluster_id = ${id}`);
      const entityType = (result.rows[0] as any).entity_type;
      for (const entityId of data.entityIds) {
        await db.execute(sql`
          INSERT INTO w3suite.commissioning_cluster_entities (cluster_id, entity_id, entity_type)
          VALUES (${id}, ${entityId}, ${entityType})
        `);
      }
    }

    if (data.driverIds !== undefined) {
      await db.execute(sql`DELETE FROM w3suite.commissioning_cluster_drivers WHERE cluster_id = ${id}`);
      for (const driverId of data.driverIds) {
        await db.execute(sql`
          INSERT INTO w3suite.commissioning_cluster_drivers (cluster_id, driver_id)
          VALUES (${id}, ${driverId})
        `);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    logger.error("Error updating cluster", { error });
    res.status(500).json({ error: "Failed to update cluster" });
  }
});

router.delete("/clusters/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    const existingResult = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_clusters WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    await db.execute(sql`DELETE FROM w3suite.commissioning_clusters WHERE id = ${id}`);

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting cluster", { error });
    res.status(500).json({ error: "Failed to delete cluster" });
  }
});

router.get("/entities/:type", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { type } = req.params;

    let result;
    switch (type) {
      case 'RS':
        result = await db.execute(sql`
          SELECT id, name FROM w3suite.legal_entities 
          WHERE tenant_id = ${tenantId} AND is_active = true
          ORDER BY name ASC
        `);
        break;
      case 'PDV':
        result = await db.execute(sql`
          SELECT id, name FROM w3suite.stores 
          WHERE tenant_id = ${tenantId} AND is_active = true
          ORDER BY name ASC
        `);
        break;
      case 'RISORSA':
        result = await db.execute(sql`
          SELECT id, CONCAT(first_name, ' ', last_name) as name FROM w3suite.users 
          WHERE tenant_id = ${tenantId} AND is_active = true
          ORDER BY first_name, last_name ASC
        `);
        break;
      default:
        return res.status(400).json({ error: "Invalid entity type" });
    }

    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching entities", { error });
    res.status(500).json({ error: "Failed to fetch entities" });
  }
});

// ==================== L1 - VARIABLE MAPPINGS ====================

// Catalogo @placeholder disponibili (hardcoded per ora)
const AVAILABLE_PLACEHOLDERS = [
  { code: '@prezzo_vendita', name: 'Prezzo Vendita', dataType: 'currency', sourceTable: 'price_list_items', sourceColumn: 'sales_price_vat_incl' },
  { code: '@costo_acquisto', name: 'Costo Acquisto', dataType: 'currency', sourceTable: 'price_list_items', sourceColumn: 'purchase_cost' },
  { code: '@sconto_percent', name: 'Sconto %', dataType: 'percentage', sourceTable: 'price_list_items', sourceColumn: 'discount_percent' },
  { code: '@numero_rate', name: 'Numero Rate', dataType: 'number', sourceTable: 'price_list_items', sourceColumn: 'number_of_installments' },
  { code: '@importo_rata', name: 'Importo Rata', dataType: 'currency', sourceTable: 'price_list_items', sourceColumn: 'installment_amount' },
  { code: '@totale_finanziato', name: 'Totale Finanziato', dataType: 'currency', sourceTable: 'price_list_items', sourceColumn: 'total_financed_amount' },
  { code: '@canone_mensile', name: 'Canone Mensile', dataType: 'currency', sourceTable: 'price_list_items_canvas', sourceColumn: 'monthly_fee' },
  { code: '@costo_attivazione', name: 'Costo Attivazione', dataType: 'currency', sourceTable: 'price_list_items_canvas', sourceColumn: 'entry_fee' },
  { code: '@durata_contratto', name: 'Durata Contratto (mesi)', dataType: 'number', sourceTable: 'price_list_items_canvas', sourceColumn: 'contract_duration' },
  { code: '@fornitore', name: 'Fornitore', dataType: 'text', sourceTable: 'suppliers', sourceColumn: 'name', isPlaceholder: true },
  { code: '@ente_finanziante', name: 'Ente Finanziante', dataType: 'text', sourceTable: 'financial_entities', sourceColumn: 'name', isPlaceholder: true },
  { code: '@modalita_vendita', name: 'Modalità Vendita', dataType: 'enum', sourceTable: 'sales_modes', sourceColumn: 'code', isPlaceholder: true },
  { code: '@metodo_pagamento', name: 'Metodo Pagamento', dataType: 'enum', sourceTable: 'payment_methods', sourceColumn: 'code', isPlaceholder: true },
  { code: '@metodo_rateizzazione', name: 'Metodo Rateizzazione', dataType: 'enum', sourceTable: 'installment_methods', sourceColumn: 'code', isPlaceholder: true },
  { code: '@categoria', name: 'Categoria Prodotto', dataType: 'text', sourceTable: 'driver_category_mappings', sourceColumn: 'category_id', isPlaceholder: true },
  { code: '@tipologia', name: 'Tipologia Prodotto', dataType: 'text', sourceTable: 'driver_category_mappings', sourceColumn: 'typology_id', isPlaceholder: true },
  { code: '@brand', name: 'Brand Prodotto', dataType: 'text', sourceTable: 'products', sourceColumn: 'brand', isPlaceholder: true },
  { code: '@condizione', name: 'Condizione', dataType: 'enum', sourceTable: 'product_items', sourceColumn: 'condition', isPlaceholder: true },
  { code: '@costo_magazzino', name: 'Costo Magazzino', dataType: 'currency', isComputed: true, computeLogic: { type: 'wms_cost' } },
  { code: '@sorgente_lead', name: 'Sorgente Lead', dataType: 'text', sourceTable: 'crm_leads', sourceColumn: 'lead_source', isPlaceholder: true },
  { code: '@canale_lead', name: 'Canale Lead', dataType: 'text', sourceTable: 'crm_leads', sourceColumn: 'source_channel', isPlaceholder: true },
  { code: '@utm_source', name: 'UTM Source', dataType: 'text', sourceTable: 'crm_leads', sourceColumn: 'utm_source', isPlaceholder: true },
];

router.get("/variable-mappings/placeholders", async (req: Request, res: Response) => {
  res.json(AVAILABLE_PLACEHOLDERS);
});

router.get("/variable-mappings", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const result = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_variable_mappings
      WHERE tenant_id = ${tenantId} OR tenant_id IS NULL
      ORDER BY sort_order ASC, name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching variable mappings", { error });
    res.status(500).json({ error: "Failed to fetch variable mappings" });
  }
});

router.post("/variable-mappings", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { code, name, description, dataType, sourceTable, sourceColumn, sourceJoinPath, isComputed, computeLogic, isPlaceholder, sortOrder } = req.body;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_variable_mappings 
      (tenant_id, code, name, description, data_type, source_table, source_column, source_join_path, is_computed, compute_logic, is_placeholder, sort_order)
      VALUES (${tenantId}, ${code}, ${name}, ${description}, ${dataType}, ${sourceTable}, ${sourceColumn}, ${sourceJoinPath}, ${isComputed || false}, ${computeLogic ? JSON.stringify(computeLogic) : null}::jsonb, ${isPlaceholder || false}, ${sortOrder || 0})
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error creating variable mapping", { error });
    res.status(500).json({ error: "Failed to create variable mapping" });
  }
});

router.delete("/variable-mappings/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_variable_mappings 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting variable mapping", { error });
    res.status(500).json({ error: "Failed to delete variable mapping" });
  }
});

// ==================== L2 - VALUE PACKAGES ====================

router.get("/value-packages", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const result = await db.execute(sql`
      SELECT vp.*, o.name as operator_name,
        (SELECT COUNT(*) FROM w3suite.commissioning_value_package_items WHERE package_id = vp.id) as items_count
      FROM w3suite.commissioning_value_packages vp
      LEFT JOIN public.operators o ON o.id = vp.operator_id
      WHERE vp.tenant_id = ${tenantId} OR vp.tenant_id IS NULL
      ORDER BY vp.valid_from DESC, vp.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching value packages", { error });
    res.status(500).json({ error: "Failed to fetch value packages" });
  }
});

router.get("/value-packages/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    const packageResult = await db.execute(sql`
      SELECT vp.*, o.name as operator_name
      FROM w3suite.commissioning_value_packages vp
      LEFT JOIN public.operators o ON o.id = vp.operator_id
      WHERE vp.id = ${id} AND (vp.tenant_id = ${tenantId} OR vp.tenant_id IS NULL)
    `);

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: "Value package not found" });
    }

    const itemsResult = await db.execute(sql`
      SELECT vpi.*, p.name as product_name, p.sku as product_sku
      FROM w3suite.commissioning_value_package_items vpi
      LEFT JOIN w3suite.products p ON p.id = vpi.product_id
      WHERE vpi.package_id = ${id}
      ORDER BY p.name ASC
    `);

    res.json({
      ...packageResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    logger.error("Error fetching value package", { error });
    res.status(500).json({ error: "Failed to fetch value package" });
  }
});

router.post("/value-packages", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { code, name, description, listType, operatorId, validFrom, validTo, status } = req.body;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_value_packages 
      (tenant_id, code, name, description, list_type, operator_id, valid_from, valid_to, status, created_by)
      VALUES (${tenantId}, ${code}, ${name}, ${description}, ${listType}, ${operatorId}, ${validFrom}, ${validTo}, ${status || 'draft'}, ${userId})
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error creating value package", { error });
    res.status(500).json({ error: "Failed to create value package" });
  }
});

router.put("/value-packages/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;
    const { code, name, description, listType, operatorId, validFrom, validTo, status } = req.body;

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_value_packages SET
        code = ${code}, name = ${name}, description = ${description},
        list_type = ${listType}, operator_id = ${operatorId},
        valid_from = ${validFrom}, valid_to = ${validTo}, status = ${status},
        modified_by = ${userId}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Value package not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Error updating value package", { error });
    res.status(500).json({ error: "Failed to update value package" });
  }
});

router.delete("/value-packages/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_value_packages 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting value package", { error });
    res.status(500).json({ error: "Failed to delete value package" });
  }
});

// Duplicate value package
router.post("/value-packages/:id/duplicate", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;
    const { newName, newValidFrom, newValidTo } = req.body;

    // Get original package
    const originalResult = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_value_packages WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: "Original package not found" });
    }

    const original: any = originalResult.rows[0];

    // Create new package
    const newPackageResult = await db.execute(sql`
      INSERT INTO w3suite.commissioning_value_packages 
      (tenant_id, code, name, description, list_type, operator_id, valid_from, valid_to, base_package_id, version, status, created_by)
      VALUES (${tenantId}, ${original.code + '_copy'}, ${newName || original.name + ' (Copia)'}, ${original.description}, 
              ${original.list_type}, ${original.operator_id}, ${newValidFrom || original.valid_from}, ${newValidTo}, 
              ${id}, ${(original.version || 1) + 1}, 'draft', ${userId})
      RETURNING *
    `);

    const newPackageId = (newPackageResult.rows[0] as any).id;

    // Copy items
    await db.execute(sql`
      INSERT INTO w3suite.commissioning_value_package_items (package_id, product_id, product_version_id, price_list_item_id, valenza, gettone_contrattuale, gettone_gara, canone, notes)
      SELECT ${newPackageId}, product_id, product_version_id, price_list_item_id, valenza, gettone_contrattuale, gettone_gara, canone, notes
      FROM w3suite.commissioning_value_package_items WHERE package_id = ${id}
    `);

    res.status(201).json(newPackageResult.rows[0]);
  } catch (error) {
    logger.error("Error duplicating value package", { error });
    res.status(500).json({ error: "Failed to duplicate value package" });
  }
});

// Value package items
router.post("/value-packages/:packageId/items", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { productId, productVersionId, priceListItemId, valenza, gettoneContrattuale, gettoneGara, canone, notes } = req.body;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_value_package_items 
      (package_id, product_id, product_version_id, price_list_item_id, valenza, gettone_contrattuale, gettone_gara, canone, notes)
      VALUES (${packageId}, ${productId}, ${productVersionId}, ${priceListItemId}, ${valenza}, ${gettoneContrattuale}, ${gettoneGara}, ${canone}, ${notes})
      ON CONFLICT (package_id, product_id) DO UPDATE SET
        valenza = EXCLUDED.valenza, gettone_contrattuale = EXCLUDED.gettone_contrattuale,
        gettone_gara = EXCLUDED.gettone_gara, canone = EXCLUDED.canone, notes = EXCLUDED.notes, updated_at = NOW()
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error upserting value package item", { error });
    res.status(500).json({ error: "Failed to save value package item" });
  }
});

router.delete("/value-packages/:packageId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const { packageId, itemId } = req.params;

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_value_package_items 
      WHERE id = ${itemId} AND package_id = ${packageId}
    `);

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting value package item", { error });
    res.status(500).json({ error: "Failed to delete value package item" });
  }
});

// ==================== L3 - FUNCTIONS ====================

// Variabili L2 target disponibili
const L2_TARGET_VARIABLES = [
  { code: 'valenza', name: 'Valenza', type: 'number' },
  { code: 'gettone_contrattuale', name: 'Gettone Contrattuale', type: 'currency' },
  { code: 'gettone_gara', name: 'Gettone Gara', type: 'currency' },
  { code: 'canone', name: 'Canone', type: 'currency' },
  { code: 'volumi', name: 'Volumi', type: 'number' },
  { code: 'valore_prodotto', name: 'Valore € Prodotto', type: 'currency' },
  { code: 'valore_vendita', name: 'Valore € Vendita', type: 'currency' },
];

router.get("/functions/target-variables", async (req: Request, res: Response) => {
  res.json(L2_TARGET_VARIABLES);
});

router.get("/functions", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const result = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_functions
      WHERE tenant_id = ${tenantId} OR tenant_id IS NULL
      ORDER BY sort_order ASC, name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching functions", { error });
    res.status(500).json({ error: "Failed to fetch functions" });
  }
});

router.get("/functions/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    const result = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_functions
      WHERE id = ${id} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Function not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Error fetching function", { error });
    res.status(500).json({ error: "Failed to fetch function" });
  }
});

router.post("/functions", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { code, name, description, evaluationMode, targetVariable, ruleBundle, dependsOn, sortOrder } = req.body;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_functions 
      (tenant_id, code, name, description, evaluation_mode, target_variable, rule_bundle, depends_on, sort_order, created_by)
      VALUES (${tenantId}, ${code}, ${name}, ${description}, ${evaluationMode || 'first_match'}, ${targetVariable}, ${JSON.stringify(ruleBundle || {})}::jsonb, ${dependsOn || null}, ${sortOrder || 0}, ${userId})
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error creating function", { error });
    res.status(500).json({ error: "Failed to create function" });
  }
});

router.put("/functions/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;
    const { code, name, description, evaluationMode, targetVariable, ruleBundle, dependsOn, sortOrder, isActive } = req.body;

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_functions SET
        code = ${code}, name = ${name}, description = ${description},
        evaluation_mode = ${evaluationMode}, target_variable = ${targetVariable},
        rule_bundle = ${JSON.stringify(ruleBundle || {})}::jsonb, depends_on = ${dependsOn || null},
        sort_order = ${sortOrder || 0}, is_active = ${isActive !== false},
        modified_by = ${userId}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Function not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Error updating function", { error });
    res.status(500).json({ error: "Failed to update function" });
  }
});

router.delete("/functions/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_functions 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting function", { error });
    res.status(500).json({ error: "Failed to delete function" });
  }
});

export default router;
