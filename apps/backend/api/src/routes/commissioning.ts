import { Router, Request, Response } from "express";
import { db } from "../core/db";
import { eq, and, ilike, or, desc, asc, sql, inArray, isNull, count } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../core/logger";
import { tenantMiddleware, rbacMiddleware } from "../middleware/tenant";

const router = Router();

// ==================== COMMISSIONING VALIDATION SCHEMAS ====================

// Operatori per condizioni nelle funzioni
const conditionOperators = ['>', '<', '=', '!=', '>=', '<=', '%+', '%-', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'] as const;
const logicConnectors = ['AND', 'OR'] as const;

// Schema per singola condizione nel ruleBundle
const conditionSchema = z.object({
  variable: z.string().min(1, "La variabile è obbligatoria"),
  operator: z.enum(conditionOperators),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  logic: z.enum(logicConnectors).optional().default('AND'),
});

// Schema per ruleBundle completo (solo condizioni - le operazioni vanno nel configuratore)
const ruleBundleSchema = z.object({
  conditions: z.array(conditionSchema).default([]),
});

// Operatori per operazioni nel configurator-function link
const operationOperators = ['multiply', 'add', 'subtract', 'divide', 'percentage'] as const;
const operationTargets = ['gettone_contrattuale', 'gettone_gara', 'canone', 'valenza'] as const;

// Schema per singola operazione
const operationSchema = z.object({
  target: z.enum(operationTargets),
  operator: z.enum(operationOperators),
  value: z.number(),
});

// Schema per operations nel configurator-function link
const operationsSchema = z.object({
  operations: z.array(operationSchema).default([]),
});

// Schema per creazione/update funzione
// Nota: evaluationMode, targetVariable e sortOrder sono gestiti nei Configuratori, non qui
const createFunctionSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  ruleBundle: ruleBundleSchema.optional().default({ conditions: [] }),
  dependsOn: z.array(z.string().uuid()).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

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

// Get entities for cluster form based on entity type
router.get("/entities", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const entityType = (req.query.type as string) || 'PDV';
    const roleFilter = req.query.role as string | undefined;
    let result;

    switch (entityType) {
      case 'RS':
        // Ragioni Sociali - organization entities for the tenant
        result = await db.execute(sql`
          SELECT id, nome as name FROM w3suite.organization_entities 
          WHERE tenant_id = ${tenantId} AND stato = 'Attiva'
          ORDER BY nome
        `);
        break;
      case 'PDV':
        // Punti Vendita - stores with category 'sales_point' only (not office/warehouse)
        result = await db.execute(sql`
          SELECT id, nome as name FROM w3suite.stores 
          WHERE tenant_id = ${tenantId} 
            AND category = 'sales_point'
            AND (status = 'active' OR status = 'Attivo')
          ORDER BY nome
        `);
        break;
      case 'RISORSA':
        // Risorse - users, optionally filtered by role
        if (roleFilter) {
          result = await db.execute(sql`
            SELECT DISTINCT u.id, CONCAT(u.first_name, ' ', u.last_name) as name, r.code as role_code
            FROM w3suite.users u
            LEFT JOIN w3suite.user_assignments ua ON ua.user_id = u.id
            LEFT JOIN w3suite.roles r ON r.id = ua.role_id
            WHERE u.tenant_id = ${tenantId} 
              AND u.status = 'active'
              AND r.code = ${roleFilter}
            ORDER BY u.first_name, u.last_name
          `);
        } else {
          result = await db.execute(sql`
            SELECT id, CONCAT(first_name, ' ', last_name) as name 
            FROM w3suite.users 
            WHERE tenant_id = ${tenantId} AND status = 'active'
            ORDER BY first_name, last_name
          `);
        }
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

    // Parse query filters
    const { status, dateFrom, dateTo, listType, operatorId } = req.query;

    // Build dynamic WHERE conditions
    let statusCondition = sql``;
    if (status && status !== 'all') {
      if (status === 'expired') {
        // Expired = validTo < today AND status != 'archived'
        statusCondition = sql`AND vp.valid_to < CURRENT_DATE AND vp.status != 'archived'`;
      } else {
        statusCondition = sql`AND vp.status = ${status}`;
      }
    }

    let dateCondition = sql``;
    if (dateFrom) {
      dateCondition = sql`${dateCondition} AND vp.created_at >= ${dateFrom}::date`;
    }
    if (dateTo) {
      dateCondition = sql`${dateCondition} AND vp.created_at <= ${dateTo}::date`;
    }

    let listTypeCondition = sql``;
    if (listType) {
      listTypeCondition = sql`AND vp.list_type = ${listType}`;
    }

    let operatorCondition = sql``;
    if (operatorId) {
      operatorCondition = sql`AND vp.operator_id = ${operatorId}::uuid`;
    }

    const result = await db.execute(sql`
      SELECT vp.*, o.name as operator_name,
        (SELECT COUNT(*) FROM w3suite.commissioning_value_package_items WHERE package_id = vp.id) as items_count,
        (SELECT COUNT(*) FROM w3suite.commissioning_value_package_price_lists WHERE package_id = vp.id) as price_lists_count,
        CASE 
          WHEN vp.status = 'archived' THEN 'archived'
          WHEN vp.valid_to IS NOT NULL AND vp.valid_to < CURRENT_DATE THEN 'expired'
          ELSE vp.status
        END as computed_status
      FROM w3suite.commissioning_value_packages vp
      LEFT JOIN public.operators o ON o.id = vp.operator_id
      WHERE (vp.tenant_id = ${tenantId} OR vp.tenant_id IS NULL)
        ${statusCondition}
        ${dateCondition}
        ${listTypeCondition}
        ${operatorCondition}
      ORDER BY vp.created_at DESC, vp.name ASC
    `);

    // Transform rows for frontend
    const packages = result.rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      code: row.code,
      name: row.name,
      description: row.description,
      listType: row.list_type,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      status: row.status,
      computedStatus: row.computed_status,
      version: row.version,
      basePackageId: row.base_package_id,
      itemsCount: parseInt(row.items_count) || 0,
      priceListsCount: parseInt(row.price_lists_count) || 0,
      createdBy: row.created_by,
      modifiedBy: row.modified_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(packages);
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
    
    // Handle empty strings as null for date fields
    const parsedValidFrom = validFrom && validFrom !== '' ? validFrom : null;
    const parsedValidTo = validTo && validTo !== '' ? validTo : null;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_value_packages 
      (tenant_id, code, name, description, list_type, operator_id, valid_from, valid_to, status, created_by)
      VALUES (${tenantId}, ${code}, ${name}, ${description || null}, ${listType}, ${operatorId || null}, ${parsedValidFrom}, ${parsedValidTo}, ${status || 'draft'}, ${userId})
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

    // Handle empty strings as null for UUID and date fields
    const safeOperatorId = operatorId && operatorId.trim() !== '' ? operatorId : null;
    const safeValidTo = validTo && validTo.trim() !== '' ? validTo : null;
    const safeValidFrom = validFrom && validFrom.trim() !== '' ? validFrom : null;

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_value_packages SET
        code = ${code}, name = ${name}, description = ${description || null},
        list_type = ${listType}, operator_id = ${safeOperatorId},
        valid_from = ${safeValidFrom}, valid_to = ${safeValidTo}, status = ${status},
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

// Archive/Unarchive value package
router.patch("/value-packages/:id/archive", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;
    const { archived } = req.body; // true = archive, false = unarchive (set to draft)

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    // Check if package exists and belongs to tenant
    const existingResult = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_value_packages 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Value package not found" });
    }

    const newStatus = archived === true ? 'archived' : 'draft';

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_value_packages SET
        status = ${newStatus},
        modified_by = ${userId},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Error archiving value package", { error });
    res.status(500).json({ error: "Failed to archive value package" });
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

// ==================== VALUE PACKAGE PRICE LISTS ====================

// Get price lists associated with a package
router.get("/value-packages/:packageId/price-lists", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { packageId } = req.params;

    const result = await db.execute(sql`
      SELECT vppl.*, pl.code as price_list_code, pl.name as price_list_name, pl.type as price_list_type,
        (SELECT COUNT(*)::int FROM w3suite.commissioning_value_package_items 
         WHERE package_id = ${packageId} AND price_list_id = pl.id) as items_count,
        CASE 
          WHEN pl.type = 'canvas' THEN (SELECT COUNT(*)::int FROM w3suite.price_list_items_canvas WHERE price_list_id = pl.id AND is_active = true)
          ELSE (SELECT COUNT(*)::int FROM w3suite.price_list_items WHERE price_list_id = pl.id AND is_active = true)
        END as total_products
      FROM w3suite.commissioning_value_package_price_lists vppl
      JOIN w3suite.price_lists pl ON pl.id = vppl.price_list_id
      WHERE vppl.package_id = ${packageId}
      ORDER BY vppl.sort_order ASC, pl.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching package price lists", { error });
    res.status(500).json({ error: "Failed to fetch package price lists" });
  }
});

// Add price list to package
router.post("/value-packages/:packageId/price-lists", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { priceListId, sortOrder } = req.body;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_value_package_price_lists (package_id, price_list_id, sort_order)
      VALUES (${packageId}, ${priceListId}, ${sortOrder || 0})
      ON CONFLICT (package_id, price_list_id) DO NOTHING
      RETURNING *
    `);

    res.status(201).json(result.rows[0] || { message: "Price list already added" });
  } catch (error) {
    logger.error("Error adding price list to package", { error });
    res.status(500).json({ error: "Failed to add price list to package" });
  }
});

// Remove price list from package
router.delete("/value-packages/:packageId/price-lists/:priceListId", async (req: Request, res: Response) => {
  try {
    const { packageId, priceListId } = req.params;

    // Delete items first, then the association
    await db.execute(sql`
      DELETE FROM w3suite.commissioning_value_package_items 
      WHERE package_id = ${packageId} AND price_list_id = ${priceListId}
    `);

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_value_package_price_lists 
      WHERE package_id = ${packageId} AND price_list_id = ${priceListId}
    `);

    res.status(204).send();
  } catch (error) {
    logger.error("Error removing price list from package", { error });
    res.status(500).json({ error: "Failed to remove price list from package" });
  }
});

// Get products from a price list directly (for draft mode without packageId)
router.get("/price-lists/:priceListId/products-for-commissioning", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { priceListId } = req.params;

    // Get price list type to determine which table to query
    const priceListResult = await db.execute(sql`
      SELECT type FROM w3suite.price_lists WHERE id = ${priceListId} AND tenant_id = ${tenantId}
    `);

    if (priceListResult.rows.length === 0) {
      return res.status(404).json({ error: "Price list not found" });
    }

    const priceListType = (priceListResult.rows[0] as any).type;
    const isCanvas = priceListType === 'canvas';

    let productsQuery;
    if (isCanvas) {
      productsQuery = await db.execute(sql`
        SELECT 
          plic.id as price_list_item_id,
          plic.product_id,
          p.name as product_name,
          p.sku as product_sku,
          plic.monthly_fee as canone_listino,
          TRUE as is_canvas,
          NULL::uuid as item_id,
          NULL::integer as valenza,
          NULL::numeric as gettone_contrattuale,
          NULL::numeric as gettone_gara,
          NULL::numeric as canone_override,
          TRUE as canone_inherited,
          NULL::text as notes
        FROM w3suite.price_list_items_canvas plic
        LEFT JOIN w3suite.products p ON p.id = plic.product_id
        WHERE plic.price_list_id = ${priceListId} AND plic.is_active = true
        ORDER BY p.name ASC
      `);
    } else {
      productsQuery = await db.execute(sql`
        SELECT 
          pli.id as price_list_item_id,
          pli.product_id,
          p.name as product_name,
          p.sku as product_sku,
          NULL::numeric as canone_listino,
          FALSE as is_canvas,
          NULL::uuid as item_id,
          NULL::integer as valenza,
          NULL::numeric as gettone_contrattuale,
          NULL::numeric as gettone_gara,
          NULL::numeric as canone_override,
          NULL::boolean as canone_inherited,
          NULL::text as notes
        FROM w3suite.price_list_items pli
        LEFT JOIN w3suite.products p ON p.id = pli.product_id
        WHERE pli.price_list_id = ${priceListId} AND pli.is_active = true
        ORDER BY p.name ASC
      `);
    }

    res.json({
      priceListType,
      isCanvas,
      products: productsQuery.rows
    });
  } catch (error) {
    logger.error("Error fetching price list products for commissioning", { error });
    res.status(500).json({ error: "Failed to fetch price list products" });
  }
});

// Get products from a price list (for grid population)
router.get("/value-packages/:packageId/price-lists/:priceListId/products", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const { packageId, priceListId } = req.params;

    // Get price list type to determine which table to query
    const priceListResult = await db.execute(sql`
      SELECT type FROM w3suite.price_lists WHERE id = ${priceListId} AND tenant_id = ${tenantId}
    `);

    if (priceListResult.rows.length === 0) {
      return res.status(404).json({ error: "Price list not found" });
    }

    const priceListType = (priceListResult.rows[0] as any).type;
    const isCanvas = priceListType === 'canvas';

    let productsQuery;
    if (isCanvas) {
      // Canvas products with monthly_fee (canone)
      productsQuery = await db.execute(sql`
        SELECT 
          plic.id as price_list_item_id,
          plic.product_id,
          p.name as product_name,
          p.sku as product_sku,
          plic.monthly_fee as canone_listino,
          TRUE as is_canvas,
          vpi.id as item_id,
          vpi.valenza,
          vpi.gettone_contrattuale,
          vpi.gettone_gara,
          vpi.canone as canone_override,
          COALESCE(vpi.canone_inherited, true) as canone_inherited,
          vpi.notes
        FROM w3suite.price_list_items_canvas plic
        LEFT JOIN w3suite.products p ON p.id = plic.product_id
        LEFT JOIN w3suite.commissioning_value_package_items vpi 
          ON vpi.package_id = ${packageId} 
          AND vpi.price_list_id = ${priceListId} 
          AND vpi.product_id = plic.product_id
        WHERE plic.price_list_id = ${priceListId} AND plic.is_active = true
        ORDER BY p.name ASC
      `);
    } else {
      // Normal products
      productsQuery = await db.execute(sql`
        SELECT 
          pli.id as price_list_item_id,
          pli.product_id,
          p.name as product_name,
          p.sku as product_sku,
          NULL as canone_listino,
          FALSE as is_canvas,
          vpi.id as item_id,
          vpi.valenza,
          vpi.gettone_contrattuale,
          vpi.gettone_gara,
          NULL as canone_override,
          NULL as canone_inherited,
          vpi.notes
        FROM w3suite.price_list_items pli
        LEFT JOIN w3suite.products p ON p.id = pli.product_id
        LEFT JOIN w3suite.commissioning_value_package_items vpi 
          ON vpi.package_id = ${packageId} 
          AND vpi.price_list_id = ${priceListId} 
          AND vpi.product_id = pli.product_id
        WHERE pli.price_list_id = ${priceListId} AND pli.is_active = true
        ORDER BY p.name ASC
      `);
    }

    res.json({
      priceListType,
      isCanvas,
      products: productsQuery.rows
    });
  } catch (error) {
    logger.error("Error fetching price list products", { error });
    res.status(500).json({ error: "Failed to fetch price list products" });
  }
});

// Bulk update products for a price list
router.post("/value-packages/:packageId/price-lists/:priceListId/products/bulk", async (req: Request, res: Response) => {
  try {
    const { packageId, priceListId } = req.params;
    const { products } = req.body; // Array of { productId, valenza, gettoneContrattuale, gettoneGara, canone, canoneInherited, notes }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Products array required" });
    }

    const results = [];
    for (const product of products) {
      const { productId, priceListItemId, valenza, gettoneContrattuale, gettoneGara, canone, canoneInherited, notes } = product;
      
      const result = await db.execute(sql`
        INSERT INTO w3suite.commissioning_value_package_items 
        (package_id, price_list_id, product_id, price_list_item_id, valenza, gettone_contrattuale, gettone_gara, canone, canone_inherited, notes)
        VALUES (${packageId}, ${priceListId}, ${productId}, ${priceListItemId || null}, 
                ${valenza || null}, ${gettoneContrattuale || null}, ${gettoneGara || null}, 
                ${canone || null}, ${canoneInherited !== false}, ${notes || null})
        ON CONFLICT (package_id, price_list_id, product_id) DO UPDATE SET
          valenza = EXCLUDED.valenza,
          gettone_contrattuale = EXCLUDED.gettone_contrattuale,
          gettone_gara = EXCLUDED.gettone_gara,
          canone = EXCLUDED.canone,
          canone_inherited = EXCLUDED.canone_inherited,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `);
      results.push(result.rows[0]);
    }

    res.json({ updated: results.length, items: results });
  } catch (error) {
    logger.error("Error bulk updating products", { error });
    res.status(500).json({ error: "Failed to bulk update products" });
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

    const { search, dateFrom, dateTo, status } = req.query;
    
    // Build WHERE conditions
    let conditions = sql`(tenant_id = ${tenantId} OR tenant_id IS NULL)`;
    
    // Free text search on code, name, description, and rule_bundle variables
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions = sql`${conditions} AND (
        code ILIKE ${searchTerm} OR 
        name ILIKE ${searchTerm} OR 
        description ILIKE ${searchTerm} OR
        rule_bundle::text ILIKE ${searchTerm}
      )`;
    }
    
    // Date range filters
    if (dateFrom && typeof dateFrom === 'string') {
      conditions = sql`${conditions} AND created_at >= ${dateFrom}::timestamp`;
    }
    if (dateTo && typeof dateTo === 'string') {
      conditions = sql`${conditions} AND created_at <= ${dateTo}::timestamp + interval '1 day'`;
    }
    
    // Status filter: active, suspended, archived
    if (status && typeof status === 'string' && ['active', 'suspended', 'archived'].includes(status)) {
      conditions = sql`${conditions} AND status = ${status}`;
    }

    const result = await db.execute(sql`
      SELECT 
        id, tenant_id, code, name, description, 
        evaluation_mode, target_variable, rule_bundle,
        depends_on, sort_order, is_active, status,
        created_by, modified_by, created_at, updated_at
      FROM w3suite.commissioning_functions
      WHERE ${conditions}
      ORDER BY sort_order ASC, name ASC
    `);

    // Extract used variables from rule_bundle.conditions for each function
    const functions = result.rows.map((row: any) => {
      const usedVariables: string[] = [];
      try {
        const ruleBundle = row.rule_bundle || {};
        // Le condizioni sono direttamente in ruleBundle.conditions (non più in rules)
        const conditions = ruleBundle.conditions || [];
        for (const cond of conditions) {
          if (cond.variable && !usedVariables.includes(cond.variable)) {
            usedVariables.push(cond.variable);
          }
        }
      } catch (e) { /* ignore parse errors */ }
      
      return {
        ...row,
        usedVariables,
      };
    });

    res.json(functions);
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

    // Validate request body
    const parseResult = createFunctionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Dati non validi", 
        details: parseResult.error.flatten().fieldErrors 
      });
    }

    const { code, name, description, ruleBundle, dependsOn } = parseResult.data;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_functions 
      (tenant_id, code, name, description, rule_bundle, depends_on, created_by)
      VALUES (${tenantId}, ${code}, ${name}, ${description}, ${JSON.stringify(ruleBundle)}::jsonb, ${dependsOn || null}, ${userId})
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
    
    // Validate request body
    const parseResult = createFunctionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Dati non validi", 
        details: parseResult.error.flatten().fieldErrors 
      });
    }

    const { code, name, description, ruleBundle, dependsOn, isActive } = parseResult.data;

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_functions SET
        code = ${code}, name = ${name}, description = ${description},
        rule_bundle = ${JSON.stringify(ruleBundle)}::jsonb, depends_on = ${dependsOn || null},
        is_active = ${isActive},
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

// PATCH - Update status only (activate, suspend, archive)
router.patch("/functions/:id/status", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;
    const { action } = req.body; // 'activate' | 'suspend' | 'archive'

    if (!['activate', 'suspend', 'archive'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Use 'activate', 'suspend', or 'archive'" });
    }

    // Map action to status value
    const statusMap: Record<string, string> = {
      activate: 'active',
      suspend: 'suspended',
      archive: 'archived',
    };
    const newStatus = statusMap[action];
    const isActive = action === 'activate';

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_functions SET
        is_active = ${isActive},
        status = ${newStatus},
        modified_by = ${userId},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Function not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Error updating function status", { error });
    res.status(500).json({ error: "Failed to update function status" });
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

// ==================== CONFIGURATORS ====================

// Schema validation for configurator
const configuratorSchema = z.object({
  name: z.string().min(1).max(255),
  clusterId: z.string().uuid().optional().nullable(),
  driverIds: z.array(z.string().uuid()).optional().default([]),
  scopeType: z.enum(['RS', 'PDV', 'RISORSA']).optional().nullable(),
  scopeEntityIds: z.array(z.string().uuid()).optional().default([]),
  variableType: z.enum(['volumi', 'valore_prodotto', 'valore_vendita']).optional().nullable(),
  valuePackageId: z.string().uuid().optional().nullable(),
  paletti: z.any().optional().nullable(),
  rules: z.any().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// Helper to verify race belongs to tenant
async function verifyRaceAccess(raceId: string, tenantId: string) {
  const result = await db.execute(sql`
    SELECT id, tenant_id FROM w3suite.commissioning_races 
    WHERE id = ${raceId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
  `);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Helper to verify configurator belongs to tenant (via race)
async function verifyConfiguratorAccess(configuratorId: string, tenantId: string) {
  const result = await db.execute(sql`
    SELECT c.id, r.tenant_id FROM w3suite.commissioning_configurators c
    JOIN w3suite.commissioning_races r ON r.id = c.race_id
    WHERE c.id = ${configuratorId} AND (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
  `);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Helper to verify cluster belongs to tenant
async function verifyClusterAccess(clusterId: string, tenantId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT id FROM w3suite.commissioning_clusters 
    WHERE id = ${clusterId} AND tenant_id = ${tenantId}
  `);
  return result.rows.length > 0;
}

// Helper to verify scope entities belong to tenant based on scope type
async function verifyScopeEntities(scopeType: string | null | undefined, entityIds: string[], tenantId: string): Promise<boolean> {
  if (!scopeType || !entityIds || entityIds.length === 0) return true;
  
  let tableName: string;
  switch (scopeType) {
    case 'RS': tableName = 'w3suite.legal_entities'; break;
    case 'PDV': tableName = 'w3suite.stores'; break;
    case 'RISORSA': tableName = 'w3suite.users'; break;
    default: return true;
  }
  
  const result = await db.execute(sql`
    SELECT id FROM ${sql.raw(tableName)} 
    WHERE id = ANY(${entityIds}::uuid[]) AND tenant_id = ${tenantId}
  `);
  return result.rows.length === entityIds.length;
}

// Helper to verify driver IDs belong to the cluster
async function verifyDriverIds(driverIds: string[], tenantId: string): Promise<boolean> {
  if (!driverIds || driverIds.length === 0) return true;
  const result = await db.execute(sql`
    SELECT id FROM w3suite.commissioning_drivers 
    WHERE id = ANY(${driverIds}::uuid[]) AND tenant_id = ${tenantId}
  `);
  return result.rows.length === driverIds.length;
}

router.get("/races/:raceId/configurators", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { raceId } = req.params;

    const race = await verifyRaceAccess(raceId, tenantId);
    if (!race) return res.status(404).json({ error: "Race not found or access denied" });

    const result = await db.execute(sql`
      SELECT c.*, 
        cl.name as cluster_name, cl.entity_type as cluster_entity_type,
        vp.name as value_package_name, vp.code as value_package_code,
        (SELECT COUNT(*) FROM w3suite.commissioning_configurator_functions WHERE configurator_id = c.id) as functions_count
      FROM w3suite.commissioning_configurators c
      LEFT JOIN w3suite.commissioning_clusters cl ON cl.id = c.cluster_id
      LEFT JOIN w3suite.commissioning_value_packages vp ON vp.id = c.value_package_id
      WHERE c.race_id = ${raceId}
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching configurators", { error });
    res.status(500).json({ error: "Failed to fetch configurators" });
  }
});

router.get("/configurators/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { id } = req.params;

    const access = await verifyConfiguratorAccess(id, tenantId);
    if (!access) return res.status(404).json({ error: "Configurator not found or access denied" });

    const configResult = await db.execute(sql`
      SELECT c.*, 
        cl.name as cluster_name, cl.entity_type as cluster_entity_type,
        vp.name as value_package_name, vp.code as value_package_code
      FROM w3suite.commissioning_configurators c
      LEFT JOIN w3suite.commissioning_clusters cl ON cl.id = c.cluster_id
      LEFT JOIN w3suite.commissioning_value_packages vp ON vp.id = c.value_package_id
      WHERE c.id = ${id}
    `);

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: "Configurator not found" });
    }

    const functionsResult = await db.execute(sql`
      SELECT cf.*, f.name as function_name, f.code as function_code, f.target_variable
      FROM w3suite.commissioning_configurator_functions cf
      JOIN w3suite.commissioning_functions f ON f.id = cf.function_id
      WHERE cf.configurator_id = ${id}
      ORDER BY cf.sort_order ASC
    `);

    res.json({
      ...configResult.rows[0],
      functions: functionsResult.rows
    });
  } catch (error) {
    logger.error("Error fetching configurator", { error });
    res.status(500).json({ error: "Failed to fetch configurator" });
  }
});

router.post("/races/:raceId/configurators", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { raceId } = req.params;

    const race = await verifyRaceAccess(raceId, tenantId);
    if (!race) return res.status(404).json({ error: "Race not found or access denied" });
    if ((race as any).tenant_id === null) return res.status(403).json({ error: "Cannot modify brand-pushed races" });

    const parsed = configuratorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
    const { name, clusterId, driverIds, scopeType, scopeEntityIds, variableType, valuePackageId, paletti, rules, sortOrder } = parsed.data;

    // Verify cluster belongs to tenant if provided
    if (clusterId) {
      const clusterValid = await verifyClusterAccess(clusterId, tenantId);
      if (!clusterValid) return res.status(400).json({ error: "Cluster not found or access denied" });
    }

    // Verify scope entities belong to tenant
    if (scopeEntityIds && scopeEntityIds.length > 0) {
      const entitiesValid = await verifyScopeEntities(scopeType, scopeEntityIds, tenantId);
      if (!entitiesValid) return res.status(400).json({ error: "Some scope entities not found or access denied" });
    }

    // Verify driver IDs belong to tenant
    if (driverIds && driverIds.length > 0) {
      const driversValid = await verifyDriverIds(driverIds, tenantId);
      if (!driversValid) return res.status(400).json({ error: "Some drivers not found or access denied" });
    }

    // Verify value package belongs to tenant if provided
    if (valuePackageId) {
      const vpCheck = await db.execute(sql`SELECT id FROM w3suite.commissioning_value_packages WHERE id = ${valuePackageId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`);
      if (vpCheck.rows.length === 0) return res.status(400).json({ error: "Value package not found or access denied" });
    }

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_configurators 
      (race_id, name, cluster_id, driver_ids, scope_type, scope_entity_ids, variable_type, value_package_id, paletti, rules, sort_order)
      VALUES (${raceId}, ${name}, ${clusterId}, ${driverIds || []}::uuid[], ${scopeType}, ${scopeEntityIds || []}::uuid[], ${variableType}, ${valuePackageId}, ${paletti ? JSON.stringify(paletti) : null}::jsonb, ${rules ? JSON.stringify(rules) : null}::jsonb, ${sortOrder || 0})
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error creating configurator", { error });
    res.status(500).json({ error: "Failed to create configurator" });
  }
});

router.put("/configurators/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { id } = req.params;

    const access = await verifyConfiguratorAccess(id, tenantId);
    if (!access) return res.status(404).json({ error: "Configurator not found or access denied" });
    if ((access as any).tenant_id === null) return res.status(403).json({ error: "Cannot modify brand-pushed configurators" });

    const parsed = configuratorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
    const { name, clusterId, driverIds, scopeType, scopeEntityIds, variableType, valuePackageId, paletti, rules, sortOrder, isActive } = parsed.data;

    // Verify cluster belongs to tenant if provided
    if (clusterId) {
      const clusterValid = await verifyClusterAccess(clusterId, tenantId);
      if (!clusterValid) return res.status(400).json({ error: "Cluster not found or access denied" });
    }

    // Verify scope entities belong to tenant
    if (scopeEntityIds && scopeEntityIds.length > 0) {
      const entitiesValid = await verifyScopeEntities(scopeType, scopeEntityIds, tenantId);
      if (!entitiesValid) return res.status(400).json({ error: "Some scope entities not found or access denied" });
    }

    // Verify driver IDs belong to tenant
    if (driverIds && driverIds.length > 0) {
      const driversValid = await verifyDriverIds(driverIds, tenantId);
      if (!driversValid) return res.status(400).json({ error: "Some drivers not found or access denied" });
    }

    // Verify value package belongs to tenant if provided
    if (valuePackageId) {
      const vpCheck = await db.execute(sql`SELECT id FROM w3suite.commissioning_value_packages WHERE id = ${valuePackageId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`);
      if (vpCheck.rows.length === 0) return res.status(400).json({ error: "Value package not found or access denied" });
    }

    const result = await db.execute(sql`
      UPDATE w3suite.commissioning_configurators SET
        name = ${name}, cluster_id = ${clusterId}, driver_ids = ${driverIds || []}::uuid[],
        scope_type = ${scopeType}, scope_entity_ids = ${scopeEntityIds || []}::uuid[],
        variable_type = ${variableType}, value_package_id = ${valuePackageId},
        paletti = ${paletti ? JSON.stringify(paletti) : null}::jsonb,
        rules = ${rules ? JSON.stringify(rules) : null}::jsonb,
        sort_order = ${sortOrder || 0}, is_active = ${isActive !== false}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Configurator not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("Error updating configurator", { error });
    res.status(500).json({ error: "Failed to update configurator" });
  }
});

router.delete("/configurators/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { id } = req.params;

    const access = await verifyConfiguratorAccess(id, tenantId);
    if (!access) return res.status(404).json({ error: "Configurator not found or access denied" });
    if ((access as any).tenant_id === null) return res.status(403).json({ error: "Cannot delete brand-pushed configurators" });

    await db.execute(sql`DELETE FROM w3suite.commissioning_configurators WHERE id = ${id}`);

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting configurator", { error });
    res.status(500).json({ error: "Failed to delete configurator" });
  }
});

// Configurator-Functions link
router.get("/configurators/:configuratorId/functions", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { configuratorId } = req.params;

    const access = await verifyConfiguratorAccess(configuratorId, tenantId);
    if (!access) return res.status(404).json({ error: "Configurator not found or access denied" });

    const result = await db.execute(sql`
      SELECT cf.*, f.name as function_name, f.code as function_code, f.target_variable, f.evaluation_mode
      FROM w3suite.commissioning_configurator_functions cf
      JOIN w3suite.commissioning_functions f ON f.id = cf.function_id
      WHERE cf.configurator_id = ${configuratorId}
      ORDER BY cf.sort_order ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching configurator functions", { error });
    res.status(500).json({ error: "Failed to fetch configurator functions" });
  }
});

router.post("/configurators/:configuratorId/functions", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { configuratorId } = req.params;
    const { functionId, sortOrder } = req.body;

    if (!functionId) return res.status(400).json({ error: "functionId is required" });

    const access = await verifyConfiguratorAccess(configuratorId, tenantId);
    if (!access) return res.status(404).json({ error: "Configurator not found or access denied" });
    if ((access as any).tenant_id === null) return res.status(403).json({ error: "Cannot modify brand-pushed configurators" });

    // Verify function belongs to tenant
    const fnCheck = await db.execute(sql`SELECT id FROM w3suite.commissioning_functions WHERE id = ${functionId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`);
    if (fnCheck.rows.length === 0) return res.status(400).json({ error: "Function not found or access denied" });

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_configurator_functions (configurator_id, function_id, sort_order)
      VALUES (${configuratorId}, ${functionId}, ${sortOrder || 0})
      ON CONFLICT (configurator_id, function_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("Error adding function to configurator", { error });
    res.status(500).json({ error: "Failed to add function to configurator" });
  }
});

router.delete("/configurators/:configuratorId/functions/:functionId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { configuratorId, functionId } = req.params;

    const access = await verifyConfiguratorAccess(configuratorId, tenantId);
    if (!access) return res.status(404).json({ error: "Configurator not found or access denied" });
    if ((access as any).tenant_id === null) return res.status(403).json({ error: "Cannot modify brand-pushed configurators" });

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_configurator_functions 
      WHERE configurator_id = ${configuratorId} AND function_id = ${functionId}
    `);

    res.status(204).send();
  } catch (error) {
    logger.error("Error removing function from configurator", { error });
    res.status(500).json({ error: "Failed to remove function from configurator" });
  }
});

// Update configurator functions in bulk
router.put("/configurators/:configuratorId/functions", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { configuratorId } = req.params;
    const { functionIds } = req.body;

    const access = await verifyConfiguratorAccess(configuratorId, tenantId);
    if (!access) return res.status(404).json({ error: "Configurator not found or access denied" });
    if ((access as any).tenant_id === null) return res.status(403).json({ error: "Cannot modify brand-pushed configurators" });

    // Verify all functions belong to tenant
    if (functionIds && functionIds.length > 0) {
      const fnCheck = await db.execute(sql`SELECT id FROM w3suite.commissioning_functions WHERE id = ANY(${functionIds}::uuid[]) AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`);
      if (fnCheck.rows.length !== functionIds.length) return res.status(400).json({ error: "Some functions not found or access denied" });
    }

    await db.execute(sql`DELETE FROM w3suite.commissioning_configurator_functions WHERE configurator_id = ${configuratorId}`);

    if (functionIds && functionIds.length > 0) {
      for (let i = 0; i < functionIds.length; i++) {
        await db.execute(sql`
          INSERT INTO w3suite.commissioning_configurator_functions (configurator_id, function_id, sort_order)
          VALUES (${configuratorId}, ${functionIds[i]}, ${i})
        `);
      }
    }

    const result = await db.execute(sql`
      SELECT cf.*, f.name as function_name, f.code as function_code
      FROM w3suite.commissioning_configurator_functions cf
      JOIN w3suite.commissioning_functions f ON f.id = cf.function_id
      WHERE cf.configurator_id = ${configuratorId}
      ORDER BY cf.sort_order ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error("Error updating configurator functions", { error });
    res.status(500).json({ error: "Failed to update configurator functions" });
  }
});

// Entities endpoint for clusters - returns entities based on type
router.get("/entities", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    
    const { type } = req.query;
    let result;
    
    switch (type) {
      case 'RS':
        // Ragioni Sociali - Organization Entities
        result = await db.execute(sql`
          SELECT id, nome as name, codice as code
          FROM w3suite.organization_entities
          WHERE tenant_id = ${tenantId}
            AND stato = 'active'
          ORDER BY nome ASC
        `);
        break;
        
      case 'PDV':
        // Punti Vendita - Stores
        result = await db.execute(sql`
          SELECT id, nome as name, code
          FROM w3suite.stores
          WHERE tenant_id = ${tenantId}
            AND (status = 'active' OR status = 'Attivo')
          ORDER BY nome ASC
        `);
        break;
        
      case 'RISORSA':
        // Risorse - Users
        result = await db.execute(sql`
          SELECT id, COALESCE(first_name || ' ' || last_name, email) as name, email as code
          FROM w3suite.users
          WHERE tenant_id = ${tenantId}
            AND status = 'active'
          ORDER BY first_name, last_name ASC
        `);
        break;
        
      default:
        return res.status(400).json({ error: "Invalid entity type. Must be RS, PDV, or RISORSA" });
    }
    
    const entities = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code || null,
    }));
    
    res.json(entities);
  } catch (error) {
    logger.error("Error fetching entities for clusters", { error, type: req.query.type });
    res.status(500).json({ error: "Failed to fetch entities" });
  }
});

// ==================== ARCHITETTURA CONFIGURATORI 3 LIVELLI ====================

// Schema per creazione/update template configuratore
const createTemplateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  typeCode: z.string().min(1).max(50),
  primaryLayer: z.enum(['RS', 'PDV', 'USER']),
  availableDriverIds: z.array(z.string().uuid()).optional().nullable(),
  typeConfig: z.record(z.any()).optional().default({}),
  thresholdMode: z.enum(['progressive', 'regressive']).optional().nullable(),
  thresholdCount: z.number().min(1).max(20).optional().default(3),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
  sortOrder: z.number().optional().default(0),
});

// Schema per paletto
const createPalettoSchema = z.object({
  functionId: z.string().uuid(),
  layerOverride: z.enum(['RS', 'PDV', 'USER']).optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// Schema per CAP
const createCapSchema = z.object({
  functionId: z.string().uuid(),
  layerOverride: z.enum(['RS', 'PDV', 'USER']).optional().nullable(),
  behavior: z.enum(['block', 'scale']).default('block'),
  limitValue: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// Schema per istanza configuratore
const createInstanceSchema = z.object({
  raceId: z.string().uuid(),
  templateId: z.string().uuid(),
  name: z.string().optional().nullable(),
  instanceConfig: z.record(z.any()).optional().default({}),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional().default('active'),
  sortOrder: z.number().optional().default(0),
});

// Schema per cluster istanza
const createInstanceClusterSchema = z.object({
  name: z.string().min(1).max(255),
  entityType: z.enum(['RS', 'PDV', 'RISORSA']),
  activeDriverIds: z.array(z.string().uuid()).optional().nullable(),
  clusterConfig: z.record(z.any()).optional().default({}),
  valuePackageIds: z.array(z.string().uuid()).optional().nullable(),
  sortOrder: z.number().optional().default(0),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

// ==================== CONFIGURATOR TYPES (Livello 0 - Read Only) ====================

// GET /configurator-types - Lista tipi globali (read-only)
router.get("/configurator-types", async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT id, code, name, description, available_variables, ui_component, 
             wizard_steps, calculation_modes, supports_multiple_thresholds, 
             validation_rules, is_active, sort_order, created_at, updated_at
      FROM w3suite.commissioning_configurator_types
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `);

    const types = result.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      availableVariables: row.available_variables || [],
      uiComponent: row.ui_component,
      wizardSteps: row.wizard_steps || [],
      calculationModes: row.calculation_modes || [],
      supportsMultipleThresholds: row.supports_multiple_thresholds,
      validationRules: row.validation_rules || [],
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(types);
  } catch (error) {
    logger.error("Error fetching configurator types", { error });
    res.status(500).json({ error: "Failed to fetch configurator types" });
  }
});

