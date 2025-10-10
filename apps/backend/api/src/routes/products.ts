import { Router } from "express";
import { db } from "../core/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { 
  drivers, 
  driverCategories, 
  driverTypologies 
} from "../db/schema/public";
import { 
  tenantCustomDrivers, 
  tenantDriverCategories, 
  tenantDriverTypologies 
} from "../db/schema/w3suite";
import { tenantMiddleware } from "../middleware/tenant";

const router = Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

/**
 * GET /api/products/drivers
 * Get all drivers (brand official + tenant custom)
 */
router.get("/drivers", async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    // Get brand official drivers
    const brandDrivers = await db
      .select({
        id: drivers.id,
        code: drivers.code,
        name: drivers.name,
        description: drivers.description,
        active: drivers.active,
        sortOrder: drivers.sortOrder,
        type: sql<string>`'brand'`,
      })
      .from(drivers)
      .where(eq(drivers.active, true))
      .orderBy(drivers.sortOrder, drivers.name);

    // Get tenant custom drivers if tenantId exists
    let customDrivers: any[] = [];
    if (tenantId) {
      customDrivers = await db
        .select({
          id: tenantCustomDrivers.id,
          code: tenantCustomDrivers.code,
          name: tenantCustomDrivers.name,
          description: tenantCustomDrivers.description,
          active: tenantCustomDrivers.active,
          sortOrder: tenantCustomDrivers.sortOrder,
          type: sql<string>`'custom'`,
        })
        .from(tenantCustomDrivers)
        .where(
          and(
            eq(tenantCustomDrivers.tenantId, tenantId),
            eq(tenantCustomDrivers.active, true)
          )
        )
        .orderBy(tenantCustomDrivers.sortOrder, tenantCustomDrivers.name);
    }

    // Combine and return
    const allDrivers = [...brandDrivers, ...customDrivers].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );

    res.json(allDrivers);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

/**
 * GET /api/products/drivers/:driverId/categories
 * Get categories for a specific driver (brand or custom)
 */
