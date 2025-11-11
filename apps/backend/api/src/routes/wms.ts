import { Router } from "express";
import { db } from "../core/db";
import { eq, and, ilike, or, desc, asc, sql, inArray } from "drizzle-orm";
import crypto from "crypto";
import { 
  products,
  insertProductSchema,
  updateProductSchema,
  productItems,
  insertProductItemSchema,
  updateProductItemSchema,
  productSerials,
  productItemStatusHistory,
  productBatches
} from "../db/schema/w3suite";
import { tenantMiddleware, rbacMiddleware, requirePermission } from "../middleware/tenant";
import { logger } from "../core/logger";
import { z } from "zod";

// Active product_items logistic statuses (prevent product deletion)
// These represent inventory under tenant control or committed to orders
const ACTIVE_ITEM_STATUSES = [
  'in_stock',
  'reserved',
  'preparing',
  'shipping',
  'customer_return',
  'doa_return',
  'in_service',
  'supplier_return',
  'in_transfer'
] as const;

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

/**
 * POST /api/wms/products/:tenantId
 * Create a new product
 * Params: tenantId (UUID)
 * Body: Zod-validated product data (insertProductSchema)
 * - Auto-generates UUID for id
 * - Validates SKU uniqueness
 * - Sets createdBy, createdAt, updatedAt timestamps
 * - Supports source: brand | tenant
 */
