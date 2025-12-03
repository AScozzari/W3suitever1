// W3 Suite Schema - Dedicated schema for tenant-specific tables
// All tables in this file will be created in 'w3suite' schema

import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  pgEnum,
  pgSchema,
  timestamp,
  varchar,
  text,
  boolean,
  uuid,
  primaryKey,
  smallint,
  integer,
  date,
  uniqueIndex,
  customType,
  real,
  decimal,
  bigint,
  numeric,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import public schema tables for FK references
import { brands, channels, commercialAreas, drivers, countries, italianCities, paymentMethods, paymentMethodsConditions, utmSources, utmMediums } from './public';

// Import brand_interface schema tables for FK references
import { brandWorkflows } from './brand-interface';

// ==================== CUSTOM TYPES FOR PGVECTOR ====================
// Define custom type for pgvector columns
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// ==================== W3 SUITE SCHEMA ====================
export const w3suiteSchema = pgSchema("w3suite");

// ==================== ENUMS ====================
export const scopeTypeEnum = pgEnum('scope_type', ['tenant', 'legal_entity', 'store']);
export const permModeEnum = pgEnum('perm_mode', ['grant', 'revoke']);
export const userStatusEnum = pgEnum('user_status', ['attivo', 'sospeso', 'off-boarding']);

// Notification System Enums
export const notificationTypeEnum = pgEnum('notification_type', ['system', 'security', 'data', 'custom']);
export const notificationPriorityEnum = pgEnum('notification_priority', ['low', 'medium', 'high', 'critical']);
export const notificationStatusEnum = pgEnum('notification_status', ['unread', 'read']);

// ✅ STORES CATEGORY: Enum for store types (sales_point=9xxx, office=6xxx, warehouse=5xxx)
export const storeCategoryEnum = pgEnum('store_category', ['sales_point', 'office', 'warehouse']);
export const notificationCategoryEnum = pgEnum('notification_category', ['sales', 'finance', 'marketing', 'support', 'operations']);

// Object Storage Enums
export const objectVisibilityEnum = pgEnum('object_visibility', ['public', 'private']);
export const objectTypeEnum = pgEnum('object_type', ['avatar', 'document', 'image', 'file']);

// CRM Pipeline Permission Enums
export const pipelinePermissionModeEnum = pgEnum('pipeline_permission_mode', ['all', 'deal_managers', 'pipeline_admins', 'supervisor_only', 'custom', 'none']);
export const pipelineDeletionModeEnum = pgEnum('pipeline_deletion_mode', ['admins', 'supervisor_only', 'none']);

// Supplier Enums
export const supplierOriginEnum = pgEnum('supplier_origin', ['brand', 'tenant']);
export const supplierTypeEnum = pgEnum('supplier_type', ['distributore', 'produttore', 'servizi', 'logistica']);
export const supplierStatusEnum = pgEnum('supplier_status', ['active', 'suspended', 'blocked']);

// Workflow Source Enum - Track if workflow originated from Brand or Tenant
export const workflowSourceEnum = pgEnum('workflow_source', ['brand', 'tenant']);

// HR System Enums
// Employee Demographics Enums
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);
export const maritalStatusEnum = pgEnum('marital_status', ['single', 'married', 'divorced', 'widowed', 'other']);

// ==================== ITALIAN HR COMPLIANCE ENUMS (CCNL Commercio 2024) ====================
// CCNL Level Enum - Contratto Collettivo Nazionale Lavoro - Settore Commercio
export const ccnlLevelEnum = pgEnum('ccnl_level', [
  'quadro',                    // Quadri - Management Level
  'livello_1',                 // 1° Livello - Senior Professional
  'livello_2',                 // 2° Livello - Professional
  'livello_3',                 // 3° Livello - Skilled Employee
  'livello_4',                 // 4° Livello - Mid-level Employee
  'livello_5',                 // 5° Livello - Junior Employee
  'livello_6',                 // 6° Livello - Entry Level
  'livello_7',                 // 7° Livello - Basic Level
  'operatore_vendita_a',       // Operatore Vendita A - Sales Operator A
  'operatore_vendita_b',       // Operatore Vendita B - Sales Operator B
]);

// Contract Type Enum - Italian Labor Law Compliance
export const employmentContractTypeEnum = pgEnum('employment_contract_type', [
  'tempo_indeterminato',              // Permanent Contract
  'tempo_determinato',                // Fixed-term Contract
  'apprendistato_professionalizzante', // Professional Apprenticeship
  'apprendistato_qualifica',          // Qualification Apprenticeship
  'collaborazione_coordinata',        // Coordinated Collaboration
  'parttime_verticale',               // Part-time Vertical (some days full)
  'parttime_orizzontale',             // Part-time Horizontal (reduced daily hours)
  'parttime_misto',                   // Part-time Mixed
  'intermittente',                    // Intermittent Work
  'somministrazione',                 // Temporary Agency Work
  'stage_tirocinio',                  // Internship/Training
  'contratto_inserimento',            // Integration Contract
  'lavoro_occasionale',               // Occasional Work
]);

// Calendar Event Enums
export const calendarEventTypeEnum = pgEnum('calendar_event_type', ['meeting', 'shift', 'time_off', 'overtime', 'training', 'deadline', 'other']);
export const calendarEventVisibilityEnum = pgEnum('calendar_event_visibility', ['private', 'team', 'store', 'area', 'tenant']);
export const calendarEventStatusEnum = pgEnum('calendar_event_status', ['tentative', 'confirmed', 'cancelled']);

// Time Tracking Enums
export const trackingMethodEnum = pgEnum('tracking_method', ['badge', 'nfc', 'app', 'gps', 'manual', 'biometric', 'qr', 'smart', 'web']);
export const timeTrackingStatusEnum = pgEnum('time_tracking_status', ['active', 'completed', 'edited', 'disputed']);


// Shift Enums
export const shiftTypeEnum = pgEnum('shift_type', ['morning', 'afternoon', 'night', 'full_day', 'split', 'on_call']);
export const shiftStatusEnum = pgEnum('shift_status', ['draft', 'published', 'in_progress', 'completed', 'cancelled']);
export const shiftPatternEnum = pgEnum('shift_pattern', ['daily', 'weekly', 'monthly', 'custom']);

// HR Document Enums
export const hrDocumentTypeEnum = pgEnum('hr_document_type', ['payslip', 'contract', 'certificate', 'id_document', 'cv', 'evaluation', 'warning', 'other']);
export const hrDocumentSourceEnum = pgEnum('hr_document_source', ['employee', 'hr', 'system']);

// Expense Report Enums
export const expenseReportStatusEnum = pgEnum('expense_report_status', ['draft', 'submitted', 'approved', 'rejected', 'reimbursed']);
export const expensePaymentMethodEnum = pgEnum('expense_payment_method', ['cash', 'credit_card', 'bank_transfer']);
export const expenseCategoryEnum = pgEnum('expense_category', ['travel', 'meal', 'accommodation', 'transport', 'supplies', 'other']);

// HR Announcement Enums

// AI System Enums
export const aiConnectionStatusEnum = pgEnum('ai_connection_status', ['connected', 'disconnected', 'error']);
export const aiPrivacyModeEnum = pgEnum('ai_privacy_mode', ['standard', 'strict']);
export const aiFeatureTypeEnum = pgEnum('ai_feature_type', [
  'chat', 
  'embedding', 
  'transcription', 
  'vision_analysis', 
  'url_scraping',
  'document_analysis', 
  'natural_queries', 
  'financial_forecasting', 
  'web_search', 
  'code_interpreter', 
  'image_generation', 
  'voice_assistant'
]);
export const aiModelEnum = pgEnum('ai_model', [
  'gpt-4o',
  'gpt-4-turbo', 
  'gpt-4o-mini',
  'gpt-4',
  'gpt-3.5-turbo',
  'text-embedding-3-small',
  'text-embedding-3-large', 
  'whisper-1',
  'dall-e-3'
]);

// Lead Routing AI Enums
export const leadRoutingConfidenceEnum = pgEnum('lead_routing_confidence', ['low', 'medium', 'high', 'very_high']);
export const outboundChannelEnum = pgEnum('outbound_channel', ['email', 'phone', 'whatsapp', 'linkedin', 'sms']);

// CRM System Enums
export const crmCampaignTypeEnum = pgEnum('crm_campaign_type', ['inbound_media', 'outbound_crm', 'retention']);
export const crmCampaignStatusEnum = pgEnum('crm_campaign_status', ['draft', 'scheduled', 'active', 'paused', 'completed']);
export const workflowExecutionModeEnum = pgEnum('workflow_execution_mode', ['automatic', 'manual']);
export const crmLeadStatusEnum = pgEnum('crm_lead_status', ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'disqualified']);
export const leadStatusCategoryEnum = pgEnum('lead_status_category', ['new', 'working', 'qualified', 'converted', 'disqualified', 'on_hold']);
export const leadSourceEnum = pgEnum('lead_source', ['manual', 'web_form', 'powerful_api', 'landing_page', 'csv_import']);
export const dealCreationSourceEnum = pgEnum('deal_creation_source', ['manual', 'converted_from_lead', 'imported', 'workflow_automation']);
export const crmPipelineDomainEnum = pgEnum('crm_pipeline_domain', ['sales', 'service', 'retention']);
export const crmPipelineStageCategoryEnum = pgEnum('crm_pipeline_stage_category', [
  'starter',    // Fase iniziale contatto
  'progress',   // In lavorazione attiva
  'pending',    // In attesa cliente/interno
  'purchase',   // Fase acquisto
  'finalized',  // Finalizzato con successo
  'archive',    // Archiviato
  'ko'          // Perso/Rifiutato
]);
export const crmDealStatusEnum = pgEnum('crm_deal_status', ['open', 'won', 'lost', 'abandoned']);
export const crmCustomerTypeEnum = pgEnum('crm_customer_type', ['b2b', 'b2c']);
export const crmLegalFormEnum = pgEnum('crm_legal_form', [
  'ditta_individuale',
  'snc',               // Società in Nome Collettivo
  'sas',               // Società in Accomandita Semplice
  'srl',               // Società a Responsabilità Limitata
  'srls',              // SRL Semplificata
  'spa',               // Società per Azioni
  'sapa',              // Società in Accomandita per Azioni
  'cooperativa',
  'consorzio',
  'societa_semplice',
  'geie',              // Gruppo Europeo Interesse Economico
  'startup_innovativa',
  'pmi_innovativa'
]);
export const crmInteractionDirectionEnum = pgEnum('crm_interaction_direction', ['inbound', 'outbound']);

// CRM Channel Enums - Dual Tracking: Inbound (Lead Source) + Outbound (Contact Method)
export const crmInboundChannelEnum = pgEnum('crm_inbound_channel', [
  'landing_page',       // URL/Landing page
  'web_form',          // Form compilato su sito
  'whatsapp_inbound',  // Messaggio WhatsApp ricevuto
  'cold_call_inbound', // Chiamata ricevuta da prospect
  'linkedin_campaign', // Campagna LinkedIn Ads
  'partner_referral',  // Segnalazione partner
  'facebook',          // Social: Facebook
  'instagram',         // Social: Instagram
  'tiktok',           // Social: TikTok
  'youtube',          // Social: YouTube
  'twitter'           // Social: Twitter/X
]);

export const crmOutboundChannelEnum = pgEnum('crm_outbound_channel', [
  'email',            // Email outbound
  'telegram',         // Messaggio Telegram
  'whatsapp',         // WhatsApp Business outbound
  'phone',            // Chiamata telefonica
  'linkedin',         // LinkedIn InMail/Message
  'social_dm',        // Direct Message social (FB/IG)
  'sms'              // SMS
]);

export const crmTaskTypeEnum = pgEnum('crm_task_type', ['call', 'email', 'meeting', 'follow_up', 'demo', 'other']);
export const crmTaskStatusEnum = pgEnum('crm_task_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const crmTaskPriorityEnum = pgEnum('crm_task_priority', ['low', 'medium', 'high', 'urgent']);
export const crmConsentTypeEnum = pgEnum('crm_consent_type', ['privacy_policy', 'marketing', 'profiling', 'third_party']);
export const crmConsentStatusEnum = pgEnum('crm_consent_status', ['granted', 'denied', 'withdrawn', 'pending']);
export const crmConsentScopeEnum = pgEnum('crm_consent_scope', ['marketing', 'service', 'both']);
export const crmSourceTypeEnum = pgEnum('crm_source_type', ['meta_page', 'google_ads', 'whatsapp_phone', 'instagram', 'tiktok']);
export const crmIdentifierTypeEnum = pgEnum('crm_identifier_type', ['email', 'phone', 'social']);
export const customerTypeEnum = pgEnum('customer_type', ['b2c', 'b2b']);

// ==================== OMNICHANNEL INTERACTION ENUMS ====================
export const omnichannelChannelEnum = pgEnum('omnichannel_channel', [
  'email',
  'sms', 
  'whatsapp',
  'telegram',
  'instagram_dm',
  'instagram_comment',
  'facebook_messenger',
  'facebook_comment',
  'tiktok_comment',
  'linkedin_message',
  'voice_call',
  'video_call',
  'web_chat',
  'in_person',
  'workflow_automation'
]);

export const interactionStatusEnum = pgEnum('interaction_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
  'failed',
  'bounced'
]);

// ==================== IDENTITY RESOLUTION ENUMS ====================
export const identityMatchTypeEnum = pgEnum('identity_match_type', [
  'email_exact',
  'phone_exact',
  'social_exact',
  'email_fuzzy',
  'phone_fuzzy',
  'name_similarity',
  'ip_address',
  'device_fingerprint'
]);

export const identityMatchStatusEnum = pgEnum('identity_match_status', [
  'pending',
  'accepted',
  'rejected',
  'auto_merged'
]);

export const identityEventTypeEnum = pgEnum('identity_event_type', [
  'merge',
  'split',
  'manual_link',
  'auto_dedupe',
  'conflict_resolved'
]);

// ✅ CRITICAL ENUM FIX: Add missing calendar_event_category enum
export const calendarEventCategoryEnum = pgEnum('calendar_event_category', [
  'sales', 'finance', 'hr', 'crm', 'support', 'operations', 'marketing'
]);

// ==================== TASK MANAGEMENT SYSTEM ENUMS ====================
export const taskStatusEnum = pgEnum('task_status', [
  'todo', 
  'in_progress', 
  'review', 
  'done', 
  'archived'
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',      // Bassa importanza strategica
  'medium',   // Importanza media
  'high'      // Alta importanza strategica
]);

export const taskUrgencyEnum = pgEnum('task_urgency', [
  'low',      // Non urgente (settimane)
  'medium',   // Moderatamente urgente (giorni)
  'high',     // Urgente (ore/1 giorno)
  'critical'  // Critico (immediato)
]);

export const taskAssignmentRoleEnum = pgEnum('task_assignment_role', [
  'assignee', 
  'watcher'
]);

export const taskDependencyTypeEnum = pgEnum('task_dependency_type', [
  'blocks', 
  'blocked_by', 
  'related'
]);

// ==================== CHAT SYSTEM ENUMS ====================
export const chatChannelTypeEnum = pgEnum('chat_channel_type', [
  'team', 
  'dm', 
  'task_thread', 
  'general'
]);

export const chatMemberRoleEnum = pgEnum('chat_member_role', [
  'owner', 
  'admin', 
  'member'
]);

export const chatNotificationPreferenceEnum = pgEnum('chat_notification_preference', [
  'all', 
  'mentions', 
  'none'
]);

export const chatVisibilityEnum = pgEnum('chat_visibility', [
  'public',
  'private'
]);

export const chatInviteStatusEnum = pgEnum('chat_invite_status', [
  'pending',
  'accepted',
  'declined'
]);

// ==================== ACTIVITY FEED ENUMS ====================
export const activityFeedCategoryEnum = pgEnum('activity_feed_category', [
  'TASK', 
  'WORKFLOW', 
  'HR', 
  'CRM', 
  'WEBHOOK', 
  'SYSTEM'
]);

export const activityFeedPriorityEnum = pgEnum('activity_feed_priority', [
  'low', 
  'normal', 
  'high'
]);

export const activityFeedActorTypeEnum = pgEnum('activity_feed_actor_type', [
  'user', 
  'system', 
  'webhook'
]);

export const activityFeedInteractionTypeEnum = pgEnum('activity_feed_interaction_type', [
  'like', 
  'comment', 
  'share', 
  'bookmark',
  'hide'
]);

// ==================== MCP (MODEL CONTEXT PROTOCOL) ENUMS ====================
export const mcpTransportEnum = pgEnum('mcp_transport', ['stdio', 'http-sse']);
export const mcpServerStatusEnum = pgEnum('mcp_server_status', ['active', 'inactive', 'error', 'configuring']);
export const mcpCredentialTypeEnum = pgEnum('mcp_credential_type', ['oauth2_user', 'service_account', 'api_key', 'basic_auth', 'none']);
export const mcpToolCategoryEnum = pgEnum('mcp_tool_category', [
  'communication',  // Gmail, Teams, Slack
  'storage',        // Drive, S3, Dropbox
  'analytics',      // GTM, GA
  'social_media',   // Meta/Instagram, Facebook
  'productivity',   // Calendar, Sheets, Docs
  'ai',            // OpenAI, AI services
  'database',      // Postgres, MongoDB
  'other'
]);
export const mcpAccountTypeEnum = pgEnum('mcp_account_type', [
  'facebook_page',
  'instagram_business',
  'google_workspace',
  'aws_account',
  'microsoft_tenant'
]);

// ==================== VOIP SYSTEM ENUMS ====================
export const voipProtocolEnum = pgEnum('voip_protocol', ['udp', 'tcp', 'tls', 'wss']);
export const voipCallDirectionEnum = pgEnum('voip_call_direction', ['inbound', 'outbound', 'internal']);
export const voipCallDispositionEnum = pgEnum('voip_call_disposition', ['answered', 'no_answer', 'busy', 'failed', 'voicemail']);
export const voipDeviceTypeEnum = pgEnum('voip_device_type', ['webrtc', 'deskphone', 'mobile_app', 'softphone']);
export const voipExtensionStatusEnum = pgEnum('voip_extension_status', ['active', 'inactive', 'suspended']);
export const voipTrunkStatusEnum = pgEnum('voip_trunk_status', ['active', 'inactive', 'error']);
export const voipCredentialTypeEnum = pgEnum('voip_credential_type', ['sip_trunk', 'sip_extension', 'turn_server', 'api_key']);
export const voipDidStatusEnum = pgEnum('voip_did_status', ['active', 'porting_in', 'porting_out', 'inactive', 'cancelled']);
export const voipRouteTypeEnum = pgEnum('voip_route_type', ['inbound', 'outbound', 'emergency']);
export const voipAssignmentTypeEnum = pgEnum('voip_assignment_type', ['store', 'extension', 'ivr', 'queue', 'conference']);
export const voipExtensionTypeEnum = pgEnum('voip_extension_type', ['user', 'queue', 'conference']);
export const voipSyncStatusEnum = pgEnum('voip_sync_status', ['synced', 'pending', 'failed', 'local_only']);
export const voipConnectionStatusEnum = pgEnum('voip_connection_status', ['connected', 'error', 'unknown']);
export const voipRegistrationStatusEnum = pgEnum('voip_registration_status', ['registered', 'unregistered', 'failed', 'unknown']);

// ==================== WMS (WAREHOUSE MANAGEMENT SYSTEM) ENUMS ====================
export const productSourceEnum = pgEnum('product_source', ['brand', 'tenant']);
export const productTypeEnum = pgEnum('product_type', ['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']);
export const productStatusEnum = pgEnum('product_status', ['active', 'inactive', 'discontinued', 'draft']);
export const productConditionEnum = pgEnum('product_condition', ['new', 'used', 'refurbished', 'demo']);
export const productLogisticStatusEnum = pgEnum('product_logistic_status', [
  'in_stock',           // In giacenza
  'reserved',           // Prenotato
  'preparing',          // In preparazione
  'shipping',           // DDT/In spedizione
  'delivered',          // Consegnato
  'customer_return',    // Reso cliente
  'doa_return',         // Reso DOA
  'in_service',         // In assistenza
  'supplier_return',    // Restituito fornitore
  'in_transfer',        // In trasferimento
  'lost',               // Smarrito
  'damaged',            // Danneggiato/Dismesso
  'internal_use'        // AD uso interno
]);
export const serialTypeEnum = pgEnum('serial_type', ['imei', 'iccid', 'mac_address', 'other']);
export const productBatchStatusEnum = pgEnum('product_batch_status', ['available', 'reserved', 'damaged', 'expired']);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'purchase_in',        // Acquisto da fornitore
  'sale_out',           // Vendita
  'return_in',          // Reso da cliente
  'transfer',           // Trasferimento (crea coppia inbound/outbound)
  'adjustment',         // Rettifica inventario
  'damaged'             // Danneggiato
]);
export const stockMovementDirectionEnum = pgEnum('stock_movement_direction', [
  'inbound',            // Entrata (aumenta stock)
  'outbound'            // Uscita (diminuisce stock)
]);
export const priceListTypeEnum = pgEnum('price_list_type', ['b2c', 'b2b', 'wholesale']);

// ==================== TENANTS ====================
export const tenants = w3suiteSchema.table("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("active"),
  notes: text("notes"), // Added notes field for Management Center
  settings: jsonb("settings").default({}),
  features: jsonb("features").default({}),
  branchId: uuid("branch_id"), // FK to brand_interface.brand_branches for Deploy Center
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  slug: z.string().min(1, "Slug non può essere vuoto").max(100, "Slug troppo lungo")
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// ==================== USERS TABLE (OAuth2 Enterprise) ====================
export const users = w3suiteSchema.table("users", {
  id: varchar("id").primaryKey(), // OAuth2 standard sub field
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  // Avatar metadata fields
  avatarObjectPath: varchar("avatar_object_path", { length: 500 }),
  avatarVisibility: objectVisibilityEnum("avatar_visibility").default("public"),
  avatarUploadedAt: timestamp("avatar_uploaded_at"),
  avatarUploadedBy: varchar("avatar_uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isSystemAdmin: boolean("is_system_admin").default(false),
  lastLoginAt: timestamp("last_login_at"),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  status: userStatusEnum("status").default("attivo"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  // Extended enterprise fields
  role: varchar("role", { length: 50 }),
  storeId: uuid("store_id").references(() => stores.id),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  hireDate: date("hire_date"),
  contractType: varchar("contract_type", { length: 50 }), // Keep as varchar to preserve existing data
  
  // Personal/Demographic Information (HR Best Practices 2025)
  dateOfBirth: date("date_of_birth"),
  fiscalCode: varchar("fiscal_code", { length: 16 }), // Codice Fiscale italiano
  gender: genderEnum("gender"),
  maritalStatus: maritalStatusEnum("marital_status"),
  nationality: varchar("nationality", { length: 100 }),
  placeOfBirth: varchar("place_of_birth", { length: 100 }),
  
  // Address Information
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 2 }),
  postalCode: varchar("postal_code", { length: 5 }),
  country: varchar("country", { length: 100 }).default("Italia"),
  
  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name", { length: 200 }),
  emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 100 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  emergencyContactEmail: varchar("emergency_contact_email", { length: 255 }),
  
  // Administrative Information
  employeeNumber: varchar("employee_number", { length: 50 }), // Matricola
  annualCost: real("annual_cost"), // Costo aziendale annuo totale
  grossAnnualSalary: real("gross_annual_salary"), // RAL - Retribuzione Annua Lorda
  level: varchar("level", { length: 50 }), // Livello CCNL (keep as varchar to preserve existing data)
  ccnl: varchar("ccnl", { length: 255 }), // CCNL applicato (es: "Commercio", "Telecomunicazioni")
  managerId: varchar("manager_id").references((): any => users.id), // Responsabile diretto
  employmentEndDate: date("employment_end_date"), // Per contratti a tempo determinato
  probationEndDate: date("probation_end_date"), // Fine periodo di prova
  offboardingDate: date("offboarding_date"), // Data offboarding
  
  // Italian Social Security (INPS/INAIL)
  inpsPosition: varchar("inps_position", { length: 50 }), // Matricola INPS
  inailPosition: varchar("inail_position", { length: 50 }), // Posizione assicurativa INAIL
  
  // Identity Document
  idDocumentType: varchar("id_document_type", { length: 50 }), // Tipo documento (Carta Identità, Passaporto, Patente)
  idDocumentNumber: varchar("id_document_number", { length: 50 }), // Numero documento
  idDocumentExpiryDate: date("id_document_expiry_date"), // Scadenza documento
  
  // Banking Information
  bankIban: varchar("bank_iban", { length: 34 }), // IBAN per stipendio
  bankName: varchar("bank_name", { length: 255 }),
  
  // Professional Background
  education: text("education"), // Titolo di studio
  certifications: text("certifications").array(), // Certificazioni possedute
  skills: text("skills").array(), // Competenze tecniche
  languages: text("languages").array(), // Lingue parlate
  
  // Notes
  notes: text("notes"), // Note interne HR
}, (table) => [
  index("users_tenant_idx").on(table.tenantId),
  index("users_store_idx").on(table.storeId),
  index("users_manager_idx").on(table.managerId),
  index("users_employee_number_idx").on(table.employeeNumber),
]);

export const insertUserSchema = createInsertSchema(users).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = InsertUser;

// ==================== LEGAL ENTITIES ====================
export const legalEntities = w3suiteSchema.table("legal_entities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  codice: varchar("codice", { length: 20 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  pIva: varchar("piva", { length: 50 }),
  billingProfileId: uuid("billing_profile_id"),
  stato: varchar("stato", { length: 50 }).default("Attiva"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
  // Extended enterprise fields
  codiceFiscale: varchar("codiceFiscale", { length: 50 }),
  formaGiuridica: varchar("formaGiuridica", { length: 100 }),
  capitaleSociale: varchar("capitaleSociale", { length: 50 }),
  dataCostituzione: date("dataCostituzione"),
  indirizzo: text("indirizzo"),
  citta: varchar("citta", { length: 100 }),
  provincia: varchar("provincia", { length: 10 }),
  cap: varchar("cap", { length: 10 }),
  telefono: varchar("telefono", { length: 50 }),
  email: varchar("email", { length: 255 }),
  pec: varchar("pec", { length: 255 }),
  rea: varchar("rea", { length: 100 }),
  registroImprese: varchar("registroImprese", { length: 255 }),
  // New enterprise fields for enhanced functionality
  logo: text("logo"), // PNG file path or base64
  codiceSDI: varchar("codiceSDI", { length: 10 }),
  // Administrative contact section - using camelCase column names
  refAmminNome: varchar("refAmminNome", { length: 100 }),
  refAmminCognome: varchar("refAmminCognome", { length: 100 }),
  refAmminEmail: varchar("refAmminEmail", { length: 255 }),
  refAmminCodiceFiscale: varchar("refAmminCodiceFiscale", { length: 16 }),
  refAmminIndirizzo: text("refAmminIndirizzo"),
  refAmminCitta: varchar("refAmminCitta", { length: 100 }),
  refAmminCap: varchar("refAmminCap", { length: 10 }),
  refAmminPaese: varchar("refAmminPaese", { length: 100 }),
  // Dynamic notes field
  note: text("note"),
}, (table) => [
  uniqueIndex("legal_entities_tenant_codice_unique").on(table.tenantId, table.codice),
]);

export const insertLegalEntitySchema = createInsertSchema(legalEntities).omit({ 
  createdAt: true, 
  updatedAt: true 
}).extend({
  // Allow id to be optionally provided (if not provided, will be auto-generated from code)
  id: z.string().uuid().optional()
});
export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;
export type LegalEntity = typeof legalEntities.$inferSelect;

// ==================== STORES ====================
export const stores = w3suiteSchema.table("stores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  legalEntityId: uuid("legal_entity_id").notNull().references(() => legalEntities.id),
  code: varchar("code", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  channelId: uuid("channel_id").notNull().references(() => channels.id),
  commercialAreaId: uuid("commercial_area_id").notNull().references(() => commercialAreas.id),
  
  // LOCATION FIELDS (real database fields only)
  address: text("address"),
  geo: jsonb("geo"),
  
  citta: varchar("citta", { length: 100 }),
  provincia: varchar("provincia", { length: 10 }),
  cap: varchar("cap", { length: 10 }),
  region: varchar("region", { length: 100 }),
  status: varchar("status", { length: 50 }).default("active"),
  category: storeCategoryEnum("category").default("sales_point").notNull(),
  openedAt: date("opened_at"),
  closedAt: date("closed_at"),
  billingOverrideId: uuid("billing_override_id"),
  branchId: uuid("branch_id"), // FK to brand_interface.brand_branches for Deploy Center (child branch: tenant-slug/store-slug)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
  // Contact fields
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  // Social and digital contact fields
  whatsapp1: varchar("whatsapp1", { length: 20 }),
  whatsapp2: varchar("whatsapp2", { length: 20 }),
  facebook: varchar("facebook", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  tiktok: varchar("tiktok", { length: 255 }),
  googleMapsUrl: text("google_maps_url"),
  telegram: varchar("telegram", { length: 255 }),
}, (table) => [
  uniqueIndex("stores_tenant_code_unique").on(table.tenantId, table.code),
]);

export const insertStoreSchema = createInsertSchema(stores).omit({ 
  createdAt: true, 
  updatedAt: true 
}).extend({
  // Allow id to be optionally provided (if not provided, will be auto-generated from code)
  id: z.string().uuid().optional()
});
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

// ==================== STORE TRACKING CONFIGURATION ====================
// GTM Auto-Configuration System for Multi-Tenant Marketing Attribution
export const storeTrackingConfig = w3suiteSchema.table("store_tracking_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  
  // Marketing Tracking IDs
  ga4MeasurementId: varchar("ga4_measurement_id", { length: 50 }), // Format: G-XXXXXXXXX
  googleAdsConversionId: varchar("google_ads_conversion_id", { length: 50 }), // Format: AW-XXXXXXXX
  facebookPixelId: varchar("facebook_pixel_id", { length: 50 }), // Numeric
  tiktokPixelId: varchar("tiktok_pixel_id", { length: 50 }), // Alphanumeric
  
  // GTM Auto-Configuration Status
  gtmConfigured: boolean("gtm_configured").default(false).notNull(),
  gtmTriggerId: varchar("gtm_trigger_id", { length: 100 }), // GTM API trigger ID
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("store_tracking_config_store_unique").on(table.storeId),
  index("store_tracking_config_tenant_idx").on(table.tenantId),
]);

export const insertStoreTrackingConfigSchema = createInsertSchema(storeTrackingConfig).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStoreTrackingConfig = z.infer<typeof insertStoreTrackingConfigSchema>;
export type StoreTrackingConfig = typeof storeTrackingConfig.$inferSelect;

// ==================== STORE CALENDAR & OPENING HOURS ====================
// Day of week enum for opening rules
export const dayOfWeekEnum = pgEnum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

// Store Opening Rules - Standard weekly schedule for each store
export const storeOpeningRules = w3suiteSchema.table("store_opening_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  
  // Day of week (monday-sunday)
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  
  // Opening hours for this day
  isOpen: boolean("is_open").default(true).notNull(),
  openTime: varchar("open_time", { length: 5 }), // Format: HH:MM (e.g., "09:00")
  closeTime: varchar("close_time", { length: 5 }), // Format: HH:MM (e.g., "20:00")
  
  // Optional break time (e.g., lunch break)
  hasBreak: boolean("has_break").default(false).notNull(),
  breakStartTime: varchar("break_start_time", { length: 5 }), // Format: HH:MM
  breakEndTime: varchar("break_end_time", { length: 5 }), // Format: HH:MM
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("store_opening_rules_store_day_unique").on(table.storeId, table.dayOfWeek),
  index("store_opening_rules_tenant_idx").on(table.tenantId),
  index("store_opening_rules_store_idx").on(table.storeId),
]);

export const insertStoreOpeningRuleSchema = createInsertSchema(storeOpeningRules).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStoreOpeningRule = z.infer<typeof insertStoreOpeningRuleSchema>;
export type StoreOpeningRule = typeof storeOpeningRules.$inferSelect;

// Store Calendar Overrides - Specific date overrides (holidays, special hours, closures)
export const storeCalendarOverrides = w3suiteSchema.table("store_calendar_overrides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  
  // Specific date for override
  date: date("date").notNull(),
  
  // Override type
  overrideType: varchar("override_type", { length: 20 }).notNull(), // 'closed', 'special_hours', 'holiday'
  
  // If open with special hours
  isOpen: boolean("is_open").default(false).notNull(),
  openTime: varchar("open_time", { length: 5 }), // Format: HH:MM
  closeTime: varchar("close_time", { length: 5 }), // Format: HH:MM
  
  // Reason/note for override
  reason: varchar("reason", { length: 255 }),
  holidayName: varchar("holiday_name", { length: 100 }), // If it's a holiday
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("store_calendar_overrides_store_date_unique").on(table.storeId, table.date),
  index("store_calendar_overrides_tenant_idx").on(table.tenantId),
  index("store_calendar_overrides_store_idx").on(table.storeId),
  index("store_calendar_overrides_date_idx").on(table.date),
]);

export const insertStoreCalendarOverrideSchema = createInsertSchema(storeCalendarOverrides).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStoreCalendarOverride = z.infer<typeof insertStoreCalendarOverrideSchema>;
export type StoreCalendarOverride = typeof storeCalendarOverrides.$inferSelect;

// Italian National Holidays - Reference table for Italian public holidays
export const italianHolidays = w3suiteSchema.table("italian_holidays", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Holiday info
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Capodanno", "Pasqua", "Ferragosto"
  date: date("date").notNull(), // Specific date for this year
  year: integer("year").notNull(), // Year for this holiday entry
  
  // Holiday type
  holidayType: varchar("holiday_type", { length: 30 }).notNull(), // 'national', 'religious', 'local'
  isMovable: boolean("is_movable").default(false).notNull(), // e.g., Easter moves each year
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("italian_holidays_name_year_unique").on(table.name, table.year),
  index("italian_holidays_year_idx").on(table.year),
  index("italian_holidays_date_idx").on(table.date),
]);

export const insertItalianHolidaySchema = createInsertSchema(italianHolidays).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertItalianHoliday = z.infer<typeof insertItalianHolidaySchema>;
export type ItalianHoliday = typeof italianHolidays.$inferSelect;

// Store Calendar Settings - Global settings for store calendar (auto-apply rules)
export const storeCalendarSettings = w3suiteSchema.table("store_calendar_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  
  // Auto-apply rules
  autoCloseSundays: boolean("auto_close_sundays").default(true).notNull(),
  autoCloseNationalHolidays: boolean("auto_close_national_holidays").default(true).notNull(),
  autoCloseReligiousHolidays: boolean("auto_close_religious_holidays").default(false).notNull(),
  
  // Default patron saint day (local holiday)
  patronSaintDay: date("patron_saint_day"), // e.g., "06-24" for San Giovanni (Firenze)
  patronSaintName: varchar("patron_saint_name", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("store_calendar_settings_store_unique").on(table.storeId),
  index("store_calendar_settings_tenant_idx").on(table.tenantId),
]);

export const insertStoreCalendarSettingsSchema = createInsertSchema(storeCalendarSettings).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStoreCalendarSettings = z.infer<typeof insertStoreCalendarSettingsSchema>;
export type StoreCalendarSettings = typeof storeCalendarSettings.$inferSelect;

// ==================== RBAC SYSTEM ====================
export const roles = w3suiteSchema.table("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("roles_tenant_name_unique").on(table.tenantId, table.name),
]);

export const insertRoleSchema = createInsertSchema(roles).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const rolePerms = w3suiteSchema.table("role_perms", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  perm: varchar("perm", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.perm] }),
]);

export const userAssignments = w3suiteSchema.table("user_assignments", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  scopeType: scopeTypeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId, table.scopeType, table.scopeId] }),
]);

export const insertUserAssignmentSchema = createInsertSchema(userAssignments).omit({ 
  createdAt: true 
});
export type InsertUserAssignment = z.infer<typeof insertUserAssignmentSchema>;
export type UserAssignment = typeof userAssignments.$inferSelect;

export const userExtraPerms = w3suiteSchema.table("user_extra_perms", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  perm: varchar("perm", { length: 255 }).notNull(),
  mode: permModeEnum("mode").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.perm] }),
]);

// ==================== STORE ASSOCIATIONS ====================
export const userStores = w3suiteSchema.table("user_stores", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.storeId] }),
  index("user_stores_user_idx").on(table.userId),
  index("user_stores_store_idx").on(table.storeId),
  index("user_stores_tenant_idx").on(table.tenantId),
]);

export const insertUserStoreSchema = createInsertSchema(userStores).omit({ 
  createdAt: true 
});
export type InsertUserStore = z.infer<typeof insertUserStoreSchema>;
export type UserStore = typeof userStores.$inferSelect;

// ==================== USER LEGAL ENTITIES (1:M Users → Legal Entities) ====================
export const userLegalEntities = w3suiteSchema.table("user_legal_entities", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  legalEntityId: uuid("legal_entity_id").notNull().references(() => legalEntities.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.legalEntityId] }),
  index("user_legal_entities_user_idx").on(table.userId),
  index("user_legal_entities_legal_entity_idx").on(table.legalEntityId),
  index("user_legal_entities_tenant_idx").on(table.tenantId),
]);

export const insertUserLegalEntitySchema = createInsertSchema(userLegalEntities).omit({ 
  createdAt: true 
});
export type InsertUserLegalEntity = z.infer<typeof insertUserLegalEntitySchema>;
export type UserLegalEntity = typeof userLegalEntities.$inferSelect;

export const storeBrands = w3suiteSchema.table("store_brands", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  brandId: uuid("brand_id").notNull().references(() => brands.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.brandId] }),
  index("store_brands_tenant_idx").on(table.tenantId),
]);

export const storeDriverPotential = w3suiteSchema.table("store_driver_potential", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  potentialScore: smallint("potential_score").notNull(),
  clusterLabel: varchar("cluster_label", { length: 50 }),
  kpis: jsonb("kpis"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.driverId] }),
  index("store_driver_potential_tenant_idx").on(table.tenantId),
]);

