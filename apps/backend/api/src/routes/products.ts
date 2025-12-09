import { Router } from "express";
import { db, setTenantContext } from "../core/db";
import { eq, and, ilike, or, sql, inArray } from "drizzle-orm";
import { 
  drivers,
  driverCategoryMappings,
  wmsCategories,
  wmsProductTypes
} from "../db/schema/w3suite";
import { tenantMiddleware } from "../middleware/tenant";

const router = Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

/**
 * GET /api/products/drivers
 * Get all drivers (brand + tenant custom) with RLS
 */
router.get("/drivers", async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant context required" });
    }

    await setTenantContext(tenantId);

    // Get all drivers for tenant (both brand-pushed and custom)
    const driversList = await db
      .select({
        id: drivers.id,
        code: drivers.code,
        name: drivers.name,
        description: drivers.description,
        icon: drivers.icon,
        allowedProductTypes: drivers.allowedProductTypes,
        source: drivers.source,
        isBrandSynced: drivers.isBrandSynced,
        isActive: drivers.isActive,
        sortOrder: drivers.sortOrder,
      })
      .from(drivers)
      .where(and(
        eq(drivers.tenantId, tenantId),
        eq(drivers.isActive, true)
      ))
      .orderBy(drivers.sortOrder, drivers.name);

    res.json(driversList);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

/**
 * GET /api/products/drivers/:driverId/categories
 * Get WMS categories linked to a driver via mappings
 * Uses driver's allowedProductTypes to filter categories
 */
router.get("/drivers/:driverId/categories", async (req, res) => {
  try {
    const { driverId } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant context required" });
    }

    await setTenantContext(tenantId);

    // First get the driver to know its allowedProductTypes
    const [driver] = await db
      .select({
        id: drivers.id,
        allowedProductTypes: drivers.allowedProductTypes,
      })
      .from(drivers)
      .where(and(
        eq(drivers.tenantId, tenantId),
        eq(drivers.id, driverId)
      ))
      .limit(1);

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Get categories that match the driver's allowedProductTypes
    const productTypes = driver.allowedProductTypes || [];
    
    if (productTypes.length === 0) {
      return res.json([]);
    }

    // Query categories filtered by productType
    const categories = await db
      .select({
        id: wmsCategories.id,
        nome: wmsCategories.nome,
        descrizione: wmsCategories.descrizione,
        icona: wmsCategories.icona,
        productType: wmsCategories.productType,
        source: wmsCategories.source,
        ordine: wmsCategories.ordine,
      })
      .from(wmsCategories)
      .where(and(
        eq(wmsCategories.tenantId, tenantId),
        eq(wmsCategories.isActive, true),
        inArray(wmsCategories.productType, productTypes as any)
      ))
      .orderBy(wmsCategories.ordine, wmsCategories.nome);

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * GET /api/products/categories/:categoryId/typologies
 * Get typologies (wmsProductTypes) for a specific category
 */
router.get("/categories/:categoryId/typologies", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant context required" });
    }

    await setTenantContext(tenantId);

    // Get typologies for this category
    const typologies = await db
      .select({
        id: wmsProductTypes.id,
        categoryId: wmsProductTypes.categoryId,
        nome: wmsProductTypes.nome,
        descrizione: wmsProductTypes.descrizione,
        source: wmsProductTypes.source,
        ordine: wmsProductTypes.ordine,
      })
      .from(wmsProductTypes)
      .where(and(
        eq(wmsProductTypes.tenantId, tenantId),
        eq(wmsProductTypes.categoryId, categoryId),
        eq(wmsProductTypes.isActive, true)
      ))
      .orderBy(wmsProductTypes.ordine, wmsProductTypes.nome);

    res.json(typologies);
  } catch (error) {
    console.error("Error fetching typologies:", error);
    res.status(500).json({ error: "Failed to fetch typologies" });
  }
});