// GET /configurator-types/:code - Dettaglio tipo
router.get("/configurator-types/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const result = await db.execute(sql`
      SELECT * FROM w3suite.commissioning_configurator_types
      WHERE code = ${code} AND is_active = true
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Configurator type not found" });
    }

    const row: any = result.rows[0];
    res.json({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      availableVariables: row.available_variables || [],
      uiComponent: row.ui_component,
      wizardSteps: row.wizard_steps || [],
      calculationModes: row.calculation_modes || [],
      supportsMultipleThresholds: row.supports_multiple_thresholds,
      validationRules: row.validation_rules || [],
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    logger.error("Error fetching configurator type", { error });
    res.status(500).json({ error: "Failed to fetch configurator type" });
  }
});

// ==================== CONFIGURATOR TEMPLATES (Livello 1 - RLS Mixed) ====================

// GET /configurator-templates - Lista template con RLS Mixed
router.get("/configurator-templates", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { typeCode, status, search } = req.query;

    const result = await db.execute(sql`
      SELECT t.*, ct.name as type_name,
             (SELECT COUNT(*) FROM w3suite.commissioning_template_paletti p WHERE p.template_id = t.id) as paletti_count,
             (SELECT COUNT(*) FROM w3suite.commissioning_template_caps c WHERE c.template_id = t.id) as caps_count
      FROM w3suite.commissioning_configurator_templates t
      LEFT JOIN w3suite.commissioning_configurator_types ct ON ct.code = t.type_code
      WHERE (t.tenant_id = ${tenantId} OR t.tenant_id IS NULL)
        ${typeCode ? sql`AND t.type_code = ${typeCode as string}` : sql``}
        ${status ? sql`AND t.status = ${status as string}` : sql``}
        ${search ? sql`AND (t.name ILIKE ${'%' + search + '%'} OR t.code ILIKE ${'%' + search + '%'})` : sql``}
      ORDER BY t.sort_order ASC, t.name ASC
    `);

    const templates = result.rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      code: row.code,
      name: row.name,
      description: row.description,
      typeCode: row.type_code,
      typeName: row.type_name,
      primaryLayer: row.primary_layer,
      availableDriverIds: row.available_driver_ids || [],
      typeConfig: row.type_config || {},
      thresholdMode: row.threshold_mode,
      thresholdCount: row.threshold_count,
      status: row.status,
      sortOrder: row.sort_order,
      palettiCount: parseInt(row.paletti_count) || 0,
      capsCount: parseInt(row.caps_count) || 0,
      isBrandPushed: row.tenant_id === null,
      createdBy: row.created_by,
      modifiedBy: row.modified_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(templates);
  } catch (error) {
    logger.error("Error fetching configurator templates", { error });
    res.status(500).json({ error: "Failed to fetch configurator templates" });
  }
});