// ==================== ENTITY LOGS ====================
export const entityLogs = w3suiteSchema.table('entity_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'legal_entity', 'store', 'user'
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'status_changed', 'updated', 'deleted'
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  changes: jsonb('changes'), // JSON con tutti i cambiamenti
  userId: varchar('user_id').references(() => users.id), // Chi ha fatto il cambio
  userEmail: varchar('user_email', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertEntityLogSchema = createInsertSchema(entityLogs).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertEntityLog = z.infer<typeof insertEntityLogSchema>;
export type EntityLog = typeof entityLogs.$inferSelect;

// ==================== STRUCTURED LOGS ====================
export const structuredLogs = w3suiteSchema.table('structured_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Core log fields
  level: varchar('level', { length: 10 }).notNull(), // INFO, WARN, ERROR, DEBUG
  message: text('message').notNull(),
  component: varchar('component', { length: 100 }).notNull(),
  
  // Context tracking
  correlationId: varchar('correlation_id', { length: 50 }),
  userId: varchar('user_id').references(() => users.id),
  userEmail: varchar('user_email', { length: 255 }),
  
  // Business context
  action: varchar('action', { length: 100 }),
  entityType: varchar('entity_type', { length: 50 }), // 'tenant', 'legal_entity', 'store', 'user'
  entityId: uuid('entity_id'),
  
  // Performance metrics
  duration: integer('duration'), // in milliseconds
  
  // Request context
  httpMethod: varchar('http_method', { length: 10 }),
  httpPath: varchar('http_path', { length: 255 }),
  httpStatusCode: integer('http_status_code'),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
  userAgent: text('user_agent'),
  
  // Error context
  errorStack: text('error_stack'),
  errorCode: varchar('error_code', { length: 50 }),
  
  // Additional metadata
  metadata: jsonb('metadata'), // Flexible JSON data
  
  // Timestamps
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  // Indexes for performance
  index('structured_logs_tenant_timestamp_idx').on(table.tenantId, table.timestamp),
  index('structured_logs_level_timestamp_idx').on(table.level, table.timestamp),
  index('structured_logs_component_timestamp_idx').on(table.component, table.timestamp),
  index('structured_logs_correlation_idx').on(table.correlationId),
  index('structured_logs_user_timestamp_idx').on(table.userId, table.timestamp),
  index('structured_logs_entity_idx').on(table.entityType, table.entityId),
]);

export const insertStructuredLogSchema = createInsertSchema(structuredLogs).omit({ 
  id: true, 
  createdAt: true,
  timestamp: true
});
export type InsertStructuredLog = z.infer<typeof insertStructuredLogSchema>;
export type StructuredLog = typeof structuredLogs.$inferSelect;

// ==================== OBJECT STORAGE METADATA ====================
export const objectMetadata = w3suiteSchema.table("object_metadata", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  objectPath: varchar("object_path", { length: 500 }).notNull().unique(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  visibility: objectVisibilityEnum("visibility").notNull().default("private"),
  objectType: objectTypeEnum("object_type").notNull().default("file"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  publicUrl: varchar("public_url", { length: 500 }),
  bucketId: varchar("bucket_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").default({}), // Additional custom metadata
}, (table) => [
  index("object_metadata_tenant_idx").on(table.tenantId),
  index("object_metadata_uploaded_by_idx").on(table.uploadedBy),
  index("object_metadata_object_type_idx").on(table.objectType),
]);

export const insertObjectMetadataSchema = createInsertSchema(objectMetadata).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertObjectMetadata = z.infer<typeof insertObjectMetadataSchema>;
export type ObjectMetadata = typeof objectMetadata.$inferSelect;

// ==================== OBJECT ACCESS CONTROL (ACL) ====================
export const objectAcls = w3suiteSchema.table("object_acls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  objectPath: varchar("object_path", { length: 500 }).notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  ownerTenantId: uuid("owner_tenant_id").notNull().references(() => tenants.id),
  visibility: objectVisibilityEnum("visibility").notNull().default("private"),
  accessRules: jsonb("access_rules").default([]), // Array of access rules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("object_acls_tenant_idx").on(table.tenantId),
  index("object_acls_object_path_idx").on(table.objectPath),
  index("object_acls_owner_idx").on(table.ownerId),
  uniqueIndex("object_acls_object_path_unique").on(table.objectPath),
]);

export const insertObjectAclSchema = createInsertSchema(objectAcls).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertObjectAcl = z.infer<typeof insertObjectAclSchema>;
export type ObjectAcl = typeof objectAcls.$inferSelect;

// ==================== NOTIFICATIONS SYSTEM ====================
export const notifications = w3suiteSchema.table("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Notification Classification
  type: notificationTypeEnum("type").notNull().default("system"),
  priority: notificationPriorityEnum("priority").notNull().default("medium"),
  status: notificationStatusEnum("status").notNull().default("unread"),
  
  // ==================== BUSINESS CATEGORY EXTENSION ====================
  category: notificationCategoryEnum("category").default("support"), // Business category
  sourceModule: varchar("source_module", { length: 50 }), // Module that generated notification
  
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data").default({}), // Extra structured data
  url: varchar("url", { length: 500 }), // Deep link URL
  
  // ==================== ENHANCED TARGETING ====================
  targetUserId: varchar("target_user_id").references(() => users.id), // Specific user (null = broadcast)
  targetRoles: text("target_roles").array(), // Role-based targeting
  broadcast: boolean("broadcast").default(false), // Send to all tenant users
  
  // Store/Area specific targeting
  storeId: uuid("store_id").references(() => stores.id), // Store-specific notifications
  areaId: uuid("area_id").references(() => legalEntities.id), // Area-specific (via legal entities)
  
  // ==================== REAL-TIME TRACKING ====================
  websocketSent: boolean("websocket_sent").default(false), // Track real-time delivery
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Auto-cleanup for temp notifications
}, (table) => [
  // Performance indexes for common queries
  index("notifications_tenant_status_created_idx").on(table.tenantId, table.status, table.createdAt.desc()),
  index("notifications_tenant_user_status_idx").on(table.tenantId, table.targetUserId, table.status),
  index("notifications_target_roles_gin_idx").using("gin", table.targetRoles),
  index("notifications_expires_at_idx").on(table.expiresAt),
  index("notifications_tenant_priority_created_idx").on(table.tenantId, table.priority, table.createdAt.desc()),
  
  // ==================== NEW INDEXES FOR BUSINESS CATEGORIES ====================
  index("notifications_category_created_idx").on(table.category, table.createdAt.desc()),
  index("notifications_store_category_idx").on(table.storeId, table.category, table.status),
  index("notifications_area_category_idx").on(table.areaId, table.category, table.status),
  index("notifications_websocket_pending_idx").on(table.websocketSent, table.status, table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ==================== NOTIFICATION TEMPLATES ====================
export const notificationTemplates = w3suiteSchema.table("notification_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Template Identification
  templateKey: varchar("template_key", { length: 100 }).notNull(), // e.g., 'hr_request_submitted'
  category: varchar("category", { length: 50 }).notNull(), // e.g., 'hr_request', 'general'
  eventType: varchar("event_type", { length: 100 }).notNull(), // e.g., 'status_change', 'deadline_reminder'
  
  // Template Content
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // In-App Notification Template
  inAppTitle: varchar("in_app_title", { length: 255 }).notNull(),
  inAppMessage: text("in_app_message").notNull(),
  inAppUrl: varchar("in_app_url", { length: 500 }), // Deep link template
  
  // Email Template
  emailSubject: varchar("email_subject", { length: 255 }),
  emailBodyHtml: text("email_body_html"),
  emailBodyText: text("email_body_text"),
  
  // Template Variables (documentation)
  availableVariables: jsonb("available_variables").default([]), // Array of variable names
  
  // Targeting Rules
  defaultPriority: notificationPriorityEnum("default_priority").notNull().default("medium"),
  roleTargeting: text("role_targeting").array(), // Default roles to target
  
  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("notification_templates_tenant_idx").on(table.tenantId),
  index("notification_templates_category_idx").on(table.category),
  uniqueIndex("notification_templates_tenant_key_unique").on(table.tenantId, table.templateKey),
]);

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;

// ==================== NOTIFICATION PREFERENCES ====================
export const notificationPreferences = w3suiteSchema.table("notification_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Channel Preferences
  inAppEnabled: boolean("in_app_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  
  // Category Preferences (JSON for flexibility)
  categoryPreferences: jsonb("category_preferences").default({}), // { hr_request: { email: true, inApp: true, priority: 'high' } }
  
  // Priority Filtering
  minPriorityInApp: notificationPriorityEnum("min_priority_in_app").default("low"),
  minPriorityEmail: notificationPriorityEnum("min_priority_email").default("medium"),
  
  // Quiet Hours (24-hour format)
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // "22:00"
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // "08:00"
  
  // Digest Preferences
  dailyDigestEnabled: boolean("daily_digest_enabled").default(false),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true),
  digestDeliveryTime: varchar("digest_delivery_time", { length: 5 }).default("09:00"), // "09:00"
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("notification_preferences_tenant_idx").on(table.tenantId),
  index("notification_preferences_user_idx").on(table.userId),
  uniqueIndex("notification_preferences_tenant_user_unique").on(table.tenantId, table.userId),
]);

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;


// ==================== SUPPLIERS (Brand Base + Tenant Override Pattern) ====================
export const suppliers = w3suiteSchema.table("suppliers", {
  // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  origin: supplierOriginEnum("origin").notNull(), // 'brand' | 'tenant'
  tenantId: uuid("tenant_id").references(() => tenants.id), // NULL per supplier brand-managed
  externalId: varchar("external_id", { length: 100 }), // ID da Brand Interface
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Nome commerciale
  legalName: varchar("legal_name", { length: 255 }), // Ragione sociale legale
  legalForm: varchar("legal_form", { length: 100 }), // Forma giuridica (SRL, SPA, etc.)
  supplierType: supplierTypeEnum("supplier_type").notNull(),
  
  // ==================== DATI FISCALI ITALIA ====================
  vatNumber: varchar("vat_number", { length: 20 }), // P.IVA
  taxCode: varchar("tax_code", { length: 20 }), // Codice Fiscale (opzionale)
  sdiCode: varchar("sdi_code", { length: 20 }), // Codice SDI fatturazione elettronica
  pecEmail: varchar("pec_email", { length: 255 }), // PEC (alternativa a SDI)
  reaNumber: varchar("rea_number", { length: 50 }), // Numero REA
  chamberOfCommerce: varchar("chamber_of_commerce", { length: 255 }),
  
  // ==================== INDIRIZZO SEDE LEGALE ====================
  registeredAddress: jsonb("registered_address"), // { via, civico, cap, citta, provincia }
  cityId: uuid("city_id").references(() => italianCities.id), // FK to public.italian_cities
  countryId: uuid("country_id").references(() => countries.id).notNull(), // FK to public.countries
  
  // ==================== PAGAMENTI ====================
  preferredPaymentMethodId: uuid("preferred_payment_method_id").references(() => paymentMethods.id),
  paymentConditionId: uuid("payment_condition_id").references(() => paymentMethodsConditions.id),
  paymentTerms: varchar("payment_terms", { length: 100 }), // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // ==================== CONTATTI ====================
  email: varchar("email", { length: 255 }), // Email principale
  phone: varchar("phone", { length: 50 }), // Telefono principale
  website: varchar("website", { length: 255 }), // Sito web
  // Referenti strutturati (JSONB per flessibilità)
  contacts: jsonb("contacts").default({}), // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
  
  // ==================== AMMINISTRATIVI ESTESI ====================
  iban: varchar("iban", { length: 34 }), // Codice IBAN
  bic: varchar("bic", { length: 11 }), // Codice BIC/SWIFT
  splitPayment: boolean("split_payment").default(false), // Split Payment
  withholdingTax: boolean("withholding_tax").default(false), // Ritenuta d'Acconto
  taxRegime: varchar("tax_regime", { length: 100 }), // Regime fiscale
  
  // ==================== CONTROLLO & STATO ====================
  status: supplierStatusEnum("status").notNull().default("active"),
  lockedFields: text("locked_fields").array().default([]), // Campi bloccati dal brand
  
  // ==================== METADATI ====================
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
}, (table) => [
  // Performance indexes
  index("suppliers_tenant_code_idx").on(table.tenantId, table.code),
  index("suppliers_origin_status_idx").on(table.origin, table.status),
  index("suppliers_vat_number_idx").on(table.vatNumber),
  index("suppliers_name_idx").on(table.name),
  uniqueIndex("suppliers_code_unique").on(table.code),
]);

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ==================== SUPPLIER OVERRIDES (Tenant-Specific Suppliers) ====================
// Full table for tenant-created suppliers (not just overrides)
export const supplierOverrides = w3suiteSchema.table("supplier_overrides", {
  // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  origin: supplierOriginEnum("origin").notNull().default("tenant"), // Always 'tenant' for this table
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id), // Always required for tenant suppliers
  externalId: varchar("external_id", { length: 100 }), // ID from Brand Interface (usually NULL for tenant suppliers)
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Nome commerciale
  legalName: varchar("legal_name", { length: 255 }), // Ragione sociale legale
  legalForm: varchar("legal_form", { length: 100 }), // Forma giuridica (SRL, SPA, etc.)
  supplierType: supplierTypeEnum("supplier_type").notNull(),
  
  // ==================== DATI FISCALI ITALIA ====================
  vatNumber: varchar("vat_number", { length: 20 }), // P.IVA
  taxCode: varchar("tax_code", { length: 20 }), // Codice Fiscale (opzionale)
  sdiCode: varchar("sdi_code", { length: 20 }), // Codice SDI fatturazione elettronica
  pecEmail: varchar("pec_email", { length: 255 }), // PEC (alternativa a SDI)
  reaNumber: varchar("rea_number", { length: 50 }), // Numero REA
  chamberOfCommerce: varchar("chamber_of_commerce", { length: 255 }),
  
  // ==================== INDIRIZZO SEDE LEGALE ====================
  registeredAddress: jsonb("registered_address"), // { via, civico, cap, citta, provincia }
  cityId: uuid("city_id").references(() => italianCities.id), // FK to public.italian_cities
  countryId: uuid("country_id").references(() => countries.id).notNull(), // FK to public.countries
  
  // ==================== PAGAMENTI ====================
  preferredPaymentMethodId: uuid("preferred_payment_method_id").references(() => paymentMethods.id),
  paymentConditionId: uuid("payment_condition_id").references(() => paymentMethodsConditions.id),
  paymentTerms: varchar("payment_terms", { length: 100 }), // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // ==================== CONTATTI ====================
  email: varchar("email", { length: 255 }), // Email principale
  phone: varchar("phone", { length: 50 }), // Telefono principale
  website: varchar("website", { length: 255 }), // Sito web
  // Referenti strutturati (JSONB per flessibilità)
  contacts: jsonb("contacts").default({}), // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
  
  // ==================== AMMINISTRATIVI ESTESI ====================
  iban: varchar("iban", { length: 34 }), // Codice IBAN
  bic: varchar("bic", { length: 11 }), // Codice BIC/SWIFT
  splitPayment: boolean("split_payment").default(false), // Split Payment
  withholdingTax: boolean("withholding_tax").default(false), // Ritenuta d'Acconto
  taxRegime: varchar("tax_regime", { length: 100 }), // Regime fiscale
  
  // ==================== CONTROLLO & STATO ====================
  status: supplierStatusEnum("status").notNull().default("active"),
  lockedFields: text("locked_fields").array().default([]), // Campi bloccati dal brand (usually empty for tenant suppliers)
  
  // ==================== METADATI ====================
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
}, (table) => [
  // Performance indexes
  index("supplier_overrides_tenant_code_idx").on(table.tenantId, table.code),
  index("supplier_overrides_origin_status_idx").on(table.origin, table.status),
  index("supplier_overrides_vat_number_idx").on(table.vatNumber),
  index("supplier_overrides_name_idx").on(table.name),
  uniqueIndex("supplier_overrides_tenant_code_unique").on(table.tenantId, table.code),
]);

export const insertSupplierOverrideSchema = createInsertSchema(supplierOverrides).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertSupplierOverride = z.infer<typeof insertSupplierOverrideSchema>;
export type SupplierOverride = typeof supplierOverrides.$inferSelect;

// ==================== PRODUCT HIERARCHY - TENANT CUSTOM ====================

// ==================== TENANT CUSTOM DRIVERS ====================
export const tenantCustomDrivers = w3suiteSchema.table("tenant_custom_drivers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_custom_drivers_tenant").on(table.tenantId),
  uniqueIndex("tenant_custom_drivers_unique").on(table.tenantId, table.code),
]);

export const insertTenantCustomDriverSchema = createInsertSchema(tenantCustomDrivers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertTenantCustomDriver = z.infer<typeof insertTenantCustomDriverSchema>;
export type TenantCustomDriver = typeof tenantCustomDrivers.$inferSelect;

// ==================== TENANT DRIVER CATEGORIES (for both brand and custom drivers) ====================
export const tenantDriverCategories = w3suiteSchema.table("tenant_driver_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  // Can reference either brand driver (public.drivers) OR tenant custom driver
  brandDriverId: uuid("brand_driver_id"), // References public.drivers
  customDriverId: uuid("custom_driver_id").references(() => tenantCustomDrivers.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_driver_categories_tenant").on(table.tenantId),
  index("idx_tenant_driver_categories_brand_driver").on(table.brandDriverId),
  index("idx_tenant_driver_categories_custom_driver").on(table.customDriverId),
  uniqueIndex("tenant_driver_categories_brand_unique").on(table.tenantId, table.brandDriverId, table.code),
  uniqueIndex("tenant_driver_categories_custom_unique").on(table.tenantId, table.customDriverId, table.code),
]);

export const insertTenantDriverCategorySchema = createInsertSchema(tenantDriverCategories).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertTenantDriverCategory = z.infer<typeof insertTenantDriverCategorySchema>;
export type TenantDriverCategory = typeof tenantDriverCategories.$inferSelect;

// ==================== TENANT DRIVER TYPOLOGIES (for both brand and custom categories) ====================
export const tenantDriverTypologies = w3suiteSchema.table("tenant_driver_typologies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  // Can reference either brand category (public.driver_categories) OR tenant custom category
  brandCategoryId: uuid("brand_category_id"), // References public.driver_categories
  customCategoryId: uuid("custom_category_id").references(() => tenantDriverCategories.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_driver_typologies_tenant").on(table.tenantId),
  index("idx_tenant_driver_typologies_brand_category").on(table.brandCategoryId),
  index("idx_tenant_driver_typologies_custom_category").on(table.customCategoryId),
  uniqueIndex("tenant_driver_typologies_brand_unique").on(table.tenantId, table.brandCategoryId, table.code),
  uniqueIndex("tenant_driver_typologies_custom_unique").on(table.tenantId, table.customCategoryId, table.code),
]);

export const insertTenantDriverTypologySchema = createInsertSchema(tenantDriverTypologies).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertTenantDriverTypology = z.infer<typeof insertTenantDriverTypologySchema>;
export type TenantDriverTypology = typeof tenantDriverTypologies.$inferSelect;

// ==================== HR SYSTEM TABLES ====================

// ==================== CALENDAR EVENTS ====================
export const calendarEvents = w3suiteSchema.table("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  
  // Core event data
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  allDay: boolean("all_day").default(false),
  
  // Event classification
  type: calendarEventTypeEnum("type").notNull().default("other"),
  visibility: calendarEventVisibilityEnum("visibility").notNull().default("private"),
  status: calendarEventStatusEnum("status").notNull().default("tentative"),
  hrSensitive: boolean("hr_sensitive").default(false),
  
  // ✅ BUSINESS CATEGORY (was missing from Drizzle)
  category: calendarEventCategoryEnum("category").notNull().default("hr"),
  
  // RBAC scoping
  teamId: uuid("team_id"),
  storeId: uuid("store_id").references(() => stores.id),
  areaId: uuid("area_id"),
  
  // Recurring events
  recurring: jsonb("recurring").default({}), // { pattern, interval, daysOfWeek, endDate, exceptions }
  
  // Participants
  attendees: jsonb("attendees").default([]), // [{ userId, status, responseTime }]
  
  // Additional metadata
  metadata: jsonb("metadata").default({}), // Type-specific data
  color: varchar("color", { length: 7 }), // Hex color for UI
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("calendar_events_tenant_owner_idx").on(table.tenantId, table.ownerId),
  index("calendar_events_tenant_date_idx").on(table.tenantId, table.startDate, table.endDate),
  index("calendar_events_tenant_type_idx").on(table.tenantId, table.type),
  index("calendar_events_store_date_idx").on(table.storeId, table.startDate),
]);

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// ==================== ENCRYPTION KEYS ====================
export const encryptionKeys = w3suiteSchema.table("encryption_keys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Key identification
  keyId: varchar("key_id", { length: 100 }).notNull().unique(),
  version: integer("version").notNull().default(1),
  
  // Key metadata (NOT the actual key - keys are derived client-side)
  algorithm: varchar("algorithm", { length: 50 }).notNull().default("AES-GCM"),
  keyLength: integer("key_length").notNull().default(256),
  saltBase64: text("salt_base64").notNull(), // Salt for key derivation
  iterations: integer("iterations").notNull().default(100000),
  
  // Key status
  isActive: boolean("is_active").default(true),
  
  // GDPR compliance
  destroyedAt: timestamp("destroyed_at"), // For "right to be forgotten"
  destroyReason: varchar("destroy_reason", { length: 100 }),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Key rotation
}, (table) => [
  index("encryption_keys_tenant_active_idx").on(table.tenantId, table.isActive),
  index("encryption_keys_key_id_idx").on(table.keyId),
]);

export const insertEncryptionKeySchema = createInsertSchema(encryptionKeys).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertEncryptionKey = z.infer<typeof insertEncryptionKeySchema>;
export type EncryptionKey = typeof encryptionKeys.$inferSelect;

// ==================== TIME TRACKING ====================
export const timeTracking = w3suiteSchema.table("time_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  
  // Clock times
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  breaks: jsonb("breaks").default([]), // [{ start, end, duration }]
  
  // Tracking details
  trackingMethod: trackingMethodEnum("tracking_method").notNull(),
  
  // LEGACY FIELDS (for backwards compatibility)
  geoLocation: jsonb("geo_location"), // { lat, lng, accuracy, address } - DEPRECATED
  deviceInfo: jsonb("device_info"), // { deviceId, deviceType, ipAddress, userAgent } - DEPRECATED
  notes: text("notes"), // DEPRECATED - use encryptedNotes
  
  // ENCRYPTED FIELDS
  encryptedGeoLocation: text("encrypted_geo_location"), // Base64 encrypted geo data
  encryptedDeviceInfo: text("encrypted_device_info"), // Base64 encrypted device data  
  encryptedNotes: text("encrypted_notes"), // Base64 encrypted notes
  
  // ENCRYPTION METADATA
  encryptionKeyId: varchar("encryption_key_id", { length: 100 }).references(() => encryptionKeys.keyId),
  encryptionVersion: integer("encryption_version").default(1),
  geoLocationIv: varchar("geo_location_iv", { length: 100 }), // Initialization vector for geo
  deviceInfoIv: varchar("device_info_iv", { length: 100 }), // IV for device info
  notesIv: varchar("notes_iv", { length: 100 }), // IV for notes
  geoLocationTag: varchar("geo_location_tag", { length: 100 }), // Auth tag for geo
  deviceInfoTag: varchar("device_info_tag", { length: 100 }), // Auth tag for device
  notesTag: varchar("notes_tag", { length: 100 }), // Auth tag for notes
  encryptedAt: timestamp("encrypted_at"), // When data was encrypted
  
  // Shift association
  shiftId: uuid("shift_id").references(() => shifts.id), // FK to planned shift
  
  // Calculated fields
  totalMinutes: integer("total_minutes"),
  breakMinutes: integer("break_minutes"),
  overtimeMinutes: integer("overtime_minutes"),
  holidayBonus: boolean("holiday_bonus").default(false),
  
  // Status and approval
  status: timeTrackingStatusEnum("status").notNull().default("active"),
  editReason: text("edit_reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("time_tracking_tenant_user_idx").on(table.tenantId, table.userId),
  index("time_tracking_tenant_store_date_idx").on(table.tenantId, table.storeId, table.clockIn),
  index("time_tracking_shift_idx").on(table.shiftId),
  index("time_tracking_status_idx").on(table.status),
  index("time_tracking_encryption_key_idx").on(table.encryptionKeyId),
]);

export const insertTimeTrackingSchema = createInsertSchema(timeTracking).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTimeTracking = z.infer<typeof insertTimeTrackingSchema>;
export type TimeTracking = typeof timeTracking.$inferSelect;

// ==================== STORES TIMETRACKING METHODS ====================
// Configuration table linking stores to available timetracking methods
export const storesTimetrackingMethods = w3suiteSchema.table("stores_timetracking_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  
  // Method configuration
  method: trackingMethodEnum("method").notNull(),
  enabled: boolean("enabled").default(true),
  priority: integer("priority").default(0), // For ordering methods in UI
  
  // Method-specific configuration
  config: jsonb("config").default({}), // Store method-specific settings
  // Examples of config content:
  // GPS: { geofenceRadius: 200, requiresWiFi: false, accuracyThreshold: 50 }
  // QR: { qrCodeUrl: "...", dynamicRefresh: 300, cameraRequired: true }
  // NFC: { requiredBadgeTypes: ["employee", "temp"], timeout: 30 }
  // Badge: { allowedBadgeFormats: ["numeric", "barcode"], length: 8 }
  // Smart: { fallbackOrder: ["gps", "qr", "badge"], confidence: 0.8 }
  // Web: { cookieExpiry: 2592000, fingerprintStrict: true }
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  // Ensure unique store-method combinations per tenant
  uniqueIndex("stores_timetracking_methods_unique").on(table.tenantId, table.storeId, table.method),
  index("stores_timetracking_methods_tenant_idx").on(table.tenantId),
  index("stores_timetracking_methods_store_idx").on(table.storeId),
  index("stores_timetracking_methods_enabled_idx").on(table.enabled),
]);

export const insertStoresTimetrackingMethodsSchema = createInsertSchema(storesTimetrackingMethods).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStoresTimetrackingMethods = z.infer<typeof insertStoresTimetrackingMethodsSchema>;
export type StoresTimetrackingMethods = typeof storesTimetrackingMethods.$inferSelect;

// ==================== SHIFTS ====================
export const shifts = w3suiteSchema.table("shifts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  
  // Shift identification
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }),
  
  // Timing
  date: date("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  breakMinutes: integer("break_minutes").default(0),
  
  // Attendance tolerance (minutes)
  clockInToleranceMinutes: integer("clock_in_tolerance_minutes").default(15),
  clockOutToleranceMinutes: integer("clock_out_tolerance_minutes").default(15),
  
  // Staffing
  requiredStaff: integer("required_staff").notNull(),
  assignedUsers: jsonb("assigned_users").default([]), // [userId1, userId2, ...]
  
  // Shift details
  shiftType: shiftTypeEnum("shift_type").notNull(),
  templateId: uuid("template_id"),
  templateVersionId: uuid("template_version_id"), // References the specific template version used
  skills: jsonb("skills").default([]), // Required skills/certifications
  
  // Status and display
  status: shiftStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
}, (table) => [
  index("shifts_tenant_store_date_idx").on(table.tenantId, table.storeId, table.date),
  index("shifts_tenant_status_idx").on(table.tenantId, table.status),
  index("shifts_template_idx").on(table.templateId),
  index("shifts_template_version_idx").on(table.templateVersionId),
]);

export const insertShiftSchema = createInsertSchema(shifts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

// ==================== SHIFT TEMPLATES ====================
export const shiftTemplates = w3suiteSchema.table("shift_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Template identification
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Scope: 'global' = tutti i negozi, 'store' = solo negozio specifico
  scope: varchar("scope", { length: 10 }).notNull().default("global"), // 'global' | 'store'
  
  // Store assignment (solo se scope='store')
  storeId: uuid("store_id").references(() => stores.id),
  
  // Pattern configuration
  pattern: shiftPatternEnum("pattern").notNull(),
  rules: jsonb("rules").default({}), // Complex recurrence rules
  
  // Default values
  defaultStartTime: varchar("default_start_time", { length: 5 }), // HH:MM format
  defaultEndTime: varchar("default_end_time", { length: 5 }), // HH:MM format
  defaultRequiredStaff: integer("default_required_staff").notNull(),
  defaultSkills: jsonb("default_skills").default([]),
  defaultBreakMinutes: integer("default_break_minutes").default(30),
  
  // ✅ NEW: Shift Type and Global Tolerances for Split Shifts
  // 'slot_based': Each time slot is a separate shift with its own tolerances/breaks
  // 'split_shift': All time slots together form one shift with global tolerances/breaks
  shiftType: varchar("shift_type", { length: 20 }).notNull().default("slot_based"), // 'slot_based' | 'split_shift'
  globalClockInTolerance: integer("global_clock_in_tolerance"), // Used only for split_shift type
  globalClockOutTolerance: integer("global_clock_out_tolerance"), // Used only for split_shift type
  globalBreakMinutes: integer("global_break_minutes"), // Used only for split_shift type
  
  // Validity and status
  isActive: boolean("is_active").default(true),
  status: varchar("status", { length: 20 }).default("active"), // NEW: active | archived
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  
  // Duplication tracking - references parent template if this was created via duplicate
  sourceTemplateId: uuid("source_template_id"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_templates_tenant_active_idx").on(table.tenantId, table.isActive),
  index("shift_templates_pattern_idx").on(table.pattern),
  index("shift_templates_store_idx").on(table.storeId),
  index("shift_templates_source_idx").on(table.sourceTemplateId),
]);

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

// ==================== SHIFT TEMPLATE VERSIONS ====================
// Stores historical versions of templates for immutable shift history
// When a template is modified, a new version is created and future shifts inherit it
// Past shifts (completed/cancelled) retain their original version reference
export const shiftTemplateVersions = w3suiteSchema.table("shift_template_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => shiftTemplates.id, { onDelete: 'cascade' }),
  
  // Version tracking
  versionNumber: integer("version_number").notNull(), // Auto-incremented per template
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveUntil: timestamp("effective_until"), // NULL = current version
  
  // Snapshot of template data at this version
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  scope: varchar("scope", { length: 10 }).notNull(),
  storeId: uuid("store_id"),
  shiftType: varchar("shift_type", { length: 20 }).notNull(),
  
  // Global tolerances (for split_shift type)
  globalClockInTolerance: integer("global_clock_in_tolerance"),
  globalClockOutTolerance: integer("global_clock_out_tolerance"),
  globalBreakMinutes: integer("global_break_minutes"),
  
  // Time slots snapshot (JSON array with all slot data)
  timeSlotsSnapshot: jsonb("time_slots_snapshot").notNull().default([]),
  
  // Change tracking
  changeReason: text("change_reason"), // Optional reason for version change
  changedBy: varchar("changed_by").references(() => users.id),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("shift_template_versions_template_idx").on(table.templateId),
  index("shift_template_versions_version_idx").on(table.templateId, table.versionNumber),
  index("shift_template_versions_effective_idx").on(table.templateId, table.effectiveFrom),
]);

export const insertShiftTemplateVersionSchema = createInsertSchema(shiftTemplateVersions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertShiftTemplateVersion = z.infer<typeof insertShiftTemplateVersionSchema>;
export type ShiftTemplateVersion = typeof shiftTemplateVersions.$inferSelect;

// ==================== SHIFT TIME SLOTS ====================
// Enhanced support for multiple time slots per shift template
export const shiftTimeSlots = w3suiteSchema.table("shift_time_slots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => shiftTemplates.id, { onDelete: 'cascade' }),
  
  // Time slot identification
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Apertura", "Pausa Pranzo", "Chiusura"
  slotOrder: integer("slot_order").notNull(), // Order within the template
  
  // Timing
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format
  
  // ✅ NEW: Multi-block shift support (up to 4 blocks)
  segmentType: varchar("segment_type", { length: 20 }).notNull().default("continuous"), // continuous | split | triple | quad
  block2StartTime: varchar("block2_start_time", { length: 5 }), // For multi-block shifts
  block2EndTime: varchar("block2_end_time", { length: 5 }), // For multi-block shifts
  block3StartTime: varchar("block3_start_time", { length: 5 }), // For triple/quad shifts
  block3EndTime: varchar("block3_end_time", { length: 5 }), // For triple/quad shifts
  block4StartTime: varchar("block4_start_time", { length: 5 }), // For quad shifts only
  block4EndTime: varchar("block4_end_time", { length: 5 }), // For quad shifts only
  breakMinutes: integer("break_minutes").default(0), // Break duration (applies to all types)
  clockInTolerance: integer("clock_in_tolerance").default(15), // Minutes tolerance for clock-in
  clockOutTolerance: integer("clock_out_tolerance").default(15), // Minutes tolerance for clock-out
  
  // Slot configuration
  requiredStaff: integer("required_staff").notNull(),
  skills: jsonb("skills").default([]), // Required skills for this slot
  isBreak: boolean("is_break").default(false), // True if this is a break slot
  
  // Flexibility
  minStaff: integer("min_staff"), // Minimum staff required
  maxStaff: integer("max_staff"), // Maximum staff allowed
  priority: integer("priority").default(1), // 1=critical, 2=important, 3=optional
  
  // Metadata
  color: varchar("color", { length: 7 }), // Hex color for UI display
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_time_slots_template_order_idx").on(table.templateId, table.slotOrder),
  index("shift_time_slots_tenant_idx").on(table.tenantId),
  uniqueIndex("shift_time_slots_template_order_unique").on(table.templateId, table.slotOrder),
]);

export const insertShiftTimeSlotSchema = createInsertSchema(shiftTimeSlots).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShiftTimeSlot = z.infer<typeof insertShiftTimeSlotSchema>;
export type ShiftTimeSlot = typeof shiftTimeSlots.$inferSelect;

// ==================== SHIFT ASSIGNMENTS ====================
// Enhanced many-to-many relationship for user-shift assignments with metadata
export const shiftAssignments = w3suiteSchema.table("shift_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  shiftId: varchar("shift_id").notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Assignment details
  assignmentType: varchar("assignment_type", { length: 20 }).notNull().default("manual"), // manual, auto, template
  timeSlotId: varchar("time_slot_id").references(() => shiftTimeSlots.id), // Specific time slot assignment
  
  // Assignment metadata
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  
  // Status tracking
  // Status values: assigned, confirmed, rejected, completed, override, cancelled
  // - override: Assignment was overridden by approved leave/sick request
  // - cancelled: Assignment was manually cancelled
  status: varchar("status", { length: 20 }).notNull().default("assigned"),
  confirmedAt: timestamp("confirmed_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  
  // Performance tracking
  punctualityScore: integer("punctuality_score"), // 0-100 score for punctuality
  performanceNotes: text("performance_notes"),
  
  // Compliance and attendance
  expectedClockIn: timestamp("expected_clock_in"),
  expectedClockOut: timestamp("expected_clock_out"),
  actualClockIn: timestamp("actual_clock_in"),
  actualClockOut: timestamp("actual_clock_out"),
  
  // Deviation tracking
  clockInDeviationMinutes: integer("clock_in_deviation_minutes"), // Calculated deviation
  clockOutDeviationMinutes: integer("clock_out_deviation_minutes"),
  isCompliant: boolean("is_compliant").default(true), // Auto-calculated compliance flag
  
  // Notes and communication
  employeeNotes: text("employee_notes"), // Notes from employee
  managerNotes: text("manager_notes"), // Notes from manager
  
  // ==================== OVERRIDE & ACKNOWLEDGEMENT SYSTEM ====================
  // When HR approves a leave/sick request that conflicts with this assignment
  overrideReason: text("override_reason"), // "Ferie approvate", "Malattia", etc.
  overrideRequestId: uuid("override_request_id").references(() => universalRequests.id), // Link to the request that caused override
  overrideAt: timestamp("override_at"), // When the override was applied
  overrideBy: varchar("override_by").references(() => users.id), // Who applied the override
  
  // Employee acknowledgement of assignment (for notification tracking)
  acknowledgedAt: timestamp("acknowledged_at"), // When employee saw/acknowledged the assignment
  notifiedAt: timestamp("notified_at"), // When notification was sent
  
  // Validation results from assignment (stored for audit and display)
  conflictReasons: jsonb("conflict_reasons").default([]), // [{type: 'leave', severity: 'block', message: '...'}]
  validationWarnings: jsonb("validation_warnings").default([]), // [{type: 'hours_exceeded', message: '...', data: {...}}]
  validationPassedAt: timestamp("validation_passed_at"), // When assignment passed validation
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Core indexes for performance
  index("shift_assignments_tenant_user_idx").on(table.tenantId, table.userId),
  index("shift_assignments_shift_idx").on(table.shiftId),
  index("shift_assignments_status_idx").on(table.status),
  index("shift_assignments_compliance_idx").on(table.isCompliant),
  index("shift_assignments_punctuality_idx").on(table.punctualityScore),
  
  // Unique constraint to prevent duplicate assignments
  uniqueIndex("shift_assignments_unique").on(table.shiftId, table.userId, table.timeSlotId),
  
  // Time-based indexes for reporting
  index("shift_assignments_assigned_date_idx").on(table.assignedAt),
  index("shift_assignments_expected_clock_in_idx").on(table.expectedClockIn),
  
  // Override and acknowledgement indexes
  index("shift_assignments_override_idx").on(table.overrideRequestId),
  index("shift_assignments_acknowledged_idx").on(table.acknowledgedAt),
  index("shift_assignments_notified_idx").on(table.notifiedAt),
]);

export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  assignedAt: true
});
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;