router.get("/drivers/:driverId/categories", async (req, res) => {
  try {
    const { driverId } = req.params;
    const tenantId = req.user?.tenantId;

    // Check if it's a brand driver or custom driver
    const isBrandDriver = await db
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);

    let categories: any[] = [];

    if (isBrandDriver.length > 0) {
      // Get brand categories
      categories = await db
        .select({
          id: driverCategories.id,
          driverId: driverCategories.driverId,
          code: driverCategories.code,
          name: driverCategories.name,
          description: driverCategories.description,
          active: driverCategories.active,
          sortOrder: driverCategories.sortOrder,
          type: sql<string>`'brand'`,
        })
        .from(driverCategories)
        .where(
          and(
            eq(driverCategories.driverId, driverId),
            eq(driverCategories.active, true)
          )
        )
        .orderBy(driverCategories.sortOrder, driverCategories.name);
    } else if (tenantId) {
      // Get tenant custom categories
      categories = await db
        .select({
          id: tenantDriverCategories.id,
          customDriverId: tenantDriverCategories.customDriverId,
          code: tenantDriverCategories.code,
          name: tenantDriverCategories.name,
          description: tenantDriverCategories.description,
          active: tenantDriverCategories.active,
          sortOrder: tenantDriverCategories.sortOrder,
          type: sql<string>`'custom'`,
        })
        .from(tenantDriverCategories)
        .where(
          and(
            eq(tenantDriverCategories.tenantId, tenantId),
            eq(tenantDriverCategories.customDriverId, driverId),
            eq(tenantDriverCategories.active, true)
          )
        )
        .orderBy(tenantDriverCategories.sortOrder, tenantDriverCategories.name);
    }

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * GET /api/products/categories/:categoryId/typologies
 * Get typologies for a specific category (brand or custom)
 */
router.get("/categories/:categoryId/typologies", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const tenantId = req.user?.tenantId;

    // Check if it's a brand category or custom category
    const isBrandCategory = await db
      .select({ id: driverCategories.id })
      .from(driverCategories)
      .where(eq(driverCategories.id, categoryId))
      .limit(1);

    let typologies: any[] = [];

    if (isBrandCategory.length > 0) {
      // Get brand typologies
      typologies = await db
        .select({
          id: driverTypologies.id,
          categoryId: driverTypologies.categoryId,
          code: driverTypologies.code,
          name: driverTypologies.name,
          description: driverTypologies.description,
          active: driverTypologies.active,
          sortOrder: driverTypologies.sortOrder,
          type: sql<string>`'brand'`,
        })
        .from(driverTypologies)
        .where(
          and(
            eq(driverTypologies.categoryId, categoryId),
            eq(driverTypologies.active, true)
          )
        )
        .orderBy(driverTypologies.sortOrder, driverTypologies.name);
    } else if (tenantId) {
      // Get tenant custom typologies
      typologies = await db
        .select({
          id: tenantDriverTypologies.id,
          customCategoryId: tenantDriverTypologies.customCategoryId,
          code: tenantDriverTypologies.code,
          name: tenantDriverTypologies.name,
          description: tenantDriverTypologies.description,
          active: tenantDriverTypologies.active,
          sortOrder: tenantDriverTypologies.sortOrder,
          type: sql<string>`'custom'`,
        })
        .from(tenantDriverTypologies)
        .where(
          and(
            eq(tenantDriverTypologies.tenantId, tenantId),
            eq(tenantDriverTypologies.customCategoryId, categoryId),
            eq(tenantDriverTypologies.active, true)
          )
        )
        .orderBy(tenantDriverTypologies.sortOrder, tenantDriverTypologies.name);
    }

    res.json(typologies);
  } catch (error) {
    console.error("Error fetching typologies:", error);
    res.status(500).json({ error: "Failed to fetch typologies" });
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

    const searchTerm = `%${q}%`;
    const results: any = {
      drivers: [],
      categories: [],
      typologies: [],
    };

    // Search brand drivers
    results.drivers = await db
      .select({
        id: drivers.id,
        code: drivers.code,
        name: drivers.name,
        description: drivers.description,
        type: sql<string>`'brand'`,
        level: sql<string>`'driver'`,
      })
      .from(drivers)
      .where(
        and(
          eq(drivers.active, true),
          or(
            ilike(drivers.name, searchTerm),
            ilike(drivers.code, searchTerm),
            ilike(drivers.description, searchTerm)
          )
        )
      );

    // Search custom drivers if tenant
    if (tenantId) {
      const customDriverResults = await db
        .select({
          id: tenantCustomDrivers.id,
          code: tenantCustomDrivers.code,
          name: tenantCustomDrivers.name,
          description: tenantCustomDrivers.description,
          type: sql<string>`'custom'`,
          level: sql<string>`'driver'`,
        })
        .from(tenantCustomDrivers)
        .where(
          and(
            eq(tenantCustomDrivers.tenantId, tenantId),
            eq(tenantCustomDrivers.active, true),
            or(
              ilike(tenantCustomDrivers.name, searchTerm),
              ilike(tenantCustomDrivers.code, searchTerm),
              ilike(tenantCustomDrivers.description, searchTerm)
            )
          )
        );

      results.drivers = [...results.drivers, ...customDriverResults];
    }

    // Search brand categories
    results.categories = await db
      .select({
        id: driverCategories.id,
        driverId: driverCategories.driverId,
        code: driverCategories.code,
        name: driverCategories.name,
        description: driverCategories.description,
        type: sql<string>`'brand'`,
        level: sql<string>`'category'`,
      })
      .from(driverCategories)
      .where(
        and(
          eq(driverCategories.active, true),
          or(
            ilike(driverCategories.name, searchTerm),
            ilike(driverCategories.code, searchTerm),
            ilike(driverCategories.description, searchTerm)
          )
        )
      );

    // Search custom tenant categories
    if (tenantId) {
      const customCategoryResults = await db
        .select({
          id: tenantDriverCategories.id,
          customDriverId: tenantDriverCategories.customDriverId,
          code: tenantDriverCategories.code,
          name: tenantDriverCategories.name,
          description: tenantDriverCategories.description,
          type: sql<string>`'custom'`,
          level: sql<string>`'category'`,
        })
        .from(tenantDriverCategories)
        .where(
          and(
            eq(tenantDriverCategories.tenantId, tenantId),
            eq(tenantDriverCategories.active, true),
            or(
              ilike(tenantDriverCategories.name, searchTerm),
              ilike(tenantDriverCategories.code, searchTerm),
              ilike(tenantDriverCategories.description, searchTerm)
            )
          )
        );

      results.categories = [...results.categories, ...customCategoryResults];
    }

    // Search brand typologies
    results.typologies = await db
      .select({
        id: driverTypologies.id,
        categoryId: driverTypologies.categoryId,
        code: driverTypologies.code,
        name: driverTypologies.name,
        description: driverTypologies.description,
        type: sql<string>`'brand'`,
        level: sql<string>`'typology'`,
      })
      .from(driverTypologies)
      .where(
        and(
          eq(driverTypologies.active, true),
          or(
            ilike(driverTypologies.name, searchTerm),
            ilike(driverTypologies.code, searchTerm),
            ilike(driverTypologies.description, searchTerm)
          )
        )
      );

    // Search custom tenant typologies
    if (tenantId) {
      const customTypologyResults = await db
        .select({
          id: tenantDriverTypologies.id,
          customCategoryId: tenantDriverTypologies.customCategoryId,
          code: tenantDriverTypologies.code,
          name: tenantDriverTypologies.name,
          description: tenantDriverTypologies.description,
          type: sql<string>`'custom'`,
          level: sql<string>`'typology'`,
        })
        .from(tenantDriverTypologies)
        .where(
          and(
            eq(tenantDriverTypologies.tenantId, tenantId),
            eq(tenantDriverTypologies.active, true),
            or(
              ilike(tenantDriverTypologies.name, searchTerm),
              ilike(tenantDriverTypologies.code, searchTerm),
              ilike(tenantDriverTypologies.description, searchTerm)
            )
          )
        );

      results.typologies = [...results.typologies, ...customTypologyResults];
    }

    res.json(results);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
});

export default router;
