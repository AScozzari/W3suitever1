import { Router, Request, Response } from "express";
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
import { eq, and, ilike, or, desc, asc, sql, inArray, gte, lte, isNull, isNotNull } from "drizzle-orm";
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
  insertCategorySchema,
  updateCategorySchema,
  stores,
  // CQRS WMS tables
  productVersions,
  insertProductVersionSchema,
  wmsInventoryBalances,
  wmsInventorySnapshots,
  suppliers,
  supplierOverrides,
  drivers,
  financialEntities,
  insertFinancialEntitySchema,
  // Price Lists
  priceLists,
  priceListItems,
  priceListItemsCanvas,
  priceListItemCanvasAddons,
  priceListItemCompositions,
  productSupplierMappings,
  insertPriceListSchema,
  insertPriceListItemSchema,
  insertPriceListItemCanvasSchema,
  driverCategoryMappings,
  // Receiving Drafts
  wmsReceivingDrafts,
  insertReceivingDraftSchema,
  // WMS Documents
  wmsDocuments,
  wmsDocumentItems,
  wmsDocumentPhases,
  wmsDocumentAttachments,
  wmsDocumentNumberingConfig,
  wmsOrderApprovalConfig,
  insertWmsDocumentSchema,
  insertWmsDocumentItemSchema,
  insertWmsDocumentPhaseSchema,
  insertWmsDocumentNumberingConfigSchema,
  insertWmsOrderApprovalConfigSchema,
  users
} from "../db/schema/w3suite";
import { vatRegimes } from "../db/schema/public";
import { tenantMiddleware, rbacMiddleware, requirePermission } from "../middleware/tenant";
import { logger } from "../core/logger";
import { z } from "zod";
import { wmsWorkflowService } from "../services/wms-workflow.service";
import { wmsStatusHistoryService } from "../services/wms-status-history.service";
import { wmsReceivingService, ReceivingRequest, ReceivingItem } from "../services/wms-receiving.service";
import { analyzeProductChanges, VERSIONING_INFO_TOOLTIP } from "../lib/wms-versioning-config";

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
 * GET /api/wms/dashboard/stats
 * Get aggregate KPI statistics for WMS dashboard
 * Returns: total products, categories, suppliers, price lists, productsByType, categoriesByType
 */