// ==================== SHIFT ATTENDANCE ====================
// Enhanced shift compliance and attendance matching system
export const shiftAttendance = w3suiteSchema.table("shift_attendance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  assignmentId: varchar("assignment_id").notNull().references(() => shiftAssignments.id, { onDelete: 'cascade' }),
  timeTrackingId: uuid("time_tracking_id").references(() => timeTracking.id),
  
  // Essential filtering fields
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Attendance status
  attendanceStatus: varchar("attendance_status", { length: 20 }).notNull().default("scheduled"), 
  // scheduled, present, late, absent, early_departure, overtime
  
  // Matching data
  matchingScore: real("matching_score"), // 0.0-1.0 confidence score for auto-matching
  matchingMethod: varchar("matching_method", { length: 20 }), // auto, manual, override
  
  // Deviation analysis
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  scheduledEndTime: timestamp("scheduled_end_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  
  // Calculated metrics
  startDeviationMinutes: integer("start_deviation_minutes"), // + late, - early
  endDeviationMinutes: integer("end_deviation_minutes"),
  totalWorkedMinutes: integer("total_worked_minutes"),
  scheduledMinutes: integer("scheduled_minutes"),
  overtimeMinutes: integer("overtime_minutes"),
  
  // Compliance flags
  isOnTime: boolean("is_on_time").default(true),
  isCompliantDuration: boolean("is_compliant_duration").default(true),
  requiresApproval: boolean("requires_approval").default(false),
  
  // Geographic compliance
  clockInLocation: jsonb("clock_in_location"), // { lat, lng, accuracy, address }
  clockOutLocation: jsonb("clock_out_location"),
  isLocationCompliant: boolean("is_location_compliant").default(true),
  geofenceDeviationMeters: integer("geofence_deviation_meters"),
  
  // Alert and notification status
  alertsSent: jsonb("alerts_sent").default([]), // Array of alert types sent
  escalationLevel: integer("escalation_level").default(0), // 0=none, 1=supervisor, 2=hr, 3=admin
  
  // Manager review
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewStatus: varchar("review_status", { length: 20 }), // pending, approved, disputed, corrected
  reviewNotes: text("review_notes"),
  
  // System metadata
  processingStatus: varchar("processing_status", { length: 20 }).default("pending"), // pending, processed, error
  lastProcessedAt: timestamp("last_processed_at"),
  errorMessage: text("error_message"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes
  index("shift_attendance_tenant_idx").on(table.tenantId),
  index("shift_attendance_assignment_idx").on(table.assignmentId),
  index("shift_attendance_time_tracking_idx").on(table.timeTrackingId),
  index("shift_attendance_status_idx").on(table.attendanceStatus),
  
  // Compliance and monitoring indexes
  index("shift_attendance_compliance_idx").on(table.isOnTime, table.isCompliantDuration, table.isLocationCompliant),
  index("shift_attendance_alerts_idx").on(table.requiresApproval, table.escalationLevel),
  index("shift_attendance_review_idx").on(table.reviewStatus, table.reviewedAt),
  
  // Time-based indexes for reporting
  index("shift_attendance_scheduled_time_idx").on(table.scheduledStartTime),
  index("shift_attendance_actual_time_idx").on(table.actualStartTime),
  index("shift_attendance_processing_idx").on(table.processingStatus, table.lastProcessedAt),
  
  // Unique constraint for assignment-timetracking relationship
  uniqueIndex("shift_attendance_assignment_tracking_unique").on(table.assignmentId, table.timeTrackingId),
]);

export const insertShiftAttendanceSchema = createInsertSchema(shiftAttendance).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShiftAttendance = z.infer<typeof insertShiftAttendanceSchema>;
export type ShiftAttendance = typeof shiftAttendance.$inferSelect;

// ==================== ATTENDANCE ANOMALIES ====================
// Tracks attendance/timeclock anomalies for supervisor review
export const attendanceAnomalies = w3suiteSchema.table("attendance_anomalies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  attendanceId: uuid("attendance_id").references(() => shiftAttendance.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  shiftId: uuid("shift_id").references(() => shifts.id),
  storeId: uuid("store_id").references(() => stores.id),
  
  // Anomaly classification
  anomalyType: varchar("anomaly_type", { length: 50 }).notNull(), 
  // late_clock_in, early_clock_out, wrong_store, no_shift_assigned, overtime_unapproved, missing_clock_out
  
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  
  // Anomaly details
  expectedValue: text("expected_value"), // JSON string with expected data
  actualValue: text("actual_value"), // JSON string with actual data
  deviationMinutes: integer("deviation_minutes"), // Time deviation if applicable
  deviationMeters: integer("deviation_meters"), // Location deviation if applicable
  
  // Detection
  detectedAt: timestamp("detected_at").defaultNow(),
  detectionMethod: varchar("detection_method", { length: 20 }).default("automatic"), // automatic, manual, system
  
  // Resolution
  resolutionStatus: varchar("resolution_status", { length: 20 }).notNull().default("pending"), 
  // pending, acknowledged, resolved, dismissed, escalated
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  resolutionAction: varchar("resolution_action", { length: 50 }), // approved, corrected, penalized, excused
  
  // Notification
  notifiedSupervisor: boolean("notified_supervisor").default(false),
  notifiedAt: timestamp("notified_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("attendance_anomalies_tenant_idx").on(table.tenantId),
  index("attendance_anomalies_user_idx").on(table.userId),
  index("attendance_anomalies_store_idx").on(table.storeId),
  index("attendance_anomalies_type_idx").on(table.anomalyType),
  index("attendance_anomalies_severity_idx").on(table.severity),
  index("attendance_anomalies_status_idx").on(table.resolutionStatus),
  index("attendance_anomalies_detected_idx").on(table.detectedAt),
]);

export const insertAttendanceAnomalySchema = createInsertSchema(attendanceAnomalies).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  detectedAt: true
});
export type InsertAttendanceAnomaly = z.infer<typeof insertAttendanceAnomalySchema>;
export type AttendanceAnomaly = typeof attendanceAnomalies.$inferSelect;

// ==================== RESOURCE AVAILABILITY ====================
// Tracks employee availability for shift assignment (vacation, sick leave, etc)
export const resourceAvailability = w3suiteSchema.table("resource_availability", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Availability period
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  
  // Availability status
  availabilityStatus: varchar("availability_status", { length: 30 }).notNull(), 
  // available, vacation, sick_leave, personal_leave, training, unavailable, restricted
  
  // Reason and justification
  reasonType: varchar("reason_type", { length: 50 }), // approved_leave, medical, personal, scheduled_off
  reasonDescription: text("reason_description"),
  leaveRequestId: uuid("leave_request_id"), // Link to HR leave request if applicable
  
  // Time constraints
  isFullDay: boolean("is_full_day").default(true),
  startTime: timestamp("start_time"), // If partial day
  endTime: timestamp("end_time"), // If partial day
  
  // Approval tracking
  approvalStatus: varchar("approval_status", { length: 20 }).default("approved"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Impact on scheduling
  blocksShiftAssignment: boolean("blocks_shift_assignment").default(true),
  showInSchedule: boolean("show_in_schedule").default(true),
  
  // Metadata
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  
  // Audit
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("resource_availability_tenant_idx").on(table.tenantId),
  index("resource_availability_user_idx").on(table.userId),
  index("resource_availability_date_range_idx").on(table.startDate, table.endDate),
  index("resource_availability_status_idx").on(table.availabilityStatus),
  index("resource_availability_approval_idx").on(table.approvalStatus),
  index("resource_availability_blocking_idx").on(table.blocksShiftAssignment),
]);

export const insertResourceAvailabilitySchema = createInsertSchema(resourceAvailability).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertResourceAvailability = z.infer<typeof insertResourceAvailabilitySchema>;
export type ResourceAvailability = typeof resourceAvailability.$inferSelect;

// ==================== HR DOCUMENTS ====================
export const hrDocuments = w3suiteSchema.table("hr_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Document classification
  documentType: hrDocumentTypeEnum("document_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // File information
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  
  // Period reference (for payslips)
  year: integer("year"),
  month: integer("month"),
  
  // Security and expiry
  isConfidential: boolean("is_confidential").default(false),
  expiryDate: date("expiry_date"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Document source and tracking
  source: hrDocumentSourceEnum("source").notNull().default("employee"),
  viewedAt: timestamp("viewed_at"),
  
  // Audit
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hr_documents_tenant_user_idx").on(table.tenantId, table.userId),
  index("hr_documents_tenant_type_idx").on(table.tenantId, table.documentType),
  index("hr_documents_tenant_source_idx").on(table.tenantId, table.source),
  index("hr_documents_year_month_idx").on(table.year, table.month),
  index("hr_documents_expiry_idx").on(table.expiryDate),
]);

export const insertHrDocumentSchema = createInsertSchema(hrDocuments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  uploadedAt: true
});
export type InsertHrDocument = z.infer<typeof insertHrDocumentSchema>;
export type HrDocument = typeof hrDocuments.$inferSelect;

// ==================== EXPENSE REPORTS ====================
export const expenseReports = w3suiteSchema.table("expense_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Report identification
  reportNumber: varchar("report_number", { length: 50 }).notNull(),
  period: varchar("period", { length: 7 }), // YYYY-MM format
  
  // Financial summary
  totalAmount: integer("total_amount").notNull().default(0), // Stored in cents
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // Status workflow
  status: expenseReportStatusEnum("status").notNull().default("draft"),
  
  // Approval and payment
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  reimbursedAt: timestamp("reimbursed_at"),
  rejectionReason: text("rejection_reason"),
  paymentMethod: expensePaymentMethodEnum("payment_method"),
  
  // Additional information
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("expense_reports_tenant_user_idx").on(table.tenantId, table.userId),
  index("expense_reports_tenant_status_idx").on(table.tenantId, table.status),
  index("expense_reports_period_idx").on(table.period),
  uniqueIndex("expense_reports_tenant_number_unique").on(table.tenantId, table.reportNumber),
]);

export const insertExpenseReportSchema = createInsertSchema(expenseReports).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertExpenseReport = z.infer<typeof insertExpenseReportSchema>;
export type ExpenseReport = typeof expenseReports.$inferSelect;

// ==================== EXPENSE ITEMS ====================
export const expenseItems = w3suiteSchema.table("expense_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseReportId: uuid("expense_report_id").notNull().references(() => expenseReports.id, { onDelete: "cascade" }),
  
  // Item details
  date: date("date").notNull(),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  
  // Financial data
  amount: integer("amount").notNull(), // Stored in cents
  vat: integer("vat").default(0), // VAT percentage * 100 (e.g., 2200 = 22%)
  vatAmount: integer("vat_amount").default(0), // VAT amount in cents
  
  // Receipt and documentation
  receipt: boolean("receipt").default(false),
  receiptPath: varchar("receipt_path", { length: 500 }),
  
  // Project allocation
  projectCode: varchar("project_code", { length: 50 }),
  clientCode: varchar("client_code", { length: 50 }),
  
  // Reimbursement
  isReimbursable: boolean("is_reimbursable").default(true),
  
  // Additional information
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("expense_items_report_idx").on(table.expenseReportId),
  index("expense_items_date_idx").on(table.date),
  index("expense_items_category_idx").on(table.category),
]);

export const insertExpenseItemSchema = createInsertSchema(expenseItems).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertExpenseItem = z.infer<typeof insertExpenseItemSchema>;
export type ExpenseItem = typeof expenseItems.$inferSelect;






// ==================== DRIZZLE RELATIONS ====================

// Tenants Relations
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
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
  notificationPreferences: many(notificationPreferences),
}));

// Users Relations
export const usersRelations = relations(users, ({ one, many }) => ({
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
  notificationPreferences: many(notificationPreferences),
}));

// Legal Entities Relations
export const legalEntitiesRelations = relations(legalEntities, ({ one, many }) => ({
  tenant: one(tenants, { fields: [legalEntities.tenantId], references: [tenants.id] }),
  stores: many(stores),
  userLegalEntities: many(userLegalEntities),
}));

// Stores Relations
export const storesRelations = relations(stores, ({ one, many }) => ({
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
  storesTimetrackingMethods: many(storesTimetrackingMethods),
}));

// Roles Relations
export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  rolePerms: many(rolePerms),
  userAssignments: many(userAssignments),
}));

// Role Permissions Relations
export const rolePermsRelations = relations(rolePerms, ({ one }) => ({
  role: one(roles, { fields: [rolePerms.roleId], references: [roles.id] }),
}));

// User Assignments Relations
export const userAssignmentsRelations = relations(userAssignments, ({ one }) => ({
  user: one(users, { fields: [userAssignments.userId], references: [users.id] }),
  role: one(roles, { fields: [userAssignments.roleId], references: [roles.id] }),
}));

// User Extra Permissions Relations
export const userExtraPermsRelations = relations(userExtraPerms, ({ one }) => ({
  user: one(users, { fields: [userExtraPerms.userId], references: [users.id] }),
}));

// User Stores Relations
export const userStoresRelations = relations(userStores, ({ one }) => ({
  user: one(users, { fields: [userStores.userId], references: [users.id] }),
  store: one(stores, { fields: [userStores.storeId], references: [stores.id] }),
  tenant: one(tenants, { fields: [userStores.tenantId], references: [tenants.id] }),
}));

// Store Brands Relations
export const storeBrandsRelations = relations(storeBrands, ({ one }) => ({
  store: one(stores, { fields: [storeBrands.storeId], references: [stores.id] }),
  brand: one(brands, { fields: [storeBrands.brandId], references: [brands.id] }),
  tenant: one(tenants, { fields: [storeBrands.tenantId], references: [tenants.id] }),
}));

// Store Driver Potential Relations
export const storeDriverPotentialRelations = relations(storeDriverPotential, ({ one }) => ({
  store: one(stores, { fields: [storeDriverPotential.storeId], references: [stores.id] }),
  driver: one(drivers, { fields: [storeDriverPotential.driverId], references: [drivers.id] }),
  tenant: one(tenants, { fields: [storeDriverPotential.tenantId], references: [tenants.id] }),
}));

// Entity Logs Relations
export const entityLogsRelations = relations(entityLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [entityLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [entityLogs.userId], references: [users.id] }),
}));

// Structured Logs Relations
export const structuredLogsRelations = relations(structuredLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [structuredLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [structuredLogs.userId], references: [users.id] }),
}));

// User Legal Entities Relations
export const userLegalEntitiesRelations = relations(userLegalEntities, ({ one }) => ({
  user: one(users, { fields: [userLegalEntities.userId], references: [users.id] }),
  legalEntity: one(legalEntities, { fields: [userLegalEntities.legalEntityId], references: [legalEntities.id] }),
  tenant: one(tenants, { fields: [userLegalEntities.tenantId], references: [tenants.id] }),
}));

// Notifications Relations
// Object Metadata Relations
export const objectMetadataRelations = relations(objectMetadata, ({ one }) => ({
  tenant: one(tenants, { fields: [objectMetadata.tenantId], references: [tenants.id] }),
  uploadedByUser: one(users, { fields: [objectMetadata.uploadedBy], references: [users.id] }),
}));

// Object ACLs Relations  
export const objectAclsRelations = relations(objectAcls, ({ one }) => ({
  tenant: one(tenants, { fields: [objectAcls.tenantId], references: [tenants.id] }),
  ownerTenant: one(tenants, { fields: [objectAcls.ownerTenantId], references: [tenants.id] }),
  owner: one(users, { fields: [objectAcls.ownerId], references: [users.id] }),
}));

// ==================== SUPPLIERS RELATIONS ====================
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
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
  overrides: many(supplierOverrides),
}));

// Supplier Overrides Relations (now full table for tenant-specific suppliers)
export const supplierOverridesRelations = relations(supplierOverrides, ({ one }) => ({
  // Relations verso w3suite schema
  tenant: one(tenants, { fields: [supplierOverrides.tenantId], references: [tenants.id] }),
  createdByUser: one(users, { fields: [supplierOverrides.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [supplierOverrides.updatedBy], references: [users.id] }),
  
  // Relations verso public schema (reference tables)
  city: one(italianCities, { fields: [supplierOverrides.cityId], references: [italianCities.id] }),
  country: one(countries, { fields: [supplierOverrides.countryId], references: [countries.id] }),
  preferredPaymentMethod: one(paymentMethods, { fields: [supplierOverrides.preferredPaymentMethodId], references: [paymentMethods.id] }),
  paymentCondition: one(paymentMethodsConditions, { fields: [supplierOverrides.paymentConditionId], references: [paymentMethodsConditions.id] }),
}));

// ==================== HR SYSTEM RELATIONS ====================

// Calendar Events Relations
export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [calendarEvents.tenantId], references: [tenants.id] }),
  owner: one(users, { fields: [calendarEvents.ownerId], references: [users.id] }),
  store: one(stores, { fields: [calendarEvents.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [calendarEvents.updatedBy], references: [users.id] }),
}));

// Time Tracking Relations
export const timeTrackingRelations = relations(timeTracking, ({ one, many }) => ({
  tenant: one(tenants, { fields: [timeTracking.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [timeTracking.userId], references: [users.id] }),
  store: one(stores, { fields: [timeTracking.storeId], references: [stores.id] }),
  shift: one(shifts, { fields: [timeTracking.shiftId], references: [shifts.id] }),
  approvedByUser: one(users, { fields: [timeTracking.approvedBy], references: [users.id] }),
  attendanceEntries: many(shiftAttendance),
}));

// Stores Timetracking Methods Relations
export const storesTimetrackingMethodsRelations = relations(storesTimetrackingMethods, ({ one }) => ({
  tenant: one(tenants, { fields: [storesTimetrackingMethods.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [storesTimetrackingMethods.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [storesTimetrackingMethods.createdBy], references: [users.id] }),
}));


// Shifts Relations
export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [shifts.storeId], references: [stores.id] }),
  template: one(shiftTemplates, { fields: [shifts.templateId], references: [shiftTemplates.id] }),
  templateVersion: one(shiftTemplateVersions, { fields: [shifts.templateVersionId], references: [shiftTemplateVersions.id] }),
  createdByUser: one(users, { fields: [shifts.createdBy], references: [users.id] }),
  timeTrackingEntries: many(timeTracking),
  assignments: many(shiftAssignments),
}));

// Shift Templates Relations
export const shiftTemplatesRelations = relations(shiftTemplates, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTemplates.tenantId], references: [tenants.id] }),
  shifts: many(shifts),
  timeSlots: many(shiftTimeSlots),
  versions: many(shiftTemplateVersions),
}));

// Shift Template Versions Relations
export const shiftTemplateVersionsRelations = relations(shiftTemplateVersions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTemplateVersions.tenantId], references: [tenants.id] }),
  template: one(shiftTemplates, { fields: [shiftTemplateVersions.templateId], references: [shiftTemplates.id] }),
  changedByUser: one(users, { fields: [shiftTemplateVersions.changedBy], references: [users.id] }),
  shifts: many(shifts),
}));

// Shift Time Slots Relations
export const shiftTimeSlotsRelations = relations(shiftTimeSlots, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTimeSlots.tenantId], references: [tenants.id] }),
  template: one(shiftTemplates, { fields: [shiftTimeSlots.templateId], references: [shiftTemplates.id] }),
  assignments: many(shiftAssignments),
}));

// Shift Assignments Relations
export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftAssignments.tenantId], references: [tenants.id] }),
  shift: one(shifts, { fields: [shiftAssignments.shiftId], references: [shifts.id] }),
  user: one(users, { fields: [shiftAssignments.userId], references: [users.id] }),
  timeSlot: one(shiftTimeSlots, { fields: [shiftAssignments.timeSlotId], references: [shiftTimeSlots.id] }),
  assignedByUser: one(users, { fields: [shiftAssignments.assignedBy], references: [users.id] }),
  attendance: many(shiftAttendance),
}));

// Shift Attendance Relations
export const shiftAttendanceRelations = relations(shiftAttendance, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftAttendance.tenantId], references: [tenants.id] }),
  assignment: one(shiftAssignments, { fields: [shiftAttendance.assignmentId], references: [shiftAssignments.id] }),
  timeTracking: one(timeTracking, { fields: [shiftAttendance.timeTrackingId], references: [timeTracking.id] }),
  store: one(stores, { fields: [shiftAttendance.storeId], references: [stores.id] }),
  user: one(users, { fields: [shiftAttendance.userId], references: [users.id] }),
  reviewedByUser: one(users, { fields: [shiftAttendance.reviewedBy], references: [users.id] }),
  anomalies: many(attendanceAnomalies),
}));

// Attendance Anomalies Relations
export const attendanceAnomaliesRelations = relations(attendanceAnomalies, ({ one }) => ({
  tenant: one(tenants, { fields: [attendanceAnomalies.tenantId], references: [tenants.id] }),
  attendance: one(shiftAttendance, { fields: [attendanceAnomalies.attendanceId], references: [shiftAttendance.id] }),
  user: one(users, { fields: [attendanceAnomalies.userId], references: [users.id] }),
  shift: one(shifts, { fields: [attendanceAnomalies.shiftId], references: [shifts.id] }),
  store: one(stores, { fields: [attendanceAnomalies.storeId], references: [stores.id] }),
  resolvedByUser: one(users, { fields: [attendanceAnomalies.resolvedBy], references: [users.id] }),
}));

// Resource Availability Relations
export const resourceAvailabilityRelations = relations(resourceAvailability, ({ one }) => ({
  tenant: one(tenants, { fields: [resourceAvailability.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [resourceAvailability.userId], references: [users.id] }),
  approvedByUser: one(users, { fields: [resourceAvailability.approvedBy], references: [users.id] }),
  createdByUser: one(users, { fields: [resourceAvailability.createdBy], references: [users.id] }),
}));

// HR Documents Relations
export const hrDocumentsRelations = relations(hrDocuments, ({ one }) => ({
  tenant: one(tenants, { fields: [hrDocuments.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [hrDocuments.userId], references: [users.id] }),
  uploadedByUser: one(users, { fields: [hrDocuments.uploadedBy], references: [users.id] }),
}));

// Expense Reports Relations
export const expenseReportsRelations = relations(expenseReports, ({ one, many }) => ({
  tenant: one(tenants, { fields: [expenseReports.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [expenseReports.userId], references: [users.id] }),
  approvedByUser: one(users, { fields: [expenseReports.approvedBy], references: [users.id] }),
  expenseItems: many(expenseItems),
}));

// Expense Items Relations
export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  expenseReport: one(expenseReports, { fields: [expenseItems.expenseReportId], references: [expenseReports.id] }),
}));

// Employee Balances Relations

// ==================== HR REQUEST SYSTEM RELATIONS ====================


// ==================== UNIVERSAL HIERARCHY SYSTEM ====================

// Organizational Structure - Gerarchia universale per tutti i servizi
export const organizationalStructure = w3suiteSchema.table("organizational_structure", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // User hierarchy
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: varchar("parent_id").references(() => users.id), // Manager diretto
  
  // Tree structure optimization
  pathTree: text("path_tree").array().default([]), // ['ceo_id', 'area_mgr_id', 'store_mgr_id', 'user_id']
  depth: integer("depth").notNull().default(0), // Livello nell'albero (0 = CEO)
  
  // Organizational unit
  organizationalUnit: varchar("organizational_unit", { length: 100 }), // 'store_milano', 'it_dept', 'finance_team'
  unitType: varchar("unit_type", { length: 50 }), // 'store', 'department', 'team', 'division'
  
  // Deleghe temporanee
  delegates: jsonb("delegates").default([]), // [{userId, fromDate, toDate, permissions}]
  
  // Temporal validity
  validFrom: timestamp("valid_from").notNull().defaultNow(),
  validTo: timestamp("valid_to"),
  
  // RBAC permissions scope
  permissions: jsonb("permissions").default({}), // Service-specific permissions
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("org_structure_tenant_user_idx").on(table.tenantId, table.userId),
  index("org_structure_parent_idx").on(table.parentId),
  index("org_structure_unit_idx").on(table.organizationalUnit),
  index("org_structure_path_gin_idx").using("gin", table.pathTree),
  uniqueIndex("org_structure_user_valid_unique").on(table.userId, table.validFrom),
]);

export const insertOrganizationalStructureSchema = createInsertSchema(organizationalStructure).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertOrganizationalStructure = z.infer<typeof insertOrganizationalStructureSchema>;
export type OrganizationalStructure = typeof organizationalStructure.$inferSelect;

// Approval Workflows - Definizione workflow di approvazione per ogni servizio
export const approvalWorkflows = w3suiteSchema.table("approval_workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Service identification
  serviceName: varchar("service_name", { length: 50 }).notNull(), // 'hr', 'finance', 'operations', 'it', 'sales'
  workflowType: varchar("workflow_type", { length: 100 }).notNull(), // 'leave_request', 'purchase_order', 'discount_approval'
  
  // Workflow rules (JSONB for flexibility)
  rules: jsonb("rules").notNull(), /* {
    levels: [
      { condition: "amount <= 1000", approvers: ["direct_manager"], slaHours: 24 },
      { condition: "amount > 1000", approvers: ["direct_manager", "department_head"], slaHours: 48 }
    ],
    escalation: { afterHours: 24, escalateTo: "next_level" },
    autoApprove: { condition: "amount < 100" }
  } */
  
  // Configuration
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(100), // Higher priority workflows are evaluated first
  
  // Metadata
  description: text("description"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("approval_workflows_service_idx").on(table.serviceName, table.workflowType),
  index("approval_workflows_tenant_active_idx").on(table.tenantId, table.isActive),
  uniqueIndex("approval_workflows_unique").on(table.tenantId, table.serviceName, table.workflowType),
]);

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;



// ==================== UNIFIED REQUESTS SYSTEM ====================
// ✅ ENTERPRISE CENTRALIZZAZIONE: Tabella unica per tutte le richieste aziendali

// Department Enum - Categorizzazione per dipartimenti aziendali
// ✅ SOURCE OF TRUTH: public.department (7 values including marketing)
export const departmentEnum = pgEnum('department', [
  'hr',           // Human Resources (ferie, permessi, congedi)
  'operations',   // Operazioni (manutenzione, logistics, inventory)
  'support',      // Support IT (accessi, hardware, software)
  'finance',      // Finanza (expenses, budgets, payments)
  'crm',          // Customer Relations (complaints, escalations)
  'sales',        // Vendite (discount approvals, contract changes)
  'marketing'     // Marketing (campaigns, content, branding)
]);

// Universal Request Status - Stati unificati per tutte le categorie
export const requestStatusEnum = pgEnum('request_status', [
  'draft',        // Bozza - non ancora inviata
  'pending',      // In attesa di approvazione
  'approved',     // Approvata
  'rejected',     // Rifiutata
  'cancelled'     // Annullata dal richiedente
]);

// Universal Requests - Tabella centralizzata per TUTTE le richieste aziendali
export const universalRequests = w3suiteSchema.table("universal_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // ✅ SICUREZZA MULTI-LIVELLO: Tenant + User + Store + Legal Entity
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  legalEntityId: uuid("legal_entity_id").references(() => legalEntities.id),
  storeId: uuid("store_id").references(() => stores.id),
  onBehalfOf: varchar("on_behalf_of").references(() => users.id), // Richieste delegate
  
  // ✅ CATEGORIZZAZIONE ENTERPRISE: Department + Category + Type
  department: departmentEnum("department").notNull(), // hr, finance, support, crm, sales, operations
  category: varchar("category", { length: 100 }).notNull(), // leave, expense, access, legal, training, etc.
  type: varchar("type", { length: 100 }), // vacation, travel_expense, vpn_access, etc.
  
  // ✅ CONTENUTO RICHIESTA
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  requestData: jsonb("request_data").notNull(), // Dati specifici per categoria
  
  // ✅ WORKFLOW E APPROVAZIONE
  status: requestStatusEnum("status").notNull().default("draft"),
  currentApproverId: varchar("current_approver_id").references(() => users.id),
  approvalChain: jsonb("approval_chain").default([]), // Storia delle approvazioni
  workflowInstanceId: uuid("workflow_instance_id"), // Link al workflow engine
  
  // ✅ SLA E PRIORITÀ
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"), // Per richieste con date (ferie, congedi)
  endDate: timestamp("end_date"),
  submittedAt: timestamp("submitted_at"),
  completedAt: timestamp("completed_at"),
  
  // ✅ ALLEGATI E METADATI
  attachments: text("attachments").array().default([]),
  tags: text("tags").array().default([]),
  metadata: jsonb("metadata").default({}), // Metadati aggiuntivi
  notes: text("notes"),
  
  // ✅ AUDIT COMPLETO
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  // ✅ INDICI OTTIMIZZATI per performance enterprise
  index("universal_requests_tenant_department_idx").on(table.tenantId, table.department),
  index("universal_requests_tenant_status_idx").on(table.tenantId, table.status),
  index("universal_requests_requester_idx").on(table.requesterId),
  index("universal_requests_approver_idx").on(table.currentApproverId),
  index("universal_requests_store_idx").on(table.storeId),
  index("universal_requests_legal_entity_idx").on(table.legalEntityId),
  index("universal_requests_dates_idx").on(table.startDate, table.endDate),
  index("universal_requests_tenant_created_idx").on(table.tenantId, table.createdAt.desc()),
  index("universal_requests_workflow_idx").on(table.workflowInstanceId),
  index("universal_requests_department_category_type_idx").on(table.department, table.category, table.type),
]);

export const insertUniversalRequestSchema = createInsertSchema(universalRequests).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertUniversalRequest = z.infer<typeof insertUniversalRequestSchema>;
export type UniversalRequest = typeof universalRequests.$inferSelect;

// ✅ RELAZIONI ENTERPRISE per Universal Requests
export const universalRequestsRelations = relations(universalRequests, ({ one, many }) => ({
  tenant: one(tenants, { fields: [universalRequests.tenantId], references: [tenants.id] }),
  requester: one(users, { fields: [universalRequests.requesterId], references: [users.id] }),
  currentApprover: one(users, { fields: [universalRequests.currentApproverId], references: [users.id] }),
  onBehalfOfUser: one(users, { fields: [universalRequests.onBehalfOf], references: [users.id] }),
  legalEntity: one(legalEntities, { fields: [universalRequests.legalEntityId], references: [legalEntities.id] }),
  store: one(stores, { fields: [universalRequests.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [universalRequests.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [universalRequests.updatedBy], references: [users.id] }),
  impacts: many(hrRequestImpacts),
}));

// ==================== HR REQUEST IMPACTS ====================
// Stores impact analysis when HR requests (leave, sick, shift change) are evaluated
// Used to show HR managers what shifts/coverage will be affected before approval
export const hrRequestImpacts = w3suiteSchema.table("hr_request_impacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  requestId: uuid("request_id").notNull().references(() => universalRequests.id, { onDelete: 'cascade' }),
  
  // Impact analysis results
  affectedShiftIds: text("affected_shift_ids").array().default([]), // Shift IDs that will be overridden
  affectedAssignmentIds: text("affected_assignment_ids").array().default([]), // Assignment IDs that will be overridden
  
  // Coverage gaps created by approval
  coverageGaps: jsonb("coverage_gaps").default([]), 
  // [{ storeId, storeName, date, startTime, endTime, hoursUncovered, currentStaff, requiredStaff }]
  
  // Overtime impact
  overtimeImpact: jsonb("overtime_impact").default([]),
  // [{ employeeId, employeeName, date, additionalHours, reason }]
  
  // Replacement suggestions
  replacementSuggestions: jsonb("replacement_suggestions").default([]),
  // [{ shiftId, suggestedEmployees: [{ id, name, availability, matchScore }] }]
  
  // Impact severity assessment
  impactSeverity: varchar("impact_severity", { length: 20 }).notNull().default("none"),
  // none, low, medium, high, critical
  
  impactSummary: text("impact_summary"), // Human-readable summary for HR display
  
  // Calculation metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  calculatedBy: varchar("calculated_by").references(() => users.id), // System or user who triggered calculation
  
  // Applied status - tracks if impacts were actually applied
  appliedAt: timestamp("applied_at"), // When request was approved and impacts applied
  appliedBy: varchar("applied_by").references(() => users.id),
  overridesCreated: integer("overrides_created").default(0), // Number of shift overrides created
  notificationsSent: integer("notifications_sent").default(0), // Number of notifications sent
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hr_request_impacts_tenant_idx").on(table.tenantId),
  index("hr_request_impacts_request_idx").on(table.requestId),
  index("hr_request_impacts_severity_idx").on(table.impactSeverity),
  index("hr_request_impacts_calculated_idx").on(table.calculatedAt),
  index("hr_request_impacts_applied_idx").on(table.appliedAt),
]);

export const insertHrRequestImpactSchema = createInsertSchema(hrRequestImpacts).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  calculatedAt: true
});
export type InsertHrRequestImpact = z.infer<typeof insertHrRequestImpactSchema>;
export type HrRequestImpact = typeof hrRequestImpacts.$inferSelect;

// Relations for HR Request Impacts
export const hrRequestImpactsRelations = relations(hrRequestImpacts, ({ one }) => ({
  tenant: one(tenants, { fields: [hrRequestImpacts.tenantId], references: [tenants.id] }),
  request: one(universalRequests, { fields: [hrRequestImpacts.requestId], references: [universalRequests.id] }),
  calculatedByUser: one(users, { fields: [hrRequestImpacts.calculatedBy], references: [users.id] }),
  appliedByUser: one(users, { fields: [hrRequestImpacts.appliedBy], references: [users.id] }),
}));

// Service Permissions - Definizione permessi per ogni servizio
export const servicePermissions = w3suiteSchema.table("service_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Service and permission
  serviceName: varchar("service_name", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  
  // Permission scope
  roleId: uuid("role_id").references(() => roles.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  
  // Conditions
  conditions: jsonb("conditions").default({}), // { maxAmount: 1000, maxDays: 10, etc }
  
  // Validity
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("service_permissions_service_idx").on(table.serviceName),
  index("service_permissions_role_idx").on(table.roleId),
  index("service_permissions_user_idx").on(table.userId),
  uniqueIndex("service_permissions_unique").on(
    table.tenantId, 
    table.serviceName, 
    table.resource, 
    table.action, 
    table.roleId,
    table.userId
  ),
]);

export const insertServicePermissionSchema = createInsertSchema(servicePermissions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertServicePermission = z.infer<typeof insertServicePermissionSchema>;
export type ServicePermission = typeof servicePermissions.$inferSelect;

// ==================== WORKFLOW SYSTEM TABLES ====================

// Workflow Actions - Libreria azioni per categoria (HR, Finance, Operations, etc.)
export const workflowActions = w3suiteSchema.table("workflow_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Category and Action identification
  category: varchar("category", { length: 50 }).notNull(), // 'hr', 'finance', 'operations', 'crm', 'support', 'sales'
  actionId: varchar("action_id", { length: 100 }).notNull(), // 'approve_vacation', 'reject_vacation', 'approve_expense'
  name: varchar("name", { length: 200 }).notNull(), // 'Approva Ferie', 'Rifiuta Ferie'
  description: text("description"),
  
  // RBAC Integration
  requiredPermission: varchar("required_permission", { length: 200 }).notNull(), // 'hr.approve_vacation_max_5_days'
  constraints: jsonb("constraints").default({}), // { maxAmount: 1000, maxDays: 5, excludedPeriods: [] }
  
  // Action Configuration
  actionType: varchar("action_type", { length: 50 }).notNull().default("approval"), // 'approval', 'rejection', 'delegation', 'notification'
  priority: integer("priority").default(100),
  isActive: boolean("is_active").default(true),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("workflow_actions_category_idx").on(table.category),
  index("workflow_actions_permission_idx").on(table.requiredPermission),
  uniqueIndex("workflow_actions_unique").on(table.tenantId, table.category, table.actionId),
]);

// Workflow Triggers - Libreria trigger per automazione
export const workflowTriggers = w3suiteSchema.table("workflow_triggers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Trigger identification
  category: varchar("category", { length: 50 }).notNull(), // 'hr', 'finance', etc.
  triggerId: varchar("trigger_id", { length: 100 }).notNull(), // 'notify_team', 'update_calendar', 'start_timer'
  name: varchar("name", { length: 200 }).notNull(), // 'Notifica Team', 'Aggiorna Calendario'
  description: text("description"),
  
  // Trigger Configuration
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 'notification', 'timer', 'webhook', 'conditional', 'integration'
  config: jsonb("config").notNull(), // Configurazione specifica per tipo trigger
  
  // Execution settings
  isAsync: boolean("is_async").default(false), // Esecuzione asincrona
  retryPolicy: jsonb("retry_policy").default({}), // { maxRetries: 3, backoff: 'exponential' }
  timeout: integer("timeout").default(30000), // Timeout in milliseconds
  
  // Status
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(100),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("workflow_triggers_category_idx").on(table.category),
  index("workflow_triggers_type_idx").on(table.triggerType),
  uniqueIndex("workflow_triggers_unique").on(table.tenantId, table.category, table.triggerId),
]);

// Workflow Templates - Definizione visual workflow (reusable templates)
export const workflowTemplates = w3suiteSchema.table("workflow_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id), // NULL per global templates
  
  // Template identification
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // 'hr', 'finance', etc.
  templateType: varchar("template_type", { length: 100 }).notNull(), // 'vacation_approval', 'expense_approval'
  
  // Visual Workflow Definition (React Flow format)
  nodes: jsonb("nodes").notNull(), // Array of workflow nodes with positions
  edges: jsonb("edges").notNull(), // Array of connections between nodes
  viewport: jsonb("viewport").default({ x: 0, y: 0, zoom: 1 }), // Canvas viewport
  
  // 🌐 BRAND INTERFACE - Global Template Management
  isGlobal: boolean("is_global").default(false).notNull(), // Template visibile a tutti i tenant
  isSystem: boolean("is_system").default(false).notNull(), // Template di sistema (non modificabile)
  isDeletable: boolean("is_deletable").default(true).notNull(), // Può essere cancellato
  isCustomizable: boolean("is_customizable").default(true).notNull(), // Tenant può duplicare/customizzare
  createdByBrand: boolean("created_by_brand").default(false).notNull(), // Creato da Brand Admin
  globalVersionId: uuid("global_version_id"), // ID template globale originale (per tenant customizzati)
  
  // 🔒 BRAND WORKFLOW LOCK SYSTEM - Track brand-deployed workflows
  source: workflowSourceEnum("source").default('tenant'), // 'brand' | 'tenant' - Origin of workflow
  // FK to brand_interface.brand_workflows (nullable - only for brand-sourced workflows)
  // onDelete: 'set null' - If brand deletes template, tenant keeps copy but loses brand reference
  brandWorkflowId: uuid("brand_workflow_id").references(() => brandWorkflows.id, { onDelete: 'set null' }), 
  lockedAt: timestamp("locked_at"), // When workflow was locked (brand workflows are locked from structural editing)
  
  // Template settings
  isPublic: boolean("is_public").default(false), // Can be shared across tenants
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  tags: text("tags").array().default([]),
  
  // Action Tags - Define what this workflow DOES (e.g., 'richiesta_ferie', 'rimborso_spese')
  // Predefined tags per department help Coverage Dashboard show which actions are covered
  actionTags: text("action_tags").array().default([]), // ['richiesta_ferie', 'richiesta_permessi']
  customAction: text("custom_action"), // Free text for non-standard actions
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("workflow_templates_category_idx").on(table.category),
  index("workflow_templates_type_idx").on(table.templateType),
  index("workflow_templates_tenant_active_idx").on(table.tenantId, table.isActive),
  index("workflow_templates_global_idx").on(table.isGlobal), // Index per query global templates
  index("workflow_templates_system_idx").on(table.isSystem), // Index per system templates
  index("workflow_templates_global_version_idx").on(table.globalVersionId), // Index per customized templates
  uniqueIndex("workflow_templates_name_unique").on(table.tenantId, table.name),
]);

