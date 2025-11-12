import { Router } from "express";
import { 
  enqueueBulkSerialImport,
  enqueueGenerateReport,
  enqueueBatchStockUpdate,
  enqueueExpirationAlert,
  getWMSQueueMetrics,
  isRedisAvailable
} from '../queue/wms-queue';
import { startWMSWorker } from '../queue/wms-worker';
import { db } from "../core/db";
import { eq, and, ilike, or, desc, asc, sql, inArray, gte, isNull } from "drizzle-orm";
import crypto from "crypto";
import multer from "multer";
import { Client } from "@replit/object-storage";
import path from "path";
import { 
  products,
  insertProductSchema,
  updateProductSchema,
  productItems,
  insertProductItemSchema,
  updateProductItemSchema,
  productSerials,
  insertProductSerialSchema,
  productItemStatusHistory,
  productBatches,
  insertProductBatchSchema,
  wmsInventoryAdjustments,
  wmsStockMovements,
  insertStockMovementSchema,
  wmsWarehouseLocations,
  wmsCategories,
  wmsProductTypes,
  stores
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

// Multer configuration for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo immagini JPEG, PNG e WebP sono supportate'));
    }
  }
});

// Object Storage client (lazy initialization)
let objectStorage: Client | null = null;

const getObjectStorageClient = (): Client => {
  if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
    throw new Error('Object Storage non configurato (manca DEFAULT_OBJECT_STORAGE_BUCKET_ID)');
  }
  if (!objectStorage) {
    objectStorage = new Client();
  }
  return objectStorage;
};

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
      include_expired,
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

    // Filter expired products (query-time): only show products with validTo >= today or NULL
    // Optional filter controlled by include_expired query param (default: exclude expired)
    if (include_expired !== "true" && include_expired !== "1") {
      conditions.push(
        or(
          isNull(products.validTo),
          gte(products.validTo, sql`CURRENT_DATE`)
        )
      );
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

    // Get paginated products with category/type info
    const productsList = await db
      .select({
        tenantId: products.tenantId,
        id: products.id,
        source: products.source,
        brandProductId: products.brandProductId,
        isBrandSynced: products.isBrandSynced,
        sku: products.sku,
        name: products.name,
        model: products.model,
        description: products.description,
        notes: products.notes,
        brand: products.brand,
        ean: products.ean,
        memory: products.memory,
        color: products.color,
        imageUrl: products.imageUrl,
        type: products.type,
        status: products.status,
        condition: products.condition,
        isSerializable: products.isSerializable,
        serialType: products.serialType,
        monthlyFee: products.monthlyFee,
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
        categoryId: products.categoryId,
        typeId: products.typeId,
        validFrom: products.validFrom,
        validTo: products.validTo,
        categoryName: wmsCategories.nome,
        typeName: wmsProductTypes.nome,
        createdBy: products.createdBy,
        modifiedBy: products.modifiedBy,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt
      })
      .from(products)
      .leftJoin(
        wmsCategories,
        and(
          eq(wmsCategories.tenantId, products.tenantId),
          eq(wmsCategories.id, products.categoryId)
        )
      )
      .leftJoin(
        wmsProductTypes,
        and(
          eq(wmsProductTypes.tenantId, products.tenantId),
          eq(wmsProductTypes.id, products.typeId)
        )
      )
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

    // Prevent deletion of Brand-synced products
    if (existingProduct.source === 'brand' && existingProduct.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot delete Brand-synced product",
        message: "This product is managed by Brand HQ and cannot be archived by tenants. Contact Brand administration to discontinue this product."
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

/**
 * POST /api/wms/products/upload-image
 * Upload product image to Object Storage
 * Body: multipart/form-data with 'image' field
 * Returns: { imageUrl: string }
 */
router.post("/products/upload-image", rbacMiddleware, requirePermission('wms.product.create'), upload.single('image'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nessuna immagine caricata" });
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const uniqueFilename = `${crypto.randomUUID()}${fileExtension}`;
    const objectPath = `public/product-images/${tenantId}/${uniqueFilename}`;

    // Upload to Object Storage
    const client = getObjectStorageClient();
    await client.uploadFromBytes(objectPath, req.file.buffer, {
      contentType: req.file.mimetype
    });

    // Generate public URL
    const publicUrl = `https://storage.replit.com/${process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID}/${objectPath}`;

    logger.info('Product image uploaded successfully', {
      tenantId,
      userId,
      objectPath,
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });

    res.json({
      success: true,
      imageUrl: publicUrl
    });

  } catch (error) {
    console.error("Error uploading product image:", error);
    
    res.status(500).json({ 
      error: "Failed to upload image",
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
 * POST /api/wms/product-items/stock-reconciliation
 * Reconcile physical inventory counts with database records
 * Body: {
 *   items: Array<{
 *     productId: string,
 *     expectedCount: number,
 *     actualCount: number,
 *     storeId?: string,
 *     notes?: string
 *   }>
 * }
 * - Calculates discrepancies (actualCount - expectedCount)
 * - Creates inventory adjustment records for audit trail
 * - Supports store-specific or global reconciliation
 * - Returns summary with total items, discrepancies, adjustments
 * 
 * NOTE: This route MUST come BEFORE /product-items/:tenantId to avoid route shadowing
 */
router.post("/product-items/stock-reconciliation", rbacMiddleware, requirePermission('wms.inventory.reconcile'), async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { items } = req.body;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Validate request body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: "Validation failed",
        message: "items array is required and must not be empty"
      });
    }

    // Validate each item has required fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId || typeof item.expectedCount !== 'number' || typeof item.actualCount !== 'number') {
        return res.status(400).json({ 
          error: "Validation failed",
          message: `Item at index ${i} is missing required fields (productId, expectedCount, actualCount)`
        });
      }
    }

    const reconciliationResults = [];
    const adjustments = [];
    let totalDiscrepancies = 0;

    // Wrap in transaction for atomicity (all-or-nothing)
    await db.transaction(async (tx) => {
      // PRE-VALIDATE all items before any insertions to ensure atomicity
      for (const item of items) {
        const { productId, storeId } = item;
        
        // Validate productId FK - product must exist in same tenant
        const [product] = await tx
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, sessionTenantId),
              eq(products.id, productId)
            )
          )
          .limit(1);

        if (!product) {
          throw new Error(`Product with ID '${productId}' not found for this tenant`);
        }

        // Validate storeId if provided
        if (storeId) {
          const [store] = await tx.select().from(stores).where(
            and(
              eq(stores.tenantId, sessionTenantId),
              eq(stores.id, storeId)
            )
          ).limit(1);

          if (!store) {
            throw new Error(`Store with ID '${storeId}' not found for this tenant`);
          }
        }
      }

      // ALL VALIDATIONS PASSED - now process insertions atomically
      for (const item of items) {
        const { productId, expectedCount, actualCount, storeId, notes } = item;
        const discrepancy = actualCount - expectedCount;
        
        // Persist adjustment to database if discrepancy exists
        if (discrepancy !== 0) {
          totalDiscrepancies++;
          
          const adjustmentRecord = {
            tenantId: sessionTenantId,
            productId,
            storeId: storeId || null,
            expectedCount,
            actualCount,
            discrepancy,
            adjustmentType: discrepancy > 0 ? 'surplus' : 'shortage',
            notes: notes || `Stock reconciliation: ${Math.abs(discrepancy)} units ${discrepancy > 0 ? 'found' : 'missing'}`,
            createdBy: userId
          };

          // Insert into database within transaction
          const [persistedAdjustment] = await tx
            .insert(wmsInventoryAdjustments)
            .values(adjustmentRecord)
            .returning();
          
          adjustments.push(persistedAdjustment);
        }

        reconciliationResults.push({
          productId,
          storeId: storeId || null,
          expectedCount,
          actualCount,
          discrepancy,
          status: discrepancy === 0 ? 'match' : (discrepancy > 0 ? 'surplus' : 'shortage')
        });
      }
    }); // Transaction auto-commits if all succeeds, auto-rollbacks on any error

    // Structured logging for audit trail
    logger.info('WMS stock reconciliation completed', {
      tenantId: sessionTenantId,
      totalItems: items.length,
      totalDiscrepancies,
      adjustmentsCreated: adjustments.length,
      userId
    });

    res.json({
      success: true,
      message: `Stock reconciliation completed. ${totalDiscrepancies} discrepancies found out of ${items.length} items.`,
      data: {
        summary: {
          totalItems: items.length,
          matchingItems: items.length - totalDiscrepancies,
          discrepancyItems: totalDiscrepancies,
          surplusItems: adjustments.filter(a => a.adjustmentType === 'surplus').length,
          shortageItems: adjustments.filter(a => a.adjustmentType === 'shortage').length
        },
        results: reconciliationResults,
        adjustments
      }
    });

  } catch (error) {
    console.error("Error processing WMS stock reconciliation:", error);
    
    // Transaction rollback errors from validation failures (Product/Store not found) → 404
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: "Validation failed",
        message: error.message
      });
    }
    
    // Generic errors → 500
    res.status(500).json({ 
      error: "Failed to process stock reconciliation",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Zod schema for GET /api/wms/product-serials query params validation
const productSerialsQuerySchema = z.object({
  page: z.string().optional().transform(val => Math.max(1, parseInt(val || '1') || 1)),
  limit: z.string().optional().transform(val => Math.min(Math.max(1, parseInt(val || '50') || 50), 100)),
  productItemId: z.string().uuid("Invalid UUID format for productItemId").optional(),
  serialType: z.enum(['imei', 'iccid', 'mac_address', 'other'], {
    errorMap: () => ({ message: "serialType must be one of: imei, iccid, mac_address, other" })
  }).optional(),
  serialValue: z.string().optional()
});

/**
 * GET /api/wms/product-serials
 * Retrieve paginated list of product serials with filtering
 * Query params: page, limit, productItemId, serialType, serialValue
 * - Tenant-scoped isolation (automatic via session.tenantId)
 * - Zod validation for query params (UUID, enum)
 * - Filters: productItemId (uuid FK), serialType (enum), serialValue (partial match)
 * - Sorted by createdAt DESC
 * 
 * Schema: id (uuid), productItemId (uuid FK), serialType (imei|iccid|mac_address|other), serialValue, createdAt
 */
router.get("/product-serials", rbacMiddleware, requirePermission('wms.serial.read'), async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Validate query params with Zod
    const validationResult = productSerialsQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid query parameters",
        details: validationResult.error.format()
      });
    }

    const { page, limit, productItemId, serialType, serialValue } = validationResult.data;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(productSerials.tenantId, sessionTenantId)];

    if (productItemId) {
      whereConditions.push(eq(productSerials.productItemId, productItemId));
    }

    if (serialType) {
      whereConditions.push(eq(productSerials.serialType, serialType));
    }

    if (serialValue) {
      whereConditions.push(ilike(productSerials.serialValue, `%${serialValue}%`));
    }

    // Execute paginated query
    const serials = await db
      .select()
      .from(productSerials)
      .where(and(...whereConditions))
      .orderBy(desc(productSerials.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total for pagination metadata
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productSerials)
      .where(and(...whereConditions));

    // Structured logging for monitoring
    logger.info('WMS product serials retrieved', {
      tenantId: sessionTenantId,
      page,
      limit,
      totalResults: serials.length,
      filters: { productItemId, serialType, serialValue }
    });

    res.json({
      success: true,
      data: serials,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error("Error retrieving WMS product serials:", error);
    
    res.status(500).json({ 
      error: "Failed to retrieve product serials",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/product-serials/bulk-import
 * Bulk import product serials with atomic validation
 * Body: { serials: Array<insertProductSerialSchema> }
 * - Validates ALL serials before ANY inserts (2-phase validation)
 * - Uses db.transaction() for atomicity (all or nothing)
 * - Pre-validates productItemId FK for all serials
 * - Checks for duplicate serialValue within tenant (existing + batch)
 * - Max 1000 serials per import
 * - Returns detailed error report for failed serials
 */
router.post("/product-serials/bulk-import", rbacMiddleware, requirePermission('wms.serial.create'), async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Validate request body structure
    const bulkImportSchema = z.object({
      serials: z.array(insertProductSerialSchema)
        .min(1, "At least one serial is required")
        .max(1000, "Maximum 1000 serials per import")
    });

    const validationResult = bulkImportSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const { serials } = validationResult.data;
    const errors: Array<{ index: number; serialValue: string; error: string }> = [];

    // PHASE 1: Pre-validate ALL serials before ANY inserts
    
    // Extract unique productItemIds for batch FK validation
    const uniqueProductItemIds = [...new Set(serials.map(s => s.productItemId))];
    
    // Batch query to validate ALL productItemIds exist in tenant
    const existingProductItems = await db
      .select({ id: productItems.id })
      .from(productItems)
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          inArray(productItems.id, uniqueProductItemIds)
        )
      );

    const validProductItemIds = new Set(existingProductItems.map(item => item.id));

    // Check for invalid productItemIds
    serials.forEach((serial, index) => {
      if (!validProductItemIds.has(serial.productItemId)) {
        errors.push({
          index,
          serialValue: serial.serialValue,
          error: `Product item '${serial.productItemId}' not found in tenant`
        });
      }
    });

    // Extract all serialValues for duplicate check
    const serialValues = serials.map(s => s.serialValue);
    
    // Check for duplicates within the batch itself
    const seenInBatch = new Set<string>();
    serials.forEach((serial, index) => {
      if (seenInBatch.has(serial.serialValue)) {
        errors.push({
          index,
          serialValue: serial.serialValue,
          error: "Duplicate serial value within batch"
        });
      }
      seenInBatch.add(serial.serialValue);
    });

    // Check for existing serials in DB (tenant-scoped)
    const existingSerials = await db
      .select({ serialValue: productSerials.serialValue })
      .from(productSerials)
      .where(
        and(
          eq(productSerials.tenantId, sessionTenantId),
          inArray(productSerials.serialValue, serialValues)
        )
      );

    const existingSerialValues = new Set(existingSerials.map(s => s.serialValue));
    
    serials.forEach((serial, index) => {
      if (existingSerialValues.has(serial.serialValue)) {
        // Only add if not already marked as error
        if (!errors.some(e => e.index === index)) {
          errors.push({
            index,
            serialValue: serial.serialValue,
            error: "Serial value already exists in tenant"
          });
        }
      }
    });

    // If ANY validation errors, abort before inserting
    if (errors.length > 0) {
      return res.status(400).json({
        error: "Bulk import validation failed",
        message: `${errors.length} of ${serials.length} serials failed validation`,
        totalSerials: serials.length,
        failedCount: errors.length,
        errors
      });
    }

    // PHASE 2: All validations passed, perform atomic batch insert
    const createdSerials = await db.transaction(async (tx) => {
      const serialsWithTenant = serials.map(serial => ({
        ...serial,
        tenantId: sessionTenantId
      }));

      const inserted = await tx
        .insert(productSerials)
        .values(serialsWithTenant)
        .returning();

      return inserted;
    });

    // Structured logging for audit trail
    logger.info('WMS product serials bulk imported', {
      tenantId: sessionTenantId,
      totalSerials: serials.length,
      successCount: createdSerials.length,
      serialTypes: [...new Set(serials.map(s => s.serialType))]
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdSerials.length} product serials`,
      totalSerials: serials.length,
      successCount: createdSerials.length,
      failedCount: 0,
      data: createdSerials
    });

  } catch (error) {
    console.error("Error bulk importing WMS product serials:", error);
    
    res.status(500).json({ 
      error: "Failed to bulk import product serials",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/product-serials/:tenantId
 * Create a new product serial
 * Params: tenantId (UUID)
 * Body: insertProductSerialSchema (productItemId, serialType, serialValue)
 * - Auto-generates UUID id
 * - Validates productItemId FK (product item must exist in tenant)
 * - Enforces tenant-scoped serialValue uniqueness (DB constraint)
 * - Returns 409 Conflict if serialValue already exists
 */
router.post("/product-serials/:tenantId", rbacMiddleware, requirePermission('wms.serial.create'), async (req, res) => {
  try {
    const { tenantId: paramTenantId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot create product serial for different tenant"
      });
    }

    // Validate request body with insertProductSerialSchema
    const validationResult = insertProductSerialSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const serialData = validationResult.data;

    // Validate productItemId FK - product item must exist in tenant
    const [productItem] = await db
      .select()
      .from(productItems)
      .where(
        and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.id, serialData.productItemId)
        )
      )
      .limit(1);

    if (!productItem) {
      return res.status(404).json({ 
        error: "Product item not found",
        message: `Product item with ID '${serialData.productItemId}' not found for this tenant`
      });
    }

    // Prepare serial data with tenant context (id auto-generated by DB)
    const newSerial = {
      ...serialData,
      tenantId: sessionTenantId
    };

    // Insert product serial (DB enforces uniqueness on tenantId + serialValue)
    const [createdSerial] = await db
      .insert(productSerials)
      .values(newSerial)
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product serial created', {
      tenantId: sessionTenantId,
      serialId: createdSerial.id,
      productItemId: serialData.productItemId,
      serialType: serialData.serialType,
      serialValue: serialData.serialValue
    });

    res.status(201).json({
      success: true,
      message: "Product serial created successfully",
      data: createdSerial
    });

  } catch (error) {
    console.error("Error creating WMS product serial:", error);
    
    // Handle unique constraint violation (duplicate serialValue in tenant)
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(409).json({ 
        error: "Duplicate serial value",
        message: "A product serial with this value already exists for this tenant"
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create product serial",
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

/**
 * GET /api/wms/product-batches
 * Get all product batches with filters, pagination, and sorting
 * Query params:
 * - productId: Filter by product ID (exact match)
 * - batchNumber: Filter by batch number (partial match)
 * - status: Filter by batch status (available, reserved, damaged, expired)
 * - storeId: Filter by store ID (exact match)
 * - expiryBefore: Filter batches expiring before date (YYYY-MM-DD)
 * - expiryAfter: Filter batches expiring after date (YYYY-MM-DD)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort_by: Column to sort by (default: created_at)
 * - sort_order: Sort order (asc/desc, default: desc)
 */
router.get("/product-batches", rbacMiddleware, requirePermission('wms.batch.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Parse and validate query parameters
    const {
      productId,
      batchNumber,
      status,
      storeId,
      expiryBefore,
      expiryAfter,
      page = "1",
      limit = "20",
      sort_by = "created_at",
      sort_order = "desc"
    } = req.query;

    // Defensive parsing with fallbacks
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions = [eq(productBatches.tenantId, tenantId)];

    if (productId) {
      conditions.push(eq(productBatches.productId, productId as string));
    }

    if (batchNumber) {
      conditions.push(ilike(productBatches.batchNumber, `%${batchNumber}%`));
    }

    if (status && ['available', 'reserved', 'damaged', 'expired'].includes(status as string)) {
      conditions.push(eq(productBatches.status, status as string));
    }

    if (storeId) {
      conditions.push(eq(productBatches.storeId, storeId as string));
    }

    if (expiryBefore) {
      conditions.push(sql`${productBatches.expiryDate} < ${expiryBefore}`);
    }

    if (expiryAfter) {
      conditions.push(sql`${productBatches.expiryDate} > ${expiryAfter}`);
    }

    const whereClause = and(...conditions);

    // Determine sort column
    const sortColumns: Record<string, any> = {
      created_at: productBatches.createdAt,
      updated_at: productBatches.updatedAt,
      batch_number: productBatches.batchNumber,
      expiry_date: productBatches.expiryDate,
      quantity: productBatches.quantity,
      status: productBatches.status
    };

    const sortColumn = sortColumns[sort_by as string] || productBatches.createdAt;
    const sortDirection = sort_order === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Execute query with pagination
    const batches = await db
      .select()
      .from(productBatches)
      .where(whereClause)
      .orderBy(sortDirection)
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination metadata
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productBatches)
      .where(whereClause);

    // Structured logging for monitoring
    logger.info('WMS product batches retrieved', {
      tenantId,
      page: pageNum,
      limit: limitNum,
      totalResults: batches.length,
      filters: { productId, batchNumber, status, storeId, expiryBefore, expiryAfter }
    });

    res.json({
      success: true,
      data: batches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    });

  } catch (error) {
    console.error("Error retrieving WMS product batches:", error);
    
    res.status(500).json({ 
      error: "Failed to retrieve product batches",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/product-batches/:tenantId
 * Create a new product batch
 * Params: tenantId (UUID)
 * Body: insertProductBatchSchema (productId, batchNumber, quantity, etc.)
 * - Auto-generates UUID id
 * - Validates productId FK (product must exist in tenant)
 * - Enforces uniqueness constraint (tenantId + productId + storeId + batchNumber)
 * - Auto-sets createdAt, updatedAt timestamps
 * - Returns 409 Conflict if batch already exists
 */
router.post("/product-batches/:tenantId", rbacMiddleware, requirePermission('wms.batch.create'), async (req, res) => {
  try {
    const { tenantId: paramTenantId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify tenant ID match (security check)
    if (paramTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Cannot create product batch for different tenant"
      });
    }

    // Validate request body with insertProductBatchSchema
    const validationResult = insertProductBatchSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const batchData = validationResult.data;

    // Validate productId FK - product must exist in tenant
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.id, batchData.productId)
        )
      )
      .limit(1);

    if (!product) {
      return res.status(404).json({ 
        error: "Product not found",
        message: `Product with ID '${batchData.productId}' not found for this tenant`
      });
    }

    // Check for duplicate batch (handle NULL storeId properly)
    // PostgreSQL unique constraints treat NULL as distinct, so we need app-level check
    const duplicateConditions = [
      eq(productBatches.tenantId, sessionTenantId),
      eq(productBatches.productId, batchData.productId),
      eq(productBatches.batchNumber, batchData.batchNumber)
    ];

    // Add storeId condition: handle NULL explicitly (NULL = NULL in our business logic)
    if (batchData.storeId) {
      duplicateConditions.push(eq(productBatches.storeId, batchData.storeId));
    } else {
      duplicateConditions.push(sql`${productBatches.storeId} IS NULL`);
    }

    const [existingBatch] = await db
      .select()
      .from(productBatches)
      .where(and(...duplicateConditions))
      .limit(1);

    if (existingBatch) {
      return res.status(409).json({ 
        error: "Duplicate batch",
        message: "A batch with this number already exists for this product and store"
      });
    }

    // Prepare batch data with tenant context (id, createdAt, updatedAt auto-generated by DB)
    // Auto-set initialQuantity to quantity if not provided (for KPI calculations)
    const newBatch = {
      ...batchData,
      initialQuantity: batchData.initialQuantity ?? batchData.quantity, // Default to current quantity
      reserved: batchData.reserved ?? 0, // Default to 0 if not specified
      tenantId: sessionTenantId
    };

    // Insert product batch (DB enforces uniqueness on tenantId + productId + storeId + batchNumber)
    const [createdBatch] = await db
      .insert(productBatches)
      .values(newBatch)
      .returning();

    // Structured logging for audit trail
    logger.info('WMS product batch created', {
      tenantId: sessionTenantId,
      batchId: createdBatch.id,
      productId: batchData.productId,
      batchNumber: batchData.batchNumber,
      quantity: batchData.quantity,
      status: batchData.status
    });

    res.status(201).json({
      success: true,
      message: "Product batch created successfully",
      data: createdBatch
    });

  } catch (error) {
    console.error("Error creating WMS product batch:", error);
    
    // Handle unique constraint violation (duplicate batch)
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(409).json({ 
        error: "Duplicate batch",
        message: "A batch with this number already exists for this product and store"
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create product batch",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== TASK #25: GET Product Batch KPIs ====================
router.get(
  "/product-batches/:tenantId/:id/kpis", 
  requirePermission('wms.batch.read'),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get session tenant ID (consistent with other WMS routes)
    const sessionTenantId = req.user?.tenantId ?? req.tenant?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Session tenant ID not found" 
      });
    }
    
    // Validate path params
    const { tenantId: pathTenantId, id: batchId } = req.params;
    
    // Security: tenantId in path must match session tenantId
    if (pathTenantId !== sessionTenantId) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Tenant ID mismatch" 
      });
    }
    
    // Validate UUID format
    if (!batchId || !batchId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ 
        error: "Validation failed",
        message: "Invalid batch ID format (must be UUID)" 
      });
    }
    
    // Fetch batch with tenant isolation
    const [batch] = await db
      .select()
      .from(productBatches)
      .where(
        and(
          eq(productBatches.tenantId, sessionTenantId),
          eq(productBatches.id, batchId)
        )
      )
      .limit(1);
    
    if (!batch) {
      return res.status(404).json({ 
        error: "Batch not found",
        message: `Product batch with ID '${batchId}' not found for this tenant`
      });
    }
    
    // Calculate KPIs
    const today = new Date();
    
    // 1. Available Quantity = quantity - reserved
    const availableQuantity = batch.quantity - batch.reserved;
    
    // 2. Used Quantity = initialQuantity - quantity
    const usedQuantity = batch.initialQuantity - batch.quantity;
    
    // 3. Utilization Rate = (reserved / quantity) * 100 (handle division by zero)
    const utilizationRate = batch.quantity > 0 
      ? Math.round((batch.reserved / batch.quantity) * 100 * 100) / 100 // Round to 2 decimals
      : 0;
    
    // 4. Days Until Expiry (if expiryDate exists)
    let daysUntilExpiry: number | null = null;
    let expiryRisk: 'low' | 'medium' | 'high' | 'expired' | null = null;
    
    if (batch.expiryDate) {
      const expiryTime = new Date(batch.expiryDate).getTime();
      const todayTime = today.getTime();
      const diffMs = expiryTime - todayTime;
      daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // Round up to days
      
      // Classify expiry risk
      if (daysUntilExpiry < 0) {
        expiryRisk = 'expired';
      } else if (daysUntilExpiry <= 7) {
        expiryRisk = 'high';
      } else if (daysUntilExpiry <= 30) {
        expiryRisk = 'medium';
      } else {
        expiryRisk = 'low';
      }
    }
    
    // 5. Age in Days (if receivedDate exists)
    let ageInDays: number | null = null;
    
    if (batch.receivedDate) {
      const receivedTime = new Date(batch.receivedDate).getTime();
      const todayTime = today.getTime();
      const diffMs = todayTime - receivedTime;
      ageInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // Round down to days
    }
    
    // 6. Stock Status
    const stockStatus = batch.status === 'expired' 
      ? 'expired'
      : batch.quantity === 0 
        ? 'depleted'
        : availableQuantity === 0 && batch.reserved > 0
          ? 'fully_reserved'
          : availableQuantity > 0
            ? 'available'
            : 'unavailable';
    
    // Construct KPI response
    const kpis = {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      
      // Quantity metrics
      initialQuantity: batch.initialQuantity,
      currentQuantity: batch.quantity,
      reservedQuantity: batch.reserved,
      availableQuantity,
      usedQuantity,
      
      // Performance metrics
      utilizationRate, // Percentage
      
      // Expiry metrics
      expiryDate: batch.expiryDate,
      daysUntilExpiry,
      expiryRisk,
      
      // Age metrics
      receivedDate: batch.receivedDate,
      ageInDays,
      
      // Status
      status: batch.status,
      stockStatus,
      
      // Metadata
      warehouseLocation: batch.warehouseLocation,
      supplier: batch.supplier,
      
      // Future-proofing placeholders (will be populated by Tasks #26/#27)
      // depletionVelocity: null, // units/day (requires stock_movements)
      // shrinkageRate: null, // percentage (requires inventory_adjustments)
      // projectedStockoutDate: null, // date (requires movement history)
    };
    
    // Structured logging
    logger.info('WMS batch KPIs calculated', {
      tenantId: sessionTenantId,
      batchId: batch.id,
      availableQuantity,
      utilizationRate,
      expiryRisk
    });
    
    res.status(200).json({
      success: true,
      data: kpis
    });
    
  } catch (error) {
    console.error("Error calculating WMS batch KPIs:", error);
    res.status(500).json({ 
      error: "Failed to calculate batch KPIs",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== TASK #26: POST Stock Movement ====================
router.post("/stock-movements", rbacMiddleware, requirePermission('wms.stock.write'), async (req, res) => {
  try {
    // Get session tenant ID
    const sessionTenantId = req.user?.tenantId ?? req.tenant?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Session tenant ID not found" 
      });
    }
    
    // Validate request body
    const validationResult = insertStockMovementSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }
    
    const movementData = validationResult.data;
    
    // Validate product exists in tenant
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.id, movementData.productId)
        )
      )
      .limit(1);
    
    if (!product) {
      return res.status(404).json({ 
        error: "Product not found",
        message: `Product with ID '${movementData.productId}' not found for this tenant`
      });
    }
    
    // Business logic for transfers: create paired records
    if (movementData.movementType === 'transfer') {
      // Transfers require sourceStoreId and destinationStoreId
      if (!movementData.sourceStoreId || !movementData.destinationStoreId) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Transfer movements require both sourceStoreId and destinationStoreId"
        });
      }
      
      // Validate stock availability at source for outbound
      if (movementData.productBatchId) {
        const [batch] = await db
          .select()
          .from(productBatches)
          .where(
            and(
              eq(productBatches.id, movementData.productBatchId),
              eq(productBatches.tenantId, sessionTenantId)
            )
          )
          .limit(1);
        
        if (!batch) {
          return res.status(404).json({ 
            error: "Batch not found",
            message: `Product batch with ID '${movementData.productBatchId}' not found`
          });
        }
        
        // Check available stock (quantity - reserved)
        const availableStock = batch.quantity - batch.reserved;
        if (Math.abs(movementData.quantityDelta) > availableStock) {
          return res.status(400).json({ 
            error: "Insufficient stock",
            message: `Not enough available stock for transfer. Available: ${availableStock}, requested: ${Math.abs(movementData.quantityDelta)}`
          });
        }
      } else {
        // Check product-level stock
        if (Math.abs(movementData.quantityDelta) > product.quantityAvailable) {
          return res.status(400).json({ 
            error: "Insufficient stock",
            message: `Not enough stock for transfer. Available: ${product.quantityAvailable}, requested: ${Math.abs(movementData.quantityDelta)}`
          });
        }
      }
      
      // Use transaction for atomic paired record creation
      const createdMovements = await db.transaction(async (tx) => {
        // 1. Create OUTBOUND movement from source
        const outboundMovement = {
          ...movementData,
          movementDirection: 'outbound' as const,
          storeId: movementData.sourceStoreId,
          quantityDelta: -Math.abs(movementData.quantityDelta), // Negative for outbound
          tenantId: sessionTenantId,
          createdBy: req.user?.id
        };
        
        const [outbound] = await tx
          .insert(wmsStockMovements)
          .values(outboundMovement)
          .returning();
        
        // 2. Create INBOUND movement to destination
        const inboundMovement = {
          ...movementData,
          movementDirection: 'inbound' as const,
          storeId: movementData.destinationStoreId,
          quantityDelta: Math.abs(movementData.quantityDelta), // Positive for inbound
          tenantId: sessionTenantId,
          createdBy: req.user?.id,
          referenceType: 'transfer_pair',
          referenceId: outbound.id // Link to outbound movement
        };
        
        const [inbound] = await tx
          .insert(wmsStockMovements)
          .values(inboundMovement)
          .returning();
        
        // 3. Update inventory quantities
        if (movementData.productBatchId) {
          // Update batch quantity
          await tx
            .update(productBatches)
            .set({ 
              quantity: sql`${productBatches.quantity} - ${Math.abs(movementData.quantityDelta)}`,
              updatedAt: new Date()
            })
            .where(eq(productBatches.id, movementData.productBatchId));
        } else {
          // Update product-level quantity (for non-batch items)
          await tx
            .update(products)
            .set({ 
              quantityAvailable: sql`${products.quantityAvailable} - ${Math.abs(movementData.quantityDelta)}`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(products.tenantId, sessionTenantId),
                eq(products.id, movementData.productId)
              )
            );
        }
        
        return [outbound, inbound];
      });
      
      // Structured logging
      logger.info('WMS stock transfer created (paired movements)', {
        tenantId: sessionTenantId,
        productId: movementData.productId,
        quantity: Math.abs(movementData.quantityDelta),
        sourceStoreId: movementData.sourceStoreId,
        destinationStoreId: movementData.destinationStoreId,
        movementIds: createdMovements.map(m => m.id)
      });
      
      return res.status(201).json({
        success: true,
        message: "Stock transfer created successfully (paired movements)",
        data: {
          outbound: createdMovements[0],
          inbound: createdMovements[1]
        }
      });
    }
    
    // Non-transfer movements (purchase_in, sale_out, return_in, adjustment, damaged)
    
    // Validate stock availability for outbound movements
    if (movementData.movementDirection === 'outbound') {
      if (movementData.productBatchId) {
        const [batch] = await db
          .select()
          .from(productBatches)
          .where(
            and(
              eq(productBatches.id, movementData.productBatchId),
              eq(productBatches.tenantId, sessionTenantId)
            )
          )
          .limit(1);
        
        if (!batch) {
          return res.status(404).json({ 
            error: "Batch not found",
            message: `Product batch with ID '${movementData.productBatchId}' not found`
          });
        }
        
        const availableStock = batch.quantity - batch.reserved;
        if (Math.abs(movementData.quantityDelta) > availableStock) {
          return res.status(400).json({ 
            error: "Insufficient stock",
            message: `Not enough available stock. Available: ${availableStock}, requested: ${Math.abs(movementData.quantityDelta)}`
          });
        }
      } else {
        if (Math.abs(movementData.quantityDelta) > product.quantityAvailable) {
          return res.status(400).json({ 
            error: "Insufficient stock",
            message: `Not enough stock. Available: ${product.quantityAvailable}, requested: ${Math.abs(movementData.quantityDelta)}`
          });
        }
      }
    }
    
    // Create movement and update inventory in transaction
    const [createdMovement] = await db.transaction(async (tx) => {
      // 1. Create movement record
      const newMovement = {
        ...movementData,
        tenantId: sessionTenantId,
        createdBy: req.user?.id
      };
      
      const [movement] = await tx
        .insert(wmsStockMovements)
        .values(newMovement)
        .returning();
      
      // 2. Update inventory quantities
      const quantityChange = movementData.movementDirection === 'inbound' 
        ? movementData.quantityDelta 
        : -Math.abs(movementData.quantityDelta);
      
      if (movementData.productBatchId) {
        // Update batch quantity
        await tx
          .update(productBatches)
          .set({ 
            quantity: sql`${productBatches.quantity} + ${quantityChange}`,
            updatedAt: new Date()
          })
          .where(eq(productBatches.id, movementData.productBatchId));
      } else {
        // Update product-level quantity
        await tx
          .update(products)
          .set({ 
            quantityAvailable: sql`${products.quantityAvailable} + ${quantityChange}`,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(products.tenantId, sessionTenantId),
              eq(products.id, movementData.productId)
            )
          );
      }
      
      return [movement];
    });
    
    // Structured logging
    logger.info('WMS stock movement created', {
      tenantId: sessionTenantId,
      movementId: createdMovement.id,
      movementType: movementData.movementType,
      movementDirection: movementData.movementDirection,
      productId: movementData.productId,
      quantityDelta: movementData.quantityDelta
    });
    
    res.status(201).json({
      success: true,
      message: "Stock movement created successfully",
      data: createdMovement
    });
    
  } catch (error) {
    console.error("Error creating WMS stock movement:", error);
    
    // Handle unique constraint violation (duplicate reference)
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(409).json({ 
        error: "Duplicate movement",
        message: "A movement with this reference already exists"
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create stock movement",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== INVENTORY ADJUSTMENTS ====================

/**
 * POST /api/wms/inventory-adjustments
 * 
 * Bulk inventory adjustments for physical count reconciliation.
 * Creates adjustment stock movements and updates quantities atomically.
 * 
 * @permission wms.stock.write
 * @body {
 *   adjustments: Array<{
 *     productId: string,
 *     productBatchId?: string,
 *     storeId?: string,
 *     expectedQuantity: number,
 *     actualQuantity: number,
 *     reason: string,
 *     notes?: string
 *   }>
 * }
 * @returns {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     processedCount: number,
 *     adjustmentsSummary: {
 *       positive: number (additions),
 *       negative: number (subtractions),
 *       noChange: number
 *     },
 *     movements: Array<StockMovement>
 *   }
 * }
 */

const adjustmentItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  productBatchId: z.string().uuid("Invalid batch ID").optional(),
  storeId: z.string().uuid("Invalid store ID").optional(),
  expectedQuantity: z.number().int().min(0, "Expected quantity must be >= 0"),
  actualQuantity: z.number().int().min(0, "Actual quantity must be >= 0"),
  reason: z.string().min(1, "Reason is required for inventory adjustment"),
  notes: z.string().optional()
});

const inventoryAdjustmentsSchema = z.object({
  adjustments: z.array(adjustmentItemSchema).min(1, "At least one adjustment is required")
});

router.post("/inventory-adjustments", rbacMiddleware, requirePermission("wms.stock.write"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }
    
    // Validate request body
    const validationResult = inventoryAdjustmentsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.flatten()
      });
    }
    
    const { adjustments } = validationResult.data;
    
    // Process adjustments in transaction
    const result = await db.transaction(async (tx) => {
      const createdMovements = [];
      let positiveAdjustments = 0;
      let negativeAdjustments = 0;
      let noChangeCount = 0;
      
      // Phase 1: Validate all products exist
      for (const adj of adjustments) {
        const product = await tx.query.products.findFirst({
          where: and(
            eq(products.tenantId, tenantId),
            eq(products.id, adj.productId)
          )
        });
        
        if (!product) {
          throw new Error(`Product with ID '${adj.productId}' not found for this tenant`);
        }
        
        // If batch specified, validate it exists
        if (adj.productBatchId) {
          const batch = await tx.query.productBatches.findFirst({
            where: and(
              eq(productBatches.tenantId, tenantId),
              eq(productBatches.id, adj.productBatchId),
              eq(productBatches.productId, adj.productId)
            )
          });
          
          if (!batch) {
            throw new Error(`Batch '${adj.productBatchId}' not found for product '${adj.productId}'`);
          }
        }
      }
      
      // Phase 2: Create adjustment movements and update quantities
      for (const adj of adjustments) {
        const delta = adj.actualQuantity - adj.expectedQuantity;
        
        // Skip if no change
        if (delta === 0) {
          noChangeCount++;
          continue;
        }
        
        // Determine direction
        const direction = delta > 0 ? "inbound" : "outbound";
        
        // Track summary
        if (delta > 0) {
          positiveAdjustments++;
        } else {
          negativeAdjustments++;
        }
        
        // Create stock movement
        const movementId = crypto.randomUUID();
        const [movement] = await tx.insert(wmsStockMovements).values({
          id: movementId,
          tenantId,
          productId: adj.productId,
          productBatchId: adj.productBatchId || null,
          storeId: adj.storeId || null,
          movementType: "adjustment",
          movementDirection: direction,
          quantityDelta: delta,
          notes: `${adj.reason}${adj.notes ? ` - ${adj.notes}` : ''}\nExpected: ${adj.expectedQuantity}, Actual: ${adj.actualQuantity}`,
          createdBy: userId || null,
          occurredAt: new Date()
        }).returning();
        
        // Update quantities
        if (adj.productBatchId) {
          // Update batch quantity
          await tx.update(productBatches)
            .set({
              quantity: sql`${productBatches.quantity} + ${delta}`
            })
            .where(and(
              eq(productBatches.tenantId, tenantId),
              eq(productBatches.id, adj.productBatchId)
            ));
        } else {
          // Update product quantity
          await tx.update(products)
            .set({
              quantityAvailable: sql`${products.quantityAvailable} + ${delta}`
            })
            .where(and(
              eq(products.tenantId, tenantId),
              eq(products.id, adj.productId)
            ));
        }
        
        createdMovements.push(movement);
      }
      
      return {
        processedCount: adjustments.length,
        adjustmentsSummary: {
          positive: positiveAdjustments,
          negative: negativeAdjustments,
          noChange: noChangeCount
        },
        movements: createdMovements
      };
    });
    
    res.status(201).json({
      success: true,
      message: `Processed ${result.processedCount} adjustments successfully`,
      data: result
    });
    
  } catch (error) {
    console.error("Error processing inventory adjustments:", error);
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ 
        error: "Resource not found",
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: "Failed to process inventory adjustments",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== BARCODE GENERATION ====================

/**
 * POST /api/wms/barcodes/generate
 * 
 * Generate barcode images for WMS products (EAN-13, Code128, QR Code, GS1-128).
 * 
 * @permission wms.products.write
 * @body {
 *   type: 'ean13' | 'code128' | 'qrcode' | 'gs1-128'
 *   value: string (data to encode)
 *   options?: {
 *     scale?: number (1-10, default: 2)
 *     height?: number (pixels, default: 50)
 *     includeText?: boolean (default: true)
 *     textColor?: string (hex, default: '000000')
 *     backgroundColor?: string (hex, default: 'FFFFFF')
 *   }
 *   format?: 'png' | 'svg' (default: 'png')
 * }
 * @returns {
 *   success: boolean,
 *   data: {
 *     type: string,
 *     value: string,
 *     format: string,
 *     image: string (base64 for PNG, SVG string for SVG),
 *     mimeType: string
 *   }
 * }
 */

const barcodeGenerateSchema = z.object({
  type: z.enum(['ean13', 'code128', 'qrcode', 'gs1-128'], {
    errorMap: () => ({ message: "Type must be one of: ean13, code128, qrcode, gs1-128" })
  }),
  value: z.string().min(1, "Value is required").max(500, "Value too long"),
  options: z.object({
    scale: z.number().int().min(1).max(10).optional(),
    height: z.number().int().min(10).max(500).optional(),
    includeText: z.boolean().optional(),
    textColor: z.string().regex(/^[0-9A-Fa-f]{6}$/, "Text color must be hex (e.g., 000000)").optional(),
    backgroundColor: z.string().regex(/^[0-9A-Fa-f]{6}$/, "Background color must be hex (e.g., FFFFFF)").optional(),
  }).optional(),
  format: z.enum(['png', 'svg']).optional(),
});

router.post("/barcodes/generate", rbacMiddleware, requirePermission('wms.products.write'), async (req, res) => {
  try {
    // Validate request body
    const validationResult = barcodeGenerateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid barcode generation request",
        details: validationResult.error.flatten()
      });
    }
    
    const { type, value, options = {}, format = 'png' } = validationResult.data;
    
    // Map WMS barcode types to bwip-js symbology
    const symbologyMap: Record<string, string> = {
      'ean13': 'ean13',
      'code128': 'code128',
      'qrcode': 'qrcode',
      'gs1-128': 'gs1-128'
    };
    
    const bcid = symbologyMap[type];
    if (!bcid) {
      return res.status(400).json({ error: `Unsupported barcode type: ${type}` });
    }
    
    // Prepare bwip-js options
    const bwipOptions: any = {
      bcid,
      text: value,
      scale: options.scale || 2,
      height: options.height || (type === 'qrcode' ? 10 : 50), // QR codes use module size
      includetext: options.includeText !== false,
      textxalign: 'center',
    };
    
    // Apply colors
    if (options.textColor) {
      bwipOptions.textcolor = options.textColor;
    }
    if (options.backgroundColor) {
      bwipOptions.backgroundcolor = options.backgroundColor;
    }
    
    // Special handling for EAN-13 (requires 12 or 13 digits)
    if (type === 'ean13') {
      const digits = value.replace(/\D/g, ''); // Remove non-digits
      if (digits.length !== 12 && digits.length !== 13) {
        return res.status(400).json({
          error: "EAN-13 requires 12 digits (checksum auto-calculated) or 13 digits (with checksum)"
        });
      }
      bwipOptions.text = digits;
    }
    
    // Generate barcode
    let barcodeData: string;
    let mimeType: string;
    
    if (format === 'svg') {
      const bwipjs = await import('bwip-js');
      const svg = bwipjs.toSVG(bwipOptions);
      barcodeData = svg;
      mimeType = 'image/svg+xml';
    } else {
      // PNG format (default)
      const bwipjs = await import('bwip-js');
      const png = await bwipjs.toBuffer(bwipOptions);
      barcodeData = png.toString('base64');
      mimeType = 'image/png';
    }
    
    res.status(200).json({
      success: true,
      data: {
        type,
        value,
        format,
        image: barcodeData,
        mimeType
      }
    });
    
  } catch (error: any) {
    console.error("Error generating barcode:", error);
    
    // Handle bwip-js specific errors
    if (error.message?.includes('Unknown bar code type')) {
      return res.status(400).json({ error: "Invalid barcode type" });
    }
    if (error.message?.includes('Invalid') || error.message?.includes('barcode')) {
      return res.status(400).json({ 
        error: "Invalid barcode value",
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to generate barcode",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== WAREHOUSE LOCATIONS ====================

/**
 * GET /api/wms/warehouse-locations
 * 
 * Retrieve warehouse locations with filtering, pagination, and sorting.
 * 
 * @permission wms.warehouse.read
 * @query {
 *   storeId?: string (UUID filter)
 *   zone?: string (partial match filter)
 *   isActive?: boolean
 *   locationType?: 'shelf' | 'pallet' | 'bin' | 'floor'
 *   minCapacity?: number (capacity >= minCapacity)
 *   maxOccupancy?: number (currentOccupancy <= maxOccupancy)
 *   page?: number (default: 1)
 *   limit?: number (default: 20, max: 100)
 *   sortBy?: string (default: code)
 *   sortOrder?: 'asc' | 'desc' (default: asc)
 * }
 * @returns {
 *   success: boolean,
 *   data: Array<WarehouseLocation>,
 *   pagination: { page, limit, totalPages, totalCount }
 * }
 */

const warehouseLocationQuerySchema = z.object({
  storeId: z.string().uuid("Store ID must be valid UUID").optional(),
  zone: z.string().max(50, "Zone filter too long").optional(),
  isActive: z.enum(['true', 'false']).optional(),
  locationType: z.enum(['shelf', 'pallet', 'bin', 'floor']).optional(),
  minCapacity: z.string().regex(/^\d+$/, "Min capacity must be number").optional(),
  maxOccupancy: z.string().regex(/^\d+$/, "Max occupancy must be number").optional(),
  page: z.string().regex(/^\d+$/, "Page must be number").optional(),
  limit: z.string().regex(/^\d+$/, "Limit must be number").optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

router.get("/warehouse-locations", rbacMiddleware, requirePermission('wms.warehouse.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }
    
    // Validate query params
    const validationResult = warehouseLocationQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: validationResult.error.flatten()
      });
    }
    
    const {
      storeId,
      zone,
      isActive,
      locationType,
      minCapacity,
      maxOccupancy,
      page = "1",
      limit = "20",
      sortBy = "code",
      sortOrder = "asc"
    } = validationResult.data;
    
    // Parse pagination with clamping (min 1)
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const offset = (pageNum - 1) * limitNum;
    
    // Build filters
    const filters = [eq(wmsWarehouseLocations.tenantId, tenantId)];
    
    if (storeId) {
      filters.push(eq(wmsWarehouseLocations.storeId, storeId));
    }
    
    if (zone) {
      filters.push(ilike(wmsWarehouseLocations.zone, `%${zone}%`));
    }
    
    if (isActive !== undefined) {
      filters.push(eq(wmsWarehouseLocations.isActive, isActive === 'true'));
    }
    
    if (locationType) {
      filters.push(eq(wmsWarehouseLocations.locationType, locationType));
    }
    
    if (minCapacity) {
      filters.push(sql`${wmsWarehouseLocations.capacity} >= ${parseInt(minCapacity)}`);
    }
    
    if (maxOccupancy) {
      filters.push(sql`${wmsWarehouseLocations.currentOccupancy} <= ${parseInt(maxOccupancy)}`);
    }
    
    // Determine sort column
    const sortColumn = sortBy === 'name' ? wmsWarehouseLocations.name :
                       sortBy === 'zone' ? wmsWarehouseLocations.zone :
                       sortBy === 'capacity' ? wmsWarehouseLocations.capacity :
                       sortBy === 'occupancy' ? wmsWarehouseLocations.currentOccupancy :
                       sortBy === 'created_at' ? wmsWarehouseLocations.createdAt :
                       wmsWarehouseLocations.code; // default
    
    const orderFn = sortOrder === 'desc' ? desc : asc;
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(wmsWarehouseLocations)
      .where(and(...filters));
    
    const totalCount = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limitNum);
    
    // Get locations
    const locations = await db.query.wmsWarehouseLocations.findMany({
      where: and(...filters),
      orderBy: [orderFn(sortColumn)],
      limit: limitNum,
      offset
    });
    
    res.status(200).json({
      success: true,
      data: locations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalCount
      }
    });
    
  } catch (error) {
    console.error("Error fetching warehouse locations:", error);
    res.status(500).json({ 
      error: "Failed to fetch warehouse locations",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET /api/wms/analytics/stock-levels
 * 
 * Get stock level analytics with aggregations by store, product, and status.
 * 
 * @permission wms.analytics.read
 * @query {
 *   storeId?: string (UUID filter)
 *   productId?: string (UUID filter)
 *   groupBy?: 'store' | 'product' | 'status' (default: store)
 *   minQuantity?: number (filter items with quantity >= threshold)
 *   maxQuantity?: number (filter items with quantity <= threshold)
 *   includeZeroStock?: boolean (default: false)
 * }
 * @returns {
 *   success: boolean,
 *   data: {
 *     summary: {
 *       totalProducts: number,
 *       totalQuantity: number,
 *       totalValue: number,
 *       averageQuantity: number
 *     },
 *     stockLevels: Array<{
 *       groupKey: string,
 *       groupLabel: string,
 *       totalQuantity: number,
 *       productCount: number,
 *       averageQuantity: number,
 *       breakdown: Record<string, number>
 *     }>
 *   }
 * }
 */

const stockLevelsQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  groupBy: z.enum(['store', 'product', 'status']).optional(),
  minQuantity: z.string().regex(/^\d+$/).optional(),
  maxQuantity: z.string().regex(/^\d+$/).optional(),
  includeZeroStock: z.enum(['true', 'false']).optional(),
});

router.get("/analytics/stock-levels", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }
    
    const validationResult = stockLevelsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: validationResult.error.flatten()
      });
    }
    
    const {
      storeId,
      productId,
      groupBy = 'store',
      minQuantity,
      maxQuantity,
      includeZeroStock = 'false'
    } = validationResult.data;
    
    // Build SQL query to aggregate stock levels from stock movements
    // Calculate current stock by summing all movement deltas for each product+store combination
    let query = sql`
      SELECT 
        store_id,
        product_id,
        SUM(quantity_delta) as total_quantity,
        COUNT(DISTINCT id) as movement_count,
        MAX(movement_type) as last_movement_type
      FROM ${wmsStockMovements}
      WHERE tenant_id = ${tenantId}
    `;
    
    const conditions: any[] = [];
    
    if (storeId) {
      conditions.push(sql`store_id = ${storeId}`);
    }
    if (productId) {
      conditions.push(sql`product_id = ${productId}`);
    }
    
    if (conditions.length > 0) {
      query = sql`${query} AND ${sql.join(conditions, sql` AND `)}`;
    }
    
    query = sql`${query} GROUP BY store_id, product_id`;
    
    // Apply quantity filters after aggregation
    const havingConditions: any[] = [];
    
    if (minQuantity) {
      havingConditions.push(sql`SUM(quantity_delta) >= ${parseInt(minQuantity)}`);
    }
    if (maxQuantity) {
      havingConditions.push(sql`SUM(quantity_delta) <= ${parseInt(maxQuantity)}`);
    }
    if (includeZeroStock === 'false') {
      havingConditions.push(sql`SUM(quantity_delta) > 0`);
    }
    
    if (havingConditions.length > 0) {
      query = sql`${query} HAVING ${sql.join(havingConditions, sql` AND `)}`;
    }
    
    const items = await db.execute(query) as any;
    
    // Calculate summary stats from aggregated results
    const rows = items.rows || items;
    const totalQuantity = rows.reduce((sum: number, row: any) => sum + parseInt(row.total_quantity || 0), 0);
    const totalProducts = rows.length;
    const averageQuantity = totalProducts > 0 ? totalQuantity / totalProducts : 0;
    
    // Calculate total value (TODO: Join with products table for price calculation)
    const totalValue = 0;
    
    // Group aggregations
    const groupedData = new Map<string, {
      groupKey: string;
      groupLabel: string;
      totalQuantity: number;
      productCount: number;
      items: typeof items;
    }>();
    
    for (const row of rows) {
      const qty = parseInt(row.total_quantity || 0);
      let groupKey: string;
      let groupLabel: string;
      
      if (groupBy === 'store') {
        groupKey = row.store_id || 'unknown';
        groupLabel = row.store_id ? `Store ${row.store_id.substring(0, 8)}...` : 'Unknown Store';
      } else if (groupBy === 'product') {
        groupKey = row.product_id || 'unknown';
        groupLabel = row.product_id ? `Product ${row.product_id.substring(0, 8)}...` : 'Unknown Product';
      } else {
        // For status grouping, use movement_type as proxy
        groupKey = row.last_movement_type || 'unknown';
        groupLabel = (row.last_movement_type || 'UNKNOWN').toUpperCase();
      }
      
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          groupKey,
          groupLabel,
          totalQuantity: 0,
          productCount: 0,
          items: [],
        });
      }
      
      const group = groupedData.get(groupKey)!;
      group.totalQuantity += qty;
      group.productCount += 1;
      group.items.push(row);
    }
    
    // Build stock levels response
    const stockLevels = Array.from(groupedData.values()).map(group => {
      const breakdown: Record<string, number> = {};
      
      // Add breakdown by movement type for store/product grouping
      if (groupBy !== 'status') {
        for (const row of group.items) {
          const movementType = row.last_movement_type || 'unknown';
          if (!breakdown[movementType]) {
            breakdown[movementType] = 0;
          }
          breakdown[movementType] += parseInt(row.total_quantity || 0);
        }
      }
      
      return {
        groupKey: group.groupKey,
        groupLabel: group.groupLabel,
        totalQuantity: group.totalQuantity,
        productCount: group.productCount,
        averageQuantity: group.productCount > 0 ? group.totalQuantity / group.productCount : 0,
        breakdown: Object.keys(breakdown).length > 0 ? breakdown : undefined,
      };
    });
    
    // Sort by total quantity descending
    stockLevels.sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalQuantity,
          totalValue: Math.round(totalValue * 100) / 100,
          averageQuantity: Math.round(averageQuantity * 100) / 100,
        },
        stockLevels,
      }
    });
    
  } catch (error) {
    console.error("Error fetching stock level analytics:", error);
    res.status(500).json({ 
      error: "Failed to fetch stock level analytics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/analytics/expiration-dashboard
 * 
 * Analytics endpoint for tracking product batch expiration status.
 * Categorizes batches by urgency (expired, expiring-soon, warning, ok).
 * 
 * @permission wms.analytics.read
 * @queryParams {
 *   storeId?: string (UUID filter)
 *   productId?: string (UUID filter)
 *   daysThreshold?: string (number, default: 30 for "expiring soon")
 *   warningDays?: string (number, default: 90 for "warning" zone)
 *   includeExpired?: string (boolean, default: true)
 * }
 * @returns {
 *   success: boolean,
 *   data: {
 *     summary: {
 *       totalBatches: number,
 *       totalQuantity: number,
 *       expiredBatches: number,
 *       expiredQuantity: number,
 *       expiringSoonBatches: number,
 *       expiringSoonQuantity: number,
 *       warningBatches: number,
 *       warningQuantity: number
 *     },
 *     batches: Array<{
 *       urgencyLevel: 'expired' | 'expiring-soon' | 'warning' | 'ok',
 *       batchId: string,
 *       batchNumber: string,
 *       productId: string,
 *       storeId: string | null,
 *       quantity: number,
 *       expiryDate: string,
 *       daysUntilExpiry: number,
 *       status: string
 *     }>
 *   }
 * }
 */

const expirationDashboardQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  daysThreshold: z.string().optional(), // Days for "expiring soon" category
  warningDays: z.string().optional(), // Days for "warning" category
  includeExpired: z.string().optional(), // Include expired batches (default: true)
});

router.get("/analytics/expiration-dashboard", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const validationResult = expirationDashboardQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: validationResult.error.flatten()
      });
    }
    
    const {
      storeId,
      productId,
      daysThreshold = '30', // Default 30 days for "expiring soon"
      warningDays = '90', // Default 90 days for "warning"
      includeExpired = 'true'
    } = validationResult.data;
    
    const thresholdDays = parseInt(daysThreshold);
    const warningThreshold = parseInt(warningDays);
    
    // Build filters
    const filters = [eq(productBatches.tenantId, tenantId)];
    
    if (storeId) {
      filters.push(eq(productBatches.storeId, storeId));
    }
    if (productId) {
      filters.push(eq(productBatches.productId, productId));
    }
    
    // Only include batches with expiry dates
    filters.push(sql`${productBatches.expiryDate} IS NOT NULL`);
    
    // Get all batches with expiry dates
    const batches = await db
      .select({
        id: productBatches.id,
        batchNumber: productBatches.batchNumber,
        productId: productBatches.productId,
        storeId: productBatches.storeId,
        quantity: productBatches.quantity,
        expiryDate: productBatches.expiryDate,
        status: productBatches.status,
      })
      .from(productBatches)
      .where(and(...filters));
    
    // Categorize batches by urgency
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const categorizedBatches = batches.map(batch => {
      const expiryDate = new Date(batch.expiryDate!);
      expiryDate.setHours(0, 0, 0, 0);
      
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgencyLevel: 'expired' | 'expiring-soon' | 'warning' | 'ok';
      
      if (daysUntilExpiry < 0) {
        urgencyLevel = 'expired';
      } else if (daysUntilExpiry <= thresholdDays) {
        urgencyLevel = 'expiring-soon';
      } else if (daysUntilExpiry <= warningThreshold) {
        urgencyLevel = 'warning';
      } else {
        urgencyLevel = 'ok';
      }
      
      return {
        urgencyLevel,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        productId: batch.productId,
        storeId: batch.storeId,
        quantity: batch.quantity,
        expiryDate: batch.expiryDate!,
        daysUntilExpiry,
        status: batch.status,
      };
    });
    
    // Filter out expired if requested
    const filteredBatches = includeExpired === 'false' 
      ? categorizedBatches.filter(b => b.urgencyLevel !== 'expired')
      : categorizedBatches;
    
    // Calculate summary statistics
    const summary = {
      totalBatches: filteredBatches.length,
      totalQuantity: filteredBatches.reduce((sum, b) => sum + b.quantity, 0),
      expiredBatches: filteredBatches.filter(b => b.urgencyLevel === 'expired').length,
      expiredQuantity: filteredBatches.filter(b => b.urgencyLevel === 'expired').reduce((sum, b) => sum + b.quantity, 0),
      expiringSoonBatches: filteredBatches.filter(b => b.urgencyLevel === 'expiring-soon').length,
      expiringSoonQuantity: filteredBatches.filter(b => b.urgencyLevel === 'expiring-soon').reduce((sum, b) => sum + b.quantity, 0),
      warningBatches: filteredBatches.filter(b => b.urgencyLevel === 'warning').length,
      warningQuantity: filteredBatches.filter(b => b.urgencyLevel === 'warning').reduce((sum, b) => sum + b.quantity, 0),
    };
    
    // Sort by urgency (expired first) then by days until expiry
    const urgencyOrder = { 'expired': 0, 'expiring-soon': 1, 'warning': 2, 'ok': 3 };
    filteredBatches.sort((a, b) => {
      if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
        return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
    
    res.status(200).json({
      success: true,
      data: {
        summary,
        batches: filteredBatches,
      }
    });
    
  } catch (error) {
    console.error("Error fetching expiration dashboard:", error);
    res.status(500).json({ 
      error: "Failed to fetch expiration dashboard",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/reports/export
 * 
 * Synchronous report export endpoint for immediate downloads.
 * Supports CSV and JSON formats (use async job queue for PDF/XLSX).
 * 
 * @permission wms.analytics.read
 * @queryParams {
 *   reportType: 'products' | 'batches' | 'stock-movements' | 'expiration-dashboard'
 *   format: 'csv' | 'json' (default: csv)
 *   storeId?: string (UUID filter)
 *   productId?: string (UUID filter)
 *   startDate?: string (ISO date filter for movements)
 *   endDate?: string (ISO date filter for movements)
 *   limit?: string (number, max results, default: 1000)
 * }
 * @returns {
 *   CSV file download or JSON response
 * }
 */

const reportExportQuerySchema = z.object({
  reportType: z.enum(['products', 'batches', 'stock-movements', 'expiration-dashboard']),
  format: z.enum(['csv', 'json']).optional(),
  storeId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(), // ISO date
  limit: z.string().optional(),
});

router.get("/reports/export", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const validationResult = reportExportQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: validationResult.error.flatten()
      });
    }
    
    const {
      reportType,
      format = 'csv',
      storeId,
      productId,
      startDate,
      endDate,
      limit = '1000'
    } = validationResult.data;
    
    const maxLimit = Math.min(parseInt(limit), 10000); // Cap at 10k rows for sync export
    
    let data: any[] = [];
    let filename = '';
    
    // Fetch data based on report type
    switch (reportType) {
      case 'products': {
        filename = `products_export_${new Date().toISOString().split('T')[0]}.${format}`;
        
        const filters = [eq(products.tenantId, tenantId)];
        if (storeId) {
          // Products don't have direct store FK, skip store filter for products
        }
        
        const results = await db
          .select({
            id: products.id,
            sku: products.sku,
            name: products.name,
            brand: products.brand,
            ean: products.ean,
            type: products.type,
            isSerializable: products.isSerializable,
            unitOfMeasure: products.unitOfMeasure,
            quantityAvailable: products.quantityAvailable,
            quantityReserved: products.quantityReserved,
            reorderPoint: products.reorderPoint,
            isActive: products.isActive,
          })
          .from(products)
          .where(and(...filters))
          .limit(maxLimit);
        
        data = results;
        break;
      }
      
      case 'batches': {
        filename = `batches_export_${new Date().toISOString().split('T')[0]}.${format}`;
        
        const filters = [eq(productBatches.tenantId, tenantId)];
        if (storeId) {
          filters.push(eq(productBatches.storeId, storeId));
        }
        if (productId) {
          filters.push(eq(productBatches.productId, productId));
        }
        
        const results = await db
          .select({
            id: productBatches.id,
            productId: productBatches.productId,
            storeId: productBatches.storeId,
            batchNumber: productBatches.batchNumber,
            initialQuantity: productBatches.initialQuantity,
            quantity: productBatches.quantity,
            reserved: productBatches.reserved,
            supplier: productBatches.supplier,
            receivedDate: productBatches.receivedDate,
            expiryDate: productBatches.expiryDate,
            status: productBatches.status,
            createdAt: productBatches.createdAt,
          })
          .from(productBatches)
          .where(and(...filters))
          .limit(maxLimit);
        
        data = results;
        break;
      }
      
      case 'stock-movements': {
        filename = `stock_movements_export_${new Date().toISOString().split('T')[0]}.${format}`;
        
        const filters = [eq(wmsStockMovements.tenantId, tenantId)];
        if (storeId) {
          filters.push(eq(wmsStockMovements.storeId, storeId));
        }
        if (productId) {
          filters.push(eq(wmsStockMovements.productId, productId));
        }
        if (startDate) {
          filters.push(sql`${wmsStockMovements.createdAt} >= ${startDate}`);
        }
        if (endDate) {
          filters.push(sql`${wmsStockMovements.createdAt} <= ${endDate}`);
        }
        
        const results = await db
          .select({
            id: wmsStockMovements.id,
            productId: wmsStockMovements.productId,
            storeId: wmsStockMovements.storeId,
            warehouseLocation: wmsStockMovements.warehouseLocation,
            movementType: wmsStockMovements.movementType,
            movementDirection: wmsStockMovements.movementDirection,
            quantityDelta: wmsStockMovements.quantityDelta,
            referenceId: wmsStockMovements.referenceId,
            referenceType: wmsStockMovements.referenceType,
            externalParty: wmsStockMovements.externalParty,
            notes: wmsStockMovements.notes,
            occurredAt: wmsStockMovements.occurredAt,
            createdBy: wmsStockMovements.createdBy,
            createdAt: wmsStockMovements.createdAt,
          })
          .from(wmsStockMovements)
          .where(and(...filters))
          .orderBy(desc(wmsStockMovements.occurredAt))
          .limit(maxLimit);
        
        data = results;
        break;
      }
      
      case 'expiration-dashboard': {
        filename = `expiration_dashboard_export_${new Date().toISOString().split('T')[0]}.${format}`;
        
        const filters = [eq(productBatches.tenantId, tenantId)];
        if (storeId) {
          filters.push(eq(productBatches.storeId, storeId));
        }
        if (productId) {
          filters.push(eq(productBatches.productId, productId));
        }
        filters.push(sql`${productBatches.expiryDate} IS NOT NULL`);
        
        const batches = await db
          .select({
            id: productBatches.id,
            batchNumber: productBatches.batchNumber,
            productId: productBatches.productId,
            storeId: productBatches.storeId,
            quantity: productBatches.quantity,
            expiryDate: productBatches.expiryDate,
            status: productBatches.status,
          })
          .from(productBatches)
          .where(and(...filters))
          .limit(maxLimit);
        
        // Calculate urgency levels
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        data = batches.map(batch => {
          const expiryDate = new Date(batch.expiryDate!);
          expiryDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          let urgencyLevel: string;
          if (daysUntilExpiry < 0) {
            urgencyLevel = 'expired';
          } else if (daysUntilExpiry <= 30) {
            urgencyLevel = 'expiring-soon';
          } else if (daysUntilExpiry <= 90) {
            urgencyLevel = 'warning';
          } else {
            urgencyLevel = 'ok';
          }
          
          return {
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            productId: batch.productId,
            storeId: batch.storeId,
            quantity: batch.quantity,
            expiryDate: batch.expiryDate,
            daysUntilExpiry,
            urgencyLevel,
            status: batch.status,
          };
        });
        
        break;
      }
    }
    
    // Generate output based on format
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).json({
        success: true,
        reportType,
        generatedAt: new Date().toISOString(),
        recordCount: data.length,
        data,
      });
    } else {
      // CSV format
      if (data.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send('No data available for export\n');
      }
      
      // Extract headers from first row
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      // Convert rows to CSV
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) {
            return '';
          }
          // Escape commas and quotes in CSV values
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvRows.push(values.join(','));
      }
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    }
    
  } catch (error) {
    console.error("Error exporting report:", error);
    res.status(500).json({ 
      error: "Failed to export report",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== JOB QUEUE ENDPOINTS ====================

/**
 * POST /api/wms/jobs/bulk-serial-import
 * 
 * Enqueue bulk serial import job (async processing).
 * 
 * @permission wms.products.write
 * @body {
 *   productId: string (UUID)
 *   serials: Array<{
 *     serialValue: string
 *     batchId?: string (UUID)
 *     storeId: string (UUID)
 *     locationId?: string (UUID)
 *   }>
 * }
 * @returns {
 *   success: boolean,
 *   jobId: string,
 *   message: string
 * }
 */

const bulkSerialImportJobSchema = z.object({
  productId: z.string().uuid("Product ID must be valid UUID"),
  serials: z.array(z.object({
    serialValue: z.string().min(1, "Serial value required").max(255),
    batchId: z.string().uuid().optional(),
    storeId: z.string().uuid("Store ID must be valid UUID"),
    locationId: z.string().uuid().optional(),
  })).min(1, "At least one serial required").max(10000, "Maximum 10,000 serials per job"),
});

router.post("/jobs/bulk-serial-import", rbacMiddleware, requirePermission('wms.products.write'), async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.status(503).json({ 
        error: "Async job processing unavailable",
        details: "Redis is required for WMS background jobs. Please configure REDIS_URL environment variable.",
        suggestion: "For immediate processing, use synchronous endpoints instead."
      });
    }
    
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const validationResult = bulkSerialImportJobSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid bulk serial import request",
        details: validationResult.error.flatten()
      });
    }
    
    const { productId, serials } = validationResult.data;
    
    startWMSWorker();
    
    const job = await enqueueBulkSerialImport({
      tenantId,
      userId,
      productId,
      serials,
    });
    
    res.status(202).json({
      success: true,
      jobId: job.id,
      message: `Bulk import job enqueued (${serials.length} serials)`
    });
    
  } catch (error) {
    console.error("Error enqueueing bulk serial import:", error);
    res.status(500).json({ 
      error: "Failed to enqueue bulk serial import",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/jobs/generate-report
 * 
 * Enqueue report generation job (async processing).
 * 
 * @permission wms.analytics.read
 * @body {
 *   reportType: 'stock-levels' | 'expiration-dashboard' | 'batch-kpis' | 'movements'
 *   format: 'pdf' | 'csv' | 'xlsx'
 *   filters?: Record<string, any>
 * }
 * @returns {
 *   success: boolean,
 *   jobId: string,
 *   message: string
 * }
 */

const generateReportJobSchema = z.object({
  reportType: z.enum(['stock-levels', 'expiration-dashboard', 'batch-kpis', 'movements']),
  format: z.enum(['pdf', 'csv', 'xlsx']),
  filters: z.record(z.any()).optional(),
});

router.post("/jobs/generate-report", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.status(503).json({ 
        error: "Async job processing unavailable",
        details: "Redis is required for WMS background jobs. Please configure REDIS_URL environment variable."
      });
    }
    
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const validationResult = generateReportJobSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid report generation request",
        details: validationResult.error.flatten()
      });
    }
    
    const { reportType, format, filters } = validationResult.data;
    
    startWMSWorker();
    
    const job = await enqueueGenerateReport({
      tenantId,
      userId,
      reportType,
      format,
      filters,
    });
    
    res.status(202).json({
      success: true,
      jobId: job.id,
      message: `Report generation job enqueued (${reportType}.${format})`
    });
    
  } catch (error) {
    console.error("Error enqueueing report generation:", error);
    res.status(500).json({ 
      error: "Failed to enqueue report generation",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/jobs/batch-stock-update
 * 
 * Enqueue batch stock update job (async processing).
 * 
 * @permission wms.products.write
 * @body {
 *   updates: Array<{
 *     productItemId: string (UUID)
 *     storeId: string (UUID)
 *     newQuantity?: number
 *     newStatus?: string
 *     locationId?: string (UUID)
 *   }>
 *   reason?: string
 * }
 * @returns {
 *   success: boolean,
 *   jobId: string,
 *   message: string
 * }
 */

const batchStockUpdateJobSchema = z.object({
  updates: z.array(z.object({
    productItemId: z.string().uuid("Product item ID must be valid UUID"),
    storeId: z.string().uuid("Store ID must be valid UUID"),
    newQuantity: z.number().int().min(0).optional(),
    newStatus: z.string().optional(),
    locationId: z.string().uuid().optional(),
  })).min(1, "At least one update required").max(5000, "Maximum 5,000 updates per job"),
  reason: z.string().max(500).optional(),
});

router.post("/jobs/batch-stock-update", rbacMiddleware, requirePermission('wms.products.write'), async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.status(503).json({ 
        error: "Async job processing unavailable",
        details: "Redis is required for WMS background jobs. Please configure REDIS_URL environment variable."
      });
    }
    
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const validationResult = batchStockUpdateJobSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid batch stock update request",
        details: validationResult.error.flatten()
      });
    }
    
    const { updates, reason } = validationResult.data;
    
    startWMSWorker();
    
    const job = await enqueueBatchStockUpdate({
      tenantId,
      userId,
      updates,
      reason,
    });
    
    res.status(202).json({
      success: true,
      jobId: job.id,
      message: `Batch stock update job enqueued (${updates.length} items)`
    });
    
  } catch (error) {
    console.error("Error enqueueing batch stock update:", error);
    res.status(500).json({ 
      error: "Failed to enqueue batch stock update",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/jobs/expiration-alert
 * 
 * Enqueue expiration alert job (async processing).
 * 
 * @permission wms.analytics.read
 * @body {
 *   daysThreshold: number (alert for items expiring within X days)
 *   channels: Array<'email' | 'notification' | 'webhook'>
 * }
 * @returns {
 *   success: boolean,
 *   jobId: string,
 *   message: string
 * }
 */

const expirationAlertJobSchema = z.object({
  daysThreshold: z.number().int().min(1).max(365, "Max 365 days threshold"),
  channels: z.array(z.enum(['email', 'notification', 'webhook'])).min(1, "At least one channel required"),
});

router.post("/jobs/expiration-alert", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.status(503).json({ 
        error: "Async job processing unavailable",
        details: "Redis is required for WMS background jobs. Please configure REDIS_URL environment variable."
      });
    }
    
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const validationResult = expirationAlertJobSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid expiration alert request",
        details: validationResult.error.flatten()
      });
    }
    
    const { daysThreshold, channels } = validationResult.data;
    
    startWMSWorker();
    
    const job = await enqueueExpirationAlert({
      tenantId,
      daysThreshold,
      channels,
    });
    
    res.status(202).json({
      success: true,
      jobId: job.id,
      message: `Expiration alert job enqueued (${daysThreshold} days threshold)`
    });
    
  } catch (error) {
    console.error("Error enqueueing expiration alert:", error);
    res.status(500).json({ 
      error: "Failed to enqueue expiration alert",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/jobs/metrics
 * 
 * Get WMS queue metrics (waiting, active, completed, failed jobs).
 * 
 * @permission wms.analytics.read
 * @returns {
 *   success: boolean,
 *   data: {
 *     queueName: string,
 *     waiting: number,
 *     active: number,
 *     completed: number,
 *     failed: number,
 *     delayed: number,
 *     total: number
 *   }
 * }
 */

router.get("/jobs/metrics", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    if (!isRedisAvailable()) {
      return res.status(503).json({ 
        error: "Job metrics unavailable",
        details: "Redis is required for WMS job queue metrics. Please configure REDIS_URL environment variable."
      });
    }
    
    const metrics = await getWMSQueueMetrics();
    
    res.status(200).json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    console.error("Error fetching WMS queue metrics:", error);
    res.status(500).json({ 
      error: "Failed to fetch queue metrics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== WMS CATEGORIES ENDPOINTS ====================

/**
 * GET /api/wms/categories/:tenantId
 * Get all categories for a tenant
 * Returns Brand categories (source='brand') + Tenant categories
 */
router.get("/categories", rbacMiddleware, requirePermission('wms.category.read'), async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const categories = await db
      .select({
        id: wmsCategories.id,
        nome: wmsCategories.nome,
        descrizione: wmsCategories.descrizione,
        icona: wmsCategories.icona,
        ordine: wmsCategories.ordine,
        source: wmsCategories.source,
        isBrandSynced: wmsCategories.isBrandSynced,
        isActive: wmsCategories.isActive,
        createdAt: wmsCategories.createdAt,
        updatedAt: wmsCategories.updatedAt,
      })
      .from(wmsCategories)
      .where(
        and(
          eq(wmsCategories.tenantId, sessionTenantId),
          eq(wmsCategories.isActive, true)
        )
      )
      .orderBy(asc(wmsCategories.ordine), asc(wmsCategories.nome));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ 
      error: "Failed to fetch categories",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/categories/:tenantId
 * Create a new category (tenant-owned only)
 */
router.post("/categories", rbacMiddleware, requirePermission('wms.category.create'), async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Validate request body
    const schema = z.object({
      nome: z.string().min(1, "Nome obbligatorio").max(255),
      descrizione: z.string().optional(),
      icona: z.string().max(100).optional(),
      ordine: z.coerce.number().int().default(0),
    });

    const validatedData = schema.parse(req.body);

    // Generate unique ID for category
    const categoryId = crypto.randomUUID();

    const [newCategory] = await db
      .insert(wmsCategories)
      .values({
        tenantId: sessionTenantId,
        id: categoryId,
        source: 'tenant', // Always tenant-created via this endpoint
        isBrandSynced: false,
        nome: validatedData.nome,
        descrizione: validatedData.descrizione || null,
        icona: validatedData.icona || null,
        ordine: validatedData.ordine,
        isActive: true,
        createdBy: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info('WMS category created', {
      tenantId: sessionTenantId,
      categoryId,
      nome: newCategory.nome,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: newCategory
    });
  } catch (error) {
    console.error("Error creating category:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error",
        details: error.errors
      });
    }

    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(409).json({ 
        error: "Nome categoria già esistente",
        message: "Una categoria con questo nome esiste già per questo tenant"
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create category",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PATCH /api/wms/categories/:tenantId/:id
 * Update a category (only tenant-owned, not Brand)
 */
router.patch("/categories/:id", rbacMiddleware, requirePermission('wms.category.update'), async (req, res) => {
  try {
    const { id: categoryId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing category
    const [existingCategory] = await db
      .select()
      .from(wmsCategories)
      .where(
        and(
          eq(wmsCategories.tenantId, sessionTenantId),
          eq(wmsCategories.id, categoryId)
        )
      )
      .limit(1);

    if (!existingCategory) {
      return res.status(404).json({ 
        error: "Category not found",
        message: `Category with ID '${categoryId}' not found for this tenant`
      });
    }

    // Prevent update if Brand-synced
    if (existingCategory.source === 'brand' && existingCategory.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot update Brand-synced category",
        message: "This category is managed by Brand HQ and cannot be modified by tenants."
      });
    }

    // Validate request body
    const schema = z.object({
      nome: z.string().min(1).max(255).optional(),
      descrizione: z.string().optional(),
      icona: z.string().max(100).optional(),
      ordine: z.coerce.number().int().optional(),
    });

    const validatedData = schema.parse(req.body);

    const [updatedCategory] = await db
      .update(wmsCategories)
      .set({
        ...validatedData,
        modifiedBy: userId || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(wmsCategories.tenantId, sessionTenantId),
          eq(wmsCategories.id, categoryId)
        )
      )
      .returning();

    logger.info('WMS category updated', {
      tenantId: sessionTenantId,
      categoryId,
      updatedBy: userId
    });

    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error("Error updating category:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error",
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      error: "Failed to update category",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * DELETE /api/wms/categories/:tenantId/:id
 * Soft-delete a category (only tenant-owned, check dependencies)
 */
router.delete("/categories/:id", rbacMiddleware, requirePermission('wms.category.delete'), async (req, res) => {
  try {
    const { id: categoryId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing category
    const [existingCategory] = await db
      .select()
      .from(wmsCategories)
      .where(
        and(
          eq(wmsCategories.tenantId, sessionTenantId),
          eq(wmsCategories.id, categoryId)
        )
      )
      .limit(1);

    if (!existingCategory) {
      return res.status(404).json({ 
        error: "Category not found",
        message: `Category with ID '${categoryId}' not found for this tenant`
      });
    }

    // Prevent deletion if Brand-synced
    if (existingCategory.source === 'brand' && existingCategory.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot delete Brand-synced category",
        message: "This category is managed by Brand HQ and cannot be deleted by tenants."
      });
    }

    // Check for active product types dependencies
    const activeTypesCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wmsProductTypes)
      .where(
        and(
          eq(wmsProductTypes.tenantId, sessionTenantId),
          eq(wmsProductTypes.categoryId, categoryId),
          eq(wmsProductTypes.isActive, true)
        )
      );

    const count = activeTypesCount[0]?.count ?? 0;

    if (count > 0) {
      return res.status(409).json({ 
        error: "Cannot delete category with active product types",
        message: `This category has ${count} active product type(s). Please delete or reassign them first.`,
        activeTypesCount: count
      });
    }

    // Soft-delete
    const [deletedCategory] = await db
      .update(wmsCategories)
      .set({ 
        isActive: false,
        archivedAt: new Date(),
        modifiedBy: userId || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(wmsCategories.tenantId, sessionTenantId),
          eq(wmsCategories.id, categoryId)
        )
      )
      .returning();

    logger.info('WMS category soft-deleted', {
      tenantId: sessionTenantId,
      categoryId,
      nome: deletedCategory.nome,
      deletedBy: userId
    });

    res.json({
      success: true,
      message: "Category successfully archived",
      data: deletedCategory
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ 
      error: "Failed to delete category",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== WMS PRODUCT TYPES ENDPOINTS ====================

/**
 * GET /api/wms/product-types/:tenantId?categoryId=xxx
 * Get all product types for a tenant (optionally filtered by category)
 */
router.get("/product-types", rbacMiddleware, requirePermission('wms.product_type.read'), async (req, res) => {
  try {
    const { categoryId } = req.query;
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const whereConditions = [
      eq(wmsProductTypes.tenantId, sessionTenantId),
      eq(wmsProductTypes.isActive, true)
    ];

    // Filter by categoryId if provided
    if (categoryId && typeof categoryId === 'string') {
      whereConditions.push(eq(wmsProductTypes.categoryId, categoryId));
    }

    const productTypes = await db
      .select({
        id: wmsProductTypes.id,
        categoryId: wmsProductTypes.categoryId,
        nome: wmsProductTypes.nome,
        descrizione: wmsProductTypes.descrizione,
        ordine: wmsProductTypes.ordine,
        source: wmsProductTypes.source,
        isBrandSynced: wmsProductTypes.isBrandSynced,
        isActive: wmsProductTypes.isActive,
        createdAt: wmsProductTypes.createdAt,
        updatedAt: wmsProductTypes.updatedAt,
      })
      .from(wmsProductTypes)
      .where(and(...whereConditions))
      .orderBy(asc(wmsProductTypes.ordine), asc(wmsProductTypes.nome));

    res.json({
      success: true,
      data: productTypes
    });
  } catch (error) {
    console.error("Error fetching product types:", error);
    res.status(500).json({ 
      error: "Failed to fetch product types",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/product-types/:tenantId
 * Create a new product type (tenant-owned only)
 */
router.post("/product-types", rbacMiddleware, requirePermission('wms.product_type.create'), async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Validate request body
    const schema = z.object({
      categoryId: z.string().min(1, "Category ID obbligatorio"),
      nome: z.string().min(1, "Nome obbligatorio").max(255),
      descrizione: z.string().optional(),
      ordine: z.coerce.number().int().default(0),
    });

    const validatedData = schema.parse(req.body);

    // Verify category exists
    const [category] = await db
      .select()
      .from(wmsCategories)
      .where(
        and(
          eq(wmsCategories.tenantId, sessionTenantId),
          eq(wmsCategories.id, validatedData.categoryId),
          eq(wmsCategories.isActive, true)
        )
      )
      .limit(1);

    if (!category) {
      return res.status(404).json({ 
        error: "Category not found",
        message: `Category with ID '${validatedData.categoryId}' not found or inactive`
      });
    }

    // Generate unique ID for product type
    const typeId = crypto.randomUUID();

    const [newType] = await db
      .insert(wmsProductTypes)
      .values({
        tenantId: sessionTenantId,
        id: typeId,
        source: 'tenant', // Always tenant-created via this endpoint
        isBrandSynced: false,
        categoryId: validatedData.categoryId,
        nome: validatedData.nome,
        descrizione: validatedData.descrizione || null,
        ordine: validatedData.ordine,
        isActive: true,
        createdBy: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info('WMS product type created', {
      tenantId: sessionTenantId,
      typeId,
      categoryId: validatedData.categoryId,
      nome: newType.nome,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: newType
    });
  } catch (error) {
    console.error("Error creating product type:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error",
        details: error.errors
      });
    }

    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(409).json({ 
        error: "Nome tipologia già esistente",
        message: "Una tipologia con questo nome esiste già in questa categoria"
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create product type",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PATCH /api/wms/product-types/:tenantId/:id
 * Update a product type (only tenant-owned, not Brand)
 */
router.patch("/product-types/:id", rbacMiddleware, requirePermission('wms.product_type.update'), async (req, res) => {
  try {
    const { id: typeId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing type
    const [existingType] = await db
      .select()
      .from(wmsProductTypes)
      .where(
        and(
          eq(wmsProductTypes.tenantId, sessionTenantId),
          eq(wmsProductTypes.id, typeId)
        )
      )
      .limit(1);

    if (!existingType) {
      return res.status(404).json({ 
        error: "Product type not found",
        message: `Product type with ID '${typeId}' not found for this tenant`
      });
    }

    // Prevent update if Brand-synced
    if (existingType.source === 'brand' && existingType.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot update Brand-synced product type",
        message: "This product type is managed by Brand HQ and cannot be modified by tenants."
      });
    }

    // Validate request body
    const schema = z.object({
      categoryId: z.string().min(1).optional(),
      nome: z.string().min(1).max(255).optional(),
      descrizione: z.string().optional(),
      ordine: z.coerce.number().int().optional(),
    });

    const validatedData = schema.parse(req.body);

    // If changing category, verify new category exists
    if (validatedData.categoryId) {
      const [category] = await db
        .select()
        .from(wmsCategories)
        .where(
          and(
            eq(wmsCategories.tenantId, sessionTenantId),
            eq(wmsCategories.id, validatedData.categoryId),
            eq(wmsCategories.isActive, true)
          )
        )
        .limit(1);

      if (!category) {
        return res.status(404).json({ 
          error: "Category not found",
          message: `Category with ID '${validatedData.categoryId}' not found or inactive`
        });
      }
    }

    const [updatedType] = await db
      .update(wmsProductTypes)
      .set({
        ...validatedData,
        modifiedBy: userId || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(wmsProductTypes.tenantId, sessionTenantId),
          eq(wmsProductTypes.id, typeId)
        )
      )
      .returning();

    logger.info('WMS product type updated', {
      tenantId: sessionTenantId,
      typeId,
      updatedBy: userId
    });

    res.json({
      success: true,
      data: updatedType
    });
  } catch (error) {
    console.error("Error updating product type:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error",
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      error: "Failed to update product type",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * DELETE /api/wms/product-types/:tenantId/:id
 * Soft-delete a product type (only tenant-owned, check dependencies)
 */
router.delete("/product-types/:id", rbacMiddleware, requirePermission('wms.product_type.delete'), async (req, res) => {
  try {
    const { id: typeId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing type
    const [existingType] = await db
      .select()
      .from(wmsProductTypes)
      .where(
        and(
          eq(wmsProductTypes.tenantId, sessionTenantId),
          eq(wmsProductTypes.id, typeId)
        )
      )
      .limit(1);

    if (!existingType) {
      return res.status(404).json({ 
        error: "Product type not found",
        message: `Product type with ID '${typeId}' not found for this tenant`
      });
    }

    // Prevent deletion if Brand-synced
    if (existingType.source === 'brand' && existingType.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot delete Brand-synced product type",
        message: "This product type is managed by Brand HQ and cannot be deleted by tenants."
      });
    }

    // Check for active products dependencies
    const activeProductsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.typeId, typeId),
          eq(products.isActive, true)
        )
      );

    const count = activeProductsCount[0]?.count ?? 0;

    if (count > 0) {
      return res.status(409).json({ 
        error: "Cannot delete product type with active products",
        message: `This product type has ${count} active product(s). Please delete or reassign them first.`,
        activeProductsCount: count
      });
    }

    // Soft-delete
    const [deletedType] = await db
      .update(wmsProductTypes)
      .set({ 
        isActive: false,
        archivedAt: new Date(),
        modifiedBy: userId || null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(wmsProductTypes.tenantId, sessionTenantId),
          eq(wmsProductTypes.id, typeId)
        )
      )
      .returning();

    logger.info('WMS product type soft-deleted', {
      tenantId: sessionTenantId,
      typeId,
      nome: deletedType.nome,
      deletedBy: userId
    });

    res.json({
      success: true,
      message: "Product type successfully archived",
      data: deletedType
    });
  } catch (error) {
    console.error("Error deleting product type:", error);
    res.status(500).json({ 
      error: "Failed to delete product type",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