// GET /configurator-templates/:id - Dettaglio template con paletti e CAP
router.get("/configurator-templates/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    const templateResult = await db.execute(sql`
      SELECT t.*, ct.name as type_name, ct.available_variables as type_variables,
             ct.calculation_modes, ct.supports_multiple_thresholds
      FROM w3suite.commissioning_configurator_templates t
      LEFT JOIN w3suite.commissioning_configurator_types ct ON ct.code = t.type_code
      WHERE t.id = ${id} AND (t.tenant_id = ${tenantId} OR t.tenant_id IS NULL)
    `);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    const palettiResult = await db.execute(sql`
      SELECT p.*, f.name as function_name, f.code as function_code
      FROM w3suite.commissioning_template_paletti p
      JOIN w3suite.commissioning_functions f ON f.id = p.function_id
      WHERE p.template_id = ${id}
      ORDER BY p.sort_order ASC
    `);

    const capsResult = await db.execute(sql`
      SELECT c.*, f.name as function_name, f.code as function_code
      FROM w3suite.commissioning_template_caps c
      JOIN w3suite.commissioning_functions f ON f.id = c.function_id
      WHERE c.template_id = ${id}
      ORDER BY c.sort_order ASC
    `);

    const row: any = templateResult.rows[0];
    res.json({
      id: row.id,
      tenantId: row.tenant_id,
      code: row.code,
      name: row.name,
      description: row.description,
      typeCode: row.type_code,
      typeName: row.type_name,
      typeVariables: row.type_variables || [],
      calculationModes: row.calculation_modes || [],
      supportsMultipleThresholds: row.supports_multiple_thresholds,
      primaryLayer: row.primary_layer,
      availableDriverIds: row.available_driver_ids || [],
      typeConfig: row.type_config || {},
      thresholdMode: row.threshold_mode,
      thresholdCount: row.threshold_count,
      status: row.status,
      sortOrder: row.sort_order,
      isBrandPushed: row.tenant_id === null,
      createdBy: row.created_by,
      modifiedBy: row.modified_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paletti: palettiResult.rows.map((p: any) => ({
        id: p.id,
        functionId: p.function_id,
        functionName: p.function_name,
        functionCode: p.function_code,
        layerOverride: p.layer_override,
        description: p.description,
        sortOrder: p.sort_order,
        isActive: p.is_active,
        createdAt: p.created_at,
      })),
      caps: capsResult.rows.map((c: any) => ({
        id: c.id,
        functionId: c.function_id,
        functionName: c.function_name,
        functionCode: c.function_code,
        layerOverride: c.layer_override,
        behavior: c.behavior,
        limitValue: c.limit_value ? parseFloat(c.limit_value) : null,
        description: c.description,
        sortOrder: c.sort_order,
        isActive: c.is_active,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    logger.error("Error fetching configurator template", { error });
    res.status(500).json({ error: "Failed to fetch configurator template" });
  }
});

// POST /configurator-templates - Crea template (solo custom tenant)
router.post("/configurator-templates", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const validation = createTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }

    const data = validation.data;

    // Verifica che il tipo esista
    const typeCheck = await db.execute(sql`
      SELECT code FROM w3suite.commissioning_configurator_types WHERE code = ${data.typeCode} AND is_active = true
    `);
    if (typeCheck.rows.length === 0) {
      return res.status(400).json({ error: "Invalid configurator type code" });
    }

    // Verifica unicità codice per tenant
    const codeCheck = await db.execute(sql`
      SELECT id FROM w3suite.commissioning_configurator_templates 
      WHERE tenant_id = ${tenantId} AND code = ${data.code}
    `);
    if (codeCheck.rows.length > 0) {
      return res.status(400).json({ error: "Template code already exists for this tenant" });
    }

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_configurator_templates 
      (tenant_id, code, name, description, type_code, primary_layer, available_driver_ids, 
       type_config, threshold_mode, threshold_count, status, sort_order, created_by)
      VALUES (${tenantId}, ${data.code}, ${data.name}, ${data.description || null}, 
              ${data.typeCode}, ${data.primaryLayer}, ${data.availableDriverIds || null}, 
              ${JSON.stringify(data.typeConfig)}, ${data.thresholdMode || null}, 
              ${data.thresholdCount}, ${data.status}, ${data.sortOrder}, ${userId || null})
      RETURNING id
    `);

    const templateId = (result.rows[0] as any).id;
    
    res.status(201).json({ id: templateId, message: "Template created successfully" });
  } catch (error) {
    logger.error("Error creating configurator template", { error });
    res.status(500).json({ error: "Failed to create configurator template" });
  }
});

