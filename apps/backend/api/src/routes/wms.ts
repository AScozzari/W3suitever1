import { Router } from "express";
import { db } from "../core/db";
import { eq, and, ilike, or, desc, asc, sql, inArray } from "drizzle-orm";
import { 
  products,
  insertProductSchema,
  productItems,
  productSerials,
  productItemStatusHistory,
  productBatches
} from "../db/schema/w3suite";
import { tenantMiddleware, rbacMiddleware, requirePermission } from "../middleware/tenant";
import { z } from "zod";

const router = Router();

/**
 * GET /api/wms/products
 * Get all products with filters, pagination, and sorting
 * Query params:
 * - sku: Filter by SKU (partial match)
 * - ean: Filter by EAN (exact match)
 * - type: Filter by product type (PHYSICAL, VIRTUAL, SERVICE, CANVAS)
 * - source: Filter by source (brand, tenant)
 * - brand: Filter by brand name (partial match)
 * - is_active: Filter by active status (true/false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort_by: Column to sort by (default: created_at)
 * - sort_order: Sort order (asc/desc, default: desc)
 */
router.get("/products", rbacMiddleware, requirePermission('wms.product.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Parse and validate query parameters
    const {
      sku,
      ean,
      type,
      source,
      brand,
      is_active,
      page = "1",
      limit = "20",
      sort_by = "created_at",
      sort_order = "desc"
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions: any[] = [
      eq(products.tenantId, tenantId)
    ];

    if (sku && typeof sku === "string") {
      conditions.push(ilike(products.sku, `%${sku}%`));
    }

    if (ean && typeof ean === "string") {
      conditions.push(eq(products.ean, ean));
    }

    if (type && typeof type === "string") {
      const validTypes = ["PHYSICAL", "VIRTUAL", "SERVICE", "CANVAS"];
      if (validTypes.includes(type)) {
        conditions.push(eq(products.type, type as any));
      }
    }

    if (source && typeof source === "string") {
      const validSources = ["brand", "tenant"];
      if (validSources.includes(source)) {
        conditions.push(eq(products.source, source as any));
      }
    }

    if (brand && typeof brand === "string") {
      conditions.push(ilike(products.brand, `%${brand}%`));
    }

    if (is_active !== undefined) {
      const activeFlag = is_active === "true" || is_active === "1";
      conditions.push(eq(products.isActive, activeFlag));
    }

    // Determine sort column and order
    const sortColumn = {
      created_at: products.createdAt,
      updated_at: products.updatedAt,
      sku: products.sku,
      name: products.name,
      brand: products.brand,
      type: products.type,
      quantity_available: products.quantityAvailable
    }[sort_by as string] || products.createdAt;

    const sortFn = sort_order === "asc" ? asc : desc;

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // Get paginated products
    const productsList = await db
      .select({
        tenantId: products.tenantId,
        id: products.id,
        source: products.source,
        brandProductId: products.brandProductId,
        isBrandSynced: products.isBrandSynced,
        sku: products.sku,
        name: products.name,
        description: products.description,
        brand: products.brand,
        ean: products.ean,
        type: products.type,
        isSerializable: products.isSerializable,
        weight: products.weight,
        dimensions: products.dimensions,
        attachments: products.attachments,
        quantityAvailable: products.quantityAvailable,
        quantityReserved: products.quantityReserved,
        reorderPoint: products.reorderPoint,
        warehouseLocation: products.warehouseLocation,
        unitOfMeasure: products.unitOfMeasure,
        isActive: products.isActive,
        archivedAt: products.archivedAt,
        createdBy: products.createdBy,
        modifiedBy: products.modifiedBy,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(sortFn(sortColumn))
      .limit(limitNum)
      .offset(offset);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      data: productsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error("Error fetching WMS products:", error);
    res.status(500).json({ 
      error: "Failed to fetch products",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