// Workflow Steps - Singoli step all'interno di un workflow template
export const workflowSteps = w3suiteSchema.table("workflow_steps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  
  // Step identification
  nodeId: varchar("node_id", { length: 100 }).notNull(), // ID del nodo nel visual editor
  stepType: varchar("step_type", { length: 50 }).notNull(), // 'action', 'condition', 'timer', 'trigger'
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Step configuration
  actionId: uuid("action_id").references(() => workflowActions.id), // Per step di tipo 'action'
  triggerId: uuid("trigger_id").references(() => workflowTriggers.id), // Per step di tipo 'trigger'
  conditions: jsonb("conditions").default({}), // Condizioni per esecuzione
  config: jsonb("config").default({}), // Configurazione specifica step
  
  // Approval logic
  approverLogic: varchar("approver_logic", { length: 100 }), // 'team_supervisor', 'role:HR', 'department:Finance'
  escalationTimeout: integer("escalation_timeout"), // Timeout escalation in hours
  escalationTarget: varchar("escalation_target", { length: 100 }), // Target escalation
  
  // Step order and flow
  order: integer("order").notNull(), // Ordine esecuzione
  isOptional: boolean("is_optional").default(false),
  canSkip: boolean("can_skip").default(false),
  
  // Visual position (React Flow)
  position: jsonb("position").default({ x: 0, y: 0 }),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("workflow_steps_template_idx").on(table.templateId),
  index("workflow_steps_order_idx").on(table.templateId, table.order),
  uniqueIndex("workflow_steps_node_unique").on(table.templateId, table.nodeId),
]);

// 🔒 Tenant Workflow Node Overrides - Allow tenants to customize specific node configs in brand workflows
// While brand workflows are locked (cannot modify structure), tenants can override specific config fields
// like team assignments, email sender, etc. These overrides are merged at execution time.
export const tenantWorkflowNodeOverrides = w3suiteSchema.table("tenant_workflow_node_overrides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Workflow and node reference
  workflowId: uuid("workflow_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  nodeId: varchar("node_id", { length: 100 }).notNull(), // Node ID from workflow DSL
  
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
  overrideConfig: jsonb("override_config").notNull(), // JSONB with executor-specific allowed fields
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").notNull().references(() => users.id),
}, (table) => [
  uniqueIndex("tenant_workflow_node_overrides_unique").on(table.tenantId, table.workflowId, table.nodeId),
  index("tenant_workflow_node_overrides_workflow_idx").on(table.workflowId),
  index("tenant_workflow_node_overrides_tenant_idx").on(table.tenantId),
]);

export const insertTenantWorkflowNodeOverrideSchema = createInsertSchema(tenantWorkflowNodeOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  tenantId: z.string().uuid(),
  workflowId: z.string().uuid(),
  nodeId: z.string().min(1).max(100),
  overrideConfig: z.record(z.any()), // Validated at API level based on executor type
  updatedBy: z.string().min(1),
});

export type InsertTenantWorkflowNodeOverride = z.infer<typeof insertTenantWorkflowNodeOverrideSchema>;
export type TenantWorkflowNodeOverride = typeof tenantWorkflowNodeOverrides.$inferSelect;

// Teams - Team ibridi con utenti e ruoli, supervisor RBAC-validated
export const teams = w3suiteSchema.table("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Team identification
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  teamType: varchar("team_type", { length: 50 }).default("functional"), // 'functional', 'project', 'department', 'crm', 'sales'
  
  // Hybrid membership (users + roles)
  userMembers: text("user_members").array().default([]), // Array of user IDs
  roleMembers: text("role_members").array().default([]), // Array of role IDs (tutti gli utenti con questi ruoli)
  
  // Supervisor configuration (RBAC validated) - Hybrid User/Role support
  primarySupervisorUser: varchar("primary_supervisor_user").references(() => users.id, { onDelete: 'set null' }), // Primary supervisor (user-based)
  primarySupervisorRole: uuid("primary_supervisor_role").references(() => roles.id, { onDelete: 'set null' }), // Primary supervisor (role-based)
  secondarySupervisorUser: varchar("secondary_supervisor_user").references(() => users.id, { onDelete: 'set null' }), // Secondary supervisor (single user, optional)
  secondarySupervisorRoles: uuid("secondary_supervisor_roles").array().default([]), // Secondary supervisors (role-based, UUID array - kept for compatibility)
  requiredSupervisorPermission: varchar("required_supervisor_permission", { length: 200 }).default("team.manage"),
  
  // Team scope and permissions
  scope: jsonb("scope").default({}), // Scope ereditato o personalizzato
  permissions: jsonb("permissions").default({}), // Permessi team-specific
  
  // 🎯 DEPARTMENT ASSIGNMENT: Team può gestire multipli dipartimenti
  assignedDepartments: text("assigned_departments").array().default([]), // Array of department enum values ['hr', 'finance', 'sales']
  
  // Configuration
  isActive: boolean("is_active").default(true),
  autoAssignWorkflows: boolean("auto_assign_workflows").default(true), // Auto-assign workflow ai membri
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("teams_tenant_active_idx").on(table.tenantId, table.isActive),
  index("teams_primary_supervisor_user_idx").on(table.primarySupervisorUser),
  index("teams_primary_supervisor_role_idx").on(table.primarySupervisorRole),
  uniqueIndex("teams_name_unique").on(table.tenantId, table.name),
]);

// Team Workflow Assignments - Mapping N:M tra team e workflow (con condizioni)
export const teamWorkflowAssignments = w3suiteSchema.table("team_workflow_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  
  // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
  forDepartment: departmentEnum("for_department").notNull(), // Quale dipartimento usa questo workflow
  
  // Assignment configuration
  autoAssign: boolean("auto_assign").default(true), // Auto-assign a richieste membri team
  priority: integer("priority").default(100), // Se multipli workflow per team, quale usare primo
  
  // Conditions for workflow usage
  conditions: jsonb("conditions").default({}), // { requestType: 'vacation', amountRange: [0, 1000], customRules: {} }
  
  // Overrides specifici per questo team
  overrides: jsonb("overrides").default({}), // { skipSteps: [], alternateApprovers: {}, customSLA: 24 }
  
  // Status and validity
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("team_workflow_assignments_team_idx").on(table.teamId),
  index("team_workflow_assignments_template_idx").on(table.templateId),
  index("team_workflow_assignments_active_idx").on(table.isActive),
  // 🎯 UNIQUE PER DIPARTIMENTO: Stesso team può avere stesso workflow per dipartimenti diversi
  uniqueIndex("team_workflow_assignments_unique").on(table.teamId, table.templateId, table.forDepartment),
]);

// User Workflow Assignments - Mapping N:M tra utenti e workflow (con condizioni)
export const userWorkflowAssignments = w3suiteSchema.table("user_workflow_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  
  // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
  forDepartment: departmentEnum("for_department").notNull(), // Quale dipartimento usa questo workflow
  
  // Assignment configuration
  autoAssign: boolean("auto_assign").default(true), // Auto-assign a richieste utente
  priority: integer("priority").default(100), // Se multipli workflow per utente, quale usare primo
  
  // Conditions for workflow usage
  conditions: jsonb("conditions").default({}), // { requestType: 'vacation', amountRange: [0, 1000], customRules: {} }
  
  // Overrides specifici per questo utente
  overrides: jsonb("overrides").default({}), // { skipSteps: [], alternateApprovers: {}, customSLA: 24 }
  
  // Status and validity
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("user_workflow_assignments_tenant_idx").on(table.tenantId),
  index("user_workflow_assignments_user_idx").on(table.userId),
  index("user_workflow_assignments_template_idx").on(table.templateId),
  index("user_workflow_assignments_active_idx").on(table.isActive),
  // 🎯 UNIQUE PER DIPARTIMENTO: Stesso utente può avere stesso workflow per dipartimenti diversi
  uniqueIndex("user_workflow_assignments_unique").on(table.userId, table.templateId, table.forDepartment),
]);

// Workflow Instances - Istanze runtime di workflow in esecuzione
export const workflowInstances = w3suiteSchema.table("workflow_instances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id),
  // ✅ FIXED: Match existing database structure - use reference_id instead of request_id
  referenceId: varchar("reference_id"), // Collegato a richiesta (existing column)
  
  // 🎯 NEW: Propagate category from template for department isolation
  category: varchar("category", { length: 50 }).notNull(), // Inherited from workflowTemplates.category
  
  // ✅ FIXED: Match existing database columns exactly
  instanceType: varchar("instance_type").notNull(), // existing column
  instanceName: varchar("instance_name").notNull(), // existing column
  
  // ✅ FIXED: State machine - match existing structure  
  currentStatus: varchar("current_status", { length: 50 }).default("pending"), // existing column
  currentStepId: uuid("current_step_id"), // existing column
  currentNodeId: varchar("current_node_id"), // existing column
  currentAssignee: varchar("current_assignee"), // existing column
  assignedTeamId: uuid("assigned_team_id"), // existing column
  assignedUsers: text("assigned_users").array().default(sql`'{}'::text[]`), // existing column
  escalationLevel: integer("escalation_level").default(0), // existing column
  
  // ✅ FIXED: Match existing timestamp columns
  startedAt: timestamp("started_at").default(sql`now()`), // existing column  
  completedAt: timestamp("completed_at"), // existing column
  lastActivityAt: timestamp("last_activity_at").default(sql`now()`), // existing column
  
  // ✅ FIXED: Match existing jsonb columns
  context: jsonb("context").default(sql`'{}'::jsonb`), // existing column
  workflowData: jsonb("workflow_data").default(sql`'{}'::jsonb`), // existing column
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // existing column
  
  // ✅ FIXED: Match existing metadata columns
  createdBy: varchar("created_by"), // existing column
  updatedBy: varchar("updated_by"), // existing column
  createdAt: timestamp("created_at").default(sql`now()`), // existing column
  updatedAt: timestamp("updated_at").default(sql`now()`), // existing column
}); // ✅ TEMPORARILY REMOVED ALL INDEXES TO FIX STARTUP ERROR

// Workflow Executions - Log dettagliato esecuzioni step e trigger
export const workflowExecutions = w3suiteSchema.table("workflow_executions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  instanceId: uuid("instance_id").notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  stepId: uuid("step_id").references(() => workflowSteps.id),
  
  // Execution details
  executionType: varchar("execution_type", { length: 50 }).notNull(), // 'action', 'trigger', 'condition', 'timer'
  executorId: varchar("executor_id").references(() => users.id), // Chi ha eseguito (per azioni manuali)
  automatedBy: varchar("automated_by", { length: 100 }), // Sistema che ha eseguito automaticamente
  
  // Execution data
  inputData: jsonb("input_data").default({}),
  outputData: jsonb("output_data").default({}),
  
  // Results and status
  status: varchar("status", { length: 50 }).notNull(), // 'success', 'failed', 'pending', 'skipped', 'timeout'
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Timing
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Durata in millisecondi
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("workflow_executions_instance_idx").on(table.instanceId),
  index("workflow_executions_step_idx").on(table.stepId),
  index("workflow_executions_executor_idx").on(table.executorId),
  index("workflow_executions_status_idx").on(table.status),
  index("workflow_executions_started_idx").on(table.startedAt),
]);

// 🔄 WORKFLOW STEP EXECUTIONS - Idempotency & Retry Tracking (ASYNC EXECUTION ENGINE)
export const workflowStepExecutions = w3suiteSchema.table("workflow_step_executions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Step execution identification
  instanceId: uuid("instance_id").notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  stepId: varchar("step_id", { length: 100 }).notNull(), // Node ID from ReactFlow
  stepName: varchar("step_name", { length: 200 }), // Human-readable step name
  
  // 🔑 IDEMPOTENCY KEY - Prevents duplicate executions
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(), // SHA256(instanceId + stepId + attemptNumber)
  attemptNumber: integer("attempt_number").default(1).notNull(), // Retry attempt counter
  
  // Execution status
  status: varchar("status", { length: 50 }).default('pending').notNull(), // 'pending', 'running', 'completed', 'failed', 'compensated'
  
  // Execution data
  inputData: jsonb("input_data").default({}), // Input parameters for step
  outputData: jsonb("output_data").default({}), // Result/output from step
  errorDetails: jsonb("error_details").default({}), // { message, stack, code, recoverable }
  
  // Timing & Performance
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"), // Execution duration in milliseconds
  
  // Retry & Compensation Logic
  retryCount: integer("retry_count").default(0), // Number of retries performed
  maxRetries: integer("max_retries").default(3), // Max retry attempts
  nextRetryAt: timestamp("next_retry_at"), // Scheduled next retry
  compensationExecuted: boolean("compensation_executed").default(false), // Rollback performed
  compensationData: jsonb("compensation_data").default({}), // Compensation action details
  
  // Metadata
  metadata: jsonb("metadata").default({}), // Additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_step_executions_instance_idx").on(table.instanceId),
  index("workflow_step_executions_step_idx").on(table.stepId),
  index("workflow_step_executions_status_idx").on(table.status),
  index("workflow_step_executions_idempotency_idx").on(table.idempotencyKey),
  index("workflow_step_executions_retry_idx").on(table.nextRetryAt),
  uniqueIndex("workflow_step_executions_unique").on(table.instanceId, table.stepId, table.attemptNumber),
]);

// ==================== WORKFLOW DURABILITY & EVENT SOURCING ====================

// Workflow State Events - Event sourcing for durable workflow execution
export const workflowStateEvents = w3suiteSchema.table("workflow_state_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Event identification
  instanceId: uuid("instance_id").notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type", { length: 100 }).notNull(), // 'state_changed', 'step_completed', 'step_failed', 'workflow_paused', 'workflow_resumed'
  eventSequence: integer("event_sequence").notNull(), // Ordered sequence for replay
  
  // State snapshot
  previousState: varchar("previous_state", { length: 50 }), // Previous workflow status
  newState: varchar("new_state", { length: 50 }).notNull(), // New workflow status
  
  // Event data
  stepId: varchar("step_id", { length: 100 }), // Related step if applicable
  eventData: jsonb("event_data").default({}), // Complete event payload
  metadata: jsonb("metadata").default({}), // Additional context
  
  // Causation tracking
  causedBy: varchar("caused_by", { length: 50 }), // 'user', 'system', 'timer', 'webhook'
  userId: varchar("user_id").references(() => users.id),
  
  // Timestamp
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  
  // Recovery tracking
  isProcessed: boolean("is_processed").default(true), // False for pending replay
  processedAt: timestamp("processed_at").defaultNow(),
}, (table) => [
  index("workflow_state_events_instance_idx").on(table.instanceId),
  index("workflow_state_events_sequence_idx").on(table.instanceId, table.eventSequence),
  index("workflow_state_events_type_idx").on(table.eventType),
  index("workflow_state_events_occurred_idx").on(table.occurredAt),
  uniqueIndex("workflow_state_events_unique").on(table.instanceId, table.eventSequence),
]);

// Workflow State Snapshots - Periodic checkpoints for fast recovery
export const workflowStateSnapshots = w3suiteSchema.table("workflow_state_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Snapshot identification
  instanceId: uuid("instance_id").notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  snapshotSequence: integer("snapshot_sequence").notNull(), // Incrementing snapshot number
  eventSequenceAt: integer("event_sequence_at").notNull(), // Last event sequence included in snapshot
  
  // Complete state snapshot
  workflowState: jsonb("workflow_state").notNull(), // Full workflow state at this point
  executionContext: jsonb("execution_context").default({}), // Runtime context variables
  completedSteps: text("completed_steps").array().default([]), // Array of completed step IDs
  pendingSteps: text("pending_steps").array().default([]), // Array of pending step IDs
  
  // Snapshot metadata
  currentStatus: varchar("current_status", { length: 50 }).notNull(),
  currentStepId: varchar("current_step_id", { length: 100 }),
  
  // Performance tracking
  snapshotSizeBytes: integer("snapshot_size_bytes"), // Size for cleanup decisions
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Auto-cleanup old snapshots
}, (table) => [
  index("workflow_state_snapshots_instance_idx").on(table.instanceId),
  index("workflow_state_snapshots_sequence_idx").on(table.instanceId, table.snapshotSequence),
  index("workflow_state_snapshots_created_idx").on(table.createdAt),
  uniqueIndex("workflow_state_snapshots_unique").on(table.instanceId, table.snapshotSequence),
]);

// ==================== WEBHOOK SYSTEM TABLES ====================

// Webhook Events - Centralized webhook event log with audit trail
export const webhookEvents = w3suiteSchema.table("webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Event identification
  eventId: varchar("event_id", { length: 255 }).notNull(), // Provider's event ID (for deduplication)
  eventType: varchar("event_type", { length: 100 }).notNull(), // 'payment.succeeded', 'sms.delivered', etc.
  source: varchar("source", { length: 100 }).notNull(), // 'stripe', 'twilio', 'github', 'custom'
  
  // Event data
  payload: jsonb("payload").notNull(), // Full webhook payload
  headers: jsonb("headers").default({}), // HTTP headers from webhook request
  signature: text("signature"), // Webhook signature for validation
  signatureValid: boolean("signature_valid"), // Validation result
  
  // Processing status
  status: varchar("status", { length: 50 }).default('pending').notNull(), // 'pending', 'processing', 'completed', 'failed', 'skipped'
  processingError: text("processing_error"), // Error message if failed
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  
  // Workflow trigger mapping
  workflowTriggerId: uuid("workflow_trigger_id").references(() => workflowTriggers.id), // Matched workflow trigger
  workflowInstanceId: uuid("workflow_instance_id").references(() => workflowInstances.id), // Created workflow instance
  
  // Timing
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("webhook_events_tenant_idx").on(table.tenantId),
  index("webhook_events_event_id_idx").on(table.eventId),
  index("webhook_events_event_type_idx").on(table.eventType),
  index("webhook_events_source_idx").on(table.source),
  index("webhook_events_status_idx").on(table.status),
  index("webhook_events_received_idx").on(table.receivedAt),
  index("webhook_events_next_retry_idx").on(table.nextRetryAt),
  uniqueIndex("webhook_events_unique").on(table.tenantId, table.source, table.eventId), // Prevent duplicates
]);

// Webhook Signatures - Provider signature configuration per tenant
export const webhookSignatures = w3suiteSchema.table("webhook_signatures", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Provider identification
  provider: varchar("provider", { length: 100 }).notNull(), // 'stripe', 'twilio', 'github', 'custom'
  providerName: varchar("provider_name", { length: 200 }).notNull(), // Display name
  description: text("description"),
  
  // Signature configuration
  signingSecret: text("signing_secret").notNull(), // Encrypted webhook secret
  validationAlgorithm: varchar("validation_algorithm", { length: 50 }).default('hmac-sha256').notNull(), // 'hmac-sha256', 'hmac-sha512', 'rsa'
  signatureHeader: varchar("signature_header", { length: 100 }).default('x-webhook-signature'), // Header containing signature
  timestampHeader: varchar("timestamp_header", { length: 100 }), // Header for timestamp (replay protection)
  
  // Validation settings
  toleranceWindowSeconds: integer("tolerance_window_seconds").default(300), // 5 min replay protection
  requireTimestamp: boolean("require_timestamp").default(false),
  
  // RBAC Integration
  requiredPermission: varchar("required_permission", { length: 200 }).default('webhooks.receive.*'), // Permission to receive webhooks
  allowedEventTypes: text("allowed_event_types").array().default([]), // Whitelist of event types (empty = all)
  
  // Status
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("webhook_signatures_tenant_idx").on(table.tenantId),
  index("webhook_signatures_provider_idx").on(table.provider),
  index("webhook_signatures_active_idx").on(table.isActive),
  uniqueIndex("webhook_signatures_unique").on(table.tenantId, table.provider),
]);

// ==================== TASK MANAGEMENT SYSTEM TABLES ====================

// Tasks - Core task entity
export const tasks = w3suiteSchema.table("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Basic Info
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default('todo').notNull(),
  priority: taskPriorityEnum("priority").default('medium').notNull(),
  urgency: taskUrgencyEnum("urgency").default('medium').notNull(),
  
  // Ownership & Visibility
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  department: departmentEnum("department"),
  
  // Dates
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
  
  // Progress & Tracking
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours"),
  completionPercentage: integer("completion_percentage").default(0),
  
  // Categorization
  tags: text("tags").array().default([]),
  customFields: jsonb("custom_fields").default({}),
  
  // Workflow Integration (OPTIONAL)
  linkedWorkflowInstanceId: uuid("linked_workflow_instance_id").references(() => workflowInstances.id),
  linkedWorkflowTeamId: uuid("linked_workflow_team_id").references(() => teams.id),
  triggeredByWorkflowStepId: uuid("triggered_by_workflow_step_id"),
  
  // Recurrence
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: jsonb("recurrence_rule"),
  parentRecurringTaskId: uuid("parent_recurring_task_id"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
}, (table) => [
  index("tasks_tenant_idx").on(table.tenantId),
  index("tasks_creator_idx").on(table.tenantId, table.creatorId),
  index("tasks_status_idx").on(table.tenantId, table.status),
  index("tasks_department_idx").on(table.tenantId, table.department),
  index("tasks_due_date_idx").on(table.tenantId, table.dueDate),
  index("tasks_workflow_idx").on(table.linkedWorkflowInstanceId),
]);

// Task Assignments - Assignees & Watchers (many-to-many)
export const taskAssignments = w3suiteSchema.table("task_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: taskAssignmentRoleEnum("role").notNull(),
  
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  
  // Notification preferences
  notifyOnUpdate: boolean("notify_on_update").default(true),
  notifyOnComment: boolean("notify_on_comment").default(true),
}, (table) => [
  uniqueIndex("task_assignments_unique").on(table.taskId, table.userId, table.role),
  index("task_assignments_user_idx").on(table.userId, table.role),
  index("task_assignments_task_idx").on(table.taskId),
  index("task_assignments_tenant_idx").on(table.tenantId),
]);

// Task Checklist Items - Subtasks with granular assignment
export const taskChecklistItems = w3suiteSchema.table("task_checklist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  position: integer("position").notNull(),
  
  // Granular Assignment (NULL = all task assignees)
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  
  // Dates
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  
  // Status
  isCompleted: boolean("is_completed").default(false),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
}, (table) => [
  index("checklist_task_idx").on(table.taskId, table.position),
  index("checklist_assigned_idx").on(table.assignedToUserId),
  index("checklist_due_date_idx").on(table.dueDate),
]);

// Task Comments - Discussion threads
export const taskComments = w3suiteSchema.table("task_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  
  // Threading (optional)
  parentCommentId: uuid("parent_comment_id"),
  
  // Mentions
  mentionedUserIds: varchar("mentioned_user_ids").array().default([]),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isEdited: boolean("is_edited").default(false),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("comments_task_idx").on(table.taskId, table.createdAt),
  index("comments_user_idx").on(table.userId),
]);

// Task Time Logs - Time tracking
export const taskTimeLogs = w3suiteSchema.table("task_time_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  userId: varchar("user_id").notNull().references(() => users.id),
  checklistItemId: uuid("checklist_item_id").references(() => taskChecklistItems.id, { onDelete: 'set null' }),
  
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  
  description: text("description"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("time_logs_task_idx").on(table.taskId, table.userId),
  index("time_logs_user_idx").on(table.userId, table.startedAt),
  index("time_logs_running_idx").on(table.userId, table.endedAt),
]);

// Task Dependencies - Task relationships
export const taskDependencies = w3suiteSchema.table("task_dependencies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  dependentTaskId: uuid("dependent_task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  dependencyType: taskDependencyTypeEnum("dependency_type").default('blocks').notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
}, (table) => [
  uniqueIndex("task_dependencies_unique").on(table.taskId, table.dependentTaskId),
  index("task_dependencies_task_idx").on(table.taskId),
  index("task_dependencies_depends_idx").on(table.dependentTaskId),
]);

// Task Attachments - File uploads
export const taskAttachments = w3suiteSchema.table("task_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => [
  index("attachments_task_idx").on(table.taskId),
  index("attachments_user_idx").on(table.uploadedBy),
]);

// Task Templates - Quick create & recurring tasks
export const taskTemplates = w3suiteSchema.table("task_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  department: departmentEnum("department"),
  
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Template Configuration (JSON)
  templateData: jsonb("template_data").notNull(),
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // Recurrence
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: jsonb("recurrence_rule"),
  lastInstantiatedAt: timestamp("last_instantiated_at"),
  
  isActive: boolean("is_active").default(true),
}, (table) => [
  index("templates_tenant_idx").on(table.tenantId, table.isActive),
  index("templates_department_idx").on(table.department),
]);

// ==================== CHAT SYSTEM TABLES ====================

// Chat Channels - Team channels, DMs, task threads
export const chatChannels = w3suiteSchema.table("chat_channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  name: varchar("name", { length: 200 }),
  description: text("description"),
  channelType: chatChannelTypeEnum("channel_type").notNull(),
  visibility: chatVisibilityEnum("visibility").default('private').notNull(),
  
  // References
  teamId: uuid("team_id").references(() => teams.id),
  taskId: uuid("task_id").references(() => tasks.id),
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  isArchived: boolean("is_archived").default(false),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
}, (table) => [
  index("channels_tenant_idx").on(table.tenantId, table.channelType),
  index("channels_task_idx").on(table.taskId),
  index("channels_team_idx").on(table.teamId),
]);

// Chat Channel Members - Who can access channels
export const chatChannelMembers = w3suiteSchema.table("chat_channel_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: uuid("channel_id").notNull().references(() => chatChannels.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  role: chatMemberRoleEnum("role").default('member').notNull(),
  inviteStatus: chatInviteStatusEnum("invite_status").default('accepted').notNull(),
  
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at"),
  
  notificationPreference: chatNotificationPreferenceEnum("notification_preference").default('all').notNull(),
}, (table) => [
  uniqueIndex("channel_members_unique").on(table.channelId, table.userId),
  index("channel_members_user_idx").on(table.userId),
]);

// Chat Messages - Real-time messaging
export const chatMessages = w3suiteSchema.table("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: uuid("channel_id").notNull().references(() => chatChannels.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  
  // Threading
  parentMessageId: uuid("parent_message_id"),
  
  // Mentions & Reactions
  mentionedUserIds: varchar("mentioned_user_ids").array().default([]),
  reactions: jsonb("reactions").default({}),
  
  // Attachments
  attachments: jsonb("attachments").default([]),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isEdited: boolean("is_edited").default(false),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("messages_channel_idx").on(table.channelId, table.createdAt),
  index("messages_user_idx").on(table.userId),
  index("messages_parent_idx").on(table.parentMessageId),
]);

// Chat Typing Indicators - Real-time typing status
export const chatTypingIndicators = w3suiteSchema.table("chat_typing_indicators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: uuid("channel_id").notNull().references(() => chatChannels.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  startedAt: timestamp("started_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  uniqueIndex("typing_unique").on(table.channelId, table.userId),
  index("typing_expires_idx").on(table.expiresAt),
]);

// ==================== ACTIVITY FEED TABLES ====================

// Activity Feed Events - Business events stream
export const activityFeedEvents = w3suiteSchema.table("activity_feed_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  eventType: varchar("event_type", { length: 100 }).notNull(),
  category: activityFeedCategoryEnum("category").notNull(),
  
  // Actor
  actorUserId: varchar("actor_user_id").references(() => users.id),
  actorType: activityFeedActorTypeEnum("actor_type").default('user').notNull(),
  
  // Target Entity
  targetEntityType: varchar("target_entity_type", { length: 100 }),
  targetEntityId: uuid("target_entity_id"),
  
  // Content
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  
  // Data
  eventData: jsonb("event_data").default({}),
  
  // Visibility
  department: departmentEnum("department"),
  visibleToUserIds: varchar("visible_to_user_ids").array(),
  
  // Metadata
  priority: activityFeedPriorityEnum("priority").default('normal').notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("feed_tenant_idx").on(table.tenantId, table.createdAt),
  index("feed_category_idx").on(table.tenantId, table.category),
  index("feed_actor_idx").on(table.actorUserId),
  index("feed_target_idx").on(table.targetEntityType, table.targetEntityId),
  index("feed_department_idx").on(table.department),
]);

// Activity Feed Interactions - Likes, comments, shares
export const activityFeedInteractions = w3suiteSchema.table("activity_feed_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => activityFeedEvents.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  interactionType: activityFeedInteractionTypeEnum("interaction_type").notNull(),
  
  // For comments
  commentContent: text("comment_content"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("interactions_event_idx").on(table.eventId, table.interactionType),
  index("interactions_user_idx").on(table.userId),
  index("interactions_tenant_idx").on(table.tenantId),
  uniqueIndex("interactions_like_unique").on(table.eventId, table.userId, table.interactionType),
]);

// Insert Schemas and Types for new workflow tables
export const insertWorkflowActionSchema = createInsertSchema(workflowActions).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowAction = z.infer<typeof insertWorkflowActionSchema>;
export type WorkflowAction = typeof workflowActions.$inferSelect;

export const insertWorkflowTriggerSchema = createInsertSchema(workflowTriggers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowTrigger = z.infer<typeof insertWorkflowTriggerSchema>;
export type WorkflowTrigger = typeof workflowTriggers.$inferSelect;

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowStep = typeof workflowSteps.$inferSelect;

export const insertTeamSchema = createInsertSchema(teams).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const insertTeamWorkflowAssignmentSchema = createInsertSchema(teamWorkflowAssignments).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertTeamWorkflowAssignment = z.infer<typeof insertTeamWorkflowAssignmentSchema>;
export type TeamWorkflowAssignment = typeof teamWorkflowAssignments.$inferSelect;

export const insertUserWorkflowAssignmentSchema = createInsertSchema(userWorkflowAssignments).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertUserWorkflowAssignment = z.infer<typeof insertUserWorkflowAssignmentSchema>;
export type UserWorkflowAssignment = typeof userWorkflowAssignments.$inferSelect;

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;

export const insertWorkflowStepExecutionSchema = createInsertSchema(workflowStepExecutions).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  durationMs: true
});
export type InsertWorkflowStepExecution = z.infer<typeof insertWorkflowStepExecutionSchema>;
export type WorkflowStepExecution = typeof workflowStepExecutions.$inferSelect;

export const insertWorkflowStateEventSchema = createInsertSchema(workflowStateEvents).omit({ 
  id: true, 
  occurredAt: true,
  processedAt: true
});
export type InsertWorkflowStateEvent = z.infer<typeof insertWorkflowStateEventSchema>;
export type WorkflowStateEvent = typeof workflowStateEvents.$inferSelect;

export const insertWorkflowStateSnapshotSchema = createInsertSchema(workflowStateSnapshots).omit({ 
  id: true, 
  createdAt: true
});
export type InsertWorkflowStateSnapshot = z.infer<typeof insertWorkflowStateSnapshotSchema>;
export type WorkflowStateSnapshot = typeof workflowStateSnapshots.$inferSelect;

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

export const insertWebhookSignatureSchema = createInsertSchema(webhookSignatures).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWebhookSignature = z.infer<typeof insertWebhookSignatureSchema>;
export type WebhookSignature = typeof webhookSignatures.$inferSelect;

// ==================== NOTIFICATION SYSTEM RELATIONS ====================

// Notifications Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, { fields: [notifications.tenantId], references: [tenants.id] }),
  targetUser: one(users, { fields: [notifications.targetUserId], references: [users.id] }),
}));

// Notification Templates Relations
export const notificationTemplatesRelations = relations(notificationTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [notificationTemplates.tenantId], references: [tenants.id] }),
}));

// Notification Preferences Relations
export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  tenant: one(tenants, { fields: [notificationPreferences.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

// ==================== AI SYSTEM TABLES ====================

// AI Settings - Configuration per tenant with encrypted API key storage
export const aiSettings = w3suiteSchema.table("ai_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // AI Activation Control
  isActive: boolean("is_active").default(true).notNull(), // Master switch for AI features
  
  // Model Configuration
  openaiModel: aiModelEnum("openai_model").default('gpt-4-turbo').notNull(),
  openaiApiKey: text("openai_api_key"), // Encrypted storage for tenant-specific API key
  apiConnectionStatus: aiConnectionStatusEnum("api_connection_status").default('disconnected').notNull(),
  lastConnectionTest: timestamp("last_connection_test"),
  connectionTestResult: jsonb("connection_test_result"), // Store last test details
  
  // Features Configuration - Granular control via JSONB
  featuresEnabled: jsonb("features_enabled").default({
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
  maxTokensPerResponse: integer("max_tokens_per_response").default(1000).notNull(),
  responseCreativity: smallint("response_creativity").default(7), // 0-20 scale (mapped to 0-2.0 temperature)
  responseLengthLimit: integer("response_length_limit").default(4000).notNull(),
  
  // ➕ AI AGENT REGISTRY COMPATIBILITY (FASE 2 - Now active!)
  activeAgents: jsonb("active_agents").default('["tippy-sales"]').notNull(), // Lista agenti attivi per tenant
  agentOverrides: jsonb("agent_overrides").default('{}').notNull(), // Override specifici tenant per agenti
  
  // Usage & Limits
  monthlyTokenLimit: integer("monthly_token_limit").default(100000).notNull(),
  currentMonthUsage: integer("current_month_usage").default(0).notNull(),
  usageResetDate: date("usage_reset_date"),
  
  // Privacy & Data Retention
  privacyMode: aiPrivacyModeEnum("privacy_mode").default('standard').notNull(),
  chatRetentionDays: integer("chat_retention_days").default(30).notNull(),
  dataSharingOpenai: boolean("data_sharing_openai").default(false).notNull(),
  
  // Enterprise Features
  contextSettings: jsonb("context_settings").default({
    hr_context_enabled: true,
    finance_context_enabled: true,
    business_rules_integration: false,
    custom_instructions: ""
  }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("ai_settings_tenant_idx").on(table.tenantId),
}));

// AI Usage Logs - Tracking & Analytics per tenant
export const aiUsageLogs = w3suiteSchema.table("ai_usage_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'set null' }),
  
  // Request Details
  modelUsed: aiModelEnum("model_used").notNull(),
  featureType: aiFeatureTypeEnum("feature_type").notNull(),
  tokensInput: integer("tokens_input").default(0).notNull(),
  tokensOutput: integer("tokens_output").default(0).notNull(),
  tokensTotal: integer("tokens_total").default(0).notNull(),
  costUsd: integer("cost_usd").default(0).notNull(), // Stored as cents for precision
  
  // Performance & Success
  responseTimeMs: integer("response_time_ms"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("error_message"),
  
  // Request Context
  requestContext: jsonb("request_context").default({}),
  
  requestTimestamp: timestamp("request_timestamp").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("ai_usage_logs_tenant_idx").on(table.tenantId),
  userIndex: index("ai_usage_logs_user_idx").on(table.userId),
  timestampIndex: index("ai_usage_logs_timestamp_idx").on(table.requestTimestamp),
  featureIndex: index("ai_usage_logs_feature_idx").on(table.featureType),
  // Composite index for granular analytics queries
  analyticsIndex: index("ai_usage_logs_analytics_idx").on(table.tenantId, table.featureType, table.requestTimestamp),
  costIndex: index("ai_usage_logs_cost_idx").on(table.tenantId, table.costUsd, table.requestTimestamp),
}));

// AI Agent Tenant Settings - Per-tenant agent enablement control
export const aiAgentTenantSettings = w3suiteSchema.table("ai_agent_tenant_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Agent Identification
  agentId: text("agent_id").notNull(), // e.g., "tippy-sales", "workflow-assistant"
  
  // Enablement Control
  isEnabled: boolean("is_enabled").default(true).notNull(),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("ai_agent_tenant_settings_tenant_idx").on(table.tenantId),
  agentIndex: index("ai_agent_tenant_settings_agent_idx").on(table.agentId),
  // Unique constraint: one setting per agent per tenant
  uniqueTenantAgent: index("ai_agent_tenant_settings_unique_idx").on(table.tenantId, table.agentId),
}));

// AI Conversations - Chat History with encryption and retention
export const aiConversations = w3suiteSchema.table("ai_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Conversation Metadata
  title: varchar("title", { length: 255 }).notNull(),
  conversationData: jsonb("conversation_data").notNull(), // Encrypted chat history
  featureContext: aiFeatureTypeEnum("feature_context").default('chat').notNull(),
  
  // Business Context
  moduleContext: varchar("module_context", { length: 50 }), // 'hr', 'finance', 'general'
  businessEntityId: uuid("business_entity_id"), // Related entity (user, store, etc.)
  
  // Retention Management
  expiresAt: timestamp("expires_at"), // Based on retention policy
  isArchived: boolean("is_archived").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("ai_conversations_tenant_idx").on(table.tenantId),
  userIndex: index("ai_conversations_user_idx").on(table.userId),
  contextIndex: index("ai_conversations_context_idx").on(table.featureContext),
  expiresIndex: index("ai_conversations_expires_idx").on(table.expiresAt),
}));

// ==================== LEAD ROUTING AI SYSTEM ====================
// Lead Routing History - Tracks AI routing decisions for leads
export const leadRoutingHistory = w3suiteSchema.table("lead_routing_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  leadId: uuid("lead_id").references(() => crmLeads.id, { onDelete: 'cascade' }).notNull(),
  
  // Interaction Context
  interactionType: varchar("interaction_type", { length: 50 }).notNull(), // social_post_view, email_open, webinar, etc.
  interactionContent: text("interaction_content"), // Content description
  acquisitionSourceId: uuid("acquisition_source_id"), // FK to be added later when acquisition_sources table exists
  
  // AI Routing Decision
  recommendedDriver: uuid("recommended_driver").references(() => drivers.id),
  driverConfidence: leadRoutingConfidenceEnum("driver_confidence").default('medium').notNull(),
  driverReasoning: text("driver_reasoning"),
  
  // Pipeline Assignment
  targetPipelineId: uuid("target_pipeline_id").references(() => crmPipelines.id),
  campaignSuggestion: varchar("campaign_suggestion", { length: 255 }),
  
  // Outbound Channel Recommendation
  primaryOutboundChannel: outboundChannelEnum("primary_outbound_channel").notNull(),
  secondaryOutboundChannel: outboundChannelEnum("secondary_outbound_channel"),
  channelReasoning: text("channel_reasoning"),
  
  // Deal Prediction
  estimatedValue: integer("estimated_value"), // in cents
  expectedCloseDate: date("expected_close_date"),
  priority: varchar("priority", { length: 20 }), // High, Medium, Low
  
  // AI Response Metadata
  aiModel: aiModelEnum("ai_model").default('gpt-4o').notNull(),
  responseTimeMs: integer("response_time_ms"),
  tokenUsage: integer("token_usage"),
  fullAiResponse: jsonb("full_ai_response"), // Complete AI JSON response
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("lead_routing_history_tenant_idx").on(table.tenantId),
  leadIndex: index("lead_routing_history_lead_idx").on(table.leadId),
  driverIndex: index("lead_routing_history_driver_idx").on(table.recommendedDriver),
  pipelineIndex: index("lead_routing_history_pipeline_idx").on(table.targetPipelineId),
  createdAtIndex: index("lead_routing_history_created_at_idx").on(table.createdAt),
}));