// PUT /configurator-templates/:id - Aggiorna template (solo custom tenant)
router.put("/configurator-templates/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    // Verifica che il template sia custom (non brand-pushed)
    const templateCheck = await db.execute(sql`
      SELECT tenant_id FROM w3suite.commissioning_configurator_templates WHERE id = ${id}
    `);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    if ((templateCheck.rows[0] as any).tenant_id === null) {
      return res.status(403).json({ error: "Cannot modify brand-pushed template" });
    }
    if ((templateCheck.rows[0] as any).tenant_id !== tenantId) {
      return res.status(403).json({ error: "Template belongs to another tenant" });
    }

    const validation = createTemplateSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }

    const data = validation.data;

    await db.execute(sql`
      UPDATE w3suite.commissioning_configurator_templates SET
        name = COALESCE(${data.name}, name),
        description = COALESCE(${data.description}, description),
        primary_layer = COALESCE(${data.primaryLayer}, primary_layer),
        available_driver_ids = COALESCE(${data.availableDriverIds || null}, available_driver_ids),
        type_config = COALESCE(${data.typeConfig ? JSON.stringify(data.typeConfig) : null}, type_config),
        threshold_mode = COALESCE(${data.thresholdMode || null}, threshold_mode),
        threshold_count = COALESCE(${data.thresholdCount}, threshold_count),
        status = COALESCE(${data.status}, status),
        sort_order = COALESCE(${data.sortOrder}, sort_order),
        modified_by = ${userId || null},
        updated_at = now()
      WHERE id = ${id}
    `);

    res.json({ message: "Template updated successfully" });
  } catch (error) {
    logger.error("Error updating configurator template", { error });
    res.status(500).json({ error: "Failed to update configurator template" });
  }
});

