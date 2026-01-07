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

export default router;