// Lead AI Insights - AI-generated insights and recommendations for leads
export const leadAiInsights = w3suiteSchema.table("lead_ai_insights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  leadId: uuid("lead_id").references(() => crmLeads.id, { onDelete: 'cascade' }).notNull(),
  
  // Insight Data
  insightType: varchar("insight_type", { length: 50 }).notNull(), // routing, scoring, next_action
  insights: jsonb("insights").notNull(), // Array of insight strings
  nextAction: text("next_action"),
  riskFactors: jsonb("risk_factors"), // Array of risk strings
  
  // Scoring
  score: integer("score"), // 0-100
  confidence: real("confidence"), // 0.0-1.0
  
  // Metadata
  generatedBy: varchar("generated_by", { length: 50 }).default('lead-routing-agent').notNull(),
  aiModel: aiModelEnum("ai_model").default('gpt-4o').notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiration for insights
}, (table) => ({
  tenantIndex: index("lead_ai_insights_tenant_idx").on(table.tenantId),
  leadIndex: index("lead_ai_insights_lead_idx").on(table.leadId),
  typeIndex: index("lead_ai_insights_type_idx").on(table.insightType),
  createdAtIndex: index("lead_ai_insights_created_at_idx").on(table.createdAt),
}));

// ==================== MCP (MODEL CONTEXT PROTOCOL) SYSTEM ====================
// Enterprise-grade integration system for external services via MCP protocol
// Supports Google Workspace, Meta/Instagram, GTM, AWS S3, Microsoft Teams, etc.

// MCP Servers - Registry of configured MCP servers (tenant-scoped)
export const mcpServers = w3suiteSchema.table("mcp_servers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Server Identification
  name: varchar("name", { length: 100 }).notNull(), // Unique identifier (e.g., 'google-workspace', 'meta-instagram')
  displayName: varchar("display_name", { length: 255 }).notNull(), // User-friendly name
  description: text("description"),
  
  // Connection Details
  serverUrl: text("server_url"), // For http-sse transport (null for stdio)
  transport: mcpTransportEnum("transport").notNull(), // stdio or http-sse
  status: mcpServerStatusEnum("status").default('configuring').notNull(),
  
  // Configuration & Metadata
  config: jsonb("config").default({}).notNull(), // Server-specific config (retries, timeout, etc.)
  iconUrl: varchar("icon_url", { length: 500 }), // Optional icon for UI
  category: mcpToolCategoryEnum("category").default('other'),
  
  // Installation & Source
  sourceType: varchar("source_type", { length: 50 }).default('npm_package'), // 'npm_package' or 'custom_source'
  installMethod: text("install_method"), // e.g., 'npm install @modelcontextprotocol/server-slack'
  installLocation: text("install_location"), // e.g., 'node_modules/@modelcontextprotocol/server-slack' or '/mcp-servers/custom-webhook'
  discoveredTools: jsonb("discovered_tools").default([]), // Cache of discovered tools [{name, description, schema}]
  
  // Health & Monitoring
  lastHealthCheck: timestamp("last_health_check"),
  lastError: text("last_error"),
  errorCount: integer("error_count").default(0).notNull(),
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"),
}, (table) => ({
  tenantIndex: index("mcp_servers_tenant_idx").on(table.tenantId),
  statusIndex: index("mcp_servers_status_idx").on(table.status),
  nameIndex: uniqueIndex("mcp_servers_tenant_name_unique").on(table.tenantId, table.name),
  categoryIndex: index("mcp_servers_category_idx").on(table.category),
}));

// MCP Server Credentials - Encrypted credential storage with RLS
export const mcpServerCredentials = w3suiteSchema.table("mcp_server_credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  serverId: uuid("server_id").references(() => mcpServers.id, { onDelete: 'cascade' }).notNull(),
  
  // Credential Type & Data
  credentialType: mcpCredentialTypeEnum("credential_type").notNull(),
  encryptedCredentials: jsonb("encrypted_credentials").notNull(), // Encrypted: { accessToken, refreshToken, apiKey, etc. }
  encryptionKeyId: varchar("encryption_key_id", { length: 100 }), // Key ID for decryption
  
  // Multi-Provider OAuth Support (n8n-style)
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }), // For multi-user OAuth (null = tenant-level)
  oauthProvider: varchar("oauth_provider", { length: 50 }), // 'google', 'microsoft', 'meta', 'aws', etc.
  
  // OAuth-specific fields
  tokenType: varchar("token_type", { length: 50 }), // 'Bearer', 'Basic', etc.
  scope: text("scope"), // OAuth scopes granted
  expiresAt: timestamp("expires_at"), // Token expiration
  accountEmail: varchar("account_email", { length: 255 }), // OAuth account email (for display in UI)
  accountName: varchar("account_name", { length: 255 }), // OAuth account display name
  
  // Audit & Lifecycle
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  tenantIndex: index("mcp_server_credentials_tenant_idx").on(table.tenantId),
  serverIndex: index("mcp_server_credentials_server_idx").on(table.serverId),
  expiresIndex: index("mcp_server_credentials_expires_idx").on(table.expiresAt),
  userIndex: index("mcp_server_credentials_user_idx").on(table.userId),
  providerIndex: index("mcp_server_credentials_provider_idx").on(table.oauthProvider),
  // Unique: one credential per server/user/provider combination (COALESCE handles nulls)
  serverUserProviderUnique: uniqueIndex("mcp_server_credentials_server_user_provider_unique").on(
    table.serverId, 
    sql`COALESCE(${table.userId}, '')`,
    sql`COALESCE(${table.oauthProvider}, '')`
  ),
}));

// MCP Connected Accounts - Multi-account support for Meta Pages, Instagram, Google Workspaces, etc.
export const mcpConnectedAccounts = w3suiteSchema.table("mcp_connected_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  credentialId: uuid("credential_id").references(() => mcpServerCredentials.id, { onDelete: 'cascade' }).notNull(),
  
  // Account Type & Identity
  accountType: mcpAccountTypeEnum("account_type").notNull(),
  platformAccountId: varchar("platform_account_id", { length: 255 }).notNull(), // FB Page ID, IG Account ID, Google Workspace ID, etc.
  accountName: varchar("account_name", { length: 255 }).notNull(), // Display name (e.g., "Negozio Milano")
  accountUsername: varchar("account_username", { length: 255 }), // @username for Instagram, email for Google
  
  // Platform-Specific Access Token (for Page Access Tokens, etc.)
  encryptedAccessToken: text("encrypted_access_token"), // Encrypted Page Access Token (Meta) or account-specific token
  tokenExpiresAt: timestamp("token_expires_at"), // null = never expires (Meta Page tokens)
  
  // Account Metadata
  accountMetadata: jsonb("account_metadata").default({}), // Followers, profile pic, additional info
  linkedAccounts: jsonb("linked_accounts").default([]), // e.g., IG account linked to FB Page: [{type: 'instagram_business', id: 'xxx'}]
  
  // Permissions & Status
  grantedPermissions: text("granted_permissions").array(), // Specific permissions for this account
  isActive: boolean("is_active").default(true).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(), // Mark one account as primary/default
  
  // Audit & Lifecycle
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at"), // Last time account data was synced
  removedAt: timestamp("removed_at"), // Soft delete when user removes account
}, (table) => ({
  tenantIndex: index("mcp_connected_accounts_tenant_idx").on(table.tenantId),
  credentialIndex: index("mcp_connected_accounts_credential_idx").on(table.credentialId),
  accountTypeIndex: index("mcp_connected_accounts_type_idx").on(table.accountType),
  platformAccountIndex: index("mcp_connected_accounts_platform_id_idx").on(table.platformAccountId),
  // Unique: one account per credential (prevent duplicate page connections)
  credentialPlatformAccountUnique: uniqueIndex("mcp_connected_accounts_credential_platform_unique").on(
    table.credentialId, 
    table.platformAccountId
  ),
}));

// MCP Tool Schemas - Cached tool schemas for performance & offline access
export const mcpToolSchemas = w3suiteSchema.table("mcp_tool_schemas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: uuid("server_id").references(() => mcpServers.id, { onDelete: 'cascade' }).notNull(),
  
  // Tool Identification
  toolName: varchar("tool_name", { length: 100 }).notNull(), // e.g., 'gmail-send', 'instagram-publish'
  displayName: varchar("display_name", { length: 255 }),
  description: text("description"),
  category: mcpToolCategoryEnum("category").default('other'),
  
  // JSON Schema Definition (from MCP server)
  inputSchema: jsonb("input_schema").notNull(), // Zod-compatible JSON schema for inputs
  outputSchema: jsonb("output_schema"), // Expected output schema
  
  // Tool Metadata
  examples: jsonb("examples").default([]), // Example usage for AI agents
  tags: text("tags").array(), // Searchable tags
  
  // Sync & Cache Management
  lastSyncedAt: timestamp("last_synced_at").notNull(),
  syncVersion: varchar("sync_version", { length: 50 }), // MCP server version
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  serverIndex: index("mcp_tool_schemas_server_idx").on(table.serverId),
  categoryIndex: index("mcp_tool_schemas_category_idx").on(table.category),
  // Unique: one schema per tool per server
  toolNameUnique: uniqueIndex("mcp_tool_schemas_server_tool_unique").on(table.serverId, table.toolName),
  lastSyncedIndex: index("mcp_tool_schemas_synced_idx").on(table.lastSyncedAt),
}));

// ==================== VECTOR EMBEDDINGS SYSTEM (pgvector) ====================
// Enterprise-grade vector storage with multi-tenant RLS isolation

// Vector Embeddings Enums
export const vectorSourceTypeEnum = pgEnum('vector_source_type', [
  'document', 'knowledge_base', 'chat_history', 'policy', 'training_material', 
  'product_catalog', 'customer_data', 'financial_report', 'hr_document',
  'url_content', 'pdf_document', 'image', 'audio_transcript', 'video_transcript'
]);
export const vectorStatusEnum = pgEnum('vector_status', ['pending', 'processing', 'ready', 'failed', 'archived']);
export const embeddingModelEnum = pgEnum('embedding_model', [
  'text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'
]);

// Cross-tenant RAG Origin - CRITICO per distinguere brand vs tenant knowledge
export const vectorOriginEnum = pgEnum('vector_origin', ['brand', 'tenant']);

// Media Type Enum for multimodal content
export const mediaTypeEnum = pgEnum('media_type', [
  'text', 'pdf', 'image', 'audio', 'video', 'url', 'document'
]);

// Extraction Method Enum for processing
export const extractionMethodEnum = pgEnum('extraction_method', [
  'native', 'ocr', 'transcription', 'vision_api', 'pdf_parse', 'web_scrape'
]);

// Vector Embeddings - Core table for storing document embeddings with pgvector
export const vectorEmbeddings = w3suiteSchema.table("vector_embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // 🎯 CROSS-TENANT RAG: Brand vs Tenant distinction
  origin: vectorOriginEnum("origin").notNull(), // 'brand' = Brand Interface, 'tenant' = Tenant specific
  agentId: varchar("agent_id", { length: 100 }), // Agent ID for filtering (e.g., 'tippy-sales')
  
  // Source Reference
  sourceType: vectorSourceTypeEnum("source_type").notNull(),
  sourceId: uuid("source_id"), // Reference to original document/entity
  sourceUrl: text("source_url"), // Optional URL reference
  
  // Content & Embeddings (pgvector support)
  contentChunk: text("content_chunk").notNull(), // Original text chunk
  embedding: vector("embedding"), // OpenAI embedding dimension (1536 for text-embedding-3-small)
  embeddingModel: embeddingModelEnum("embedding_model").notNull(),
  
  // Multimedia Support
  mediaType: mediaTypeEnum("media_type").default('text').notNull(),
  extractionMethod: extractionMethodEnum("extraction_method"),
  originalFileName: varchar("original_file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  
  // Metadata & Search Optimization
  metadata: jsonb("metadata").default({}).notNull(), // Searchable metadata with media-specific info
  tags: text("tags").array(), // Search tags array
  language: varchar("language", { length: 10 }).default('it'), // Language code
  
  // Temporal Metadata (for audio/video)
  startTime: real("start_time"), // Start time in seconds for audio/video chunks
  endTime: real("end_time"), // End time in seconds for audio/video chunks
  duration: real("duration"), // Duration in seconds
  
  // Visual Metadata (for images)
  imageAnalysis: jsonb("image_analysis"), // GPT-4 Vision analysis results
  detectedObjects: text("detected_objects").array(), // Objects/entities detected
  imageResolution: varchar("image_resolution", { length: 50 }), // e.g., "1920x1080"
  
  // Security & Access Control
  accessLevel: varchar("access_level", { length: 50 }).default('private'), // public, private, restricted
  ownerUserId: varchar("owner_user_id").references(() => users.id, { onDelete: 'set null' }), // VARCHAR for OAuth2 compatibility
  departmentRestriction: varchar("department_restriction", { length: 100 }), // HR, Finance, etc.
  
  // Performance & Status
  chunkIndex: integer("chunk_index").default(0), // Position in document
  chunkTotal: integer("chunk_total").default(1), // Total chunks for document
  tokenCount: integer("token_count").notNull(), // Tokens in chunk
  status: vectorStatusEnum("status").default('pending').notNull(),
  
  // Audit & Lifecycle
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
  expiresAt: timestamp("expires_at"), // For retention policies
  processingTimeMs: integer("processing_time_ms"), // Time to generate embedding
  
  // Training & Validation
  isValidated: boolean("is_validated").default(false), // User validated for training
  validationScore: real("validation_score"), // Quality score from validation
  validatedBy: varchar("validated_by"), // User who validated
  validatedAt: timestamp("validated_at") // When validation occurred
}, (table) => ({
  // Indexes for performance and search
  tenantIndex: index("vector_embeddings_tenant_idx").on(table.tenantId),
  sourceIndex: index("vector_embeddings_source_idx").on(table.sourceType, table.sourceId),
  statusIndex: index("vector_embeddings_status_idx").on(table.status),
  ownerIndex: index("vector_embeddings_owner_idx").on(table.ownerUserId),
  expiresIndex: index("vector_embeddings_expires_idx").on(table.expiresAt),
  
  // 🎯 CROSS-TENANT RAG INDEXES: Performance critici per ricerca combinata brand+tenant
  crossTenantAgentIndex: index("vector_embeddings_cross_tenant_agent_idx").on(table.origin, table.agentId),
  tenantAgentIndex: index("vector_embeddings_tenant_agent_idx").on(table.tenantId, table.agentId),
  agentStatusIndex: index("vector_embeddings_agent_status_idx").on(table.agentId, table.status),
  
  // Note: HNSW index for vector similarity will be created via SQL migration
}));

// Vector Search Queries - Audit and performance tracking
export const vectorSearchQueries = w3suiteSchema.table("vector_search_queries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(), // VARCHAR for OAuth2 compatibility
  
  // Query Details
  queryText: text("query_text").notNull(),
  queryEmbedding: vector("query_embedding"), // Store query embedding for analysis
  queryType: varchar("query_type", { length: 50 }), // semantic, hybrid, filtered
  
  // Search Parameters
  searchFilters: jsonb("search_filters").default({}).notNull(),
  maxResults: integer("max_results").default(10),
  similarityThreshold: real("similarity_threshold"), // Minimum similarity score
  
  // Results Metadata
  resultsReturned: integer("results_returned").default(0),
  topScore: real("top_score"), // Best similarity score
  responseTimeMs: integer("response_time_ms").notNull(),
  
  // Context & Purpose
  searchContext: varchar("search_context", { length: 100 }), // hr_search, document_qa, etc.
  moduleContext: varchar("module_context", { length: 50 }), // hr, finance, general
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tenantUserIndex: index("vector_search_queries_tenant_user_idx").on(table.tenantId, table.userId),
  timestampIndex: index("vector_search_queries_timestamp_idx").on(table.createdAt),
  contextIndex: index("vector_search_queries_context_idx").on(table.searchContext),
}));

// Vector Collections - Logical groupings of embeddings
export const vectorCollections = w3suiteSchema.table("vector_collections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Collection Info
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  collectionType: varchar("collection_type", { length: 50 }).notNull(), // knowledge_base, policies, etc.
  
  // Settings & Configuration
  embeddingModel: embeddingModelEnum("embedding_model").notNull(),
  chunkingStrategy: jsonb("chunking_strategy").default({
    method: 'sliding_window',
    chunk_size: 1000,
    overlap: 200
  }).notNull(),
  
  // Access Control
  isPublic: boolean("is_public").default(false).notNull(),
  allowedRoles: text("allowed_roles").array(), // Role-based access
  departmentScope: varchar("department_scope", { length: 100 }),
  
  // Statistics
  totalEmbeddings: integer("total_embeddings").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }), // VARCHAR for OAuth2 compatibility
}, (table) => ({
  tenantNameIndex: uniqueIndex("vector_collections_tenant_name_idx").on(table.tenantId, table.name),
  typeIndex: index("vector_collections_type_idx").on(table.collectionType),
}));

// AI Training Sessions - Track training and validation activities
export const aiTrainingSessions = w3suiteSchema.table("ai_training_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // 🎯 AGENT LINKAGE: Critical for agent-specific RAG content
  agentId: varchar("agent_id", { length: 100 }), // Agent ID for filtering (e.g., 'tippy-sales', 'workflow-assistant')
  
  // Session Info
  sessionType: varchar("session_type", { length: 50 }).notNull(), // validation, url_import, media_upload
  sessionStatus: varchar("session_status", { length: 50 }).default('active').notNull(), // active, completed, failed
  
  // Training Data
  sourceUrl: text("source_url"), // For URL imports
  sourceFile: text("source_file"), // For file uploads
  contentType: varchar("content_type", { length: 100 }), // MIME type
  
  // Processing Details
  totalChunks: integer("total_chunks").default(0),
  processedChunks: integer("processed_chunks").default(0),
  failedChunks: integer("failed_chunks").default(0),
  
  // Validation Data (for response validation sessions)
  originalQuery: text("original_query"),
  originalResponse: text("original_response"),
  correctedResponse: text("corrected_response"),
  validationFeedback: jsonb("validation_feedback"),
  
  // Metrics
  processingTimeMs: integer("processing_time_ms"),
  tokensProcessed: integer("tokens_processed").default(0),
  embeddingsCreated: integer("embeddings_created").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  tenantUserIndex: index("ai_training_sessions_tenant_user_idx").on(table.tenantId, table.userId),
  statusIndex: index("ai_training_sessions_status_idx").on(table.sessionStatus),
  typeIndex: index("ai_training_sessions_type_idx").on(table.sessionType),
  timestampIndex: index("ai_training_sessions_timestamp_idx").on(table.createdAt),
  
  // 🎯 AGENT-SPECIFIC INDEXES: Performance critical for agent RAG queries  
  agentIndex: index("ai_training_sessions_agent_idx").on(table.agentId),
  tenantAgentIndex: index("ai_training_sessions_tenant_agent_idx").on(table.tenantId, table.agentId),
  agentStatusIndex: index("ai_training_sessions_agent_status_idx").on(table.agentId, table.sessionStatus),
}));

// AI System Relations
export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [aiSettings.tenantId], references: [tenants.id] }),
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [aiUsageLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiUsageLogs.userId], references: [users.id] }),
}));

export const aiAgentTenantSettingsRelations = relations(aiAgentTenantSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [aiAgentTenantSettings.tenantId], references: [tenants.id] }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  tenant: one(tenants, { fields: [aiConversations.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
}));

// Lead Routing AI Relations
export const leadRoutingHistoryRelations = relations(leadRoutingHistory, ({ one }) => ({
  tenant: one(tenants, { fields: [leadRoutingHistory.tenantId], references: [tenants.id] }),
  lead: one(crmLeads, { fields: [leadRoutingHistory.leadId], references: [crmLeads.id] }),
  driver: one(drivers, { fields: [leadRoutingHistory.recommendedDriver], references: [drivers.id] }),
  pipeline: one(crmPipelines, { fields: [leadRoutingHistory.targetPipelineId], references: [crmPipelines.id] }),
}));

export const leadAiInsightsRelations = relations(leadAiInsights, ({ one }) => ({
  tenant: one(tenants, { fields: [leadAiInsights.tenantId], references: [tenants.id] }),
  lead: one(crmLeads, { fields: [leadAiInsights.leadId], references: [crmLeads.id] }),
}));

// Vector Embeddings Relations
export const vectorEmbeddingsRelations = relations(vectorEmbeddings, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorEmbeddings.tenantId], references: [tenants.id] }),
  owner: one(users, { fields: [vectorEmbeddings.ownerUserId], references: [users.id] }),
}));

export const vectorSearchQueriesRelations = relations(vectorSearchQueries, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorSearchQueries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [vectorSearchQueries.userId], references: [users.id] }),
}));

export const vectorCollectionsRelations = relations(vectorCollections, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorCollections.tenantId], references: [tenants.id] }),
  createdBy: one(users, { fields: [vectorCollections.createdBy], references: [users.id] }),
}));

export const aiTrainingSessionsRelations = relations(aiTrainingSessions, ({ one }) => ({
  tenant: one(tenants, { fields: [aiTrainingSessions.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiTrainingSessions.userId], references: [users.id] }),
}));

// MCP System Relations
export const mcpServersRelations = relations(mcpServers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [mcpServers.tenantId], references: [tenants.id] }),
  createdBy: one(users, { fields: [mcpServers.createdBy], references: [users.id] }),
  credentials: many(mcpServerCredentials),
  toolSchemas: many(mcpToolSchemas),
}));

export const mcpServerCredentialsRelations = relations(mcpServerCredentials, ({ one }) => ({
  tenant: one(tenants, { fields: [mcpServerCredentials.tenantId], references: [tenants.id] }),
  server: one(mcpServers, { fields: [mcpServerCredentials.serverId], references: [mcpServers.id] }),
  createdBy: one(users, { fields: [mcpServerCredentials.createdBy], references: [users.id] }),
}));

export const mcpToolSchemasRelations = relations(mcpToolSchemas, ({ one }) => ({
  server: one(mcpServers, { fields: [mcpToolSchemas.serverId], references: [mcpServers.id] }),
}));

// AI Insert Schemas and Types
export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type AISettings = typeof aiSettings.$inferSelect;

// Lead Routing AI Insert Schemas and Types
export const insertLeadRoutingHistorySchema = createInsertSchema(leadRoutingHistory).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertLeadRoutingHistory = z.infer<typeof insertLeadRoutingHistorySchema>;
export type LeadRoutingHistory = typeof leadRoutingHistory.$inferSelect;

export const insertLeadAiInsightsSchema = createInsertSchema(leadAiInsights).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertLeadAiInsights = z.infer<typeof insertLeadAiInsightsSchema>;
export type LeadAiInsights = typeof leadAiInsights.$inferSelect;

export const insertAIUsageLogSchema = createInsertSchema(aiUsageLogs).omit({ 
  id: true, 
  requestTimestamp: true 
});
export type InsertAIUsageLog = z.infer<typeof insertAIUsageLogSchema>;
export type AIUsageLog = typeof aiUsageLogs.$inferSelect;

export const insertAIConversationSchema = createInsertSchema(aiConversations).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertAIConversation = z.infer<typeof insertAIConversationSchema>;
export type AIConversation = typeof aiConversations.$inferSelect;

// Vector Embeddings Insert Schemas and Types
export const insertVectorEmbeddingSchema = createInsertSchema(vectorEmbeddings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  lastAccessedAt: true 
});
export type InsertVectorEmbedding = z.infer<typeof insertVectorEmbeddingSchema>;
export type VectorEmbedding = typeof vectorEmbeddings.$inferSelect;

export const insertVectorSearchQuerySchema = createInsertSchema(vectorSearchQueries).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertVectorSearchQuery = z.infer<typeof insertVectorSearchQuerySchema>;
export type VectorSearchQuery = typeof vectorSearchQueries.$inferSelect;

export const insertVectorCollectionSchema = createInsertSchema(vectorCollections).omit({ 
  id: true, 
  createdAt: true,
  lastUpdatedAt: true 
});
export type InsertVectorCollection = z.infer<typeof insertVectorCollectionSchema>;
export type VectorCollection = typeof vectorCollections.$inferSelect;

export const insertAITrainingSessionSchema = createInsertSchema(aiTrainingSessions).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true 
});
export type InsertAITrainingSession = z.infer<typeof insertAITrainingSessionSchema>;
export type AITrainingSession = typeof aiTrainingSessions.$inferSelect;

// ==================== MCP SYSTEM INSERT SCHEMAS ====================

export const insertMCPServerSchema = createInsertSchema(mcpServers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  lastHealthCheck: true,
  errorCount: true,
  archivedAt: true
});
export type InsertMCPServer = z.infer<typeof insertMCPServerSchema>;
export type MCPServer = typeof mcpServers.$inferSelect;

export const insertMCPServerCredentialSchema = createInsertSchema(mcpServerCredentials).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  revokedAt: true
});
export type InsertMCPServerCredential = z.infer<typeof insertMCPServerCredentialSchema>;
export type MCPServerCredential = typeof mcpServerCredentials.$inferSelect;

export const insertMCPToolSchemaSchema = createInsertSchema(mcpToolSchemas).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertMCPToolSchema = z.infer<typeof insertMCPToolSchemaSchema>;
export type MCPToolSchema = typeof mcpToolSchemas.$inferSelect;

// ==================== TASK SYSTEM INSERT SCHEMAS ====================

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  archivedAt: true,
  actualHours: true,
  completionPercentage: true
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({ 
  id: true, 
  assignedAt: true
});
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;
export type TaskAssignment = typeof taskAssignments.$inferSelect;

export const insertTaskChecklistItemSchema = createInsertSchema(taskChecklistItems).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true,
  completedBy: true
});
export type InsertTaskChecklistItem = z.infer<typeof insertTaskChecklistItemSchema>;
export type TaskChecklistItem = typeof taskChecklistItems.$inferSelect;

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  isEdited: true,
  deletedAt: true
});
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;

export const insertTaskTimeLogSchema = createInsertSchema(taskTimeLogs).omit({ 
  id: true, 
  createdAt: true,
  duration: true
});
export type InsertTaskTimeLog = z.infer<typeof insertTaskTimeLogSchema>;
export type TaskTimeLog = typeof taskTimeLogs.$inferSelect;

export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({ 
  id: true, 
  createdAt: true
});
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;

export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({ 
  id: true, 
  uploadedAt: true
});
export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type TaskAttachment = typeof taskAttachments.$inferSelect;

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  lastInstantiatedAt: true
});
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;

// ==================== CHAT SYSTEM INSERT SCHEMAS ====================

export const insertChatChannelSchema = createInsertSchema(chatChannels).omit({ 
  id: true, 
  createdAt: true
});
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;
export type ChatChannel = typeof chatChannels.$inferSelect;

export const insertChatChannelMemberSchema = createInsertSchema(chatChannelMembers).omit({ 
  id: true, 
  joinedAt: true,
  lastReadAt: true
});
export type InsertChatChannelMember = z.infer<typeof insertChatChannelMemberSchema>;
export type ChatChannelMember = typeof chatChannelMembers.$inferSelect;

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  isEdited: true,
  deletedAt: true
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const insertChatTypingIndicatorSchema = createInsertSchema(chatTypingIndicators).omit({ 
  id: true, 
  startedAt: true
});
export type InsertChatTypingIndicator = z.infer<typeof insertChatTypingIndicatorSchema>;
export type ChatTypingIndicator = typeof chatTypingIndicators.$inferSelect;

// ==================== ACTIVITY FEED INSERT SCHEMAS ====================

export const insertActivityFeedEventSchema = createInsertSchema(activityFeedEvents).omit({ 
  id: true, 
  createdAt: true
});
export type InsertActivityFeedEvent = z.infer<typeof insertActivityFeedEventSchema>;
export type ActivityFeedEvent = typeof activityFeedEvents.$inferSelect;

export const insertActivityFeedInteractionSchema = createInsertSchema(activityFeedInteractions).omit({ 
  id: true, 
  createdAt: true
});
export type InsertActivityFeedInteraction = z.infer<typeof insertActivityFeedInteractionSchema>;
export type ActivityFeedInteraction = typeof activityFeedInteractions.$inferSelect;

// ==================== CRM SYSTEM TABLES ====================

// CRM Person Identities - Atomic identity deduplication table
export const crmPersonIdentities = w3suiteSchema.table("crm_person_identities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  personId: uuid("person_id").notNull(),
  identifierType: crmIdentifierTypeEnum("identifier_type").notNull(),
  identifierValue: varchar("identifier_value", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantTypeValueUniq: uniqueIndex("crm_person_identities_tenant_type_value_uniq").on(table.tenantId, table.identifierType, table.identifierValue),
  personIdIdx: index("crm_person_identities_person_id_idx").on(table.personId),
  tenantIdIdx: index("crm_person_identities_tenant_id_idx").on(table.tenantId),
}));

// CRM Campaigns - Marketing containers (STORE-LEVEL SCOPE ONLY)
export const crmCampaigns = w3suiteSchema.table("crm_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  storeId: uuid("store_id").notNull(), // Store-level scope (obbligatorio)
  isBrandTemplate: boolean("is_brand_template").default(false),
  brandCampaignId: uuid("brand_campaign_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: crmCampaignTypeEnum("type").notNull(),
  status: crmCampaignStatusEnum("status").default('draft'),
  objective: integer("objective"), // Target numero lead
  targetDriverIds: uuid("target_driver_ids").array(), // Multi-driver support (FISSO, MOBILE, DEVICE, etc.)
  brandSourceType: varchar("brand_source_type", { length: 50 }).default('tenant_only'), // 'tenant_only' | 'brand_derived'
  requiredConsents: jsonb("required_consents"), // { privacy_policy: true, marketing: false, profiling: true, third_party: false }
  landingPageUrl: text("landing_page_url"),
  channels: text("channels").array(), // Array canali: phone, whatsapp, form, social, email, qr
  externalCampaignId: varchar("external_campaign_id", { length: 255 }), // Powerful API campaign ID
  defaultLeadSource: leadSourceEnum("default_lead_source"), // Default source for leads
  
  // 🎯 ROUTING & WORKFLOWS UNIFICATO
  routingMode: varchar("routing_mode", { length: 20 }), // 'automatic' | 'manual'
  
  // AUTOMATIC MODE - Workflow + Fallback
  workflowId: uuid("workflow_id"), // Workflow che esegue la logica (può includere nodo routing pipeline)
  fallbackTimeoutSeconds: integer("fallback_timeout_seconds"), // Timeout in secondi prima del fallback
  fallbackPipelineId1: uuid("fallback_pipeline_id1"), // Pipeline 1 per fallback automatico
  fallbackPipelineId2: uuid("fallback_pipeline_id2"), // Pipeline 2 per fallback automatico
  
  // MANUAL MODE - Pipeline preselezionate
  manualPipelineId1: uuid("manual_pipeline_id1"), // Pipeline 1 per assegnazione manuale
  manualPipelineId2: uuid("manual_pipeline_id2"), // Pipeline 2 per assegnazione manuale
  
  // AI CONTROLS (entrambe le modalità)
  enableAIScoring: boolean("enable_ai_scoring").default(false), // Abilita AI Lead Scoring (per manual e automatic)
  enableAIRouting: boolean("enable_ai_routing").default(false), // Abilita AI Routing (solo per automatic, workflow può sovrascrivere)
  
  // NOTIFICHE (entrambe le modalità)
  notifyTeamId: uuid("notify_team_id"), // Team da notificare
  notifyUserIds: uuid("notify_user_ids").array(), // Array di user ID da notificare
  
  budget: real("budget"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  utmSourceId: uuid("utm_source_id"), // DEPRECATED: Use marketingChannels array instead
  utmMediumId: uuid("utm_medium_id"), // DEPRECATED: Use marketingChannels array instead
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  marketingChannels: text("marketing_channels").array(), // Active channels: ['facebook_ads', 'instagram', 'google_ads', 'email', 'whatsapp']
  attributionWindowDays: integer("attribution_window_days").default(30), // Attribution window (default 30 days)
  totalLeads: integer("total_leads").default(0),
  totalDeals: integer("total_deals").default(0),
  totalRevenue: real("total_revenue").default(0),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantStatusStartIdx: index("crm_campaigns_tenant_status_start_idx").on(table.tenantId, table.status, table.startDate),
  tenantIdIdx: index("crm_campaigns_tenant_id_idx").on(table.tenantId),
  storeIdIdx: index("crm_campaigns_store_id_idx").on(table.storeId),
}));

// Campaign Social Accounts - Link campagne a account social MCP (Facebook Pages, Instagram, LinkedIn)
export const campaignSocialAccounts = w3suiteSchema.table("campaign_social_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  campaignId: uuid("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: 'cascade' }),
  mcpAccountId: uuid("mcp_account_id").notNull().references(() => mcpConnectedAccounts.id, { onDelete: 'cascade' }),
  platform: varchar("platform", { length: 50 }).notNull(), // 'facebook', 'instagram', 'linkedin', 'google', etc.
  externalCampaignId: varchar("external_campaign_id", { length: 255 }), // Campaign ID on the platform (FB Campaign ID, LinkedIn Campaign URN)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index("campaign_social_accounts_tenant_id_idx").on(table.tenantId),
  campaignIdIdx: index("campaign_social_accounts_campaign_id_idx").on(table.campaignId),
  mcpAccountIdIdx: index("campaign_social_accounts_mcp_account_id_idx").on(table.mcpAccountId),
  externalCampaignIdIdx: index("campaign_social_accounts_external_campaign_id_idx").on(table.externalCampaignId),
  uniqueCampaignMcpAccount: uniqueIndex("campaign_social_accounts_campaign_mcp_unique").on(table.campaignId, table.mcpAccountId),
}));

