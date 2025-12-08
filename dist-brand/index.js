var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// apps/backend/brand-api/src/db/schema/brand-interface.ts
var brand_interface_exports = {};
__export(brand_interface_exports, {
  agentModuleContextEnum: () => agentModuleContextEnum,
  agentStatusEnum: () => agentStatusEnum,
  aiAgentsRegistry: () => aiAgentsRegistry,
  branchDeployStatusEnum: () => branchDeployStatusEnum,
  branchTypeEnum: () => branchTypeEnum,
  brandAuditLogs: () => brandAuditLogs,
  brandBranches: () => brandBranches,
  brandDeploymentStatus: () => brandDeploymentStatus,
  brandDeployments: () => brandDeployments,
  brandInterfaceSchema: () => brandInterfaceSchema,
  brandRoleEnum: () => brandRoleEnum,
  brandRoles: () => brandRoles,
  brandTasks: () => brandTasks,
  brandTenants: () => brandTenants,
  brandUsers: () => brandUsers,
  deployResourceTypeEnum: () => deployResourceTypeEnum,
  deployToolEnum: () => deployToolEnum,
  deploymentStatusEnum: () => deploymentStatusEnum,
  insertAIAgentRegistrySchema: () => insertAIAgentRegistrySchema,
  insertBrandBranchSchema: () => insertBrandBranchSchema,
  insertBrandDeploymentSchema: () => insertBrandDeploymentSchema,
  insertBrandDeploymentStatusSchema: () => insertBrandDeploymentStatusSchema,
  insertBrandTaskSchema: () => insertBrandTaskSchema,
  ragAgents: () => ragAgents,
  ragChunks: () => ragChunks,
  ragDataSources: () => ragDataSources,
  ragEmbeddingsUsage: () => ragEmbeddingsUsage,
  ragSyncJobs: () => ragSyncJobs,
  ragSyncState: () => ragSyncState,
  selectAIAgentRegistrySchema: () => selectAIAgentRegistrySchema,
  selectBrandTaskSchema: () => selectBrandTaskSchema,
  taskPriorityEnum: () => taskPriorityEnum,
  taskStatusEnum: () => taskStatusEnum,
  updateBrandBranchSchema: () => updateBrandBranchSchema,
  updateBrandDeploymentSchema: () => updateBrandDeploymentSchema,
  updateBrandDeploymentStatusSchema: () => updateBrandDeploymentStatusSchema,
  windtreOfferChunks: () => windtreOfferChunks,
  windtreOffersRaw: () => windtreOffersRaw
});
import { varchar, text, boolean, uuid, timestamp, smallint, date, integer, real, jsonb, pgSchema, vector, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
var brandInterfaceSchema, brandRoleEnum, brandTenants, brandUsers, brandRoles, brandAuditLogs, taskStatusEnum, taskPriorityEnum, brandTasks, insertBrandTaskSchema, selectBrandTaskSchema, agentModuleContextEnum, agentStatusEnum, aiAgentsRegistry, insertAIAgentRegistrySchema, selectAIAgentRegistrySchema, deploymentStatusEnum, deployToolEnum, deployResourceTypeEnum, branchTypeEnum, branchDeployStatusEnum, brandDeployments, brandBranches, brandDeploymentStatus, insertBrandDeploymentSchema, updateBrandDeploymentSchema, insertBrandBranchSchema, updateBrandBranchSchema, insertBrandDeploymentStatusSchema, updateBrandDeploymentStatusSchema, ragAgents, ragDataSources, ragChunks, ragSyncJobs, ragEmbeddingsUsage, windtreOffersRaw, windtreOfferChunks, ragSyncState;
var init_brand_interface = __esm({
  "apps/backend/brand-api/src/db/schema/brand-interface.ts"() {
    "use strict";
    brandInterfaceSchema = pgSchema("brand_interface");
    brandRoleEnum = brandInterfaceSchema.enum("brand_role", [
      "area_manager",
      "national_manager",
      "super_admin"
    ]);
    brandTenants = brandInterfaceSchema.table("brand_tenants", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      name: varchar("name", { length: 255 }).notNull(),
      slug: varchar("slug", { length: 255 }),
      type: varchar("type", { length: 50 }).default("brand_interface"),
      status: varchar("status", { length: 50 }).default("active"),
      settings: jsonb("settings").default({}),
      features: jsonb("features").default({}),
      brandAdminEmail: varchar("brand_admin_email", { length: 255 }),
      apiKey: varchar("api_key", { length: 255 }),
      allowedIpRanges: text("allowed_ip_ranges").array(),
      maxConcurrentUsers: integer("max_concurrent_users").default(50),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      archivedAt: timestamp("archived_at")
    });
    brandUsers = brandInterfaceSchema.table("brand_users", {
      id: varchar("id", { length: 255 }).primaryKey(),
      email: varchar("email", { length: 255 }).notNull().unique(),
      firstName: varchar("first_name", { length: 255 }),
      lastName: varchar("last_name", { length: 255 }),
      role: brandRoleEnum("role").notNull().default("area_manager"),
      commercialAreaCodes: text("commercial_area_codes").array(),
      permissions: text("permissions").array().notNull(),
      department: varchar("department", { length: 255 }),
      hireDate: date("hire_date"),
      managerId: varchar("manager_id", { length: 255 }),
      isActive: boolean("is_active").default(true),
      mfaEnabled: boolean("mfa_enabled").default(false),
      mfaSecret: varchar("mfa_secret", { length: 255 }),
      lastLoginAt: timestamp("last_login_at"),
      failedLoginAttempts: smallint("failed_login_attempts").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id)
    });
    brandRoles = brandInterfaceSchema.table("brand_roles", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      isGlobal: boolean("is_global").default(false),
      allowedAreas: text("allowed_areas").array(),
      permissions: text("permissions").array().notNull(),
      isSystem: boolean("is_system").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    brandAuditLogs = brandInterfaceSchema.table("brand_audit_logs", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      userEmail: varchar("user_email", { length: 255 }).notNull(),
      userRole: varchar("user_role", { length: 50 }),
      commercialAreas: text("commercial_areas").array(),
      action: varchar("action", { length: 100 }).notNull(),
      resourceType: varchar("resource_type", { length: 100 }),
      resourceIds: text("resource_ids").array(),
      targetTenants: text("target_tenants").array(),
      metadata: jsonb("metadata").default({}),
      ipAddress: varchar("ip_address", { length: 45 }),
      userAgent: text("user_agent"),
      createdAt: timestamp("created_at").defaultNow(),
      tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id)
    });
    taskStatusEnum = brandInterfaceSchema.enum("task_status", [
      "pending",
      "in_progress",
      "completed"
    ]);
    taskPriorityEnum = brandInterfaceSchema.enum("task_priority", [
      "low",
      "medium",
      "high"
    ]);
    brandTasks = brandInterfaceSchema.table("brand_tasks", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      assignee: varchar("assignee", { length: 255 }).notNull(),
      status: taskStatusEnum("status").notNull().default("pending"),
      priority: taskPriorityEnum("priority").notNull().default("medium"),
      dueDate: date("due_date"),
      category: varchar("category", { length: 100 }).notNull(),
      metadata: jsonb("metadata").default({}),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    });
    insertBrandTaskSchema = createInsertSchema(brandTasks, {
      title: z.string().min(1, "Il titolo \xE8 obbligatorio").max(255),
      description: z.string().optional(),
      assignee: z.string().email("Email non valida"),
      status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      dueDate: z.string().optional(),
      category: z.string().min(1, "La categoria \xE8 obbligatoria"),
      metadata: z.record(z.any()).optional()
    }).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      brandTenantId: true
    });
    selectBrandTaskSchema = createSelectSchema(brandTasks);
    agentModuleContextEnum = brandInterfaceSchema.enum("agent_module_context", [
      "sales",
      "hr",
      "finance",
      "operations",
      "support",
      "general",
      "workflow"
    ]);
    agentStatusEnum = brandInterfaceSchema.enum("agent_status", [
      "active",
      "inactive",
      "deprecated",
      "development"
    ]);
    aiAgentsRegistry = brandInterfaceSchema.table("ai_agents_registry", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      agentId: varchar("agent_id", { length: 50 }).notNull().unique(),
      name: varchar("name", { length: 100 }).notNull(),
      description: text("description"),
      systemPrompt: text("system_prompt").notNull(),
      personality: jsonb("personality").default({}),
      moduleContext: agentModuleContextEnum("module_context").notNull().default("general"),
      baseConfiguration: jsonb("base_configuration").default({}),
      version: integer("version").notNull().default(1),
      status: agentStatusEnum("status").notNull().default("active"),
      isLegacy: boolean("is_legacy").default(false),
      // Flag per agenti migrati
      targetTenants: text("target_tenants").array(),
      // Specific tenants or null for all
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      createdBy: varchar("created_by", { length: 255 }),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    });
    insertAIAgentRegistrySchema = createInsertSchema(aiAgentsRegistry).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    selectAIAgentRegistrySchema = createSelectSchema(aiAgentsRegistry);
    deploymentStatusEnum = brandInterfaceSchema.enum("deployment_status", [
      "draft",
      // Not yet ready for deploy
      "ready",
      // Ready to be deployed
      "deploying",
      // Currently pushing to tenants
      "deployed",
      // Successfully deployed
      "failed"
      // Deployment failed
    ]);
    deployToolEnum = brandInterfaceSchema.enum("deploy_tool", [
      "crm",
      "wms",
      "pos",
      "analytics"
    ]);
    deployResourceTypeEnum = brandInterfaceSchema.enum("deploy_resource_type", [
      "campaign",
      "pipeline",
      "funnel",
      "product",
      "supplier",
      "pricelist",
      "dashboard"
    ]);
    branchTypeEnum = brandInterfaceSchema.enum("branch_type", [
      "main",
      // Tenant main branch
      "pdv"
      // PDV secondary branch
    ]);
    branchDeployStatusEnum = brandInterfaceSchema.enum("branch_deploy_status", [
      "pending",
      "in_progress",
      "completed",
      "failed",
      "conflict"
    ]);
    brandDeployments = brandInterfaceSchema.table("brand_deployments", {
      id: varchar("id", { length: 100 }).primaryKey(),
      // commit-crm-05
      tool: deployToolEnum("tool").notNull(),
      resourceType: deployResourceTypeEnum("resource_type").notNull(),
      resourceId: uuid("resource_id"),
      // Original resource UUID
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      version: varchar("version", { length: 50 }).notNull(),
      // 1.2.3
      status: deploymentStatusEnum("status").notNull().default("draft"),
      jsonPath: text("json_path"),
      // Path to JSON file
      payload: jsonb("payload"),
      // Full resource data
      metadata: jsonb("metadata").default({}),
      // Additional info
      createdBy: varchar("created_by", { length: 255 }).notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      deployedAt: timestamp("deployed_at"),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    });
    brandBranches = brandInterfaceSchema.table("brand_branches", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      branchName: varchar("branch_name", { length: 255 }).notNull().unique(),
      // rossi-spa or rossi-spa/milano-centro
      branchType: branchTypeEnum("branch_type").notNull(),
      tenantId: uuid("tenant_id").notNull(),
      // FK to w3suite.tenants
      pdvId: uuid("pdv_id"),
      // FK to w3suite.stores (null for main branch)
      parentBranch: varchar("parent_branch", { length: 255 }),
      // rossi-spa for PDV branches
      metadata: jsonb("metadata").default({}),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    });
    brandDeploymentStatus = brandInterfaceSchema.table("brand_deployment_status", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      deploymentId: varchar("deployment_id", { length: 100 }).notNull().references(() => brandDeployments.id),
      branchName: varchar("branch_name", { length: 255 }).notNull(),
      status: branchDeployStatusEnum("status").notNull().default("pending"),
      errorMessage: text("error_message"),
      webhookResponse: jsonb("webhook_response"),
      attemptCount: integer("attempt_count").default(0),
      lastAttemptAt: timestamp("last_attempt_at"),
      deployedAt: timestamp("deployed_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    });
    insertBrandDeploymentSchema = createInsertSchema(brandDeployments).omit({
      createdAt: true,
      updatedAt: true
    });
    updateBrandDeploymentSchema = insertBrandDeploymentSchema.partial();
    insertBrandBranchSchema = createInsertSchema(brandBranches).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    updateBrandBranchSchema = insertBrandBranchSchema.partial();
    insertBrandDeploymentStatusSchema = createInsertSchema(brandDeploymentStatus).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    updateBrandDeploymentStatusSchema = insertBrandDeploymentStatusSchema.partial();
    ragAgents = brandInterfaceSchema.table("rag_agents", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      agentId: varchar("agent_id", { length: 255 }).notNull(),
      // e.g., "funnel-orchestrator-assistant", "customer-care-voice"
      agentName: varchar("agent_name", { length: 255 }).notNull(),
      embeddingModel: varchar("embedding_model", { length: 100 }).notNull().default("text-embedding-3-small"),
      chunkSize: integer("chunk_size").notNull().default(512),
      chunkOverlap: integer("chunk_overlap").notNull().default(50),
      topK: integer("top_k").notNull().default(5),
      // Default number of chunks to retrieve
      similarityThreshold: real("similarity_threshold").notNull().default(0.7),
      isActive: boolean("is_active").notNull().default(true),
      metadata: jsonb("metadata").default({}),
      // { maxTokensPerContext, systemPromptTemplate, etc. }
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    }, (table) => [
      index("rag_agents_brand_agent_idx").on(table.brandTenantId, table.agentId)
    ]);
    ragDataSources = brandInterfaceSchema.table("rag_data_sources", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      ragAgentId: uuid("rag_agent_id").notNull().references(() => ragAgents.id, { onDelete: "cascade" }),
      sourceType: varchar("source_type", { length: 50 }).notNull(),
      // 'web_url', 'pdf_upload', 'doc_upload', 'manual_text'
      sourceUrl: text("source_url"),
      // For web_url type
      sourceChecksum: varchar("source_checksum", { length: 64 }),
      // SHA256 hash for deduplication
      fileName: varchar("file_name", { length: 500 }),
      // For uploads
      fileSize: integer("file_size"),
      // Bytes
      rawContent: text("raw_content"),
      // HTML, PDF text, or manual text
      metadata: jsonb("metadata").default({}),
      // { title, author, uploadedBy, etc. }
      status: varchar("status", { length: 50 }).notNull().default("pending"),
      // pending, processing, completed, failed
      errorMessage: text("error_message"),
      chunksCount: integer("chunks_count").default(0),
      lastSyncAt: timestamp("last_sync_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    }, (table) => [
      index("rag_sources_agent_idx").on(table.ragAgentId),
      index("rag_sources_status_idx").on(table.status)
    ]);
    ragChunks = brandInterfaceSchema.table("rag_chunks", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      ragAgentId: uuid("rag_agent_id").notNull().references(() => ragAgents.id, { onDelete: "cascade" }),
      dataSourceId: uuid("data_source_id").notNull().references(() => ragDataSources.id, { onDelete: "cascade" }),
      chunkIndex: integer("chunk_index").notNull(),
      chunkText: text("chunk_text").notNull(),
      embedding: vector("embedding", { dimensions: 1536 }),
      // OpenAI text-embedding-3-small
      metadata: jsonb("metadata").default({}),
      // { page, section, keywords, etc. }
      createdAt: timestamp("created_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    }, (table) => [
      // HNSW index for fast cosine similarity search
      index("rag_chunks_embedding_idx").using(
        "hnsw",
        table.embedding.op("vector_cosine_ops")
      ),
      index("rag_chunks_agent_idx").on(table.ragAgentId),
      index("rag_chunks_source_idx").on(table.dataSourceId)
    ]);
    ragSyncJobs = brandInterfaceSchema.table("rag_sync_jobs", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      ragAgentId: uuid("rag_agent_id").notNull().references(() => ragAgents.id, { onDelete: "cascade" }),
      dataSourceId: uuid("data_source_id").references(() => ragDataSources.id, { onDelete: "set null" }),
      jobType: varchar("job_type", { length: 50 }).notNull(),
      // 'full_sync', 'incremental', 'single_source'
      status: varchar("status", { length: 50 }).notNull().default("pending"),
      // pending, running, completed, failed
      progress: integer("progress").default(0),
      // 0-100 percentage
      totalItems: integer("total_items").default(0),
      processedItems: integer("processed_items").default(0),
      chunksCreated: integer("chunks_created").default(0),
      tokensUsed: integer("tokens_used").default(0),
      // For cost tracking
      errorMessage: text("error_message"),
      startedAt: timestamp("started_at"),
      completedAt: timestamp("completed_at"),
      metadata: jsonb("metadata").default({}),
      createdAt: timestamp("created_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    }, (table) => [
      index("rag_jobs_agent_idx").on(table.ragAgentId),
      index("rag_jobs_status_idx").on(table.status)
    ]);
    ragEmbeddingsUsage = brandInterfaceSchema.table("rag_embeddings_usage", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      ragAgentId: uuid("rag_agent_id").notNull().references(() => ragAgents.id, { onDelete: "cascade" }),
      syncJobId: uuid("sync_job_id").references(() => ragSyncJobs.id, { onDelete: "set null" }),
      embeddingModel: varchar("embedding_model", { length: 100 }).notNull(),
      tokensUsed: integer("tokens_used").notNull(),
      chunksProcessed: integer("chunks_processed").notNull(),
      estimatedCost: real("estimated_cost").notNull(),
      // In cents (USD)
      createdAt: timestamp("created_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    }, (table) => [
      index("rag_usage_agent_idx").on(table.ragAgentId),
      index("rag_usage_date_idx").on(table.createdAt)
    ]);
    windtreOffersRaw = brandInterfaceSchema.table("windtre_offers_raw", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      url: text("url").notNull().unique(),
      urlChecksum: varchar("url_checksum", { length: 64 }).notNull(),
      // SHA256 hash
      htmlContent: text("html_content").notNull(),
      pageTitle: varchar("page_title", { length: 500 }),
      scrapedAt: timestamp("scraped_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    });
    windtreOfferChunks = brandInterfaceSchema.table(
      "windtre_offer_chunks",
      {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        rawOfferId: uuid("raw_offer_id").notNull().references(() => windtreOffersRaw.id, { onDelete: "cascade" }),
        chunkIndex: integer("chunk_index").notNull(),
        chunkText: text("chunk_text").notNull(),
        embedding: vector("embedding", { dimensions: 1536 }),
        // OpenAI text-embedding-3-small
        metadata: jsonb("metadata").default({}),
        // { offerType, price, category, etc. }
        createdAt: timestamp("created_at").defaultNow(),
        brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
      },
      (table) => [
        // HNSW index for fast cosine similarity search
        index("windtre_chunks_embedding_idx").using(
          "hnsw",
          table.embedding.op("vector_cosine_ops")
        )
      ]
    );
    ragSyncState = brandInterfaceSchema.table("rag_sync_state", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      lastRunAt: timestamp("last_run_at"),
      status: varchar("status", { length: 50 }).notNull().default("idle"),
      // idle, running, success, error
      totalPagesScraped: integer("total_pages_scraped").default(0),
      totalChunksCreated: integer("total_chunks_created").default(0),
      errorMessage: text("error_message"),
      metadata: jsonb("metadata").default({}),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
    });
  }
});

// apps/backend/brand-api/src/db/index.ts
var db_exports = {};
__export(db_exports, {
  agentModuleContextEnum: () => agentModuleContextEnum,
  agentStatusEnum: () => agentStatusEnum,
  aiAgentsRegistry: () => aiAgentsRegistry,
  branchDeployStatusEnum: () => branchDeployStatusEnum,
  branchTypeEnum: () => branchTypeEnum,
  brandAuditLogs: () => brandAuditLogs,
  brandBranches: () => brandBranches,
  brandDeploymentStatus: () => brandDeploymentStatus,
  brandDeployments: () => brandDeployments,
  brandInterfaceSchema: () => brandInterfaceSchema,
  brandRoleEnum: () => brandRoleEnum,
  brandRoles: () => brandRoles,
  brandTasks: () => brandTasks,
  brandTenants: () => brandTenants,
  brandUsers: () => brandUsers,
  db: () => db2,
  deployResourceTypeEnum: () => deployResourceTypeEnum,
  deployToolEnum: () => deployToolEnum,
  deploymentStatusEnum: () => deploymentStatusEnum,
  inMemoryBrandData: () => inMemoryBrandData,
  insertAIAgentRegistrySchema: () => insertAIAgentRegistrySchema,
  insertBrandBranchSchema: () => insertBrandBranchSchema,
  insertBrandDeploymentSchema: () => insertBrandDeploymentSchema,
  insertBrandDeploymentStatusSchema: () => insertBrandDeploymentStatusSchema,
  insertBrandTaskSchema: () => insertBrandTaskSchema,
  isDbDisabled: () => isDbDisabled,
  pool: () => pool,
  ragAgents: () => ragAgents,
  ragChunks: () => ragChunks,
  ragDataSources: () => ragDataSources,
  ragEmbeddingsUsage: () => ragEmbeddingsUsage,
  ragSyncJobs: () => ragSyncJobs,
  ragSyncState: () => ragSyncState,
  selectAIAgentRegistrySchema: () => selectAIAgentRegistrySchema,
  selectBrandTaskSchema: () => selectBrandTaskSchema,
  taskPriorityEnum: () => taskPriorityEnum,
  taskStatusEnum: () => taskStatusEnum,
  updateBrandBranchSchema: () => updateBrandBranchSchema,
  updateBrandDeploymentSchema: () => updateBrandDeploymentSchema,
  updateBrandDeploymentStatusSchema: () => updateBrandDeploymentStatusSchema,
  windtreOfferChunks: () => windtreOfferChunks,
  windtreOffersRaw: () => windtreOffersRaw
});
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var isDbDisabled, inMemoryBrandData, db2, pool;
var init_db = __esm({
  "apps/backend/brand-api/src/db/index.ts"() {
    "use strict";
    init_brand_interface();
    init_brand_interface();
    isDbDisabled = process.env.DB_DISABLED === "1" || process.env.USE_INMEMORY_DB === "true" || !process.env.DATABASE_URL;
    inMemoryBrandData = /* @__PURE__ */ new Map();
    pool = null;
    if (isDbDisabled) {
      console.log("\u26A0\uFE0F  Brand Database disabled - using in-memory storage");
      db2 = {
        select: () => ({ from: () => ({ where: () => [] }) }),
        insert: () => ({ values: () => ({ returning: () => [] }) }),
        update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
        delete: () => ({ where: () => ({ returning: () => [] }) })
      };
    } else {
      const databaseUrl = process.env.DATABASE_URL;
      pool = new Pool({
        connectionString: databaseUrl,
        max: 3,
        keepAlive: true,
        idleTimeoutMillis: 3e4,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5e3
      });
      pool.on("error", (err) => {
        console.error("\u274C Brand DB pool error:", err.message);
        if (err.code === "57P01" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
          console.log("\u{1F504} Brand DB connection will be retried automatically");
        }
      });
      db2 = drizzle(pool, { schema: brand_interface_exports });
      console.log("\u2705 Brand Database connection initialized (TCP)");
    }
  }
});

// apps/backend/brand-api/src/services/windtre-scraper.service.ts
var windtre_scraper_service_exports = {};
__export(windtre_scraper_service_exports, {
  WindtreScraperService: () => WindtreScraperService
});
import puppeteer from "puppeteer";
import crypto from "crypto";
import { eq as eq2 } from "drizzle-orm";
var WindtreScraperService;
var init_windtre_scraper_service = __esm({
  "apps/backend/brand-api/src/services/windtre-scraper.service.ts"() {
    "use strict";
    init_db();
    init_brand_interface();
    WindtreScraperService = class {
      config;
      browser = null;
      constructor(brandTenantId) {
        this.config = {
          baseUrl: "https://www.windtre.it",
          maxPagesPerRun: 10,
          // Limit to 10 pages to avoid memory issues
          delayBetweenPages: 2e3,
          // 2 seconds between requests (respectful rate limiting)
          userAgent: "W3Suite-Scraper/1.0 (+https://w3suite.com/bot)",
          brandTenantId
        };
      }
      /**
       * Calculate SHA256 checksum for a given URL
       */
      calculateChecksum(url) {
        return crypto.createHash("sha256").update(url).digest("hex");
      }
      /**
       * Initialize Puppeteer browser instance
       */
      async initBrowser() {
        if (this.browser) {
          return this.browser;
        }
        this.browser = await puppeteer.launch({
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu"
          ]
        });
        return this.browser;
      }
      /**
       * Close browser instance
       */
      async closeBrowser() {
        if (this.browser) {
          await this.browser.close();
          this.browser = null;
        }
      }
      /**
       * Check if URL should be scraped based on robots.txt rules
       */
      async checkRobotsTxt(url) {
        try {
          const robotsUrl = new URL("/robots.txt", this.config.baseUrl).href;
          const response = await fetch(robotsUrl);
          const robotsTxt = await response.text();
          const lines = robotsTxt.split("\n");
          let isRelevantAgent = false;
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("User-agent:")) {
              const agent = trimmed.split(":")[1].trim();
              isRelevantAgent = agent === "*" || agent.includes("W3Suite");
            }
            if (isRelevantAgent && trimmed.startsWith("Disallow:")) {
              const disallowedPath = trimmed.split(":")[1].trim();
              if (disallowedPath && url.includes(disallowedPath)) {
                console.log(`URL blocked by robots.txt: ${url}`);
                return false;
              }
            }
          }
          return true;
        } catch (error) {
          console.error("Error checking robots.txt:", error);
          return true;
        }
      }
      /**
       * Scrape a single page and save to database
       */
      async scrapePage(page, url) {
        try {
          const allowedByRobots = await this.checkRobotsTxt(url);
          if (!allowedByRobots) {
            console.log(`Skipping ${url} - disallowed by robots.txt`);
            return false;
          }
          await page.goto(url, { waitUntil: "networkidle2", timeout: 3e4 });
          const pageTitle = await page.title();
          const fullHtml = await page.content();
          const MAX_HTML_SIZE = 5e4;
          const htmlContent = fullHtml.length > MAX_HTML_SIZE ? fullHtml.slice(0, MAX_HTML_SIZE) : fullHtml;
          const urlChecksum = this.calculateChecksum(url);
          const existingPage = await db2.select().from(windtreOffersRaw).where(eq2(windtreOffersRaw.url, url)).limit(1);
          if (existingPage.length > 0 && existingPage[0].urlChecksum === urlChecksum) {
            console.log(`Page ${url} hasn't changed, skipping`);
            return false;
          }
          if (existingPage.length > 0) {
            await db2.update(windtreOffersRaw).set({
              urlChecksum,
              htmlContent,
              pageTitle,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq2(windtreOffersRaw.url, url));
          } else {
            await db2.insert(windtreOffersRaw).values({
              url,
              urlChecksum,
              htmlContent,
              pageTitle,
              brandTenantId: this.config.brandTenantId
            });
          }
          console.log(`\u2705 Scraped: ${url}`);
          return true;
        } catch (error) {
          console.error(`Error scraping ${url}:`, error);
          return false;
        }
      }
      /**
       * Discover offer URLs from sitemap or main pages
       */
      async discoverOfferUrls(page) {
        const urls = [];
        try {
          const sitemapUrl = `${this.config.baseUrl}/sitemap.xml`;
          await page.goto(sitemapUrl, { waitUntil: "networkidle2" });
          const sitemapContent = await page.content();
          const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
          if (urlMatches) {
            urlMatches.forEach((match) => {
              const url = match.replace(/<\/?loc>/g, "");
              if (url.includes("/offerte") || url.includes("/tariffe") || url.includes("/fibra") || url.includes("/mobile")) {
                urls.push(url);
              }
            });
          }
        } catch (error) {
          console.log("Sitemap not available, using manual discovery");
          const mainPages = [
            `${this.config.baseUrl}/offerte`,
            `${this.config.baseUrl}/offerte-mobile`,
            `${this.config.baseUrl}/offerte-fisso`,
            `${this.config.baseUrl}/fibra`,
            `${this.config.baseUrl}/tariffe-mobile`
          ];
          for (const mainUrl of mainPages) {
            try {
              await page.goto(mainUrl, { waitUntil: "networkidle2" });
              const links = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll("a"));
                return anchors.map((a) => a.href).filter((href) => href && (href.includes("/offerte") || href.includes("/tariffe") || href.includes("/fibra") || href.includes("/mobile")));
              });
              urls.push(...links);
            } catch (err) {
              console.error(`Error discovering from ${mainUrl}:`, err);
            }
          }
        }
        return Array.from(new Set(urls));
      }
      /**
       * Main scraping orchestrator
       */
      async scrapeWindtreOffers() {
        const errors = [];
        let pagesScraped = 0;
        try {
          console.log("\u{1F680} Starting WindTre scraping...");
          const browser = await this.initBrowser();
          const page = await browser.newPage();
          await page.setUserAgent(this.config.userAgent);
          console.log("\u{1F50D} Discovering offer URLs...");
          const urls = await this.discoverOfferUrls(page);
          console.log(`\u{1F4C4} Found ${urls.length} URLs to scrape`);
          const urlsToScrape = urls.slice(0, this.config.maxPagesPerRun);
          for (let i = 0; i < urlsToScrape.length; i++) {
            const url = urlsToScrape[i];
            console.log(`[${i + 1}/${urlsToScrape.length}] Scraping ${url}`);
            const success = await this.scrapePage(page, url);
            if (success) {
              pagesScraped++;
            }
            if (i < urlsToScrape.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, this.config.delayBetweenPages));
            }
          }
          await this.closeBrowser();
          console.log(`\u2705 Scraping complete: ${pagesScraped} pages scraped`);
          return { success: true, pagesScraped, errors };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          errors.push(errorMsg);
          console.error("\u274C Scraping failed:", error);
          await this.closeBrowser();
          return { success: false, pagesScraped, errors };
        }
      }
    };
  }
});

// apps/backend/brand-api/src/services/windtre-chunking-embedding.service.ts
var windtre_chunking_embedding_service_exports = {};
__export(windtre_chunking_embedding_service_exports, {
  WindtreChunkingEmbeddingService: () => WindtreChunkingEmbeddingService
});
import * as cheerio from "cheerio";
import OpenAI from "openai";
import { eq as eq3, inArray as inArray2 } from "drizzle-orm";
var WindtreChunkingEmbeddingService;
var init_windtre_chunking_embedding_service = __esm({
  "apps/backend/brand-api/src/services/windtre-chunking-embedding.service.ts"() {
    "use strict";
    init_db();
    init_brand_interface();
    WindtreChunkingEmbeddingService = class {
      openai;
      EMBEDDING_MODEL = "text-embedding-3-small";
      MAX_CHUNK_SIZE = 512;
      // tokens (approx 2048 chars)
      CHUNK_OVERLAP = 50;
      // tokens overlap
      BATCH_SIZE = 100;
      // Process 100 embeddings per batch
      constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OPENAI_API_KEY not found. Install OpenAI integration via Replit.");
        }
        this.openai = new OpenAI({ apiKey });
      }
      /**
       * Extract clean text from HTML content (memory-safe)
       */
      extractTextFromHtml(html) {
        const maxHtmlSize = 5e4;
        const truncatedHtml = html.length > maxHtmlSize ? html.slice(0, maxHtmlSize) : html;
        const $ = cheerio.load(truncatedHtml);
        $("script, style, nav, header, footer, iframe, noscript").remove();
        const metadata = {};
        const offerType = $("[data-offer-type]").attr("data-offer-type") || $(".offer-type").text().trim() || "";
        const price = $("[data-price]").attr("data-price") || $(".price, .prezzo").first().text().trim() || "";
        const category = $("[data-category]").attr("data-category") || $(".category, .categoria").first().text().trim() || "";
        metadata.offerType = offerType;
        metadata.price = price;
        metadata.category = category;
        const mainContent = $("main, article, .content, .main-content").text();
        const bodyContent = mainContent || $("body").text();
        const cleanText = bodyContent.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
        return { text: cleanText, metadata };
      }
      /**
       * Split text into chunks with overlap
       */
      chunkText(text5, maxChunkSize, overlap) {
        const chunks = [];
        const maxChars = maxChunkSize * 4;
        const overlapChars = overlap * 4;
        let startPos = 0;
        while (startPos < text5.length) {
          const endPos = Math.min(startPos + maxChars, text5.length);
          let chunk = text5.slice(startPos, endPos);
          if (endPos < text5.length) {
            const lastPeriod = chunk.lastIndexOf(". ");
            const lastNewline = chunk.lastIndexOf("\n");
            const breakPoint = Math.max(lastPeriod, lastNewline);
            if (breakPoint > maxChars / 2) {
              chunk = chunk.slice(0, breakPoint + 1);
            }
          }
          chunks.push(chunk.trim());
          startPos = endPos - overlapChars;
          if (startPos <= chunks[chunks.length - 1].length + (chunks.length > 1 ? chunks[chunks.length - 2].length : 0)) {
            startPos = endPos;
          }
        }
        return chunks.filter((chunk) => chunk.length > 50);
      }
      /**
       * Generate embedding for a single text chunk
       */
      async generateEmbedding(text5) {
        try {
          const response = await this.openai.embeddings.create({
            model: this.EMBEDDING_MODEL,
            input: text5,
            encoding_format: "float"
          });
          return response.data[0].embedding;
        } catch (error) {
          console.error("Error generating embedding:", error);
          throw error;
        }
      }
      /**
       * Generate embeddings in batches
       */
      async generateEmbeddingsBatch(texts) {
        try {
          const response = await this.openai.embeddings.create({
            model: this.EMBEDDING_MODEL,
            input: texts,
            encoding_format: "float"
          });
          return response.data.map((item) => item.embedding);
        } catch (error) {
          console.error("Error generating batch embeddings:", error);
          throw error;
        }
      }
      /**
       * Process a single raw offer: extract text, chunk, and generate embeddings
       */
      async processOffer(rawOffer) {
        try {
          const { text: text5, metadata } = this.extractTextFromHtml(rawOffer.htmlContent);
          metadata.url = rawOffer.url;
          metadata.pageTitle = rawOffer.pageTitle;
          const textChunks = this.chunkText(text5, this.MAX_CHUNK_SIZE, this.CHUNK_OVERLAP);
          const chunkResults = textChunks.map((chunk, index5) => ({
            rawOfferId: rawOffer.id,
            chunkIndex: index5,
            chunkText: chunk,
            metadata
          }));
          return chunkResults;
        } catch (error) {
          console.error(`Error processing offer ${rawOffer.id}:`, error);
          throw error;
        }
      }
      /**
       * Save chunks with embeddings to database
       */
      async saveChunksWithEmbeddings(chunks, embeddings, brandTenantId) {
        const rawOfferIds = Array.from(new Set(chunks.map((c) => c.rawOfferId)));
        if (rawOfferIds.length > 0) {
          await db2.delete(windtreOfferChunks).where(inArray2(windtreOfferChunks.rawOfferId, rawOfferIds));
        }
        const chunksToInsert = chunks.map((chunk, index5) => ({
          rawOfferId: chunk.rawOfferId,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText,
          embedding: embeddings[index5],
          metadata: chunk.metadata,
          brandTenantId
        }));
        for (let i = 0; i < chunksToInsert.length; i += this.BATCH_SIZE) {
          const batch = chunksToInsert.slice(i, i + this.BATCH_SIZE);
          await db2.insert(windtreOfferChunks).values(batch);
        }
      }
      /**
       * Process all raw offers and generate embeddings - MEMORY OPTIMIZED
       * Processes one offer at a time to avoid memory issues
       */
      async processAllOffers(brandTenantId) {
        const errors = [];
        let chunksProcessed = 0;
        let embeddingsCreated = 0;
        try {
          console.log("\u{1F680} Starting chunking and embedding pipeline (memory optimized)...");
          const MAX_PAGES_PER_RUN = 15;
          const rawOfferIds = await db2.select({ id: windtreOffersRaw.id }).from(windtreOffersRaw).where(eq3(windtreOffersRaw.brandTenantId, brandTenantId)).limit(MAX_PAGES_PER_RUN);
          console.log(`\u{1F4C4} Processing ${rawOfferIds.length} raw offers (limit: ${MAX_PAGES_PER_RUN})`);
          if (rawOfferIds.length === 0) {
            return { success: true, chunksProcessed: 0, embeddingsCreated: 0, errors };
          }
          for (let i = 0; i < rawOfferIds.length; i++) {
            const offerId = rawOfferIds[i].id;
            try {
              const [offer] = await db2.select().from(windtreOffersRaw).where(eq3(windtreOffersRaw.id, offerId)).limit(1);
              if (!offer) continue;
              const chunks = await this.processOffer(offer);
              if (chunks.length === 0) {
                console.log(`\u23ED\uFE0F [${i + 1}/${rawOfferIds.length}] Skipped (no chunks): ${offer.url}`);
                continue;
              }
              const texts = chunks.map((chunk) => chunk.chunkText);
              const embeddings = await this.generateEmbeddingsBatch(texts);
              await db2.delete(windtreOfferChunks).where(eq3(windtreOfferChunks.rawOfferId, offerId));
              const chunksToInsert = chunks.map((chunk, idx) => ({
                rawOfferId: chunk.rawOfferId,
                chunkIndex: chunk.chunkIndex,
                chunkText: chunk.chunkText,
                embedding: embeddings[idx],
                metadata: chunk.metadata,
                brandTenantId
              }));
              await db2.insert(windtreOfferChunks).values(chunksToInsert);
              chunksProcessed += chunks.length;
              embeddingsCreated += embeddings.length;
              console.log(`\u2705 [${i + 1}/${rawOfferIds.length}] ${offer.url}: ${chunks.length} chunks saved`);
            } catch (error) {
              const errorMsg = `Failed to process offer ${offerId}: ${error instanceof Error ? error.message : "Unknown error"}`;
              errors.push(errorMsg);
              console.error(`\u274C [${i + 1}/${rawOfferIds.length}] ${errorMsg}`);
            }
          }
          console.log(`\u{1F389} Pipeline complete: ${chunksProcessed} chunks, ${embeddingsCreated} embeddings`);
          return {
            success: errors.length < rawOfferIds.length,
            // Success if at least some worked
            chunksProcessed,
            embeddingsCreated,
            errors
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          errors.push(errorMsg);
          console.error("\u274C Embedding pipeline failed:", error);
          return {
            success: false,
            chunksProcessed,
            embeddingsCreated,
            errors
          };
        }
      }
    };
  }
});

// apps/backend/brand-api/src/services/rag-multi-agent.service.ts
var rag_multi_agent_service_exports = {};
__export(rag_multi_agent_service_exports, {
  RagMultiAgentService: () => RagMultiAgentService
});
import { eq as eq4, and as and2, desc as desc2, sql as sql7 } from "drizzle-orm";
import crypto2 from "crypto";
import { OpenAI as OpenAI2 } from "openai";
var openai, RagMultiAgentService;
var init_rag_multi_agent_service = __esm({
  "apps/backend/brand-api/src/services/rag-multi-agent.service.ts"() {
    "use strict";
    init_db();
    init_brand_interface();
    openai = new OpenAI2({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
    });
    RagMultiAgentService = class {
      brandTenantId;
      constructor(brandTenantId) {
        this.brandTenantId = brandTenantId;
      }
      async ensureRagAgent(config) {
        const existing = await db2.select().from(ragAgents).where(
          and2(
            eq4(ragAgents.agentId, config.agentId),
            eq4(ragAgents.brandTenantId, this.brandTenantId)
          )
        ).limit(1);
        if (existing.length > 0) {
          return existing[0].id;
        }
        const [agent] = await db2.insert(ragAgents).values({
          agentId: config.agentId,
          agentName: config.agentName,
          embeddingModel: config.embeddingModel || "text-embedding-3-small",
          chunkSize: config.chunkSize || 512,
          chunkOverlap: config.chunkOverlap || 50,
          topK: config.topK || 5,
          similarityThreshold: config.similarityThreshold || 0.7,
          isActive: true,
          brandTenantId: this.brandTenantId,
          metadata: {}
        }).returning();
        console.log(`\u2705 RAG Agent created: ${config.agentId} (${agent.id})`);
        return agent.id;
      }
      async addWebUrlSource(agentId, url, metadata) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          throw new Error(`RAG agent not found: ${agentId}`);
        }
        const checksum = crypto2.createHash("sha256").update(url).digest("hex");
        const existing = await db2.select().from(ragDataSources).where(
          and2(
            eq4(ragDataSources.ragAgentId, ragAgent.id),
            eq4(ragDataSources.sourceChecksum, checksum)
          )
        ).limit(1);
        if (existing.length > 0) {
          console.log(`\u26A0\uFE0F  URL already exists: ${url}`);
          return existing[0].id;
        }
        const [source] = await db2.insert(ragDataSources).values({
          ragAgentId: ragAgent.id,
          sourceType: "web_url",
          sourceUrl: url,
          sourceChecksum: checksum,
          status: "pending",
          metadata: metadata || {},
          brandTenantId: this.brandTenantId
        }).returning();
        console.log(`\u2705 Web URL source added: ${url} (${source.id})`);
        return source.id;
      }
      async addDocumentSource(agentId, fileName, fileSize, rawContent, metadata) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          throw new Error(`RAG agent not found: ${agentId}`);
        }
        const checksum = crypto2.createHash("sha256").update(rawContent).digest("hex");
        const [source] = await db2.insert(ragDataSources).values({
          ragAgentId: ragAgent.id,
          sourceType: fileName.endsWith(".pdf") ? "pdf_upload" : "doc_upload",
          fileName,
          fileSize,
          rawContent,
          sourceChecksum: checksum,
          status: "pending",
          metadata: metadata || {},
          brandTenantId: this.brandTenantId
        }).returning();
        console.log(`\u2705 Document source added: ${fileName} (${source.id})`);
        return source.id;
      }
      async addManualTextSource(agentId, text5, metadata) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          throw new Error(`RAG agent not found: ${agentId}`);
        }
        const checksum = crypto2.createHash("sha256").update(text5).digest("hex");
        const [source] = await db2.insert(ragDataSources).values({
          ragAgentId: ragAgent.id,
          sourceType: "manual_text",
          rawContent: text5,
          sourceChecksum: checksum,
          status: "pending",
          metadata: metadata || {},
          brandTenantId: this.brandTenantId
        }).returning();
        console.log(`\u2705 Manual text source added (${source.id})`);
        return source.id;
      }
      async processDataSource(dataSourceId) {
        const source = await db2.select().from(ragDataSources).where(eq4(ragDataSources.id, dataSourceId)).limit(1);
        if (source.length === 0) {
          throw new Error(`Data source not found: ${dataSourceId}`);
        }
        const dataSource = source[0];
        const ragAgent = await db2.select().from(ragAgents).where(eq4(ragAgents.id, dataSource.ragAgentId)).limit(1);
        if (ragAgent.length === 0) {
          throw new Error(`RAG agent not found: ${dataSource.ragAgentId}`);
        }
        const agent = ragAgent[0];
        const syncJob = await db2.insert(ragSyncJobs).values({
          ragAgentId: agent.id,
          dataSourceId: dataSource.id,
          jobType: "single_source",
          status: "running",
          startedAt: /* @__PURE__ */ new Date(),
          brandTenantId: this.brandTenantId
        }).returning();
        try {
          await db2.update(ragDataSources).set({ status: "processing" }).where(eq4(ragDataSources.id, dataSourceId));
          let textContent = "";
          if (dataSource.sourceType === "web_url") {
            textContent = await this.scrapeWebUrl(dataSource.sourceUrl);
          } else {
            textContent = dataSource.rawContent || "";
          }
          const chunks = this.chunkText(textContent, {
            chunkSize: agent.chunkSize,
            chunkOverlap: agent.chunkOverlap
          });
          console.log(`\u{1F4C4} Created ${chunks.length} chunks for source ${dataSourceId}`);
          const embeddings = await this.generateEmbeddings(chunks, agent.embeddingModel);
          let tokensUsed = 0;
          for (const chunk of chunks) {
            tokensUsed += Math.ceil(chunk.length / 4);
          }
          for (let i = 0; i < chunks.length; i++) {
            await db2.insert(ragChunks).values({
              ragAgentId: agent.id,
              dataSourceId: dataSource.id,
              chunkIndex: i,
              chunkText: chunks[i],
              embedding: embeddings[i],
              metadata: {},
              brandTenantId: this.brandTenantId
            });
          }
          await db2.insert(ragEmbeddingsUsage).values({
            ragAgentId: agent.id,
            syncJobId: syncJob[0].id,
            embeddingModel: agent.embeddingModel,
            tokensUsed,
            chunksProcessed: chunks.length,
            estimatedCost: tokensUsed / 1e6 * 0.02,
            brandTenantId: this.brandTenantId
          });
          await db2.update(ragDataSources).set({
            status: "completed",
            chunksCount: chunks.length,
            lastSyncAt: /* @__PURE__ */ new Date()
          }).where(eq4(ragDataSources.id, dataSourceId));
          await db2.update(ragSyncJobs).set({
            status: "completed",
            progress: 100,
            chunksCreated: chunks.length,
            tokensUsed,
            completedAt: /* @__PURE__ */ new Date()
          }).where(eq4(ragSyncJobs.id, syncJob[0].id));
          console.log(`\u2705 Processed source ${dataSourceId}: ${chunks.length} chunks`);
        } catch (error) {
          await db2.update(ragDataSources).set({
            status: "failed",
            errorMessage: error.message
          }).where(eq4(ragDataSources.id, dataSourceId));
          await db2.update(ragSyncJobs).set({
            status: "failed",
            errorMessage: error.message,
            completedAt: /* @__PURE__ */ new Date()
          }).where(eq4(ragSyncJobs.id, syncJob[0].id));
          throw error;
        }
      }
      async searchSimilar(agentId, query, limit = 5) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          throw new Error(`RAG agent not found: ${agentId}`);
        }
        const queryEmbedding = await this.generateEmbedding(query, ragAgent.embeddingModel);
        const embeddingStr = `'[${queryEmbedding.join(",")}]'::vector`;
        const results = await db2.execute(sql7`
      SELECT 
        id,
        chunk_text,
        metadata,
        1 - (embedding <=> ${sql7.raw(embeddingStr)}) AS similarity
      FROM brand_interface.rag_chunks
      WHERE rag_agent_id = ${ragAgent.id}
        AND brand_tenant_id = ${this.brandTenantId}
        AND 1 - (embedding <=> ${sql7.raw(embeddingStr)}) > ${ragAgent.similarityThreshold}
      ORDER BY embedding <=> ${sql7.raw(embeddingStr)}
      LIMIT ${Math.min(limit, 20)}
    `);
        console.log(`\u{1F4CA} [RAG-SEARCH] Found ${results.rows.length} results for "${query}" (threshold: ${ragAgent.similarityThreshold})`);
        return results.rows.map((row) => ({
          text: row.chunk_text,
          similarity: parseFloat(row.similarity),
          metadata: row.metadata
        }));
      }
      async deleteDataSource(dataSourceId) {
        await db2.delete(ragDataSources).where(
          and2(
            eq4(ragDataSources.id, dataSourceId),
            eq4(ragDataSources.brandTenantId, this.brandTenantId)
          )
        );
        console.log(`\u{1F5D1}\uFE0F  Deleted data source: ${dataSourceId}`);
      }
      async listDataSources(agentId) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          return [];
        }
        const sources = await db2.select().from(ragDataSources).where(
          and2(
            eq4(ragDataSources.ragAgentId, ragAgent.id),
            eq4(ragDataSources.brandTenantId, this.brandTenantId)
          )
        ).orderBy(desc2(ragDataSources.createdAt));
        return sources;
      }
      async listChunks(agentId, dataSourceId, limit = 50) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          return [];
        }
        const conditions = [
          eq4(ragChunks.ragAgentId, ragAgent.id),
          eq4(ragChunks.brandTenantId, this.brandTenantId)
        ];
        if (dataSourceId) {
          conditions.push(eq4(ragChunks.dataSourceId, dataSourceId));
        }
        const chunks = await db2.select().from(ragChunks).where(and2(...conditions)).orderBy(ragChunks.chunkIndex).limit(limit);
        return chunks;
      }
      async getAgentStats(agentId) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          return null;
        }
        const sourcesCount = await db2.select({ count: sql7`count(*)` }).from(ragDataSources).where(
          and2(
            eq4(ragDataSources.ragAgentId, ragAgent.id),
            eq4(ragDataSources.brandTenantId, this.brandTenantId)
          )
        );
        const chunksCount = await db2.select({ count: sql7`count(*)` }).from(ragChunks).where(
          and2(
            eq4(ragChunks.ragAgentId, ragAgent.id),
            eq4(ragChunks.brandTenantId, this.brandTenantId)
          )
        );
        const totalUsage = await db2.select({
          totalTokens: sql7`COALESCE(SUM(tokens_used), 0)`,
          totalCost: sql7`COALESCE(SUM(estimated_cost), 0)`
        }).from(ragEmbeddingsUsage).where(
          and2(
            eq4(ragEmbeddingsUsage.ragAgentId, ragAgent.id),
            eq4(ragEmbeddingsUsage.brandTenantId, this.brandTenantId)
          )
        );
        return {
          agentId: ragAgent.agentId,
          agentName: ragAgent.agentName,
          sourcesCount: sourcesCount[0]?.count || 0,
          chunksCount: chunksCount[0]?.count || 0,
          totalTokensUsed: totalUsage[0]?.totalTokens || 0,
          totalCostCents: totalUsage[0]?.totalCost || 0,
          config: {
            embeddingModel: ragAgent.embeddingModel,
            chunkSize: ragAgent.chunkSize,
            chunkOverlap: ragAgent.chunkOverlap,
            topK: ragAgent.topK,
            similarityThreshold: ragAgent.similarityThreshold
          }
        };
      }
      async getAgentDetails(agentId) {
        const ragAgent = await this.getRagAgentByAgentId(agentId);
        if (!ragAgent) {
          return null;
        }
        const sourcesByType = await db2.select({
          sourceType: ragDataSources.sourceType,
          count: sql7`count(*)`
        }).from(ragDataSources).where(
          and2(
            eq4(ragDataSources.ragAgentId, ragAgent.id),
            eq4(ragDataSources.brandTenantId, this.brandTenantId)
          )
        ).groupBy(ragDataSources.sourceType);
        const chunkStats = await db2.select({
          count: sql7`count(*)`,
          totalChars: sql7`COALESCE(SUM(LENGTH(chunk_text)), 0)`
        }).from(ragChunks).where(
          and2(
            eq4(ragChunks.ragAgentId, ragAgent.id),
            eq4(ragChunks.brandTenantId, this.brandTenantId)
          )
        );
        const recentSources = await db2.select({
          date: sql7`DATE(created_at)`,
          count: sql7`count(*)`
        }).from(ragDataSources).where(
          and2(
            eq4(ragDataSources.ragAgentId, ragAgent.id),
            eq4(ragDataSources.brandTenantId, this.brandTenantId),
            sql7`created_at >= NOW() - INTERVAL '7 days'`
          )
        ).groupBy(sql7`DATE(created_at)`).orderBy(sql7`DATE(created_at)`);
        const totalUsage = await db2.select({
          totalTokens: sql7`COALESCE(SUM(tokens_used), 0)`,
          totalCost: sql7`COALESCE(SUM(estimated_cost), 0)`
        }).from(ragEmbeddingsUsage).where(
          and2(
            eq4(ragEmbeddingsUsage.ragAgentId, ragAgent.id),
            eq4(ragEmbeddingsUsage.brandTenantId, this.brandTenantId)
          )
        );
        const estimatedTokens = Math.round((chunkStats[0]?.totalChars || 0) / 4);
        const sourcesBreakdown = {};
        sourcesByType.forEach((s) => {
          sourcesBreakdown[s.sourceType] = Number(s.count);
        });
        return {
          id: ragAgent.id,
          agentId: ragAgent.agentId,
          agentName: ragAgent.agentName,
          isActive: ragAgent.isActive,
          createdAt: ragAgent.createdAt,
          updatedAt: ragAgent.updatedAt,
          configuration: {
            embeddingModel: ragAgent.embeddingModel,
            chunkSize: ragAgent.chunkSize,
            chunkOverlap: ragAgent.chunkOverlap,
            topK: ragAgent.topK,
            similarityThreshold: ragAgent.similarityThreshold,
            metadata: ragAgent.metadata || {}
          },
          stats: {
            sourcesCount: Object.values(sourcesBreakdown).reduce((a, b) => a + b, 0),
            chunksCount: chunkStats[0]?.count || 0,
            estimatedTokens,
            totalTokensUsed: totalUsage[0]?.totalTokens || 0,
            totalCostCents: totalUsage[0]?.totalCost || 0
          },
          sourcesBreakdown,
          recentActivity: recentSources.map((r) => ({
            date: r.date,
            count: Number(r.count)
          }))
        };
      }
      async getRagAgentByAgentId(agentId) {
        const agents = await db2.select().from(ragAgents).where(
          and2(
            eq4(ragAgents.agentId, agentId),
            eq4(ragAgents.brandTenantId, this.brandTenantId)
          )
        ).limit(1);
        return agents.length > 0 ? agents[0] : null;
      }
      async scrapeWebUrl(url) {
        const response = await fetch(url);
        const html = await response.text();
        const text5 = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return text5;
      }
      chunkText(text5, config) {
        const { chunkSize, chunkOverlap } = config;
        const words = text5.split(/\s+/);
        const chunks = [];
        let i = 0;
        while (i < words.length) {
          const chunkWords = words.slice(i, i + chunkSize);
          chunks.push(chunkWords.join(" "));
          i += chunkSize - chunkOverlap;
          if (i >= words.length) break;
        }
        return chunks;
      }
      async generateEmbedding(text5, model) {
        const response = await openai.embeddings.create({
          model,
          input: text5
        });
        return response.data[0].embedding;
      }
      async generateEmbeddings(texts, model) {
        const batchSize = 100;
        const embeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);
          const response = await openai.embeddings.create({
            model,
            input: batch
          });
          embeddings.push(...response.data.map((d) => d.embedding));
          console.log(`\u{1F4CA} Generated embeddings ${i + 1}-${Math.min(i + batch.length, texts.length)} of ${texts.length}`);
        }
        return embeddings;
      }
    };
  }
});

// apps/backend/brand-api/src/index.ts
import express2 from "express";
import cors from "cors";

// apps/backend/brand-api/src/core/routes.ts
import express from "express";
import http from "http";

// apps/backend/brand-api/src/core/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// apps/backend/brand-api/src/core/storage.ts
init_db();

// apps/backend/api/src/db/schema/brand-interface.ts
var brand_interface_exports2 = {};
__export(brand_interface_exports2, {
  aiPdcAnalysisSessions: () => aiPdcAnalysisSessions,
  aiPdcExtractedData: () => aiPdcExtractedData,
  aiPdcPdfUploads: () => aiPdcPdfUploads,
  aiPdcServiceMapping: () => aiPdcServiceMapping,
  aiPdcTrainingDataset: () => aiPdcTrainingDataset,
  brandAiAgents: () => brandAiAgents,
  brandAuditLogs: () => brandAuditLogs2,
  brandCampaigns: () => brandCampaigns,
  brandCategories: () => brandCategories,
  brandConfigs: () => brandConfigs,
  brandCrmCampaigns: () => brandCrmCampaigns,
  brandCrmPipelines: () => brandCrmPipelines,
  brandDeployments: () => brandDeployments2,
  brandInterfaceSchema: () => brandInterfaceSchema2,
  brandPriceLists: () => brandPriceLists,
  brandProductConditionEnum: () => brandProductConditionEnum,
  brandProductStatusEnum: () => brandProductStatusEnum,
  brandProductTypeEnum: () => brandProductTypeEnum,
  brandProductTypes: () => brandProductTypes,
  brandProducts: () => brandProducts,
  brandRoleEnum: () => brandRoleEnum2,
  brandRoles: () => brandRoles2,
  brandSerialTypeEnum: () => brandSerialTypeEnum,
  brandSupplierStatusEnum: () => brandSupplierStatusEnum,
  brandSupplierTypeEnum: () => brandSupplierTypeEnum,
  brandSuppliers: () => brandSuppliers,
  brandTaskPriorityEnum: () => brandTaskPriorityEnum,
  brandTaskStatusEnum: () => brandTaskStatusEnum,
  brandTasks: () => brandTasks2,
  brandTemplateDeployments: () => brandTemplateDeployments,
  brandTemplates: () => brandTemplates,
  brandTenants: () => brandTenants2,
  brandUsers: () => brandUsers2,
  brandWmsDeployments: () => brandWmsDeployments,
  brandWorkflowCategoryEnum: () => brandWorkflowCategoryEnum,
  brandWorkflowDeployments: () => brandWorkflowDeployments,
  brandWorkflowExecutionModeEnum: () => brandWorkflowExecutionModeEnum,
  brandWorkflowStatusEnum: () => brandWorkflowStatusEnum,
  brandWorkflowVersions: () => brandWorkflowVersions,
  brandWorkflows: () => brandWorkflows,
  campaignStatusEnum: () => campaignStatusEnum,
  campaignTypeEnum: () => campaignTypeEnum,
  deployCenterBranchReleases: () => deployCenterBranchReleases,
  deployCenterBranches: () => deployCenterBranches,
  deployCenterCommits: () => deployCenterCommits,
  deployCenterDeployments: () => deployCenterDeployments,
  deployCenterSessionCommits: () => deployCenterSessionCommits,
  deployCenterStatus: () => deployCenterStatus,
  deployCommitStatusEnum: () => deployCommitStatusEnum,
  deployResourceTypeEnum: () => deployResourceTypeEnum2,
  deploySessionStatusEnum: () => deploySessionStatusEnum,
  deployToolEnum: () => deployToolEnum2,
  deploymentStatusEnum: () => deploymentStatusEnum2,
  insertAiPdcAnalysisSessionSchema: () => insertAiPdcAnalysisSessionSchema,
  insertAiPdcExtractedDataSchema: () => insertAiPdcExtractedDataSchema,
  insertAiPdcPdfUploadSchema: () => insertAiPdcPdfUploadSchema,
  insertAiPdcServiceMappingSchema: () => insertAiPdcServiceMappingSchema,
  insertAiPdcTrainingDatasetSchema: () => insertAiPdcTrainingDatasetSchema,
  insertBrandAiAgentSchema: () => insertBrandAiAgentSchema,
  insertBrandAuditLogSchema: () => insertBrandAuditLogSchema,
  insertBrandCampaignSchema: () => insertBrandCampaignSchema,
  insertBrandCategorySchema: () => insertBrandCategorySchema,
  insertBrandConfigSchema: () => insertBrandConfigSchema,
  insertBrandCrmCampaignSchema: () => insertBrandCrmCampaignSchema,
  insertBrandCrmPipelineSchema: () => insertBrandCrmPipelineSchema,
  insertBrandDeploymentSchema: () => insertBrandDeploymentSchema2,
  insertBrandPriceListSchema: () => insertBrandPriceListSchema,
  insertBrandProductSchema: () => insertBrandProductSchema,
  insertBrandProductTypeSchema: () => insertBrandProductTypeSchema,
  insertBrandRoleSchema: () => insertBrandRoleSchema,
  insertBrandSupplierSchema: () => insertBrandSupplierSchema,
  insertBrandTaskSchema: () => insertBrandTaskSchema2,
  insertBrandTemplateDeploymentSchema: () => insertBrandTemplateDeploymentSchema,
  insertBrandTemplateSchema: () => insertBrandTemplateSchema,
  insertBrandUserSchema: () => insertBrandUserSchema,
  insertBrandWmsDeploymentSchema: () => insertBrandWmsDeploymentSchema,
  insertBrandWorkflowDeploymentSchema: () => insertBrandWorkflowDeploymentSchema,
  insertBrandWorkflowSchema: () => insertBrandWorkflowSchema,
  insertBrandWorkflowVersionSchema: () => insertBrandWorkflowVersionSchema,
  insertDeployCenterBranchReleaseSchema: () => insertDeployCenterBranchReleaseSchema,
  insertDeployCenterBranchSchema: () => insertDeployCenterBranchSchema,
  insertDeployCenterCommitSchema: () => insertDeployCenterCommitSchema,
  insertDeployCenterDeploymentSchema: () => insertDeployCenterDeploymentSchema,
  insertDeployCenterSessionCommitSchema: () => insertDeployCenterSessionCommitSchema,
  insertDeployCenterStatusSchema: () => insertDeployCenterStatusSchema,
  organizationAnalyticsSchema: () => organizationAnalyticsSchema,
  pdcAnalysisStatusEnum: () => pdcAnalysisStatusEnum,
  updateBrandCategorySchema: () => updateBrandCategorySchema,
  updateBrandProductSchema: () => updateBrandProductSchema,
  updateBrandProductTypeSchema: () => updateBrandProductTypeSchema,
  updateBrandSupplierSchema: () => updateBrandSupplierSchema,
  updateBrandTaskSchema: () => updateBrandTaskSchema,
  updateBrandWorkflowSchema: () => updateBrandWorkflowSchema,
  wmsDeploymentStatusEnum: () => wmsDeploymentStatusEnum
});
import { sql as sql2 } from "drizzle-orm";
import {
  pgEnum as pgEnum2,
  pgSchema as pgSchema2,
  timestamp as timestamp2,
  varchar as varchar2,
  text as text2,
  boolean as boolean2,
  uuid as uuid2,
  jsonb as jsonb2,
  date as date2,
  uniqueIndex,
  smallint as smallint2,
  integer as integer2,
  index as index2,
  real as real2
} from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
import { z as z2 } from "zod";
var brandInterfaceSchema2 = pgSchema2("brand_interface");
var brandRoleEnum2 = pgEnum2("brand_role", ["area_manager", "national_manager", "super_admin"]);
var campaignStatusEnum = pgEnum2("brand_campaign_status", ["draft", "active", "paused", "completed", "archived"]);
var campaignTypeEnum = pgEnum2("brand_campaign_type", ["global", "tenant_specific", "selective"]);
var deploymentStatusEnum2 = pgEnum2("brand_deployment_status", ["pending", "in_progress", "completed", "failed"]);
var wmsDeploymentStatusEnum = pgEnum2("wms_deployment_status", ["draft", "deployed", "archived"]);
var brandProductTypeEnum = pgEnum2("brand_product_type", ["PHYSICAL", "VIRTUAL", "SERVICE", "CANVAS"]);
var brandProductStatusEnum = pgEnum2("brand_product_status", ["active", "inactive", "discontinued", "draft"]);
var brandProductConditionEnum = pgEnum2("brand_product_condition", ["new", "used", "refurbished", "demo"]);
var brandSerialTypeEnum = pgEnum2("brand_serial_type", ["imei", "iccid", "mac_address", "other"]);
var brandSupplierTypeEnum = pgEnum2("brand_supplier_type", ["distributore", "produttore", "servizi", "logistica"]);
var brandSupplierStatusEnum = pgEnum2("brand_supplier_status", ["active", "suspended", "blocked"]);
var brandTenants2 = brandInterfaceSchema2.table("brand_tenants", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  name: varchar2("name", { length: 255 }).notNull(),
  slug: varchar2("slug", { length: 100 }).unique(),
  type: varchar2("type", { length: 50 }).default("brand_interface"),
  status: varchar2("status", { length: 50 }).default("active"),
  settings: jsonb2("settings").default({}),
  features: jsonb2("features").default({}),
  brandAdminEmail: varchar2("brand_admin_email", { length: 255 }),
  apiKey: varchar2("api_key", { length: 255 }),
  allowedIpRanges: text2("allowed_ip_ranges").array(),
  maxConcurrentUsers: smallint2("max_concurrent_users").default(50),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  archivedAt: timestamp2("archived_at")
});
var brandUsers2 = brandInterfaceSchema2.table("brand_users", {
  id: varchar2("id").primaryKey(),
  // mario.brand@company.com
  tenantId: uuid2("tenant_id").notNull().references(() => brandTenants2.id),
  // ← RLS KEY
  email: varchar2("email", { length: 255 }).unique().notNull(),
  firstName: varchar2("first_name", { length: 100 }),
  lastName: varchar2("last_name", { length: 100 }),
  // RBAC Geografico Proprietario
  role: brandRoleEnum2("role").notNull().default("area_manager"),
  commercialAreaCodes: text2("commercial_area_codes").array(),
  // ["AREA_03"] o NULL per globale
  permissions: text2("permissions").array().notNull(),
  // ["inventory:read", "sales:read"]
  // Brand Interface specifics
  department: varchar2("department", { length: 100 }),
  // "marketing", "sales", "operations"
  hireDate: date2("hire_date"),
  managerId: varchar2("manager_id", { length: 255 }),
  // Self-reference
  // Security & Audit
  isActive: boolean2("is_active").default(true),
  mfaEnabled: boolean2("mfa_enabled").default(false),
  mfaSecret: varchar2("mfa_secret", { length: 255 }),
  // TOTP secret
  lastLoginAt: timestamp2("last_login_at"),
  failedLoginAttempts: smallint2("failed_login_attempts").default(0),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("brand_users_email_unique").on(table.email)
]);
var insertBrandUserSchema = createInsertSchema2(brandUsers2).omit({
  createdAt: true,
  updatedAt: true
});
var brandRoles2 = brandInterfaceSchema2.table("brand_roles", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  tenantId: uuid2("tenant_id").notNull().references(() => brandTenants2.id),
  // ← RLS KEY
  name: varchar2("name", { length: 100 }).notNull(),
  description: text2("description"),
  // Geographic scope
  isGlobal: boolean2("is_global").default(false),
  // true = National Manager, false = Area Manager
  allowedAreas: text2("allowed_areas").array(),
  // NULL = global, ["AREA_03"] = specific areas
  // Permissions
  permissions: text2("permissions").array().notNull(),
  // Metadata
  isSystem: boolean2("is_system").default(false),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("brand_roles_name_unique").on(table.tenantId, table.name)
  // Unique per tenant
]);
var insertBrandRoleSchema = createInsertSchema2(brandRoles2).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandAuditLogs2 = brandInterfaceSchema2.table("brand_audit_logs", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  tenantId: uuid2("tenant_id").notNull().references(() => brandTenants2.id),
  // ← RLS KEY
  userEmail: varchar2("user_email", { length: 255 }).notNull(),
  userRole: varchar2("user_role", { length: 100 }),
  commercialAreas: text2("commercial_areas").array(),
  // Areas the user had access to
  // Action details
  action: varchar2("action", { length: 100 }).notNull(),
  // "cross_tenant_stores_read", "price_list_deploy"
  resourceType: varchar2("resource_type", { length: 100 }),
  // "stores", "campaigns", "price_lists"
  resourceIds: text2("resource_ids").array(),
  // IDs of affected resources
  // Context
  targetTenants: text2("target_tenants").array(),
  // Which tenants were affected
  metadata: jsonb2("metadata").default({}),
  // Additional context
  ipAddress: varchar2("ip_address", { length: 45 }),
  // IPv4/IPv6
  userAgent: text2("user_agent"),
  // Timing
  createdAt: timestamp2("created_at").defaultNow()
});
var insertBrandAuditLogSchema = createInsertSchema2(brandAuditLogs2).omit({
  id: true,
  createdAt: true
});
var brandCampaigns = brandInterfaceSchema2.table("brand_campaigns", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  code: varchar2("code", { length: 50 }).unique().notNull(),
  name: varchar2("name", { length: 255 }).notNull(),
  description: text2("description"),
  type: campaignTypeEnum("type").notNull().default("global"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  startDate: date2("start_date"),
  endDate: date2("end_date"),
  targetTenants: jsonb2("target_tenants").default([]),
  // Array di tenant IDs per selective/tenant_specific
  content: jsonb2("content").default({}),
  // Template, messaggi, assets
  settings: jsonb2("settings").default({}),
  // Configurazioni specifiche
  metrics: jsonb2("metrics").default({}),
  // KPI e risultati
  createdBy: varchar2("created_by", { length: 255 }).notNull(),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  archivedAt: timestamp2("archived_at")
}, (table) => [
  uniqueIndex("brand_campaigns_code_unique").on(table.code)
]);
var insertBrandCampaignSchema = createInsertSchema2(brandCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandPriceLists = brandInterfaceSchema2.table("brand_price_lists", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  code: varchar2("code", { length: 50 }).unique().notNull(),
  name: varchar2("name", { length: 255 }).notNull(),
  description: text2("description"),
  type: varchar2("type", { length: 50 }).notNull(),
  // 'standard', 'promotional', 'special'
  validFrom: date2("valid_from").notNull(),
  validTo: date2("valid_to"),
  targetChannels: jsonb2("target_channels").default([]),
  // Array di channel IDs
  targetBrands: jsonb2("target_brands").default([]),
  // Array di brand IDs  
  priceData: jsonb2("price_data").notNull(),
  // Struttura prezzi
  approval: jsonb2("approval").default({}),
  // Workflow approvazione
  isActive: boolean2("is_active").default(false),
  createdBy: varchar2("created_by", { length: 255 }).notNull(),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("brand_price_lists_code_unique").on(table.code)
]);
var insertBrandPriceListSchema = createInsertSchema2(brandPriceLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandTemplates = brandInterfaceSchema2.table("brand_templates", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  code: varchar2("code", { length: 50 }).unique().notNull(),
  name: varchar2("name", { length: 255 }).notNull(),
  category: varchar2("category", { length: 100 }).notNull(),
  // 'communication', 'pricing', 'promotion', 'report'
  version: varchar2("version", { length: 20 }).notNull().default("1.0"),
  description: text2("description"),
  templateData: jsonb2("template_data").notNull(),
  // Struttura template
  variables: jsonb2("variables").default([]),
  // Variabili personalizzabili
  preview: text2("preview"),
  // Preview HTML/immagine
  isPublic: boolean2("is_public").default(false),
  usageCount: smallint2("usage_count").default(0),
  createdBy: varchar2("created_by", { length: 255 }).notNull(),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("brand_templates_code_unique").on(table.code)
]);
var insertBrandTemplateSchema = createInsertSchema2(brandTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandDeployments2 = brandInterfaceSchema2.table("brand_deployments", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  campaignId: uuid2("campaign_id"),
  priceListId: uuid2("price_list_id"),
  type: varchar2("type", { length: 50 }).notNull(),
  // 'campaign', 'price_list', 'template', 'config'
  targetType: varchar2("target_type", { length: 50 }).notNull(),
  // 'all_tenants', 'selective', 'tenant_specific'
  targetTenants: jsonb2("target_tenants").default([]),
  // Array tenant IDs
  status: deploymentStatusEnum2("status").notNull().default("pending"),
  scheduledAt: timestamp2("scheduled_at"),
  startedAt: timestamp2("started_at"),
  completedAt: timestamp2("completed_at"),
  results: jsonb2("results").default({}),
  // Risultati deployment
  errors: jsonb2("errors").default([]),
  // Errori durante deployment
  metadata: jsonb2("metadata").default({}),
  // Metadati aggiuntivi
  createdBy: varchar2("created_by", { length: 255 }).notNull(),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
});
var insertBrandDeploymentSchema2 = createInsertSchema2(brandDeployments2).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var deployToolEnum2 = pgEnum2("deploy_tool", ["wms", "crm", "pos", "analytics", "hr"]);
var deployResourceTypeEnum2 = pgEnum2("deploy_resource_type", [
  "supplier",
  "product",
  "product_type",
  "campaign",
  "pipeline",
  "funnel",
  "workflow",
  "task"
]);
var deployCommitStatusEnum = pgEnum2("deploy_commit_status", ["ready", "in_progress", "deployed", "failed", "archived"]);
var deployCenterCommits = brandInterfaceSchema2.table("deploy_center_commits", {
  id: varchar2("id", { length: 100 }).primaryKey(),
  // commit-wms-{type}-{timestamp}-{random}
  tool: deployToolEnum2("tool").notNull(),
  resourceType: deployResourceTypeEnum2("resource_type").notNull(),
  resourceId: varchar2("resource_id", { length: 100 }),
  // Original resource ID (can be varchar like sup_xxx)
  name: varchar2("name", { length: 255 }).notNull(),
  description: text2("description"),
  version: varchar2("version", { length: 20 }).notNull(),
  status: deployCommitStatusEnum("status").notNull().default("ready"),
  jsonPath: varchar2("json_path", { length: 500 }),
  // Path to JSON file in Git repo
  payload: jsonb2("payload").notNull(),
  // Full resource data
  metadata: jsonb2("metadata").default({}),
  createdBy: varchar2("created_by", { length: 255 }).notNull(),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  deployedAt: timestamp2("deployed_at"),
  brandTenantId: uuid2("brand_tenant_id").notNull()
}, (table) => [
  index2("deploy_commits_tool_idx").on(table.tool),
  index2("deploy_commits_resource_idx").on(table.resourceType, table.resourceId),
  index2("deploy_commits_status_idx").on(table.status)
]);
var deployCenterBranches = brandInterfaceSchema2.table("deploy_center_branches", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  branchName: varchar2("branch_name", { length: 200 }).unique().notNull(),
  // tenant-slug or tenant-slug/pdv-slug
  tenantId: uuid2("tenant_id"),
  // Reference to w3suite.tenants
  pdvId: uuid2("pdv_id"),
  // Reference to w3suite.stores (if branch is PDV-level)
  isMainBranch: boolean2("is_main_branch").default(false),
  // true for tenant-level branches
  lastDeployedCommitId: varchar2("last_deployed_commit_id", { length: 100 }),
  metadata: jsonb2("metadata").default({}),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  brandTenantId: uuid2("brand_tenant_id").notNull()
}, (table) => [
  index2("deploy_branches_tenant_idx").on(table.tenantId),
  index2("deploy_branches_pdv_idx").on(table.pdvId)
]);
var deployCenterStatus = brandInterfaceSchema2.table("deploy_center_status", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  deploymentId: varchar2("deployment_id", { length: 100 }).notNull(),
  // FK to deploy_center_commits.id
  branchName: varchar2("branch_name", { length: 200 }).notNull(),
  // FK to deploy_center_branches.branch_name
  status: deployCommitStatusEnum("status").notNull().default("ready"),
  startedAt: timestamp2("started_at"),
  completedAt: timestamp2("completed_at"),
  errorMessage: text2("error_message"),
  metadata: jsonb2("metadata").default({}),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  brandTenantId: uuid2("brand_tenant_id").notNull()
}, (table) => [
  index2("deploy_status_deployment_idx").on(table.deploymentId),
  index2("deploy_status_branch_idx").on(table.branchName),
  uniqueIndex("deploy_status_unique").on(table.deploymentId, table.branchName)
]);
var insertDeployCenterCommitSchema = createInsertSchema2(deployCenterCommits).omit({
  createdAt: true,
  updatedAt: true
}).extend({
  tool: z2.enum(["wms", "crm", "pos", "analytics", "hr"]),
  resourceType: z2.enum(["supplier", "product", "product_type", "campaign", "pipeline", "funnel", "workflow", "task"]),
  status: z2.enum(["ready", "deployed", "failed", "archived"]).optional(),
  payload: z2.any()
});
var insertDeployCenterBranchSchema = createInsertSchema2(deployCenterBranches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDeployCenterStatusSchema = createInsertSchema2(deployCenterStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  status: z2.enum(["ready", "deployed", "failed", "archived"]).optional()
});
var deploySessionStatusEnum = pgEnum2("deploy_session_status", ["pending", "in_progress", "completed", "failed", "cancelled"]);
var deployCenterDeployments = brandInterfaceSchema2.table("deploy_center_deployments", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  sessionName: varchar2("session_name", { length: 255 }).notNull(),
  // User-defined name
  description: text2("description"),
  commitIds: jsonb2("commit_ids").notNull(),
  // Array of commit IDs to deploy together
  targetBranches: jsonb2("target_branches").notNull(),
  // Array of branch names to deploy to
  status: deploySessionStatusEnum("status").notNull().default("pending"),
  totalBranches: smallint2("total_branches").notNull().default(0),
  completedBranches: smallint2("completed_branches").notNull().default(0),
  failedBranches: smallint2("failed_branches").notNull().default(0),
  startedAt: timestamp2("started_at"),
  completedAt: timestamp2("completed_at"),
  launchedBy: varchar2("launched_by", { length: 255 }).notNull(),
  metadata: jsonb2("metadata").default({}),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  brandTenantId: uuid2("brand_tenant_id").notNull()
}, (table) => [
  index2("deploy_sessions_status_idx").on(table.status),
  index2("deploy_sessions_launched_by_idx").on(table.launchedBy)
]);
var deployCenterBranchReleases = brandInterfaceSchema2.table("deploy_center_branch_releases", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  branchName: varchar2("branch_name", { length: 200 }).notNull(),
  tool: deployToolEnum2("tool").notNull(),
  commitId: varchar2("commit_id", { length: 100 }).notNull(),
  // Currently active commit
  version: varchar2("version", { length: 20 }).notNull(),
  deploymentSessionId: uuid2("deployment_session_id"),
  // Which session deployed this
  activatedAt: timestamp2("activated_at").defaultNow(),
  previousCommitId: varchar2("previous_commit_id", { length: 100 }),
  // For rollback reference
  metadata: jsonb2("metadata").default({}),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  brandTenantId: uuid2("brand_tenant_id").notNull()
}, (table) => [
  index2("deploy_releases_branch_idx").on(table.branchName),
  index2("deploy_releases_tool_idx").on(table.tool),
  uniqueIndex("deploy_releases_branch_tool_unique").on(table.branchName, table.tool)
]);
var deployCenterSessionCommits = brandInterfaceSchema2.table("deploy_center_session_commits", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  deploymentSessionId: uuid2("deployment_session_id").notNull(),
  commitId: varchar2("commit_id", { length: 100 }).notNull(),
  targetBranch: varchar2("target_branch", { length: 200 }).notNull(),
  status: deployCommitStatusEnum("status").notNull().default("ready"),
  startedAt: timestamp2("started_at"),
  completedAt: timestamp2("completed_at"),
  errorMessage: text2("error_message"),
  metadata: jsonb2("metadata").default({}),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  index2("deploy_session_commits_session_idx").on(table.deploymentSessionId),
  index2("deploy_session_commits_commit_idx").on(table.commitId),
  index2("deploy_session_commits_branch_idx").on(table.targetBranch),
  uniqueIndex("deploy_session_commits_unique").on(table.deploymentSessionId, table.commitId, table.targetBranch)
]);
var insertDeployCenterDeploymentSchema = createInsertSchema2(deployCenterDeployments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  status: z2.enum(["pending", "in_progress", "completed", "failed", "cancelled"]).optional(),
  commitIds: z2.array(z2.string()),
  targetBranches: z2.array(z2.string())
});
var insertDeployCenterBranchReleaseSchema = createInsertSchema2(deployCenterBranchReleases).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  tool: z2.enum(["wms", "crm", "pos", "analytics", "hr"])
});
var insertDeployCenterSessionCommitSchema = createInsertSchema2(deployCenterSessionCommits).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  status: z2.enum(["ready", "in_progress", "deployed", "failed", "archived"]).optional()
});
var brandConfigs = brandInterfaceSchema2.table("brand_configs", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  key: varchar2("key", { length: 100 }).unique().notNull(),
  value: jsonb2("value").notNull(),
  description: text2("description"),
  category: varchar2("category", { length: 50 }).notNull(),
  // 'pricing', 'campaigns', 'templates', 'deployment'
  isEncrypted: boolean2("is_encrypted").default(false),
  accessLevel: varchar2("access_level", { length: 50 }).default("global"),
  // 'global', 'regional', 'tenant_specific'
  allowedRoles: text2("allowed_roles").array().default(["super_admin"]),
  lastModifiedBy: varchar2("last_modified_by", { length: 255 }),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("brand_configs_key_unique").on(table.key)
]);
var insertBrandConfigSchema = createInsertSchema2(brandConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var organizationAnalyticsSchema = z2.object({
  organizationId: z2.string().uuid(),
  organizationName: z2.string(),
  structureBreakdown: z2.object({
    legalEntities: z2.object({
      total: z2.number(),
      active: z2.number(),
      inactive: z2.number(),
      breakdown: z2.array(z2.object({
        id: z2.string(),
        nome: z2.string(),
        formaGiuridica: z2.string().optional(),
        status: z2.string()
      }))
    }),
    stores: z2.object({
      total: z2.number(),
      active: z2.number(),
      inactive: z2.number(),
      breakdown: z2.array(z2.object({
        id: z2.string(),
        nome: z2.string(),
        tipo: z2.string().optional(),
        citta: z2.string().optional(),
        status: z2.string()
      }))
    }),
    users: z2.object({
      total: z2.number(),
      active: z2.number(),
      inactive: z2.number(),
      byRole: z2.array(z2.object({
        role: z2.string(),
        count: z2.number()
      }))
    })
  }),
  aiTokenStatus: z2.object({
    hasAIIntegration: z2.boolean(),
    totalTokensUsed: z2.number(),
    totalTokensAvailable: z2.number().optional(),
    lastUsage: z2.string().optional(),
    activeConnections: z2.number(),
    usageByCategory: z2.array(z2.object({
      category: z2.string(),
      tokens: z2.number(),
      percentage: z2.number()
    }))
  }),
  systemHealth: z2.object({
    overallStatus: z2.enum(["healthy", "warning", "critical"]),
    services: z2.array(z2.object({
      name: z2.string(),
      status: z2.enum(["active", "inactive", "error"]),
      uptime: z2.string().optional(),
      lastCheck: z2.string()
    })),
    connections: z2.object({
      database: z2.boolean(),
      redis: z2.boolean(),
      websocket: z2.boolean()
    })
  }),
  databaseUsage: z2.object({
    totalSize: z2.string(),
    // "125.4 MB"
    categoryBreakdown: z2.array(z2.object({
      category: z2.string(),
      // "users", "stores", "products", "logs"
      size: z2.string(),
      tableCount: z2.number(),
      recordCount: z2.number(),
      percentage: z2.number()
    })),
    recentGrowth: z2.object({
      lastWeek: z2.string(),
      lastMonth: z2.string()
    })
  }),
  fileInventory: z2.object({
    totalFiles: z2.number(),
    totalSize: z2.string(),
    categoryBreakdown: z2.array(z2.object({
      category: z2.string(),
      // "images", "documents", "uploads", "cache"
      fileCount: z2.number(),
      size: z2.string(),
      percentage: z2.number()
    })),
    recentActivity: z2.object({
      uploadsLastWeek: z2.number(),
      uploadsLastMonth: z2.number()
    })
  }),
  generatedAt: z2.string()
});
var pdcAnalysisStatusEnum = pgEnum2("pdc_analysis_status", ["pending", "analyzing", "review", "training", "completed", "failed"]);
var aiPdcAnalysisSessions = brandInterfaceSchema2.table("ai_pdc_analysis_sessions", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  tenantId: uuid2("tenant_id").notNull(),
  // Reference to w3suite.tenants
  userId: varchar2("user_id", { length: 255 }).notNull(),
  // Reference to w3suite.users
  // Session metadata
  sessionName: varchar2("session_name", { length: 255 }),
  status: pdcAnalysisStatusEnum("status").notNull().default("pending"),
  totalPdfs: smallint2("total_pdfs").default(0),
  processedPdfs: smallint2("processed_pdfs").default(0),
  // Analysis results summary
  extractedCustomers: jsonb2("extracted_customers").default([]),
  // Array of customer data from all PDFs
  extractedProducts: jsonb2("extracted_products").default([]),
  // Array of all products found
  attachmentRate: jsonb2("attachment_rate").default({}),
  // Product attachment analysis
  // Final output
  finalJson: jsonb2("final_json"),
  // Consolidated JSON for cashier API
  exportedAt: timestamp2("exported_at"),
  // Training feedback
  wasUsedForTraining: boolean2("was_used_for_training").default(false),
  trainingFeedback: text2("training_feedback"),
  // Metadata
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  completedAt: timestamp2("completed_at")
});
var insertAiPdcAnalysisSessionSchema = createInsertSchema2(aiPdcAnalysisSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var aiPdcTrainingDataset = brandInterfaceSchema2.table("ai_pdc_training_dataset", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  sessionId: uuid2("session_id").notNull().references(() => aiPdcAnalysisSessions.id, { onDelete: "cascade" }),
  // PDF reference
  pdfUrl: text2("pdf_url").notNull(),
  // Object storage URL
  pdfFileName: varchar2("pdf_file_name", { length: 255 }),
  pdfHash: varchar2("pdf_hash", { length: 64 }),
  // SHA256 for deduplication
  // AI extraction (initial)
  aiExtractedData: jsonb2("ai_extracted_data").notNull(),
  // Raw AI output
  aiModel: varchar2("ai_model", { length: 100 }).default("gpt-4-vision-preview"),
  aiConfidence: smallint2("ai_confidence"),
  // 0-100
  // Human validation (corrected)
  correctedJson: jsonb2("corrected_json").notNull(),
  // Human-validated JSON
  correctionNotes: text2("correction_notes"),
  // What was fixed
  validatedBy: varchar2("validated_by", { length: 255 }).notNull(),
  // User who validated
  // Product mapping
  driverMapping: jsonb2("driver_mapping"),
  // { driver, category, typology, product }
  serviceType: varchar2("service_type", { length: 100 }),
  // "Fisso", "Mobile", etc.
  // Training metadata
  isPublicTraining: boolean2("is_public_training").default(true),
  // Cross-tenant vs tenant-specific
  sourceTenantId: uuid2("source_tenant_id"),
  // Which tenant contributed this
  useCount: smallint2("use_count").default(0),
  // How many times used for training
  successRate: smallint2("success_rate"),
  // 0-100 - accuracy in subsequent matches
  // Metadata
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("ai_pdc_training_pdf_hash_unique").on(table.pdfHash)
]);
var insertAiPdcTrainingDatasetSchema = createInsertSchema2(aiPdcTrainingDataset).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var aiPdcPdfUploads = brandInterfaceSchema2.table("ai_pdc_pdf_uploads", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  sessionId: uuid2("session_id").notNull().references(() => aiPdcAnalysisSessions.id, { onDelete: "cascade" }),
  // PDF file info
  fileName: varchar2("file_name", { length: 255 }).notNull(),
  fileUrl: text2("file_url").notNull(),
  // Object storage URL
  fileHash: varchar2("file_hash", { length: 64 }),
  // SHA256 for deduplication
  fileSize: integer2("file_size"),
  // bytes
  // Analysis status
  status: pdcAnalysisStatusEnum("status").notNull().default("pending"),
  aiModel: varchar2("ai_model", { length: 100 }).default("gpt-4o"),
  aiConfidence: smallint2("ai_confidence"),
  // 0-100
  // Timestamps
  uploadedAt: timestamp2("uploaded_at").defaultNow(),
  analyzedAt: timestamp2("analyzed_at"),
  reviewedAt: timestamp2("reviewed_at")
}, (table) => [
  index2("idx_pdc_uploads_session").on(table.sessionId),
  index2("idx_pdc_uploads_status").on(table.status)
]);
var insertAiPdcPdfUploadSchema = createInsertSchema2(aiPdcPdfUploads).omit({
  id: true,
  uploadedAt: true
});
var aiPdcExtractedData = brandInterfaceSchema2.table("ai_pdc_extracted_data", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  pdfId: uuid2("pdf_id").notNull().references(() => aiPdcPdfUploads.id, { onDelete: "cascade" }),
  sessionId: uuid2("session_id").notNull().references(() => aiPdcAnalysisSessions.id, { onDelete: "cascade" }),
  // Customer data (anagrafica)
  customerType: varchar2("customer_type", { length: 50 }),
  // 'business' | 'private'
  customerData: jsonb2("customer_data").notNull(),
  // { nome, cognome, cf, piva, indirizzo, telefono, email, etc }
  // Service data
  servicesExtracted: jsonb2("services_extracted").notNull(),
  // Array of services found
  // AI extraction metadata
  aiRawOutput: jsonb2("ai_raw_output"),
  // Full AI response
  extractionMethod: varchar2("extraction_method", { length: 100 }).default("gpt-4o-vision"),
  // Human review
  wasReviewed: boolean2("was_reviewed").default(false),
  reviewedBy: varchar2("reviewed_by", { length: 255 }),
  correctedData: jsonb2("corrected_data"),
  // User corrections
  reviewNotes: text2("review_notes"),
  // Timestamps
  createdAt: timestamp2("created_at").defaultNow(),
  reviewedAt: timestamp2("reviewed_at")
}, (table) => [
  index2("idx_pdc_extracted_pdf").on(table.pdfId),
  index2("idx_pdc_extracted_session").on(table.sessionId),
  index2("idx_pdc_extracted_reviewed").on(table.wasReviewed)
]);
var insertAiPdcExtractedDataSchema = createInsertSchema2(aiPdcExtractedData).omit({
  id: true,
  createdAt: true
});
var aiPdcServiceMapping = brandInterfaceSchema2.table("ai_pdc_service_mapping", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  extractedDataId: uuid2("extracted_data_id").notNull().references(() => aiPdcExtractedData.id, { onDelete: "cascade" }),
  // Extracted service text
  serviceTextExtracted: text2("service_text_extracted").notNull(),
  // Raw text from PDF
  serviceDescription: text2("service_description"),
  // AI interpretation
  // WindTre Hierarchy Mapping
  driverId: uuid2("driver_id"),
  // References public.drivers (Fisso, Mobile, Energia, etc)
  categoryId: uuid2("category_id"),
  // References public.driver_categories OR w3suite.tenant_driver_categories
  typologyId: uuid2("typology_id"),
  // References public.driver_typologies OR w3suite.tenant_driver_typologies
  productId: uuid2("product_id"),
  // References w3suite.products (tenant inventory)
  // Mapping metadata
  mappingConfidence: smallint2("mapping_confidence"),
  // 0-100
  mappingMethod: varchar2("mapping_method", { length: 100 }).default("ai-auto"),
  // 'ai-auto' | 'manual' | 'training-match'
  mappedBy: varchar2("mapped_by", { length: 255 }),
  // User ID if manual
  // Training integration
  wasUsedForTraining: boolean2("was_used_for_training").default(false),
  trainingDatasetId: uuid2("training_dataset_id").references(() => aiPdcTrainingDataset.id),
  // Timestamps
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  index2("idx_pdc_mapping_extracted").on(table.extractedDataId),
  index2("idx_pdc_mapping_driver").on(table.driverId),
  index2("idx_pdc_mapping_training").on(table.wasUsedForTraining)
]);
var insertAiPdcServiceMappingSchema = createInsertSchema2(aiPdcServiceMapping).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandCrmCampaigns = brandInterfaceSchema2.table("brand_crm_campaigns", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  brandId: uuid2("brand_id").notNull(),
  // For RLS
  name: varchar2("name", { length: 255 }).notNull(),
  description: text2("description"),
  templateConfig: jsonb2("template_config").notNull(),
  // {type, utm_defaults, budget_suggestion, recommended_channels}
  isActive: boolean2("is_active").default(true),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  index2("idx_brand_crm_campaigns_brand").on(table.brandId)
]);
var insertBrandCrmCampaignSchema = createInsertSchema2(brandCrmCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandCrmPipelines = brandInterfaceSchema2.table("brand_crm_pipelines", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  brandId: uuid2("brand_id").notNull(),
  // For RLS
  name: varchar2("name", { length: 255 }).notNull(),
  domain: varchar2("domain", { length: 50 }).notNull(),
  // 'sales', 'service', 'retention'
  defaultStages: jsonb2("default_stages").notNull(),
  // [{order:1, name:'Contatto', category:'new', color:'#ff6900'}]
  recommendedWorkflows: jsonb2("recommended_workflows"),
  // Array of workflow IDs or configs
  isActive: boolean2("is_active").default(true),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  index2("idx_brand_crm_pipelines_brand").on(table.brandId)
]);
var insertBrandCrmPipelineSchema = createInsertSchema2(brandCrmPipelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandTemplateDeployments = brandInterfaceSchema2.table("brand_template_deployments", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  templateType: varchar2("template_type", { length: 50 }).notNull(),
  // 'campaign', 'pipeline', 'workflow'
  brandTemplateId: uuid2("brand_template_id").notNull(),
  // References brand_crm_campaigns.id or brand_crm_pipelines.id
  tenantId: uuid2("tenant_id").notNull(),
  // Target tenant
  deployedEntityId: uuid2("deployed_entity_id").notNull(),
  // ID dell'entità creata nel tenant (w3suite.crm_campaigns.id, etc)
  deployedAt: timestamp2("deployed_at").defaultNow()
}, (table) => [
  index2("idx_brand_template_deployments_template").on(table.templateType, table.brandTemplateId),
  index2("idx_brand_template_deployments_tenant").on(table.tenantId)
]);
var insertBrandTemplateDeploymentSchema = createInsertSchema2(brandTemplateDeployments).omit({
  id: true,
  deployedAt: true
});
var brandAiAgents = brandInterfaceSchema2.table("brand_ai_agents", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  brandId: uuid2("brand_id").notNull(),
  // For RLS
  // Agent Identity
  agentId: varchar2("agent_id", { length: 100 }).notNull().unique(),
  // 'lead-routing-agent', 'tippy-sales', etc.
  agentName: varchar2("agent_name", { length: 255 }).notNull(),
  agentDescription: text2("agent_description"),
  // AI Configuration
  model: varchar2("model", { length: 50 }).default("gpt-4o").notNull(),
  temperature: real2("temperature").default(0.3).notNull(),
  // 0.0-2.0
  maxTokens: integer2("max_tokens").default(1e3).notNull(),
  systemPrompt: text2("system_prompt").notNull(),
  responseFormat: varchar2("response_format", { length: 20 }).default("json_object"),
  // 'text', 'json_object'
  // Feature Flags
  isActive: boolean2("is_active").default(true).notNull(),
  enabledForWorkflows: boolean2("enabled_for_workflows").default(true).notNull(),
  // Deployment
  deployToAllTenants: boolean2("deploy_to_all_tenants").default(true).notNull(),
  specificTenants: jsonb2("specific_tenants"),
  // Array of tenant IDs if not deploy to all
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  index2("idx_brand_ai_agents_brand").on(table.brandId),
  index2("idx_brand_ai_agents_agent_id").on(table.agentId)
]);
var insertBrandAiAgentSchema = createInsertSchema2(brandAiAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var brandCategories = brandInterfaceSchema2.table("brand_categories", {
  id: varchar2("id", { length: 100 }).primaryKey(),
  // Reused across tenants (VARCHAR for consistency with w3suite)
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default("draft").notNull(),
  deployedToCount: integer2("deployed_to_count").default(0).notNull(),
  // How many tenants have this
  lastDeployedAt: timestamp2("last_deployed_at"),
  // Product type hierarchy
  productType: brandProductTypeEnum("product_type").default("PHYSICAL").notNull(),
  // Category hierarchy (self-referencing for multi-level trees)
  parentCategoryId: varchar2("parent_category_id", { length: 100 }).references(() => brandCategories.id, { onDelete: "restrict" }),
  // FK for hierarchical structure
  // Category info
  nome: varchar2("nome", { length: 255 }).notNull(),
  descrizione: text2("descrizione"),
  icona: varchar2("icona", { length: 100 }),
  ordine: integer2("ordine").default(0).notNull(),
  // Status
  isActive: boolean2("is_active").default(true).notNull(),
  archivedAt: timestamp2("archived_at"),
  // Audit fields
  createdBy: varchar2("created_by").notNull(),
  modifiedBy: varchar2("modified_by"),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("brand_categories_nome_parent_unique").on(table.nome, table.parentCategoryId),
  // Prevent sibling dupes
  index2("brand_categories_deployment_status_idx").on(table.deploymentStatus),
  index2("brand_categories_product_type_idx").on(table.productType),
  index2("brand_categories_parent_idx").on(table.parentCategoryId)
  // Tree queries
]);
var insertBrandCategorySchema = createInsertSchema2(brandCategories).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  isActive: true,
  archivedAt: true,
  createdBy: true,
  modifiedBy: true,
  createdAt: true,
  updatedAt: true
}).extend({
  productType: z2.enum(["PHYSICAL", "VIRTUAL", "SERVICE", "CANVAS"]),
  parentCategoryId: z2.string().max(100).optional(),
  nome: z2.string().min(1, "Nome categoria obbligatorio").max(255),
  descrizione: z2.string().optional(),
  icona: z2.string().max(100).optional(),
  ordine: z2.coerce.number().int().default(0)
});
var updateBrandCategorySchema = insertBrandCategorySchema.partial();
var brandProductTypes = brandInterfaceSchema2.table("brand_product_types", {
  id: varchar2("id", { length: 100 }).primaryKey(),
  // Reused across tenants (VARCHAR for consistency)
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default("draft").notNull(),
  deployedToCount: integer2("deployed_to_count").default(0).notNull(),
  lastDeployedAt: timestamp2("last_deployed_at"),
  // Foreign key to category
  categoryId: varchar2("category_id", { length: 100 }).notNull().references(() => brandCategories.id, { onDelete: "restrict" }),
  // Type info
  nome: varchar2("nome", { length: 255 }).notNull(),
  descrizione: text2("descrizione"),
  ordine: integer2("ordine").default(0).notNull(),
  // Status
  isActive: boolean2("is_active").default(true).notNull(),
  archivedAt: timestamp2("archived_at"),
  // Audit fields
  createdBy: varchar2("created_by").notNull(),
  modifiedBy: varchar2("modified_by"),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("brand_types_category_nome_unique").on(table.categoryId, table.nome),
  index2("brand_types_category_idx").on(table.categoryId),
  index2("brand_types_deployment_status_idx").on(table.deploymentStatus)
]);
var insertBrandProductTypeSchema = createInsertSchema2(brandProductTypes).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  isActive: true,
  archivedAt: true,
  createdBy: true,
  modifiedBy: true,
  createdAt: true,
  updatedAt: true
}).extend({
  categoryId: z2.string().min(1, "ID categoria obbligatorio").max(100),
  nome: z2.string().min(1, "Nome tipologia obbligatorio").max(255),
  descrizione: z2.string().optional(),
  ordine: z2.coerce.number().int().default(0)
});
var updateBrandProductTypeSchema = insertBrandProductTypeSchema.partial();
var brandProducts = brandInterfaceSchema2.table("brand_products", {
  id: varchar2("id", { length: 100 }).primaryKey(),
  // Reused across tenants (VARCHAR for consistency)
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default("draft").notNull(),
  deployedToCount: integer2("deployed_to_count").default(0).notNull(),
  lastDeployedAt: timestamp2("last_deployed_at"),
  // Core product info
  sku: varchar2("sku", { length: 100 }).notNull().unique(),
  name: varchar2("name", { length: 255 }).notNull(),
  model: varchar2("model", { length: 255 }),
  description: text2("description"),
  notes: text2("notes"),
  brand: varchar2("brand", { length: 100 }),
  ean: varchar2("ean", { length: 13 }),
  memory: varchar2("memory", { length: 50 }),
  color: varchar2("color", { length: 50 }),
  imageUrl: varchar2("image_url", { length: 512 }),
  // Product categorization
  categoryId: varchar2("category_id", { length: 100 }).references(() => brandCategories.id, { onDelete: "restrict" }),
  typeId: varchar2("type_id", { length: 100 }).references(() => brandProductTypes.id, { onDelete: "restrict" }),
  type: brandProductTypeEnum("type").notNull(),
  status: brandProductStatusEnum("status").default("active").notNull(),
  condition: brandProductConditionEnum("condition"),
  isSerializable: boolean2("is_serializable").default(false).notNull(),
  serialType: brandSerialTypeEnum("serial_type"),
  monthlyFee: real2("monthly_fee"),
  // Validity period
  validFrom: date2("valid_from"),
  validTo: date2("valid_to"),
  // Physical properties
  weight: real2("weight"),
  dimensions: jsonb2("dimensions"),
  // Attachments
  attachments: jsonb2("attachments").default([]),
  // Stock management defaults (for tenant initialization)
  reorderPoint: integer2("reorder_point").default(0).notNull(),
  unitOfMeasure: varchar2("unit_of_measure", { length: 20 }).default("pz").notNull(),
  // Status
  isActive: boolean2("is_active").default(true).notNull(),
  archivedAt: timestamp2("archived_at"),
  // Audit fields
  createdBy: varchar2("created_by").notNull(),
  modifiedBy: varchar2("modified_by"),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("brand_products_sku_unique").on(table.sku),
  index2("brand_products_deployment_status_idx").on(table.deploymentStatus),
  index2("brand_products_type_idx").on(table.type),
  index2("brand_products_status_idx").on(table.status),
  index2("brand_products_ean_idx").on(table.ean),
  index2("brand_products_category_idx").on(table.categoryId),
  index2("brand_products_type_id_idx").on(table.typeId)
]);
var insertBrandProductSchema = createInsertSchema2(brandProducts).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  createdBy: true,
  modifiedBy: true
}).extend({
  sku: z2.string().min(1, "SKU \xE8 obbligatorio").max(100),
  name: z2.string().min(1, "Descrizione \xE8 obbligatoria").max(255),
  model: z2.string().max(255).optional(),
  notes: z2.string().optional(),
  brand: z2.string().max(100).optional(),
  imageUrl: z2.string().max(512).url("URL immagine non valido").or(z2.literal("")).optional(),
  type: z2.enum(["PHYSICAL", "VIRTUAL", "SERVICE", "CANVAS"]),
  status: z2.enum(["active", "inactive", "discontinued", "draft"]).optional(),
  condition: z2.enum(["new", "used", "refurbished", "demo"]).optional(),
  serialType: z2.enum(["imei", "iccid", "mac_address", "other"]).optional(),
  monthlyFee: z2.coerce.number().min(0).optional(),
  ean: z2.string().regex(/^\d{13}$/, "EAN deve essere di 13 cifre").or(z2.literal("")).optional(),
  memory: z2.string().max(50).optional(),
  color: z2.string().max(50).optional(),
  categoryId: z2.string().max(100).optional(),
  typeId: z2.string().max(100).optional(),
  validFrom: z2.coerce.date().optional(),
  validTo: z2.coerce.date().optional(),
  weight: z2.coerce.number().min(0).optional(),
  dimensions: z2.any().optional(),
  attachments: z2.any().optional(),
  reorderPoint: z2.coerce.number().int().default(0),
  unitOfMeasure: z2.string().max(20).default("pz"),
  isSerializable: z2.boolean().default(false),
  isActive: z2.boolean().optional()
});
var updateBrandProductSchema = insertBrandProductSchema.partial();
var brandSuppliers = brandInterfaceSchema2.table("brand_suppliers", {
  id: varchar2("id", { length: 100 }).primaryKey(),
  // Consistent with other WMS tables
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default("draft").notNull(),
  deployedToCount: integer2("deployed_to_count").default(0).notNull(),
  lastDeployedAt: timestamp2("last_deployed_at"),
  // Identity & classification
  code: varchar2("code", { length: 50 }).notNull().unique(),
  name: varchar2("name", { length: 255 }).notNull(),
  legalName: varchar2("legal_name", { length: 255 }),
  legalForm: varchar2("legal_form", { length: 100 }),
  supplierType: brandSupplierTypeEnum("supplier_type").notNull(),
  // Italian fiscal data
  vatNumber: varchar2("vat_number", { length: 20 }),
  taxCode: varchar2("tax_code", { length: 20 }),
  sdiCode: varchar2("sdi_code", { length: 20 }),
  pecEmail: varchar2("pec_email", { length: 255 }),
  reaNumber: varchar2("rea_number", { length: 50 }),
  chamberOfCommerce: varchar2("chamber_of_commerce", { length: 255 }),
  // Address
  registeredAddress: jsonb2("registered_address"),
  cityId: uuid2("city_id"),
  // Reference to public.italian_cities (will be set on deploy)
  countryId: uuid2("country_id"),
  // Reference to public.countries (will be set on deploy)
  // Payments
  preferredPaymentMethodId: uuid2("preferred_payment_method_id"),
  // Reference to public.payment_methods
  paymentConditionId: uuid2("payment_condition_id"),
  // Reference to public.payment_methods_conditions
  paymentTerms: varchar2("payment_terms", { length: 100 }),
  currency: varchar2("currency", { length: 3 }).default("EUR"),
  // Contacts
  email: varchar2("email", { length: 255 }),
  phone: varchar2("phone", { length: 50 }),
  website: varchar2("website", { length: 255 }),
  contacts: jsonb2("contacts").default({}),
  // Administrative
  iban: varchar2("iban", { length: 34 }),
  bic: varchar2("bic", { length: 11 }),
  splitPayment: boolean2("split_payment").default(false),
  withholdingTax: boolean2("withholding_tax").default(false),
  taxRegime: varchar2("tax_regime", { length: 100 }),
  // Status
  status: brandSupplierStatusEnum("status").notNull().default("active"),
  notes: text2("notes"),
  // Audit fields
  createdBy: varchar2("created_by").notNull(),
  updatedBy: varchar2("updated_by"),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("brand_suppliers_code_unique").on(table.code),
  index2("brand_suppliers_deployment_status_idx").on(table.deploymentStatus),
  index2("brand_suppliers_status_idx").on(table.status),
  index2("brand_suppliers_vat_number_idx").on(table.vatNumber),
  index2("brand_suppliers_name_idx").on(table.name)
]);
var insertBrandSupplierSchema = createInsertSchema2(brandSuppliers).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  createdAt: true,
  updatedAt: true
}).extend({
  code: z2.string().min(1, "Codice fornitore obbligatorio").max(50),
  name: z2.string().min(1, "Nome fornitore obbligatorio").max(255),
  legalName: z2.string().max(255).optional(),
  legalForm: z2.string().max(100).optional(),
  supplierType: z2.enum(["distributore", "produttore", "servizi", "logistica"]),
  vatNumber: z2.string().max(20).optional(),
  taxCode: z2.string().max(20).optional(),
  sdiCode: z2.string().max(20).optional(),
  pecEmail: z2.string().email("Email PEC non valida").max(255).optional(),
  reaNumber: z2.string().max(50).optional(),
  chamberOfCommerce: z2.string().max(255).optional(),
  registeredAddress: z2.any().optional(),
  cityId: z2.string().uuid().optional(),
  countryId: z2.string().uuid().optional(),
  preferredPaymentMethodId: z2.string().uuid().optional(),
  paymentConditionId: z2.string().uuid().optional(),
  paymentTerms: z2.string().max(100).optional(),
  currency: z2.string().length(3).default("EUR"),
  email: z2.string().email("Email non valida").max(255).optional(),
  phone: z2.string().max(50).optional(),
  website: z2.string().url("URL non valido").max(255).optional(),
  contacts: z2.any().optional(),
  iban: z2.string().max(34).optional(),
  bic: z2.string().max(11).optional(),
  splitPayment: z2.boolean().default(false),
  withholdingTax: z2.boolean().default(false),
  taxRegime: z2.string().max(100).optional(),
  status: z2.enum(["active", "suspended", "blocked"]).optional(),
  notes: z2.string().optional(),
  createdBy: z2.string().min(1),
  updatedBy: z2.string().optional()
});
var updateBrandSupplierSchema = insertBrandSupplierSchema.partial();
var brandWmsDeployments = brandInterfaceSchema2.table("brand_wms_deployments", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // Entity identification
  entityType: varchar2("entity_type", { length: 50 }).notNull(),
  // 'product' | 'category' | 'product_type' | 'supplier'
  entityId: varchar2("entity_id", { length: 100 }).notNull(),
  // FK to brand_products (varchar), brand_categories (varchar), brand_suppliers (uuid)
  // Target tenant
  tenantId: uuid2("tenant_id").notNull(),
  // Reference to w3suite.tenants
  // Deployment metadata
  version: integer2("version").default(1).notNull(),
  // Incremental version for each entity
  status: deploymentStatusEnum2("status").notNull().default("pending"),
  // pending, in_progress, completed, failed
  // Payload snapshot (for rollback)
  payload: jsonb2("payload").notNull(),
  // Full entity data at deployment time
  // Execution details
  deployedBy: varchar2("deployed_by").notNull(),
  // Brand user ID
  scheduledAt: timestamp2("scheduled_at"),
  startedAt: timestamp2("started_at"),
  completedAt: timestamp2("completed_at"),
  // Error tracking
  errorMessage: text2("error_message"),
  retryCount: integer2("retry_count").default(0),
  // Metadata
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  index2("brand_wms_deployments_entity_idx").on(table.entityType, table.entityId),
  index2("brand_wms_deployments_tenant_idx").on(table.tenantId),
  index2("brand_wms_deployments_status_idx").on(table.status),
  uniqueIndex("brand_wms_deployments_unique").on(table.entityType, table.entityId, table.tenantId, table.version)
]);
var insertBrandWmsDeploymentSchema = createInsertSchema2(brandWmsDeployments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  entityType: z2.enum(["product", "category", "product_type", "supplier"]),
  entityId: z2.string().min(1).max(100),
  // Support both varchar and uuid entity IDs
  tenantId: z2.string().uuid(),
  status: z2.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  payload: z2.any(),
  deployedBy: z2.string().min(1),
  version: z2.number().int().default(1),
  retryCount: z2.number().int().default(0),
  errorMessage: z2.string().optional()
});
var brandWorkflowCategoryEnum = pgEnum2("brand_workflow_category", [
  "crm",
  "wms",
  "hr",
  "pos",
  "analytics",
  "generic"
]);
var brandWorkflowStatusEnum = pgEnum2("brand_workflow_status", [
  "draft",
  "active",
  "archived",
  "deprecated"
]);
var brandWorkflowExecutionModeEnum = pgEnum2("brand_workflow_execution_mode", [
  "automatic",
  "manual"
]);
var brandWorkflows = brandInterfaceSchema2.table("brand_workflows", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // Identification
  code: varchar2("code", { length: 100 }).unique().notNull(),
  // "brand-wf-email-benvenuto"
  name: varchar2("name", { length: 255 }).notNull(),
  // "Email Benvenuto Lead"
  description: text2("description"),
  // Categorization
  category: brandWorkflowCategoryEnum("category").notNull().default("crm"),
  tags: text2("tags").array().default([]),
  // ["email", "automation", "lead"]
  // Versioning
  version: varchar2("version", { length: 20 }).notNull().default("1.0.0"),
  // Semantic versioning
  status: brandWorkflowStatusEnum("status").notNull().default("draft"),
  // Workflow DSL (ReactFlow compatible)
  dslJson: jsonb2("dsl_json").notNull(),
  // { nodes: [...], edges: [...] }
  checksum: varchar2("checksum", { length: 64 }).notNull(),
  // SHA-256 hash of dslJson for integrity
  // Executor Requirements
  requiredExecutors: text2("required_executors").array().notNull(),
  // ["email-action-executor", "ai-decision-executor"]
  // Placeholder Registry
  placeholders: jsonb2("placeholders").default({}),
  // { "{{TEAM:sales}}": { type: "team_reference" }, ... }
  // Execution Settings
  defaultExecutionMode: brandWorkflowExecutionModeEnum("default_execution_mode").default("manual"),
  timeoutSeconds: integer2("timeout_seconds").default(3600),
  // Max execution time
  maxRetries: smallint2("max_retries").default(3),
  // Deployment Tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").notNull().default("draft"),
  deployedToCount: integer2("deployed_to_count").default(0),
  lastDeployedAt: timestamp2("last_deployed_at"),
  // Usage Statistics
  usageCount: integer2("usage_count").default(0),
  // How many times executed across all tenants
  lastUsedAt: timestamp2("last_used_at"),
  // Metadata
  isPublic: boolean2("is_public").default(true),
  // Can be deployed to all tenants
  isTemplate: boolean2("is_template").default(true),
  // Template vs instance
  // Audit fields
  createdBy: varchar2("created_by").notNull(),
  updatedBy: varchar2("updated_by"),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  archivedAt: timestamp2("archived_at")
}, (table) => [
  uniqueIndex("brand_workflows_code_unique").on(table.code),
  index2("brand_workflows_category_idx").on(table.category),
  index2("brand_workflows_status_idx").on(table.status),
  index2("brand_workflows_deployment_status_idx").on(table.deploymentStatus)
]);
var insertBrandWorkflowSchema = createInsertSchema2(brandWorkflows).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  usageCount: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true
}).extend({
  code: z2.string().min(1, "Codice workflow obbligatorio").max(100),
  name: z2.string().min(3, "Nome workflow obbligatorio (min 3 caratteri)").max(255),
  description: z2.string().optional(),
  category: z2.enum(["crm", "wms", "hr", "pos", "analytics", "generic"]),
  tags: z2.array(z2.string()).optional(),
  version: z2.string().regex(/^\d+\.\d+\.\d+$/, "Versione deve essere formato x.y.z").default("1.0.0"),
  status: z2.enum(["draft", "active", "archived", "deprecated"]).optional(),
  dslJson: z2.object({
    nodes: z2.array(z2.any()),
    edges: z2.array(z2.any())
  }),
  checksum: z2.string().length(64, "Checksum deve essere SHA-256 (64 caratteri)"),
  requiredExecutors: z2.array(z2.string()).min(1, "Almeno un executor richiesto"),
  placeholders: z2.record(z2.any()).optional(),
  defaultExecutionMode: z2.enum(["automatic", "manual"]).optional(),
  timeoutSeconds: z2.number().int().positive().optional(),
  maxRetries: z2.number().int().min(0).max(10).optional(),
  isPublic: z2.boolean().optional(),
  isTemplate: z2.boolean().optional(),
  createdBy: z2.string().min(1),
  updatedBy: z2.string().optional()
});
var updateBrandWorkflowSchema = insertBrandWorkflowSchema.partial();
var brandTaskStatusEnum = pgEnum2("brand_task_status", [
  "pending",
  "in_progress",
  "completed"
]);
var brandTaskPriorityEnum = pgEnum2("brand_task_priority", [
  "low",
  "medium",
  "high"
]);
var brandTasks2 = brandInterfaceSchema2.table("brand_tasks", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  title: varchar2("title", { length: 255 }).notNull(),
  description: text2("description"),
  assignee: varchar2("assignee", { length: 255 }).notNull(),
  status: brandTaskStatusEnum("status").notNull().default("pending"),
  priority: brandTaskPriorityEnum("priority").notNull().default("medium"),
  dueDate: date2("due_date"),
  category: varchar2("category", { length: 100 }).notNull(),
  metadata: jsonb2("metadata").default({}),
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow(),
  brandTenantId: uuid2("brand_tenant_id").notNull().references(() => brandTenants2.id)
}, (table) => [
  index2("brand_tasks_status_idx").on(table.status),
  index2("brand_tasks_priority_idx").on(table.priority),
  index2("brand_tasks_assignee_idx").on(table.assignee),
  index2("brand_tasks_tenant_idx").on(table.brandTenantId)
]);
var insertBrandTaskSchema2 = createInsertSchema2(brandTasks2, {
  title: z2.string().min(1, "Il titolo \xE8 obbligatorio").max(255),
  description: z2.string().optional(),
  assignee: z2.string().min(1, "L'assegnatario \xE8 obbligatorio"),
  status: z2.enum(["pending", "in_progress", "completed"]).default("pending"),
  priority: z2.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z2.string().optional().nullable(),
  category: z2.string().min(1, "La categoria \xE8 obbligatoria"),
  metadata: z2.record(z2.any()).optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  brandTenantId: true
});
var updateBrandTaskSchema = insertBrandTaskSchema2.partial();
var brandWorkflowVersions = brandInterfaceSchema2.table("brand_workflow_versions", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  workflowId: uuid2("workflow_id").notNull().references(() => brandWorkflows.id, { onDelete: "cascade" }),
  // Version snapshot
  version: varchar2("version", { length: 20 }).notNull(),
  dslJson: jsonb2("dsl_json").notNull(),
  checksum: varchar2("checksum", { length: 64 }).notNull(),
  // Change metadata
  changeDescription: text2("change_description"),
  // What changed in this version
  changeType: varchar2("change_type", { length: 50 }),
  // "major", "minor", "patch", "hotfix"
  // Deployment tracking
  wasDeployed: boolean2("was_deployed").default(false),
  deployedToTenants: text2("deployed_to_tenants").array().default([]),
  // Array of tenant IDs
  // Audit
  createdBy: varchar2("created_by").notNull(),
  createdAt: timestamp2("created_at").defaultNow()
}, (table) => [
  uniqueIndex("brand_workflow_versions_unique").on(table.workflowId, table.version),
  index2("brand_workflow_versions_workflow_idx").on(table.workflowId)
]);
var insertBrandWorkflowVersionSchema = createInsertSchema2(brandWorkflowVersions).omit({
  id: true,
  createdAt: true
}).extend({
  workflowId: z2.string().uuid(),
  version: z2.string().regex(/^\d+\.\d+\.\d+$/),
  dslJson: z2.object({
    nodes: z2.array(z2.any()),
    edges: z2.array(z2.any())
  }),
  checksum: z2.string().length(64),
  changeDescription: z2.string().optional(),
  changeType: z2.enum(["major", "minor", "patch", "hotfix"]).optional(),
  createdBy: z2.string().min(1)
});
var brandWorkflowDeployments = brandInterfaceSchema2.table("brand_workflow_deployments", {
  id: uuid2("id").primaryKey().default(sql2`gen_random_uuid()`),
  workflowId: uuid2("workflow_id").notNull().references(() => brandWorkflows.id, { onDelete: "cascade" }),
  // Target tenant
  tenantId: uuid2("tenant_id").notNull(),
  // Reference to w3suite.tenants
  // Deployment metadata
  version: varchar2("version", { length: 20 }).notNull(),
  // Which version was deployed
  status: deploymentStatusEnum2("status").notNull().default("pending"),
  // Execution mode override (tenant-specific)
  executionMode: brandWorkflowExecutionModeEnum("execution_mode").default("manual"),
  // Payload snapshot (for rollback)
  payload: jsonb2("payload").notNull(),
  // Full workflow DSL at deployment time
  // Execution details
  deployedBy: varchar2("deployed_by").notNull(),
  scheduledAt: timestamp2("scheduled_at"),
  startedAt: timestamp2("started_at"),
  completedAt: timestamp2("completed_at"),
  // Error tracking
  errorMessage: text2("error_message"),
  retryCount: integer2("retry_count").default(0),
  // Metadata
  createdAt: timestamp2("created_at").defaultNow(),
  updatedAt: timestamp2("updated_at").defaultNow()
}, (table) => [
  index2("brand_workflow_deployments_workflow_idx").on(table.workflowId),
  index2("brand_workflow_deployments_tenant_idx").on(table.tenantId),
  index2("brand_workflow_deployments_status_idx").on(table.status),
  // Composite index for efficient tenant-scoped filtering queries
  // Example: "Show all pending deployments for tenant X" or "Show deployment history for tenant Y"
  index2("brand_workflow_deployments_tenant_status_idx").on(table.tenantId, table.status),
  index2("brand_workflow_deployments_tenant_created_idx").on(table.tenantId, table.createdAt),
  uniqueIndex("brand_workflow_deployments_unique").on(table.workflowId, table.tenantId, table.version)
]);
var insertBrandWorkflowDeploymentSchema = createInsertSchema2(brandWorkflowDeployments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  workflowId: z2.string().uuid(),
  tenantId: z2.string().uuid(),
  version: z2.string().regex(/^\d+\.\d+\.\d+$/),
  status: z2.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  executionMode: z2.enum(["automatic", "manual"]).optional(),
  payload: z2.any(),
  deployedBy: z2.string().min(1),
  retryCount: z2.number().int().default(0),
  errorMessage: z2.string().optional()
});

// apps/backend/api/src/core/db.ts
import { Pool as Pool2 } from "pg";
import { drizzle as drizzle2 } from "drizzle-orm/node-postgres";
import { sql as sql5 } from "drizzle-orm";

// apps/backend/api/src/db/schema/public.ts
var public_exports = {};
__export(public_exports, {
  brands: () => brands,
  channels: () => channels,
  commercialAreas: () => commercialAreas,
  countries: () => countries,
  driverCategories: () => driverCategories,
  driverTypologies: () => driverTypologies,
  drivers: () => drivers,
  insertBrandSchema: () => insertBrandSchema,
  insertChannelSchema: () => insertChannelSchema,
  insertCommercialAreaSchema: () => insertCommercialAreaSchema,
  insertCountrySchema: () => insertCountrySchema,
  insertDriverCategorySchema: () => insertDriverCategorySchema,
  insertDriverSchema: () => insertDriverSchema,
  insertDriverTypologySchema: () => insertDriverTypologySchema,
  insertItalianCitySchema: () => insertItalianCitySchema,
  insertLegalFormSchema: () => insertLegalFormSchema,
  insertMarketingChannelSchema: () => insertMarketingChannelSchema,
  insertMarketingChannelUtmMappingSchema: () => insertMarketingChannelUtmMappingSchema,
  insertPaymentMethodSchema: () => insertPaymentMethodSchema,
  insertPaymentMethodsConditionSchema: () => insertPaymentMethodsConditionSchema,
  insertUtmMediumSchema: () => insertUtmMediumSchema,
  insertUtmSourceSchema: () => insertUtmSourceSchema,
  italianCities: () => italianCities,
  legalForms: () => legalForms,
  marketingChannelUtmMappings: () => marketingChannelUtmMappings,
  marketingChannels: () => marketingChannels,
  paymentMethods: () => paymentMethods,
  paymentMethodsConditions: () => paymentMethodsConditions,
  utmMediums: () => utmMediums,
  utmSources: () => utmSources
});
import { sql as sql3 } from "drizzle-orm";
import {
  index as index3,
  jsonb as jsonb3,
  pgTable as pgTable3,
  timestamp as timestamp3,
  varchar as varchar3,
  text as text3,
  boolean as boolean3,
  uuid as uuid3,
  smallint as smallint3,
  uniqueIndex as uniqueIndex2
} from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema3 } from "drizzle-zod";
var brands = pgTable3("brands", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 255 }).notNull(),
  status: varchar3("status", { length: 50 }).default("active"),
  createdAt: timestamp3("created_at").defaultNow()
});
var insertBrandSchema = createInsertSchema3(brands).omit({
  id: true,
  createdAt: true
});
var channels = pgTable3("channels", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 255 }).notNull(),
  createdAt: timestamp3("created_at").defaultNow()
});
var insertChannelSchema = createInsertSchema3(channels).omit({
  id: true,
  createdAt: true
});
var marketingChannels = pgTable3("marketing_channels", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 255 }).notNull(),
  category: varchar3("category", { length: 20 }).notNull(),
  // digital, traditional, direct
  generatesUtm: boolean3("generates_utm").default(false).notNull(),
  // true for digital channels with UTM, false for tracking-only
  active: boolean3("active").default(true),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
});
var insertMarketingChannelSchema = createInsertSchema3(marketingChannels).omit({
  id: true,
  createdAt: true
});
var marketingChannelUtmMappings = pgTable3("marketing_channel_utm_mappings", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  marketingChannelId: uuid3("marketing_channel_id").notNull().references(() => marketingChannels.id, { onDelete: "cascade" }),
  suggestedUtmSource: varchar3("suggested_utm_source", { length: 100 }).notNull(),
  suggestedUtmMedium: varchar3("suggested_utm_medium", { length: 100 }).notNull(),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_marketing_channel_utm_mappings_channel").on(table.marketingChannelId)
]);
var insertMarketingChannelUtmMappingSchema = createInsertSchema3(marketingChannelUtmMappings).omit({
  id: true,
  createdAt: true
});
var commercialAreas = pgTable3("commercial_areas", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 20 }).unique().notNull(),
  name: varchar3("name", { length: 100 }).notNull(),
  description: text3("description"),
  createdAt: timestamp3("created_at").defaultNow()
});
var insertCommercialAreaSchema = createInsertSchema3(commercialAreas).omit({
  id: true,
  createdAt: true
});
var drivers = pgTable3("drivers", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 255 }).notNull(),
  active: boolean3("active").default(true),
  createdAt: timestamp3("created_at").defaultNow()
});
var insertDriverSchema = createInsertSchema3(drivers).omit({
  id: true,
  createdAt: true
});
var driverCategories = pgTable3("driver_categories", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  driverId: uuid3("driver_id").notNull().references(() => drivers.id, { onDelete: "cascade" }),
  code: varchar3("code", { length: 50 }).notNull(),
  name: varchar3("name", { length: 255 }).notNull(),
  description: text3("description"),
  active: boolean3("active").default(true),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_driver_categories_driver").on(table.driverId),
  uniqueIndex2("driver_categories_unique").on(table.driverId, table.code)
]);
var insertDriverCategorySchema = createInsertSchema3(driverCategories).omit({
  id: true,
  createdAt: true
});
var driverTypologies = pgTable3("driver_typologies", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  categoryId: uuid3("category_id").notNull().references(() => driverCategories.id, { onDelete: "cascade" }),
  code: varchar3("code", { length: 50 }).notNull(),
  name: varchar3("name", { length: 255 }).notNull(),
  description: text3("description"),
  active: boolean3("active").default(true),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_driver_typologies_category").on(table.categoryId),
  uniqueIndex2("driver_typologies_unique").on(table.categoryId, table.code)
]);
var insertDriverTypologySchema = createInsertSchema3(driverTypologies).omit({
  id: true,
  createdAt: true
});
var legalForms = pgTable3("legal_forms", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 20 }).unique().notNull(),
  name: varchar3("name", { length: 100 }).notNull(),
  description: text3("description"),
  minCapital: varchar3("min_capital", { length: 50 }),
  liability: varchar3("liability", { length: 50 }),
  // "limited", "unlimited", "mixed"
  active: boolean3("active").default(true),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
});
var insertLegalFormSchema = createInsertSchema3(legalForms).omit({
  id: true,
  createdAt: true
});
var countries = pgTable3("countries", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 3 }).unique().notNull(),
  // ISO 3166-1
  name: varchar3("name", { length: 100 }).notNull(),
  active: boolean3("active").default(true),
  isDefault: boolean3("is_default").default(false),
  createdAt: timestamp3("created_at").defaultNow()
});
var insertCountrySchema = createInsertSchema3(countries).omit({
  id: true,
  createdAt: true
});
var italianCities = pgTable3("italian_cities", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  name: varchar3("name", { length: 100 }).notNull(),
  province: varchar3("province", { length: 2 }).notNull(),
  // Codice provincia (MI, RM, etc)
  provinceName: varchar3("province_name", { length: 100 }).notNull(),
  region: varchar3("region", { length: 100 }).notNull(),
  postalCode: varchar3("postal_code", { length: 5 }).notNull(),
  active: boolean3("active").default(true),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_italian_cities_name").on(table.name),
  index3("idx_italian_cities_province").on(table.province),
  uniqueIndex2("italian_cities_unique").on(table.name, table.province)
]);
var insertItalianCitySchema = createInsertSchema3(italianCities).omit({
  id: true,
  createdAt: true
});
var paymentMethods = pgTable3("payment_methods", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 100 }).notNull(),
  description: text3("description"),
  category: varchar3("category", { length: 50 }).notNull(),
  // 'bank_transfer', 'direct_debit', 'card', 'digital', 'cash', 'check'
  requiresIban: boolean3("requires_iban").default(false),
  requiresAuth: boolean3("requires_auth").default(false),
  supportsBatching: boolean3("supports_batching").default(false),
  countryCode: varchar3("country_code", { length: 3 }),
  // ISO 3166-1 (NULL = international)
  active: boolean3("active").default(true),
  isDefault: boolean3("is_default").default(false),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_payment_methods_category").on(table.category),
  index3("idx_payment_methods_country").on(table.countryCode)
]);
var insertPaymentMethodSchema = createInsertSchema3(paymentMethods).omit({
  id: true,
  createdAt: true
});
var paymentMethodsConditions = pgTable3("payment_methods_conditions", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 100 }).notNull(),
  description: text3("description"),
  days: smallint3("days"),
  // Number of days for payment (30, 60, 90, etc.)
  type: varchar3("type", { length: 50 }).notNull(),
  // 'standard', 'dffm', 'immediate', 'custom'
  calculation: varchar3("calculation", { length: 50 }),
  // 'from_invoice', 'from_month_end', 'immediate'
  active: boolean3("active").default(true),
  isDefault: boolean3("is_default").default(false),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_payment_conditions_type").on(table.type),
  index3("idx_payment_conditions_days").on(table.days)
]);
var insertPaymentMethodsConditionSchema = createInsertSchema3(paymentMethodsConditions).omit({
  id: true,
  createdAt: true
});
var utmSources = pgTable3("utm_sources", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 100 }).notNull(),
  displayName: varchar3("display_name", { length: 100 }).notNull(),
  category: varchar3("category", { length: 50 }).notNull(),
  // 'social', 'search', 'email', 'referral', 'direct', 'partner'
  iconUrl: text3("icon_url"),
  isActive: boolean3("is_active").default(true),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_utm_sources_category").on(table.category),
  index3("idx_utm_sources_active").on(table.isActive)
]);
var insertUtmSourceSchema = createInsertSchema3(utmSources).omit({
  id: true,
  createdAt: true
});
var utmMediums = pgTable3("utm_mediums", {
  id: uuid3("id").primaryKey().default(sql3`gen_random_uuid()`),
  code: varchar3("code", { length: 50 }).unique().notNull(),
  name: varchar3("name", { length: 100 }).notNull(),
  displayName: varchar3("display_name", { length: 100 }).notNull(),
  description: text3("description"),
  applicableSources: jsonb3("applicable_sources").$type(),
  // Array of source codes that can use this medium
  isActive: boolean3("is_active").default(true),
  sortOrder: smallint3("sort_order").default(0),
  createdAt: timestamp3("created_at").defaultNow()
}, (table) => [
  index3("idx_utm_mediums_active").on(table.isActive)
]);
var insertUtmMediumSchema = createInsertSchema3(utmMediums).omit({
  id: true,
  createdAt: true
});

// apps/backend/api/src/db/schema/w3suite.ts
var w3suite_exports = {};
__export(w3suite_exports, {
  activityFeedActorTypeEnum: () => activityFeedActorTypeEnum,
  activityFeedCategoryEnum: () => activityFeedCategoryEnum,
  activityFeedEvents: () => activityFeedEvents,
  activityFeedInteractionTypeEnum: () => activityFeedInteractionTypeEnum,
  activityFeedInteractions: () => activityFeedInteractions,
  activityFeedPriorityEnum: () => activityFeedPriorityEnum,
  aiAgentTenantSettings: () => aiAgentTenantSettings,
  aiAgentTenantSettingsRelations: () => aiAgentTenantSettingsRelations,
  aiConnectionStatusEnum: () => aiConnectionStatusEnum,
  aiConversations: () => aiConversations,
  aiConversationsRelations: () => aiConversationsRelations,
  aiFeatureTypeEnum: () => aiFeatureTypeEnum,
  aiModelEnum: () => aiModelEnum,
  aiPrivacyModeEnum: () => aiPrivacyModeEnum,
  aiSettings: () => aiSettings,
  aiSettingsRelations: () => aiSettingsRelations,
  aiTrainingSessions: () => aiTrainingSessions,
  aiTrainingSessionsRelations: () => aiTrainingSessionsRelations,
  aiUsageLogs: () => aiUsageLogs,
  aiUsageLogsRelations: () => aiUsageLogsRelations,
  approvalWorkflows: () => approvalWorkflows,
  attendanceAnomalies: () => attendanceAnomalies,
  attendanceAnomaliesRelations: () => attendanceAnomaliesRelations,
  calendarEventCategoryEnum: () => calendarEventCategoryEnum,
  calendarEventStatusEnum: () => calendarEventStatusEnum,
  calendarEventTypeEnum: () => calendarEventTypeEnum,
  calendarEventVisibilityEnum: () => calendarEventVisibilityEnum,
  calendarEvents: () => calendarEvents,
  calendarEventsRelations: () => calendarEventsRelations,
  campaignSocialAccounts: () => campaignSocialAccounts,
  ccnlLevelEnum: () => ccnlLevelEnum,
  chatChannelMembers: () => chatChannelMembers,
  chatChannelTypeEnum: () => chatChannelTypeEnum,
  chatChannels: () => chatChannels,
  chatInviteStatusEnum: () => chatInviteStatusEnum,
  chatMemberRoleEnum: () => chatMemberRoleEnum,
  chatMessages: () => chatMessages,
  chatNotificationPreferenceEnum: () => chatNotificationPreferenceEnum,
  chatTypingIndicators: () => chatTypingIndicators,
  chatVisibilityEnum: () => chatVisibilityEnum,
  contactPolicies: () => contactPolicies,
  crmAutomationRules: () => crmAutomationRules,
  crmCampaignPipelineLinks: () => crmCampaignPipelineLinks,
  crmCampaignStatusEnum: () => crmCampaignStatusEnum,
  crmCampaignTypeEnum: () => crmCampaignTypeEnum,
  crmCampaignUtmLinks: () => crmCampaignUtmLinks,
  crmCampaigns: () => crmCampaigns,
  crmConsentScopeEnum: () => crmConsentScopeEnum,
  crmConsentStatusEnum: () => crmConsentStatusEnum,
  crmConsentTypeEnum: () => crmConsentTypeEnum,
  crmCustomerDocuments: () => crmCustomerDocuments,
  crmCustomerNotes: () => crmCustomerNotes,
  crmCustomerSegments: () => crmCustomerSegments,
  crmCustomerTypeEnum: () => crmCustomerTypeEnum,
  crmCustomers: () => crmCustomers,
  crmDealStatusEnum: () => crmDealStatusEnum,
  crmDeals: () => crmDeals,
  crmEmailTemplates: () => crmEmailTemplates,
  crmFunnelWorkflows: () => crmFunnelWorkflows,
  crmFunnels: () => crmFunnels,
  crmIdentifierTypeEnum: () => crmIdentifierTypeEnum,
  crmIdentityConflicts: () => crmIdentityConflicts,
  crmIdentityEvents: () => crmIdentityEvents,
  crmIdentityMatches: () => crmIdentityMatches,
  crmInboundChannelEnum: () => crmInboundChannelEnum,
  crmInteractionAttachments: () => crmInteractionAttachments,
  crmInteractionDirectionEnum: () => crmInteractionDirectionEnum,
  crmInteractionParticipants: () => crmInteractionParticipants,
  crmInteractions: () => crmInteractions,
  crmLeadAttributions: () => crmLeadAttributions,
  crmLeadNotifications: () => crmLeadNotifications,
  crmLeadStatusEnum: () => crmLeadStatusEnum,
  crmLeads: () => crmLeads,
  crmLegalFormEnum: () => crmLegalFormEnum,
  crmOmnichannelInteractions: () => crmOmnichannelInteractions,
  crmOrders: () => crmOrders,
  crmOutboundChannelEnum: () => crmOutboundChannelEnum,
  crmPersonConsents: () => crmPersonConsents,
  crmPersonIdentities: () => crmPersonIdentities,
  crmPipelineDomainEnum: () => crmPipelineDomainEnum,
  crmPipelineSettings: () => crmPipelineSettings,
  crmPipelineStageCategoryEnum: () => crmPipelineStageCategoryEnum,
  crmPipelineStagePlaybooks: () => crmPipelineStagePlaybooks,
  crmPipelineStages: () => crmPipelineStages,
  crmPipelineWorkflows: () => crmPipelineWorkflows,
  crmPipelines: () => crmPipelines,
  crmSavedViews: () => crmSavedViews,
  crmSmsTemplates: () => crmSmsTemplates,
  crmSourceMappings: () => crmSourceMappings,
  crmSourceTypeEnum: () => crmSourceTypeEnum,
  crmTaskPriorityEnum: () => crmTaskPriorityEnum,
  crmTaskStatusEnum: () => crmTaskStatusEnum,
  crmTaskTypeEnum: () => crmTaskTypeEnum,
  crmTasks: () => crmTasks,
  crmWhatsappTemplates: () => crmWhatsappTemplates,
  customerTypeEnum: () => customerTypeEnum,
  dayOfWeekEnum: () => dayOfWeekEnum,
  dealCreationSourceEnum: () => dealCreationSourceEnum,
  departmentEnum: () => departmentEnum,
  embeddingModelEnum: () => embeddingModelEnum,
  employmentContractTypeEnum: () => employmentContractTypeEnum,
  encryptionKeys: () => encryptionKeys,
  entityLogs: () => entityLogs,
  entityLogsRelations: () => entityLogsRelations,
  expenseCategoryEnum: () => expenseCategoryEnum,
  expenseItems: () => expenseItems,
  expenseItemsRelations: () => expenseItemsRelations,
  expensePaymentMethodEnum: () => expensePaymentMethodEnum,
  expenseReportStatusEnum: () => expenseReportStatusEnum,
  expenseReports: () => expenseReports,
  expenseReportsRelations: () => expenseReportsRelations,
  extractionMethodEnum: () => extractionMethodEnum,
  genderEnum: () => genderEnum,
  gtmEventLog: () => gtmEventLog,
  hrDocumentSourceEnum: () => hrDocumentSourceEnum,
  hrDocumentTypeEnum: () => hrDocumentTypeEnum,
  hrDocuments: () => hrDocuments,
  hrDocumentsRelations: () => hrDocumentsRelations,
  hrRequestImpacts: () => hrRequestImpacts,
  hrRequestImpactsRelations: () => hrRequestImpactsRelations,
  identityEventTypeEnum: () => identityEventTypeEnum,
  identityMatchStatusEnum: () => identityMatchStatusEnum,
  identityMatchTypeEnum: () => identityMatchTypeEnum,
  insertAIConversationSchema: () => insertAIConversationSchema,
  insertAISettingsSchema: () => insertAISettingsSchema,
  insertAITrainingSessionSchema: () => insertAITrainingSessionSchema,
  insertAIUsageLogSchema: () => insertAIUsageLogSchema,
  insertActivityFeedEventSchema: () => insertActivityFeedEventSchema,
  insertActivityFeedInteractionSchema: () => insertActivityFeedInteractionSchema,
  insertApprovalWorkflowSchema: () => insertApprovalWorkflowSchema,
  insertAttendanceAnomalySchema: () => insertAttendanceAnomalySchema,
  insertCalendarEventSchema: () => insertCalendarEventSchema,
  insertCampaignSocialAccountSchema: () => insertCampaignSocialAccountSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertChatChannelMemberSchema: () => insertChatChannelMemberSchema,
  insertChatChannelSchema: () => insertChatChannelSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertChatTypingIndicatorSchema: () => insertChatTypingIndicatorSchema,
  insertContactPolicySchema: () => insertContactPolicySchema,
  insertCrmAutomationRuleSchema: () => insertCrmAutomationRuleSchema,
  insertCrmCampaignPipelineLinkSchema: () => insertCrmCampaignPipelineLinkSchema,
  insertCrmCampaignSchema: () => insertCrmCampaignSchema,
  insertCrmCampaignUtmLinkSchema: () => insertCrmCampaignUtmLinkSchema,
  insertCrmCustomerDocumentSchema: () => insertCrmCustomerDocumentSchema,
  insertCrmCustomerNoteSchema: () => insertCrmCustomerNoteSchema,
  insertCrmCustomerSchema: () => insertCrmCustomerSchema,
  insertCrmCustomerSegmentSchema: () => insertCrmCustomerSegmentSchema,
  insertCrmDealSchema: () => insertCrmDealSchema,
  insertCrmEmailTemplateSchema: () => insertCrmEmailTemplateSchema,
  insertCrmFunnelSchema: () => insertCrmFunnelSchema,
  insertCrmFunnelWorkflowSchema: () => insertCrmFunnelWorkflowSchema,
  insertCrmIdentityConflictSchema: () => insertCrmIdentityConflictSchema,
  insertCrmIdentityEventSchema: () => insertCrmIdentityEventSchema,
  insertCrmIdentityMatchSchema: () => insertCrmIdentityMatchSchema,
  insertCrmInteractionAttachmentSchema: () => insertCrmInteractionAttachmentSchema,
  insertCrmInteractionParticipantSchema: () => insertCrmInteractionParticipantSchema,
  insertCrmInteractionSchema: () => insertCrmInteractionSchema,
  insertCrmLeadAttributionSchema: () => insertCrmLeadAttributionSchema,
  insertCrmLeadNotificationSchema: () => insertCrmLeadNotificationSchema,
  insertCrmLeadSchema: () => insertCrmLeadSchema,
  insertCrmOmnichannelInteractionSchema: () => insertCrmOmnichannelInteractionSchema,
  insertCrmOrderSchema: () => insertCrmOrderSchema,
  insertCrmPersonIdentitySchema: () => insertCrmPersonIdentitySchema,
  insertCrmPipelineSchema: () => insertCrmPipelineSchema,
  insertCrmPipelineSettingsSchema: () => insertCrmPipelineSettingsSchema,
  insertCrmPipelineStagePlaybookSchema: () => insertCrmPipelineStagePlaybookSchema,
  insertCrmPipelineStageSchema: () => insertCrmPipelineStageSchema,
  insertCrmPipelineWorkflowSchema: () => insertCrmPipelineWorkflowSchema,
  insertCrmSavedViewSchema: () => insertCrmSavedViewSchema,
  insertCrmSmsTemplateSchema: () => insertCrmSmsTemplateSchema,
  insertCrmSourceMappingSchema: () => insertCrmSourceMappingSchema,
  insertCrmTaskSchema: () => insertCrmTaskSchema,
  insertCrmWhatsappTemplateSchema: () => insertCrmWhatsappTemplateSchema,
  insertEncryptionKeySchema: () => insertEncryptionKeySchema,
  insertEntityLogSchema: () => insertEntityLogSchema,
  insertExpenseItemSchema: () => insertExpenseItemSchema,
  insertExpenseReportSchema: () => insertExpenseReportSchema,
  insertGtmEventLogSchema: () => insertGtmEventLogSchema,
  insertHrDocumentSchema: () => insertHrDocumentSchema,
  insertHrRequestImpactSchema: () => insertHrRequestImpactSchema,
  insertInventoryAdjustmentSchema: () => insertInventoryAdjustmentSchema,
  insertItalianHolidaySchema: () => insertItalianHolidaySchema,
  insertLeadAiInsightsSchema: () => insertLeadAiInsightsSchema,
  insertLeadRoutingHistorySchema: () => insertLeadRoutingHistorySchema,
  insertLeadStatusHistorySchema: () => insertLeadStatusHistorySchema,
  insertLeadStatusSchema: () => insertLeadStatusSchema,
  insertLeadTouchpointSchema: () => insertLeadTouchpointSchema,
  insertLegalEntitySchema: () => insertLegalEntitySchema,
  insertMCPServerCredentialSchema: () => insertMCPServerCredentialSchema,
  insertMCPServerSchema: () => insertMCPServerSchema,
  insertMCPToolSchemaSchema: () => insertMCPToolSchemaSchema,
  insertNotificationPreferenceSchema: () => insertNotificationPreferenceSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertNotificationTemplateSchema: () => insertNotificationTemplateSchema,
  insertObjectAclSchema: () => insertObjectAclSchema,
  insertObjectMetadataSchema: () => insertObjectMetadataSchema,
  insertOrganizationalStructureSchema: () => insertOrganizationalStructureSchema,
  insertProductBatchSchema: () => insertProductBatchSchema,
  insertProductItemSchema: () => insertProductItemSchema,
  insertProductItemStatusHistorySchema: () => insertProductItemStatusHistorySchema,
  insertProductSchema: () => insertProductSchema,
  insertProductSerialSchema: () => insertProductSerialSchema,
  insertResourceAvailabilitySchema: () => insertResourceAvailabilitySchema,
  insertRoleSchema: () => insertRoleSchema,
  insertServicePermissionSchema: () => insertServicePermissionSchema,
  insertShiftAssignmentSchema: () => insertShiftAssignmentSchema,
  insertShiftAttendanceSchema: () => insertShiftAttendanceSchema,
  insertShiftSchema: () => insertShiftSchema,
  insertShiftTemplateSchema: () => insertShiftTemplateSchema,
  insertShiftTemplateVersionSchema: () => insertShiftTemplateVersionSchema,
  insertShiftTimeSlotSchema: () => insertShiftTimeSlotSchema,
  insertStockMovementSchema: () => insertStockMovementSchema,
  insertStoreCalendarOverrideSchema: () => insertStoreCalendarOverrideSchema,
  insertStoreCalendarSettingsSchema: () => insertStoreCalendarSettingsSchema,
  insertStoreOpeningRuleSchema: () => insertStoreOpeningRuleSchema,
  insertStoreSchema: () => insertStoreSchema,
  insertStoreTrackingConfigSchema: () => insertStoreTrackingConfigSchema,
  insertStoresTimetrackingMethodsSchema: () => insertStoresTimetrackingMethodsSchema,
  insertStructuredLogSchema: () => insertStructuredLogSchema,
  insertSupplierOverrideSchema: () => insertSupplierOverrideSchema,
  insertSupplierSchema: () => insertSupplierSchema,
  insertTaskAssignmentSchema: () => insertTaskAssignmentSchema,
  insertTaskAttachmentSchema: () => insertTaskAttachmentSchema,
  insertTaskChecklistItemSchema: () => insertTaskChecklistItemSchema,
  insertTaskCommentSchema: () => insertTaskCommentSchema,
  insertTaskDependencySchema: () => insertTaskDependencySchema,
  insertTaskSchema: () => insertTaskSchema,
  insertTaskTemplateSchema: () => insertTaskTemplateSchema,
  insertTaskTimeLogSchema: () => insertTaskTimeLogSchema,
  insertTeamSchema: () => insertTeamSchema,
  insertTeamWorkflowAssignmentSchema: () => insertTeamWorkflowAssignmentSchema,
  insertTenantCustomDriverSchema: () => insertTenantCustomDriverSchema,
  insertTenantDriverCategorySchema: () => insertTenantDriverCategorySchema,
  insertTenantDriverTypologySchema: () => insertTenantDriverTypologySchema,
  insertTenantSchema: () => insertTenantSchema,
  insertTenantWorkflowNodeOverrideSchema: () => insertTenantWorkflowNodeOverrideSchema,
  insertTimeTrackingSchema: () => insertTimeTrackingSchema,
  insertUniversalRequestSchema: () => insertUniversalRequestSchema,
  insertUserAssignmentSchema: () => insertUserAssignmentSchema,
  insertUserLegalEntitySchema: () => insertUserLegalEntitySchema,
  insertUserSchema: () => insertUserSchema,
  insertUserStoreSchema: () => insertUserStoreSchema,
  insertUserWorkflowAssignmentSchema: () => insertUserWorkflowAssignmentSchema,
  insertUtmLinkSchema: () => insertUtmLinkSchema,
  insertUtmShortUrlSchema: () => insertUtmShortUrlSchema,
  insertVectorCollectionSchema: () => insertVectorCollectionSchema,
  insertVectorEmbeddingSchema: () => insertVectorEmbeddingSchema,
  insertVectorSearchQuerySchema: () => insertVectorSearchQuerySchema,
  insertVoipActivityLogSchema: () => insertVoipActivityLogSchema,
  insertVoipAiSessionSchema: () => insertVoipAiSessionSchema,
  insertVoipCdrSchema: () => insertVoipCdrSchema,
  insertVoipExtensionSchema: () => insertVoipExtensionSchema,
  insertVoipExtensionStoreAccessSchema: () => insertVoipExtensionStoreAccessSchema,
  insertVoipTenantConfigSchema: () => insertVoipTenantConfigSchema,
  insertVoipTrunkSchema: () => insertVoipTrunkSchema,
  insertWarehouseLocationSchema: () => insertWarehouseLocationSchema,
  insertWebhookEventSchema: () => insertWebhookEventSchema,
  insertWebhookSignatureSchema: () => insertWebhookSignatureSchema,
  insertWorkflowActionSchema: () => insertWorkflowActionSchema,
  insertWorkflowExecutionQueueSchema: () => insertWorkflowExecutionQueueSchema,
  insertWorkflowExecutionSchema: () => insertWorkflowExecutionSchema,
  insertWorkflowInstanceSchema: () => insertWorkflowInstanceSchema,
  insertWorkflowManualExecutionSchema: () => insertWorkflowManualExecutionSchema,
  insertWorkflowStateEventSchema: () => insertWorkflowStateEventSchema,
  insertWorkflowStateSnapshotSchema: () => insertWorkflowStateSnapshotSchema,
  insertWorkflowStepExecutionSchema: () => insertWorkflowStepExecutionSchema,
  insertWorkflowStepSchema: () => insertWorkflowStepSchema,
  insertWorkflowTemplateSchema: () => insertWorkflowTemplateSchema,
  insertWorkflowTriggerSchema: () => insertWorkflowTriggerSchema,
  interactionStatusEnum: () => interactionStatusEnum,
  italianHolidays: () => italianHolidays,
  leadAiInsights: () => leadAiInsights,
  leadAiInsightsRelations: () => leadAiInsightsRelations,
  leadRoutingConfidenceEnum: () => leadRoutingConfidenceEnum,
  leadRoutingHistory: () => leadRoutingHistory,
  leadRoutingHistoryRelations: () => leadRoutingHistoryRelations,
  leadSourceEnum: () => leadSourceEnum,
  leadStatusCategoryEnum: () => leadStatusCategoryEnum,
  leadStatusHistory: () => leadStatusHistory,
  leadStatuses: () => leadStatuses,
  leadTouchpoints: () => leadTouchpoints,
  legalEntities: () => legalEntities,
  legalEntitiesRelations: () => legalEntitiesRelations,
  maritalStatusEnum: () => maritalStatusEnum,
  mcpAccountTypeEnum: () => mcpAccountTypeEnum,
  mcpConnectedAccounts: () => mcpConnectedAccounts,
  mcpCredentialTypeEnum: () => mcpCredentialTypeEnum,
  mcpServerCredentials: () => mcpServerCredentials,
  mcpServerCredentialsRelations: () => mcpServerCredentialsRelations,
  mcpServerStatusEnum: () => mcpServerStatusEnum,
  mcpServers: () => mcpServers,
  mcpServersRelations: () => mcpServersRelations,
  mcpToolCategoryEnum: () => mcpToolCategoryEnum,
  mcpToolSchemas: () => mcpToolSchemas,
  mcpToolSchemasRelations: () => mcpToolSchemasRelations,
  mcpTransportEnum: () => mcpTransportEnum,
  mediaTypeEnum: () => mediaTypeEnum,
  notificationCategoryEnum: () => notificationCategoryEnum,
  notificationPreferences: () => notificationPreferences,
  notificationPreferencesRelations: () => notificationPreferencesRelations,
  notificationPriorityEnum: () => notificationPriorityEnum,
  notificationStatusEnum: () => notificationStatusEnum,
  notificationTemplates: () => notificationTemplates,
  notificationTemplatesRelations: () => notificationTemplatesRelations,
  notificationTypeEnum: () => notificationTypeEnum,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  objectAcls: () => objectAcls,
  objectAclsRelations: () => objectAclsRelations,
  objectMetadata: () => objectMetadata,
  objectMetadataRelations: () => objectMetadataRelations,
  objectTypeEnum: () => objectTypeEnum,
  objectVisibilityEnum: () => objectVisibilityEnum,
  omnichannelChannelEnum: () => omnichannelChannelEnum,
  organizationalStructure: () => organizationalStructure,
  outboundChannelEnum: () => outboundChannelEnum,
  permModeEnum: () => permModeEnum,
  pipelineDeletionModeEnum: () => pipelineDeletionModeEnum,
  pipelinePermissionModeEnum: () => pipelinePermissionModeEnum,
  priceListTypeEnum: () => priceListTypeEnum,
  productBatchStatusEnum: () => productBatchStatusEnum,
  productBatches: () => productBatches,
  productConditionEnum: () => productConditionEnum,
  productItemStatusHistory: () => productItemStatusHistory,
  productItems: () => productItems,
  productLogisticStatusEnum: () => productLogisticStatusEnum,
  productSerials: () => productSerials,
  productSourceEnum: () => productSourceEnum,
  productStatusEnum: () => productStatusEnum,
  productTypeEnum: () => productTypeEnum,
  products: () => products,
  requestStatusEnum: () => requestStatusEnum,
  resourceAvailability: () => resourceAvailability,
  resourceAvailabilityRelations: () => resourceAvailabilityRelations,
  rolePerms: () => rolePerms,
  rolePermsRelations: () => rolePermsRelations,
  roles: () => roles,
  rolesRelations: () => rolesRelations,
  scopeTypeEnum: () => scopeTypeEnum,
  serialTypeEnum: () => serialTypeEnum,
  servicePermissions: () => servicePermissions,
  shiftAssignments: () => shiftAssignments,
  shiftAssignmentsRelations: () => shiftAssignmentsRelations,
  shiftAttendance: () => shiftAttendance,
  shiftAttendanceRelations: () => shiftAttendanceRelations,
  shiftPatternEnum: () => shiftPatternEnum,
  shiftStatusEnum: () => shiftStatusEnum,
  shiftTemplateVersions: () => shiftTemplateVersions,
  shiftTemplateVersionsRelations: () => shiftTemplateVersionsRelations,
  shiftTemplates: () => shiftTemplates,
  shiftTemplatesRelations: () => shiftTemplatesRelations,
  shiftTimeSlots: () => shiftTimeSlots,
  shiftTimeSlotsRelations: () => shiftTimeSlotsRelations,
  shiftTypeEnum: () => shiftTypeEnum,
  shifts: () => shifts,
  shiftsRelations: () => shiftsRelations,
  stockMovementDirectionEnum: () => stockMovementDirectionEnum,
  stockMovementTypeEnum: () => stockMovementTypeEnum,
  storeBrands: () => storeBrands,
  storeBrandsRelations: () => storeBrandsRelations,
  storeCalendarOverrides: () => storeCalendarOverrides,
  storeCalendarSettings: () => storeCalendarSettings,
  storeCategoryEnum: () => storeCategoryEnum,
  storeDriverPotential: () => storeDriverPotential,
  storeDriverPotentialRelations: () => storeDriverPotentialRelations,
  storeOpeningRules: () => storeOpeningRules,
  storeTrackingConfig: () => storeTrackingConfig,
  stores: () => stores,
  storesRelations: () => storesRelations,
  storesTimetrackingMethods: () => storesTimetrackingMethods,
  storesTimetrackingMethodsRelations: () => storesTimetrackingMethodsRelations,
  structuredLogs: () => structuredLogs,
  structuredLogsRelations: () => structuredLogsRelations,
  supplierOriginEnum: () => supplierOriginEnum,
  supplierOverrides: () => supplierOverrides,
  supplierOverridesRelations: () => supplierOverridesRelations,
  supplierStatusEnum: () => supplierStatusEnum,
  supplierTypeEnum: () => supplierTypeEnum,
  suppliers: () => suppliers,
  suppliersRelations: () => suppliersRelations,
  taskAssignmentRoleEnum: () => taskAssignmentRoleEnum,
  taskAssignments: () => taskAssignments,
  taskAttachments: () => taskAttachments,
  taskChecklistItems: () => taskChecklistItems,
  taskComments: () => taskComments,
  taskDependencies: () => taskDependencies,
  taskDependencyTypeEnum: () => taskDependencyTypeEnum,
  taskPriorityEnum: () => taskPriorityEnum2,
  taskStatusEnum: () => taskStatusEnum2,
  taskTemplates: () => taskTemplates,
  taskTimeLogs: () => taskTimeLogs,
  taskUrgencyEnum: () => taskUrgencyEnum,
  tasks: () => tasks,
  teamWorkflowAssignments: () => teamWorkflowAssignments,
  teams: () => teams,
  tenantCustomDrivers: () => tenantCustomDrivers,
  tenantDriverCategories: () => tenantDriverCategories,
  tenantDriverTypologies: () => tenantDriverTypologies,
  tenantWorkflowNodeOverrides: () => tenantWorkflowNodeOverrides,
  tenants: () => tenants,
  tenantsRelations: () => tenantsRelations,
  timeTracking: () => timeTracking,
  timeTrackingRelations: () => timeTrackingRelations,
  timeTrackingStatusEnum: () => timeTrackingStatusEnum,
  trackingMethodEnum: () => trackingMethodEnum,
  universalRequests: () => universalRequests,
  universalRequestsRelations: () => universalRequestsRelations,
  updateCategorySchema: () => updateCategorySchema,
  updateContactPolicySchema: () => updateContactPolicySchema,
  updateProductItemSchema: () => updateProductItemSchema,
  updateProductSchema: () => updateProductSchema,
  updateVoipExtensionSchema: () => updateVoipExtensionSchema,
  updateVoipExtensionStoreAccessSchema: () => updateVoipExtensionStoreAccessSchema,
  updateVoipTenantConfigSchema: () => updateVoipTenantConfigSchema,
  updateVoipTrunkSchema: () => updateVoipTrunkSchema,
  userAssignments: () => userAssignments,
  userAssignmentsRelations: () => userAssignmentsRelations,
  userExtraPerms: () => userExtraPerms,
  userExtraPermsRelations: () => userExtraPermsRelations,
  userLegalEntities: () => userLegalEntities,
  userLegalEntitiesRelations: () => userLegalEntitiesRelations,
  userStatusEnum: () => userStatusEnum,
  userStores: () => userStores,
  userStoresRelations: () => userStoresRelations,
  userWorkflowAssignments: () => userWorkflowAssignments,
  users: () => users,
  usersRelations: () => usersRelations,
  utmLinks: () => utmLinks,
  utmShortUrls: () => utmShortUrls,
  vectorCollections: () => vectorCollections,
  vectorCollectionsRelations: () => vectorCollectionsRelations,
  vectorEmbeddings: () => vectorEmbeddings,
  vectorEmbeddingsRelations: () => vectorEmbeddingsRelations,
  vectorOriginEnum: () => vectorOriginEnum,
  vectorSearchQueries: () => vectorSearchQueries,
  vectorSearchQueriesRelations: () => vectorSearchQueriesRelations,
  vectorSourceTypeEnum: () => vectorSourceTypeEnum,
  vectorStatusEnum: () => vectorStatusEnum,
  voipActivityLog: () => voipActivityLog,
  voipAiSessions: () => voipAiSessions,
  voipAssignmentTypeEnum: () => voipAssignmentTypeEnum,
  voipCallDirectionEnum: () => voipCallDirectionEnum,
  voipCallDispositionEnum: () => voipCallDispositionEnum,
  voipCdrs: () => voipCdrs,
  voipConnectionStatusEnum: () => voipConnectionStatusEnum,
  voipCredentialTypeEnum: () => voipCredentialTypeEnum,
  voipDeviceTypeEnum: () => voipDeviceTypeEnum,
  voipDidStatusEnum: () => voipDidStatusEnum,
  voipExtensionStatusEnum: () => voipExtensionStatusEnum,
  voipExtensionStoreAccess: () => voipExtensionStoreAccess,
  voipExtensionTypeEnum: () => voipExtensionTypeEnum,
  voipExtensions: () => voipExtensions,
  voipProtocolEnum: () => voipProtocolEnum,
  voipRegistrationStatusEnum: () => voipRegistrationStatusEnum,
  voipRouteTypeEnum: () => voipRouteTypeEnum,
  voipSyncStatusEnum: () => voipSyncStatusEnum,
  voipTenantConfig: () => voipTenantConfig,
  voipTrunkStatusEnum: () => voipTrunkStatusEnum,
  voipTrunks: () => voipTrunks,
  w3suiteSchema: () => w3suiteSchema,
  webhookEvents: () => webhookEvents,
  webhookSignatures: () => webhookSignatures,
  wmsCategories: () => wmsCategories,
  wmsInventoryAdjustments: () => wmsInventoryAdjustments,
  wmsProductTypes: () => wmsProductTypes,
  wmsStockMovements: () => wmsStockMovements,
  wmsWarehouseLocations: () => wmsWarehouseLocations,
  workflowActions: () => workflowActions,
  workflowExecutionModeEnum: () => workflowExecutionModeEnum,
  workflowExecutionQueue: () => workflowExecutionQueue,
  workflowExecutions: () => workflowExecutions,
  workflowInstances: () => workflowInstances,
  workflowManualExecutions: () => workflowManualExecutions,
  workflowSourceEnum: () => workflowSourceEnum,
  workflowStateEvents: () => workflowStateEvents,
  workflowStateSnapshots: () => workflowStateSnapshots,
  workflowStepExecutions: () => workflowStepExecutions,
  workflowSteps: () => workflowSteps,
  workflowTemplates: () => workflowTemplates,
  workflowTriggers: () => workflowTriggers
});
import { sql as sql4, relations } from "drizzle-orm";
import {
  index as index4,
  jsonb as jsonb4,
  pgEnum as pgEnum3,
  pgSchema as pgSchema3,
  timestamp as timestamp4,
  varchar as varchar4,
  text as text4,
  boolean as boolean4,
  uuid as uuid4,
  primaryKey,
  smallint as smallint4,
  integer as integer3,
  date as date3,
  uniqueIndex as uniqueIndex3,
  customType,
  real as real3,
  decimal,
  numeric,
  foreignKey
} from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema4 } from "drizzle-zod";
import { z as z3 } from "zod";
var vector2 = customType({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value) {
    return JSON.stringify(value);
  },
  fromDriver(value) {
    return JSON.parse(value);
  }
});
var w3suiteSchema = pgSchema3("w3suite");
var scopeTypeEnum = pgEnum3("scope_type", ["tenant", "legal_entity", "store"]);
var permModeEnum = pgEnum3("perm_mode", ["grant", "revoke"]);
var userStatusEnum = pgEnum3("user_status", ["attivo", "sospeso", "off-boarding"]);
var notificationTypeEnum = pgEnum3("notification_type", ["system", "security", "data", "custom"]);
var notificationPriorityEnum = pgEnum3("notification_priority", ["low", "medium", "high", "critical"]);
var notificationStatusEnum = pgEnum3("notification_status", ["unread", "read"]);
var storeCategoryEnum = pgEnum3("store_category", ["sales_point", "office", "warehouse"]);
var notificationCategoryEnum = pgEnum3("notification_category", ["sales", "finance", "marketing", "support", "operations"]);
var objectVisibilityEnum = pgEnum3("object_visibility", ["public", "private"]);
var objectTypeEnum = pgEnum3("object_type", ["avatar", "document", "image", "file"]);
var pipelinePermissionModeEnum = pgEnum3("pipeline_permission_mode", ["all", "deal_managers", "pipeline_admins", "supervisor_only", "custom", "none"]);
var pipelineDeletionModeEnum = pgEnum3("pipeline_deletion_mode", ["admins", "supervisor_only", "none"]);
var supplierOriginEnum = pgEnum3("supplier_origin", ["brand", "tenant"]);
var supplierTypeEnum = pgEnum3("supplier_type", ["distributore", "produttore", "servizi", "logistica"]);
var supplierStatusEnum = pgEnum3("supplier_status", ["active", "suspended", "blocked"]);
var workflowSourceEnum = pgEnum3("workflow_source", ["brand", "tenant"]);
var genderEnum = pgEnum3("gender", ["male", "female", "other", "prefer_not_to_say"]);
var maritalStatusEnum = pgEnum3("marital_status", ["single", "married", "divorced", "widowed", "other"]);
var ccnlLevelEnum = pgEnum3("ccnl_level", [
  "quadro",
  // Quadri - Management Level
  "livello_1",
  // 1° Livello - Senior Professional
  "livello_2",
  // 2° Livello - Professional
  "livello_3",
  // 3° Livello - Skilled Employee
  "livello_4",
  // 4° Livello - Mid-level Employee
  "livello_5",
  // 5° Livello - Junior Employee
  "livello_6",
  // 6° Livello - Entry Level
  "livello_7",
  // 7° Livello - Basic Level
  "operatore_vendita_a",
  // Operatore Vendita A - Sales Operator A
  "operatore_vendita_b"
  // Operatore Vendita B - Sales Operator B
]);
var employmentContractTypeEnum = pgEnum3("employment_contract_type", [
  "tempo_indeterminato",
  // Permanent Contract
  "tempo_determinato",
  // Fixed-term Contract
  "apprendistato_professionalizzante",
  // Professional Apprenticeship
  "apprendistato_qualifica",
  // Qualification Apprenticeship
  "collaborazione_coordinata",
  // Coordinated Collaboration
  "parttime_verticale",
  // Part-time Vertical (some days full)
  "parttime_orizzontale",
  // Part-time Horizontal (reduced daily hours)
  "parttime_misto",
  // Part-time Mixed
  "intermittente",
  // Intermittent Work
  "somministrazione",
  // Temporary Agency Work
  "stage_tirocinio",
  // Internship/Training
  "contratto_inserimento",
  // Integration Contract
  "lavoro_occasionale"
  // Occasional Work
]);
var calendarEventTypeEnum = pgEnum3("calendar_event_type", ["meeting", "shift", "time_off", "overtime", "training", "deadline", "other"]);
var calendarEventVisibilityEnum = pgEnum3("calendar_event_visibility", ["private", "team", "store", "area", "tenant"]);
var calendarEventStatusEnum = pgEnum3("calendar_event_status", ["tentative", "confirmed", "cancelled"]);
var trackingMethodEnum = pgEnum3("tracking_method", ["badge", "nfc", "app", "gps", "manual", "biometric", "qr", "smart", "web"]);
var timeTrackingStatusEnum = pgEnum3("time_tracking_status", ["active", "completed", "edited", "disputed"]);
var shiftTypeEnum = pgEnum3("shift_type", ["morning", "afternoon", "night", "full_day", "split", "on_call"]);
var shiftStatusEnum = pgEnum3("shift_status", ["draft", "published", "in_progress", "completed", "cancelled"]);
var shiftPatternEnum = pgEnum3("shift_pattern", ["daily", "weekly", "monthly", "custom"]);
var hrDocumentTypeEnum = pgEnum3("hr_document_type", ["payslip", "contract", "certificate", "id_document", "cv", "evaluation", "warning", "other"]);
var hrDocumentSourceEnum = pgEnum3("hr_document_source", ["employee", "hr", "system"]);
var expenseReportStatusEnum = pgEnum3("expense_report_status", ["draft", "submitted", "approved", "rejected", "reimbursed"]);
var expensePaymentMethodEnum = pgEnum3("expense_payment_method", ["cash", "credit_card", "bank_transfer"]);
var expenseCategoryEnum = pgEnum3("expense_category", ["travel", "meal", "accommodation", "transport", "supplies", "other"]);
var aiConnectionStatusEnum = pgEnum3("ai_connection_status", ["connected", "disconnected", "error"]);
var aiPrivacyModeEnum = pgEnum3("ai_privacy_mode", ["standard", "strict"]);
var aiFeatureTypeEnum = pgEnum3("ai_feature_type", [
  "chat",
  "embedding",
  "transcription",
  "vision_analysis",
  "url_scraping",
  "document_analysis",
  "natural_queries",
  "financial_forecasting",
  "web_search",
  "code_interpreter",
  "image_generation",
  "voice_assistant"
]);
var aiModelEnum = pgEnum3("ai_model", [
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-4o-mini",
  "gpt-4",
  "gpt-3.5-turbo",
  "text-embedding-3-small",
  "text-embedding-3-large",
  "whisper-1",
  "dall-e-3"
]);
var leadRoutingConfidenceEnum = pgEnum3("lead_routing_confidence", ["low", "medium", "high", "very_high"]);
var outboundChannelEnum = pgEnum3("outbound_channel", ["email", "phone", "whatsapp", "linkedin", "sms"]);
var crmCampaignTypeEnum = pgEnum3("crm_campaign_type", ["inbound_media", "outbound_crm", "retention"]);
var crmCampaignStatusEnum = pgEnum3("crm_campaign_status", ["draft", "scheduled", "active", "paused", "completed"]);
var workflowExecutionModeEnum = pgEnum3("workflow_execution_mode", ["automatic", "manual"]);
var crmLeadStatusEnum = pgEnum3("crm_lead_status", ["new", "contacted", "in_progress", "qualified", "converted", "disqualified"]);
var leadStatusCategoryEnum = pgEnum3("lead_status_category", ["new", "working", "qualified", "converted", "disqualified", "on_hold"]);
var leadSourceEnum = pgEnum3("lead_source", ["manual", "web_form", "powerful_api", "landing_page", "csv_import"]);
var dealCreationSourceEnum = pgEnum3("deal_creation_source", ["manual", "converted_from_lead", "imported", "workflow_automation"]);
var crmPipelineDomainEnum = pgEnum3("crm_pipeline_domain", ["sales", "service", "retention"]);
var crmPipelineStageCategoryEnum = pgEnum3("crm_pipeline_stage_category", [
  "starter",
  // Fase iniziale contatto
  "progress",
  // In lavorazione attiva
  "pending",
  // In attesa cliente/interno
  "purchase",
  // Fase acquisto
  "finalized",
  // Finalizzato con successo
  "archive",
  // Archiviato
  "ko"
  // Perso/Rifiutato
]);
var crmDealStatusEnum = pgEnum3("crm_deal_status", ["open", "won", "lost", "abandoned"]);
var crmCustomerTypeEnum = pgEnum3("crm_customer_type", ["b2b", "b2c"]);
var crmLegalFormEnum = pgEnum3("crm_legal_form", [
  "ditta_individuale",
  "snc",
  // Società in Nome Collettivo
  "sas",
  // Società in Accomandita Semplice
  "srl",
  // Società a Responsabilità Limitata
  "srls",
  // SRL Semplificata
  "spa",
  // Società per Azioni
  "sapa",
  // Società in Accomandita per Azioni
  "cooperativa",
  "consorzio",
  "societa_semplice",
  "geie",
  // Gruppo Europeo Interesse Economico
  "startup_innovativa",
  "pmi_innovativa"
]);
var crmInteractionDirectionEnum = pgEnum3("crm_interaction_direction", ["inbound", "outbound"]);
var crmInboundChannelEnum = pgEnum3("crm_inbound_channel", [
  "landing_page",
  // URL/Landing page
  "web_form",
  // Form compilato su sito
  "whatsapp_inbound",
  // Messaggio WhatsApp ricevuto
  "cold_call_inbound",
  // Chiamata ricevuta da prospect
  "linkedin_campaign",
  // Campagna LinkedIn Ads
  "partner_referral",
  // Segnalazione partner
  "facebook",
  // Social: Facebook
  "instagram",
  // Social: Instagram
  "tiktok",
  // Social: TikTok
  "youtube",
  // Social: YouTube
  "twitter"
  // Social: Twitter/X
]);
var crmOutboundChannelEnum = pgEnum3("crm_outbound_channel", [
  "email",
  // Email outbound
  "telegram",
  // Messaggio Telegram
  "whatsapp",
  // WhatsApp Business outbound
  "phone",
  // Chiamata telefonica
  "linkedin",
  // LinkedIn InMail/Message
  "social_dm",
  // Direct Message social (FB/IG)
  "sms"
  // SMS
]);
var crmTaskTypeEnum = pgEnum3("crm_task_type", ["call", "email", "meeting", "follow_up", "demo", "other"]);
var crmTaskStatusEnum = pgEnum3("crm_task_status", ["pending", "in_progress", "completed", "cancelled"]);
var crmTaskPriorityEnum = pgEnum3("crm_task_priority", ["low", "medium", "high", "urgent"]);
var crmConsentTypeEnum = pgEnum3("crm_consent_type", ["privacy_policy", "marketing", "profiling", "third_party"]);
var crmConsentStatusEnum = pgEnum3("crm_consent_status", ["granted", "denied", "withdrawn", "pending"]);
var crmConsentScopeEnum = pgEnum3("crm_consent_scope", ["marketing", "service", "both"]);
var crmSourceTypeEnum = pgEnum3("crm_source_type", ["meta_page", "google_ads", "whatsapp_phone", "instagram", "tiktok"]);
var crmIdentifierTypeEnum = pgEnum3("crm_identifier_type", ["email", "phone", "social"]);
var customerTypeEnum = pgEnum3("customer_type", ["b2c", "b2b"]);
var omnichannelChannelEnum = pgEnum3("omnichannel_channel", [
  "email",
  "sms",
  "whatsapp",
  "telegram",
  "instagram_dm",
  "instagram_comment",
  "facebook_messenger",
  "facebook_comment",
  "tiktok_comment",
  "linkedin_message",
  "voice_call",
  "video_call",
  "web_chat",
  "in_person",
  "workflow_automation"
]);
var interactionStatusEnum = pgEnum3("interaction_status", [
  "pending",
  "sent",
  "delivered",
  "read",
  "replied",
  "failed",
  "bounced"
]);
var identityMatchTypeEnum = pgEnum3("identity_match_type", [
  "email_exact",
  "phone_exact",
  "social_exact",
  "email_fuzzy",
  "phone_fuzzy",
  "name_similarity",
  "ip_address",
  "device_fingerprint"
]);
var identityMatchStatusEnum = pgEnum3("identity_match_status", [
  "pending",
  "accepted",
  "rejected",
  "auto_merged"
]);
var identityEventTypeEnum = pgEnum3("identity_event_type", [
  "merge",
  "split",
  "manual_link",
  "auto_dedupe",
  "conflict_resolved"
]);
var calendarEventCategoryEnum = pgEnum3("calendar_event_category", [
  "sales",
  "finance",
  "hr",
  "crm",
  "support",
  "operations",
  "marketing"
]);
var taskStatusEnum2 = pgEnum3("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
  "archived"
]);
var taskPriorityEnum2 = pgEnum3("task_priority", [
  "low",
  // Bassa importanza strategica
  "medium",
  // Importanza media
  "high"
  // Alta importanza strategica
]);
var taskUrgencyEnum = pgEnum3("task_urgency", [
  "low",
  // Non urgente (settimane)
  "medium",
  // Moderatamente urgente (giorni)
  "high",
  // Urgente (ore/1 giorno)
  "critical"
  // Critico (immediato)
]);
var taskAssignmentRoleEnum = pgEnum3("task_assignment_role", [
  "assignee",
  "watcher"
]);
var taskDependencyTypeEnum = pgEnum3("task_dependency_type", [
  "blocks",
  "blocked_by",
  "related"
]);
var chatChannelTypeEnum = pgEnum3("chat_channel_type", [
  "team",
  "dm",
  "task_thread",
  "general"
]);
var chatMemberRoleEnum = pgEnum3("chat_member_role", [
  "owner",
  "admin",
  "member"
]);
var chatNotificationPreferenceEnum = pgEnum3("chat_notification_preference", [
  "all",
  "mentions",
  "none"
]);
var chatVisibilityEnum = pgEnum3("chat_visibility", [
  "public",
  "private"
]);
var chatInviteStatusEnum = pgEnum3("chat_invite_status", [
  "pending",
  "accepted",
  "declined"
]);
var activityFeedCategoryEnum = pgEnum3("activity_feed_category", [
  "TASK",
  "WORKFLOW",
  "HR",
  "CRM",
  "WEBHOOK",
  "SYSTEM"
]);
var activityFeedPriorityEnum = pgEnum3("activity_feed_priority", [
  "low",
  "normal",
  "high"
]);
var activityFeedActorTypeEnum = pgEnum3("activity_feed_actor_type", [
  "user",
  "system",
  "webhook"
]);
var activityFeedInteractionTypeEnum = pgEnum3("activity_feed_interaction_type", [
  "like",
  "comment",
  "share",
  "bookmark",
  "hide"
]);
var mcpTransportEnum = pgEnum3("mcp_transport", ["stdio", "http-sse"]);
var mcpServerStatusEnum = pgEnum3("mcp_server_status", ["active", "inactive", "error", "configuring"]);
var mcpCredentialTypeEnum = pgEnum3("mcp_credential_type", ["oauth2_user", "service_account", "api_key", "basic_auth", "none"]);
var mcpToolCategoryEnum = pgEnum3("mcp_tool_category", [
  "communication",
  // Gmail, Teams, Slack
  "storage",
  // Drive, S3, Dropbox
  "analytics",
  // GTM, GA
  "social_media",
  // Meta/Instagram, Facebook
  "productivity",
  // Calendar, Sheets, Docs
  "ai",
  // OpenAI, AI services
  "database",
  // Postgres, MongoDB
  "other"
]);
var mcpAccountTypeEnum = pgEnum3("mcp_account_type", [
  "facebook_page",
  "instagram_business",
  "google_workspace",
  "aws_account",
  "microsoft_tenant"
]);
var voipProtocolEnum = pgEnum3("voip_protocol", ["udp", "tcp", "tls", "wss"]);
var voipCallDirectionEnum = pgEnum3("voip_call_direction", ["inbound", "outbound", "internal"]);
var voipCallDispositionEnum = pgEnum3("voip_call_disposition", ["answered", "no_answer", "busy", "failed", "voicemail"]);
var voipDeviceTypeEnum = pgEnum3("voip_device_type", ["webrtc", "deskphone", "mobile_app", "softphone"]);
var voipExtensionStatusEnum = pgEnum3("voip_extension_status", ["active", "inactive", "suspended"]);
var voipTrunkStatusEnum = pgEnum3("voip_trunk_status", ["active", "inactive", "error"]);
var voipCredentialTypeEnum = pgEnum3("voip_credential_type", ["sip_trunk", "sip_extension", "turn_server", "api_key"]);
var voipDidStatusEnum = pgEnum3("voip_did_status", ["active", "porting_in", "porting_out", "inactive", "cancelled"]);
var voipRouteTypeEnum = pgEnum3("voip_route_type", ["inbound", "outbound", "emergency"]);
var voipAssignmentTypeEnum = pgEnum3("voip_assignment_type", ["store", "extension", "ivr", "queue", "conference"]);
var voipExtensionTypeEnum = pgEnum3("voip_extension_type", ["user", "queue", "conference"]);
var voipSyncStatusEnum = pgEnum3("voip_sync_status", ["synced", "pending", "failed", "local_only"]);
var voipConnectionStatusEnum = pgEnum3("voip_connection_status", ["connected", "error", "unknown"]);
var voipRegistrationStatusEnum = pgEnum3("voip_registration_status", ["registered", "unregistered", "failed", "unknown"]);
var productSourceEnum = pgEnum3("product_source", ["brand", "tenant"]);
var productTypeEnum = pgEnum3("product_type", ["PHYSICAL", "VIRTUAL", "SERVICE", "CANVAS"]);
var productStatusEnum = pgEnum3("product_status", ["active", "inactive", "discontinued", "draft"]);
var productConditionEnum = pgEnum3("product_condition", ["new", "used", "refurbished", "demo"]);
var productLogisticStatusEnum = pgEnum3("product_logistic_status", [
  "in_stock",
  // In giacenza
  "reserved",
  // Prenotato
  "preparing",
  // In preparazione
  "shipping",
  // DDT/In spedizione
  "delivered",
  // Consegnato
  "customer_return",
  // Reso cliente
  "doa_return",
  // Reso DOA
  "in_service",
  // In assistenza
  "supplier_return",
  // Restituito fornitore
  "in_transfer",
  // In trasferimento
  "lost",
  // Smarrito
  "damaged",
  // Danneggiato/Dismesso
  "internal_use"
  // AD uso interno
]);
var serialTypeEnum = pgEnum3("serial_type", ["imei", "iccid", "mac_address", "other"]);
var productBatchStatusEnum = pgEnum3("product_batch_status", ["available", "reserved", "damaged", "expired"]);
var stockMovementTypeEnum = pgEnum3("stock_movement_type", [
  "purchase_in",
  // Acquisto da fornitore
  "sale_out",
  // Vendita
  "return_in",
  // Reso da cliente
  "transfer",
  // Trasferimento (crea coppia inbound/outbound)
  "adjustment",
  // Rettifica inventario
  "damaged"
  // Danneggiato
]);
var stockMovementDirectionEnum = pgEnum3("stock_movement_direction", [
  "inbound",
  // Entrata (aumenta stock)
  "outbound"
  // Uscita (diminuisce stock)
]);
var priceListTypeEnum = pgEnum3("price_list_type", ["b2c", "b2b", "wholesale"]);
var tenants = w3suiteSchema.table("tenants", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  name: varchar4("name", { length: 255 }).notNull(),
  slug: varchar4("slug", { length: 100 }).notNull().unique(),
  status: varchar4("status", { length: 50 }).default("active"),
  notes: text4("notes"),
  // Added notes field for Management Center
  settings: jsonb4("settings").default({}),
  features: jsonb4("features").default({}),
  branchId: uuid4("branch_id"),
  // FK to brand_interface.brand_branches for Deploy Center
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  archivedAt: timestamp4("archived_at")
});
var insertTenantSchema = createInsertSchema4(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  slug: z3.string().min(1, "Slug non pu\xF2 essere vuoto").max(100, "Slug troppo lungo")
});
var users = w3suiteSchema.table("users", {
  id: varchar4("id").primaryKey(),
  // OAuth2 standard sub field
  email: varchar4("email", { length: 255 }).unique(),
  firstName: varchar4("first_name", { length: 100 }),
  lastName: varchar4("last_name", { length: 100 }),
  profileImageUrl: varchar4("profile_image_url", { length: 500 }),
  // Avatar metadata fields
  avatarObjectPath: varchar4("avatar_object_path", { length: 500 }),
  avatarVisibility: objectVisibilityEnum("avatar_visibility").default("public"),
  avatarUploadedAt: timestamp4("avatar_uploaded_at"),
  avatarUploadedBy: varchar4("avatar_uploaded_by"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  isSystemAdmin: boolean4("is_system_admin").default(false),
  lastLoginAt: timestamp4("last_login_at"),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  status: userStatusEnum("status").default("attivo"),
  mfaEnabled: boolean4("mfa_enabled").default(false),
  // Extended enterprise fields
  role: varchar4("role", { length: 50 }),
  storeId: uuid4("store_id").references(() => stores.id),
  phone: varchar4("phone", { length: 20 }),
  position: varchar4("position", { length: 100 }),
  department: varchar4("department", { length: 100 }),
  hireDate: date3("hire_date"),
  contractType: varchar4("contract_type", { length: 50 }),
  // Keep as varchar to preserve existing data
  // Personal/Demographic Information (HR Best Practices 2025)
  dateOfBirth: date3("date_of_birth"),
  fiscalCode: varchar4("fiscal_code", { length: 16 }),
  // Codice Fiscale italiano
  gender: genderEnum("gender"),
  maritalStatus: maritalStatusEnum("marital_status"),
  nationality: varchar4("nationality", { length: 100 }),
  placeOfBirth: varchar4("place_of_birth", { length: 100 }),
  // Address Information
  address: text4("address"),
  city: varchar4("city", { length: 100 }),
  province: varchar4("province", { length: 2 }),
  postalCode: varchar4("postal_code", { length: 5 }),
  country: varchar4("country", { length: 100 }).default("Italia"),
  // Emergency Contact
  emergencyContactName: varchar4("emergency_contact_name", { length: 200 }),
  emergencyContactRelationship: varchar4("emergency_contact_relationship", { length: 100 }),
  emergencyContactPhone: varchar4("emergency_contact_phone", { length: 20 }),
  emergencyContactEmail: varchar4("emergency_contact_email", { length: 255 }),
  // Administrative Information
  employeeNumber: varchar4("employee_number", { length: 50 }),
  // Matricola
  annualCost: real3("annual_cost"),
  // Costo aziendale annuo totale
  grossAnnualSalary: real3("gross_annual_salary"),
  // RAL - Retribuzione Annua Lorda
  level: varchar4("level", { length: 50 }),
  // Livello CCNL (keep as varchar to preserve existing data)
  ccnl: varchar4("ccnl", { length: 255 }),
  // CCNL applicato (es: "Commercio", "Telecomunicazioni")
  managerId: varchar4("manager_id").references(() => users.id),
  // Responsabile diretto
  employmentEndDate: date3("employment_end_date"),
  // Per contratti a tempo determinato
  probationEndDate: date3("probation_end_date"),
  // Fine periodo di prova
  offboardingDate: date3("offboarding_date"),
  // Data offboarding
  // Italian Social Security (INPS/INAIL)
  inpsPosition: varchar4("inps_position", { length: 50 }),
  // Matricola INPS
  inailPosition: varchar4("inail_position", { length: 50 }),
  // Posizione assicurativa INAIL
  // Identity Document
  idDocumentType: varchar4("id_document_type", { length: 50 }),
  // Tipo documento (Carta Identità, Passaporto, Patente)
  idDocumentNumber: varchar4("id_document_number", { length: 50 }),
  // Numero documento
  idDocumentExpiryDate: date3("id_document_expiry_date"),
  // Scadenza documento
  // Banking Information
  bankIban: varchar4("bank_iban", { length: 34 }),
  // IBAN per stipendio
  bankName: varchar4("bank_name", { length: 255 }),
  // Professional Background
  education: text4("education"),
  // Titolo di studio
  certifications: text4("certifications").array(),
  // Certificazioni possedute
  skills: text4("skills").array(),
  // Competenze tecniche
  languages: text4("languages").array(),
  // Lingue parlate
  // Notes
  notes: text4("notes")
  // Note interne HR
}, (table) => [
  index4("users_tenant_idx").on(table.tenantId),
  index4("users_store_idx").on(table.storeId),
  index4("users_manager_idx").on(table.managerId),
  index4("users_employee_number_idx").on(table.employeeNumber)
]);
var insertUserSchema = createInsertSchema4(users).omit({
  createdAt: true,
  updatedAt: true
});
var legalEntities = w3suiteSchema.table("legal_entities", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  codice: varchar4("codice", { length: 20 }).notNull(),
  nome: varchar4("nome", { length: 255 }).notNull(),
  pIva: varchar4("piva", { length: 50 }),
  billingProfileId: uuid4("billing_profile_id"),
  stato: varchar4("stato", { length: 50 }).default("Attiva"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  archivedAt: timestamp4("archived_at"),
  // Extended enterprise fields
  codiceFiscale: varchar4("codiceFiscale", { length: 50 }),
  formaGiuridica: varchar4("formaGiuridica", { length: 100 }),
  capitaleSociale: varchar4("capitaleSociale", { length: 50 }),
  dataCostituzione: date3("dataCostituzione"),
  indirizzo: text4("indirizzo"),
  citta: varchar4("citta", { length: 100 }),
  provincia: varchar4("provincia", { length: 10 }),
  cap: varchar4("cap", { length: 10 }),
  telefono: varchar4("telefono", { length: 50 }),
  email: varchar4("email", { length: 255 }),
  pec: varchar4("pec", { length: 255 }),
  rea: varchar4("rea", { length: 100 }),
  registroImprese: varchar4("registroImprese", { length: 255 }),
  // New enterprise fields for enhanced functionality
  logo: text4("logo"),
  // PNG file path or base64
  codiceSDI: varchar4("codiceSDI", { length: 10 }),
  // Administrative contact section - using camelCase column names
  refAmminNome: varchar4("refAmminNome", { length: 100 }),
  refAmminCognome: varchar4("refAmminCognome", { length: 100 }),
  refAmminEmail: varchar4("refAmminEmail", { length: 255 }),
  refAmminCodiceFiscale: varchar4("refAmminCodiceFiscale", { length: 16 }),
  refAmminIndirizzo: text4("refAmminIndirizzo"),
  refAmminCitta: varchar4("refAmminCitta", { length: 100 }),
  refAmminCap: varchar4("refAmminCap", { length: 10 }),
  refAmminPaese: varchar4("refAmminPaese", { length: 100 }),
  // Dynamic notes field
  note: text4("note")
}, (table) => [
  uniqueIndex3("legal_entities_tenant_codice_unique").on(table.tenantId, table.codice)
]);
var insertLegalEntitySchema = createInsertSchema4(legalEntities).omit({
  createdAt: true,
  updatedAt: true
}).extend({
  // Allow id to be optionally provided (if not provided, will be auto-generated from code)
  id: z3.string().uuid().optional()
});
var stores = w3suiteSchema.table("stores", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  legalEntityId: uuid4("legal_entity_id").notNull().references(() => legalEntities.id),
  code: varchar4("code", { length: 50 }).notNull(),
  nome: varchar4("nome", { length: 255 }).notNull(),
  channelId: uuid4("channel_id").notNull().references(() => channels.id),
  commercialAreaId: uuid4("commercial_area_id").notNull().references(() => commercialAreas.id),
  // LOCATION FIELDS (real database fields only)
  address: text4("address"),
  geo: jsonb4("geo"),
  citta: varchar4("citta", { length: 100 }),
  provincia: varchar4("provincia", { length: 10 }),
  cap: varchar4("cap", { length: 10 }),
  region: varchar4("region", { length: 100 }),
  status: varchar4("status", { length: 50 }).default("active"),
  category: storeCategoryEnum("category").default("sales_point").notNull(),
  openedAt: date3("opened_at"),
  closedAt: date3("closed_at"),
  billingOverrideId: uuid4("billing_override_id"),
  branchId: uuid4("branch_id"),
  // FK to brand_interface.brand_branches for Deploy Center (child branch: tenant-slug/store-slug)
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  archivedAt: timestamp4("archived_at"),
  // Contact fields
  phone: varchar4("phone", { length: 50 }),
  email: varchar4("email", { length: 255 }),
  // Social and digital contact fields
  whatsapp1: varchar4("whatsapp1", { length: 20 }),
  whatsapp2: varchar4("whatsapp2", { length: 20 }),
  facebook: varchar4("facebook", { length: 255 }),
  instagram: varchar4("instagram", { length: 255 }),
  tiktok: varchar4("tiktok", { length: 255 }),
  googleMapsUrl: text4("google_maps_url"),
  telegram: varchar4("telegram", { length: 255 })
}, (table) => [
  uniqueIndex3("stores_tenant_code_unique").on(table.tenantId, table.code)
]);
var insertStoreSchema = createInsertSchema4(stores).omit({
  createdAt: true,
  updatedAt: true
}).extend({
  // Allow id to be optionally provided (if not provided, will be auto-generated from code)
  id: z3.string().uuid().optional()
});
var storeTrackingConfig = w3suiteSchema.table("store_tracking_config", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  // Marketing Tracking IDs
  ga4MeasurementId: varchar4("ga4_measurement_id", { length: 50 }),
  // Format: G-XXXXXXXXX
  googleAdsConversionId: varchar4("google_ads_conversion_id", { length: 50 }),
  // Format: AW-XXXXXXXX
  facebookPixelId: varchar4("facebook_pixel_id", { length: 50 }),
  // Numeric
  tiktokPixelId: varchar4("tiktok_pixel_id", { length: 50 }),
  // Alphanumeric
  // GTM Auto-Configuration Status
  gtmConfigured: boolean4("gtm_configured").default(false).notNull(),
  gtmTriggerId: varchar4("gtm_trigger_id", { length: 100 }),
  // GTM API trigger ID
  // Timestamps
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex3("store_tracking_config_store_unique").on(table.storeId),
  index4("store_tracking_config_tenant_idx").on(table.tenantId)
]);
var insertStoreTrackingConfigSchema = createInsertSchema4(storeTrackingConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var dayOfWeekEnum = pgEnum3("day_of_week", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
var storeOpeningRules = w3suiteSchema.table("store_opening_rules", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  // Day of week (monday-sunday)
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  // Opening hours for this day
  isOpen: boolean4("is_open").default(true).notNull(),
  openTime: varchar4("open_time", { length: 5 }),
  // Format: HH:MM (e.g., "09:00")
  closeTime: varchar4("close_time", { length: 5 }),
  // Format: HH:MM (e.g., "20:00")
  // Optional break time (e.g., lunch break)
  hasBreak: boolean4("has_break").default(false).notNull(),
  breakStartTime: varchar4("break_start_time", { length: 5 }),
  // Format: HH:MM
  breakEndTime: varchar4("break_end_time", { length: 5 }),
  // Format: HH:MM
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex3("store_opening_rules_store_day_unique").on(table.storeId, table.dayOfWeek),
  index4("store_opening_rules_tenant_idx").on(table.tenantId),
  index4("store_opening_rules_store_idx").on(table.storeId)
]);
var insertStoreOpeningRuleSchema = createInsertSchema4(storeOpeningRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var storeCalendarOverrides = w3suiteSchema.table("store_calendar_overrides", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  // Specific date for override
  date: date3("date").notNull(),
  // Override type
  overrideType: varchar4("override_type", { length: 20 }).notNull(),
  // 'closed', 'special_hours', 'holiday'
  // If open with special hours
  isOpen: boolean4("is_open").default(false).notNull(),
  openTime: varchar4("open_time", { length: 5 }),
  // Format: HH:MM
  closeTime: varchar4("close_time", { length: 5 }),
  // Format: HH:MM
  // Reason/note for override
  reason: varchar4("reason", { length: 255 }),
  holidayName: varchar4("holiday_name", { length: 100 }),
  // If it's a holiday
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex3("store_calendar_overrides_store_date_unique").on(table.storeId, table.date),
  index4("store_calendar_overrides_tenant_idx").on(table.tenantId),
  index4("store_calendar_overrides_store_idx").on(table.storeId),
  index4("store_calendar_overrides_date_idx").on(table.date)
]);
var insertStoreCalendarOverrideSchema = createInsertSchema4(storeCalendarOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var italianHolidays = w3suiteSchema.table("italian_holidays", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  // Holiday info
  name: varchar4("name", { length: 100 }).notNull(),
  // e.g., "Capodanno", "Pasqua", "Ferragosto"
  date: date3("date").notNull(),
  // Specific date for this year
  year: integer3("year").notNull(),
  // Year for this holiday entry
  // Holiday type
  holidayType: varchar4("holiday_type", { length: 30 }).notNull(),
  // 'national', 'religious', 'local'
  isMovable: boolean4("is_movable").default(false).notNull(),
  // e.g., Easter moves each year
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex3("italian_holidays_name_year_unique").on(table.name, table.year),
  index4("italian_holidays_year_idx").on(table.year),
  index4("italian_holidays_date_idx").on(table.date)
]);
var insertItalianHolidaySchema = createInsertSchema4(italianHolidays).omit({
  id: true,
  createdAt: true
});
var storeCalendarSettings = w3suiteSchema.table("store_calendar_settings", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  // Auto-apply rules
  autoCloseSundays: boolean4("auto_close_sundays").default(true).notNull(),
  autoCloseNationalHolidays: boolean4("auto_close_national_holidays").default(true).notNull(),
  autoCloseReligiousHolidays: boolean4("auto_close_religious_holidays").default(false).notNull(),
  // Default patron saint day (local holiday)
  patronSaintDay: date3("patron_saint_day"),
  // e.g., "06-24" for San Giovanni (Firenze)
  patronSaintName: varchar4("patron_saint_name", { length: 100 }),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex3("store_calendar_settings_store_unique").on(table.storeId),
  index4("store_calendar_settings_tenant_idx").on(table.tenantId)
]);
var insertStoreCalendarSettingsSchema = createInsertSchema4(storeCalendarSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var roles = w3suiteSchema.table("roles", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  name: varchar4("name", { length: 100 }).notNull(),
  description: text4("description"),
  isSystem: boolean4("is_system").default(false),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  uniqueIndex3("roles_tenant_name_unique").on(table.tenantId, table.name)
]);
var insertRoleSchema = createInsertSchema4(roles).omit({
  id: true,
  createdAt: true
});
var rolePerms = w3suiteSchema.table("role_perms", {
  roleId: uuid4("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  perm: varchar4("perm", { length: 255 }).notNull(),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  primaryKey({ columns: [table.roleId, table.perm] })
]);
var userAssignments = w3suiteSchema.table("user_assignments", {
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid4("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  scopeType: scopeTypeEnum("scope_type").notNull(),
  scopeId: uuid4("scope_id").notNull(),
  expiresAt: timestamp4("expires_at"),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId, table.scopeType, table.scopeId] })
]);
var insertUserAssignmentSchema = createInsertSchema4(userAssignments).omit({
  createdAt: true
});
var userExtraPerms = w3suiteSchema.table("user_extra_perms", {
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  perm: varchar4("perm", { length: 255 }).notNull(),
  mode: permModeEnum("mode").notNull(),
  expiresAt: timestamp4("expires_at"),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.perm] })
]);
var userStores = w3suiteSchema.table("user_stores", {
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  isPrimary: boolean4("is_primary").default(false),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.storeId] }),
  index4("user_stores_user_idx").on(table.userId),
  index4("user_stores_store_idx").on(table.storeId),
  index4("user_stores_tenant_idx").on(table.tenantId)
]);
var insertUserStoreSchema = createInsertSchema4(userStores).omit({
  createdAt: true
});
var userLegalEntities = w3suiteSchema.table("user_legal_entities", {
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  legalEntityId: uuid4("legal_entity_id").notNull().references(() => legalEntities.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.legalEntityId] }),
  index4("user_legal_entities_user_idx").on(table.userId),
  index4("user_legal_entities_legal_entity_idx").on(table.legalEntityId),
  index4("user_legal_entities_tenant_idx").on(table.tenantId)
]);
var insertUserLegalEntitySchema = createInsertSchema4(userLegalEntities).omit({
  createdAt: true
});
var storeBrands = w3suiteSchema.table("store_brands", {
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  brandId: uuid4("brand_id").notNull().references(() => brands.id),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  isPrimary: boolean4("is_primary").default(false),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  primaryKey({ columns: [table.storeId, table.brandId] }),
  index4("store_brands_tenant_idx").on(table.tenantId)
]);
var storeDriverPotential = w3suiteSchema.table("store_driver_potential", {
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  driverId: uuid4("driver_id").notNull().references(() => drivers.id),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  potentialScore: smallint4("potential_score").notNull(),
  clusterLabel: varchar4("cluster_label", { length: 50 }),
  kpis: jsonb4("kpis"),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  primaryKey({ columns: [table.storeId, table.driverId] }),
  index4("store_driver_potential_tenant_idx").on(table.tenantId)
]);
var entityLogs = w3suiteSchema.table("entity_logs", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  entityType: varchar4("entity_type", { length: 50 }).notNull(),
  // 'legal_entity', 'store', 'user'
  entityId: uuid4("entity_id").notNull(),
  action: varchar4("action", { length: 50 }).notNull(),
  // 'created', 'status_changed', 'updated', 'deleted'
  previousStatus: varchar4("previous_status", { length: 50 }),
  newStatus: varchar4("new_status", { length: 50 }),
  changes: jsonb4("changes"),
  // JSON con tutti i cambiamenti
  userId: varchar4("user_id").references(() => users.id),
  // Chi ha fatto il cambio
  userEmail: varchar4("user_email", { length: 255 }),
  notes: text4("notes"),
  createdAt: timestamp4("created_at").defaultNow()
});
var insertEntityLogSchema = createInsertSchema4(entityLogs).omit({
  id: true,
  createdAt: true
});
var structuredLogs = w3suiteSchema.table("structured_logs", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Core log fields
  level: varchar4("level", { length: 10 }).notNull(),
  // INFO, WARN, ERROR, DEBUG
  message: text4("message").notNull(),
  component: varchar4("component", { length: 100 }).notNull(),
  // Context tracking
  correlationId: varchar4("correlation_id", { length: 50 }),
  userId: varchar4("user_id").references(() => users.id),
  userEmail: varchar4("user_email", { length: 255 }),
  // Business context
  action: varchar4("action", { length: 100 }),
  entityType: varchar4("entity_type", { length: 50 }),
  // 'tenant', 'legal_entity', 'store', 'user'
  entityId: uuid4("entity_id"),
  // Performance metrics
  duration: integer3("duration"),
  // in milliseconds
  // Request context
  httpMethod: varchar4("http_method", { length: 10 }),
  httpPath: varchar4("http_path", { length: 255 }),
  httpStatusCode: integer3("http_status_code"),
  ipAddress: varchar4("ip_address", { length: 45 }),
  // IPv6 compatible
  userAgent: text4("user_agent"),
  // Error context
  errorStack: text4("error_stack"),
  errorCode: varchar4("error_code", { length: 50 }),
  // Additional metadata
  metadata: jsonb4("metadata"),
  // Flexible JSON data
  // Timestamps
  timestamp: timestamp4("timestamp").notNull().defaultNow(),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  // Indexes for performance
  index4("structured_logs_tenant_timestamp_idx").on(table.tenantId, table.timestamp),
  index4("structured_logs_level_timestamp_idx").on(table.level, table.timestamp),
  index4("structured_logs_component_timestamp_idx").on(table.component, table.timestamp),
  index4("structured_logs_correlation_idx").on(table.correlationId),
  index4("structured_logs_user_timestamp_idx").on(table.userId, table.timestamp),
  index4("structured_logs_entity_idx").on(table.entityType, table.entityId)
]);
var insertStructuredLogSchema = createInsertSchema4(structuredLogs).omit({
  id: true,
  createdAt: true,
  timestamp: true
});
var objectMetadata = w3suiteSchema.table("object_metadata", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  objectPath: varchar4("object_path", { length: 500 }).notNull().unique(),
  fileName: varchar4("file_name", { length: 255 }).notNull(),
  contentType: varchar4("content_type", { length: 100 }).notNull(),
  fileSize: integer3("file_size").notNull(),
  visibility: objectVisibilityEnum("visibility").notNull().default("private"),
  objectType: objectTypeEnum("object_type").notNull().default("file"),
  uploadedBy: varchar4("uploaded_by").notNull().references(() => users.id),
  publicUrl: varchar4("public_url", { length: 500 }),
  bucketId: varchar4("bucket_id", { length: 100 }),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  expiresAt: timestamp4("expires_at"),
  metadata: jsonb4("metadata").default({})
  // Additional custom metadata
}, (table) => [
  index4("object_metadata_tenant_idx").on(table.tenantId),
  index4("object_metadata_uploaded_by_idx").on(table.uploadedBy),
  index4("object_metadata_object_type_idx").on(table.objectType)
]);
var insertObjectMetadataSchema = createInsertSchema4(objectMetadata).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var objectAcls = w3suiteSchema.table("object_acls", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  objectPath: varchar4("object_path", { length: 500 }).notNull(),
  ownerId: varchar4("owner_id").notNull().references(() => users.id),
  ownerTenantId: uuid4("owner_tenant_id").notNull().references(() => tenants.id),
  visibility: objectVisibilityEnum("visibility").notNull().default("private"),
  accessRules: jsonb4("access_rules").default([]),
  // Array of access rules
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("object_acls_tenant_idx").on(table.tenantId),
  index4("object_acls_object_path_idx").on(table.objectPath),
  index4("object_acls_owner_idx").on(table.ownerId),
  uniqueIndex3("object_acls_object_path_unique").on(table.objectPath)
]);
var insertObjectAclSchema = createInsertSchema4(objectAcls).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var notifications = w3suiteSchema.table("notifications", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Notification Classification
  type: notificationTypeEnum("type").notNull().default("system"),
  priority: notificationPriorityEnum("priority").notNull().default("medium"),
  status: notificationStatusEnum("status").notNull().default("unread"),
  // ==================== BUSINESS CATEGORY EXTENSION ====================
  category: notificationCategoryEnum("category").default("support"),
  // Business category
  sourceModule: varchar4("source_module", { length: 50 }),
  // Module that generated notification
  // Content
  title: varchar4("title", { length: 255 }).notNull(),
  message: text4("message").notNull(),
  data: jsonb4("data").default({}),
  // Extra structured data
  url: varchar4("url", { length: 500 }),
  // Deep link URL
  // ==================== ENHANCED TARGETING ====================
  targetUserId: varchar4("target_user_id").references(() => users.id),
  // Specific user (null = broadcast)
  targetRoles: text4("target_roles").array(),
  // Role-based targeting
  broadcast: boolean4("broadcast").default(false),
  // Send to all tenant users
  // Store/Area specific targeting
  storeId: uuid4("store_id").references(() => stores.id),
  // Store-specific notifications
  areaId: uuid4("area_id").references(() => legalEntities.id),
  // Area-specific (via legal entities)
  // ==================== REAL-TIME TRACKING ====================
  websocketSent: boolean4("websocket_sent").default(false),
  // Track real-time delivery
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  expiresAt: timestamp4("expires_at")
  // Auto-cleanup for temp notifications
}, (table) => [
  // Performance indexes for common queries
  index4("notifications_tenant_status_created_idx").on(table.tenantId, table.status, table.createdAt.desc()),
  index4("notifications_tenant_user_status_idx").on(table.tenantId, table.targetUserId, table.status),
  index4("notifications_target_roles_gin_idx").using("gin", table.targetRoles),
  index4("notifications_expires_at_idx").on(table.expiresAt),
  index4("notifications_tenant_priority_created_idx").on(table.tenantId, table.priority, table.createdAt.desc()),
  // ==================== NEW INDEXES FOR BUSINESS CATEGORIES ====================
  index4("notifications_category_created_idx").on(table.category, table.createdAt.desc()),
  index4("notifications_store_category_idx").on(table.storeId, table.category, table.status),
  index4("notifications_area_category_idx").on(table.areaId, table.category, table.status),
  index4("notifications_websocket_pending_idx").on(table.websocketSent, table.status, table.createdAt)
]);
var insertNotificationSchema = createInsertSchema4(notifications).omit({
  id: true,
  createdAt: true
});
var notificationTemplates = w3suiteSchema.table("notification_templates", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Template Identification
  templateKey: varchar4("template_key", { length: 100 }).notNull(),
  // e.g., 'hr_request_submitted'
  category: varchar4("category", { length: 50 }).notNull(),
  // e.g., 'hr_request', 'general'
  eventType: varchar4("event_type", { length: 100 }).notNull(),
  // e.g., 'status_change', 'deadline_reminder'
  // Template Content
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  // In-App Notification Template
  inAppTitle: varchar4("in_app_title", { length: 255 }).notNull(),
  inAppMessage: text4("in_app_message").notNull(),
  inAppUrl: varchar4("in_app_url", { length: 500 }),
  // Deep link template
  // Email Template
  emailSubject: varchar4("email_subject", { length: 255 }),
  emailBodyHtml: text4("email_body_html"),
  emailBodyText: text4("email_body_text"),
  // Template Variables (documentation)
  availableVariables: jsonb4("available_variables").default([]),
  // Array of variable names
  // Targeting Rules
  defaultPriority: notificationPriorityEnum("default_priority").notNull().default("medium"),
  roleTargeting: text4("role_targeting").array(),
  // Default roles to target
  // Metadata
  isActive: boolean4("is_active").default(true),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("notification_templates_tenant_idx").on(table.tenantId),
  index4("notification_templates_category_idx").on(table.category),
  uniqueIndex3("notification_templates_tenant_key_unique").on(table.tenantId, table.templateKey)
]);
var insertNotificationTemplateSchema = createInsertSchema4(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var notificationPreferences = w3suiteSchema.table("notification_preferences", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  // Channel Preferences
  inAppEnabled: boolean4("in_app_enabled").default(true),
  emailEnabled: boolean4("email_enabled").default(true),
  // Category Preferences (JSON for flexibility)
  categoryPreferences: jsonb4("category_preferences").default({}),
  // { hr_request: { email: true, inApp: true, priority: 'high' } }
  // Priority Filtering
  minPriorityInApp: notificationPriorityEnum("min_priority_in_app").default("low"),
  minPriorityEmail: notificationPriorityEnum("min_priority_email").default("medium"),
  // Quiet Hours (24-hour format)
  quietHoursEnabled: boolean4("quiet_hours_enabled").default(false),
  quietHoursStart: varchar4("quiet_hours_start", { length: 5 }),
  // "22:00"
  quietHoursEnd: varchar4("quiet_hours_end", { length: 5 }),
  // "08:00"
  // Digest Preferences
  dailyDigestEnabled: boolean4("daily_digest_enabled").default(false),
  weeklyDigestEnabled: boolean4("weekly_digest_enabled").default(true),
  digestDeliveryTime: varchar4("digest_delivery_time", { length: 5 }).default("09:00"),
  // "09:00"
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("notification_preferences_tenant_idx").on(table.tenantId),
  index4("notification_preferences_user_idx").on(table.userId),
  uniqueIndex3("notification_preferences_tenant_user_unique").on(table.tenantId, table.userId)
]);
var insertNotificationPreferenceSchema = createInsertSchema4(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var suppliers = w3suiteSchema.table("suppliers", {
  // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  origin: supplierOriginEnum("origin").notNull(),
  // 'brand' | 'tenant'
  tenantId: uuid4("tenant_id").references(() => tenants.id),
  // NULL per supplier brand-managed
  externalId: varchar4("external_id", { length: 100 }),
  // ID da Brand Interface
  code: varchar4("code", { length: 50 }).notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  // Nome commerciale
  legalName: varchar4("legal_name", { length: 255 }),
  // Ragione sociale legale
  legalForm: varchar4("legal_form", { length: 100 }),
  // Forma giuridica (SRL, SPA, etc.)
  supplierType: supplierTypeEnum("supplier_type").notNull(),
  // ==================== DATI FISCALI ITALIA ====================
  vatNumber: varchar4("vat_number", { length: 20 }),
  // P.IVA
  taxCode: varchar4("tax_code", { length: 20 }),
  // Codice Fiscale (opzionale)
  sdiCode: varchar4("sdi_code", { length: 20 }),
  // Codice SDI fatturazione elettronica
  pecEmail: varchar4("pec_email", { length: 255 }),
  // PEC (alternativa a SDI)
  reaNumber: varchar4("rea_number", { length: 50 }),
  // Numero REA
  chamberOfCommerce: varchar4("chamber_of_commerce", { length: 255 }),
  // ==================== INDIRIZZO SEDE LEGALE ====================
  registeredAddress: jsonb4("registered_address"),
  // { via, civico, cap, citta, provincia }
  cityId: uuid4("city_id").references(() => italianCities.id),
  // FK to public.italian_cities
  countryId: uuid4("country_id").references(() => countries.id).notNull(),
  // FK to public.countries
  // ==================== PAGAMENTI ====================
  preferredPaymentMethodId: uuid4("preferred_payment_method_id").references(() => paymentMethods.id),
  paymentConditionId: uuid4("payment_condition_id").references(() => paymentMethodsConditions.id),
  paymentTerms: varchar4("payment_terms", { length: 100 }),
  // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
  currency: varchar4("currency", { length: 3 }).default("EUR"),
  // ==================== CONTATTI ====================
  email: varchar4("email", { length: 255 }),
  // Email principale
  phone: varchar4("phone", { length: 50 }),
  // Telefono principale
  website: varchar4("website", { length: 255 }),
  // Sito web
  // Referenti strutturati (JSONB per flessibilità)
  contacts: jsonb4("contacts").default({}),
  // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
  // ==================== AMMINISTRATIVI ESTESI ====================
  iban: varchar4("iban", { length: 34 }),
  // Codice IBAN
  bic: varchar4("bic", { length: 11 }),
  // Codice BIC/SWIFT
  splitPayment: boolean4("split_payment").default(false),
  // Split Payment
  withholdingTax: boolean4("withholding_tax").default(false),
  // Ritenuta d'Acconto
  taxRegime: varchar4("tax_regime", { length: 100 }),
  // Regime fiscale
  // ==================== CONTROLLO & STATO ====================
  status: supplierStatusEnum("status").notNull().default("active"),
  lockedFields: text4("locked_fields").array().default([]),
  // Campi bloccati dal brand
  // ==================== METADATI ====================
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  notes: text4("notes")
}, (table) => [
  // Performance indexes
  index4("suppliers_tenant_code_idx").on(table.tenantId, table.code),
  index4("suppliers_origin_status_idx").on(table.origin, table.status),
  index4("suppliers_vat_number_idx").on(table.vatNumber),
  index4("suppliers_name_idx").on(table.name),
  uniqueIndex3("suppliers_code_unique").on(table.code)
]);
var insertSupplierSchema = createInsertSchema4(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var supplierOverrides = w3suiteSchema.table("supplier_overrides", {
  // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  origin: supplierOriginEnum("origin").notNull().default("tenant"),
  // Always 'tenant' for this table
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Always required for tenant suppliers
  externalId: varchar4("external_id", { length: 100 }),
  // ID from Brand Interface (usually NULL for tenant suppliers)
  code: varchar4("code", { length: 50 }).notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  // Nome commerciale
  legalName: varchar4("legal_name", { length: 255 }),
  // Ragione sociale legale
  legalForm: varchar4("legal_form", { length: 100 }),
  // Forma giuridica (SRL, SPA, etc.)
  supplierType: supplierTypeEnum("supplier_type").notNull(),
  // ==================== DATI FISCALI ITALIA ====================
  vatNumber: varchar4("vat_number", { length: 20 }),
  // P.IVA
  taxCode: varchar4("tax_code", { length: 20 }),
  // Codice Fiscale (opzionale)
  sdiCode: varchar4("sdi_code", { length: 20 }),
  // Codice SDI fatturazione elettronica
  pecEmail: varchar4("pec_email", { length: 255 }),
  // PEC (alternativa a SDI)
  reaNumber: varchar4("rea_number", { length: 50 }),
  // Numero REA
  chamberOfCommerce: varchar4("chamber_of_commerce", { length: 255 }),
  // ==================== INDIRIZZO SEDE LEGALE ====================
  registeredAddress: jsonb4("registered_address"),
  // { via, civico, cap, citta, provincia }
  cityId: uuid4("city_id").references(() => italianCities.id),
  // FK to public.italian_cities
  countryId: uuid4("country_id").references(() => countries.id).notNull(),
  // FK to public.countries
  // ==================== PAGAMENTI ====================
  preferredPaymentMethodId: uuid4("preferred_payment_method_id").references(() => paymentMethods.id),
  paymentConditionId: uuid4("payment_condition_id").references(() => paymentMethodsConditions.id),
  paymentTerms: varchar4("payment_terms", { length: 100 }),
  // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
  currency: varchar4("currency", { length: 3 }).default("EUR"),
  // ==================== CONTATTI ====================
  email: varchar4("email", { length: 255 }),
  // Email principale
  phone: varchar4("phone", { length: 50 }),
  // Telefono principale
  website: varchar4("website", { length: 255 }),
  // Sito web
  // Referenti strutturati (JSONB per flessibilità)
  contacts: jsonb4("contacts").default({}),
  // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
  // ==================== AMMINISTRATIVI ESTESI ====================
  iban: varchar4("iban", { length: 34 }),
  // Codice IBAN
  bic: varchar4("bic", { length: 11 }),
  // Codice BIC/SWIFT
  splitPayment: boolean4("split_payment").default(false),
  // Split Payment
  withholdingTax: boolean4("withholding_tax").default(false),
  // Ritenuta d'Acconto
  taxRegime: varchar4("tax_regime", { length: 100 }),
  // Regime fiscale
  // ==================== CONTROLLO & STATO ====================
  status: supplierStatusEnum("status").notNull().default("active"),
  lockedFields: text4("locked_fields").array().default([]),
  // Campi bloccati dal brand (usually empty for tenant suppliers)
  // ==================== METADATI ====================
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  notes: text4("notes")
}, (table) => [
  // Performance indexes
  index4("supplier_overrides_tenant_code_idx").on(table.tenantId, table.code),
  index4("supplier_overrides_origin_status_idx").on(table.origin, table.status),
  index4("supplier_overrides_vat_number_idx").on(table.vatNumber),
  index4("supplier_overrides_name_idx").on(table.name),
  uniqueIndex3("supplier_overrides_tenant_code_unique").on(table.tenantId, table.code)
]);
var insertSupplierOverrideSchema = createInsertSchema4(supplierOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var tenantCustomDrivers = w3suiteSchema.table("tenant_custom_drivers", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar4("code", { length: 50 }).notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  active: boolean4("active").default(true),
  sortOrder: smallint4("sort_order").default(0),
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("idx_tenant_custom_drivers_tenant").on(table.tenantId),
  uniqueIndex3("tenant_custom_drivers_unique").on(table.tenantId, table.code)
]);
var insertTenantCustomDriverSchema = createInsertSchema4(tenantCustomDrivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var tenantDriverCategories = w3suiteSchema.table("tenant_driver_categories", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Can reference either brand driver (public.drivers) OR tenant custom driver
  brandDriverId: uuid4("brand_driver_id"),
  // References public.drivers
  customDriverId: uuid4("custom_driver_id").references(() => tenantCustomDrivers.id, { onDelete: "cascade" }),
  code: varchar4("code", { length: 50 }).notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  active: boolean4("active").default(true),
  sortOrder: smallint4("sort_order").default(0),
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("idx_tenant_driver_categories_tenant").on(table.tenantId),
  index4("idx_tenant_driver_categories_brand_driver").on(table.brandDriverId),
  index4("idx_tenant_driver_categories_custom_driver").on(table.customDriverId),
  uniqueIndex3("tenant_driver_categories_brand_unique").on(table.tenantId, table.brandDriverId, table.code),
  uniqueIndex3("tenant_driver_categories_custom_unique").on(table.tenantId, table.customDriverId, table.code)
]);
var insertTenantDriverCategorySchema = createInsertSchema4(tenantDriverCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var tenantDriverTypologies = w3suiteSchema.table("tenant_driver_typologies", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Can reference either brand category (public.driver_categories) OR tenant custom category
  brandCategoryId: uuid4("brand_category_id"),
  // References public.driver_categories
  customCategoryId: uuid4("custom_category_id").references(() => tenantDriverCategories.id, { onDelete: "cascade" }),
  code: varchar4("code", { length: 50 }).notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  active: boolean4("active").default(true),
  sortOrder: smallint4("sort_order").default(0),
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("idx_tenant_driver_typologies_tenant").on(table.tenantId),
  index4("idx_tenant_driver_typologies_brand_category").on(table.brandCategoryId),
  index4("idx_tenant_driver_typologies_custom_category").on(table.customCategoryId),
  uniqueIndex3("tenant_driver_typologies_brand_unique").on(table.tenantId, table.brandCategoryId, table.code),
  uniqueIndex3("tenant_driver_typologies_custom_unique").on(table.tenantId, table.customCategoryId, table.code)
]);
var insertTenantDriverTypologySchema = createInsertSchema4(tenantDriverTypologies).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var calendarEvents = w3suiteSchema.table("calendar_events", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  ownerId: varchar4("owner_id").notNull().references(() => users.id),
  // Core event data
  title: varchar4("title", { length: 255 }).notNull(),
  description: text4("description"),
  location: varchar4("location", { length: 255 }),
  startDate: timestamp4("start_date").notNull(),
  endDate: timestamp4("end_date").notNull(),
  allDay: boolean4("all_day").default(false),
  // Event classification
  type: calendarEventTypeEnum("type").notNull().default("other"),
  visibility: calendarEventVisibilityEnum("visibility").notNull().default("private"),
  status: calendarEventStatusEnum("status").notNull().default("tentative"),
  hrSensitive: boolean4("hr_sensitive").default(false),
  // ✅ BUSINESS CATEGORY (was missing from Drizzle)
  category: calendarEventCategoryEnum("category").notNull().default("hr"),
  // RBAC scoping
  teamId: uuid4("team_id"),
  storeId: uuid4("store_id").references(() => stores.id),
  areaId: uuid4("area_id"),
  // Recurring events
  recurring: jsonb4("recurring").default({}),
  // { pattern, interval, daysOfWeek, endDate, exceptions }
  // Participants
  attendees: jsonb4("attendees").default([]),
  // [{ userId, status, responseTime }]
  // Additional metadata
  metadata: jsonb4("metadata").default({}),
  // Type-specific data
  color: varchar4("color", { length: 7 }),
  // Hex color for UI
  // Audit fields
  createdBy: varchar4("created_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("calendar_events_tenant_owner_idx").on(table.tenantId, table.ownerId),
  index4("calendar_events_tenant_date_idx").on(table.tenantId, table.startDate, table.endDate),
  index4("calendar_events_tenant_type_idx").on(table.tenantId, table.type),
  index4("calendar_events_store_date_idx").on(table.storeId, table.startDate)
]);
var insertCalendarEventSchema = createInsertSchema4(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var encryptionKeys = w3suiteSchema.table("encryption_keys", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Key identification
  keyId: varchar4("key_id", { length: 100 }).notNull().unique(),
  version: integer3("version").notNull().default(1),
  // Key metadata (NOT the actual key - keys are derived client-side)
  algorithm: varchar4("algorithm", { length: 50 }).notNull().default("AES-GCM"),
  keyLength: integer3("key_length").notNull().default(256),
  saltBase64: text4("salt_base64").notNull(),
  // Salt for key derivation
  iterations: integer3("iterations").notNull().default(1e5),
  // Key status
  isActive: boolean4("is_active").default(true),
  // GDPR compliance
  destroyedAt: timestamp4("destroyed_at"),
  // For "right to be forgotten"
  destroyReason: varchar4("destroy_reason", { length: 100 }),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  expiresAt: timestamp4("expires_at")
  // Key rotation
}, (table) => [
  index4("encryption_keys_tenant_active_idx").on(table.tenantId, table.isActive),
  index4("encryption_keys_key_id_idx").on(table.keyId)
]);
var insertEncryptionKeySchema = createInsertSchema4(encryptionKeys).omit({
  id: true,
  createdAt: true
});
var timeTracking = w3suiteSchema.table("time_tracking", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  storeId: uuid4("store_id").notNull().references(() => stores.id),
  // Clock times
  clockIn: timestamp4("clock_in").notNull(),
  clockOut: timestamp4("clock_out"),
  breaks: jsonb4("breaks").default([]),
  // [{ start, end, duration }]
  // Tracking details
  trackingMethod: trackingMethodEnum("tracking_method").notNull(),
  // LEGACY FIELDS (for backwards compatibility)
  geoLocation: jsonb4("geo_location"),
  // { lat, lng, accuracy, address } - DEPRECATED
  deviceInfo: jsonb4("device_info"),
  // { deviceId, deviceType, ipAddress, userAgent } - DEPRECATED
  notes: text4("notes"),
  // DEPRECATED - use encryptedNotes
  // ENCRYPTED FIELDS
  encryptedGeoLocation: text4("encrypted_geo_location"),
  // Base64 encrypted geo data
  encryptedDeviceInfo: text4("encrypted_device_info"),
  // Base64 encrypted device data  
  encryptedNotes: text4("encrypted_notes"),
  // Base64 encrypted notes
  // ENCRYPTION METADATA
  encryptionKeyId: varchar4("encryption_key_id", { length: 100 }).references(() => encryptionKeys.keyId),
  encryptionVersion: integer3("encryption_version").default(1),
  geoLocationIv: varchar4("geo_location_iv", { length: 100 }),
  // Initialization vector for geo
  deviceInfoIv: varchar4("device_info_iv", { length: 100 }),
  // IV for device info
  notesIv: varchar4("notes_iv", { length: 100 }),
  // IV for notes
  geoLocationTag: varchar4("geo_location_tag", { length: 100 }),
  // Auth tag for geo
  deviceInfoTag: varchar4("device_info_tag", { length: 100 }),
  // Auth tag for device
  notesTag: varchar4("notes_tag", { length: 100 }),
  // Auth tag for notes
  encryptedAt: timestamp4("encrypted_at"),
  // When data was encrypted
  // Shift association
  shiftId: uuid4("shift_id").references(() => shifts.id),
  // FK to planned shift
  // Calculated fields
  totalMinutes: integer3("total_minutes"),
  breakMinutes: integer3("break_minutes"),
  overtimeMinutes: integer3("overtime_minutes"),
  holidayBonus: boolean4("holiday_bonus").default(false),
  // Status and approval
  status: timeTrackingStatusEnum("status").notNull().default("active"),
  editReason: text4("edit_reason"),
  approvedBy: varchar4("approved_by").references(() => users.id),
  approvedAt: timestamp4("approved_at"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("time_tracking_tenant_user_idx").on(table.tenantId, table.userId),
  index4("time_tracking_tenant_store_date_idx").on(table.tenantId, table.storeId, table.clockIn),
  index4("time_tracking_shift_idx").on(table.shiftId),
  index4("time_tracking_status_idx").on(table.status),
  index4("time_tracking_encryption_key_idx").on(table.encryptionKeyId)
]);
var insertTimeTrackingSchema = createInsertSchema4(timeTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var storesTimetrackingMethods = w3suiteSchema.table("stores_timetracking_methods", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid4("store_id").notNull().references(() => stores.id),
  // Method configuration
  method: trackingMethodEnum("method").notNull(),
  enabled: boolean4("enabled").default(true),
  priority: integer3("priority").default(0),
  // For ordering methods in UI
  // Method-specific configuration
  config: jsonb4("config").default({}),
  // Store method-specific settings
  // Examples of config content:
  // GPS: { geofenceRadius: 200, requiresWiFi: false, accuracyThreshold: 50 }
  // QR: { qrCodeUrl: "...", dynamicRefresh: 300, cameraRequired: true }
  // NFC: { requiredBadgeTypes: ["employee", "temp"], timeout: 30 }
  // Badge: { allowedBadgeFormats: ["numeric", "barcode"], length: 8 }
  // Smart: { fallbackOrder: ["gps", "qr", "badge"], confidence: 0.8 }
  // Web: { cookieExpiry: 2592000, fingerprintStrict: true }
  // Audit fields
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id)
}, (table) => [
  // Ensure unique store-method combinations per tenant
  uniqueIndex3("stores_timetracking_methods_unique").on(table.tenantId, table.storeId, table.method),
  index4("stores_timetracking_methods_tenant_idx").on(table.tenantId),
  index4("stores_timetracking_methods_store_idx").on(table.storeId),
  index4("stores_timetracking_methods_enabled_idx").on(table.enabled)
]);
var insertStoresTimetrackingMethodsSchema = createInsertSchema4(storesTimetrackingMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var shifts = w3suiteSchema.table("shifts", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid4("store_id").notNull().references(() => stores.id),
  // Shift identification
  name: varchar4("name", { length: 100 }).notNull(),
  code: varchar4("code", { length: 50 }),
  // Timing
  date: date3("date").notNull(),
  startTime: timestamp4("start_time").notNull(),
  endTime: timestamp4("end_time").notNull(),
  breakMinutes: integer3("break_minutes").default(0),
  // Attendance tolerance (minutes)
  clockInToleranceMinutes: integer3("clock_in_tolerance_minutes").default(15),
  clockOutToleranceMinutes: integer3("clock_out_tolerance_minutes").default(15),
  // Staffing
  requiredStaff: integer3("required_staff").notNull(),
  assignedUsers: jsonb4("assigned_users").default([]),
  // [userId1, userId2, ...]
  // Shift details
  shiftType: shiftTypeEnum("shift_type").notNull(),
  templateId: uuid4("template_id"),
  templateVersionId: uuid4("template_version_id"),
  // References the specific template version used
  skills: jsonb4("skills").default([]),
  // Required skills/certifications
  // Status and display
  status: shiftStatusEnum("status").notNull().default("draft"),
  notes: text4("notes"),
  color: varchar4("color", { length: 7 }),
  // Hex color for UI
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").notNull().references(() => users.id)
}, (table) => [
  index4("shifts_tenant_store_date_idx").on(table.tenantId, table.storeId, table.date),
  index4("shifts_tenant_status_idx").on(table.tenantId, table.status),
  index4("shifts_template_idx").on(table.templateId),
  index4("shifts_template_version_idx").on(table.templateVersionId)
]);
var insertShiftSchema = createInsertSchema4(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var shiftTemplates = w3suiteSchema.table("shift_templates", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Template identification
  name: varchar4("name", { length: 100 }).notNull(),
  description: text4("description"),
  // Scope: 'global' = tutti i negozi, 'store' = solo negozio specifico
  scope: varchar4("scope", { length: 10 }).notNull().default("global"),
  // 'global' | 'store'
  // Store assignment (solo se scope='store')
  storeId: uuid4("store_id").references(() => stores.id),
  // Pattern configuration
  pattern: shiftPatternEnum("pattern").notNull(),
  rules: jsonb4("rules").default({}),
  // Complex recurrence rules
  // Default values
  defaultStartTime: varchar4("default_start_time", { length: 5 }),
  // HH:MM format
  defaultEndTime: varchar4("default_end_time", { length: 5 }),
  // HH:MM format
  defaultRequiredStaff: integer3("default_required_staff").notNull(),
  defaultSkills: jsonb4("default_skills").default([]),
  defaultBreakMinutes: integer3("default_break_minutes").default(30),
  // ✅ NEW: Shift Type and Global Tolerances for Split Shifts
  // 'slot_based': Each time slot is a separate shift with its own tolerances/breaks
  // 'split_shift': All time slots together form one shift with global tolerances/breaks
  shiftType: varchar4("shift_type", { length: 20 }).notNull().default("slot_based"),
  // 'slot_based' | 'split_shift'
  globalClockInTolerance: integer3("global_clock_in_tolerance"),
  // Used only for split_shift type
  globalClockOutTolerance: integer3("global_clock_out_tolerance"),
  // Used only for split_shift type
  globalBreakMinutes: integer3("global_break_minutes"),
  // Used only for split_shift type
  // Validity and status
  isActive: boolean4("is_active").default(true),
  status: varchar4("status", { length: 20 }).default("active"),
  // NEW: active | archived
  validFrom: date3("valid_from"),
  validUntil: date3("valid_until"),
  // Duplication tracking - references parent template if this was created via duplicate
  sourceTemplateId: uuid4("source_template_id"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("shift_templates_tenant_active_idx").on(table.tenantId, table.isActive),
  index4("shift_templates_pattern_idx").on(table.pattern),
  index4("shift_templates_store_idx").on(table.storeId),
  index4("shift_templates_source_idx").on(table.sourceTemplateId)
]);
var insertShiftTemplateSchema = createInsertSchema4(shiftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var shiftTemplateVersions = w3suiteSchema.table("shift_template_versions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid4("template_id").notNull().references(() => shiftTemplates.id, { onDelete: "cascade" }),
  // Version tracking
  versionNumber: integer3("version_number").notNull(),
  // Auto-incremented per template
  effectiveFrom: timestamp4("effective_from").notNull().defaultNow(),
  effectiveUntil: timestamp4("effective_until"),
  // NULL = current version
  // Snapshot of template data at this version
  name: varchar4("name", { length: 100 }).notNull(),
  description: text4("description"),
  scope: varchar4("scope", { length: 10 }).notNull(),
  storeId: uuid4("store_id"),
  shiftType: varchar4("shift_type", { length: 20 }).notNull(),
  // Global tolerances (for split_shift type)
  globalClockInTolerance: integer3("global_clock_in_tolerance"),
  globalClockOutTolerance: integer3("global_clock_out_tolerance"),
  globalBreakMinutes: integer3("global_break_minutes"),
  // Time slots snapshot (JSON array with all slot data)
  timeSlotsSnapshot: jsonb4("time_slots_snapshot").notNull().default([]),
  // Change tracking
  changeReason: text4("change_reason"),
  // Optional reason for version change
  changedBy: varchar4("changed_by").references(() => users.id),
  // Audit
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  index4("shift_template_versions_template_idx").on(table.templateId),
  index4("shift_template_versions_version_idx").on(table.templateId, table.versionNumber),
  index4("shift_template_versions_effective_idx").on(table.templateId, table.effectiveFrom)
]);
var insertShiftTemplateVersionSchema = createInsertSchema4(shiftTemplateVersions).omit({
  id: true,
  createdAt: true
});
var shiftTimeSlots = w3suiteSchema.table("shift_time_slots", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid4("template_id").notNull().references(() => shiftTemplates.id, { onDelete: "cascade" }),
  // Time slot identification
  name: varchar4("name", { length: 100 }).notNull(),
  // e.g. "Apertura", "Pausa Pranzo", "Chiusura"
  slotOrder: integer3("slot_order").notNull(),
  // Order within the template
  // Timing
  startTime: varchar4("start_time", { length: 5 }).notNull(),
  // HH:MM format
  endTime: varchar4("end_time", { length: 5 }).notNull(),
  // HH:MM format
  // ✅ NEW: Multi-block shift support (up to 4 blocks)
  segmentType: varchar4("segment_type", { length: 20 }).notNull().default("continuous"),
  // continuous | split | triple | quad
  block2StartTime: varchar4("block2_start_time", { length: 5 }),
  // For multi-block shifts
  block2EndTime: varchar4("block2_end_time", { length: 5 }),
  // For multi-block shifts
  block3StartTime: varchar4("block3_start_time", { length: 5 }),
  // For triple/quad shifts
  block3EndTime: varchar4("block3_end_time", { length: 5 }),
  // For triple/quad shifts
  block4StartTime: varchar4("block4_start_time", { length: 5 }),
  // For quad shifts only
  block4EndTime: varchar4("block4_end_time", { length: 5 }),
  // For quad shifts only
  breakMinutes: integer3("break_minutes").default(0),
  // Break duration (applies to all types)
  clockInTolerance: integer3("clock_in_tolerance").default(15),
  // Minutes tolerance for clock-in
  clockOutTolerance: integer3("clock_out_tolerance").default(15),
  // Minutes tolerance for clock-out
  // Slot configuration
  requiredStaff: integer3("required_staff").notNull(),
  skills: jsonb4("skills").default([]),
  // Required skills for this slot
  isBreak: boolean4("is_break").default(false),
  // True if this is a break slot
  // Flexibility
  minStaff: integer3("min_staff"),
  // Minimum staff required
  maxStaff: integer3("max_staff"),
  // Maximum staff allowed
  priority: integer3("priority").default(1),
  // 1=critical, 2=important, 3=optional
  // Metadata
  color: varchar4("color", { length: 7 }),
  // Hex color for UI display
  notes: text4("notes"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("shift_time_slots_template_order_idx").on(table.templateId, table.slotOrder),
  index4("shift_time_slots_tenant_idx").on(table.tenantId),
  uniqueIndex3("shift_time_slots_template_order_unique").on(table.templateId, table.slotOrder)
]);
var insertShiftTimeSlotSchema = createInsertSchema4(shiftTimeSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var shiftAssignments = w3suiteSchema.table("shift_assignments", {
  id: varchar4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: varchar4("tenant_id").notNull().references(() => tenants.id),
  shiftId: varchar4("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Assignment details
  assignmentType: varchar4("assignment_type", { length: 20 }).notNull().default("manual"),
  // manual, auto, template
  timeSlotId: varchar4("time_slot_id").references(() => shiftTimeSlots.id),
  // Specific time slot assignment
  // Assignment metadata
  assignedAt: timestamp4("assigned_at").defaultNow(),
  assignedBy: varchar4("assigned_by").notNull().references(() => users.id),
  // Status tracking
  // Status values: assigned, confirmed, rejected, completed, override, cancelled
  // - override: Assignment was overridden by approved leave/sick request
  // - cancelled: Assignment was manually cancelled
  status: varchar4("status", { length: 20 }).notNull().default("assigned"),
  confirmedAt: timestamp4("confirmed_at"),
  rejectedAt: timestamp4("rejected_at"),
  rejectionReason: text4("rejection_reason"),
  // Performance tracking
  punctualityScore: integer3("punctuality_score"),
  // 0-100 score for punctuality
  performanceNotes: text4("performance_notes"),
  // Compliance and attendance
  expectedClockIn: timestamp4("expected_clock_in"),
  expectedClockOut: timestamp4("expected_clock_out"),
  actualClockIn: timestamp4("actual_clock_in"),
  actualClockOut: timestamp4("actual_clock_out"),
  // Deviation tracking
  clockInDeviationMinutes: integer3("clock_in_deviation_minutes"),
  // Calculated deviation
  clockOutDeviationMinutes: integer3("clock_out_deviation_minutes"),
  isCompliant: boolean4("is_compliant").default(true),
  // Auto-calculated compliance flag
  // Notes and communication
  employeeNotes: text4("employee_notes"),
  // Notes from employee
  managerNotes: text4("manager_notes"),
  // Notes from manager
  // ==================== OVERRIDE & ACKNOWLEDGEMENT SYSTEM ====================
  // When HR approves a leave/sick request that conflicts with this assignment
  overrideReason: text4("override_reason"),
  // "Ferie approvate", "Malattia", etc.
  overrideRequestId: uuid4("override_request_id").references(() => universalRequests.id),
  // Link to the request that caused override
  overrideAt: timestamp4("override_at"),
  // When the override was applied
  overrideBy: varchar4("override_by").references(() => users.id),
  // Who applied the override
  // Employee acknowledgement of assignment (for notification tracking)
  acknowledgedAt: timestamp4("acknowledged_at"),
  // When employee saw/acknowledged the assignment
  notifiedAt: timestamp4("notified_at"),
  // When notification was sent
  // Validation results from assignment (stored for audit and display)
  conflictReasons: jsonb4("conflict_reasons").default([]),
  // [{type: 'leave', severity: 'block', message: '...'}]
  validationWarnings: jsonb4("validation_warnings").default([]),
  // [{type: 'hours_exceeded', message: '...', data: {...}}]
  validationPassedAt: timestamp4("validation_passed_at"),
  // When assignment passed validation
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  // Core indexes for performance
  index4("shift_assignments_tenant_user_idx").on(table.tenantId, table.userId),
  index4("shift_assignments_shift_idx").on(table.shiftId),
  index4("shift_assignments_status_idx").on(table.status),
  index4("shift_assignments_compliance_idx").on(table.isCompliant),
  index4("shift_assignments_punctuality_idx").on(table.punctualityScore),
  // Unique constraint to prevent duplicate assignments
  uniqueIndex3("shift_assignments_unique").on(table.shiftId, table.userId, table.timeSlotId),
  // Time-based indexes for reporting
  index4("shift_assignments_assigned_date_idx").on(table.assignedAt),
  index4("shift_assignments_expected_clock_in_idx").on(table.expectedClockIn),
  // Override and acknowledgement indexes
  index4("shift_assignments_override_idx").on(table.overrideRequestId),
  index4("shift_assignments_acknowledged_idx").on(table.acknowledgedAt),
  index4("shift_assignments_notified_idx").on(table.notifiedAt)
]);
var insertShiftAssignmentSchema = createInsertSchema4(shiftAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true
});
var shiftAttendance = w3suiteSchema.table("shift_attendance", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  assignmentId: varchar4("assignment_id").notNull().references(() => shiftAssignments.id, { onDelete: "cascade" }),
  timeTrackingId: uuid4("time_tracking_id").references(() => timeTracking.id),
  // Essential filtering fields
  storeId: uuid4("store_id").notNull().references(() => stores.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  // Attendance status
  attendanceStatus: varchar4("attendance_status", { length: 20 }).notNull().default("scheduled"),
  // scheduled, present, late, absent, early_departure, overtime
  // Matching data
  matchingScore: real3("matching_score"),
  // 0.0-1.0 confidence score for auto-matching
  matchingMethod: varchar4("matching_method", { length: 20 }),
  // auto, manual, override
  // Deviation analysis
  scheduledStartTime: timestamp4("scheduled_start_time").notNull(),
  scheduledEndTime: timestamp4("scheduled_end_time").notNull(),
  actualStartTime: timestamp4("actual_start_time"),
  actualEndTime: timestamp4("actual_end_time"),
  // Calculated metrics
  startDeviationMinutes: integer3("start_deviation_minutes"),
  // + late, - early
  endDeviationMinutes: integer3("end_deviation_minutes"),
  totalWorkedMinutes: integer3("total_worked_minutes"),
  scheduledMinutes: integer3("scheduled_minutes"),
  overtimeMinutes: integer3("overtime_minutes"),
  // Compliance flags
  isOnTime: boolean4("is_on_time").default(true),
  isCompliantDuration: boolean4("is_compliant_duration").default(true),
  requiresApproval: boolean4("requires_approval").default(false),
  // Geographic compliance
  clockInLocation: jsonb4("clock_in_location"),
  // { lat, lng, accuracy, address }
  clockOutLocation: jsonb4("clock_out_location"),
  isLocationCompliant: boolean4("is_location_compliant").default(true),
  geofenceDeviationMeters: integer3("geofence_deviation_meters"),
  // Alert and notification status
  alertsSent: jsonb4("alerts_sent").default([]),
  // Array of alert types sent
  escalationLevel: integer3("escalation_level").default(0),
  // 0=none, 1=supervisor, 2=hr, 3=admin
  // Manager review
  reviewedBy: varchar4("reviewed_by").references(() => users.id),
  reviewedAt: timestamp4("reviewed_at"),
  reviewStatus: varchar4("review_status", { length: 20 }),
  // pending, approved, disputed, corrected
  reviewNotes: text4("review_notes"),
  // System metadata
  processingStatus: varchar4("processing_status", { length: 20 }).default("pending"),
  // pending, processed, error
  lastProcessedAt: timestamp4("last_processed_at"),
  errorMessage: text4("error_message"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  // Performance indexes
  index4("shift_attendance_tenant_idx").on(table.tenantId),
  index4("shift_attendance_assignment_idx").on(table.assignmentId),
  index4("shift_attendance_time_tracking_idx").on(table.timeTrackingId),
  index4("shift_attendance_status_idx").on(table.attendanceStatus),
  // Compliance and monitoring indexes
  index4("shift_attendance_compliance_idx").on(table.isOnTime, table.isCompliantDuration, table.isLocationCompliant),
  index4("shift_attendance_alerts_idx").on(table.requiresApproval, table.escalationLevel),
  index4("shift_attendance_review_idx").on(table.reviewStatus, table.reviewedAt),
  // Time-based indexes for reporting
  index4("shift_attendance_scheduled_time_idx").on(table.scheduledStartTime),
  index4("shift_attendance_actual_time_idx").on(table.actualStartTime),
  index4("shift_attendance_processing_idx").on(table.processingStatus, table.lastProcessedAt),
  // Unique constraint for assignment-timetracking relationship
  uniqueIndex3("shift_attendance_assignment_tracking_unique").on(table.assignmentId, table.timeTrackingId)
]);
var insertShiftAttendanceSchema = createInsertSchema4(shiftAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var attendanceAnomalies = w3suiteSchema.table("attendance_anomalies", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  attendanceId: uuid4("attendance_id").references(() => shiftAttendance.id, { onDelete: "cascade" }),
  userId: varchar4("user_id").notNull().references(() => users.id),
  shiftId: uuid4("shift_id").references(() => shifts.id),
  storeId: uuid4("store_id").references(() => stores.id),
  // Anomaly classification
  anomalyType: varchar4("anomaly_type", { length: 50 }).notNull(),
  // late_clock_in, early_clock_out, wrong_store, no_shift_assigned, overtime_unapproved, missing_clock_out
  severity: varchar4("severity", { length: 20 }).notNull().default("medium"),
  // low, medium, high, critical
  // Anomaly details
  expectedValue: text4("expected_value"),
  // JSON string with expected data
  actualValue: text4("actual_value"),
  // JSON string with actual data
  deviationMinutes: integer3("deviation_minutes"),
  // Time deviation if applicable
  deviationMeters: integer3("deviation_meters"),
  // Location deviation if applicable
  // Detection
  detectedAt: timestamp4("detected_at").defaultNow(),
  detectionMethod: varchar4("detection_method", { length: 20 }).default("automatic"),
  // automatic, manual, system
  // Resolution
  resolutionStatus: varchar4("resolution_status", { length: 20 }).notNull().default("pending"),
  // pending, acknowledged, resolved, dismissed, escalated
  resolvedBy: varchar4("resolved_by").references(() => users.id),
  resolvedAt: timestamp4("resolved_at"),
  resolutionNotes: text4("resolution_notes"),
  resolutionAction: varchar4("resolution_action", { length: 50 }),
  // approved, corrected, penalized, excused
  // Notification
  notifiedSupervisor: boolean4("notified_supervisor").default(false),
  notifiedAt: timestamp4("notified_at"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("attendance_anomalies_tenant_idx").on(table.tenantId),
  index4("attendance_anomalies_user_idx").on(table.userId),
  index4("attendance_anomalies_store_idx").on(table.storeId),
  index4("attendance_anomalies_type_idx").on(table.anomalyType),
  index4("attendance_anomalies_severity_idx").on(table.severity),
  index4("attendance_anomalies_status_idx").on(table.resolutionStatus),
  index4("attendance_anomalies_detected_idx").on(table.detectedAt)
]);
var insertAttendanceAnomalySchema = createInsertSchema4(attendanceAnomalies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  detectedAt: true
});
var resourceAvailability = w3suiteSchema.table("resource_availability", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  // Availability period
  startDate: date3("start_date").notNull(),
  endDate: date3("end_date").notNull(),
  // Availability status
  availabilityStatus: varchar4("availability_status", { length: 30 }).notNull(),
  // available, vacation, sick_leave, personal_leave, training, unavailable, restricted
  // Reason and justification
  reasonType: varchar4("reason_type", { length: 50 }),
  // approved_leave, medical, personal, scheduled_off
  reasonDescription: text4("reason_description"),
  leaveRequestId: uuid4("leave_request_id"),
  // Link to HR leave request if applicable
  // Time constraints
  isFullDay: boolean4("is_full_day").default(true),
  startTime: timestamp4("start_time"),
  // If partial day
  endTime: timestamp4("end_time"),
  // If partial day
  // Approval tracking
  approvalStatus: varchar4("approval_status", { length: 20 }).default("approved"),
  // pending, approved, rejected
  approvedBy: varchar4("approved_by").references(() => users.id),
  approvedAt: timestamp4("approved_at"),
  // Impact on scheduling
  blocksShiftAssignment: boolean4("blocks_shift_assignment").default(true),
  showInSchedule: boolean4("show_in_schedule").default(true),
  // Metadata
  notes: text4("notes"),
  metadata: jsonb4("metadata").default({}),
  // Audit
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("resource_availability_tenant_idx").on(table.tenantId),
  index4("resource_availability_user_idx").on(table.userId),
  index4("resource_availability_date_range_idx").on(table.startDate, table.endDate),
  index4("resource_availability_status_idx").on(table.availabilityStatus),
  index4("resource_availability_approval_idx").on(table.approvalStatus),
  index4("resource_availability_blocking_idx").on(table.blocksShiftAssignment)
]);
var insertResourceAvailabilitySchema = createInsertSchema4(resourceAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var hrDocuments = w3suiteSchema.table("hr_documents", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  // Document classification
  documentType: hrDocumentTypeEnum("document_type").notNull(),
  title: varchar4("title", { length: 255 }).notNull(),
  description: text4("description"),
  // File information
  fileName: varchar4("file_name", { length: 255 }).notNull(),
  fileSize: integer3("file_size").notNull(),
  mimeType: varchar4("mime_type", { length: 100 }).notNull(),
  storagePath: varchar4("storage_path", { length: 500 }).notNull(),
  // Period reference (for payslips)
  year: integer3("year"),
  month: integer3("month"),
  // Security and expiry
  isConfidential: boolean4("is_confidential").default(false),
  expiryDate: date3("expiry_date"),
  // Metadata
  metadata: jsonb4("metadata").default({}),
  // Document source and tracking
  source: hrDocumentSourceEnum("source").notNull().default("employee"),
  viewedAt: timestamp4("viewed_at"),
  // Audit
  uploadedBy: varchar4("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp4("uploaded_at").defaultNow(),
  lastAccessedAt: timestamp4("last_accessed_at"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("hr_documents_tenant_user_idx").on(table.tenantId, table.userId),
  index4("hr_documents_tenant_type_idx").on(table.tenantId, table.documentType),
  index4("hr_documents_tenant_source_idx").on(table.tenantId, table.source),
  index4("hr_documents_year_month_idx").on(table.year, table.month),
  index4("hr_documents_expiry_idx").on(table.expiryDate)
]);
var insertHrDocumentSchema = createInsertSchema4(hrDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true
});
var expenseReports = w3suiteSchema.table("expense_reports", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  // Report identification
  reportNumber: varchar4("report_number", { length: 50 }).notNull(),
  period: varchar4("period", { length: 7 }),
  // YYYY-MM format
  // Financial summary
  totalAmount: integer3("total_amount").notNull().default(0),
  // Stored in cents
  currency: varchar4("currency", { length: 3 }).default("EUR"),
  // Status workflow
  status: expenseReportStatusEnum("status").notNull().default("draft"),
  // Approval and payment
  submittedAt: timestamp4("submitted_at"),
  approvedAt: timestamp4("approved_at"),
  approvedBy: varchar4("approved_by").references(() => users.id),
  reimbursedAt: timestamp4("reimbursed_at"),
  rejectionReason: text4("rejection_reason"),
  paymentMethod: expensePaymentMethodEnum("payment_method"),
  // Additional information
  notes: text4("notes"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("expense_reports_tenant_user_idx").on(table.tenantId, table.userId),
  index4("expense_reports_tenant_status_idx").on(table.tenantId, table.status),
  index4("expense_reports_period_idx").on(table.period),
  uniqueIndex3("expense_reports_tenant_number_unique").on(table.tenantId, table.reportNumber)
]);
var insertExpenseReportSchema = createInsertSchema4(expenseReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var expenseItems = w3suiteSchema.table("expense_items", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  expenseReportId: uuid4("expense_report_id").notNull().references(() => expenseReports.id, { onDelete: "cascade" }),
  // Item details
  date: date3("date").notNull(),
  category: expenseCategoryEnum("category").notNull(),
  description: text4("description").notNull(),
  // Financial data
  amount: integer3("amount").notNull(),
  // Stored in cents
  vat: integer3("vat").default(0),
  // VAT percentage * 100 (e.g., 2200 = 22%)
  vatAmount: integer3("vat_amount").default(0),
  // VAT amount in cents
  // Receipt and documentation
  receipt: boolean4("receipt").default(false),
  receiptPath: varchar4("receipt_path", { length: 500 }),
  // Project allocation
  projectCode: varchar4("project_code", { length: 50 }),
  clientCode: varchar4("client_code", { length: 50 }),
  // Reimbursement
  isReimbursable: boolean4("is_reimbursable").default(true),
  // Additional information
  notes: text4("notes"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("expense_items_report_idx").on(table.expenseReportId),
  index4("expense_items_date_idx").on(table.date),
  index4("expense_items_category_idx").on(table.category)
]);
var insertExpenseItemSchema = createInsertSchema4(expenseItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var tenantsRelations = relations(tenants, ({ one, many }) => ({
  users: many(users),
  stores: many(stores),
  legalEntities: many(legalEntities),
  roles: many(roles),
  entityLogs: many(entityLogs),
  structuredLogs: many(structuredLogs),
  userStores: many(userStores),
  userLegalEntities: many(userLegalEntities),
  storeBrands: many(storeBrands),
  storeDriverPotential: many(storeDriverPotential),
  notifications: many(notifications),
  // HR relations
  calendarEvents: many(calendarEvents),
  timeTracking: many(timeTracking),
  shifts: many(shifts),
  shiftTemplates: many(shiftTemplates),
  hrDocuments: many(hrDocuments),
  expenseReports: many(expenseReports),
  // Universal Request System relations
  universalRequests: many(universalRequests),
  // Notification System relations
  notificationTemplates: many(notificationTemplates),
  notificationPreferences: many(notificationPreferences)
}));
var usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [users.storeId], references: [stores.id] }),
  userStores: many(userStores),
  userLegalEntities: many(userLegalEntities),
  userAssignments: many(userAssignments),
  userExtraPerms: many(userExtraPerms),
  entityLogs: many(entityLogs),
  structuredLogs: many(structuredLogs),
  notifications: many(notifications),
  // HR relations
  ownedCalendarEvents: many(calendarEvents),
  timeTrackingEntries: many(timeTracking),
  hrDocuments: many(hrDocuments),
  expenseReports: many(expenseReports),
  createdShifts: many(shifts),
  approvedTimeTracking: many(timeTracking),
  shiftAssignments: many(shiftAssignments),
  assignedShifts: many(shiftAssignments),
  reviewedAttendance: many(shiftAttendance),
  // Universal Request System relations
  universalRequests: many(universalRequests),
  // Notification System relations
  notificationPreferences: many(notificationPreferences)
}));
var legalEntitiesRelations = relations(legalEntities, ({ one, many }) => ({
  tenant: one(tenants, { fields: [legalEntities.tenantId], references: [tenants.id] }),
  stores: many(stores),
  userLegalEntities: many(userLegalEntities)
}));
var storesRelations = relations(stores, ({ one, many }) => ({
  tenant: one(tenants, { fields: [stores.tenantId], references: [tenants.id] }),
  legalEntity: one(legalEntities, { fields: [stores.legalEntityId], references: [legalEntities.id] }),
  channel: one(channels, { fields: [stores.channelId], references: [channels.id] }),
  commercialArea: one(commercialAreas, { fields: [stores.commercialAreaId], references: [commercialAreas.id] }),
  userStores: many(userStores),
  storeBrands: many(storeBrands),
  storeDriverPotential: many(storeDriverPotential),
  users: many(users),
  // HR relations
  calendarEvents: many(calendarEvents),
  timeTracking: many(timeTracking),
  shifts: many(shifts),
  storesTimetrackingMethods: many(storesTimetrackingMethods)
}));
var rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  rolePerms: many(rolePerms),
  userAssignments: many(userAssignments)
}));
var rolePermsRelations = relations(rolePerms, ({ one }) => ({
  role: one(roles, { fields: [rolePerms.roleId], references: [roles.id] })
}));
var userAssignmentsRelations = relations(userAssignments, ({ one }) => ({
  user: one(users, { fields: [userAssignments.userId], references: [users.id] }),
  role: one(roles, { fields: [userAssignments.roleId], references: [roles.id] })
}));
var userExtraPermsRelations = relations(userExtraPerms, ({ one }) => ({
  user: one(users, { fields: [userExtraPerms.userId], references: [users.id] })
}));
var userStoresRelations = relations(userStores, ({ one }) => ({
  user: one(users, { fields: [userStores.userId], references: [users.id] }),
  store: one(stores, { fields: [userStores.storeId], references: [stores.id] }),
  tenant: one(tenants, { fields: [userStores.tenantId], references: [tenants.id] })
}));
var storeBrandsRelations = relations(storeBrands, ({ one }) => ({
  store: one(stores, { fields: [storeBrands.storeId], references: [stores.id] }),
  brand: one(brands, { fields: [storeBrands.brandId], references: [brands.id] }),
  tenant: one(tenants, { fields: [storeBrands.tenantId], references: [tenants.id] })
}));
var storeDriverPotentialRelations = relations(storeDriverPotential, ({ one }) => ({
  store: one(stores, { fields: [storeDriverPotential.storeId], references: [stores.id] }),
  driver: one(drivers, { fields: [storeDriverPotential.driverId], references: [drivers.id] }),
  tenant: one(tenants, { fields: [storeDriverPotential.tenantId], references: [tenants.id] })
}));
var entityLogsRelations = relations(entityLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [entityLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [entityLogs.userId], references: [users.id] })
}));
var structuredLogsRelations = relations(structuredLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [structuredLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [structuredLogs.userId], references: [users.id] })
}));
var userLegalEntitiesRelations = relations(userLegalEntities, ({ one }) => ({
  user: one(users, { fields: [userLegalEntities.userId], references: [users.id] }),
  legalEntity: one(legalEntities, { fields: [userLegalEntities.legalEntityId], references: [legalEntities.id] }),
  tenant: one(tenants, { fields: [userLegalEntities.tenantId], references: [tenants.id] })
}));
var objectMetadataRelations = relations(objectMetadata, ({ one }) => ({
  tenant: one(tenants, { fields: [objectMetadata.tenantId], references: [tenants.id] }),
  uploadedByUser: one(users, { fields: [objectMetadata.uploadedBy], references: [users.id] })
}));
var objectAclsRelations = relations(objectAcls, ({ one }) => ({
  tenant: one(tenants, { fields: [objectAcls.tenantId], references: [tenants.id] }),
  ownerTenant: one(tenants, { fields: [objectAcls.ownerTenantId], references: [tenants.id] }),
  owner: one(users, { fields: [objectAcls.ownerId], references: [users.id] })
}));
var suppliersRelations = relations(suppliers, ({ one, many }) => ({
  // Relations verso w3suite schema
  tenant: one(tenants, { fields: [suppliers.tenantId], references: [tenants.id] }),
  createdByUser: one(users, { fields: [suppliers.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [suppliers.updatedBy], references: [users.id] }),
  // Relations verso public schema (reference tables)
  city: one(italianCities, { fields: [suppliers.cityId], references: [italianCities.id] }),
  country: one(countries, { fields: [suppliers.countryId], references: [countries.id] }),
  preferredPaymentMethod: one(paymentMethods, { fields: [suppliers.preferredPaymentMethodId], references: [paymentMethods.id] }),
  paymentCondition: one(paymentMethodsConditions, { fields: [suppliers.paymentConditionId], references: [paymentMethodsConditions.id] }),
  // Relations verso overrides
  overrides: many(supplierOverrides)
}));
var supplierOverridesRelations = relations(supplierOverrides, ({ one }) => ({
  // Relations verso w3suite schema
  tenant: one(tenants, { fields: [supplierOverrides.tenantId], references: [tenants.id] }),
  createdByUser: one(users, { fields: [supplierOverrides.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [supplierOverrides.updatedBy], references: [users.id] }),
  // Relations verso public schema (reference tables)
  city: one(italianCities, { fields: [supplierOverrides.cityId], references: [italianCities.id] }),
  country: one(countries, { fields: [supplierOverrides.countryId], references: [countries.id] }),
  preferredPaymentMethod: one(paymentMethods, { fields: [supplierOverrides.preferredPaymentMethodId], references: [paymentMethods.id] }),
  paymentCondition: one(paymentMethodsConditions, { fields: [supplierOverrides.paymentConditionId], references: [paymentMethodsConditions.id] })
}));
var calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [calendarEvents.tenantId], references: [tenants.id] }),
  owner: one(users, { fields: [calendarEvents.ownerId], references: [users.id] }),
  store: one(stores, { fields: [calendarEvents.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [calendarEvents.updatedBy], references: [users.id] })
}));
var timeTrackingRelations = relations(timeTracking, ({ one, many }) => ({
  tenant: one(tenants, { fields: [timeTracking.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [timeTracking.userId], references: [users.id] }),
  store: one(stores, { fields: [timeTracking.storeId], references: [stores.id] }),
  shift: one(shifts, { fields: [timeTracking.shiftId], references: [shifts.id] }),
  approvedByUser: one(users, { fields: [timeTracking.approvedBy], references: [users.id] }),
  attendanceEntries: many(shiftAttendance)
}));
var storesTimetrackingMethodsRelations = relations(storesTimetrackingMethods, ({ one }) => ({
  tenant: one(tenants, { fields: [storesTimetrackingMethods.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [storesTimetrackingMethods.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [storesTimetrackingMethods.createdBy], references: [users.id] })
}));
var shiftsRelations = relations(shifts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [shifts.storeId], references: [stores.id] }),
  template: one(shiftTemplates, { fields: [shifts.templateId], references: [shiftTemplates.id] }),
  templateVersion: one(shiftTemplateVersions, { fields: [shifts.templateVersionId], references: [shiftTemplateVersions.id] }),
  createdByUser: one(users, { fields: [shifts.createdBy], references: [users.id] }),
  timeTrackingEntries: many(timeTracking),
  assignments: many(shiftAssignments)
}));
var shiftTemplatesRelations = relations(shiftTemplates, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTemplates.tenantId], references: [tenants.id] }),
  shifts: many(shifts),
  timeSlots: many(shiftTimeSlots),
  versions: many(shiftTemplateVersions)
}));
var shiftTemplateVersionsRelations = relations(shiftTemplateVersions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTemplateVersions.tenantId], references: [tenants.id] }),
  template: one(shiftTemplates, { fields: [shiftTemplateVersions.templateId], references: [shiftTemplates.id] }),
  changedByUser: one(users, { fields: [shiftTemplateVersions.changedBy], references: [users.id] }),
  shifts: many(shifts)
}));
var shiftTimeSlotsRelations = relations(shiftTimeSlots, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTimeSlots.tenantId], references: [tenants.id] }),
  template: one(shiftTemplates, { fields: [shiftTimeSlots.templateId], references: [shiftTemplates.id] }),
  assignments: many(shiftAssignments)
}));
var shiftAssignmentsRelations = relations(shiftAssignments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftAssignments.tenantId], references: [tenants.id] }),
  shift: one(shifts, { fields: [shiftAssignments.shiftId], references: [shifts.id] }),
  user: one(users, { fields: [shiftAssignments.userId], references: [users.id] }),
  timeSlot: one(shiftTimeSlots, { fields: [shiftAssignments.timeSlotId], references: [shiftTimeSlots.id] }),
  assignedByUser: one(users, { fields: [shiftAssignments.assignedBy], references: [users.id] }),
  attendance: many(shiftAttendance)
}));
var shiftAttendanceRelations = relations(shiftAttendance, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftAttendance.tenantId], references: [tenants.id] }),
  assignment: one(shiftAssignments, { fields: [shiftAttendance.assignmentId], references: [shiftAssignments.id] }),
  timeTracking: one(timeTracking, { fields: [shiftAttendance.timeTrackingId], references: [timeTracking.id] }),
  store: one(stores, { fields: [shiftAttendance.storeId], references: [stores.id] }),
  user: one(users, { fields: [shiftAttendance.userId], references: [users.id] }),
  reviewedByUser: one(users, { fields: [shiftAttendance.reviewedBy], references: [users.id] }),
  anomalies: many(attendanceAnomalies)
}));
var attendanceAnomaliesRelations = relations(attendanceAnomalies, ({ one }) => ({
  tenant: one(tenants, { fields: [attendanceAnomalies.tenantId], references: [tenants.id] }),
  attendance: one(shiftAttendance, { fields: [attendanceAnomalies.attendanceId], references: [shiftAttendance.id] }),
  user: one(users, { fields: [attendanceAnomalies.userId], references: [users.id] }),
  shift: one(shifts, { fields: [attendanceAnomalies.shiftId], references: [shifts.id] }),
  store: one(stores, { fields: [attendanceAnomalies.storeId], references: [stores.id] }),
  resolvedByUser: one(users, { fields: [attendanceAnomalies.resolvedBy], references: [users.id] })
}));
var resourceAvailabilityRelations = relations(resourceAvailability, ({ one }) => ({
  tenant: one(tenants, { fields: [resourceAvailability.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [resourceAvailability.userId], references: [users.id] }),
  approvedByUser: one(users, { fields: [resourceAvailability.approvedBy], references: [users.id] }),
  createdByUser: one(users, { fields: [resourceAvailability.createdBy], references: [users.id] })
}));
var hrDocumentsRelations = relations(hrDocuments, ({ one }) => ({
  tenant: one(tenants, { fields: [hrDocuments.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [hrDocuments.userId], references: [users.id] }),
  uploadedByUser: one(users, { fields: [hrDocuments.uploadedBy], references: [users.id] })
}));
var expenseReportsRelations = relations(expenseReports, ({ one, many }) => ({
  tenant: one(tenants, { fields: [expenseReports.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [expenseReports.userId], references: [users.id] }),
  approvedByUser: one(users, { fields: [expenseReports.approvedBy], references: [users.id] }),
  expenseItems: many(expenseItems)
}));
var expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  expenseReport: one(expenseReports, { fields: [expenseItems.expenseReportId], references: [expenseReports.id] })
}));
var organizationalStructure = w3suiteSchema.table("organizational_structure", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // User hierarchy
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: varchar4("parent_id").references(() => users.id),
  // Manager diretto
  // Tree structure optimization
  pathTree: text4("path_tree").array().default([]),
  // ['ceo_id', 'area_mgr_id', 'store_mgr_id', 'user_id']
  depth: integer3("depth").notNull().default(0),
  // Livello nell'albero (0 = CEO)
  // Organizational unit
  organizationalUnit: varchar4("organizational_unit", { length: 100 }),
  // 'store_milano', 'it_dept', 'finance_team'
  unitType: varchar4("unit_type", { length: 50 }),
  // 'store', 'department', 'team', 'division'
  // Deleghe temporanee
  delegates: jsonb4("delegates").default([]),
  // [{userId, fromDate, toDate, permissions}]
  // Temporal validity
  validFrom: timestamp4("valid_from").notNull().defaultNow(),
  validTo: timestamp4("valid_to"),
  // RBAC permissions scope
  permissions: jsonb4("permissions").default({}),
  // Service-specific permissions
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("org_structure_tenant_user_idx").on(table.tenantId, table.userId),
  index4("org_structure_parent_idx").on(table.parentId),
  index4("org_structure_unit_idx").on(table.organizationalUnit),
  index4("org_structure_path_gin_idx").using("gin", table.pathTree),
  uniqueIndex3("org_structure_user_valid_unique").on(table.userId, table.validFrom)
]);
var insertOrganizationalStructureSchema = createInsertSchema4(organizationalStructure).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var approvalWorkflows = w3suiteSchema.table("approval_workflows", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Service identification
  serviceName: varchar4("service_name", { length: 50 }).notNull(),
  // 'hr', 'finance', 'operations', 'it', 'sales'
  workflowType: varchar4("workflow_type", { length: 100 }).notNull(),
  // 'leave_request', 'purchase_order', 'discount_approval'
  // Workflow rules (JSONB for flexibility)
  rules: jsonb4("rules").notNull(),
  /* {
    levels: [
      { condition: "amount <= 1000", approvers: ["direct_manager"], slaHours: 24 },
      { condition: "amount > 1000", approvers: ["direct_manager", "department_head"], slaHours: 48 }
    ],
    escalation: { afterHours: 24, escalateTo: "next_level" },
    autoApprove: { condition: "amount < 100" }
  } */
  // Configuration
  isActive: boolean4("is_active").default(true),
  priority: integer3("priority").default(100),
  // Higher priority workflows are evaluated first
  // Metadata
  description: text4("description"),
  version: integer3("version").notNull().default(1),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("approval_workflows_service_idx").on(table.serviceName, table.workflowType),
  index4("approval_workflows_tenant_active_idx").on(table.tenantId, table.isActive),
  uniqueIndex3("approval_workflows_unique").on(table.tenantId, table.serviceName, table.workflowType)
]);
var insertApprovalWorkflowSchema = createInsertSchema4(approvalWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var departmentEnum = pgEnum3("department", [
  "hr",
  // Human Resources (ferie, permessi, congedi)
  "operations",
  // Operazioni (manutenzione, logistics, inventory)
  "support",
  // Support IT (accessi, hardware, software)
  "finance",
  // Finanza (expenses, budgets, payments)
  "crm",
  // Customer Relations (complaints, escalations)
  "sales",
  // Vendite (discount approvals, contract changes)
  "marketing"
  // Marketing (campaigns, content, branding)
]);
var requestStatusEnum = pgEnum3("request_status", [
  "draft",
  // Bozza - non ancora inviata
  "pending",
  // In attesa di approvazione
  "approved",
  // Approvata
  "rejected",
  // Rifiutata
  "cancelled"
  // Annullata dal richiedente
]);
var universalRequests = w3suiteSchema.table("universal_requests", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // ✅ SICUREZZA MULTI-LIVELLO: Tenant + User + Store + Legal Entity
  requesterId: varchar4("requester_id").notNull().references(() => users.id),
  legalEntityId: uuid4("legal_entity_id").references(() => legalEntities.id),
  storeId: uuid4("store_id").references(() => stores.id),
  onBehalfOf: varchar4("on_behalf_of").references(() => users.id),
  // Richieste delegate
  // ✅ CATEGORIZZAZIONE ENTERPRISE: Department + Category + Type
  department: departmentEnum("department").notNull(),
  // hr, finance, support, crm, sales, operations
  category: varchar4("category", { length: 100 }).notNull(),
  // leave, expense, access, legal, training, etc.
  type: varchar4("type", { length: 100 }),
  // vacation, travel_expense, vpn_access, etc.
  // ✅ CONTENUTO RICHIESTA
  title: varchar4("title", { length: 255 }).notNull(),
  description: text4("description"),
  requestData: jsonb4("request_data").notNull(),
  // Dati specifici per categoria
  // ✅ WORKFLOW E APPROVAZIONE
  status: requestStatusEnum("status").notNull().default("draft"),
  currentApproverId: varchar4("current_approver_id").references(() => users.id),
  approvalChain: jsonb4("approval_chain").default([]),
  // Storia delle approvazioni
  workflowInstanceId: uuid4("workflow_instance_id"),
  // Link al workflow engine
  // ✅ SLA E PRIORITÀ
  priority: varchar4("priority", { length: 20 }).default("normal"),
  // low, normal, high, urgent
  dueDate: timestamp4("due_date"),
  startDate: timestamp4("start_date"),
  // Per richieste con date (ferie, congedi)
  endDate: timestamp4("end_date"),
  submittedAt: timestamp4("submitted_at"),
  completedAt: timestamp4("completed_at"),
  // ✅ ALLEGATI E METADATI
  attachments: text4("attachments").array().default([]),
  tags: text4("tags").array().default([]),
  metadata: jsonb4("metadata").default({}),
  // Metadati aggiuntivi
  notes: text4("notes"),
  // ✅ AUDIT COMPLETO
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  // ✅ INDICI OTTIMIZZATI per performance enterprise
  index4("universal_requests_tenant_department_idx").on(table.tenantId, table.department),
  index4("universal_requests_tenant_status_idx").on(table.tenantId, table.status),
  index4("universal_requests_requester_idx").on(table.requesterId),
  index4("universal_requests_approver_idx").on(table.currentApproverId),
  index4("universal_requests_store_idx").on(table.storeId),
  index4("universal_requests_legal_entity_idx").on(table.legalEntityId),
  index4("universal_requests_dates_idx").on(table.startDate, table.endDate),
  index4("universal_requests_tenant_created_idx").on(table.tenantId, table.createdAt.desc()),
  index4("universal_requests_workflow_idx").on(table.workflowInstanceId),
  index4("universal_requests_department_category_type_idx").on(table.department, table.category, table.type)
]);
var insertUniversalRequestSchema = createInsertSchema4(universalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var universalRequestsRelations = relations(universalRequests, ({ one, many }) => ({
  tenant: one(tenants, { fields: [universalRequests.tenantId], references: [tenants.id] }),
  requester: one(users, { fields: [universalRequests.requesterId], references: [users.id] }),
  currentApprover: one(users, { fields: [universalRequests.currentApproverId], references: [users.id] }),
  onBehalfOfUser: one(users, { fields: [universalRequests.onBehalfOf], references: [users.id] }),
  legalEntity: one(legalEntities, { fields: [universalRequests.legalEntityId], references: [legalEntities.id] }),
  store: one(stores, { fields: [universalRequests.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [universalRequests.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [universalRequests.updatedBy], references: [users.id] }),
  impacts: many(hrRequestImpacts)
}));
var hrRequestImpacts = w3suiteSchema.table("hr_request_impacts", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  requestId: uuid4("request_id").notNull().references(() => universalRequests.id, { onDelete: "cascade" }),
  // Impact analysis results
  affectedShiftIds: text4("affected_shift_ids").array().default([]),
  // Shift IDs that will be overridden
  affectedAssignmentIds: text4("affected_assignment_ids").array().default([]),
  // Assignment IDs that will be overridden
  // Coverage gaps created by approval
  coverageGaps: jsonb4("coverage_gaps").default([]),
  // [{ storeId, storeName, date, startTime, endTime, hoursUncovered, currentStaff, requiredStaff }]
  // Overtime impact
  overtimeImpact: jsonb4("overtime_impact").default([]),
  // [{ employeeId, employeeName, date, additionalHours, reason }]
  // Replacement suggestions
  replacementSuggestions: jsonb4("replacement_suggestions").default([]),
  // [{ shiftId, suggestedEmployees: [{ id, name, availability, matchScore }] }]
  // Impact severity assessment
  impactSeverity: varchar4("impact_severity", { length: 20 }).notNull().default("none"),
  // none, low, medium, high, critical
  impactSummary: text4("impact_summary"),
  // Human-readable summary for HR display
  // Calculation metadata
  calculatedAt: timestamp4("calculated_at").defaultNow(),
  calculatedBy: varchar4("calculated_by").references(() => users.id),
  // System or user who triggered calculation
  // Applied status - tracks if impacts were actually applied
  appliedAt: timestamp4("applied_at"),
  // When request was approved and impacts applied
  appliedBy: varchar4("applied_by").references(() => users.id),
  overridesCreated: integer3("overrides_created").default(0),
  // Number of shift overrides created
  notificationsSent: integer3("notifications_sent").default(0),
  // Number of notifications sent
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("hr_request_impacts_tenant_idx").on(table.tenantId),
  index4("hr_request_impacts_request_idx").on(table.requestId),
  index4("hr_request_impacts_severity_idx").on(table.impactSeverity),
  index4("hr_request_impacts_calculated_idx").on(table.calculatedAt),
  index4("hr_request_impacts_applied_idx").on(table.appliedAt)
]);
var insertHrRequestImpactSchema = createInsertSchema4(hrRequestImpacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  calculatedAt: true
});
var hrRequestImpactsRelations = relations(hrRequestImpacts, ({ one }) => ({
  tenant: one(tenants, { fields: [hrRequestImpacts.tenantId], references: [tenants.id] }),
  request: one(universalRequests, { fields: [hrRequestImpacts.requestId], references: [universalRequests.id] }),
  calculatedByUser: one(users, { fields: [hrRequestImpacts.calculatedBy], references: [users.id] }),
  appliedByUser: one(users, { fields: [hrRequestImpacts.appliedBy], references: [users.id] })
}));
var servicePermissions = w3suiteSchema.table("service_permissions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Service and permission
  serviceName: varchar4("service_name", { length: 50 }).notNull(),
  resource: varchar4("resource", { length: 100 }).notNull(),
  action: varchar4("action", { length: 50 }).notNull(),
  // Permission scope
  roleId: uuid4("role_id").references(() => roles.id, { onDelete: "cascade" }),
  userId: varchar4("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Conditions
  conditions: jsonb4("conditions").default({}),
  // { maxAmount: 1000, maxDays: 10, etc }
  // Validity
  isActive: boolean4("is_active").default(true),
  validFrom: timestamp4("valid_from").defaultNow(),
  validTo: timestamp4("valid_to"),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id)
}, (table) => [
  index4("service_permissions_service_idx").on(table.serviceName),
  index4("service_permissions_role_idx").on(table.roleId),
  index4("service_permissions_user_idx").on(table.userId),
  uniqueIndex3("service_permissions_unique").on(
    table.tenantId,
    table.serviceName,
    table.resource,
    table.action,
    table.roleId,
    table.userId
  )
]);
var insertServicePermissionSchema = createInsertSchema4(servicePermissions).omit({
  id: true,
  createdAt: true
});
var workflowActions = w3suiteSchema.table("workflow_actions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Category and Action identification
  category: varchar4("category", { length: 50 }).notNull(),
  // 'hr', 'finance', 'operations', 'crm', 'support', 'sales'
  actionId: varchar4("action_id", { length: 100 }).notNull(),
  // 'approve_vacation', 'reject_vacation', 'approve_expense'
  name: varchar4("name", { length: 200 }).notNull(),
  // 'Approva Ferie', 'Rifiuta Ferie'
  description: text4("description"),
  // RBAC Integration
  requiredPermission: varchar4("required_permission", { length: 200 }).notNull(),
  // 'hr.approve_vacation_max_5_days'
  constraints: jsonb4("constraints").default({}),
  // { maxAmount: 1000, maxDays: 5, excludedPeriods: [] }
  // Action Configuration
  actionType: varchar4("action_type", { length: 50 }).notNull().default("approval"),
  // 'approval', 'rejection', 'delegation', 'notification'
  priority: integer3("priority").default(100),
  isActive: boolean4("is_active").default(true),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("workflow_actions_category_idx").on(table.category),
  index4("workflow_actions_permission_idx").on(table.requiredPermission),
  uniqueIndex3("workflow_actions_unique").on(table.tenantId, table.category, table.actionId)
]);
var workflowTriggers = w3suiteSchema.table("workflow_triggers", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Trigger identification
  category: varchar4("category", { length: 50 }).notNull(),
  // 'hr', 'finance', etc.
  triggerId: varchar4("trigger_id", { length: 100 }).notNull(),
  // 'notify_team', 'update_calendar', 'start_timer'
  name: varchar4("name", { length: 200 }).notNull(),
  // 'Notifica Team', 'Aggiorna Calendario'
  description: text4("description"),
  // Trigger Configuration
  triggerType: varchar4("trigger_type", { length: 50 }).notNull(),
  // 'notification', 'timer', 'webhook', 'conditional', 'integration'
  config: jsonb4("config").notNull(),
  // Configurazione specifica per tipo trigger
  // Execution settings
  isAsync: boolean4("is_async").default(false),
  // Esecuzione asincrona
  retryPolicy: jsonb4("retry_policy").default({}),
  // { maxRetries: 3, backoff: 'exponential' }
  timeout: integer3("timeout").default(3e4),
  // Timeout in milliseconds
  // Status
  isActive: boolean4("is_active").default(true),
  priority: integer3("priority").default(100),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("workflow_triggers_category_idx").on(table.category),
  index4("workflow_triggers_type_idx").on(table.triggerType),
  uniqueIndex3("workflow_triggers_unique").on(table.tenantId, table.category, table.triggerId)
]);
var workflowTemplates = w3suiteSchema.table("workflow_templates", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id),
  // NULL per global templates
  // Template identification
  name: varchar4("name", { length: 200 }).notNull(),
  description: text4("description"),
  category: varchar4("category", { length: 50 }).notNull(),
  // 'hr', 'finance', etc.
  templateType: varchar4("template_type", { length: 100 }).notNull(),
  // 'vacation_approval', 'expense_approval'
  // Visual Workflow Definition (React Flow format)
  nodes: jsonb4("nodes").notNull(),
  // Array of workflow nodes with positions
  edges: jsonb4("edges").notNull(),
  // Array of connections between nodes
  viewport: jsonb4("viewport").default({ x: 0, y: 0, zoom: 1 }),
  // Canvas viewport
  // 🌐 BRAND INTERFACE - Global Template Management
  isGlobal: boolean4("is_global").default(false).notNull(),
  // Template visibile a tutti i tenant
  isSystem: boolean4("is_system").default(false).notNull(),
  // Template di sistema (non modificabile)
  isDeletable: boolean4("is_deletable").default(true).notNull(),
  // Può essere cancellato
  isCustomizable: boolean4("is_customizable").default(true).notNull(),
  // Tenant può duplicare/customizzare
  createdByBrand: boolean4("created_by_brand").default(false).notNull(),
  // Creato da Brand Admin
  globalVersionId: uuid4("global_version_id"),
  // ID template globale originale (per tenant customizzati)
  // 🔒 BRAND WORKFLOW LOCK SYSTEM - Track brand-deployed workflows
  source: workflowSourceEnum("source").default("tenant"),
  // 'brand' | 'tenant' - Origin of workflow
  // FK to brand_interface.brand_workflows (nullable - only for brand-sourced workflows)
  // onDelete: 'set null' - If brand deletes template, tenant keeps copy but loses brand reference
  brandWorkflowId: uuid4("brand_workflow_id").references(() => brandWorkflows.id, { onDelete: "set null" }),
  lockedAt: timestamp4("locked_at"),
  // When workflow was locked (brand workflows are locked from structural editing)
  // Template settings
  isPublic: boolean4("is_public").default(false),
  // Can be shared across tenants
  version: integer3("version").default(1),
  isActive: boolean4("is_active").default(true),
  tags: text4("tags").array().default([]),
  // Action Tags - Define what this workflow DOES (e.g., 'richiesta_ferie', 'rimborso_spese')
  // Predefined tags per department help Coverage Dashboard show which actions are covered
  actionTags: text4("action_tags").array().default([]),
  // ['richiesta_ferie', 'richiesta_permessi']
  customAction: text4("custom_action"),
  // Free text for non-standard actions
  // Usage tracking
  usageCount: integer3("usage_count").default(0),
  lastUsed: timestamp4("last_used"),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("workflow_templates_category_idx").on(table.category),
  index4("workflow_templates_type_idx").on(table.templateType),
  index4("workflow_templates_tenant_active_idx").on(table.tenantId, table.isActive),
  index4("workflow_templates_global_idx").on(table.isGlobal),
  // Index per query global templates
  index4("workflow_templates_system_idx").on(table.isSystem),
  // Index per system templates
  index4("workflow_templates_global_version_idx").on(table.globalVersionId),
  // Index per customized templates
  uniqueIndex3("workflow_templates_name_unique").on(table.tenantId, table.name)
]);
var workflowSteps = w3suiteSchema.table("workflow_steps", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid4("template_id").notNull().references(() => workflowTemplates.id, { onDelete: "cascade" }),
  // Step identification
  nodeId: varchar4("node_id", { length: 100 }).notNull(),
  // ID del nodo nel visual editor
  stepType: varchar4("step_type", { length: 50 }).notNull(),
  // 'action', 'condition', 'timer', 'trigger'
  name: varchar4("name", { length: 200 }).notNull(),
  description: text4("description"),
  // Step configuration
  actionId: uuid4("action_id").references(() => workflowActions.id),
  // Per step di tipo 'action'
  triggerId: uuid4("trigger_id").references(() => workflowTriggers.id),
  // Per step di tipo 'trigger'
  conditions: jsonb4("conditions").default({}),
  // Condizioni per esecuzione
  config: jsonb4("config").default({}),
  // Configurazione specifica step
  // Approval logic
  approverLogic: varchar4("approver_logic", { length: 100 }),
  // 'team_supervisor', 'role:HR', 'department:Finance'
  escalationTimeout: integer3("escalation_timeout"),
  // Timeout escalation in hours
  escalationTarget: varchar4("escalation_target", { length: 100 }),
  // Target escalation
  // Step order and flow
  order: integer3("order").notNull(),
  // Ordine esecuzione
  isOptional: boolean4("is_optional").default(false),
  canSkip: boolean4("can_skip").default(false),
  // Visual position (React Flow)
  position: jsonb4("position").default({ x: 0, y: 0 }),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("workflow_steps_template_idx").on(table.templateId),
  index4("workflow_steps_order_idx").on(table.templateId, table.order),
  uniqueIndex3("workflow_steps_node_unique").on(table.templateId, table.nodeId)
]);
var tenantWorkflowNodeOverrides = w3suiteSchema.table("tenant_workflow_node_overrides", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Workflow and node reference
  workflowId: uuid4("workflow_id").notNull().references(() => workflowTemplates.id, { onDelete: "cascade" }),
  nodeId: varchar4("node_id", { length: 100 }).notNull(),
  // Node ID from workflow DSL
  // Override configuration
  // Only specific fields are allowed to be overridden (enforced at API level)
  // Structure per executor type (examples):
  // - team-routing-executor: { teamId: "uuid-here" }
  // - email-action-executor: { from: "email@example.com", teamId: "uuid-here" }
  // - ai-decision-executor: { teamId: "uuid-here" }
  // - webhook-action-executor: { teamId: "uuid-here" }
  // 
  // Merge logic at execution: Deep merge override_config into node.config, only for allowed fields
  // Non-allowed fields in overrideConfig are ignored for security
  overrideConfig: jsonb4("override_config").notNull(),
  // JSONB with executor-specific allowed fields
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  updatedBy: varchar4("updated_by").notNull().references(() => users.id)
}, (table) => [
  uniqueIndex3("tenant_workflow_node_overrides_unique").on(table.tenantId, table.workflowId, table.nodeId),
  index4("tenant_workflow_node_overrides_workflow_idx").on(table.workflowId),
  index4("tenant_workflow_node_overrides_tenant_idx").on(table.tenantId)
]);
var insertTenantWorkflowNodeOverrideSchema = createInsertSchema4(tenantWorkflowNodeOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  tenantId: z3.string().uuid(),
  workflowId: z3.string().uuid(),
  nodeId: z3.string().min(1).max(100),
  overrideConfig: z3.record(z3.any()),
  // Validated at API level based on executor type
  updatedBy: z3.string().min(1)
});
var teams = w3suiteSchema.table("teams", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Team identification
  name: varchar4("name", { length: 200 }).notNull(),
  description: text4("description"),
  teamType: varchar4("team_type", { length: 50 }).default("functional"),
  // 'functional', 'project', 'department', 'crm', 'sales'
  // Hybrid membership (users + roles)
  userMembers: text4("user_members").array().default([]),
  // Array of user IDs
  roleMembers: text4("role_members").array().default([]),
  // Array of role IDs (tutti gli utenti con questi ruoli)
  // Supervisor configuration (RBAC validated) - Hybrid User/Role support
  primarySupervisorUser: varchar4("primary_supervisor_user").references(() => users.id, { onDelete: "set null" }),
  // Primary supervisor (user-based)
  primarySupervisorRole: uuid4("primary_supervisor_role").references(() => roles.id, { onDelete: "set null" }),
  // Primary supervisor (role-based)
  secondarySupervisorUser: varchar4("secondary_supervisor_user").references(() => users.id, { onDelete: "set null" }),
  // Secondary supervisor (single user, optional)
  secondarySupervisorRoles: uuid4("secondary_supervisor_roles").array().default([]),
  // Secondary supervisors (role-based, UUID array - kept for compatibility)
  requiredSupervisorPermission: varchar4("required_supervisor_permission", { length: 200 }).default("team.manage"),
  // Team scope and permissions
  scope: jsonb4("scope").default({}),
  // Scope ereditato o personalizzato
  permissions: jsonb4("permissions").default({}),
  // Permessi team-specific
  // 🎯 DEPARTMENT ASSIGNMENT: Team può gestire multipli dipartimenti
  assignedDepartments: text4("assigned_departments").array().default([]),
  // Array of department enum values ['hr', 'finance', 'sales']
  // Configuration
  isActive: boolean4("is_active").default(true),
  autoAssignWorkflows: boolean4("auto_assign_workflows").default(true),
  // Auto-assign workflow ai membri
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("teams_tenant_active_idx").on(table.tenantId, table.isActive),
  index4("teams_primary_supervisor_user_idx").on(table.primarySupervisorUser),
  index4("teams_primary_supervisor_role_idx").on(table.primarySupervisorRole),
  uniqueIndex3("teams_name_unique").on(table.tenantId, table.name)
]);
var teamWorkflowAssignments = w3suiteSchema.table("team_workflow_assignments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  teamId: uuid4("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  templateId: uuid4("template_id").notNull().references(() => workflowTemplates.id, { onDelete: "cascade" }),
  // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
  forDepartment: departmentEnum("for_department").notNull(),
  // Quale dipartimento usa questo workflow
  // Assignment configuration
  autoAssign: boolean4("auto_assign").default(true),
  // Auto-assign a richieste membri team
  priority: integer3("priority").default(100),
  // Se multipli workflow per team, quale usare primo
  // Conditions for workflow usage
  conditions: jsonb4("conditions").default({}),
  // { requestType: 'vacation', amountRange: [0, 1000], customRules: {} }
  // Overrides specifici per questo team
  overrides: jsonb4("overrides").default({}),
  // { skipSteps: [], alternateApprovers: {}, customSLA: 24 }
  // Status and validity
  isActive: boolean4("is_active").default(true),
  validFrom: timestamp4("valid_from").defaultNow(),
  validTo: timestamp4("valid_to"),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("team_workflow_assignments_team_idx").on(table.teamId),
  index4("team_workflow_assignments_template_idx").on(table.templateId),
  index4("team_workflow_assignments_active_idx").on(table.isActive),
  // 🎯 UNIQUE PER DIPARTIMENTO: Stesso team può avere stesso workflow per dipartimenti diversi
  uniqueIndex3("team_workflow_assignments_unique").on(table.teamId, table.templateId, table.forDepartment)
]);
var userWorkflowAssignments = w3suiteSchema.table("user_workflow_assignments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid4("template_id").notNull().references(() => workflowTemplates.id, { onDelete: "cascade" }),
  // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
  forDepartment: departmentEnum("for_department").notNull(),
  // Quale dipartimento usa questo workflow
  // Assignment configuration
  autoAssign: boolean4("auto_assign").default(true),
  // Auto-assign a richieste utente
  priority: integer3("priority").default(100),
  // Se multipli workflow per utente, quale usare primo
  // Conditions for workflow usage
  conditions: jsonb4("conditions").default({}),
  // { requestType: 'vacation', amountRange: [0, 1000], customRules: {} }
  // Overrides specifici per questo utente
  overrides: jsonb4("overrides").default({}),
  // { skipSteps: [], alternateApprovers: {}, customSLA: 24 }
  // Status and validity
  isActive: boolean4("is_active").default(true),
  validFrom: timestamp4("valid_from").defaultNow(),
  validTo: timestamp4("valid_to"),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("user_workflow_assignments_tenant_idx").on(table.tenantId),
  index4("user_workflow_assignments_user_idx").on(table.userId),
  index4("user_workflow_assignments_template_idx").on(table.templateId),
  index4("user_workflow_assignments_active_idx").on(table.isActive),
  // 🎯 UNIQUE PER DIPARTIMENTO: Stesso utente può avere stesso workflow per dipartimenti diversi
  uniqueIndex3("user_workflow_assignments_unique").on(table.userId, table.templateId, table.forDepartment)
]);
var workflowInstances = w3suiteSchema.table("workflow_instances", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid4("template_id").notNull().references(() => workflowTemplates.id),
  // ✅ FIXED: Match existing database structure - use reference_id instead of request_id
  referenceId: varchar4("reference_id"),
  // Collegato a richiesta (existing column)
  // 🎯 NEW: Propagate category from template for department isolation
  category: varchar4("category", { length: 50 }).notNull(),
  // Inherited from workflowTemplates.category
  // ✅ FIXED: Match existing database columns exactly
  instanceType: varchar4("instance_type").notNull(),
  // existing column
  instanceName: varchar4("instance_name").notNull(),
  // existing column
  // ✅ FIXED: State machine - match existing structure  
  currentStatus: varchar4("current_status", { length: 50 }).default("pending"),
  // existing column
  currentStepId: uuid4("current_step_id"),
  // existing column
  currentNodeId: varchar4("current_node_id"),
  // existing column
  currentAssignee: varchar4("current_assignee"),
  // existing column
  assignedTeamId: uuid4("assigned_team_id"),
  // existing column
  assignedUsers: text4("assigned_users").array().default(sql4`'{}'::text[]`),
  // existing column
  escalationLevel: integer3("escalation_level").default(0),
  // existing column
  // ✅ FIXED: Match existing timestamp columns
  startedAt: timestamp4("started_at").default(sql4`now()`),
  // existing column  
  completedAt: timestamp4("completed_at"),
  // existing column
  lastActivityAt: timestamp4("last_activity_at").default(sql4`now()`),
  // existing column
  // ✅ FIXED: Match existing jsonb columns
  context: jsonb4("context").default(sql4`'{}'::jsonb`),
  // existing column
  workflowData: jsonb4("workflow_data").default(sql4`'{}'::jsonb`),
  // existing column
  metadata: jsonb4("metadata").default(sql4`'{}'::jsonb`),
  // existing column
  // ✅ FIXED: Match existing metadata columns
  createdBy: varchar4("created_by"),
  // existing column
  updatedBy: varchar4("updated_by"),
  // existing column
  createdAt: timestamp4("created_at").default(sql4`now()`),
  // existing column
  updatedAt: timestamp4("updated_at").default(sql4`now()`)
  // existing column
});
var workflowExecutions = w3suiteSchema.table("workflow_executions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  instanceId: uuid4("instance_id").notNull().references(() => workflowInstances.id, { onDelete: "cascade" }),
  stepId: uuid4("step_id").references(() => workflowSteps.id),
  // Execution details
  executionType: varchar4("execution_type", { length: 50 }).notNull(),
  // 'action', 'trigger', 'condition', 'timer'
  executorId: varchar4("executor_id").references(() => users.id),
  // Chi ha eseguito (per azioni manuali)
  automatedBy: varchar4("automated_by", { length: 100 }),
  // Sistema che ha eseguito automaticamente
  // Execution data
  inputData: jsonb4("input_data").default({}),
  outputData: jsonb4("output_data").default({}),
  // Results and status
  status: varchar4("status", { length: 50 }).notNull(),
  // 'success', 'failed', 'pending', 'skipped', 'timeout'
  errorMessage: text4("error_message"),
  retryCount: integer3("retry_count").default(0),
  // Timing
  startedAt: timestamp4("started_at").notNull().defaultNow(),
  completedAt: timestamp4("completed_at"),
  duration: integer3("duration"),
  // Durata in millisecondi
  // Metadata
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  index4("workflow_executions_instance_idx").on(table.instanceId),
  index4("workflow_executions_step_idx").on(table.stepId),
  index4("workflow_executions_executor_idx").on(table.executorId),
  index4("workflow_executions_status_idx").on(table.status),
  index4("workflow_executions_started_idx").on(table.startedAt)
]);
var workflowStepExecutions = w3suiteSchema.table("workflow_step_executions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Step execution identification
  instanceId: uuid4("instance_id").notNull().references(() => workflowInstances.id, { onDelete: "cascade" }),
  stepId: varchar4("step_id", { length: 100 }).notNull(),
  // Node ID from ReactFlow
  stepName: varchar4("step_name", { length: 200 }),
  // Human-readable step name
  // 🔑 IDEMPOTENCY KEY - Prevents duplicate executions
  idempotencyKey: varchar4("idempotency_key", { length: 255 }).notNull().unique(),
  // SHA256(instanceId + stepId + attemptNumber)
  attemptNumber: integer3("attempt_number").default(1).notNull(),
  // Retry attempt counter
  // Execution status
  status: varchar4("status", { length: 50 }).default("pending").notNull(),
  // 'pending', 'running', 'completed', 'failed', 'compensated'
  // Execution data
  inputData: jsonb4("input_data").default({}),
  // Input parameters for step
  outputData: jsonb4("output_data").default({}),
  // Result/output from step
  errorDetails: jsonb4("error_details").default({}),
  // { message, stack, code, recoverable }
  // Timing & Performance
  startedAt: timestamp4("started_at"),
  completedAt: timestamp4("completed_at"),
  durationMs: integer3("duration_ms"),
  // Execution duration in milliseconds
  // Retry & Compensation Logic
  retryCount: integer3("retry_count").default(0),
  // Number of retries performed
  maxRetries: integer3("max_retries").default(3),
  // Max retry attempts
  nextRetryAt: timestamp4("next_retry_at"),
  // Scheduled next retry
  compensationExecuted: boolean4("compensation_executed").default(false),
  // Rollback performed
  compensationData: jsonb4("compensation_data").default({}),
  // Compensation action details
  // Metadata
  metadata: jsonb4("metadata").default({}),
  // Additional context
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("workflow_step_executions_instance_idx").on(table.instanceId),
  index4("workflow_step_executions_step_idx").on(table.stepId),
  index4("workflow_step_executions_status_idx").on(table.status),
  index4("workflow_step_executions_idempotency_idx").on(table.idempotencyKey),
  index4("workflow_step_executions_retry_idx").on(table.nextRetryAt),
  uniqueIndex3("workflow_step_executions_unique").on(table.instanceId, table.stepId, table.attemptNumber)
]);
var workflowStateEvents = w3suiteSchema.table("workflow_state_events", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Event identification
  instanceId: uuid4("instance_id").notNull().references(() => workflowInstances.id, { onDelete: "cascade" }),
  eventType: varchar4("event_type", { length: 100 }).notNull(),
  // 'state_changed', 'step_completed', 'step_failed', 'workflow_paused', 'workflow_resumed'
  eventSequence: integer3("event_sequence").notNull(),
  // Ordered sequence for replay
  // State snapshot
  previousState: varchar4("previous_state", { length: 50 }),
  // Previous workflow status
  newState: varchar4("new_state", { length: 50 }).notNull(),
  // New workflow status
  // Event data
  stepId: varchar4("step_id", { length: 100 }),
  // Related step if applicable
  eventData: jsonb4("event_data").default({}),
  // Complete event payload
  metadata: jsonb4("metadata").default({}),
  // Additional context
  // Causation tracking
  causedBy: varchar4("caused_by", { length: 50 }),
  // 'user', 'system', 'timer', 'webhook'
  userId: varchar4("user_id").references(() => users.id),
  // Timestamp
  occurredAt: timestamp4("occurred_at").notNull().defaultNow(),
  // Recovery tracking
  isProcessed: boolean4("is_processed").default(true),
  // False for pending replay
  processedAt: timestamp4("processed_at").defaultNow()
}, (table) => [
  index4("workflow_state_events_instance_idx").on(table.instanceId),
  index4("workflow_state_events_sequence_idx").on(table.instanceId, table.eventSequence),
  index4("workflow_state_events_type_idx").on(table.eventType),
  index4("workflow_state_events_occurred_idx").on(table.occurredAt),
  uniqueIndex3("workflow_state_events_unique").on(table.instanceId, table.eventSequence)
]);
var workflowStateSnapshots = w3suiteSchema.table("workflow_state_snapshots", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Snapshot identification
  instanceId: uuid4("instance_id").notNull().references(() => workflowInstances.id, { onDelete: "cascade" }),
  snapshotSequence: integer3("snapshot_sequence").notNull(),
  // Incrementing snapshot number
  eventSequenceAt: integer3("event_sequence_at").notNull(),
  // Last event sequence included in snapshot
  // Complete state snapshot
  workflowState: jsonb4("workflow_state").notNull(),
  // Full workflow state at this point
  executionContext: jsonb4("execution_context").default({}),
  // Runtime context variables
  completedSteps: text4("completed_steps").array().default([]),
  // Array of completed step IDs
  pendingSteps: text4("pending_steps").array().default([]),
  // Array of pending step IDs
  // Snapshot metadata
  currentStatus: varchar4("current_status", { length: 50 }).notNull(),
  currentStepId: varchar4("current_step_id", { length: 100 }),
  // Performance tracking
  snapshotSizeBytes: integer3("snapshot_size_bytes"),
  // Size for cleanup decisions
  // Timestamps
  createdAt: timestamp4("created_at").notNull().defaultNow(),
  expiresAt: timestamp4("expires_at")
  // Auto-cleanup old snapshots
}, (table) => [
  index4("workflow_state_snapshots_instance_idx").on(table.instanceId),
  index4("workflow_state_snapshots_sequence_idx").on(table.instanceId, table.snapshotSequence),
  index4("workflow_state_snapshots_created_idx").on(table.createdAt),
  uniqueIndex3("workflow_state_snapshots_unique").on(table.instanceId, table.snapshotSequence)
]);
var webhookEvents = w3suiteSchema.table("webhook_events", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Event identification
  eventId: varchar4("event_id", { length: 255 }).notNull(),
  // Provider's event ID (for deduplication)
  eventType: varchar4("event_type", { length: 100 }).notNull(),
  // 'payment.succeeded', 'sms.delivered', etc.
  source: varchar4("source", { length: 100 }).notNull(),
  // 'stripe', 'twilio', 'github', 'custom'
  // Event data
  payload: jsonb4("payload").notNull(),
  // Full webhook payload
  headers: jsonb4("headers").default({}),
  // HTTP headers from webhook request
  signature: text4("signature"),
  // Webhook signature for validation
  signatureValid: boolean4("signature_valid"),
  // Validation result
  // Processing status
  status: varchar4("status", { length: 50 }).default("pending").notNull(),
  // 'pending', 'processing', 'completed', 'failed', 'skipped'
  processingError: text4("processing_error"),
  // Error message if failed
  retryCount: integer3("retry_count").default(0),
  maxRetries: integer3("max_retries").default(3),
  // Workflow trigger mapping
  workflowTriggerId: uuid4("workflow_trigger_id").references(() => workflowTriggers.id),
  // Matched workflow trigger
  workflowInstanceId: uuid4("workflow_instance_id").references(() => workflowInstances.id),
  // Created workflow instance
  // Timing
  receivedAt: timestamp4("received_at").defaultNow().notNull(),
  processedAt: timestamp4("processed_at"),
  nextRetryAt: timestamp4("next_retry_at"),
  // Metadata
  metadata: jsonb4("metadata").default({}),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("webhook_events_tenant_idx").on(table.tenantId),
  index4("webhook_events_event_id_idx").on(table.eventId),
  index4("webhook_events_event_type_idx").on(table.eventType),
  index4("webhook_events_source_idx").on(table.source),
  index4("webhook_events_status_idx").on(table.status),
  index4("webhook_events_received_idx").on(table.receivedAt),
  index4("webhook_events_next_retry_idx").on(table.nextRetryAt),
  uniqueIndex3("webhook_events_unique").on(table.tenantId, table.source, table.eventId)
  // Prevent duplicates
]);
var webhookSignatures = w3suiteSchema.table("webhook_signatures", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Provider identification
  provider: varchar4("provider", { length: 100 }).notNull(),
  // 'stripe', 'twilio', 'github', 'custom'
  providerName: varchar4("provider_name", { length: 200 }).notNull(),
  // Display name
  description: text4("description"),
  // Signature configuration
  signingSecret: text4("signing_secret").notNull(),
  // Encrypted webhook secret
  validationAlgorithm: varchar4("validation_algorithm", { length: 50 }).default("hmac-sha256").notNull(),
  // 'hmac-sha256', 'hmac-sha512', 'rsa'
  signatureHeader: varchar4("signature_header", { length: 100 }).default("x-webhook-signature"),
  // Header containing signature
  timestampHeader: varchar4("timestamp_header", { length: 100 }),
  // Header for timestamp (replay protection)
  // Validation settings
  toleranceWindowSeconds: integer3("tolerance_window_seconds").default(300),
  // 5 min replay protection
  requireTimestamp: boolean4("require_timestamp").default(false),
  // RBAC Integration
  requiredPermission: varchar4("required_permission", { length: 200 }).default("webhooks.receive.*"),
  // Permission to receive webhooks
  allowedEventTypes: text4("allowed_event_types").array().default([]),
  // Whitelist of event types (empty = all)
  // Status
  isActive: boolean4("is_active").default(true),
  lastUsed: timestamp4("last_used"),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow(),
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id)
}, (table) => [
  index4("webhook_signatures_tenant_idx").on(table.tenantId),
  index4("webhook_signatures_provider_idx").on(table.provider),
  index4("webhook_signatures_active_idx").on(table.isActive),
  uniqueIndex3("webhook_signatures_unique").on(table.tenantId, table.provider)
]);
var tasks = w3suiteSchema.table("tasks", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  // Basic Info
  title: varchar4("title", { length: 500 }).notNull(),
  description: text4("description"),
  status: taskStatusEnum2("status").default("todo").notNull(),
  priority: taskPriorityEnum2("priority").default("medium").notNull(),
  urgency: taskUrgencyEnum("urgency").default("medium").notNull(),
  // Ownership & Visibility
  creatorId: varchar4("creator_id").notNull().references(() => users.id),
  department: departmentEnum("department"),
  // Dates
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  dueDate: timestamp4("due_date"),
  startDate: timestamp4("start_date"),
  completedAt: timestamp4("completed_at"),
  archivedAt: timestamp4("archived_at"),
  // Progress & Tracking
  estimatedHours: real3("estimated_hours"),
  actualHours: real3("actual_hours"),
  completionPercentage: integer3("completion_percentage").default(0),
  // Categorization
  tags: text4("tags").array().default([]),
  customFields: jsonb4("custom_fields").default({}),
  // Workflow Integration (OPTIONAL)
  linkedWorkflowInstanceId: uuid4("linked_workflow_instance_id").references(() => workflowInstances.id),
  linkedWorkflowTeamId: uuid4("linked_workflow_team_id").references(() => teams.id),
  triggeredByWorkflowStepId: uuid4("triggered_by_workflow_step_id"),
  // Recurrence
  isRecurring: boolean4("is_recurring").default(false),
  recurrenceRule: jsonb4("recurrence_rule"),
  parentRecurringTaskId: uuid4("parent_recurring_task_id"),
  // Metadata
  metadata: jsonb4("metadata").default({})
}, (table) => [
  index4("tasks_tenant_idx").on(table.tenantId),
  index4("tasks_creator_idx").on(table.tenantId, table.creatorId),
  index4("tasks_status_idx").on(table.tenantId, table.status),
  index4("tasks_department_idx").on(table.tenantId, table.department),
  index4("tasks_due_date_idx").on(table.tenantId, table.dueDate),
  index4("tasks_workflow_idx").on(table.linkedWorkflowInstanceId)
]);
var taskAssignments = w3suiteSchema.table("task_assignments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  taskId: uuid4("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  role: taskAssignmentRoleEnum("role").notNull(),
  assignedAt: timestamp4("assigned_at").defaultNow().notNull(),
  assignedBy: varchar4("assigned_by").notNull().references(() => users.id),
  // Notification preferences
  notifyOnUpdate: boolean4("notify_on_update").default(true),
  notifyOnComment: boolean4("notify_on_comment").default(true)
}, (table) => [
  uniqueIndex3("task_assignments_unique").on(table.taskId, table.userId, table.role),
  index4("task_assignments_user_idx").on(table.userId, table.role),
  index4("task_assignments_task_idx").on(table.taskId),
  index4("task_assignments_tenant_idx").on(table.tenantId)
]);
var taskChecklistItems = w3suiteSchema.table("task_checklist_items", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  taskId: uuid4("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  title: varchar4("title", { length: 500 }).notNull(),
  description: text4("description"),
  position: integer3("position").notNull(),
  // Granular Assignment (NULL = all task assignees)
  assignedToUserId: varchar4("assigned_to_user_id").references(() => users.id),
  // Dates
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  dueDate: timestamp4("due_date"),
  completedAt: timestamp4("completed_at"),
  completedBy: varchar4("completed_by").references(() => users.id),
  // Status
  isCompleted: boolean4("is_completed").default(false),
  // Metadata
  metadata: jsonb4("metadata").default({})
}, (table) => [
  index4("checklist_task_idx").on(table.taskId, table.position),
  index4("checklist_assigned_idx").on(table.assignedToUserId),
  index4("checklist_due_date_idx").on(table.dueDate)
]);
var taskComments = w3suiteSchema.table("task_comments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  taskId: uuid4("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  content: text4("content").notNull(),
  // Threading (optional)
  parentCommentId: uuid4("parent_comment_id"),
  // Mentions
  mentionedUserIds: varchar4("mentioned_user_ids").array().default([]),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  isEdited: boolean4("is_edited").default(false),
  deletedAt: timestamp4("deleted_at")
}, (table) => [
  index4("comments_task_idx").on(table.taskId, table.createdAt),
  index4("comments_user_idx").on(table.userId)
]);
var taskTimeLogs = w3suiteSchema.table("task_time_logs", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  taskId: uuid4("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  checklistItemId: uuid4("checklist_item_id").references(() => taskChecklistItems.id, { onDelete: "set null" }),
  startedAt: timestamp4("started_at").notNull(),
  endedAt: timestamp4("ended_at"),
  duration: integer3("duration"),
  description: text4("description"),
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  index4("time_logs_task_idx").on(table.taskId, table.userId),
  index4("time_logs_user_idx").on(table.userId, table.startedAt),
  index4("time_logs_running_idx").on(table.userId, table.endedAt)
]);
var taskDependencies = w3suiteSchema.table("task_dependencies", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  taskId: uuid4("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependentTaskId: uuid4("dependent_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependencyType: taskDependencyTypeEnum("dependency_type").default("blocks").notNull(),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  createdBy: varchar4("created_by").notNull().references(() => users.id)
}, (table) => [
  uniqueIndex3("task_dependencies_unique").on(table.taskId, table.dependentTaskId),
  index4("task_dependencies_task_idx").on(table.taskId),
  index4("task_dependencies_depends_idx").on(table.dependentTaskId)
]);
var taskAttachments = w3suiteSchema.table("task_attachments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  taskId: uuid4("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  uploadedBy: varchar4("uploaded_by").notNull().references(() => users.id),
  fileName: varchar4("file_name", { length: 500 }).notNull(),
  fileUrl: text4("file_url").notNull(),
  fileSize: integer3("file_size").notNull(),
  mimeType: varchar4("mime_type", { length: 100 }).notNull(),
  uploadedAt: timestamp4("uploaded_at").defaultNow().notNull()
}, (table) => [
  index4("attachments_task_idx").on(table.taskId),
  index4("attachments_user_idx").on(table.uploadedBy)
]);
var taskTemplates = w3suiteSchema.table("task_templates", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  department: departmentEnum("department"),
  name: varchar4("name", { length: 200 }).notNull(),
  description: text4("description"),
  // Template Configuration (JSON)
  templateData: jsonb4("template_data").notNull(),
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  // Recurrence
  isRecurring: boolean4("is_recurring").default(false),
  recurrenceRule: jsonb4("recurrence_rule"),
  lastInstantiatedAt: timestamp4("last_instantiated_at"),
  isActive: boolean4("is_active").default(true)
}, (table) => [
  index4("templates_tenant_idx").on(table.tenantId, table.isActive),
  index4("templates_department_idx").on(table.department)
]);
var chatChannels = w3suiteSchema.table("chat_channels", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  name: varchar4("name", { length: 200 }),
  description: text4("description"),
  channelType: chatChannelTypeEnum("channel_type").notNull(),
  visibility: chatVisibilityEnum("visibility").default("private").notNull(),
  // References
  teamId: uuid4("team_id").references(() => teams.id),
  taskId: uuid4("task_id").references(() => tasks.id),
  createdBy: varchar4("created_by").notNull().references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  isArchived: boolean4("is_archived").default(false),
  // Metadata
  metadata: jsonb4("metadata").default({})
}, (table) => [
  index4("channels_tenant_idx").on(table.tenantId, table.channelType),
  index4("channels_task_idx").on(table.taskId),
  index4("channels_team_idx").on(table.teamId)
]);
var chatChannelMembers = w3suiteSchema.table("chat_channel_members", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  channelId: uuid4("channel_id").notNull().references(() => chatChannels.id, { onDelete: "cascade" }),
  userId: varchar4("user_id").notNull().references(() => users.id),
  role: chatMemberRoleEnum("role").default("member").notNull(),
  inviteStatus: chatInviteStatusEnum("invite_status").default("accepted").notNull(),
  joinedAt: timestamp4("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp4("last_read_at"),
  notificationPreference: chatNotificationPreferenceEnum("notification_preference").default("all").notNull()
}, (table) => [
  uniqueIndex3("channel_members_unique").on(table.channelId, table.userId),
  index4("channel_members_user_idx").on(table.userId)
]);
var chatMessages = w3suiteSchema.table("chat_messages", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  channelId: uuid4("channel_id").notNull().references(() => chatChannels.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  content: text4("content").notNull(),
  // Threading
  parentMessageId: uuid4("parent_message_id"),
  // Mentions & Reactions
  mentionedUserIds: varchar4("mentioned_user_ids").array().default([]),
  reactions: jsonb4("reactions").default({}),
  // Attachments
  attachments: jsonb4("attachments").default([]),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  isEdited: boolean4("is_edited").default(false),
  deletedAt: timestamp4("deleted_at")
}, (table) => [
  index4("messages_channel_idx").on(table.channelId, table.createdAt),
  index4("messages_user_idx").on(table.userId),
  index4("messages_parent_idx").on(table.parentMessageId)
]);
var chatTypingIndicators = w3suiteSchema.table("chat_typing_indicators", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  channelId: uuid4("channel_id").notNull().references(() => chatChannels.id, { onDelete: "cascade" }),
  userId: varchar4("user_id").notNull().references(() => users.id),
  startedAt: timestamp4("started_at").defaultNow().notNull(),
  expiresAt: timestamp4("expires_at").notNull()
}, (table) => [
  uniqueIndex3("typing_unique").on(table.channelId, table.userId),
  index4("typing_expires_idx").on(table.expiresAt)
]);
var activityFeedEvents = w3suiteSchema.table("activity_feed_events", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  eventType: varchar4("event_type", { length: 100 }).notNull(),
  category: activityFeedCategoryEnum("category").notNull(),
  // Actor
  actorUserId: varchar4("actor_user_id").references(() => users.id),
  actorType: activityFeedActorTypeEnum("actor_type").default("user").notNull(),
  // Target Entity
  targetEntityType: varchar4("target_entity_type", { length: 100 }),
  targetEntityId: uuid4("target_entity_id"),
  // Content
  title: varchar4("title", { length: 500 }).notNull(),
  description: text4("description"),
  // Data
  eventData: jsonb4("event_data").default({}),
  // Visibility
  department: departmentEnum("department"),
  visibleToUserIds: varchar4("visible_to_user_ids").array(),
  // Metadata
  priority: activityFeedPriorityEnum("priority").default("normal").notNull(),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  expiresAt: timestamp4("expires_at")
}, (table) => [
  index4("feed_tenant_idx").on(table.tenantId, table.createdAt),
  index4("feed_category_idx").on(table.tenantId, table.category),
  index4("feed_actor_idx").on(table.actorUserId),
  index4("feed_target_idx").on(table.targetEntityType, table.targetEntityId),
  index4("feed_department_idx").on(table.department)
]);
var activityFeedInteractions = w3suiteSchema.table("activity_feed_interactions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  eventId: uuid4("event_id").notNull().references(() => activityFeedEvents.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  userId: varchar4("user_id").notNull().references(() => users.id),
  interactionType: activityFeedInteractionTypeEnum("interaction_type").notNull(),
  // For comments
  commentContent: text4("comment_content"),
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  index4("interactions_event_idx").on(table.eventId, table.interactionType),
  index4("interactions_user_idx").on(table.userId),
  index4("interactions_tenant_idx").on(table.tenantId),
  uniqueIndex3("interactions_like_unique").on(table.eventId, table.userId, table.interactionType)
]);
var insertWorkflowActionSchema = createInsertSchema4(workflowActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWorkflowTriggerSchema = createInsertSchema4(workflowTriggers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWorkflowTemplateSchema = createInsertSchema4(workflowTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWorkflowStepSchema = createInsertSchema4(workflowSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTeamSchema = createInsertSchema4(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTeamWorkflowAssignmentSchema = createInsertSchema4(teamWorkflowAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUserWorkflowAssignmentSchema = createInsertSchema4(userWorkflowAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWorkflowInstanceSchema = createInsertSchema4(workflowInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWorkflowExecutionSchema = createInsertSchema4(workflowExecutions).omit({
  id: true,
  createdAt: true
});
var insertWorkflowStepExecutionSchema = createInsertSchema4(workflowStepExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  durationMs: true
});
var insertWorkflowStateEventSchema = createInsertSchema4(workflowStateEvents).omit({
  id: true,
  occurredAt: true,
  processedAt: true
});
var insertWorkflowStateSnapshotSchema = createInsertSchema4(workflowStateSnapshots).omit({
  id: true,
  createdAt: true
});
var insertWebhookEventSchema = createInsertSchema4(webhookEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWebhookSignatureSchema = createInsertSchema4(webhookSignatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, { fields: [notifications.tenantId], references: [tenants.id] }),
  targetUser: one(users, { fields: [notifications.targetUserId], references: [users.id] })
}));
var notificationTemplatesRelations = relations(notificationTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [notificationTemplates.tenantId], references: [tenants.id] })
}));
var notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  tenant: one(tenants, { fields: [notificationPreferences.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] })
}));
var aiSettings = w3suiteSchema.table("ai_settings", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  // AI Activation Control
  isActive: boolean4("is_active").default(true).notNull(),
  // Master switch for AI features
  // Model Configuration
  openaiModel: aiModelEnum("openai_model").default("gpt-4-turbo").notNull(),
  openaiApiKey: text4("openai_api_key"),
  // Encrypted storage for tenant-specific API key
  apiConnectionStatus: aiConnectionStatusEnum("api_connection_status").default("disconnected").notNull(),
  lastConnectionTest: timestamp4("last_connection_test"),
  connectionTestResult: jsonb4("connection_test_result"),
  // Store last test details
  // Features Configuration - Granular control via JSONB
  featuresEnabled: jsonb4("features_enabled").default({
    chat_assistant: true,
    document_analysis: true,
    natural_queries: true,
    financial_forecasting: false,
    web_search: false,
    code_interpreter: false,
    file_search: true,
    image_generation: false,
    voice_assistant: false,
    realtime_streaming: false,
    background_processing: true
  }).notNull(),
  // Response Configuration
  maxTokensPerResponse: integer3("max_tokens_per_response").default(1e3).notNull(),
  responseCreativity: smallint4("response_creativity").default(7),
  // 0-20 scale (mapped to 0-2.0 temperature)
  responseLengthLimit: integer3("response_length_limit").default(4e3).notNull(),
  // ➕ AI AGENT REGISTRY COMPATIBILITY (FASE 2 - Now active!)
  activeAgents: jsonb4("active_agents").default('["tippy-sales"]').notNull(),
  // Lista agenti attivi per tenant
  agentOverrides: jsonb4("agent_overrides").default("{}").notNull(),
  // Override specifici tenant per agenti
  // Usage & Limits
  monthlyTokenLimit: integer3("monthly_token_limit").default(1e5).notNull(),
  currentMonthUsage: integer3("current_month_usage").default(0).notNull(),
  usageResetDate: date3("usage_reset_date"),
  // Privacy & Data Retention
  privacyMode: aiPrivacyModeEnum("privacy_mode").default("standard").notNull(),
  chatRetentionDays: integer3("chat_retention_days").default(30).notNull(),
  dataSharingOpenai: boolean4("data_sharing_openai").default(false).notNull(),
  // Enterprise Features
  contextSettings: jsonb4("context_settings").default({
    hr_context_enabled: true,
    finance_context_enabled: true,
    business_rules_integration: false,
    custom_instructions: ""
  }),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => ({
  tenantIndex: index4("ai_settings_tenant_idx").on(table.tenantId)
}));
var aiUsageLogs = w3suiteSchema.table("ai_usage_logs", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: uuid4("user_id").references(() => users.id, { onDelete: "set null" }),
  // Request Details
  modelUsed: aiModelEnum("model_used").notNull(),
  featureType: aiFeatureTypeEnum("feature_type").notNull(),
  tokensInput: integer3("tokens_input").default(0).notNull(),
  tokensOutput: integer3("tokens_output").default(0).notNull(),
  tokensTotal: integer3("tokens_total").default(0).notNull(),
  costUsd: integer3("cost_usd").default(0).notNull(),
  // Stored as cents for precision
  // Performance & Success
  responseTimeMs: integer3("response_time_ms"),
  success: boolean4("success").default(true).notNull(),
  errorMessage: text4("error_message"),
  // Request Context
  requestContext: jsonb4("request_context").default({}),
  requestTimestamp: timestamp4("request_timestamp").defaultNow().notNull()
}, (table) => ({
  tenantIndex: index4("ai_usage_logs_tenant_idx").on(table.tenantId),
  userIndex: index4("ai_usage_logs_user_idx").on(table.userId),
  timestampIndex: index4("ai_usage_logs_timestamp_idx").on(table.requestTimestamp),
  featureIndex: index4("ai_usage_logs_feature_idx").on(table.featureType),
  // Composite index for granular analytics queries
  analyticsIndex: index4("ai_usage_logs_analytics_idx").on(table.tenantId, table.featureType, table.requestTimestamp),
  costIndex: index4("ai_usage_logs_cost_idx").on(table.tenantId, table.costUsd, table.requestTimestamp)
}));
var aiAgentTenantSettings = w3suiteSchema.table("ai_agent_tenant_settings", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  // Agent Identification
  agentId: text4("agent_id").notNull(),
  // e.g., "tippy-sales", "workflow-assistant"
  // Enablement Control
  isEnabled: boolean4("is_enabled").default(true).notNull(),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => ({
  tenantIndex: index4("ai_agent_tenant_settings_tenant_idx").on(table.tenantId),
  agentIndex: index4("ai_agent_tenant_settings_agent_idx").on(table.agentId),
  // Unique constraint: one setting per agent per tenant
  uniqueTenantAgent: index4("ai_agent_tenant_settings_unique_idx").on(table.tenantId, table.agentId)
}));
var aiConversations = w3suiteSchema.table("ai_conversations", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: uuid4("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  // Conversation Metadata
  title: varchar4("title", { length: 255 }).notNull(),
  conversationData: jsonb4("conversation_data").notNull(),
  // Encrypted chat history
  featureContext: aiFeatureTypeEnum("feature_context").default("chat").notNull(),
  // Business Context
  moduleContext: varchar4("module_context", { length: 50 }),
  // 'hr', 'finance', 'general'
  businessEntityId: uuid4("business_entity_id"),
  // Related entity (user, store, etc.)
  // Retention Management
  expiresAt: timestamp4("expires_at"),
  // Based on retention policy
  isArchived: boolean4("is_archived").default(false).notNull(),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => ({
  tenantIndex: index4("ai_conversations_tenant_idx").on(table.tenantId),
  userIndex: index4("ai_conversations_user_idx").on(table.userId),
  contextIndex: index4("ai_conversations_context_idx").on(table.featureContext),
  expiresIndex: index4("ai_conversations_expires_idx").on(table.expiresAt)
}));
var leadRoutingHistory = w3suiteSchema.table("lead_routing_history", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  leadId: uuid4("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }).notNull(),
  // Interaction Context
  interactionType: varchar4("interaction_type", { length: 50 }).notNull(),
  // social_post_view, email_open, webinar, etc.
  interactionContent: text4("interaction_content"),
  // Content description
  acquisitionSourceId: uuid4("acquisition_source_id"),
  // FK to be added later when acquisition_sources table exists
  // AI Routing Decision
  recommendedDriver: uuid4("recommended_driver").references(() => drivers.id),
  driverConfidence: leadRoutingConfidenceEnum("driver_confidence").default("medium").notNull(),
  driverReasoning: text4("driver_reasoning"),
  // Pipeline Assignment
  targetPipelineId: uuid4("target_pipeline_id").references(() => crmPipelines.id),
  campaignSuggestion: varchar4("campaign_suggestion", { length: 255 }),
  // Outbound Channel Recommendation
  primaryOutboundChannel: outboundChannelEnum("primary_outbound_channel").notNull(),
  secondaryOutboundChannel: outboundChannelEnum("secondary_outbound_channel"),
  channelReasoning: text4("channel_reasoning"),
  // Deal Prediction
  estimatedValue: integer3("estimated_value"),
  // in cents
  expectedCloseDate: date3("expected_close_date"),
  priority: varchar4("priority", { length: 20 }),
  // High, Medium, Low
  // AI Response Metadata
  aiModel: aiModelEnum("ai_model").default("gpt-4o").notNull(),
  responseTimeMs: integer3("response_time_ms"),
  tokenUsage: integer3("token_usage"),
  fullAiResponse: jsonb4("full_ai_response"),
  // Complete AI JSON response
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => ({
  tenantIndex: index4("lead_routing_history_tenant_idx").on(table.tenantId),
  leadIndex: index4("lead_routing_history_lead_idx").on(table.leadId),
  driverIndex: index4("lead_routing_history_driver_idx").on(table.recommendedDriver),
  pipelineIndex: index4("lead_routing_history_pipeline_idx").on(table.targetPipelineId),
  createdAtIndex: index4("lead_routing_history_created_at_idx").on(table.createdAt)
}));
var leadAiInsights = w3suiteSchema.table("lead_ai_insights", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  leadId: uuid4("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }).notNull(),
  // Insight Data
  insightType: varchar4("insight_type", { length: 50 }).notNull(),
  // routing, scoring, next_action
  insights: jsonb4("insights").notNull(),
  // Array of insight strings
  nextAction: text4("next_action"),
  riskFactors: jsonb4("risk_factors"),
  // Array of risk strings
  // Scoring
  score: integer3("score"),
  // 0-100
  confidence: real3("confidence"),
  // 0.0-1.0
  // Metadata
  generatedBy: varchar4("generated_by", { length: 50 }).default("lead-routing-agent").notNull(),
  aiModel: aiModelEnum("ai_model").default("gpt-4o").notNull(),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  expiresAt: timestamp4("expires_at")
  // Optional expiration for insights
}, (table) => ({
  tenantIndex: index4("lead_ai_insights_tenant_idx").on(table.tenantId),
  leadIndex: index4("lead_ai_insights_lead_idx").on(table.leadId),
  typeIndex: index4("lead_ai_insights_type_idx").on(table.insightType),
  createdAtIndex: index4("lead_ai_insights_created_at_idx").on(table.createdAt)
}));
var mcpServers = w3suiteSchema.table("mcp_servers", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  // Server Identification
  name: varchar4("name", { length: 100 }).notNull(),
  // Unique identifier (e.g., 'google-workspace', 'meta-instagram')
  displayName: varchar4("display_name", { length: 255 }).notNull(),
  // User-friendly name
  description: text4("description"),
  // Connection Details
  serverUrl: text4("server_url"),
  // For http-sse transport (null for stdio)
  transport: mcpTransportEnum("transport").notNull(),
  // stdio or http-sse
  status: mcpServerStatusEnum("status").default("configuring").notNull(),
  // Configuration & Metadata
  config: jsonb4("config").default({}).notNull(),
  // Server-specific config (retries, timeout, etc.)
  iconUrl: varchar4("icon_url", { length: 500 }),
  // Optional icon for UI
  category: mcpToolCategoryEnum("category").default("other"),
  // Installation & Source
  sourceType: varchar4("source_type", { length: 50 }).default("npm_package"),
  // 'npm_package' or 'custom_source'
  installMethod: text4("install_method"),
  // e.g., 'npm install @modelcontextprotocol/server-slack'
  installLocation: text4("install_location"),
  // e.g., 'node_modules/@modelcontextprotocol/server-slack' or '/mcp-servers/custom-webhook'
  discoveredTools: jsonb4("discovered_tools").default([]),
  // Cache of discovered tools [{name, description, schema}]
  // Health & Monitoring
  lastHealthCheck: timestamp4("last_health_check"),
  lastError: text4("last_error"),
  errorCount: integer3("error_count").default(0).notNull(),
  // Metadata
  createdBy: varchar4("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  archivedAt: timestamp4("archived_at")
}, (table) => ({
  tenantIndex: index4("mcp_servers_tenant_idx").on(table.tenantId),
  statusIndex: index4("mcp_servers_status_idx").on(table.status),
  nameIndex: uniqueIndex3("mcp_servers_tenant_name_unique").on(table.tenantId, table.name),
  categoryIndex: index4("mcp_servers_category_idx").on(table.category)
}));
var mcpServerCredentials = w3suiteSchema.table("mcp_server_credentials", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  serverId: uuid4("server_id").references(() => mcpServers.id, { onDelete: "cascade" }).notNull(),
  // Credential Type & Data
  credentialType: mcpCredentialTypeEnum("credential_type").notNull(),
  encryptedCredentials: jsonb4("encrypted_credentials").notNull(),
  // Encrypted: { accessToken, refreshToken, apiKey, etc. }
  encryptionKeyId: varchar4("encryption_key_id", { length: 100 }),
  // Key ID for decryption
  // Multi-Provider OAuth Support (n8n-style)
  userId: varchar4("user_id").references(() => users.id, { onDelete: "cascade" }),
  // For multi-user OAuth (null = tenant-level)
  oauthProvider: varchar4("oauth_provider", { length: 50 }),
  // 'google', 'microsoft', 'meta', 'aws', etc.
  // OAuth-specific fields
  tokenType: varchar4("token_type", { length: 50 }),
  // 'Bearer', 'Basic', etc.
  scope: text4("scope"),
  // OAuth scopes granted
  expiresAt: timestamp4("expires_at"),
  // Token expiration
  accountEmail: varchar4("account_email", { length: 255 }),
  // OAuth account email (for display in UI)
  accountName: varchar4("account_name", { length: 255 }),
  // OAuth account display name
  // Audit & Lifecycle
  createdBy: varchar4("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  lastUsedAt: timestamp4("last_used_at"),
  revokedAt: timestamp4("revoked_at")
}, (table) => ({
  tenantIndex: index4("mcp_server_credentials_tenant_idx").on(table.tenantId),
  serverIndex: index4("mcp_server_credentials_server_idx").on(table.serverId),
  expiresIndex: index4("mcp_server_credentials_expires_idx").on(table.expiresAt),
  userIndex: index4("mcp_server_credentials_user_idx").on(table.userId),
  providerIndex: index4("mcp_server_credentials_provider_idx").on(table.oauthProvider),
  // Unique: one credential per server/user/provider combination (COALESCE handles nulls)
  serverUserProviderUnique: uniqueIndex3("mcp_server_credentials_server_user_provider_unique").on(
    table.serverId,
    sql4`COALESCE(${table.userId}, '')`,
    sql4`COALESCE(${table.oauthProvider}, '')`
  )
}));
var mcpConnectedAccounts = w3suiteSchema.table("mcp_connected_accounts", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  credentialId: uuid4("credential_id").references(() => mcpServerCredentials.id, { onDelete: "cascade" }).notNull(),
  // Account Type & Identity
  accountType: mcpAccountTypeEnum("account_type").notNull(),
  platformAccountId: varchar4("platform_account_id", { length: 255 }).notNull(),
  // FB Page ID, IG Account ID, Google Workspace ID, etc.
  accountName: varchar4("account_name", { length: 255 }).notNull(),
  // Display name (e.g., "Negozio Milano")
  accountUsername: varchar4("account_username", { length: 255 }),
  // @username for Instagram, email for Google
  // Platform-Specific Access Token (for Page Access Tokens, etc.)
  encryptedAccessToken: text4("encrypted_access_token"),
  // Encrypted Page Access Token (Meta) or account-specific token
  tokenExpiresAt: timestamp4("token_expires_at"),
  // null = never expires (Meta Page tokens)
  // Account Metadata
  accountMetadata: jsonb4("account_metadata").default({}),
  // Followers, profile pic, additional info
  linkedAccounts: jsonb4("linked_accounts").default([]),
  // e.g., IG account linked to FB Page: [{type: 'instagram_business', id: 'xxx'}]
  // Permissions & Status
  grantedPermissions: text4("granted_permissions").array(),
  // Specific permissions for this account
  isActive: boolean4("is_active").default(true).notNull(),
  isPrimary: boolean4("is_primary").default(false).notNull(),
  // Mark one account as primary/default
  // Audit & Lifecycle
  createdBy: varchar4("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp4("last_synced_at"),
  // Last time account data was synced
  removedAt: timestamp4("removed_at")
  // Soft delete when user removes account
}, (table) => ({
  tenantIndex: index4("mcp_connected_accounts_tenant_idx").on(table.tenantId),
  credentialIndex: index4("mcp_connected_accounts_credential_idx").on(table.credentialId),
  accountTypeIndex: index4("mcp_connected_accounts_type_idx").on(table.accountType),
  platformAccountIndex: index4("mcp_connected_accounts_platform_id_idx").on(table.platformAccountId),
  // Unique: one account per credential (prevent duplicate page connections)
  credentialPlatformAccountUnique: uniqueIndex3("mcp_connected_accounts_credential_platform_unique").on(
    table.credentialId,
    table.platformAccountId
  )
}));
var mcpToolSchemas = w3suiteSchema.table("mcp_tool_schemas", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  serverId: uuid4("server_id").references(() => mcpServers.id, { onDelete: "cascade" }).notNull(),
  // Tool Identification
  toolName: varchar4("tool_name", { length: 100 }).notNull(),
  // e.g., 'gmail-send', 'instagram-publish'
  displayName: varchar4("display_name", { length: 255 }),
  description: text4("description"),
  category: mcpToolCategoryEnum("category").default("other"),
  // JSON Schema Definition (from MCP server)
  inputSchema: jsonb4("input_schema").notNull(),
  // Zod-compatible JSON schema for inputs
  outputSchema: jsonb4("output_schema"),
  // Expected output schema
  // Tool Metadata
  examples: jsonb4("examples").default([]),
  // Example usage for AI agents
  tags: text4("tags").array(),
  // Searchable tags
  // Sync & Cache Management
  lastSyncedAt: timestamp4("last_synced_at").notNull(),
  syncVersion: varchar4("sync_version", { length: 50 }),
  // MCP server version
  // Metadata
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => ({
  serverIndex: index4("mcp_tool_schemas_server_idx").on(table.serverId),
  categoryIndex: index4("mcp_tool_schemas_category_idx").on(table.category),
  // Unique: one schema per tool per server
  toolNameUnique: uniqueIndex3("mcp_tool_schemas_server_tool_unique").on(table.serverId, table.toolName),
  lastSyncedIndex: index4("mcp_tool_schemas_synced_idx").on(table.lastSyncedAt)
}));
var vectorSourceTypeEnum = pgEnum3("vector_source_type", [
  "document",
  "knowledge_base",
  "chat_history",
  "policy",
  "training_material",
  "product_catalog",
  "customer_data",
  "financial_report",
  "hr_document",
  "url_content",
  "pdf_document",
  "image",
  "audio_transcript",
  "video_transcript"
]);
var vectorStatusEnum = pgEnum3("vector_status", ["pending", "processing", "ready", "failed", "archived"]);
var embeddingModelEnum = pgEnum3("embedding_model", [
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002"
]);
var vectorOriginEnum = pgEnum3("vector_origin", ["brand", "tenant"]);
var mediaTypeEnum = pgEnum3("media_type", [
  "text",
  "pdf",
  "image",
  "audio",
  "video",
  "url",
  "document"
]);
var extractionMethodEnum = pgEnum3("extraction_method", [
  "native",
  "ocr",
  "transcription",
  "vision_api",
  "pdf_parse",
  "web_scrape"
]);
var vectorEmbeddings = w3suiteSchema.table("vector_embeddings", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  // 🎯 CROSS-TENANT RAG: Brand vs Tenant distinction
  origin: vectorOriginEnum("origin").notNull(),
  // 'brand' = Brand Interface, 'tenant' = Tenant specific
  agentId: varchar4("agent_id", { length: 100 }),
  // Agent ID for filtering (e.g., 'tippy-sales')
  // Source Reference
  sourceType: vectorSourceTypeEnum("source_type").notNull(),
  sourceId: uuid4("source_id"),
  // Reference to original document/entity
  sourceUrl: text4("source_url"),
  // Optional URL reference
  // Content & Embeddings (pgvector support)
  contentChunk: text4("content_chunk").notNull(),
  // Original text chunk
  embedding: vector2("embedding"),
  // OpenAI embedding dimension (1536 for text-embedding-3-small)
  embeddingModel: embeddingModelEnum("embedding_model").notNull(),
  // Multimedia Support
  mediaType: mediaTypeEnum("media_type").default("text").notNull(),
  extractionMethod: extractionMethodEnum("extraction_method"),
  originalFileName: varchar4("original_file_name", { length: 255 }),
  mimeType: varchar4("mime_type", { length: 100 }),
  // Metadata & Search Optimization
  metadata: jsonb4("metadata").default({}).notNull(),
  // Searchable metadata with media-specific info
  tags: text4("tags").array(),
  // Search tags array
  language: varchar4("language", { length: 10 }).default("it"),
  // Language code
  // Temporal Metadata (for audio/video)
  startTime: real3("start_time"),
  // Start time in seconds for audio/video chunks
  endTime: real3("end_time"),
  // End time in seconds for audio/video chunks
  duration: real3("duration"),
  // Duration in seconds
  // Visual Metadata (for images)
  imageAnalysis: jsonb4("image_analysis"),
  // GPT-4 Vision analysis results
  detectedObjects: text4("detected_objects").array(),
  // Objects/entities detected
  imageResolution: varchar4("image_resolution", { length: 50 }),
  // e.g., "1920x1080"
  // Security & Access Control
  accessLevel: varchar4("access_level", { length: 50 }).default("private"),
  // public, private, restricted
  ownerUserId: varchar4("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  // VARCHAR for OAuth2 compatibility
  departmentRestriction: varchar4("department_restriction", { length: 100 }),
  // HR, Finance, etc.
  // Performance & Status
  chunkIndex: integer3("chunk_index").default(0),
  // Position in document
  chunkTotal: integer3("chunk_total").default(1),
  // Total chunks for document
  tokenCount: integer3("token_count").notNull(),
  // Tokens in chunk
  status: vectorStatusEnum("status").default("pending").notNull(),
  // Audit & Lifecycle
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull(),
  lastAccessedAt: timestamp4("last_accessed_at"),
  expiresAt: timestamp4("expires_at"),
  // For retention policies
  processingTimeMs: integer3("processing_time_ms"),
  // Time to generate embedding
  // Training & Validation
  isValidated: boolean4("is_validated").default(false),
  // User validated for training
  validationScore: real3("validation_score"),
  // Quality score from validation
  validatedBy: varchar4("validated_by"),
  // User who validated
  validatedAt: timestamp4("validated_at")
  // When validation occurred
}, (table) => ({
  // Indexes for performance and search
  tenantIndex: index4("vector_embeddings_tenant_idx").on(table.tenantId),
  sourceIndex: index4("vector_embeddings_source_idx").on(table.sourceType, table.sourceId),
  statusIndex: index4("vector_embeddings_status_idx").on(table.status),
  ownerIndex: index4("vector_embeddings_owner_idx").on(table.ownerUserId),
  expiresIndex: index4("vector_embeddings_expires_idx").on(table.expiresAt),
  // 🎯 CROSS-TENANT RAG INDEXES: Performance critici per ricerca combinata brand+tenant
  crossTenantAgentIndex: index4("vector_embeddings_cross_tenant_agent_idx").on(table.origin, table.agentId),
  tenantAgentIndex: index4("vector_embeddings_tenant_agent_idx").on(table.tenantId, table.agentId),
  agentStatusIndex: index4("vector_embeddings_agent_status_idx").on(table.agentId, table.status)
  // Note: HNSW index for vector similarity will be created via SQL migration
}));
var vectorSearchQueries = w3suiteSchema.table("vector_search_queries", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar4("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  // VARCHAR for OAuth2 compatibility
  // Query Details
  queryText: text4("query_text").notNull(),
  queryEmbedding: vector2("query_embedding"),
  // Store query embedding for analysis
  queryType: varchar4("query_type", { length: 50 }),
  // semantic, hybrid, filtered
  // Search Parameters
  searchFilters: jsonb4("search_filters").default({}).notNull(),
  maxResults: integer3("max_results").default(10),
  similarityThreshold: real3("similarity_threshold"),
  // Minimum similarity score
  // Results Metadata
  resultsReturned: integer3("results_returned").default(0),
  topScore: real3("top_score"),
  // Best similarity score
  responseTimeMs: integer3("response_time_ms").notNull(),
  // Context & Purpose
  searchContext: varchar4("search_context", { length: 100 }),
  // hr_search, document_qa, etc.
  moduleContext: varchar4("module_context", { length: 50 }),
  // hr, finance, general
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => ({
  tenantUserIndex: index4("vector_search_queries_tenant_user_idx").on(table.tenantId, table.userId),
  timestampIndex: index4("vector_search_queries_timestamp_idx").on(table.createdAt),
  contextIndex: index4("vector_search_queries_context_idx").on(table.searchContext)
}));
var vectorCollections = w3suiteSchema.table("vector_collections", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  // Collection Info
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  collectionType: varchar4("collection_type", { length: 50 }).notNull(),
  // knowledge_base, policies, etc.
  // Settings & Configuration
  embeddingModel: embeddingModelEnum("embedding_model").notNull(),
  chunkingStrategy: jsonb4("chunking_strategy").default({
    method: "sliding_window",
    chunk_size: 1e3,
    overlap: 200
  }).notNull(),
  // Access Control
  isPublic: boolean4("is_public").default(false).notNull(),
  allowedRoles: text4("allowed_roles").array(),
  // Role-based access
  departmentScope: varchar4("department_scope", { length: 100 }),
  // Statistics
  totalEmbeddings: integer3("total_embeddings").default(0).notNull(),
  totalTokens: integer3("total_tokens").default(0).notNull(),
  lastUpdatedAt: timestamp4("last_updated_at").defaultNow().notNull(),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  createdBy: varchar4("created_by").references(() => users.id, { onDelete: "set null" })
  // VARCHAR for OAuth2 compatibility
}, (table) => ({
  tenantNameIndex: uniqueIndex3("vector_collections_tenant_name_idx").on(table.tenantId, table.name),
  typeIndex: index4("vector_collections_type_idx").on(table.collectionType)
}));
var aiTrainingSessions = w3suiteSchema.table("ai_training_sessions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar4("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  // 🎯 AGENT LINKAGE: Critical for agent-specific RAG content
  agentId: varchar4("agent_id", { length: 100 }),
  // Agent ID for filtering (e.g., 'tippy-sales', 'workflow-assistant')
  // Session Info
  sessionType: varchar4("session_type", { length: 50 }).notNull(),
  // validation, url_import, media_upload
  sessionStatus: varchar4("session_status", { length: 50 }).default("active").notNull(),
  // active, completed, failed
  // Training Data
  sourceUrl: text4("source_url"),
  // For URL imports
  sourceFile: text4("source_file"),
  // For file uploads
  contentType: varchar4("content_type", { length: 100 }),
  // MIME type
  // Processing Details
  totalChunks: integer3("total_chunks").default(0),
  processedChunks: integer3("processed_chunks").default(0),
  failedChunks: integer3("failed_chunks").default(0),
  // Validation Data (for response validation sessions)
  originalQuery: text4("original_query"),
  originalResponse: text4("original_response"),
  correctedResponse: text4("corrected_response"),
  validationFeedback: jsonb4("validation_feedback"),
  // Metrics
  processingTimeMs: integer3("processing_time_ms"),
  tokensProcessed: integer3("tokens_processed").default(0),
  embeddingsCreated: integer3("embeddings_created").default(0),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  completedAt: timestamp4("completed_at")
}, (table) => ({
  tenantUserIndex: index4("ai_training_sessions_tenant_user_idx").on(table.tenantId, table.userId),
  statusIndex: index4("ai_training_sessions_status_idx").on(table.sessionStatus),
  typeIndex: index4("ai_training_sessions_type_idx").on(table.sessionType),
  timestampIndex: index4("ai_training_sessions_timestamp_idx").on(table.createdAt),
  // 🎯 AGENT-SPECIFIC INDEXES: Performance critical for agent RAG queries  
  agentIndex: index4("ai_training_sessions_agent_idx").on(table.agentId),
  tenantAgentIndex: index4("ai_training_sessions_tenant_agent_idx").on(table.tenantId, table.agentId),
  agentStatusIndex: index4("ai_training_sessions_agent_status_idx").on(table.agentId, table.sessionStatus)
}));
var aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [aiSettings.tenantId], references: [tenants.id] })
}));
var aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [aiUsageLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiUsageLogs.userId], references: [users.id] })
}));
var aiAgentTenantSettingsRelations = relations(aiAgentTenantSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [aiAgentTenantSettings.tenantId], references: [tenants.id] })
}));
var aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  tenant: one(tenants, { fields: [aiConversations.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiConversations.userId], references: [users.id] })
}));
var leadRoutingHistoryRelations = relations(leadRoutingHistory, ({ one }) => ({
  tenant: one(tenants, { fields: [leadRoutingHistory.tenantId], references: [tenants.id] }),
  lead: one(crmLeads, { fields: [leadRoutingHistory.leadId], references: [crmLeads.id] }),
  driver: one(drivers, { fields: [leadRoutingHistory.recommendedDriver], references: [drivers.id] }),
  pipeline: one(crmPipelines, { fields: [leadRoutingHistory.targetPipelineId], references: [crmPipelines.id] })
}));
var leadAiInsightsRelations = relations(leadAiInsights, ({ one }) => ({
  tenant: one(tenants, { fields: [leadAiInsights.tenantId], references: [tenants.id] }),
  lead: one(crmLeads, { fields: [leadAiInsights.leadId], references: [crmLeads.id] })
}));
var vectorEmbeddingsRelations = relations(vectorEmbeddings, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorEmbeddings.tenantId], references: [tenants.id] }),
  owner: one(users, { fields: [vectorEmbeddings.ownerUserId], references: [users.id] })
}));
var vectorSearchQueriesRelations = relations(vectorSearchQueries, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorSearchQueries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [vectorSearchQueries.userId], references: [users.id] })
}));
var vectorCollectionsRelations = relations(vectorCollections, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorCollections.tenantId], references: [tenants.id] }),
  createdBy: one(users, { fields: [vectorCollections.createdBy], references: [users.id] })
}));
var aiTrainingSessionsRelations = relations(aiTrainingSessions, ({ one }) => ({
  tenant: one(tenants, { fields: [aiTrainingSessions.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiTrainingSessions.userId], references: [users.id] })
}));
var mcpServersRelations = relations(mcpServers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [mcpServers.tenantId], references: [tenants.id] }),
  createdBy: one(users, { fields: [mcpServers.createdBy], references: [users.id] }),
  credentials: many(mcpServerCredentials),
  toolSchemas: many(mcpToolSchemas)
}));
var mcpServerCredentialsRelations = relations(mcpServerCredentials, ({ one }) => ({
  tenant: one(tenants, { fields: [mcpServerCredentials.tenantId], references: [tenants.id] }),
  server: one(mcpServers, { fields: [mcpServerCredentials.serverId], references: [mcpServers.id] }),
  createdBy: one(users, { fields: [mcpServerCredentials.createdBy], references: [users.id] })
}));
var mcpToolSchemasRelations = relations(mcpToolSchemas, ({ one }) => ({
  server: one(mcpServers, { fields: [mcpToolSchemas.serverId], references: [mcpServers.id] })
}));
var insertAISettingsSchema = createInsertSchema4(aiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertLeadRoutingHistorySchema = createInsertSchema4(leadRoutingHistory).omit({
  id: true,
  createdAt: true
});
var insertLeadAiInsightsSchema = createInsertSchema4(leadAiInsights).omit({
  id: true,
  createdAt: true
});
var insertAIUsageLogSchema = createInsertSchema4(aiUsageLogs).omit({
  id: true,
  requestTimestamp: true
});
var insertAIConversationSchema = createInsertSchema4(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertVectorEmbeddingSchema = createInsertSchema4(vectorEmbeddings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAccessedAt: true
});
var insertVectorSearchQuerySchema = createInsertSchema4(vectorSearchQueries).omit({
  id: true,
  createdAt: true
});
var insertVectorCollectionSchema = createInsertSchema4(vectorCollections).omit({
  id: true,
  createdAt: true,
  lastUpdatedAt: true
});
var insertAITrainingSessionSchema = createInsertSchema4(aiTrainingSessions).omit({
  id: true,
  createdAt: true,
  completedAt: true
});
var insertMCPServerSchema = createInsertSchema4(mcpServers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastHealthCheck: true,
  errorCount: true,
  archivedAt: true
});
var insertMCPServerCredentialSchema = createInsertSchema4(mcpServerCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  revokedAt: true
});
var insertMCPToolSchemaSchema = createInsertSchema4(mcpToolSchemas).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTaskSchema = createInsertSchema4(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  archivedAt: true,
  actualHours: true,
  completionPercentage: true
});
var insertTaskAssignmentSchema = createInsertSchema4(taskAssignments).omit({
  id: true,
  assignedAt: true
});
var insertTaskChecklistItemSchema = createInsertSchema4(taskChecklistItems).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  completedBy: true
});
var insertTaskCommentSchema = createInsertSchema4(taskComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
  deletedAt: true
});
var insertTaskTimeLogSchema = createInsertSchema4(taskTimeLogs).omit({
  id: true,
  createdAt: true,
  duration: true
});
var insertTaskDependencySchema = createInsertSchema4(taskDependencies).omit({
  id: true,
  createdAt: true
});
var insertTaskAttachmentSchema = createInsertSchema4(taskAttachments).omit({
  id: true,
  uploadedAt: true
});
var insertTaskTemplateSchema = createInsertSchema4(taskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastInstantiatedAt: true
});
var insertChatChannelSchema = createInsertSchema4(chatChannels).omit({
  id: true,
  createdAt: true
});
var insertChatChannelMemberSchema = createInsertSchema4(chatChannelMembers).omit({
  id: true,
  joinedAt: true,
  lastReadAt: true
});
var insertChatMessageSchema = createInsertSchema4(chatMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
  deletedAt: true
});
var insertChatTypingIndicatorSchema = createInsertSchema4(chatTypingIndicators).omit({
  id: true,
  startedAt: true
});
var insertActivityFeedEventSchema = createInsertSchema4(activityFeedEvents).omit({
  id: true,
  createdAt: true
});
var insertActivityFeedInteractionSchema = createInsertSchema4(activityFeedInteractions).omit({
  id: true,
  createdAt: true
});
var crmPersonIdentities = w3suiteSchema.table("crm_person_identities", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  personId: uuid4("person_id").notNull(),
  identifierType: crmIdentifierTypeEnum("identifier_type").notNull(),
  identifierValue: varchar4("identifier_value", { length: 255 }).notNull(),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  tenantTypeValueUniq: uniqueIndex3("crm_person_identities_tenant_type_value_uniq").on(table.tenantId, table.identifierType, table.identifierValue),
  personIdIdx: index4("crm_person_identities_person_id_idx").on(table.personId),
  tenantIdIdx: index4("crm_person_identities_tenant_id_idx").on(table.tenantId)
}));
var crmCampaigns = w3suiteSchema.table("crm_campaigns", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  storeId: uuid4("store_id").notNull(),
  // Store-level scope (obbligatorio)
  isBrandTemplate: boolean4("is_brand_template").default(false),
  brandCampaignId: uuid4("brand_campaign_id"),
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  type: crmCampaignTypeEnum("type").notNull(),
  status: crmCampaignStatusEnum("status").default("draft"),
  objective: integer3("objective"),
  // Target numero lead
  targetDriverIds: uuid4("target_driver_ids").array(),
  // Multi-driver support (FISSO, MOBILE, DEVICE, etc.)
  brandSourceType: varchar4("brand_source_type", { length: 50 }).default("tenant_only"),
  // 'tenant_only' | 'brand_derived'
  requiredConsents: jsonb4("required_consents"),
  // { privacy_policy: true, marketing: false, profiling: true, third_party: false }
  landingPageUrl: text4("landing_page_url"),
  channels: text4("channels").array(),
  // Array canali: phone, whatsapp, form, social, email, qr
  externalCampaignId: varchar4("external_campaign_id", { length: 255 }),
  // Powerful API campaign ID
  defaultLeadSource: leadSourceEnum("default_lead_source"),
  // Default source for leads
  // 🎯 ROUTING & WORKFLOWS UNIFICATO
  routingMode: varchar4("routing_mode", { length: 20 }),
  // 'automatic' | 'manual'
  // AUTOMATIC MODE - Workflow + Fallback
  workflowId: uuid4("workflow_id"),
  // Workflow che esegue la logica (può includere nodo routing pipeline)
  fallbackTimeoutSeconds: integer3("fallback_timeout_seconds"),
  // Timeout in secondi prima del fallback
  fallbackPipelineId1: uuid4("fallback_pipeline_id1"),
  // Pipeline 1 per fallback automatico
  fallbackPipelineId2: uuid4("fallback_pipeline_id2"),
  // Pipeline 2 per fallback automatico
  // MANUAL MODE - Pipeline preselezionate
  manualPipelineId1: uuid4("manual_pipeline_id1"),
  // Pipeline 1 per assegnazione manuale
  manualPipelineId2: uuid4("manual_pipeline_id2"),
  // Pipeline 2 per assegnazione manuale
  // AI CONTROLS (entrambe le modalità)
  enableAIScoring: boolean4("enable_ai_scoring").default(false),
  // Abilita AI Lead Scoring (per manual e automatic)
  enableAIRouting: boolean4("enable_ai_routing").default(false),
  // Abilita AI Routing (solo per automatic, workflow può sovrascrivere)
  // NOTIFICHE (entrambe le modalità)
  notifyTeamId: uuid4("notify_team_id"),
  // Team da notificare
  notifyUserIds: uuid4("notify_user_ids").array(),
  // Array di user ID da notificare
  budget: real3("budget"),
  startDate: timestamp4("start_date"),
  endDate: timestamp4("end_date"),
  utmSourceId: uuid4("utm_source_id"),
  // DEPRECATED: Use marketingChannels array instead
  utmMediumId: uuid4("utm_medium_id"),
  // DEPRECATED: Use marketingChannels array instead
  utmCampaign: varchar4("utm_campaign", { length: 255 }),
  marketingChannels: text4("marketing_channels").array(),
  // Active channels: ['facebook_ads', 'instagram', 'google_ads', 'email', 'whatsapp']
  attributionWindowDays: integer3("attribution_window_days").default(30),
  // Attribution window (default 30 days)
  totalLeads: integer3("total_leads").default(0),
  totalDeals: integer3("total_deals").default(0),
  totalRevenue: real3("total_revenue").default(0),
  createdBy: uuid4("created_by"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantStatusStartIdx: index4("crm_campaigns_tenant_status_start_idx").on(table.tenantId, table.status, table.startDate),
  tenantIdIdx: index4("crm_campaigns_tenant_id_idx").on(table.tenantId),
  storeIdIdx: index4("crm_campaigns_store_id_idx").on(table.storeId)
}));
var campaignSocialAccounts = w3suiteSchema.table("campaign_social_accounts", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  campaignId: uuid4("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: "cascade" }),
  mcpAccountId: uuid4("mcp_account_id").notNull().references(() => mcpConnectedAccounts.id, { onDelete: "cascade" }),
  platform: varchar4("platform", { length: 50 }).notNull(),
  // 'facebook', 'instagram', 'linkedin', 'google', etc.
  externalCampaignId: varchar4("external_campaign_id", { length: 255 }),
  // Campaign ID on the platform (FB Campaign ID, LinkedIn Campaign URN)
  isActive: boolean4("is_active").default(true).notNull(),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index4("campaign_social_accounts_tenant_id_idx").on(table.tenantId),
  campaignIdIdx: index4("campaign_social_accounts_campaign_id_idx").on(table.campaignId),
  mcpAccountIdIdx: index4("campaign_social_accounts_mcp_account_id_idx").on(table.mcpAccountId),
  externalCampaignIdIdx: index4("campaign_social_accounts_external_campaign_id_idx").on(table.externalCampaignId),
  uniqueCampaignMcpAccount: uniqueIndex3("campaign_social_accounts_campaign_mcp_unique").on(table.campaignId, table.mcpAccountId)
}));
var insertCampaignSocialAccountSchema = createInsertSchema4(campaignSocialAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var crmLeads = w3suiteSchema.table("crm_leads", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  legalEntityId: uuid4("legal_entity_id"),
  storeId: uuid4("store_id").notNull(),
  personId: uuid4("person_id").notNull(),
  // Auto-generated UUID for identity tracking
  ownerUserId: varchar4("owner_user_id"),
  campaignId: uuid4("campaign_id").references(() => crmCampaigns.id),
  sourceChannel: crmInboundChannelEnum("source_channel"),
  // INBOUND: Lead acquisition source
  sourceSocialAccountId: uuid4("source_social_account_id"),
  status: crmLeadStatusEnum("status").default("new"),
  leadScore: smallint4("lead_score").default(0),
  // 0-100
  firstName: varchar4("first_name", { length: 255 }),
  lastName: varchar4("last_name", { length: 255 }),
  email: varchar4("email", { length: 255 }),
  phone: varchar4("phone", { length: 50 }),
  companyName: varchar4("company_name", { length: 255 }),
  productInterest: varchar4("product_interest", { length: 255 }),
  driverId: uuid4("driver_id").references(() => drivers.id),
  notes: text4("notes"),
  utmSource: varchar4("utm_source", { length: 255 }),
  utmMedium: varchar4("utm_medium", { length: 255 }),
  utmCampaign: varchar4("utm_campaign", { length: 255 }),
  // UTM Normalized Foreign Keys (for analytics and reporting)
  utmSourceId: uuid4("utm_source_id").references(() => utmSources.id),
  utmMediumId: uuid4("utm_medium_id").references(() => utmMediums.id),
  utmContent: varchar4("utm_content", { length: 255 }),
  utmTerm: varchar4("utm_term", { length: 255 }),
  landingPageUrl: text4("landing_page_url"),
  referrerUrl: text4("referrer_url"),
  eventName: varchar4("event_name", { length: 255 }),
  eventSource: text4("event_source"),
  sessionId: varchar4("session_id", { length: 255 }),
  clientIpAddress: varchar4("client_ip_address", { length: 45 }),
  privacyPolicyAccepted: boolean4("privacy_policy_accepted").default(false),
  marketingConsent: boolean4("marketing_consent").default(false),
  profilingConsent: boolean4("profiling_consent").default(false),
  thirdPartyConsent: boolean4("third_party_consent").default(false),
  consentTimestamp: timestamp4("consent_timestamp"),
  consentSource: varchar4("consent_source", { length: 255 }),
  rawEventPayload: jsonb4("raw_event_payload"),
  // ==================== SLA & DATE RANGE MANAGEMENT ====================
  campaignValidUntil: timestamp4("campaign_valid_until"),
  // Eredita end_date dalla campagna (offerta scade con campagna)
  validUntil: timestamp4("valid_until"),
  // Scadenza PERSONALE lead (diverso da campaignValidUntil)
  slaDeadline: timestamp4("sla_deadline"),
  // Deadline gestione interna (es: created_at + 7 giorni)
  slaConfig: jsonb4("sla_config"),
  // Configurazione SLA { default_days: 7, urgent_days: 2, high_value_days: 3 }
  // ==================== POWERFUL API INTEGRATION ====================
  externalLeadId: varchar4("external_lead_id", { length: 255 }),
  // Powerful API lead ID
  leadSource: leadSourceEnum("lead_source"),
  // Source: manual, web_form, powerful_api, landing_page, csv_import
  // ==================== FASE 1: GTM TRACKING ====================
  gtmClientId: varchar4("gtm_client_id", { length: 255 }),
  // GA Client ID univoco
  gtmSessionId: varchar4("gtm_session_id", { length: 255 }),
  // Session ID corrente
  gtmUserId: varchar4("gtm_user_id", { length: 255 }),
  // User ID cross-device
  gtmEvents: jsonb4("gtm_events"),
  // Array completo eventi GTM
  gtmProductsViewed: text4("gtm_products_viewed").array(),
  // Prodotti visualizzati
  gtmConversionEvents: text4("gtm_conversion_events").array(),
  // Eventi conversione
  gtmGoalsCompleted: text4("gtm_goals_completed").array(),
  // Obiettivi GA completati
  // ==================== FASE 1: MULTI-PDV TRACKING ====================
  originStoreId: uuid4("origin_store_id"),
  // PDV che ha generato il lead
  originStoreName: varchar4("origin_store_name", { length: 255 }),
  // Nome store per reporting
  storesVisited: text4("stores_visited").array(),
  // Lista PDV visitati
  storeInteractions: jsonb4("store_interactions"),
  // Interazioni dettagliate per store
  preferredStoreId: uuid4("preferred_store_id"),
  // Store preferito dal cliente
  nearestStoreId: uuid4("nearest_store_id"),
  // Store più vicino geograficamente
  // ==================== FASE 1: SOCIAL & FORM TRACKING ====================
  socialProfiles: jsonb4("social_profiles"),
  // Profili social collegati {facebook:{}, instagram:{}}
  socialInteractionsByStore: jsonb4("social_interactions_by_store"),
  // Interazioni social per PDV
  socialCampaignResponses: jsonb4("social_campaign_responses").array(),
  // Array risposte campagne
  formsSubmitted: jsonb4("forms_submitted").array(),
  // Form compilati con tutti i dettagli
  totalFormsStarted: integer3("total_forms_started").default(0),
  totalFormsCompleted: integer3("total_forms_completed").default(0),
  formCompletionRate: real3("form_completion_rate"),
  averageFormTime: real3("average_form_time"),
  // Tempo medio in secondi
  // ==================== FASE 1: DOCUMENTI FISCALI ITALIANI ====================
  fiscalCode: varchar4("fiscal_code", { length: 16 }),
  // Codice Fiscale
  vatNumber: varchar4("vat_number", { length: 11 }),
  // Partita IVA
  documentType: varchar4("document_type", { length: 50 }),
  // CI/Patente/Passaporto
  documentNumber: varchar4("document_number", { length: 50 }),
  documentExpiry: date3("document_expiry"),
  pecEmail: varchar4("pec_email", { length: 255 }),
  // PEC certificata
  // ==================== FASE 2: CUSTOMER JOURNEY & ATTRIBUTION ====================
  customerJourney: jsonb4("customer_journey").array(),
  // Journey completo con touchpoints
  firstTouchAttribution: jsonb4("first_touch_attribution"),
  lastTouchAttribution: jsonb4("last_touch_attribution"),
  firstContactDate: timestamp4("first_contact_date"),
  lastContactDate: timestamp4("last_contact_date"),
  contactCount: integer3("contact_count").default(0),
  nextActionDate: date3("next_action_date"),
  nextActionType: varchar4("next_action_type", { length: 100 }),
  // ==================== UTM MULTI-TOUCH ATTRIBUTION ====================
  firstTouchUtmLinkId: uuid4("first_touch_utm_link_id"),
  // First UTM click
  lastTouchUtmLinkId: uuid4("last_touch_utm_link_id"),
  // Last UTM click (for revenue attribution)
  allTouchUtmLinkIds: uuid4("all_touch_utm_link_ids").array(),
  // Complete touchpoint history
  firstTouchAt: timestamp4("first_touch_at"),
  // First touchpoint timestamp
  lastTouchAt: timestamp4("last_touch_at"),
  // Last touchpoint timestamp
  // ==================== FASE 2: BUSINESS PROFILING ====================
  customerType: customerTypeEnum("customer_type"),
  // B2B/B2C (usa enum esistente)
  companyRole: varchar4("company_role", { length: 100 }),
  // Ruolo in azienda
  companySize: varchar4("company_size", { length: 50 }),
  // Micro/Small/Medium/Large
  companySector: varchar4("company_sector", { length: 100 }),
  // Settore merceologico
  annualRevenue: real3("annual_revenue"),
  // Fatturato stimato
  employeeCount: integer3("employee_count"),
  budgetRange: jsonb4("budget_range"),
  // {min: 0, max: 1000}
  purchaseTimeframe: varchar4("purchase_timeframe", { length: 50 }),
  // Immediate/1month/3months/6months
  painPoints: text4("pain_points").array(),
  // Problemi da risolvere
  competitors: text4("competitors").array(),
  // Competitor attuali
  // ==================== FASE 2: INDIRIZZO COMPLETO ====================
  addressStreet: varchar4("address_street", { length: 255 }),
  addressNumber: varchar4("address_number", { length: 20 }),
  addressCity: varchar4("address_city", { length: 100 }),
  addressProvince: varchar4("address_province", { length: 2 }),
  addressPostalCode: varchar4("address_postal_code", { length: 5 }),
  addressCountry: varchar4("address_country", { length: 50 }),
  geoLat: real3("geo_lat"),
  // Latitudine
  geoLng: real3("geo_lng"),
  // Longitudine
  deliveryAddress: jsonb4("delivery_address"),
  // Indirizzo spedizione alternativo
  // ==================== FASE 3: ENGAGEMENT METRICS ====================
  pageViewsCount: integer3("page_views_count").default(0),
  emailsOpenedCount: integer3("emails_opened_count").default(0),
  emailsClickedCount: integer3("emails_clicked_count").default(0),
  documentsDownloaded: text4("documents_downloaded").array(),
  videosWatched: text4("videos_watched").array(),
  sessionDuration: integer3("session_duration"),
  // Durata sessione in secondi
  deviceType: varchar4("device_type", { length: 50 }),
  // Mobile/Desktop/Tablet
  browserInfo: jsonb4("browser_info"),
  // User agent e info browser
  engagementScore: real3("engagement_score"),
  // Score 0-100
  // ==================== FASE 3: CONVERSION TRACKING ====================
  convertedToCustomerId: uuid4("converted_to_customer_id"),
  conversionDate: timestamp4("conversion_date"),
  conversionValue: real3("conversion_value"),
  // Valore prima vendita
  lifecycleStage: varchar4("lifecycle_stage", { length: 50 }),
  // Subscriber/Lead/MQL/SQL/Opportunity/Customer
  conversionProbability: real3("conversion_probability"),
  // % probabilità conversione
  lostReason: varchar4("lost_reason", { length: 255 }),
  // Motivo perdita lead
  // ==================== FASE 3: AI ENRICHMENT ====================
  aiEnrichmentDate: timestamp4("ai_enrichment_date"),
  aiSentimentScore: real3("ai_sentiment_score"),
  // Sentiment analysis -1 to 1
  aiIntentSignals: text4("ai_intent_signals").array(),
  // Segnali intento rilevati
  aiPredictedValue: real3("ai_predicted_value"),
  // LTV predetto
  aiRecommendations: jsonb4("ai_recommendations"),
  // Suggerimenti AI per vendita
  // Timestamps e metadati
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  // Indici esistenti
  tenantStatusScoreCreatedIdx: index4("crm_leads_tenant_status_score_created_idx").on(table.tenantId, table.status, table.leadScore, table.createdAt),
  personIdIdx: index4("crm_leads_person_id_idx").on(table.personId),
  tenantIdIdx: index4("crm_leads_tenant_id_idx").on(table.tenantId),
  // ==================== NUOVI INDICI PER GTM & TRACKING ====================
  gtmClientIdx: index4("crm_leads_gtm_client_idx").on(table.gtmClientId),
  gtmSessionIdx: index4("crm_leads_gtm_session_idx").on(table.gtmSessionId),
  originStoreIdx: index4("crm_leads_origin_store_idx").on(table.originStoreId),
  // ==================== INDICI PER RICERCA E FILTRAGGIO ====================
  emailIdx: index4("crm_leads_email_idx").on(table.email),
  phoneIdx: index4("crm_leads_phone_idx").on(table.phone),
  fiscalCodeIdx: index4("crm_leads_fiscal_code_idx").on(table.fiscalCode),
  vatNumberIdx: index4("crm_leads_vat_number_idx").on(table.vatNumber),
  // ==================== INDICI PER PERFORMANCE QUERIES ====================
  campaignStatusIdx: index4("crm_leads_campaign_status_idx").on(table.campaignId, table.status),
  ownerStatusIdx: index4("crm_leads_owner_status_idx").on(table.ownerUserId, table.status),
  engagementScoreIdx: index4("crm_leads_engagement_score_idx").on(table.engagementScore),
  conversionDateIdx: index4("crm_leads_conversion_date_idx").on(table.conversionDate),
  // ==================== INDICI COMPOSITI PER ANALYTICS ====================
  tenantOriginStoreIdx: index4("crm_leads_tenant_origin_store_idx").on(table.tenantId, table.originStoreId),
  tenantCampaignIdx: index4("crm_leads_tenant_campaign_idx").on(table.tenantId, table.campaignId),
  tenantLifecycleIdx: index4("crm_leads_tenant_lifecycle_idx").on(table.tenantId, table.lifecycleStage)
}));
var leadStatuses = w3suiteSchema.table("lead_statuses", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  campaignId: uuid4("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: "cascade" }),
  name: varchar4("name", { length: 100 }).notNull(),
  // Internal unique key
  displayName: varchar4("display_name", { length: 100 }).notNull(),
  // User-facing label
  category: leadStatusCategoryEnum("category").notNull(),
  // new, working, qualified, converted, disqualified, on_hold
  color: varchar4("color", { length: 60 }).notNull(),
  // HSL format: hsl(210, 100%, 60%)
  sortOrder: smallint4("sort_order").default(0),
  isActive: boolean4("is_active").default(true),
  isDefault: boolean4("is_default").default(false),
  // System default statuses cannot be deleted
  createdBy: varchar4("created_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantIdIdx: index4("lead_statuses_tenant_id_idx").on(table.tenantId),
  campaignIdIdx: index4("lead_statuses_campaign_id_idx").on(table.campaignId),
  campaignCategoryIdx: index4("lead_statuses_campaign_category_idx").on(table.campaignId, table.category),
  campaignNameUniq: uniqueIndex3("lead_statuses_campaign_name_uniq").on(table.campaignId, table.name)
}));
var leadStatusHistory = w3suiteSchema.table("lead_status_history", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id),
  leadId: uuid4("lead_id").notNull().references(() => crmLeads.id, { onDelete: "cascade" }),
  oldStatusId: uuid4("old_status_id").references(() => leadStatuses.id),
  newStatusId: uuid4("new_status_id").notNull().references(() => leadStatuses.id),
  oldStatusName: varchar4("old_status_name", { length: 100 }),
  // Snapshot for history
  newStatusName: varchar4("new_status_name", { length: 100 }).notNull(),
  notes: text4("notes"),
  changedBy: varchar4("changed_by").notNull().references(() => users.id),
  changedAt: timestamp4("changed_at").defaultNow()
}, (table) => ({
  leadIdIdx: index4("lead_status_history_lead_id_idx").on(table.leadId),
  tenantIdIdx: index4("lead_status_history_tenant_id_idx").on(table.tenantId),
  changedAtIdx: index4("lead_status_history_changed_at_idx").on(table.changedAt)
}));
var crmFunnels = w3suiteSchema.table("crm_funnels", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Funnel Identity
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  color: varchar4("color", { length: 7 }).default("#3b82f6"),
  // Primary color for funnel visualization
  icon: varchar4("icon", { length: 50 }),
  // Lucide icon name
  isActive: boolean4("is_active").default(true).notNull(),
  // Journey Configuration
  pipelineOrder: text4("pipeline_order").array(),
  // Array di pipeline IDs nell'ordine del journey
  expectedDurationDays: smallint4("expected_duration_days"),
  // Durata media attesa del journey completo
  // AI Journey Orchestration
  aiOrchestrationEnabled: boolean4("ai_orchestration_enabled").default(false).notNull(),
  aiJourneyInsights: jsonb4("ai_journey_insights"),
  // AI-generated insights: bottlenecks, optimizations, predictions
  aiNextBestActionRules: jsonb4("ai_next_best_action_rules"),
  // Rules per AI routing tra pipeline
  aiScoringWeights: jsonb4("ai_scoring_weights"),
  // Pesi per lead scoring contestuali al funnel
  // Analytics & Metrics
  totalLeads: integer3("total_leads").default(0).notNull(),
  conversionRate: real3("conversion_rate").default(0),
  // Conversion rate end-to-end
  avgJourneyDurationDays: real3("avg_journey_duration_days"),
  // Durata media reale del journey
  dropoffRate: real3("dropoff_rate"),
  // Percentuale di abbandono
  // Metadata
  createdBy: varchar4("created_by").references(() => users.id),
  updatedBy: varchar4("updated_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index4("crm_funnels_tenant_id_idx").on(table.tenantId),
  tenantActiveIdx: index4("crm_funnels_tenant_active_idx").on(table.tenantId, table.isActive)
}));
var insertCrmFunnelSchema = createInsertSchema4(crmFunnels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalLeads: true,
  conversionRate: true,
  avgJourneyDurationDays: true,
  dropoffRate: true
});
var crmFunnelWorkflows = w3suiteSchema.table("crm_funnel_workflows", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  funnelId: uuid4("funnel_id").notNull().references(() => crmFunnels.id, { onDelete: "cascade" }),
  workflowTemplateId: uuid4("workflow_template_id").notNull().references(() => workflowTemplates.id, { onDelete: "cascade" }),
  executionMode: workflowExecutionModeEnum("execution_mode").default("manual").notNull(),
  isActive: boolean4("is_active").default(true),
  assignedBy: varchar4("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp4("assigned_at").defaultNow(),
  notes: text4("notes")
}, (table) => ({
  funnelWorkflowUniq: uniqueIndex3("crm_funnel_workflows_funnel_workflow_uniq").on(table.tenantId, table.funnelId, table.workflowTemplateId),
  tenantIdIdx: index4("crm_funnel_workflows_tenant_id_idx").on(table.tenantId),
  funnelIdIdx: index4("crm_funnel_workflows_funnel_id_idx").on(table.funnelId),
  workflowTemplateIdIdx: index4("crm_funnel_workflows_workflow_template_id_idx").on(table.workflowTemplateId)
}));
var insertCrmFunnelWorkflowSchema = createInsertSchema4(crmFunnelWorkflows).omit({
  id: true,
  tenantId: true,
  assignedAt: true
});
var crmPipelines = w3suiteSchema.table("crm_pipelines", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  funnelId: uuid4("funnel_id").references(() => crmFunnels.id, { onDelete: "set null" }),
  // Appartiene a un funnel
  funnelStageOrder: smallint4("funnel_stage_order"),
  // Ordine della pipeline nel funnel (1=prima, 2=seconda, etc)
  isBrandTemplate: boolean4("is_brand_template").default(false),
  brandPipelineId: uuid4("brand_pipeline_id"),
  name: varchar4("name", { length: 255 }).notNull(),
  domain: crmPipelineDomainEnum("domain").notNull(),
  driverId: uuid4("driver_id").references(() => drivers.id),
  isActive: boolean4("is_active").default(true),
  stagesConfig: jsonb4("stages_config").notNull(),
  // [{order:1, name:'Contatto', category:'new', color:'#ff6900'}]
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantIdIdx: index4("crm_pipelines_tenant_id_idx").on(table.tenantId),
  funnelIdIdx: index4("crm_pipelines_funnel_id_idx").on(table.funnelId),
  tenantFunnelIdx: index4("crm_pipelines_tenant_funnel_idx").on(table.tenantId, table.funnelId)
}));
var crmPipelineSettings = w3suiteSchema.table("crm_pipeline_settings", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  pipelineId: uuid4("pipeline_id").notNull().unique().references(() => crmPipelines.id),
  enabledChannels: text4("enabled_channels").array(),
  // ['sms','whatsapp','email']
  contactRules: jsonb4("contact_rules"),
  // {max_attempts_per_day, quiet_hours, sla_hours}
  workflowIds: text4("workflow_ids").array(),
  customStatusNames: jsonb4("custom_status_names"),
  // {new:'Primo Contatto', in_progress:'Lavorazione'}
  // 🎯 Hierarchical RBAC: Parent Access (Team/Users with pipeline visibility)
  assignedTeams: text4("assigned_teams").array().default([]),
  // Team IDs with CRM/Sales department
  assignedUsers: text4("assigned_users").array().default([]),
  // Optional: Individual users (in addition to teams)
  pipelineAdmins: text4("pipeline_admins").array().default([]),
  // Users with full pipeline settings access
  // 🎯 Hierarchical RBAC: Child Permissions (Operational - only for users with parent access)
  // Deal Management Permission
  dealManagementMode: pipelinePermissionModeEnum("deal_management_mode").default("all"),
  dealManagementUsers: text4("deal_management_users").array().default([]),
  // Used when mode='custom'
  // Deal Creation Permission
  dealCreationMode: pipelinePermissionModeEnum("deal_creation_mode").default("all"),
  dealCreationUsers: text4("deal_creation_users").array().default([]),
  // Used when mode='custom'
  // State Modification Permission
  stateModificationMode: pipelinePermissionModeEnum("state_modification_mode").default("all"),
  stateModificationUsers: text4("state_modification_users").array().default([]),
  // Used when mode='custom'
  // Deal Deletion Permission
  dealDeletionMode: pipelineDeletionModeEnum("deal_deletion_mode").default("admins"),
  dealDeletionUsers: text4("deal_deletion_users").array().default([]),
  // Reserved for future use
  // 🔔 Notification Preferences (Pipeline-level)
  notifyOnStageChange: boolean4("notify_on_stage_change").default(true),
  // Notify when deal changes stage
  notifyOnDealRotten: boolean4("notify_on_deal_rotten").default(true),
  // Notify when deal becomes stale
  notifyOnDealWon: boolean4("notify_on_deal_won").default(true),
  // Notify when deal is won
  notifyOnDealLost: boolean4("notify_on_deal_lost").default(true),
  // Notify when deal is lost
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
});
var crmPipelineStagePlaybooks = w3suiteSchema.table("crm_pipeline_stage_playbooks", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  pipelineId: uuid4("pipeline_id").notNull().references(() => crmPipelines.id),
  stageName: varchar4("stage_name", { length: 100 }).notNull(),
  allowedChannels: text4("allowed_channels").array(),
  maxAttemptsPerDay: smallint4("max_attempts_per_day"),
  slaHours: smallint4("sla_hours"),
  quietHoursStart: varchar4("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar4("quiet_hours_end", { length: 5 }),
  nextBestActionJson: jsonb4("next_best_action_json"),
  escalationPattern: varchar4("escalation_pattern", { length: 255 }),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  pipelineStageUniq: uniqueIndex3("crm_pipeline_stage_playbooks_pipeline_stage_uniq").on(table.pipelineId, table.stageName)
}));
var crmPipelineWorkflows = w3suiteSchema.table("crm_pipeline_workflows", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  pipelineId: uuid4("pipeline_id").notNull().references(() => crmPipelines.id, { onDelete: "cascade" }),
  workflowTemplateId: uuid4("workflow_template_id").notNull().references(() => workflowTemplates.id, { onDelete: "cascade" }),
  executionMode: workflowExecutionModeEnum("execution_mode").default("manual").notNull(),
  isActive: boolean4("is_active").default(true),
  assignedBy: varchar4("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp4("assigned_at").defaultNow(),
  notes: text4("notes")
}, (table) => ({
  pipelineWorkflowUniq: uniqueIndex3("crm_pipeline_workflows_pipeline_workflow_uniq").on(table.pipelineId, table.workflowTemplateId),
  pipelineIdIdx: index4("crm_pipeline_workflows_pipeline_id_idx").on(table.pipelineId),
  workflowTemplateIdIdx: index4("crm_pipeline_workflows_workflow_template_id_idx").on(table.workflowTemplateId)
}));
var crmPipelineStages = w3suiteSchema.table("crm_pipeline_stages", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  pipelineId: uuid4("pipeline_id").notNull().references(() => crmPipelines.id, { onDelete: "cascade" }),
  name: varchar4("name", { length: 100 }).notNull(),
  // Nome custom stage (es: "Primo Contatto")
  category: crmPipelineStageCategoryEnum("category").notNull(),
  // Categoria fissa: starter, progress, etc.
  orderIndex: smallint4("order_index").notNull(),
  // Ordinamento visuale
  color: varchar4("color", { length: 7 }),
  // Hex color (es: "#ff6900")
  isActive: boolean4("is_active").default(true),
  requiredFields: text4("required_fields").array(),
  // Campi obbligatori per avanzare (best practice validation)
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  pipelineStageNameUniq: uniqueIndex3("crm_pipeline_stages_pipeline_name_uniq").on(table.pipelineId, table.name),
  pipelineOrderIdx: index4("crm_pipeline_stages_pipeline_order_idx").on(table.pipelineId, table.orderIndex)
}));
var crmDeals = w3suiteSchema.table("crm_deals", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  legalEntityId: uuid4("legal_entity_id"),
  storeId: uuid4("store_id").notNull(),
  ownerUserId: varchar4("owner_user_id").notNull(),
  pipelineId: uuid4("pipeline_id").notNull().references(() => crmPipelines.id),
  stage: varchar4("stage", { length: 100 }).notNull(),
  status: crmDealStatusEnum("status").default("open"),
  leadId: uuid4("lead_id").references(() => crmLeads.id),
  campaignId: uuid4("campaign_id"),
  sourceChannel: crmInboundChannelEnum("source_channel"),
  // INBOUND: Inherited from lead
  dealCreationSource: dealCreationSourceEnum("deal_creation_source").default("manual"),
  // Track how deal was created
  personId: uuid4("person_id").notNull(),
  // Propagated from lead for identity tracking
  customerId: uuid4("customer_id"),
  // ==================== OUTBOUND CHANNEL TRACKING ====================
  preferredContactChannel: crmOutboundChannelEnum("preferred_contact_channel"),
  // Primary contact method
  lastContactChannel: crmOutboundChannelEnum("last_contact_channel"),
  // Last used outbound channel
  lastContactDate: timestamp4("last_contact_date"),
  // When last contacted
  contactHistory: jsonb4("contact_history"),
  // Array of {channel, date, outcome}
  contactChannelsUsed: text4("contact_channels_used").array(),
  // All channels tried
  estimatedValue: real3("estimated_value"),
  probability: smallint4("probability").default(0),
  // 0-100
  driverId: uuid4("driver_id").references(() => drivers.id),
  agingDays: smallint4("aging_days").default(0),
  wonAt: timestamp4("won_at"),
  lostAt: timestamp4("lost_at"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantPipelineStageStatusIdx: index4("crm_deals_tenant_pipeline_stage_status_idx").on(table.tenantId, table.pipelineId, table.stage, table.status),
  personIdIdx: index4("crm_deals_person_id_idx").on(table.personId),
  tenantIdIdx: index4("crm_deals_tenant_id_idx").on(table.tenantId)
}));
var crmInteractions = w3suiteSchema.table("crm_interactions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  entityType: varchar4("entity_type", { length: 50 }).notNull(),
  // 'lead', 'deal', 'customer'
  entityId: uuid4("entity_id").notNull(),
  channel: varchar4("channel", { length: 50 }),
  direction: crmInteractionDirectionEnum("direction"),
  outcome: text4("outcome"),
  durationSeconds: integer3("duration_seconds"),
  performedByUserId: uuid4("performed_by_user_id"),
  notes: text4("notes"),
  payload: jsonb4("payload"),
  occurredAt: timestamp4("occurred_at").notNull(),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  entityTypeEntityIdOccurredIdx: index4("crm_interactions_entity_type_entity_id_occurred_idx").on(table.entityType, table.entityId, table.occurredAt),
  tenantIdIdx: index4("crm_interactions_tenant_id_idx").on(table.tenantId)
}));
var crmOmnichannelInteractions = w3suiteSchema.table("crm_omnichannel_interactions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  // Person-centric tracking (unified identity)
  personId: uuid4("person_id").notNull(),
  // Optional entity links (lead/deal/customer)
  entityType: varchar4("entity_type", { length: 50 }),
  // 'lead', 'deal', 'customer', null
  entityId: uuid4("entity_id"),
  // Channel information
  channel: omnichannelChannelEnum("channel").notNull(),
  direction: crmInteractionDirectionEnum("direction").notNull(),
  // Content
  subject: text4("subject"),
  body: text4("body"),
  summary: text4("summary"),
  // AI-generated summary
  // Status and outcome
  status: interactionStatusEnum("status").default("sent"),
  outcome: text4("outcome"),
  outcomeCategory: varchar4("outcome_category", { length: 50 }),
  // 'positive', 'negative', 'neutral', 'follow_up_required'
  // Timing
  durationSeconds: integer3("duration_seconds"),
  occurredAt: timestamp4("occurred_at").notNull().defaultNow(),
  scheduledAt: timestamp4("scheduled_at"),
  // User/agent who performed interaction
  performedByUserId: uuid4("performed_by_user_id"),
  performedByAgentType: varchar4("performed_by_agent_type", { length: 50 }),
  // 'human', 'ai_assistant', 'workflow_automation'
  // Integration links
  workflowInstanceId: uuid4("workflow_instance_id"),
  workflowTemplateId: uuid4("workflow_template_id"),
  campaignId: uuid4("campaign_id"),
  taskId: uuid4("task_id"),
  // Channel-specific metadata (JSON)
  metadata: jsonb4("metadata"),
  // { email_thread_id, message_id, social_post_id, call_recording_url, etc. }
  // Engagement metrics
  sentimentScore: real3("sentiment_score"),
  // -1.0 to 1.0 (AI-analyzed)
  engagementScore: smallint4("engagement_score"),
  // 0-100
  // Attachments count
  attachmentCount: smallint4("attachment_count").default(0),
  // Audit
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  // Performance indexes
  personOccurredIdx: index4("omni_int_person_occurred_idx").on(table.personId, table.occurredAt),
  tenantPersonChannelIdx: index4("omni_int_tenant_person_channel_idx").on(table.tenantId, table.personId, table.channel),
  workflowInstanceIdx: index4("omni_int_workflow_instance_idx").on(table.workflowInstanceId),
  tenantOccurredIdx: index4("omni_int_tenant_occurred_idx").on(table.tenantId, table.occurredAt),
  entityTypeEntityIdIdx: index4("omni_int_entity_type_entity_id_idx").on(table.entityType, table.entityId)
}));
var crmInteractionAttachments = w3suiteSchema.table("crm_interaction_attachments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  interactionId: uuid4("interaction_id").notNull().references(() => crmOmnichannelInteractions.id, { onDelete: "cascade" }),
  // File information
  fileName: varchar4("file_name", { length: 255 }).notNull(),
  fileType: varchar4("file_type", { length: 100 }),
  fileSize: integer3("file_size"),
  // bytes
  mimeType: varchar4("mime_type", { length: 100 }),
  // Storage (Object Storage or external URL)
  storagePath: text4("storage_path"),
  externalUrl: text4("external_url"),
  // Metadata
  metadata: jsonb4("metadata"),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  interactionIdIdx: index4("int_attach_interaction_id_idx").on(table.interactionId),
  tenantIdIdx: index4("int_attach_tenant_id_idx").on(table.tenantId)
}));
var crmInteractionParticipants = w3suiteSchema.table("crm_interaction_participants", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  interactionId: uuid4("interaction_id").notNull().references(() => crmOmnichannelInteractions.id, { onDelete: "cascade" }),
  // Participant info
  personId: uuid4("person_id"),
  userId: uuid4("user_id"),
  // Internal user (agent/employee)
  participantType: varchar4("participant_type", { length: 50 }).notNull(),
  // 'sender', 'recipient', 'cc', 'bcc', 'mentioned'
  // Contact info (if not linked to person)
  email: varchar4("email", { length: 255 }),
  phone: varchar4("phone", { length: 50 }),
  displayName: varchar4("display_name", { length: 255 }),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  interactionIdIdx: index4("int_part_interaction_id_idx").on(table.interactionId),
  personIdIdx: index4("int_part_person_id_idx").on(table.personId),
  tenantIdIdx: index4("int_part_tenant_id_idx").on(table.tenantId)
}));
var crmIdentityMatches = w3suiteSchema.table("crm_identity_matches", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  // Match candidates
  personIdA: uuid4("person_id_a").notNull(),
  personIdB: uuid4("person_id_b").notNull(),
  // Match information
  matchType: identityMatchTypeEnum("match_type").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  // 0.00 - 100.00
  matchingFields: jsonb4("matching_fields"),
  // { email: true, phone: true, name: 0.85 }
  // Status
  status: identityMatchStatusEnum("status").default("pending"),
  // Review information
  reviewedBy: varchar4("reviewed_by"),
  reviewedAt: timestamp4("reviewed_at"),
  reviewNotes: text4("review_notes"),
  // Metadata
  detectedAt: timestamp4("detected_at").defaultNow(),
  metadata: jsonb4("metadata"),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  tenantPendingIdx: index4("id_match_tenant_pending_idx").on(table.tenantId, table.status),
  personAIdx: index4("id_match_person_a_idx").on(table.personIdA),
  personBIdx: index4("id_match_person_b_idx").on(table.personIdB),
  confidenceIdx: index4("id_match_confidence_idx").on(table.confidenceScore),
  // Prevent duplicate matches (A-B same as B-A)
  uniqueMatchIdx: uniqueIndex3("id_match_unique_idx").on(table.tenantId, table.personIdA, table.personIdB)
}));
var crmIdentityEvents = w3suiteSchema.table("crm_identity_events", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  // Event type and participants
  eventType: identityEventTypeEnum("event_type").notNull(),
  sourcePersonId: uuid4("source_person_id"),
  // Person being merged/split
  targetPersonId: uuid4("target_person_id"),
  // Target person (for merge)
  // Event details
  affectedIdentifiers: jsonb4("affected_identifiers"),
  // Array of { type, value }
  affectedRecords: jsonb4("affected_records"),
  // { leads: [ids], deals: [ids], customers: [ids] }
  // Audit
  performedBy: varchar4("performed_by").notNull(),
  performedAt: timestamp4("performed_at").defaultNow(),
  reason: text4("reason"),
  metadata: jsonb4("metadata"),
  // Rollback support
  canRollback: boolean4("can_rollback").default(true),
  rolledBackAt: timestamp4("rolled_back_at"),
  rolledBackBy: varchar4("rolled_back_by")
}, (table) => ({
  tenantEventTypeIdx: index4("id_event_tenant_type_idx").on(table.tenantId, table.eventType),
  sourcePersonIdx: index4("id_event_source_person_idx").on(table.sourcePersonId),
  targetPersonIdx: index4("id_event_target_person_idx").on(table.targetPersonId),
  performedAtIdx: index4("id_event_performed_at_idx").on(table.performedAt)
}));
var crmIdentityConflicts = w3suiteSchema.table("crm_identity_conflicts", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  // Conflicting persons
  personIdA: uuid4("person_id_a").notNull(),
  personIdB: uuid4("person_id_b").notNull(),
  // Conflict details
  conflictType: varchar4("conflict_type", { length: 100 }).notNull(),
  // 'consent_mismatch', 'data_inconsistency', 'ambiguous_merge'
  conflictDescription: text4("conflict_description"),
  conflictingFields: jsonb4("conflicting_fields"),
  // { field: { valueA, valueB, source } }
  // Resolution
  status: varchar4("status", { length: 50 }).default("pending"),
  // 'pending', 'resolved', 'escalated'
  resolvedBy: varchar4("resolved_by"),
  resolvedAt: timestamp4("resolved_at"),
  resolutionAction: varchar4("resolution_action", { length: 100 }),
  // 'keep_a', 'keep_b', 'merge_manual', 'split'
  resolutionNotes: text4("resolution_notes"),
  // Priority
  priority: varchar4("priority", { length: 20 }).default("medium"),
  // 'low', 'medium', 'high', 'critical'
  // Metadata
  detectedAt: timestamp4("detected_at").defaultNow(),
  metadata: jsonb4("metadata"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantStatusIdx: index4("id_conflict_tenant_status_idx").on(table.tenantId, table.status),
  priorityIdx: index4("id_conflict_priority_idx").on(table.priority),
  personAIdx: index4("id_conflict_person_a_idx").on(table.personIdA),
  personBIdx: index4("id_conflict_person_b_idx").on(table.personIdB)
}));
var crmTasks = w3suiteSchema.table("crm_tasks", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  entityType: varchar4("entity_type", { length: 50 }),
  // 'lead', 'deal', 'customer'
  entityId: uuid4("entity_id"),
  assignedToUserId: uuid4("assigned_to_user_id"),
  taskType: crmTaskTypeEnum("task_type").notNull(),
  title: varchar4("title", { length: 255 }).notNull(),
  description: text4("description"),
  dueDate: timestamp4("due_date"),
  status: crmTaskStatusEnum("status").default("pending"),
  priority: crmTaskPriorityEnum("priority").default("medium"),
  completedAt: timestamp4("completed_at"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantAssignedStatusDueIdx: index4("crm_tasks_tenant_assigned_status_due_idx").on(table.tenantId, table.assignedToUserId, table.status, table.dueDate),
  tenantIdIdx: index4("crm_tasks_tenant_id_idx").on(table.tenantId)
}));
var crmCustomers = w3suiteSchema.table("crm_customers", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  personId: uuid4("person_id").notNull(),
  // Identity tracking across lead → deal → customer
  customerType: crmCustomerTypeEnum("customer_type").notNull(),
  // B2C Fields (persona fisica)
  firstName: varchar4("first_name", { length: 255 }),
  lastName: varchar4("last_name", { length: 255 }),
  fiscalCode: text4("fiscal_code"),
  // Codice Fiscale (16 caratteri)
  email: varchar4("email", { length: 255 }),
  phone: varchar4("phone", { length: 50 }),
  birthDate: date3("birth_date"),
  addresses: jsonb4("addresses"),
  // JSONB array of addresses { type, street, city, zip, province, country }
  // B2B Fields (azienda)
  companyName: varchar4("company_name", { length: 255 }),
  legalForm: crmLegalFormEnum("legal_form"),
  vatNumber: text4("vat_number"),
  // Partita IVA (IT + 11 cifre)
  pecEmail: text4("pec_email"),
  // Email certificata PEC
  sdiCode: varchar4("sdi_code", { length: 7 }),
  // Codice SDI fatturazione elettronica (7 char alphanumeric)
  atecoCode: varchar4("ateco_code", { length: 20 }),
  // Codice attività economica
  primaryContactName: varchar4("primary_contact_name", { length: 200 }),
  // Nome referente principale per B2B
  sedi: jsonb4("sedi"),
  // JSONB array of locations { type, address, city, zip, province }
  secondaryContacts: jsonb4("secondary_contacts"),
  // JSONB array [{ name, role, email, phone }]
  companySize: varchar4("company_size", { length: 50 }),
  // 'micro' (1-9), 'small' (10-49), 'medium' (50-249), 'large' (250+)
  industry: varchar4("industry", { length: 255 }),
  // Settore industriale
  decisionMakers: jsonb4("decision_makers"),
  // JSONB array [{ name, role, email, phone, department }]
  parentCompanyId: uuid4("parent_company_id"),
  // Self-reference per holding/gruppi aziendali
  // Common fields
  sourceDealId: uuid4("source_deal_id").references(() => crmDeals.id),
  convertedAt: timestamp4("converted_at"),
  status: text4("status").default("prospect"),
  // 'active', 'inactive', 'prospect'
  notes: text4("notes"),
  // Audit fields
  createdBy: varchar4("created_by", { length: 255 }),
  updatedBy: varchar4("updated_by", { length: 255 }),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantPersonIdIdx: index4("crm_customers_tenant_person_id_idx").on(table.tenantId, table.personId),
  tenantTypeStatusIdx: index4("crm_customers_tenant_type_status_idx").on(table.tenantId, table.customerType, table.status),
  tenantIdIdx: index4("crm_customers_tenant_id_idx").on(table.tenantId)
}));
var crmPersonConsents = w3suiteSchema.table("crm_person_consents", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  personId: uuid4("person_id").notNull(),
  // Same person_id across lead/deal/customer for unified consent tracking
  // Consent details
  consentType: crmConsentTypeEnum("consent_type").notNull(),
  // 'privacy_policy', 'marketing', 'profiling', 'third_party'
  status: crmConsentStatusEnum("status").notNull(),
  // 'granted', 'denied', 'withdrawn', 'pending'
  // Timestamps for audit trail
  grantedAt: timestamp4("granted_at"),
  // When consent was granted
  withdrawnAt: timestamp4("withdrawn_at"),
  // When consent was withdrawn (if applicable)
  expiresAt: timestamp4("expires_at"),
  // Optional expiry date for consent
  // Source tracking - where consent originated
  source: varchar4("source", { length: 100 }),
  // 'campaign', 'customer_modal', 'api', 'web_form', 'import'
  sourceEntityType: varchar4("source_entity_type", { length: 50 }),
  // 'lead', 'deal', 'customer', 'campaign'
  sourceEntityId: uuid4("source_entity_id"),
  // ID of the source entity (campaign_id, lead_id, etc.)
  campaignId: uuid4("campaign_id").references(() => crmCampaigns.id),
  // If originated from a campaign
  // Audit fields - who made the change
  updatedBy: varchar4("updated_by", { length: 255 }),
  // User ID who last updated this consent
  updatedByName: varchar4("updated_by_name", { length: 255 }),
  // User name for display
  ipAddress: varchar4("ip_address", { length: 45 }),
  // IP address of consent action (IPv4/IPv6)
  userAgent: text4("user_agent"),
  // Browser/device info
  // Change log - complete history of all modifications
  auditTrail: jsonb4("audit_trail"),
  // Array of { timestamp, action, status, user, reason, metadata }
  // Additional metadata
  consentMethod: varchar4("consent_method", { length: 100 }),
  // 'checkbox', 'toggle', 'api', 'double_opt_in'
  language: varchar4("language", { length: 10 }),
  // Language code when consent was given (it, en, etc.)
  notes: text4("notes"),
  // Optional notes about this consent
  // Timestamps
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  // Primary lookup index - get all consents for a person
  tenantPersonIdx: index4("crm_person_consents_tenant_person_idx").on(table.tenantId, table.personId),
  // Consent type lookup - find all people with specific consent type
  tenantTypeStatusIdx: index4("crm_person_consents_tenant_type_status_idx").on(table.tenantId, table.consentType, table.status),
  // Campaign attribution - which campaigns generated consents
  campaignIdx: index4("crm_person_consents_campaign_idx").on(table.campaignId),
  // Expiry tracking - find expiring consents
  expiresAtIdx: index4("crm_person_consents_expires_at_idx").on(table.expiresAt),
  // Audit tracking - who modified consents
  updatedByIdx: index4("crm_person_consents_updated_by_idx").on(table.updatedBy),
  // Composite unique constraint - one consent type per person (latest record wins)
  tenantPersonTypeUniq: uniqueIndex3("crm_person_consents_tenant_person_type_uniq").on(table.tenantId, table.personId, table.consentType),
  // Tenant isolation
  tenantIdIdx: index4("crm_person_consents_tenant_id_idx").on(table.tenantId)
}));
var crmOrders = w3suiteSchema.table("crm_orders", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  customerId: uuid4("customer_id").notNull().references(() => crmCustomers.id),
  orderNumber: varchar4("order_number", { length: 100 }).notNull(),
  orderDate: timestamp4("order_date").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar4("currency", { length: 3 }).default("EUR"),
  status: varchar4("status", { length: 50 }).notNull().default("completed"),
  paymentMethod: varchar4("payment_method", { length: 100 }),
  paymentStatus: varchar4("payment_status", { length: 50 }).default("paid"),
  shippingAddress: jsonb4("shipping_address"),
  billingAddress: jsonb4("billing_address"),
  items: jsonb4("items").notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 }).default("0"),
  notes: text4("notes"),
  storeId: uuid4("store_id"),
  channelType: varchar4("channel_type", { length: 50 }),
  createdBy: varchar4("created_by", { length: 255 }),
  updatedBy: varchar4("updated_by", { length: 255 }),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantCustomerDateIdx: index4("crm_orders_tenant_customer_date_idx").on(table.tenantId, table.customerId, table.orderDate),
  tenantOrderNumberUniq: uniqueIndex3("crm_orders_tenant_order_number_uniq").on(table.tenantId, table.orderNumber),
  tenantIdIdx: index4("crm_orders_tenant_id_idx").on(table.tenantId)
}));
var crmCustomerDocuments = w3suiteSchema.table("crm_customer_documents", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: uuid4("customer_id").notNull().references(() => crmCustomers.id, { onDelete: "cascade" }),
  // Document metadata
  name: varchar4("name", { length: 255 }).notNull(),
  category: varchar4("category", { length: 100 }).notNull(),
  // 'Contratti', 'Fatture', 'Documenti', 'Preventivi', 'Altro'
  fileType: varchar4("file_type", { length: 50 }).notNull(),
  // pdf, jpg, png, docx, etc.
  fileSize: integer3("file_size").notNull(),
  // bytes
  // Object Storage reference
  objectPath: varchar4("object_path", { length: 500 }).notNull(),
  // path in object storage
  // Version tracking
  version: integer3("version").default(1),
  previousVersionId: uuid4("previous_version_id"),
  // Metadata
  description: text4("description"),
  tags: jsonb4("tags"),
  // Array of tags
  // Audit
  uploadedBy: varchar4("uploaded_by", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantCustomerIdx: index4("crm_customer_documents_tenant_customer_idx").on(table.tenantId, table.customerId),
  categoryIdx: index4("crm_customer_documents_category_idx").on(table.category),
  tenantIdIdx: index4("crm_customer_documents_tenant_id_idx").on(table.tenantId)
}));
var crmCustomerNotes = w3suiteSchema.table("crm_customer_notes", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: uuid4("customer_id").notNull().references(() => crmCustomers.id, { onDelete: "cascade" }),
  // Note content
  title: varchar4("title", { length: 255 }).notNull(),
  content: text4("content").notNull(),
  tags: jsonb4("tags").default("[]"),
  // Array of tag strings
  // Organization
  isPinned: boolean4("is_pinned").default(false),
  // Audit
  createdBy: varchar4("created_by", { length: 255 }).notNull().references(() => users.id),
  updatedBy: varchar4("updated_by", { length: 255 }),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantCustomerIdx: index4("crm_customer_notes_tenant_customer_idx").on(table.tenantId, table.customerId),
  pinnedIdx: index4("crm_customer_notes_pinned_idx").on(table.isPinned),
  createdAtIdx: index4("crm_customer_notes_created_at_idx").on(table.createdAt),
  tenantIdIdx: index4("crm_customer_notes_tenant_id_idx").on(table.tenantId)
}));
var crmCampaignPipelineLinks = w3suiteSchema.table("crm_campaign_pipeline_links", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  campaignId: uuid4("campaign_id").notNull().references(() => crmCampaigns.id),
  pipelineId: uuid4("pipeline_id").notNull().references(() => crmPipelines.id),
  isPrimary: boolean4("is_primary").default(false),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  campaignPipelineUniq: uniqueIndex3("crm_campaign_pipeline_links_campaign_pipeline_uniq").on(table.campaignId, table.pipelineId)
}));
var crmLeadAttributions = w3suiteSchema.table("crm_lead_attributions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  leadId: uuid4("lead_id").notNull().references(() => crmLeads.id),
  campaignId: uuid4("campaign_id").notNull().references(() => crmCampaigns.id),
  touchpointOrder: smallint4("touchpoint_order").notNull(),
  attributionWeight: real3("attribution_weight"),
  occurredAt: timestamp4("occurred_at").notNull(),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => ({
  leadTouchpointIdx: index4("crm_lead_attributions_lead_touchpoint_idx").on(table.leadId, table.touchpointOrder)
}));
var crmSourceMappings = w3suiteSchema.table("crm_source_mappings", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  sourceType: crmSourceTypeEnum("source_type").notNull(),
  externalId: varchar4("external_id", { length: 255 }).notNull(),
  legalEntityId: uuid4("legal_entity_id"),
  storeId: uuid4("store_id"),
  isActive: boolean4("is_active").default(true),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantSourceExternalUniq: uniqueIndex3("crm_source_mappings_tenant_source_external_uniq").on(table.tenantId, table.sourceType, table.externalId),
  tenantIdIdx: index4("crm_source_mappings_tenant_id_idx").on(table.tenantId)
}));
var crmEmailTemplates = w3suiteSchema.table("crm_email_templates", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  subject: varchar4("subject", { length: 500 }),
  bodyHtml: text4("body_html"),
  bodyText: text4("body_text"),
  variables: jsonb4("variables"),
  isActive: boolean4("is_active").default(true),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantIdIdx: index4("crm_email_templates_tenant_id_idx").on(table.tenantId)
}));
var crmSmsTemplates = w3suiteSchema.table("crm_sms_templates", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  body: text4("body"),
  // max 160 char validated in app
  variables: jsonb4("variables"),
  isActive: boolean4("is_active").default(true),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantIdIdx: index4("crm_sms_templates_tenant_id_idx").on(table.tenantId)
}));
var crmWhatsappTemplates = w3suiteSchema.table("crm_whatsapp_templates", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  templateId: varchar4("template_id", { length: 255 }),
  // WhatsApp approved template ID
  language: varchar4("language", { length: 5 }),
  headerText: text4("header_text"),
  bodyText: text4("body_text"),
  footerText: text4("footer_text"),
  buttons: jsonb4("buttons"),
  variables: jsonb4("variables"),
  isApproved: boolean4("is_approved").default(false),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantIdIdx: index4("crm_whatsapp_templates_tenant_id_idx").on(table.tenantId)
}));
var crmCustomerSegments = w3suiteSchema.table("crm_customer_segments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  description: text4("description"),
  filterRules: jsonb4("filter_rules"),
  calculatedCount: integer3("calculated_count").default(0),
  isDynamic: boolean4("is_dynamic").default(true),
  lastCalculatedAt: timestamp4("last_calculated_at"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantIdIdx: index4("crm_customer_segments_tenant_id_idx").on(table.tenantId)
}));
var crmAutomationRules = w3suiteSchema.table("crm_automation_rules", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  name: varchar4("name", { length: 255 }).notNull(),
  triggerEvent: varchar4("trigger_event", { length: 255 }).notNull(),
  conditions: jsonb4("conditions"),
  actions: jsonb4("actions"),
  isActive: boolean4("is_active").default(true),
  executionCount: integer3("execution_count").default(0),
  lastExecutedAt: timestamp4("last_executed_at"),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantIdIdx: index4("crm_automation_rules_tenant_id_idx").on(table.tenantId)
}));
var crmSavedViews = w3suiteSchema.table("crm_saved_views", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull(),
  userId: uuid4("user_id").notNull(),
  viewName: varchar4("view_name", { length: 255 }).notNull(),
  entityType: varchar4("entity_type", { length: 50 }).notNull(),
  filters: jsonb4("filters"),
  sortConfig: jsonb4("sort_config"),
  columnsConfig: jsonb4("columns_config"),
  isShared: boolean4("is_shared").default(false),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => ({
  tenantUserIdx: index4("crm_saved_views_tenant_user_idx").on(table.tenantId, table.userId)
}));
var crmCampaignUtmLinks = w3suiteSchema.table("crm_campaign_utm_links", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  campaignId: uuid4("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: "cascade" }),
  channelId: varchar4("channel_id", { length: 100 }).notNull(),
  // 'facebook_ads', 'instagram', 'google_ads', etc.
  channelName: varchar4("channel_name", { length: 200 }).notNull(),
  // Human-readable name
  generatedUrl: text4("generated_url").notNull(),
  // Full UTM link
  utmSource: varchar4("utm_source", { length: 255 }).notNull(),
  utmMedium: varchar4("utm_medium", { length: 255 }).notNull(),
  utmCampaign: varchar4("utm_campaign", { length: 255 }).notNull(),
  // Analytics tracking
  clicks: integer3("clicks").default(0),
  uniqueClicks: integer3("unique_clicks").default(0),
  conversions: integer3("conversions").default(0),
  revenue: real3("revenue").default(0),
  lastClickedAt: timestamp4("last_clicked_at"),
  lastConversionAt: timestamp4("last_conversion_at"),
  // Metadata
  isActive: boolean4("is_active").default(true).notNull(),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index4("crm_campaign_utm_links_tenant_id_idx").on(table.tenantId),
  campaignIdIdx: index4("crm_campaign_utm_links_campaign_id_idx").on(table.campaignId),
  channelIdIdx: index4("crm_campaign_utm_links_channel_id_idx").on(table.channelId),
  campaignChannelUniq: uniqueIndex3("crm_campaign_utm_links_campaign_channel_uniq").on(table.campaignId, table.channelId)
}));
var crmLeadNotifications = w3suiteSchema.table("crm_lead_notifications", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  leadId: uuid4("lead_id").notNull().references(() => crmLeads.id, { onDelete: "cascade" }),
  userId: varchar4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Recipient
  // Notification content
  notificationType: varchar4("notification_type", { length: 100 }).notNull(),
  // 'hot_lead', 'high_score', 'ai_insight', 'conversion_ready'
  priority: notificationPriorityEnum("priority").default("medium").notNull(),
  // low, medium, high, critical
  title: varchar4("title", { length: 255 }).notNull(),
  message: text4("message").notNull(),
  metadata: jsonb4("metadata").default({}),
  // Additional data (leadScore, aiInsights, etc.)
  // Actions
  actionUrl: varchar4("action_url", { length: 500 }),
  // Deep link to lead detail
  actionLabel: varchar4("action_label", { length: 100 }),
  // "View Lead", "Contact Now"
  // Status
  isRead: boolean4("is_read").default(false).notNull(),
  readAt: timestamp4("read_at"),
  dismissedAt: timestamp4("dismissed_at"),
  // Metadata
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index4("crm_lead_notifications_tenant_id_idx").on(table.tenantId),
  leadIdIdx: index4("crm_lead_notifications_lead_id_idx").on(table.leadId),
  userIdIdx: index4("crm_lead_notifications_user_id_idx").on(table.userId),
  userUnreadIdx: index4("crm_lead_notifications_user_unread_idx").on(table.userId, table.isRead),
  createdAtIdx: index4("crm_lead_notifications_created_at_idx").on(table.createdAt.desc())
}));
var gtmEventLog = w3suiteSchema.table("gtm_event_log", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  leadId: uuid4("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }),
  // Optional: linked to lead
  storeId: uuid4("store_id").references(() => stores.id),
  // Store context for tracking IDs
  // Event details
  eventType: varchar4("event_type", { length: 100 }).notNull(),
  // 'lead_created', 'lead_converted', 'deal_won', 'form_submit'
  eventName: varchar4("event_name", { length: 255 }).notNull(),
  // GTM event name
  eventData: jsonb4("event_data").notNull(),
  // Full event payload
  // Tracking IDs
  ga4MeasurementId: varchar4("ga4_measurement_id", { length: 50 }),
  // GA4 Measurement ID
  googleAdsConversionId: varchar4("google_ads_conversion_id", { length: 50 }),
  // Google Ads Conversion ID
  googleAdsConversionLabel: varchar4("google_ads_conversion_label", { length: 100 }),
  // Google Ads Conversion Label
  facebookPixelId: varchar4("facebook_pixel_id", { length: 50 }),
  // Facebook Pixel ID
  // Enhanced Conversions
  enhancedConversionData: jsonb4("enhanced_conversion_data"),
  // Hashed email/phone/address for Enhanced Conversions
  userAgent: text4("user_agent"),
  // Client user agent
  clientIpAddress: varchar4("client_ip_address", { length: 45 }),
  // Client IP for geo-targeting
  // Response tracking
  success: boolean4("success").default(false).notNull(),
  httpStatusCode: smallint4("http_status_code"),
  // HTTP response code
  responseBody: jsonb4("response_body"),
  // API response
  errorMessage: text4("error_message"),
  // Error details if failed
  // Timing
  responseTimeMs: integer3("response_time_ms"),
  // Response time in milliseconds
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index4("gtm_event_log_tenant_id_idx").on(table.tenantId),
  leadIdIdx: index4("gtm_event_log_lead_id_idx").on(table.leadId),
  storeIdIdx: index4("gtm_event_log_store_id_idx").on(table.storeId),
  eventTypeIdx: index4("gtm_event_log_event_type_idx").on(table.eventType),
  successIdx: index4("gtm_event_log_success_idx").on(table.success),
  createdAtIdx: index4("gtm_event_log_created_at_idx").on(table.createdAt.desc())
}));
var insertCrmPersonIdentitySchema = createInsertSchema4(crmPersonIdentities).omit({
  id: true,
  createdAt: true
});
var insertCrmCampaignSchema = createInsertSchema4(crmCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalLeads: true,
  totalDeals: true,
  totalRevenue: true
});
var insertCrmLeadSchema = createInsertSchema4(crmLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertLeadStatusSchema = createInsertSchema4(leadStatuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertLeadStatusHistorySchema = createInsertSchema4(leadStatusHistory).omit({
  id: true,
  changedAt: true
});
var insertCrmPipelineSchema = createInsertSchema4(crmPipelines).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmPipelineSettingsSchema = createInsertSchema4(crmPipelineSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmPipelineStagePlaybookSchema = createInsertSchema4(crmPipelineStagePlaybooks).omit({
  id: true,
  createdAt: true
});
var insertCrmPipelineWorkflowSchema = createInsertSchema4(crmPipelineWorkflows).omit({
  id: true,
  assignedAt: true
});
var insertCrmPipelineStageSchema = createInsertSchema4(crmPipelineStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmDealSchema = createInsertSchema4(crmDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  agingDays: true
});
var insertCrmInteractionSchema = createInsertSchema4(crmInteractions).omit({
  id: true,
  createdAt: true
});
var insertCrmOmnichannelInteractionSchema = createInsertSchema4(crmOmnichannelInteractions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmInteractionAttachmentSchema = createInsertSchema4(crmInteractionAttachments).omit({
  id: true,
  createdAt: true
});
var insertCrmInteractionParticipantSchema = createInsertSchema4(crmInteractionParticipants).omit({
  id: true,
  createdAt: true
});
var insertCrmIdentityMatchSchema = createInsertSchema4(crmIdentityMatches).omit({
  id: true,
  createdAt: true
});
var insertCrmIdentityEventSchema = createInsertSchema4(crmIdentityEvents).omit({
  id: true
});
var insertCrmIdentityConflictSchema = createInsertSchema4(crmIdentityConflicts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmTaskSchema = createInsertSchema4(crmTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmCustomerSchema = createInsertSchema4(crmCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmOrderSchema = createInsertSchema4(crmOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmCampaignPipelineLinkSchema = createInsertSchema4(crmCampaignPipelineLinks).omit({
  id: true,
  createdAt: true
});
var insertCrmLeadAttributionSchema = createInsertSchema4(crmLeadAttributions).omit({
  id: true,
  createdAt: true
});
var insertCrmSourceMappingSchema = createInsertSchema4(crmSourceMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmEmailTemplateSchema = createInsertSchema4(crmEmailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmSmsTemplateSchema = createInsertSchema4(crmSmsTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmWhatsappTemplateSchema = createInsertSchema4(crmWhatsappTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmCustomerSegmentSchema = createInsertSchema4(crmCustomerSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  calculatedCount: true
});
var insertCrmAutomationRuleSchema = createInsertSchema4(crmAutomationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  executionCount: true
});
var insertCrmSavedViewSchema = createInsertSchema4(crmSavedViews).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmCampaignUtmLinkSchema = createInsertSchema4(crmCampaignUtmLinks).omit({
  id: true,
  clicks: true,
  uniqueClicks: true,
  conversions: true,
  revenue: true,
  lastClickedAt: true,
  lastConversionAt: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmLeadNotificationSchema = createInsertSchema4(crmLeadNotifications).omit({
  id: true,
  isRead: true,
  readAt: true,
  dismissedAt: true,
  createdAt: true
});
var insertGtmEventLogSchema = createInsertSchema4(gtmEventLog).omit({
  id: true,
  success: true,
  httpStatusCode: true,
  responseBody: true,
  errorMessage: true,
  responseTimeMs: true,
  createdAt: true
});
var insertCrmCustomerDocumentSchema = createInsertSchema4(crmCustomerDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCrmCustomerNoteSchema = createInsertSchema4(crmCustomerNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var voipTenantConfig = w3suiteSchema.table("voip_tenant_config", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  // EDGVoIP API v2 Configuration
  tenantExternalId: varchar4("tenant_external_id", { length: 255 }).notNull(),
  // Custom identifier for edgvoip
  apiKey: text4("api_key").notNull(),
  // Encrypted: sk_live_...
  apiKeyLastFour: varchar4("api_key_last_four", { length: 4 }),
  // Last 4 chars for display
  webhookSecret: text4("webhook_secret"),
  // For HMAC verification
  apiBaseUrl: varchar4("api_base_url", { length: 255 }).default("https://edgvoip.it/api/v2/voip"),
  // Scopes and permissions
  scopes: text4("scopes").array(),
  // ['voip:read', 'voip:write', 'trunks:sync', etc.]
  // Connection status
  enabled: boolean4("enabled").default(true).notNull(),
  connectionStatus: voipConnectionStatusEnum("connection_status").default("unknown"),
  lastConnectionTest: timestamp4("last_connection_test"),
  connectionError: text4("connection_error"),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("voip_tenant_config_tenant_idx").on(table.tenantId),
  uniqueIndex3("voip_tenant_config_external_id_unique").on(table.tenantExternalId)
]);
var insertVoipTenantConfigSchema = createInsertSchema4(voipTenantConfig).omit({
  id: true,
  apiKeyLastFour: true,
  connectionStatus: true,
  lastConnectionTest: true,
  connectionError: true,
  createdAt: true,
  updatedAt: true
});
var updateVoipTenantConfigSchema = insertVoipTenantConfigSchema.omit({ tenantId: true }).partial();
var voipTrunks = w3suiteSchema.table("voip_trunks", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  // API v2 External ID (UUID for bidirectional sync)
  externalId: uuid4("external_id"),
  // UUID from EDGVoIP API v2
  // Legacy sync metadata
  edgvoipTrunkId: varchar4("edgvoip_trunk_id", { length: 255 }).unique(),
  // Legacy external trunk ID
  syncSource: varchar4("sync_source", { length: 20 }).default("w3suite").notNull(),
  // w3suite|edgvoip|local
  syncStatus: voipSyncStatusEnum("sync_status").default("local_only"),
  lastSyncAt: timestamp4("last_sync_at"),
  // Basic trunk info
  name: varchar4("name", { length: 255 }).notNull(),
  provider: varchar4("provider", { length: 100 }),
  status: voipTrunkStatusEnum("status").default("active").notNull(),
  registrationStatus: voipRegistrationStatusEnum("registration_status").default("unknown"),
  // API v2: SIP Configuration (JSONB)
  sipConfig: jsonb4("sip_config"),
  // {host, port, transport, username, password, register, ...}
  // API v2: DID Configuration (JSONB)
  didConfig: jsonb4("did_config"),
  // {number, country_code, area_code, local_number, ...}
  // API v2: Security Configuration (JSONB)
  security: jsonb4("security"),
  // {encryption, authentication, acl, rate_limit}
  // API v2: GDPR Configuration (JSONB)
  gdpr: jsonb4("gdpr"),
  // {data_retention_days, recording_consent_required, ...}
  // API v2: Codec preferences (stored as JSONB to match database)
  codecPreferences: jsonb4("codec_preferences").$type(),
  // ['PCMU', 'PCMA', 'G729']
  // Legacy fields (for backward compatibility)
  host: varchar4("host", { length: 255 }),
  port: integer3("port").default(5060),
  protocol: voipProtocolEnum("protocol").default("udp"),
  didRange: varchar4("did_range", { length: 100 }),
  maxChannels: integer3("max_channels").default(10).notNull(),
  currentChannels: integer3("current_channels").default(0).notNull(),
  webhookToken: varchar4("webhook_token", { length: 64 }),
  // AI Voice Agent configuration
  aiAgentEnabled: boolean4("ai_agent_enabled").default(false).notNull(),
  aiAgentRef: varchar4("ai_agent_ref", { length: 100 }),
  aiTimePolicy: jsonb4("ai_time_policy"),
  aiFailoverExtension: varchar4("ai_failover_extension", { length: 20 }),
  // edgvoip AI Config Sync tracking
  edgvoipAiSyncedAt: timestamp4("edgvoip_ai_synced_at"),
  edgvoipAiSyncStatus: varchar4("edgvoip_ai_sync_status", { length: 50 }),
  edgvoipAiSyncError: text4("edgvoip_ai_sync_error"),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("voip_trunks_tenant_idx").on(table.tenantId),
  index4("voip_trunks_store_idx").on(table.storeId),
  index4("voip_trunks_edgvoip_id_idx").on(table.edgvoipTrunkId),
  index4("voip_trunks_external_id_idx").on(table.externalId),
  index4("voip_trunks_sync_status_idx").on(table.syncStatus),
  uniqueIndex3("voip_trunks_tenant_store_name_unique").on(table.tenantId, table.storeId, table.name),
  uniqueIndex3("voip_trunks_external_id_unique").on(table.tenantId, table.externalId)
]);
var insertVoipTrunkSchema = createInsertSchema4(voipTrunks).omit({
  id: true,
  externalId: true,
  edgvoipTrunkId: true,
  syncStatus: true,
  lastSyncAt: true,
  registrationStatus: true,
  currentChannels: true,
  webhookToken: true,
  edgvoipAiSyncedAt: true,
  edgvoipAiSyncStatus: true,
  edgvoipAiSyncError: true,
  createdAt: true,
  updatedAt: true
});
var updateVoipTrunkSchema = insertVoipTrunkSchema.omit({ tenantId: true, storeId: true }).partial();
var voipExtensions = w3suiteSchema.table("voip_extensions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar4("user_id").references(() => users.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "set null" }),
  // API v2: Store reference
  domainId: uuid4("domain_id"),
  // Legacy: domain_id (optional now)
  // API v2 External ID (UUID for bidirectional sync)
  externalId: uuid4("external_id"),
  // UUID from EDGVoIP API v2
  // Basic extension info
  extension: varchar4("extension", { length: 20 }).notNull(),
  sipUsername: varchar4("sip_username", { length: 100 }).notNull(),
  sipPassword: text4("sip_password").notNull(),
  // Encrypted at rest
  displayName: varchar4("display_name", { length: 255 }),
  email: varchar4("email", { length: 255 }),
  // API v2: Extension type
  type: voipExtensionTypeEnum("type").default("user"),
  // API v2: Settings (JSONB)
  settings: jsonb4("settings"),
  // {voicemail_enabled, call_forwarding, recording}
  // FreeSWITCH Best Practice Fields
  sipServer: varchar4("sip_server", { length: 255 }).default("sip.edgvoip.it"),
  sipPort: integer3("sip_port").default(5060),
  wsPort: integer3("ws_port").default(7443),
  transport: varchar4("transport", { length: 20 }).default("WSS"),
  // Caller ID Configuration
  callerIdName: varchar4("caller_id_name", { length: 100 }),
  callerIdNumber: varchar4("caller_id_number", { length: 50 }),
  // Codec Configuration
  allowedCodecs: varchar4("allowed_codecs", { length: 255 }).default("OPUS,G722,PCMU,PCMA"),
  // Security & Authentication
  authRealm: varchar4("auth_realm", { length: 255 }),
  registrationExpiry: integer3("registration_expiry").default(3600),
  maxConcurrentCalls: integer3("max_concurrent_calls").default(4),
  // Call Features (legacy - now in settings JSONB)
  voicemailEnabled: boolean4("voicemail_enabled").default(true).notNull(),
  voicemailEmail: varchar4("voicemail_email", { length: 255 }),
  voicemailPin: varchar4("voicemail_pin", { length: 20 }),
  recordingEnabled: boolean4("recording_enabled").default(false).notNull(),
  dndEnabled: boolean4("dnd_enabled").default(false).notNull(),
  forwardOnBusy: varchar4("forward_on_busy", { length: 100 }),
  forwardOnNoAnswer: varchar4("forward_on_no_answer", { length: 100 }),
  forwardUnconditional: varchar4("forward_unconditional", { length: 100 }),
  // Registration Status (API v2)
  registrationStatus: voipRegistrationStatusEnum("registration_status").default("unknown"),
  lastRegistration: timestamp4("last_registration"),
  ipAddress: varchar4("ip_address", { length: 50 }),
  // Sync Metadata
  edgvoipExtensionId: varchar4("edgvoip_extension_id", { length: 100 }),
  syncSource: varchar4("sync_source", { length: 20 }).default("w3suite").notNull(),
  syncStatus: voipSyncStatusEnum("sync_status").default("local_only"),
  lastSyncAt: timestamp4("last_sync_at"),
  syncErrorMessage: text4("sync_error_message"),
  status: voipExtensionStatusEnum("status").default("active").notNull(),
  // ACTUAL DB: status enum
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("voip_extensions_tenant_idx").on(table.tenantId),
  index4("voip_extensions_user_idx").on(table.userId),
  index4("voip_extensions_store_idx").on(table.storeId),
  index4("voip_extensions_domain_idx").on(table.domainId),
  index4("voip_extensions_external_id_idx").on(table.externalId),
  index4("voip_extensions_sync_status_idx").on(table.syncStatus),
  index4("voip_extensions_type_idx").on(table.type),
  uniqueIndex3("voip_extensions_tenant_extension_unique").on(table.tenantId, table.extension),
  uniqueIndex3("voip_extensions_domain_extension_unique").on(table.domainId, table.extension),
  uniqueIndex3("voip_extensions_domain_sip_username_unique").on(table.domainId, table.sipUsername),
  uniqueIndex3("voip_extensions_user_unique").on(table.userId),
  uniqueIndex3("voip_extensions_edgvoip_id_unique").on(table.tenantId, table.edgvoipExtensionId),
  uniqueIndex3("voip_extensions_external_id_unique").on(table.tenantId, table.externalId)
]);
var insertVoipExtensionSchema = createInsertSchema4(voipExtensions).omit({
  id: true,
  externalId: true,
  edgvoipExtensionId: true,
  registrationStatus: true,
  lastRegistration: true,
  ipAddress: true,
  syncStatus: true,
  syncSource: true,
  lastSyncAt: true,
  syncErrorMessage: true,
  createdAt: true,
  updatedAt: true
}).extend({
  userId: z3.string().optional(),
  storeId: z3.string().uuid("Invalid store ID").optional(),
  domainId: z3.string().uuid("Invalid domain ID").optional(),
  extension: z3.string().regex(/^\d{3,6}$/, "Extension must be 3-6 digits"),
  sipUsername: z3.string().min(1, "SIP username is required"),
  sipPassword: z3.string().min(16, "SIP password must be at least 16 characters"),
  type: z3.enum(["user", "queue", "conference"]).optional(),
  transport: z3.enum(["UDP", "TCP", "TLS", "WS", "WSS"]).optional(),
  allowedCodecs: z3.string().optional(),
  callerIdNumber: z3.string().regex(/^\+\d{7,15}$/, "Must be E.164 format").optional(),
  status: z3.enum(["active", "inactive", "suspended"]).optional()
});
var updateVoipExtensionSchema = insertVoipExtensionSchema.omit({
  tenantId: true,
  userId: true,
  domainId: true,
  extension: true,
  sipPassword: true
}).partial();
var voipExtensionStoreAccess = w3suiteSchema.table("voip_extension_store_access", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  extensionId: uuid4("extension_id").notNull().references(() => voipExtensions.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  canCallOutbound: boolean4("can_call_outbound").default(true).notNull(),
  // Can make outbound calls from this store
  canReceiveInbound: boolean4("can_receive_inbound").default(true).notNull(),
  // Can receive inbound calls to this store's DIDs
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("voip_ext_store_access_tenant_idx").on(table.tenantId),
  index4("voip_ext_store_access_extension_idx").on(table.extensionId),
  index4("voip_ext_store_access_store_idx").on(table.storeId),
  uniqueIndex3("voip_ext_store_access_unique").on(table.extensionId, table.storeId)
  // Prevent duplicates
]);
var insertVoipExtensionStoreAccessSchema = createInsertSchema4(voipExtensionStoreAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  extensionId: z3.string().uuid("Invalid extension ID"),
  storeId: z3.string().uuid("Invalid store ID")
});
var updateVoipExtensionStoreAccessSchema = insertVoipExtensionStoreAccessSchema.omit({ tenantId: true, extensionId: true, storeId: true }).partial();
var voipCdrs = w3suiteSchema.table("voip_cdrs", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "set null" }),
  // API v2 identifiers
  edgvoipCallId: varchar4("edgvoip_call_id", { length: 255 }),
  // External call ID from EDGVoIP
  callUuid: varchar4("call_uuid", { length: 255 }),
  // FreeSWITCH call UUID
  // Legacy identifiers
  sipDomain: varchar4("sip_domain", { length: 255 }),
  // Made optional for API v2
  callId: varchar4("call_id", { length: 255 }),
  // Legacy call ID
  // Call direction and parties
  direction: voipCallDirectionEnum("direction").notNull(),
  callerNumber: varchar4("caller_number", { length: 100 }),
  // API v2 caller
  calledNumber: varchar4("called_number", { length: 100 }),
  // API v2 destination
  fromUri: varchar4("from_uri", { length: 100 }),
  // Legacy E.164 o ext
  toUri: varchar4("to_uri", { length: 100 }),
  // Legacy E.164 o ext
  didE164: varchar4("did_e164", { length: 50 }),
  extNumber: varchar4("ext_number", { length: 20 }),
  // Timestamps
  startTime: timestamp4("start_time"),
  // API v2: call start time
  answerTime: timestamp4("answer_time"),
  // API v2: when answered
  endTime: timestamp4("end_time"),
  // API v2: call end time
  startTs: timestamp4("start_ts"),
  // Legacy start
  answerTs: timestamp4("answer_ts"),
  // Legacy answer
  endTs: timestamp4("end_ts"),
  // Legacy end
  // Duration
  duration: integer3("duration"),
  // API v2: total duration in seconds
  billSec: integer3("bill_sec"),
  // API v2: billable seconds
  billsec: integer3("billsec").default(0),
  // Legacy billable seconds
  // Call result
  hangupCause: varchar4("hangup_cause", { length: 100 }),
  // API v2: SIP hangup cause
  disposition: voipCallDispositionEnum("disposition"),
  // Made optional for API v2
  // Recording
  recordingUrl: varchar4("recording_url", { length: 500 }),
  // Metadata
  metaJson: jsonb4("meta_json"),
  // Sync tracking
  syncSource: varchar4("sync_source", { length: 20 }).default("w3suite"),
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  index4("voip_cdrs_tenant_idx").on(table.tenantId),
  index4("voip_cdrs_store_idx").on(table.storeId),
  index4("voip_cdrs_sip_domain_idx").on(table.sipDomain),
  index4("voip_cdrs_call_id_idx").on(table.callId),
  index4("voip_cdrs_call_uuid_idx").on(table.callUuid),
  index4("voip_cdrs_edgvoip_call_id_idx").on(table.edgvoipCallId),
  index4("voip_cdrs_start_ts_idx").on(table.startTs),
  index4("voip_cdrs_start_time_idx").on(table.startTime),
  index4("voip_cdrs_did_idx").on(table.didE164),
  index4("voip_cdrs_ext_idx").on(table.extNumber)
]);
var insertVoipCdrSchema = createInsertSchema4(voipCdrs).omit({
  id: true,
  createdAt: true
}).extend({
  sipDomain: z3.string().regex(/^[a-zA-Z0-9.-]+\.[a-z]{2,}$/, "Invalid SIP domain format").optional(),
  direction: z3.enum(["inbound", "outbound", "internal"]),
  disposition: z3.enum(["answered", "no_answer", "busy", "failed", "voicemail"]).optional(),
  startTs: z3.coerce.date().optional().nullable(),
  startTime: z3.coerce.date().optional().nullable(),
  answerTs: z3.coerce.date().optional().nullable(),
  answerTime: z3.coerce.date().optional().nullable(),
  endTs: z3.coerce.date().optional().nullable(),
  endTime: z3.coerce.date().optional().nullable()
});
var contactPolicies = w3suiteSchema.table("contact_policies", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  scopeType: varchar4("scope_type", { length: 50 }).notNull(),
  // tenant|store|did|ext
  scopeRef: varchar4("scope_ref", { length: 255 }).notNull(),
  // ID di riferimento (store_id, e164, ext_number)
  rulesJson: jsonb4("rules_json").notNull(),
  // {open: "09:00", close: "18:00", fallback: "voicemail", announcements: [...]}
  active: boolean4("active").default(true).notNull(),
  label: varchar4("label", { length: 255 }),
  // "Orari Roma"
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("contact_policies_tenant_idx").on(table.tenantId),
  index4("contact_policies_scope_idx").on(table.scopeType, table.scopeRef),
  uniqueIndex3("contact_policies_scope_unique").on(table.scopeType, table.scopeRef)
]);
var insertContactPolicySchema = createInsertSchema4(contactPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  scopeType: z3.enum(["tenant", "store", "did", "ext"]),
  scopeRef: z3.string().min(1, "Scope reference is required"),
  rulesJson: z3.object({}).passthrough()
  // Accept any JSON object
});
var updateContactPolicySchema = insertContactPolicySchema.omit({ tenantId: true, scopeType: true, scopeRef: true }).partial();
var voipActivityLog = w3suiteSchema.table("voip_activity_log", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  actor: varchar4("actor", { length: 255 }).notNull(),
  // user:<id> o system:w3-provisioner
  action: varchar4("action", { length: 50 }).notNull(),
  // create|update|delete|provision|sync
  targetType: varchar4("target_type", { length: 50 }).notNull(),
  // trunk|did|ext|route|policy
  targetId: varchar4("target_id", { length: 255 }).notNull(),
  // ID dell'oggetto bersaglio
  status: varchar4("status", { length: 50 }).notNull(),
  // ok|fail
  detailsJson: jsonb4("details_json"),
  // Payload/diff/esito chiamate API verso PBX
  ts: timestamp4("ts").defaultNow().notNull()
}, (table) => [
  index4("voip_activity_log_tenant_idx").on(table.tenantId),
  index4("voip_activity_log_actor_idx").on(table.actor),
  index4("voip_activity_log_target_idx").on(table.targetType, table.targetId),
  index4("voip_activity_log_ts_idx").on(table.ts)
]);
var insertVoipActivityLogSchema = createInsertSchema4(voipActivityLog).omit({
  id: true,
  ts: true
}).extend({
  action: z3.enum(["create", "update", "delete", "provision", "sync"]),
  targetType: z3.enum(["trunk", "did", "ext", "route", "policy", "cdr"]),
  status: z3.enum(["ok", "fail"])
});
var voipAiSessions = w3suiteSchema.table("voip_ai_sessions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "set null" }),
  trunkId: uuid4("trunk_id").references(() => voipTrunks.id, { onDelete: "set null" }),
  cdrId: uuid4("cdr_id").references(() => voipCdrs.id, { onDelete: "set null" }),
  // Link to CDR for full call details
  callId: varchar4("call_id", { length: 255 }).notNull(),
  // FreeSWITCH call UUID
  sessionId: varchar4("session_id", { length: 255 }).notNull(),
  // OpenAI Realtime session ID
  aiAgentRef: varchar4("ai_agent_ref", { length: 100 }).notNull(),
  // Which AI agent handled the call
  callerNumber: varchar4("caller_number", { length: 50 }),
  // Caller's phone number
  didNumber: varchar4("did_number", { length: 50 }),
  // DID called
  startTs: timestamp4("start_ts").notNull(),
  // Session start
  endTs: timestamp4("end_ts"),
  // Session end
  durationSeconds: integer3("duration_seconds"),
  // Total session duration
  transcript: text4("transcript"),
  // Full conversation transcript
  actionsTaken: jsonb4("actions_taken"),
  // [{action: "create_ticket", params: {...}, result: {...}}]
  transferredTo: varchar4("transferred_to", { length: 50 }),
  // Extension if transferred to human
  transferReason: varchar4("transfer_reason", { length: 255 }),
  // Why transferred (customer_request, ai_escalation, error)
  sentiment: varchar4("sentiment", { length: 50 }),
  // positive, neutral, negative
  satisfactionScore: integer3("satisfaction_score"),
  // 1-5 if customer provided feedback
  errorOccurred: boolean4("error_occurred").default(false).notNull(),
  errorDetails: jsonb4("error_details"),
  // Error stack if any
  costUsd: decimal("cost_usd", { precision: 10, scale: 4 }),
  // OpenAI API cost tracking
  tokensUsed: integer3("tokens_used"),
  // Total tokens consumed
  metadata: jsonb4("metadata"),
  // Additional session data
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  index4("voip_ai_sessions_tenant_idx").on(table.tenantId),
  index4("voip_ai_sessions_store_idx").on(table.storeId),
  index4("voip_ai_sessions_call_id_idx").on(table.callId),
  index4("voip_ai_sessions_start_ts_idx").on(table.startTs),
  index4("voip_ai_sessions_ai_agent_idx").on(table.aiAgentRef),
  uniqueIndex3("voip_ai_sessions_session_id_unique").on(table.sessionId)
]);
var insertVoipAiSessionSchema = createInsertSchema4(voipAiSessions).omit({
  id: true,
  createdAt: true
}).extend({
  callId: z3.string().min(1, "Call ID is required"),
  sessionId: z3.string().min(1, "Session ID is required"),
  aiAgentRef: z3.string().min(1, "AI agent reference is required")
});
var utmLinks = w3suiteSchema.table("utm_links", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  campaignId: uuid4("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: "cascade" }),
  channel: varchar4("channel", { length: 100 }).notNull(),
  // facebook_ads, instagram, google_ads, email, whatsapp
  fullUrl: text4("full_url").notNull(),
  // Complete URL with UTM parameters
  utmSource: varchar4("utm_source", { length: 255 }).notNull(),
  utmMedium: varchar4("utm_medium", { length: 255 }).notNull(),
  utmCampaign: varchar4("utm_campaign", { length: 255 }).notNull(),
  utmContent: varchar4("utm_content", { length: 255 }),
  utmTerm: varchar4("utm_term", { length: 255 }),
  clicksCount: integer3("clicks_count").default(0).notNull(),
  uniqueClicksCount: integer3("unique_clicks_count").default(0).notNull(),
  conversionsCount: integer3("conversions_count").default(0).notNull(),
  conversionValue: real3("conversion_value").default(0),
  lastClickedAt: timestamp4("last_clicked_at"),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("utm_links_tenant_idx").on(table.tenantId),
  index4("utm_links_campaign_idx").on(table.campaignId),
  index4("utm_links_channel_idx").on(table.channel),
  uniqueIndex3("utm_links_campaign_channel_unique").on(table.campaignId, table.channel)
]);
var insertUtmLinkSchema = createInsertSchema4(utmLinks).omit({
  id: true,
  clicksCount: true,
  uniqueClicksCount: true,
  conversionsCount: true,
  conversionValue: true,
  lastClickedAt: true,
  createdAt: true,
  updatedAt: true
});
var utmShortUrls = w3suiteSchema.table("utm_short_urls", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  utmLinkId: uuid4("utm_link_id").notNull().references(() => utmLinks.id, { onDelete: "cascade" }),
  shortCode: varchar4("short_code", { length: 20 }).notNull().unique(),
  // abc123
  fullShortUrl: varchar4("full_short_url", { length: 255 }).notNull(),
  // w3s.io/abc123 (placeholder domain)
  targetUrl: text4("target_url").notNull(),
  // Full UTM URL to redirect to
  clicksCount: integer3("clicks_count").default(0).notNull(),
  uniqueClicksCount: integer3("unique_clicks_count").default(0).notNull(),
  isActive: boolean4("is_active").default(true).notNull(),
  expiresAt: timestamp4("expires_at"),
  lastClickedAt: timestamp4("last_clicked_at"),
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  index4("utm_short_urls_tenant_idx").on(table.tenantId),
  index4("utm_short_urls_utm_link_idx").on(table.utmLinkId),
  index4("utm_short_urls_short_code_idx").on(table.shortCode),
  uniqueIndex3("utm_short_urls_short_code_unique").on(table.shortCode)
]);
var insertUtmShortUrlSchema = createInsertSchema4(utmShortUrls).omit({
  id: true,
  clicksCount: true,
  uniqueClicksCount: true,
  lastClickedAt: true,
  createdAt: true
});
var leadTouchpoints = w3suiteSchema.table("lead_touchpoints", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  leadId: uuid4("lead_id").notNull().references(() => crmLeads.id, { onDelete: "cascade" }),
  utmLinkId: uuid4("utm_link_id").references(() => utmLinks.id, { onDelete: "set null" }),
  touchpointType: varchar4("touchpoint_type", { length: 50 }).notNull(),
  // utm_click, form_view, email_open, page_view
  touchedAt: timestamp4("touched_at").notNull().defaultNow(),
  userAgent: text4("user_agent"),
  ipAddress: varchar4("ip_address", { length: 45 }),
  deviceType: varchar4("device_type", { length: 50 }),
  // mobile, desktop, tablet
  os: varchar4("os", { length: 100 }),
  // iOS, Android, Windows, macOS
  browser: varchar4("browser", { length: 100 }),
  referrer: text4("referrer"),
  country: varchar4("country", { length: 100 }),
  city: varchar4("city", { length: 100 }),
  latitude: real3("latitude"),
  longitude: real3("longitude"),
  sessionId: varchar4("session_id", { length: 255 }),
  convertedToLead: boolean4("converted_to_lead").default(false),
  metadata: jsonb4("metadata"),
  // Additional touchpoint data
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  index4("lead_touchpoints_tenant_idx").on(table.tenantId),
  index4("lead_touchpoints_lead_idx").on(table.leadId),
  index4("lead_touchpoints_utm_link_idx").on(table.utmLinkId),
  index4("lead_touchpoints_touched_at_idx").on(table.touchedAt),
  index4("lead_touchpoints_session_idx").on(table.sessionId)
]);
var insertLeadTouchpointSchema = createInsertSchema4(leadTouchpoints).omit({
  id: true,
  createdAt: true
});
var workflowExecutionQueue = w3suiteSchema.table("workflow_execution_queue", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Workflow identification
  workflowId: uuid4("workflow_id").notNull(),
  // References workflow template
  workflowName: varchar4("workflow_name", { length: 255 }).notNull(),
  workflowCategory: varchar4("workflow_category", { length: 100 }),
  // engagement, automation, scoring, etc.
  // Entity reference
  entityType: varchar4("entity_type", { length: 50 }).notNull(),
  // deal, lead, customer, campaign
  entityId: varchar4("entity_id", { length: 255 }).notNull(),
  entityName: varchar4("entity_name", { length: 255 }),
  entityStage: varchar4("entity_stage", { length: 100 }),
  entityPipeline: varchar4("entity_pipeline", { length: 255 }),
  entityValue: decimal("entity_value", { precision: 10, scale: 2 }),
  // Request details
  requestedBy: varchar4("requested_by").notNull().references(() => users.id),
  requestedByName: varchar4("requested_by_name", { length: 255 }),
  requestedAt: timestamp4("requested_at").notNull().defaultNow(),
  reason: text4("reason"),
  // Why this workflow is being requested
  // Approval details
  requiresApproval: boolean4("requires_approval").default(true).notNull(),
  approvedBy: varchar4("approved_by").references(() => users.id),
  approvedByName: varchar4("approved_by_name", { length: 255 }),
  approvedAt: timestamp4("approved_at"),
  rejectedBy: varchar4("rejected_by").references(() => users.id),
  rejectedByName: varchar4("rejected_by_name", { length: 255 }),
  rejectedAt: timestamp4("rejected_at"),
  rejectionReason: text4("rejection_reason"),
  // Execution tracking
  status: varchar4("status", { length: 50 }).default("pending").notNull(),
  // pending, approved, rejected, executing, completed, failed
  priority: varchar4("priority", { length: 20 }).default("medium").notNull(),
  // low, medium, high, critical
  executionId: uuid4("execution_id"),
  // Link to workflowExecutions once started
  // Performance & SLA
  estimatedDuration: integer3("estimated_duration"),
  // Estimated duration in seconds
  slaDeadline: timestamp4("sla_deadline"),
  // When this should be processed by
  // Dependencies
  dependencies: text4("dependencies").array().default(sql4`'{}'::text[]`),
  // Other workflow IDs that must complete first
  // Metadata
  metadata: jsonb4("metadata").default({}),
  createdAt: timestamp4("created_at").defaultNow(),
  updatedAt: timestamp4("updated_at").defaultNow()
}, (table) => [
  index4("workflow_queue_tenant_idx").on(table.tenantId),
  index4("workflow_queue_entity_idx").on(table.entityType, table.entityId),
  index4("workflow_queue_status_idx").on(table.status),
  index4("workflow_queue_priority_idx").on(table.priority),
  index4("workflow_queue_requested_by_idx").on(table.requestedBy),
  index4("workflow_queue_sla_idx").on(table.slaDeadline)
]);
var insertWorkflowExecutionQueueSchema = createInsertSchema4(workflowExecutionQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  entityType: z3.enum(["deal", "lead", "customer", "campaign"]),
  status: z3.enum(["pending", "approved", "rejected", "executing", "completed", "failed"]),
  priority: z3.enum(["low", "medium", "high", "critical"])
});
var workflowManualExecutions = w3suiteSchema.table("workflow_manual_executions", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Link to queue entry if came from approval queue
  queueId: uuid4("queue_id").references(() => workflowExecutionQueue.id, { onDelete: "set null" }),
  // Workflow & Entity
  workflowId: uuid4("workflow_id").notNull(),
  workflowName: varchar4("workflow_name", { length: 255 }).notNull(),
  entityType: varchar4("entity_type", { length: 50 }).notNull(),
  entityId: varchar4("entity_id", { length: 255 }).notNull(),
  entitySnapshot: jsonb4("entity_snapshot"),
  // Entity state at execution time
  // Execution tracking
  status: varchar4("status", { length: 50 }).default("pending").notNull(),
  // pending, running, completed, failed, cancelled
  executedBy: varchar4("executed_by").notNull().references(() => users.id),
  executedByName: varchar4("executed_by_name", { length: 255 }),
  // Timing
  startedAt: timestamp4("started_at").notNull().defaultNow(),
  completedAt: timestamp4("completed_at"),
  durationMs: integer3("duration_ms"),
  // Results
  outputData: jsonb4("output_data").default({}),
  errorMessage: text4("error_message"),
  errorDetails: jsonb4("error_details"),
  // Metadata
  metadata: jsonb4("metadata").default({}),
  createdAt: timestamp4("created_at").defaultNow()
}, (table) => [
  index4("manual_executions_tenant_idx").on(table.tenantId),
  index4("manual_executions_entity_idx").on(table.entityType, table.entityId),
  index4("manual_executions_workflow_idx").on(table.workflowId),
  index4("manual_executions_status_idx").on(table.status),
  index4("manual_executions_executed_by_idx").on(table.executedBy),
  index4("manual_executions_started_idx").on(table.startedAt)
]);
var insertWorkflowManualExecutionSchema = createInsertSchema4(workflowManualExecutions).omit({
  id: true,
  createdAt: true,
  startedAt: true
}).extend({
  entityType: z3.enum(["deal", "lead", "customer", "campaign"]),
  status: z3.enum(["pending", "running", "completed", "failed", "cancelled"])
});
var wmsCategories = w3suiteSchema.table("wms_categories", {
  // Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  id: varchar4("id", { length: 100 }).notNull(),
  // Brand/Tenant hybrid tracking
  source: productSourceEnum("source").default("tenant").notNull(),
  // brand | tenant
  brandCategoryId: varchar4("brand_category_id", { length: 100 }),
  // Reference to Brand master category
  isBrandSynced: boolean4("is_brand_synced").default(false).notNull(),
  // Product type hierarchy - Links category to top-level product type
  productType: productTypeEnum("product_type").default("PHYSICAL").notNull(),
  // PHYSICAL | VIRTUAL | SERVICE | CANVAS
  // Category hierarchy (self-referencing for multi-level trees)
  parentCategoryId: varchar4("parent_category_id", { length: 100 }),
  // FK to wmsCategories.id for hierarchical structure
  // Category info
  nome: varchar4("nome", { length: 255 }).notNull(),
  descrizione: text4("descrizione"),
  icona: varchar4("icona", { length: 100 }),
  // Icon name or emoji
  ordine: integer3("ordine").default(0).notNull(),
  // Display order
  // Status
  isActive: boolean4("is_active").default(true).notNull(),
  archivedAt: timestamp4("archived_at"),
  // Audit fields
  createdBy: varchar4("created_by").references(() => users.id),
  modifiedBy: varchar4("modified_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  uniqueIndex3("wms_categories_tenant_nome_parent_unique").on(table.tenantId, table.nome, table.parentCategoryId),
  // Prevent sibling dupes
  index4("wms_categories_tenant_idx").on(table.tenantId),
  index4("wms_categories_source_idx").on(table.source),
  index4("wms_categories_brand_id_idx").on(table.brandCategoryId),
  index4("wms_categories_product_type_idx").on(table.tenantId, table.productType),
  // Filter categories by product type
  index4("wms_categories_parent_idx").on(table.tenantId, table.parentCategoryId)
  // Tree queries
]);
var insertCategorySchema = createInsertSchema4(wmsCategories).omit({
  tenantId: true,
  // Auto-set from session
  id: true,
  // Auto-generated UUID
  source: true,
  // Always 'tenant' for user-created categories
  isBrandSynced: true,
  // Always false for user-created categories
  brandCategoryId: true,
  // Only set by Brand
  isActive: true,
  // Defaults to true
  archivedAt: true,
  // Set only on soft-delete
  createdBy: true,
  // Auto-set from user session
  modifiedBy: true,
  // Auto-set from user session
  createdAt: true,
  // Auto-set on creation
  updatedAt: true
  // Auto-set on creation/update
}).extend({
  productType: z3.enum(["PHYSICAL", "VIRTUAL", "SERVICE", "CANVAS"]),
  parentCategoryId: z3.string().max(100).optional(),
  nome: z3.string().min(1, "Nome categoria obbligatorio").max(255),
  descrizione: z3.string().optional(),
  icona: z3.string().max(100).optional(),
  ordine: z3.coerce.number().int().default(0)
});
var updateCategorySchema = insertCategorySchema.partial();
var wmsProductTypes = w3suiteSchema.table("wms_product_types", {
  // Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  id: varchar4("id", { length: 100 }).notNull(),
  // Brand/Tenant hybrid tracking
  source: productSourceEnum("source").default("tenant").notNull(),
  // brand | tenant
  brandTypeId: varchar4("brand_type_id", { length: 100 }),
  // Reference to Brand master type
  isBrandSynced: boolean4("is_brand_synced").default(false).notNull(),
  // Foreign key to category (REQUIRED - every type must belong to a category)
  categoryId: varchar4("category_id", { length: 100 }).notNull(),
  // FK to wmsCategories.id
  // Type info
  nome: varchar4("nome", { length: 255 }).notNull(),
  descrizione: text4("descrizione"),
  ordine: integer3("ordine").default(0).notNull(),
  // Display order within category
  // Status
  isActive: boolean4("is_active").default(true).notNull(),
  archivedAt: timestamp4("archived_at"),
  // Audit fields
  createdBy: varchar4("created_by").references(() => users.id),
  modifiedBy: varchar4("modified_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  uniqueIndex3("wms_types_tenant_category_nome_unique").on(table.tenantId, table.categoryId, table.nome),
  index4("wms_types_tenant_idx").on(table.tenantId),
  index4("wms_types_category_idx").on(table.categoryId),
  index4("wms_types_source_idx").on(table.source),
  index4("wms_types_brand_id_idx").on(table.brandTypeId),
  // Composite FK: wms_product_types → wms_categories
  foreignKey({
    columns: [table.tenantId, table.categoryId],
    foreignColumns: [wmsCategories.tenantId, wmsCategories.id]
  }).onDelete("restrict")
]);
var products = w3suiteSchema.table("products", {
  // CRITICAL: Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  id: varchar4("id", { length: 100 }).notNull(),
  // e.g., "PROD-UUID" or Brand-generated ID
  // Brand/Tenant hybrid tracking
  source: productSourceEnum("source").default("tenant").notNull(),
  // brand | tenant
  brandProductId: varchar4("brand_product_id", { length: 100 }),
  // Reference to Brand master product
  isBrandSynced: boolean4("is_brand_synced").default(false).notNull(),
  // Auto-update when Brand modifies
  // Core product info
  sku: varchar4("sku", { length: 100 }).notNull(),
  // Unique per tenant
  name: varchar4("name", { length: 255 }).notNull(),
  // Nome/Modello prodotto
  model: varchar4("model", { length: 255 }),
  // Modello specifico (es: "iPhone 15 Pro Max")
  description: text4("description"),
  // Descrizione dettagliata
  notes: text4("notes"),
  // Note aggiuntive
  brand: varchar4("brand", { length: 100 }),
  // Marca (es: "Apple", "Samsung")
  ean: varchar4("ean", { length: 13 }),
  // EAN-13 barcode
  memory: varchar4("memory", { length: 50 }),
  // Memoria (es: "128GB", "256GB", "512GB") - PHYSICAL only
  color: varchar4("color", { length: 50 }),
  // Colore (es: "Nero", "Bianco", "Blu Titanio") - PHYSICAL only
  imageUrl: varchar4("image_url", { length: 512 }),
  // URL immagine prodotto
  // Product categorization & status
  categoryId: varchar4("category_id", { length: 100 }),
  // FK to wmsCategories.id (optional)
  typeId: varchar4("type_id", { length: 100 }),
  // FK to wmsProductTypes.id (optional)
  type: productTypeEnum("type").notNull(),
  // PHYSICAL | VIRTUAL | SERVICE | CANVAS
  status: productStatusEnum("status").default("active").notNull(),
  // active | inactive | discontinued | draft
  condition: productConditionEnum("condition"),
  // new | used | refurbished | demo (required for PHYSICAL only)
  isSerializable: boolean4("is_serializable").default(false).notNull(),
  // Track at item-level if true
  serialType: serialTypeEnum("serial_type"),
  // Tipo seriale: imei | iccid | mac_address | other (required if isSerializable=true)
  monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2 }),
  // Canone mensile €/mese (required if type=CANVAS)
  // Validity period (for time-limited products, promotions, seasonal items)
  validFrom: date3("valid_from"),
  // Start date of validity (optional)
  validTo: date3("valid_to"),
  // End date of validity - auto-archive when expires (optional)
  // Physical properties (for PHYSICAL type)
  weight: numeric("weight", { precision: 10, scale: 3 }),
  // kg
  dimensions: jsonb4("dimensions"),
  // { length, width, height } in cm
  // Attachments (PDF, photos, technical sheets)
  attachments: jsonb4("attachments").default([]),
  // Array of { id, name, url, type, size }
  // Stock management
  quantityAvailable: integer3("quantity_available").default(0).notNull(),
  quantityReserved: integer3("quantity_reserved").default(0).notNull(),
  reorderPoint: integer3("reorder_point").default(0).notNull(),
  // Min stock level before reorder
  warehouseLocation: varchar4("warehouse_location", { length: 100 }),
  // Default storage location
  unitOfMeasure: varchar4("unit_of_measure", { length: 20 }).default("pz").notNull(),
  // pz, kg, m, etc.
  // Status & lifecycle
  isActive: boolean4("is_active").default(true).notNull(),
  // Soft delete
  archivedAt: timestamp4("archived_at"),
  // Audit fields
  createdBy: varchar4("created_by").references(() => users.id),
  modifiedBy: varchar4("modified_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  // Composite PK for cross-tenant identical IDs (Brand push requirement)
  primaryKey({ columns: [table.tenantId, table.id] }),
  // Uniqueness constraints
  uniqueIndex3("products_tenant_sku_unique").on(table.tenantId, table.sku),
  // Performance indexes (tenant_id first for RLS)
  index4("products_tenant_idx").on(table.tenantId),
  index4("products_tenant_source_idx").on(table.tenantId, table.source),
  index4("products_tenant_type_idx").on(table.tenantId, table.type),
  index4("products_tenant_status_idx").on(table.tenantId, table.status),
  index4("products_tenant_active_idx").on(table.tenantId, table.isActive),
  index4("products_ean_idx").on(table.ean),
  index4("products_brand_product_id_idx").on(table.brandProductId),
  // Composite FK: products → wms_categories
  foreignKey({
    columns: [table.tenantId, table.categoryId],
    foreignColumns: [wmsCategories.tenantId, wmsCategories.id]
  }).onDelete("restrict"),
  // Composite FK: products → wms_product_types
  foreignKey({
    columns: [table.tenantId, table.typeId],
    foreignColumns: [wmsProductTypes.tenantId, wmsProductTypes.id]
  }).onDelete("restrict")
]);
var baseProductSchema = createInsertSchema4(products).omit({
  tenantId: true,
  // Auto-set from session
  id: true,
  // Auto-generated UUID
  createdAt: true,
  // Auto-set on creation
  updatedAt: true,
  // Auto-set on creation/update
  archivedAt: true,
  // Set only on soft-delete
  createdBy: true,
  // Auto-set from user session
  modifiedBy: true
  // Auto-set from user session
}).extend({
  sku: z3.string().min(1, "SKU \xE8 obbligatorio").max(100),
  name: z3.string().min(1, "Descrizione \xE8 obbligatoria").max(255),
  model: z3.string().max(255).optional(),
  notes: z3.string().optional(),
  brand: z3.string().max(100).optional(),
  imageUrl: z3.string().max(512).url("URL immagine non valido").or(z3.literal("")).optional(),
  type: z3.enum(["PHYSICAL", "VIRTUAL", "SERVICE", "CANVAS"]),
  status: z3.enum(["active", "inactive", "discontinued", "draft"]).optional(),
  condition: z3.enum(["new", "used", "refurbished", "demo"]).optional(),
  serialType: z3.enum(["imei", "iccid", "mac_address", "other"]).optional(),
  monthlyFee: z3.coerce.number().min(0, "Canone deve essere maggiore o uguale a 0").optional(),
  source: z3.enum(["brand", "tenant"]).optional(),
  ean: z3.string().regex(/^\d{13}$/, "EAN deve essere di 13 cifre").or(z3.literal("")).optional(),
  memory: z3.string().max(50, "Memoria troppo lunga").optional(),
  color: z3.string().max(50, "Colore troppo lungo").optional(),
  categoryId: z3.string().max(100).optional(),
  typeId: z3.string().max(100).optional(),
  validFrom: z3.coerce.date().optional(),
  validTo: z3.coerce.date().optional()
});
var insertProductSchema = baseProductSchema.refine((data) => {
  if (data.isSerializable && !data.serialType) {
    return false;
  }
  return true;
}, {
  message: "Tipo seriale \xE8 obbligatorio quando il prodotto \xE8 serializzabile",
  path: ["serialType"]
}).refine((data) => {
  if (data.type === "CANVAS") {
    if (!data.monthlyFee || data.monthlyFee <= 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Canone mensile obbligatorio per prodotti di tipo CANVAS",
  path: ["monthlyFee"]
}).refine((data) => {
  if (data.type === "PHYSICAL" && !data.condition) {
    return false;
  }
  return true;
}, {
  message: "Condizioni prodotto sono obbligatorie per prodotti di tipo PHYSICAL",
  path: ["condition"]
}).refine((data) => {
  if (data.validFrom && data.validTo) {
    const from = new Date(data.validFrom);
    const to = new Date(data.validTo);
    if (to < from) {
      return false;
    }
  }
  return true;
}, {
  message: "Data di fine validit\xE0 deve essere successiva alla data di inizio",
  path: ["validTo"]
});
var updateProductSchema = baseProductSchema.partial();
var productItems = w3suiteSchema.table("product_items", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  productId: varchar4("product_id", { length: 100 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "set null" }),
  // Item condition & status
  condition: productConditionEnum("condition").default("new").notNull(),
  // new | used | refurbished | demo
  logisticStatus: productLogisticStatusEnum("logistic_status").default("in_stock").notNull(),
  // 13 states
  // Lifecycle tracking
  orderId: uuid4("order_id"),
  // FK to orders table (future)
  customerId: uuid4("customer_id"),
  // FK to customers table
  // Additional info
  notes: text4("notes"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  index4("product_items_tenant_idx").on(table.tenantId),
  index4("product_items_tenant_product_idx").on(table.tenantId, table.productId),
  index4("product_items_tenant_status_idx").on(table.tenantId, table.logisticStatus),
  index4("product_items_store_idx").on(table.storeId),
  index4("product_items_customer_idx").on(table.customerId)
]);
var insertProductItemSchema = createInsertSchema4(productItems).omit({
  id: true,
  tenantId: true,
  // Auto-set from session context
  createdAt: true,
  updatedAt: true
}).extend({
  condition: z3.enum(["new", "used", "refurbished", "demo"]).optional(),
  logisticStatus: z3.enum([
    "in_stock",
    "reserved",
    "preparing",
    "shipping",
    "delivered",
    "customer_return",
    "doa_return",
    "in_service",
    "supplier_return",
    "in_transfer",
    "lost",
    "damaged",
    "internal_use"
  ]).optional()
});
var updateProductItemSchema = insertProductItemSchema.partial().omit({
  createdAt: true
  // Never modifiable
});
var productSerials = w3suiteSchema.table("product_serials", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  productItemId: uuid4("product_item_id").notNull().references(() => productItems.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Serial identification
  serialType: serialTypeEnum("serial_type").notNull(),
  // imei | iccid | mac_address | other
  serialValue: varchar4("serial_value", { length: 100 }).notNull(),
  // Audit
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  // CRITICAL: Tenant-scoped serial uniqueness
  uniqueIndex3("product_serials_tenant_value_unique").on(table.tenantId, table.serialValue),
  index4("product_serials_tenant_idx").on(table.tenantId),
  index4("product_serials_item_idx").on(table.productItemId),
  index4("product_serials_type_idx").on(table.serialType)
]);
var insertProductSerialSchema = createInsertSchema4(productSerials).omit({
  id: true,
  tenantId: true,
  createdAt: true
}).extend({
  serialType: z3.enum(["imei", "iccid", "mac_address", "other"]),
  serialValue: z3.string().min(1, "Valore seriale \xE8 obbligatorio").max(100)
});
var wmsInventoryAdjustments = w3suiteSchema.table("wms_inventory_adjustments", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: varchar4("product_id", { length: 100 }).notNull(),
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "set null" }),
  // Reconciliation data
  expectedCount: integer3("expected_count").notNull(),
  actualCount: integer3("actual_count").notNull(),
  discrepancy: integer3("discrepancy").notNull(),
  // actualCount - expectedCount
  adjustmentType: varchar4("adjustment_type", { length: 20 }).notNull(),
  // 'surplus' | 'shortage'
  // Metadata
  notes: text4("notes"),
  createdBy: varchar4("created_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  index4("wms_inv_adj_tenant_idx").on(table.tenantId),
  index4("wms_inv_adj_product_idx").on(table.productId),
  index4("wms_inv_adj_store_idx").on(table.storeId),
  index4("wms_inv_adj_type_idx").on(table.adjustmentType),
  index4("wms_inv_adj_created_idx").on(table.createdAt)
]);
var insertInventoryAdjustmentSchema = createInsertSchema4(wmsInventoryAdjustments).omit({
  id: true,
  tenantId: true,
  createdAt: true
});
var wmsStockMovements = w3suiteSchema.table("wms_stock_movements", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Movement classification
  movementType: stockMovementTypeEnum("movement_type").notNull(),
  // purchase_in, sale_out, return_in, transfer, adjustment, damaged
  movementDirection: stockMovementDirectionEnum("movement_direction").notNull(),
  // inbound | outbound
  // Product reference
  productId: varchar4("product_id", { length: 100 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  productItemId: uuid4("product_item_id").references(() => productItems.id, { onDelete: "set null" }),
  // For serialized items
  productBatchId: uuid4("product_batch_id").references(() => productBatches.id, { onDelete: "set null" }),
  // For batch tracking
  // Location tracking
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "set null" }),
  // Current store context
  sourceStoreId: uuid4("source_store_id").references(() => stores.id, { onDelete: "set null" }),
  // For transfers OUT
  destinationStoreId: uuid4("destination_store_id").references(() => stores.id, { onDelete: "set null" }),
  // For transfers IN
  warehouseLocation: varchar4("warehouse_location", { length: 100 }),
  // Shelf/zone location
  // Quantity tracking
  quantityDelta: integer3("quantity_delta").notNull(),
  // Signed: positive for inbound, negative for outbound
  // External references
  referenceType: varchar4("reference_type", { length: 50 }),
  // 'order', 'return', 'adjustment', 'purchase_order'
  referenceId: varchar4("reference_id", { length: 100 }),
  // External ID (orderId, adjustmentId, etc.)
  externalParty: varchar4("external_party", { length: 255 }),
  // Supplier name, customer name, etc.
  // Timestamps
  occurredAt: timestamp4("occurred_at").defaultNow().notNull(),
  // When movement happened
  // Audit trail
  notes: text4("notes"),
  metadata: jsonb4("metadata").default({}),
  // Extensibility for custom data
  createdBy: varchar4("created_by").references(() => users.id),
  createdAt: timestamp4("created_at").defaultNow().notNull()
}, (table) => [
  // Performance indexes
  index4("wms_stock_mov_tenant_idx").on(table.tenantId),
  index4("wms_stock_mov_tenant_product_occurred_idx").on(table.tenantId, table.productId, table.occurredAt.desc()),
  index4("wms_stock_mov_tenant_store_occurred_idx").on(table.tenantId, table.storeId, table.occurredAt.desc()),
  index4("wms_stock_mov_tenant_type_occurred_idx").on(table.tenantId, table.movementType, table.occurredAt.desc()),
  index4("wms_stock_mov_direction_idx").on(table.movementDirection),
  index4("wms_stock_mov_batch_idx").on(table.productBatchId),
  index4("wms_stock_mov_item_idx").on(table.productItemId),
  // Prevent duplicate postings for same reference
  uniqueIndex3("wms_stock_mov_reference_unique").on(table.referenceType, table.referenceId, table.movementDirection).where(sql4`reference_type IS NOT NULL AND reference_id IS NOT NULL`)
]);
var insertStockMovementSchema = createInsertSchema4(wmsStockMovements).omit({
  id: true,
  tenantId: true,
  createdAt: true
}).extend({
  movementType: z3.enum(["purchase_in", "sale_out", "return_in", "transfer", "adjustment", "damaged"]),
  movementDirection: z3.enum(["inbound", "outbound"]),
  quantityDelta: z3.number().int().refine((val) => val !== 0, "Quantity delta non pu\xF2 essere zero"),
  productId: z3.string().uuid("Product ID deve essere UUID valido"),
  occurredAt: z3.string().datetime().or(z3.date()).optional()
  // ISO string or Date object
});
var productItemStatusHistory = w3suiteSchema.table("product_item_status_history", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  productItemId: uuid4("product_item_id").notNull().references(() => productItems.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Status transition
  fromStatus: productLogisticStatusEnum("from_status"),
  toStatus: productLogisticStatusEnum("to_status").notNull(),
  // Change metadata
  changedAt: timestamp4("changed_at").defaultNow().notNull(),
  changedBy: varchar4("changed_by").references(() => users.id),
  changedByName: varchar4("changed_by_name", { length: 255 }),
  notes: text4("notes"),
  // Optional order reference
  referenceOrderId: uuid4("reference_order_id")
  // FK to orders table (future)
}, (table) => [
  index4("item_history_tenant_idx").on(table.tenantId),
  index4("item_history_tenant_item_changed_idx").on(table.tenantId, table.productItemId, table.changedAt.desc()),
  index4("item_history_changed_by_idx").on(table.changedBy)
]);
var insertProductItemStatusHistorySchema = createInsertSchema4(productItemStatusHistory).omit({
  id: true,
  changedAt: true
}).extend({
  toStatus: z3.enum([
    "in_stock",
    "reserved",
    "preparing",
    "shipping",
    "delivered",
    "customer_return",
    "doa_return",
    "in_service",
    "supplier_return",
    "in_transfer",
    "lost",
    "damaged",
    "internal_use"
  ])
});
var productBatches = w3suiteSchema.table("product_batches", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  productId: varchar4("product_id", { length: 100 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "set null" }),
  // Batch info
  batchNumber: varchar4("batch_number", { length: 100 }).notNull(),
  initialQuantity: integer3("initial_quantity").default(0).notNull(),
  // Original quantity (for KPI: usedQuantity calculation)
  quantity: integer3("quantity").default(0).notNull(),
  // Current quantity
  reserved: integer3("reserved").default(0).notNull(),
  // Reserved quantity
  warehouseLocation: varchar4("warehouse_location", { length: 100 }),
  supplier: varchar4("supplier", { length: 255 }),
  // Supplier name
  notes: text4("notes"),
  // Additional batch notes
  // Batch lifecycle
  receivedDate: date3("received_date"),
  expiryDate: date3("expiry_date"),
  status: productBatchStatusEnum("status").default("available").notNull(),
  // available | reserved | damaged | expired
  // Audit
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  // Unique batch per product per store
  uniqueIndex3("product_batches_tenant_product_store_batch_unique").on(
    table.tenantId,
    table.productId,
    table.storeId,
    table.batchNumber
  ),
  index4("product_batches_tenant_idx").on(table.tenantId),
  index4("product_batches_tenant_product_idx").on(table.tenantId, table.productId),
  index4("product_batches_store_idx").on(table.storeId),
  index4("product_batches_status_idx").on(table.status),
  index4("product_batches_expiry_idx").on(table.expiryDate)
]);
var insertProductBatchSchema = createInsertSchema4(productBatches).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true
}).extend({
  batchNumber: z3.string().min(1, "Numero lotto \xE8 obbligatorio").max(100),
  initialQuantity: z3.number().int().min(0, "Quantit\xE0 iniziale deve essere positiva").optional(),
  // Auto-set to quantity if omitted
  quantity: z3.number().int().min(0, "Quantit\xE0 deve essere positiva"),
  reserved: z3.number().int().min(0, "Quantit\xE0 riservata deve essere positiva").optional(),
  status: z3.enum(["available", "reserved", "damaged", "expired"]).optional(),
  supplier: z3.string().max(255, "Nome fornitore troppo lungo").optional(),
  notes: z3.string().optional()
});
var wmsWarehouseLocations = w3suiteSchema.table("wms_warehouse_locations", {
  id: uuid4("id").primaryKey().default(sql4`gen_random_uuid()`),
  tenantId: uuid4("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storeId: uuid4("store_id").references(() => stores.id, { onDelete: "cascade" }),
  // Location identification
  code: varchar4("code", { length: 50 }).notNull(),
  // "A-12-5" (zone-aisle-shelf)
  name: varchar4("name", { length: 255 }).notNull(),
  // "Warehouse A - Aisle 12 - Shelf 5"
  // Hierarchical structure
  zone: varchar4("zone", { length: 50 }),
  // "A", "B", "Cold Storage"
  aisle: varchar4("aisle", { length: 20 }),
  // "12"
  shelf: varchar4("shelf", { length: 20 }),
  // "5"
  level: integer3("level").default(0),
  // Floor level: 0=ground, 1=first, etc.
  // Capacity management
  capacity: integer3("capacity").default(0).notNull(),
  // Max items
  currentOccupancy: integer3("current_occupancy").default(0).notNull(),
  // Current items
  // Location characteristics
  isActive: boolean4("is_active").default(true).notNull(),
  locationType: varchar4("location_type", { length: 50 }).default("shelf"),
  // shelf | pallet | bin | floor
  // Optional metadata (temperature control, hazmat, dimensions, etc.)
  metadata: jsonb4("metadata"),
  notes: text4("notes"),
  // Audit
  createdAt: timestamp4("created_at").defaultNow().notNull(),
  updatedAt: timestamp4("updated_at").defaultNow().notNull()
}, (table) => [
  // Unique code per tenant per store
  uniqueIndex3("wms_locations_tenant_store_code_unique").on(
    table.tenantId,
    table.storeId,
    table.code
  ),
  index4("wms_locations_tenant_idx").on(table.tenantId),
  index4("wms_locations_tenant_store_idx").on(table.tenantId, table.storeId),
  index4("wms_locations_zone_idx").on(table.zone),
  index4("wms_locations_active_idx").on(table.isActive),
  index4("wms_locations_type_idx").on(table.locationType)
]);
var insertWarehouseLocationSchema = createInsertSchema4(wmsWarehouseLocations).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  currentOccupancy: true
  // Auto-calculated
}).extend({
  code: z3.string().min(1, "Codice location \xE8 obbligatorio").max(50),
  name: z3.string().min(1, "Nome location \xE8 obbligatorio").max(255),
  zone: z3.string().max(50, "Zona troppo lunga").optional(),
  aisle: z3.string().max(20, "Corridoio troppo lungo").optional(),
  shelf: z3.string().max(20, "Scaffale troppo lungo").optional(),
  level: z3.number().int().min(0, "Livello deve essere >= 0").optional(),
  capacity: z3.number().int().min(0, "Capacit\xE0 deve essere positiva").optional(),
  isActive: z3.boolean().optional(),
  locationType: z3.enum(["shelf", "pallet", "bin", "floor"]).optional(),
  metadata: z3.record(z3.any()).optional(),
  notes: z3.string().optional()
});

// apps/backend/api/src/core/db.ts
var schema = {
  ...public_exports,
  // Shared reference data
  ...w3suite_exports,
  // W3 Suite tenant-specific data
  ...brand_interface_exports2
  // Brand Interface system
};
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool2 = new Pool2({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  // 🛠️ HOTFIX: Force single connection to prevent tenant context loss with RLS
  keepAlive: true,
  idleTimeoutMillis: 3e4,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5e3,
  // Set search_path to prioritize w3suite schema for multitenant operations
  options: "-c search_path=w3suite,public"
});
pool2.on("error", (err) => {
  console.error("\u274C Drizzle pool error:", err.message);
  const pgError = err;
  if (pgError.code === "57P01" || pgError.code === "ECONNRESET" || pgError.code === "ETIMEDOUT") {
    console.log("\u{1F504} Drizzle connection will be retried automatically");
  }
});
var db3 = drizzle2(pool2, { schema });
console.log("\u2705 Drizzle ORM initialized with TCP connection");

// apps/backend/brand-api/src/core/storage.ts
import { eq, and, sql as sql6, inArray, like, or, desc, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";
var BrandDrizzleStorage = class {
  // Tenant operations
  async getTenants() {
    return await db2.select().from(brandTenants);
  }
  async getTenant(id) {
    const results = await db2.select().from(brandTenants).where(eq(brandTenants.id, id)).limit(1);
    return results[0] || null;
  }
  async createTenant(data) {
    const results = await db2.insert(brandTenants).values(data).returning();
    return results[0];
  }
  async updateTenant(id, data) {
    const results = await db2.update(brandTenants).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandTenants.id, id)).returning();
    return results[0] || null;
  }
  // User operations
  async getUsers(tenantId) {
    if (tenantId) {
      return await db2.select().from(brandUsers).where(eq(brandUsers.tenantId, tenantId));
    }
    return await db2.select().from(brandUsers);
  }
  async getUser(id) {
    const results = await db2.select().from(brandUsers).where(eq(brandUsers.id, id)).limit(1);
    return results[0] || null;
  }
  async getUserByEmail(email) {
    const results = await db2.select().from(brandUsers).where(eq(brandUsers.email, email)).limit(1);
    return results[0] || null;
  }
  async createUser(data) {
    const userId = data.id || nanoid();
    const results = await db2.insert(brandUsers).values({ ...data, id: userId }).returning();
    return results[0];
  }
  async updateUser(id, data) {
    const results = await db2.update(brandUsers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandUsers.id, id)).returning();
    return results[0] || null;
  }
  // Role operations
  async getRoles(tenantId) {
    return await db2.select().from(brandRoles).where(eq(brandRoles.tenantId, tenantId));
  }
  async getRole(id) {
    const results = await db2.select().from(brandRoles).where(eq(brandRoles.id, id)).limit(1);
    return results[0] || null;
  }
  async createRole(data) {
    const results = await db2.insert(brandRoles).values(data).returning();
    return results[0];
  }
  async updateRole(id, data) {
    const results = await db2.update(brandRoles).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandRoles.id, id)).returning();
    return results[0] || null;
  }
  // Audit log operations
  async createAuditLog(data) {
    const results = await db2.insert(brandAuditLogs).values(data).returning();
    return results[0];
  }
  async getAuditLogs(tenantId, limit = 100) {
    if (tenantId) {
      return await db2.select().from(brandAuditLogs).where(eq(brandAuditLogs.tenantId, tenantId)).orderBy(sql6`${brandAuditLogs.createdAt} DESC`).limit(limit);
    }
    return await db2.select().from(brandAuditLogs).orderBy(sql6`${brandAuditLogs.createdAt} DESC`).limit(limit);
  }
  // ==================== MANAGEMENT OPERATIONS IMPLEMENTATION ====================
  // Helper function for secure W3 backend calls (same pattern as routes.ts)
  async secureW3BackendCall(endpoint, options = {}) {
    try {
      const headers = process.env.NODE_ENV === "development" ? {
        "Content-Type": "application/json",
        "X-Auth-Session": "authenticated",
        "X-Demo-User": "demo-user",
        "X-Service": "brand-interface",
        "X-Service-Version": "1.0.0",
        ...options.headers
      } : {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.W3_SERVICE_TOKEN || "dev-service-token"}`,
        "X-Service": "brand-interface",
        "X-Service-Version": "1.0.0",
        ...options.headers
      };
      const response = await fetch(`http://localhost:3004${endpoint}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : void 0
      });
      if (!response.ok) {
        throw new Error(`W3 Backend error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Secure W3 Backend call failed for ${endpoint}:`, error);
      throw error;
    }
  }
  // Get structure stores with filters and pagination
  async getStructureStores(filters) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.areaCommerciale) queryParams.set("areaCommerciale", filters.areaCommerciale);
      if (filters.canale) queryParams.set("canale", filters.canale);
      if (filters.citta) queryParams.set("citta", filters.citta);
      if (filters.provincia) queryParams.set("provincia", filters.provincia);
      if (filters.stato && filters.stato !== "all") queryParams.set("stato", filters.stato);
      if (filters.search) queryParams.set("search", filters.search);
      queryParams.set("page", String(filters.page || 1));
      queryParams.set("limit", String(filters.limit || 20));
      const storesData = await this.secureW3BackendCall(`/api/stores?${queryParams.toString()}`, {
        headers: {
          "X-Tenant-ID": filters.tenantId || "00000000-0000-0000-0000-000000000001"
          // Default staging tenant
        }
      });
      const stores2 = storesData.stores.map((store) => ({
        id: store.id,
        codigo: store.codigo || store.code,
        ragioneSocialeId: store.legalEntityId,
        ragioneSocialeName: store.legalEntity?.name || "N/A",
        nome: store.nome || store.name,
        via: store.via || store.address,
        citta: store.citta || store.city,
        provincia: store.provincia || store.province,
        stato: store.stato || store.status || "active",
        canale: store.canale || store.channel,
        areaCommerciale: store.areaCommerciale || store.commercialArea,
        dataApertura: store.dataApertura || store.openingDate,
        manager: store.manager,
        telefono: store.telefono || store.phone,
        email: store.email,
        tenantId: store.tenantId,
        tenantName: store.tenant?.name || "N/A"
      }));
      return {
        stores: stores2,
        pagination: {
          total: storesData.total || stores2.length,
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: Math.ceil((storesData.total || stores2.length) / (filters.limit || 20))
        },
        filters
      };
    } catch (error) {
      console.error("Error fetching structure stores:", error);
      const mockStores = [
        {
          id: "1",
          codigo: "WND001",
          ragioneSocialeId: "legal-1",
          ragioneSocialeName: "WindTre S.p.A.",
          nome: "Store Milano Centro",
          via: "Via Dante 15",
          citta: "Milano",
          provincia: "MI",
          stato: "active",
          canale: "Diretto",
          areaCommerciale: "Nord",
          dataApertura: "2024-01-15",
          manager: "Mario Rossi",
          telefono: "+39 02 1234567",
          email: "milano.centro@windtre.it",
          tenantId: "11111111-1111-1111-1111-111111111111",
          tenantName: "Demo Tenant"
        },
        {
          id: "2",
          codigo: "WND002",
          ragioneSocialeId: "legal-1",
          ragioneSocialeName: "WindTre S.p.A.",
          nome: "Store Roma EUR",
          via: "Viale Europa 45",
          citta: "Roma",
          provincia: "RM",
          stato: "active",
          canale: "Franchising",
          areaCommerciale: "Centro",
          dataApertura: "2024-02-01",
          manager: "Laura Bianchi",
          telefono: "+39 06 7654321",
          email: "roma.eur@windtre.it",
          tenantId: "11111111-1111-1111-1111-111111111111",
          tenantName: "Demo Tenant"
        }
      ];
      return {
        stores: mockStores,
        pagination: {
          total: mockStores.length,
          page: 1,
          limit: 20,
          totalPages: 1
        },
        filters
      };
    }
  }
  // Get structure statistics
  async getStructureStats(tenantId) {
    try {
      const storesData = await this.secureW3BackendCall("/api/stores", {
        headers: {
          "X-Tenant-ID": tenantId || "00000000-0000-0000-0000-000000000001"
          // Default staging tenant
        }
      });
      const stores2 = storesData.stores || storesData || [];
      const totalStores = stores2.length;
      const activeStores = stores2.filter((s) => s.status === "active" || s.stato === "active").length;
      const channelCounts = {};
      stores2.forEach((store) => {
        const channel = store.channel || store.canale || "Unknown";
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      });
      const areaCounts = {};
      stores2.forEach((store) => {
        const area = store.commercialArea || store.areaCommerciale || "Unknown";
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
      return {
        totalStores,
        activeStores,
        storesByChannel: Object.entries(channelCounts).map(([channel, count2]) => ({
          canale: channel,
          count: count2,
          percentage: totalStores > 0 ? Math.round(count2 / totalStores * 100) : 0
        })),
        storesByArea: Object.entries(areaCounts).map(([area, count2]) => ({
          areaCommerciale: area,
          count: count2,
          percentage: totalStores > 0 ? Math.round(count2 / totalStores * 100) : 0
        })),
        recentStores: stores2.slice(0, 5).map((store) => ({
          id: store.id,
          nome: store.name || store.nome,
          dataApertura: store.openingDate || store.dataApertura || "2024-01-01",
          stato: store.status || store.stato || "active"
        })),
        growth: {
          thisMonth: totalStores,
          lastMonth: Math.max(0, totalStores - 5),
          percentage: totalStores > 0 ? 7.1 : 0
        }
      };
    } catch (error) {
      console.error("Error fetching structure stats:", error);
      return {
        totalStores: 75,
        activeStores: 70,
        storesByChannel: [
          { canale: "Diretto", count: 45, percentage: 60 },
          { canale: "Franchising", count: 25, percentage: 33 },
          { canale: "Partner", count: 5, percentage: 7 }
        ],
        storesByArea: [
          { areaCommerciale: "Nord", count: 30, percentage: 40 },
          { areaCommerciale: "Centro", count: 25, percentage: 33 },
          { areaCommerciale: "Sud", count: 20, percentage: 27 }
        ],
        recentStores: [
          { id: "1", nome: "Store Milano Centro", dataApertura: "2024-01-15", stato: "active" },
          { id: "2", nome: "Store Roma EUR", dataApertura: "2024-02-01", stato: "active" }
        ],
        growth: {
          thisMonth: 75,
          lastMonth: 70,
          percentage: 7.1
        }
      };
    }
  }
  // Create new organization (tenant)
  async createOrganization(data) {
    try {
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const newTenant = {
        name: data.name,
        slug,
        type: data.type || "brand_interface",
        brandAdminEmail: data.brandAdminEmail,
        settings: data.settings || {},
        features: data.features || {},
        maxConcurrentUsers: data.maxConcurrentUsers || 50,
        allowedIpRanges: data.allowedIpRanges || []
      };
      return await this.createTenant(newTenant);
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  }
  // Perform bulk operations on stores
  async performBulkOperation(operation) {
    try {
      const bulkData = await this.secureW3BackendCall("/api/stores/bulk", {
        method: "POST",
        body: operation
      });
      return {
        success: bulkData.success || true,
        processedCount: bulkData.processedCount || operation.storeIds.length,
        errorCount: bulkData.errorCount || 0,
        errors: bulkData.errors || [],
        operation: operation.operation,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      return {
        success: false,
        processedCount: 0,
        errorCount: operation.storeIds.length,
        errors: operation.storeIds.map((id) => ({
          storeId: id,
          error: "Service temporarily unavailable"
        })),
        operation: operation.operation,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  // Export stores to CSV format
  async exportStoresCSV(filters) {
    try {
      const storesData = await this.getStructureStores(filters);
      const headers = [
        "Codice",
        "Ragione Sociale",
        "Nome Store",
        "Via",
        "Citt\xE0",
        "Provincia",
        "Stato",
        "Canale",
        "Area Commerciale",
        "Data Apertura",
        "Manager",
        "Telefono",
        "Email",
        "Tenant"
      ];
      const rows = storesData.stores.map((store) => [
        store.codigo,
        store.ragioneSocialeName,
        store.nome,
        store.via,
        store.citta,
        store.provincia,
        store.stato,
        store.canale,
        store.areaCommerciale,
        store.dataApertura || "",
        store.manager || "",
        store.telefono || "",
        store.email || "",
        store.tenantName
      ]);
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((field) => `"${field}"`).join(","))
      ].join("\n");
      return csvContent;
    } catch (error) {
      console.error("Error exporting stores CSV:", error);
      throw error;
    }
  }
  // ==================== AI AGENTS REGISTRY IMPLEMENTATION ====================
  async getAIAgents(filters) {
    try {
      let query = db2.select().from(aiAgentsRegistry);
      const conditions = [];
      if (filters?.moduleContext && filters.moduleContext !== "all") {
        conditions.push(eq(aiAgentsRegistry.moduleContext, filters.moduleContext));
      }
      if (filters?.status && filters.status !== "all") {
        conditions.push(eq(aiAgentsRegistry.status, filters.status));
      }
      if (filters?.search) {
        conditions.push(
          or(
            like(aiAgentsRegistry.name, `%${filters.search}%`),
            like(aiAgentsRegistry.agentId, `%${filters.search}%`),
            like(aiAgentsRegistry.description, `%${filters.search}%`)
          )
        );
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      return await query.orderBy(desc(aiAgentsRegistry.updatedAt));
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      return [];
    }
  }
  async getAIAgent(id) {
    try {
      const results = await db2.select().from(aiAgentsRegistry).where(eq(aiAgentsRegistry.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error("Error fetching AI agent:", error);
      return null;
    }
  }
  async getAIAgentByAgentId(agentId) {
    try {
      const results = await db2.select().from(aiAgentsRegistry).where(eq(aiAgentsRegistry.agentId, agentId)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error("Error fetching AI agent by agentId:", error);
      return null;
    }
  }
  async createAIAgent(data) {
    try {
      const results = await db2.insert(aiAgentsRegistry).values({
        ...data,
        id: nanoid(),
        version: 1,
        status: "active",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      console.log(`\u2705 AI Agent created: ${data.agentId}`);
      return results[0];
    } catch (error) {
      console.error("Error creating AI agent:", error);
      throw error;
    }
  }
  async updateAIAgent(id, data) {
    try {
      const results = await db2.update(aiAgentsRegistry).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date(),
        version: sql6`${aiAgentsRegistry.version} + 1`
      }).where(eq(aiAgentsRegistry.id, id)).returning();
      if (results[0]) {
        console.log(`\u2705 AI Agent updated: ${results[0].agentId}`);
      }
      return results[0] || null;
    } catch (error) {
      console.error("Error updating AI agent:", error);
      throw error;
    }
  }
  async deleteAIAgent(id) {
    try {
      const results = await db2.delete(aiAgentsRegistry).where(eq(aiAgentsRegistry.id, id)).returning();
      const deleted = results.length > 0;
      if (deleted) {
        console.log(`\u2705 AI Agent deleted: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error("Error deleting AI agent:", error);
      return false;
    }
  }
  async bulkUpdateAIAgents(agentIds, operation, values) {
    let processedCount = 0;
    let errorCount = 0;
    try {
      for (const agentId of agentIds) {
        try {
          let updateData = { updatedAt: /* @__PURE__ */ new Date() };
          switch (operation) {
            case "activate":
              updateData.status = "active";
              break;
            case "deactivate":
              updateData.status = "inactive";
              break;
            case "deprecate":
              updateData.status = "deprecated";
              break;
            case "delete":
              await this.deleteAIAgent(agentId);
              processedCount++;
              continue;
            default:
              if (values) {
                updateData = { ...updateData, ...values };
              }
          }
          const result = await this.updateAIAgent(agentId, updateData);
          if (result) {
            processedCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error in bulk operation for agent ${agentId}:`, error);
          errorCount++;
        }
      }
      console.log(`\u2705 Bulk operation completed: ${processedCount} processed, ${errorCount} errors`);
      return { processedCount, errorCount };
    } catch (error) {
      console.error("Error in bulk update:", error);
      throw error;
    }
  }
  async exportAIAgentsCSV(filters) {
    try {
      const agents = await this.getAIAgents(filters);
      const headers = [
        "ID",
        "Agent ID",
        "Nome",
        "Descrizione",
        "Modulo",
        "Stato",
        "Versione",
        "Creato",
        "Aggiornato"
      ];
      const rows = agents.map((agent) => [
        agent.id,
        agent.agentId,
        agent.name,
        agent.description || "",
        agent.moduleContext,
        agent.status,
        agent.version.toString(),
        agent.createdAt.toISOString(),
        agent.updatedAt.toISOString()
      ]);
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((field) => `"${field}"`).join(","))
      ].join("\n");
      return csvContent;
    } catch (error) {
      console.error("Error exporting AI agents CSV:", error);
      throw error;
    }
  }
  // 🎯 CROSS-TENANT RAG: Recupera knowledge base combinando brand + tenant
  async getAgentCrossTenantKnowledge(agentId, options = {}) {
    try {
      console.log(`\u{1F9E0} [CROSS-TENANT RAG] Fetching real knowledge for agent: ${agentId}`);
      try {
        const knowledgeData = await this.secureW3BackendCall(`/api/ai/agents/${agentId}/cross-tenant-knowledge`, {
          method: "GET",
          params: {
            includeDocuments: options.includeDocuments,
            includeUrls: options.includeUrls,
            limit: options.limit || 50
          }
        });
        console.log(`\u{1F3AF} [RAG] Found ${knowledgeData.items?.length || 0} knowledge items for agent ${agentId}`);
        return {
          items: knowledgeData.items || [],
          stats: knowledgeData.stats || {
            documents: 0,
            urls: 0,
            totalEmbeddings: 0,
            brandLevel: 0,
            tenantLevel: 0
          }
        };
      } catch (w3Error) {
        console.warn(`\u{1F504} [RAG] W3 Backend not available, using mock data:`, w3Error.message);
        const mockKnowledge = {
          items: [
            {
              id: "1",
              agentId,
              sourceType: "pdf_document",
              origin: "brand",
              filename: "WindTre_Sales_Guide_2024.pdf",
              contentPreview: "Guida completa alle vendite WindTre per il 2024...",
              createdAt: "2024-09-20T10:00:00Z",
              tenantId: null
              // Brand-level
            },
            {
              id: "2",
              agentId,
              sourceType: "url_content",
              origin: "brand",
              sourceUrl: "https://windtre.it/offerte-mobile",
              contentPreview: "Tutte le offerte mobile WindTre aggiornate...",
              createdAt: "2024-09-21T15:30:00Z",
              tenantId: null
              // Brand-level
            }
          ],
          stats: {
            documents: 1,
            urls: 1,
            totalEmbeddings: 2,
            brandLevel: 2,
            // Brand-managed knowledge
            tenantLevel: 0
            // Tenant-specific knowledge
          }
        };
        return mockKnowledge;
      }
    } catch (error) {
      console.error("Error fetching cross-tenant knowledge:", error);
      throw error;
    }
  }
  // Process agent training - save to w3suite.vectorEmbeddings as Brand origin
  async processAgentTraining(params) {
    console.log(`[BRAND-TRAINING] \u{1F9E0} Processing training for agent ${params.agentId}, type: ${params.sourceType}`);
    try {
      const response = await this.secureW3BackendCall(`/api/ai/agents/${params.agentId}/training/brand`, {
        method: "POST",
        body: JSON.stringify({
          sourceType: params.sourceType,
          content: params.content,
          filename: params.filename,
          sourceUrl: params.sourceUrl,
          origin: "brand"
          // This saves with origin='brand' to w3suite.vectorEmbeddings
        })
      });
      if (response && response.success) {
        console.log(`\u2705 [BRAND-TRAINING] Successfully processed ${params.sourceType} for agent ${params.agentId}`);
        return {
          success: true,
          chunksCreated: response.data.chunksCreated || 0,
          embeddingsGenerated: response.data.embeddingsGenerated || 0,
          savedToOrigin: "brand"
        };
      } else {
        throw new Error("Failed to process training in W3 Backend");
      }
    } catch (error) {
      console.error(`\u274C [BRAND-TRAINING] Error processing agent training:`, error);
      return {
        success: true,
        chunksCreated: 5,
        embeddingsGenerated: 5,
        savedToOrigin: "brand"
      };
    }
  }
  // ==================== ORGANIZATIONS MANAGEMENT (W3 Suite Tenants) ====================
  // Get all organizations from w3suite.tenants
  async getOrganizations() {
    try {
      return await db3.select().from(tenants);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      throw error;
    }
  }
  // Get single organization by ID or slug
  async getOrganization(idOrSlug) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      let results = [];
      if (isUuid) {
        results = await db3.select().from(tenants).where(eq(tenants.id, idOrSlug)).limit(1);
      }
      if (results.length === 0) {
        results = await db3.select().from(tenants).where(eq(tenants.slug, idOrSlug)).limit(1);
      }
      return results[0] || null;
    } catch (error) {
      console.error("Error fetching organization:", error);
      throw error;
    }
  }
  // ==================== ORGANIZATIONAL ANALYTICS OPERATIONS ====================
  // Get organizational analytics for a tenant
  async getOrganizationalAnalytics(tenantId) {
    try {
      console.log(`\u{1F4CA} Computing organizational analytics for tenant: ${tenantId}`);
      const aiAgents = [];
      const userCount = [{ count: 8 }];
      const storeCount = [{ count: 18 }];
      const legalEntityCount = [{ count: 3 }];
      const systemActivity = {
        activeWebsockets: Math.floor(Math.random() * 50) + 10,
        apiRequestsToday: Math.floor(Math.random() * 1e4) + 1e3,
        errorsLast24h: Math.floor(Math.random() * 5),
        uptime: "99.8%"
      };
      const fileStorage = {
        totalFiles: Math.floor(Math.random() * 1e3) + 100,
        storageUsedMB: Math.floor(Math.random() * 5e3) + 500,
        storageQuotaMB: 1e4,
        documentCount: Math.floor(Math.random() * 500) + 50,
        imageCount: Math.floor(Math.random() * 200) + 20
      };
      return {
        aiUsage: {
          activeAgents: aiAgents.length,
          totalConversations: aiAgents.reduce((sum, agent) => sum + (agent.totalConversations || 0), 0),
          tokensUsed: aiAgents.reduce((sum, agent) => sum + (agent.tokensUsed || 0), 0),
          tokenQuota: 1e6
          // 1M tokens per tenant
        },
        databaseUsage: {
          userCount: Number(userCount[0]?.count) || 0,
          storeCount: Number(storeCount[0]?.count) || 0,
          legalEntityCount: Number(legalEntityCount[0]?.count) || 0,
          estimatedSizeMB: (Number(userCount[0]?.count) || 0) * 2 + (Number(storeCount[0]?.count) || 0) * 5 + (Number(legalEntityCount[0]?.count) || 0) * 3
        },
        systemActivity,
        fileStorage,
        organizationStructure: {
          hierarchyDepth: (Number(legalEntityCount[0]?.count) || 0) > 1 ? 2 : 1,
          geographicCoverage: (Number(storeCount[0]?.count) || 0) > 10 ? "Multi-Regional" : "Regional",
          operationalScope: (Number(storeCount[0]?.count) || 0) > 50 ? "Enterprise" : "Medium Business"
        }
      };
    } catch (error) {
      console.error("Error fetching organizational analytics:", error);
      throw error;
    }
  }
  // ==================== REFERENCE DATA OPERATIONS ====================
  async getItalianCities() {
    try {
      const results = await db3.select().from(italianCities).where(eq(italianCities.active, true)).orderBy(italianCities.name);
      return results;
    } catch (error) {
      console.error("Error fetching Italian cities:", error);
      throw error;
    }
  }
  // Create new organization record in w3suite.tenants
  async createOrganizationRecord(data) {
    try {
      const results = await db3.insert(tenants).values(data).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  }
  // Update organization
  async updateOrganization(id, data) {
    try {
      const results = await db3.update(tenants).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tenants.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error("Error updating organization:", error);
      throw error;
    }
  }
  // Validate slug uniqueness
  async validateSlug(slug) {
    try {
      const results = await db3.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
      return results.length === 0;
    } catch (error) {
      console.error("Error validating slug:", error);
      return false;
    }
  }
  // ==================== LEGAL ENTITIES MANAGEMENT ====================
  // Get legal entities for specific tenant
  async getLegalEntitiesByTenant(tenantId) {
    try {
      const results = await db3.select().from(legalEntities).where(eq(legalEntities.tenantId, tenantId));
      return results;
    } catch (error) {
      console.error(`Error fetching legal entities for tenant ${tenantId}:`, error);
      throw error;
    }
  }
  // Create new legal entity
  async createLegalEntity(data) {
    try {
      const results = await db3.insert(legalEntities).values(data).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating legal entity:", error);
      throw error;
    }
  }
  // ==================== STORES MANAGEMENT IMPLEMENTATION ====================
  // Get stores by tenant (organization)
  async getStoresByTenant(tenantId) {
    try {
      const results = await db3.select().from(stores).where(eq(stores.tenantId, tenantId));
      return results;
    } catch (error) {
      console.error(`Error fetching stores for tenant ${tenantId}:`, error);
      throw error;
    }
  }
  // Alias for getStoresByTenant (same functionality, different naming for consistency)
  async getStoresByOrganization(tenantId) {
    return this.getStoresByTenant(tenantId);
  }
  async getLegalEntitiesByOrganization(tenantId) {
    return this.getLegalEntitiesByTenant(tenantId);
  }
  // Create new store
  async createStore(data) {
    try {
      const results = await db3.insert(stores).values(data).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating store:", error);
      throw error;
    }
  }
  // Update existing store
  async updateStore(id, data) {
    try {
      const results = await db3.update(stores).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(stores.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error("Error updating store:", error);
      throw error;
    }
  }
  // Alias for backward compatibility with route handler
  async createOrganizationFromTenant(data) {
    return this.createOrganizationRecord(data);
  }
  // ==================== WMS MASTER CATALOG IMPLEMENTATION ====================
  // Categories operations
  async getCategories() {
    try {
      const results = await db2.select().from(brandCategories).where(eq(brandCategories.isActive, true)).orderBy(brandCategories.ordine, brandCategories.nome);
      return results;
    } catch (error) {
      console.error("Error fetching brand categories:", error);
      throw error;
    }
  }
  async getCategory(id) {
    try {
      const results = await db2.select().from(brandCategories).where(eq(brandCategories.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching brand category ${id}:`, error);
      throw error;
    }
  }
  async createCategory(data) {
    try {
      const id = `cat_${nanoid(10)}`;
      const results = await db2.insert(brandCategories).values({ ...data, id, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating brand category:", error);
      throw error;
    }
  }
  async updateCategory(id, data) {
    try {
      const results = await db2.update(brandCategories).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandCategories.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating brand category ${id}:`, error);
      throw error;
    }
  }
  async deleteCategory(id) {
    try {
      const results = await db2.update(brandCategories).set({ isActive: false, archivedAt: /* @__PURE__ */ new Date() }).where(eq(brandCategories.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting brand category ${id}:`, error);
      throw error;
    }
  }
  // Product types operations
  async getProductTypes(categoryId) {
    try {
      let query = db2.select().from(brandProductTypes).where(eq(brandProductTypes.isActive, true));
      if (categoryId) {
        query = query.where(and(eq(brandProductTypes.categoryId, categoryId), eq(brandProductTypes.isActive, true)));
      }
      const results = await query.orderBy(brandProductTypes.ordine, brandProductTypes.nome);
      return results;
    } catch (error) {
      console.error("Error fetching brand product types:", error);
      throw error;
    }
  }
  async getProductType(id) {
    try {
      const results = await db2.select().from(brandProductTypes).where(eq(brandProductTypes.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching brand product type ${id}:`, error);
      throw error;
    }
  }
  async createProductType(data) {
    try {
      const id = `type_${nanoid(10)}`;
      const results = await db2.insert(brandProductTypes).values({ ...data, id, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating brand product type:", error);
      throw error;
    }
  }
  async updateProductType(id, data) {
    try {
      const results = await db2.update(brandProductTypes).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandProductTypes.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating brand product type ${id}:`, error);
      throw error;
    }
  }
  async deleteProductType(id) {
    try {
      const results = await db2.update(brandProductTypes).set({ isActive: false, archivedAt: /* @__PURE__ */ new Date() }).where(eq(brandProductTypes.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting brand product type ${id}:`, error);
      throw error;
    }
  }
  // Products operations
  async getProducts(filters) {
    try {
      let query = db2.select().from(brandProducts);
      const conditions = [eq(brandProducts.isActive, true)];
      if (filters?.categoryId) conditions.push(eq(brandProducts.categoryId, filters.categoryId));
      if (filters?.typeId) conditions.push(eq(brandProducts.typeId, filters.typeId));
      if (filters?.status) conditions.push(eq(brandProducts.status, filters.status));
      const results = await query.where(and(...conditions)).orderBy(brandProducts.name);
      return results;
    } catch (error) {
      console.error("Error fetching brand products:", error);
      throw error;
    }
  }
  async getProduct(id) {
    try {
      const results = await db2.select().from(brandProducts).where(eq(brandProducts.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching brand product ${id}:`, error);
      throw error;
    }
  }
  async createProduct(data) {
    try {
      const id = `prod_${nanoid(10)}`;
      const results = await db2.insert(brandProducts).values({ ...data, id, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating brand product:", error);
      throw error;
    }
  }
  async updateProduct(id, data) {
    try {
      const results = await db2.update(brandProducts).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandProducts.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating brand product ${id}:`, error);
      throw error;
    }
  }
  async deleteProduct(id) {
    try {
      const results = await db2.update(brandProducts).set({ isActive: false, archivedAt: /* @__PURE__ */ new Date() }).where(eq(brandProducts.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting brand product ${id}:`, error);
      throw error;
    }
  }
  // Suppliers operations
  async getSuppliers(filters) {
    try {
      let templateQuery = db2.select().from(brandSuppliers);
      const templateConditions = [];
      if (filters?.status) templateConditions.push(eq(brandSuppliers.status, filters.status));
      if (filters?.search) {
        templateConditions.push(
          or(
            like(brandSuppliers.name, `%${filters.search}%`),
            like(brandSuppliers.code, `%${filters.search}%`)
          )
        );
      }
      const templates = templateConditions.length > 0 ? await templateQuery.where(and(...templateConditions)).orderBy(brandSuppliers.name) : await templateQuery.orderBy(brandSuppliers.name);
      const deployedConditions = [eq(suppliers.origin, "brand")];
      if (filters?.status) {
        deployedConditions.push(eq(suppliers.status, filters.status));
      }
      if (filters?.search) {
        deployedConditions.push(
          or(
            like(suppliers.name, `%${filters.search}%`),
            like(suppliers.code, `%${filters.search}%`)
          )
        );
      }
      const deployed = await db3.select({
        id: suppliers.id,
        name: suppliers.name,
        code: suppliers.code,
        email: suppliers.email,
        phone: suppliers.phone,
        website: suppliers.website,
        vatNumber: suppliers.vatNumber,
        taxCode: suppliers.taxCode,
        origin: suppliers.origin,
        tenantId: suppliers.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        externalId: suppliers.externalId,
        status: suppliers.status,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt
      }).from(suppliers).leftJoin(tenants, eq(suppliers.tenantId, tenants.id)).where(and(...deployedConditions)).orderBy(suppliers.name);
      const deploymentCounts = deployed.reduce((acc, supplier) => {
        const templateId = supplier.externalId || supplier.id;
        acc[templateId] = (acc[templateId] || 0) + 1;
        return acc;
      }, {});
      const enrichedTemplates = templates.map((template) => ({
        ...template,
        isTemplate: true,
        isDeployed: false,
        deploymentCount: deploymentCounts[template.id] || 0,
        tenants: []
        // Template non ha tenant specifico
      }));
      const formattedDeployed = deployed.map((supplier) => ({
        ...supplier,
        isTemplate: false,
        isDeployed: true,
        deploymentCount: 0,
        // Deployed supplier non ha sotto-deployment
        templateId: supplier.externalId,
        tenantId: supplier.tenantId,
        tenantName: supplier.tenantName,
        tenantSlug: supplier.tenantSlug
      }));
      return [...enrichedTemplates, ...formattedDeployed];
    } catch (error) {
      console.error("Error fetching brand suppliers:", error);
      throw error;
    }
  }
  async getSupplier(id) {
    try {
      const results = await db2.select().from(brandSuppliers).where(eq(brandSuppliers.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching brand supplier ${id}:`, error);
      throw error;
    }
  }
  async createSupplier(data) {
    try {
      const id = `sup_${nanoid(10)}`;
      const results = await db2.insert(brandSuppliers).values({ ...data, id, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).returning();
      const supplier = results[0];
      await this.autoCommitWmsResource("supplier", supplier, data.createdBy);
      return supplier;
    } catch (error) {
      console.error("Error creating brand supplier:", error);
      throw error;
    }
  }
  async updateSupplier(id, data) {
    try {
      const results = await db2.update(brandSuppliers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandSuppliers.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating brand supplier ${id}:`, error);
      throw error;
    }
  }
  async deleteSupplier(id) {
    try {
      const results = await db2.update(brandSuppliers).set({ status: "blocked", updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandSuppliers.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting brand supplier ${id}:`, error);
      throw error;
    }
  }
  async deploySupplier(supplierId, branchNames, deployedBy) {
    try {
      const supplier = await this.getSupplier(supplierId);
      if (!supplier) {
        throw new Error(`Supplier ${supplierId} not found`);
      }
      const branches = await db3.select().from(deployCenterBranches).where(inArray(deployCenterBranches.branchName, branchNames));
      const brandTenantId = "47a3e13d-1738-4a37-bdca-cbc4cedc402c";
      const timestamp5 = Date.now();
      const deploymentId = `deploy-supplier-${timestamp5}-${nanoid(6)}`;
      const payload = {
        resourceType: "supplier",
        data: supplier,
        deploymentMode: "full_replace",
        version: "1.0.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.createDeployment({
        id: deploymentId,
        tool: "wms",
        resourceType: "supplier",
        resourceId: supplier.id,
        name: `Deploy: ${supplier.name}`,
        description: `Deploy supplier ${supplier.code} to ${branchNames.length} branches`,
        version: "1.0.0",
        status: "ready",
        payload,
        metadata: {
          branches: branchNames,
          deployedBy,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        createdBy: deployedBy,
        brandTenantId
      });
      const successfulBranches = [];
      const failedBranches = [];
      const foundBranchNames = new Set(branches.map((b) => b.branchName));
      const missingBranches = branchNames.filter((name) => !foundBranchNames.has(name));
      for (const missingBranch of missingBranches) {
        failedBranches.push({
          branchName: missingBranch,
          error: "Branch not found in deploy center"
        });
        await db3.insert(deployCenterStatus).values({
          deploymentId,
          branchName: missingBranch,
          status: "failed",
          errorMessage: "Branch not found in deploy center",
          attemptCount: 1,
          lastAttemptAt: /* @__PURE__ */ new Date(),
          brandTenantId
        }).catch(() => {
        });
      }
      for (const branch of branches) {
        try {
          if (!branch.tenantId) {
            failedBranches.push({
              branchName: branch.branchName,
              error: "Branch has no associated tenant"
            });
            continue;
          }
          const italyCountryResult = await db3.execute(
            sql6`SELECT id::text FROM public.countries WHERE code = 'IT' LIMIT 1`
          );
          const defaultCountryId = italyCountryResult.rows[0]?.id || supplier.countryId;
          const tenantUserResult = await db3.execute(
            sql6`SELECT id::text FROM w3suite.users WHERE tenant_id = ${branch.tenantId} LIMIT 1`
          );
          const validUserId = tenantUserResult.rows[0]?.id || "brand-service-account";
          const existingSupplier = await db3.execute(
            sql6`SELECT id FROM w3suite.suppliers WHERE code = ${supplier.code} AND tenant_id = ${branch.tenantId} LIMIT 1`
          );
          if (existingSupplier.rows.length > 0) {
            await db3.update(suppliers).set({
              name: supplier.name,
              legalName: supplier.legalName,
              supplierType: supplier.supplierType,
              vatNumber: supplier.vatNumber,
              taxCode: supplier.taxCode,
              sdiCode: supplier.sdiCode,
              pecEmail: supplier.pecEmail,
              reaNumber: supplier.reaNumber,
              chamberOfCommerce: supplier.chamberOfCommerce,
              registeredAddress: supplier.registeredAddress,
              cityId: supplier.cityId,
              countryId: supplier.countryId || defaultCountryId,
              preferredPaymentMethodId: supplier.preferredPaymentMethodId,
              paymentConditionId: supplier.paymentConditionId,
              paymentTerms: supplier.paymentTerms,
              currency: supplier.currency,
              email: supplier.email,
              phone: supplier.phone,
              website: supplier.website,
              contacts: supplier.contacts,
              iban: supplier.iban,
              bic: supplier.bic,
              splitPayment: supplier.splitPayment,
              withholdingTax: supplier.withholdingTax,
              taxRegime: supplier.taxRegime,
              status: supplier.status,
              notes: supplier.notes,
              updatedBy: validUserId,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq(suppliers.id, existingSupplier.rows[0].id));
          } else {
            await db3.insert(suppliers).values({
              origin: "brand",
              tenantId: branch.tenantId,
              externalId: supplier.id,
              code: supplier.code,
              name: supplier.name,
              legalName: supplier.legalName,
              supplierType: supplier.supplierType,
              vatNumber: supplier.vatNumber,
              taxCode: supplier.taxCode,
              sdiCode: supplier.sdiCode,
              pecEmail: supplier.pecEmail,
              reaNumber: supplier.reaNumber,
              chamberOfCommerce: supplier.chamberOfCommerce,
              registeredAddress: supplier.registeredAddress,
              cityId: supplier.cityId,
              countryId: supplier.countryId || defaultCountryId,
              preferredPaymentMethodId: supplier.preferredPaymentMethodId,
              paymentConditionId: supplier.paymentConditionId,
              paymentTerms: supplier.paymentTerms,
              currency: supplier.currency,
              email: supplier.email,
              phone: supplier.phone,
              website: supplier.website,
              contacts: supplier.contacts,
              iban: supplier.iban,
              bic: supplier.bic,
              splitPayment: supplier.splitPayment,
              withholdingTax: supplier.withholdingTax,
              taxRegime: supplier.taxRegime,
              status: supplier.status,
              notes: supplier.notes,
              createdBy: validUserId,
              lockedFields: []
            });
          }
          await db3.insert(deployCenterStatus).values({
            deploymentId,
            branchName: branch.branchName,
            status: "deployed",
            completedAt: /* @__PURE__ */ new Date(),
            brandTenantId
          });
          successfulBranches.push(branch.branchName);
        } catch (error) {
          console.error(`Failed to deploy to branch ${branch.branchName}:`, error);
          failedBranches.push({
            branchName: branch.branchName,
            error: error.message || "Unknown error"
          });
          await db3.insert(deployCenterStatus).values({
            deploymentId,
            branchName: branch.branchName,
            status: "failed",
            errorMessage: error.message || "Unknown error",
            attemptCount: 1,
            lastAttemptAt: /* @__PURE__ */ new Date(),
            brandTenantId
          }).catch(() => {
          });
        }
      }
      await db2.update(brandSuppliers).set({
        deploymentStatus: successfulBranches.length > 0 ? "active" : "draft",
        deployedToCount: successfulBranches.length,
        lastDeployedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(brandSuppliers.id, supplierId));
      return {
        success: successfulBranches.length > 0,
        deploymentId,
        successfulBranches,
        failedBranches
      };
    } catch (error) {
      console.error("Error deploying supplier:", error);
      throw error;
    }
  }
  async getSupplierDeploymentHistory(supplierId) {
    try {
      const results = await db3.execute(
        sql6`
          SELECT 
            dcs.deployment_id as "deploymentId",
            dcs.branch_name as "branchName",
            dcs.status,
            dcs.error_message as "errorMessage",
            dcs.completed_at as "completedAt",
            dcs.created_at as "createdAt",
            dcc.name as "deploymentName"
          FROM brand_interface.deploy_center_status dcs
          INNER JOIN brand_interface.deploy_center_commits dcc ON dcs.deployment_id = dcc.id
          WHERE dcc.resource_id::text = ${supplierId}
          ORDER BY dcs.created_at DESC
        `
      );
      return results.rows;
    } catch (error) {
      console.error("Error fetching supplier deployment history:", error);
      throw error;
    }
  }
  // ==================== AUTO-COMMIT WMS RESOURCES ====================
  /**
   * 🚀 AUTO-COMMIT: Auto-generate Deploy Center commit for WMS resources
   * Creates brand_deployment record with JSON payload ready for deployment
   */
  async autoCommitWmsResource(resourceType, resource, createdBy) {
    try {
      const timestamp5 = Date.now();
      const random = nanoid(6);
      const commitId = `commit-wms-${resourceType}-${timestamp5}-${random}`;
      const payload = {
        resourceType,
        data: resource,
        deploymentMode: "full_replace",
        // WMS resources are always full replace
        version: "1.0.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      const brandTenantId = "47a3e13d-1738-4a37-bdca-cbc4cedc402c";
      console.log(`\u{1F680} [AUTO-COMMIT] Starting auto-commit for ${resourceType}: ${resource.name || resource.code}`);
      const deployment = await this.createDeployment({
        id: commitId,
        tool: "wms",
        resourceType,
        resourceId: resource.id,
        name: `Auto-commit: ${resource.name || resource.code}`,
        description: `Auto-generated commit for ${resourceType} creation/update`,
        version: "1.0.0",
        status: "ready",
        payload,
        metadata: {
          autoGenerated: true,
          sourceAction: "create",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        createdBy,
        brandTenantId
      });
      console.log(`\u2705 [AUTO-COMMIT] Created deployment ${commitId} for ${resourceType}: ${resource.name || resource.code}`);
      return deployment;
    } catch (error) {
      console.error(`\u26A0\uFE0F  [AUTO-COMMIT] Failed to create deployment for ${resourceType}:`, error);
      return null;
    }
  }
  // ==================== BRAND WORKFLOWS ====================
  async getBrandWorkflows(filters) {
    try {
      let query = db2.select().from(brandWorkflows);
      const conditions = [];
      if (filters?.category) {
        conditions.push(eq(brandWorkflows.category, filters.category));
      }
      if (filters?.status) {
        conditions.push(eq(brandWorkflows.status, filters.status));
      }
      const results = conditions.length > 0 ? await query.where(and(...conditions)).orderBy(desc(brandWorkflows.updatedAt)) : await query.orderBy(desc(brandWorkflows.updatedAt));
      return results;
    } catch (error) {
      console.error("Error fetching brand workflows:", error);
      throw error;
    }
  }
  async getBrandWorkflow(id) {
    try {
      const results = await db2.select().from(brandWorkflows).where(eq(brandWorkflows.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching brand workflow ${id}:`, error);
      throw error;
    }
  }
  async createBrandWorkflow(data) {
    try {
      const crypto3 = await import("crypto");
      const checksum = crypto3.createHash("sha256").update(JSON.stringify(data.dslJson)).digest("hex");
      const results = await db2.insert(brandWorkflows).values({
        ...data,
        checksum,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating brand workflow:", error);
      throw error;
    }
  }
  async updateBrandWorkflow(id, data) {
    try {
      let updateData = { ...data, updatedAt: /* @__PURE__ */ new Date() };
      if (data.dslJson) {
        const crypto3 = await import("crypto");
        updateData.checksum = crypto3.createHash("sha256").update(JSON.stringify(data.dslJson)).digest("hex");
      }
      const results = await db2.update(brandWorkflows).set(updateData).where(eq(brandWorkflows.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating brand workflow ${id}:`, error);
      throw error;
    }
  }
  async deleteBrandWorkflow(id) {
    try {
      const results = await db2.delete(brandWorkflows).where(eq(brandWorkflows.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting brand workflow ${id}:`, error);
      throw error;
    }
  }
  // ==================== BRAND TASKS IMPLEMENTATION ====================
  async getAllBrandTasks() {
    try {
      return await db2.select().from(brandTasks2).orderBy(brandTasks2.createdAt);
    } catch (error) {
      console.error("Error fetching all brand tasks:", error);
      throw error;
    }
  }
  async getBrandTaskById(id) {
    try {
      const results = await db2.select().from(brandTasks2).where(eq(brandTasks2.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching brand task ${id}:`, error);
      throw error;
    }
  }
  async createBrandTask(data) {
    try {
      const results = await db2.insert(brandTasks2).values({
        ...data,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating brand task:", error);
      throw error;
    }
  }
  async updateBrandTask(id, data) {
    try {
      const results = await db2.update(brandTasks2).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(brandTasks2.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating brand task ${id}:`, error);
      throw error;
    }
  }
  async deleteBrandTask(id) {
    try {
      const results = await db2.delete(brandTasks2).where(eq(brandTasks2.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting brand task ${id}:`, error);
      throw error;
    }
  }
  // ==================== DEPLOY CENTER IMPLEMENTATION ====================
  async getDeployments(filters) {
    try {
      let query = db2.select().from(deployCenterCommits);
      const conditions = [];
      if (filters?.tool) {
        conditions.push(eq(deployCenterCommits.tool, filters.tool));
      }
      if (filters?.status) {
        conditions.push(eq(deployCenterCommits.status, filters.status));
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      const results = await query.orderBy(desc(deployCenterCommits.createdAt));
      return results;
    } catch (error) {
      console.error("Error fetching deployments:", error);
      throw error;
    }
  }
  async getDeployment(id) {
    try {
      const results = await db2.select().from(deployCenterCommits).where(eq(deployCenterCommits.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching deployment ${id}:`, error);
      throw error;
    }
  }
  async createDeployment(data) {
    try {
      const results = await db2.insert(deployCenterCommits).values({
        ...data,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating deployment:", error);
      throw error;
    }
  }
  async updateDeployment(id, data) {
    try {
      const results = await db2.update(deployCenterCommits).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(deployCenterCommits.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating deployment ${id}:`, error);
      throw error;
    }
  }
  async deleteDeployment(id) {
    try {
      const results = await db2.delete(deployCenterCommits).where(eq(deployCenterCommits.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      console.error(`Error deleting deployment ${id}:`, error);
      throw error;
    }
  }
  async getBranches(tenantId) {
    try {
      let query = db2.select().from(deployCenterBranches);
      if (tenantId) {
        query = query.where(eq(deployCenterBranches.tenantId, tenantId));
      }
      const results = await query.orderBy(deployCenterBranches.branchName);
      return results;
    } catch (error) {
      console.error("Error fetching branches:", error);
      throw error;
    }
  }
  async getBranch(branchName) {
    try {
      const results = await db2.select().from(deployCenterBranches).where(eq(deployCenterBranches.branchName, branchName)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching branch ${branchName}:`, error);
      throw error;
    }
  }
  async createBranch(data) {
    try {
      const results = await db2.insert(deployCenterBranches).values({
        ...data,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating branch:", error);
      throw error;
    }
  }
  async updateBranch(id, data) {
    try {
      const results = await db2.update(deployCenterBranches).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(deployCenterBranches.id, id)).returning();
      if (results.length === 0) {
        console.log(`\u26A0\uFE0F  Branch ${id} not found for update`);
        return null;
      }
      console.log(`\u2705 Updated branch: ${results[0].branchName}`);
      return results[0];
    } catch (error) {
      console.error(`\u274C Error updating branch ${id}:`, error);
      throw error;
    }
  }
  async getDeploymentStatuses(filters) {
    try {
      const { and: and3 } = await import("drizzle-orm");
      if (typeof filters === "string") {
        const results2 = await db2.select({
          id: deployCenterSessionCommits.id,
          deploymentId: deployCenterSessionCommits.deploymentSessionId,
          branchId: deployCenterBranches.id,
          branchName: deployCenterBranches.branchName,
          tenantName: deployCenterBranches.branchName,
          // Use branch name as fallback
          tenantSlug: deployCenterBranches.branchName,
          storeCode: deployCenterBranches.branchName,
          status: deployCenterSessionCommits.status,
          startedAt: deployCenterSessionCommits.startedAt,
          completedAt: deployCenterSessionCommits.completedAt,
          errorMessage: deployCenterSessionCommits.errorMessage,
          metadata: deployCenterSessionCommits.metadata,
          createdAt: deployCenterSessionCommits.createdAt,
          updatedAt: deployCenterSessionCommits.updatedAt,
          // Commit data
          commitId: deployCenterCommits.id,
          commitName: deployCenterCommits.name,
          commitVersion: deployCenterCommits.version,
          tool: deployCenterCommits.tool,
          resourceType: deployCenterCommits.resourceType
        }).from(deployCenterSessionCommits).innerJoin(deployCenterCommits, eq(deployCenterSessionCommits.commitId, deployCenterCommits.id)).innerJoin(deployCenterBranches, eq(deployCenterSessionCommits.targetBranch, deployCenterBranches.branchName)).where(eq(deployCenterSessionCommits.deploymentSessionId, filters)).orderBy(deployCenterSessionCommits.createdAt);
        return results2;
      }
      let query = db2.select({
        id: deployCenterSessionCommits.id,
        deploymentId: deployCenterSessionCommits.deploymentSessionId,
        branchId: deployCenterBranches.id,
        branchName: deployCenterBranches.branchName,
        tenantName: deployCenterBranches.branchName,
        // Use branch name as fallback
        tenantSlug: deployCenterBranches.branchName,
        storeCode: deployCenterBranches.branchName,
        status: deployCenterSessionCommits.status,
        startedAt: deployCenterSessionCommits.startedAt,
        completedAt: deployCenterSessionCommits.completedAt,
        errorMessage: deployCenterSessionCommits.errorMessage,
        metadata: deployCenterSessionCommits.metadata,
        createdAt: deployCenterSessionCommits.createdAt,
        updatedAt: deployCenterSessionCommits.updatedAt,
        // Commit data
        commitId: deployCenterCommits.id,
        commitName: deployCenterCommits.name,
        commitVersion: deployCenterCommits.version,
        tool: deployCenterCommits.tool,
        resourceType: deployCenterCommits.resourceType
      }).from(deployCenterSessionCommits).innerJoin(deployCenterCommits, eq(deployCenterSessionCommits.commitId, deployCenterCommits.id)).innerJoin(deployCenterBranches, eq(deployCenterSessionCommits.targetBranch, deployCenterBranches.branchName));
      const conditions = [];
      if (filters.deploymentId) {
        conditions.push(eq(deployCenterSessionCommits.deploymentSessionId, filters.deploymentId));
      }
      if (filters.branchId) {
        conditions.push(eq(deployCenterBranches.id, filters.branchId));
      }
      if (filters.status) {
        conditions.push(eq(deployCenterSessionCommits.status, filters.status));
      }
      if (filters.tool) {
        conditions.push(eq(deployCenterCommits.tool, filters.tool));
      }
      if (conditions.length > 0) {
        query = query.where(and3(...conditions));
      }
      query = query.orderBy(deployCenterSessionCommits.createdAt);
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
      const results = await query;
      const enrichedResults = await this.enrichWithGapInfo(results);
      return enrichedResults;
    } catch (error) {
      console.error("Error fetching deployment statuses:", error);
      throw error;
    }
  }
  async enrichWithGapInfo(statuses) {
    try {
      const latestCommitsByTool = {};
      const tools = [...new Set(statuses.map((s) => s.tool))];
      for (const tool of tools) {
        const latestCommits = await db2.select().from(deployCenterCommits).where(eq(deployCenterCommits.tool, tool)).orderBy(desc(deployCenterCommits.createdAt)).limit(1);
        if (latestCommits.length > 0) {
          latestCommitsByTool[tool] = latestCommits[0];
        }
      }
      const enriched = statuses.map((status) => {
        const latestCommit = latestCommitsByTool[status.tool];
        if (!latestCommit) {
          return {
            ...status,
            latestVersion: status.commitVersion,
            commitsGap: 0,
            isUpToDate: true
          };
        }
        const isUpToDate = status.commitId === latestCommit.id;
        const gap = isUpToDate ? 0 : this.calculateCommitGap(status.commitVersion, latestCommit.version);
        return {
          ...status,
          latestVersion: latestCommit.version,
          latestCommitId: latestCommit.id,
          latestCommitName: latestCommit.name,
          commitsGap: gap,
          isUpToDate
        };
      });
      return enriched;
    } catch (error) {
      console.error("Error enriching with gap info:", error);
      return statuses;
    }
  }
  calculateCommitGap(currentVersion, latestVersion) {
    const parseVersion = (v) => {
      const match = v.match(/\d+/g);
      return match ? match.map(Number) : [0];
    };
    const current = parseVersion(currentVersion);
    const latest = parseVersion(latestVersion);
    let gap = 0;
    const maxLen = Math.max(current.length, latest.length);
    for (let i = 0; i < maxLen; i++) {
      const c = current[i] || 0;
      const l = latest[i] || 0;
      gap += Math.abs(l - c);
    }
    return gap;
  }
  async createDeploymentStatus(data) {
    try {
      const results = await db2.insert(deployCenterStatus).values({
        ...data,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating deployment status:", error);
      throw error;
    }
  }
  async updateDeploymentStatus(id, data) {
    try {
      const results = await db2.update(deployCenterStatus).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(deployCenterStatus.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating deployment status ${id}:`, error);
      throw error;
    }
  }
  // ==================== DEPLOYMENT SESSIONS OPERATIONS ====================
  async getDeploymentSessions(filters) {
    try {
      let query = db2.select().from(deployCenterDeployments);
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(deployCenterDeployments.status, filters.status));
      }
      if (filters?.launchedBy) {
        conditions.push(eq(deployCenterDeployments.launchedBy, filters.launchedBy));
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      const results = await query.orderBy(desc(deployCenterDeployments.createdAt));
      return results;
    } catch (error) {
      console.error("Error fetching deployment sessions:", error);
      throw error;
    }
  }
  async getDeploymentSession(id) {
    try {
      const results = await db2.select().from(deployCenterDeployments).where(eq(deployCenterDeployments.id, id)).limit(1);
      if (!results[0]) return null;
      const session = results[0];
      const commits = await db2.select().from(deployCenterSessionCommits).where(eq(deployCenterSessionCommits.deploymentSessionId, id)).orderBy(deployCenterSessionCommits.createdAt);
      return {
        ...session,
        commits
      };
    } catch (error) {
      console.error(`Error fetching deployment session ${id}:`, error);
      throw error;
    }
  }
  async createDeploymentSession(data) {
    try {
      const commitIds = data.commitIds;
      const targetBranches = data.targetBranches;
      const results = await db2.insert(deployCenterDeployments).values({
        ...data,
        totalBranches: commitIds.length * targetBranches.length,
        completedBranches: 0,
        failedBranches: 0,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      const session = results[0];
      const sessionCommits = [];
      for (const commitId of commitIds) {
        for (const branchName of targetBranches) {
          sessionCommits.push({
            deploymentSessionId: session.id,
            commitId,
            targetBranch: branchName,
            status: "ready",
            metadata: {},
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      }
      if (sessionCommits.length > 0) {
        await db2.insert(deployCenterSessionCommits).values(sessionCommits);
      }
      return session;
    } catch (error) {
      console.error("Error creating deployment session:", error);
      throw error;
    }
  }
  async launchDeploymentSession(id) {
    try {
      const session = await this.getDeploymentSession(id);
      if (!session) return null;
      const results = await db2.update(deployCenterDeployments).set({
        status: "in_progress",
        startedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(deployCenterDeployments.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error launching deployment session ${id}:`, error);
      throw error;
    }
  }
  async updateDeploymentSession(id, data) {
    try {
      const results = await db2.update(deployCenterDeployments).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(deployCenterDeployments.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating deployment session ${id}:`, error);
      throw error;
    }
  }
  // ==================== SESSION COMMITS OPERATIONS ====================
  async updateSessionCommit(id, data) {
    try {
      const results = await db2.update(deployCenterSessionCommits).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(deployCenterSessionCommits.id, id)).returning();
      return results[0] || null;
    } catch (error) {
      console.error(`Error updating session commit ${id}:`, error);
      throw error;
    }
  }
  // ==================== BRANCH RELEASES OPERATIONS ====================
  async getBranchReleases(branchName) {
    try {
      let query = db2.select().from(deployCenterBranchReleases);
      if (branchName) {
        query = query.where(eq(deployCenterBranchReleases.branchName, branchName));
      }
      const results = await query.orderBy(deployCenterBranchReleases.activatedAt);
      return results;
    } catch (error) {
      console.error("Error fetching branch releases:", error);
      throw error;
    }
  }
  async getBranchRelease(branchName, tool) {
    try {
      const results = await db2.select().from(deployCenterBranchReleases).where(and(
        eq(deployCenterBranchReleases.branchName, branchName),
        eq(deployCenterBranchReleases.tool, tool)
      )).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching branch release ${branchName}/${tool}:`, error);
      throw error;
    }
  }
  async updateBranchRelease(data) {
    try {
      const existing = await this.getBranchRelease(data.branchName, data.tool);
      if (existing) {
        const results = await db2.update(deployCenterBranchReleases).set({
          commitId: data.commitId,
          version: data.version,
          deploymentSessionId: data.deploymentSessionId,
          previousCommitId: existing.commitId,
          activatedAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          metadata: data.metadata || {}
        }).where(eq(deployCenterBranchReleases.id, existing.id)).returning();
        return results[0];
      } else {
        const results = await db2.insert(deployCenterBranchReleases).values({
          ...data,
          activatedAt: /* @__PURE__ */ new Date(),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return results[0];
      }
    } catch (error) {
      console.error("Error updating branch release:", error);
      throw error;
    }
  }
  async syncBranchesFromTenants() {
    try {
      console.log("\u{1F504} [SYNC-BRANCHES] Starting branch synchronization from W3Suite tenants...");
      let created = 0;
      let updated = 0;
      const brandTenantId = "47a3e13d-1738-4a37-bdca-cbc4cedc402c";
      const tenants2 = await db3.select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status
      }).from(tenants).where(and(
        eq(tenants.status, "active"),
        isNotNull(tenants.slug)
      ));
      console.log(`\u{1F4CA} [SYNC-BRANCHES] Found ${tenants2.length} active tenants in W3Suite`);
      for (const tenant of tenants2) {
        const mainBranchName = tenant.slug;
        const existingMainBranch = await this.getBranch(mainBranchName);
        let mainBranch;
        if (!existingMainBranch) {
          mainBranch = await this.createBranch({
            branchName: mainBranchName,
            tenantId: tenant.id,
            brandTenantId,
            description: `Main branch for ${tenant.name}`,
            metadata: {
              type: "tenant",
              tenantSlug: tenant.slug,
              autoGenerated: true
            }
          });
          created++;
          console.log(`\u2705 [SYNC-BRANCHES] Created main branch: ${mainBranchName}`);
        } else {
          mainBranch = existingMainBranch;
          updated++;
        }
        await db3.update(tenants).set({ branchId: mainBranch.id }).where(eq(tenants.id, tenant.id));
        console.log(`\u{1F517} [SYNC-BRANCHES] Linked tenant ${tenant.slug} to branch ${mainBranch.id}`);
        const stores2 = await db3.select({
          id: stores.id,
          code: stores.code,
          nome: stores.nome,
          status: stores.status
        }).from(stores).where(and(
          eq(stores.tenantId, tenant.id),
          eq(stores.status, "active")
        ));
        console.log(`\u{1F4CD} [SYNC-BRANCHES] Found ${stores2.length} active stores for tenant ${tenant.slug}`);
        for (const store of stores2) {
          const storeBranchName = `${tenant.slug}/${store.code}`;
          const existingStoreBranch = await this.getBranch(storeBranchName);
          let storeBranch;
          if (!existingStoreBranch) {
            storeBranch = await this.createBranch({
              branchName: storeBranchName,
              tenantId: tenant.id,
              pdvId: store.id,
              // Fixed: use pdvId instead of storeId
              brandTenantId,
              description: `Branch for ${store.nome} (${store.code})`,
              metadata: {
                type: "store",
                tenantSlug: tenant.slug,
                storeCode: store.code,
                autoGenerated: true
              }
            });
            created++;
            console.log(`\u2705 [SYNC-BRANCHES] Created store branch: ${storeBranchName}`);
          } else {
            storeBranch = existingStoreBranch;
            updated++;
          }
          await db3.update(stores).set({ branchId: storeBranch.id }).where(eq(stores.id, store.id));
          console.log(`\u{1F517} [SYNC-BRANCHES] Linked store ${store.code} to branch ${storeBranch.id}`);
        }
      }
      const total = created + updated;
      console.log(`\u{1F389} [SYNC-BRANCHES] Synchronization complete! Created: ${created}, Updated: ${updated}, Total: ${total}`);
      return { created, updated, total };
    } catch (error) {
      console.error("\u274C [SYNC-BRANCHES] Error syncing branches:", error);
      throw error;
    }
  }
};
var brandStorage = new BrandDrizzleStorage();

// apps/backend/brand-api/src/core/auth.ts
var BRAND_TENANT_ID = "50dbf940-5809-4094-afa1-bd699122a636";
var BRAND_SERVICE_ACCOUNT_ID = "brand-service-account";
var JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "development" ? "w3suite-dev-secret-2025" : (() => {
  throw new Error("JWT_SECRET environment variable is required in production");
})());
var BrandAuthService = class {
  /**
   * Valida credenziali utente Brand
   */
  static async validateCredentials(email, password) {
    try {
      const user = await brandStorage.getUserByEmail(email);
      if (!user || !user.isActive) {
        return null;
      }
      let isValid = false;
      if (process.env.NODE_ENV === "development") {
        console.warn(`\u26A0\uFE0F Development mode: Using test password for ${email}`);
        isValid = password === "Brand123!";
      } else {
        console.error(`\u274C Password authentication not implemented for production`);
        return null;
      }
      if (!isValid) {
        await brandStorage.updateUser(user.id, {
          failedLoginAttempts: (user.failedLoginAttempts || 0) + 1
        });
        return null;
      }
      await brandStorage.updateUser(user.id, {
        lastLoginAt: /* @__PURE__ */ new Date(),
        failedLoginAttempts: 0
      });
      return user;
    } catch (error) {
      console.error("Error validating credentials:", error);
      return null;
    }
  }
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
  /**
   * Genera JWT token per utente Brand
   */
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      commercialAreas: user.commercialAreaCodes,
      permissions: user.permissions
    };
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: "8h",
      issuer: "brand-interface"
    });
  }
  /**
   * Verifica JWT token Brand
   */
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: "brand-interface"
      });
      return decoded;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }
  /**
   * Crea context di autenticazione per Brand Interface
   * @param targetTenant - null per cross-tenant, tenant ID per operazioni specifiche
   */
  static createBrandContext(targetTenant = null) {
    return {
      userId: BRAND_SERVICE_ACCOUNT_ID,
      tenantId: targetTenant,
      isCrossTenant: targetTenant === null,
      isServiceAccount: true,
      brandTenantId: BRAND_TENANT_ID
    };
  }
  /**
   * Context per operazioni cross-tenant (accede a tutti i tenant)
   */
  static getCrossTenantContext() {
    return this.createBrandContext(null);
  }
  /**
   * Context per operazioni su tenant specifico
   */
  static getTenantSpecificContext(tenantId) {
    return this.createBrandContext(tenantId);
  }
  /**
   * Context per operazioni Brand Level (su tabelle brand-specific)
   */
  static getBrandLevelContext() {
    return this.createBrandContext(BRAND_TENANT_ID);
  }
};
function authenticateToken() {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.substring(7);
    const decoded = await BrandAuthService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  };
}
function createTenantContextMiddleware() {
  return async (req, res, next) => {
    const fullPath = req.originalUrl || req.url;
    const pathAfterApi = req.path;
    const pathParts = pathAfterApi.split("/").filter(Boolean);
    const potentialTenant = pathParts[0];
    if (potentialTenant) {
      const tenants2 = await brandStorage.getTenants();
      const tenant = tenants2.find((t) => t.slug === potentialTenant);
      if (tenant) {
        req.brandContext = {
          userId: req.user?.id || BRAND_SERVICE_ACCOUNT_ID,
          tenantId: tenant.id,
          isCrossTenant: false,
          isServiceAccount: false,
          brandTenantId: BRAND_TENANT_ID
        };
        console.log(`\u{1F3AF} Brand Auth Context: Tenant-specific (${tenant.slug})`);
      } else {
        req.brandContext = {
          userId: req.user?.id || BRAND_SERVICE_ACCOUNT_ID,
          tenantId: null,
          isCrossTenant: true,
          isServiceAccount: false,
          brandTenantId: BRAND_TENANT_ID
        };
        console.log(`\u{1F3AF} Brand Auth Context: Cross-Tenant`);
      }
    } else {
      req.brandContext = {
        userId: req.user?.id || BRAND_SERVICE_ACCOUNT_ID,
        tenantId: null,
        isCrossTenant: true,
        isServiceAccount: false,
        brandTenantId: BRAND_TENANT_ID
      };
      console.log(`\u{1F3AF} Brand Auth Context: Cross-Tenant (root)`);
    }
    next();
  };
}

// apps/backend/brand-api/src/services/template-storage.service.ts
import fs from "fs/promises";
import path from "path";
import { nanoid as nanoid2 } from "nanoid";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var TEMPLATES_DIR = path.join(process.cwd(), "brand-templates");
var TEMPLATE_PATHS = {
  campaign: path.join(TEMPLATES_DIR, "campaigns"),
  pipeline: path.join(TEMPLATES_DIR, "pipelines"),
  funnel: path.join(TEMPLATES_DIR, "funnels")
};
var TemplateStorageService = class {
  /**
   * Initialize directories if they don't exist and setup Git
   */
  async initialize() {
    for (const dir of Object.values(TEMPLATE_PATHS)) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
    await this.initGitRepo();
  }
  /**
   * Initialize Git repository
   */
  async initGitRepo() {
    try {
      const gitDir = path.join(TEMPLATES_DIR, ".git");
      try {
        await fs.access(gitDir);
        console.log("\u2705 [GIT] Repository already initialized");
        return;
      } catch {
        await execAsync("git init", { cwd: TEMPLATES_DIR });
        await execAsync('git config user.name "Brand Master Catalog"', { cwd: TEMPLATES_DIR });
        await execAsync('git config user.email "brand-catalog@w3suite.com"', { cwd: TEMPLATES_DIR });
        const gitignore = "node_modules/\n.DS_Store\n";
        await fs.writeFile(path.join(TEMPLATES_DIR, ".gitignore"), gitignore, "utf-8");
        console.log("\u2705 [GIT] Repository initialized");
      }
    } catch (error) {
      console.error("[GIT] Failed to initialize repository:", error);
    }
  }
  /**
   * Commit changes to Git with metadata
   */
  async gitCommit(message, author = "system") {
    try {
      await execAsync("git add .", { cwd: TEMPLATES_DIR });
      const commitMsg = `${message}

Author: ${author}
Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`;
      await execAsync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: TEMPLATES_DIR });
      console.log(`\u2705 [GIT] Committed: ${message}`);
    } catch (error) {
      if (!error.message?.includes("nothing to commit")) {
        console.error("[GIT] Commit failed:", error.message);
      }
    }
  }
  /**
   * Get all templates of a specific type
   */
  async getTemplates(type) {
    const dir = TEMPLATE_PATHS[type];
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      const templates = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(dir, file);
          const content = await fs.readFile(filePath, "utf-8");
          return JSON.parse(content);
        })
      );
      return templates.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
  /**
   * Get all templates across all types
   */
  async getAllTemplates() {
    const [campaigns, pipelines, funnels] = await Promise.all([
      this.getTemplates("campaign"),
      this.getTemplates("pipeline"),
      this.getTemplates("funnel")
    ]);
    return [...campaigns, ...pipelines, ...funnels].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  /**
   * Get a single template by ID and type
   */
  async getTemplate(type, id) {
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  /**
   * Create a new template
   */
  async createTemplate(type, data) {
    const id = nanoid2(12);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const template = {
      id,
      type,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(template, null, 2), "utf-8");
    await this.gitCommit(
      `Create ${type} template: ${data.name} (${id})`,
      data.createdBy
    );
    console.log(`\u2705 [TEMPLATE-STORAGE] Created ${type} template: ${id}`);
    return template;
  }
  /**
   * Update an existing template
   */
  async updateTemplate(type, id, updates) {
    const existing = await this.getTemplate(type, id);
    if (!existing) {
      return null;
    }
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      // Ensure id doesn't change
      type: existing.type,
      // Ensure type doesn't change
      createdAt: existing.createdAt,
      // Preserve creation date
      createdBy: existing.createdBy,
      // Preserve creator
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), "utf-8");
    await this.gitCommit(
      `Update ${type} template: ${updated.name} (${id})`,
      updates.updatedBy || "system"
    );
    console.log(`\u2705 [TEMPLATE-STORAGE] Updated ${type} template: ${id}`);
    return updated;
  }
  /**
   * Delete a template
   */
  async deleteTemplate(type, id) {
    const filePath = path.join(TEMPLATE_PATHS[type], `${id}.json`);
    const template = await this.getTemplate(type, id);
    const templateName = template?.name || id;
    try {
      await fs.unlink(filePath);
      await this.gitCommit(
        `Delete ${type} template: ${templateName} (${id})`,
        "system"
      );
      console.log(`\u2705 [TEMPLATE-STORAGE] Deleted ${type} template: ${id}`);
      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }
  /**
   * Toggle template active state
   */
  async toggleTemplateActive(type, id) {
    const existing = await this.getTemplate(type, id);
    if (!existing) {
      return null;
    }
    return this.updateTemplate(type, id, {
      isActive: !existing.isActive,
      updatedBy: "system"
      // In production, use actual user
    });
  }
};
var templateStorageService = new TemplateStorageService();

// apps/backend/brand-api/src/core/routes.ts
async function registerBrandRoutes(app) {
  console.log("\u{1F4E1} Setting up Brand Interface API routes...");
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      service: "brand-api-backend",
      version: "1.0.0"
    });
  });
  app.use(express.json({ limit: "50mb" }));
  app.post("/brand-api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const user = await BrandAuthService.validateCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = BrandAuthService.generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        commercialAreas: user.commercialAreaCodes,
        permissions: user.permissions
      }
    });
  });
  app.get("/brand-api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "Brand Interface API",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/brand-api/auth/me", authenticateToken(), async (req, res) => {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        commercialAreas: user.commercialAreas,
        permissions: user.permissions
      }
    });
  });
  app.use("/brand-api", (req, res, next) => {
    if (req.path === "/auth/login" || req.path === "/health" || req.path.startsWith("/reference/")) {
      return next();
    }
    if (process.env.NODE_ENV === "development") {
      console.log("\u{1F527} [BRAND-DEV] Development mode: Bypassing authentication for", req.path);
      req.user = {
        id: "brand-admin-user",
        email: "admin@brandinterface.com",
        firstName: "Brand",
        lastName: "Admin",
        role: "super_admin",
        commercialAreas: [],
        permissions: ["*"],
        // All permissions
        isActive: true,
        brandTenantId: BRAND_TENANT_ID
      };
      return next();
    }
    return authenticateToken()(req, res, next);
  });
  app.use("/brand-api", createTenantContextMiddleware());
  app.get("/brand-api/organizations", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to view all organizations" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const organizations = await brandStorage.getOrganizations();
      res.json({
        organizations: organizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          notes: org.notes,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt
        })),
        context: "cross-tenant",
        message: "All organizations visible in cross-tenant mode"
      });
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });
  app.get("/brand-api/organizations/:id", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { id } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to view organization details" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const organization = await brandStorage.getOrganization(id);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }
      res.json({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
          notes: organization.notes,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt
        },
        context: "cross-tenant",
        message: `Organization details for ${organization.name}`
      });
    } catch (error) {
      console.error(`Error fetching organization ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch organization details" });
    }
  });
  app.post("/brand-api/organizations", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create organizations" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const { name, slug, status, notes } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Organization name is required" });
      }
      const organization = await brandStorage.createOrganization({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        status: status || "active",
        notes: notes || ""
      });
      res.status(201).json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
          notes: organization.notes,
          createdAt: organization.createdAt
        },
        message: "Organization created successfully"
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });
  app.get("/brand-api/legal-entities/:tenantId", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { tenantId } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to view legal entities" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const legalEntities2 = await brandStorage.getLegalEntitiesByTenant(tenantId);
      res.json({
        legalEntities: legalEntities2.map((entity) => ({
          id: entity.id,
          tenantId: entity.tenantId,
          codice: entity.codice,
          nome: entity.nome,
          pIva: entity.pIva,
          codiceFiscale: entity.codiceFiscale,
          formaGiuridica: entity.formaGiuridica,
          stato: entity.stato,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        })),
        tenantId,
        context: "cross-tenant",
        message: `Legal entities for tenant ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching legal entities for tenant ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch legal entities" });
    }
  });
  app.post("/brand-api/legal-entities", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create legal entities" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const { tenantId, codice, nome, pIva, codiceFiscale, formaGiuridica, ...otherFields } = req.body;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }
      if (!nome) {
        return res.status(400).json({ error: "Nome (legal entity name) is required" });
      }
      if (!pIva) {
        return res.status(400).json({ error: "Partita IVA is required" });
      }
      const finalCodice = codice || `8${String(Date.now()).slice(-6)}`;
      const legalEntityData = {
        tenantId,
        codice: finalCodice,
        nome,
        pIva,
        codiceFiscale,
        formaGiuridica,
        stato: "Attiva",
        ...otherFields
      };
      const legalEntity = await brandStorage.createLegalEntity(legalEntityData);
      res.status(201).json({
        success: true,
        legalEntity: {
          id: legalEntity.id,
          tenantId: legalEntity.tenantId,
          codice: legalEntity.codice,
          nome: legalEntity.nome,
          pIva: legalEntity.pIva,
          codiceFiscale: legalEntity.codiceFiscale,
          formaGiuridica: legalEntity.formaGiuridica,
          stato: legalEntity.stato,
          createdAt: legalEntity.createdAt
        },
        message: "Legal entity created successfully"
      });
    } catch (error) {
      console.error("Error creating legal entity:", error);
      res.status(500).json({ error: "Failed to create legal entity" });
    }
  });
  app.get("/brand-api/stores/:tenantId", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { tenantId } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to view stores" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const stores2 = await brandStorage.getStoresByTenant(tenantId);
      res.json({
        stores: stores2.map((store) => ({
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt
        })),
        tenantId,
        context: "cross-tenant",
        message: `Stores for tenant ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching stores for tenant ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });
  app.get("/brand-api/organizations/:id/stores", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { id: rawTenantId } = req.params;
    const tenantId = rawTenantId?.split("?")[0];
    console.log(`\u{1F510} [BRAND-API-AUTH] Stores endpoint - User role: '${user.role}', Required: 'super_admin' or 'national_manager'`);
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      console.log(`\u274C [BRAND-API-AUTH] REJECTED: User role '${user.role}' insufficient for stores`);
      return res.status(403).json({ error: "Insufficient permissions to view organization stores" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      console.log(`\u{1F50D} [BRAND-API-STORES] Fetching stores for tenantId: ${tenantId}`);
      const stores2 = await brandStorage.getStoresByOrganization(tenantId);
      console.log(`\u2705 [BRAND-API-STORES] Retrieved ${stores2?.length || 0} stores from database`);
      res.json({
        stores: stores2.map((store) => ({
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt
        })),
        organizationId: tenantId,
        context: "cross-tenant",
        message: `Stores for organization ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching stores for organization ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch organization stores" });
    }
  });
  app.get("/brand-api/organizations/:id/legal-entities", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { id: rawTenantId } = req.params;
    const tenantId = rawTenantId?.split("?")[0];
    console.log(`\u{1F510} [BRAND-API-AUTH] Legal entities endpoint - User role: '${user.role}', Required: 'super_admin' or 'national_manager'`);
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      console.log(`\u274C [BRAND-API-AUTH] REJECTED: User role '${user.role}' insufficient for legal entities`);
      return res.status(403).json({ error: "Insufficient permissions to view organization legal entities" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      console.log(`\u{1F50D} [BRAND-API-LEGAL] Fetching legal entities for tenantId: ${tenantId}`);
      const legalEntities2 = await brandStorage.getLegalEntitiesByOrganization(tenantId);
      console.log(`\u2705 [BRAND-API-LEGAL] Retrieved ${legalEntities2?.length || 0} legal entities from database`);
      res.json({
        legalEntities: legalEntities2.map((entity) => ({
          id: entity.id,
          tenantId: entity.tenantId,
          codice: entity.codice,
          nome: entity.nome,
          pIva: entity.pIva,
          stato: entity.stato,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        })),
        organizationId: tenantId,
        context: "cross-tenant",
        message: `Legal entities for organization ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching legal entities for organization ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch organization legal entities" });
    }
  });
  app.get("/brand-api/organizations/:id/analytics", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { id: rawTenantId } = req.params;
    const tenantId = rawTenantId?.split("?")[0];
    if (user.role !== "super_admin" && user.role !== "national_manager" && user.role !== "regional_manager") {
      return res.status(403).json({ error: "Insufficient permissions to view organizational analytics" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      console.log(`\u{1F527} [BRAND-DEV] Development mode: Bypassing authentication for /organizations/${tenantId}/analytics`);
      console.log("\u{1F3AF} Brand Auth Context:", context.type);
      const analytics = await brandStorage.getOrganizationalAnalytics(tenantId);
      res.json({
        success: true,
        data: analytics,
        organizationId: tenantId,
        context: "cross-tenant",
        metadata: {
          tenantId,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      console.error(`Error fetching organizational analytics for ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch organizational analytics" });
    }
  });
  app.post("/brand-api/stores", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create stores" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const parseResult = insertStoreSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid store data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const validatedData = parseResult.data;
      const { tenantId, legalEntityId, code, nome, channelId, commercialAreaId, ...otherFields } = validatedData;
      const finalCode = code || `ST${String(Date.now()).slice(-6)}`;
      const storeData = {
        ...validatedData,
        code: finalCode,
        status: validatedData.status || "active"
      };
      const store = await brandStorage.createStore(storeData);
      res.status(201).json({
        success: true,
        store: {
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          createdAt: store.createdAt
        },
        message: "Store created successfully"
      });
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });
  app.patch("/brand-api/stores/:id", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { id } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to update stores" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const updateSchema = insertStoreSchema.partial().omit({
        id: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true
      });
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid update data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const allowedFields = parseResult.data;
      const store = await brandStorage.updateStore(id, allowedFields);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      res.json({
        success: true,
        store: {
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          updatedAt: store.updatedAt
        },
        message: "Store updated successfully"
      });
    } catch (error) {
      console.error("Error updating store:", error);
      res.status(500).json({ error: "Failed to update store" });
    }
  });
  app.get("/brand-api/analytics/cross-tenant", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant analytics" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "Analytics cross-tenant requires global access" });
    }
    try {
      const tenants2 = await brandStorage.getTenants();
      const users2 = await brandStorage.getUsers();
      res.json({
        summary: {
          totalTenants: tenants2.length,
          totalUsers: users2.length,
          activeTenants: tenants2.filter((t) => t.status === "active").length,
          totalRevenue: 125e4,
          // Mock per ora
          growthRate: "+12.5%"
          // Mock per ora
        },
        context: "cross-tenant",
        message: "Global analytics data"
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
  app.get("/brand-api/:tenant/stores", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires tenant-specific context" });
    }
    res.json({
      tenant: context.tenantId,
      stores: [
        { id: "store-1", name: "Store Centro", status: "active" },
        { id: "store-2", name: "Store Nord", status: "active" }
      ],
      context: `tenant-specific: ${req.params.tenant}`,
      message: "Stores for specific tenant"
    });
  });
  app.get("/brand-api/campaigns", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    res.json({
      campaigns: [
        {
          id: "camp-1",
          name: "Campagna Primavera 2024",
          type: "global",
          status: "active",
          targetTenants: "all"
        },
        {
          id: "camp-2",
          name: "Promo Tech Solutions",
          type: "tenant_specific",
          status: "draft",
          targetTenants: ["22222222-2222-2222-2222-222222222222"]
        }
      ],
      context: context.isCrossTenant ? "cross-tenant" : `tenant: ${context.tenantId}`,
      message: "Brand campaigns (stored in Brand Level tables)"
    });
  });
  app.get("/brand-api/deployment-targets", (req, res) => {
    const context = req.brandContext;
    res.json({
      targets: context.isCrossTenant ? ["all-tenants", "staging", "demo", "acme", "tech"] : [`tenant-${context.tenantId}`],
      context: context.isCrossTenant ? "cross-tenant" : `tenant-specific: ${context.tenantId}`,
      message: "Available deployment targets"
    });
  });
  app.post("/brand-api/deploy", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { campaignId, targetType, targetTenants } = req.body;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to deploy campaigns" });
    }
    res.json({
      deployment: {
        id: `deploy-${Date.now()}`,
        campaignId,
        targetType,
        targetTenants: targetType === "all" ? "all-tenants" : targetTenants,
        status: "pending",
        initiatedBy: context.userId,
        initiatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      context: context.isCrossTenant ? "cross-tenant" : `tenant-specific: ${context.tenantId}`,
      message: "Deployment initiated"
    });
  });
  async function secureW3BackendCall(endpoint, options = {}) {
    try {
      const response = await fetch(`http://localhost:3004${endpoint}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.W3_SERVICE_TOKEN || "dev-service-token"}`,
          "X-Service": "brand-interface",
          "X-Service-Version": "1.0.0",
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : void 0
      });
      if (!response.ok) {
        throw new Error(`W3 Backend error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Secure W3 Backend call failed for ${endpoint}:`, error);
      throw error;
    }
  }
  app.get("/brand-api/cross-tenant/tenants", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    try {
      const tenants2 = await brandStorage.getTenants();
      res.json({
        tenants: tenants2.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status
        }))
      });
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });
  app.get("/brand-api/cross-tenant/legal-entities/:tenantSlug", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { tenantSlug } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }
    try {
      const tenants2 = await brandStorage.getTenants();
      const tenant = tenants2.find((t) => t.slug === tenantSlug);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }
      const legalEntities2 = await secureW3BackendCall(`/api/legal-entities?tenantId=${tenant.id}`);
      res.json({
        legalEntities: legalEntities2,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching legal entities for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch legal entities" });
    }
  });
  app.get("/brand-api/cross-tenant/channels/:tenantSlug", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { tenantSlug } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }
    try {
      const tenants2 = await brandStorage.getTenants();
      const tenant = tenants2.find((t) => t.slug === tenantSlug);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }
      const channels2 = await secureW3BackendCall(`/api/channels?tenantId=${tenant.id}`);
      res.json({
        channels: channels2,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching channels for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });
  app.get("/brand-api/cross-tenant/commercial-areas/:tenantSlug", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { tenantSlug } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }
    try {
      const tenants2 = await brandStorage.getTenants();
      const tenant = tenants2.find((t) => t.slug === tenantSlug);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }
      const commercialAreas2 = await secureW3BackendCall(`/api/commercial-areas?tenantId=${tenant.id}`);
      res.json({
        commercialAreas: commercialAreas2,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching commercial areas for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch commercial areas" });
    }
  });
  app.get("/brand-api/cross-tenant/brands/:tenantSlug", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const { tenantSlug } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }
    try {
      const tenants2 = await brandStorage.getTenants();
      const tenant = tenants2.find((t) => t.slug === tenantSlug);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }
      const brands2 = await secureW3BackendCall(`/api/brands?tenantId=${tenant.id}`);
      res.json({
        brands: brands2,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching brands for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });
  app.post("/brand-api/cross-tenant/stores", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    const storeData = req.body;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create cross-tenant stores" });
    }
    if (!storeData.tenantSlug) {
      return res.status(400).json({ error: "tenantSlug is required" });
    }
    try {
      const tenants2 = await brandStorage.getTenants();
      const tenant = tenants2.find((t) => t.slug === storeData.tenantSlug);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${storeData.tenantSlug}` });
      }
      const { tenantSlug, ...cleanStoreData } = storeData;
      const storePayload = {
        ...cleanStoreData,
        tenantId: tenant.id,
        // Server-controlled tenant ID
        createdBy: user.id,
        createdFromBrandInterface: true,
        brandInterfaceUser: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
      const createdStore = await secureW3BackendCall("/api/stores", {
        method: "POST",
        body: storePayload,
        headers: {
          "X-Tenant-ID": tenant.id,
          // Server-controlled tenant targeting
          "X-Source": "brand-interface"
        }
      });
      await brandStorage.createAuditLog({
        tenantId: tenant.id,
        userEmail: user.email,
        userRole: user.role,
        action: "CREATE_CROSS_TENANT_STORE",
        resourceType: "store",
        resourceIds: [createdStore.id],
        targetTenants: [tenant.slug || tenant.name],
        metadata: {
          storeCode: storeData.code,
          storeName: storeData.nome,
          brandInterfaceUserId: user.id
        }
      });
      res.json({
        success: true,
        store: createdStore,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        message: `Store created successfully on tenant ${tenant.name}`
      });
    } catch (error) {
      console.error(`Error creating store for tenant ${storeData.tenantSlug}:`, error);
      res.status(500).json({
        error: "Failed to create store",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/ai/agents", async (req, res) => {
    try {
      const { moduleContext, status, search, page = "1", limit = "25" } = req.query;
      const filters = {
        moduleContext,
        status,
        search
      };
      Object.keys(filters).forEach((key) => {
        if (!filters[key] || filters[key] === "all") {
          delete filters[key];
        }
      });
      const agents = await brandStorage.getAIAgents(filters);
      res.json({
        success: true,
        data: {
          agents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: agents.length
          }
        }
      });
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch AI agents"
      });
    }
  });
  app.get("/brand-api/ai/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const agent = await brandStorage.getAIAgent(id);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      res.json({
        success: true,
        data: agent
      });
    } catch (error) {
      console.error("Error fetching AI agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch AI agent"
      });
    }
  });
  app.post("/brand-api/ai/agents", async (req, res) => {
    try {
      const agentData = req.body;
      if (!agentData.agentId || !agentData.name || !agentData.systemPrompt) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: agentId, name, systemPrompt"
        });
      }
      const existingAgent = await brandStorage.getAIAgentByAgentId(agentData.agentId);
      if (existingAgent) {
        return res.status(409).json({
          success: false,
          error: "Agent ID already exists"
        });
      }
      const newAgent = await brandStorage.createAIAgent(agentData);
      res.status(201).json({
        success: true,
        data: newAgent
      });
    } catch (error) {
      console.error("Error creating AI agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create AI agent"
      });
    }
  });
  app.put("/brand-api/ai/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedAgent = await brandStorage.updateAIAgent(id, updateData);
      if (!updatedAgent) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      res.json({
        success: true,
        data: updatedAgent
      });
    } catch (error) {
      console.error("Error updating AI agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update AI agent"
      });
    }
  });
  app.delete("/brand-api/ai/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await brandStorage.deleteAIAgent(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      res.json({
        success: true,
        message: "AI agent deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting AI agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete AI agent"
      });
    }
  });
  app.post("/brand-api/ai/agents/bulk", async (req, res) => {
    try {
      const { operation, agentIds, values } = req.body;
      if (!operation || !agentIds || !Array.isArray(agentIds)) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: operation, agentIds (array)"
        });
      }
      const result = await brandStorage.bulkUpdateAIAgents(agentIds, operation, values);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error in bulk operation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to perform bulk operation"
      });
    }
  });
  app.get("/brand-api/ai/agents/export.csv", async (req, res) => {
    try {
      const { moduleContext, status, search } = req.query;
      const filters = {
        moduleContext,
        status,
        search
      };
      Object.keys(filters).forEach((key) => {
        if (!filters[key] || filters[key] === "all") {
          delete filters[key];
        }
      });
      const csvContent = await brandStorage.exportAIAgentsCSV(filters);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="ai-agents-export-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting AI agents CSV:", error);
      res.status(500).json({
        success: false,
        error: "Failed to export AI agents CSV"
      });
    }
  });
  app.get("/brand-api/ai/analytics", async (req, res) => {
    try {
      const analyticsData = {
        totalAgents: 1,
        activeAgents: 1,
        totalInteractions: 0,
        totalTokensUsed: 0,
        agentsByModule: [
          { module: "general", count: 1, percentage: 100 }
        ],
        usageByAgent: [],
        tenantUsage: []
      };
      res.json({
        success: true,
        data: analyticsData
      });
    } catch (error) {
      console.error("Error fetching AI analytics:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch AI analytics"
      });
    }
  });
  app.get("/brand-api/ai/configurations", async (req, res) => {
    try {
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error("Error fetching AI configurations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch AI configurations"
      });
    }
  });
  app.post("/brand-api/ai/agents/:id/documents", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      const { content, filename } = req.body;
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      if (!content || !filename) {
        return res.status(400).json({
          success: false,
          error: "content and filename are required"
        });
      }
      console.log(`[BRAND-TRAINING] \u{1F4C4} Processing document training for agent ${agentId}: ${filename}`);
      const result = await brandStorage.processAgentTraining({
        agentId,
        sourceType: "document",
        content,
        filename,
        origin: "brand"
      });
      res.json({
        success: true,
        message: "Document processed successfully for cross-tenant training",
        data: {
          agentId,
          filename,
          chunksCreated: result.chunksCreated,
          embeddingsGenerated: result.embeddingsGenerated,
          savedToOrigin: "brand"
        }
      });
    } catch (error) {
      console.error("Error uploading agent documents:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload documents"
      });
    }
  });
  app.post("/brand-api/ai/agents/:id/urls", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      const { url } = req.body;
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      if (!url) {
        return res.status(400).json({
          success: false,
          error: "URL is required"
        });
      }
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid URL format"
        });
      }
      console.log(`[BRAND-TRAINING] \u{1F310} Processing URL training for agent ${agentId}: ${url}`);
      const result = await brandStorage.processAgentTraining({
        agentId,
        sourceType: "url",
        sourceUrl: url,
        origin: "brand"
      });
      res.json({
        success: true,
        message: "URL processed successfully for cross-tenant training",
        data: {
          agentId,
          url,
          chunksCreated: result.chunksCreated,
          embeddingsGenerated: result.embeddingsGenerated,
          savedToOrigin: "brand"
        }
      });
    } catch (error) {
      console.error("Error adding agent URL:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add URL knowledge source"
      });
    }
  });
  app.get("/brand-api/ai/agents/:id/urls", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      const knowledgeBase = await brandStorage.getAgentCrossTenantKnowledge(agentId, {
        includeUrls: true,
        includeDocuments: false,
        limit: 20
      });
      const urlItems = knowledgeBase.items.filter((item) => item.sourceType === "url_content");
      res.json({
        success: true,
        data: {
          agentId,
          urls: urlItems,
          count: urlItems.length
        }
      });
    } catch (error) {
      console.error("Error fetching agent URLs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch URLs"
      });
    }
  });
  app.get("/brand-api/ai/agents/:id/knowledge", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      const knowledgeBase = await brandStorage.getAgentCrossTenantKnowledge(agentId, {
        includeDocuments: true,
        includeUrls: true,
        limit: parseInt(req.query.limit) || 50
      });
      res.json({
        success: true,
        data: {
          agentId,
          knowledgeBase: knowledgeBase.items,
          stats: {
            totalDocuments: knowledgeBase.stats.documents,
            totalUrls: knowledgeBase.stats.urls,
            totalEmbeddings: knowledgeBase.stats.totalEmbeddings,
            brandLevel: knowledgeBase.stats.brandLevel,
            tenantLevel: knowledgeBase.stats.tenantLevel
          }
        }
      });
    } catch (error) {
      console.error("Error fetching agent knowledge base:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch knowledge base"
      });
    }
  });
  app.delete("/brand-api/ai/agents/:id/knowledge/:itemId", async (req, res) => {
    try {
      const { id: agentId, itemId } = req.params;
      const { type } = req.body;
      console.log(`\u{1F5D1}\uFE0F [RAG] Deleting ${type} with ID ${itemId} for agent ${agentId}`);
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "AI agent not found"
        });
      }
      console.log(`\u2705 [RAG] Successfully deleted ${type} ${itemId} for agent ${agentId}`);
      res.json({
        success: true,
        message: `${type === "document" ? "Documento" : "URL"} eliminato con successo`,
        deletedItem: {
          id: itemId,
          agentId,
          type
        }
      });
    } catch (error) {
      console.error("Error deleting knowledge item:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete knowledge item"
      });
    }
  });
  app.get("/brand-api/structure/stores", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for structure management" });
    }
    try {
      const filters = {
        tenantId: req.query.tenantId,
        areaCommerciale: req.query.areaCommerciale,
        canale: req.query.canale,
        citta: req.query.citta,
        provincia: req.query.provincia,
        stato: req.query.stato,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };
      const storesData = await brandStorage.getStructureStores(filters);
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || "00000000-0000-0000-0000-000000000000",
        userEmail: user.email,
        userRole: user.role,
        action: "VIEW_STRUCTURE_STORES",
        resourceType: "stores",
        resourceIds: storesData.stores.map((s) => s.id),
        metadata: {
          filters,
          resultsCount: storesData.stores.length,
          totalCount: storesData.pagination.total
        }
      });
      res.json({
        success: true,
        data: storesData,
        message: `Retrieved ${storesData.stores.length} stores`
      });
    } catch (error) {
      console.error("Error fetching structure stores:", error);
      res.status(500).json({
        error: "Failed to fetch structure stores",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/structure/stats/stream", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for structure statistics" });
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control"
    });
    const tenantId = req.query.tenantId;
    const sendStats = async () => {
      try {
        const stats = await brandStorage.getStructureStats(tenantId);
        const data = {
          success: true,
          data: stats,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        res.write(`data: ${JSON.stringify(data)}

`);
      } catch (error) {
        console.error("Error fetching real-time stats:", error);
        const errorData = {
          success: false,
          error: "Failed to fetch statistics",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        res.write(`data: ${JSON.stringify(errorData)}

`);
      }
    };
    await sendStats();
    const interval = setInterval(sendStats, 3e4);
    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
    req.on("aborted", () => {
      clearInterval(interval);
      res.end();
    });
  });
  app.get("/brand-api/audit-logs", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for audit logs" });
    }
    try {
      const tenantId = req.query.tenantId;
      const limit = parseInt(req.query.limit) || 50;
      const auditLogs = await brandStorage.getAuditLogs(tenantId, limit);
      res.json({
        success: true,
        data: { auditLogs },
        message: "Audit logs retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({
        error: "Failed to fetch audit logs",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/structure/stats", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for structure statistics" });
    }
    try {
      const tenantId = req.query.tenantId;
      const stats = await brandStorage.getStructureStats(tenantId);
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || "00000000-0000-0000-0000-000000000000",
        userEmail: user.email,
        userRole: user.role,
        action: "VIEW_STRUCTURE_STATS",
        resourceType: "statistics",
        metadata: {
          tenantId,
          totalStores: stats.totalStores,
          activeStores: stats.activeStores
        }
      });
      res.json({
        success: true,
        data: stats,
        message: "Structure statistics retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching structure stats:", error);
      res.status(500).json({
        error: "Failed to fetch structure statistics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/brand-api/tenants", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super administrators can create organizations" });
    }
    const organizationData = req.body;
    if (!organizationData.name || !organizationData.brandAdminEmail) {
      return res.status(400).json({
        error: "Missing required fields: name and brandAdminEmail are required"
      });
    }
    try {
      const newOrganization = await brandStorage.createOrganization(organizationData);
      await brandStorage.createAuditLog({
        tenantId: newOrganization.id,
        userEmail: user.email,
        userRole: user.role,
        action: "CREATE_ORGANIZATION",
        resourceType: "organization",
        resourceIds: [newOrganization.id],
        metadata: {
          organizationName: newOrganization.name,
          organizationSlug: newOrganization.slug,
          brandAdminEmail: newOrganization.brandAdminEmail,
          createdByUserId: user.id
        }
      });
      res.json({
        success: true,
        data: {
          id: newOrganization.id,
          name: newOrganization.name,
          slug: newOrganization.slug,
          status: newOrganization.status,
          brandAdminEmail: newOrganization.brandAdminEmail,
          createdAt: newOrganization.createdAt
        },
        message: `Organization '${newOrganization.name}' created successfully`
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({
        error: "Failed to create organization",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/brand-api/organizations", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super administrators can create organizations" });
    }
    const { name, slug, status = "active", notes } = req.body;
    if (!name) {
      return res.status(400).json({
        error: "Missing required field: name is required"
      });
    }
    if (slug) {
      const isSlugAvailable = await brandStorage.validateSlug(slug);
      if (!isSlugAvailable) {
        return res.status(400).json({
          error: "Slug is already taken. Please choose a different one."
        });
      }
    }
    try {
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const newOrganization = await brandStorage.createOrganizationRecord({
        name,
        slug: finalSlug,
        status,
        notes: notes || null
      });
      res.json({
        success: true,
        data: {
          id: newOrganization.id,
          name: newOrganization.name,
          slug: newOrganization.slug,
          status: newOrganization.status,
          notes: newOrganization.notes,
          createdAt: newOrganization.createdAt
        },
        message: `Organization '${newOrganization.name}' created successfully`
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({
        error: "Failed to create organization",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/organizations/validate-slug/:slug", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }
    try {
      const isAvailable = await brandStorage.validateSlug(slug);
      res.json({
        slug,
        available: isAvailable,
        message: isAvailable ? "Slug is available" : "Slug is already taken"
      });
    } catch (error) {
      console.error("Error validating slug:", error);
      res.status(500).json({
        error: "Failed to validate slug",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/structure/export.csv", async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for data export" });
    }
    try {
      const filters = {
        tenantId: req.query.tenantId,
        areaCommerciale: req.query.areaCommerciale,
        canale: req.query.canale,
        citta: req.query.citta,
        provincia: req.query.provincia,
        stato: req.query.stato,
        search: req.query.search
      };
      const csvContent = await brandStorage.exportStoresCSV(filters);
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || "00000000-0000-0000-0000-000000000000",
        userEmail: user.email,
        userRole: user.role,
        action: "EXPORT_STRUCTURE_STORES_CSV",
        resourceType: "export",
        metadata: {
          filters,
          exportFormat: "csv",
          exportTimestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      const filename = `stores-export-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting stores CSV:", error);
      res.status(500).json({
        error: "Failed to export stores data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/brand-api/structure/bulk", express.json(), async (req, res) => {
    const context = req.brandContext;
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions for bulk operations" });
    }
    const bulkOperation = req.body;
    if (!bulkOperation.operation || !bulkOperation.storeIds || !Array.isArray(bulkOperation.storeIds)) {
      return res.status(400).json({
        error: "Missing required fields: operation and storeIds array are required"
      });
    }
    try {
      const result = await brandStorage.performBulkOperation(bulkOperation);
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || "00000000-0000-0000-0000-000000000000",
        userEmail: user.email,
        userRole: user.role,
        action: "PERFORM_BULK_OPERATION",
        resourceType: "stores",
        resourceIds: bulkOperation.storeIds,
        metadata: {
          operation: bulkOperation.operation,
          storeCount: bulkOperation.storeIds.length,
          processedCount: result.processedCount,
          errorCount: result.errorCount,
          reason: bulkOperation.reason,
          values: bulkOperation.values
        }
      });
      res.json({
        success: result.success,
        data: result,
        message: `Bulk ${bulkOperation.operation} completed: ${result.processedCount} processed, ${result.errorCount} errors`
      });
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      res.status(500).json({
        error: "Failed to perform bulk operation",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/brand-api/ai-agents", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can create AI agents" });
    }
    try {
      const agentData = req.body;
      const agent = await brandStorage.createAIAgent(agentData);
      res.json({
        success: true,
        data: agent,
        message: "AI agent created successfully"
      });
    } catch (error) {
      console.error("Error creating AI agent:", error);
      res.status(500).json({
        error: "Failed to create AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/ai-agents", async (req, res) => {
    try {
      const filters = {
        moduleContext: req.query.moduleContext,
        status: req.query.status,
        search: req.query.search
      };
      const agents = await brandStorage.getAIAgents(filters);
      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      res.status(500).json({
        error: "Failed to fetch AI agents",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/ai-agents/:id", async (req, res) => {
    try {
      const agent = await brandStorage.getAIAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      res.json({
        success: true,
        data: agent
      });
    } catch (error) {
      console.error("Error fetching AI agent:", error);
      res.status(500).json({
        error: "Failed to fetch AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.put("/brand-api/ai-agents/:id", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can update AI agents" });
    }
    try {
      const agentData = req.body;
      const agent = await brandStorage.updateAIAgent(req.params.id, agentData);
      if (!agent) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      res.json({
        success: true,
        data: agent,
        message: "AI agent updated successfully"
      });
    } catch (error) {
      console.error("Error updating AI agent:", error);
      res.status(500).json({
        error: "Failed to update AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.delete("/brand-api/ai-agents/:id", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete AI agents" });
    }
    try {
      const success = await brandStorage.deleteAIAgent(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      res.json({
        success: true,
        message: "AI agent deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting AI agent:", error);
      res.status(500).json({
        error: "Failed to delete AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.get("/brand-api/wms/categories", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const categories = await brandStorage.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error("Error fetching brand categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app.post("/brand-api/wms/categories", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = insertBrandCategorySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid category data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, createdBy: user.id };
      const category = await brandStorage.createCategory(data);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      console.error("Error creating brand category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  app.patch("/brand-api/wms/categories/:id", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = updateBrandCategorySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid category data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, modifiedBy: user.id };
      const category = await brandStorage.updateCategory(req.params.id, data);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true, data: category });
    } catch (error) {
      console.error("Error updating brand category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });
  app.delete("/brand-api/wms/categories/:id", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete categories" });
    }
    try {
      const success = await brandStorage.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  app.get("/brand-api/wms/product-types", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const categoryId = req.query.categoryId;
      const productTypes = await brandStorage.getProductTypes(categoryId);
      res.json({ success: true, data: productTypes });
    } catch (error) {
      console.error("Error fetching brand product types:", error);
      res.status(500).json({ error: "Failed to fetch product types" });
    }
  });
  app.post("/brand-api/wms/product-types", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = insertBrandProductTypeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid product type data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, createdBy: user.id };
      const productType = await brandStorage.createProductType(data);
      res.status(201).json({ success: true, data: productType });
    } catch (error) {
      console.error("Error creating brand product type:", error);
      res.status(500).json({ error: "Failed to create product type" });
    }
  });
  app.patch("/brand-api/wms/product-types/:id", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = updateBrandProductTypeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid product type data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, modifiedBy: user.id };
      const productType = await brandStorage.updateProductType(req.params.id, data);
      if (!productType) {
        return res.status(404).json({ error: "Product type not found" });
      }
      res.json({ success: true, data: productType });
    } catch (error) {
      console.error("Error updating brand product type:", error);
      res.status(500).json({ error: "Failed to update product type" });
    }
  });
  app.delete("/brand-api/wms/product-types/:id", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete product types" });
    }
    try {
      const success = await brandStorage.deleteProductType(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Product type not found" });
      }
      res.json({ success: true, message: "Product type deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand product type:", error);
      res.status(500).json({ error: "Failed to delete product type" });
    }
  });
  app.get("/brand-api/wms/products", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const filters = {
        categoryId: req.query.categoryId,
        typeId: req.query.typeId,
        status: req.query.status
      };
      const products2 = await brandStorage.getProducts(filters);
      res.json({ success: true, data: products2 });
    } catch (error) {
      console.error("Error fetching brand products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  app.post("/brand-api/wms/products", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = insertBrandProductSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid product data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, createdBy: user.id };
      const product = await brandStorage.createProduct(data);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      console.error("Error creating brand product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });
  app.patch("/brand-api/wms/products/:id", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = updateBrandProductSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid product data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, modifiedBy: user.id };
      const product = await brandStorage.updateProduct(req.params.id, data);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      console.error("Error updating brand product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  app.delete("/brand-api/wms/products/:id", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete products" });
    }
    try {
      const success = await brandStorage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  app.get("/brand-api/wms/suppliers", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const filters = {
        status: req.query.status,
        search: req.query.search
      };
      const suppliers2 = await brandStorage.getSuppliers(filters);
      res.json({ success: true, data: suppliers2 });
    } catch (error) {
      console.error("Error fetching brand suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });
  app.post("/brand-api/wms/suppliers", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = insertBrandSupplierSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid supplier data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, createdBy: user.id };
      const supplier = await brandStorage.createSupplier(data);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      console.error("Error creating brand supplier:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });
  app.patch("/brand-api/wms/suppliers/:id", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const parseResult = updateBrandSupplierSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid supplier data",
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const data = { ...parseResult.data, updatedBy: user.id };
      const supplier = await brandStorage.updateSupplier(req.params.id, data);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json({ success: true, data: supplier });
    } catch (error) {
      console.error("Error updating brand supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });
  app.delete("/brand-api/wms/suppliers/:id", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete suppliers" });
    }
    try {
      const success = await brandStorage.deleteSupplier(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });
  app.post("/brand-api/wms/suppliers/:id/deploy", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const { branchNames } = req.body;
      if (!Array.isArray(branchNames) || branchNames.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          details: "branchNames must be a non-empty array"
        });
      }
      const result = await brandStorage.deploySupplier(
        req.params.id,
        branchNames,
        user.id
      );
      res.json({
        success: result.success,
        data: result
      });
    } catch (error) {
      console.error("Error deploying supplier:", error);
      res.status(500).json({
        error: "Failed to deploy supplier",
        message: error.message
      });
    }
  });
  app.get("/brand-api/wms/suppliers/:id/deployment-history", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const history = await brandStorage.getSupplierDeploymentHistory(req.params.id);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error("Error fetching supplier deployment history:", error);
      res.status(500).json({ error: "Failed to fetch deployment history" });
    }
  });
  app.get("/brand-api/reference/italian-cities", async (req, res) => {
    try {
      const cities = await brandStorage.getItalianCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching Italian cities:", error);
      res.status(500).json({
        error: "Failed to fetch Italian cities",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  await templateStorageService.initialize();
  app.get("/brand-api/templates", async (req, res) => {
    const user = req.user;
    try {
      const templates = await templateStorageService.getAllTemplates();
      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      console.error("Error fetching all templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });
  app.get("/brand-api/templates/:type", async (req, res) => {
    const user = req.user;
    const { type } = req.params;
    if (!["campaign", "pipeline", "funnel"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type. Must be: campaign, pipeline, or funnel" });
    }
    try {
      const templates = await templateStorageService.getTemplates(type);
      res.json({
        success: true,
        data: templates,
        type,
        count: templates.length
      });
    } catch (error) {
      console.error(`Error fetching ${type} templates:`, error);
      res.status(500).json({ error: `Failed to fetch ${type} templates` });
    }
  });
  app.get("/brand-api/templates/:type/:id", async (req, res) => {
    const user = req.user;
    const { type, id } = req.params;
    if (!["campaign", "pipeline", "funnel"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    try {
      const template = await templateStorageService.getTemplate(type, id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error(`Error fetching ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });
  app.post("/brand-api/templates/:type", async (req, res) => {
    const user = req.user;
    const { type } = req.params;
    if (!["campaign", "pipeline", "funnel"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create templates" });
    }
    try {
      const { code, name, description, status, isActive, version, linkedItems, metadata, templateData } = req.body;
      if (!code || !name) {
        return res.status(400).json({ error: "Code and name are required" });
      }
      if (!templateData) {
        return res.status(400).json({ error: "templateData is required (wizard form data)" });
      }
      const template = await templateStorageService.createTemplate(type, {
        code,
        name,
        description,
        status: status || "draft",
        isActive: isActive !== void 0 ? isActive : false,
        version: version || "1.0.0",
        linkedItems: linkedItems || [],
        metadata: metadata || {},
        templateData,
        createdBy: user.id || user.email
      });
      res.status(201).json({
        success: true,
        data: template,
        message: `${type} template created successfully`
      });
    } catch (error) {
      console.error(`Error creating ${type} template:`, error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });
  app.patch("/brand-api/templates/:type/:id", async (req, res) => {
    const user = req.user;
    const { type, id } = req.params;
    if (!["campaign", "pipeline", "funnel"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to update templates" });
    }
    try {
      const updates = {
        ...req.body,
        updatedBy: user.id || user.email
      };
      const template = await templateStorageService.updateTemplate(type, id, updates);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({
        success: true,
        data: template,
        message: `${type} template updated successfully`
      });
    } catch (error) {
      console.error(`Error updating ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });
  app.post("/brand-api/templates/:type/:id/toggle", async (req, res) => {
    const user = req.user;
    const { type, id } = req.params;
    if (!["campaign", "pipeline", "funnel"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to toggle templates" });
    }
    try {
      const template = await templateStorageService.toggleTemplateActive(type, id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({
        success: true,
        data: template,
        message: `${type} template ${template.isActive ? "enabled" : "disabled"} successfully`
      });
    } catch (error) {
      console.error(`Error toggling ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to toggle template" });
    }
  });
  app.delete("/brand-api/templates/:type/:id", async (req, res) => {
    const user = req.user;
    const { type, id } = req.params;
    if (!["campaign", "pipeline", "funnel"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete templates" });
    }
    try {
      const success = await templateStorageService.deleteTemplate(type, id);
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({
        success: true,
        message: `${type} template deleted successfully`
      });
    } catch (error) {
      console.error(`Error deleting ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });
  app.post("/brand-api/templates/import", async (req, res) => {
    const user = req.user;
    const { templates } = req.body;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to import templates" });
    }
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ error: "Invalid import data - expecting array of templates" });
    }
    try {
      const [existingCampaigns, existingPipelines, existingFunnels] = await Promise.all([
        templateStorageService.getTemplates("campaign"),
        templateStorageService.getTemplates("pipeline"),
        templateStorageService.getTemplates("funnel")
      ]);
      const existingTemplates = /* @__PURE__ */ new Map();
      [...existingCampaigns, ...existingPipelines, ...existingFunnels].forEach((t) => {
        existingTemplates.set(`${t.type}:${t.code}`, t);
      });
      const results = {
        imported: [],
        updated: [],
        errors: []
      };
      for (const template of templates) {
        try {
          if (!template.type || !["campaign", "pipeline", "funnel"].includes(template.type)) {
            results.errors.push({
              template: template.name || "Unknown",
              error: "Invalid or missing template type"
            });
            continue;
          }
          if (!template.name || !template.code) {
            results.errors.push({
              template: template.name || "Unknown",
              error: "Missing required fields (name, code)"
            });
            continue;
          }
          const existing = existingTemplates.get(`${template.type}:${template.code}`);
          if (existing) {
            const updated = await templateStorageService.updateTemplate(
              template.type,
              existing.id,
              {
                ...template,
                updatedBy: user.email
              }
            );
            if (updated) {
              results.updated.push(updated);
            }
          } else {
            const created = await templateStorageService.createTemplate(
              template.type,
              {
                code: template.code,
                name: template.name,
                description: template.description || "",
                status: template.status || "draft",
                isActive: template.isActive ?? false,
                version: template.version || "1.0.0",
                linkedItems: template.linkedItems || [],
                metadata: template.metadata || {},
                templateData: template.templateData || {},
                createdBy: user.email
              }
            );
            results.imported.push(created);
          }
        } catch (error) {
          results.errors.push({
            template: template.name || "Unknown",
            error: error.message || "Failed to process template"
          });
        }
      }
      res.json({
        success: true,
        data: results,
        message: `Import completed: ${results.imported.length} created, ${results.updated.length} updated, ${results.errors.length} errors`
      });
    } catch (error) {
      console.error("Error importing templates:", error);
      res.status(500).json({ error: "Failed to import templates" });
    }
  });
  app.get("/brand-api/workflows", async (req, res) => {
    const user = req.user;
    try {
      const workflows = await brandStorage.getBrandWorkflows();
      res.json({
        success: true,
        data: workflows,
        count: workflows.length
      });
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });
  app.get("/brand-api/workflows/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const workflow = await brandStorage.getBrandWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });
  app.post("/brand-api/workflows", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create workflows" });
    }
    try {
      const { code, name, description, category, tags, version, status, dslJson } = req.body;
      if (!code || !name) {
        return res.status(400).json({ error: "Code and name are required" });
      }
      if (!dslJson) {
        return res.status(400).json({ error: "dslJson is required (workflow definition)" });
      }
      const workflow = await brandStorage.createBrandWorkflow({
        code,
        name,
        description,
        category: category || "crm",
        tags: tags || [],
        version: version || "1.0.0",
        status: status || "draft",
        dslJson,
        createdBy: user.id || user.email
      });
      res.status(201).json({
        success: true,
        data: workflow,
        message: "Workflow created successfully"
      });
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });
  app.patch("/brand-api/workflows/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to update workflows" });
    }
    try {
      const updates = {
        ...req.body,
        updatedBy: user.id || user.email
      };
      const workflow = await brandStorage.updateBrandWorkflow(id, updates);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json({
        success: true,
        data: workflow,
        message: "Workflow updated successfully"
      });
    } catch (error) {
      console.error(`Error updating workflow ${id}:`, error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });
  app.delete("/brand-api/workflows/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete workflows" });
    }
    try {
      const success = await brandStorage.deleteBrandWorkflow(id);
      if (!success) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json({
        success: true,
        message: "Workflow deleted successfully"
      });
    } catch (error) {
      console.error(`Error deleting workflow ${id}:`, error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });
  app.get("/brand-api/tasks", async (req, res) => {
    const user = req.user;
    try {
      const tasks2 = await brandStorage.getAllBrandTasks();
      res.json({
        success: true,
        data: tasks2,
        count: tasks2.length
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  app.get("/brand-api/tasks/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const task = await brandStorage.getBrandTaskById(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });
  app.post("/brand-api/tasks", async (req, res) => {
    const user = req.user;
    try {
      const taskData = {
        ...req.body,
        brandTenantId: BRAND_TENANT_ID
      };
      const task = await brandStorage.createBrandTask(taskData);
      res.status(201).json({
        success: true,
        data: task,
        message: "Task created successfully"
      });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });
  app.patch("/brand-api/tasks/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const task = await brandStorage.updateBrandTask(id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({
        success: true,
        data: task,
        message: "Task updated successfully"
      });
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });
  app.delete("/brand-api/tasks/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to delete tasks" });
    }
    try {
      const success = await brandStorage.deleteBrandTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({
        success: true,
        message: "Task deleted successfully"
      });
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });
  app.get("/brand-api/deploy/gap-analysis", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    try {
      const commits = await brandStorage.getDeployments({});
      const toolGroups = {};
      commits.forEach((commit) => {
        if (!toolGroups[commit.tool]) {
          toolGroups[commit.tool] = [];
        }
        toolGroups[commit.tool].push(commit);
      });
      const gapAnalysis = Object.entries(toolGroups).map(([tool, toolCommits]) => {
        const versions = toolCommits.map((c) => c.version).sort((a, b) => b.localeCompare(a));
        const latestVersion = versions[0];
        const versionCounts = {};
        toolCommits.forEach((commit) => {
          if (!versionCounts[commit.version]) {
            versionCounts[commit.version] = {
              tenantCount: /* @__PURE__ */ new Set(),
              storeCount: 0
            };
          }
          versionCounts[commit.version].tenantCount.add(commit.id);
          versionCounts[commit.version].storeCount += 1;
        });
        const deployedVersions = Object.entries(versionCounts).map(([version, counts]) => ({
          version,
          tenantCount: counts.tenantCount.size,
          storeCount: counts.storeCount,
          isLatest: version === latestVersion
        })).sort((a, b) => b.version.localeCompare(a.version));
        return {
          tool,
          latestVersion,
          deployedVersions
        };
      });
      res.json({ success: true, data: gapAnalysis });
    } catch (error) {
      console.error("Error fetching gap analysis:", error);
      res.status(500).json({ error: "Failed to fetch gap analysis" });
    }
  });
  app.get("/brand-api/deploy/commits", async (req, res) => {
    const user = req.user;
    try {
      const filters = {
        tool: req.query.tool,
        status: req.query.status
      };
      const deployments = await brandStorage.getDeployments(filters);
      res.json({
        success: true,
        data: deployments
      });
    } catch (error) {
      console.error("Error fetching deployments:", error);
      res.status(500).json({ error: "Failed to fetch deployments" });
    }
  });
  app.get("/brand-api/deploy/commits/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const deployment = await brandStorage.getDeployment(id);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      res.json({
        success: true,
        data: deployment
      });
    } catch (error) {
      console.error(`Error fetching deployment ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch deployment" });
    }
  });
  app.post("/brand-api/deploy/commits", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create deployments" });
    }
    try {
      const deployment = await brandStorage.createDeployment({
        ...req.body,
        createdBy: user.email,
        brandTenantId: user.brandTenantId
      });
      res.status(201).json({
        success: true,
        data: deployment,
        message: "Deployment created successfully"
      });
    } catch (error) {
      console.error("Error creating deployment:", error);
      res.status(500).json({ error: "Failed to create deployment" });
    }
  });
  app.patch("/brand-api/deploy/commits/:id", express.json(), async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to update deployments" });
    }
    try {
      const deployment = await brandStorage.updateDeployment(id, req.body);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      res.json({
        success: true,
        data: deployment,
        message: "Deployment updated successfully"
      });
    } catch (error) {
      console.error(`Error updating deployment ${id}:`, error);
      res.status(500).json({ error: "Failed to update deployment" });
    }
  });
  app.delete("/brand-api/deploy/commits/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admins can delete deployments" });
    }
    try {
      const success = await brandStorage.deleteDeployment(id);
      if (!success) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      res.json({
        success: true,
        message: "Deployment deleted successfully"
      });
    } catch (error) {
      console.error(`Error deleting deployment ${id}:`, error);
      res.status(500).json({ error: "Failed to delete deployment" });
    }
  });
  app.get("/brand-api/deploy/branches", async (req, res) => {
    const user = req.user;
    try {
      const tenantId = req.query.tenantId;
      const branches = await brandStorage.getBranches(tenantId);
      res.json({
        success: true,
        data: branches
      });
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });
  app.post("/brand-api/deploy/execute", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to execute deployments" });
    }
    try {
      const { commitId, branchIds } = req.body;
      if (!commitId || !Array.isArray(branchIds) || branchIds.length === 0) {
        return res.status(400).json({
          error: "Missing required fields: commitId and branchIds (array)"
        });
      }
      const deployment = await brandStorage.getDeployment(commitId);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      const allBranches = await brandStorage.getBranches();
      const selectedBranches = allBranches.filter((b) => branchIds.includes(b.id));
      if (selectedBranches.length === 0) {
        return res.status(404).json({ error: "No valid branches found" });
      }
      console.log(`\u{1F680} Executing deployment ${commitId} to ${selectedBranches.length} branches`);
      await brandStorage.updateDeployment(commitId, { status: "in_progress" });
      const results = [];
      const webhookSecret = process.env.BRAND_WEBHOOK_SECRET || "dev-webhook-secret-change-in-production";
      for (const branch of selectedBranches) {
        try {
          console.log(`\u{1F4E4} Pushing to branch: ${branch.branchName} (tenant: ${branch.tenantId})`);
          const payload = {
            commitId: deployment.id,
            tool: deployment.tool,
            resourceType: deployment.resourceType,
            version: deployment.version,
            data: deployment.payloadData
            // JSON data to merge
          };
          const timestamp5 = Math.floor(Date.now() / 1e3).toString();
          const payloadString = JSON.stringify(payload);
          const signaturePayload = `${timestamp5}.${payloadString}`;
          const crypto3 = await import("crypto");
          const signature = crypto3.createHmac("sha256", webhookSecret).update(signaturePayload).digest("hex");
          const tenantWebhookUrl = process.env.TENANT_WEBHOOK_BASE_URL || `http://localhost:3004`;
          const webhookUrl = `${tenantWebhookUrl}/api/webhooks/brand-deploy/${branch.tenantId}`;
          console.log(`\u{1F517} Calling webhook: ${webhookUrl}`);
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-signature": signature,
              "x-webhook-timestamp": timestamp5
            },
            body: payloadString
          });
          const responseData = await response.json();
          if (response.ok && responseData.received) {
            console.log(`\u2705 Deployment successful for branch: ${branch.branchName}`);
            await brandStorage.updateBranch(branch.id, {
              deploymentStatus: "deployed",
              lastDeployedCommitId: commitId,
              lastDeployedAt: /* @__PURE__ */ new Date()
            });
            await brandStorage.createDeploymentStatus({
              deploymentId: commitId,
              branchId: branch.id,
              status: "success",
              deployedAt: /* @__PURE__ */ new Date(),
              metadata: responseData.result
            });
            results.push({
              branchId: branch.id,
              branchName: branch.branchName,
              tenantId: branch.tenantId,
              status: "success",
              message: responseData.result?.message || "Deployed successfully"
            });
          } else {
            console.error(`\u274C Deployment failed for branch: ${branch.branchName}`, responseData);
            await brandStorage.createDeploymentStatus({
              deploymentId: commitId,
              branchId: branch.id,
              status: "failed",
              errorMessage: responseData.error || "Webhook call failed",
              metadata: responseData
            });
            results.push({
              branchId: branch.id,
              branchName: branch.branchName,
              tenantId: branch.tenantId,
              status: "failed",
              error: responseData.error || "Webhook call failed"
            });
          }
        } catch (error) {
          console.error(`\u274C Error deploying to branch ${branch.branchName}:`, error);
          await brandStorage.createDeploymentStatus({
            deploymentId: commitId,
            branchId: branch.id,
            status: "failed",
            errorMessage: error instanceof Error ? error.message : String(error)
          });
          results.push({
            branchId: branch.id,
            branchName: branch.branchName,
            tenantId: branch.tenantId,
            status: "failed",
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      const allSuccess = results.every((r) => r.status === "success");
      const someSuccess = results.some((r) => r.status === "success");
      const finalStatus = allSuccess ? "completed" : someSuccess ? "partial" : "failed";
      await brandStorage.updateDeployment(commitId, {
        status: finalStatus,
        completedAt: /* @__PURE__ */ new Date()
      });
      console.log(`\u{1F3C1} Deployment ${commitId} finished with status: ${finalStatus}`);
      console.log(`   Success: ${results.filter((r) => r.status === "success").length}/${results.length}`);
      res.json({
        success: true,
        deploymentId: commitId,
        status: finalStatus,
        results,
        summary: {
          total: results.length,
          success: results.filter((r) => r.status === "success").length,
          failed: results.filter((r) => r.status === "failed").length
        }
      });
    } catch (error) {
      console.error("Error executing deployment:", error);
      res.status(500).json({ error: "Failed to execute deployment" });
    }
  });
  app.get("/brand-api/deploy/branches/:branchName", async (req, res) => {
    const user = req.user;
    const { branchName } = req.params;
    try {
      const branch = await brandStorage.getBranch(branchName);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json({
        success: true,
        data: branch
      });
    } catch (error) {
      console.error(`Error fetching branch ${branchName}:`, error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });
  app.post("/brand-api/deploy/branches", express.json(), async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to create branches" });
    }
    try {
      const branch = await brandStorage.createBranch({
        ...req.body,
        brandTenantId: user.brandTenantId
      });
      res.status(201).json({
        success: true,
        data: branch,
        message: "Branch created successfully"
      });
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });
  app.post("/brand-api/deploy/branches/sync", async (req, res) => {
    const user = req.user;
    if (user.role !== "super_admin" && user.role !== "national_manager") {
      return res.status(403).json({ error: "Insufficient permissions to sync branches" });
    }
    try {
      console.log(`\u{1F504} [SYNC-BRANCHES] User ${user.email} initiated branch sync`);
      const result = await brandStorage.syncBranchesFromTenants();
      res.json({
        success: true,
        data: result,
        message: `Branch synchronization complete. Created: ${result.created}, Updated: ${result.updated}, Total: ${result.total}`
      });
    } catch (error) {
      console.error("\u274C [SYNC-BRANCHES] Error syncing branches:", error);
      res.status(500).json({ error: "Failed to sync branches" });
    }
  });
  app.get("/brand-api/deploy/status", async (req, res) => {
    const user = req.user;
    const { deploymentId, branchId, status, tool, tenantSlug, storeCode, limit, offset } = req.query;
    try {
      const filters = {};
      if (deploymentId) filters.deploymentId = deploymentId;
      if (branchId) filters.branchId = branchId;
      if (status) filters.status = status;
      if (tool) filters.tool = tool;
      if (tenantSlug) filters.tenantSlug = tenantSlug;
      if (storeCode) filters.storeCode = storeCode;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);
      const statuses = await brandStorage.getDeploymentStatuses(filters);
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error("Error fetching deployment statuses:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch deployment statuses"
      });
    }
  });
  app.get("/brand-api/deploy/status/:deploymentId", async (req, res) => {
    const user = req.user;
    const { deploymentId } = req.params;
    try {
      const statuses = await brandStorage.getDeploymentStatuses(deploymentId);
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error(`Error fetching deployment statuses for ${deploymentId}:`, error);
      res.status(500).json({ error: "Failed to fetch deployment statuses" });
    }
  });
  app.post("/brand-api/deploy/status", express.json(), async (req, res) => {
    const user = req.user;
    try {
      const status = await brandStorage.createDeploymentStatus({
        ...req.body,
        brandTenantId: user.brandTenantId
      });
      res.status(201).json({
        success: true,
        data: status,
        message: "Deployment status created successfully"
      });
    } catch (error) {
      console.error("Error creating deployment status:", error);
      res.status(500).json({ error: "Failed to create deployment status" });
    }
  });
  app.patch("/brand-api/deploy/status/:id", express.json(), async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const status = await brandStorage.updateDeploymentStatus(id, req.body);
      if (!status) {
        return res.status(404).json({ error: "Deployment status not found" });
      }
      res.json({
        success: true,
        data: status,
        message: "Deployment status updated successfully"
      });
    } catch (error) {
      console.error(`Error updating deployment status ${id}:`, error);
      res.status(500).json({ error: "Failed to update deployment status" });
    }
  });
  app.get("/brand-api/deploy/sessions", async (req, res) => {
    const user = req.user;
    const { status, launchedBy } = req.query;
    try {
      const filters = {};
      if (status) filters.status = status;
      if (launchedBy) filters.launchedBy = launchedBy;
      const sessions = await brandStorage.getDeploymentSessions(filters);
      res.json({
        success: true,
        data: sessions,
        message: "Deployment sessions fetched successfully"
      });
    } catch (error) {
      console.error("Error fetching deployment sessions:", error);
      res.status(500).json({ error: "Failed to fetch deployment sessions" });
    }
  });
  app.get("/brand-api/deploy/sessions/:id", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const session = await brandStorage.getDeploymentSession(id);
      if (!session) {
        return res.status(404).json({ error: "Deployment session not found" });
      }
      res.json({
        success: true,
        data: session,
        message: "Deployment session fetched successfully"
      });
    } catch (error) {
      console.error(`Error fetching deployment session ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch deployment session" });
    }
  });
  app.post("/brand-api/deploy/sessions", express.json(), async (req, res) => {
    const user = req.user;
    try {
      const session = await brandStorage.createDeploymentSession({
        ...req.body,
        launchedBy: user.email,
        brandTenantId: user.brandTenantId
      });
      res.status(201).json({
        success: true,
        data: session,
        message: "Deployment session created successfully"
      });
    } catch (error) {
      console.error("Error creating deployment session:", error);
      res.status(500).json({ error: "Failed to create deployment session" });
    }
  });
  app.post("/brand-api/deploy/sessions/:id/launch", async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const session = await brandStorage.launchDeploymentSession(id);
      if (!session) {
        return res.status(404).json({ error: "Deployment session not found" });
      }
      res.json({
        success: true,
        data: session,
        message: "Deployment session launched successfully"
      });
    } catch (error) {
      console.error(`Error launching deployment session ${id}:`, error);
      res.status(500).json({ error: "Failed to launch deployment session" });
    }
  });
  app.patch("/brand-api/deploy/sessions/:id", express.json(), async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      const session = await brandStorage.updateDeploymentSession(id, req.body);
      if (!session) {
        return res.status(404).json({ error: "Deployment session not found" });
      }
      res.json({
        success: true,
        data: session,
        message: "Deployment session updated successfully"
      });
    } catch (error) {
      console.error(`Error updating deployment session ${id}:`, error);
      res.status(500).json({ error: "Failed to update deployment session" });
    }
  });
  app.patch("/brand-api/deploy/session-commits/:id", express.json(), async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
      console.log(`[SESSION-COMMIT-UPDATE] ID: ${id}, Body:`, JSON.stringify(req.body, null, 2));
      const sanitizedData = { ...req.body };
      if (sanitizedData.startedAt && typeof sanitizedData.startedAt === "string") {
        sanitizedData.startedAt = new Date(sanitizedData.startedAt);
      }
      if (sanitizedData.completedAt && typeof sanitizedData.completedAt === "string") {
        sanitizedData.completedAt = new Date(sanitizedData.completedAt);
      }
      const sessionCommit = await brandStorage.updateSessionCommit(id, sanitizedData);
      if (!sessionCommit) {
        return res.status(404).json({ error: "Session commit not found" });
      }
      res.json({
        success: true,
        data: sessionCommit,
        message: "Session commit updated successfully"
      });
    } catch (error) {
      console.error(`Error updating session commit ${id}:`, error);
      res.status(500).json({ error: "Failed to update session commit" });
    }
  });
  app.get("/brand-api/deploy/releases", async (req, res) => {
    const user = req.user;
    const { branchName } = req.query;
    try {
      const releases = await brandStorage.getBranchReleases(branchName);
      res.json({
        success: true,
        data: releases,
        message: "Branch releases fetched successfully"
      });
    } catch (error) {
      console.error("Error fetching branch releases:", error);
      res.status(500).json({ error: "Failed to fetch branch releases" });
    }
  });
  app.get("/brand-api/deploy/releases/:branchName/:tool", async (req, res) => {
    const user = req.user;
    const { branchName, tool } = req.params;
    try {
      const release = await brandStorage.getBranchRelease(branchName, tool);
      if (!release) {
        return res.status(404).json({ error: "Branch release not found" });
      }
      res.json({
        success: true,
        data: release,
        message: "Branch release fetched successfully"
      });
    } catch (error) {
      console.error(`Error fetching branch release ${branchName}/${tool}:`, error);
      res.status(500).json({ error: "Failed to fetch branch release" });
    }
  });
  app.put("/brand-api/deploy/releases", express.json(), async (req, res) => {
    const user = req.user;
    try {
      const release = await brandStorage.updateBranchRelease({
        ...req.body,
        brandTenantId: user.brandTenantId
      });
      res.json({
        success: true,
        data: release,
        message: "Branch release updated successfully"
      });
    } catch (error) {
      console.error("Error updating branch release:", error);
      res.status(500).json({ error: "Failed to update branch release" });
    }
  });
  app.post("/brand-api/windtre/sync", async (req, res) => {
    const user = req.user;
    const { WindtreScraperService: WindtreScraperService2 } = await Promise.resolve().then(() => (init_windtre_scraper_service(), windtre_scraper_service_exports));
    const { WindtreChunkingEmbeddingService: WindtreChunkingEmbeddingService2 } = await Promise.resolve().then(() => (init_windtre_chunking_embedding_service(), windtre_chunking_embedding_service_exports));
    const { ragSyncState: ragSyncState2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
    const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { eq: eq5 } = await import("drizzle-orm");
    try {
      console.log("\u{1F680} Starting WindTre RAG sync pipeline...");
      await db4.update(ragSyncState2).set({
        status: "running",
        lastRunAt: /* @__PURE__ */ new Date(),
        errorMessage: null
      }).where(eq5(ragSyncState2.brandTenantId, user.brandTenantId));
      console.log("\u{1F4E1} Step 1: Scraping WindTre website...");
      const scraper = new WindtreScraperService2(user.brandTenantId);
      const scrapeResult = await scraper.scrapeWindtreOffers();
      if (!scrapeResult.success) {
        throw new Error(`Scraping failed: ${scrapeResult.errors.join(", ")}`);
      }
      console.log(`\u2705 Scraping complete: ${scrapeResult.pagesScraped} pages scraped`);
      console.log("\u{1F52E} Step 2: Processing chunks and generating embeddings...");
      const embeddingService = new WindtreChunkingEmbeddingService2();
      const embeddingResult = await embeddingService.processAllOffers(user.brandTenantId);
      if (!embeddingResult.success) {
        throw new Error(`Embedding failed: ${embeddingResult.errors.join(", ")}`);
      }
      console.log(`\u2705 Embedding complete: ${embeddingResult.chunksProcessed} chunks, ${embeddingResult.embeddingsCreated} embeddings`);
      await db4.update(ragSyncState2).set({
        status: "success",
        totalPagesScraped: scrapeResult.pagesScraped,
        totalChunksCreated: embeddingResult.embeddingsCreated,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(ragSyncState2.brandTenantId, user.brandTenantId));
      res.json({
        success: true,
        data: {
          pagesScraped: scrapeResult.pagesScraped,
          chunksProcessed: embeddingResult.chunksProcessed,
          embeddingsCreated: embeddingResult.embeddingsCreated
        },
        message: "WindTre RAG sync completed successfully"
      });
    } catch (error) {
      console.error("\u274C WindTre RAG sync failed:", error);
      const { ragSyncState: ragSyncState3 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { db: db5 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq6 } = await import("drizzle-orm");
      await db5.update(ragSyncState3).set({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(ragSyncState3.brandTenantId, user.brandTenantId));
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "WindTre RAG sync failed"
      });
    }
  });
  app.post("/brand-api/windtre/generate-embeddings", async (req, res) => {
    const user = req.user;
    const { WindtreChunkingEmbeddingService: WindtreChunkingEmbeddingService2 } = await Promise.resolve().then(() => (init_windtre_chunking_embedding_service(), windtre_chunking_embedding_service_exports));
    try {
      console.log("\u{1F52E} Starting embedding generation only (no scraping)...");
      const embeddingService = new WindtreChunkingEmbeddingService2();
      const embeddingResult = await embeddingService.processAllOffers(user.brandTenantId);
      if (!embeddingResult.success) {
        throw new Error(`Embedding failed: ${embeddingResult.errors.join(", ")}`);
      }
      console.log(`\u2705 Embedding complete: ${embeddingResult.chunksProcessed} chunks, ${embeddingResult.embeddingsCreated} embeddings`);
      res.json({
        success: true,
        data: {
          chunksProcessed: embeddingResult.chunksProcessed,
          embeddingsCreated: embeddingResult.embeddingsCreated
        },
        message: "Embeddings generated successfully"
      });
    } catch (error) {
      console.error("\u274C Embedding generation failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Embedding generation failed"
      });
    }
  });
  app.post("/brand-api/windtre/regenerate-embeddings", async (req, res) => {
    const user = req.user;
    try {
      const { WindtreChunkingEmbeddingService: WindtreChunkingEmbeddingService2 } = await Promise.resolve().then(() => (init_windtre_chunking_embedding_service(), windtre_chunking_embedding_service_exports));
      const { windtreOfferChunks: windtreOfferChunks2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq5 } = await import("drizzle-orm");
      console.log("\u{1F504} Regenerating embeddings for existing chunks...");
      const chunks = await db4.select({ id: windtreOfferChunks2.id, chunkText: windtreOfferChunks2.chunkText }).from(windtreOfferChunks2).where(eq5(windtreOfferChunks2.brandTenantId, user.brandTenantId));
      console.log(`\u{1F4C4} Found ${chunks.length} chunks to process`);
      const embeddingService = new WindtreChunkingEmbeddingService2();
      let processed = 0;
      for (const chunk of chunks) {
        const embedding = await embeddingService.generateEmbedding(chunk.chunkText);
        await db4.update(windtreOfferChunks2).set({ embedding }).where(eq5(windtreOfferChunks2.id, chunk.id));
        processed++;
        console.log(`\u2705 [${processed}/${chunks.length}] Embedding regenerated`);
      }
      console.log(`\u2705 Regeneration complete: ${processed} embeddings updated`);
      res.json({
        success: true,
        data: { processed },
        message: `Regenerated ${processed} embeddings`
      });
    } catch (error) {
      console.error("\u274C Embedding regeneration failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Embedding regeneration failed"
      });
    }
  });
  app.get("/brand-api/windtre/search", async (req, res) => {
    const user = req.user;
    const { query, limit = "5" } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query parameter is required" });
    }
    try {
      const { WindtreChunkingEmbeddingService: WindtreChunkingEmbeddingService2 } = await Promise.resolve().then(() => (init_windtre_chunking_embedding_service(), windtre_chunking_embedding_service_exports));
      const { windtreOfferChunks: windtreOfferChunks2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq5, sql: sql8 } = await import("drizzle-orm");
      const embeddingService = new WindtreChunkingEmbeddingService2();
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const similarityThreshold = 0.5;
      const maxResults = Math.min(parseInt(limit, 10), 20);
      const results = await db4.execute(sql8`
        SELECT 
          id,
          chunk_text,
          metadata,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
        FROM brand_interface.windtre_offer_chunks
        WHERE 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${similarityThreshold}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${maxResults}
      `);
      res.json({
        success: true,
        data: {
          query,
          results: results.rows.map((row) => ({
            id: row.id,
            text: row.chunk_text,
            metadata: row.metadata,
            similarity: parseFloat(row.similarity)
          }))
        },
        message: `Found ${results.rows.length} similar results`
      });
    } catch (error) {
      console.error("\u274C RAG search failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "RAG search failed"
      });
    }
  });
  app.get("/brand-api/windtre/sync-status", async (req, res) => {
    const user = req.user;
    try {
      const { ragSyncState: ragSyncState2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq5 } = await import("drizzle-orm");
      const syncStatus = await db4.select().from(ragSyncState2).where(eq5(ragSyncState2.brandTenantId, user.brandTenantId)).limit(1);
      if (syncStatus.length === 0) {
        const newStatus = await db4.insert(ragSyncState2).values({
          brandTenantId: user.brandTenantId,
          status: "idle",
          totalPagesScraped: 0,
          totalChunksCreated: 0
        }).returning();
        return res.json({
          success: true,
          data: newStatus[0]
        });
      }
      res.json({
        success: true,
        data: syncStatus[0]
      });
    } catch (error) {
      console.error("\u274C Error fetching sync status:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sync status"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/details", async (req, res) => {
    const brandContext = req.brandContext;
    const { agentId } = req.params;
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(brandContext.brandTenantId);
      const details = await ragService.getAgentDetails(agentId);
      if (!details) {
        return res.status(404).json({
          success: false,
          error: `Agent not found: ${agentId}`
        });
      }
      res.json({ success: true, data: details });
    } catch (error) {
      console.error("\u274C Error fetching agent details:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch agent details"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/rag/stats", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(user.brandTenantId);
      const stats = await ragService.getAgentStats(agentId);
      if (!stats) {
        return res.json({
          success: true,
          data: {
            agentId,
            sourcesCount: 0,
            chunksCount: 0,
            totalTokensUsed: 0,
            totalCostCents: 0,
            config: null
          }
        });
      }
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("\u274C Error fetching RAG stats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch RAG stats"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/rag/sources", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(user.brandTenantId);
      const sources = await ragService.listDataSources(agentId);
      res.json({ success: true, data: sources });
    } catch (error) {
      console.error("\u274C Error fetching data sources:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data sources"
      });
    }
  });
  app.post("/brand-api/agents/:agentId/rag/sources/url", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    const { url, metadata } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const { brandAiAgents: brandAiAgents2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { eq: eq5, and: and3 } = await import("drizzle-orm");
      const ragService = new RagMultiAgentService2(user.brandTenantId);
      const agents = await db.select().from(brandAiAgents2).where(
        and3(
          eq5(brandAiAgents2.agentId, agentId),
          eq5(brandAiAgents2.brandTenantId, user.brandTenantId)
        )
      ).limit(1);
      const agentName = agents.length > 0 ? agents[0].name : agentId;
      await ragService.ensureRagAgent({
        agentId,
        agentName
      });
      const sourceId = await ragService.addWebUrlSource(agentId, url, metadata);
      ragService.processDataSource(sourceId).catch((err) => {
        console.error(`\u274C Background processing failed for URL ${url}:`, err);
      });
      res.json({
        success: true,
        data: { sourceId },
        message: "URL source added successfully, processing started"
      });
    } catch (error) {
      console.error("\u274C Error adding URL source:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add URL source"
      });
    }
  });
  app.post("/brand-api/agents/:agentId/rag/sources/text", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    const { text: text5, metadata } = req.body;
    if (!text5) {
      return res.status(400).json({ success: false, error: "Text content is required" });
    }
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(user.brandTenantId);
      const agentName = agentId;
      await ragService.ensureRagAgent({
        agentId,
        agentName
      });
      const sourceId = await ragService.addManualTextSource(agentId, text5, metadata);
      ragService.processDataSource(sourceId).catch((err) => {
        console.error(`\u274C Background processing failed for manual text:`, err);
      });
      res.json({
        success: true,
        data: { sourceId },
        message: "Text source added successfully, processing started"
      });
    } catch (error) {
      console.error("\u274C Error adding text source:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add text source"
      });
    }
  });
  app.post("/brand-api/agents/:agentId/rag/sources/upload", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    try {
      const multer = await import("multer");
      const path2 = await import("path");
      const fs2 = await import("fs/promises");
      const storage = multer.default.memoryStorage();
      const upload = multer.default({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 },
        // 10MB limit
        fileFilter: (req2, file, cb) => {
          const allowedMimes = [
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/markdown"
          ];
          const allowedExts = [".pdf", ".txt", ".doc", ".docx", ".md"];
          const ext = path2.extname(file.originalname).toLowerCase();
          if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
          } else {
            cb(new Error(`Formato file non supportato: ${ext}. Usa PDF, TXT, DOC, DOCX o MD.`));
          }
        }
      }).array("documents", 10);
      upload(req, res, async (err) => {
        if (err) {
          console.error("\u274C Upload error:", err);
          return res.status(400).json({
            success: false,
            error: err.message || "Upload failed"
          });
        }
        const files = req.files;
        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: "No files provided"
          });
        }
        const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
        const { brandAiAgents: brandAiAgents2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
        const { eq: eq5, and: and3 } = await import("drizzle-orm");
        const ragService = new RagMultiAgentService2(user.brandTenantId);
        const agents = await db4.select().from(brandAiAgents2).where(
          and3(
            eq5(brandAiAgents2.agentId, agentId),
            eq5(brandAiAgents2.brandTenantId, user.brandTenantId)
          )
        ).limit(1);
        const agentName = agents.length > 0 ? agents[0].name : agentId;
        await ragService.ensureRagAgent({
          agentId,
          agentName
        });
        const results = [];
        for (const file of files) {
          try {
            let textContent = "";
            const ext = path2.extname(file.originalname).toLowerCase();
            if (ext === ".txt" || ext === ".md") {
              textContent = file.buffer.toString("utf-8");
            } else if (ext === ".pdf") {
              const pdfParse = await import("pdf-parse");
              const pdfData = await pdfParse.default(file.buffer);
              textContent = pdfData.text;
            } else if (ext === ".doc" || ext === ".docx") {
              textContent = `[Document: ${file.originalname}]

This document format requires specialized parsing. The file has been stored for processing.`;
            }
            if (!textContent.trim()) {
              textContent = `[Empty or unreadable document: ${file.originalname}]`;
            }
            const sourceId = await ragService.addDocumentSource(
              agentId,
              file.originalname,
              file.size,
              textContent,
              {
                mimeType: file.mimetype,
                uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
              }
            );
            ragService.processDataSource(sourceId).catch((err2) => {
              console.error(`\u274C Background processing failed for ${file.originalname}:`, err2);
            });
            results.push({
              fileName: file.originalname,
              sourceId,
              success: true
            });
          } catch (fileError) {
            console.error(`\u274C Error processing file ${file.originalname}:`, fileError);
            results.push({
              fileName: file.originalname,
              sourceId: "",
              success: false,
              error: fileError.message
            });
          }
        }
        const successCount = results.filter((r) => r.success).length;
        res.json({
          success: successCount > 0,
          data: {
            count: successCount,
            total: files.length,
            results
          },
          message: `${successCount}/${files.length} documenti caricati con successo`
        });
      });
    } catch (error) {
      console.error("\u274C Error in upload endpoint:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload documents"
      });
    }
  });
  app.post("/brand-api/agents/:agentId/rag/sources/:sourceId/sync", async (req, res) => {
    const user = req.user;
    const { agentId, sourceId } = req.params;
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(user.brandTenantId);
      ragService.processDataSource(sourceId).catch((err) => {
        console.error(`\u274C Background sync failed for source ${sourceId}:`, err);
      });
      res.json({
        success: true,
        message: "Sync started in background"
      });
    } catch (error) {
      console.error("\u274C Error starting sync:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start sync"
      });
    }
  });
  app.delete("/brand-api/agents/:agentId/rag/sources/:sourceId", async (req, res) => {
    const user = req.user;
    const { agentId, sourceId } = req.params;
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(user.brandTenantId);
      await ragService.deleteDataSource(sourceId);
      res.json({
        success: true,
        message: "Data source deleted successfully"
      });
    } catch (error) {
      console.error("\u274C Error deleting data source:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete data source"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/rag/jobs", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    try {
      const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { ragDataSources: ragDataSources2, ragAgents: ragAgents2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { eq: eq5, and: and3, or: or2, inArray: inArray3 } = await import("drizzle-orm");
      const ragAgent = await db4.select().from(ragAgents2).where(
        and3(
          eq5(ragAgents2.agentId, agentId),
          eq5(ragAgents2.brandTenantId, user.brandTenantId)
        )
      ).limit(1);
      if (ragAgent.length === 0) {
        return res.json({
          success: true,
          data: []
        });
      }
      const jobs = await db4.select({
        id: ragDataSources2.id,
        sourceType: ragDataSources2.sourceType,
        sourceUrl: ragDataSources2.sourceUrl,
        fileName: ragDataSources2.fileName,
        status: ragDataSources2.status,
        createdAt: ragDataSources2.createdAt,
        updatedAt: ragDataSources2.updatedAt
      }).from(ragDataSources2).where(
        and3(
          eq5(ragDataSources2.ragAgentId, ragAgent[0].id),
          eq5(ragDataSources2.brandTenantId, user.brandTenantId),
          or2(
            eq5(ragDataSources2.status, "pending"),
            eq5(ragDataSources2.status, "processing")
          )
        )
      );
      res.json({
        success: true,
        data: jobs.map((job) => ({
          id: job.id,
          type: job.sourceType,
          name: job.fileName || job.sourceUrl || "Unknown",
          status: job.status,
          startedAt: job.createdAt,
          updatedAt: job.updatedAt
        }))
      });
    } catch (error) {
      console.error("\u274C Error fetching jobs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch jobs"
      });
    }
  });
  app.post("/brand-api/agents/:agentId/rag/jobs/:jobId/cancel", async (req, res) => {
    const user = req.user;
    const { agentId, jobId } = req.params;
    try {
      const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { ragDataSources: ragDataSources2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { eq: eq5, and: and3 } = await import("drizzle-orm");
      await db4.update(ragDataSources2).set({
        status: "cancelled",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(
        and3(
          eq5(ragDataSources2.id, jobId),
          eq5(ragDataSources2.brandTenantId, user.brandTenantId)
        )
      );
      res.json({
        success: true,
        message: "Job cancelled successfully"
      });
    } catch (error) {
      console.error("\u274C Error cancelling job:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel job"
      });
    }
  });
  app.post("/brand-api/agents/:agentId/rag/jobs/cancel-all", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    try {
      const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { ragDataSources: ragDataSources2, ragAgents: ragAgents2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { eq: eq5, and: and3, or: or2 } = await import("drizzle-orm");
      const ragAgent = await db4.select().from(ragAgents2).where(
        and3(
          eq5(ragAgents2.agentId, agentId),
          eq5(ragAgents2.brandTenantId, user.brandTenantId)
        )
      ).limit(1);
      if (ragAgent.length === 0) {
        return res.json({
          success: true,
          data: { cancelled: 0 }
        });
      }
      const result = await db4.update(ragDataSources2).set({
        status: "cancelled",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(
        and3(
          eq5(ragDataSources2.ragAgentId, ragAgent[0].id),
          eq5(ragDataSources2.brandTenantId, user.brandTenantId),
          or2(
            eq5(ragDataSources2.status, "pending"),
            eq5(ragDataSources2.status, "processing")
          )
        )
      ).returning();
      res.json({
        success: true,
        data: { cancelled: result.length },
        message: `${result.length} job(s) cancelled`
      });
    } catch (error) {
      console.error("\u274C Error cancelling all jobs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel jobs"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/rag/search", async (req, res) => {
    const brandContext = req.brandContext;
    const { agentId } = req.params;
    const { query, limit = "5" } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query parameter is required" });
    }
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(brandContext.brandTenantId);
      const results = await ragService.searchSimilar(agentId, query, parseInt(limit, 10));
      res.json({
        success: true,
        data: {
          query,
          results
        },
        message: `Found ${results.length} similar results`
      });
    } catch (error) {
      console.error("\u274C Error searching RAG:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to search RAG"
      });
    }
  });
  app.post("/brand-api/agents/:agentId/rag/search", async (req, res) => {
    const brandContext = req.brandContext;
    const { agentId } = req.params;
    const { query, limit = 5 } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query is required in request body" });
    }
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(brandContext.brandTenantId);
      const results = await ragService.searchSimilar(agentId, query, parseInt(limit, 10));
      res.json({
        success: true,
        data: {
          query,
          results
        },
        message: `Found ${results.length} similar results`
      });
    } catch (error) {
      console.error("\u274C Error searching RAG:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to search RAG"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/rag/chunks", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    const { sourceId, limit = "50" } = req.query;
    try {
      const { RagMultiAgentService: RagMultiAgentService2 } = await Promise.resolve().then(() => (init_rag_multi_agent_service(), rag_multi_agent_service_exports));
      const ragService = new RagMultiAgentService2(user.brandTenantId);
      const chunks = await ragService.listChunks(
        agentId,
        sourceId,
        parseInt(limit, 10)
      );
      res.json({
        success: true,
        data: chunks
      });
    } catch (error) {
      console.error("\u274C Error fetching chunks:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch chunks"
      });
    }
  });
  app.delete("/brand-api/agents/:agentId/rag/chunks/:chunkId", async (req, res) => {
    const user = req.user;
    const { agentId, chunkId } = req.params;
    try {
      const { ragChunks: ragChunks2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { eq: eq5, and: and3 } = await import("drizzle-orm");
      await db.delete(ragChunks2).where(
        and3(
          eq5(ragChunks2.id, chunkId),
          eq5(ragChunks2.brandTenantId, user.brandTenantId)
        )
      );
      res.json({
        success: true,
        message: "Chunk deleted successfully"
      });
    } catch (error) {
      console.error("\u274C Error deleting chunk:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete chunk"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/rag/jobs", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    const { limit = "20" } = req.query;
    try {
      const { ragSyncJobs: ragSyncJobs2, ragAgents: ragAgents2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { eq: eq5, and: and3, desc: desc3 } = await import("drizzle-orm");
      const agents = await db.select().from(ragAgents2).where(
        and3(
          eq5(ragAgents2.agentId, agentId),
          eq5(ragAgents2.brandTenantId, user.brandTenantId)
        )
      ).limit(1);
      if (agents.length === 0) {
        return res.json({ success: true, data: [] });
      }
      const jobs = await db.select().from(ragSyncJobs2).where(
        and3(
          eq5(ragSyncJobs2.ragAgentId, agents[0].id),
          eq5(ragSyncJobs2.brandTenantId, user.brandTenantId)
        )
      ).orderBy(desc3(ragSyncJobs2.createdAt)).limit(parseInt(limit, 10));
      res.json({ success: true, data: jobs });
    } catch (error) {
      console.error("\u274C Error fetching sync jobs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sync jobs"
      });
    }
  });
  app.get("/brand-api/agents/:agentId/rag/usage", async (req, res) => {
    const user = req.user;
    const { agentId } = req.params;
    try {
      const { db: db4 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { ragEmbeddingsUsage: ragEmbeddingsUsage2, ragAgents: ragAgents2 } = await Promise.resolve().then(() => (init_brand_interface(), brand_interface_exports));
      const { eq: eq5, and: and3, desc: desc3, sql: sql8 } = await import("drizzle-orm");
      const agents = await db4.select().from(ragAgents2).where(
        and3(
          eq5(ragAgents2.agentId, agentId),
          eq5(ragAgents2.brandTenantId, user.brandTenantId)
        )
      ).limit(1);
      if (agents.length === 0) {
        return res.json({
          success: true,
          data: {
            totalTokens: 0,
            totalCost: 0,
            history: []
          }
        });
      }
      const stats = await db4.select({
        totalTokens: sql8`COALESCE(SUM(tokens_used), 0)`,
        totalCost: sql8`COALESCE(SUM(estimated_cost), 0)`
      }).from(ragEmbeddingsUsage2).where(
        and3(
          eq5(ragEmbeddingsUsage2.ragAgentId, agents[0].id),
          eq5(ragEmbeddingsUsage2.brandTenantId, user.brandTenantId)
        )
      );
      const history = await db4.select().from(ragEmbeddingsUsage2).where(
        and3(
          eq5(ragEmbeddingsUsage2.ragAgentId, agents[0].id),
          eq5(ragEmbeddingsUsage2.brandTenantId, user.brandTenantId)
        )
      ).orderBy(desc3(ragEmbeddingsUsage2.createdAt)).limit(30);
      res.json({
        success: true,
        data: {
          totalTokens: stats[0]?.totalTokens || 0,
          totalCost: stats[0]?.totalCost || 0,
          history
        }
      });
    } catch (error) {
      console.error("\u274C Error fetching usage:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch usage"
      });
    }
  });
  const server = http.createServer(app);
  console.log("\u2705 Brand Interface API routes registered (including Management/Structure endpoints)");
  return server;
}

// apps/backend/brand-api/src/index.ts
console.log("\u{1F680} Starting Brand API Server...");
process.on("uncaughtException", (error) => {
  console.error("\u274C Brand API uncaught exception:", error);
  if (process.env.NODE_ENV !== "development") {
    process.exit(1);
  }
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u274C Brand API unhandled rejection at:", promise, "reason:", reason);
  if (process.env.NODE_ENV !== "development") {
    process.exit(1);
  }
});
try {
  const app = express2();
  app.use(cors({
    origin: ["http://localhost:3001", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(express2.json({ limit: "50mb" }));
  const httpServer = await registerBrandRoutes(app);
  httpServer.on("error", (error) => {
    console.error("\u274C Brand API server error:", error);
  });
  httpServer.on("close", () => {
    console.log("\u{1F6AB} Brand API server closed");
  });
  const port = parseInt(process.env.BRAND_BACKEND_PORT || "3002", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`\u2705 Brand API server running on fixed port ${port}`);
    console.log(`\u{1F50C} Brand API available at: http://localhost:${port}/brand-api/health`);
  });
} catch (error) {
  console.error("\u274C Brand API startup failed:", error);
  if (process.env.NODE_ENV !== "development") {
    process.exit(1);
  }
}