/**
 * GET /api/products/drivers/:driverId/mappings
 * Get driver-category-typology mappings for a specific driver
 */
router.get("/drivers/:driverId/mappings", async (req, res) => {
  try {
    const { driverId } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant context required" });
    }

    await setTenantContext(tenantId);

    // Get mappings with joined category and typology names
    const mappings = await db
      .select({
        id: driverCategoryMappings.id,
        driverId: driverCategoryMappings.driverId,
        productType: driverCategoryMappings.productType,
        categoryId: driverCategoryMappings.categoryId,
        categoryName: wmsCategories.nome,
        typologyId: driverCategoryMappings.typologyId,
        typologyName: wmsProductTypes.nome,
        source: driverCategoryMappings.source,
        isActive: driverCategoryMappings.isActive,
      })
      .from(driverCategoryMappings)
      .leftJoin(wmsCategories, and(
        eq(wmsCategories.tenantId, driverCategoryMappings.tenantId),
        eq(wmsCategories.id, driverCategoryMappings.categoryId)
      ))
      .leftJoin(wmsProductTypes, and(
        eq(wmsProductTypes.tenantId, driverCategoryMappings.tenantId),
        eq(wmsProductTypes.id, driverCategoryMappings.typologyId)
      ))
      .where(and(
        eq(driverCategoryMappings.tenantId, tenantId),
        eq(driverCategoryMappings.driverId, driverId),
        eq(driverCategoryMappings.isActive, true)
      ));

    res.json(mappings);
  } catch (error) {
    console.error("Error fetching driver mappings:", error);
    res.status(500).json({ error: "Failed to fetch driver mappings" });
  }
});

/**
 * GET /api/products/search
 * Search product hierarchy by term (drivers, categories, typologies)
 */
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    const tenantId = req.user?.tenantId;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }

    if (!tenantId) {
      return res.status(401).json({ error: "Tenant context required" });
    }

    await setTenantContext(tenantId);

    const searchTerm = `%${q}%`;
    const results: any = {
      drivers: [],
      categories: [],
      typologies: [],
    };

    // Search drivers
    results.drivers = await db
      .select({
        id: drivers.id,
        code: drivers.code,
        name: drivers.name,
        description: drivers.description,
        source: drivers.source,
        level: sql<string>`'driver'`,
      })
      .from(drivers)
      .where(
        and(
          eq(drivers.tenantId, tenantId),
          eq(drivers.isActive, true),
          or(
            ilike(drivers.name, searchTerm),
            ilike(drivers.code, searchTerm),
            ilike(drivers.description, searchTerm)
          )
        )
      );

    // Search categories
    results.categories = await db
      .select({
        id: wmsCategories.id,
        nome: wmsCategories.nome,
        descrizione: wmsCategories.descrizione,
        productType: wmsCategories.productType,
        source: wmsCategories.source,
        level: sql<string>`'category'`,
      })
      .from(wmsCategories)
      .where(
        and(
          eq(wmsCategories.tenantId, tenantId),
          eq(wmsCategories.isActive, true),
          or(
            ilike(wmsCategories.nome, searchTerm),
            ilike(wmsCategories.descrizione, searchTerm)
          )
        )
      );

    // Search typologies
    results.typologies = await db
      .select({
        id: wmsProductTypes.id,
        categoryId: wmsProductTypes.categoryId,
        nome: wmsProductTypes.nome,
        descrizione: wmsProductTypes.descrizione,
        source: wmsProductTypes.source,
        level: sql<string>`'typology'`,
      })
      .from(wmsProductTypes)
      .where(
        and(
          eq(wmsProductTypes.tenantId, tenantId),
          eq(wmsProductTypes.isActive, true),
          or(
            ilike(wmsProductTypes.nome, searchTerm),
            ilike(wmsProductTypes.descrizione, searchTerm)
          )
        )
      );

    res.json(results);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
});

export default router;