export const insertCampaignSocialAccountSchema = createInsertSchema(campaignSocialAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertCampaignSocialAccount = z.infer<typeof insertCampaignSocialAccountSchema>;
export type CampaignSocialAccount = typeof campaignSocialAccounts.$inferSelect;

// CRM Leads - Lead con person_id auto-generated (match su email/phone/social)
export const crmLeads = w3suiteSchema.table("crm_leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  legalEntityId: uuid("legal_entity_id"),
  storeId: uuid("store_id").notNull(),
  personId: uuid("person_id").notNull(), // Auto-generated UUID for identity tracking
  ownerUserId: varchar("owner_user_id"),
  campaignId: uuid("campaign_id").references(() => crmCampaigns.id),
  sourceChannel: crmInboundChannelEnum("source_channel"), // INBOUND: Lead acquisition source
  sourceSocialAccountId: uuid("source_social_account_id"),
  status: crmLeadStatusEnum("status").default('new'),
  leadScore: smallint("lead_score").default(0), // 0-100
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  companyName: varchar("company_name", { length: 255 }),
  productInterest: varchar("product_interest", { length: 255 }),
  driverId: uuid("driver_id").references(() => drivers.id),
  notes: text("notes"),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  // UTM Normalized Foreign Keys (for analytics and reporting)
  utmSourceId: uuid("utm_source_id").references(() => utmSources.id),
  utmMediumId: uuid("utm_medium_id").references(() => utmMediums.id),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  landingPageUrl: text("landing_page_url"),
  referrerUrl: text("referrer_url"),
  eventName: varchar("event_name", { length: 255 }),
  eventSource: text("event_source"),
  sessionId: varchar("session_id", { length: 255 }),
  clientIpAddress: varchar("client_ip_address", { length: 45 }),
  privacyPolicyAccepted: boolean("privacy_policy_accepted").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  profilingConsent: boolean("profiling_consent").default(false),
  thirdPartyConsent: boolean("third_party_consent").default(false),
  consentTimestamp: timestamp("consent_timestamp"),
  consentSource: varchar("consent_source", { length: 255 }),
  rawEventPayload: jsonb("raw_event_payload"),
  
  // ==================== SLA & DATE RANGE MANAGEMENT ====================
  campaignValidUntil: timestamp("campaign_valid_until"), // Eredita end_date dalla campagna (offerta scade con campagna)
  validUntil: timestamp("valid_until"), // Scadenza PERSONALE lead (diverso da campaignValidUntil)
  slaDeadline: timestamp("sla_deadline"), // Deadline gestione interna (es: created_at + 7 giorni)
  slaConfig: jsonb("sla_config"), // Configurazione SLA { default_days: 7, urgent_days: 2, high_value_days: 3 }
  
  // ==================== POWERFUL API INTEGRATION ====================
  externalLeadId: varchar("external_lead_id", { length: 255 }), // Powerful API lead ID
  leadSource: leadSourceEnum("lead_source"), // Source: manual, web_form, powerful_api, landing_page, csv_import
  
  // ==================== FASE 1: GTM TRACKING ====================
  gtmClientId: varchar("gtm_client_id", { length: 255 }), // GA Client ID univoco
  gtmSessionId: varchar("gtm_session_id", { length: 255 }), // Session ID corrente
  gtmUserId: varchar("gtm_user_id", { length: 255 }), // User ID cross-device
  gtmEvents: jsonb("gtm_events"), // Array completo eventi GTM
  gtmProductsViewed: text("gtm_products_viewed").array(), // Prodotti visualizzati
  gtmConversionEvents: text("gtm_conversion_events").array(), // Eventi conversione
  gtmGoalsCompleted: text("gtm_goals_completed").array(), // Obiettivi GA completati
  
  // ==================== FASE 1: MULTI-PDV TRACKING ====================
  originStoreId: uuid("origin_store_id"), // PDV che ha generato il lead
  originStoreName: varchar("origin_store_name", { length: 255 }), // Nome store per reporting
  storesVisited: text("stores_visited").array(), // Lista PDV visitati
  storeInteractions: jsonb("store_interactions"), // Interazioni dettagliate per store
  preferredStoreId: uuid("preferred_store_id"), // Store preferito dal cliente
  nearestStoreId: uuid("nearest_store_id"), // Store più vicino geograficamente
  
  // ==================== FASE 1: SOCIAL & FORM TRACKING ====================
  socialProfiles: jsonb("social_profiles"), // Profili social collegati {facebook:{}, instagram:{}}
  socialInteractionsByStore: jsonb("social_interactions_by_store"), // Interazioni social per PDV
  socialCampaignResponses: jsonb("social_campaign_responses").array(), // Array risposte campagne
  formsSubmitted: jsonb("forms_submitted").array(), // Form compilati con tutti i dettagli
  totalFormsStarted: integer("total_forms_started").default(0),
  totalFormsCompleted: integer("total_forms_completed").default(0),
  formCompletionRate: real("form_completion_rate"),
  averageFormTime: real("average_form_time"), // Tempo medio in secondi
  
  // ==================== FASE 1: DOCUMENTI FISCALI ITALIANI ====================
  fiscalCode: varchar("fiscal_code", { length: 16 }), // Codice Fiscale
  vatNumber: varchar("vat_number", { length: 11 }), // Partita IVA
  documentType: varchar("document_type", { length: 50 }), // CI/Patente/Passaporto
  documentNumber: varchar("document_number", { length: 50 }),
  documentExpiry: date("document_expiry"),
  pecEmail: varchar("pec_email", { length: 255 }), // PEC certificata
  
  // ==================== FASE 2: CUSTOMER JOURNEY & ATTRIBUTION ====================
  customerJourney: jsonb("customer_journey").array(), // Journey completo con touchpoints
  firstTouchAttribution: jsonb("first_touch_attribution"),
  lastTouchAttribution: jsonb("last_touch_attribution"),
  firstContactDate: timestamp("first_contact_date"),
  lastContactDate: timestamp("last_contact_date"),
  contactCount: integer("contact_count").default(0),
  nextActionDate: date("next_action_date"),
  nextActionType: varchar("next_action_type", { length: 100 }),
  
  // ==================== UTM MULTI-TOUCH ATTRIBUTION ====================
  firstTouchUtmLinkId: uuid("first_touch_utm_link_id"), // First UTM click
  lastTouchUtmLinkId: uuid("last_touch_utm_link_id"), // Last UTM click (for revenue attribution)
  allTouchUtmLinkIds: uuid("all_touch_utm_link_ids").array(), // Complete touchpoint history
  firstTouchAt: timestamp("first_touch_at"), // First touchpoint timestamp
  lastTouchAt: timestamp("last_touch_at"), // Last touchpoint timestamp
  
  // ==================== FASE 2: BUSINESS PROFILING ====================
  customerType: customerTypeEnum("customer_type"), // B2B/B2C (usa enum esistente)
  companyRole: varchar("company_role", { length: 100 }), // Ruolo in azienda
  companySize: varchar("company_size", { length: 50 }), // Micro/Small/Medium/Large
  companySector: varchar("company_sector", { length: 100 }), // Settore merceologico
  annualRevenue: real("annual_revenue"), // Fatturato stimato
  employeeCount: integer("employee_count"),
  budgetRange: jsonb("budget_range"), // {min: 0, max: 1000}
  purchaseTimeframe: varchar("purchase_timeframe", { length: 50 }), // Immediate/1month/3months/6months
  painPoints: text("pain_points").array(), // Problemi da risolvere
  competitors: text("competitors").array(), // Competitor attuali
  
  // ==================== FASE 2: INDIRIZZO COMPLETO ====================
  addressStreet: varchar("address_street", { length: 255 }),
  addressNumber: varchar("address_number", { length: 20 }),
  addressCity: varchar("address_city", { length: 100 }),
  addressProvince: varchar("address_province", { length: 2 }),
  addressPostalCode: varchar("address_postal_code", { length: 5 }),
  addressCountry: varchar("address_country", { length: 50 }),
  geoLat: real("geo_lat"), // Latitudine
  geoLng: real("geo_lng"), // Longitudine
  deliveryAddress: jsonb("delivery_address"), // Indirizzo spedizione alternativo
  
  // ==================== FASE 3: ENGAGEMENT METRICS ====================
  pageViewsCount: integer("page_views_count").default(0),
  emailsOpenedCount: integer("emails_opened_count").default(0),
  emailsClickedCount: integer("emails_clicked_count").default(0),
  documentsDownloaded: text("documents_downloaded").array(),
  videosWatched: text("videos_watched").array(),
  sessionDuration: integer("session_duration"), // Durata sessione in secondi
  deviceType: varchar("device_type", { length: 50 }), // Mobile/Desktop/Tablet
  browserInfo: jsonb("browser_info"), // User agent e info browser
  engagementScore: real("engagement_score"), // Score 0-100
  
  // ==================== FASE 3: CONVERSION TRACKING ====================
  convertedToCustomerId: uuid("converted_to_customer_id"),
  conversionDate: timestamp("conversion_date"),
  conversionValue: real("conversion_value"), // Valore prima vendita
  lifecycleStage: varchar("lifecycle_stage", { length: 50 }), // Subscriber/Lead/MQL/SQL/Opportunity/Customer
  conversionProbability: real("conversion_probability"), // % probabilità conversione
  lostReason: varchar("lost_reason", { length: 255 }), // Motivo perdita lead
  
  // ==================== FASE 3: AI ENRICHMENT ====================
  aiEnrichmentDate: timestamp("ai_enrichment_date"),
  aiSentimentScore: real("ai_sentiment_score"), // Sentiment analysis -1 to 1
  aiIntentSignals: text("ai_intent_signals").array(), // Segnali intento rilevati
  aiPredictedValue: real("ai_predicted_value"), // LTV predetto
  aiRecommendations: jsonb("ai_recommendations"), // Suggerimenti AI per vendita
  
  // Timestamps e metadati
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indici esistenti
  tenantStatusScoreCreatedIdx: index("crm_leads_tenant_status_score_created_idx").on(table.tenantId, table.status, table.leadScore, table.createdAt),
  personIdIdx: index("crm_leads_person_id_idx").on(table.personId),
  tenantIdIdx: index("crm_leads_tenant_id_idx").on(table.tenantId),
  
  // ==================== NUOVI INDICI PER GTM & TRACKING ====================
  gtmClientIdx: index("crm_leads_gtm_client_idx").on(table.gtmClientId),
  gtmSessionIdx: index("crm_leads_gtm_session_idx").on(table.gtmSessionId),
  originStoreIdx: index("crm_leads_origin_store_idx").on(table.originStoreId),
  
  // ==================== INDICI PER RICERCA E FILTRAGGIO ====================
  emailIdx: index("crm_leads_email_idx").on(table.email),
  phoneIdx: index("crm_leads_phone_idx").on(table.phone),
  fiscalCodeIdx: index("crm_leads_fiscal_code_idx").on(table.fiscalCode),
  vatNumberIdx: index("crm_leads_vat_number_idx").on(table.vatNumber),
  
  // ==================== INDICI PER PERFORMANCE QUERIES ====================
  campaignStatusIdx: index("crm_leads_campaign_status_idx").on(table.campaignId, table.status),
  ownerStatusIdx: index("crm_leads_owner_status_idx").on(table.ownerUserId, table.status),
  engagementScoreIdx: index("crm_leads_engagement_score_idx").on(table.engagementScore),
  conversionDateIdx: index("crm_leads_conversion_date_idx").on(table.conversionDate),
  
  // ==================== INDICI COMPOSITI PER ANALYTICS ====================
  tenantOriginStoreIdx: index("crm_leads_tenant_origin_store_idx").on(table.tenantId, table.originStoreId),
  tenantCampaignIdx: index("crm_leads_tenant_campaign_idx").on(table.tenantId, table.campaignId),
  tenantLifecycleIdx: index("crm_leads_tenant_lifecycle_idx").on(table.tenantId, table.lifecycleStage),
}));

// ==================== LEAD STATUSES - Custom stati lead per campagna (categorie fisse, nomi personalizzabili) ====================
export const leadStatuses = w3suiteSchema.table("lead_statuses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  campaignId: uuid("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(), // Internal unique key
  displayName: varchar("display_name", { length: 100 }).notNull(), // User-facing label
  category: leadStatusCategoryEnum("category").notNull(), // new, working, qualified, converted, disqualified, on_hold
  color: varchar("color", { length: 60 }).notNull(), // HSL format: hsl(210, 100%, 60%)
  sortOrder: smallint("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // System default statuses cannot be deleted
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("lead_statuses_tenant_id_idx").on(table.tenantId),
  campaignIdIdx: index("lead_statuses_campaign_id_idx").on(table.campaignId),
  campaignCategoryIdx: index("lead_statuses_campaign_category_idx").on(table.campaignId, table.category),
  campaignNameUniq: uniqueIndex("lead_statuses_campaign_name_uniq").on(table.campaignId, table.name),
}));

// ==================== LEAD STATUS HISTORY - Audit trail cambio stato ====================
export const leadStatusHistory = w3suiteSchema.table("lead_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  leadId: uuid("lead_id").notNull().references(() => crmLeads.id, { onDelete: 'cascade' }),
  oldStatusId: uuid("old_status_id").references(() => leadStatuses.id),
  newStatusId: uuid("new_status_id").notNull().references(() => leadStatuses.id),
  oldStatusName: varchar("old_status_name", { length: 100 }), // Snapshot for history
  newStatusName: varchar("new_status_name", { length: 100 }).notNull(),
  notes: text("notes"),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
}, (table) => ({
  leadIdIdx: index("lead_status_history_lead_id_idx").on(table.leadId),
  tenantIdIdx: index("lead_status_history_tenant_id_idx").on(table.tenantId),
  changedAtIdx: index("lead_status_history_changed_at_idx").on(table.changedAt),
}));

// ==================== CRM FUNNELS - Customer Journey Orchestration ====================
// Funnel rappresenta la customer journey strategica che contiene multiple pipelines
export const crmFunnels = w3suiteSchema.table("crm_funnels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Funnel Identity
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default('#3b82f6'), // Primary color for funnel visualization
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  isActive: boolean("is_active").default(true).notNull(),
  
  // Journey Configuration
  pipelineOrder: text("pipeline_order").array(), // Array di pipeline IDs nell'ordine del journey
  expectedDurationDays: smallint("expected_duration_days"), // Durata media attesa del journey completo
  
  // AI Journey Orchestration
  aiOrchestrationEnabled: boolean("ai_orchestration_enabled").default(false).notNull(),
  aiJourneyInsights: jsonb("ai_journey_insights"), // AI-generated insights: bottlenecks, optimizations, predictions
  aiNextBestActionRules: jsonb("ai_next_best_action_rules"), // Rules per AI routing tra pipeline
  aiScoringWeights: jsonb("ai_scoring_weights"), // Pesi per lead scoring contestuali al funnel
  
  // Analytics & Metrics
  totalLeads: integer("total_leads").default(0).notNull(),
  conversionRate: real("conversion_rate").default(0), // Conversion rate end-to-end
  avgJourneyDurationDays: real("avg_journey_duration_days"), // Durata media reale del journey
  dropoffRate: real("dropoff_rate"), // Percentuale di abbandono
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index("crm_funnels_tenant_id_idx").on(table.tenantId),
  tenantActiveIdx: index("crm_funnels_tenant_active_idx").on(table.tenantId, table.isActive),
}));

export const insertCrmFunnelSchema = createInsertSchema(crmFunnels).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  totalLeads: true,
  conversionRate: true,
  avgJourneyDurationDays: true,
  dropoffRate: true
});
export type InsertCrmFunnel = z.infer<typeof insertCrmFunnelSchema>;
export type CrmFunnel = typeof crmFunnels.$inferSelect;

// CRM Funnel Workflows - Many-to-many: Funnel <-> Workflow Templates (for AI orchestration across pipelines)
export const crmFunnelWorkflows = w3suiteSchema.table("crm_funnel_workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  funnelId: uuid("funnel_id").notNull().references(() => crmFunnels.id, { onDelete: 'cascade' }),
  workflowTemplateId: uuid("workflow_template_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  executionMode: workflowExecutionModeEnum("execution_mode").default('manual').notNull(),
  isActive: boolean("is_active").default(true),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  notes: text("notes"),
}, (table) => ({
  funnelWorkflowUniq: uniqueIndex("crm_funnel_workflows_funnel_workflow_uniq").on(table.tenantId, table.funnelId, table.workflowTemplateId),
  tenantIdIdx: index("crm_funnel_workflows_tenant_id_idx").on(table.tenantId),
  funnelIdIdx: index("crm_funnel_workflows_funnel_id_idx").on(table.funnelId),
  workflowTemplateIdIdx: index("crm_funnel_workflows_workflow_template_id_idx").on(table.workflowTemplateId),
}));

export const insertCrmFunnelWorkflowSchema = createInsertSchema(crmFunnelWorkflows).omit({ 
  id: true, 
  tenantId: true,
  assignedAt: true
});
export type InsertCrmFunnelWorkflow = z.infer<typeof insertCrmFunnelWorkflowSchema>;
export type CrmFunnelWorkflow = typeof crmFunnelWorkflows.$inferSelect;

// CRM Pipelines - Sales processes
export const crmPipelines = w3suiteSchema.table("crm_pipelines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  funnelId: uuid("funnel_id").references(() => crmFunnels.id, { onDelete: 'set null' }), // Appartiene a un funnel
  funnelStageOrder: smallint("funnel_stage_order"), // Ordine della pipeline nel funnel (1=prima, 2=seconda, etc)
  isBrandTemplate: boolean("is_brand_template").default(false),
  brandPipelineId: uuid("brand_pipeline_id"),
  name: varchar("name", { length: 255 }).notNull(),
  domain: crmPipelineDomainEnum("domain").notNull(),
  driverId: uuid("driver_id").references(() => drivers.id),
  isActive: boolean("is_active").default(true),
  stagesConfig: jsonb("stages_config").notNull(), // [{order:1, name:'Contatto', category:'new', color:'#ff6900'}]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("crm_pipelines_tenant_id_idx").on(table.tenantId),
  funnelIdIdx: index("crm_pipelines_funnel_id_idx").on(table.funnelId),
  tenantFunnelIdx: index("crm_pipelines_tenant_funnel_idx").on(table.tenantId, table.funnelId),
}));

// CRM Pipeline Settings - Settings dedicati per pipeline
export const crmPipelineSettings = w3suiteSchema.table("crm_pipeline_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: uuid("pipeline_id").notNull().unique().references(() => crmPipelines.id),
  enabledChannels: text("enabled_channels").array(), // ['sms','whatsapp','email']
  contactRules: jsonb("contact_rules"), // {max_attempts_per_day, quiet_hours, sla_hours}
  workflowIds: text("workflow_ids").array(),
  customStatusNames: jsonb("custom_status_names"), // {new:'Primo Contatto', in_progress:'Lavorazione'}
  
  // 🎯 Hierarchical RBAC: Parent Access (Team/Users with pipeline visibility)
  assignedTeams: text("assigned_teams").array().default([]), // Team IDs with CRM/Sales department
  assignedUsers: text("assigned_users").array().default([]), // Optional: Individual users (in addition to teams)
  pipelineAdmins: text("pipeline_admins").array().default([]), // Users with full pipeline settings access
  
  // 🎯 Hierarchical RBAC: Child Permissions (Operational - only for users with parent access)
  // Deal Management Permission
  dealManagementMode: pipelinePermissionModeEnum("deal_management_mode").default('all'),
  dealManagementUsers: text("deal_management_users").array().default([]), // Used when mode='custom'
  
  // Deal Creation Permission
  dealCreationMode: pipelinePermissionModeEnum("deal_creation_mode").default('all'),
  dealCreationUsers: text("deal_creation_users").array().default([]), // Used when mode='custom'
  
  // State Modification Permission
  stateModificationMode: pipelinePermissionModeEnum("state_modification_mode").default('all'),
  stateModificationUsers: text("state_modification_users").array().default([]), // Used when mode='custom'
  
  // Deal Deletion Permission
  dealDeletionMode: pipelineDeletionModeEnum("deal_deletion_mode").default('admins'),
  dealDeletionUsers: text("deal_deletion_users").array().default([]), // Reserved for future use
  
  // 🔔 Notification Preferences (Pipeline-level)
  notifyOnStageChange: boolean("notify_on_stage_change").default(true), // Notify when deal changes stage
  notifyOnDealRotten: boolean("notify_on_deal_rotten").default(true), // Notify when deal becomes stale
  notifyOnDealWon: boolean("notify_on_deal_won").default(true), // Notify when deal is won
  notifyOnDealLost: boolean("notify_on_deal_lost").default(true), // Notify when deal is lost
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Pipeline Stage Playbooks - Regole contatto per stage
export const crmPipelineStagePlaybooks = w3suiteSchema.table("crm_pipeline_stage_playbooks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: uuid("pipeline_id").notNull().references(() => crmPipelines.id),
  stageName: varchar("stage_name", { length: 100 }).notNull(),
  allowedChannels: text("allowed_channels").array(),
  maxAttemptsPerDay: smallint("max_attempts_per_day"),
  slaHours: smallint("sla_hours"),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  nextBestActionJson: jsonb("next_best_action_json"),
  escalationPattern: varchar("escalation_pattern", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pipelineStageUniq: uniqueIndex("crm_pipeline_stage_playbooks_pipeline_stage_uniq").on(table.pipelineId, table.stageName),
}));

// CRM Pipeline Workflows - Many-to-many: Pipeline <-> Workflow Templates (RBAC: admin + marketing)
export const crmPipelineWorkflows = w3suiteSchema.table("crm_pipeline_workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: uuid("pipeline_id").notNull().references(() => crmPipelines.id, { onDelete: 'cascade' }),
  workflowTemplateId: uuid("workflow_template_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  executionMode: workflowExecutionModeEnum("execution_mode").default('manual').notNull(),
  isActive: boolean("is_active").default(true),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  notes: text("notes"),
}, (table) => ({
  pipelineWorkflowUniq: uniqueIndex("crm_pipeline_workflows_pipeline_workflow_uniq").on(table.pipelineId, table.workflowTemplateId),
  pipelineIdIdx: index("crm_pipeline_workflows_pipeline_id_idx").on(table.pipelineId),
  workflowTemplateIdIdx: index("crm_pipeline_workflows_workflow_template_id_idx").on(table.workflowTemplateId),
}));

// CRM Pipeline Stages - Stati personalizzati per pipeline con categorie fisse
export const crmPipelineStages = w3suiteSchema.table("crm_pipeline_stages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: uuid("pipeline_id").notNull().references(() => crmPipelines.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(), // Nome custom stage (es: "Primo Contatto")
  category: crmPipelineStageCategoryEnum("category").notNull(), // Categoria fissa: starter, progress, etc.
  orderIndex: smallint("order_index").notNull(), // Ordinamento visuale
  color: varchar("color", { length: 7 }), // Hex color (es: "#ff6900")
  isActive: boolean("is_active").default(true),
  requiredFields: text("required_fields").array(), // Campi obbligatori per avanzare (best practice validation)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  pipelineStageNameUniq: uniqueIndex("crm_pipeline_stages_pipeline_name_uniq").on(table.pipelineId, table.name),
  pipelineOrderIdx: index("crm_pipeline_stages_pipeline_order_idx").on(table.pipelineId, table.orderIndex),
}));

// CRM Deals - Opportunities in pipeline
export const crmDeals = w3suiteSchema.table("crm_deals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  legalEntityId: uuid("legal_entity_id"),
  storeId: uuid("store_id").notNull(),
  ownerUserId: varchar("owner_user_id").notNull(),
  pipelineId: uuid("pipeline_id").notNull().references(() => crmPipelines.id),
  stage: varchar("stage", { length: 100 }).notNull(),
  status: crmDealStatusEnum("status").default('open'),
  leadId: uuid("lead_id").references(() => crmLeads.id),
  campaignId: uuid("campaign_id"),
  sourceChannel: crmInboundChannelEnum("source_channel"), // INBOUND: Inherited from lead
  dealCreationSource: dealCreationSourceEnum("deal_creation_source").default('manual'), // Track how deal was created
  personId: uuid("person_id").notNull(), // Propagated from lead for identity tracking
  customerId: uuid("customer_id"),
  
  // ==================== OUTBOUND CHANNEL TRACKING ====================
  preferredContactChannel: crmOutboundChannelEnum("preferred_contact_channel"), // Primary contact method
  lastContactChannel: crmOutboundChannelEnum("last_contact_channel"), // Last used outbound channel
  lastContactDate: timestamp("last_contact_date"), // When last contacted
  contactHistory: jsonb("contact_history"), // Array of {channel, date, outcome}
  contactChannelsUsed: text("contact_channels_used").array(), // All channels tried
  
  estimatedValue: real("estimated_value"),
  probability: smallint("probability").default(0), // 0-100
  driverId: uuid("driver_id").references(() => drivers.id),
  agingDays: smallint("aging_days").default(0),
  wonAt: timestamp("won_at"),
  lostAt: timestamp("lost_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantPipelineStageStatusIdx: index("crm_deals_tenant_pipeline_stage_status_idx").on(table.tenantId, table.pipelineId, table.stage, table.status),
  personIdIdx: index("crm_deals_person_id_idx").on(table.personId),
  tenantIdIdx: index("crm_deals_tenant_id_idx").on(table.tenantId),
}));

// CRM Interactions - Contact logs audit trail (LEGACY - kept for backward compatibility)
export const crmInteractions = w3suiteSchema.table("crm_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'lead', 'deal', 'customer'
  entityId: uuid("entity_id").notNull(),
  channel: varchar("channel", { length: 50 }),
  direction: crmInteractionDirectionEnum("direction"),
  outcome: text("outcome"),
  durationSeconds: integer("duration_seconds"),
  performedByUserId: uuid("performed_by_user_id"),
  notes: text("notes"),
  payload: jsonb("payload"),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  entityTypeEntityIdOccurredIdx: index("crm_interactions_entity_type_entity_id_occurred_idx").on(table.entityType, table.entityId, table.occurredAt),
  tenantIdIdx: index("crm_interactions_tenant_id_idx").on(table.tenantId),
}));

// ==================== OMNICHANNEL INTERACTIONS SYSTEM ====================
// CRM Omnichannel Interactions - Unified interaction tracking
export const crmOmnichannelInteractions = w3suiteSchema.table("crm_omnichannel_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  
  // Person-centric tracking (unified identity)
  personId: uuid("person_id").notNull(),
  
  // Optional entity links (lead/deal/customer)
  entityType: varchar("entity_type", { length: 50 }), // 'lead', 'deal', 'customer', null
  entityId: uuid("entity_id"),
  
  // Channel information
  channel: omnichannelChannelEnum("channel").notNull(),
  direction: crmInteractionDirectionEnum("direction").notNull(),
  
  // Content
  subject: text("subject"),
  body: text("body"),
  summary: text("summary"), // AI-generated summary
  
  // Status and outcome
  status: interactionStatusEnum("status").default('sent'),
  outcome: text("outcome"),
  outcomeCategory: varchar("outcome_category", { length: 50 }), // 'positive', 'negative', 'neutral', 'follow_up_required'
  
  // Timing
  durationSeconds: integer("duration_seconds"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  scheduledAt: timestamp("scheduled_at"),
  
  // User/agent who performed interaction
  performedByUserId: uuid("performed_by_user_id"),
  performedByAgentType: varchar("performed_by_agent_type", { length: 50 }), // 'human', 'ai_assistant', 'workflow_automation'
  
  // Integration links
  workflowInstanceId: uuid("workflow_instance_id"),
  workflowTemplateId: uuid("workflow_template_id"),
  campaignId: uuid("campaign_id"),
  taskId: uuid("task_id"),
  
  // Channel-specific metadata (JSON)
  metadata: jsonb("metadata"), // { email_thread_id, message_id, social_post_id, call_recording_url, etc. }
  
  // Engagement metrics
  sentimentScore: real("sentiment_score"), // -1.0 to 1.0 (AI-analyzed)
  engagementScore: smallint("engagement_score"), // 0-100
  
  // Attachments count
  attachmentCount: smallint("attachment_count").default(0),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  personOccurredIdx: index("omni_int_person_occurred_idx").on(table.personId, table.occurredAt),
  tenantPersonChannelIdx: index("omni_int_tenant_person_channel_idx").on(table.tenantId, table.personId, table.channel),
  workflowInstanceIdx: index("omni_int_workflow_instance_idx").on(table.workflowInstanceId),
  tenantOccurredIdx: index("omni_int_tenant_occurred_idx").on(table.tenantId, table.occurredAt),
  entityTypeEntityIdIdx: index("omni_int_entity_type_entity_id_idx").on(table.entityType, table.entityId),
}));

// CRM Interaction Attachments
export const crmInteractionAttachments = w3suiteSchema.table("crm_interaction_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  interactionId: uuid("interaction_id").notNull().references(() => crmOmnichannelInteractions.id, { onDelete: 'cascade' }),
  
  // File information
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"), // bytes
  mimeType: varchar("mime_type", { length: 100 }),
  
  // Storage (Object Storage or external URL)
  storagePath: text("storage_path"),
  externalUrl: text("external_url"),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  interactionIdIdx: index("int_attach_interaction_id_idx").on(table.interactionId),
  tenantIdIdx: index("int_attach_tenant_id_idx").on(table.tenantId),
}));

// CRM Interaction Participants (for group conversations)
export const crmInteractionParticipants = w3suiteSchema.table("crm_interaction_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  interactionId: uuid("interaction_id").notNull().references(() => crmOmnichannelInteractions.id, { onDelete: 'cascade' }),
  
  // Participant info
  personId: uuid("person_id"),
  userId: uuid("user_id"), // Internal user (agent/employee)
  participantType: varchar("participant_type", { length: 50 }).notNull(), // 'sender', 'recipient', 'cc', 'bcc', 'mentioned'
  
  // Contact info (if not linked to person)
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  displayName: varchar("display_name", { length: 255 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  interactionIdIdx: index("int_part_interaction_id_idx").on(table.interactionId),
  personIdIdx: index("int_part_person_id_idx").on(table.personId),
  tenantIdIdx: index("int_part_tenant_id_idx").on(table.tenantId),
}));

// ==================== IDENTITY RESOLUTION SYSTEM ====================
// CRM Identity Matches - Candidate matches with confidence scoring
export const crmIdentityMatches = w3suiteSchema.table("crm_identity_matches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  
  // Match candidates
  personIdA: uuid("person_id_a").notNull(),
  personIdB: uuid("person_id_b").notNull(),
  
  // Match information
  matchType: identityMatchTypeEnum("match_type").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(), // 0.00 - 100.00
  matchingFields: jsonb("matching_fields"), // { email: true, phone: true, name: 0.85 }
  
  // Status
  status: identityMatchStatusEnum("status").default('pending'),
  
  // Review information
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  // Metadata
  detectedAt: timestamp("detected_at").defaultNow(),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantPendingIdx: index("id_match_tenant_pending_idx").on(table.tenantId, table.status),
  personAIdx: index("id_match_person_a_idx").on(table.personIdA),
  personBIdx: index("id_match_person_b_idx").on(table.personIdB),
  confidenceIdx: index("id_match_confidence_idx").on(table.confidenceScore),
  // Prevent duplicate matches (A-B same as B-A)
  uniqueMatchIdx: uniqueIndex("id_match_unique_idx").on(table.tenantId, table.personIdA, table.personIdB),
}));

// CRM Identity Events - Audit trail for merge/split operations
export const crmIdentityEvents = w3suiteSchema.table("crm_identity_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  
  // Event type and participants
  eventType: identityEventTypeEnum("event_type").notNull(),
  sourcePersonId: uuid("source_person_id"), // Person being merged/split
  targetPersonId: uuid("target_person_id"), // Target person (for merge)
  
  // Event details
  affectedIdentifiers: jsonb("affected_identifiers"), // Array of { type, value }
  affectedRecords: jsonb("affected_records"), // { leads: [ids], deals: [ids], customers: [ids] }
  
  // Audit
  performedBy: varchar("performed_by").notNull(),
  performedAt: timestamp("performed_at").defaultNow(),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  
  // Rollback support
  canRollback: boolean("can_rollback").default(true),
  rolledBackAt: timestamp("rolled_back_at"),
  rolledBackBy: varchar("rolled_back_by"),
}, (table) => ({
  tenantEventTypeIdx: index("id_event_tenant_type_idx").on(table.tenantId, table.eventType),
  sourcePersonIdx: index("id_event_source_person_idx").on(table.sourcePersonId),
  targetPersonIdx: index("id_event_target_person_idx").on(table.targetPersonId),
  performedAtIdx: index("id_event_performed_at_idx").on(table.performedAt),
}));

// CRM Identity Conflicts - Unresolved conflicts requiring manual review
export const crmIdentityConflicts = w3suiteSchema.table("crm_identity_conflicts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  
  // Conflicting persons
  personIdA: uuid("person_id_a").notNull(),
  personIdB: uuid("person_id_b").notNull(),
  
  // Conflict details
  conflictType: varchar("conflict_type", { length: 100 }).notNull(), // 'consent_mismatch', 'data_inconsistency', 'ambiguous_merge'
  conflictDescription: text("conflict_description"),
  conflictingFields: jsonb("conflicting_fields"), // { field: { valueA, valueB, source } }
  
  // Resolution
  status: varchar("status", { length: 50 }).default('pending'), // 'pending', 'resolved', 'escalated'
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolutionAction: varchar("resolution_action", { length: 100 }), // 'keep_a', 'keep_b', 'merge_manual', 'split'
  resolutionNotes: text("resolution_notes"),
  
  // Priority
  priority: varchar("priority", { length: 20 }).default('medium'), // 'low', 'medium', 'high', 'critical'
  
  // Metadata
  detectedAt: timestamp("detected_at").defaultNow(),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantStatusIdx: index("id_conflict_tenant_status_idx").on(table.tenantId, table.status),
  priorityIdx: index("id_conflict_priority_idx").on(table.priority),
  personAIdx: index("id_conflict_person_a_idx").on(table.personIdA),
  personBIdx: index("id_conflict_person_b_idx").on(table.personIdB),
}));

// CRM Tasks - Activities e to-do
export const crmTasks = w3suiteSchema.table("crm_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  entityType: varchar("entity_type", { length: 50 }), // 'lead', 'deal', 'customer'
  entityId: uuid("entity_id"),
  assignedToUserId: uuid("assigned_to_user_id"),
  taskType: crmTaskTypeEnum("task_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: crmTaskStatusEnum("status").default('pending'),
  priority: crmTaskPriorityEnum("priority").default('medium'),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantAssignedStatusDueIdx: index("crm_tasks_tenant_assigned_status_due_idx").on(table.tenantId, table.assignedToUserId, table.status, table.dueDate),
  tenantIdIdx: index("crm_tasks_tenant_id_idx").on(table.tenantId),
}));

// CRM Customers - B2B/B2C converted customers
export const crmCustomers = w3suiteSchema.table("crm_customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  personId: uuid("person_id").notNull(), // Identity tracking across lead → deal → customer
  customerType: crmCustomerTypeEnum("customer_type").notNull(),
  
  // B2C Fields (persona fisica)
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  fiscalCode: text("fiscal_code"), // Codice Fiscale (16 caratteri)
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  birthDate: date("birth_date"),
  addresses: jsonb("addresses"), // JSONB array of addresses { type, street, city, zip, province, country }
  
  // B2B Fields (azienda)
  companyName: varchar("company_name", { length: 255 }),
  legalForm: crmLegalFormEnum("legal_form"),
  vatNumber: text("vat_number"), // Partita IVA (IT + 11 cifre)
  pecEmail: text("pec_email"), // Email certificata PEC
  sdiCode: varchar("sdi_code", { length: 7 }), // Codice SDI fatturazione elettronica (7 char alphanumeric)
  atecoCode: varchar("ateco_code", { length: 20 }), // Codice attività economica
  primaryContactName: varchar("primary_contact_name", { length: 200 }), // Nome referente principale per B2B
  sedi: jsonb("sedi"), // JSONB array of locations { type, address, city, zip, province }
  secondaryContacts: jsonb("secondary_contacts"), // JSONB array [{ name, role, email, phone }]
  companySize: varchar("company_size", { length: 50 }), // 'micro' (1-9), 'small' (10-49), 'medium' (50-249), 'large' (250+)
  industry: varchar("industry", { length: 255 }), // Settore industriale
  decisionMakers: jsonb("decision_makers"), // JSONB array [{ name, role, email, phone, department }]
  parentCompanyId: uuid("parent_company_id"), // Self-reference per holding/gruppi aziendali
  
  // Common fields
  sourceDealId: uuid("source_deal_id").references(() => crmDeals.id),
  convertedAt: timestamp("converted_at"),
  status: text("status").default('prospect'), // 'active', 'inactive', 'prospect'
  notes: text("notes"),
  
  // Audit fields
  createdBy: varchar("created_by", { length: 255 }),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantPersonIdIdx: index("crm_customers_tenant_person_id_idx").on(table.tenantId, table.personId),
  tenantTypeStatusIdx: index("crm_customers_tenant_type_status_idx").on(table.tenantId, table.customerType, table.status),
  tenantIdIdx: index("crm_customers_tenant_id_idx").on(table.tenantId),
}));

// ==================== CRM PERSON CONSENTS - GDPR AUDIT TRAIL ====================
// Enterprise-grade consent tracking with full audit trail across lead → deal → customer lifecycle
export const crmPersonConsents = w3suiteSchema.table("crm_person_consents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  personId: uuid("person_id").notNull(), // Same person_id across lead/deal/customer for unified consent tracking
  
  // Consent details
  consentType: crmConsentTypeEnum("consent_type").notNull(), // 'privacy_policy', 'marketing', 'profiling', 'third_party'
  status: crmConsentStatusEnum("status").notNull(), // 'granted', 'denied', 'withdrawn', 'pending'
  
  // Timestamps for audit trail
  grantedAt: timestamp("granted_at"), // When consent was granted
  withdrawnAt: timestamp("withdrawn_at"), // When consent was withdrawn (if applicable)
  expiresAt: timestamp("expires_at"), // Optional expiry date for consent
  
  // Source tracking - where consent originated
  source: varchar("source", { length: 100 }), // 'campaign', 'customer_modal', 'api', 'web_form', 'import'
  sourceEntityType: varchar("source_entity_type", { length: 50 }), // 'lead', 'deal', 'customer', 'campaign'
  sourceEntityId: uuid("source_entity_id"), // ID of the source entity (campaign_id, lead_id, etc.)
  campaignId: uuid("campaign_id").references(() => crmCampaigns.id), // If originated from a campaign
  
  // Audit fields - who made the change
  updatedBy: varchar("updated_by", { length: 255 }), // User ID who last updated this consent
  updatedByName: varchar("updated_by_name", { length: 255 }), // User name for display
  ipAddress: varchar("ip_address", { length: 45 }), // IP address of consent action (IPv4/IPv6)
  userAgent: text("user_agent"), // Browser/device info
  
  // Change log - complete history of all modifications
  auditTrail: jsonb("audit_trail"), // Array of { timestamp, action, status, user, reason, metadata }
  
  // Additional metadata
  consentMethod: varchar("consent_method", { length: 100 }), // 'checkbox', 'toggle', 'api', 'double_opt_in'
  language: varchar("language", { length: 10 }), // Language code when consent was given (it, en, etc.)
  notes: text("notes"), // Optional notes about this consent
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Primary lookup index - get all consents for a person
  tenantPersonIdx: index("crm_person_consents_tenant_person_idx").on(table.tenantId, table.personId),
  
  // Consent type lookup - find all people with specific consent type
  tenantTypeStatusIdx: index("crm_person_consents_tenant_type_status_idx").on(table.tenantId, table.consentType, table.status),
  
  // Campaign attribution - which campaigns generated consents
  campaignIdx: index("crm_person_consents_campaign_idx").on(table.campaignId),
  
  // Expiry tracking - find expiring consents
  expiresAtIdx: index("crm_person_consents_expires_at_idx").on(table.expiresAt),
  
  // Audit tracking - who modified consents
  updatedByIdx: index("crm_person_consents_updated_by_idx").on(table.updatedBy),
  
  // Composite unique constraint - one consent type per person (latest record wins)
  tenantPersonTypeUniq: uniqueIndex("crm_person_consents_tenant_person_type_uniq").on(table.tenantId, table.personId, table.consentType),
  
  // Tenant isolation
  tenantIdIdx: index("crm_person_consents_tenant_id_idx").on(table.tenantId),
}));

// CRM Orders - Sales transactions (mock data until POS integration)
export const crmOrders = w3suiteSchema.table("crm_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  customerId: uuid("customer_id").notNull().references(() => crmCustomers.id),
  orderNumber: varchar("order_number", { length: 100 }).notNull(),
  orderDate: timestamp("order_date").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default('EUR'),
  status: varchar("status", { length: 50 }).notNull().default('completed'),
  paymentMethod: varchar("payment_method", { length: 100 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default('paid'),
  shippingAddress: jsonb("shipping_address"),
  billingAddress: jsonb("billing_address"),
  items: jsonb("items").notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default('0'),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default('0'),
  shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 }).default('0'),
  notes: text("notes"),
  storeId: uuid("store_id"),
  channelType: varchar("channel_type", { length: 50 }),
  createdBy: varchar("created_by", { length: 255 }),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantCustomerDateIdx: index("crm_orders_tenant_customer_date_idx").on(table.tenantId, table.customerId, table.orderDate),
  tenantOrderNumberUniq: uniqueIndex("crm_orders_tenant_order_number_uniq").on(table.tenantId, table.orderNumber),
  tenantIdIdx: index("crm_orders_tenant_id_idx").on(table.tenantId),
}));

// CRM Customer Documents - Document management with Object Storage
export const crmCustomerDocuments = w3suiteSchema.table("crm_customer_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid("customer_id").notNull().references(() => crmCustomers.id, { onDelete: 'cascade' }),
  
  // Document metadata
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'Contratti', 'Fatture', 'Documenti', 'Preventivi', 'Altro'
  fileType: varchar("file_type", { length: 50 }).notNull(), // pdf, jpg, png, docx, etc.
  fileSize: integer("file_size").notNull(), // bytes
  
  // Object Storage reference
  objectPath: varchar("object_path", { length: 500 }).notNull(), // path in object storage
  
  // Version tracking
  version: integer("version").default(1),
  previousVersionId: uuid("previous_version_id"),
  
  // Metadata
  description: text("description"),
  tags: jsonb("tags"), // Array of tags
  
  // Audit
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantCustomerIdx: index("crm_customer_documents_tenant_customer_idx").on(table.tenantId, table.customerId),
  categoryIdx: index("crm_customer_documents_category_idx").on(table.category),
  tenantIdIdx: index("crm_customer_documents_tenant_id_idx").on(table.tenantId),
}));