// DELETE /configurator-templates/:id - Elimina template (solo custom tenant)
router.delete("/configurator-templates/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    // Verifica che il template sia custom
    const templateCheck = await db.execute(sql`
      SELECT tenant_id FROM w3suite.commissioning_configurator_templates WHERE id = ${id}
    `);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    if ((templateCheck.rows[0] as any).tenant_id === null) {
      return res.status(403).json({ error: "Cannot delete brand-pushed template" });
    }
    if ((templateCheck.rows[0] as any).tenant_id !== tenantId) {
      return res.status(403).json({ error: "Template belongs to another tenant" });
    }

    // Verifica che non ci siano istanze attive che usano questo template
    const instanceCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM w3suite.commissioning_configurator_instances 
      WHERE template_id = ${id} AND status IN ('draft', 'active')
    `);
    if (parseInt((instanceCheck.rows[0] as any).count) > 0) {
      return res.status(400).json({ error: "Cannot delete template with active instances" });
    }

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_configurator_templates WHERE id = ${id}
    `);

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    logger.error("Error deleting configurator template", { error });
    res.status(500).json({ error: "Failed to delete configurator template" });
  }
});

// ==================== TEMPLATE PALETTI ====================

// POST /configurator-templates/:id/paletti - Aggiungi paletto
router.post("/configurator-templates/:id/paletti", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    // Verifica template custom
    const templateCheck = await db.execute(sql`
      SELECT tenant_id FROM w3suite.commissioning_configurator_templates WHERE id = ${id}
    `);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    if ((templateCheck.rows[0] as any).tenant_id === null) {
      return res.status(403).json({ error: "Cannot modify brand-pushed template" });
    }

    const validation = createPalettoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }

    const data = validation.data;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_template_paletti 
      (template_id, function_id, layer_override, description, sort_order, is_active)
      VALUES (${id}, ${data.functionId}, ${data.layerOverride || null}, 
              ${data.description || null}, ${data.sortOrder}, ${data.isActive})
      RETURNING id
    `);

    res.status(201).json({ id: (result.rows[0] as any).id, message: "Paletto added successfully" });
  } catch (error) {
    logger.error("Error adding template paletto", { error });
    res.status(500).json({ error: "Failed to add paletto" });
  }
});

// DELETE /configurator-templates/:templateId/paletti/:palettoId
router.delete("/configurator-templates/:templateId/paletti/:palettoId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { templateId, palettoId } = req.params;

    // Verifica template custom
    const templateCheck = await db.execute(sql`
      SELECT tenant_id FROM w3suite.commissioning_configurator_templates WHERE id = ${templateId}
    `);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    if ((templateCheck.rows[0] as any).tenant_id === null) {
      return res.status(403).json({ error: "Cannot modify brand-pushed template" });
    }

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_template_paletti WHERE id = ${palettoId} AND template_id = ${templateId}
    `);

    res.json({ message: "Paletto deleted successfully" });
  } catch (error) {
    logger.error("Error deleting template paletto", { error });
    res.status(500).json({ error: "Failed to delete paletto" });
  }
});