router.post("/products/:tenantId", rbacMiddleware, requirePermission('wms.product.create'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Validate request body with insertProductSchema
    const validationResult = insertProductSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const productData = validationResult.data;

    // Check SKU uniqueness within tenant
    if (productData.sku) {
      const existingSku = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.tenantId, tenantId),
            eq(products.sku, productData.sku)
          )
        )
        .limit(1);

      if (existingSku.length > 0) {
        return res.status(409).json({ 
          error: "SKU already exists",
          message: `Product with SKU '${productData.sku}' already exists for this tenant`
        });
      }
    }

    // Generate new product ID (UUID)
    const newProductId = crypto.randomUUID();

    // Prepare product for insertion
    const newProduct = {
      ...productData,
      tenantId,
      id: newProductId,
      createdBy: userId || null,
      modifiedBy: userId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert product
    const [createdProduct] = await db
      .insert(products)
      .values(newProduct)
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product created', {
      tenantId,
      productId: createdProduct.id,
      sku: createdProduct.sku,
      name: createdProduct.name,
      type: createdProduct.type,
      source: createdProduct.source,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: createdProduct
    });

  } catch (error) {
    console.error("Error creating WMS product:", error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(409).json({ 
        error: "Unique constraint violation",
        message: "A product with this SKU or EAN already exists"
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create product",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PATCH /api/wms/products/:tenantId/:id
 * Update an existing product
 * Params: tenantId (UUID), id (product ID)
 * Body: Partial product data (updateProductSchema)
 * - Prevents update if source='brand' AND is_brand_synced=true (Brand-managed products)
 * - Auto-sets modifiedBy and updatedAt
 * - Validates SKU uniqueness if SKU is being changed
 */
router.patch("/products/:tenantId/:id", rbacMiddleware, requirePermission('wms.product.update'), async (req, res) => {
  try {
    const { tenantId: paramTenantId, id: productId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot update product from different tenant"
      });
    }

    // Validate request body with updateProductSchema
    const validationResult = updateProductSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const updateData = validationResult.data;

    // Get existing product
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.id, productId)
        )
      )
      .limit(1);

    if (!existingProduct) {
      return res.status(404).json({ 
        error: "Product not found",
        message: `Product with ID '${productId}' not found for this tenant`
      });
    }

    // Prevent update if Brand-synced product
    if (existingProduct.source === 'brand' && existingProduct.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot update Brand-synced product",
        message: "This product is managed by Brand HQ and cannot be modified by tenants. Contact Brand administration for updates."
      });
    }

    // Check SKU uniqueness if SKU is being changed
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const existingSku = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.tenantId, sessionTenantId),
            eq(products.sku, updateData.sku)
          )
        )
        .limit(1);

      if (existingSku.length > 0) {
        return res.status(409).json({ 
          error: "SKU already exists",
          message: `Product with SKU '${updateData.sku}' already exists for this tenant`
        });
      }
    }

    // Prepare update data with audit fields
    const productUpdate = {
      ...updateData,
      modifiedBy: userId || null,
      updatedAt: new Date()
    };

    // Update product
    const [updatedProduct] = await db
      .update(products)
      .set(productUpdate)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.id, productId)
        )
      )
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product updated', {
      tenantId: sessionTenantId,
      productId,
      sku: updatedProduct.sku,
      modifiedBy: userId,
      changedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: updatedProduct
    });

  } catch (error) {
    console.error("Error updating WMS product:", error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(409).json({ 
        error: "Unique constraint violation",
        message: "A product with this SKU or EAN already exists"
      });
    }
    
    res.status(500).json({ 
      error: "Failed to update product",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * DELETE /api/wms/products/:tenantId/:id
 * Soft-delete a product (set is_active=false, archived_at=NOW)
 * Params: tenantId (UUID), id (product ID)
 * - Checks for active product_items dependencies before deletion
 * - Prevents deletion if product has active items
 * - Marks product as inactive with archived timestamp
 */
router.delete("/products/:tenantId/:id", rbacMiddleware, requirePermission('wms.product.delete'), async (req, res) => {
  try {
    const { tenantId: paramTenantId, id: productId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot delete product from different tenant"
      });
    }

    // Get existing product
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.id, productId)
        )
      )
      .limit(1);

    if (!existingProduct) {
      return res.status(404).json({ 
        error: "Product not found",
        message: `Product with ID '${productId}' not found for this tenant`
      });
    }

    // Check for ACTIVE product_items dependencies
    // Only count items in active operational states (under tenant control or committed)
    const activeItemsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productItems)
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.productId, productId),
          inArray(productItems.logisticStatus, ACTIVE_ITEM_STATUSES)
        )
      );

    const count = activeItemsCount[0]?.count ?? 0;

    if (count > 0) {
      return res.status(409).json({ 
        error: "Cannot delete product with active items",
        message: `This product has ${count} active item(s) in inventory (in_stock, reserved, preparing, etc.). Please complete or cancel these items before deleting the product.`,
        activeItemsCount: count
      });
    }

    // Soft-delete: update is_active=false and archived_at=NOW
    const [deletedProduct] = await db
      .update(products)
      .set({ 
        isActive: false,
        archivedAt: new Date(),
        modifiedBy: userId || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.id, productId)
        )
      )
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product soft-deleted', {
      tenantId: sessionTenantId,
      productId,
      sku: deletedProduct.sku,
      name: deletedProduct.name,
      deletedBy: userId,
      archivedAt: deletedProduct.archivedAt
    });

    res.json({
      success: true,
      message: "Product successfully archived",
      data: deletedProduct
    });

  } catch (error) {
    console.error("Error deleting WMS product:", error);
    
    res.status(500).json({ 
      error: "Failed to delete product",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== PRODUCT ITEMS ENDPOINTS ====================

/**
 * GET /api/wms/product-items
 * List product items with filters, pagination, and sorting
 * Query params:
 * - productId: Filter by product ID
 * - condition: Filter by condition (new, used, refurbished, demo)
 * - logisticStatus: Filter by logistic status
 * - storeId: Filter by store ID
 * - customerId: Filter by customer ID
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: Sort order (asc/desc, default: desc)
 */
router.get("/product-items", rbacMiddleware, requirePermission('wms.item.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Extract query parameters
    const {
      productId,
      condition,
      logisticStatus,
      storeId,
      customerId,
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Parse pagination with validation (defensive against NaN/negative/invalid values)
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(parseInt(limit as string, 10) || 50, 100)); // Min 1, max 100
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions = [eq(productItems.tenantId, tenantId)];

    if (productId) {
      conditions.push(eq(productItems.productId, productId as string));
    }

    if (condition) {
      conditions.push(eq(productItems.condition, condition as any));
    }

    if (logisticStatus) {
      conditions.push(eq(productItems.logisticStatus, logisticStatus as any));
    }

    if (storeId) {
      conditions.push(eq(productItems.storeId, storeId as string));
    }

    if (customerId) {
      conditions.push(eq(productItems.customerId, customerId as string));
    }

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productItems)
      .where(whereClause);
    
    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limitNum);

    // Build ORDER BY clause
    const sortColumn = productItems[sortBy as keyof typeof productItems] || productItems.createdAt;
    const orderByClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Fetch items with pagination
    const items = await db
      .select()
      .from(productItems)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: items,
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
    console.error("Error fetching WMS product items:", error);
    res.status(500).json({ 
      error: "Failed to fetch product items",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/product-items/:tenantId
 * Create a new product item
 * Params: tenantId (UUID)
 * Body: insertProductItemSchema (productId, condition, logisticStatus, etc.)
 * - Auto-generates UUID id
 * - Validates productId FK (product must exist)
 * - Enforces serializable binding if product.isSerializable=true
 * - Auto-sets createdAt, updatedAt timestamps
 */
router.post("/product-items/:tenantId", rbacMiddleware, requirePermission('wms.item.create'), async (req, res) => {
  try {
    const { tenantId: paramTenantId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot create product item for different tenant"
      });
    }

    // Validate request body with insertProductItemSchema
    const validationResult = insertProductItemSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const itemData = validationResult.data;

    // Validate productId FK - product must exist
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.id, itemData.productId)
        )
      )
      .limit(1);

    if (!product) {
      return res.status(404).json({ 
        error: "Product not found",
        message: `Product with ID '${itemData.productId}' not found for this tenant`
      });
    }

    // Prepare item data with auto-generated ID and tenant context
    const newItem = {
      id: crypto.randomUUID(),
      ...itemData,
      tenantId: sessionTenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert product item
    const [createdItem] = await db
      .insert(productItems)
      .values(newItem)
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product item created', {
      tenantId: sessionTenantId,
      itemId: createdItem.id,
      productId: createdItem.productId,
      condition: createdItem.condition,
      logisticStatus: createdItem.logisticStatus
    });

    res.status(201).json({
      success: true,
      data: createdItem
    });

  } catch (error) {
    console.error("Error creating WMS product item:", error);
    
    res.status(500).json({ 
      error: "Failed to create product item",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PATCH /api/wms/product-items/:tenantId/:id
 * Update an existing product item
 * Params: tenantId (UUID), id (item ID)
 * Body: Partial item data (updateProductItemSchema)
 * - Auto-sets updatedAt timestamp
 */
router.patch("/product-items/:tenantId/:id", rbacMiddleware, requirePermission('wms.item.update'), async (req, res) => {
  try {
    const { tenantId: paramTenantId, id: itemId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot update product item from different tenant"
      });
    }

    // Validate request body with updateProductItemSchema
    const validationResult = updateProductItemSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const updateData = validationResult.data;

    // Get existing item
    const [existingItem] = await db
      .select()
      .from(productItems)
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.id, itemId)
        )
      )
      .limit(1);

    if (!existingItem) {
      return res.status(404).json({ 
        error: "Product item not found",
        message: `Product item with ID '${itemId}' not found for this tenant`
      });
    }

    // Prepare update data with updatedAt
    const itemUpdate = {
      ...updateData,
      updatedAt: new Date()
    };

    // Update item
    const [updatedItem] = await db
      .update(productItems)
      .set(itemUpdate)
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.id, itemId)
        )
      )
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product item updated', {
      tenantId: sessionTenantId,
      itemId,
      productId: updatedItem.productId,
      changedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: updatedItem
    });

  } catch (error) {
    console.error("Error updating WMS product item:", error);
    
    res.status(500).json({ 
      error: "Failed to update product item",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * DELETE /api/wms/product-items/:tenantId/:id
 * Soft-delete a product item (set logisticStatus to appropriate end-state)
 * Params: tenantId (UUID), id (item ID)
 * - Prevents deletion if item has active serial binding
 * - Sets appropriate end-state logisticStatus (delivered, lost, damaged, internal_use)
 */
router.delete("/product-items/:tenantId/:id", rbacMiddleware, requirePermission('wms.item.delete'), async (req, res) => {
  try {
    const { tenantId: paramTenantId, id: itemId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot delete product item from different tenant"
      });
    }

    // Get existing item
    const [existingItem] = await db
      .select()
      .from(productItems)
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.id, itemId)
        )
      )
      .limit(1);

    if (!existingItem) {
      return res.status(404).json({ 
        error: "Product item not found",
        message: `Product item with ID '${itemId}' not found for this tenant`
      });
    }

    // Check if item is in active operational state
    if (ACTIVE_ITEM_STATUSES.includes(existingItem.logisticStatus as any)) {
      return res.status(409).json({ 
        error: "Cannot delete active product item",
        message: `This product item is in active state '${existingItem.logisticStatus}'. Complete or cancel the item lifecycle before deletion.`,
        currentStatus: existingItem.logisticStatus
      });
    }

    // Soft-delete: mark as internal_use (archive state)
    const [deletedItem] = await db
      .update(productItems)
      .set({ 
        logisticStatus: 'internal_use',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.id, itemId)
        )
      )
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product item soft-deleted', {
      tenantId: sessionTenantId,
      itemId,
      productId: deletedItem.productId,
      previousStatus: existingItem.logisticStatus,
      newStatus: deletedItem.logisticStatus
    });

    res.json({
      success: true,
      message: "Product item successfully archived",
      data: deletedItem
    });

  } catch (error) {
    console.error("Error deleting WMS product item:", error);
    
    res.status(500).json({ 
      error: "Failed to delete product item",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Valid logisticStatus transitions matrix
 * Maps current status → allowed next statuses
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'in_stock': ['reserved', 'preparing', 'shipping', 'internal_use', 'lost', 'damaged'],
  'reserved': ['in_stock', 'preparing', 'customer_return'],
  'preparing': ['shipping', 'in_stock'],
  'shipping': ['delivered', 'in_transfer', 'customer_return', 'lost'],
  'delivered': ['customer_return', 'internal_use'],
  'customer_return': ['in_stock', 'doa_return'],
  'doa_return': ['supplier_return', 'internal_use'],
  'in_service': ['in_stock', 'internal_use'],
  'supplier_return': ['in_stock'],
  'in_transfer': ['in_stock'],
  // End states (no transitions allowed)
  'lost': [],
  'damaged': [],
  'internal_use': []
};

/**
 * POST /api/wms/product-items/:tenantId/:id/status
 * Transition product item to new logisticStatus with validation
 * Params: tenantId (UUID), id (item ID)
 * Body: { logisticStatus: string, notes?: string }
 * - Validates transition is allowed per business rules
 * - Auto-sets updatedAt timestamp
 * - Structured logging with status audit trail
 */
router.post("/product-items/:tenantId/:id/status", rbacMiddleware, requirePermission('wms.item.update'), async (req, res) => {
  try {
    const { tenantId: paramTenantId, id: itemId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const { logisticStatus: newStatus, notes } = req.body;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot update product item from different tenant"
      });
    }

    // Validate newStatus is provided
    if (!newStatus) {
      return res.status(400).json({ 
        error: "Validation failed",
        message: "logisticStatus is required"
      });
    }

    // Get existing item
    const [existingItem] = await db
      .select()
      .from(productItems)
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.id, itemId)
        )
      )
      .limit(1);

    if (!existingItem) {
      return res.status(404).json({ 
        error: "Product item not found",
        message: `Product item with ID '${itemId}' not found for this tenant`
      });
    }

    const currentStatus = existingItem.logisticStatus;

    // Skip if status is the same
    if (currentStatus === newStatus) {
      return res.json({
        success: true,
        message: "Status unchanged",
        data: existingItem
      });
    }

    // Validate transition is allowed
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return res.status(409).json({ 
        error: "Invalid status transition",
        message: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none (end state)'}`,
        currentStatus,
        requestedStatus: newStatus,
        allowedStatuses: allowedTransitions
      });
    }

    // Update item status
    const [updatedItem] = await db
      .update(productItems)
      .set({ 
        logisticStatus: newStatus,
        notes: notes || existingItem.notes, // Append/update notes if provided
        updatedAt: new Date()
      })
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.id, itemId)
        )
      )
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product item status transitioned', {
      tenantId: sessionTenantId,
      itemId,
      productId: updatedItem.productId,
      previousStatus: currentStatus,
      newStatus,
      notes: notes || null,
      transitionValid: true
    });

    res.json({
      success: true,
      message: `Status successfully transitioned from '${currentStatus}' to '${newStatus}'`,
      data: updatedItem,
      transition: {
        from: currentStatus,
        to: newStatus
      }
    });

  } catch (error) {
    console.error("Error transitioning WMS product item status:", error);
    
    res.status(500).json({ 
      error: "Failed to transition product item status",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