// CRM Customer Notes - Internal team notes with tags and pinning
export const crmCustomerNotes = w3suiteSchema.table("crm_customer_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid("customer_id").notNull().references(() => crmCustomers.id, { onDelete: 'cascade' }),
  
  // Note content
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").default('[]'), // Array of tag strings
  
  // Organization
  isPinned: boolean("is_pinned").default(false),
  
  // Audit
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantCustomerIdx: index("crm_customer_notes_tenant_customer_idx").on(table.tenantId, table.customerId),
  pinnedIdx: index("crm_customer_notes_pinned_idx").on(table.isPinned),
  createdAtIdx: index("crm_customer_notes_created_at_idx").on(table.createdAt),
  tenantIdIdx: index("crm_customer_notes_tenant_id_idx").on(table.tenantId),
}));

// CRM Campaign Pipeline Links - N:N relationships
export const crmCampaignPipelineLinks = w3suiteSchema.table("crm_campaign_pipeline_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").notNull().references(() => crmCampaigns.id),
  pipelineId: uuid("pipeline_id").notNull().references(() => crmPipelines.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  campaignPipelineUniq: uniqueIndex("crm_campaign_pipeline_links_campaign_pipeline_uniq").on(table.campaignId, table.pipelineId),
}));

// CRM Lead Attributions - Multi-touch attribution
export const crmLeadAttributions = w3suiteSchema.table("crm_lead_attributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid("lead_id").notNull().references(() => crmLeads.id),
  campaignId: uuid("campaign_id").notNull().references(() => crmCampaigns.id),
  touchpointOrder: smallint("touchpoint_order").notNull(),
  attributionWeight: real("attribution_weight"),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  leadTouchpointIdx: index("crm_lead_attributions_lead_touchpoint_idx").on(table.leadId, table.touchpointOrder),
}));

// CRM Source Mappings - External ID mapping
export const crmSourceMappings = w3suiteSchema.table("crm_source_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  sourceType: crmSourceTypeEnum("source_type").notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  legalEntityId: uuid("legal_entity_id"),
  storeId: uuid("store_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantSourceExternalUniq: uniqueIndex("crm_source_mappings_tenant_source_external_uniq").on(table.tenantId, table.sourceType, table.externalId),
  tenantIdIdx: index("crm_source_mappings_tenant_id_idx").on(table.tenantId),
}));

// CRM Email Templates
export const crmEmailTemplates = w3suiteSchema.table("crm_email_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  variables: jsonb("variables"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("crm_email_templates_tenant_id_idx").on(table.tenantId),
}));

// CRM SMS Templates
export const crmSmsTemplates = w3suiteSchema.table("crm_sms_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  body: text("body"), // max 160 char validated in app
  variables: jsonb("variables"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("crm_sms_templates_tenant_id_idx").on(table.tenantId),
}));

// CRM WhatsApp Templates
export const crmWhatsappTemplates = w3suiteSchema.table("crm_whatsapp_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  templateId: varchar("template_id", { length: 255 }), // WhatsApp approved template ID
  language: varchar("language", { length: 5 }),
  headerText: text("header_text"),
  bodyText: text("body_text"),
  footerText: text("footer_text"),
  buttons: jsonb("buttons"),
  variables: jsonb("variables"),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("crm_whatsapp_templates_tenant_id_idx").on(table.tenantId),
}));

// CRM Customer Segments
export const crmCustomerSegments = w3suiteSchema.table("crm_customer_segments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  filterRules: jsonb("filter_rules"),
  calculatedCount: integer("calculated_count").default(0),
  isDynamic: boolean("is_dynamic").default(true),
  lastCalculatedAt: timestamp("last_calculated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("crm_customer_segments_tenant_id_idx").on(table.tenantId),
}));

// CRM Automation Rules
export const crmAutomationRules = w3suiteSchema.table("crm_automation_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  triggerEvent: varchar("trigger_event", { length: 255 }).notNull(),
  conditions: jsonb("conditions"),
  actions: jsonb("actions"),
  isActive: boolean("is_active").default(true),
  executionCount: integer("execution_count").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdIdx: index("crm_automation_rules_tenant_id_idx").on(table.tenantId),
}));

// CRM Saved Views
export const crmSavedViews = w3suiteSchema.table("crm_saved_views", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  viewName: varchar("view_name", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  filters: jsonb("filters"),
  sortConfig: jsonb("sort_config"),
  columnsConfig: jsonb("columns_config"),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantUserIdx: index("crm_saved_views_tenant_user_idx").on(table.tenantId, table.userId),
}));

// ==================== UTM TRACKING & ANALYTICS TABLES ====================

// CRM Campaign UTM Links - Generated UTM links for campaign channels
export const crmCampaignUtmLinks = w3suiteSchema.table("crm_campaign_utm_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  campaignId: uuid("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: 'cascade' }),
  channelId: varchar("channel_id", { length: 100 }).notNull(), // 'facebook_ads', 'instagram', 'google_ads', etc.
  channelName: varchar("channel_name", { length: 200 }).notNull(), // Human-readable name
  generatedUrl: text("generated_url").notNull(), // Full UTM link
  utmSource: varchar("utm_source", { length: 255 }).notNull(),
  utmMedium: varchar("utm_medium", { length: 255 }).notNull(),
  utmCampaign: varchar("utm_campaign", { length: 255 }).notNull(),
  
  // Analytics tracking
  clicks: integer("clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  conversions: integer("conversions").default(0),
  revenue: real("revenue").default(0),
  lastClickedAt: timestamp("last_clicked_at"),
  lastConversionAt: timestamp("last_conversion_at"),
  
  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index("crm_campaign_utm_links_tenant_id_idx").on(table.tenantId),
  campaignIdIdx: index("crm_campaign_utm_links_campaign_id_idx").on(table.campaignId),
  channelIdIdx: index("crm_campaign_utm_links_channel_id_idx").on(table.channelId),
  campaignChannelUniq: uniqueIndex("crm_campaign_utm_links_campaign_channel_uniq").on(table.campaignId, table.channelId),
}));

// CRM Lead Notifications - Real-time notifications for high-priority leads
export const crmLeadNotifications = w3suiteSchema.table("crm_lead_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadId: uuid("lead_id").notNull().references(() => crmLeads.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // Recipient
  
  // Notification content
  notificationType: varchar("notification_type", { length: 100 }).notNull(), // 'hot_lead', 'high_score', 'ai_insight', 'conversion_ready'
  priority: notificationPriorityEnum("priority").default('medium').notNull(), // low, medium, high, critical
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").default({}), // Additional data (leadScore, aiInsights, etc.)
  
  // Actions
  actionUrl: varchar("action_url", { length: 500 }), // Deep link to lead detail
  actionLabel: varchar("action_label", { length: 100 }), // "View Lead", "Contact Now"
  
  // Status
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index("crm_lead_notifications_tenant_id_idx").on(table.tenantId),
  leadIdIdx: index("crm_lead_notifications_lead_id_idx").on(table.leadId),
  userIdIdx: index("crm_lead_notifications_user_id_idx").on(table.userId),
  userUnreadIdx: index("crm_lead_notifications_user_unread_idx").on(table.userId, table.isRead),
  createdAtIdx: index("crm_lead_notifications_created_at_idx").on(table.createdAt.desc()),
}));

// GTM Event Log - Audit trail for GTM events sent
export const gtmEventLog = w3suiteSchema.table("gtm_event_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadId: uuid("lead_id").references(() => crmLeads.id, { onDelete: 'cascade' }), // Optional: linked to lead
  storeId: uuid("store_id").references(() => stores.id), // Store context for tracking IDs
  
  // Event details
  eventType: varchar("event_type", { length: 100 }).notNull(), // 'lead_created', 'lead_converted', 'deal_won', 'form_submit'
  eventName: varchar("event_name", { length: 255 }).notNull(), // GTM event name
  eventData: jsonb("event_data").notNull(), // Full event payload
  
  // Tracking IDs
  ga4MeasurementId: varchar("ga4_measurement_id", { length: 50 }), // GA4 Measurement ID
  googleAdsConversionId: varchar("google_ads_conversion_id", { length: 50 }), // Google Ads Conversion ID
  googleAdsConversionLabel: varchar("google_ads_conversion_label", { length: 100 }), // Google Ads Conversion Label
  facebookPixelId: varchar("facebook_pixel_id", { length: 50 }), // Facebook Pixel ID
  
  // Enhanced Conversions
  enhancedConversionData: jsonb("enhanced_conversion_data"), // Hashed email/phone/address for Enhanced Conversions
  userAgent: text("user_agent"), // Client user agent
  clientIpAddress: varchar("client_ip_address", { length: 45 }), // Client IP for geo-targeting
  
  // Response tracking
  success: boolean("success").default(false).notNull(),
  httpStatusCode: smallint("http_status_code"), // HTTP response code
  responseBody: jsonb("response_body"), // API response
  errorMessage: text("error_message"), // Error details if failed
  
  // Timing
  responseTimeMs: integer("response_time_ms"), // Response time in milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index("gtm_event_log_tenant_id_idx").on(table.tenantId),
  leadIdIdx: index("gtm_event_log_lead_id_idx").on(table.leadId),
  storeIdIdx: index("gtm_event_log_store_id_idx").on(table.storeId),
  eventTypeIdx: index("gtm_event_log_event_type_idx").on(table.eventType),
  successIdx: index("gtm_event_log_success_idx").on(table.success),
  createdAtIdx: index("gtm_event_log_created_at_idx").on(table.createdAt.desc()),
}));

// ==================== CRM INSERT SCHEMAS ====================

export const insertCrmPersonIdentitySchema = createInsertSchema(crmPersonIdentities).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmPersonIdentity = z.infer<typeof insertCrmPersonIdentitySchema>;
export type CrmPersonIdentity = typeof crmPersonIdentities.$inferSelect;

export const insertCrmCampaignSchema = createInsertSchema(crmCampaigns).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  totalLeads: true,
  totalDeals: true,
  totalRevenue: true
});
export type InsertCrmCampaign = z.infer<typeof insertCrmCampaignSchema>;
export type CrmCampaign = typeof crmCampaigns.$inferSelect;

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;

export const insertLeadStatusSchema = createInsertSchema(leadStatuses).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertLeadStatus = z.infer<typeof insertLeadStatusSchema>;
export type LeadStatus = typeof leadStatuses.$inferSelect;

export const insertLeadStatusHistorySchema = createInsertSchema(leadStatusHistory).omit({ 
  id: true, 
  changedAt: true
});
export type InsertLeadStatusHistory = z.infer<typeof insertLeadStatusHistorySchema>;
export type LeadStatusHistory = typeof leadStatusHistory.$inferSelect;

export const insertCrmPipelineSchema = createInsertSchema(crmPipelines).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmPipeline = z.infer<typeof insertCrmPipelineSchema>;
export type CrmPipeline = typeof crmPipelines.$inferSelect;

export const insertCrmPipelineSettingsSchema = createInsertSchema(crmPipelineSettings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmPipelineSettings = z.infer<typeof insertCrmPipelineSettingsSchema>;
export type CrmPipelineSettings = typeof crmPipelineSettings.$inferSelect;

export const insertCrmPipelineStagePlaybookSchema = createInsertSchema(crmPipelineStagePlaybooks).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmPipelineStagePlaybook = z.infer<typeof insertCrmPipelineStagePlaybookSchema>;
export type CrmPipelineStagePlaybook = typeof crmPipelineStagePlaybooks.$inferSelect;

export const insertCrmPipelineWorkflowSchema = createInsertSchema(crmPipelineWorkflows).omit({ 
  id: true, 
  assignedAt: true
});
export type InsertCrmPipelineWorkflow = z.infer<typeof insertCrmPipelineWorkflowSchema>;
export type CrmPipelineWorkflow = typeof crmPipelineWorkflows.$inferSelect;

export const insertCrmPipelineStageSchema = createInsertSchema(crmPipelineStages).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmPipelineStage = z.infer<typeof insertCrmPipelineStageSchema>;
export type CrmPipelineStage = typeof crmPipelineStages.$inferSelect;

export const insertCrmDealSchema = createInsertSchema(crmDeals).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  agingDays: true
});
export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type CrmDeal = typeof crmDeals.$inferSelect;

export const insertCrmInteractionSchema = createInsertSchema(crmInteractions).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmInteraction = z.infer<typeof insertCrmInteractionSchema>;
export type CrmInteraction = typeof crmInteractions.$inferSelect;

// ==================== OMNICHANNEL INTERACTIONS INSERT SCHEMAS ====================
export const insertCrmOmnichannelInteractionSchema = createInsertSchema(crmOmnichannelInteractions).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmOmnichannelInteraction = z.infer<typeof insertCrmOmnichannelInteractionSchema>;
export type CrmOmnichannelInteraction = typeof crmOmnichannelInteractions.$inferSelect;

export const insertCrmInteractionAttachmentSchema = createInsertSchema(crmInteractionAttachments).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmInteractionAttachment = z.infer<typeof insertCrmInteractionAttachmentSchema>;
export type CrmInteractionAttachment = typeof crmInteractionAttachments.$inferSelect;

export const insertCrmInteractionParticipantSchema = createInsertSchema(crmInteractionParticipants).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmInteractionParticipant = z.infer<typeof insertCrmInteractionParticipantSchema>;
export type CrmInteractionParticipant = typeof crmInteractionParticipants.$inferSelect;

// ==================== IDENTITY RESOLUTION INSERT SCHEMAS ====================
export const insertCrmIdentityMatchSchema = createInsertSchema(crmIdentityMatches).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmIdentityMatch = z.infer<typeof insertCrmIdentityMatchSchema>;
export type CrmIdentityMatch = typeof crmIdentityMatches.$inferSelect;

export const insertCrmIdentityEventSchema = createInsertSchema(crmIdentityEvents).omit({ 
  id: true
});
export type InsertCrmIdentityEvent = z.infer<typeof insertCrmIdentityEventSchema>;
export type CrmIdentityEvent = typeof crmIdentityEvents.$inferSelect;

export const insertCrmIdentityConflictSchema = createInsertSchema(crmIdentityConflicts).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmIdentityConflict = z.infer<typeof insertCrmIdentityConflictSchema>;
export type CrmIdentityConflict = typeof crmIdentityConflicts.$inferSelect;

export const insertCrmTaskSchema = createInsertSchema(crmTasks).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmTask = z.infer<typeof insertCrmTaskSchema>;
export type CrmTask = typeof crmTasks.$inferSelect;

export const insertCrmCustomerSchema = createInsertSchema(crmCustomers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmCustomer = z.infer<typeof insertCrmCustomerSchema>;
export type CrmCustomer = typeof crmCustomers.$inferSelect;

export const insertCrmOrderSchema = createInsertSchema(crmOrders).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmOrder = z.infer<typeof insertCrmOrderSchema>;
export type CrmOrder = typeof crmOrders.$inferSelect;

export const insertCrmCampaignPipelineLinkSchema = createInsertSchema(crmCampaignPipelineLinks).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmCampaignPipelineLink = z.infer<typeof insertCrmCampaignPipelineLinkSchema>;
export type CrmCampaignPipelineLink = typeof crmCampaignPipelineLinks.$inferSelect;

export const insertCrmLeadAttributionSchema = createInsertSchema(crmLeadAttributions).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCrmLeadAttribution = z.infer<typeof insertCrmLeadAttributionSchema>;
export type CrmLeadAttribution = typeof crmLeadAttributions.$inferSelect;

export const insertCrmSourceMappingSchema = createInsertSchema(crmSourceMappings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmSourceMapping = z.infer<typeof insertCrmSourceMappingSchema>;
export type CrmSourceMapping = typeof crmSourceMappings.$inferSelect;

export const insertCrmEmailTemplateSchema = createInsertSchema(crmEmailTemplates).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmEmailTemplate = z.infer<typeof insertCrmEmailTemplateSchema>;
export type CrmEmailTemplate = typeof crmEmailTemplates.$inferSelect;

export const insertCrmSmsTemplateSchema = createInsertSchema(crmSmsTemplates).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmSmsTemplate = z.infer<typeof insertCrmSmsTemplateSchema>;
export type CrmSmsTemplate = typeof crmSmsTemplates.$inferSelect;

export const insertCrmWhatsappTemplateSchema = createInsertSchema(crmWhatsappTemplates).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmWhatsappTemplate = z.infer<typeof insertCrmWhatsappTemplateSchema>;
export type CrmWhatsappTemplate = typeof crmWhatsappTemplates.$inferSelect;

export const insertCrmCustomerSegmentSchema = createInsertSchema(crmCustomerSegments).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  calculatedCount: true
});
export type InsertCrmCustomerSegment = z.infer<typeof insertCrmCustomerSegmentSchema>;
export type CrmCustomerSegment = typeof crmCustomerSegments.$inferSelect;

export const insertCrmAutomationRuleSchema = createInsertSchema(crmAutomationRules).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  executionCount: true
});
export type InsertCrmAutomationRule = z.infer<typeof insertCrmAutomationRuleSchema>;
export type CrmAutomationRule = typeof crmAutomationRules.$inferSelect;

export const insertCrmSavedViewSchema = createInsertSchema(crmSavedViews).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});
export type InsertCrmSavedView = z.infer<typeof insertCrmSavedViewSchema>;
export type CrmSavedView = typeof crmSavedViews.$inferSelect;

// ==================== UTM TRACKING & ANALYTICS INSERT SCHEMAS ====================

export const insertCrmCampaignUtmLinkSchema = createInsertSchema(crmCampaignUtmLinks).omit({
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
export type InsertCrmCampaignUtmLink = z.infer<typeof insertCrmCampaignUtmLinkSchema>;
export type CrmCampaignUtmLink = typeof crmCampaignUtmLinks.$inferSelect;

export const insertCrmLeadNotificationSchema = createInsertSchema(crmLeadNotifications).omit({
  id: true,
  isRead: true,
  readAt: true,
  dismissedAt: true,
  createdAt: true
});
export type InsertCrmLeadNotification = z.infer<typeof insertCrmLeadNotificationSchema>;
export type CrmLeadNotification = typeof crmLeadNotifications.$inferSelect;

export const insertGtmEventLogSchema = createInsertSchema(gtmEventLog).omit({
  id: true,
  success: true,
  httpStatusCode: true,
  responseBody: true,
  errorMessage: true,
  responseTimeMs: true,
  createdAt: true
});
export type InsertGtmEventLog = z.infer<typeof insertGtmEventLogSchema>;
export type GtmEventLog = typeof gtmEventLog.$inferSelect;

// ==================== CUSTOMER 360° INSERT SCHEMAS ====================

export const insertCrmCustomerDocumentSchema = createInsertSchema(crmCustomerDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertCrmCustomerDocument = z.infer<typeof insertCrmCustomerDocumentSchema>;
export type CrmCustomerDocument = typeof crmCustomerDocuments.$inferSelect;

export const insertCrmCustomerNoteSchema = createInsertSchema(crmCustomerNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertCrmCustomerNote = z.infer<typeof insertCrmCustomerNoteSchema>;
export type CrmCustomerNote = typeof crmCustomerNotes.$inferSelect;

// ==================== VOIP SYSTEM (8 TABLES - API v2 SPEC) ====================

// 0) voip_tenant_config - Per-tenant EDGVoIP API configuration
export const voipTenantConfig = w3suiteSchema.table("voip_tenant_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }).unique(),
  
  // EDGVoIP API v2 Configuration
  tenantExternalId: varchar("tenant_external_id", { length: 255 }).notNull(), // Custom identifier for edgvoip
  apiKey: text("api_key").notNull(), // Encrypted: sk_live_...
  apiKeyLastFour: varchar("api_key_last_four", { length: 4 }), // Last 4 chars for display
  webhookSecret: text("webhook_secret"), // For HMAC verification
  apiBaseUrl: varchar("api_base_url", { length: 255 }).default('https://edgvoip.it/api/v2/voip'),
  
  // Scopes and permissions
  scopes: text("scopes").array(), // ['voip:read', 'voip:write', 'trunks:sync', etc.]
  
  // Connection status
  enabled: boolean("enabled").default(true).notNull(),
  connectionStatus: voipConnectionStatusEnum("connection_status").default('unknown'),
  lastConnectionTest: timestamp("last_connection_test"),
  connectionError: text("connection_error"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("voip_tenant_config_tenant_idx").on(table.tenantId),
  uniqueIndex("voip_tenant_config_external_id_unique").on(table.tenantExternalId),
]);

export const insertVoipTenantConfigSchema = createInsertSchema(voipTenantConfig).omit({
  id: true,
  apiKeyLastFour: true,
  connectionStatus: true,
  lastConnectionTest: true,
  connectionError: true,
  createdAt: true,
  updatedAt: true
});
export const updateVoipTenantConfigSchema = insertVoipTenantConfigSchema.omit({ tenantId: true }).partial();
export type InsertVoipTenantConfig = z.infer<typeof insertVoipTenantConfigSchema>;
export type UpdateVoipTenantConfig = z.infer<typeof updateVoipTenantConfigSchema>;
export type VoipTenantConfig = typeof voipTenantConfig.$inferSelect;

// 1) voip_trunks - Trunk SIP per store/tenant (Full CRUD + Sync with EDGVoIP API v2)
export const voipTrunks = w3suiteSchema.table("voip_trunks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  
  // API v2 External ID (UUID for bidirectional sync)
  externalId: uuid("external_id"), // UUID from EDGVoIP API v2
  
  // Legacy sync metadata
  edgvoipTrunkId: varchar("edgvoip_trunk_id", { length: 255 }).unique(), // Legacy external trunk ID
  syncSource: varchar("sync_source", { length: 20 }).default('w3suite').notNull(), // w3suite|edgvoip|local
  syncStatus: voipSyncStatusEnum("sync_status").default('local_only'),
  lastSyncAt: timestamp("last_sync_at"),
  
  // Basic trunk info
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 100 }),
  status: voipTrunkStatusEnum("status").default('active').notNull(),
  registrationStatus: voipRegistrationStatusEnum("registration_status").default('unknown'),
  
  // API v2: SIP Configuration (JSONB)
  sipConfig: jsonb("sip_config"), // {host, port, transport, username, password, register, ...}
  
  // API v2: DID Configuration (JSONB)
  didConfig: jsonb("did_config"), // {number, country_code, area_code, local_number, ...}
  
  // API v2: Security Configuration (JSONB)
  security: jsonb("security"), // {encryption, authentication, acl, rate_limit}
  
  // API v2: GDPR Configuration (JSONB)
  gdpr: jsonb("gdpr"), // {data_retention_days, recording_consent_required, ...}
  
  // API v2: Codec preferences (stored as JSONB to match database)
  codecPreferences: jsonb("codec_preferences").$type<string[]>(), // ['PCMU', 'PCMA', 'G729']
  
  // Legacy fields (for backward compatibility)
  host: varchar("host", { length: 255 }),
  port: integer("port").default(5060),
  protocol: voipProtocolEnum("protocol").default('udp'),
  didRange: varchar("did_range", { length: 100 }),
  maxChannels: integer("max_channels").default(10).notNull(),
  currentChannels: integer("current_channels").default(0).notNull(),
  webhookToken: varchar("webhook_token", { length: 64 }),
  
  // AI Voice Agent configuration
  aiAgentEnabled: boolean("ai_agent_enabled").default(false).notNull(),
  aiAgentRef: varchar("ai_agent_ref", { length: 100 }),
  aiTimePolicy: jsonb("ai_time_policy"),
  aiFailoverExtension: varchar("ai_failover_extension", { length: 20 }),
  
  // edgvoip AI Config Sync tracking
  edgvoipAiSyncedAt: timestamp("edgvoip_ai_synced_at"),
  edgvoipAiSyncStatus: varchar("edgvoip_ai_sync_status", { length: 50 }),
  edgvoipAiSyncError: text("edgvoip_ai_sync_error"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("voip_trunks_tenant_idx").on(table.tenantId),
  index("voip_trunks_store_idx").on(table.storeId),
  index("voip_trunks_edgvoip_id_idx").on(table.edgvoipTrunkId),
  index("voip_trunks_external_id_idx").on(table.externalId),
  index("voip_trunks_sync_status_idx").on(table.syncStatus),
  uniqueIndex("voip_trunks_tenant_store_name_unique").on(table.tenantId, table.storeId, table.name),
  uniqueIndex("voip_trunks_external_id_unique").on(table.tenantId, table.externalId),
]);

export const insertVoipTrunkSchema = createInsertSchema(voipTrunks).omit({
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
export const updateVoipTrunkSchema = insertVoipTrunkSchema.omit({ tenantId: true, storeId: true }).partial();
export type InsertVoipTrunk = z.infer<typeof insertVoipTrunkSchema>;
export type UpdateVoipTrunk = z.infer<typeof updateVoipTrunkSchema>;
export type VoipTrunk = typeof voipTrunks.$inferSelect;

// 2) voip_extensions - Interni del tenant (1:1 con users) - Full CRUD + Sync with API v2
export const voipExtensions = w3suiteSchema.table("voip_extensions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'set null' }), // API v2: Store reference
  domainId: uuid("domain_id"), // Legacy: domain_id (optional now)
  
  // API v2 External ID (UUID for bidirectional sync)
  externalId: uuid("external_id"), // UUID from EDGVoIP API v2
  
  // Basic extension info
  extension: varchar("extension", { length: 20 }).notNull(),
  sipUsername: varchar("sip_username", { length: 100 }).notNull(),
  sipPassword: text("sip_password").notNull(), // Encrypted at rest
  displayName: varchar("display_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  
  // API v2: Extension type
  type: voipExtensionTypeEnum("type").default('user'),
  
  // API v2: Settings (JSONB)
  settings: jsonb("settings"), // {voicemail_enabled, call_forwarding, recording}
  
  // FreeSWITCH Best Practice Fields
  sipServer: varchar("sip_server", { length: 255 }).default('sip.edgvoip.it'),
  sipPort: integer("sip_port").default(5060),
  wsPort: integer("ws_port").default(7443),
  transport: varchar("transport", { length: 20 }).default('WSS'),
  
  // Caller ID Configuration
  callerIdName: varchar("caller_id_name", { length: 100 }),
  callerIdNumber: varchar("caller_id_number", { length: 50 }),
  
  // Codec Configuration
  allowedCodecs: varchar("allowed_codecs", { length: 255 }).default('OPUS,G722,PCMU,PCMA'),
  
  // Security & Authentication
  authRealm: varchar("auth_realm", { length: 255 }),
  registrationExpiry: integer("registration_expiry").default(3600),
  maxConcurrentCalls: integer("max_concurrent_calls").default(4),
  
  // Call Features (legacy - now in settings JSONB)
  voicemailEnabled: boolean("voicemail_enabled").default(true).notNull(),
  voicemailEmail: varchar("voicemail_email", { length: 255 }),
  voicemailPin: varchar("voicemail_pin", { length: 20 }),
  recordingEnabled: boolean("recording_enabled").default(false).notNull(),
  dndEnabled: boolean("dnd_enabled").default(false).notNull(),
  forwardOnBusy: varchar("forward_on_busy", { length: 100 }),
  forwardOnNoAnswer: varchar("forward_on_no_answer", { length: 100 }),
  forwardUnconditional: varchar("forward_unconditional", { length: 100 }),
  
  // Registration Status (API v2)
  registrationStatus: voipRegistrationStatusEnum("registration_status").default('unknown'),
  lastRegistration: timestamp("last_registration"),
  ipAddress: varchar("ip_address", { length: 50 }),
  
  // Sync Metadata
  edgvoipExtensionId: varchar("edgvoip_extension_id", { length: 100 }),
  syncSource: varchar("sync_source", { length: 20 }).default('w3suite').notNull(),
  syncStatus: voipSyncStatusEnum("sync_status").default('local_only'),
  lastSyncAt: timestamp("last_sync_at"),
  syncErrorMessage: text("sync_error_message"),
  
  status: voipExtensionStatusEnum("status").default('active').notNull(), // ACTUAL DB: status enum
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("voip_extensions_tenant_idx").on(table.tenantId),
  index("voip_extensions_user_idx").on(table.userId),
  index("voip_extensions_store_idx").on(table.storeId),
  index("voip_extensions_domain_idx").on(table.domainId),
  index("voip_extensions_external_id_idx").on(table.externalId),
  index("voip_extensions_sync_status_idx").on(table.syncStatus),
  index("voip_extensions_type_idx").on(table.type),
  uniqueIndex("voip_extensions_tenant_extension_unique").on(table.tenantId, table.extension),
  uniqueIndex("voip_extensions_domain_extension_unique").on(table.domainId, table.extension),
  uniqueIndex("voip_extensions_domain_sip_username_unique").on(table.domainId, table.sipUsername),
  uniqueIndex("voip_extensions_user_unique").on(table.userId),
  uniqueIndex("voip_extensions_edgvoip_id_unique").on(table.tenantId, table.edgvoipExtensionId),
  uniqueIndex("voip_extensions_external_id_unique").on(table.tenantId, table.externalId),
]);

export const insertVoipExtensionSchema = createInsertSchema(voipExtensions).omit({ 
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
  userId: z.string().optional(),
  storeId: z.string().uuid("Invalid store ID").optional(),
  domainId: z.string().uuid("Invalid domain ID").optional(),
  extension: z.string().regex(/^\d{3,6}$/, "Extension must be 3-6 digits"),
  sipUsername: z.string().min(1, "SIP username is required"),
  sipPassword: z.string().min(16, "SIP password must be at least 16 characters"),
  type: z.enum(['user', 'queue', 'conference']).optional(),
  transport: z.enum(['UDP', 'TCP', 'TLS', 'WS', 'WSS']).optional(),
  allowedCodecs: z.string().optional(),
  callerIdNumber: z.string().regex(/^\+\d{7,15}$/, "Must be E.164 format").optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});
export const updateVoipExtensionSchema = insertVoipExtensionSchema.omit({ 
  tenantId: true, 
  userId: true, 
  domainId: true, 
  extension: true,
  sipPassword: true
}).partial();
export type InsertVoipExtension = z.infer<typeof insertVoipExtensionSchema>;
export type UpdateVoipExtension = z.infer<typeof updateVoipExtensionSchema>;
export type VoipExtension = typeof voipExtensions.$inferSelect;

// 3.1) voip_extension_store_access - Junction table: which extensions can call from which stores
export const voipExtensionStoreAccess = w3suiteSchema.table("voip_extension_store_access", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  extensionId: uuid("extension_id").notNull().references(() => voipExtensions.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  canCallOutbound: boolean("can_call_outbound").default(true).notNull(), // Can make outbound calls from this store
  canReceiveInbound: boolean("can_receive_inbound").default(true).notNull(), // Can receive inbound calls to this store's DIDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("voip_ext_store_access_tenant_idx").on(table.tenantId),
  index("voip_ext_store_access_extension_idx").on(table.extensionId),
  index("voip_ext_store_access_store_idx").on(table.storeId),
  uniqueIndex("voip_ext_store_access_unique").on(table.extensionId, table.storeId), // Prevent duplicates
]);

export const insertVoipExtensionStoreAccessSchema = createInsertSchema(voipExtensionStoreAccess).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  extensionId: z.string().uuid("Invalid extension ID"),
  storeId: z.string().uuid("Invalid store ID"),
});
export const updateVoipExtensionStoreAccessSchema = insertVoipExtensionStoreAccessSchema.omit({ tenantId: true, extensionId: true, storeId: true }).partial();
export type InsertVoipExtensionStoreAccess = z.infer<typeof insertVoipExtensionStoreAccessSchema>;
export type UpdateVoipExtensionStoreAccess = z.infer<typeof updateVoipExtensionStoreAccessSchema>;
export type VoipExtensionStoreAccess = typeof voipExtensionStoreAccess.$inferSelect;

// 7) voip_cdr - Mirror CDR per report KPI (Enhanced for API v2)
export const voipCdrs = w3suiteSchema.table("voip_cdrs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'set null' }),
  
  // API v2 identifiers
  edgvoipCallId: varchar("edgvoip_call_id", { length: 255 }), // External call ID from EDGVoIP
  callUuid: varchar("call_uuid", { length: 255 }), // FreeSWITCH call UUID
  
  // Legacy identifiers
  sipDomain: varchar("sip_domain", { length: 255 }), // Made optional for API v2
  callId: varchar("call_id", { length: 255 }), // Legacy call ID
  
  // Call direction and parties
  direction: voipCallDirectionEnum("direction").notNull(),
  callerNumber: varchar("caller_number", { length: 100 }), // API v2 caller
  calledNumber: varchar("called_number", { length: 100 }), // API v2 destination
  fromUri: varchar("from_uri", { length: 100 }), // Legacy E.164 o ext
  toUri: varchar("to_uri", { length: 100 }), // Legacy E.164 o ext
  didE164: varchar("did_e164", { length: 50 }),
  extNumber: varchar("ext_number", { length: 20 }),
  
  // Timestamps
  startTime: timestamp("start_time"), // API v2: call start time
  answerTime: timestamp("answer_time"), // API v2: when answered
  endTime: timestamp("end_time"), // API v2: call end time
  startTs: timestamp("start_ts"), // Legacy start
  answerTs: timestamp("answer_ts"), // Legacy answer
  endTs: timestamp("end_ts"), // Legacy end
  
  // Duration
  duration: integer("duration"), // API v2: total duration in seconds
  billSec: integer("bill_sec"), // API v2: billable seconds
  billsec: integer("billsec").default(0), // Legacy billable seconds
  
  // Call result
  hangupCause: varchar("hangup_cause", { length: 100 }), // API v2: SIP hangup cause
  disposition: voipCallDispositionEnum("disposition"), // Made optional for API v2
  
  // Recording
  recordingUrl: varchar("recording_url", { length: 500 }),
  
  // Metadata
  metaJson: jsonb("meta_json"),
  
  // Sync tracking
  syncSource: varchar("sync_source", { length: 20 }).default('w3suite'),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("voip_cdrs_tenant_idx").on(table.tenantId),
  index("voip_cdrs_store_idx").on(table.storeId),
  index("voip_cdrs_sip_domain_idx").on(table.sipDomain),
  index("voip_cdrs_call_id_idx").on(table.callId),
  index("voip_cdrs_call_uuid_idx").on(table.callUuid),
  index("voip_cdrs_edgvoip_call_id_idx").on(table.edgvoipCallId),
  index("voip_cdrs_start_ts_idx").on(table.startTs),
  index("voip_cdrs_start_time_idx").on(table.startTime),
  index("voip_cdrs_did_idx").on(table.didE164),
  index("voip_cdrs_ext_idx").on(table.extNumber),
]);

export const insertVoipCdrSchema = createInsertSchema(voipCdrs).omit({ 
  id: true, 
  createdAt: true 
}).extend({
  sipDomain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-z]{2,}$/, "Invalid SIP domain format").optional(),
  direction: z.enum(['inbound', 'outbound', 'internal']),
  disposition: z.enum(['answered', 'no_answer', 'busy', 'failed', 'voicemail']).optional(),
  startTs: z.coerce.date().optional().nullable(),
  startTime: z.coerce.date().optional().nullable(),
  answerTs: z.coerce.date().optional().nullable(),
  answerTime: z.coerce.date().optional().nullable(),
  endTs: z.coerce.date().optional().nullable(),
  endTime: z.coerce.date().optional().nullable(),
});
export type InsertVoipCdr = z.infer<typeof insertVoipCdrSchema>;
export type VoipCdr = typeof voipCdrs.$inferSelect;

// 4) contact_policies - Policy minime di contatto in JSON
export const contactPolicies = w3suiteSchema.table("contact_policies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  scopeType: varchar("scope_type", { length: 50 }).notNull(), // tenant|store|did|ext
  scopeRef: varchar("scope_ref", { length: 255 }).notNull(), // ID di riferimento (store_id, e164, ext_number)
  rulesJson: jsonb("rules_json").notNull(), // {open: "09:00", close: "18:00", fallback: "voicemail", announcements: [...]}
  active: boolean("active").default(true).notNull(),
  label: varchar("label", { length: 255 }), // "Orari Roma"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("contact_policies_tenant_idx").on(table.tenantId),
  index("contact_policies_scope_idx").on(table.scopeType, table.scopeRef),
  uniqueIndex("contact_policies_scope_unique").on(table.scopeType, table.scopeRef),
]);

export const insertContactPolicySchema = createInsertSchema(contactPolicies).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true
}).extend({
  scopeType: z.enum(['tenant', 'store', 'did', 'ext']),
  scopeRef: z.string().min(1, "Scope reference is required"),
  rulesJson: z.object({}).passthrough(), // Accept any JSON object
});
export const updateContactPolicySchema = insertContactPolicySchema.omit({ tenantId: true, scopeType: true, scopeRef: true }).partial();
export type InsertContactPolicy = z.infer<typeof insertContactPolicySchema>;
export type UpdateContactPolicy = z.infer<typeof updateContactPolicySchema>;
export type ContactPolicy = typeof contactPolicies.$inferSelect;

// 6) voip_activity_log - Audit e provisioning/log applicativo
export const voipActivityLog = w3suiteSchema.table("voip_activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  actor: varchar("actor", { length: 255 }).notNull(), // user:<id> o system:w3-provisioner
  action: varchar("action", { length: 50 }).notNull(), // create|update|delete|provision|sync
  targetType: varchar("target_type", { length: 50 }).notNull(), // trunk|did|ext|route|policy
  targetId: varchar("target_id", { length: 255 }).notNull(), // ID dell'oggetto bersaglio
  status: varchar("status", { length: 50 }).notNull(), // ok|fail
  detailsJson: jsonb("details_json"), // Payload/diff/esito chiamate API verso PBX
  ts: timestamp("ts").defaultNow().notNull(),
}, (table) => [
  index("voip_activity_log_tenant_idx").on(table.tenantId),
  index("voip_activity_log_actor_idx").on(table.actor),
  index("voip_activity_log_target_idx").on(table.targetType, table.targetId),
  index("voip_activity_log_ts_idx").on(table.ts),
]);

export const insertVoipActivityLogSchema = createInsertSchema(voipActivityLog).omit({ 
  id: true, 
  ts: true
}).extend({
  action: z.enum(['create', 'update', 'delete', 'provision', 'sync']),
  targetType: z.enum(['trunk', 'did', 'ext', 'route', 'policy', 'cdr']),
  status: z.enum(['ok', 'fail']),
});
export type InsertVoipActivityLog = z.infer<typeof insertVoipActivityLogSchema>;
export type VoipActivityLog = typeof voipActivityLog.$inferSelect;