// ==================== TEMPLATE CAPS ====================

// POST /configurator-templates/:id/caps - Aggiungi CAP
router.post("/configurator-templates/:id/caps", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    // Verifica template custom
    const templateCheck = await db.execute(sql`
      SELECT tenant_id FROM w3suite.commissioning_configurator_templates WHERE id = ${id}
    `);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    if ((templateCheck.rows[0] as any).tenant_id === null) {
      return res.status(403).json({ error: "Cannot modify brand-pushed template" });
    }

    const validation = createCapSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }

    const data = validation.data;

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_template_caps 
      (template_id, function_id, layer_override, behavior, limit_value, description, sort_order, is_active)
      VALUES (${id}, ${data.functionId}, ${data.layerOverride || null}, ${data.behavior}, 
              ${data.limitValue || null}, ${data.description || null}, ${data.sortOrder}, ${data.isActive})
      RETURNING id
    `);

    res.status(201).json({ id: (result.rows[0] as any).id, message: "CAP added successfully" });
  } catch (error) {
    logger.error("Error adding template CAP", { error });
    res.status(500).json({ error: "Failed to add CAP" });
  }
});

// DELETE /configurator-templates/:templateId/caps/:capId
router.delete("/configurator-templates/:templateId/caps/:capId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { templateId, capId } = req.params;

    // Verifica template custom
    const templateCheck = await db.execute(sql`
      SELECT tenant_id FROM w3suite.commissioning_configurator_templates WHERE id = ${templateId}
    `);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    if ((templateCheck.rows[0] as any).tenant_id === null) {
      return res.status(403).json({ error: "Cannot modify brand-pushed template" });
    }

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_template_caps WHERE id = ${capId} AND template_id = ${templateId}
    `);

    res.json({ message: "CAP deleted successfully" });
  } catch (error) {
    logger.error("Error deleting template CAP", { error });
    res.status(500).json({ error: "Failed to delete CAP" });
  }
});