router.get("/dashboard/stats", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Count active products (excluding expired)
    const [productsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          or(
            isNull(products.validTo),
            gte(products.validTo, sql`CURRENT_DATE`)
          )
        )
      );

    // Count products by type
    const productsByTypeResult = await db
      .select({ 
        type: products.type,
        count: sql<number>`count(*)::int` 
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          or(
            isNull(products.validTo),
            gte(products.validTo, sql`CURRENT_DATE`)
          )
        )
      )
      .groupBy(products.type);

    // Transform to object format
    const productsByType = {
      PHYSICAL: 0,
      VIRTUAL: 0,
      CANVAS: 0,
      SERVICE: 0
    };
    productsByTypeResult.forEach(row => {
      if (row.type && row.type in productsByType) {
        productsByType[row.type as keyof typeof productsByType] = row.count;
      }
    });

    // Count active categories
    const [categoriesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wmsCategories)
      .where(
        and(
          eq(wmsCategories.tenantId, tenantId),
          eq(wmsCategories.isActive, true)
        )
      );

    // Count products per category (for top categories chart)
    const categoriesByTypeResult = await db.execute(sql`
      SELECT c.nome as name, COUNT(p.id)::int as count
      FROM w3suite.wms_categories c
      LEFT JOIN w3suite.products p ON p.category_id = c.id AND p.tenant_id = ${tenantId} AND p.is_active = true
      WHERE c.tenant_id = ${tenantId} AND c.is_active = true
      GROUP BY c.id, c.nome
      ORDER BY COUNT(p.id) DESC
      LIMIT 10
    `);

    // Extract rows from the result
    const categoryRows = categoriesByTypeResult?.rows || [];
    const categoriesByType = categoryRows.map((row: any) => ({
      name: row.name,
      count: row.count || 0
    }));

    // Count typologies
    const [typologiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wmsProductTypes)
      .where(
        and(
          eq(wmsProductTypes.tenantId, tenantId),
          eq(wmsProductTypes.isActive, true)
        )
      );

    // Count financial entities (brand-pushed + tenant-specific)
    const [financialEntitiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(financialEntities)
      .where(
        and(
          eq(financialEntities.status, 'active'),
          or(
            eq(financialEntities.origin, 'brand'),
            eq(financialEntities.tenantId, tenantId)
          )
        )
      );

    // Count suppliers from both tables
    const suppliersResult = await db.execute(sql`
      SELECT COALESCE(SUM(c), 0)::int as count FROM (
        SELECT COUNT(*) as c FROM w3suite.suppliers 
        WHERE tenant_id = ${tenantId} AND status = 'active'
        UNION ALL
        SELECT COUNT(*) as c FROM w3suite.supplier_overrides 
        WHERE tenant_id = ${tenantId} AND status = 'active'
      ) t
    `);

    const suppliersCount = suppliersResult?.rows?.[0]?.count || 0;
    
    // Price lists table (wms_price_lists) - planned for future implementation
    const priceListsCount = 0;

    res.json({
      success: true,
      data: {
        totalProducts: productsCount?.count || 0,
        totalCategories: categoriesCount?.count || 0,
        totalTypologies: typologiesCount?.count || 0,
        totalSuppliers: suppliersCount,
        totalFinancialEntities: financialEntitiesCount?.count || 0,
        totalPriceLists: priceListsCount,
        productsByType,
        categoriesByType
      }
    });
  } catch (error: any) {
    logger.error("Failed to fetch dashboard stats", { 
      error: error.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({ 
      error: "Failed to fetch dashboard statistics",
      message: error.message 
    });
  }
});

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

    // Parse and validate query parameters - Enterprise WMS filters
    const {
      search,
      sku,
      ean,
      imei,
      type,
      source,
      brand,
      model,
      memory,
      color,
      status,
      condition,
      serial_type,
      is_serializable,
      category_id,
      type_id,
      supplier_id,
      is_active,
      include_expired,
      created_from,
      created_to,
      page = "1",
      limit = "250",
      sort_by = "created_at",
      sort_order = "desc"
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(250, Math.max(1, parseInt(limit as string) || 250));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions: any[] = [
      eq(products.tenantId, tenantId)
    ];

    // Full-text search across multiple fields (SKU, EAN, brand, name, description, model)
    if (search && typeof search === "string") {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(products.sku, searchPattern),
          ilike(products.ean, searchPattern),
          ilike(products.brand, searchPattern),
          ilike(products.name, searchPattern),
          ilike(products.description, searchPattern),
          ilike(products.model, searchPattern)
        )
      );
    }

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

    // Model filter (partial match)
    if (model && typeof model === "string") {
      conditions.push(ilike(products.model, `%${model}%`));
    }

    // Memory filter (exact match)
    if (memory && typeof memory === "string") {
      conditions.push(eq(products.memory, memory));
    }

    // Color filter (partial match)
    if (color && typeof color === "string") {
      conditions.push(ilike(products.color, `%${color}%`));
    }

    // Status filter (active/inactive/discontinued/draft)
    if (status && typeof status === "string") {
      const validStatuses = ["active", "inactive", "discontinued", "draft"];
      if (validStatuses.includes(status)) {
        conditions.push(eq(products.status, status as any));
      }
    }

    // Condition filter (new/used/refurbished/demo)
    if (condition && typeof condition === "string") {
      const validConditions = ["new", "used", "refurbished", "demo"];
      if (validConditions.includes(condition)) {
        conditions.push(eq(products.condition, condition as any));
      }
    }

    // Serial type filter (imei/iccid/mac_address/other)
    if (serial_type && typeof serial_type === "string") {
      const validSerialTypes = ["imei", "iccid", "mac_address", "other"];
      if (validSerialTypes.includes(serial_type)) {
        conditions.push(eq(products.serialType, serial_type as any));
      }
    }

    // Is serializable filter
    if (is_serializable !== undefined) {
      const serializableFlag = is_serializable === "true" || is_serializable === "1";
      conditions.push(eq(products.isSerializable, serializableFlag));
    }

    // Category filter (exact match by ID)
    if (category_id && typeof category_id === "string") {
      conditions.push(eq(products.categoryId, category_id));
    }

    // Type filter (exact match by ID)
    if (type_id && typeof type_id === "string") {
      conditions.push(eq(products.typeId, type_id));
    }

    // Supplier filter (exact match by ID)
    if (supplier_id && typeof supplier_id === "string") {
      conditions.push(eq(products.supplierId, supplier_id));
    }

    if (is_active !== undefined) {
      const activeFlag = is_active === "true" || is_active === "1";
      conditions.push(eq(products.isActive, activeFlag));
    }

    // Created date range filters
    if (created_from && typeof created_from === "string") {
      conditions.push(gte(products.createdAt, new Date(created_from)));
    }
    if (created_to && typeof created_to === "string") {
      conditions.push(lte(products.createdAt, new Date(created_to)));
    }

    // IMEI filter - searches in product_serials table via EXISTS subquery
    // This finds products that have items with matching serial values
    if (imei && typeof imei === "string") {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM w3suite.product_items pi
          JOIN w3suite.product_serials ps ON ps.product_item_id = pi.id
          WHERE pi.product_id = ${products.id}
            AND pi.tenant_id = ${tenantId}
            AND ps.tenant_id = ${tenantId}
            AND ps.serial_value ILIKE ${'%' + imei + '%'}
        )`
      );
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

    // Get paginated products with category/type info and aggregated IMEIs
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
        updatedAt: products.updatedAt,
        imeis: sql<string[]>`COALESCE(
          (SELECT array_agg(DISTINCT ps.serial_value)
           FROM w3suite.product_items pi
           JOIN w3suite.product_serials ps ON ps.product_item_id = pi.id
           WHERE pi.product_id = ${products.id}
             AND pi.tenant_id = ${tenantId}
             AND ps.tenant_id = ${tenantId}
             AND ps.serial_type = 'imei'
          ), ARRAY[]::text[])`
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
 * POST /api/wms/products
 * Create a new product
 * Body: Zod-validated product data (insertProductSchema)
 * - Auto-generates UUID for id
 * - Validates SKU uniqueness
 * - Sets createdBy, createdAt, updatedAt timestamps
 * - Supports source: brand | tenant
 */
router.post("/products", rbacMiddleware, requirePermission('wms.product.create'), async (req, res) => {
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

    // Prepare product for insertion (cast to table insert type for Drizzle compatibility)
    const newProduct = {
      ...productData,
      tenantId,
      id: newProductId,
      createdBy: userId || null,
      modifiedBy: userId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as typeof products.$inferInsert;

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
 * PATCH /api/wms/products/:id
 * Update an existing product
 * Params: id (product ID)
 * Body: Partial product data (updateProductSchema)
 * - Prevents update if source='brand' AND is_brand_synced=true (Brand-managed products)
 * - Auto-sets modifiedBy and updatedAt
 * - Validates SKU uniqueness if SKU is being changed
 */
router.patch("/products/:id", rbacMiddleware, requirePermission('wms.product.update'), async (req, res) => {
  try {
    const { id: productId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
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

    // Analyze changes for versioning
    const changeAnalysis = analyzeProductChanges(existingProduct, updateData);
    
    // Check versioning mode from request header
    const versioningMode = req.headers['x-versioning-mode'] as string | undefined;
    const createNewProduct = req.headers['x-create-new-product'] === 'true';
    
    // If identity fields changed and no explicit instruction, return analysis for frontend decision
    if (changeAnalysis.requiresIdentityConfirm && !versioningMode && !createNewProduct) {
      return res.status(422).json({
        error: "Identity change requires confirmation",
        changeAnalysis,
        message: "Hai modificato SKU, EAN o Tipo. Scegli se creare un nuovo prodotto o storicizzare.",
        options: ['new_product', 'versioning']
      });
    }
    
    // If versioning fields changed and no explicit instruction, return analysis for frontend decision
    if (changeAnalysis.requiresVersioning && !versioningMode) {
      return res.status(422).json({
        error: "Commercial change requires confirmation",
        changeAnalysis,
        message: "Hai modificato campi commerciali (prezzi/canone). Scegli il tipo di modifica.",
        options: ['correction', 'business_change']
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

    // Handle versioning if business_change mode
    let newVersionId: string | null = null;
    
    if (versioningMode === 'business_change' && changeAnalysis.requiresVersioning) {
      // Get current active version
      const [currentVersion] = await db
        .select()
        .from(productVersions)
        .where(
          and(
            eq(productVersions.tenantId, sessionTenantId),
            eq(productVersions.productId, productId),
            isNull(productVersions.validTo)
          )
        )
        .limit(1);
      
      const today = new Date().toISOString().split('T')[0];
      const nextVersion = currentVersion ? currentVersion.version + 1 : 1;
      
      // Close current version if exists
      if (currentVersion) {
        await db
          .update(productVersions)
          .set({ validTo: today })
          .where(eq(productVersions.id, currentVersion.id));
      }
      
      // Create new version with new commercial data
      const [newVersion] = await db
        .insert(productVersions)
        .values({
          tenantId: sessionTenantId,
          productId: productId,
          version: nextVersion,
          monthlyFee: updateData.monthlyFee?.toString() || existingProduct.monthlyFee,
          unitPrice: updateData.unitPrice?.toString() || null,
          costPrice: updateData.costPrice?.toString() || null,
          validFrom: today,
          validTo: null,
          changeReason: 'business_change',
          changeNotes: `Modifica campi: ${changeAnalysis.changedVersioningFields.join(', ')}`,
          createdBy: userId || null
        })
        .returning();
      
      newVersionId = newVersion.id;
      
      logger.info('WMS product version created', {
        tenantId: sessionTenantId,
        productId,
        version: nextVersion,
        changeReason: 'business_change',
        changedFields: changeAnalysis.changedVersioningFields
      });
    }

    // Prepare update data with audit fields (cast for Drizzle compatibility)
    const productUpdate = {
      ...updateData,
      modifiedBy: userId || null,
      updatedAt: new Date()
    } as Partial<typeof products.$inferInsert>;

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
      changedFields: Object.keys(updateData),
      versioningMode: versioningMode || 'none',
      newVersionId
    });

    res.json({
      success: true,
      data: updatedProduct,
      versioning: newVersionId ? {
        created: true,
        versionId: newVersionId,
        mode: versioningMode
      } : null
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
 * DELETE /api/wms/products/:id
 * Soft-delete a product (set is_active=false, archived_at=NOW)
 * Params: id (product ID)
 * - Checks for active product_items dependencies before deletion
 * - Prevents deletion if product has active items
 * - Marks product as inactive with archived timestamp
 */
router.delete("/products/:id", rbacMiddleware, requirePermission('wms.product.delete'), async (req, res) => {
  try {
    const { id: productId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
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
          inArray(productItems.logisticStatus, [...ACTIVE_ITEM_STATUSES])
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
    await client.uploadFromBytes(objectPath, req.file.buffer);

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

/**
 * POST /api/wms/products/generate-sku
 * Generate automatic SKU based on category and sequence
 * Body: { categoryId?: string, type?: string }
 * Returns: { sku: string }
 */
router.post("/products/generate-sku", rbacMiddleware, requirePermission('wms.product.create'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const { categoryId, type } = req.body;

    // Get prefix from category or type
    let prefix = 'PROD';
    
    if (categoryId) {
      // Try to get category code/name for prefix
      const category = await db.query.wmsCategories.findFirst({
        where: and(
          eq(wmsCategories.tenantId, tenantId),
          eq(wmsCategories.id, categoryId)
        ),
        columns: { codice: true, nome: true }
      });
      
      if (category) {
        // Use first 3-4 chars of code or name
        prefix = (category.codice || category.nome || 'PROD')
          .substring(0, 4)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');
      }
    } else if (type) {
      // Use product type as prefix
      const typeMap: Record<string, string> = {
        'PHYSICAL': 'PHY',
        'VIRTUAL': 'VIR',
        'SERVICE': 'SVC',
        'CANVAS': 'CNV'
      };
      prefix = typeMap[type] || 'PROD';
    }

    // Get next sequence number for this tenant
    const existingProducts = await db.query.products.findMany({
      where: and(
        eq(products.tenantId, tenantId),
        sql`${products.sku} LIKE ${prefix + '-%'}`
      ),
      columns: { sku: true },
      orderBy: [desc(products.createdAt)],
      limit: 100
    });

    // Find highest sequence number
    let maxSequence = 0;
    for (const p of existingProducts) {
      const match = p.sku.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSequence) maxSequence = seq;
      }
    }

    // Generate new SKU
    const nextSequence = maxSequence + 1;
    const sku = `${prefix}-${String(nextSequence).padStart(5, '0')}`;

    logger.info('SKU generated automatically', {
      tenantId,
      categoryId,
      type,
      prefix,
      generatedSku: sku
    });

    res.json({
      success: true,
      sku
    });

  } catch (error) {
    console.error("Error generating SKU:", error);
    
    res.status(500).json({ 
      error: "Failed to generate SKU",
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

    // Build ORDER BY clause with type-safe column mapping
    type SortableColumn = typeof productItems.createdAt | typeof productItems.updatedAt | typeof productItems.condition | typeof productItems.logisticStatus;
    const sortColumns: Record<string, SortableColumn> = {
      createdAt: productItems.createdAt,
      updatedAt: productItems.updatedAt,
      condition: productItems.condition,
      logisticStatus: productItems.logisticStatus
    };
    const sortColumn = sortColumns[sortBy as string] || productItems.createdAt;
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

    const reconciliationResults: Array<{
      productId: string;
      storeId: string | null;
      expectedCount: number;
      actualCount: number;
      discrepancy: number;
      status: 'match' | 'surplus' | 'shortage';
    }> = [];
    const adjustments: Array<typeof wmsInventoryAdjustments.$inferSelect> = [];
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
 * GET /api/wms/product-serials/:productId
 * Retrieve all serials for a product with their status history (story telling)
 * - Returns productItems with joined serials and status change logs
 * - For inventory modal serialized view
 * - Optional storeId query param to filter by store
 */
router.get("/product-serials/:productId", rbacMiddleware, requirePermission('wms.serial.read'), async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const { productId } = req.params;
    const { storeId } = req.query;
    
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Get product info with brand, model, color, memory, category, VAT regime and rate
    // Use raw SQL to avoid Drizzle issues with nullable left join fields
    const productQuery = await db.execute(sql`
      SELECT 
        p.id, p.name, p.sku, p.brand, p.model, p.ean, p.color, p.memory,
        p.category_id as "categoryId",
        c.nome as "categoryName",
        p.vat_regime_id as "vatRegimeId",
        vr.code as "vatRegimeCode",
        vr.name as "vatRegimeName",
        vr.vat_payer as "vatPayer",
        vr.rate_strategy as "rateStrategy",
        vrt.id as "vatRateId",
        vrt.code as "vatRateCode",
        vrt.name as "vatRateName",
        vrt.rate_percent as "vatRatePercent"
      FROM w3suite.products p
      LEFT JOIN w3suite.wms_categories c ON c.id = p.category_id AND c.tenant_id = ${sessionTenantId}
      LEFT JOIN public.vat_regimes vr ON vr.id = p.vat_regime_id
      LEFT JOIN public.vat_rates vrt ON vrt.id = vr.fixed_rate_id
      WHERE p.id = ${productId} AND p.tenant_id = ${sessionTenantId}
      LIMIT 1
    `);
    
    const product = productQuery.rows[0] as {
      id: string;
      name: string;
      sku: string;
      brand: string | null;
      model: string | null;
      ean: string | null;
      color: string | null;
      memory: string | null;
      categoryId: string | null;
      categoryName: string | null;
      vatRegimeId: string | null;
      vatRegimeCode: string | null;
      vatRegimeName: string | null;
      vatPayer: string | null;
      rateStrategy: string | null;
      vatRateId: string | null;
      vatRateCode: string | null;
      vatRateName: string | null;
      vatRatePercent: string | null;
    } | undefined;

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Build conditions for product items
    const itemConditions = [
      eq(productItems.productId, productId),
      eq(productItems.tenantId, sessionTenantId)
    ];
    
    // Add storeId filter if provided
    if (storeId && typeof storeId === 'string') {
      itemConditions.push(eq(productItems.storeId, storeId));
    }

    // Get all product items with their serials, store info, supplier info, and batch info
    const items = await db
      .select({
        itemId: productItems.id,
        storeId: productItems.storeId,
        storeName: stores.nome,
        storeCode: stores.code,
        logisticStatus: productItems.logisticStatus,
        condition: productItems.condition,
        createdAt: productItems.createdAt,
        updatedAt: productItems.updatedAt,
        serialId: productSerials.id,
        serialNumber: productSerials.serialValue,
        serialType: productSerials.serialType,
        serialCreatedAt: productSerials.createdAt,
        // Supplier info
        supplierId: productItems.lastSupplierId,
        supplierName: suppliers.name,
        supplierSku: productItems.supplierSku,
        purchaseCost: productItems.lastPurchaseCost,
        purchaseDate: productItems.lastPurchaseDate,
        // Batch info
        batchId: productItems.batchId,
        batchNumber: productBatches.batchNumber,
        batchExpiryDate: productBatches.expiryDate,
      })
      .from(productItems)
      .leftJoin(productSerials, eq(productSerials.productItemId, productItems.id))
      .leftJoin(stores, eq(stores.id, productItems.storeId))
      .leftJoin(suppliers, eq(suppliers.id, productItems.lastSupplierId))
      .leftJoin(productBatches, eq(productBatches.id, productItems.batchId))
      .where(and(...itemConditions))
      .orderBy(desc(productItems.createdAt));

    // Get status history for all items
    const itemIds = [...new Set(items.map(i => i.itemId))];
    
    let statusHistory: any[] = [];
    if (itemIds.length > 0) {
      statusHistory = await db
        .select({
          id: productItemStatusHistory.id,
          productItemId: productItemStatusHistory.productItemId,
          fromStatus: productItemStatusHistory.fromStatus,
          toStatus: productItemStatusHistory.toStatus,
          changedAt: productItemStatusHistory.changedAt,
          changedBy: productItemStatusHistory.changedByName,
          notes: productItemStatusHistory.notes,
          statusChangeGroupId: productItemStatusHistory.statusChangeGroupId,
        })
        .from(productItemStatusHistory)
        .where(and(
          eq(productItemStatusHistory.tenantId, sessionTenantId),
          inArray(productItemStatusHistory.productItemId, itemIds)
        ))
        .orderBy(desc(productItemStatusHistory.changedAt));
    }

    // Group serials by item and attach status history
    const serialsMap = new Map<string, any>();
    
    for (const row of items) {
      if (!row.serialId) continue;
      
      const itemHistory = statusHistory.filter(h => h.productItemId === row.itemId);
      
      serialsMap.set(row.serialId, {
        id: row.serialId,
        itemId: row.itemId, // Product item ID for grouping multiple serials of same physical unit
        serialNumber: row.serialNumber,
        serialType: row.serialType,
        logisticStatus: row.logisticStatus,
        condition: row.condition,
        color: product.color,
        memory: product.memory,
        ean: product.ean,
        // Store info
        storeId: row.storeId,
        storeName: row.storeName,
        storeCode: row.storeCode,
        // Supplier info
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        supplierSku: row.supplierSku,
        purchaseCost: row.purchaseCost,
        purchaseDate: row.purchaseDate,
        // Batch info
        batchId: row.batchId,
        batchNumber: row.batchNumber,
        batchExpiryDate: row.batchExpiryDate,
        // Timestamps
        createdAt: row.serialCreatedAt || row.createdAt,
        updatedAt: row.updatedAt,
        statusHistory: itemHistory.map(h => ({
          id: h.id,
          serialId: row.serialId,
          previousStatus: h.fromStatus,
          newStatus: h.toStatus,
          changedAt: h.changedAt,
          changedBy: h.changedBy,
          notes: h.notes,
          statusChangeGroupId: h.statusChangeGroupId,
        })),
      });
    }

    const serialsList = Array.from(serialsMap.values());

    logger.info('WMS product serials with history retrieved', {
      tenantId: sessionTenantId,
      productId,
      serialsCount: serialsList.length,
    });

    res.json({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productBrand: product.brand,
      productModel: product.model,
      productEan: product.ean,
      // Category info
      productCategoryId: product.categoryId,
      productCategoryName: product.categoryName,
      // VAT Regime info
      productVatRegimeId: product.vatRegimeId,
      productVatRegimeCode: product.vatRegimeCode,
      productVatRegimeName: product.vatRegimeName,
      productVatPayer: product.vatPayer,
      productRateStrategy: product.rateStrategy,
      // VAT Rate info (from regime's fixed rate)
      productVatRateId: product.vatRateId,
      productVatRateCode: product.vatRateCode,
      productVatRateName: product.vatRateName,
      productVatRatePercent: product.vatRatePercent,
      serials: serialsList,
    });

  } catch (error) {
    console.error("Error retrieving product serials with history:", error);
    
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

    // BUSINESS RULE: All product items of the same product+store must have the same logistic status
    // When updating one item, update ALL items of the same product in the same store atomically
    // Use transaction for atomicity
    
    // Generate a shared group ID for this atomic status change operation
    const statusChangeGroupId = crypto.randomUUID();
    
    const result = await db.transaction(async (tx) => {
      const siblingItems = await tx
        .select({ id: productItems.id, logisticStatus: productItems.logisticStatus, notes: productItems.notes })
        .from(productItems)
        .where(
          and(
            eq(productItems.tenantId, sessionTenantId),
            eq(productItems.productId, existingItem.productId),
            eq(productItems.storeId, existingItem.storeId)
          )
        );

      // Validate transition is allowed for ALL sibling items
      const invalidTransitions: { itemId: string; currentStatus: string; allowed: string[] }[] = [];
      for (const sibling of siblingItems) {
        if (sibling.logisticStatus === newStatus) continue; // Already at target status
        const siblingAllowed = VALID_STATUS_TRANSITIONS[sibling.logisticStatus] || [];
        if (!siblingAllowed.includes(newStatus)) {
          invalidTransitions.push({
            itemId: sibling.id,
            currentStatus: sibling.logisticStatus,
            allowed: siblingAllowed
          });
        }
      }

      if (invalidTransitions.length > 0) {
        throw { type: 'INVALID_TRANSITIONS', invalidTransitions };
      }

      // Update ALL sibling items to the new status atomically (preserve individual notes)
      const updatedItems = await tx
        .update(productItems)
        .set({ 
          logisticStatus: newStatus,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(productItems.tenantId, sessionTenantId),
            eq(productItems.productId, existingItem.productId),
            eq(productItems.storeId, existingItem.storeId)
          )
        )
        .returning();

      // Log status history for each updated item with shared groupId
      for (const item of siblingItems) {
        if (item.logisticStatus !== newStatus) {
          await tx.insert(productItemStatusHistory).values({
            id: crypto.randomUUID(),
            tenantId: sessionTenantId,
            productItemId: item.id,
            fromStatus: item.logisticStatus,
            toStatus: newStatus,
            changedAt: new Date(),
            changedByName: req.user?.name || 'System',
            notes: notes || null,
            statusChangeGroupId: statusChangeGroupId
          });
        }
      }

      return { updatedItems, siblingItems };
    });

    // Structured logging for audit trail
    logger.info('WMS product items status transitioned (atomic group update)', {
      tenantId: sessionTenantId,
      itemId,
      productId: existingItem.productId,
      storeId: existingItem.storeId,
      previousStatus: currentStatus,
      newStatus,
      itemsUpdated: result.updatedItems.length,
      notes: notes || null,
      transitionValid: true
    });

    // Find the specific requested item in the updated list (must exist)
    const targetItem = result.updatedItems.find(item => item.id === itemId);
    
    if (!targetItem) {
      logger.error('WMS product item status update failed - target item not in result set', {
        tenantId: sessionTenantId,
        itemId,
        updatedItemIds: result.updatedItems.map(i => i.id)
      });
      return res.status(500).json({
        error: "Internal error",
        message: "Target item not found in updated result set"
      });
    }

    res.json({
      success: true,
      message: `Status successfully transitioned from '${currentStatus}' to '${newStatus}' for ${result.updatedItems.length} item(s)`,
      data: targetItem,
      itemsUpdated: result.updatedItems.length,
      updatedItemIds: result.updatedItems.map(item => item.id),
      transition: {
        from: currentStatus,
        to: newStatus
      }
    });

  } catch (error: any) {
    // Handle custom invalid transitions error from transaction
    if (error?.type === 'INVALID_TRANSITIONS') {
      return res.status(409).json({
        error: "Invalid status transition for sibling items",
        message: `Cannot transition all items to requested status. Some items have incompatible current statuses.`,
        invalidItems: error.invalidTransitions,
      });
    }
    
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
      conditions.push(eq(productBatches.status, status as 'available' | 'reserved' | 'damaged' | 'expired'));
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
  async (req: any, res: Response) => {
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
        } as typeof wmsStockMovements.$inferInsert;
        
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
        } as typeof wmsStockMovements.$inferInsert;
        
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
        
        // 4. CQRS: Update inventory balances read model
        // Decrease source store balance
        if (movementData.sourceStoreId) {
          await updateInventoryBalanceInternal(
            tx as any,
            sessionTenantId,
            movementData.sourceStoreId,
            movementData.productId,
            -Math.abs(movementData.quantityDelta),
            null
          );
        }
        // Increase destination store balance
        if (movementData.destinationStoreId) {
          await updateInventoryBalanceInternal(
            tx as any,
            sessionTenantId,
            movementData.destinationStoreId,
            movementData.productId,
            Math.abs(movementData.quantityDelta),
            null
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

      // 📊 CQRS Event Log: Record transfer events (non-blocking)
      // Get updated balances for event log
      const [sourceBalance] = await db
        .select({ qty: wmsInventoryBalances.quantityAvailable, reserved: wmsInventoryBalances.quantityReserved })
        .from(wmsInventoryBalances)
        .where(and(
          eq(wmsInventoryBalances.tenantId, sessionTenantId),
          eq(wmsInventoryBalances.storeId, movementData.sourceStoreId),
          eq(wmsInventoryBalances.productId, movementData.productId)
        ))
        .limit(1);
      
      const [destBalance] = await db
        .select({ qty: wmsInventoryBalances.quantityAvailable, reserved: wmsInventoryBalances.quantityReserved })
        .from(wmsInventoryBalances)
        .where(and(
          eq(wmsInventoryBalances.tenantId, sessionTenantId),
          eq(wmsInventoryBalances.storeId, movementData.destinationStoreId),
          eq(wmsInventoryBalances.productId, movementData.productId)
        ))
        .limit(1);

      // Record outbound event
      recordInventoryEvent({
        tenantId: sessionTenantId,
        storeId: movementData.sourceStoreId,
        productId: movementData.productId,
        eventType: 'transfer_out',
        quantityDelta: -Math.abs(movementData.quantityDelta),
        balanceAfter: sourceBalance?.qty ?? 0,
        reservedAfter: sourceBalance?.reserved ?? 0,
        movementId: createdMovements[0].id,
        userId: req.user?.id,
        reason: movementData.notes,
      });

      // Record inbound event
      recordInventoryEvent({
        tenantId: sessionTenantId,
        storeId: movementData.destinationStoreId,
        productId: movementData.productId,
        eventType: 'transfer_in',
        quantityDelta: Math.abs(movementData.quantityDelta),
        balanceAfter: destBalance?.qty ?? 0,
        reservedAfter: destBalance?.reserved ?? 0,
        movementId: createdMovements[1].id,
        userId: req.user?.id,
        reason: movementData.notes,
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
      } as typeof wmsStockMovements.$inferInsert;
      
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
      
      // 3. CQRS: Update inventory balances read model
      if (movementData.storeId) {
        await updateInventoryBalanceInternal(
          tx as any,
          sessionTenantId,
          movementData.storeId,
          movementData.productId,
          quantityChange,
          movementData.unitCost ? parseFloat(movementData.unitCost) : null
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

    // 📊 CQRS Event Log: Record movement event (non-blocking)
    if (movementData.storeId) {
      const [currentBalance] = await db
        .select({ qty: wmsInventoryBalances.quantityAvailable, reserved: wmsInventoryBalances.quantityReserved })
        .from(wmsInventoryBalances)
        .where(and(
          eq(wmsInventoryBalances.tenantId, sessionTenantId),
          eq(wmsInventoryBalances.storeId, movementData.storeId),
          eq(wmsInventoryBalances.productId, movementData.productId)
        ))
        .limit(1);

      // Map movement type to event type
      let eventType: 'quantity_in' | 'quantity_out' | 'adjustment' | 'return_received' | 'return_sent' | 'damage_recorded' = 'quantity_in';
      if (movementData.movementDirection === 'outbound') {
        eventType = movementData.movementType === 'damaged' ? 'damage_recorded' : 'quantity_out';
      } else if (movementData.movementType === 'return_in') {
        eventType = 'return_received';
      } else if (movementData.movementType === 'adjustment') {
        eventType = 'adjustment';
      }

      recordInventoryEvent({
        tenantId: sessionTenantId,
        storeId: movementData.storeId,
        productId: movementData.productId,
        eventType,
        quantityDelta: movementData.movementDirection === 'outbound' ? -Math.abs(movementData.quantityDelta) : Math.abs(movementData.quantityDelta),
        balanceAfter: currentBalance?.qty ?? 0,
        reservedAfter: currentBalance?.reserved ?? 0,
        movementId: createdMovement.id,
        documentRef: movementData.referenceId,
        userId: req.user?.id,
        reason: movementData.notes,
      });
    }
    
    // 🔄 WORKFLOW INTEGRATION: Check if movement requires approval
    try {
      const { requiresApproval, workflowTemplateId } = await wmsWorkflowService.checkApprovalRequired(
        sessionTenantId,
        movementData.movementType
      );

      if (requiresApproval) {
        // Get product name for notification
        const productName = product.name;
        
        // Trigger approval workflow
        const workflowResult = await wmsWorkflowService.triggerApprovalWorkflow({
          tenantId: sessionTenantId,
          storeId: movementData.storeId || '',
          userId: req.user?.id || 'system',
          movementId: createdMovement.id,
          movementType: movementData.movementType,
          movementDirection: movementData.movementDirection as 'inbound' | 'outbound' | 'internal',
          productName,
          quantity: Math.abs(movementData.quantityDelta)
        });

        // Update movement with workflow instance ID if created
        if (workflowResult.workflowInstanceId) {
          await db
            .update(wmsStockMovements)
            .set({ 
              workflowInstanceId: workflowResult.workflowInstanceId,
              updatedAt: new Date()
            })
            .where(eq(wmsStockMovements.id, createdMovement.id));
        }

        logger.info('🔄 WMS movement requires approval - workflow triggered', {
          movementId: createdMovement.id,
          workflowInstanceId: workflowResult.workflowInstanceId,
          supervisorCount: workflowResult.supervisorIds?.length || 0
        });

        return res.status(201).json({
          success: true,
          message: workflowResult.message,
          data: {
            ...createdMovement,
            movementStatus: 'pending_approval',
            workflowInstanceId: workflowResult.workflowInstanceId,
            requiresApproval: true,
            supervisorIds: workflowResult.supervisorIds
          }
        });
      }
    } catch (workflowError) {
      // Log workflow error but don't fail the movement creation
      logger.error('⚠️ WMS workflow integration error (non-blocking)', {
        error: workflowError instanceof Error ? workflowError.message : 'Unknown error',
        movementId: createdMovement.id
      });
    }
    
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
        
        // CQRS: Update inventory balances read model
        if (adj.storeId) {
          await updateInventoryBalanceInternal(
            tx as any,
            tenantId,
            adj.storeId,
            adj.productId,
            delta,
            null
          );
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
    const { productType } = req.query;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Build WHERE conditions
    const conditions = [
      eq(wmsCategories.tenantId, sessionTenantId),
      eq(wmsCategories.isActive, true),
      isNull(wmsCategories.validTo) // Only current versions (versioning support)
    ];

    // Optional filter by productType (validate if provided)
    if (productType) {
      const validTypes = ['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS'] as const;
      if (typeof productType !== 'string' || !validTypes.includes(productType as any)) {
        return res.status(400).json({ 
          error: "Invalid productType parameter",
          message: `productType must be one of: ${validTypes.join(', ')}`
        });
      }
      conditions.push(eq(wmsCategories.productType, productType as any));
    }

    // Subquery for product count per category
    const productCountSubquery = db
      .select({
        categoryId: products.categoryId,
        productCount: sql<number>`count(*)::int`.as('product_count')
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.status, 'active')
        )
      )
      .groupBy(products.categoryId)
      .as('product_counts');

    // Subquery for type count per category
    const typeCountSubquery = db
      .select({
        categoryId: wmsProductTypes.categoryId,
        typeCount: sql<number>`count(*)::int`.as('type_count')
      })
      .from(wmsProductTypes)
      .where(
        and(
          eq(wmsProductTypes.tenantId, sessionTenantId),
          eq(wmsProductTypes.isActive, true),
          isNull(wmsProductTypes.validTo)
        )
      )
      .groupBy(wmsProductTypes.categoryId)
      .as('type_counts');

    // Subquery for driver IDs per category
    const driverMappingsSubquery = db
      .select({
        categoryId: driverCategoryMappings.categoryId,
        driverIds: sql<string[]>`array_agg(${driverCategoryMappings.driverId}::text)`.as('driver_ids')
      })
      .from(driverCategoryMappings)
      .where(
        and(
          eq(driverCategoryMappings.tenantId, sessionTenantId),
          eq(driverCategoryMappings.isActive, true)
        )
      )
      .groupBy(driverCategoryMappings.categoryId)
      .as('driver_mappings');

    const categories = await db
      .select({
        id: wmsCategories.id,
        productType: wmsCategories.productType,
        nome: wmsCategories.nome,
        descrizione: wmsCategories.descrizione,
        icona: wmsCategories.icona,
        ordine: wmsCategories.ordine,
        source: wmsCategories.source,
        isBrandSynced: wmsCategories.isBrandSynced,
        isActive: wmsCategories.isActive,
        createdAt: wmsCategories.createdAt,
        updatedAt: wmsCategories.updatedAt,
        versionNumber: wmsCategories.versionNumber,
        productCount: sql<number>`COALESCE(${productCountSubquery.productCount}, 0)`.as('productCount'),
        typeCount: sql<number>`COALESCE(${typeCountSubquery.typeCount}, 0)`.as('typeCount'),
        driverIds: sql<string[]>`COALESCE(${driverMappingsSubquery.driverIds}, ARRAY[]::text[])`.as('driverIds'),
      })
      .from(wmsCategories)
      .leftJoin(productCountSubquery, eq(wmsCategories.id, productCountSubquery.categoryId))
      .leftJoin(typeCountSubquery, eq(wmsCategories.id, typeCountSubquery.categoryId))
      .leftJoin(driverMappingsSubquery, eq(wmsCategories.id, driverMappingsSubquery.categoryId))
      .where(and(...conditions))
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

    // Validate request body using shared schema
    const validatedData = insertCategorySchema.parse(req.body);

    // Generate unique ID for category
    const categoryId = crypto.randomUUID();

    const [newCategory] = await db
      .insert(wmsCategories)
      .values({
        tenantId: sessionTenantId,
        id: categoryId,
        source: 'tenant', // Always tenant-created via this endpoint
        isBrandSynced: false,
        productType: validatedData.productType,
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

    // Handle driver mappings if provided
    const { driverIds } = req.body;
    if (driverIds && Array.isArray(driverIds) && driverIds.length > 0) {
      const mappingValues = driverIds.map((driverId: string) => ({
        tenantId: sessionTenantId,
        id: crypto.randomUUID(),
        source: 'tenant' as const,
        driverId,
        productType: validatedData.productType,
        categoryId,
        isActive: true,
        createdBy: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(driverCategoryMappings).values(mappingValues);

      logger.info('Driver-category mappings created', {
        tenantId: sessionTenantId,
        categoryId,
        driverIds,
      });
    }

    logger.info('WMS category created', {
      tenantId: sessionTenantId,
      categoryId,
      nome: newCategory.nome,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: { ...newCategory, driverIds: driverIds || [] }
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

    // Validate request body using shared schema
    const validatedData = updateCategorySchema.parse(req.body);

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

    // Handle driver mappings if provided
    const { driverIds } = req.body;
    if (driverIds !== undefined && Array.isArray(driverIds)) {
      // Delete existing mappings for this category
      await db
        .delete(driverCategoryMappings)
        .where(
          and(
            eq(driverCategoryMappings.tenantId, sessionTenantId),
            eq(driverCategoryMappings.categoryId, categoryId)
          )
        );

      // Insert new mappings
      if (driverIds.length > 0) {
        const mappingValues = driverIds.map((driverId: string) => ({
          tenantId: sessionTenantId,
          id: crypto.randomUUID(),
          source: 'tenant' as const,
          driverId,
          productType: updatedCategory.productType,
          categoryId,
          isActive: true,
          createdBy: userId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await db.insert(driverCategoryMappings).values(mappingValues);
      }

      logger.info('Driver-category mappings updated', {
        tenantId: sessionTenantId,
        categoryId,
        driverIds,
      });
    }

    logger.info('WMS category updated', {
      tenantId: sessionTenantId,
      categoryId,
      updatedBy: userId
    });

    res.json({
      success: true,
      data: { ...updatedCategory, driverIds: driverIds || [] }
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

    // Check for active products directly in this category
    const activeProductsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.categoryId, categoryId),
          eq(products.status, 'active')
        )
      );

    const productCount = activeProductsCount[0]?.count ?? 0;

    if (productCount > 0) {
      return res.status(400).json({ 
        error: "Impossibile eliminare la categoria",
        message: `Questa categoria ha ${productCount} prodotto/i associato/i. Rimuovi o riassegna i prodotti prima di eliminare.`,
        productCount,
        canDelete: false
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

    const typeCount = activeTypesCount[0]?.count ?? 0;

    if (typeCount > 0) {
      return res.status(400).json({ 
        error: "Impossibile eliminare la categoria",
        message: `Questa categoria ha ${typeCount} tipologia/e attiva/e. Elimina o riassegna le tipologie prima di eliminare.`,
        typeCount,
        canDelete: false
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

/**
 * POST /api/wms/categories/:id/archive
 * Archive a category (soft-delete without dependency checks)
 */
router.post("/categories/:id/archive", rbacMiddleware, requirePermission('wms.category.update'), async (req, res) => {
  try {
    const { id: categoryId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

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

    if (existingCategory.source === 'brand' && existingCategory.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot archive Brand-synced category",
        message: "This category is managed by Brand HQ and cannot be archived by tenants."
      });
    }

    const [archivedCategory] = await db
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

    logger.info('WMS category archived', {
      tenantId: sessionTenantId,
      categoryId,
      nome: archivedCategory.nome,
      archivedBy: userId
    });

    res.json({
      success: true,
      message: "Category successfully archived",
      data: archivedCategory
    });
  } catch (error) {
    console.error("Error archiving category:", error);
    res.status(500).json({ 
      error: "Failed to archive category",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== WMS SUPPLIERS ENDPOINTS ====================

/**
 * GET /api/wms/suppliers
 * Get all suppliers for a tenant (union of brand-managed + tenant-specific)
 * Returns suppliers from both 'suppliers' (brand-pushed) and 'supplier_overrides' (tenant-created) tables
 */
router.get("/suppliers", rbacMiddleware, async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get brand-pushed suppliers (origin='brand' from brand tenant or tenant-specific)
    // Brand suppliers have tenantId = '00000000-0000-0000-0000-000000000000' (brand HQ tenant)
    const BRAND_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    
    const brandSuppliersList = await db
      .select({
        id: suppliers.id,
        code: suppliers.code,
        name: suppliers.name,
        legalName: suppliers.legalName,
        supplierType: suppliers.supplierType,
        vatNumber: suppliers.vatNumber,
        status: suppliers.status,
        origin: suppliers.origin,
      })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.status, 'active'),
          or(
            isNull(suppliers.tenantId), // Brand-wide suppliers (NULL tenant)
            eq(suppliers.tenantId, BRAND_TENANT_ID), // Brand HQ suppliers
            eq(suppliers.tenantId, sessionTenantId) // Tenant-specific suppliers
          )
        )
      );

    // Get tenant-specific suppliers from supplier_overrides
    const tenantSuppliersList = await db
      .select({
        id: supplierOverrides.id,
        code: supplierOverrides.code,
        name: supplierOverrides.name,
        legalName: supplierOverrides.legalName,
        supplierType: supplierOverrides.supplierType,
        vatNumber: supplierOverrides.vatNumber,
        status: supplierOverrides.status,
        origin: supplierOverrides.origin,
      })
      .from(supplierOverrides)
      .where(
        and(
          eq(supplierOverrides.tenantId, sessionTenantId),
          eq(supplierOverrides.status, 'active')
        )
      );

    // Merge and sort by name
    const allSuppliers = [...brandSuppliersList, ...tenantSuppliersList]
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(allSuppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ 
      error: "Failed to fetch suppliers",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/stores
 * 
 * Get all stores/warehouses for the current tenant that have warehouse capability.
 * Used for selecting destination warehouse in receiving operations.
 */
router.get("/stores", rbacMiddleware, async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const storesList = await db
      .select({
        id: stores.id,
        code: stores.code,
        name: stores.nome,
        city: stores.citta,
        province: stores.provincia,
        address: stores.address,
        status: stores.status,
        category: stores.category,
        hasWarehouse: stores.hasWarehouse,
      })
      .from(stores)
      .where(
        and(
          eq(stores.tenantId, sessionTenantId),
          eq(stores.status, 'Attivo'),
          eq(stores.hasWarehouse, true) // Only stores with warehouse capability
        )
      )
      .orderBy(asc(stores.nome));

    res.json(storesList);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ 
      error: "Failed to fetch stores",
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
      eq(wmsProductTypes.isActive, true),
      isNull(wmsProductTypes.validTo) // Only current versions (versioning support)
    ];

    // Filter by categoryId if provided
    if (categoryId && typeof categoryId === 'string') {
      whereConditions.push(eq(wmsProductTypes.categoryId, categoryId));
    }

    // Subquery for product count per type
    const productCountSubquery = db
      .select({
        typeId: products.typeId,
        count: sql<number>`count(*)::int`.as('count')
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, sessionTenantId),
          eq(products.status, 'active')
        )
      )
      .groupBy(products.typeId)
      .as('product_counts');

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
        versionNumber: wmsProductTypes.versionNumber,
        productCount: sql<number>`COALESCE(${productCountSubquery.count}, 0)`.as('productCount'),
      })
      .from(wmsProductTypes)
      .leftJoin(productCountSubquery, eq(wmsProductTypes.id, productCountSubquery.typeId))
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
          eq(products.status, 'active')
        )
      );

    const productCount = activeProductsCount[0]?.count ?? 0;

    if (productCount > 0) {
      return res.status(400).json({ 
        error: "Impossibile eliminare la tipologia",
        message: `Questa tipologia ha ${productCount} prodotto/i associato/i. Rimuovi o riassegna i prodotti prima di eliminare.`,
        productCount,
        canDelete: false
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

/**
 * POST /api/wms/product-types/:id/archive
 * Archive a product type (soft-delete without dependency checks)
 */
router.post("/product-types/:id/archive", rbacMiddleware, requirePermission('wms.product_type.update'), async (req, res) => {
  try {
    const { id: typeId } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

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

    if (existingType.source === 'brand' && existingType.isBrandSynced) {
      return res.status(403).json({ 
        error: "Cannot archive Brand-synced product type",
        message: "This product type is managed by Brand HQ and cannot be archived by tenants."
      });
    }

    const [archivedType] = await db
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

    logger.info('WMS product type archived', {
      tenantId: sessionTenantId,
      typeId,
      nome: archivedType.nome,
      archivedBy: userId
    });

    res.json({
      success: true,
      message: "Product type successfully archived",
      data: archivedType
    });
  } catch (error) {
    console.error("Error archiving product type:", error);
    res.status(500).json({ 
      error: "Failed to archive product type",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== CQRS: PRODUCT VERSIONS ====================

/**
 * GET /api/wms/product-versions/:productId
 * Get all versions for a product with active/historical filter
 * Query params:
 * - includeExpired: boolean (default: false) - include versions with validTo < now
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 */
router.get("/product-versions/:productId", rbacMiddleware, requirePermission('wms.product.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { productId } = req.params;
    const { includeExpired = 'false', page = '1', limit = '20' } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Verify product exists and belongs to tenant
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions = [
      eq(productVersions.tenantId, tenantId),
      eq(productVersions.productId, productId)
    ];

    // Filter expired versions unless explicitly requested
    if (includeExpired !== 'true') {
      conditions.push(
        or(
          isNull(productVersions.validTo),
          gte(productVersions.validTo, new Date())
        )!
      );
    }

    const versions = await db
      .select()
      .from(productVersions)
      .where(and(...conditions))
      .orderBy(desc(productVersions.validFrom))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productVersions)
      .where(and(...conditions));

    res.json({
      success: true,
      data: versions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    console.error("Error fetching product versions:", error);
    res.status(500).json({ 
      error: "Failed to fetch product versions",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/product-versions/:productId/current
 * Get the currently active version for a product
 */
router.get("/product-versions/:productId/current", rbacMiddleware, requirePermission('wms.product.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const now = new Date();
    const [currentVersion] = await db
      .select()
      .from(productVersions)
      .where(
        and(
          eq(productVersions.tenantId, tenantId),
          eq(productVersions.productId, productId),
          sql`${productVersions.validFrom} <= ${now}`,
          or(
            isNull(productVersions.validTo),
            sql`${productVersions.validTo} > ${now}`
          )
        )
      )
      .orderBy(desc(productVersions.validFrom))
      .limit(1);

    if (!currentVersion) {
      return res.status(404).json({ 
        error: "No active version found",
        message: "This product has no currently active price version"
      });
    }

    res.json({
      success: true,
      data: currentVersion
    });
  } catch (error) {
    console.error("Error fetching current product version:", error);
    res.status(500).json({ 
      error: "Failed to fetch current product version",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/product-versions
 * Create a new product version (closes previous version automatically)
 * Body: insertProductVersionSchema
 */
router.post("/product-versions", rbacMiddleware, requirePermission('wms.product.update'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const validationResult = insertProductVersionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.format()
      });
    }

    const versionData = validationResult.data;

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, versionData.productId)))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Determine validFrom (default to now if not provided)
    const validFrom = versionData.validFrom ? new Date(versionData.validFrom) : new Date();

    await db.transaction(async (tx) => {
      // Close any overlapping active versions
      await tx
        .update(productVersions)
        .set({ 
          validTo: validFrom,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(productVersions.tenantId, tenantId),
            eq(productVersions.productId, versionData.productId),
            or(
              isNull(productVersions.validTo),
              gte(productVersions.validTo, validFrom)
            )
          )
        );

      // Create new version
      const newVersionId = crypto.randomUUID();
      const [createdVersion] = await tx
        .insert(productVersions)
        .values({
          id: newVersionId,
          tenantId,
          productId: versionData.productId,
          versionNumber: versionData.versionNumber || 1,
          priceRetail: versionData.priceRetail || null,
          priceBusiness: versionData.priceBusiness || null,
          priceWholesale: versionData.priceWholesale || null,
          activationFee: versionData.activationFee || null,
          monthlyFee: versionData.monthlyFee || null,
          costPrice: versionData.costPrice || null,
          validFrom,
          validTo: versionData.validTo ? new Date(versionData.validTo) : null,
          changeReason: versionData.changeReason || 'price_update',
          changeNotes: versionData.changeNotes || null,
          createdBy: userId || null
        } as any)
        .returning();

      logger.info('WMS product version created', {
        tenantId,
        productId: versionData.productId,
        versionId: createdVersion.id,
        changeReason: versionData.changeReason,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        data: createdVersion
      });
    });
  } catch (error) {
    console.error("Error creating product version:", error);
    res.status(500).json({ 
      error: "Failed to create product version",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== CQRS: INVENTORY BALANCES (READ MODEL) ====================

/**
 * GET /api/wms/inventory-balances
 * Query real-time inventory balances (CQRS read model)
 * Query params:
 * - storeId: UUID (optional filter)
 * - productId: UUID (optional filter)
 * - minQuantity: number (filter quantity >= threshold)
 * - lowStockOnly: boolean (filter where quantityAvailable < reorderPoint)
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 */
router.get("/inventory-balances", rbacMiddleware, requirePermission('wms.inventory.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { 
      storeId, 
      productId, 
      minQuantity,
      lowStockOnly = 'false',
      page = '1', 
      limit = '50' 
    } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(wmsInventoryBalances.tenantId, tenantId)];

    if (storeId && typeof storeId === 'string') {
      conditions.push(eq(wmsInventoryBalances.storeId, storeId));
    }

    if (productId && typeof productId === 'string') {
      conditions.push(eq(wmsInventoryBalances.productId, productId));
    }

    if (minQuantity && typeof minQuantity === 'string') {
      const minQty = parseInt(minQuantity);
      if (!isNaN(minQty)) {
        conditions.push(gte(wmsInventoryBalances.quantityAvailable, minQty));
      }
    }

    if (lowStockOnly === 'true') {
      conditions.push(
        sql`${wmsInventoryBalances.quantityAvailable} < COALESCE(${wmsInventoryBalances.reorderPoint}, 0)`
      );
    }

    const balances = await db
      .select({
        id: wmsInventoryBalances.id,
        tenantId: wmsInventoryBalances.tenantId,
        storeId: wmsInventoryBalances.storeId,
        productId: wmsInventoryBalances.productId,
        quantityAvailable: wmsInventoryBalances.quantityAvailable,
        quantityReserved: wmsInventoryBalances.quantityReserved,
        quantityOnOrder: wmsInventoryBalances.quantityOnOrder,
        totalValue: wmsInventoryBalances.totalValue,
        averageCost: wmsInventoryBalances.averageCost,
        reorderPoint: wmsInventoryBalances.reorderPoint,
        lastMovementAt: wmsInventoryBalances.lastMovementAt,
        updatedAt: wmsInventoryBalances.updatedAt,
        // Join product info
        productSku: products.sku,
        productName: products.name,
        productType: products.type,
        // Join store info
        storeName: stores.name
      })
      .from(wmsInventoryBalances)
      .leftJoin(products, eq(wmsInventoryBalances.productId, products.id))
      .leftJoin(stores, eq(wmsInventoryBalances.storeId, stores.id))
      .where(and(...conditions))
      .orderBy(desc(wmsInventoryBalances.lastMovementAt))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wmsInventoryBalances)
      .where(and(...conditions));

    // Calculate summary statistics
    const [summary] = await db
      .select({
        totalProducts: sql<number>`count(DISTINCT ${wmsInventoryBalances.productId})::int`,
        totalQuantity: sql<number>`COALESCE(SUM(${wmsInventoryBalances.quantityAvailable}), 0)::int`,
        totalReserved: sql<number>`COALESCE(SUM(${wmsInventoryBalances.quantityReserved}), 0)::int`,
        totalValue: sql<string>`COALESCE(SUM(${wmsInventoryBalances.totalValue}), 0)::numeric(15,2)`,
        lowStockCount: sql<number>`count(*) FILTER (WHERE ${wmsInventoryBalances.quantityAvailable} < COALESCE(${wmsInventoryBalances.reorderPoint}, 0))::int`
      })
      .from(wmsInventoryBalances)
      .where(and(...conditions));

    res.json({
      success: true,
      data: balances,
      summary: {
        totalProducts: summary.totalProducts,
        totalQuantity: summary.totalQuantity,
        totalReserved: summary.totalReserved,
        totalValue: parseFloat(summary.totalValue || '0'),
        lowStockCount: summary.lowStockCount
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    console.error("Error fetching inventory balances:", error);
    res.status(500).json({ 
      error: "Failed to fetch inventory balances",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/inventory-balances/:storeId/:productId
 * Get specific inventory balance for a store/product combination
 */
router.get("/inventory-balances/:storeId/:productId", rbacMiddleware, requirePermission('wms.inventory.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { storeId, productId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const [balance] = await db
      .select({
        id: wmsInventoryBalances.id,
        tenantId: wmsInventoryBalances.tenantId,
        storeId: wmsInventoryBalances.storeId,
        productId: wmsInventoryBalances.productId,
        quantityAvailable: wmsInventoryBalances.quantityAvailable,
        quantityReserved: wmsInventoryBalances.quantityReserved,
        quantityOnOrder: wmsInventoryBalances.quantityOnOrder,
        totalValue: wmsInventoryBalances.totalValue,
        averageCost: wmsInventoryBalances.averageCost,
        reorderPoint: wmsInventoryBalances.reorderPoint,
        lastMovementAt: wmsInventoryBalances.lastMovementAt,
        updatedAt: wmsInventoryBalances.updatedAt,
        productSku: products.sku,
        productName: products.name,
        storeName: stores.name
      })
      .from(wmsInventoryBalances)
      .leftJoin(products, eq(wmsInventoryBalances.productId, products.id))
      .leftJoin(stores, eq(wmsInventoryBalances.storeId, stores.id))
      .where(
        and(
          eq(wmsInventoryBalances.tenantId, tenantId),
          eq(wmsInventoryBalances.storeId, storeId),
          eq(wmsInventoryBalances.productId, productId)
        )
      )
      .limit(1);

    if (!balance) {
      return res.status(404).json({ 
        error: "Inventory balance not found",
        message: "No inventory record exists for this store/product combination"
      });
    }

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error("Error fetching inventory balance:", error);
    res.status(500).json({ 
      error: "Failed to fetch inventory balance",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== CQRS: INVENTORY SNAPSHOTS ====================

/**
 * GET /api/wms/inventory-snapshots
 * Query historical inventory snapshots
 * Query params:
 * - storeId: UUID (optional filter)
 * - productId: UUID (optional filter)
 * - dateFrom: ISO date (optional)
 * - dateTo: ISO date (optional)
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 200)
 */
router.get("/inventory-snapshots", rbacMiddleware, requirePermission('wms.analytics.read'), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { storeId, productId, dateFrom, dateTo, page = '1', limit = '50' } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(wmsInventorySnapshots.tenantId, tenantId)];

    if (storeId && typeof storeId === 'string') {
      conditions.push(eq(wmsInventorySnapshots.storeId, storeId));
    }

    if (productId && typeof productId === 'string') {
      conditions.push(eq(wmsInventorySnapshots.productId, productId));
    }

    if (dateFrom && typeof dateFrom === 'string') {
      conditions.push(gte(wmsInventorySnapshots.snapshotAt, new Date(dateFrom)));
    }

    if (dateTo && typeof dateTo === 'string') {
      conditions.push(sql`${wmsInventorySnapshots.snapshotAt} <= ${new Date(dateTo)}`);
    }

    const snapshots = await db
      .select()
      .from(wmsInventorySnapshots)
      .where(and(...conditions))
      .orderBy(desc(wmsInventorySnapshots.snapshotAt))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wmsInventorySnapshots)
      .where(and(...conditions));

    res.json({
      success: true,
      data: snapshots,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    console.error("Error fetching inventory snapshots:", error);
    res.status(500).json({ 
      error: "Failed to fetch inventory snapshots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== CQRS: HELPER - UPDATE INVENTORY BALANCE ====================

/**
 * Internal helper to update inventory balance within an existing transaction.
 * Can also be called standalone (creates its own transaction).
 */
async function updateInventoryBalanceInternal(
  dbClient: typeof db,
  tenantId: string,
  storeId: string,
  productId: string,
  quantityDelta: number,
  unitCost?: number | null
): Promise<void> {
  // Try to get existing balance
  const [existing] = await dbClient
    .select()
    .from(wmsInventoryBalances)
    .where(
      and(
        eq(wmsInventoryBalances.tenantId, tenantId),
        eq(wmsInventoryBalances.storeId, storeId),
        eq(wmsInventoryBalances.productId, productId)
      )
    )
    .limit(1);

  const now = new Date();

  if (existing) {
    // Update existing balance
    const newQuantity = (existing.quantityAvailable || 0) + quantityDelta;
    
    // Recalculate average cost if we have a unit cost and positive delta
    let newAverageCost = existing.averageCost;
    let newTotalValue = existing.totalValue;

    if (unitCost && quantityDelta > 0) {
      // Weighted average cost calculation
      const existingQty = existing.quantityAvailable || 0;
      const existingCost = parseFloat(existing.averageCost || '0');
      const existingValue = existingQty * existingCost;
      const newValue = quantityDelta * unitCost;
      
      if (newQuantity > 0) {
        newAverageCost = ((existingValue + newValue) / newQuantity).toFixed(2);
      }
    }

    // Update total value based on new quantity and average cost
    if (newAverageCost) {
      newTotalValue = (newQuantity * parseFloat(newAverageCost)).toFixed(2);
    }

    await dbClient
      .update(wmsInventoryBalances)
      .set({
        quantityAvailable: newQuantity,
        averageCost: newAverageCost,
        totalValue: newTotalValue,
        lastMovementAt: now,
        updatedAt: now
      })
      .where(eq(wmsInventoryBalances.id, existing.id));
  } else {
    // Insert new balance record
    const initialCost = unitCost ? unitCost.toFixed(2) : '0';
    const initialValue = unitCost ? (quantityDelta * unitCost).toFixed(2) : '0';

    await dbClient
      .insert(wmsInventoryBalances)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        storeId,
        productId,
        quantityAvailable: quantityDelta,
        quantityReserved: 0,
        quantityOnOrder: 0,
        averageCost: initialCost,
        totalValue: initialValue,
        reorderPoint: null,
        lastMovementAt: now,
        createdAt: now,
        updatedAt: now
      } as any);
  }
}

/**
 * Updates the wms_inventory_balances read model based on a stock movement.
 * Called after every stock movement INSERT to keep the read model in sync.
 * Implements UPSERT pattern for atomic balance updates.
 * 
 * @param txClient - Optional transaction client to use (for batched operations)
 */
export async function updateInventoryBalance(
  tenantId: string,
  storeId: string,
  productId: string,
  quantityDelta: number,
  unitCost?: number | null,
  txClient?: typeof db
): Promise<void> {
  try {
    if (txClient) {
      // Use provided transaction
      await updateInventoryBalanceInternal(txClient, tenantId, storeId, productId, quantityDelta, unitCost);
    } else {
      // Create own transaction
      await db.transaction(async (tx) => {
        await updateInventoryBalanceInternal(tx as any, tenantId, storeId, productId, quantityDelta, unitCost);
      });
    }

    logger.debug('Inventory balance updated', {
      tenantId,
      storeId,
      productId,
      quantityDelta,
      unitCost
    });
  } catch (error) {
    logger.error('Failed to update inventory balance', {
      tenantId,
      storeId,
      productId,
      quantityDelta,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * 📊 Records an inventory event in the CQRS event log.
 * Call this after every stock movement to maintain audit trail.
 * 
 * @param params Movement parameters including balance after update
 */
export async function recordInventoryEvent(params: {
  tenantId: string;
  storeId: string;
  productId: string;
  eventType: 'quantity_in' | 'quantity_out' | 'state_change' | 'reservation' | 'release' | 'transfer_out' | 'transfer_in' | 'adjustment' | 'return_received' | 'return_sent' | 'damage_recorded';
  quantityDelta: number;
  balanceAfter: number;
  reservedAfter?: number;
  previousState?: string;
  newState?: string;
  serialNumber?: string;
  movementId?: string;
  documentRef?: string;
  userId?: string;
  reason?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await inventoryEventLogService.recordEvent({
      tenantId: params.tenantId,
      storeId: params.storeId,
      productId: params.productId,
      eventType: params.eventType,
      quantityChange: params.quantityDelta,
      balanceAfter: params.balanceAfter,
      reservedAfter: params.reservedAfter ?? 0,
      previousState: params.previousState as any,
      newState: params.newState as any,
      serialNumber: params.serialNumber,
      movementId: params.movementId,
      documentRef: params.documentRef,
      userId: params.userId,
      causedBy: params.userId ? 'user' : 'system',
      reason: params.reason,
      metadata: params.metadata,
    });
  } catch (error) {
    // Log but don't fail the main operation
    logger.error('Failed to record inventory event (non-blocking)', {
      tenantId: params.tenantId,
      productId: params.productId,
      eventType: params.eventType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Creates inventory snapshots for all products in a tenant.
 * Called by scheduled job at 12:00 and 23:00 daily.
 */
export async function createInventorySnapshots(tenantId: string): Promise<number> {
  try {
    const now = new Date();
    
    // Get all current balances for tenant
    const balances = await db
      .select()
      .from(wmsInventoryBalances)
      .where(eq(wmsInventoryBalances.tenantId, tenantId));

    if (balances.length === 0) {
      logger.info('No inventory balances to snapshot', { tenantId });
      return 0;
    }

    // Create snapshots for all balances
    const snapshots = balances.map(balance => ({
      id: crypto.randomUUID(),
      tenantId,
      storeId: balance.storeId,
      productId: balance.productId,
      snapshotAt: now,
      quantityAtTime: balance.quantityAvailable,
      reservedAtTime: balance.quantityReserved,
      valueAtTime: balance.totalValue,
      averageCostAtTime: balance.averageCost,
      createdAt: now
    }));

    await db.insert(wmsInventorySnapshots).values(snapshots as any);

    logger.info('Inventory snapshots created', {
      tenantId,
      snapshotCount: snapshots.length,
      snapshotAt: now.toISOString()
    });

    return snapshots.length;
  } catch (error) {
    logger.error('Failed to create inventory snapshots', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

// ==================== INVENTORY VIEW (Enterprise Dashboard) ====================

/**
 * GET /api/wms/inventory-view
 * 
 * Enterprise inventory view for WMS dashboard.
 * Returns product inventory with filters, pagination, and KPI aggregations.
 * Supports two view modes: aggregated (default) and serialized.
 * Only returns stores with hasWarehouse=true.
 * 
 * @permission wms.stock.read
 * @query viewMode - View mode: 'aggregated' (default) | 'serialized' (one row per IMEI/serial)
 * @query storeId - Filter by specific store
 * @query categoryId - Filter by product category
 * @query status - Filter by stock status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
 * @query search - Extended search: name, SKU, brand, model, description, IMEI, serial, batch code
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 250 for aggregated, 50 for serialized, max: 500)
 * @query sortBy - Sort column: 'name' | 'sku' | 'quantity' | 'value' | 'lastMovement' | 'brand' | 'model'
 * @query sortOrder - Sort order: 'asc' | 'desc'
 */
router.get("/inventory-view", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    // Parse query params
    const {
      viewMode = 'aggregated',
      storeId,
      categoryId,
      typeId,
      brand,
      status = 'all',
      search = '',
      identifierType = 'sku',
      identifierValue = '',
      supplierId,
      dateFrom,
      dateTo,
      page = '1',
      limit,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const isSerializedView = viewMode === 'serialized';
    const defaultLimit = isSerializedView ? 50 : 250;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || defaultLimit));
    const offset = (pageNum - 1) * limitNum;

    // Build conditions for inventory view
    const conditions: SQL[] = [eq(wmsInventoryBalances.tenantId, sessionTenantId)];

    // Filter by store with hasWarehouse=true
    if (storeId) {
      conditions.push(eq(wmsInventoryBalances.storeId, storeId as string));
    }

    // Get all stores with warehouse for this tenant
    const warehouseStores = await db
      .select({ id: stores.id, nome: stores.nome, code: stores.code })
      .from(stores)
      .where(and(
        eq(stores.tenantId, sessionTenantId),
        eq(stores.hasWarehouse, true)
      ));

    const warehouseStoreIds = warehouseStores.map(s => s.id);
    
    if (warehouseStoreIds.length === 0) {
      return res.json({
        success: true,
        data: {
          items: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0
          },
          kpis: {
            totalProducts: 0,
            totalValue: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            inStockCount: 0
          },
          warehouseStores
        }
      });
    }

    // Only include stores with warehouse
    if (!storeId) {
      conditions.push(inArray(wmsInventoryBalances.storeId, warehouseStoreIds));
    }

    // Get inventory balances with product join (aggregated view)
    const balancesQuery = db
      .select({
        balanceId: wmsInventoryBalances.id,
        storeId: wmsInventoryBalances.storeId,
        productId: wmsInventoryBalances.productId,
        quantityAvailable: wmsInventoryBalances.quantityAvailable,
        quantityReserved: wmsInventoryBalances.quantityReserved,
        totalValue: wmsInventoryBalances.totalValue,
        lastMovementAt: wmsInventoryBalances.lastMovementAt,
        updatedAt: wmsInventoryBalances.updatedAt,
        // Product fields (using correct schema column names)
        productName: products.name,
        productSku: products.sku,
        productType: products.type,
        productCategory: products.categoryId,
        productTypeId: products.typeId,
        productStatus: products.status,
        productReorderPoint: products.reorderPoint,
        // Extended product fields
        productBrand: products.brand,
        productModel: products.model,
        productDescription: products.description,
        productEan: products.ean,
        productSerialType: products.serialType,
        // Store fields  
        storeName: stores.nome,
        storeCode: stores.code
      })
      .from(wmsInventoryBalances)
      .innerJoin(products, and(
        eq(wmsInventoryBalances.productId, products.id),
        eq(products.tenantId, sessionTenantId)
      ))
      .innerJoin(stores, and(
        eq(wmsInventoryBalances.storeId, stores.id),
        eq(stores.tenantId, sessionTenantId),
        eq(stores.hasWarehouse, true)
      ))
      .where(and(...conditions));

    // Apply search filter
    let filteredQuery = balancesQuery;
    if (search) {
      const searchLower = `%${(search as string).toLowerCase()}%`;
      // Note: Search filter applied after query due to complex joins
    }

    // Get all results first for filtering and counting
    let allResults = await balancesQuery;

    // Get serial counts AND logistic status distribution for each product-store pair
    const productStoreKeys = [...new Set(allResults.map(r => `${r.productId}|${r.storeId}`))];
    let serialCountMap: Record<string, number> = {};
    let serialValuesMap: Record<string, Array<{ type: string; value: string }>> = {};
    let logisticStatusMap: Record<string, { counts: Record<string, number>; dominant: string }> = {};
    
    if (productStoreKeys.length > 0) {
      try {
        const productIds = [...new Set(allResults.map(r => r.productId))];
        
        // Get serial counts grouped by product-store
        const serialCounts = await db
          .select({
            productId: productItems.productId,
            storeId: productItems.storeId,
            count: sql<number>`count(*)::int`
          })
          .from(productItems)
          .where(and(
            eq(productItems.tenantId, sessionTenantId),
            inArray(productItems.productId, productIds)
          ))
          .groupBy(productItems.productId, productItems.storeId);
        
        // Create composite key for product-store lookup
        serialCountMap = serialCounts.reduce((acc, item) => {
          const key = `${item.productId}|${item.storeId || ''}`;
          acc[key] = item.count;
          return acc;
        }, {} as Record<string, number>);

        // Get actual serial values (limited to 5 per product-store for performance)
        const serialValues = await db
          .select({
            productId: productItems.productId,
            storeId: productItems.storeId,
            serialType: productSerials.serialType,
            serialValue: productSerials.serialValue
          })
          .from(productItems)
          .innerJoin(productSerials, eq(productItems.id, productSerials.productItemId))
          .where(and(
            eq(productItems.tenantId, sessionTenantId),
            inArray(productItems.productId, productIds)
          ))
          .limit(500); // Overall limit, will be grouped by product-store

        // Group serial values by product-store (max 5 each)
        serialValues.forEach(item => {
          const key = `${item.productId}|${item.storeId || ''}`;
          if (!serialValuesMap[key]) {
            serialValuesMap[key] = [];
          }
          if (serialValuesMap[key].length < 5) {
            serialValuesMap[key].push({
              type: item.serialType,
              value: item.serialValue
            });
          }
        });
        
        // Get logistic status distribution grouped by product-store-status
        const statusCounts = await db
          .select({
            productId: productItems.productId,
            storeId: productItems.storeId,
            logisticStatus: productItems.logisticStatus,
            count: sql<number>`count(*)::int`
          })
          .from(productItems)
          .where(and(
            eq(productItems.tenantId, sessionTenantId),
            inArray(productItems.productId, productIds)
          ))
          .groupBy(productItems.productId, productItems.storeId, productItems.logisticStatus);
        
        // Build logistic status map with counts and dominant status
        statusCounts.forEach(item => {
          const key = `${item.productId}|${item.storeId || ''}`;
          if (!logisticStatusMap[key]) {
            logisticStatusMap[key] = { counts: {}, dominant: 'in_stock' };
          }
          logisticStatusMap[key].counts[item.logisticStatus] = item.count;
        });
        
        // Calculate dominant status for each product-store
        Object.keys(logisticStatusMap).forEach(key => {
          const counts = logisticStatusMap[key].counts;
          let maxCount = 0;
          let dominant = 'in_stock';
          Object.entries(counts).forEach(([status, count]) => {
            if (count > maxCount) {
              maxCount = count;
              dominant = status;
            }
          });
          logisticStatusMap[key].dominant = dominant;
        });
        
      } catch (e) {
        // If product_items table doesn't exist or other error, continue without serial counts
        console.log('Serial/status count query skipped:', e instanceof Error ? e.message : 'Unknown error');
      }
    }

    // Get batch info for each product-store pair
    let batchInfoMap: Record<string, { batchCount: number; batches: Array<{ batchNumber: string; quantity: number }> }> = {};
    if (productStoreKeys.length > 0) {
      try {
        const productIds = [...new Set(allResults.map(r => r.productId))];
        const storeIds = [...new Set(allResults.map(r => r.storeId).filter(Boolean))];
        
        // Query batches filtering by productIds AND storeIds (include batches with null storeId as cross-store)
        const batchData = await db
          .select({
            productId: productBatches.productId,
            storeId: productBatches.storeId,
            batchNumber: productBatches.batchNumber,
            quantity: productBatches.quantity
          })
          .from(productBatches)
          .where(and(
            eq(productBatches.tenantId, sessionTenantId),
            inArray(productBatches.productId, productIds),
            sql`${productBatches.quantity} > 0`,
            storeIds.length > 0 
              ? or(
                  inArray(productBatches.storeId, storeIds),
                  isNull(productBatches.storeId)
                )
              : sql`true`
          ));
        
        // Group batches by product-store
        // For batches with null storeId, associate them with ALL stores that have this product
        batchData.forEach(batch => {
          if (batch.storeId) {
            // Batch with specific store
            const key = `${batch.productId}|${batch.storeId}`;
            if (!batchInfoMap[key]) {
              batchInfoMap[key] = { batchCount: 0, batches: [] };
            }
            batchInfoMap[key].batchCount++;
            batchInfoMap[key].batches.push({
              batchNumber: batch.batchNumber,
              quantity: batch.quantity || 0
            });
          } else {
            // Batch without store (cross-store) - add to all matching product-store combinations
            allResults.forEach(result => {
              if (result.productId === batch.productId) {
                const key = `${result.productId}|${result.storeId || ''}`;
                if (!batchInfoMap[key]) {
                  batchInfoMap[key] = { batchCount: 0, batches: [] };
                }
                // Check if this batch is already added to avoid duplicates
                const alreadyExists = batchInfoMap[key].batches.some(b => b.batchNumber === batch.batchNumber);
                if (!alreadyExists) {
                  batchInfoMap[key].batchCount++;
                  batchInfoMap[key].batches.push({
                    batchNumber: batch.batchNumber,
                    quantity: batch.quantity || 0
                  });
                }
              }
            });
          }
        });
      } catch (e) {
        console.log('Batch info query skipped:', e instanceof Error ? e.message : 'Unknown error');
      }
    }

    // Apply extended search filter in memory (name, SKU, brand, model, description, store, EAN)
    // Also search in serials (IMEI, ICCID, MAC) - requires minimum 3 characters
    if (search && (search as string).length >= 3) {
      const searchLower = (search as string).toLowerCase();
      
      // First, find productIds that match via serials (IMEI, ICCID, MAC)
      let matchingProductIdsFromSerials: Set<string> = new Set();
      try {
        const serialMatches = await db
          .select({
            productId: productItems.productId
          })
          .from(productSerials)
          .innerJoin(productItems, eq(productSerials.productItemId, productItems.id))
          .where(and(
            eq(productSerials.tenantId, sessionTenantId),
            ilike(productSerials.serialValue, `%${search}%`)
          ))
          .limit(500);
        
        serialMatches.forEach(m => matchingProductIdsFromSerials.add(m.productId));
      } catch (e) {
        console.log('Serial search skipped:', e instanceof Error ? e.message : 'Unknown error');
      }
      
      allResults = allResults.filter(r => 
        (r.productName?.toLowerCase().includes(searchLower)) ||
        (r.productSku?.toLowerCase().includes(searchLower)) ||
        (r.productBrand?.toLowerCase().includes(searchLower)) ||
        (r.productModel?.toLowerCase().includes(searchLower)) ||
        (r.productDescription?.toLowerCase().includes(searchLower)) ||
        (r.productEan?.toLowerCase().includes(searchLower)) ||
        (r.storeName?.toLowerCase().includes(searchLower)) ||
        (r.storeCode?.toLowerCase().includes(searchLower)) ||
        matchingProductIdsFromSerials.has(r.productId)
      );
    }

    // Valid logistic statuses from product_logistic_status enum
    const LOGISTIC_STATUSES = [
      'in_stock', 'reserved', 'preparing', 'shipping', 'delivered',
      'customer_return', 'doa_return', 'in_service', 'supplier_return',
      'in_transfer', 'lost', 'damaged', 'internal_use'
    ];

    // Apply status filter (supports both stock status and logistic status)
    if (status !== 'all') {
      // Check if status is a logistic status (for serialized items)
      if (LOGISTIC_STATUSES.includes(status as string)) {
        // Filter products that have items with this logistic status
        // Get product IDs that have items with the specified logistic status
        const productIdsWithStatus = await db
          .select({ productId: productItems.productId })
          .from(productItems)
          .where(and(
            eq(productItems.tenantId, sessionTenantId),
            eq(productItems.logisticStatus, status as string),
            inArray(productItems.storeId, warehouseStoreIds)
          ))
          .then(rows => [...new Set(rows.map(r => r.productId))]);
        
        allResults = allResults.filter(r => productIdsWithStatus.includes(r.productId));
      } else {
        // Stock status filter (calculated from quantity using product's reorderPoint)
        allResults = allResults.filter(r => {
          const qty = r.quantityAvailable || 0;
          const reorderPoint = (r as any).productReorderPoint || 5; // Default threshold
          
          switch (status) {
            case 'out_of_stock':
              return qty === 0;
            case 'low_stock':
              return qty > 0 && qty <= reorderPoint;
            case 'in_stock':
              return qty > reorderPoint;
            default:
              return true;
          }
        });
      }
    }

    // Apply category filter
    if (categoryId) {
      allResults = allResults.filter(r => r.productCategory === categoryId);
    }

    // Apply typeId filter (products have a typeId field linking to product_types)
    if (typeId) {
      allResults = allResults.filter(r => (r as any).productTypeId === typeId);
    }

    // Apply brand filter
    if (brand) {
      const brandLower = (brand as string).toLowerCase();
      allResults = allResults.filter(r => r.productBrand?.toLowerCase() === brandLower);
    }

    // Apply identifier filter (SKU, IMEI, ICCID, MAC, EAN)
    if (identifierValue && (identifierValue as string).trim() !== '') {
      const idVal = (identifierValue as string).trim().toLowerCase();
      const idType = identifierType as string;
      
      if (idType === 'sku') {
        // Filter by SKU directly on products
        allResults = allResults.filter(r => 
          r.productSku?.toLowerCase().includes(idVal)
        );
      } else {
        // For IMEI, ICCID, EAN - need to query product_items
        try {
          const productIds = [...new Set(allResults.map(r => r.productId))];
          
          let matchingProductIds: string[] = [];
          if (idType === 'imei') {
            const items = await db
              .select({ productId: productItems.productId })
              .from(productItems)
              .where(and(
                eq(productItems.tenantId, sessionTenantId),
                inArray(productItems.productId, productIds),
                sql`LOWER(${productItems.imei}) LIKE ${`%${idVal}%`}`
              ));
            matchingProductIds = [...new Set(items.map(i => i.productId))];
          } else if (idType === 'iccid') {
            const items = await db
              .select({ productId: productItems.productId })
              .from(productItems)
              .where(and(
                eq(productItems.tenantId, sessionTenantId),
                inArray(productItems.productId, productIds),
                sql`LOWER(${productItems.iccid}) LIKE ${`%${idVal}%`}`
              ));
            matchingProductIds = [...new Set(items.map(i => i.productId))];
          } else if (idType === 'mac') {
            // MAC Address search via product_serials table (serialType is 'mac_address' in DB)
            const items = await db
              .select({ productId: productItems.productId })
              .from(productItems)
              .innerJoin(productSerials, eq(productItems.id, productSerials.productItemId))
              .where(and(
                eq(productItems.tenantId, sessionTenantId),
                inArray(productItems.productId, productIds),
                eq(productSerials.serialType, 'mac_address'),
                sql`LOWER(${productSerials.serialValue}) LIKE ${`%${idVal}%`}`
              ));
            matchingProductIds = [...new Set(items.map(i => i.productId))];
          } else if (idType === 'ean') {
            // EAN is on products table
            allResults = allResults.filter(r => 
              (r as any).productEan?.toLowerCase().includes(idVal)
            );
          }
          
          if (idType === 'imei' || idType === 'iccid' || idType === 'mac') {
            allResults = allResults.filter(r => matchingProductIds.includes(r.productId));
          }
        } catch (e) {
          console.log('Identifier filter query error:', e instanceof Error ? e.message : 'Unknown error');
        }
      }
    }

    // Apply date range filter (based on lastMovementAt or updatedAt)
    if (dateFrom || dateTo) {
      allResults = allResults.filter(r => {
        const moveDate = r.lastMovementAt ? new Date(r.lastMovementAt) : r.updatedAt ? new Date(r.updatedAt) : null;
        if (!moveDate) return false;
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom as string);
          if (moveDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo as string);
          toDate.setHours(23, 59, 59, 999); // Include end date
          if (moveDate > toDate) return false;
        }
        return true;
      });
    }

    // Calculate KPIs from filtered results
    // Default fallback threshold if product has no reorderPoint configured
    const DEFAULT_LOW_STOCK_THRESHOLD = 5;

    // ==================== AGGREGATED VIEW: Group by Product ====================
    if (viewMode === 'aggregated') {
      // Aggregate results by productId (cross-store)
      const productAggregates = new Map<string, {
        productId: string;
        productName: string;
        productSku: string;
        productType: string;
        productCategory: string | null;
        productTypeId: string | null;
        productStatus: string | null;
        productBrand: string | null;
        productModel: string | null;
        productDescription: string | null;
        productEan: string | null;
        productSerialType: string | null;
        productReorderPoint: number;
        totalAvailable: number;
        totalReserved: number;
        totalValue: number;
        totalCostWeighted: number; // For weighted average calculation
        storeIds: Set<string>;
        lastMovementAt: Date | null;
        balanceIds: string[];
      }>();

      // First pass: aggregate quantities and values by product
      for (const r of allResults) {
        const existing = productAggregates.get(r.productId);
        const qty = r.quantityAvailable || 0;
        const value = parseFloat(r.totalValue || '0');
        const avgCost = qty > 0 ? value / qty : 0;
        
        if (existing) {
          existing.totalAvailable += qty;
          existing.totalReserved += (r.quantityReserved || 0);
          existing.totalValue += value;
          existing.totalCostWeighted += value; // Sum of (qty * cost) for weighted average
          if (r.storeId) existing.storeIds.add(r.storeId);
          existing.balanceIds.push(r.balanceId);
          
          // Keep most recent movement
          const rMoveAt = r.lastMovementAt ? new Date(r.lastMovementAt) : null;
          if (rMoveAt && (!existing.lastMovementAt || rMoveAt > existing.lastMovementAt)) {
            existing.lastMovementAt = rMoveAt;
          }
        } else {
          productAggregates.set(r.productId, {
            productId: r.productId,
            productName: r.productName,
            productSku: r.productSku,
            productType: r.productType,
            productCategory: r.productCategory,
            productTypeId: r.productTypeId,
            productStatus: r.productStatus,
            productBrand: r.productBrand,
            productModel: r.productModel,
            productDescription: r.productDescription,
            productEan: r.productEan,
            productSerialType: r.productSerialType,
            productReorderPoint: (r as any).productReorderPoint || DEFAULT_LOW_STOCK_THRESHOLD,
            totalAvailable: qty,
            totalReserved: r.quantityReserved || 0,
            totalValue: value,
            totalCostWeighted: value,
            storeIds: r.storeId ? new Set([r.storeId]) : new Set(),
            lastMovementAt: r.lastMovementAt ? new Date(r.lastMovementAt) : null,
            balanceIds: [r.balanceId]
          });
        }
      }

      // Get logistic status distribution for all products (cross-store)
      const productIds = [...productAggregates.keys()];
      let crossStoreLogisticMap: Record<string, Record<string, number>> = {};
      let crossStoreSerialCountMap: Record<string, number> = {};
      
      if (productIds.length > 0) {
        try {
          // Get logistic status counts grouped by product (not by store)
          const logisticCounts = await db
            .select({
              productId: productItems.productId,
              logisticStatus: productItems.logisticStatus,
              count: sql<number>`count(*)::int`
            })
            .from(productItems)
            .where(and(
              eq(productItems.tenantId, sessionTenantId),
              inArray(productItems.productId, productIds),
              inArray(productItems.storeId, warehouseStoreIds)
            ))
            .groupBy(productItems.productId, productItems.logisticStatus);
          
          logisticCounts.forEach(item => {
            if (!crossStoreLogisticMap[item.productId]) {
              crossStoreLogisticMap[item.productId] = {};
            }
            crossStoreLogisticMap[item.productId][item.logisticStatus] = item.count;
          });

          // Get serial counts per product (cross-store)
          const serialCounts = await db
            .select({
              productId: productItems.productId,
              count: sql<number>`count(*)::int`
            })
            .from(productItems)
            .where(and(
              eq(productItems.tenantId, sessionTenantId),
              inArray(productItems.productId, productIds),
              inArray(productItems.storeId, warehouseStoreIds)
            ))
            .groupBy(productItems.productId);
          
          serialCounts.forEach(item => {
            crossStoreSerialCountMap[item.productId] = item.count;
          });
        } catch (e) {
          console.log('Cross-store logistic status query skipped:', e instanceof Error ? e.message : 'Unknown error');
        }
      }

      // Convert aggregates to array for sorting/pagination
      const aggregatedItems = [...productAggregates.values()].map(agg => {
        // Get logistic status distribution
        const logisticCounts = crossStoreLogisticMap[agg.productId] || {};
        const totalSerials = crossStoreSerialCountMap[agg.productId] || 0;
        
        // CRITICAL: Calculate totalAvailable and totalReserved from product_items logistic status
        // to ensure consistency with the logistic status distribution shown in UI
        // 
        // AVAILABLE (sellable inventory): in_stock, customer_return, doa_return
        // RESERVED (committed/outbound): reserved, preparing, shipping, in_transfer
        // EXCLUDED from both totals: delivered, lost, damaged, in_service, supplier_return, internal_use
        const AVAILABLE_STATUSES = ['in_stock', 'customer_return', 'doa_return'];
        const RESERVED_STATUSES = ['reserved', 'preparing', 'shipping', 'in_transfer'];
        
        const availableFromSerials = AVAILABLE_STATUSES.reduce((sum, status) => sum + (logisticCounts[status] || 0), 0);
        const reservedFromSerials = RESERVED_STATUSES.reduce((sum, status) => sum + (logisticCounts[status] || 0), 0);
        
        // Use serial-based counts for consistency (fallback to balance-based if no serials)
        const effectiveTotalAvailable = totalSerials > 0 ? availableFromSerials : agg.totalAvailable;
        const effectiveTotalReserved = totalSerials > 0 ? reservedFromSerials : agg.totalReserved;
        
        // Calculate total quantity (available + reserved) for accurate weighted average
        const totalQuantity = effectiveTotalAvailable + effectiveTotalReserved;
        const weightedAvgCost = totalQuantity > 0 
          ? agg.totalCostWeighted / totalQuantity 
          : 0;
        
        // Calculate stock status based on product's reorderPoint (not fixed threshold)
        const reorderPoint = agg.productReorderPoint || DEFAULT_LOW_STOCK_THRESHOLD;
        let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
        if (effectiveTotalAvailable === 0) stockStatus = 'out_of_stock';
        else if (effectiveTotalAvailable <= reorderPoint) stockStatus = 'low_stock';
        else stockStatus = 'in_stock';
        
        // Calculate logistic status distribution with percentages
        const logisticDistribution = Object.entries(logisticCounts).map(([status, count]) => ({
          status,
          count,
          percentage: totalSerials > 0 ? Math.round((count / totalSerials) * 100) : 0
        }));
        
        // Calculate stock status distribution (how many stores have each status)
        const storeStatusCounts: Record<string, number> = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
        for (const r of allResults) {
          if (r.productId === agg.productId) {
            const qty = r.quantityAvailable || 0;
            const rReorderPoint = (r as any).productReorderPoint || DEFAULT_LOW_STOCK_THRESHOLD;
            if (qty === 0) storeStatusCounts.out_of_stock++;
            else if (qty <= rReorderPoint) storeStatusCounts.low_stock++;
            else storeStatusCounts.in_stock++;
          }
        }
        
        const stockDistribution = Object.entries(storeStatusCounts)
          .filter(([_, count]) => count > 0)
          .map(([status, count]) => ({
            status,
            count,
            percentage: agg.storeIds.size > 0 ? Math.round((count / agg.storeIds.size) * 100) : 0
          }));

        return {
          productId: agg.productId,
          productName: agg.productName,
          productSku: agg.productSku,
          productType: agg.productType,
          productCategory: agg.productCategory,
          productTypeId: agg.productTypeId,
          productStatus: agg.productStatus || 'active',
          productBrand: agg.productBrand,
          productModel: agg.productModel,
          productDescription: agg.productDescription,
          productEan: agg.productEan,
          serialType: agg.productSerialType,
          totalAvailable: effectiveTotalAvailable,
          totalReserved: effectiveTotalReserved,
          totalValue: agg.totalValue,
          weightedAverageCost: weightedAvgCost,
          storeCoverageCount: agg.storeIds.size,
          stockStatus,
          serialCount: totalSerials,
          logisticStatusDistribution: logisticDistribution,
          stockStatusDistribution: stockDistribution,
          lastMovementAt: agg.lastMovementAt?.toISOString() || null
        };
      });

      // Calculate KPIs for aggregated view
      const kpis = {
        totalProducts: aggregatedItems.length,
        totalValue: aggregatedItems.reduce((sum, item) => sum + item.totalValue, 0),
        lowStockCount: aggregatedItems.filter(item => item.stockStatus === 'low_stock').length,
        outOfStockCount: aggregatedItems.filter(item => item.stockStatus === 'out_of_stock').length,
        inStockCount: aggregatedItems.filter(item => item.stockStatus === 'in_stock').length
      };

      // Sort aggregated results
      aggregatedItems.sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortBy) {
          case 'sku':
            aVal = a.productSku || '';
            bVal = b.productSku || '';
            break;
          case 'quantity':
            aVal = a.totalAvailable;
            bVal = b.totalAvailable;
            break;
          case 'value':
            aVal = a.totalValue;
            bVal = b.totalValue;
            break;
          case 'lastMovement':
            aVal = a.lastMovementAt ? new Date(a.lastMovementAt).getTime() : 0;
            bVal = b.lastMovementAt ? new Date(b.lastMovementAt).getTime() : 0;
            break;
          case 'storeCoverage':
            aVal = a.storeCoverageCount;
            bVal = b.storeCoverageCount;
            break;
          case 'name':
          default:
            aVal = a.productName || '';
            bVal = b.productName || '';
        }
        
        if (typeof aVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      // Apply pagination
      const paginatedItems = aggregatedItems.slice(offset, offset + limitNum);

      return res.json({
        success: true,
        data: {
          viewMode: 'aggregated',
          items: paginatedItems,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: aggregatedItems.length,
            totalPages: Math.ceil(aggregatedItems.length / limitNum)
          },
          kpis,
          warehouseStores
        }
      });
    }

    // ==================== SERIALIZED VIEW: Per-item logic (one row per physical item) ====================
    // Query product_items directly to get one row per physical item
    const itemConditions: SQL[] = [
      eq(productItems.tenantId, sessionTenantId),
      inArray(productItems.storeId, warehouseStoreIds)
    ];
    
    if (storeId) {
      itemConditions.push(eq(productItems.storeId, storeId as string));
    }

    // Get all physical items with their product and store info
    let physicalItems = await db
      .select({
        itemId: productItems.id,
        productId: productItems.productId,
        storeId: productItems.storeId,
        logisticStatus: productItems.logisticStatus,
        condition: productItems.condition,
        lastPurchaseCost: productItems.lastPurchaseCost,
        supplierSku: productItems.supplierSku,
        createdAt: productItems.createdAt,
        updatedAt: productItems.updatedAt,
        // Product info
        productName: products.name,
        productSku: products.sku,
        productType: products.type,
        productCategory: products.categoryId,
        productBrand: products.brand,
        productModel: products.model,
        productDescription: products.description,
        productEan: products.ean,
        productSerialType: products.serialType,
        productReorderPoint: products.reorderPoint,
        // Store info
        storeName: stores.nome,
        storeCode: stores.code
      })
      .from(productItems)
      .innerJoin(products, and(
        eq(productItems.productId, products.id),
        eq(products.tenantId, sessionTenantId)
      ))
      .innerJoin(stores, and(
        eq(productItems.storeId, stores.id),
        eq(stores.tenantId, sessionTenantId),
        eq(stores.hasWarehouse, true)
      ))
      .where(and(...itemConditions))
      .orderBy(products.name, stores.nome);

    // Get serials for each item
    const itemIds = physicalItems.map(i => i.itemId);
    let itemSerialsMap: Record<string, Array<{ type: string; value: string }>> = {};
    
    if (itemIds.length > 0) {
      const allSerials = await db
        .select({
          itemId: productSerials.productItemId,
          serialType: productSerials.serialType,
          serialValue: productSerials.serialValue
        })
        .from(productSerials)
        .where(and(
          eq(productSerials.tenantId, sessionTenantId),
          inArray(productSerials.productItemId, itemIds)
        ));
      
      allSerials.forEach(s => {
        if (!itemSerialsMap[s.itemId]) {
          itemSerialsMap[s.itemId] = [];
        }
        itemSerialsMap[s.itemId].push({
          type: s.serialType,
          value: s.serialValue
        });
      });
    }

    // Apply search filter
    if (search && (search as string).length >= 2) {
      const searchLower = (search as string).toLowerCase();
      physicalItems = physicalItems.filter(r => 
        (r.productName?.toLowerCase().includes(searchLower)) ||
        (r.productSku?.toLowerCase().includes(searchLower)) ||
        (r.productBrand?.toLowerCase().includes(searchLower)) ||
        (r.productModel?.toLowerCase().includes(searchLower)) ||
        (r.storeName?.toLowerCase().includes(searchLower)) ||
        (r.productEan?.toLowerCase().includes(searchLower)) ||
        // Search in serials
        (itemSerialsMap[r.itemId]?.some(s => s.value.toLowerCase().includes(searchLower)))
      );
    }

    // Apply status filter (logistic status)
    if (status !== 'all') {
      physicalItems = physicalItems.filter(r => r.logisticStatus === status);
    }

    // Apply category filter
    if (categoryId) {
      physicalItems = physicalItems.filter(r => r.productCategory === categoryId);
    }

    // Apply brand filter
    if (brand) {
      const brandLower = (brand as string).toLowerCase();
      physicalItems = physicalItems.filter(r => r.productBrand?.toLowerCase() === brandLower);
    }

    // Calculate KPIs
    const kpis = {
      totalProducts: physicalItems.length,
      totalValue: physicalItems.reduce((sum, r) => sum + parseFloat(r.lastPurchaseCost || '0'), 0),
      lowStockCount: 0, // N/A for per-item view
      outOfStockCount: physicalItems.filter(r => ['sold', 'disposed', 'lost'].includes(r.logisticStatus)).length,
      inStockCount: physicalItems.filter(r => r.logisticStatus === 'in_stock').length
    };

    // Sort results
    physicalItems.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'sku':
          aVal = a.productSku || '';
          bVal = b.productSku || '';
          break;
        case 'value':
          aVal = parseFloat(a.lastPurchaseCost || '0');
          bVal = parseFloat(b.lastPurchaseCost || '0');
          break;
        case 'lastMovement':
          aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;
        case 'name':
        default:
          aVal = a.productName || '';
          bVal = b.productName || '';
      }
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply pagination
    const paginatedItems = physicalItems.slice(offset, offset + limitNum);

    // Transform results
    const items = paginatedItems.map(r => {
      const itemSerials = itemSerialsMap[r.itemId] || [];
      const reorderPoint = r.productReorderPoint || DEFAULT_LOW_STOCK_THRESHOLD;
      
      return {
        id: r.itemId, // Use itemId as the row ID
        itemId: r.itemId, // Explicit itemId for frontend filtering
        storeId: r.storeId,
        storeName: r.storeName,
        storeCode: r.storeCode,
        productId: r.productId,
        productName: r.productName,
        productSku: r.productSku,
        productType: r.productType,
        productCategory: r.productCategory,
        productStatus: 'active',
        productBrand: r.productBrand || null,
        productModel: r.productModel || null,
        productDescription: r.productDescription || null,
        productEan: r.productEan || null,
        supplierSku: r.supplierSku || null,
        serialType: r.productSerialType || null,
        serialCount: itemSerials.length,
        serials: itemSerials,
        quantityAvailable: 1, // Each row is one physical item
        quantityReserved: 0,
        averageCost: parseFloat(r.lastPurchaseCost || '0'),
        totalValue: parseFloat(r.lastPurchaseCost || '0'),
        lowStockThreshold: reorderPoint,
        stockStatus: 'in_stock' as const,
        logisticStatus: r.logisticStatus,
        logisticStatusCounts: { [r.logisticStatus]: 1 },
        condition: r.condition,
        batchCount: 0,
        batches: [],
        lastMovementAt: r.updatedAt,
        updatedAt: r.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        viewMode: 'serialized',
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: physicalItems.length,
          totalPages: Math.ceil(physicalItems.length / limitNum)
        },
        kpis,
        warehouseStores
      }
    });

  } catch (error) {
    console.error("Error fetching inventory view:", error);
    res.status(500).json({ 
      error: "Failed to fetch inventory view",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/inventory-view/export
 * 
 * Export inventory data in disaggregated format (one row per serial/IMEI).
 * Always exports detailed view regardless of current UI viewMode.
 * Inherits filters from query but returns all matching records.
 * 
 * @permission wms.stock.read
 * @query format - Export format: 'csv' | 'excel' | 'json'
 * @query (same filters as /inventory-view)
 */
router.get("/inventory-view/export", async (req: Request, res: Response) => {
  try {
    const sessionTenantId = (req as any).tenantId;
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const {
      format = 'json',
      storeId,
      categoryId,
      status = 'all',
      search = '',
      productId // Filter by specific product (for exporting serials from modal)
    } = req.query;

    // Get stores with warehouse
    const warehouseStoreIds = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(
        eq(stores.tenantId, sessionTenantId),
        eq(stores.hasWarehouse, true)
      ))
      .then(rows => rows.map(r => r.id));

    if (warehouseStoreIds.length === 0) {
      if (format === 'json') {
        return res.json({ success: true, data: [] });
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"');
      return res.send('');
    }

    // Build conditions for product_items (serialized inventory)
    const itemConditions: SQL[] = [eq(productItems.tenantId, sessionTenantId)];
    
    if (storeId) {
      itemConditions.push(eq(productItems.storeId, storeId as string));
    } else {
      itemConditions.push(inArray(productItems.storeId, warehouseStoreIds));
    }
    
    // Filter by specific product if provided (for exporting serials from modal)
    if (productId) {
      itemConditions.push(eq(productItems.productId, productId as string));
    }

    // Get disaggregated data: one row per product_item with its serial
    let serializedResults = await db
      .select({
        itemId: productItems.id,
        storeId: productItems.storeId,
        productId: productItems.productId,
        status: productItems.logisticStatus,
        purchaseCost: productItems.lastPurchaseCost,
        warehouseLocation: productItems.warehouseLocation,
        createdAt: productItems.createdAt,
        // Product info
        productName: products.nome,
        productSku: products.sku,
        productType: products.productType,
        productCategoryId: products.categoryId,
        productCategory: wmsCategories.nome,
        productBrand: products.brand,
        productModel: products.model,
        // Store info
        storeName: stores.nome,
        storeCode: stores.code,
        // Serial info (LEFT JOIN)
        serialValue: productSerials.serialValue,
        serialType: productSerials.serialType
      })
      .from(productItems)
      .innerJoin(products, and(
        eq(productItems.productId, products.id),
        eq(products.tenantId, sessionTenantId)
      ))
      .innerJoin(stores, and(
        eq(productItems.storeId, stores.id),
        eq(stores.tenantId, sessionTenantId),
        eq(stores.hasWarehouse, true)
      ))
      .leftJoin(wmsCategories, and(
        eq(wmsCategories.id, products.categoryId),
        eq(wmsCategories.tenantId, sessionTenantId)
      ))
      .leftJoin(productSerials, and(
        eq(productSerials.productItemId, productItems.id),
        eq(productSerials.tenantId, sessionTenantId)
      ))
      .where(and(...itemConditions))
      .orderBy(products.nome, stores.nome);

    // Apply filters
    if (search) {
      const searchLower = (search as string).toLowerCase();
      serializedResults = serializedResults.filter(r => 
        (r.productName?.toLowerCase().includes(searchLower)) ||
        (r.productSku?.toLowerCase().includes(searchLower)) ||
        (r.storeName?.toLowerCase().includes(searchLower)) ||
        (r.productBrand?.toLowerCase().includes(searchLower)) ||
        (r.productModel?.toLowerCase().includes(searchLower)) ||
        (r.serialValue?.toLowerCase().includes(searchLower))
      );
    }

    if (status !== 'all') {
      serializedResults = serializedResults.filter(r => {
        switch (status) {
          case 'out_of_stock': return r.status === 'sold' || r.status === 'disposed';
          case 'low_stock': return r.status === 'reserved' || r.status === 'damaged';
          case 'in_stock': return r.status === 'available' || r.status === 'in_stock';
          default: return true;
        }
      });
    }

    if (categoryId) {
      serializedResults = serializedResults.filter(r => r.productCategoryId === categoryId);
    }

    // Map status to Italian
    const statusMap: Record<string, string> = {
      'available': 'Disponibile',
      'in_stock': 'In Magazzino',
      'reserved': 'Riservato',
      'sold': 'Venduto',
      'damaged': 'Danneggiato',
      'disposed': 'Dismesso',
      'in_transit': 'In Transito'
    };

    // Transform data for export
    const exportData = serializedResults.map(r => ({
      'Negozio': r.storeName || '',
      'Codice Negozio': r.storeCode || '',
      'Prodotto': r.productName || '',
      'SKU': r.productSku || '',
      'Brand': r.productBrand || '',
      'Modello': r.productModel || '',
      'Tipo': r.productType || '',
      'Categoria': r.productCategory || '',
      'IMEI/Seriale': r.serialValue || '',
      'Tipo Seriale': r.serialType || '',
      'Stato': statusMap[r.status || ''] || r.status || '',
      'Ubicazione': r.warehouseLocation || '',
      'Costo Acquisto': r.purchaseCost ? parseFloat(r.purchaseCost).toFixed(2) : '',
      'Data Registrazione': r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : ''
    }));

    // Return based on format
    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-serialized-export.json"');
      return res.json({ success: true, data: exportData, count: exportData.length });
    }

    if (format === 'csv' || format === 'excel') {
      if (exportData.length === 0) {
        const emptyHeaders = ['Negozio', 'Codice Negozio', 'Prodotto', 'SKU', 'Brand', 'Modello', 'Tipo', 'Categoria', 'IMEI/Seriale', 'Tipo Seriale', 'Stato', 'Ubicazione', 'Costo Acquisto', 'Data Registrazione'];
        const csvContent = emptyHeaders.join(';');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory-serialized-export.csv"');
        return res.send('\uFEFF' + csvContent);
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(';'),
        ...exportData.map(row => headers.map(h => `"${String(row[h as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(';'))
      ];
      
      const csvContent = csvRows.join('\n');
      const filename = format === 'excel' ? 'inventory-serialized-export.xlsx' : 'inventory-serialized-export.csv';
      
      res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Add BOM for Excel to recognize UTF-8
      return res.send('\uFEFF' + csvContent);
    }

    res.status(400).json({ error: 'Invalid export format' });

  } catch (error) {
    console.error("Error exporting inventory:", error);
    res.status(500).json({ 
      error: "Failed to export inventory",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/inventory-view/:productId/:storeId/serials
 * 
 * Get list of serials/IMEIs for a specific product-store combination.
 * Used for HoverCard preview in the inventory view.
 * 
 * @permission wms.stock.read
 * @param productId - Product ID
 * @param storeId - Store ID
 * @query limit - Max serials to return (default 10)
 */
router.get("/inventory-view/:productId/:storeId/serials", async (req: Request, res: Response) => {
  try {
    const sessionTenantId = (req as any).tenantId;
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const { productId, storeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get product info
    const [product] = await db
      .select({
        id: products.id,
        nome: products.nome,
        sku: products.sku,
        brand: products.brand,
        model: products.model,
        productType: products.productType,
        description: products.description
      })
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.tenantId, sessionTenantId)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get store info
    const [store] = await db
      .select({
        id: stores.id,
        nome: stores.nome,
        code: stores.code
      })
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.tenantId, sessionTenantId)
      ))
      .limit(1);

    // Get serials for this product-store
    const serials = await db
      .select({
        itemId: productItems.id,
        status: productItems.logisticStatus,
        warehouseLocation: productItems.warehouseLocation,
        createdAt: productItems.createdAt,
        serialValue: productSerials.serialValue,
        serialType: productSerials.serialType
      })
      .from(productItems)
      .leftJoin(productSerials, and(
        eq(productSerials.productItemId, productItems.id),
        eq(productSerials.tenantId, sessionTenantId)
      ))
      .where(and(
        eq(productItems.tenantId, sessionTenantId),
        eq(productItems.productId, productId),
        eq(productItems.storeId, storeId)
      ))
      .orderBy(productItems.createdAt)
      .limit(limit);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productItems)
      .where(and(
        eq(productItems.tenantId, sessionTenantId),
        eq(productItems.productId, productId),
        eq(productItems.storeId, storeId)
      ));

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.nome,
          sku: product.sku,
          brand: product.brand,
          model: product.model,
          type: product.productType,
          description: product.description
        },
        store: store ? {
          id: store.id,
          name: store.nome,
          code: store.code
        } : null,
        serials: serials.map(s => ({
          itemId: s.itemId,
          serial: s.serialValue || null,
          type: s.serialType || null,
          status: s.status,
          location: s.warehouseLocation,
          registeredAt: s.createdAt
        })),
        totalCount: countResult?.count || 0,
        shownCount: serials.length
      }
    });

  } catch (error) {
    console.error("Error fetching product serials:", error);
    res.status(500).json({ 
      error: "Failed to fetch product serials",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/inventory-view/:productId/cross-store-summary
 * 
 * Cross-store aggregated inventory summary for a specific product.
 * Returns complete product info, KPIs, store distribution, status distributions.
 * Used by the aggregated inventory modal.
 * 
 * @permission wms.stock.read
 * @param productId - Product ID
 */
router.get("/inventory-view/:productIdOrSku/cross-store-summary", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const { productIdOrSku } = req.params;

    // 1. Get complete product information (by ID or SKU)
    // Products table uses varchar ID (e.g., PROD-APL-I16P-256-TIT), not UUID
    // Try to find by ID first, then by SKU
    // Note: products schema uses name/type/isSerializable (not nome/productType/isSerialized)
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        brand: products.brand,
        model: products.model,
        ean: products.ean,
        productType: products.type,
        description: products.description,
        condition: products.condition,
        isSerialized: products.isSerializable,
        serialType: products.serialType,
        memory: products.memory,
        color: products.color,
        isActive: products.isActive,
        categoryId: products.categoryId,
        typeId: products.typeId,
        imageUrl: products.imageUrl,
        reorderPoint: products.reorderPoint
      })
      .from(products)
      .where(and(
        or(eq(products.id, productIdOrSku), eq(products.sku, productIdOrSku)),
        eq(products.tenantId, sessionTenantId)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Use the resolved product ID for all subsequent queries
    const productId = product.id;

    // Get category and type names
    let categoryName = null;
    let typeName = null;
    
    if (product.categoryId) {
      const [category] = await db
        .select({ nome: wmsCategories.nome })
        .from(wmsCategories)
        .where(eq(wmsCategories.id, product.categoryId))
        .limit(1);
      categoryName = category?.nome || null;
    }
    
    if (product.typeId) {
      const [pType] = await db
        .select({ nome: wmsProductTypes.nome })
        .from(wmsProductTypes)
        .where(eq(wmsProductTypes.id, product.typeId))
        .limit(1);
      typeName = pType?.nome || null;
    }

    // 2. Get store distribution with aggregated quantities from product_items
    // CRITICAL: Use product_items logistic status as source of truth (same as data table)
    // AVAILABLE (sellable inventory): in_stock, customer_return, doa_return
    // RESERVED (committed/outbound): reserved, preparing, shipping, in_transfer
    const AVAILABLE_STATUSES = ['in_stock', 'customer_return', 'doa_return'];
    const RESERVED_STATUSES = ['reserved', 'preparing', 'shipping', 'in_transfer'];
    
    // Get logistic status counts per store
    const storeLogisticCounts = await db
      .select({
        storeId: productItems.storeId,
        storeName: stores.nome,
        storeCode: stores.code,
        logisticStatus: productItems.logisticStatus,
        count: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`SUM(COALESCE(${productItems.lastPurchaseCost}, 0))::numeric`
      })
      .from(productItems)
      .innerJoin(stores, eq(productItems.storeId, stores.id))
      .where(and(
        eq(productItems.tenantId, sessionTenantId),
        eq(productItems.productId, productId)
      ))
      .groupBy(productItems.storeId, stores.nome, stores.code, productItems.logisticStatus);
    
    // Aggregate by store
    const storeAggregates = new Map<string, {
      storeId: string;
      storeName: string;
      storeCode: string;
      available: number;
      reserved: number;
      totalCost: number;
    }>();
    
    storeLogisticCounts.forEach(row => {
      if (!storeAggregates.has(row.storeId)) {
        storeAggregates.set(row.storeId, {
          storeId: row.storeId,
          storeName: row.storeName || '',
          storeCode: row.storeCode || '',
          available: 0,
          reserved: 0,
          totalCost: 0
        });
      }
      const agg = storeAggregates.get(row.storeId)!;
      if (AVAILABLE_STATUSES.includes(row.logisticStatus)) {
        agg.available += row.count;
      } else if (RESERVED_STATUSES.includes(row.logisticStatus)) {
        agg.reserved += row.count;
      }
      agg.totalCost += parseFloat(String(row.totalCost || 0));
    });
    
    const storeDistributionRaw = [...storeAggregates.values()].map(agg => {
      const quantity = agg.available + agg.reserved;
      return {
        storeId: agg.storeId,
        storeName: agg.storeName,
        storeCode: agg.storeCode,
        quantity,
        reserved: agg.reserved,
        available: agg.available,
        value: agg.totalCost,
        avgCost: quantity > 0 ? agg.totalCost / quantity : 0
      };
    }).sort((a, b) => b.quantity - a.quantity);

    // 3. Calculate KPIs from product_items (consistent with data table)
    const totalQuantity = storeDistributionRaw.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalReserved = storeDistributionRaw.reduce((sum, s) => sum + (s.reserved || 0), 0);
    const totalAvailable = storeDistributionRaw.reduce((sum, s) => sum + (s.available || 0), 0);
    const totalValue = storeDistributionRaw.reduce((sum, s) => sum + (s.value || 0), 0);
    
    // Weighted average cost calculation
    const weightedAverageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    // 4. Get logistic status distribution from product_items
    const logisticStatusRaw = await db
      .select({
        status: productItems.logisticStatus,
        count: sql<number>`COUNT(*)::int`
      })
      .from(productItems)
      .where(and(
        eq(productItems.tenantId, sessionTenantId),
        eq(productItems.productId, productId)
      ))
      .groupBy(productItems.logisticStatus)
      .orderBy(desc(sql`COUNT(*)`));

    const totalLogisticItems = logisticStatusRaw.reduce((sum, s) => sum + (s.count || 0), 0);

    const logisticStatusLabels: Record<string, string> = {
      in_stock: 'In Giacenza',
      reserved: 'Prenotato',
      preparing: 'In Preparazione',
      shipping: 'DDT/In Spedizione',
      delivered: 'Consegnato',
      customer_return: 'Reso Cliente',
      doa_return: 'Reso DOA',
      in_service: 'In Assistenza',
      supplier_return: 'Restituito Fornitore',
      in_transfer: 'In Trasferimento',
      lost: 'Smarrito',
      damaged: 'Danneggiato/Dismesso',
      internal_use: 'AD Uso Interno'
    };

    const logisticStatusDistribution = logisticStatusRaw.map(s => ({
      status: s.status,
      label: logisticStatusLabels[s.status] || s.status,
      count: s.count || 0,
      percentage: totalLogisticItems > 0 ? Math.round(((s.count || 0) / totalLogisticItems) * 100) : 0
    }));

    // 5. Calculate stock status distribution
    // Note: products uses reorderPoint (not lowStockThreshold)
    const stockStatusDistributionRaw = await db
      .select({
        storeId: wmsInventoryBalances.storeId,
        quantity: wmsInventoryBalances.quantityAvailable,
        reorderPoint: products.reorderPoint
      })
      .from(wmsInventoryBalances)
      .innerJoin(products, eq(wmsInventoryBalances.productId, products.id))
      .where(and(
        eq(wmsInventoryBalances.tenantId, sessionTenantId),
        eq(wmsInventoryBalances.productId, productId)
      ));

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    stockStatusDistributionRaw.forEach(row => {
      const qty = row.quantity || 0;
      const threshold = row.reorderPoint || 5;
      
      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= threshold) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    });

    const totalStockEntries = inStockCount + lowStockCount + outOfStockCount;
    
    const stockStatusDistribution = [
      { 
        status: 'in_stock', 
        label: 'Disponibile', 
        count: inStockCount, 
        percentage: totalStockEntries > 0 ? Math.round((inStockCount / totalStockEntries) * 100) : 0 
      },
      { 
        status: 'low_stock', 
        label: 'Sotto Scorta', 
        count: lowStockCount, 
        percentage: totalStockEntries > 0 ? Math.round((lowStockCount / totalStockEntries) * 100) : 0 
      },
      { 
        status: 'out_of_stock', 
        label: 'Esaurito', 
        count: outOfStockCount, 
        percentage: totalStockEntries > 0 ? Math.round((outOfStockCount / totalStockEntries) * 100) : 0 
      }
    ].filter(s => s.count > 0);

    // 6. Get last movement
    const [lastMovement] = await db
      .select({
        id: wmsStockMovements.id,
        movementType: wmsStockMovements.movementType,
        occurredAt: wmsStockMovements.occurredAt,
        storeId: wmsStockMovements.storeId,
        storeName: stores.nome
      })
      .from(wmsStockMovements)
      .leftJoin(stores, eq(wmsStockMovements.storeId, stores.id))
      .where(and(
        eq(wmsStockMovements.tenantId, sessionTenantId),
        eq(wmsStockMovements.productId, productId)
      ))
      .orderBy(desc(wmsStockMovements.occurredAt))
      .limit(1);

    // 7. Get serial count if serializable
    let serialCount = 0;
    if (product.isSerialized) {
      const [serialResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(productSerials)
        .innerJoin(productItems, eq(productSerials.productItemId, productItems.id))
        .where(and(
          eq(productItems.tenantId, sessionTenantId),
          eq(productItems.productId, productId)
        ));
      serialCount = serialResult?.count || 0;
    }

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          model: product.model,
          ean: product.ean,
          productType: product.productType,
          description: product.description,
          condition: product.condition,
          isSerialized: product.isSerialized,
          serialType: product.serialType,
          memory: product.memory,
          color: product.color,
          categoryName,
          typeName,
          imageUrl: product.imageUrl,
          reorderPoint: product.reorderPoint || 0,
          isActive: product.isActive
        },
        kpis: {
          totalQuantity,
          totalReserved,
          totalAvailable,
          totalValue: parseFloat(totalValue.toFixed(2)),
          weightedAverageCost: parseFloat(weightedAverageCost.toFixed(2)),
          storeCount: storeDistributionRaw.length,
          serialCount
        },
        storeDistribution: storeDistributionRaw.map(s => ({
          storeId: s.storeId,
          storeName: s.storeName,
          storeCode: s.storeCode,
          quantity: s.quantity || 0,
          reserved: s.reserved || 0,
          available: s.available || 0,
          value: parseFloat(String(s.value || 0)).toFixed(2),
          averageCost: parseFloat(String(s.avgCost || 0)).toFixed(2)
        })),
        logisticStatusDistribution,
        stockStatusDistribution,
        lastMovement: lastMovement ? {
          id: lastMovement.id,
          type: lastMovement.movementType,
          date: lastMovement.occurredAt,
          storeId: lastMovement.storeId,
          storeName: lastMovement.storeName
        } : null
      }
    });

  } catch (error) {
    console.error("Error fetching cross-store summary:", error);
    res.status(500).json({ 
      error: "Failed to fetch cross-store summary",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/products/brands
 * 
 * Returns distinct brand names from products with inventory.
 * Used for brand filter dropdown in inventory dashboard.
 * 
 * @permission wms.stock.read
 */
router.get("/products/brands", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    // Get distinct brands from products that have inventory balances
    const brandResults = await db
      .selectDistinct({ brand: products.brand })
      .from(products)
      .innerJoin(wmsInventoryBalances, and(
        eq(products.id, wmsInventoryBalances.productId),
        eq(wmsInventoryBalances.tenantId, sessionTenantId)
      ))
      .where(and(
        eq(products.tenantId, sessionTenantId),
        isNotNull(products.brand),
        sql`${products.brand} != ''`
      ))
      .orderBy(products.brand);

    const brands = brandResults
      .map(r => r.brand)
      .filter((b): b is string => b !== null && b !== '');

    res.json({ brands });

  } catch (error) {
    console.error("Error fetching product brands:", error);
    res.status(500).json({ 
      error: "Failed to fetch product brands",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ============================================================================
// WMS Movement Type Configuration API
// ============================================================================

/**
 * GET /api/wms/movement-type-configs
 * 
 * Get all movement type configurations for tenant.
 * Returns default configurations if none exist in database.
 * 
 * @permission wms.settings.read
 */
router.get("/movement-type-configs", rbacMiddleware, requirePermission('wms.settings.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    // Query movement type configs from database
    const configs = await db.execute(sql`
      SELECT 
        id,
        tenant_id,
        movement_type,
        movement_direction,
        label_it,
        description,
        icon,
        color,
        is_enabled,
        requires_approval,
        workflow_template_id,
        required_documents,
        display_order,
        created_at,
        updated_at
      FROM w3suite.wms_movement_type_config
      WHERE tenant_id = ${sessionTenantId}
      ORDER BY display_order ASC
    `);

    res.json(configs.rows || []);

  } catch (error) {
    console.error("Error fetching movement type configs:", error);
    res.status(500).json({ 
      error: "Failed to fetch movement type configs",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/movement-type-configs/bulk
 * 
 * Bulk upsert movement type configurations for tenant.
 * Creates or updates all provided configs in a single transaction.
 * 
 * @permission wms.settings.write
 */
router.post("/movement-type-configs/bulk", rbacMiddleware, requirePermission('wms.settings.write'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const { configs } = req.body;
    
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: "configs array is required" });
    }

    // Upsert each config
    const results = [];
    for (const config of configs) {
      // Prepare ID - use existing or generate new
      const configId = (config.id && !config.id.startsWith('temp-')) ? config.id : null;
      const movementType = config.movement_type || null;
      const movementDirection = config.movement_direction || null;
      const labelIt = config.label_it || null;
      const description = config.description || null;
      const icon = config.icon || null;
      const color = config.color || null;
      const isEnabled = config.is_enabled ?? true;
      const requiresApproval = config.requires_approval ?? false;
      const workflowTemplateId = config.workflow_template_id || null;
      const requiredDocuments = JSON.stringify(config.required_documents || []);
      const displayOrder = config.display_order ?? 0;
      const userIdVal = userId || null;
      
      const result = await db.execute(sql`
        INSERT INTO w3suite.wms_movement_type_config (
          id,
          tenant_id,
          movement_type,
          movement_direction,
          label_it,
          description,
          icon,
          color,
          is_enabled,
          requires_approval,
          workflow_template_id,
          required_documents,
          display_order,
          created_by,
          updated_by,
          updated_at
        ) VALUES (
          COALESCE(${configId}::uuid, gen_random_uuid()),
          ${sessionTenantId}::uuid,
          ${movementType}::w3suite.stock_movement_type,
          ${movementDirection},
          ${labelIt},
          ${description},
          ${icon},
          ${color},
          ${isEnabled},
          ${requiresApproval},
          ${workflowTemplateId}::uuid,
          ${requiredDocuments}::jsonb,
          ${displayOrder},
          ${userIdVal},
          ${userIdVal},
          NOW()
        )
        ON CONFLICT (tenant_id, movement_type) DO UPDATE SET
          movement_direction = EXCLUDED.movement_direction,
          label_it = EXCLUDED.label_it,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          color = EXCLUDED.color,
          is_enabled = EXCLUDED.is_enabled,
          requires_approval = EXCLUDED.requires_approval,
          workflow_template_id = EXCLUDED.workflow_template_id,
          required_documents = EXCLUDED.required_documents,
          display_order = EXCLUDED.display_order,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING *
      `);
      results.push(result.rows?.[0]);
    }

    res.json({ 
      success: true, 
      message: `${results.length} configurations saved`,
      data: results.filter(Boolean)
    });

  } catch (error) {
    console.error("Error saving movement type configs:", error);
    res.status(500).json({ 
      error: "Failed to save movement type configs",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PATCH /api/wms/movement-type-configs/:movementType
 * 
 * Update a single movement type configuration.
 * 
 * @permission wms.settings.write
 */
router.patch("/movement-type-configs/:movementType", rbacMiddleware, requirePermission('wms.settings.write'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { movementType } = req.params;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const updates = req.body;
    
    // First get the current config
    const current = await db.execute(sql`
      SELECT * FROM w3suite.wms_movement_type_config 
      WHERE tenant_id = ${sessionTenantId}::uuid 
        AND movement_type = ${movementType}::w3suite.stock_movement_type
    `);
    
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    
    const existing = current.rows[0] as any;
    
    // Merge updates with existing values
    const isEnabled = 'is_enabled' in updates ? updates.is_enabled : existing.is_enabled;
    const requiresApproval = 'requires_approval' in updates ? updates.requires_approval : existing.requires_approval;
    const workflowTemplateId = 'workflow_template_id' in updates ? (updates.workflow_template_id || null) : existing.workflow_template_id;
    const description = 'description' in updates ? updates.description : existing.description;
    const requiredDocs = 'required_documents' in updates ? JSON.stringify(updates.required_documents) : JSON.stringify(existing.required_documents || []);
    
    const result = await db.execute(sql`
      UPDATE w3suite.wms_movement_type_config 
      SET 
        is_enabled = ${isEnabled},
        requires_approval = ${requiresApproval},
        workflow_template_id = ${workflowTemplateId}::uuid,
        description = ${description},
        required_documents = ${requiredDocs}::jsonb,
        updated_by = ${userId},
        updated_at = NOW()
      WHERE tenant_id = ${sessionTenantId}::uuid 
        AND movement_type = ${movementType}::w3suite.stock_movement_type
      RETURNING *
    `);

    res.json({ success: true, data: result.rows?.[0] });

  } catch (error) {
    console.error("Error updating movement type config:", error);
    res.status(500).json({ 
      error: "Failed to update movement type config",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ============================================================
// MOVEMENT APPROVAL/REJECTION ENDPOINTS
// ============================================================

/**
 * POST /api/wms/stock-movements/:id/approve
 * 
 * Approves a stock movement that requires authorization.
 * Updates inventory after approval.
 * 
 * @permission wms.movements.approve
 */
router.post("/stock-movements/:id/approve", rbacMiddleware, requirePermission('wms.movements.approve'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const approverId = req.user?.id;
    const { id: movementId } = req.params;
    const { notes } = req.body;
    
    if (!sessionTenantId || !approverId) {
      return res.status(401).json({ error: "Unauthorized: tenant or user not identified" });
    }

    const result = await wmsWorkflowService.approveMovement(
      movementId,
      approverId,
      sessionTenantId,
      notes || undefined
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    logger.info('✅ WMS stock movement approved', {
      tenantId: sessionTenantId,
      movementId,
      approverId
    });

    res.json({ 
      success: true, 
      message: result.message,
      data: result.movement
    });

  } catch (error) {
    console.error("Error approving stock movement:", error);
    res.status(500).json({ 
      error: "Failed to approve stock movement",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/stock-movements/:id/reject
 * 
 * Rejects a stock movement that requires authorization.
 * Does NOT update inventory - movement remains rejected.
 * 
 * @permission wms.movements.approve
 */
router.post("/stock-movements/:id/reject", rbacMiddleware, requirePermission('wms.movements.approve'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const rejecterId = req.user?.id;
    const { id: movementId } = req.params;
    const { reason } = req.body;
    
    if (!sessionTenantId || !rejecterId) {
      return res.status(401).json({ error: "Unauthorized: tenant or user not identified" });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "Reason is required for rejection" });
    }

    const result = await wmsWorkflowService.rejectMovement(
      movementId,
      rejecterId,
      sessionTenantId,
      reason.trim()
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    logger.info('❌ WMS stock movement rejected', {
      tenantId: sessionTenantId,
      movementId,
      rejecterId,
      reason: reason.trim()
    });

    res.json({ 
      success: true, 
      message: result.message,
      data: result.movement
    });

  } catch (error) {
    console.error("Error rejecting stock movement:", error);
    res.status(500).json({ 
      error: "Failed to reject stock movement",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/stock-movements/pending-approval
 * 
 * Gets all stock movements pending approval for the current tenant.
 * 
 * @permission wms.movements.read
 */
router.get("/stock-movements/pending-approval", rbacMiddleware, requirePermission('wms.movements.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const storeId = req.query.storeId as string | undefined;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    let query = sql`
      SELECT 
        m.*,
        p.name as product_name,
        p.sku as product_sku,
        s.name as store_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM w3suite.wms_stock_movements m
      LEFT JOIN w3suite.products p ON m.product_id = p.id
      LEFT JOIN w3suite.stores s ON m.store_id = s.id
      LEFT JOIN w3suite.users u ON m.created_by = u.id
      WHERE m.tenant_id = ${sessionTenantId}::uuid
        AND m.movement_status = 'pending_approval'
    `;

    if (storeId) {
      query = sql`${query} AND m.store_id = ${storeId}::uuid`;
    }

    query = sql`${query} ORDER BY m.created_at DESC`;

    const result = await db.execute(query);

    res.json({ 
      success: true, 
      data: result.rows || [],
      count: result.rows?.length || 0
    });

  } catch (error) {
    console.error("Error fetching pending approval movements:", error);
    res.status(500).json({ 
      error: "Failed to fetch pending approval movements",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/workflow-templates
 * 
 * Gets all workflow templates available for WMS movements.
 * Only returns active templates with category 'wms' or 'approval'.
 * 
 * @permission wms.settings.read
 */
router.get("/workflow-templates", rbacMiddleware, requirePermission('wms.settings.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const templates = await db.execute(sql`
      SELECT 
        id,
        name,
        description,
        category,
        is_active
      FROM w3suite.workflow_templates
      WHERE tenant_id = ${sessionTenantId}::uuid
        AND is_active = true
        AND (category = 'wms' OR category = 'approval' OR category IS NULL)
      ORDER BY name ASC
    `);

    res.json({ 
      success: true, 
      data: templates.rows || []
    });

  } catch (error) {
    console.error("Error fetching workflow templates:", error);
    res.status(500).json({ 
      error: "Failed to fetch workflow templates",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== WMS INVENTORY SNAPSHOTS ====================

import { wmsSnapshotService } from "../services/wms-snapshot.service";

/**
 * GET /api/wms/snapshots
 * 
 * Query historical inventory snapshots with filters.
 * Snapshots are created automatically at 12:00 and 23:00 Europe/Rome.
 * 
 * Query params:
 * - storeId: filter by store
 * - productId: filter by product
 * - dateFrom: start date (ISO string)
 * - dateTo: end date (ISO string)
 * - limit: max records (default 100)
 * - offset: pagination offset
 * 
 * @permission wms.inventory.read
 */
router.get("/snapshots", rbacMiddleware, requirePermission('wms.inventory.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const { storeId, productId, dateFrom, dateTo, limit, offset } = req.query;

    const result = await wmsSnapshotService.querySnapshots({
      tenantId: sessionTenantId,
      storeId: storeId as string | undefined,
      productId: productId as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({ 
      success: true, 
      ...result
    });

  } catch (error) {
    console.error("Error fetching inventory snapshots:", error);
    res.status(500).json({ 
      error: "Failed to fetch inventory snapshots",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/snapshots/delta
 * 
 * Calculate inventory delta between two dates.
 * Returns quantity and value changes for each product/store combination.
 * 
 * Query params (required):
 * - dateFrom: start date (ISO string)
 * - dateTo: end date (ISO string)
 * 
 * Query params (optional):
 * - storeId: filter by store
 * - productId: filter by product
 * 
 * @permission wms.inventory.read
 */
router.get("/snapshots/delta", rbacMiddleware, requirePermission('wms.inventory.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const { storeId, productId, dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ 
        error: "Validation failed",
        message: "dateFrom and dateTo are required"
      });
    }

    const result = await wmsSnapshotService.calculateDelta({
      tenantId: sessionTenantId,
      storeId: storeId as string | undefined,
      productId: productId as string | undefined,
      dateFrom: new Date(dateFrom as string),
      dateTo: new Date(dateTo as string)
    });

    res.json({ 
      success: true, 
      data: result,
      count: result.length,
      dateFrom,
      dateTo
    });

  } catch (error) {
    console.error("Error calculating snapshot delta:", error);
    res.status(500).json({ 
      error: "Failed to calculate snapshot delta",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/snapshots/trigger
 * 
 * Manually trigger a snapshot creation for the current tenant.
 * Useful for testing or immediate snapshot needs.
 * 
 * @permission wms.settings.write
 */
router.post("/snapshots/trigger", rbacMiddleware, requirePermission('wms.settings.write'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    logger.info('📸 [WMS-SNAPSHOT] Manual trigger via API', { 
      tenantId: sessionTenantId,
      userId: req.user?.id 
    });

    const result = await wmsSnapshotService.triggerManualSnapshot(sessionTenantId);

    res.json({ 
      success: true, 
      message: `Snapshot created: ${result.snapshotsCreated} records`,
      ...result
    });

  } catch (error) {
    console.error("Error triggering manual snapshot:", error);
    res.status(500).json({ 
      error: "Failed to trigger manual snapshot",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/drivers
 * 
 * Returns all drivers for the current tenant (including brand drivers).
 * Follows brand-tenant union pattern:
 * - Brand drivers from brand tenant (00000000-0000-0000-0000-000000000000)
 * - Tenant-specific drivers from current tenant
 * 
 * @returns { data: [{ id, name, code, source, allowedProductTypes, ... }] }
 */
router.get("/drivers", rbacMiddleware, requirePermission('wms.products.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const BRAND_TENANT_ID = '00000000-0000-0000-0000-000000000000';

    // Get all drivers (brand + tenant union) ordered by sortOrder
    const driversResult = await db
      .select({
        id: drivers.id,
        name: drivers.name,
        code: drivers.code,
        description: drivers.description,
        icon: drivers.icon,
        allowedProductTypes: drivers.allowedProductTypes,
        source: drivers.source,
        sortOrder: drivers.sortOrder,
        isActive: drivers.isActive,
        tenantId: drivers.tenantId
      })
      .from(drivers)
      .where(
        and(
          eq(drivers.isActive, true),
          or(
            eq(drivers.tenantId, BRAND_TENANT_ID),
            eq(drivers.tenantId, sessionTenantId)
          )
        )
      )
      .orderBy(drivers.sortOrder);

    res.json({ 
      success: true, 
      data: driversResult,
      count: driversResult.length
    });

  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ 
      error: "Failed to fetch drivers",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/drivers/:driverId/hierarchy
 * 
 * Returns the category→typology hierarchy derived from driver's allowed_product_types.
 * Uses logical JOIN (no mapping table) based on:
 * - Driver.allowed_product_types → Categories.product_type → Typologies.category_id
 * 
 * Follows brand-tenant union pattern:
 * - Brand categories/typologies from brand tenant (00000000-0000-0000-0000-000000000000)
 * - Tenant-specific categories/typologies from current tenant
 * 
 * @param driverId - UUID of the driver
 * @returns { categories: [{ id, name, productType, typologies: [...] }] }
 */
router.get("/drivers/:driverId/hierarchy", rbacMiddleware, requirePermission('wms.products.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const { driverId } = req.params;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    if (!driverId) {
      return res.status(400).json({ error: "Driver ID is required" });
    }

    const BRAND_TENANT_ID = '00000000-0000-0000-0000-000000000000';

    // 1. Get driver with allowed_product_types (from brand tenant OR current tenant)
    const driverResult = await db
      .select({
        id: drivers.id,
        name: drivers.name,
        code: drivers.code,
        allowedProductTypes: drivers.allowedProductTypes,
        source: drivers.source
      })
      .from(drivers)
      .where(
        and(
          eq(drivers.id, driverId),
          or(
            eq(drivers.tenantId, BRAND_TENANT_ID),
            eq(drivers.tenantId, sessionTenantId)
          )
        )
      )
      .limit(1);

    if (driverResult.length === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const driver = driverResult[0];
    const productTypes = driver.allowedProductTypes || [];

    if (productTypes.length === 0) {
      return res.json({
        success: true,
        data: {
          driver: {
            id: driver.id,
            name: driver.name,
            code: driver.code,
            source: driver.source
          },
          categories: []
        }
      });
    }

    // 2. Get categories matching driver's product types (brand + tenant union)
    const categoriesResult = await db
      .select({
        id: wmsCategories.id,
        nome: wmsCategories.nome,
        descrizione: wmsCategories.descrizione,
        icona: wmsCategories.icona,
        productType: wmsCategories.productType,
        ordine: wmsCategories.ordine,
        source: wmsCategories.source,
        tenantId: wmsCategories.tenantId
      })
      .from(wmsCategories)
      .where(
        and(
          inArray(wmsCategories.productType, productTypes as any),
          eq(wmsCategories.isActive, true),
          or(
            eq(wmsCategories.tenantId, BRAND_TENANT_ID),
            eq(wmsCategories.tenantId, sessionTenantId)
          )
        )
      )
      .orderBy(wmsCategories.ordine);

    // 3. Get typologies for all categories (brand + tenant union)
    const categoryIds = categoriesResult.map(c => c.id);
    
    let typologiesResult: any[] = [];
    if (categoryIds.length > 0) {
      typologiesResult = await db
        .select({
          id: wmsProductTypes.id,
          nome: wmsProductTypes.nome,
          descrizione: wmsProductTypes.descrizione,
          categoryId: wmsProductTypes.categoryId,
          ordine: wmsProductTypes.ordine,
          source: wmsProductTypes.source,
          tenantId: wmsProductTypes.tenantId
        })
        .from(wmsProductTypes)
        .where(
          and(
            inArray(wmsProductTypes.categoryId, categoryIds),
            eq(wmsProductTypes.isActive, true),
            or(
              eq(wmsProductTypes.tenantId, BRAND_TENANT_ID),
              eq(wmsProductTypes.tenantId, sessionTenantId)
            )
          )
        )
        .orderBy(wmsProductTypes.ordine);
    }

    // 4. Build hierarchy with precedence (tenant overrides brand by name)
    const typologiesByCategory = new Map<string, any[]>();
    for (const typ of typologiesResult) {
      const list = typologiesByCategory.get(typ.categoryId) || [];
      list.push({
        id: typ.id,
        name: typ.nome,
        description: typ.descrizione,
        order: typ.ordine,
        source: typ.source
      });
      typologiesByCategory.set(typ.categoryId, list);
    }

    // Apply precedence: tenant categories shadow brand categories with same name
    const categoryMap = new Map<string, any>();
    for (const cat of categoriesResult) {
      const key = `${cat.productType}-${cat.nome}`;
      const existing = categoryMap.get(key);
      // Tenant overrides brand
      if (!existing || cat.source === 'tenant') {
        categoryMap.set(key, {
          id: cat.id,
          name: cat.nome,
          description: cat.descrizione,
          icon: cat.icona,
          productType: cat.productType,
          order: cat.ordine,
          source: cat.source,
          typologies: typologiesByCategory.get(cat.id) || []
        });
      }
    }

    const categories = Array.from(categoryMap.values())
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          name: driver.name,
          code: driver.code,
          source: driver.source,
          allowedProductTypes: productTypes
        },
        categories,
        meta: {
          totalCategories: categories.length,
          totalTypologies: categories.reduce((sum, c) => sum + c.typologies.length, 0)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching driver hierarchy:", error);
    res.status(500).json({ 
      error: "Failed to fetch driver hierarchy",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/categories-hierarchy
 * 
 * Returns all categories with their typologies, grouped by product_type.
 * Follows brand-tenant union pattern.
 * 
 * @query productTypes - Optional comma-separated filter (e.g., "PHYSICAL,SERVICE")
 * @returns { hierarchy: { PHYSICAL: [...], SERVICE: [...], ... } }
 */
router.get("/categories-hierarchy", rbacMiddleware, requirePermission('wms.products.read'), async (req: Request, res: Response) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const productTypesParam = req.query.productTypes as string | undefined;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Unauthorized: tenant not identified" });
    }

    const BRAND_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    
    // Parse optional filter
    const productTypeFilter = productTypesParam 
      ? productTypesParam.split(',').map(t => t.trim().toUpperCase())
      : null;

    // Get categories (brand + tenant)
    let categoriesQuery = db
      .select({
        id: wmsCategories.id,
        nome: wmsCategories.nome,
        descrizione: wmsCategories.descrizione,
        icona: wmsCategories.icona,
        productType: wmsCategories.productType,
        ordine: wmsCategories.ordine,
        source: wmsCategories.source
      })
      .from(wmsCategories)
      .where(
        and(
          eq(wmsCategories.isActive, true),
          or(
            eq(wmsCategories.tenantId, BRAND_TENANT_ID),
            eq(wmsCategories.tenantId, sessionTenantId)
          ),
          productTypeFilter ? inArray(wmsCategories.productType, productTypeFilter as any) : undefined
        )
      )
      .orderBy(wmsCategories.productType, wmsCategories.ordine);

    const categoriesResult = await categoriesQuery;
    const categoryIds = categoriesResult.map(c => c.id);

    // Get typologies
    let typologiesResult: any[] = [];
    if (categoryIds.length > 0) {
      typologiesResult = await db
        .select({
          id: wmsProductTypes.id,
          nome: wmsProductTypes.nome,
          descrizione: wmsProductTypes.descrizione,
          categoryId: wmsProductTypes.categoryId,
          ordine: wmsProductTypes.ordine,
          source: wmsProductTypes.source
        })
        .from(wmsProductTypes)
        .where(
          and(
            inArray(wmsProductTypes.categoryId, categoryIds),
            eq(wmsProductTypes.isActive, true),
            or(
              eq(wmsProductTypes.tenantId, BRAND_TENANT_ID),
              eq(wmsProductTypes.tenantId, sessionTenantId)
            )
          )
        )
        .orderBy(wmsProductTypes.ordine);
    }

    // Build hierarchy grouped by product_type
    const typologiesByCategory = new Map<string, any[]>();
    for (const typ of typologiesResult) {
      const list = typologiesByCategory.get(typ.categoryId) || [];
      list.push({
        id: typ.id,
        name: typ.nome,
        description: typ.descrizione,
        order: typ.ordine,
        source: typ.source
      });
      typologiesByCategory.set(typ.categoryId, list);
    }

    const hierarchy: Record<string, any[]> = {};
    for (const cat of categoriesResult) {
      const productType = cat.productType || 'UNKNOWN';
      if (!hierarchy[productType]) {
        hierarchy[productType] = [];
      }
      hierarchy[productType].push({
        id: cat.id,
        name: cat.nome,
        description: cat.descrizione,
        icon: cat.icona,
        order: cat.ordine,
        source: cat.source,
        typologies: typologiesByCategory.get(cat.id) || []
      });
    }

    res.json({
      success: true,
      data: {
        hierarchy,
        meta: {
          productTypes: Object.keys(hierarchy),
          totalCategories: categoriesResult.length,
          totalTypologies: typologiesResult.length
        }
      }
    });

  } catch (error) {
    console.error("Error fetching categories hierarchy:", error);
    res.status(500).json({ 
      error: "Failed to fetch categories hierarchy",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== INVENTORY EVENT LOG (CQRS) ====================

import { inventoryEventLogService } from '../services/inventory-event-log.service';

/**
 * GET /api/wms/inventory-events
 * 
 * Query storica degli eventi di inventario.
 * Ogni cambio di stato logistico o movimento genera un evento immutabile.
 * 
 * @query storeId - Filter by store
 * @query productId - Filter by product
 * @query eventType - Filter by event type
 * @query serialNumber - Filter by serial (IMEI, ICCID, etc.)
 * @query dateFrom - ISO date from
 * @query dateTo - ISO date to
 * @query limit - Max results (default 100)
 * @query offset - Pagination offset
 */
router.get('/inventory-events', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-tenant-id header'
      });
    }

    const {
      storeId,
      productId,
      eventType,
      serialNumber,
      dateFrom,
      dateTo,
      limit = '100',
      offset = '0'
    } = req.query;

    const events = await inventoryEventLogService.queryEvents({
      tenantId,
      storeId: storeId as string | undefined,
      productId: productId as string | undefined,
      eventType: eventType as any,
      serialNumber: serialNumber as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: events,
      meta: {
        count: events.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error) {
    console.error("Error querying inventory events:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to query inventory events",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/inventory-events/product/:productId
 * 
 * Storico completo di un prodotto con summary.
 * 
 * @param productId - Product ID
 * @query storeId - Optional store filter
 */
router.get('/inventory-events/product/:productId', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-tenant-id header'
      });
    }

    const { productId } = req.params;
    const { storeId } = req.query;

    const history = await inventoryEventLogService.getProductHistory(
      tenantId,
      productId,
      storeId as string | undefined
    );

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error("Error fetching product history:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch product history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/inventory-events/stats
 * 
 * Statistiche eventi per tipo in un periodo.
 * 
 * @query dateFrom - ISO date from (required)
 * @query dateTo - ISO date to (required)
 */
router.get('/inventory-events/stats', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-tenant-id header'
      });
    }

    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        error: 'dateFrom and dateTo are required'
      });
    }

    const stats = await inventoryEventLogService.countEventsByType(
      tenantId,
      new Date(dateFrom as string),
      new Date(dateTo as string)
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error fetching event stats:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch event stats",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== FINANCIAL ENTITIES (Enti Finanziatori) ====================

/**
 * GET /api/wms/financial-entities
 * Get all financial entities for a tenant (brand + tenant-specific)
 */
router.get("/financial-entities", rbacMiddleware, async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get all financial entities: brand-pushed (origin='brand') + tenant-specific
    const entities = await db
      .select()
      .from(financialEntities)
      .where(
        or(
          eq(financialEntities.origin, 'brand'),
          eq(financialEntities.tenantId, sessionTenantId)
        )
      )
      .orderBy(asc(financialEntities.name));

    res.json({
      success: true,
      data: entities
    });

  } catch (error) {
    console.error("Error fetching financial entities:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch financial entities",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/financial-entities/:id
 * Get a single financial entity by ID
 */
router.get("/financial-entities/:id", rbacMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const [entity] = await db
      .select()
      .from(financialEntities)
      .where(eq(financialEntities.id, id));

    if (!entity) {
      return res.status(404).json({ error: "Financial entity not found" });
    }

    // Check access: brand entities are visible to all, tenant entities only to their tenant
    if (entity.origin === 'tenant' && entity.tenantId !== sessionTenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      success: true,
      data: entity
    });

  } catch (error) {
    console.error("Error fetching financial entity:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch financial entity",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/financial-entities
 * Create a new tenant-specific financial entity
 */
router.post("/financial-entities", rbacMiddleware, async (req, res) => {
  try {
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const body = req.body;

    // Validate required fields
    if (!body.code || !body.name) {
      return res.status(400).json({ error: "Code and name are required" });
    }

    // Check if code already exists
    const [existing] = await db
      .select()
      .from(financialEntities)
      .where(eq(financialEntities.code, body.code.toUpperCase()));

    if (existing) {
      return res.status(409).json({ error: "Financial entity code already exists" });
    }

    // Create new entity (always tenant origin for user-created)
    const [newEntity] = await db
      .insert(financialEntities)
      .values({
        origin: 'tenant',
        tenantId: sessionTenantId,
        code: body.code.toUpperCase(),
        name: body.name,
        legalFormId: body.legalFormId || null,
        vatNumber: body.vatNumber || null,
        taxCode: body.taxCode || null,
        sdiCode: body.sdiCode || null,
        pecEmail: body.pecEmail || null,
        bankRegisterNumber: body.bankRegisterNumber || null,
        ivassCode: body.ivassCode || null,
        parentCompany: body.parentCompany || null,
        bankGroupCode: body.bankGroupCode || null,
        capitalStock: body.capitalStock || null,
        registeredAddress: body.registeredAddress || null,
        cityId: body.cityId || null,
        countryId: body.countryId || null,
        email: body.email || null,
        phone: body.phone || null,
        website: body.website || null,
        iban: body.iban || null,
        bic: body.bic || null,
        vatRegimeId: body.vatRegimeId || null,
        paymentMethodId: body.paymentMethodId || null,
        paymentConditionId: body.paymentConditionId || null,
        status: body.status || 'active',
        notes: body.notes || null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newEntity
    });

  } catch (error) {
    console.error("Error creating financial entity:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create financial entity",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PUT /api/wms/financial-entities/:id
 * Update a financial entity (only tenant-specific ones can be fully edited)
 */
router.put("/financial-entities/:id", rbacMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing entity
    const [existing] = await db
      .select()
      .from(financialEntities)
      .where(eq(financialEntities.id, id));

    if (!existing) {
      return res.status(404).json({ error: "Financial entity not found" });
    }

    // Brand entities cannot be modified by tenants
    if (existing.origin === 'brand') {
      return res.status(403).json({ error: "Brand-pushed entities cannot be modified" });
    }

    // Tenant entities can only be modified by their own tenant
    if (existing.tenantId !== sessionTenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const body = req.body;

    // Update entity
    const [updated] = await db
      .update(financialEntities)
      .set({
        name: body.name ?? existing.name,
        legalFormId: body.legalFormId ?? existing.legalFormId,
        vatNumber: body.vatNumber ?? existing.vatNumber,
        taxCode: body.taxCode ?? existing.taxCode,
        sdiCode: body.sdiCode ?? existing.sdiCode,
        pecEmail: body.pecEmail ?? existing.pecEmail,
        bankRegisterNumber: body.bankRegisterNumber ?? existing.bankRegisterNumber,
        ivassCode: body.ivassCode ?? existing.ivassCode,
        parentCompany: body.parentCompany ?? existing.parentCompany,
        bankGroupCode: body.bankGroupCode ?? existing.bankGroupCode,
        capitalStock: body.capitalStock ?? existing.capitalStock,
        registeredAddress: body.registeredAddress ?? existing.registeredAddress,
        cityId: body.cityId ?? existing.cityId,
        countryId: body.countryId ?? existing.countryId,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        website: body.website ?? existing.website,
        iban: body.iban ?? existing.iban,
        bic: body.bic ?? existing.bic,
        vatRegimeId: body.vatRegimeId ?? existing.vatRegimeId,
        paymentMethodId: body.paymentMethodId ?? existing.paymentMethodId,
        paymentConditionId: body.paymentConditionId ?? existing.paymentConditionId,
        status: body.status ?? existing.status,
        notes: body.notes ?? existing.notes,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(financialEntities.id, id))
      .returning();

    res.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error("Error updating financial entity:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update financial entity",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * DELETE /api/wms/financial-entities/:id
 * Delete a tenant-specific financial entity (brand entities cannot be deleted, check dependencies)
 */
router.delete("/financial-entities/:id", rbacMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionTenantId = req.user?.tenantId;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing entity
    const [existing] = await db
      .select()
      .from(financialEntities)
      .where(eq(financialEntities.id, id));

    if (!existing) {
      return res.status(404).json({ error: "Financial entity not found" });
    }

    // Brand entities cannot be deleted by tenants
    if (existing.origin === 'brand') {
      return res.status(403).json({ error: "Brand-pushed entities cannot be deleted" });
    }

    // Tenant entities can only be deleted by their own tenant
    if (existing.tenantId !== sessionTenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check for dependencies: price_list_items with this financial entity
    const priceListItemsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceListItems)
      .where(eq(priceListItems.financialEntityId, id));
    
    // Check for dependencies: price_list_item_compositions with this financial entity
    const compositionsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceListItemCompositions)
      .where(eq(priceListItemCompositions.financialEntityId, id));

    const totalPriceItems = priceListItemsCount[0]?.count ?? 0;
    const totalCompositions = compositionsCount[0]?.count ?? 0;
    
    const hasDependencies = totalPriceItems > 0 || totalCompositions > 0;

    if (hasDependencies) {
      const dependencies = [];
      if (totalPriceItems > 0) dependencies.push(`${totalPriceItems} voci listino`);
      if (totalCompositions > 0) dependencies.push(`${totalCompositions} composizioni listino`);
      
      return res.status(400).json({
        success: false,
        error: 'has_dependencies',
        message: `Impossibile eliminare l'ente finanziario: esistono ${dependencies.join(', ')} associati. Puoi solo archiviarlo.`,
        canDelete: false,
        canArchive: true,
        dependencies: {
          priceListItems: totalPriceItems,
          compositions: totalCompositions
        }
      });
    }

    // No dependencies - safe to delete
    await db
      .delete(financialEntities)
      .where(eq(financialEntities.id, id));

    res.json({
      success: true,
      message: "Financial entity deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting financial entity:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete financial entity",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PATCH /api/wms/financial-entities/:id/archive
 * Archive a tenant-specific financial entity (soft-delete)
 */
router.patch("/financial-entities/:id/archive", rbacMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionTenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!sessionTenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing entity
    const [existing] = await db
      .select()
      .from(financialEntities)
      .where(eq(financialEntities.id, id));

    if (!existing) {
      return res.status(404).json({ error: "Financial entity not found" });
    }

    // Brand entities cannot be archived by tenants
    if (existing.origin === 'brand') {
      return res.status(403).json({ error: "Brand-pushed entities cannot be archived" });
    }

    // Tenant entities can only be archived by their own tenant
    if (existing.tenantId !== sessionTenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Soft-delete by setting status to 'blocked' (archived)
    const [archived] = await db
      .update(financialEntities)
      .set({
        status: 'blocked',
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(financialEntities.id, id))
      .returning();

    res.json({
      success: true,
      message: "Ente finanziario archiviato con successo",
      data: archived
    });

  } catch (error) {
    console.error("Error archiving financial entity:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to archive financial entity",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== PRICE LISTS API ====================

/**
 * GET /api/wms/price-lists
 * Get all price lists for the tenant (with optional filters)
 */
router.get("/price-lists", rbacMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const { type, status, search } = req.query;

    let query = db
      .select()
      .from(priceLists)
      .where(
        and(
          or(
            eq(priceLists.tenantId, tenantId),
            isNull(priceLists.tenantId) // Include brand-pushed lists
          )
        )
      )
      .orderBy(desc(priceLists.createdAt));

    const results = await query;

    // Apply filters in memory for flexibility
    let filtered = results;

    if (type && type !== 'all') {
      filtered = filtered.filter(p => p.type === type);
    }

    if (status && status !== 'all') {
      const now = new Date();
      if (status === 'active') {
        filtered = filtered.filter(p => 
          p.isActive && 
          new Date(p.validFrom) <= now && 
          (!p.validTo || new Date(p.validTo) >= now)
        );
      } else if (status === 'expired') {
        filtered = filtered.filter(p => p.validTo && new Date(p.validTo) < now);
      } else if (status === 'future') {
        filtered = filtered.filter(p => new Date(p.validFrom) > now);
      }
    }

    if (search) {
      const searchLower = String(search).toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
      );
    }

    res.json({ success: true, data: filtered });

  } catch (error) {
    console.error("Error fetching price lists:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch price lists",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/price-lists/:id
 * Get a single price list with its items
 */
router.get("/price-lists/:id", rbacMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get price list header
    const [priceList] = await db
      .select()
      .from(priceLists)
      .where(eq(priceLists.id, id));

    if (!priceList) {
      return res.status(404).json({ error: "Price list not found" });
    }

    // Check access
    if (priceList.tenantId && priceList.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get items based on price list type
    let items: any[] = [];
    let canvasItems: any[] = [];
    let canvasAddons: any[] = [];
    let compositions: any[] = [];

    if (priceList.type === 'canvas') {
      // Canvas type: get from dedicated canvas table
      canvasItems = await db
        .select()
        .from(priceListItemsCanvas)
        .where(eq(priceListItemsCanvas.priceListId, id))
        .orderBy(desc(priceListItemsCanvas.createdAt));

      // Get addons for each canvas item
      if (canvasItems.length > 0) {
        const canvasItemIds = canvasItems.map(i => i.id);
        canvasAddons = await db
          .select()
          .from(priceListItemCanvasAddons)
          .where(inArray(priceListItemCanvasAddons.canvasItemId, canvasItemIds));
      }
    } else if (priceList.type === 'promo_canvas') {
      // Bundle type: get both device items and canvas items
      items = await db
        .select()
        .from(priceListItems)
        .where(eq(priceListItems.priceListId, id))
        .orderBy(desc(priceListItems.createdAt));

      canvasItems = await db
        .select()
        .from(priceListItemsCanvas)
        .where(eq(priceListItemsCanvas.priceListId, id))
        .orderBy(desc(priceListItemsCanvas.createdAt));

      // Get compositions
      const itemIds = items.map(i => i.id);
      if (itemIds.length > 0) {
        compositions = await db
          .select()
          .from(priceListItemCompositions)
          .where(inArray(priceListItemCompositions.bundleItemId, itemIds));
      }
    } else {
      // Standard (no_promo) or PromoDevice (promo_device): get from device items table
      items = await db
        .select()
        .from(priceListItems)
        .where(eq(priceListItems.priceListId, id))
        .orderBy(desc(priceListItems.createdAt));
    }

    res.json({ 
      success: true, 
      data: {
        ...priceList,
        items,
        canvasItems,
        canvasAddons,
        compositions
      }
    });

  } catch (error) {
    console.error("Error fetching price list:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch price list",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/price-lists
 * Create a new price list with items
 */
router.post("/price-lists", rbacMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const { header, items, pairs } = req.body;

    // Validate header
    const headerData = {
      ...header,
      tenantId,
      origin: 'tenant',
      createdBy: userId,
      updatedBy: userId
    };

    // Create price list header
    const [newPriceList] = await db
      .insert(priceLists)
      .values(headerData)
      .returning();

    // Process items based on type
    const { canvasItems } = req.body; // For canvas type
    
    if (header.type === 'canvas' && canvasItems && canvasItems.length > 0) {
      // Canvas type: insert into dedicated canvas table
      for (const item of canvasItems) {
        const [canvasItem] = await db
          .insert(priceListItemsCanvas)
          .values({
            priceListId: newPriceList.id,
            tenantId,
            origin: 'tenant',
            productId: item.productId,
            partnerId: item.partnerId || null,
            monthlyFee: item.monthlyFee || null,
            entryFee: item.entryFee || null,
            contractDuration: item.contractDuration || null,
            notes: item.notes || null,
            validFrom: item.validFrom ? new Date(item.validFrom) : null,
            validTo: item.validTo ? new Date(item.validTo) : null,
            createdBy: userId,
            updatedBy: userId
          })
          .returning();

        // Insert addons if provided
        if (item.addons && item.addons.length > 0) {
          for (let i = 0; i < item.addons.length; i++) {
            const addon = item.addons[i];
            await db
              .insert(priceListItemCanvasAddons)
              .values({
                canvasItemId: canvasItem.id,
                productId: addon.productId,
                monthlyFee: addon.monthlyFee || null,
                isIncluded: addon.isIncluded || false,
                displayOrder: i
              });
          }
        }
      }
    } else if (header.type === 'promo_canvas' && pairs && pairs.length > 0) {
      // For promo_canvas (bundle), create items from pairs
      // Note: compositions FK requires both bundleItemId and componentItemId to reference price_list_items
      // So we create device items for both physical and canvas products, plus canvas-specific data in dedicated table
      for (const pair of pairs) {
        // 1. Create device item for the physical product
        const [physicalItem] = await db
          .insert(priceListItems)
          .values({
            priceListId: newPriceList.id,
            tenantId,
            origin: 'tenant',
            productId: pair.physicalProductId,
            validFrom: new Date(header.validFrom),
            validTo: header.validTo ? new Date(header.validTo) : null,
            createdBy: userId,
            updatedBy: userId
          })
          .returning();

        // 2. Create device item for canvas product (required for composition FK)
        const [canvasDeviceItem] = await db
          .insert(priceListItems)
          .values({
            priceListId: newPriceList.id,
            tenantId,
            origin: 'tenant',
            productId: pair.canvasProductId,
            validFrom: new Date(header.validFrom),
            validTo: header.validTo ? new Date(header.validTo) : null,
            createdBy: userId,
            updatedBy: userId
          })
          .returning();

        // 3. Create canvas-specific data in dedicated table (for pricing details)
        await db
          .insert(priceListItemsCanvas)
          .values({
            priceListId: newPriceList.id,
            tenantId,
            origin: 'tenant',
            productId: pair.canvasProductId,
            monthlyFee: pair.canvasMonthlyFee || null,
            createdBy: userId,
            updatedBy: userId
          });

        // 4. Create configurations as compositions (linking device items)
        for (const config of pair.configurations) {
          let financialEntityId = null;
          if (config.salesMode === 'FIN' && config.financialEntityId) {
            financialEntityId = config.financialEntityId;
          }

          // Create composition linking physical device to canvas device
          await db
            .insert(priceListItemCompositions)
            .values({
              tenantId,
              origin: 'tenant',
              bundleItemId: physicalItem.id,
              componentItemId: canvasDeviceItem.id, // Now correctly references price_list_items
              componentRole: 'primary',
              pricingStrategy: 'inherited',
              financialEntityId,
              overrideEntryFee: config.entryFee || null,
              overrideNumberOfInstallments: config.numberOfInstallments || null,
              overrideInstallmentAmount: config.installmentAmount || null,
              createdBy: userId,
              updatedBy: userId
            });
        }
      }
    } else if (items && items.length > 0) {
      // For device types (no_promo, promo_device): insert into device items table
      for (const item of items) {
        await db
          .insert(priceListItems)
          .values({
            ...item,
            priceListId: newPriceList.id,
            tenantId,
            origin: 'tenant',
            validFrom: new Date(item.validFrom || header.validFrom),
            validTo: item.validTo ? new Date(item.validTo) : null,
            createdBy: userId,
            updatedBy: userId
          });
      }
    }

    res.status(201).json({ 
      success: true, 
      data: newPriceList,
      message: "Price list created successfully"
    });

  } catch (error) {
    console.error("Error creating price list:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create price list",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * DELETE /api/wms/price-lists/:id
 * Delete a price list (only tenant-created, not brand-pushed)
 */
router.delete("/price-lists/:id", rbacMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    // Get existing
    const [existing] = await db
      .select()
      .from(priceLists)
      .where(eq(priceLists.id, id));

    if (!existing) {
      return res.status(404).json({ error: "Price list not found" });
    }

    if (existing.origin === 'brand') {
      return res.status(403).json({ error: "Brand-pushed price lists cannot be deleted" });
    }

    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete (cascade will handle items and compositions)
    await db
      .delete(priceLists)
      .where(eq(priceLists.id, id));

    res.json({
      success: true,
      message: "Price list deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting price list:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete price list",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PUT /api/wms/price-lists/:id
 * Update a price list with optional versioning
 * If createNewVersion=true, creates a new version with incremented version number
 */
router.put("/price-lists/:id", rbacMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const { header, createNewVersion, changeReason } = req.body;

    // Get existing price list
    const [existing] = await db
      .select()
      .from(priceLists)
      .where(eq(priceLists.id, id));

    if (!existing) {
      return res.status(404).json({ error: "Price list not found" });
    }

    if (existing.origin === 'brand') {
      return res.status(403).json({ error: "Brand-pushed price lists cannot be modified" });
    }

    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if price list is currently active
    const now = new Date();
    const isActive = existing.isActive && 
      new Date(existing.validFrom) <= now && 
      (!existing.validTo || new Date(existing.validTo) >= now);

    if (isActive && createNewVersion) {
      // Create new version - deactivate old one and create new
      const newVersion = (existing.version || 1) + 1;
      const newCode = existing.code.replace(/_v\d+$/, '') + `_v${newVersion}`;

      // Deactivate old version
      await db
        .update(priceLists)
        .set({
          isActive: false,
          validTo: now,
          updatedAt: now,
          updatedBy: userId
        })
        .where(eq(priceLists.id, id));

      // Create new version
      const [newPriceList] = await db
        .insert(priceLists)
        .values({
          ...header,
          code: newCode,
          tenantId,
          origin: 'tenant',
          version: newVersion,
          previousVersionId: existing.id,
          changeReason: changeReason || null,
          validFrom: new Date(header.validFrom || now),
          validTo: header.validTo ? new Date(header.validTo) : null,
          isActive: true,
          createdBy: userId,
          updatedBy: userId
        })
        .returning();

      // Copy items from old version to new version based on type
      // Map old item IDs to new item IDs for composition linking
      const deviceItemIdMap = new Map<string, string>();
      const canvasItemIdMap = new Map<string, string>();

      if (existing.type === 'canvas') {
        // Canvas-only: Copy canvas items + addons
        const oldCanvasItems = await db
          .select()
          .from(priceListItemsCanvas)
          .where(eq(priceListItemsCanvas.priceListId, id));

        for (const item of oldCanvasItems) {
          const { id: oldItemId, priceListId: _, createdAt: __, updatedAt: ___, ...itemData } = item;
          const [newCanvasItem] = await db
            .insert(priceListItemsCanvas)
            .values({
              ...itemData,
              priceListId: newPriceList.id,
              createdBy: userId,
              updatedBy: userId
            })
            .returning();

          canvasItemIdMap.set(oldItemId, newCanvasItem.id);

          // Copy addons for this canvas item
          const oldAddons = await db
            .select()
            .from(priceListItemCanvasAddons)
            .where(eq(priceListItemCanvasAddons.canvasItemId, oldItemId));

          for (const addon of oldAddons) {
            const { id: addonId, canvasItemId: _, createdAt: __, updatedAt: ___, ...addonData } = addon;
            await db
              .insert(priceListItemCanvasAddons)
              .values({
                ...addonData,
                canvasItemId: newCanvasItem.id
              });
          }
        }
      } else if (existing.type === 'promo_canvas') {
        // Promo Canvas (Bundle): Copy device items + canvas items + addons + compositions
        
        // 1. Copy device items
        const oldDeviceItems = await db
          .select()
          .from(priceListItems)
          .where(eq(priceListItems.priceListId, id));

        for (const item of oldDeviceItems) {
          const { id: oldItemId, priceListId: _, createdAt: __, updatedAt: ___, ...itemData } = item;
          const [newItem] = await db
            .insert(priceListItems)
            .values({
              ...itemData,
              priceListId: newPriceList.id,
              createdBy: userId,
              updatedBy: userId
            })
            .returning();
          
          deviceItemIdMap.set(oldItemId, newItem.id);
        }

        // 2. Copy canvas items + addons
        const oldCanvasItems = await db
          .select()
          .from(priceListItemsCanvas)
          .where(eq(priceListItemsCanvas.priceListId, id));

        for (const item of oldCanvasItems) {
          const { id: oldItemId, priceListId: _, createdAt: __, updatedAt: ___, ...itemData } = item;
          const [newCanvasItem] = await db
            .insert(priceListItemsCanvas)
            .values({
              ...itemData,
              priceListId: newPriceList.id,
              createdBy: userId,
              updatedBy: userId
            })
            .returning();

          canvasItemIdMap.set(oldItemId, newCanvasItem.id);

          // Copy addons
          const oldAddons = await db
            .select()
            .from(priceListItemCanvasAddons)
            .where(eq(priceListItemCanvasAddons.canvasItemId, oldItemId));

          for (const addon of oldAddons) {
            const { id: addonId, canvasItemId: _, createdAt: __, updatedAt: ___, ...addonData } = addon;
            await db
              .insert(priceListItemCanvasAddons)
              .values({
                ...addonData,
                canvasItemId: newCanvasItem.id
              });
          }
        }

        // 3. Copy compositions (linking device items together)
        const oldItemIds = Array.from(deviceItemIdMap.keys());
        if (oldItemIds.length > 0) {
          const oldCompositions = await db
            .select()
            .from(priceListItemCompositions)
            .where(inArray(priceListItemCompositions.bundleItemId, oldItemIds));

          for (const comp of oldCompositions) {
            const { id: compId, createdAt: __, updatedAt: ___, ...compData } = comp;
            const newBundleId = deviceItemIdMap.get(comp.bundleItemId);
            const newComponentId = deviceItemIdMap.get(comp.componentItemId);
            
            if (newBundleId && newComponentId) {
              await db
                .insert(priceListItemCompositions)
                .values({
                  ...compData,
                  bundleItemId: newBundleId,
                  componentItemId: newComponentId
                });
            }
          }
        }
      } else {
        // Device-only (no_promo, promo_device): Copy device items
        const oldItems = await db
          .select()
          .from(priceListItems)
          .where(eq(priceListItems.priceListId, id));

        for (const item of oldItems) {
          const { id: oldItemId, priceListId: _, createdAt: __, updatedAt: ___, ...itemData } = item;
          await db
            .insert(priceListItems)
            .values({
              ...itemData,
              priceListId: newPriceList.id,
              createdBy: userId,
              updatedBy: userId
            });
        }
      }

      return res.json({ 
        success: true, 
        data: newPriceList,
        message: `Created new version ${newVersion} of price list`,
        isNewVersion: true
      });
    } else {
      // Simple update (no versioning)
      const [updated] = await db
        .update(priceLists)
        .set({
          name: header.name,
          description: header.description,
          validFrom: new Date(header.validFrom),
          validTo: header.validTo ? new Date(header.validTo) : null,
          isActive: header.isActive !== undefined ? header.isActive : existing.isActive,
          updatedAt: now,
          updatedBy: userId
        })
        .where(eq(priceLists.id, id))
        .returning();

      return res.json({ 
        success: true, 
        data: updated,
        message: "Price list updated successfully",
        isNewVersion: false
      });
    }

  } catch (error) {
    console.error("Error updating price list:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update price list",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== PRODUCT-SUPPLIER MAPPINGS API ====================

/**
 * GET /api/wms/product-supplier-mappings
 * Get mappings for a product-supplier combination
 */
router.get("/product-supplier-mappings", rbacMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const { productId, supplierId } = req.query;

    let query = db
      .select()
      .from(productSupplierMappings)
      .where(eq(productSupplierMappings.tenantId, tenantId));

    const results = await query;

    // Filter in memory
    let filtered = results;
    if (productId) {
      filtered = filtered.filter(m => m.productId === productId);
    }
    if (supplierId) {
      filtered = filtered.filter(m => m.supplierId === supplierId);
    }

    res.json({ success: true, data: filtered });

  } catch (error) {
    console.error("Error fetching product-supplier mappings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch mappings",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/product-supplier-mappings
 * Create or update a product-supplier mapping
 */
router.post("/product-supplier-mappings", rbacMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const { productId, supplierId, supplierSku, useInternalSku, isPrimary } = req.body;

    if (!productId || !supplierId) {
      return res.status(400).json({ error: "productId and supplierId are required" });
    }

    // Check if mapping exists
    const [existing] = await db
      .select()
      .from(productSupplierMappings)
      .where(
        and(
          eq(productSupplierMappings.tenantId, tenantId),
          eq(productSupplierMappings.productId, productId),
          eq(productSupplierMappings.supplierId, supplierId)
        )
      );

    const supplierSkuNormalized = supplierSku ? String(supplierSku).toUpperCase().trim() : null;

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(productSupplierMappings)
        .set({
          supplierSku: supplierSku || null,
          supplierSkuNormalized,
          useInternalSku: useInternalSku || false,
          isPrimary: isPrimary || false,
          updatedAt: new Date(),
          updatedBy: userId
        })
        .where(eq(productSupplierMappings.id, existing.id))
        .returning();

      res.json({ success: true, data: updated, message: "Mapping updated" });
    } else {
      // Create new
      const [created] = await db
        .insert(productSupplierMappings)
        .values({
          tenantId,
          productId,
          supplierId,
          supplierSku: supplierSku || null,
          supplierSkuNormalized,
          useInternalSku: useInternalSku || false,
          isPrimary: isPrimary || false,
          createdBy: userId,
          updatedBy: userId
        })
        .returning();

      res.status(201).json({ success: true, data: created, message: "Mapping created" });
    }

  } catch (error) {
    console.error("Error creating/updating product-supplier mapping:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to save mapping",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * DELETE /api/wms/product-supplier-mappings/:id
 * Delete a product-supplier mapping
 */
router.delete("/product-supplier-mappings/:id", rbacMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found in session" });
    }

    const [deleted] = await db
      .delete(productSupplierMappings)
      .where(
        and(
          eq(productSupplierMappings.id, id),
          eq(productSupplierMappings.tenantId, tenantId)
        )
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Mapping not found" });
    }

    res.json({ success: true, message: "Mapping deleted" });

  } catch (error) {
    console.error("Error deleting product-supplier mapping:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete mapping",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== STATUS HISTORY API ====================

/**
 * GET /api/wms/product-items/:id/status-history
 * Get status change history for a serialized product item
 */
router.get("/product-items/:id/status-history", rbacMiddleware, requirePermission('wms.products.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const history = await wmsStatusHistoryService.getItemStatusHistory(id, tenantId);
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    logger.error('Error fetching item status history', { error });
    res.status(500).json({ 
      error: "Failed to fetch status history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/product-batches/:id/status-history
 * Get status change history for a product batch
 */
router.get("/product-batches/:id/status-history", rbacMiddleware, requirePermission('wms.products.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const history = await wmsStatusHistoryService.getBatchStatusHistory(id, tenantId);
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    logger.error('Error fetching batch status history', { error });
    res.status(500).json({ 
      error: "Failed to fetch status history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== GOODS RECEIVING API ====================

/**
 * GET /api/wms/receiving/stats
 * Get receiving KPI statistics for dashboard
 */
router.get("/receiving/stats", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 1. Products Received Today - from stock movements with purchase_in/inbound
    const receivedTodayResult = await db.execute(sql`
      SELECT COALESCE(SUM(quantity_delta), 0) as total
      FROM w3suite.wms_stock_movements
      WHERE tenant_id = ${tenantId}
        AND movement_type = 'purchase_in'
        AND movement_direction = 'inbound'
        AND occurred_at >= ${today.toISOString()}
        AND occurred_at < ${tomorrow.toISOString()}
    `);
    const productsReceivedToday = Number(receivedTodayResult.rows[0]?.total || 0);
    
    // 2. In Progress - receiving drafts with 'resumed' status (actively being worked on)
    const inProgressResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_quantity), 0) as total
      FROM w3suite.wms_receiving_drafts
      WHERE tenant_id = ${tenantId}
        AND status = 'resumed'
    `);
    const inProgress = Number(inProgressResult.rows[0]?.total || 0);
    
    // 3. Suspended - receiving drafts with 'suspended' status
    const suspendedResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_quantity), 0) as total
      FROM w3suite.wms_receiving_drafts
      WHERE tenant_id = ${tenantId}
        AND status = 'suspended'
    `);
    const suspended = Number(suspendedResult.rows[0]?.total || 0);
    
    // 4. With Problems - movements with discrepancies (metadata contains 'discrepancy' flag)
    const problemsResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM w3suite.wms_stock_movements
      WHERE tenant_id = ${tenantId}
        AND movement_type = 'purchase_in'
        AND occurred_at >= ${today.toISOString()}
        AND occurred_at < ${tomorrow.toISOString()}
        AND (metadata->>'hasDiscrepancy')::boolean = true
    `);
    const withProblems = Number(problemsResult.rows[0]?.total || 0);
    
    // 5. Value Received Today - sum of value from metadata
    const valueResult = await db.execute(sql`
      SELECT COALESCE(SUM((metadata->>'unitPrice')::numeric * quantity_delta), 0) as total
      FROM w3suite.wms_stock_movements
      WHERE tenant_id = ${tenantId}
        AND movement_type = 'purchase_in'
        AND movement_direction = 'inbound'
        AND occurred_at >= ${today.toISOString()}
        AND occurred_at < ${tomorrow.toISOString()}
    `);
    const valueReceivedToday = Number(valueResult.rows[0]?.total || 0);
    
    res.json({
      success: true,
      data: {
        productsReceivedToday,
        inProgress,
        suspended,
        withProblems,
        valueReceivedToday,
        toReceive: null // Placeholder - requires supplier_orders table
      }
    });
    
  } catch (error) {
    logger.error('Error fetching receiving stats', { error });
    res.status(500).json({ 
      error: "Failed to fetch receiving stats",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/receiving
 * Process goods receiving (carico merce)
 * Creates: DDT passivo, inbound movements, serials/batches, inventory updates, status history
 */
const receivingItemSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  quantity: z.number().int().positive(),
  serials: z.array(z.string()).optional(),
  lot: z.string().optional(),
  unitPrice: z.number().optional(),
  expectedQuantity: z.number().int().optional()
});

const receivingRequestSchema = z.object({
  storeId: z.string().uuid(),
  supplierId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  documentNumber: z.string().min(1),
  documentDate: z.string(),
  notes: z.string().optional(),
  items: z.array(receivingItemSchema).min(1)
});

router.post("/receiving", rbacMiddleware, requirePermission('wms.stock.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const userName = req.user?.name || req.user?.email;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized", message: "Tenant ID not found" });
    }
    
    const validation = receivingRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validation.error.format()
      });
    }
    
    const requestData = validation.data;
    
    // Check for duplicate serials before processing
    const allSerials: string[] = [];
    for (const item of requestData.items) {
      if (item.serials && item.serials.length > 0) {
        allSerials.push(...item.serials);
      }
    }
    
    if (allSerials.length > 0) {
      const duplicates = await wmsReceivingService.checkSerialDuplicates(tenantId, allSerials);
      if (duplicates.length > 0) {
        return res.status(400).json({
          error: "Duplicate serials found",
          message: `I seguenti seriali esistono già nel sistema: ${duplicates.join(', ')}`,
          duplicates
        });
      }
    }
    
    const receivingRequest: ReceivingRequest = {
      tenantId,
      storeId: requestData.storeId,
      supplierId: requestData.supplierId,
      orderId: requestData.orderId,
      documentNumber: requestData.documentNumber,
      documentDate: requestData.documentDate,
      notes: requestData.notes,
      items: requestData.items,
      createdBy: userId,
      createdByName: userName
    };
    
    const result = await wmsReceivingService.processReceiving(receivingRequest);
    
    logger.info('📦 [API] Goods receiving processed successfully', {
      tenantId,
      documentId: result.documentId,
      documentNumber: result.documentNumber,
      itemsReceived: result.itemsReceived,
      serialsCreated: result.serialsCreated,
      batchesCreated: result.batchesCreated
    });
    
    res.status(201).json({
      success: true,
      data: result,
      message: `Carico merce completato: ${result.itemsReceived} articoli ricevuti`
    });
    
  } catch (error) {
    logger.error('❌ [API] Failed to process goods receiving', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      error: "Failed to process goods receiving",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/wms/receiving/check-serials
 * Check if serials already exist in the tenant (pre-validation)
 */
router.post("/receiving/check-serials", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { serials } = req.body;
    
    if (!Array.isArray(serials)) {
      return res.status(400).json({ error: "serials must be an array of strings" });
    }
    
    const duplicates = await wmsReceivingService.checkSerialDuplicates(tenantId, serials);
    
    res.json({
      success: true,
      data: {
        hasDuplicates: duplicates.length > 0,
        duplicates,
        validCount: serials.length - duplicates.length
      }
    });
    
  } catch (error) {
    logger.error('Error checking serial duplicates', { error });
    res.status(500).json({ 
      error: "Failed to check serials",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/wms/receiving/generate-lot
 * Generate an automatic lot number
 */
router.get("/receiving/generate-lot", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const lotNumber = wmsReceivingService.generateLotNumber();
    
    res.json({
      success: true,
      data: { lotNumber }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to generate lot number",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ==================== RECEIVING DRAFTS (Carichi Sospesi) ====================

/**
 * GET /api/wms/receiving/drafts
 * Get all suspended receiving drafts for current tenant
 */
router.get("/receiving/drafts", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    // Include both 'suspended' and 'resumed' drafts (exclude only 'completed')
    const drafts = await db.select()
      .from(wmsReceivingDrafts)
      .where(and(
        eq(wmsReceivingDrafts.tenantId, tenantId),
        or(
          eq(wmsReceivingDrafts.status, 'suspended'),
          eq(wmsReceivingDrafts.status, 'resumed')
        )
      ))
      .orderBy(desc(wmsReceivingDrafts.updatedAt));

    res.json({ success: true, data: drafts });
  } catch (error) {
    logger.error('Error fetching receiving drafts', { error });
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

/**
 * GET /api/wms/receiving/drafts/:id
 * Get a specific draft by ID
 */
router.get("/receiving/drafts/:id", rbacMiddleware, requirePermission('wms.stock.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const [draft] = await db.select()
      .from(wmsReceivingDrafts)
      .where(and(
        eq(wmsReceivingDrafts.id, id),
        eq(wmsReceivingDrafts.tenantId, tenantId)
      ))
      .limit(1);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    res.json({ success: true, data: draft });
  } catch (error) {
    logger.error('Error fetching receiving draft', { error });
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

/**
 * POST /api/wms/receiving/drafts
 * Create a new receiving draft (suspend current work)
 */
router.post("/receiving/drafts", rbacMiddleware, requirePermission('wms.stock.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const userName = req.user?.name || req.user?.email;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const {
      supplierId,
      supplierName,
      documentNumber,
      documentDate,
      expectedDeliveryDate,
      storeId,
      storeName,
      notes,
      productsData,
      lastStep
    } = req.body;

    const totalProducts = Array.isArray(productsData) ? productsData.length : 0;
    const totalQuantity = Array.isArray(productsData) 
      ? productsData.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) 
      : 0;

    // Verify supplierId exists in suppliers table (it might come from supplierOverrides)
    // If not found, set to null and rely on supplierName
    let validSupplierId: string | null = null;
    if (supplierId) {
      const BRAND_TENANT_ID = '00000000-0000-0000-0000-000000000000';
      const supplierExists = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, supplierId),
            or(
              isNull(suppliers.tenantId),
              eq(suppliers.tenantId, BRAND_TENANT_ID),
              eq(suppliers.tenantId, tenantId)
            )
          )
        )
        .limit(1);
      
      if (supplierExists.length > 0) {
        validSupplierId = supplierId;
      } else {
        logger.warn('Supplier ID not found in suppliers table, using name only', { supplierId, supplierName });
      }
    }

    const [newDraft] = await db.insert(wmsReceivingDrafts)
      .values({
        tenantId,
        supplierId: validSupplierId,
        supplierName: supplierName || null,
        documentNumber: documentNumber || null,
        documentDate: documentDate || null,
        expectedDeliveryDate: expectedDeliveryDate || null,
        storeId: storeId || null,
        storeName: storeName || null,
        notes: notes || null,
        productsData: productsData || [],
        totalProducts,
        totalQuantity,
        status: 'suspended',
        lastStep: lastStep || 1,
        createdBy: userId || null,
        createdByName: userName || null,
      })
      .returning();

    logger.info('Receiving draft created', { draftId: newDraft.id, tenantId });
    res.status(201).json({ success: true, data: newDraft });
  } catch (error) {
    logger.error('Error creating receiving draft', { error });
    res.status(500).json({ error: "Failed to create draft" });
  }
});

/**
 * PATCH /api/wms/receiving/drafts/:id
 * Update an existing draft
 */
router.patch("/receiving/drafts/:id", rbacMiddleware, requirePermission('wms.stock.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const { productsData, lastStep, status, ...rest } = req.body;

    const totalProducts = Array.isArray(productsData) ? productsData.length : undefined;
    const totalQuantity = Array.isArray(productsData) 
      ? productsData.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) 
      : undefined;

    const updateData: any = {
      ...rest,
      updatedAt: new Date(),
    };

    if (productsData !== undefined) {
      updateData.productsData = productsData;
      updateData.totalProducts = totalProducts;
      updateData.totalQuantity = totalQuantity;
    }
    if (lastStep !== undefined) updateData.lastStep = lastStep;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db.update(wmsReceivingDrafts)
      .set(updateData)
      .where(and(
        eq(wmsReceivingDrafts.id, id),
        eq(wmsReceivingDrafts.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Draft not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating receiving draft', { error });
    res.status(500).json({ error: "Failed to update draft" });
  }
});

/**
 * DELETE /api/wms/receiving/drafts/:id
 * Delete a draft permanently
 */
router.delete("/receiving/drafts/:id", rbacMiddleware, requirePermission('wms.stock.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const [deleted] = await db.delete(wmsReceivingDrafts)
      .where(and(
        eq(wmsReceivingDrafts.id, id),
        eq(wmsReceivingDrafts.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Draft not found" });
    }

    logger.info('Receiving draft deleted', { draftId: id, tenantId });
    res.json({ success: true, message: "Draft deleted successfully" });
  } catch (error) {
    logger.error('Error deleting receiving draft', { error });
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

/**
 * POST /api/wms/receiving/drafts/:id/resume
 * Mark a draft as resumed (when user reopens it)
 */
router.post("/receiving/drafts/:id/resume", rbacMiddleware, requirePermission('wms.stock.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const [updated] = await db.update(wmsReceivingDrafts)
      .set({ 
        status: 'resumed',
        updatedAt: new Date()
      })
      .where(and(
        eq(wmsReceivingDrafts.id, id),
        eq(wmsReceivingDrafts.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Draft not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error resuming receiving draft', { error });
    res.status(500).json({ error: "Failed to resume draft" });
  }
});

/**
 * POST /api/wms/receiving/drafts/:id/complete
 * Mark a draft as completed (after successful receiving)
 */
router.post("/receiving/drafts/:id/complete", rbacMiddleware, requirePermission('wms.stock.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const [updated] = await db.update(wmsReceivingDrafts)
      .set({ 
        status: 'completed',
        updatedAt: new Date()
      })
      .where(and(
        eq(wmsReceivingDrafts.id, id),
        eq(wmsReceivingDrafts.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Draft not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error completing receiving draft', { error });
    res.status(500).json({ error: "Failed to complete draft" });
  }
});

// ==================== WMS DOCUMENTS API ====================

/**
 * GET /api/wms/documents/stats
 * Get document statistics for dashboard KPIs
 */
router.get("/documents/stats", rbacMiddleware, requirePermission('wms.documents.ddt.view'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [totalDocs] = await db.select({ count: sql<number>`count(*)::int` })
      .from(wmsDocuments)
      .where(and(
        eq(wmsDocuments.tenantId, tenantId),
        gte(wmsDocuments.createdAt, currentMonth)
      ));

    const [passiveDocs] = await db.select({ count: sql<number>`count(*)::int` })
      .from(wmsDocuments)
      .where(and(
        eq(wmsDocuments.tenantId, tenantId),
        eq(wmsDocuments.documentDirection, 'passive'),
        gte(wmsDocuments.createdAt, currentMonth)
      ));

    const [activeDocs] = await db.select({ count: sql<number>`count(*)::int` })
      .from(wmsDocuments)
      .where(and(
        eq(wmsDocuments.tenantId, tenantId),
        eq(wmsDocuments.documentDirection, 'active'),
        gte(wmsDocuments.createdAt, currentMonth)
      ));

    const [pendingApproval] = await db.select({ count: sql<number>`count(*)::int` })
      .from(wmsDocuments)
      .where(and(
        eq(wmsDocuments.tenantId, tenantId),
        eq(wmsDocuments.status, 'pending_approval')
      ));

    const [confirmedDocs] = await db.select({ count: sql<number>`count(*)::int` })
      .from(wmsDocuments)
      .where(and(
        eq(wmsDocuments.tenantId, tenantId),
        eq(wmsDocuments.status, 'confirmed'),
        gte(wmsDocuments.createdAt, currentMonth)
      ));

    const successRate = totalDocs.count > 0 
      ? Math.round((confirmedDocs.count / totalDocs.count) * 100) 
      : 100;

    res.json({
      total: totalDocs.count || 0,
      passive: passiveDocs.count || 0,
      active: activeDocs.count || 0,
      pendingApproval: pendingApproval.count || 0,
      successRate
    });
  } catch (error) {
    logger.error('Error fetching document stats', { error });
    res.status(500).json({ error: "Failed to fetch document statistics" });
  }
});

/**
 * GET /api/wms/documents/trend
 * Get 7-day document trend for chart
 */
router.get("/documents/trend", rbacMiddleware, requirePermission('wms.documents.ddt.view'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendData = await db.select({
      date: sql<string>`date(${wmsDocuments.createdAt})`,
      direction: wmsDocuments.documentDirection,
      count: sql<number>`count(*)::int`
    })
    .from(wmsDocuments)
    .where(and(
      eq(wmsDocuments.tenantId, tenantId),
      gte(wmsDocuments.createdAt, sevenDaysAgo)
    ))
    .groupBy(sql`date(${wmsDocuments.createdAt})`, wmsDocuments.documentDirection)
    .orderBy(sql`date(${wmsDocuments.createdAt})`);

    const dateMap = new Map<string, { passive: number; active: number }>();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { passive: 0, active: 0 });
    }

    trendData.forEach(row => {
      const existing = dateMap.get(row.date) || { passive: 0, active: 0 };
      if (row.direction === 'passive') {
        existing.passive = row.count;
      } else {
        existing.active = row.count;
      }
      dateMap.set(row.date, existing);
    });

    const result = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      passive: data.passive,
      active: data.active
    }));

    res.json(result);
  } catch (error) {
    logger.error('Error fetching document trend', { error });
    res.status(500).json({ error: "Failed to fetch document trend" });
  }
});

/**
 * GET /api/wms/documents/timeline
 * Get recent document events for timeline
 */
router.get("/documents/timeline", rbacMiddleware, requirePermission('wms.documents.ddt.view'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const recentDocs = await db.select({
      id: wmsDocuments.id,
      documentNumber: wmsDocuments.documentNumber,
      documentType: wmsDocuments.documentType,
      status: wmsDocuments.status,
      createdAt: wmsDocuments.createdAt,
      approvedAt: wmsDocuments.approvedAt,
      createdByName: users.firstName,
    })
    .from(wmsDocuments)
    .leftJoin(users, eq(wmsDocuments.createdBy, users.id))
    .where(eq(wmsDocuments.tenantId, tenantId))
    .orderBy(desc(wmsDocuments.createdAt))
    .limit(limit);

    const timeline = recentDocs.map(doc => {
      let event = 'creato';
      let eventTime = doc.createdAt;
      
      if (doc.status === 'confirmed' && doc.approvedAt) {
        event = 'approvato';
        eventTime = doc.approvedAt;
      } else if (doc.status === 'pending_approval') {
        event = 'in attesa';
      }

      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        documentType: doc.documentType,
        event,
        eventTime,
        createdBy: doc.createdByName
      };
    });

    res.json(timeline);
  } catch (error) {
    logger.error('Error fetching document timeline', { error });
    res.status(500).json({ error: "Failed to fetch document timeline" });
  }
});

/**
 * GET /api/wms/documents
 * List documents with filters and pagination
 */
router.get("/documents", rbacMiddleware, requirePermission('wms.documents.ddt.view'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const { 
      direction, 
      type, 
      status, 
      tab,
      supplierId,
      dateFrom,
      dateTo,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(wmsDocuments.tenantId, tenantId)];

    if (tab === 'passive') {
      conditions.push(eq(wmsDocuments.documentDirection, 'passive'));
      conditions.push(or(eq(wmsDocuments.status, 'confirmed'), eq(wmsDocuments.status, 'pending_approval'))!);
    } else if (tab === 'active') {
      conditions.push(eq(wmsDocuments.documentDirection, 'active'));
      conditions.push(or(eq(wmsDocuments.status, 'confirmed'), eq(wmsDocuments.status, 'pending_approval'))!);
    } else if (tab === 'archive') {
      conditions.push(eq(wmsDocuments.status, 'archived'));
    } else if (tab === 'drafts') {
      conditions.push(eq(wmsDocuments.status, 'draft'));
    }

    if (direction && typeof direction === 'string') {
      conditions.push(eq(wmsDocuments.documentDirection, direction as 'active' | 'passive'));
    }
    if (type && typeof type === 'string') {
      conditions.push(eq(wmsDocuments.documentType, type as any));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(wmsDocuments.status, status as any));
    }
    if (supplierId && typeof supplierId === 'string') {
      conditions.push(eq(wmsDocuments.supplierId, supplierId));
    }
    if (dateFrom && typeof dateFrom === 'string') {
      conditions.push(gte(wmsDocuments.documentDate, dateFrom));
    }
    if (dateTo && typeof dateTo === 'string') {
      conditions.push(lte(wmsDocuments.documentDate, dateTo));
    }
    if (search && typeof search === 'string') {
      conditions.push(ilike(wmsDocuments.documentNumber, `%${search}%`));
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(wmsDocuments)
      .where(and(...conditions));

    const documents = await db.select({
      id: wmsDocuments.id,
      documentType: wmsDocuments.documentType,
      documentNumber: wmsDocuments.documentNumber,
      documentDate: wmsDocuments.documentDate,
      documentDirection: wmsDocuments.documentDirection,
      status: wmsDocuments.status,
      ddtReason: wmsDocuments.ddtReason,
      totalItems: wmsDocuments.totalItems,
      totalQuantity: wmsDocuments.totalQuantity,
      totalValue: wmsDocuments.totalValue,
      notes: wmsDocuments.notes,
      createdAt: wmsDocuments.createdAt,
      createdBy: wmsDocuments.createdBy,
      supplierName: suppliers.businessName,
      storeName: stores.name,
    })
    .from(wmsDocuments)
    .leftJoin(suppliers, eq(wmsDocuments.supplierId, suppliers.id))
    .leftJoin(stores, eq(wmsDocuments.storeId, stores.id))
    .where(and(...conditions))
    .orderBy(desc(wmsDocuments.createdAt))
    .limit(limitNum)
    .offset(offset);

    res.json({
      data: documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error listing documents', { error });
    res.status(500).json({ error: "Failed to list documents" });
  }
});

/**
 * GET /api/wms/documents/:id
 * Get document details with items, phases, and attachments
 */
router.get("/documents/:id", rbacMiddleware, requirePermission('wms.documents.ddt.view'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const [document] = await db.select()
      .from(wmsDocuments)
      .where(and(
        eq(wmsDocuments.id, id),
        eq(wmsDocuments.tenantId, tenantId)
      ));

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const items = await db.select({
      id: wmsDocumentItems.id,
      productId: wmsDocumentItems.productId,
      quantity: wmsDocumentItems.quantity,
      receivedQuantity: wmsDocumentItems.receivedQuantity,
      unitPrice: wmsDocumentItems.unitPrice,
      totalPrice: wmsDocumentItems.totalPrice,
      serialNumbers: wmsDocumentItems.serialNumbers,
      itemStatus: wmsDocumentItems.itemStatus,
      lineNumber: wmsDocumentItems.lineNumber,
      productName: products.name,
      productSku: products.sku,
    })
    .from(wmsDocumentItems)
    .leftJoin(products, eq(wmsDocumentItems.productId, products.id))
    .where(eq(wmsDocumentItems.documentId, id))
    .orderBy(wmsDocumentItems.lineNumber);

    const phases = await db.select()
      .from(wmsDocumentPhases)
      .where(eq(wmsDocumentPhases.documentId, id))
      .orderBy(wmsDocumentPhases.phaseOrder);

    const attachments = await db.select()
      .from(wmsDocumentAttachments)
      .where(eq(wmsDocumentAttachments.documentId, id));

    let supplierData = null;
    if (document.supplierId) {
      const [supplier] = await db.select()
        .from(suppliers)
        .where(eq(suppliers.id, document.supplierId));
      supplierData = supplier;
    }

    res.json({
      ...document,
      supplier: supplierData,
      items,
      phases,
      attachments
    });
  } catch (error) {
    logger.error('Error fetching document', { error });
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

/**
 * POST /api/wms/documents
 * Create a new document
 */
router.post("/documents", rbacMiddleware, requirePermission('wms.documents.ddt.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validatedData = insertWmsDocumentSchema.parse(req.body);

    let documentNumber = validatedData.documentNumber;
    if (!documentNumber) {
      documentNumber = await generateDocumentNumber(tenantId, validatedData.documentType);
    }

    const [newDocument] = await db.insert(wmsDocuments)
      .values({
        ...validatedData,
        tenantId,
        documentNumber,
        createdBy: userId,
      })
      .returning();

    await db.insert(wmsDocumentPhases)
      .values([
        {
          documentId: newDocument.id,
          tenantId,
          phaseName: 'Creazione',
          phaseStatus: 'completed',
          phaseOrder: 1,
          completedAt: new Date(),
          completedBy: userId,
        },
        {
          documentId: newDocument.id,
          tenantId,
          phaseName: 'Validazione',
          phaseStatus: 'pending',
          phaseOrder: 2,
        },
        {
          documentId: newDocument.id,
          tenantId,
          phaseName: 'Approvazione',
          phaseStatus: 'pending',
          phaseOrder: 3,
        },
        {
          documentId: newDocument.id,
          tenantId,
          phaseName: 'Archiviazione',
          phaseStatus: 'pending',
          phaseOrder: 4,
        },
      ]);

    logger.info('Document created', { documentId: newDocument.id, tenantId });
    res.status(201).json({ success: true, data: newDocument });
  } catch (error) {
    logger.error('Error creating document', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create document" });
  }
});

/**
 * Helper function to generate document number from template
 */
async function generateDocumentNumber(tenantId: string, documentType: string): Promise<string> {
  const [config] = await db.select()
    .from(wmsDocumentNumberingConfig)
    .where(and(
      eq(wmsDocumentNumberingConfig.tenantId, tenantId),
      eq(wmsDocumentNumberingConfig.documentType, documentType)
    ));

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let template = '{N}';
  let paddingLength = 4;
  let currentCounter = 1;

  if (config) {
    template = config.template;
    paddingLength = config.paddingLength;
    
    if (config.resetAnnually && config.lastResetYear !== year) {
      currentCounter = 1;
      await db.update(wmsDocumentNumberingConfig)
        .set({ currentCounter: 1, lastResetYear: year, updatedAt: new Date() })
        .where(eq(wmsDocumentNumberingConfig.id, config.id));
    } else {
      currentCounter = config.currentCounter + 1;
      await db.update(wmsDocumentNumberingConfig)
        .set({ currentCounter, updatedAt: new Date() })
        .where(eq(wmsDocumentNumberingConfig.id, config.id));
    }
  }

  let documentNumber = template
    .replace('{N}', String(currentCounter).padStart(paddingLength, '0'))
    .replace('{YYYY}', String(year))
    .replace('{YY}', String(year).slice(-2))
    .replace('{MM}', month)
    .replace('{DD}', day);

  return documentNumber;
}

/**
 * PATCH /api/wms/documents/:id/status
 * Update document status (approve, reject, archive, cancel)
 */
router.patch("/documents/:id/status", rbacMiddleware, requirePermission('wms.documents.ddt.edit'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (status === 'confirmed') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
      
      await db.update(wmsDocumentPhases)
        .set({ phaseStatus: 'completed', completedAt: new Date(), completedBy: userId })
        .where(and(
          eq(wmsDocumentPhases.documentId, id),
          eq(wmsDocumentPhases.phaseName, 'Approvazione')
        ));
    } else if (status === 'cancelled') {
      updateData.cancelledBy = userId;
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = reason;
    } else if (status === 'archived') {
      await db.update(wmsDocumentPhases)
        .set({ phaseStatus: 'completed', completedAt: new Date(), completedBy: userId })
        .where(and(
          eq(wmsDocumentPhases.documentId, id),
          eq(wmsDocumentPhases.phaseName, 'Archiviazione')
        ));
    }

    const [updated] = await db.update(wmsDocuments)
      .set(updateData)
      .where(and(
        eq(wmsDocuments.id, id),
        eq(wmsDocuments.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating document status', { error });
    res.status(500).json({ error: "Failed to update document status" });
  }
});

/**
 * GET /api/wms/documents/numbering-config
 * Get document numbering configurations
 */
router.get("/documents/numbering-config", rbacMiddleware, requirePermission('wms.settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const configs = await db.select()
      .from(wmsDocumentNumberingConfig)
      .where(eq(wmsDocumentNumberingConfig.tenantId, tenantId));

    res.json(configs);
  } catch (error) {
    logger.error('Error fetching numbering configs', { error });
    res.status(500).json({ error: "Failed to fetch numbering configurations" });
  }
});

/**
 * POST /api/wms/documents/numbering-config
 * Create or update document numbering configuration
 */
router.post("/documents/numbering-config", rbacMiddleware, requirePermission('wms.settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const validatedData = insertWmsDocumentNumberingConfigSchema.parse(req.body);

    const [existing] = await db.select()
      .from(wmsDocumentNumberingConfig)
      .where(and(
        eq(wmsDocumentNumberingConfig.tenantId, tenantId),
        eq(wmsDocumentNumberingConfig.documentType, validatedData.documentType)
      ));

    if (existing) {
      const [updated] = await db.update(wmsDocumentNumberingConfig)
        .set({
          ...validatedData,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(wmsDocumentNumberingConfig.id, existing.id))
        .returning();
      
      res.json({ success: true, data: updated });
    } else {
      const [created] = await db.insert(wmsDocumentNumberingConfig)
        .values({
          ...validatedData,
          tenantId,
          currentCounter: 0,
          lastResetYear: new Date().getFullYear(),
        })
        .returning();

      res.status(201).json({ success: true, data: created });
    }
  } catch (error) {
    logger.error('Error saving numbering config', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to save numbering configuration" });
  }
});

/**
 * GET /api/wms/documents/order-approval-config
 * Get order approval configuration
 */
router.get("/documents/order-approval-config", rbacMiddleware, requirePermission('wms.settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const [config] = await db.select()
      .from(wmsOrderApprovalConfig)
      .where(eq(wmsOrderApprovalConfig.tenantId, tenantId));

    res.json(config || { 
      requiresApproval: false,
      thresholdAmount: null,
      thresholdQuantity: null,
      approverRoles: [],
      notifyOnCreate: true,
      notifyOnApproval: true
    });
  } catch (error) {
    logger.error('Error fetching order approval config', { error });
    res.status(500).json({ error: "Failed to fetch order approval configuration" });
  }
});

/**
 * POST /api/wms/documents/order-approval-config
 * Create or update order approval configuration
 */
router.post("/documents/order-approval-config", rbacMiddleware, requirePermission('wms.settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant ID not found" });
    }

    const validatedData = insertWmsOrderApprovalConfigSchema.parse(req.body);

    const [existing] = await db.select()
      .from(wmsOrderApprovalConfig)
      .where(eq(wmsOrderApprovalConfig.tenantId, tenantId));

    if (existing) {
      const [updated] = await db.update(wmsOrderApprovalConfig)
        .set({
          ...validatedData,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(wmsOrderApprovalConfig.id, existing.id))
        .returning();
      
      res.json({ success: true, data: updated });
    } else {
      const [created] = await db.insert(wmsOrderApprovalConfig)
        .values({
          ...validatedData,
          tenantId,
        })
        .returning();

      res.status(201).json({ success: true, data: created });
    }
  } catch (error) {
    logger.error('Error saving order approval config', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to save order approval configuration" });
  }
});

export default router;