// 7) voip_ai_sessions - AI Voice Agent Call Sessions Tracking
export const voipAiSessions = w3suiteSchema.table("voip_ai_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'set null' }),
  trunkId: uuid("trunk_id").references(() => voipTrunks.id, { onDelete: 'set null' }),
  cdrId: uuid("cdr_id").references(() => voipCdrs.id, { onDelete: 'set null' }), // Link to CDR for full call details
  
  callId: varchar("call_id", { length: 255 }).notNull(), // FreeSWITCH call UUID
  sessionId: varchar("session_id", { length: 255 }).notNull(), // OpenAI Realtime session ID
  aiAgentRef: varchar("ai_agent_ref", { length: 100 }).notNull(), // Which AI agent handled the call
  
  callerNumber: varchar("caller_number", { length: 50 }), // Caller's phone number
  didNumber: varchar("did_number", { length: 50 }), // DID called
  
  startTs: timestamp("start_ts").notNull(), // Session start
  endTs: timestamp("end_ts"), // Session end
  durationSeconds: integer("duration_seconds"), // Total session duration
  
  transcript: text("transcript"), // Full conversation transcript
  actionsTaken: jsonb("actions_taken"), // [{action: "create_ticket", params: {...}, result: {...}}]
  transferredTo: varchar("transferred_to", { length: 50 }), // Extension if transferred to human
  transferReason: varchar("transfer_reason", { length: 255 }), // Why transferred (customer_request, ai_escalation, error)
  
  sentiment: varchar("sentiment", { length: 50 }), // positive, neutral, negative
  satisfactionScore: integer("satisfaction_score"), // 1-5 if customer provided feedback
  
  errorOccurred: boolean("error_occurred").default(false).notNull(),
  errorDetails: jsonb("error_details"), // Error stack if any
  
  costUsd: decimal("cost_usd", { precision: 10, scale: 4 }), // OpenAI API cost tracking
  tokensUsed: integer("tokens_used"), // Total tokens consumed
  
  metadata: jsonb("metadata"), // Additional session data
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("voip_ai_sessions_tenant_idx").on(table.tenantId),
  index("voip_ai_sessions_store_idx").on(table.storeId),
  index("voip_ai_sessions_call_id_idx").on(table.callId),
  index("voip_ai_sessions_start_ts_idx").on(table.startTs),
  index("voip_ai_sessions_ai_agent_idx").on(table.aiAgentRef),
  uniqueIndex("voip_ai_sessions_session_id_unique").on(table.sessionId),
]);

export const insertVoipAiSessionSchema = createInsertSchema(voipAiSessions).omit({
  id: true,
  createdAt: true
}).extend({
  callId: z.string().min(1, "Call ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  aiAgentRef: z.string().min(1, "AI agent reference is required"),
});
export type InsertVoipAiSession = z.infer<typeof insertVoipAiSessionSchema>;
export type VoipAiSession = typeof voipAiSessions.$inferSelect;

// ==================== UTM TRACKING SYSTEM ====================

// UTM Links - Auto-generated UTM tracking links for campaigns
export const utmLinks = w3suiteSchema.table("utm_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  campaignId: uuid("campaign_id").notNull().references(() => crmCampaigns.id, { onDelete: 'cascade' }),
  channel: varchar("channel", { length: 100 }).notNull(), // facebook_ads, instagram, google_ads, email, whatsapp
  fullUrl: text("full_url").notNull(), // Complete URL with UTM parameters
  utmSource: varchar("utm_source", { length: 255 }).notNull(),
  utmMedium: varchar("utm_medium", { length: 255 }).notNull(),
  utmCampaign: varchar("utm_campaign", { length: 255 }).notNull(),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  clicksCount: integer("clicks_count").default(0).notNull(),
  uniqueClicksCount: integer("unique_clicks_count").default(0).notNull(),
  conversionsCount: integer("conversions_count").default(0).notNull(),
  conversionValue: real("conversion_value").default(0),
  lastClickedAt: timestamp("last_clicked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("utm_links_tenant_idx").on(table.tenantId),
  index("utm_links_campaign_idx").on(table.campaignId),
  index("utm_links_channel_idx").on(table.channel),
  uniqueIndex("utm_links_campaign_channel_unique").on(table.campaignId, table.channel),
]);

export const insertUtmLinkSchema = createInsertSchema(utmLinks).omit({ 
  id: true, 
  clicksCount: true,
  uniqueClicksCount: true,
  conversionsCount: true,
  conversionValue: true,
  lastClickedAt: true,
  createdAt: true, 
  updatedAt: true
});
export type InsertUtmLink = z.infer<typeof insertUtmLinkSchema>;
export type UtmLink = typeof utmLinks.$inferSelect;

// UTM Short URLs - Short URL system for UTM links
export const utmShortUrls = w3suiteSchema.table("utm_short_urls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  utmLinkId: uuid("utm_link_id").notNull().references(() => utmLinks.id, { onDelete: 'cascade' }),
  shortCode: varchar("short_code", { length: 20 }).notNull().unique(), // abc123
  fullShortUrl: varchar("full_short_url", { length: 255 }).notNull(), // w3s.io/abc123 (placeholder domain)
  targetUrl: text("target_url").notNull(), // Full UTM URL to redirect to
  clicksCount: integer("clicks_count").default(0).notNull(),
  uniqueClicksCount: integer("unique_clicks_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("utm_short_urls_tenant_idx").on(table.tenantId),
  index("utm_short_urls_utm_link_idx").on(table.utmLinkId),
  index("utm_short_urls_short_code_idx").on(table.shortCode),
  uniqueIndex("utm_short_urls_short_code_unique").on(table.shortCode),
]);

export const insertUtmShortUrlSchema = createInsertSchema(utmShortUrls).omit({ 
  id: true, 
  clicksCount: true,
  uniqueClicksCount: true,
  lastClickedAt: true,
  createdAt: true
});
export type InsertUtmShortUrl = z.infer<typeof insertUtmShortUrlSchema>;
export type UtmShortUrl = typeof utmShortUrls.$inferSelect;

// Lead Touchpoints - Detailed touchpoint events for multi-touch attribution
export const leadTouchpoints = w3suiteSchema.table("lead_touchpoints", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadId: uuid("lead_id").notNull().references(() => crmLeads.id, { onDelete: 'cascade' }),
  utmLinkId: uuid("utm_link_id").references(() => utmLinks.id, { onDelete: 'set null' }),
  touchpointType: varchar("touchpoint_type", { length: 50 }).notNull(), // utm_click, form_view, email_open, page_view
  touchedAt: timestamp("touched_at").notNull().defaultNow(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  deviceType: varchar("device_type", { length: 50 }), // mobile, desktop, tablet
  os: varchar("os", { length: 100 }), // iOS, Android, Windows, macOS
  browser: varchar("browser", { length: 100 }),
  referrer: text("referrer"),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  latitude: real("latitude"),
  longitude: real("longitude"),
  sessionId: varchar("session_id", { length: 255 }),
  convertedToLead: boolean("converted_to_lead").default(false),
  metadata: jsonb("metadata"), // Additional touchpoint data
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("lead_touchpoints_tenant_idx").on(table.tenantId),
  index("lead_touchpoints_lead_idx").on(table.leadId),
  index("lead_touchpoints_utm_link_idx").on(table.utmLinkId),
  index("lead_touchpoints_touched_at_idx").on(table.touchedAt),
  index("lead_touchpoints_session_idx").on(table.sessionId),
]);

export const insertLeadTouchpointSchema = createInsertSchema(leadTouchpoints).omit({ 
  id: true, 
  createdAt: true
});
export type InsertLeadTouchpoint = z.infer<typeof insertLeadTouchpointSchema>;
export type LeadTouchpoint = typeof leadTouchpoints.$inferSelect;

// ==================== WORKFLOW EXECUTION QUEUE SYSTEM ====================

// Workflow Execution Queue - Track manual workflow approvals and execution requests
export const workflowExecutionQueue = w3suiteSchema.table("workflow_execution_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Workflow identification
  workflowId: uuid("workflow_id").notNull(), // References workflow template
  workflowName: varchar("workflow_name", { length: 255 }).notNull(),
  workflowCategory: varchar("workflow_category", { length: 100 }), // engagement, automation, scoring, etc.
  
  // Entity reference
  entityType: varchar("entity_type", { length: 50 }).notNull(), // deal, lead, customer, campaign
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }),
  entityStage: varchar("entity_stage", { length: 100 }),
  entityPipeline: varchar("entity_pipeline", { length: 255 }),
  entityValue: decimal("entity_value", { precision: 10, scale: 2 }),
  
  // Request details
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  requestedByName: varchar("requested_by_name", { length: 255 }),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  reason: text("reason"), // Why this workflow is being requested
  
  // Approval details
  requiresApproval: boolean("requires_approval").default(true).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  rejectedBy: varchar("rejected_by").references(() => users.id),
  rejectedByName: varchar("rejected_by_name", { length: 255 }),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  
  // Execution tracking
  status: varchar("status", { length: 50 }).default('pending').notNull(), // pending, approved, rejected, executing, completed, failed
  priority: varchar("priority", { length: 20 }).default('medium').notNull(), // low, medium, high, critical
  executionId: uuid("execution_id"), // Link to workflowExecutions once started
  
  // Performance & SLA
  estimatedDuration: integer("estimated_duration"), // Estimated duration in seconds
  slaDeadline: timestamp("sla_deadline"), // When this should be processed by
  
  // Dependencies
  dependencies: text("dependencies").array().default(sql`'{}'::text[]`), // Other workflow IDs that must complete first
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("workflow_queue_tenant_idx").on(table.tenantId),
  index("workflow_queue_entity_idx").on(table.entityType, table.entityId),
  index("workflow_queue_status_idx").on(table.status),
  index("workflow_queue_priority_idx").on(table.priority),
  index("workflow_queue_requested_by_idx").on(table.requestedBy),
  index("workflow_queue_sla_idx").on(table.slaDeadline),
]);

export const insertWorkflowExecutionQueueSchema = createInsertSchema(workflowExecutionQueue).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
}).extend({
  entityType: z.enum(['deal', 'lead', 'customer', 'campaign']),
  status: z.enum(['pending', 'approved', 'rejected', 'executing', 'completed', 'failed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});
export type InsertWorkflowExecutionQueue = z.infer<typeof insertWorkflowExecutionQueueSchema>;
export type WorkflowExecutionQueue = typeof workflowExecutionQueue.$inferSelect;

// Workflow Manual Executions - High-level tracking of manual workflow runs
export const workflowManualExecutions = w3suiteSchema.table("workflow_manual_executions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Link to queue entry if came from approval queue
  queueId: uuid("queue_id").references(() => workflowExecutionQueue.id, { onDelete: 'set null' }),
  
  // Workflow & Entity
  workflowId: uuid("workflow_id").notNull(),
  workflowName: varchar("workflow_name", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  entitySnapshot: jsonb("entity_snapshot"), // Entity state at execution time
  
  // Execution tracking
  status: varchar("status", { length: 50 }).default('pending').notNull(), // pending, running, completed, failed, cancelled
  executedBy: varchar("executed_by").notNull().references(() => users.id),
  executedByName: varchar("executed_by_name", { length: 255 }),
  
  // Timing
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  
  // Results
  outputData: jsonb("output_data").default({}),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("manual_executions_tenant_idx").on(table.tenantId),
  index("manual_executions_entity_idx").on(table.entityType, table.entityId),
  index("manual_executions_workflow_idx").on(table.workflowId),
  index("manual_executions_status_idx").on(table.status),
  index("manual_executions_executed_by_idx").on(table.executedBy),
  index("manual_executions_started_idx").on(table.startedAt),
]);

export const insertWorkflowManualExecutionSchema = createInsertSchema(workflowManualExecutions).omit({ 
  id: true, 
  createdAt: true,
  startedAt: true
}).extend({
  entityType: z.enum(['deal', 'lead', 'customer', 'campaign']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
});
export type InsertWorkflowManualExecution = z.infer<typeof insertWorkflowManualExecutionSchema>;
export type WorkflowManualExecution = typeof workflowManualExecutions.$inferSelect;

// ==================== WMS (WAREHOUSE MANAGEMENT SYSTEM) TABLES ====================

// 1) wmsCategories - Product categories (Brand-Tenant hybrid architecture)
export const wmsCategories = w3suiteSchema.table("wms_categories", {
  // Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  id: varchar("id", { length: 100 }).notNull(),
  
  // Brand/Tenant hybrid tracking
  source: productSourceEnum("source").default('tenant').notNull(), // brand | tenant
  brandCategoryId: varchar("brand_category_id", { length: 100 }), // Reference to Brand master category
  isBrandSynced: boolean("is_brand_synced").default(false).notNull(),
  
  // Product type hierarchy - Links category to top-level product type
  productType: productTypeEnum("product_type").default('PHYSICAL').notNull(), // PHYSICAL | VIRTUAL | SERVICE | CANVAS
  
  // Category hierarchy (self-referencing for multi-level trees)
  parentCategoryId: varchar("parent_category_id", { length: 100 }), // FK to wmsCategories.id for hierarchical structure
  
  // Category info
  nome: varchar("nome", { length: 255 }).notNull(),
  descrizione: text("descrizione"),
  icona: varchar("icona", { length: 100 }), // Icon name or emoji
  ordine: integer("ordine").default(0).notNull(), // Display order
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at"),
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  modifiedBy: varchar("modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  uniqueIndex("wms_categories_tenant_nome_parent_unique").on(table.tenantId, table.nome, table.parentCategoryId), // Prevent sibling dupes
  index("wms_categories_tenant_idx").on(table.tenantId),
  index("wms_categories_source_idx").on(table.source),
  index("wms_categories_brand_id_idx").on(table.brandCategoryId),
  index("wms_categories_product_type_idx").on(table.tenantId, table.productType), // Filter categories by product type
  index("wms_categories_parent_idx").on(table.tenantId, table.parentCategoryId), // Tree queries
]);

// Zod schemas for wmsCategories
export const insertCategorySchema = createInsertSchema(wmsCategories).omit({
  tenantId: true,      // Auto-set from session
  id: true,            // Auto-generated UUID
  source: true,        // Always 'tenant' for user-created categories
  isBrandSynced: true, // Always false for user-created categories
  brandCategoryId: true, // Only set by Brand
  isActive: true,      // Defaults to true
  archivedAt: true,    // Set only on soft-delete
  createdBy: true,     // Auto-set from user session
  modifiedBy: true,    // Auto-set from user session
  createdAt: true,     // Auto-set on creation
  updatedAt: true,     // Auto-set on creation/update
}).extend({
  productType: z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
  parentCategoryId: z.string().max(100).optional(),
  nome: z.string().min(1, "Nome categoria obbligatorio").max(255),
  descrizione: z.string().optional(),
  icona: z.string().max(100).optional(),
  ordine: z.coerce.number().int().default(0),
});

export const updateCategorySchema = insertCategorySchema.partial();

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type Category = typeof wmsCategories.$inferSelect;

// 2) wmsProductTypes - Product types within categories (Brand-Tenant hybrid architecture)
export const wmsProductTypes = w3suiteSchema.table("wms_product_types", {
  // Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  id: varchar("id", { length: 100 }).notNull(),
  
  // Brand/Tenant hybrid tracking
  source: productSourceEnum("source").default('tenant').notNull(), // brand | tenant
  brandTypeId: varchar("brand_type_id", { length: 100 }), // Reference to Brand master type
  isBrandSynced: boolean("is_brand_synced").default(false).notNull(),
  
  // Foreign key to category (REQUIRED - every type must belong to a category)
  categoryId: varchar("category_id", { length: 100 }).notNull(), // FK to wmsCategories.id
  
  // Type info
  nome: varchar("nome", { length: 255 }).notNull(),
  descrizione: text("descrizione"),
  ordine: integer("ordine").default(0).notNull(), // Display order within category
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at"),
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  modifiedBy: varchar("modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  uniqueIndex("wms_types_tenant_category_nome_unique").on(table.tenantId, table.categoryId, table.nome),
  index("wms_types_tenant_idx").on(table.tenantId),
  index("wms_types_category_idx").on(table.categoryId),
  index("wms_types_source_idx").on(table.source),
  index("wms_types_brand_id_idx").on(table.brandTypeId),
  
  // Composite FK: wms_product_types → wms_categories
  foreignKey({
    columns: [table.tenantId, table.categoryId],
    foreignColumns: [wmsCategories.tenantId, wmsCategories.id],
  }).onDelete('restrict'),
]);

// 3) products - Master product definition (Brand-Tenant hybrid architecture)
export const products = w3suiteSchema.table("products", {
  // CRITICAL: Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  id: varchar("id", { length: 100 }).notNull(), // e.g., "PROD-UUID" or Brand-generated ID
  
  // Brand/Tenant hybrid tracking
  source: productSourceEnum("source").default('tenant').notNull(), // brand | tenant
  brandProductId: varchar("brand_product_id", { length: 100 }), // Reference to Brand master product
  isBrandSynced: boolean("is_brand_synced").default(false).notNull(), // Auto-update when Brand modifies
  
  // Core product info
  sku: varchar("sku", { length: 100 }).notNull(), // Unique per tenant
  name: varchar("name", { length: 255 }).notNull(), // Nome/Modello prodotto
  model: varchar("model", { length: 255 }), // Modello specifico (es: "iPhone 15 Pro Max")
  description: text("description"), // Descrizione dettagliata
  notes: text("notes"), // Note aggiuntive
  brand: varchar("brand", { length: 100 }), // Marca (es: "Apple", "Samsung")
  ean: varchar("ean", { length: 13 }), // EAN-13 barcode
  memory: varchar("memory", { length: 50 }), // Memoria (es: "128GB", "256GB", "512GB") - PHYSICAL only
  color: varchar("color", { length: 50 }), // Colore (es: "Nero", "Bianco", "Blu Titanio") - PHYSICAL only
  imageUrl: varchar("image_url", { length: 512 }), // URL immagine prodotto
  
  // Product categorization & status
  categoryId: varchar("category_id", { length: 100 }), // FK to wmsCategories.id (optional)
  typeId: varchar("type_id", { length: 100 }), // FK to wmsProductTypes.id (optional)
  type: productTypeEnum("type").notNull(), // PHYSICAL | VIRTUAL | SERVICE | CANVAS
  status: productStatusEnum("status").default('active').notNull(), // active | inactive | discontinued | draft
  condition: productConditionEnum("condition"), // new | used | refurbished | demo (required for PHYSICAL only)
  isSerializable: boolean("is_serializable").default(false).notNull(), // Track at item-level if true
  serialType: serialTypeEnum("serial_type"), // Tipo seriale: imei | iccid | mac_address | other (required if isSerializable=true)
  monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2 }), // Canone mensile €/mese (required if type=CANVAS)
  
  // Validity period (for time-limited products, promotions, seasonal items)
  validFrom: date("valid_from"), // Start date of validity (optional)
  validTo: date("valid_to"), // End date of validity - auto-archive when expires (optional)
  
  // Physical properties (for PHYSICAL type)
  weight: numeric("weight", { precision: 10, scale: 3 }), // kg
  dimensions: jsonb("dimensions"), // { length, width, height } in cm
  
  // Attachments (PDF, photos, technical sheets)
  attachments: jsonb("attachments").default([]), // Array of { id, name, url, type, size }
  
  // Stock management
  quantityAvailable: integer("quantity_available").default(0).notNull(),
  quantityReserved: integer("quantity_reserved").default(0).notNull(),
  reorderPoint: integer("reorder_point").default(0).notNull(), // Min stock level before reorder
  warehouseLocation: varchar("warehouse_location", { length: 100 }), // Default storage location
  unitOfMeasure: varchar("unit_of_measure", { length: 20 }).default('pz').notNull(), // pz, kg, m, etc.
  
  // Status & lifecycle
  isActive: boolean("is_active").default(true).notNull(), // Soft delete
  archivedAt: timestamp("archived_at"),
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  modifiedBy: varchar("modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Composite PK for cross-tenant identical IDs (Brand push requirement)
  primaryKey({ columns: [table.tenantId, table.id] }),
  
  // Uniqueness constraints
  uniqueIndex("products_tenant_sku_unique").on(table.tenantId, table.sku),
  
  // Performance indexes (tenant_id first for RLS)
  index("products_tenant_idx").on(table.tenantId),
  index("products_tenant_source_idx").on(table.tenantId, table.source),
  index("products_tenant_type_idx").on(table.tenantId, table.type),
  index("products_tenant_status_idx").on(table.tenantId, table.status),
  index("products_tenant_active_idx").on(table.tenantId, table.isActive),
  index("products_ean_idx").on(table.ean),
  index("products_brand_product_id_idx").on(table.brandProductId),
  
  // Composite FK: products → wms_categories
  foreignKey({
    columns: [table.tenantId, table.categoryId],
    foreignColumns: [wmsCategories.tenantId, wmsCategories.id],
  }).onDelete('restrict'),
  
  // Composite FK: products → wms_product_types
  foreignKey({
    columns: [table.tenantId, table.typeId],
    foreignColumns: [wmsProductTypes.tenantId, wmsProductTypes.id],
  }).onDelete('restrict'),
]);

// Base schema without refine (needed for update schema .partial())
const baseProductSchema = createInsertSchema(products).omit({ 
  tenantId: true,    // Auto-set from session
  id: true,          // Auto-generated UUID
  createdAt: true,   // Auto-set on creation
  updatedAt: true,   // Auto-set on creation/update
  archivedAt: true,  // Set only on soft-delete
  createdBy: true,   // Auto-set from user session
  modifiedBy: true   // Auto-set from user session
}).extend({
  sku: z.string().min(1, "SKU è obbligatorio").max(100),
  name: z.string().min(1, "Descrizione è obbligatoria").max(255),
  model: z.string().max(255).optional(),
  notes: z.string().optional(),
  brand: z.string().max(100).optional(),
  imageUrl: z.string().max(512).url("URL immagine non valido").or(z.literal('')).optional(),
  type: z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
  status: z.enum(['active', 'inactive', 'discontinued', 'draft']).optional(),
  condition: z.enum(['new', 'used', 'refurbished', 'demo']).optional(),
  serialType: z.enum(['imei', 'iccid', 'mac_address', 'other']).optional(),
  monthlyFee: z.coerce.number().min(0, "Canone deve essere maggiore o uguale a 0").optional(),
  source: z.enum(['brand', 'tenant']).optional(),
  ean: z.string().regex(/^\d{13}$/, "EAN deve essere di 13 cifre").or(z.literal('')).optional(),
  memory: z.string().max(50, "Memoria troppo lunga").optional(),
  color: z.string().max(50, "Colore troppo lungo").optional(),
  categoryId: z.string().max(100).optional(),
  typeId: z.string().max(100).optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
});

// Insert schema with conditional validation
export const insertProductSchema = baseProductSchema
  .refine((data) => {
    // Validation Rule: serialType is required if isSerializable is true
    if (data.isSerializable && !data.serialType) {
      return false;
    }
    return true;
  }, {
    message: "Tipo seriale è obbligatorio quando il prodotto è serializzabile",
    path: ["serialType"],
  })
  .refine((data) => {
    // Validation Rule: monthlyFee is required if type is CANVAS
    if (data.type === 'CANVAS') {
      if (!data.monthlyFee || data.monthlyFee <= 0) {
        return false;
      }
    }
    return true;
  }, {
    message: "Canone mensile obbligatorio per prodotti di tipo CANVAS",
    path: ["monthlyFee"],
  })
  .refine((data) => {
    // Validation Rule: condition is required if type is PHYSICAL
    if (data.type === 'PHYSICAL' && !data.condition) {
      return false;
    }
    return true;
  }, {
    message: "Condizioni prodotto sono obbligatorie per prodotti di tipo PHYSICAL",
    path: ["condition"],
  })
  .refine((data) => {
    // Validation Rule: validTo must be >= validFrom if both are provided
    if (data.validFrom && data.validTo) {
      const from = new Date(data.validFrom);
      const to = new Date(data.validTo);
      if (to < from) {
        return false;
      }
    }
    return true;
  }, {
    message: "Data di fine validità deve essere successiva alla data di inizio",
    path: ["validTo"],
  });
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Update schema (partial of base, not refined schema)
export const updateProductSchema = baseProductSchema.partial();
export type UpdateProduct = z.infer<typeof updateProductSchema>;

export type Product = typeof products.$inferSelect;

// 2) product_items - Individual serializable product items tracking
export const productItems = w3suiteSchema.table("product_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id", { length: 100 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'set null' }),
  
  // Item condition & status
  condition: productConditionEnum("condition").default('new').notNull(), // new | used | refurbished | demo
  logisticStatus: productLogisticStatusEnum("logistic_status").default('in_stock').notNull(), // 13 states
  
  // Lifecycle tracking
  orderId: uuid("order_id"), // FK to orders table (future)
  customerId: uuid("customer_id"), // FK to customers table
  
  // Additional info
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("product_items_tenant_idx").on(table.tenantId),
  index("product_items_tenant_product_idx").on(table.tenantId, table.productId),
  index("product_items_tenant_status_idx").on(table.tenantId, table.logisticStatus),
  index("product_items_store_idx").on(table.storeId),
  index("product_items_customer_idx").on(table.customerId),
]);

export const insertProductItemSchema = createInsertSchema(productItems).omit({ 
  id: true,
  tenantId: true,   // Auto-set from session context
  createdAt: true, 
  updatedAt: true 
}).extend({
  condition: z.enum(['new', 'used', 'refurbished', 'demo']).optional(),
  logisticStatus: z.enum([
    'in_stock', 'reserved', 'preparing', 'shipping', 'delivered',
    'customer_return', 'doa_return', 'in_service', 'supplier_return',
    'in_transfer', 'lost', 'damaged', 'internal_use'
  ]).optional(),
});
export type InsertProductItem = z.infer<typeof insertProductItemSchema>;

export const updateProductItemSchema = insertProductItemSchema.partial().omit({
  createdAt: true   // Never modifiable
});
export type UpdateProductItem = z.infer<typeof updateProductItemSchema>;

export type ProductItem = typeof productItems.$inferSelect;

// 3) product_serials - IMEI/ICCID/MAC address tracking
export const productSerials = w3suiteSchema.table("product_serials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productItemId: uuid("product_item_id").notNull().references(() => productItems.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Serial identification
  serialType: serialTypeEnum("serial_type").notNull(), // imei | iccid | mac_address | other
  serialValue: varchar("serial_value", { length: 100 }).notNull(),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // CRITICAL: Tenant-scoped serial uniqueness
  uniqueIndex("product_serials_tenant_value_unique").on(table.tenantId, table.serialValue),
  
  index("product_serials_tenant_idx").on(table.tenantId),
  index("product_serials_item_idx").on(table.productItemId),
  index("product_serials_type_idx").on(table.serialType),
]);

export const insertProductSerialSchema = createInsertSchema(productSerials).omit({ 
  id: true,
  tenantId: true,
  createdAt: true 
}).extend({
  serialType: z.enum(['imei', 'iccid', 'mac_address', 'other']),
  serialValue: z.string().min(1, "Valore seriale è obbligatorio").max(100),
});
export type InsertProductSerial = z.infer<typeof insertProductSerialSchema>;
export type ProductSerial = typeof productSerials.$inferSelect;

// 4) wms_inventory_adjustments - Stock reconciliation audit trail
export const wmsInventoryAdjustments = w3suiteSchema.table("wms_inventory_adjustments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: varchar("product_id", { length: 100 }).notNull(),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'set null' }),
  
  // Reconciliation data
  expectedCount: integer("expected_count").notNull(),
  actualCount: integer("actual_count").notNull(),
  discrepancy: integer("discrepancy").notNull(), // actualCount - expectedCount
  adjustmentType: varchar("adjustment_type", { length: 20 }).notNull(), // 'surplus' | 'shortage'
  
  // Metadata
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("wms_inv_adj_tenant_idx").on(table.tenantId),
  index("wms_inv_adj_product_idx").on(table.productId),
  index("wms_inv_adj_store_idx").on(table.storeId),
  index("wms_inv_adj_type_idx").on(table.adjustmentType),
  index("wms_inv_adj_created_idx").on(table.createdAt),
]);

export const insertInventoryAdjustmentSchema = createInsertSchema(wmsInventoryAdjustments).omit({ 
  id: true,
  tenantId: true,
  createdAt: true 
});
export type InsertInventoryAdjustment = z.infer<typeof insertInventoryAdjustmentSchema>;
export type InventoryAdjustment = typeof wmsInventoryAdjustments.$inferSelect;

// 5) wms_stock_movements - Operational stock movements (purchases, sales, transfers)
export const wmsStockMovements = w3suiteSchema.table("wms_stock_movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Movement classification
  movementType: stockMovementTypeEnum("movement_type").notNull(), // purchase_in, sale_out, return_in, transfer, adjustment, damaged
  movementDirection: stockMovementDirectionEnum("movement_direction").notNull(), // inbound | outbound
  
  // Product reference
  productId: varchar("product_id", { length: 100 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  productItemId: uuid("product_item_id").references(() => productItems.id, { onDelete: 'set null' }), // For serialized items
  productBatchId: uuid("product_batch_id").references(() => productBatches.id, { onDelete: 'set null' }), // For batch tracking
  
  // Location tracking
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'set null' }), // Current store context
  sourceStoreId: uuid("source_store_id").references(() => stores.id, { onDelete: 'set null' }), // For transfers OUT
  destinationStoreId: uuid("destination_store_id").references(() => stores.id, { onDelete: 'set null' }), // For transfers IN
  warehouseLocation: varchar("warehouse_location", { length: 100 }), // Shelf/zone location
  
  // Quantity tracking
  quantityDelta: integer("quantity_delta").notNull(), // Signed: positive for inbound, negative for outbound
  
  // External references
  referenceType: varchar("reference_type", { length: 50 }), // 'order', 'return', 'adjustment', 'purchase_order'
  referenceId: varchar("reference_id", { length: 100 }), // External ID (orderId, adjustmentId, etc.)
  externalParty: varchar("external_party", { length: 255 }), // Supplier name, customer name, etc.
  
  // Timestamps
  occurredAt: timestamp("occurred_at").defaultNow().notNull(), // When movement happened
  
  // Audit trail
  notes: text("notes"),
  metadata: jsonb("metadata").default({}), // Extensibility for custom data
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Performance indexes
  index("wms_stock_mov_tenant_idx").on(table.tenantId),
  index("wms_stock_mov_tenant_product_occurred_idx").on(table.tenantId, table.productId, table.occurredAt.desc()),
  index("wms_stock_mov_tenant_store_occurred_idx").on(table.tenantId, table.storeId, table.occurredAt.desc()),
  index("wms_stock_mov_tenant_type_occurred_idx").on(table.tenantId, table.movementType, table.occurredAt.desc()),
  index("wms_stock_mov_direction_idx").on(table.movementDirection),
  index("wms_stock_mov_batch_idx").on(table.productBatchId),
  index("wms_stock_mov_item_idx").on(table.productItemId),
  
  // Prevent duplicate postings for same reference
  uniqueIndex("wms_stock_mov_reference_unique").on(table.referenceType, table.referenceId, table.movementDirection).where(sql`reference_type IS NOT NULL AND reference_id IS NOT NULL`),
]);

export const insertStockMovementSchema = createInsertSchema(wmsStockMovements).omit({ 
  id: true,
  tenantId: true,
  createdAt: true 
}).extend({
  movementType: z.enum(['purchase_in', 'sale_out', 'return_in', 'transfer', 'adjustment', 'damaged']),
  movementDirection: z.enum(['inbound', 'outbound']),
  quantityDelta: z.number().int().refine((val) => val !== 0, "Quantity delta non può essere zero"),
  productId: z.string().uuid("Product ID deve essere UUID valido"),
  occurredAt: z.string().datetime().or(z.date()).optional(), // ISO string or Date object
});
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof wmsStockMovements.$inferSelect;

// 6) product_item_status_history - Audit trail for logistic status changes
export const productItemStatusHistory = w3suiteSchema.table("product_item_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productItemId: uuid("product_item_id").notNull().references(() => productItems.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Status transition
  fromStatus: productLogisticStatusEnum("from_status"),
  toStatus: productLogisticStatusEnum("to_status").notNull(),
  
  // Change metadata
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  changedBy: varchar("changed_by").references(() => users.id),
  changedByName: varchar("changed_by_name", { length: 255 }),
  notes: text("notes"),
  
  // Optional order reference
  referenceOrderId: uuid("reference_order_id"), // FK to orders table (future)
}, (table) => [
  index("item_history_tenant_idx").on(table.tenantId),
  index("item_history_tenant_item_changed_idx").on(table.tenantId, table.productItemId, table.changedAt.desc()),
  index("item_history_changed_by_idx").on(table.changedBy),
]);

export const insertProductItemStatusHistorySchema = createInsertSchema(productItemStatusHistory).omit({ 
  id: true, 
  changedAt: true 
}).extend({
  toStatus: z.enum([
    'in_stock', 'reserved', 'preparing', 'shipping', 'delivered',
    'customer_return', 'doa_return', 'in_service', 'supplier_return',
    'in_transfer', 'lost', 'damaged', 'internal_use'
  ]),
});
export type InsertProductItemStatusHistory = z.infer<typeof insertProductItemStatusHistorySchema>;
export type ProductItemStatusHistory = typeof productItemStatusHistory.$inferSelect;

// 5) product_batches - Non-serializable product batch tracking
export const productBatches = w3suiteSchema.table("product_batches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id", { length: 100 }).notNull().references(() => products.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'set null' }),
  
  // Batch info
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  initialQuantity: integer("initial_quantity").default(0).notNull(), // Original quantity (for KPI: usedQuantity calculation)
  quantity: integer("quantity").default(0).notNull(), // Current quantity
  reserved: integer("reserved").default(0).notNull(), // Reserved quantity
  warehouseLocation: varchar("warehouse_location", { length: 100 }),
  supplier: varchar("supplier", { length: 255 }), // Supplier name
  notes: text("notes"), // Additional batch notes
  
  // Batch lifecycle
  receivedDate: date("received_date"),
  expiryDate: date("expiry_date"),
  status: productBatchStatusEnum("status").default('available').notNull(), // available | reserved | damaged | expired
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Unique batch per product per store
  uniqueIndex("product_batches_tenant_product_store_batch_unique").on(
    table.tenantId, 
    table.productId, 
    table.storeId, 
    table.batchNumber
  ),
  
  index("product_batches_tenant_idx").on(table.tenantId),
  index("product_batches_tenant_product_idx").on(table.tenantId, table.productId),
  index("product_batches_store_idx").on(table.storeId),
  index("product_batches_status_idx").on(table.status),
  index("product_batches_expiry_idx").on(table.expiryDate),
]);

export const insertProductBatchSchema = createInsertSchema(productBatches).omit({ 
  id: true,
  tenantId: true,
  createdAt: true, 
  updatedAt: true 
}).extend({
  batchNumber: z.string().min(1, "Numero lotto è obbligatorio").max(100),
  initialQuantity: z.number().int().min(0, "Quantità iniziale deve essere positiva").optional(), // Auto-set to quantity if omitted
  quantity: z.number().int().min(0, "Quantità deve essere positiva"),
  reserved: z.number().int().min(0, "Quantità riservata deve essere positiva").optional(),
  status: z.enum(['available', 'reserved', 'damaged', 'expired']).optional(),
  supplier: z.string().max(255, "Nome fornitore troppo lungo").optional(),
  notes: z.string().optional(),
});
export type InsertProductBatch = z.infer<typeof insertProductBatchSchema>;
export type ProductBatch = typeof productBatches.$inferSelect;

// 7) wms_warehouse_locations - Structured warehouse location management
export const wmsWarehouseLocations = w3suiteSchema.table("wms_warehouse_locations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: 'cascade' }),
  
  // Location identification
  code: varchar("code", { length: 50 }).notNull(), // "A-12-5" (zone-aisle-shelf)
  name: varchar("name", { length: 255 }).notNull(), // "Warehouse A - Aisle 12 - Shelf 5"
  
  // Hierarchical structure
  zone: varchar("zone", { length: 50 }), // "A", "B", "Cold Storage"
  aisle: varchar("aisle", { length: 20 }), // "12"
  shelf: varchar("shelf", { length: 20 }), // "5"
  level: integer("level").default(0), // Floor level: 0=ground, 1=first, etc.
  
  // Capacity management
  capacity: integer("capacity").default(0).notNull(), // Max items
  currentOccupancy: integer("current_occupancy").default(0).notNull(), // Current items
  
  // Location characteristics
  isActive: boolean("is_active").default(true).notNull(),
  locationType: varchar("location_type", { length: 50 }).default('shelf'), // shelf | pallet | bin | floor
  
  // Optional metadata (temperature control, hazmat, dimensions, etc.)
  metadata: jsonb("metadata"),
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Unique code per tenant per store
  uniqueIndex("wms_locations_tenant_store_code_unique").on(
    table.tenantId, 
    table.storeId, 
    table.code
  ),
  
  index("wms_locations_tenant_idx").on(table.tenantId),
  index("wms_locations_tenant_store_idx").on(table.tenantId, table.storeId),
  index("wms_locations_zone_idx").on(table.zone),
  index("wms_locations_active_idx").on(table.isActive),
  index("wms_locations_type_idx").on(table.locationType),
]);

export const insertWarehouseLocationSchema = createInsertSchema(wmsWarehouseLocations).omit({ 
  id: true,
  tenantId: true,
  createdAt: true, 
  updatedAt: true,
  currentOccupancy: true // Auto-calculated
}).extend({
  code: z.string().min(1, "Codice location è obbligatorio").max(50),
  name: z.string().min(1, "Nome location è obbligatorio").max(255),
  zone: z.string().max(50, "Zona troppo lunga").optional(),
  aisle: z.string().max(20, "Corridoio troppo lungo").optional(),
  shelf: z.string().max(20, "Scaffale troppo lungo").optional(),
  level: z.number().int().min(0, "Livello deve essere >= 0").optional(),
  capacity: z.number().int().min(0, "Capacità deve essere positiva").optional(),
  isActive: z.boolean().optional(),
  locationType: z.enum(['shelf', 'pallet', 'bin', 'floor']).optional(),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional(),
});
export type InsertWarehouseLocation = z.infer<typeof insertWarehouseLocationSchema>;
export type WarehouseLocation = typeof wmsWarehouseLocations.$inferSelect;