// ==================== CONFIGURATOR INSTANCES (Livello 2) ====================

// GET /configurator-instances - Lista istanze per gara
router.get("/configurator-instances", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { raceId } = req.query;
    if (!raceId) {
      return res.status(400).json({ error: "raceId query parameter required" });
    }

    const result = await db.execute(sql`
      SELECT i.*, t.name as template_name, t.type_code, t.primary_layer,
             (SELECT COUNT(*) FROM w3suite.commissioning_instance_clusters c WHERE c.instance_id = i.id) as clusters_count
      FROM w3suite.commissioning_configurator_instances i
      JOIN w3suite.commissioning_configurator_templates t ON t.id = i.template_id
      JOIN w3suite.commissioning_races r ON r.id = i.race_id
      WHERE i.race_id = ${raceId as string}
        AND (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
      ORDER BY i.sort_order ASC, i.created_at DESC
    `);

    const instances = result.rows.map((row: any) => ({
      id: row.id,
      raceId: row.race_id,
      templateId: row.template_id,
      templateName: row.template_name,
      typeCode: row.type_code,
      primaryLayer: row.primary_layer,
      name: row.name,
      instanceConfig: row.instance_config || {},
      status: row.status,
      sortOrder: row.sort_order,
      clustersCount: parseInt(row.clusters_count) || 0,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(instances);
  } catch (error) {
    logger.error("Error fetching configurator instances", { error });
    res.status(500).json({ error: "Failed to fetch configurator instances" });
  }
});

// GET /configurator-instances/:id - Dettaglio istanza con cluster
router.get("/configurator-instances/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    const instanceResult = await db.execute(sql`
      SELECT i.*, t.name as template_name, t.type_code, t.primary_layer, 
             t.type_config as template_config, t.threshold_mode, t.threshold_count
      FROM w3suite.commissioning_configurator_instances i
      JOIN w3suite.commissioning_configurator_templates t ON t.id = i.template_id
      JOIN w3suite.commissioning_races r ON r.id = i.race_id
      WHERE i.id = ${id} AND (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
    `);

    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: "Instance not found" });
    }

    const clustersResult = await db.execute(sql`
      SELECT c.*,
             (SELECT json_agg(json_build_object('id', m.id, 'entityId', m.entity_id, 'entityType', m.entity_type))
              FROM w3suite.commissioning_instance_cluster_members m WHERE m.cluster_id = c.id) as members
      FROM w3suite.commissioning_instance_clusters c
      WHERE c.instance_id = ${id}
      ORDER BY c.sort_order ASC
    `);

    const row: any = instanceResult.rows[0];
    res.json({
      id: row.id,
      raceId: row.race_id,
      templateId: row.template_id,
      templateName: row.template_name,
      typeCode: row.type_code,
      primaryLayer: row.primary_layer,
      templateConfig: row.template_config || {},
      thresholdMode: row.threshold_mode,
      thresholdCount: row.threshold_count,
      name: row.name,
      instanceConfig: row.instance_config || {},
      status: row.status,
      sortOrder: row.sort_order,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      clusters: clustersResult.rows.map((c: any) => ({
        id: c.id,
        name: c.name,
        entityType: c.entity_type,
        activeDriverIds: c.active_driver_ids || [],
        clusterConfig: c.cluster_config || {},
        valuePackageIds: c.value_package_ids || [],
        sortOrder: c.sort_order,
        isActive: c.is_active,
        members: c.members || [],
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error) {
    logger.error("Error fetching configurator instance", { error });
    res.status(500).json({ error: "Failed to fetch configurator instance" });
  }
});

// POST /configurator-instances - Crea istanza
router.post("/configurator-instances", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const validation = createInstanceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }

    const data = validation.data;

    // Verifica che la gara sia del tenant o accessibile
    const raceCheck = await db.execute(sql`
      SELECT tenant_id FROM w3suite.commissioning_races WHERE id = ${data.raceId}
    `);
    if (raceCheck.rows.length === 0) {
      return res.status(404).json({ error: "Race not found" });
    }
    const raceTenantId = (raceCheck.rows[0] as any).tenant_id;
    if (raceTenantId !== null && raceTenantId !== tenantId) {
      return res.status(403).json({ error: "Race belongs to another tenant" });
    }

    // Verifica che il template esista e sia accessibile
    const templateCheck = await db.execute(sql`
      SELECT id FROM w3suite.commissioning_configurator_templates 
      WHERE id = ${data.templateId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
    `);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: "Template not found or not accessible" });
    }

    const result = await db.execute(sql`
      INSERT INTO w3suite.commissioning_configurator_instances 
      (race_id, template_id, name, instance_config, status, sort_order, created_by)
      VALUES (${data.raceId}, ${data.templateId}, ${data.name || null}, 
              ${JSON.stringify(data.instanceConfig)}, ${data.status}, ${data.sortOrder}, ${userId || null})
      RETURNING id
    `);

    res.status(201).json({ id: (result.rows[0] as any).id, message: "Instance created successfully" });
  } catch (error) {
    logger.error("Error creating configurator instance", { error });
    res.status(500).json({ error: "Failed to create configurator instance" });
  }
});

// DELETE /configurator-instances/:id
router.delete("/configurator-instances/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    // Verifica che la gara sia del tenant
    const instanceCheck = await db.execute(sql`
      SELECT r.tenant_id FROM w3suite.commissioning_configurator_instances i
      JOIN w3suite.commissioning_races r ON r.id = i.race_id
      WHERE i.id = ${id}
    `);
    if (instanceCheck.rows.length === 0) {
      return res.status(404).json({ error: "Instance not found" });
    }
    const raceTenantId = (instanceCheck.rows[0] as any).tenant_id;
    if (raceTenantId !== null && raceTenantId !== tenantId) {
      return res.status(403).json({ error: "Instance belongs to another tenant" });
    }

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_configurator_instances WHERE id = ${id}
    `);

    res.json({ message: "Instance deleted successfully" });
  } catch (error) {
    logger.error("Error deleting configurator instance", { error });
    res.status(500).json({ error: "Failed to delete configurator instance" });
  }
});

// ==================== INSTANCE CLUSTERS ====================

// POST /configurator-instances/:id/clusters - Aggiungi cluster con membri
router.post("/configurator-instances/:id/clusters", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { id } = req.params;

    const validation = createInstanceClusterSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }

    const data = validation.data;

    // Crea cluster
    const clusterResult = await db.execute(sql`
      INSERT INTO w3suite.commissioning_instance_clusters 
      (instance_id, name, entity_type, active_driver_ids, cluster_config, value_package_ids, sort_order)
      VALUES (${id}, ${data.name}, ${data.entityType}, ${data.activeDriverIds || null}, 
              ${JSON.stringify(data.clusterConfig)}, ${data.valuePackageIds || null}, ${data.sortOrder})
      RETURNING id
    `);

    const clusterId = (clusterResult.rows[0] as any).id;

    // Aggiungi membri
    if (data.memberIds && data.memberIds.length > 0) {
      for (const memberId of data.memberIds) {
        await db.execute(sql`
          INSERT INTO w3suite.commissioning_instance_cluster_members (cluster_id, entity_id, entity_type)
          VALUES (${clusterId}, ${memberId}, ${data.entityType})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    res.status(201).json({ id: clusterId, message: "Cluster created successfully" });
  } catch (error) {
    logger.error("Error creating instance cluster", { error });
    res.status(500).json({ error: "Failed to create cluster" });
  }
});

// PUT /configurator-instances/:instanceId/clusters/:clusterId - Aggiorna cluster
router.put("/configurator-instances/:instanceId/clusters/:clusterId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { instanceId, clusterId } = req.params;

    const validation = createInstanceClusterSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.errors });
    }

    const data = validation.data;

    // Aggiorna cluster
    await db.execute(sql`
      UPDATE w3suite.commissioning_instance_clusters SET
        name = COALESCE(${data.name}, name),
        active_driver_ids = COALESCE(${data.activeDriverIds || null}, active_driver_ids),
        cluster_config = COALESCE(${data.clusterConfig ? JSON.stringify(data.clusterConfig) : null}, cluster_config),
        value_package_ids = COALESCE(${data.valuePackageIds || null}, value_package_ids),
        sort_order = COALESCE(${data.sortOrder}, sort_order),
        updated_at = now()
      WHERE id = ${clusterId} AND instance_id = ${instanceId}
    `);

    // Aggiorna membri se forniti
    if (data.memberIds !== undefined) {
      // Rimuovi vecchi membri
      await db.execute(sql`
        DELETE FROM w3suite.commissioning_instance_cluster_members WHERE cluster_id = ${clusterId}
      `);
      // Aggiungi nuovi membri
      if (data.memberIds && data.memberIds.length > 0) {
        for (const memberId of data.memberIds) {
          await db.execute(sql`
            INSERT INTO w3suite.commissioning_instance_cluster_members (cluster_id, entity_id, entity_type)
            VALUES (${clusterId}, ${memberId}, ${data.entityType || 'USER'})
            ON CONFLICT DO NOTHING
          `);
        }
      }
    }

    res.json({ message: "Cluster updated successfully" });
  } catch (error) {
    logger.error("Error updating instance cluster", { error });
    res.status(500).json({ error: "Failed to update cluster" });
  }
});

// DELETE /configurator-instances/:instanceId/clusters/:clusterId
router.delete("/configurator-instances/:instanceId/clusters/:clusterId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required" });
    }

    const { instanceId, clusterId } = req.params;

    await db.execute(sql`
      DELETE FROM w3suite.commissioning_instance_clusters 
      WHERE id = ${clusterId} AND instance_id = ${instanceId}
    `);

    res.json({ message: "Cluster deleted successfully" });
  } catch (error) {
    logger.error("Error deleting instance cluster", { error });
    res.status(500).json({ error: "Failed to delete cluster" });
  }
});

export default router;
