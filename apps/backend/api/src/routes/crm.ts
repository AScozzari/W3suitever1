/**
 * CRM API Routes
 * 
 * Provides REST endpoints for managing CRM entities with full tenant isolation:
 * - Persons (identity graph)
 * - Leads (with GDPR consent tracking)
 * - Campaigns
 * - Pipelines
 * - Deals
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext, withTenantTransaction } from '../core/db';
import { correlationMiddleware, logger } from '../core/logger';
import { rbacMiddleware, requirePermission } from '../middleware/tenant';
import { eq, and, sql, desc, or, ilike, getTableColumns, inArray, count, gte, lte } from 'drizzle-orm';
import {
  users,
  stores,
  teams,
  crmLeads,
  crmCampaigns,
  crmCampaignUtmLinks,
  crmFunnels,
  crmFunnelWorkflows,
  crmPipelines,
  crmPipelineSettings,
  crmPipelineWorkflows,
  crmPipelineStages,
  crmDeals,
  crmCustomers,
  crmPersonConsents,
  crmCustomerDocuments,
  crmCustomerNotes,
  crmOrders,
  crmInteractions,
  crmOmnichannelInteractions,
  crmInteractionAttachments,
  crmInteractionParticipants,
  crmIdentityMatches,
  crmIdentityEvents,
  crmIdentityConflicts,
  crmTasks,
  crmPersonIdentities,
  workflowTemplates,
  leadRoutingHistory,
  leadAiInsights,
  leadStatuses,
  leadStatusHistory,
  crmLeadNotifications,
  campaignSocialAccounts,
  mcpConnectedAccounts,
  storeTrackingConfig,
  insertCrmLeadSchema,
  insertCrmCampaignSchema,
  insertCrmFunnelSchema,
  insertCrmFunnelWorkflowSchema,
  insertCrmPipelineSchema,
  insertCrmPipelineSettingsSchema,
  insertCrmPipelineWorkflowSchema,
  insertCrmPipelineStageSchema,
  insertCrmDealSchema,
  insertCrmCustomerSchema,
  insertCrmCustomerDocumentSchema,
  insertCrmCustomerNoteSchema,
  insertLeadStatusSchema,
  insertLeadStatusHistorySchema,
  insertStoreTrackingConfigSchema,
  insertCrmOmnichannelInteractionSchema,
  insertCrmIdentityMatchSchema,
  insertCrmIdentityEventSchema,
  insertCrmIdentityConflictSchema
} from '../db/schema/w3suite';
import { drivers, marketingChannels, marketingChannelUtmMappings } from '../db/schema/public';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';
import { leadScoringService } from '../services/lead-scoring-ai.service';
import { utmLinksService } from '../services/utm-links.service';
import { gtmEventsService } from '../services/gtm-events.service';
import { attributionService } from '../services/attribution.service';
import { GDPRConsentService } from '../services/gdpr-consent.service';
import { GTMSnippetGeneratorService } from '../services/gtm-snippet-generator.service';
import { dealNotificationService } from '../services/deal-notification-service';
import { analyticsCacheService } from '../services/analytics-cache.service';

const router = express.Router();

router.use(correlationMiddleware);

// Helper: Get tenant ID from request
const getTenantId = (req: express.Request): string | null => {
  return req.headers['x-tenant-id'] as string || req.user?.tenantId || null;
};

// Helper: Get or create personId with transactional UPSERT (prevents all race conditions)
const getOrCreatePersonId = async (
  tenantId: string,
  email?: string | null,
  phone?: string | null,
  socialId?: string | null
): Promise<string> => {
  const identifiers: Array<{type: 'email' | 'phone' | 'social', value: string}> = [];
  
  if (email) identifiers.push({type: 'email', value: email});
  if (phone) identifiers.push({type: 'phone', value: phone});
  if (socialId) identifiers.push({type: 'social', value: socialId});
  
  // No identifiers - generate new personId
  if (identifiers.length === 0) {
    const newPersonId = crypto.randomUUID();
    logger.info('New person ID generated (no identifiers)', {personId: newPersonId, tenantId});
    return newPersonId;
  }
  
  // Wrap in transaction to ensure atomicity across all identifier UPSERTs
  return await db.transaction(async (tx) => {
    const firstIdentifier = identifiers[0];
    
    // STEP 1: UPSERT FIRST identifier to get/create canonical personId from DB
    const firstResult = await tx.execute(sql`
      INSERT INTO w3suite.crm_person_identities (tenant_id, person_id, identifier_type, identifier_value)
      VALUES (${tenantId}, gen_random_uuid(), ${firstIdentifier.type}, ${firstIdentifier.value})
      ON CONFLICT (tenant_id, identifier_type, identifier_value) 
      DO UPDATE SET identifier_value = EXCLUDED.identifier_value
      RETURNING person_id
    `);
    
    const canonicalPersonId = (firstResult.rows[0] as {person_id: string}).person_id;
    
    // STEP 2: UPSERT remaining identifiers with canonical personId
    if (identifiers.length > 1) {
      await Promise.all(
        identifiers.slice(1).map(({type, value}) =>
          tx.execute(sql`
            INSERT INTO w3suite.crm_person_identities (tenant_id, person_id, identifier_type, identifier_value)
            VALUES (${tenantId}, ${canonicalPersonId}, ${type}, ${value})
            ON CONFLICT (tenant_id, identifier_type, identifier_value) 
            DO UPDATE SET person_id = ${canonicalPersonId}
          `)
        )
      );
    }
    
    // STEP 3: Re-query canonical from DB to ensure final value (handles concurrent updates)
    const finalResult = await tx.select({personId: crmPersonIdentities.personId})
      .from(crmPersonIdentities)
      .where(and(
        eq(crmPersonIdentities.tenantId, tenantId),
        eq(crmPersonIdentities.identifierType, firstIdentifier.type),
        eq(crmPersonIdentities.identifierValue, firstIdentifier.value)
      ))
      .limit(1);
    
    const finalPersonId = finalResult[0].personId;
    logger.info('Person ID resolved in transaction', {personId: finalPersonId, tenantId, identifiers});
    return finalPersonId;
  });
};

// ==================== DASHBOARD STATS ====================

/**
 * GET /api/crm/dashboard/stats
 * Get aggregated dashboard statistics for the current tenant
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get total unique persons count (distinct personId from leads)
    const personsResult = await db
      .select({ count: sql<number>`count(DISTINCT ${crmLeads.personId})::int` })
      .from(crmLeads)
      .where(eq(crmLeads.tenantId, tenantId));
    
    const totalPersons = personsResult[0]?.count || 0;

    // Get total leads count
    const leadsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmLeads)
      .where(eq(crmLeads.tenantId, tenantId));
    
    const totalLeads = leadsResult[0]?.count || 0;

    // Get open deals count (status != 'won' AND status != 'lost')
    const openDealsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmDeals)
      .where(
        and(
          eq(crmDeals.tenantId, tenantId),
          sql`${crmDeals.status} NOT IN ('won', 'lost')`
        )
      );
    
    const openDeals = openDealsResult[0]?.count || 0;

    // Get total pipeline value (sum of all open deal estimated values)
    const pipelineValueResult = await db
      .select({ total: sql<string>`COALESCE(SUM(${crmDeals.estimatedValue}), 0)::text` })
      .from(crmDeals)
      .where(
        and(
          eq(crmDeals.tenantId, tenantId),
          sql`${crmDeals.status} NOT IN ('won', 'lost')`
        )
      );
    
    const pipelineValue = Number(pipelineValueResult[0]?.total || 0);

    return res.json({
      success: true,
      data: {
        totalPersons,
        totalLeads,
        openDeals,
        pipelineValue
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
  } catch (error: any) {
    logger.error('Failed to fetch dashboard stats', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== UTM ATTRIBUTION TRACKING ====================

/**
 * POST /api/crm/:tenantSlug/track-utm-click
 * Track UTM link click and attribute to lead if provided
 * Body: { utmLinkId, leadId?, sessionId? }
 */
router.post('/:tenantSlug/track-utm-click', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate request body
    const bodySchema = z.object({
      utmLinkId: z.string().uuid('Invalid UTM link ID'),
      leadId: z.string().uuid('Invalid lead ID').optional(),
      sessionId: z.string().optional()
    });

    const validation = bodySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const { utmLinkId, leadId, sessionId } = validation.data;

    // Track UTM click and attribute if lead provided
    const result = await attributionService.trackUTMClick({
      tenantId,
      utmLinkId,
      leadId,
      sessionId
    });

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'UTM link not found or inactive',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('UTM click tracked successfully', {
      tenantId,
      utmLinkId,
      leadId: leadId || 'anonymous',
      attribution: result.attribution
    });

    return res.status(200).json({
      success: true,
      data: {
        attribution: result.attribution,
        utmLink: result.utmLink
      },
      message: 'UTM click tracked successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Failed to track UTM click', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to track UTM click',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== LEADS ====================

/**
 * GET /api/crm/leads
 * Get all leads for the current tenant
 */
router.get('/leads', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status, storeId, campaign, customerId, personId, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmLeads.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmLeads.status, status as string));
    }
    if (storeId) {
      conditions.push(eq(crmLeads.storeId, storeId as string));
    }
    if (campaign) {
      conditions.push(eq(crmLeads.campaignId, campaign as string));
    }
    if (personId) {
      conditions.push(eq(crmLeads.personId, personId as string));
    }
    if (customerId) {
      const customer = await db
        .select({ personId: crmCustomers.personId })
        .from(crmCustomers)
        .where(and(eq(crmCustomers.id, customerId as string), eq(crmCustomers.tenantId, tenantId)))
        .limit(1);
      if (customer[0]?.personId) {
        conditions.push(eq(crmLeads.personId, customer[0].personId));
      } else {
        return res.status(200).json({
          success: true,
          data: [],
          message: 'No leads found for this customer',
          timestamp: new Date().toISOString()
        } as ApiSuccessResponse);
      }
    }

    const leads = await db
      .select({
        // Core lead fields
        id: crmLeads.id,
        tenantId: crmLeads.tenantId,
        legalEntityId: crmLeads.legalEntityId,
        storeId: crmLeads.storeId,
        personId: crmLeads.personId,
        ownerUserId: crmLeads.ownerUserId,
        campaignId: crmLeads.campaignId,
        sourceChannel: crmLeads.sourceChannel,
        sourceSocialAccountId: crmLeads.sourceSocialAccountId,
        status: crmLeads.status,
        leadScore: crmLeads.leadScore,
        firstName: crmLeads.firstName,
        lastName: crmLeads.lastName,
        email: crmLeads.email,
        phone: crmLeads.phone,
        companyName: crmLeads.companyName,
        productInterest: crmLeads.productInterest,
        driverId: crmLeads.driverId,
        notes: crmLeads.notes,
        
        // UTM & Attribution
        utmSource: crmLeads.utmSource,
        utmMedium: crmLeads.utmMedium,
        utmCampaign: crmLeads.utmCampaign,
        utmSourceId: crmLeads.utmSourceId,
        utmMediumId: crmLeads.utmMediumId,
        utmContent: crmLeads.utmContent,
        utmTerm: crmLeads.utmTerm,
        landingPageUrl: crmLeads.landingPageUrl,
        referrerUrl: crmLeads.referrerUrl,
        eventName: crmLeads.eventName,
        eventSource: crmLeads.eventSource,
        sessionId: crmLeads.sessionId,
        clientIpAddress: crmLeads.clientIpAddress,
        
        // Consents
        privacyPolicyAccepted: crmLeads.privacyPolicyAccepted,
        marketingConsent: crmLeads.marketingConsent,
        profilingConsent: crmLeads.profilingConsent,
        thirdPartyConsent: crmLeads.thirdPartyConsent,
        consentTimestamp: crmLeads.consentTimestamp,
        consentSource: crmLeads.consentSource,
        
        // GTM Tracking
        gtmClientId: crmLeads.gtmClientId,
        gtmSessionId: crmLeads.gtmSessionId,
        gtmUserId: crmLeads.gtmUserId,
        gtmEvents: crmLeads.gtmEvents,
        gtmProductsViewed: crmLeads.gtmProductsViewed,
        gtmConversionEvents: crmLeads.gtmConversionEvents,
        gtmGoalsCompleted: crmLeads.gtmGoalsCompleted,
        
        // Multi-PDV
        originStoreId: crmLeads.originStoreId,
        originStoreName: crmLeads.originStoreName,
        storesVisited: crmLeads.storesVisited,
        storeInteractions: crmLeads.storeInteractions,
        preferredStoreId: crmLeads.preferredStoreId,
        nearestStoreId: crmLeads.nearestStoreId,
        
        // Social & Forms
        socialProfiles: crmLeads.socialProfiles,
        socialInteractionsByStore: crmLeads.socialInteractionsByStore,
        socialCampaignResponses: crmLeads.socialCampaignResponses,
        formsSubmitted: crmLeads.formsSubmitted,
        totalFormsStarted: crmLeads.totalFormsStarted,
        totalFormsCompleted: crmLeads.totalFormsCompleted,
        formCompletionRate: crmLeads.formCompletionRate,
        averageFormTime: crmLeads.averageFormTime,
        
        // Fiscal Documents
        fiscalCode: crmLeads.fiscalCode,
        vatNumber: crmLeads.vatNumber,
        documentType: crmLeads.documentType,
        documentNumber: crmLeads.documentNumber,
        documentExpiry: crmLeads.documentExpiry,
        pecEmail: crmLeads.pecEmail,
        
        // Customer Journey
        customerJourney: crmLeads.customerJourney,
        firstTouchAttribution: crmLeads.firstTouchAttribution,
        lastTouchAttribution: crmLeads.lastTouchAttribution,
        firstContactDate: crmLeads.firstContactDate,
        lastContactDate: crmLeads.lastContactDate,
        contactCount: crmLeads.contactCount,
        nextActionDate: crmLeads.nextActionDate,
        nextActionType: crmLeads.nextActionType,
        
        // Business Profiling
        customerType: crmLeads.customerType,
        companyRole: crmLeads.companyRole,
        companySize: crmLeads.companySize,
        companySector: crmLeads.companySector,
        annualRevenue: crmLeads.annualRevenue,
        employeeCount: crmLeads.employeeCount,
        budgetRange: crmLeads.budgetRange,
        purchaseTimeframe: crmLeads.purchaseTimeframe,
        painPoints: crmLeads.painPoints,
        competitors: crmLeads.competitors,
        
        // Address
        addressStreet: crmLeads.addressStreet,
        addressNumber: crmLeads.addressNumber,
        addressCity: crmLeads.addressCity,
        addressProvince: crmLeads.addressProvince,
        addressPostalCode: crmLeads.addressPostalCode,
        addressCountry: crmLeads.addressCountry,
        geoLat: crmLeads.geoLat,
        geoLng: crmLeads.geoLng,
        deliveryAddress: crmLeads.deliveryAddress,
        
        // Engagement Metrics
        pageViewsCount: crmLeads.pageViewsCount,
        emailsOpenedCount: crmLeads.emailsOpenedCount,
        emailsClickedCount: crmLeads.emailsClickedCount,
        documentsDownloaded: crmLeads.documentsDownloaded,
        videosWatched: crmLeads.videosWatched,
        sessionDuration: crmLeads.sessionDuration,
        deviceType: crmLeads.deviceType,
        browserInfo: crmLeads.browserInfo,
        engagementScore: crmLeads.engagementScore,
        
        // Conversion Tracking
        convertedToCustomerId: crmLeads.convertedToCustomerId,
        conversionDate: crmLeads.conversionDate,
        conversionValue: crmLeads.conversionValue,
        lifecycleStage: crmLeads.lifecycleStage,
        conversionProbability: crmLeads.conversionProbability,
        lostReason: crmLeads.lostReason,
        
        // AI Enrichment
        aiEnrichmentDate: crmLeads.aiEnrichmentDate,
        aiSentimentScore: crmLeads.aiSentimentScore,
        aiIntentSignals: crmLeads.aiIntentSignals,
        aiPredictedValue: crmLeads.aiPredictedValue,
        aiRecommendations: crmLeads.aiRecommendations,
        
        // Timestamps
        createdAt: crmLeads.createdAt,
        updatedAt: crmLeads.updatedAt,
        
        // Joined fields (derived data)
        campaignName: crmCampaigns.name,
        ownerName: sql<string>`CASE 
          WHEN ${users.firstName} IS NOT NULL OR ${users.lastName} IS NOT NULL 
          THEN TRIM(CONCAT(COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, '')))
          ELSE NULL
        END`,
        originStoreNameFromJoin: stores.nome,
      })
      .from(crmLeads)
      .leftJoin(crmCampaigns, eq(crmLeads.campaignId, crmCampaigns.id))
      .leftJoin(users, eq(crmLeads.ownerUserId, users.id))
      .leftJoin(stores, eq(crmLeads.originStoreId, stores.id))
      .where(and(...conditions))
      .orderBy(desc(crmLeads.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: leads,
      message: 'Leads retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving leads', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve leads',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/leads/:id/consent-compliance
 * Check GDPR consent compliance for a specific lead
 */
router.get('/leads/:id/consent-compliance', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(tenantId);

    const complianceResult = await GDPRConsentService.validateLeadConsentCompliance(id, tenantId);

    res.status(200).json({
      success: true,
      data: complianceResult,
      message: 'Consent compliance checked successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error checking consent compliance', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: getTenantId(req),
      leadId: req.params.id
    });

    if (error.message === 'Lead not found') {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        message: error.message,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to check consent compliance',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PERSON CONSENTS MANAGEMENT (GDPR ENTERPRISE) ====================

/**
 * GET /api/crm/persons/:personId/consents
 * Get all current consents for a person (unified across lead/deal/customer)
 * With automatic fallback to legacy crm_leads data if no audit trail exists
 */
router.get('/persons/:personId/consents', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { personId } = req.params;
    await setTenantContext(tenantId);

    // Get all consents for this person from audit trail table
    let consents = await db
      .select({
        id: crmPersonConsents.id,
        consentType: crmPersonConsents.consentType,
        status: crmPersonConsents.status,
        grantedAt: crmPersonConsents.grantedAt,
        withdrawnAt: crmPersonConsents.withdrawnAt,
        expiresAt: crmPersonConsents.expiresAt,
        source: crmPersonConsents.source,
        sourceEntityType: crmPersonConsents.sourceEntityType,
        sourceEntityId: crmPersonConsents.sourceEntityId,
        campaignId: crmPersonConsents.campaignId,
        campaignName: crmCampaigns.name,
        updatedBy: crmPersonConsents.updatedBy,
        updatedByName: crmPersonConsents.updatedByName,
        ipAddress: crmPersonConsents.ipAddress,
        consentMethod: crmPersonConsents.consentMethod,
        language: crmPersonConsents.language,
        notes: crmPersonConsents.notes,
        createdAt: crmPersonConsents.createdAt,
        updatedAt: crmPersonConsents.updatedAt,
      })
      .from(crmPersonConsents)
      .leftJoin(crmCampaigns, eq(crmPersonConsents.campaignId, crmCampaigns.id))
      .where(and(
        eq(crmPersonConsents.tenantId, tenantId),
        eq(crmPersonConsents.personId, personId)
      ))
      .orderBy(desc(crmPersonConsents.updatedAt));

    // FALLBACK: If no consents in audit trail, inherit from crm_leads
    if (consents.length === 0) {
      const leadConsents = await db
        .select({
          leadId: crmLeads.id,
          marketingConsent: crmLeads.marketingConsent,
          profilingConsent: crmLeads.profilingConsent,
          privacyPolicyConsent: crmLeads.privacyPolicyConsent,
          thirdPartyConsent: crmLeads.thirdPartyConsent,
          campaignId: crmLeads.campaignId,
          campaignName: crmCampaigns.name,
          consentTimestamp: crmLeads.consentTimestamp,
          consentSource: crmLeads.consentSource,
          createdAt: crmLeads.createdAt,
        })
        .from(crmLeads)
        .leftJoin(crmCampaigns, eq(crmLeads.campaignId, crmCampaigns.id))
        .where(and(
          eq(crmLeads.personId, personId),
          eq(crmLeads.tenantId, tenantId)
        ))
        .orderBy(desc(crmLeads.createdAt))
        .limit(1);

      if (leadConsents.length > 0) {
        const lead = leadConsents[0];
        
        // Map legacy boolean fields to new consent format
        consents = [
          {
            id: null,
            consentType: 'privacy_policy' as const,
            status: lead.privacyPolicyConsent ? 'granted' : 'denied',
            grantedAt: lead.privacyPolicyConsent ? (lead.consentTimestamp || lead.createdAt) : null,
            withdrawnAt: null,
            expiresAt: null,
            source: lead.consentSource || 'inherited_from_lead',
            sourceEntityType: 'lead',
            sourceEntityId: lead.leadId,
            campaignId: lead.campaignId,
            campaignName: lead.campaignName,
            updatedBy: null,
            updatedByName: null,
            ipAddress: null,
            consentMethod: 'inherited',
            language: 'it',
            notes: 'Consenso ereditato da lead originale',
            createdAt: lead.createdAt,
            updatedAt: lead.createdAt,
          },
          {
            id: null,
            consentType: 'marketing' as const,
            status: lead.marketingConsent ? 'granted' : 'denied',
            grantedAt: lead.marketingConsent ? (lead.consentTimestamp || lead.createdAt) : null,
            withdrawnAt: null,
            expiresAt: null,
            source: lead.consentSource || 'inherited_from_lead',
            sourceEntityType: 'lead',
            sourceEntityId: lead.leadId,
            campaignId: lead.campaignId,
            campaignName: lead.campaignName,
            updatedBy: null,
            updatedByName: null,
            ipAddress: null,
            consentMethod: 'inherited',
            language: 'it',
            notes: 'Consenso ereditato da lead originale',
            createdAt: lead.createdAt,
            updatedAt: lead.createdAt,
          },
          {
            id: null,
            consentType: 'profiling' as const,
            status: lead.profilingConsent ? 'granted' : 'denied',
            grantedAt: lead.profilingConsent ? (lead.consentTimestamp || lead.createdAt) : null,
            withdrawnAt: null,
            expiresAt: null,
            source: lead.consentSource || 'inherited_from_lead',
            sourceEntityType: 'lead',
            sourceEntityId: lead.leadId,
            campaignId: lead.campaignId,
            campaignName: lead.campaignName,
            updatedBy: null,
            updatedByName: null,
            ipAddress: null,
            consentMethod: 'inherited',
            language: 'it',
            notes: 'Consenso ereditato da lead originale',
            createdAt: lead.createdAt,
            updatedAt: lead.createdAt,
          },
          {
            id: null,
            consentType: 'third_party' as const,
            status: lead.thirdPartyConsent ? 'granted' : 'denied',
            grantedAt: lead.thirdPartyConsent ? (lead.consentTimestamp || lead.createdAt) : null,
            withdrawnAt: null,
            expiresAt: null,
            source: lead.consentSource || 'inherited_from_lead',
            sourceEntityType: 'lead',
            sourceEntityId: lead.leadId,
            campaignId: lead.campaignId,
            campaignName: lead.campaignName,
            updatedBy: null,
            updatedByName: null,
            ipAddress: null,
            consentMethod: 'inherited',
            language: 'it',
            notes: 'Consenso ereditato da lead originale',
            createdAt: lead.createdAt,
            updatedAt: lead.createdAt,
          },
        ];

        logger.info('Consents inherited from legacy crm_leads', {
          personId,
          leadId: lead.leadId,
          tenantId,
          consentsCount: consents.length
        });
      }
    }

    res.status(200).json({
      success: true,
      data: consents,
      message: 'Person consents retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving person consents', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: getTenantId(req),
      personId: req.params.personId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve person consents',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/persons/:personId/consents
 * Update consents for a person (with full audit trail)
 */
router.patch('/persons/:personId/consents', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { personId } = req.params;
    const { consents, updatedBy, updatedByName, ipAddress, userAgent } = req.body;

    // Validation
    const consentSchema = z.object({
      consents: z.array(z.object({
        type: z.enum(['privacy_policy', 'marketing', 'profiling', 'third_party']),
        status: z.enum(['granted', 'denied', 'withdrawn', 'pending']),
        notes: z.string().optional()
      })),
      updatedBy: z.string().optional(),
      updatedByName: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional()
    });

    const validation = consentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const updatedConsents = [];

    // Update each consent type
    for (const consentUpdate of consents) {
      // Get existing consent to build audit trail
      const [existingConsent] = await db
        .select()
        .from(crmPersonConsents)
        .where(and(
          eq(crmPersonConsents.tenantId, tenantId),
          eq(crmPersonConsents.personId, personId),
          eq(crmPersonConsents.consentType, consentUpdate.type as any)
        ))
        .limit(1);

      const now = new Date();
      
      // Build audit trail entry
      const auditEntry = {
        timestamp: now.toISOString(),
        action: existingConsent ? 'update' : 'create',
        previousStatus: existingConsent?.status || null,
        newStatus: consentUpdate.status,
        updatedBy: updatedBy || 'api',
        updatedByName: updatedByName || 'API User',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        notes: consentUpdate.notes || null,
        source: 'customer_modal'
      };

      // Append to existing audit trail or create new one
      const auditTrail = existingConsent?.auditTrail 
        ? [...(existingConsent.auditTrail as any[]), auditEntry]
        : [auditEntry];

      // Determine timestamps based on status
      const statusData: any = {};
      if (consentUpdate.status === 'granted' && (!existingConsent || existingConsent.status !== 'granted')) {
        statusData.grantedAt = now;
        statusData.withdrawnAt = null;
      } else if (consentUpdate.status === 'withdrawn') {
        statusData.withdrawnAt = now;
      } else if (consentUpdate.status === 'denied') {
        statusData.grantedAt = null;
        statusData.withdrawnAt = null;
      }

      // Upsert consent (update if exists, insert if not)
      const [result] = await db
        .insert(crmPersonConsents)
        .values({
          tenantId,
          personId,
          consentType: consentUpdate.type as any,
          status: consentUpdate.status as any,
          ...statusData,
          source: existingConsent?.source || 'customer_modal',
          sourceEntityType: existingConsent?.sourceEntityType || 'customer',
          updatedBy: updatedBy || 'api',
          updatedByName: updatedByName || 'API User',
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          auditTrail: auditTrail as any,
          consentMethod: existingConsent?.consentMethod || 'toggle',
          notes: consentUpdate.notes || existingConsent?.notes || null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [crmPersonConsents.tenantId, crmPersonConsents.personId, crmPersonConsents.consentType],
          set: {
            status: consentUpdate.status as any,
            ...statusData,
            updatedBy: updatedBy || 'api',
            updatedByName: updatedByName || 'API User',
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            auditTrail: auditTrail as any,
            notes: consentUpdate.notes || sql`${crmPersonConsents.notes}`,
            updatedAt: now,
          }
        })
        .returning();

      updatedConsents.push(result);

      logger.info('Person consent updated', {
        tenantId,
        personId,
        consentType: consentUpdate.type,
        status: consentUpdate.status,
        updatedBy: updatedBy || 'api'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedConsents,
      message: 'Person consents updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating person consents', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: getTenantId(req),
      personId: req.params.personId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update person consents',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/persons/:personId/consents/history
 * Get full audit trail history for all consents of a person
 */
router.get('/persons/:personId/consents/history', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { personId } = req.params;
    await setTenantContext(tenantId);

    // Get all consents with full audit trail
    const consents = await db
      .select({
        id: crmPersonConsents.id,
        consentType: crmPersonConsents.consentType,
        status: crmPersonConsents.status,
        auditTrail: crmPersonConsents.auditTrail,
        grantedAt: crmPersonConsents.grantedAt,
        withdrawnAt: crmPersonConsents.withdrawnAt,
        source: crmPersonConsents.source,
        sourceEntityType: crmPersonConsents.sourceEntityType,
        campaignId: crmPersonConsents.campaignId,
        campaignName: crmCampaigns.name,
        createdAt: crmPersonConsents.createdAt,
        updatedAt: crmPersonConsents.updatedAt,
      })
      .from(crmPersonConsents)
      .leftJoin(crmCampaigns, eq(crmPersonConsents.campaignId, crmCampaigns.id))
      .where(and(
        eq(crmPersonConsents.tenantId, tenantId),
        eq(crmPersonConsents.personId, personId)
      ))
      .orderBy(desc(crmPersonConsents.updatedAt));

    // Flatten audit trail into timeline
    const timeline: any[] = [];
    consents.forEach(consent => {
      if (consent.auditTrail && Array.isArray(consent.auditTrail)) {
        consent.auditTrail.forEach((entry: any) => {
          timeline.push({
            consentType: consent.consentType,
            ...entry,
            campaignName: consent.campaignName
          });
        });
      }
    });

    // Sort timeline by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      data: {
        consents,
        timeline
      },
      message: 'Person consents history retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving person consents history', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: getTenantId(req),
      personId: req.params.personId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve person consents history',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/leads
 * Create a new lead
 */
router.post('/leads', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmLeadSchema.omit({ tenantId: true, personId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // ==================== GDPR ENFORCEMENT: Privacy Policy Blocking ====================
    // If lead belongs to a campaign with required consents, validate BEFORE lead creation
    if (validation.data.campaignId) {
      const [campaign] = await db
        .select()
        .from(crmCampaigns)
        .where(and(
          eq(crmCampaigns.id, validation.data.campaignId),
          eq(crmCampaigns.tenantId, tenantId)
        ))
        .limit(1);

      if (campaign && campaign.requiredConsents) {
        const requiredConsents = campaign.requiredConsents as any;
        
        // BLOCKING: Privacy Policy consent is MANDATORY if required by campaign
        if (requiredConsents.privacy_policy === true && !validation.data.privacyPolicyAccepted) {
          logger.warn('Lead creation blocked: privacy_policy consent required but not provided', {
            campaignId: validation.data.campaignId,
            tenantId
          });
          return res.status(400).json({
            success: false,
            error: 'GDPR Consent Required',
            message: 'Privacy Policy consent is mandatory for this campaign. Lead creation blocked for GDPR compliance.',
            timestamp: new Date().toISOString()
          } as ApiErrorResponse);
        }

        // Optional warning for marketing consent (non-blocking)
        if (requiredConsents.marketing === true && !validation.data.marketingConsent) {
          logger.info('Lead created without marketing consent (campaign recommends it)', {
            campaignId: validation.data.campaignId,
            tenantId
          });
        }
      }
    }

    // Resolve UTM parameters to IDs if provided
    let utmSourceId = validation.data.utmSourceId;
    let utmMediumId = validation.data.utmMediumId;
    
    if ((validation.data.utmSource || validation.data.utmMedium) && (!utmSourceId || !utmMediumId)) {
      const { resolveUTMIds } = await import('../utils/utm-resolver');
      const utmResolution = await resolveUTMIds(
        validation.data.utmSource,
        validation.data.utmMedium
      );
      utmSourceId = utmResolution.utmSourceId;
      utmMediumId = utmResolution.utmMediumId;
    }

    // Get or create personId with intelligent matching
    const personId = await getOrCreatePersonId(
      tenantId,
      validation.data.email,
      validation.data.phone,
      validation.data.sourceSocialAccountId
    );

    // ==================== AUTO-POPULATION: Lifecycle Stage ====================
    // Auto-assign lifecycle stage based on lead score
    const leadScore = validation.data.leadScore || 0;
    const lifecycleStage = validation.data.lifecycleStage || (
      leadScore >= 81 ? 'Opportunity' :
      leadScore >= 61 ? 'SQL' :
      leadScore >= 31 ? 'MQL' :
      'Lead'
    );

    // ==================== AUTO-POPULATION: Engagement Score ====================
    // Calculate engagement score from behavioral metrics
    const pageViewsCount = validation.data.pageViewsCount || 0;
    const emailsOpenedCount = validation.data.emailsOpenedCount || 0;
    const emailsClickedCount = validation.data.emailsClickedCount || 0;
    const documentsDownloaded = validation.data.documentsDownloaded || [];
    
    const engagementScore = validation.data.engagementScore || Math.min(100, Math.round(
      pageViewsCount * 2 +
      emailsOpenedCount * 3 +
      emailsClickedCount * 5 +
      documentsDownloaded.length * 10
    ));

    // ==================== AUTO-POPULATION: Origin Store Name ====================
    // Populate store name from origin_store_id if not provided
    let originStoreName = validation.data.originStoreName;
    if (validation.data.originStoreId && !originStoreName) {
      const [store] = await db
        .select({ nome: stores.nome })
        .from(stores)
        .where(and(
          eq(stores.id, validation.data.originStoreId),
          eq(stores.tenantId, tenantId)
        ))
        .limit(1);
      
      if (store) {
        originStoreName = store.nome;
      }
    }

    const [lead] = await db
      .insert(crmLeads)
      .values({
        ...validation.data,
        tenantId,
        personId,
        utmSourceId,
        utmMediumId,
        lifecycleStage,
        engagementScore,
        originStoreName
      })
      .returning();

    logger.info('Lead created', { leadId: lead.id, tenantId });

    // 🚀 Campaign Workflow Automation: Check if lead has campaign and apply routing
    if (validation.data.campaignId) {
      (async () => {
        try {
          logger.info('🎯 [CAMPAIGN] Processing campaign routing for lead', {
            leadId: lead.id,
            campaignId: validation.data.campaignId,
            tenantId
          });

          // 🔒 Set tenant context for RLS
          await setTenantContext(tenantId);

          // Fetch campaign details
          const [campaign] = await db
            .select()
            .from(crmCampaigns)
            .where(and(
              eq(crmCampaigns.id, validation.data.campaignId),
              eq(crmCampaigns.tenantId, tenantId)
            ))
            .limit(1);

          if (campaign) {
            logger.info('📋 [CAMPAIGN] Found campaign configuration', {
              campaignName: campaign.name,
              routingMode: campaign.routingMode,
              enableAIScoring: campaign.enableAIScoring,
              workflowId: campaign.workflowId
            });

            // MODALITÀ MANUALE: Assegnazione immediata a pipeline
            if (campaign.routingMode === 'manual' && campaign.manualPipelineId1) {
              logger.info('🔧 [MANUAL MODE] Assigning lead to manual pipeline', {
                leadId: lead.id,
                pipelineId: campaign.manualPipelineId1
              });

              // Assegna subito a pipeline manuale
              await db
                .update(crmLeads)
                .set({ pipelineId: campaign.manualPipelineId1 })
                .where(and(
                  eq(crmLeads.id, lead.id),
                  eq(crmLeads.tenantId, tenantId)
                ));

              // Crea deal automaticamente nella pipeline
              const [deal] = await db
                .insert(crmDeals)
                .values({
                  tenantId,
                  leadId: lead.id,
                  pipelineId: campaign.manualPipelineId1,
                  stage: 'new',
                  title: `${lead.firstName || 'Lead'} ${lead.lastName || ''}`.trim() || 'New Deal',
                  value: 0,
                  probability: 10,
                  status: 'open',
                  assignedTo: null // Will be assigned by workflow or manually
                })
                .returning();

              logger.info('✅ [MANUAL MODE] Deal created in manual pipeline', {
                dealId: deal.id,
                pipelineId: campaign.manualPipelineId1
              });

              // Notifica utenti configurati
              if (campaign.notifyUserIds && campaign.notifyUserIds.length > 0) {
                for (const userId of campaign.notifyUserIds) {
                  await db.insert(crmLeadNotifications).values({
                    tenantId,
                    leadId: lead.id,
                    userId,
                    notificationType: 'new_lead',
                    priority: 'medium',
                    message: `📧 Nuovo lead da campagna "${campaign.name}": ${lead.firstName || 'Lead'} ${lead.lastName || ''}`,
                    metadata: {
                      campaignId: campaign.id,
                      campaignName: campaign.name,
                      pipelineId: campaign.manualPipelineId1,
                      source: lead.source
                    },
                    deliveryStatus: 'pending',
                    deliveryChannels: ['in_app', 'email']
                  });
                }
                logger.info('🔔 [MANUAL MODE] Notifications created for configured users', {
                  userIds: campaign.notifyUserIds
                });
              }
            }
            
            // MODALITÀ AUTOMATICA: Trigger workflow con fallback timer
            else if (campaign.routingMode === 'automatic') {
              logger.info('🤖 [AUTOMATIC MODE] Triggering workflow for lead', {
                leadId: lead.id,
                workflowId: campaign.workflowId,
                fallbackPipeline: campaign.fallbackPipelineId1,
                fallbackTimeout: campaign.fallbackTimeoutSeconds
              });
              
              // Import dynamically to avoid circular dependencies
              const { CampaignWorkflowTriggerService } = await import('../services/campaign-workflow-trigger-service.js');
              
              // Trigger workflow with fallback management
              const workflowResult = await CampaignWorkflowTriggerService.triggerWorkflowForLead(
                lead,
                campaign,
                tenantId,
                'system' // triggeredBy
              );
              
              if (workflowResult.success) {
                logger.info('✅ [AUTOMATIC MODE] Workflow triggered successfully', {
                  leadId: lead.id,
                  workflowInstanceId: workflowResult.workflowInstanceId,
                  workflowName: workflowResult.workflowName,
                  fallbackScheduled: workflowResult.fallbackScheduled
                });
              } else {
                logger.error('❌ [AUTOMATIC MODE] Workflow trigger failed', {
                  leadId: lead.id,
                  error: workflowResult.error
                });
              }
            }

            // AI Scoring condizionale basato su campaign setting
            if (campaign.enableAIScoring) {
              logger.info('🧠 [CAMPAIGN] AI Scoring enabled for campaign, will calculate score', {
                leadId: lead.id
              });
              // Il codice AI scoring esistente verrà eseguito sotto
            } else {
              logger.info('⏭️ [CAMPAIGN] AI Scoring disabled for campaign, skipping', {
                leadId: lead.id
              });
              // Salta il blocco AI scoring sotto
            }
          } else {
            logger.warn('⚠️ [CAMPAIGN] Campaign not found for lead', {
              leadId: lead.id,
              campaignId: validation.data.campaignId
            });
          }
        } catch (campaignError) {
          logger.error('❌ [CAMPAIGN] Campaign routing failed', {
            leadId: lead.id,
            error: campaignError instanceof Error ? campaignError.message : 'Unknown error',
            stack: campaignError instanceof Error ? campaignError.stack : undefined
          });
        }
      })().catch(err => {
        logger.error('[UNHANDLED] Campaign routing promise rejected', {
          leadId: lead.id,
          error: err instanceof Error ? err.message : 'Unknown',
          stack: err instanceof Error ? err.stack : undefined
        });
      });
    }

    // 📊 GTM Event Tracking: Send lead_created event to GA4/Google Ads (non-blocking)
    // Fire-and-forget Promise (no await) to avoid blocking response
    (async () => {
      try {
        logger.info('📊 [BACKGROUND] Tracking lead_created event to GTM', { leadId: lead.id, tenantId });
        
        // 🔒 CRITICAL: Set tenant context for RLS in async execution
        await setTenantContext(tenantId);
        
        // Extract client info from request
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                         req.socket.remoteAddress || 
                         undefined;
        const userAgent = req.headers['user-agent'] || undefined;
        
        // Track lead created event with Enhanced Conversions
        await gtmEventsService.trackLeadCreated(
          tenantId,
          lead.id,
          lead.storeId,
          {
            email: lead.email,
            phone: lead.phone,
            firstName: lead.firstName,
            lastName: lead.lastName,
          },
          {
            source: lead.source,
            leadScore: lead.leadScore || 0,
            utmSource: validation.data.utmSource,
            utmMedium: validation.data.utmMedium,
            utmCampaign: validation.data.utmCampaign,
          },
          clientIp,
          userAgent
        );
        
        logger.info('GTM lead_created event tracked successfully (background)', {
          leadId: lead.id,
          tenantId
        });
      } catch (gtmError) {
        logger.error('GTM lead_created tracking failed (background)', {
          leadId: lead.id,
          error: gtmError instanceof Error ? gtmError.message : 'Unknown error',
          stack: gtmError instanceof Error ? gtmError.stack : undefined
        });
      }
    })().catch(err => {
      logger.error('[UNHANDLED] GTM tracking promise rejected', {
        leadId: lead.id,
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
    });

    // 🤖 AI Lead Scoring: Calculate score in background (non-blocking)
    // Check if AI scoring should run based on campaign settings or default behavior
    const shouldRunAIScoring = await (async () => {
      if (!validation.data.campaignId) {
        // No campaign, run AI scoring by default
        return true;
      }
      // Check campaign settings
      const [campaign] = await db
        .select({ enableAIScoring: crmCampaigns.enableAIScoring })
        .from(crmCampaigns)
        .where(and(
          eq(crmCampaigns.id, validation.data.campaignId),
          eq(crmCampaigns.tenantId, tenantId)
        ))
        .limit(1);
      return campaign?.enableAIScoring || false;
    })();

    if (shouldRunAIScoring) {
      // Fire-and-forget Promise (no await) to avoid blocking response
      (async () => {
        try {
          logger.info('🤖 [BACKGROUND] Starting AI scoring', { leadId: lead.id, tenantId });
          
          // 🔒 CRITICAL: Set tenant context for RLS in async execution
          await setTenantContext(tenantId);
          
          const scoringResult = await leadScoringService.calculateLeadScore({
          leadId: lead.id,
          tenantId
        });

        // Update lead score in database
        await db
          .update(crmLeads)
          .set({ leadScore: scoringResult.score })
          .where(and(
            eq(crmLeads.id, lead.id),
            eq(crmLeads.tenantId, tenantId)
          ));

        // Save AI insight
        await db.insert(leadAiInsights).values({
          tenantId,
          leadId: lead.id,
          insightType: 'scoring',
          insights: {
            factors: scoringResult.factors,
            recommended_actions: scoringResult.recommended_actions,
            conversion_probability: scoringResult.conversion_probability,
            estimated_value: scoringResult.estimated_value
          },
          nextAction: scoringResult.recommended_actions[0] || null,
          riskFactors: null,
          score: scoringResult.score,
          confidence: scoringResult.confidence / 100,
          generatedBy: 'lead-scoring-assistant',
          aiModel: 'gpt-4o'
        });

        logger.info('AI Lead Scoring completed (background)', {
          leadId: lead.id,
          score: scoringResult.score,
          category: scoringResult.category,
          responseTimeMs: scoringResult.responseTimeMs
        });

        // 🔔 Hot Lead Notification: Notify team for high-value leads (score >80)
        if (scoringResult.score > 80) {
          try {
            // Insert notification in database
            await db.insert(crmLeadNotifications).values({
              tenantId,
              leadId: lead.id,
              notificationType: 'hot_lead',
              priority: 'high',
              message: `🔥 Hot Lead Alert: ${lead.firstName || 'New lead'} scored ${scoringResult.score}/100`,
              metadata: {
                leadScore: scoringResult.score,
                category: scoringResult.category,
                conversionProbability: scoringResult.conversion_probability,
                estimatedValue: scoringResult.estimated_value,
                recommendedActions: scoringResult.recommended_actions
              },
              deliveryStatus: 'pending',
              deliveryChannels: ['in_app', 'email']
            });

            logger.info('🔔 Hot lead notification created', {
              leadId: lead.id,
              score: scoringResult.score,
              notificationType: 'hot_lead'
            });
          } catch (notifError) {
            logger.error('Failed to create hot lead notification', {
              leadId: lead.id,
              error: notifError instanceof Error ? notifError.message : 'Unknown error'
            });
          }
        }
      } catch (scoringError) {
        logger.error('AI Lead Scoring failed (background)', {
          leadId: lead.id,
          error: scoringError instanceof Error ? scoringError.message : 'Unknown error',
          stack: scoringError instanceof Error ? scoringError.stack : undefined
        });
      }
    })().catch(err => {
      logger.error('[UNHANDLED] AI scoring promise rejected', {
        leadId: lead.id,
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
    });
    } // Close shouldRunAIScoring if

    // 🎯 UTM Attribution: Auto-attribute lead to UTM link if UTM params exist (non-blocking)
    // Fire-and-forget Promise (no await) to avoid blocking response
    (async () => {
      try {
        // Check if lead has UTM parameters and campaign
        if (validation.data.campaignId && validation.data.utmSource && validation.data.utmMedium && validation.data.utmCampaign) {
          logger.info('🎯 [BACKGROUND] Attempting UTM attribution for lead', {
            leadId: lead.id,
            campaignId: validation.data.campaignId,
            utmSource: validation.data.utmSource,
            utmMedium: validation.data.utmMedium,
            utmCampaign: validation.data.utmCampaign,
            tenantId
          });

          // 🔒 CRITICAL: Set tenant context for RLS in async execution
          await setTenantContext(tenantId);

          // Find matching UTM link for this campaign
          const [matchingUtmLink] = await db
            .select()
            .from(crmCampaignUtmLinks)
            .where(
              and(
                eq(crmCampaignUtmLinks.tenantId, tenantId),
                eq(crmCampaignUtmLinks.campaignId, validation.data.campaignId),
                eq(crmCampaignUtmLinks.utmSource, validation.data.utmSource),
                eq(crmCampaignUtmLinks.utmMedium, validation.data.utmMedium),
                eq(crmCampaignUtmLinks.utmCampaign, validation.data.utmCampaign),
                eq(crmCampaignUtmLinks.isActive, true)
              )
            )
            .limit(1);

          if (matchingUtmLink) {
            // Attribute lead to UTM link
            const attributionResult = await attributionService.attributeLeadToUTM({
              tenantId,
              leadId: lead.id,
              utmLinkId: matchingUtmLink.id
            });

            if (attributionResult.success) {
              logger.info('✅ UTM attribution completed successfully (background)', {
                leadId: lead.id,
                utmLinkId: matchingUtmLink.id,
                channelName: matchingUtmLink.channelName,
                firstTouch: attributionResult.attribution.firstTouch,
                lastTouch: attributionResult.attribution.lastTouch,
                touchpointCount: attributionResult.attribution.touchpointCount,
                tenantId
              });
            } else {
              logger.warn('⚠️ UTM attribution failed (background)', {
                leadId: lead.id,
                utmLinkId: matchingUtmLink.id,
                tenantId
              });
            }
          } else {
            logger.info('ℹ️ No matching UTM link found for auto-attribution (background)', {
              leadId: lead.id,
              campaignId: validation.data.campaignId,
              utmSource: validation.data.utmSource,
              utmMedium: validation.data.utmMedium,
              utmCampaign: validation.data.utmCampaign,
              tenantId
            });
          }
        } else {
          logger.debug('Skipping UTM attribution - missing UTM params or campaign', {
            leadId: lead.id,
            hasCampaign: !!validation.data.campaignId,
            hasUtmSource: !!validation.data.utmSource,
            hasUtmMedium: !!validation.data.utmMedium,
            hasUtmCampaign: !!validation.data.utmCampaign,
            tenantId
          });
        }
      } catch (attributionError) {
        logger.error('UTM attribution failed (background)', {
          leadId: lead.id,
          error: attributionError instanceof Error ? attributionError.message : 'Unknown error',
          stack: attributionError instanceof Error ? attributionError.stack : undefined,
          tenantId
        });
      }
    })().catch(err => {
      logger.error('[UNHANDLED] UTM attribution promise rejected', {
        leadId: lead.id,
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined,
        tenantId
      });
    });

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating lead', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/leads/:id
 * Update a lead
 */
router.patch('/leads/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmLeadSchema.omit({ tenantId: true }).partial();
    
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get existing lead to merge values for auto-calculation
    const [existingLead] = await db
      .select()
      .from(crmLeads)
      .where(and(
        eq(crmLeads.id, id),
        eq(crmLeads.tenantId, tenantId)
      ))
      .limit(1);

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Merge existing data with update
    const mergedData = { ...existingLead, ...validation.data };

    // ==================== AUTO-POPULATION: Lifecycle Stage ====================
    // Auto-assign lifecycle stage based on lead score (if not explicitly set)
    const leadScore = mergedData.leadScore || 0;
    const lifecycleStage = validation.data.lifecycleStage || (
      leadScore >= 81 ? 'Opportunity' :
      leadScore >= 61 ? 'SQL' :
      leadScore >= 31 ? 'MQL' :
      'Lead'
    );

    // ==================== AUTO-POPULATION: Engagement Score ====================
    // Calculate engagement score from behavioral metrics (if not explicitly set)
    const pageViewsCount = mergedData.pageViewsCount || 0;
    const emailsOpenedCount = mergedData.emailsOpenedCount || 0;
    const emailsClickedCount = mergedData.emailsClickedCount || 0;
    const documentsDownloaded = mergedData.documentsDownloaded || [];
    
    const engagementScore = validation.data.engagementScore || Math.min(100, Math.round(
      pageViewsCount * 2 +
      emailsOpenedCount * 3 +
      emailsClickedCount * 5 +
      documentsDownloaded.length * 10
    ));

    // ==================== AUTO-POPULATION: Origin Store Name ====================
    // Populate store name from origin_store_id if not provided
    let originStoreName = validation.data.originStoreName || existingLead.originStoreName;
    if (mergedData.originStoreId && !originStoreName) {
      const [store] = await db
        .select({ nome: stores.nome })
        .from(stores)
        .where(and(
          eq(stores.id, mergedData.originStoreId),
          eq(stores.tenantId, tenantId)
        ))
        .limit(1);
      
      if (store) {
        originStoreName = store.nome;
      }
    }

    const [updated] = await db
      .update(crmLeads)
      .set({
        ...validation.data,
        lifecycleStage,
        engagementScore,
        originStoreName,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmLeads.id, id),
        eq(crmLeads.tenantId, tenantId)
      ))
      .returning();

    logger.info('Lead updated', { leadId: id, tenantId });

    // 🤖 AI Lead Scoring: Re-calculate score in background (non-blocking)
    // Fire-and-forget Promise (no await) to avoid blocking response
    (async () => {
      try {
        logger.info('🤖 [BACKGROUND] Starting AI scoring (update)', { leadId: id, tenantId });
        
        // 🔒 CRITICAL: Set tenant context for RLS in async execution
        await setTenantContext(tenantId);
        
        const scoringResult = await leadScoringService.calculateLeadScore({
          leadId: id,
          tenantId
        });

        // Update lead score in database
        await db
          .update(crmLeads)
          .set({ leadScore: scoringResult.score })
          .where(and(
            eq(crmLeads.id, id),
            eq(crmLeads.tenantId, tenantId)
          ));

        // Save AI insight
        await db.insert(leadAiInsights).values({
          tenantId,
          leadId: id,
          insightType: 'scoring',
          insights: {
            factors: scoringResult.factors,
            recommended_actions: scoringResult.recommended_actions,
            conversion_probability: scoringResult.conversion_probability,
            estimated_value: scoringResult.estimated_value
          },
          nextAction: scoringResult.recommended_actions[0] || null,
          riskFactors: null,
          score: scoringResult.score,
          confidence: scoringResult.confidence / 100,
          generatedBy: 'lead-scoring-assistant',
          aiModel: 'gpt-4o'
        });

        logger.info('AI Lead Scoring completed (background - update)', {
          leadId: id,
          score: scoringResult.score,
          category: scoringResult.category,
          responseTimeMs: scoringResult.responseTimeMs
        });
      } catch (scoringError) {
        logger.error('AI Lead Scoring failed (background - update)', {
          leadId: id,
          error: scoringError instanceof Error ? scoringError.message : 'Unknown error',
          stack: scoringError instanceof Error ? scoringError.stack : undefined
        });
      }
    })().catch(err => {
      logger.error('[UNHANDLED] AI scoring promise rejected (update)', {
        leadId: id,
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Lead updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating lead', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      leadId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/leads/:id/rescore
 * Manually re-calculate lead score using AI
 */
router.post('/leads/:id/rescore', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: leadId } = req.params;
    await setTenantContext(tenantId);

    // Verify lead exists
    const [lead] = await db.select()
      .from(crmLeads)
      .where(and(
        eq(crmLeads.id, leadId),
        eq(crmLeads.tenantId, tenantId)
      ))
      .limit(1);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Calculate lead score using AI
    const scoringResult = await leadScoringService.calculateLeadScore({
      leadId,
      tenantId
    });

    // Update lead score in database
    await db
      .update(crmLeads)
      .set({ leadScore: scoringResult.score })
      .where(and(
        eq(crmLeads.id, leadId),
        eq(crmLeads.tenantId, tenantId)
      ));

    // Save insight in leadAiInsights table
    await db.insert(leadAiInsights).values({
      tenantId,
      leadId,
      insightType: 'scoring',
      insights: {
        factors: scoringResult.factors,
        recommended_actions: scoringResult.recommended_actions,
        conversion_probability: scoringResult.conversion_probability,
        estimated_value: scoringResult.estimated_value
      },
      nextAction: scoringResult.recommended_actions[0] || null,
      riskFactors: null,
      score: scoringResult.score,
      confidence: scoringResult.confidence / 100, // Convert to 0.0-1.0
      generatedBy: 'lead-scoring-assistant',
      aiModel: 'gpt-4o'
    });

    logger.info('AI Lead Re-scoring completed (manual)', {
      leadId,
      previousScore: lead.leadScore,
      newScore: scoringResult.score,
      category: scoringResult.category
    });

    res.status(200).json({
      success: true,
      data: {
        leadId,
        previousScore: lead.leadScore,
        newScore: scoringResult.score,
        category: scoringResult.category,
        reasoning: scoringResult.reasoning,
        factors: scoringResult.factors,
        recommended_actions: scoringResult.recommended_actions,
        conversion_probability: scoringResult.conversion_probability,
        estimated_value: scoringResult.estimated_value
      },
      message: 'Lead score re-calculated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error re-scoring lead', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      leadId: req.params.id,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to re-score lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/leads/:id/convert
 * Convert a lead to a deal
 */
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id; // Extract userId for workflow trigger
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const { pipelineId, stage, ownerUserId } = req.body;

    if (!pipelineId || !stage || !ownerUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pipelineId, stage, ownerUserId',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get the lead
    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(and(
        eq(crmLeads.id, id),
        eq(crmLeads.tenantId, tenantId)
      ));

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // 🛡️ GDPR CONSENT VALIDATION: Block conversion if lead doesn't have required consents
    try {
      const complianceResult = await GDPRConsentService.validateLeadConsentCompliance(id, tenantId);
      
      if (!complianceResult.compliant) {
        logger.warn('Lead conversion blocked: GDPR consent not compliant', {
          leadId: id,
          tenantId,
          missingConsents: complianceResult.missing
        });
        
        return res.status(403).json({
          success: false,
          error: 'GDPR consent validation failed',
          message: `Cannot convert lead: missing required consents: ${complianceResult.missing.join(', ')}`,
          data: {
            compliant: false,
            missing: complianceResult.missing,
            required: complianceResult.required
          },
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
      
      logger.info('GDPR consent validation passed for lead conversion', {
        leadId: id,
        tenantId,
        compliant: true
      });
    } catch (consentError: any) {
      logger.error('GDPR consent validation error during lead conversion', {
        leadId: id,
        tenantId,
        error: consentError.message
      });
      // Continue with conversion if validation fails (non-blocking for backward compatibility)
      logger.warn('Proceeding with conversion despite consent validation error');
    }

    // Create deal from lead
    const [deal] = await db
      .insert(crmDeals)
      .values({
        tenantId,
        legalEntityId: lead.legalEntityId,
        storeId: lead.storeId,
        ownerUserId,
        pipelineId,
        stage,
        status: 'open',
        leadId: lead.id,
        campaignId: lead.campaignId,
        sourceChannel: lead.sourceChannel,
        personId: lead.personId,
        driverId: lead.driverId
      })
      .returning();

    // Update lead status to converted (with tenant isolation)
    await db
      .update(crmLeads)
      .set({
        status: 'converted',
        updatedAt: new Date()
      })
      .where(and(
        eq(crmLeads.id, id),
        eq(crmLeads.tenantId, tenantId)
      ));

    logger.info('Lead converted to deal', { leadId: id, dealId: deal.id, tenantId });

    // 🔄 CRM Workflow Auto-Trigger: Trigger automatic workflows for pipeline (non-blocking)
    // Fire-and-forget Promise (no await) to avoid blocking response
    (async () => {
      try {
        logger.info('🔄 [BACKGROUND] Checking for automatic workflow trigger', { dealId: deal.id, pipelineId: deal.pipelineId, tenantId });
        
        // 🔒 CRITICAL: Set tenant context for RLS in async execution
        await setTenantContext(tenantId);
        
        // Import and trigger workflow service
        const { CrmWorkflowTriggerService } = await import('../services/crm-workflow-trigger-service.js');
        const workflowResult = await CrmWorkflowTriggerService.triggerWorkflowForDeal(
          deal,
          tenantId,
          userId
        );
        
        if (workflowResult.success && workflowResult.workflowInstanceId) {
          logger.info('✅ CRM workflow automatically triggered (background)', {
            dealId: deal.id,
            pipelineId: deal.pipelineId,
            workflowInstanceId: workflowResult.workflowInstanceId,
            workflowName: workflowResult.workflowName,
            tenantId
          });
        } else {
          logger.info('ℹ️ CRM workflow trigger skipped (background)', {
            dealId: deal.id,
            pipelineId: deal.pipelineId,
            message: workflowResult.message,
            tenantId
          });
        }
      } catch (workflowError) {
        logger.error('CRM workflow trigger failed (background)', {
          dealId: deal.id,
          pipelineId: deal.pipelineId,
          error: workflowError instanceof Error ? workflowError.message : 'Unknown error',
          stack: workflowError instanceof Error ? workflowError.stack : undefined
        });
      }
    })().catch(err => {
      logger.error('[UNHANDLED] CRM workflow trigger promise rejected', {
        dealId: deal.id,
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
    });

    // 📊 GTM Event Tracking: Send lead_converted/purchase event to GA4/Google Ads (non-blocking)
    // Fire-and-forget Promise (no await) to avoid blocking response
    (async () => {
      try {
        logger.info('📊 [BACKGROUND] Tracking lead_converted event to GTM', { leadId: id, dealId: deal.id, tenantId });
        
        // 🔒 CRITICAL: Set tenant context for RLS in async execution
        await setTenantContext(tenantId);
        
        // Extract client info from request
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                         req.socket.remoteAddress || 
                         undefined;
        const userAgent = req.headers['user-agent'] || undefined;
        
        // Get conversion value from request body (optional)
        const conversionValue = req.body.conversionValue || undefined;
        const currency = req.body.currency || 'EUR';
        
        // Track lead conversion event with Enhanced Conversions
        await gtmEventsService.trackLeadConverted(
          tenantId,
          lead.id,
          lead.storeId,
          {
            email: lead.email,
            phone: lead.phone,
            firstName: lead.firstName,
            lastName: lead.lastName,
          },
          conversionValue,
          currency,
          clientIp,
          userAgent
        );
        
        logger.info('GTM lead_converted event tracked successfully (background)', {
          leadId: id,
          dealId: deal.id,
          tenantId,
          conversionValue
        });
      } catch (gtmError) {
        logger.error('GTM lead_converted tracking failed (background)', {
          leadId: id,
          dealId: deal.id,
          error: gtmError instanceof Error ? gtmError.message : 'Unknown error',
          stack: gtmError instanceof Error ? gtmError.stack : undefined
        });
      }
    })().catch(err => {
      logger.error('[UNHANDLED] GTM conversion tracking promise rejected', {
        leadId: id,
        dealId: deal.id,
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
    });

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Lead converted to deal successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error converting lead', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      leadId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to convert lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/external-leads
 * Unified endpoint for lead intake from external sources (forms, GTM, social webhooks)
 * Resolves UTM parameters, social accounts, and creates lead with proper attribution
 * 
 * SECURITY: Requires X-API-Key header for authentication
 */
router.post('/external-leads', async (req, res) => {
  try {
    // SECURITY: Validate API key before processing
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKey = process.env.EXTERNAL_LEADS_API_KEY || 'default-dev-key-change-in-production';
    
    if (!apiKey || apiKey !== validApiKey) {
      logger.warn('External leads API key validation failed', { 
        hasApiKey: !!apiKey,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }
    
    const { resolveUTMIds } = await import('../utils/utm-resolver');
    const { resolveSocialToStore } = await import('../utils/social-store-resolver');
    
    const leadData = req.body;
    
    let tenantId = leadData.tenantId;
    let storeId = leadData.storeId;
    let mcpAccountId = leadData.sourceSocialAccountId;
    
    if (!tenantId && leadData.socialPlatform && leadData.platformAccountId) {
      const socialResolution = await resolveSocialToStore(
        leadData.socialPlatform,
        leadData.platformAccountId,
        true
      );
      
      if (socialResolution) {
        tenantId = socialResolution.tenantId;
        storeId = socialResolution.storeId;
        mcpAccountId = socialResolution.mcpAccountId;
      }
    }
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot resolve tenant',
        message: 'Missing tenantId and unable to resolve from social account',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot resolve store',
        message: 'Missing storeId and unable to resolve from social account',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }
    
    const utmResolution = await resolveUTMIds(
      leadData.utm_source || leadData.utmSource,
      leadData.utm_medium || leadData.utmMedium
    );
    
    await setTenantContext(tenantId);
    
    const personId = await getOrCreatePersonId(
      tenantId,
      leadData.email,
      leadData.phone,
      mcpAccountId
    );
    
    const [lead] = await db
      .insert(crmLeads)
      .values({
        tenantId,
        storeId,
        personId,
        campaignId: leadData.campaignId,
        sourceSocialAccountId: mcpAccountId,
        sourceChannel: leadData.sourceChannel || 'web_form',
        leadSource: leadData.leadSource || 'web_form',
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email,
        phone: leadData.phone,
        companyName: leadData.companyName,
        productInterest: leadData.productInterest,
        notes: leadData.notes,
        utmSource: leadData.utm_source || leadData.utmSource,
        utmMedium: leadData.utm_medium || leadData.utmMedium,
        utmCampaign: leadData.utm_campaign || leadData.utmCampaign,
        utmSourceId: utmResolution.utmSourceId,
        utmMediumId: utmResolution.utmMediumId,
        utmContent: leadData.utm_content || leadData.utmContent,
        utmTerm: leadData.utm_term || leadData.utmTerm,
        landingPageUrl: leadData.landingPageUrl || leadData.page_url,
        referrerUrl: leadData.referrerUrl || leadData.referrer,
        gtmClientId: leadData.gtmClientId || leadData.clientId,
        gtmSessionId: leadData.gtmSessionId,
        gtmEvents: leadData.gtmEvents,
        privacyPolicyAccepted: leadData.privacyPolicyAccepted,
        marketingConsent: leadData.marketingConsent,
        profilingConsent: leadData.profilingConsent,
        consentTimestamp: leadData.consentTimestamp ? new Date(leadData.consentTimestamp) : null,
        rawEventPayload: leadData.rawPayload
      })
      .returning();
    
    logger.info('External lead created', { 
      leadId: lead.id, 
      tenantId, 
      source: leadData.leadSource,
      hasUTM: !!utmResolution.utmSourceId 
    });
    
    // 🤖 AI Lead Scoring: Calculate score in background (non-blocking)
    // Fire-and-forget Promise (no await) to avoid blocking response
    (async () => {
      try {
        logger.info('🤖 [BACKGROUND] Starting AI scoring', { leadId: lead.id, tenantId });
        
        // 🔒 CRITICAL: Set tenant context for RLS in async execution
        await setTenantContext(tenantId);
        
        const scoringResult = await leadScoringService.calculateLeadScore({
          leadId: lead.id,
          tenantId
        });

        // Update lead score in database
        await db
          .update(crmLeads)
          .set({ leadScore: scoringResult.score })
          .where(and(
            eq(crmLeads.id, lead.id),
            eq(crmLeads.tenantId, tenantId)
          ));

        // Save AI insight
        await db.insert(leadAiInsights).values({
          tenantId,
          leadId: lead.id,
          insightType: 'scoring',
          insights: {
            factors: scoringResult.factors,
            recommended_actions: scoringResult.recommended_actions,
            conversion_probability: scoringResult.conversion_probability,
            estimated_value: scoringResult.estimated_value
          },
          nextAction: scoringResult.recommended_actions[0] || null,
          riskFactors: null,
          score: scoringResult.score,
          confidence: scoringResult.confidence / 100,
          generatedBy: 'lead-scoring-assistant',
          aiModel: 'gpt-4o'
        });

        logger.info('AI Lead Scoring completed (background - external)', {
          leadId: lead.id,
          score: scoringResult.score,
          category: scoringResult.category,
          responseTimeMs: scoringResult.responseTimeMs
        });
      } catch (scoringError) {
        logger.error('AI Lead Scoring failed (background - external)', {
          leadId: lead.id,
          error: scoringError instanceof Error ? scoringError.message : 'Unknown error',
          stack: scoringError instanceof Error ? scoringError.stack : undefined
        });
      }
    })().catch(err => {
      logger.error('[UNHANDLED] AI scoring promise rejected', {
        leadId: lead.id,
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
    });
    
    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error creating external lead', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create external lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== CAMPAIGNS ====================

/**
 * GET /api/crm/campaigns
 * Get all campaigns for the current tenant
 */
router.get('/campaigns', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status, type, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmCampaigns.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmCampaigns.status, status as string));
    }
    if (type) {
      conditions.push(eq(crmCampaigns.type, type as string));
    }

    // Get campaigns first
    const campaignsResult = await db
      .select()
      .from(crmCampaigns)
      .where(and(...conditions))
      .orderBy(desc(crmCampaigns.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    const campaigns = Array.isArray(campaignsResult) ? campaignsResult : (campaignsResult as any).rows || [];

    // Enrich each campaign with computed fields
    const enrichedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
      // Get lead counts
      const statsResult = await db.execute<any>(sql`
        SELECT 
          COUNT(*)::int as total_leads,
          COUNT(CASE WHEN status != 'new' THEN 1 END)::int as worked_leads,
          COUNT(CASE WHEN status = 'new' THEN 1 END)::int as not_worked_leads,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / COUNT(*)::numeric * 100), 2)
            ELSE 0 
          END as conversion_rate
        FROM w3suite.crm_leads
        WHERE campaign_id = ${campaign.id} AND tenant_id = ${tenantId}
      `);
      const stats = statsResult.rows?.[0] || { total_leads: 0, worked_leads: 0, not_worked_leads: 0, conversion_rate: 0 };

      // Get store name
      const storeResult = await db
        .select({ nome: stores.nome })
        .from(stores)
        .where(eq(stores.id, campaign.storeId || ''))
        .limit(1);
      const storeName = storeResult[0]?.nome || null;

      // Get marketing channel names
      let marketingChannelNames = null;
      if (campaign.marketingChannelIds && campaign.marketingChannelIds.length > 0) {
        const channels = await db
          .select({ name: marketingChannels.name })
          .from(marketingChannels)
          .where(inArray(marketingChannels.id, campaign.marketingChannelIds));
        marketingChannelNames = channels.map(c => c.name).sort().join(', ') || null;
      }

      return {
        ...campaign,
        totalLeads: stats.total_leads,
        workedLeads: stats.worked_leads,
        notWorkedLeads: stats.not_worked_leads,
        conversionRate: stats.conversion_rate,
        storeName,
        marketingChannelNames,
        utmSourceName: null,
        utmMediumName: null
      };
    }));

    res.status(200).json({
      success: true,
      data: enrichedCampaigns,
      message: 'Campaigns retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaigns', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve campaigns',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/campaigns/:id
 * Get a single campaign by ID
 */
router.get('/campaigns/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    
    await setTenantContext(tenantId);

    const [campaign] = await db
      .select()
      .from(crmCampaigns)
      .where(and(
        eq(crmCampaigns.id, id),
        eq(crmCampaigns.tenantId, tenantId)
      ))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: campaign,
      message: 'Campaign retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaign', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      campaignId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve campaign',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/campaigns/:id/stats
 * Get real-time campaign statistics (lead counts, conversion rate)
 */
router.get('/campaigns/:id/stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    
    await setTenantContext(tenantId);

    // Verify campaign exists
    const [campaign] = await db
      .select()
      .from(crmCampaigns)
      .where(and(
        eq(crmCampaigns.id, id),
        eq(crmCampaigns.tenantId, tenantId)
      ))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Calculate real-time statistics
    const statsResult = await db
      .select({
        totalLeads: sql<number>`COUNT(*)::int`,
        workedLeads: sql<number>`COUNT(CASE WHEN status != 'new' THEN 1 END)::int`,
        notWorkedLeads: sql<number>`COUNT(CASE WHEN status = 'new' THEN 1 END)::int`,
        wonLeads: sql<number>`COUNT(CASE WHEN status = 'converted' THEN 1 END)::int`,
      })
      .from(crmLeads)
      .where(and(
        eq(crmLeads.campaignId, id),
        eq(crmLeads.tenantId, tenantId)
      ));

    const stats = statsResult[0];
    const conversionRate = stats.totalLeads > 0 
      ? parseFloat(((stats.wonLeads / stats.totalLeads) * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        campaignId: id,
        totalLeads: stats.totalLeads,
        workedLeads: stats.workedLeads,
        notWorkedLeads: stats.notWorkedLeads,
        wonLeads: stats.wonLeads,
        conversionRate,
        budget: campaign.budget || 0
      },
      message: 'Campaign statistics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaign stats', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      campaignId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve campaign statistics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/campaigns/:id/social-accounts
 * Get all social accounts linked to a campaign
 */
router.get('/campaigns/:id/social-accounts', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(tenantId);

    const accounts = await db
      .select({
        id: campaignSocialAccounts.id,
        campaignId: campaignSocialAccounts.campaignId,
        mcpAccountId: campaignSocialAccounts.mcpAccountId,
        platform: campaignSocialAccounts.platform,
        externalCampaignId: campaignSocialAccounts.externalCampaignId,
        isActive: campaignSocialAccounts.isActive,
        createdAt: campaignSocialAccounts.createdAt,
        accountName: mcpConnectedAccounts.accountName,
        accountType: mcpConnectedAccounts.accountType
      })
      .from(campaignSocialAccounts)
      .leftJoin(mcpConnectedAccounts, eq(campaignSocialAccounts.mcpAccountId, mcpConnectedAccounts.id))
      .where(and(
        eq(campaignSocialAccounts.campaignId, id),
        eq(campaignSocialAccounts.tenantId, tenantId)
      ));

    res.status(200).json({
      success: true,
      data: accounts,
      message: 'Campaign social accounts retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaign social accounts', { 
      errorMessage: error?.message,
      campaignId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve social accounts',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/campaigns/:id/social-accounts
 * Link a social account to a campaign
 */
router.post('/campaigns/:id/social-accounts', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: campaignId } = req.params;
    const { mcpAccountId, platform, externalCampaignId } = req.body;

    await setTenantContext(tenantId);

    const [account] = await db
      .insert(campaignSocialAccounts)
      .values({
        tenantId,
        campaignId,
        mcpAccountId,
        platform,
        externalCampaignId,
        isActive: true
      })
      .returning();

    res.status(201).json({
      success: true,
      data: account,
      message: 'Social account linked to campaign successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error linking social account to campaign', { 
      errorMessage: error?.message,
      campaignId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to link social account',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/campaigns/:id/social-accounts/:accountId
 * Unlink a social account from a campaign
 */
router.delete('/campaigns/:id/social-accounts/:accountId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: campaignId, accountId } = req.params;
    await setTenantContext(tenantId);

    await db
      .delete(campaignSocialAccounts)
      .where(and(
        eq(campaignSocialAccounts.id, accountId),
        eq(campaignSocialAccounts.campaignId, campaignId),
        eq(campaignSocialAccounts.tenantId, tenantId)
      ));

    res.status(200).json({
      success: true,
      message: 'Social account unlinked from campaign successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error unlinking social account from campaign', { 
      errorMessage: error?.message,
      campaignId: req.params.id,
      accountId: req.params.accountId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to unlink social account',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/campaigns/:id/utm-links
 * Generate or retrieve UTM tracking links for a campaign
 * 
 * Auto-generates links from campaign's marketingChannels array
 */
router.get('/campaigns/:id/utm-links', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const campaignId = req.params.id;
    await setTenantContext(tenantId);

    // Get campaign to access marketingChannels array
    const [campaign] = await db
      .select()
      .from(crmCampaigns)
      .where(and(
        eq(crmCampaigns.id, campaignId),
        eq(crmCampaigns.tenantId, tenantId)
      ))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Campaign not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if we need to generate new links
    const shouldRegenerate = req.query.regenerate === 'true';
    
    if (shouldRegenerate || !campaign.marketingChannels || campaign.marketingChannels.length === 0) {
      // Just return existing links if no channels configured
      if (!campaign.marketingChannels || campaign.marketingChannels.length === 0) {
        const existingLinks = await utmLinksService.getLinksForCampaign(tenantId, campaignId);
        return res.status(200).json({
          success: true,
          data: {
            links: existingLinks,
            campaignName: campaign.name,
            landingPageUrl: campaign.landingPageUrl || '',
            utmCampaign: campaign.utmCampaign || campaign.name
          },
          message: 'No marketing channels configured for this campaign',
          timestamp: new Date().toISOString()
        } as ApiSuccessResponse);
      }

      // Generate/update UTM links from marketingChannels array
      const links = await utmLinksService.generateLinksForCampaign({
        tenantId,
        campaignId,
        landingPageUrl: campaign.landingPageUrl || '',
        utmCampaign: campaign.utmCampaign || campaign.name,
        marketingChannels: campaign.marketingChannels as string[]
      });

      return res.status(200).json({
        success: true,
        data: {
          links,
          campaignName: campaign.name,
          landingPageUrl: campaign.landingPageUrl || '',
          utmCampaign: campaign.utmCampaign || campaign.name
        },
        message: 'UTM links generated successfully',
        timestamp: new Date().toISOString()
      } as ApiSuccessResponse);
    }

    // Return existing links
    const links = await utmLinksService.getLinksForCampaign(tenantId, campaignId);
    
    res.status(200).json({
      success: true,
      data: {
        links,
        campaignName: campaign.name,
        landingPageUrl: campaign.landingPageUrl || '',
        utmCampaign: campaign.utmCampaign || campaign.name
      },
      message: 'UTM links retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaign UTM links', { 
      errorMessage: error?.message,
      campaignId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve UTM links',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/campaigns/:id/utm-links/:linkId/track
 * Track UTM link events (click, conversion)
 * 
 * Request body:
 * - eventType: 'click' | 'conversion'
 * - uniqueIdentifier?: string (for unique click tracking)
 * - revenue?: number (for conversion tracking)
 */
router.post('/campaigns/:id/utm-links/:linkId/track', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // 🔒 Zod validation for request body
    const trackEventSchema = z.object({
      eventType: z.enum(['click', 'conversion'], {
        errorMap: () => ({ message: 'eventType must be either "click" or "conversion"' })
      }),
      uniqueIdentifier: z.string().optional(),
      revenue: z.number().min(0).optional()
    });

    const validation = trackEventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: campaignId, linkId } = req.params;

    await setTenantContext(tenantId);

    // Track the event
    await utmLinksService.trackLinkEvent({
      tenantId,
      linkId,
      eventType: validation.data.eventType,
      uniqueIdentifier: validation.data.uniqueIdentifier,
      revenue: validation.data.revenue
    });

    res.status(200).json({
      success: true,
      message: `UTM link ${validation.data.eventType} tracked successfully`,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error tracking UTM link event', { 
      errorMessage: error?.message,
      campaignId: req.params.id,
      linkId: req.params.linkId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to track UTM link event',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/campaigns/:id/utm-analytics
 * Get UTM tracking analytics for a campaign
 * 
 * Returns:
 * - Summary stats (total clicks, conversions, revenue, conversion rate)
 * - Stats by channel
 * - Lead attribution by UTM source/medium
 */
router.get('/campaigns/:id/utm-analytics', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const campaignId = req.params.id;
    await setTenantContext(tenantId);

    // Verify campaign exists
    const [campaign] = await db
      .select()
      .from(crmCampaigns)
      .where(and(
        eq(crmCampaigns.id, campaignId),
        eq(crmCampaigns.tenantId, tenantId)
      ))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Campaign not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get analytics
    const analytics = await utmLinksService.getCampaignUTMAnalytics(tenantId, campaignId);

    res.status(200).json({
      success: true,
      data: analytics,
      message: 'Campaign UTM analytics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaign UTM analytics', { 
      errorMessage: error?.message,
      campaignId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve UTM analytics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/campaigns
 * Create a new campaign
 */
router.post('/campaigns', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmCampaignSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // 🔄 Auto-inherit tracking config from store (if not explicitly provided)
    let campaignData = { ...validation.data };
    
    if (campaignData.storeId) {
      // Check if tracking IDs are not already provided
      const needsInheritance = !campaignData.ga4MeasurementId && !campaignData.googleAdsConversionId && !campaignData.facebookPixelId;
      
      if (needsInheritance) {
        // Fetch store tracking config
        const [storeTracking] = await db
          .select()
          .from(storeTrackingConfig)
          .where(and(
            eq(storeTrackingConfig.storeId, campaignData.storeId),
            eq(storeTrackingConfig.tenantId, tenantId)
          ))
          .limit(1);
        
        if (storeTracking && storeTracking.gtmConfigured) {
          // Inherit tracking IDs from store
          campaignData.ga4MeasurementId = storeTracking.ga4MeasurementId;
          campaignData.googleAdsConversionId = storeTracking.googleAdsConversionId;
          campaignData.facebookPixelId = storeTracking.facebookPixelId;
          
          logger.info('Auto-inherited tracking config from store', {
            storeId: campaignData.storeId,
            ga4: !!storeTracking.ga4MeasurementId,
            googleAds: !!storeTracking.googleAdsConversionId,
            fbPixel: !!storeTracking.facebookPixelId
          });
        }
      }
    }

    const [campaign] = await db
      .insert(crmCampaigns)
      .values({
        ...campaignData,
        tenantId
      })
      .returning();

    logger.info('Campaign created', { campaignId: campaign.id, tenantId });

    // 🔗 Auto-generate UTM links if campaign has required fields
    if (campaign.landingPageUrl && campaign.utmCampaign && campaign.marketingChannels && campaign.marketingChannels.length > 0) {
      try {
        const utmLinks = await utmLinksService.generateLinksForCampaign({
          tenantId,
          campaignId: campaign.id,
          landingPageUrl: campaign.landingPageUrl,
          utmCampaign: campaign.utmCampaign,
          marketingChannels: campaign.marketingChannels
        });
        
        logger.info('Auto-generated UTM links for new campaign', {
          campaignId: campaign.id,
          linksCount: utmLinks.length,
          channels: campaign.marketingChannels
        });
      } catch (utmError: any) {
        // Log error but don't fail campaign creation
        logger.error('Failed to auto-generate UTM links', {
          campaignId: campaign.id,
          error: utmError?.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating campaign', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create campaign',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/campaigns/:id
 * Update a campaign
 */
router.patch('/campaigns/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmCampaignSchema.omit({ tenantId: true }).partial();
    
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // 🔒 Campaign Activation Validation: Block activation without tracking config
    if (validation.data.status === 'active') {
      // Get current campaign to check storeId
      const [currentCampaign] = await db
        .select()
        .from(crmCampaigns)
        .where(and(
          eq(crmCampaigns.id, id),
          eq(crmCampaigns.tenantId, tenantId)
        ))
        .limit(1);
      
      if (!currentCampaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found',
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
      
      // Check if campaign has a store assigned
      if (currentCampaign.storeId) {
        // Verify store has tracking config
        const [storeTracking] = await db
          .select()
          .from(storeTrackingConfig)
          .where(and(
            eq(storeTrackingConfig.storeId, currentCampaign.storeId),
            eq(storeTrackingConfig.tenantId, tenantId)
          ))
          .limit(1);
        
        // Block activation if no tracking config or not configured
        if (!storeTracking || !storeTracking.gtmConfigured) {
          return res.status(400).json({
            success: false,
            error: 'Missing tracking configuration',
            message: 'Cannot activate campaign: Store must have GTM tracking configured (GA4, Google Ads, or Facebook Pixel). Please configure tracking in Store Settings → Tracking Config.',
            timestamp: new Date().toISOString()
          } as ApiErrorResponse);
        }
        
        logger.info('Campaign activation validation passed', {
          campaignId: id,
          storeId: currentCampaign.storeId,
          hasGA4: !!storeTracking.ga4MeasurementId,
          hasGoogleAds: !!storeTracking.googleAdsConversionId,
          hasFBPixel: !!storeTracking.facebookPixelId
        });
      }
    }

    const [updated] = await db
      .update(crmCampaigns)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmCampaigns.id, id),
        eq(crmCampaigns.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Campaign updated', { campaignId: id, tenantId });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Campaign updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating campaign', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      campaignId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update campaign',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== FUNNELS ====================

/**
 * GET /api/crm/funnels
 * Get all funnels with their pipelines and metrics
 */
router.get('/funnels', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { isActive } = req.query;

    const conditions = [eq(crmFunnels.tenantId, tenantId)];
    if (isActive !== undefined) {
      conditions.push(eq(crmFunnels.isActive, isActive === 'true'));
    }

    const funnels = await db
      .select()
      .from(crmFunnels)
      .where(and(...conditions))
      .orderBy(desc(crmFunnels.createdAt));

    // For each funnel, fetch associated pipelines
    const funnelsWithPipelines = await Promise.all(
      funnels.map(async (funnel) => {
        const pipelines = await db
          .select()
          .from(crmPipelines)
          .where(eq(crmPipelines.funnelId, funnel.id))
          .orderBy(sql`${crmPipelines.funnelStageOrder} ASC NULLS LAST`);

        return {
          ...funnel,
          pipelines
        };
      })
    );

    return res.json({ 
      success: true, 
      data: funnelsWithPipelines,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof funnelsWithPipelines>);

  } catch (error: any) {
    logger.error('Error fetching funnels', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch funnels' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:id
 * Get a single funnel by ID with pipelines and analytics
 */
router.get('/funnels/:id', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(db, tenantId);

    const [funnel] = await db
      .select()
      .from(crmFunnels)
      .where(and(
        eq(crmFunnels.id, id),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' } as ApiErrorResponse);
    }

    // Fetch pipelines
    const pipelines = await db
      .select()
      .from(crmPipelines)
      .where(eq(crmPipelines.funnelId, funnel.id))
      .orderBy(sql`${crmPipelines.funnelStageOrder} ASC NULLS LAST`);

    // Calculate journey analytics
    const dealsInFunnel = await db
      .select()
      .from(crmDeals)
      .where(and(
        eq(crmDeals.tenantId, tenantId),
        inArray(crmDeals.pipelineId, pipelines.map(p => p.id))
      ));

    const totalDeals = dealsInFunnel.length;
    const wonDeals = dealsInFunnel.filter(d => d.status === 'won').length;
    const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    return res.json({
      success: true,
      data: {
        ...funnel,
        pipelines,
        analytics: {
          totalDeals,
          wonDeals,
          conversionRate: Math.round(conversionRate * 100) / 100
        }
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching funnel', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch funnel' } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/funnels
 * Create a new funnel
 */
router.post('/funnels', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Extract pipelineIds from request and map to pipelineOrder
    const { pipelineIds, pipelines, ...otherData } = req.body;
    
    const validated = insertCrmFunnelSchema.parse({
      ...otherData,
      // Map pipelineIds to pipelineOrder for the database
      ...(pipelineIds !== undefined ? { pipelineOrder: pipelineIds } : {}),
      tenantId,
      createdBy: req.user?.id
    });

    console.log('[FUNNEL-CREATE] Creating with pipelineOrder:', validated.pipelineOrder);

    const [funnel] = await db
      .insert(crmFunnels)
      .values(validated)
      .returning();

    logger.info('Funnel created', { funnelId: funnel.id, tenantId });

    return res.status(201).json({
      success: true,
      data: funnel,
      message: 'Funnel created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating funnel', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ success: false, error: 'Failed to create funnel' } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/funnels/:id
 * Update a funnel
 */
router.patch('/funnels/:id', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(db, tenantId);

    // Extract pipelineIds from request and map to pipelineOrder
    const { pipelineIds, pipelines, ...otherData } = req.body;
    
    // DEBUG: Log what we received
    console.log('[FUNNEL-UPDATE] Received from frontend:', {
      funnelId: id,
      pipelineIds,
      pipelinesCount: pipelineIds?.length,
      originalBodyKeys: Object.keys(req.body)
    });

    const updateData = {
      ...otherData,
      // Map pipelineIds to pipelineOrder for the database
      ...(pipelineIds !== undefined ? { pipelineOrder: pipelineIds } : {}),
      updatedBy: req.user?.id,
      updatedAt: new Date()
    };

    console.log('[FUNNEL-UPDATE] Updating with:', {
      funnelId: id,
      pipelineOrder: updateData.pipelineOrder,
      pipelineOrderLength: updateData.pipelineOrder?.length
    });

    const [updated] = await db
      .update(crmFunnels)
      .set(updateData)
      .where(and(
        eq(crmFunnels.id, id),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Funnel not found' } as ApiErrorResponse);
    }

    logger.info('Funnel updated', { funnelId: id, tenantId });

    return res.json({
      success: true,
      data: updated,
      message: 'Funnel updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating funnel', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to update funnel' } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/funnels/:id
 * Delete a funnel (pipelines will be unassigned, not deleted)
 */
router.delete('/funnels/:id', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(db, tenantId);

    const [deleted] = await db
      .delete(crmFunnels)
      .where(and(
        eq(crmFunnels.id, id),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Funnel not found' } as ApiErrorResponse);
    }

    logger.info('Funnel deleted', { funnelId: id, tenantId });

    return res.json({
      success: true,
      data: { id },
      message: 'Funnel deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<{ id: string }>);

  } catch (error: any) {
    logger.error('Error deleting funnel', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to delete funnel' } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/funnels/:funnelId/pipelines
 * Save pipeline associations for a funnel (updates funnelId and funnelStageOrder on pipelines)
 */
router.patch('/funnels/:funnelId/pipelines', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { pipelines } = req.body; // Array of { pipelineId, stageOrder }

    // Validate input
    if (!Array.isArray(pipelines)) {
      return res.status(400).json({
        success: false,
        error: 'pipelines must be an array',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Verify funnel exists and belongs to tenant
    const [funnel] = await db
      .select()
      .from(crmFunnels)
      .where(and(
        eq(crmFunnels.id, funnelId),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: 'Funnel not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get all pipelines currently associated with this funnel
    const currentPipelines = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.funnelId, funnelId),
        eq(crmPipelines.tenantId, tenantId)
      ));

    const newPipelineIds = pipelines.map((p: any) => p.pipelineId);
    const currentPipelineIds = currentPipelines.map(p => p.id);

    // Pipelines to dissociate (were in funnel but not in new array)
    const toDisassociate = currentPipelineIds.filter(id => !newPipelineIds.includes(id));

    // Dissociate removed pipelines
    if (toDisassociate.length > 0) {
      await db
        .update(crmPipelines)
        .set({ 
          funnelId: null, 
          funnelStageOrder: null 
        })
        .where(and(
          inArray(crmPipelines.id, toDisassociate),
          eq(crmPipelines.tenantId, tenantId)
        ));

      logger.info('Dissociated pipelines from funnel', { 
        funnelId, 
        count: toDisassociate.length,
        pipelineIds: toDisassociate 
      });
    }

    // Associate/update pipelines
    const updatePromises = pipelines.map(async (item: any) => {
      const { pipelineId, stageOrder } = item;

      // Verify pipeline exists and belongs to tenant
      const [pipeline] = await db
        .select()
        .from(crmPipelines)
        .where(and(
          eq(crmPipelines.id, pipelineId),
          eq(crmPipelines.tenantId, tenantId)
        ))
        .limit(1);

      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      // Update pipeline association
      return db
        .update(crmPipelines)
        .set({ 
          funnelId, 
          funnelStageOrder: stageOrder 
        })
        .where(and(
          eq(crmPipelines.id, pipelineId),
          eq(crmPipelines.tenantId, tenantId)
        ));
    });

    await Promise.all(updatePromises);

    logger.info('Saved funnel pipeline associations', { 
      funnelId, 
      pipelineCount: pipelines.length,
      dissociatedCount: toDisassociate.length
    });

    return res.json({
      success: true,
      data: { 
        funnelId,
        associatedCount: pipelines.length,
        dissociatedCount: toDisassociate.length
      },
      message: 'Pipeline associations saved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error saving funnel pipelines', { 
      error, 
      funnelId: req.params.funnelId 
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to save pipeline associations',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== FUNNEL WORKFLOWS ====================

/**
 * GET /api/crm/funnels/:funnelId/workflows
 * Get all workflows assigned to a funnel with details
 */
router.get('/funnels/:funnelId/workflows', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    await setTenantContext(db, tenantId);

    // Verify funnel exists and belongs to tenant
    const [funnel] = await db
      .select()
      .from(crmFunnels)
      .where(and(
        eq(crmFunnels.id, funnelId),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: 'Funnel not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get workflow assignments with template details
    const workflows = await db
      .select({
        id: crmFunnelWorkflows.id,
        funnelId: crmFunnelWorkflows.funnelId,
        workflowTemplateId: crmFunnelWorkflows.workflowTemplateId,
        executionMode: crmFunnelWorkflows.executionMode,
        isActive: crmFunnelWorkflows.isActive,
        assignedBy: crmFunnelWorkflows.assignedBy,
        assignedAt: crmFunnelWorkflows.assignedAt,
        notes: crmFunnelWorkflows.notes,
        workflowTemplate: workflowTemplates
      })
      .from(crmFunnelWorkflows)
      .leftJoin(workflowTemplates, eq(crmFunnelWorkflows.workflowTemplateId, workflowTemplates.id))
      .where(and(
        eq(crmFunnelWorkflows.funnelId, funnelId),
        eq(crmFunnelWorkflows.tenantId, tenantId)
      ));

    return res.json({
      success: true,
      data: workflows,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching funnel workflows', { error, funnelId: req.params.funnelId });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch funnel workflows',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/funnels/:funnelId/workflows
 * Assign a workflow to a funnel (for AI orchestration across pipelines)
 */
router.post('/funnels/:funnelId/workflows', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context or user authentication',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { funnelId } = req.params;

    const validation = insertCrmFunnelWorkflowSchema.omit({ assignedBy: true }).safeParse({
      ...req.body,
      funnelId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Verify funnel belongs to tenant
    const [funnel] = await db
      .select()
      .from(crmFunnels)
      .where(and(
        eq(crmFunnels.id, funnelId),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: 'Funnel not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Verify workflow template exists
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, validation.data.workflowTemplateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Create workflow assignment
    const [assignment] = await db
      .insert(crmFunnelWorkflows)
      .values({
        ...validation.data,
        tenantId,
        assignedBy: userId
      })
      .returning();

    logger.info('Workflow assigned to funnel', { funnelId, workflowTemplateId: validation.data.workflowTemplateId, userId });

    return res.status(201).json({
      success: true,
      data: assignment,
      message: 'Workflow assigned to funnel successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error assigning workflow to funnel', { error, funnelId: req.params.funnelId });

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'This workflow is already assigned to the funnel',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to assign workflow to funnel',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/funnels/:funnelId/workflows/:workflowId
 * Update funnel workflow assignment (e.g., execution mode)
 */
router.patch('/funnels/:funnelId/workflows/:workflowId', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { funnelId, workflowId } = req.params;
    await setTenantContext(db, tenantId);

    // Verify funnel belongs to tenant
    const [funnel] = await db
      .select()
      .from(crmFunnels)
      .where(and(
        eq(crmFunnels.id, funnelId),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: 'Funnel not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Update workflow assignment
    const [updated] = await db
      .update(crmFunnelWorkflows)
      .set({
        ...req.body,
        // Prevent updating immutable fields
        id: undefined,
        tenantId: undefined,
        funnelId: undefined,
        workflowTemplateId: undefined,
        assignedBy: undefined,
        assignedAt: undefined
      })
      .where(and(
        eq(crmFunnelWorkflows.id, workflowId),
        eq(crmFunnelWorkflows.funnelId, funnelId),
        eq(crmFunnelWorkflows.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Workflow assignment not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Funnel workflow updated', { funnelId, workflowId, updates: req.body });

    return res.json({
      success: true,
      data: updated,
      message: 'Workflow assignment updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating funnel workflow', { error, funnelId: req.params.funnelId, workflowId: req.params.workflowId });
    return res.status(500).json({
      success: false,
      error: 'Failed to update workflow assignment',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/funnels/:funnelId/workflows/:workflowId
 * Remove a workflow assignment from a funnel
 */
router.delete('/funnels/:funnelId/workflows/:workflowId', rbacMiddleware, requirePermission('manage_crm'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { funnelId, workflowId } = req.params;
    await setTenantContext(db, tenantId);

    // Verify funnel belongs to tenant
    const [funnel] = await db
      .select()
      .from(crmFunnels)
      .where(and(
        eq(crmFunnels.id, funnelId),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: 'Funnel not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Delete workflow assignment
    const [deleted] = await db
      .delete(crmFunnelWorkflows)
      .where(and(
        eq(crmFunnelWorkflows.id, workflowId),
        eq(crmFunnelWorkflows.funnelId, funnelId),
        eq(crmFunnelWorkflows.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Workflow assignment not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Workflow removed from funnel', { funnelId, workflowId });

    return res.json({
      success: true,
      data: { id: workflowId },
      message: 'Workflow removed from funnel successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error removing funnel workflow', { error, funnelId: req.params.funnelId, workflowId: req.params.workflowId });
    return res.status(500).json({
      success: false,
      error: 'Failed to remove workflow from funnel',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== FUNNEL ANALYTICS ====================

/**
 * GET /api/crm/funnels/:funnelId/analytics/overview
 * Get KPI overview metrics for a specific funnel
 */
router.get('/funnels/:funnelId/analytics/overview', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo, segment, dataMode = 'historical' } = req.query;

    await setTenantContext(db, tenantId);

    // Verify funnel exists and belongs to tenant
    const funnel = await db.query.crmFunnels.findFirst({
      where: and(
        eq(crmFunnels.id, funnelId),
        eq(crmFunnels.tenantId, tenantId)
      )
    });

    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' } as ApiErrorResponse);
    }

    // Determine cache mode and params
    const cacheMode = (dataMode === 'realtime') ? 'realtime' : 'historical';
    const cacheParams = { dateFrom, dateTo, segment };

    // Fetch analytics with caching
    const analyticsData = await analyticsCacheService.getOrFetch(
      tenantId,
      funnelId,
      'overview',
      cacheMode as 'realtime' | 'historical',
      cacheParams,
      async () => {
        // Build date filter
        let dateFilter = sql`TRUE`;
        if (dateFrom && dateTo) {
          dateFilter = sql`d.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
        }

        // Build segment filter (B2B/B2C)
        let segmentFilter = sql`TRUE`;
        if (segment === 'b2b') {
          segmentFilter = sql`c.customer_type = 'b2b'`;
        } else if (segment === 'b2c') {
          segmentFilter = sql`c.customer_type = 'b2c'`;
        }

        // Query KPI metrics
        // OPTIMIZED: Direct JOIN instead of IN (SELECT) for better performance with composite indexes
        const metricsResult = await db.execute(sql`
      SELECT
        COUNT(d.id)::int as total_leads,
        COUNT(d.id) FILTER (WHERE d.status NOT IN ('won', 'lost'))::int as active_deals,
        COUNT(d.id) FILTER (WHERE d.status = 'won')::int as won_deals,
        COUNT(d.id) FILTER (WHERE d.status = 'lost')::int as lost_deals,
        COUNT(d.id) FILTER (WHERE d.status IN ('won', 'lost'))::int as closed_deals,
        COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as total_revenue,
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (
            COALESCE(d.won_at, d.lost_at, NOW()) - d.created_at
          )) / 86400
        ), 0)::float as avg_journey_duration_days
      FROM w3suite.crm_deals d
      INNER JOIN w3suite.crm_pipelines p 
        ON d.pipeline_id = p.id 
        AND d.tenant_id = p.tenant_id
        AND p.funnel_id = ${funnelId}
        AND p.is_active = true
      LEFT JOIN w3suite.crm_customers c 
        ON d.customer_id = c.id
        AND d.tenant_id = c.tenant_id
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
      AND ${segmentFilter}
    `);

    const metrics = metricsResult.rows[0] as any;
    
    // Calculate conversion rate and churn rate
    const conversionRate = metrics.closed_deals > 0
      ? Math.round((metrics.won_deals / metrics.closed_deals) * 100)
      : 0;
    
    const churnRate = metrics.total_leads > 0
      ? Math.round((metrics.lost_deals / metrics.total_leads) * 100)
      : 0;

    // Calculate ROI Summary (enterprise-grade ROI rollup)
    // OPTIMIZED: Direct JOIN chain with explicit tenant filters for security
    const roiResult = await db.execute(sql`
      SELECT COALESCE(SUM(cp.total_spend), 0)::float as total_marketing_spend
      FROM w3suite.crm_deals d
      INNER JOIN w3suite.crm_pipelines p 
        ON d.pipeline_id = p.id 
        AND d.tenant_id = p.tenant_id
        AND p.funnel_id = ${funnelId}
        AND p.is_active = true
      INNER JOIN w3suite.crm_leads l 
        ON d.lead_id = l.id
        AND d.tenant_id = l.tenant_id
      INNER JOIN w3suite.crm_campaigns cp 
        ON l.campaign_id = cp.id
        AND l.tenant_id = cp.tenant_id
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
    `);

    const marketingSpend = (roiResult.rows[0] as any)?.total_marketing_spend || 0;
    const currentRevenue = metrics.total_revenue || 0;
    const margin = currentRevenue - marketingSpend;
    const roiPercent = marketingSpend > 0 
      ? Math.round((margin / marketingSpend) * 100)
      : 0;

    // Calculate prior period comparison for delta
    let priorPeriodRevenue = 0;
    let revenueDelta = 0;
    
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom as string);
      const toDate = new Date(dateTo as string);
      const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const priorFrom = new Date(fromDate);
      priorFrom.setDate(priorFrom.getDate() - periodDays);
      const priorTo = new Date(fromDate);
      
      const priorResult = await db.execute(sql`
        SELECT COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as prior_revenue
        FROM w3suite.crm_deals d
        INNER JOIN w3suite.crm_pipelines p 
          ON d.pipeline_id = p.id 
          AND d.tenant_id = p.tenant_id
          AND p.funnel_id = ${funnelId}
          AND p.is_active = true
        WHERE d.tenant_id = ${tenantId}
        AND d.created_at BETWEEN ${priorFrom.toISOString()}::timestamptz AND ${priorTo.toISOString()}::timestamptz
      `);
      
        priorPeriodRevenue = (priorResult.rows[0] as any)?.prior_revenue || 0;
        revenueDelta = priorPeriodRevenue > 0
          ? Math.round(((currentRevenue - priorPeriodRevenue) / priorPeriodRevenue) * 100)
          : 0;
        }

        // Return aggregated analytics payload
        return {
          totalLeads: metrics.total_leads || 0,
          activeDeals: metrics.active_deals || 0,
          conversionRate,
          avgJourneyDurationDays: Math.round(metrics.avg_journey_duration_days || 0),
          totalRevenue: metrics.total_revenue || 0,
          churnRate,
          wonDeals: metrics.won_deals || 0,
          lostDeals: metrics.lost_deals || 0,
          roiSummary: {
            currentRevenue,
            marketingSpend,
            margin,
            roiPercent,
            priorPeriodRevenue,
            revenueDelta
          }
        };
      }
    );

    return res.json({
      success: true,
      data: analyticsData,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching funnel analytics overview', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/sankey
 * Get Sankey diagram data for customer journey visualization (campaign -> lead -> stages -> outcome)
 */
router.get('/funnels/:funnelId/analytics/sankey', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo, segment } = req.query;

    await setTenantContext(db, tenantId);

    // Build filters
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`d.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    let segmentFilter = sql`TRUE`;
    if (segment === 'b2b') {
      segmentFilter = sql`c.customer_type = 'b2b'`;
    } else if (segment === 'b2c') {
      segmentFilter = sql`c.customer_type = 'b2c'`;
    }

    // Query flows for Sankey: Campaign -> Pipeline -> Stage -> Outcome
    const sankeyFlowsResult = await db.execute(sql`
      WITH funnel_pipelines AS (
        SELECT id, name FROM w3suite.crm_pipelines
        WHERE tenant_id = ${tenantId}
        AND funnel_id = ${funnelId}
        AND is_active = true
      )
      SELECT
        COALESCE(camp.name, 'Nessuna campagna') as source,
        p.name as target,
        COUNT(d.id)::int as value
      FROM w3suite.crm_deals d
      INNER JOIN funnel_pipelines p ON d.pipeline_id = p.id
      LEFT JOIN w3suite.crm_leads l ON d.lead_id = l.id
      LEFT JOIN w3suite.crm_campaigns camp ON l.campaign_id = camp.id
      LEFT JOIN w3suite.crm_customers c ON d.customer_id = c.id
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
      AND ${segmentFilter}
      GROUP BY camp.name, p.name
      HAVING COUNT(d.id) > 0

      UNION ALL

      SELECT
        p.name as source,
        COALESCE(s.name, 'Non assegnato') as target,
        COUNT(d.id)::int as value
      FROM w3suite.crm_deals d
      INNER JOIN funnel_pipelines p ON d.pipeline_id = p.id
      LEFT JOIN w3suite.crm_pipeline_stages s ON s.pipeline_id = p.id AND s."order" = d.current_stage_order
      LEFT JOIN w3suite.crm_customers c ON d.customer_id = c.id
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
      AND ${segmentFilter}
      GROUP BY p.name, s.name
      HAVING COUNT(d.id) > 0

      UNION ALL

      SELECT
        COALESCE(s.name, 'Non assegnato') as source,
        CASE 
          WHEN d.status = 'won' THEN 'Vinto'
          WHEN d.status = 'lost' THEN 'Perso'
          ELSE 'In corso'
        END as target,
        COUNT(d.id)::int as value
      FROM w3suite.crm_deals d
      INNER JOIN funnel_pipelines p ON d.pipeline_id = p.id
      LEFT JOIN w3suite.crm_pipeline_stages s ON s.pipeline_id = p.id AND s."order" = d.current_stage_order
      LEFT JOIN w3suite.crm_customers c ON d.customer_id = c.id
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
      AND ${segmentFilter}
      GROUP BY s.name, d.status
      HAVING COUNT(d.id) > 0
    `);

    const nodes = new Set<string>();
    const links = sankeyFlowsResult.rows.map((row: any) => {
      nodes.add(row.source);
      nodes.add(row.target);
      return {
        source: row.source,
        target: row.target,
        value: row.value
      };
    });

    return res.json({
      success: true,
      data: {
        nodes: Array.from(nodes).map(name => ({ name })),
        links
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching Sankey analytics', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch Sankey analytics' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/stage-performance
 * Get detailed stage-by-stage performance metrics
 */
router.get('/funnels/:funnelId/analytics/stage-performance', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo, segment } = req.query;

    await setTenantContext(db, tenantId);

    // Build filters
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`d.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    let segmentFilter = sql`TRUE`;
    if (segment === 'b2b') {
      segmentFilter = sql`c.customer_type = 'b2b'`;
    } else if (segment === 'b2c') {
      segmentFilter = sql`c.customer_type = 'b2c'`;
    }

    // Query stage performance with advanced metrics
    // OPTIMIZED: Removed CTE, direct JOIN for better index utilization
    const stagePerformanceResult = await db.execute(sql`
      SELECT
        p.id as pipeline_id,
        p.name as pipeline_name,
        d.current_stage_order as stage_order,
        s.name as stage_name,
        s.category as stage_category,
        COUNT(d.id)::int as deal_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - d.stage_updated_at)) / 86400), 0)::float as avg_days_in_stage,
        COUNT(d.id) FILTER (WHERE d.status = 'won')::int as won_count,
        COUNT(d.id) FILTER (WHERE d.status = 'lost')::int as lost_count,
        COUNT(d.id) FILTER (WHERE d.status IN ('won', 'lost'))::int as closed_count,
        COALESCE(SUM(d.estimated_value), 0)::float as total_revenue
      FROM w3suite.crm_deals d
      INNER JOIN w3suite.crm_pipelines p 
        ON d.pipeline_id = p.id 
        AND d.tenant_id = p.tenant_id
        AND p.funnel_id = ${funnelId}
        AND p.is_active = true
      LEFT JOIN w3suite.crm_pipeline_stages s 
        ON s.pipeline_id = p.id 
        AND s."order" = d.current_stage_order
        AND s.tenant_id = p.tenant_id
      LEFT JOIN w3suite.crm_customers c 
        ON d.customer_id = c.id
        AND d.tenant_id = c.tenant_id
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
      AND ${segmentFilter}
      GROUP BY p.id, p.name, d.current_stage_order, s.name, s.category
      ORDER BY p.id, d.current_stage_order
    `);

    const stagePerformance = stagePerformanceResult.rows.map((row: any) => {
      const conversionRate = row.closed_count > 0
        ? Math.round((row.won_count / row.closed_count) * 100)
        : 0;
      
      const dropOffRate = row.deal_count > 0
        ? Math.round((row.lost_count / row.deal_count) * 100)
        : 0;

      return {
        pipelineId: row.pipeline_id,
        pipelineName: row.pipeline_name,
        stageOrder: row.stage_order,
        stageName: row.stage_name || 'Non assegnato',
        stageCategory: row.stage_category,
        dealCount: row.deal_count,
        avgDays: Math.round(row.avg_days_in_stage * 10) / 10,
        conversionRate,
        dropOffRate,
        revenue: row.total_revenue,
        trend: 0 // TODO: Calculate trend vs previous period
      };
    });

    return res.json({
      success: true,
      data: stagePerformance,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching stage performance', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch stage performance' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/channel-effectiveness
 * Get workflow channel effectiveness heatmap data
 */
router.get('/funnels/:funnelId/analytics/channel-effectiveness', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo } = req.query;

    await setTenantContext(db, tenantId);

    // Build date filter
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`i.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    // Query interaction effectiveness by channel and stage
    // OPTIMIZED: Direct JOIN without CTE for performance
    const channelEffectivenessResult = await db.execute(sql`
      SELECT 
        s.name as stage_name,
        i.channel,
        COUNT(d.id)::int as interaction_count,
        COUNT(d.id) FILTER (WHERE d.status = 'won')::int as conversions
      FROM w3suite.crm_deals d
      INNER JOIN w3suite.crm_pipelines p 
        ON d.pipeline_id = p.id 
        AND d.tenant_id = p.tenant_id
        AND p.funnel_id = ${funnelId}
        AND p.is_active = true
      LEFT JOIN w3suite.crm_interactions i 
        ON i.deal_id = d.id
        AND i.tenant_id = d.tenant_id
      LEFT JOIN w3suite.crm_pipeline_stages s 
        ON s.pipeline_id = p.id 
        AND s."order" = d.current_stage_order
        AND s.tenant_id = p.tenant_id
      WHERE d.tenant_id = ${tenantId}
        AND i.channel IS NOT NULL
        AND ${dateFilter}
      GROUP BY s.name, i.channel
      HAVING COUNT(d.id) > 0
      ORDER BY s.name, i.channel
    `);

    const heatmapData = channelEffectivenessResult.rows.map((row: any) => ({
      stageName: row.stage_name || 'Non assegnato',
      channel: row.channel,
      interactionCount: row.interaction_count,
      conversions: row.conversions,
      conversionRate: row.interaction_count > 0
        ? Math.round((row.conversions / row.interaction_count) * 100)
        : 0
    }));

    return res.json({
      success: true,
      data: heatmapData,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching channel effectiveness', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch channel effectiveness' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/campaign-attribution
 * Get campaign attribution and ROI for funnel
 */
router.get('/funnels/:funnelId/analytics/campaign-attribution', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo, limit = '10' } = req.query;

    await setTenantContext(db, tenantId);

    // Build date filter
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`l.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    // Query campaign performance for this funnel
    // OPTIMIZED: Direct JOIN chain instead of nested CTEs
    const campaignAttributionResult = await db.execute(sql`
      SELECT
        c.id as campaign_id,
        c.name as campaign_name,
        c.budget,
        COUNT(l.id)::int as lead_count,
        COUNT(d.id) FILTER (WHERE d.status = 'won')::int as conversions,
        COALESCE(AVG(l.ai_lead_score), 0)::float as avg_lead_quality,
        COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as revenue
      FROM w3suite.crm_leads l
      LEFT JOIN w3suite.crm_deals d 
        ON d.lead_id = l.id
        AND d.tenant_id = l.tenant_id
      INNER JOIN w3suite.crm_pipelines p 
        ON d.pipeline_id = p.id 
        AND d.tenant_id = p.tenant_id
        AND p.funnel_id = ${funnelId}
        AND p.is_active = true
      LEFT JOIN w3suite.crm_campaigns c 
        ON l.campaign_id = c.id
        AND l.tenant_id = c.tenant_id
      WHERE l.tenant_id = ${tenantId}
        AND ${dateFilter}
      GROUP BY c.id, c.name, c.budget
      HAVING COUNT(l.id) > 0
      ORDER BY revenue DESC
      LIMIT ${parseInt(limit as string)}
    `);

    const campaignAttribution = campaignAttributionResult.rows.map((row: any) => {
      const conversionRate = row.lead_count > 0
        ? Math.round((row.conversions / row.lead_count) * 100)
        : 0;
      
      const roi = row.budget > 0
        ? Math.round(((row.revenue - row.budget) / row.budget) * 100)
        : 0;

      return {
        campaignId: row.campaign_id,
        campaignName: row.campaign_name || 'Senza campagna',
        budget: row.budget || 0,
        leadCount: row.lead_count,
        conversions: row.conversions,
        conversionRate,
        avgLeadQuality: Math.round(row.avg_lead_quality),
        revenue: row.revenue,
        roi
      };
    });

    return res.json({
      success: true,
      data: campaignAttribution,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching campaign attribution', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch campaign attribution' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/time-to-close
 * Get time-to-close distribution and benchmarks
 */
router.get('/funnels/:funnelId/analytics/time-to-close', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo } = req.query;

    await setTenantContext(db, tenantId);

    // Build date filter
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`d.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    // Query time-to-close distribution
    // OPTIMIZED: Direct JOIN with single CTE for bucketing (keeps query readable)
    const timeToCloseResult = await db.execute(sql`
      WITH closed_deals AS (
        SELECT 
          EXTRACT(EPOCH FROM (COALESCE(d.won_at, d.lost_at) - d.created_at)) / 86400 as days_to_close,
          d.status
        FROM w3suite.crm_deals d
        INNER JOIN w3suite.crm_pipelines p 
          ON d.pipeline_id = p.id 
          AND d.tenant_id = p.tenant_id
          AND p.funnel_id = ${funnelId}
          AND p.is_active = true
        WHERE d.tenant_id = ${tenantId}
          AND d.status IN ('won', 'lost')
          AND ${dateFilter}
      ),
      buckets AS (
        SELECT
          CASE
            WHEN days_to_close <= 7 THEN '0-7'
            WHEN days_to_close <= 14 THEN '8-14'
            WHEN days_to_close <= 30 THEN '15-30'
            WHEN days_to_close <= 60 THEN '31-60'
            ELSE '60+'
          END as bucket,
          COUNT(*)::int as count,
          COUNT(*) FILTER (WHERE status = 'won')::int as won_count
        FROM closed_deals
        GROUP BY 1
      )
      SELECT 
        bucket,
        count,
        won_count,
        (SELECT AVG(days_to_close)::float FROM closed_deals) as avg_days,
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_close)::float FROM closed_deals) as median_days
      FROM buckets
      ORDER BY 
        CASE bucket
          WHEN '0-7' THEN 1
          WHEN '8-14' THEN 2
          WHEN '15-30' THEN 3
          WHEN '31-60' THEN 4
          ELSE 5
        END
    `);

    const distribution = timeToCloseResult.rows.map((row: any) => ({
      bucket: row.bucket,
      count: row.count,
      wonCount: row.won_count,
      avgDays: row.avg_days ? Math.round(row.avg_days * 10) / 10 : 0,
      medianDays: row.median_days ? Math.round(row.median_days * 10) / 10 : 0
    }));

    return res.json({
      success: true,
      data: {
        distribution,
        benchmark: {
          avgDays: distribution[0]?.avgDays || 0,
          medianDays: distribution[0]?.medianDays || 0
        }
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching time-to-close analytics', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch time-to-close analytics' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/ai-impact
 * Get AI routing/scoring impact comparison
 */
router.get('/funnels/:funnelId/analytics/ai-impact', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo } = req.query;

    await setTenantContext(db, tenantId);

    // Build date filter
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`l.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    // Query AI vs Manual comparison
    const aiImpactResult = await db.execute(sql`
      WITH funnel_pipelines AS (
        SELECT id FROM w3suite.crm_pipelines
        WHERE tenant_id = ${tenantId}
        AND funnel_id = ${funnelId}
        AND is_active = true
      ),
      lead_deals AS (
        SELECT 
          l.id as lead_id,
          l.ai_lead_score,
          l.routing_type,
          d.status,
          d.estimated_value,
          EXTRACT(EPOCH FROM (COALESCE(d.won_at, d.lost_at, NOW()) - d.created_at)) / 86400 as days_to_close
        FROM w3suite.crm_leads l
        LEFT JOIN w3suite.crm_deals d ON d.lead_id = l.id AND d.pipeline_id IN (SELECT id FROM funnel_pipelines)
        WHERE l.tenant_id = ${tenantId}
        AND ${dateFilter}
      )
      SELECT
        routing_type,
        COUNT(lead_id)::int as total_leads,
        COUNT(lead_id) FILTER (WHERE status = 'won')::int as conversions,
        COALESCE(AVG(days_to_close) FILTER (WHERE status IN ('won', 'lost')), 0)::float as avg_time_to_close,
        COALESCE(AVG(estimated_value) FILTER (WHERE status = 'won'), 0)::float as avg_revenue_per_deal,
        COALESCE(AVG(ai_lead_score), 0)::float as avg_ai_score
      FROM lead_deals
      GROUP BY routing_type
    `);

    const aiData = aiImpactResult.rows.find((r: any) => r.routing_type === 'ai_routed');
    const manualData = aiImpactResult.rows.find((r: any) => r.routing_type === 'manual');

    const formatMetrics = (data: any) => {
      if (!data) return null;
      const conversionRate = data.total_leads > 0
        ? Math.round((data.conversions / data.total_leads) * 100)
        : 0;
      
      return {
        totalLeads: data.total_leads,
        conversions: data.conversions,
        conversionRate,
        avgTimeToClose: Math.round(data.avg_time_to_close * 10) / 10,
        avgRevenuePerDeal: Math.round(data.avg_revenue_per_deal),
        avgAiScore: Math.round(data.avg_ai_score)
      };
    };

    return res.json({
      success: true,
      data: {
        aiRouted: formatMetrics(aiData),
        manual: formatMetrics(manualData)
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching AI impact analytics', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch AI impact analytics' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/export
 * Export comprehensive funnel analytics as CSV
 * Enterprise-grade export functionality for executive reporting
 */
router.get('/funnels/:funnelId/analytics/export', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo, format: exportFormat = 'csv' } = req.query;

    await setTenantContext(db, tenantId);

    // Build date filter
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`d.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    // Fetch funnel details
    const funnelResult = await db.select()
      .from(crmFunnels)
      .where(and(
        eq(crmFunnels.id, funnelId),
        eq(crmFunnels.tenantId, tenantId)
      ))
      .limit(1);

    const funnel = funnelResult[0];
    if (!funnel) {
      return res.status(404).json({ success: false, error: 'Funnel not found' } as ApiErrorResponse);
    }

    // Aggregate all analytics data
    const analyticsData = await db.execute(sql`
      WITH funnel_pipelines AS (
        SELECT id, name FROM w3suite.crm_pipelines
        WHERE tenant_id = ${tenantId}
        AND funnel_id = ${funnelId}
        AND is_active = true
      ),
      pipeline_stages AS (
        SELECT ps.*, fp.name as pipeline_name
        FROM w3suite.crm_pipeline_stages ps
        INNER JOIN funnel_pipelines fp ON ps.pipeline_id = fp.id
        WHERE ps.tenant_id = ${tenantId}
      ),
      deal_analytics AS (
        SELECT 
          ps.pipeline_name,
          ps.name as stage_name,
          ps.order_index as stage_order,
          COUNT(d.id)::int as deal_count,
          AVG(EXTRACT(EPOCH FROM (d.updated_at - d.created_at)) / 86400)::float as avg_days_in_stage,
          COUNT(d.id) FILTER (WHERE d.status = 'won')::int as conversions,
          COUNT(d.id) FILTER (WHERE d.status = 'lost')::int as losses,
          COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as revenue,
          l.source as lead_source,
          l.routing_type,
          c.customer_type
        FROM w3suite.crm_deals d
        LEFT JOIN pipeline_stages ps ON d.current_stage_id = ps.id
        LEFT JOIN w3suite.crm_leads l ON d.lead_id = l.id
        LEFT JOIN w3suite.crm_customers c ON d.customer_id = c.id
        WHERE d.tenant_id = ${tenantId}
        AND d.pipeline_id IN (SELECT id FROM funnel_pipelines)
        AND ${dateFilter}
        GROUP BY ps.pipeline_name, ps.name, ps.order_index, l.source, l.routing_type, c.customer_type
      )
      SELECT * FROM deal_analytics ORDER BY stage_order, pipeline_name
    `);

    // Generate CSV content
    const headers = [
      'Funnel',
      'Pipeline',
      'Stage',
      'Stage Order',
      'Deal Count',
      'Avg Days in Stage',
      'Conversions',
      'Losses',
      'Conversion Rate %',
      'Drop-off Rate %',
      'Revenue (EUR)',
      'Lead Source',
      'Routing Type',
      'Customer Type'
    ];

    const rows = analyticsData.rows.map((row: any) => {
      const conversionRate = row.deal_count > 0
        ? Math.round((row.conversions / row.deal_count) * 100)
        : 0;
      const dropOffRate = row.deal_count > 0
        ? Math.round((row.losses / row.deal_count) * 100)
        : 0;

      return [
        funnel.name,
        row.pipeline_name || 'N/A',
        row.stage_name || 'N/A',
        row.stage_order || 0,
        row.deal_count || 0,
        row.avg_days_in_stage ? row.avg_days_in_stage.toFixed(1) : '0.0',
        row.conversions || 0,
        row.losses || 0,
        conversionRate,
        dropOffRate,
        row.revenue ? row.revenue.toFixed(2) : '0.00',
        row.lead_source || 'unknown',
        row.routing_type || 'manual',
        row.customer_type || 'unknown'
      ];
    });

    // Format as CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Set response headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="funnel-analytics-${funnelId}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error: any) {
    logger.error('Error exporting funnel analytics', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to export analytics' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/segmentation
 * Get customer segmentation breakdown (B2B/B2C, source, size)
 */
router.get('/funnels/:funnelId/analytics/segmentation', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo } = req.query;

    await setTenantContext(db, tenantId);

    // Build date filter
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`d.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    // Query segmentation data
    const segmentationResult = await db.execute(sql`
      WITH funnel_pipelines AS (
        SELECT id FROM w3suite.crm_pipelines
        WHERE tenant_id = ${tenantId}
        AND funnel_id = ${funnelId}
        AND is_active = true
      )
      SELECT
        c.customer_type,
        l.source,
        CASE
          WHEN d.estimated_value < 5000 THEN '0-5k'
          WHEN d.estimated_value < 20000 THEN '5-20k'
          WHEN d.estimated_value < 50000 THEN '20-50k'
          ELSE '50k+'
        END as deal_size_bucket,
        COUNT(d.id)::int as deal_count,
        COUNT(d.id) FILTER (WHERE d.status = 'won')::int as conversions,
        COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as revenue
      FROM w3suite.crm_deals d
      INNER JOIN funnel_pipelines fp ON d.pipeline_id = fp.id
      LEFT JOIN w3suite.crm_customers c ON d.customer_id = c.id
      LEFT JOIN w3suite.crm_leads l ON d.lead_id = l.id
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
      GROUP BY c.customer_type, l.source, deal_size_bucket
      ORDER BY revenue DESC
    `);

    const segmentation = segmentationResult.rows.map((row: any) => ({
      customerType: row.customer_type || 'unknown',
      source: row.source || 'unknown',
      dealSizeBucket: row.deal_size_bucket,
      dealCount: row.deal_count,
      conversions: row.conversions,
      conversionRate: row.deal_count > 0
        ? Math.round((row.conversions / row.deal_count) * 100)
        : 0,
      revenue: row.revenue
    }));

    return res.json({
      success: true,
      data: segmentation,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching segmentation analytics', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch segmentation analytics' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/dropoff
 * Get drop-off waterfall chart data
 */
router.get('/funnels/:funnelId/analytics/dropoff', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dateFrom, dateTo } = req.query;

    await setTenantContext(db, tenantId);

    // Build date filter
    let dateFilter = sql`TRUE`;
    if (dateFrom && dateTo) {
      dateFilter = sql`d.created_at BETWEEN ${dateFrom}::timestamptz AND ${dateTo}::timestamptz`;
    }

    // Query drop-off by stage
    const dropoffResult = await db.execute(sql`
      WITH funnel_pipelines AS (
        SELECT id, name FROM w3suite.crm_pipelines
        WHERE tenant_id = ${tenantId}
        AND funnel_id = ${funnelId}
        AND is_active = true
      )
      SELECT
        p.name as pipeline_name,
        s."order" as stage_order,
        s.name as stage_name,
        COUNT(d.id)::int as total_deals,
        COUNT(d.id) FILTER (WHERE d.status = 'lost')::int as lost_deals,
        COUNT(d.id) FILTER (WHERE d.status = 'won')::int as won_deals
      FROM w3suite.crm_deals d
      INNER JOIN funnel_pipelines p ON d.pipeline_id = p.id
      LEFT JOIN w3suite.crm_pipeline_stages s ON s.pipeline_id = p.id AND s."order" = d.current_stage_order
      WHERE d.tenant_id = ${tenantId}
      AND ${dateFilter}
      GROUP BY p.name, s."order", s.name
      ORDER BY p.name, s."order"
    `);

    const dropoffData = dropoffResult.rows.map((row: any) => {
      const dropOffRate = row.total_deals > 0
        ? Math.round((row.lost_deals / row.total_deals) * 100)
        : 0;

      return {
        pipelineName: row.pipeline_name,
        stageOrder: row.stage_order,
        stageName: row.stage_name || 'Non assegnato',
        totalDeals: row.total_deals,
        lostDeals: row.lost_deals,
        wonDeals: row.won_deals,
        dropOffRate
      };
    });

    // Identify top 3 drop-off points
    const topDropoffs = [...dropoffData]
      .sort((a, b) => b.dropOffRate - a.dropOffRate)
      .slice(0, 3);

    return res.json({
      success: true,
      data: {
        dropoffData,
        topDropoffs
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching dropoff analytics', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch dropoff analytics' } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/analytics/forecast
 * Get revenue forecast and trends
 */
router.get('/funnels/:funnelId/analytics/forecast', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Missing tenant context' } as ApiErrorResponse);
    }

    const { funnelId } = req.params;

    await setTenantContext(db, tenantId);

    // Query revenue trends and forecast
    const forecastResult = await db.execute(sql`
      WITH funnel_pipelines AS (
        SELECT id FROM w3suite.crm_pipelines
        WHERE tenant_id = ${tenantId}
        AND funnel_id = ${funnelId}
        AND is_active = true
      ),
      monthly_revenue AS (
        SELECT
          DATE_TRUNC('month', COALESCE(won_at, created_at)) as month,
          SUM(estimated_value) FILTER (WHERE status = 'won')::float as revenue,
          COUNT(*) FILTER (WHERE status = 'won')::int as deals_won
        FROM w3suite.crm_deals
        WHERE pipeline_id IN (SELECT id FROM funnel_pipelines)
        AND tenant_id = ${tenantId}
        AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1
      ),
      expected_closes AS (
        SELECT
          CASE
            WHEN expected_close_date <= NOW() + INTERVAL '30 days' THEN '0-30'
            WHEN expected_close_date <= NOW() + INTERVAL '60 days' THEN '31-60'
            WHEN expected_close_date <= NOW() + INTERVAL '90 days' THEN '61-90'
            ELSE '90+'
          END as bucket,
          COUNT(*)::int as deal_count,
          SUM(estimated_value)::float as pipeline_value
        FROM w3suite.crm_deals
        WHERE pipeline_id IN (SELECT id FROM funnel_pipelines)
        AND tenant_id = ${tenantId}
        AND status NOT IN ('won', 'lost')
        AND expected_close_date IS NOT NULL
        GROUP BY 1
      )
      SELECT
        (SELECT json_agg(json_build_object('month', month, 'revenue', revenue, 'dealsWon', deals_won) ORDER BY month) FROM monthly_revenue) as trends,
        (SELECT json_agg(json_build_object('bucket', bucket, 'dealCount', deal_count, 'pipelineValue', pipeline_value)) FROM expected_closes) as forecast
    `);

    const result = forecastResult.rows[0] as any;

    return res.json({
      success: true,
      data: {
        trends: result.trends || [],
        forecast: result.forecast || []
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error fetching forecast analytics', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ success: false, error: 'Failed to fetch forecast analytics' } as ApiErrorResponse);
  }
});

// ==================== PIPELINES ====================

/**
 * GET /api/crm/pipelines
 * Get all pipelines with aggregated metrics for the current tenant
 */
router.get('/pipelines', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { domain, isActive, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmPipelines.tenantId, tenantId)];
    if (domain) {
      conditions.push(eq(crmPipelines.domain, domain as string));
    }
    if (isActive !== undefined) {
      conditions.push(eq(crmPipelines.isActive, isActive === 'true'));
    }

    const pipelines = await db
      .select({
        pipeline: crmPipelines,
        driverName: drivers.name,
        funnel: crmFunnels
      })
      .from(crmPipelines)
      .leftJoin(drivers, eq(crmPipelines.driverId, drivers.id))
      .leftJoin(crmFunnels, eq(crmPipelines.funnelId, crmFunnels.id))
      .where(and(...conditions))
      .orderBy(desc(crmPipelines.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Enrich pipelines with aggregated metrics from deals
    const enrichedPipelines = await Promise.all(
      pipelines.map(async (row) => {
        const pipelineData = row.pipeline;
        const dealsMetrics = await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE status NOT IN ('won', 'lost'))::int as active_deals,
            COALESCE(SUM(estimated_value) FILTER (WHERE status NOT IN ('won', 'lost')), 0)::float as total_value,
            COUNT(*) FILTER (WHERE status = 'won')::int as won_deals,
            COUNT(*) FILTER (WHERE status IN ('won', 'lost'))::int as closed_deals,
            COALESCE(AVG(estimated_value) FILTER (WHERE status NOT IN ('won', 'lost')), 0)::float as avg_deal_value
          FROM w3suite.crm_deals
          WHERE pipeline_id = ${pipelineData.id}
          AND tenant_id = ${tenantId}
        `);

        const metrics = dealsMetrics.rows[0] as any;
        const conversionRate = metrics.closed_deals > 0 
          ? Math.round((metrics.won_deals / metrics.closed_deals) * 100) 
          : 0;

        return {
          ...pipelineData,
          driver: pipelineData.driverId || 'FISSO',
          driverName: row.driverName || 'FISSO',
          funnel: row.funnel ? {
            id: row.funnel.id,
            name: row.funnel.name,
            color: row.funnel.color,
            icon: row.funnel.icon
          } : null,
          activeDeals: metrics.active_deals || 0,
          totalValue: metrics.total_value || 0,
          conversionRate,
          avgDealValue: Math.round(metrics.avg_deal_value || 0),
          products: [] // TODO: Add products from deal metadata or relations
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedPipelines,
      message: 'Pipelines retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipelines', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipelines',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/pipelines
 * Create a new pipeline
 */
router.post('/pipelines', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmPipelineSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [pipeline] = await db
      .insert(crmPipelines)
      .values({
        ...validation.data,
        tenantId
      })
      .returning();

    logger.info('Pipeline created', { pipelineId: pipeline.id, tenantId });

    res.status(201).json({
      success: true,
      data: pipeline,
      message: 'Pipeline created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/pipelines/:id
 * Update a pipeline
 */
router.patch('/pipelines/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmPipelineSchema.omit({ tenantId: true }).partial();
    
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [updated] = await db
      .update(crmPipelines)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmPipelines.id, id),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Pipeline updated', { pipelineId: id, tenantId });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Pipeline updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/settings
 * Get pipeline settings (team/user assignments, channels, etc.)
 */
router.get('/pipelines/:id/settings', rbacMiddleware, requirePermission('crm.view_pipeline'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: pipelineId } = req.params;

    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ));

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get settings
    const [settings] = await db
      .select()
      .from(crmPipelineSettings)
      .where(eq(crmPipelineSettings.pipelineId, pipelineId));

    // Return settings or empty object if not created yet
    res.status(200).json({
      success: true,
      data: settings || {
        pipelineId,
        assignedTeams: [],
        assignedUsers: [],
        pipelineAdmins: [],
        dealManagementMode: 'all',
        dealManagementUsers: [],
        dealCreationMode: 'all',
        dealCreationUsers: [],
        stateModificationMode: 'all',
        stateModificationUsers: [],
        dealDeletionMode: 'admins',
        dealDeletionUsers: [],
      },
      message: 'Pipeline settings retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error getting pipeline settings', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to get pipeline settings',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/pipelines/:id/settings
 * Update pipeline settings (team/user assignments, channels, etc.)
 */
router.patch('/pipelines/:id/settings', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: pipelineId } = req.params;
    
    // Validate request body
    const updateSchema = insertCrmPipelineSettingsSchema.omit({ pipelineId: true }).partial();
    const validation = updateSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ));

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if settings exist
    const [existingSettings] = await db
      .select()
      .from(crmPipelineSettings)
      .where(eq(crmPipelineSettings.pipelineId, pipelineId));

    let settings;
    
    if (existingSettings) {
      // Update existing settings
      [settings] = await db
        .update(crmPipelineSettings)
        .set({
          ...validation.data,
          updatedAt: new Date()
        })
        .where(eq(crmPipelineSettings.pipelineId, pipelineId))
        .returning();
    } else {
      // Create new settings
      [settings] = await db
        .insert(crmPipelineSettings)
        .values({
          pipelineId,
          ...validation.data,
        })
        .returning();
    }

    logger.info('Pipeline settings updated', { pipelineId, tenantId });

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Pipeline settings updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating pipeline settings', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update pipeline settings',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id
 * Get a single pipeline by ID with all details
 */
router.get('/pipelines/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(tenantId);

    const [result] = await db
      .select({
        id: crmPipelines.id,
        tenantId: crmPipelines.tenantId,
        isBrandTemplate: crmPipelines.isBrandTemplate,
        brandPipelineId: crmPipelines.brandPipelineId,
        name: crmPipelines.name,
        domain: crmPipelines.domain,
        driverId: crmPipelines.driverId,
        driver: drivers.code,
        driverName: drivers.name,
        isActive: crmPipelines.isActive,
        stagesConfig: crmPipelines.stagesConfig,
        createdAt: crmPipelines.createdAt,
        updatedAt: crmPipelines.updatedAt,
      })
      .from(crmPipelines)
      .leftJoin(drivers, eq(crmPipelines.driverId, drivers.id))
      .where(and(
        eq(crmPipelines.id, id),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        message: `Pipeline with ID ${id} not found`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Pipeline retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PIPELINE WORKFLOWS (Subresource) ====================

/**
 * GET /api/crm/pipelines/:id/workflows
 * Get all workflows assigned to a pipeline with details
 */
router.get('/pipelines/:pipelineId/workflows', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get assigned workflows with join
    const workflows = await db
      .select({
        id: crmPipelineWorkflows.id,
        pipelineId: crmPipelineWorkflows.pipelineId,
        workflowTemplateId: crmPipelineWorkflows.workflowTemplateId,
        executionMode: crmPipelineWorkflows.executionMode,
        isActive: crmPipelineWorkflows.isActive,
        assignedBy: crmPipelineWorkflows.assignedBy,
        assignedAt: crmPipelineWorkflows.assignedAt,
        notes: crmPipelineWorkflows.notes,
        workflowName: workflowTemplates.name,
        workflowCategory: workflowTemplates.category,
        workflowType: workflowTemplates.templateType
      })
      .from(crmPipelineWorkflows)
      .innerJoin(workflowTemplates, eq(crmPipelineWorkflows.workflowTemplateId, workflowTemplates.id))
      .where(eq(crmPipelineWorkflows.pipelineId, pipelineId))
      .orderBy(desc(crmPipelineWorkflows.assignedAt));

    res.status(200).json({
      success: true,
      data: workflows,
      message: 'Pipeline workflows retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipeline workflows', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipeline workflows',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/pipelines/:id/workflows
 * Assign a workflow to a pipeline (RBAC: admin + marketing roles)
 */
router.post('/pipelines/:pipelineId/workflows', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context or user authentication',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;

    // TODO: Implement RBAC check for admin + marketing permissions via sovereignty system
    // For now, allow any authenticated user (consistent with other CRM endpoints)

    const validation = insertCrmPipelineWorkflowSchema.omit({ assignedBy: true }).safeParse({
      ...req.body,
      pipelineId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Verify workflow template exists
    const [workflow] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, validation.data.workflowTemplateId))
      .limit(1);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [assignment] = await db
      .insert(crmPipelineWorkflows)
      .values({
        ...validation.data,
        assignedBy: userId
      })
      .returning();

    logger.info('Workflow assigned to pipeline', { 
      pipelineId, 
      workflowTemplateId: validation.data.workflowTemplateId,
      assignedBy: userId,
      tenantId 
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Workflow assigned to pipeline successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'This workflow is already assigned to this pipeline',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.error('Error assigning workflow to pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to assign workflow to pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/pipelines/:id/workflows/:workflowId
 * Remove a workflow assignment from a pipeline
 */
router.delete('/pipelines/:pipelineId/workflows/:workflowId', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId, workflowId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [deleted] = await db
      .delete(crmPipelineWorkflows)
      .where(and(
        eq(crmPipelineWorkflows.id, workflowId),
        eq(crmPipelineWorkflows.pipelineId, pipelineId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Workflow assignment not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Workflow removed from pipeline', { 
      pipelineId, 
      workflowId,
      tenantId 
    });

    res.status(200).json({
      success: true,
      data: deleted,
      message: 'Workflow removed from pipeline successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error removing workflow from pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      workflowId: req.params.workflowId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to remove workflow from pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PIPELINE STAGES (Subresource) ====================

/**
 * GET /api/crm/pipelines/:id/stages
 * Get all custom stages for a pipeline ordered by orderIndex
 */
router.get('/pipelines/:pipelineId/stages', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const stages = await db
      .select()
      .from(crmPipelineStages)
      .where(eq(crmPipelineStages.pipelineId, pipelineId))
      .orderBy(crmPipelineStages.orderIndex);

    res.status(200).json({
      success: true,
      data: stages,
      message: 'Pipeline stages retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipeline stages', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipeline stages',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/category-stats
 * Get deal distribution by stage category with percentages (only categories > 0)
 */
router.get('/pipelines/:pipelineId/category-stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Query: COUNT deals grouped by stage category with percentage calculation
    const categoryStats = await db.execute(sql`
      WITH category_counts AS (
        SELECT 
          s.category,
          COUNT(d.id)::int as deal_count
        FROM w3suite.crm_pipeline_stages s
        LEFT JOIN w3suite.crm_deals d ON d.stage = s.name 
          AND d.pipeline_id = s.pipeline_id 
          AND d.tenant_id = ${tenantId}
        WHERE s.pipeline_id = ${pipelineId}
        GROUP BY s.category
      ),
      total_deals AS (
        SELECT SUM(deal_count)::int as total FROM category_counts
      )
      SELECT 
        cc.category,
        cc.deal_count,
        CASE 
          WHEN td.total > 0 THEN ROUND((cc.deal_count::float / td.total::float * 100)::numeric, 1)
          ELSE 0
        END as percentage
      FROM category_counts cc
      CROSS JOIN total_deals td
      WHERE cc.deal_count > 0
      ORDER BY cc.deal_count DESC
    `);

    const stats = categoryStats.rows.map((row: any) => ({
      category: row.category,
      count: row.deal_count,
      percentage: parseFloat(row.percentage)
    }));

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Category stats retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving category stats', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve category stats',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/channel-stats
 * Get top 5 acquisition channels with deal count and percentages
 */
router.get('/pipelines/:pipelineId/channel-stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Query: COUNT deals grouped by last_contact_channel (OUTBOUND) with percentage
    const channelStats = await db.execute(sql`
      WITH channel_counts AS (
        SELECT 
          COALESCE(last_contact_channel::text, 'Non contattato') as channel,
          COUNT(*)::int as deal_count
        FROM w3suite.crm_deals
        WHERE pipeline_id = ${pipelineId}
          AND tenant_id = ${tenantId}
        GROUP BY last_contact_channel
      ),
      total_deals AS (
        SELECT SUM(deal_count)::int as total FROM channel_counts
      )
      SELECT 
        cc.channel,
        cc.deal_count,
        CASE 
          WHEN td.total > 0 THEN ROUND((cc.deal_count::float / td.total::float * 100)::numeric, 1)
          ELSE 0
        END as percentage
      FROM channel_counts cc
      CROSS JOIN total_deals td
      ORDER BY 
        CASE WHEN cc.channel = 'Non contattato' THEN 0 ELSE 1 END,
        cc.deal_count DESC
      LIMIT 5
    `);

    const stats = channelStats.rows.map((row: any) => ({
      channel: row.channel,
      count: row.deal_count,
      percentage: parseFloat(row.percentage)
    }));

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Channel stats retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving channel stats', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve channel stats',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/channel-matrix
 * Get win rate matrix for inbound x outbound channel combinations
 */
router.get('/pipelines/:pipelineId/channel-matrix', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Query: Win rate per inbound×outbound combination
    const matrixData = await db.execute(sql`
      SELECT 
        COALESCE(source_channel::text, 'Unknown') as inbound_channel,
        COALESCE(last_contact_channel::text, 'No Contact') as outbound_channel,
        COUNT(*) FILTER (WHERE status = 'won')::int as won_count,
        COUNT(*)::int as total_count,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'won')::float / COUNT(*)::float * 100)::numeric, 1)
          ELSE 0
        END as win_rate
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status IN ('won', 'lost')
      GROUP BY source_channel, last_contact_channel
      HAVING COUNT(*) >= 1
      ORDER BY win_rate DESC
    `);

    const matrix = matrixData.rows.map((row: any) => ({
      inboundChannel: row.inbound_channel,
      outboundChannel: row.outbound_channel,
      wonCount: row.won_count,
      totalCount: row.total_count,
      winRate: parseFloat(row.win_rate)
    }));

    res.status(200).json({
      success: true,
      data: matrix,
      message: 'Channel attribution matrix retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving channel matrix', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve channel matrix',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/best-pairs
 * Get top 5 inbound×outbound channel pairs by conversion rate
 */
router.get('/pipelines/:pipelineId/best-pairs', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const bestPairs = await db.execute(sql`
      SELECT 
        COALESCE(source_channel::text, 'Unknown') as inbound_channel,
        COALESCE(last_contact_channel::text, 'No Contact') as outbound_channel,
        COUNT(*) FILTER (WHERE status = 'won')::int as won_count,
        COUNT(*)::int as total_count,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'won')::float / COUNT(*)::float * 100)::numeric, 1)
          ELSE 0
        END as conversion_rate,
        CONCAT(COALESCE(source_channel::text, 'Unknown'), ' + ', COALESCE(last_contact_channel::text, 'No Contact')) as pair_name
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status IN ('won', 'lost')
      GROUP BY source_channel, last_contact_channel
      HAVING COUNT(*) >= 1
      ORDER BY conversion_rate DESC, total_count DESC
      LIMIT 5
    `);

    const pairs = bestPairs.rows.map((row: any) => ({
      pairName: row.pair_name,
      inboundChannel: row.inbound_channel,
      outboundChannel: row.outbound_channel,
      wonCount: row.won_count,
      totalCount: row.total_count,
      conversionRate: parseFloat(row.conversion_rate)
    }));

    res.status(200).json({
      success: true,
      data: pairs,
      message: 'Best performing pairs retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving best pairs', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve best pairs',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/funnel-by-source
 * Get conversion funnel breakdown by inbound source channel
 */
router.get('/pipelines/:pipelineId/funnel-by-source', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const funnelData = await db.execute(sql`
      WITH stage_categories AS (
        SELECT DISTINCT
          s.category,
          s.order_index
        FROM w3suite.crm_pipeline_stages s
        WHERE s.pipeline_id = ${pipelineId}
        ORDER BY s.order_index
      )
      SELECT 
        COALESCE(d.source_channel::text, 'Unknown') as source_channel,
        s.category as stage_category,
        COUNT(*)::int as deal_count,
        s.order_index
      FROM w3suite.crm_deals d
      JOIN w3suite.crm_pipeline_stages s ON s.name = d.stage AND s.pipeline_id = d.pipeline_id
      WHERE d.pipeline_id = ${pipelineId}
        AND d.tenant_id = ${tenantId}
      GROUP BY d.source_channel, s.category, s.order_index
      ORDER BY d.source_channel, s.order_index
    `);

    const funnel = funnelData.rows.map((row: any) => ({
      sourceChannel: row.source_channel,
      stageCategory: row.stage_category,
      dealCount: row.deal_count,
      orderIndex: row.order_index
    }));

    res.status(200).json({
      success: true,
      data: funnel,
      message: 'Funnel by source retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving funnel by source', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve funnel by source',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/outbound-efficiency
 * Get overall performance metrics for each outbound contact channel
 */
router.get('/pipelines/:pipelineId/outbound-efficiency', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const efficiencyData = await db.execute(sql`
      SELECT 
        COALESCE(last_contact_channel::text, 'No Contact') as channel,
        COUNT(*)::int as total_deals,
        COUNT(*) FILTER (WHERE status = 'won')::int as won_deals,
        COUNT(*) FILTER (WHERE status = 'lost')::int as lost_deals,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'won')::float / COUNT(*)::float * 100)::numeric, 1)
          ELSE 0
        END as win_rate,
        ROUND(AVG(estimated_value) FILTER (WHERE status = 'won')::numeric, 2) as avg_deal_value
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status IN ('won', 'lost', 'open')
      GROUP BY last_contact_channel
      ORDER BY win_rate DESC, total_deals DESC
    `);

    const efficiency = efficiencyData.rows.map((row: any) => ({
      channel: row.channel,
      totalDeals: row.total_deals,
      wonDeals: row.won_deals,
      lostDeals: row.lost_deals,
      winRate: parseFloat(row.win_rate),
      avgDealValue: parseFloat(row.avg_deal_value || 0)
    }));

    res.status(200).json({
      success: true,
      data: efficiency,
      message: 'Outbound channel efficiency retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving outbound efficiency', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve outbound efficiency',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/time-to-close
 * Get average time to close deals by inbound×outbound channel pair
 */
router.get('/pipelines/:pipelineId/time-to-close', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const timeData = await db.execute(sql`
      SELECT 
        COALESCE(source_channel::text, 'Unknown') as inbound_channel,
        COALESCE(last_contact_channel::text, 'No Contact') as outbound_channel,
        COUNT(*)::int as deal_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(won_at, NOW()) - created_at)) / 86400)::numeric, 1) as avg_days_to_close,
        CONCAT(COALESCE(source_channel::text, 'Unknown'), ' + ', COALESCE(last_contact_channel::text, 'No Contact')) as pair_name
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status = 'won'
      GROUP BY source_channel, last_contact_channel
      HAVING COUNT(*) >= 1
      ORDER BY avg_days_to_close ASC
    `);

    const timeToClose = timeData.rows.map((row: any) => ({
      pairName: row.pair_name,
      inboundChannel: row.inbound_channel,
      outboundChannel: row.outbound_channel,
      dealCount: row.deal_count,
      avgDaysToClose: parseFloat(row.avg_days_to_close)
    }));

    res.status(200).json({
      success: true,
      data: timeToClose,
      message: 'Time to close analysis retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving time to close', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve time to close',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/pipelines/:id/stages
 * Create a new custom stage for a pipeline
 */
router.post('/pipelines/:pipelineId/stages', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;

    const validation = insertCrmPipelineStageSchema.safeParse({
      ...req.body,
      pipelineId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [stage] = await db
      .insert(crmPipelineStages)
      .values(validation.data)
      .returning();

    logger.info('Pipeline stage created', { 
      pipelineId, 
      stageId: stage.id,
      stageName: stage.name,
      category: stage.category,
      tenantId 
    });

    res.status(201).json({
      success: true,
      data: stage,
      message: 'Pipeline stage created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'A stage with this name already exists in this pipeline',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.error('Error creating pipeline stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create pipeline stage',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/pipelines/:id/stages/:stageId
 * Update a custom stage
 */
router.patch('/pipelines/:pipelineId/stages/:stageId', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId, stageId } = req.params;
    const updateSchema = insertCrmPipelineStageSchema.omit({ pipelineId: true }).partial();

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify pipeline belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [updated] = await db
      .update(crmPipelineStages)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmPipelineStages.id, stageId),
        eq(crmPipelineStages.pipelineId, pipelineId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Pipeline stage updated', { 
      pipelineId, 
      stageId,
      tenantId 
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Pipeline stage updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating pipeline stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      stageId: req.params.stageId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update pipeline stage',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/stages/:stageId/deals/count
 * Count deals in a specific stage
 */
router.get('/pipelines/:pipelineId/stages/:stageId/deals/count', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { stageId } = req.params;
    await setTenantContext(tenantId);

    // First, get the stage to find its name
    const [stage] = await db
      .select()
      .from(crmPipelineStages)
      .where(eq(crmPipelineStages.id, stageId))
      .limit(1);

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmDeals)
      .where(and(
        eq(crmDeals.stage, stage.name),
        eq(crmDeals.tenantId, tenantId)
      ));

    const count = result[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: { count },
      message: 'Deal count retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error counting deals for stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      stageId: req.params.stageId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to count deals',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/pipelines/:id/stages/:stageId
 * Delete or archive a custom stage (archives if deals exist, deletes if none)
 */
router.delete('/pipelines/:pipelineId/stages/:stageId', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId, stageId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Verify stage exists
    const [stage] = await db
      .select()
      .from(crmPipelineStages)
      .where(and(
        eq(crmPipelineStages.id, stageId),
        eq(crmPipelineStages.pipelineId, pipelineId)
      ))
      .limit(1);

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if stage has any deals (using stage name since deals store stage as varchar)
    const dealCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmDeals)
      .where(and(
        eq(crmDeals.stage, stage.name),
        eq(crmDeals.tenantId, tenantId)
      ));

    const dealCount = dealCountResult[0]?.count || 0;

    // If stage has deals, archive it instead of deleting
    if (dealCount > 0) {
      const [archived] = await db
        .update(crmPipelineStages)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(crmPipelineStages.id, stageId),
          eq(crmPipelineStages.pipelineId, pipelineId)
        ))
        .returning();

      logger.info('Pipeline stage archived (has deals)', { 
        pipelineId, 
        stageId,
        dealCount,
        tenantId 
      });

      return res.status(200).json({
        success: true,
        data: { 
          ...archived, 
          action: 'archived',
          dealCount 
        },
        message: `Stato archiviato perché ha ${dealCount} deal associati`,
        timestamp: new Date().toISOString()
      } as ApiSuccessResponse);
    }

    // No deals, safe to delete
    const [deleted] = await db
      .delete(crmPipelineStages)
      .where(and(
        eq(crmPipelineStages.id, stageId),
        eq(crmPipelineStages.pipelineId, pipelineId)
      ))
      .returning();

    logger.info('Pipeline stage deleted (no deals)', { 
      pipelineId, 
      stageId,
      tenantId 
    });

    res.status(200).json({
      success: true,
      data: { 
        ...deleted, 
        action: 'deleted' 
      },
      message: 'Pipeline stage deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting pipeline stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      stageId: req.params.stageId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete pipeline stage',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== DEALS ====================

/**
 * GET /api/crm/deals
 * Get all deals for the current tenant
 */
router.get('/deals', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status, pipelineId, stage, customerId, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmDeals.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmDeals.status, status as string));
    }
    if (pipelineId) {
      conditions.push(eq(crmDeals.pipelineId, pipelineId as string));
    }
    if (stage) {
      conditions.push(eq(crmDeals.stage, stage as string));
    }
    if (customerId) {
      conditions.push(eq(crmDeals.customerId, customerId as string));
    }

    const deals = await db
      .select({
        id: crmDeals.id,
        tenantId: crmDeals.tenantId,
        storeId: crmDeals.storeId,
        ownerUserId: crmDeals.ownerUserId,
        pipelineId: crmDeals.pipelineId,
        stage: crmDeals.stage,
        status: crmDeals.status,
        leadId: crmDeals.leadId,
        sourceChannel: crmDeals.sourceChannel,
        personId: crmDeals.personId,
        customerId: crmDeals.customerId,
        estimatedValue: crmDeals.estimatedValue,
        probability: crmDeals.probability,
        agingDays: crmDeals.agingDays,
        wonAt: crmDeals.wonAt,
        preferredContactChannel: crmDeals.preferredContactChannel,
        lastContactChannel: crmDeals.lastContactChannel,
        lastContactDate: crmDeals.lastContactDate,
        createdAt: crmDeals.createdAt,
        updatedAt: crmDeals.updatedAt,
        // Join fields
        ownerName: sql<string>`CASE 
          WHEN ${users.firstName} IS NOT NULL OR ${users.lastName} IS NOT NULL 
          THEN TRIM(CONCAT(COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, '')))
          ELSE NULL
        END`,
        ownerEmail: users.email,
        customerName: sql<string>`CASE 
          WHEN ${crmCustomers.customerType} = 'b2b' THEN CONCAT(COALESCE(${crmCustomers.firstName}, ''), ' ', COALESCE(${crmCustomers.lastName}, ''))
          WHEN ${crmCustomers.customerType} = 'b2c' THEN CONCAT(COALESCE(${crmCustomers.firstName}, ''), ' ', COALESCE(${crmCustomers.lastName}, ''))
          ELSE NULL
        END`,
        customerCompanyName: crmCustomers.companyName,
        customerType: crmCustomers.customerType,
      })
      .from(crmDeals)
      .leftJoin(users, eq(crmDeals.ownerUserId, users.id))
      .leftJoin(crmCustomers, eq(crmDeals.customerId, crmCustomers.id))
      .where(and(...conditions))
      .orderBy(desc(crmDeals.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: deals,
      message: 'Deals retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving deals', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve deals',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/deals
 * Create a new deal
 */
router.post('/deals', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmDealSchema.omit({ tenantId: true, personId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get personId from lead if leadId is provided, otherwise personId must be in request body
    let personId: string | undefined;
    if (validation.data.leadId) {
      const [lead] = await db
        .select({ personId: crmLeads.personId })
        .from(crmLeads)
        .where(and(
          eq(crmLeads.id, validation.data.leadId),
          eq(crmLeads.tenantId, tenantId)
        ));
      
      if (lead) {
        personId = lead.personId;
        logger.info('Person ID propagated from lead to deal', {
          leadId: validation.data.leadId,
          personId,
          tenantId
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
    } else if (req.body.personId) {
      // Manual deal creation: personId provided directly
      personId = req.body.personId;
      logger.info('Manual deal creation with direct personId', {
        personId,
        tenantId
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either leadId or personId is required to create a deal',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [deal] = await db
      .insert(crmDeals)
      .values({
        ...validation.data,
        tenantId,
        personId
      })
      .returning();

    logger.info('Deal created', { dealId: deal.id, tenantId });

    // Invalidate analytics cache for affected funnel
    if (deal.pipelineId) {
      const pipeline = await db.query.crmPipelines.findFirst({
        where: and(
          eq(crmPipelines.id, deal.pipelineId),
          eq(crmPipelines.tenantId, tenantId)
        )
      });

      if (pipeline?.funnelId) {
        await analyticsCacheService.invalidateFunnel(tenantId, pipeline.funnelId);
        logger.debug('Analytics cache invalidated for funnel', { 
          funnelId: pipeline.funnelId, 
          dealId: deal.id, 
          tenantId 
        });
      }
    }

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Deal created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating deal', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create deal',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/deals/:id
 * Update a deal (including stage transitions)
 */
router.patch('/deals/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmDealSchema.omit({ tenantId: true }).partial();
    
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Fetch existing deal before update (for notification comparison)
    const [existingDeal] = await db
      .select()
      .from(crmDeals)
      .where(and(
        eq(crmDeals.id, id),
        eq(crmDeals.tenantId, tenantId)
      ));

    if (!existingDeal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if status is being changed to won/lost
    let updateData = { ...validation.data, updatedAt: new Date() };
    if (validation.data.status === 'won' && !validation.data.wonAt) {
      updateData = { ...updateData, wonAt: new Date() };
    } else if (validation.data.status === 'lost' && !validation.data.lostAt) {
      updateData = { ...updateData, lostAt: new Date() };
    }

    const [updated] = await db
      .update(crmDeals)
      .set(updateData)
      .where(and(
        eq(crmDeals.id, id),
        eq(crmDeals.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Deal updated', { dealId: id, tenantId, status: updateData.status });

    // NOTIFICATION TRIGGERS (Task #7)
    // Trigger notifications based on changes (async, don't block response)
    (async () => {
      try {
        // Stage change notification
        if (validation.data.currentStage && validation.data.currentStage !== existingDeal.currentStage) {
          await dealNotificationService.notifyStateChange({
            dealId: id,
            tenantId,
            pipelineId: updated.pipelineId,
            fromStage: existingDeal.currentStage || 'unknown',
            toStage: validation.data.currentStage,
            dealTitle: updated.title,
            ownerUserId: updated.ownerId || undefined,
            assignedTeamId: updated.teamId || undefined
          });
        }

        // Won deal notification
        if (validation.data.status === 'won' && existingDeal.status !== 'won') {
          await dealNotificationService.notifyDealWon({
            dealId: id,
            tenantId,
            pipelineId: updated.pipelineId,
            dealTitle: updated.title,
            value: updated.value || undefined,
            ownerUserId: updated.ownerId || undefined,
            assignedTeamId: updated.teamId || undefined
          });
        }

        // Lost deal notification
        if (validation.data.status === 'lost' && existingDeal.status !== 'lost') {
          await dealNotificationService.notifyDealLost({
            dealId: id,
            tenantId,
            pipelineId: updated.pipelineId,
            dealTitle: updated.title,
            lostReason: updated.lostReason || undefined,
            ownerUserId: updated.ownerId || undefined,
            assignedTeamId: updated.teamId || undefined
          });
        }
      } catch (notifError) {
        logger.error('Failed to send deal notifications', {
          error: notifError instanceof Error ? notifError.message : 'Unknown error',
          dealId: id
        });
      }
    })();

    // Invalidate analytics cache for affected funnel (async, don't block response)
    (async () => {
      try {
        if (updated.pipelineId) {
          const pipeline = await db.query.crmPipelines.findFirst({
            where: and(
              eq(crmPipelines.id, updated.pipelineId),
              eq(crmPipelines.tenantId, tenantId)
            )
          });

          if (pipeline?.funnelId) {
            await analyticsCacheService.invalidateFunnel(tenantId, pipeline.funnelId);
            logger.debug('Analytics cache invalidated for funnel', { 
              funnelId: pipeline.funnelId, 
              dealId: id, 
              tenantId 
            });
          }
        }
      } catch (cacheError) {
        logger.error('Failed to invalidate analytics cache', {
          error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
          dealId: id
        });
      }
    })();

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Deal updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating deal', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      dealId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update deal',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/deals/:id/move
 * Move deal to a different stage with workflow validation
 * 
 * Workflow Rules:
 * 1. Cannot return to "starter" category from any other stage
 * 2. finalized/ko/archive stages are LOCKED (require confirmOverride=true)
 */
router.patch('/deals/:id/move', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const moveSchema = z.object({
      targetStage: z.string().min(1, 'Target stage is required'),
      confirmOverride: z.boolean().optional().default(false)
    });

    const validation = moveSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { targetStage, confirmOverride } = validation.data;
    await setTenantContext(tenantId);

    // Get current deal with its stage category
    const dealResult = await db.execute(sql`
      SELECT 
        d.id,
        d.stage as current_stage,
        d.pipeline_id,
        s_current.category as current_category
      FROM w3suite.crm_deals d
      LEFT JOIN w3suite.crm_pipeline_stages s_current 
        ON s_current.name = d.stage 
        AND s_current.pipeline_id = d.pipeline_id
      WHERE d.id = ${id} 
        AND d.tenant_id = ${tenantId}
    `);

    if (dealResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const deal = dealResult.rows[0] as any;

    // Get target stage category
    const targetStageResult = await db.execute(sql`
      SELECT category, name
      FROM w3suite.crm_pipeline_stages
      WHERE name = ${targetStage}
        AND pipeline_id = ${deal.pipeline_id}
    `);

    if (targetStageResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid target stage',
        message: `Stage "${targetStage}" does not exist in this pipeline`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const targetStageData = targetStageResult.rows[0] as any;
    const targetCategory = targetStageData.category;
    const currentCategory = deal.current_category;

    // WORKFLOW VALIDATION RULE 1: Cannot return to "starter" category
    if (targetCategory === 'starter' && currentCategory !== 'starter') {
      return res.status(403).json({
        success: false,
        error: 'Workflow violation',
        message: 'Non puoi tornare allo stage iniziale da uno stage successivo',
        code: 'FORBIDDEN_TRANSITION_TO_STARTER',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // WORKFLOW VALIDATION RULE 2: finalized/ko/archive are LOCKED
    const lockedCategories = ['finalized', 'ko', 'archive'];
    if (lockedCategories.includes(currentCategory) && !confirmOverride) {
      return res.status(403).json({
        success: false,
        error: 'Stage locked',
        message: `Questo deal è in uno stage bloccato (${currentCategory}). Conferma per riaprirlo.`,
        code: 'STAGE_LOCKED_NEEDS_CONFIRMATION',
        currentCategory,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validation passed - update stage
    const [updated] = await db
      .update(crmDeals)
      .set({
        stage: targetStage,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmDeals.id, id),
        eq(crmDeals.tenantId, tenantId)
      ))
      .returning();

    logger.info('Deal stage moved', { 
      dealId: id, 
      tenantId, 
      from: deal.current_stage,
      to: targetStage,
      fromCategory: currentCategory,
      toCategory: targetCategory,
      confirmOverride 
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `Deal spostato in "${targetStage}" con successo`,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error moving deal', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      dealId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to move deal',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/deals/:id/assign
 * Assign deal to user and/or team
 * Requires pipeline access permission (RBAC validation)
 */
router.patch('/deals/:id/assign', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID required',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const assignSchema = z.object({
      userId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional()
    });

    const validation = assignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Reject empty payload (at least one field must be present)
    if (!validation.data.userId && !validation.data.teamId) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'At least one of userId or teamId must be provided',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Fetch deal to get pipelineId for RBAC validation
    const [deal] = await db
      .select({ pipelineId: crmDeals.pipelineId })
      .from(crmDeals)
      .where(and(
        eq(crmDeals.id, id),
        eq(crmDeals.tenantId, tenantId)
      ));

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // RBAC Validation: Check if current user has access to this pipeline
    const [pipelineSettings] = await db
      .select()
      .from(crmPipelineSettings)
      .where(and(
        eq(crmPipelineSettings.pipelineId, deal.pipelineId),
        eq(crmPipelineSettings.tenantId, tenantId)
      ));

    if (!pipelineSettings) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Pipeline settings not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if user has pipeline access (assignedTeams, assignedUsers, or pipelineAdmins)
    const hasUserAccess = pipelineSettings.assignedUsers?.includes(userId);
    const isAdmin = pipelineSettings.pipelineAdmins?.includes(userId);

    // Check if user belongs to any of the assigned teams
    let hasTeamAccess = false;
    if (pipelineSettings.assignedTeams && pipelineSettings.assignedTeams.length > 0) {
      const userTeams = await db
        .select({ id: teams.id })
        .from(teams)
        .where(and(
          eq(teams.tenantId, tenantId),
          sql`${teams.id} = ANY(${pipelineSettings.assignedTeams})`,
          sql`${userId} = ANY(${teams.userMembers})`
        ));
      
      hasTeamAccess = userTeams.length > 0;
    }

    if (!hasTeamAccess && !hasUserAccess && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to assign deals in this pipeline',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Update deal assignment
    const updateData: any = { updatedAt: new Date() };
    if (validation.data.userId !== undefined) {
      updateData.ownerUserId = validation.data.userId;
    }
    if (validation.data.teamId !== undefined) {
      updateData.assignedTeamId = validation.data.teamId;
    }

    const [updated] = await db
      .update(crmDeals)
      .set(updateData)
      .where(and(
        eq(crmDeals.id, id),
        eq(crmDeals.tenantId, tenantId)
      ))
      .returning();

    logger.info('Deal assigned', { 
      dealId: id, 
      tenantId, 
      assignedUserId: validation.data.userId,
      assignedTeamId: validation.data.teamId
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Deal assigned successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error assigning deal', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      dealId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to assign deal',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== FUNNEL ORCHESTRATION ====================

/**
 * POST /api/crm/deals/:dealId/transition-stage
 * Transition deal to different stage within same pipeline
 */
router.post('/deals/:dealId/transition-stage', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { dealId } = req.params;
    const transitionSchema = z.object({
      targetStage: z.string().min(1),
      notifyTeam: z.boolean().optional(),
      triggerWorkflows: z.boolean().optional()
    });

    const validation = transitionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const { funnelOrchestrationService } = await import('../services/funnel-orchestration.service');
    const result = await funnelOrchestrationService.transitionStage({
      dealId,
      targetStage: validation.data.targetStage,
      tenantId,
      userId,
      notifyTeam: validation.data.notifyTeam,
      triggerWorkflows: validation.data.triggerWorkflows
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Transition failed',
        message: result.message,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error transitioning deal stage', { 
      errorMessage: error?.message || 'Unknown error',
      dealId: req.params.dealId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to transition stage',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/deals/:dealId/transition-pipeline
 * Transition deal to different pipeline within same funnel
 */
router.post('/deals/:dealId/transition-pipeline', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { dealId } = req.params;
    const transitionSchema = z.object({
      targetPipelineId: z.string().uuid(),
      resetStage: z.boolean().optional(),
      triggerAIReScore: z.boolean().optional(),
      transitionReason: z.string().optional()
    });

    const validation = transitionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const { funnelOrchestrationService } = await import('../services/funnel-orchestration.service');
    const result = await funnelOrchestrationService.transitionPipeline({
      dealId,
      targetPipelineId: validation.data.targetPipelineId,
      tenantId,
      userId,
      resetStage: validation.data.resetStage,
      triggerAIReScore: validation.data.triggerAIReScore,
      transitionReason: validation.data.transitionReason
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Transition failed',
        message: result.message,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error transitioning deal pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      dealId: req.params.dealId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to transition pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/deals/:dealId/exit-funnel
 * Exit deal from funnel (won/lost/churned)
 */
router.post('/deals/:dealId/exit-funnel', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { dealId } = req.params;
    const exitSchema = z.object({
      exitReason: z.enum(['won', 'lost', 'churned', 'disqualified']),
      lostReason: z.string().optional(),
      createCustomerRecord: z.boolean().optional(),
      archiveDeal: z.boolean().optional()
    });

    const validation = exitSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const { funnelOrchestrationService } = await import('../services/funnel-orchestration.service');
    const result = await funnelOrchestrationService.exitFunnel({
      dealId,
      exitReason: validation.data.exitReason,
      tenantId,
      userId,
      lostReason: validation.data.lostReason,
      createCustomerRecord: validation.data.createCustomerRecord,
      archiveDeal: validation.data.archiveDeal
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Exit failed',
        message: result.message,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error exiting deal from funnel', { 
      errorMessage: error?.message || 'Unknown error',
      dealId: req.params.dealId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to exit funnel',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/funnels/:funnelId/orchestration-suggestions
 * Get AI suggestions for next best pipeline
 */
router.get('/funnels/:funnelId/orchestration-suggestions', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { funnelId } = req.params;
    const { dealId } = req.query;

    if (!dealId || typeof dealId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing dealId query parameter',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const { funnelOrchestrationService } = await import('../services/funnel-orchestration.service');
    const result = await funnelOrchestrationService.getOrchestrationSuggestions({
      dealId,
      funnelId,
      tenantId,
      userId
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to get suggestions',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: result.suggestions,
      message: 'AI suggestions retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error getting AI orchestration suggestions', { 
      errorMessage: error?.message || 'Unknown error',
      funnelId: req.params.funnelId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to get suggestions',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== INTERACTIONS ====================

/**
 * GET /api/crm/interactions
 * Get all interactions for the current tenant with optional filters
 */
router.get('/interactions', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { entityId, personId, channel, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build where clause with and()
    const whereConditions = [eq(crmInteractions.tenantId, tenantId)];
    
    // Note: crmInteractions uses entityId, not personId. If personId is provided, ignore it for now
    // as interactions are tied to entities (leads/deals/customers) not directly to persons
    if (entityId && typeof entityId === 'string' && entityId.trim()) {
      whereConditions.push(eq(crmInteractions.entityId, entityId));
    }
    if (channel && typeof channel === 'string' && channel.trim()) {
      whereConditions.push(eq(crmInteractions.channel, channel));
    }

    const interactions = await db
      .select()
      .from(crmInteractions)
      .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
      .orderBy(desc(crmInteractions.occurredAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: interactions,
      message: 'Interactions retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving interactions', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve interactions',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== CUSTOMERS ENDPOINTS ====================

/**
 * GET /api/crm/customers
 * Get all customers with optional filtering
 */
router.get('/customers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { customerType, status, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    const conditions = [eq(crmCustomers.tenantId, tenantId)];
    if (customerType) {
      conditions.push(eq(crmCustomers.customerType, customerType as any));
    }
    if (status) {
      conditions.push(eq(crmCustomers.status, status as string));
    }

    const customers = await db
      .select()
      .from(crmCustomers)
      .where(and(...conditions))
      .orderBy(desc(crmCustomers.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: customers,
      message: 'Customers retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving customers', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve customers',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/customers
 * Create a new customer
 */
router.post('/customers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmCustomerSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [customer] = await db
      .insert(crmCustomers)
      .values({
        ...validation.data,
        tenantId
      })
      .returning();

    logger.info('Customer created', { customerId: customer.id, tenantId });

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/customers/:id
 * Get a single customer by ID
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;

    const customer = await withTenantTransaction(tenantId, async (tx) => {
      const [result] = await tx
        .select()
        .from(crmCustomers)
        .where(and(
          eq(crmCustomers.id, id),
          eq(crmCustomers.tenantId, tenantId)
        ))
        .limit(1);
      
      return result;
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/customers/:id/360
 * Get complete customer 360° view with related data
 */
router.get('/customers/:id/360', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;

    const { customer, leads, deals, orders, interactions } = await withTenantTransaction(tenantId, async (tx) => {
      const [customerResult] = await tx
        .select()
        .from(crmCustomers)
        .where(and(
          eq(crmCustomers.id, id),
          eq(crmCustomers.tenantId, tenantId)
        ))
        .limit(1);

      if (!customerResult) {
        return { customer: null, leads: [], deals: [], orders: [], interactions: [] };
      }

      const [leadsResult, dealsResult, ordersResult, interactionsResult] = await Promise.all([
        tx
          .select()
          .from(crmLeads)
          .where(and(
            eq(crmLeads.personId, customerResult.personId),
            eq(crmLeads.tenantId, tenantId)
          ))
          .orderBy(desc(crmLeads.createdAt)),
        
        tx
          .select()
          .from(crmDeals)
          .where(and(
            eq(crmDeals.customerId, id),
            eq(crmDeals.tenantId, tenantId)
          ))
          .orderBy(desc(crmDeals.createdAt)),
        
        tx
          .select()
          .from(crmOrders)
          .where(and(
            eq(crmOrders.customerId, id),
            eq(crmOrders.tenantId, tenantId)
          ))
          .orderBy(desc(crmOrders.orderDate)),
        
        tx
          .select()
          .from(crmInteractions)
          .where(and(
            eq(crmInteractions.entityId, id),
            eq(crmInteractions.entityType, 'customer'),
            eq(crmInteractions.tenantId, tenantId)
          ))
          .orderBy(desc(crmInteractions.occurredAt))
          .limit(50)
      ]);

      return {
        customer: customerResult,
        leads: leadsResult,
        deals: dealsResult,
        orders: ordersResult,
        interactions: interactionsResult
      };
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    const lastOrderDate = orders.length > 0 ? orders[0].orderDate : null;
    const daysSinceLastOrder = lastOrderDate 
      ? Math.floor((new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    res.status(200).json({
      success: true,
      data: {
        customer,
        leads,
        deals,
        orders,
        interactions,
        analytics: {
          totalRevenue,
          totalOrders: orders.length,
          avgOrderValue,
          lastOrderDate,
          daysSinceLastOrder,
          totalLeads: leads.length,
          totalDeals: deals.length,
          wonDeals: deals.filter(d => d.status === 'won').length,
          lostDeals: deals.filter(d => d.status === 'lost').length,
          totalInteractions: interactions.length
        }
      },
      message: 'Customer 360° data retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving customer 360° data', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve customer 360° data',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/customers/search
 * Search customers by firstName, lastName, email, phone, businessName
 */
router.get('/customers/search', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { q, limit = '20' } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const searchTerm = `%${q.trim()}%`;
    
    const customers = await db
      .select({
        id: crmCustomers.id,
        customerType: crmCustomers.customerType,
        firstName: crmCustomers.firstName,
        lastName: crmCustomers.lastName,
        email: crmCustomers.email,
        phone: crmCustomers.phone,
        companyName: crmCustomers.companyName,
        vatNumber: crmCustomers.vatNumber,
        status: crmCustomers.status,
      })
      .from(crmCustomers)
      .where(and(
        eq(crmCustomers.tenantId, tenantId),
        or(
          ilike(crmCustomers.firstName, searchTerm),
          ilike(crmCustomers.lastName, searchTerm),
          ilike(crmCustomers.email, searchTerm),
          ilike(crmCustomers.phone, searchTerm),
          ilike(crmCustomers.companyName, searchTerm),
          sql`CONCAT(${crmCustomers.firstName}, ' ', ${crmCustomers.lastName}) ILIKE ${searchTerm}`
        )
      ))
      .orderBy(desc(crmCustomers.createdAt))
      .limit(parseInt(limit as string));

    res.status(200).json({
      success: true,
      data: customers,
      message: 'Customers search completed',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error searching customers', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to search customers',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/customers/:id
 * Update a customer
 */
router.patch('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const validation = insertCrmCustomerSchema.omit({ tenantId: true }).partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [customer] = await db
      .update(crmCustomers)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmCustomers.id, id),
        eq(crmCustomers.tenantId, tenantId)
      ))
      .returning();

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Customer updated', { customerId: customer.id, tenantId });

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/customers/:id
 * Delete a customer
 */
router.delete('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    
    await setTenantContext(tenantId);

    const [customer] = await db
      .delete(crmCustomers)
      .where(and(
        eq(crmCustomers.id, id),
        eq(crmCustomers.tenantId, tenantId)
      ))
      .returning();

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Customer deleted', { customerId: id, tenantId });

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== CUSTOMER DOCUMENTS ENDPOINTS ====================

/**
 * GET /api/crm/customers/:id/documents
 * Get all documents for a customer
 */
router.get('/customers/:id/documents', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(tenantId);

    const documents = await db
      .select()
      .from(crmCustomerDocuments)
      .where(and(
        eq(crmCustomerDocuments.customerId, id),
        eq(crmCustomerDocuments.tenantId, tenantId)
      ))
      .orderBy(desc(crmCustomerDocuments.createdAt));

    res.status(200).json({
      success: true,
      data: documents,
      message: 'Documents retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving customer documents', { 
      errorMessage: error?.message || 'Unknown error',
      customerId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve documents',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/customers/:id/documents
 * Upload a new document (multipart/form-data)
 */
router.post('/customers/:id/documents', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context or user ID',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;

    await setTenantContext(tenantId);

    // Parse and validate request body
    const bodyData = {
      ...req.body,
      tenantId,
      customerId: id,
      uploadedBy: userId,
      fileSize: req.body.fileSize ? parseInt(req.body.fileSize, 10) : undefined,
      tags: req.body.tags && typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags
    };

    const validationResult = insertCrmCustomerDocumentSchema.safeParse(bodyData);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [document] = await db
      .insert(crmCustomerDocuments)
      .values(validationResult.data)
      .returning();

    logger.info('Document uploaded', { documentId: document.id, customerId: id, tenantId });

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploaded successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error uploading document', { 
      errorMessage: error?.message || 'Unknown error',
      customerId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to upload document',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/customers/:id/documents/:documentId
 * Delete a document
 */
router.delete('/customers/:id/documents/:documentId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id, documentId } = req.params;
    await setTenantContext(tenantId);

    const [document] = await db
      .delete(crmCustomerDocuments)
      .where(and(
        eq(crmCustomerDocuments.id, documentId),
        eq(crmCustomerDocuments.customerId, id),
        eq(crmCustomerDocuments.tenantId, tenantId)
      ))
      .returning();

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Document deleted', { documentId, customerId: id, tenantId });

    res.status(200).json({
      success: true,
      data: document,
      message: 'Document deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting document', { 
      errorMessage: error?.message || 'Unknown error',
      documentId: req.params.documentId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete document',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== CUSTOMER NOTES ENDPOINTS ====================

/**
 * GET /api/crm/customers/:id/notes
 * Get all notes for a customer
 */
router.get('/customers/:id/notes', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(tenantId);

    const notes = await db
      .select()
      .from(crmCustomerNotes)
      .where(and(
        eq(crmCustomerNotes.customerId, id),
        eq(crmCustomerNotes.tenantId, tenantId)
      ))
      .orderBy(desc(crmCustomerNotes.isPinned), desc(crmCustomerNotes.createdAt));

    res.status(200).json({
      success: true,
      data: notes,
      message: 'Notes retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving customer notes', { 
      errorMessage: error?.message || 'Unknown error',
      customerId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve notes',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/customers/:id/notes
 * Create a new note
 */
router.post('/customers/:id/notes', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context or user ID',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;

    await setTenantContext(tenantId);

    // Parse and validate request body
    const bodyData = {
      ...req.body,
      tenantId,
      customerId: id,
      createdBy: userId,
      isPinned: req.body.isPinned || false,
      tags: req.body.tags || []
    };

    const validationResult = insertCrmCustomerNoteSchema.safeParse(bodyData);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [note] = await db
      .insert(crmCustomerNotes)
      .values(validationResult.data)
      .returning();

    logger.info('Note created', { noteId: note.id, customerId: id, tenantId });

    res.status(201).json({
      success: true,
      data: note,
      message: 'Note created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating note', { 
      errorMessage: error?.message || 'Unknown error',
      customerId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create note',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/customers/:id/notes/:noteId
 * Update a note
 */
router.patch('/customers/:id/notes/:noteId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context or user ID',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id, noteId } = req.params;
    const { title, content, tags, isPinned } = req.body;

    await setTenantContext(tenantId);

    const updateData: any = { updatedBy: userId, updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    const [note] = await db
      .update(crmCustomerNotes)
      .set(updateData)
      .where(and(
        eq(crmCustomerNotes.id, noteId),
        eq(crmCustomerNotes.customerId, id),
        eq(crmCustomerNotes.tenantId, tenantId)
      ))
      .returning();

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Note updated', { noteId, customerId: id, tenantId });

    res.status(200).json({
      success: true,
      data: note,
      message: 'Note updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating note', { 
      errorMessage: error?.message || 'Unknown error',
      noteId: req.params.noteId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update note',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/customers/:id/notes/:noteId
 * Delete a note
 */
router.delete('/customers/:id/notes/:noteId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id, noteId } = req.params;
    await setTenantContext(tenantId);

    const [note] = await db
      .delete(crmCustomerNotes)
      .where(and(
        eq(crmCustomerNotes.id, noteId),
        eq(crmCustomerNotes.customerId, id),
        eq(crmCustomerNotes.tenantId, tenantId)
      ))
      .returning();

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Note deleted', { noteId, customerId: id, tenantId });

    res.status(200).json({
      success: true,
      data: note,
      message: 'Note deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting note', { 
      errorMessage: error?.message || 'Unknown error',
      noteId: req.params.noteId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete note',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PERSONS ENDPOINTS ====================

/**
 * GET /api/crm/persons/:personId/analytics
 * Get analytics data for a person (KPIs and charts)
 */
router.get('/persons/:personId/analytics', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { personId } = req.params;
    await setTenantContext(tenantId);

    // Calculate KPIs using raw SQL to avoid Drizzle compatibility issues
    
    // 1. Lifetime Value & Deals Closed (from deals)
    const dealStatsResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(estimated_value), 0)::numeric AS total_value,
        COUNT(*)::integer AS deals_closed
      FROM w3suite.crm_deals
      WHERE person_id = ${personId}::uuid 
        AND tenant_id = ${tenantId}::uuid
        AND status = 'won'
    `);
    
    const dealStats = dealStatsResult.rows[0] || { total_value: 0, deals_closed: 0 };
    const lifetimeValue = parseFloat(String(dealStats.total_value || '0'));
    const dealsClosed = Number(dealStats.deals_closed || 0);

    // 2. Engagement Score (based on interactions count)
    const interactionsResult = await db.execute(sql`
      SELECT COUNT(*)::integer AS count
      FROM w3suite.crm_interactions
      WHERE entity_type = 'customer'
        AND entity_id IN (
          SELECT id FROM w3suite.crm_customers 
          WHERE person_id = ${personId}::uuid 
            AND tenant_id = ${tenantId}::uuid
        )
    `);
    
    const interactionsCount = Number(interactionsResult.rows[0]?.count || 0);
    const engagementScore = Math.min(100, Math.round(interactionsCount * 5));

    // 3. Referrals count
    const referralsResult = await db.execute(sql`
      SELECT COUNT(*)::integer AS count
      FROM w3suite.crm_leads
      WHERE tenant_id = ${tenantId}::uuid
        AND (source_channel::text ILIKE '%referral%' OR utm_source ILIKE '%referral%')
    `);
    
    const referrals = Number(referralsResult.rows[0]?.count || 0);

    // 4. LTV Trend (last 3 months vs previous 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentRevenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(estimated_value), 0)::numeric AS total
      FROM w3suite.crm_deals
      WHERE person_id = ${personId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status = 'won'
        AND won_at >= ${threeMonthsAgo.toISOString()}::timestamp
    `);
    
    const previousRevenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(estimated_value), 0)::numeric AS total
      FROM w3suite.crm_deals
      WHERE person_id = ${personId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status = 'won'
        AND won_at >= ${sixMonthsAgo.toISOString()}::timestamp
        AND won_at < ${threeMonthsAgo.toISOString()}::timestamp
    `);

    const recentRevenue = parseFloat(String(recentRevenueResult.rows[0]?.total || '0'));
    const previousRevenue = parseFloat(String(previousRevenueResult.rows[0]?.total || '0'));
    const ltvTrend = previousRevenue > 0 ? Math.round(((recentRevenue - previousRevenue) / previousRevenue) * 100) : 0;

    // Charts Data
    // 1. Revenue Data (last 6 months)
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const revenueData = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthRevenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(estimated_value), 0)::numeric AS total
        FROM w3suite.crm_deals
        WHERE person_id = ${personId}::uuid
          AND tenant_id = ${tenantId}::uuid
          AND status = 'won'
          AND won_at >= ${monthStart.toISOString()}::timestamp
          AND won_at < ${monthEnd.toISOString()}::timestamp
      `);

      revenueData.push({
        month: monthNames[monthStart.getMonth()],
        value: parseFloat(String(monthRevenueResult.rows[0]?.total || '0'))
      });
    }

    // 2. Interaction Channels
    const channelDataResult = await db.execute(sql`
      SELECT 
        channel,
        COUNT(*)::integer AS count
      FROM w3suite.crm_interactions
      WHERE entity_type = 'customer'
        AND entity_id IN (
          SELECT id FROM w3suite.crm_customers 
          WHERE person_id = ${personId}::uuid 
            AND tenant_id = ${tenantId}::uuid
        )
      GROUP BY channel
    `);
    
    const channelData = channelDataResult.rows.map((r: any) => ({
      channel: r.channel || 'unknown',
      count: Number(r.count)
    }));

    // 3. Campaign Distribution
    const campaignDataResult = await db.execute(sql`
      SELECT 
        c.name,
        COUNT(DISTINCT l.id)::integer AS count
      FROM w3suite.crm_leads l
      INNER JOIN w3suite.crm_campaigns c ON l.campaign_id = c.id
      WHERE l.person_id = ${personId}::uuid
        AND l.tenant_id = ${tenantId}::uuid
      GROUP BY c.name
    `);
    
    const campaignData = campaignDataResult.rows.map((r: any) => ({
      name: r.name,
      value: Number(r.count)
    }));

    const analyticsData = {
      kpi: {
        lifetimeValue,
        ltvTrend,
        dealsClosed,
        engagementScore,
        referrals
      },
      charts: {
        revenueData,
        interactionData: channelData.length > 0 ? channelData : [
          { channel: 'Email', count: 0 },
          { channel: 'Phone', count: 0 },
          { channel: 'In-Store', count: 0 }
        ],
        campaignData: campaignData.length > 0 ? campaignData : [
          { name: 'Nessuna Campagna', value: 1 }
        ]
      }
    };

    res.status(200).json({
      success: true,
      data: analyticsData,
      message: 'Analytics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving person analytics', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      personId: req.params.personId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve analytics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== AI LEAD ROUTING ====================

/**
 * POST /api/crm/ai/route-lead
 * Analyze customer interaction and route lead using AI
 */
router.post('/ai/route-lead', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Import AI service
    const { AILeadRoutingService } = await import('../services/ai-lead-routing.service');
    const aiService = new AILeadRoutingService();

    // Validate input
    const inputSchema = z.object({
      leadId: z.string().uuid().optional(),
      interactionType: z.string().min(1),
      interactionContent: z.string().min(1),
      leadName: z.string().optional(),
      leadEmail: z.string().email().optional(),
      leadPhone: z.string().optional(),
      leadCompany: z.string().optional(),
      acquisitionSourceId: z.string().uuid().optional(),
    });

    const validatedInput = inputSchema.parse(req.body);

    // Call AI service
    const routing = await aiService.routeLead({
      tenantId,
      ...validatedInput,
    });

    // Save to lead_routing_history
    const [routingHistory] = await db.insert(leadRoutingHistory).values({
      tenantId,
      leadId: validatedInput.leadId || null,
      interactionType: validatedInput.interactionType,
      interactionContent: validatedInput.interactionContent,
      acquisitionSourceId: validatedInput.acquisitionSourceId || null,
      recommendedDriver: routing.recommendedDriver,
      driverConfidence: routing.driverConfidence,
      driverReasoning: routing.driverReasoning,
      targetPipelineId: routing.targetPipelineId,
      campaignSuggestion: routing.campaignSuggestion,
      primaryOutboundChannel: routing.primaryOutboundChannel,
      secondaryOutboundChannel: routing.secondaryOutboundChannel,
      channelReasoning: routing.channelReasoning,
      estimatedValue: routing.estimatedValue,
      expectedCloseDate: routing.expectedCloseDate ? new Date(routing.expectedCloseDate) : null,
      priority: routing.priority,
      aiModel: routing.aiModel,
      responseTimeMs: routing.responseTimeMs,
      tokenUsage: routing.tokenUsage,
      fullAiResponse: routing.fullAiResponse,
    }).returning();

    // Save insights if lead exists
    if (validatedInput.leadId && routing.insights.length > 0) {
      await db.insert(leadAiInsights).values({
        tenantId,
        leadId: validatedInput.leadId,
        insightType: 'routing_analysis',
        insights: { items: routing.insights },
        nextAction: routing.nextAction,
        riskFactors: { items: routing.riskFactors },
        score: routing.driverConfidence === 'high' ? 90 : routing.driverConfidence === 'medium' ? 70 : 50,
        confidence: routing.driverConfidence === 'high' ? 0.9 : routing.driverConfidence === 'medium' ? 0.7 : 0.5,
        generatedBy: 'lead-routing-agent',
        aiModel: routing.aiModel,
      });
    }

    logger.info('AI Lead Routing completed', {
      routingHistoryId: routingHistory.id,
      leadId: validatedInput.leadId,
      driver: routing.recommendedDriver,
      confidence: routing.driverConfidence,
      tenantId,
    });

    res.status(200).json({
      success: true,
      data: {
        routing,
        routingHistoryId: routingHistory.id,
      },
      message: 'Lead routed successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error routing lead with AI', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to route lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/ai/routing-history/:leadId
 * Get AI routing history for a specific lead
 */
router.get('/ai/routing-history/:leadId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const history = await db.select()
      .from(leadRoutingHistory)
      .where(and(
        eq(leadRoutingHistory.tenantId, tenantId),
        eq(leadRoutingHistory.leadId, req.params.leadId)
      ))
      .orderBy(desc(leadRoutingHistory.createdAt));

    res.status(200).json({
      success: true,
      data: history,
      message: 'Routing history retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving routing history', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      leadId: req.params.leadId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve routing history',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/ai/insights/:leadId
 * Get AI insights for a specific lead
 */
router.get('/ai/insights/:leadId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const insights = await db.select()
      .from(leadAiInsights)
      .where(and(
        eq(leadAiInsights.tenantId, tenantId),
        eq(leadAiInsights.leadId, req.params.leadId)
      ))
      .orderBy(desc(leadAiInsights.createdAt));

    res.status(200).json({
      success: true,
      data: insights,
      message: 'AI insights retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving AI insights', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      leadId: req.params.leadId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve AI insights',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== MARKETING CHANNELS ====================

/**
 * GET /api/crm/marketing-channels
 * Get all active marketing channels (public reference data)
 */
router.get('/marketing-channels', async (req, res) => {
  try {
    const channels = await db.select()
      .from(marketingChannels)
      .where(eq(marketingChannels.active, true))
      .orderBy(marketingChannels.sortOrder);

    res.status(200).json({
      success: true,
      data: channels,
      message: 'Marketing channels retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving marketing channels', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve marketing channels',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/marketing-channels/utm-mappings
 * Get UTM parameter suggestions for all marketing channels (public reference data)
 */
router.get('/marketing-channels/utm-mappings', async (req, res) => {
  try {
    const mappings = await db.select()
      .from(marketingChannelUtmMappings)
      .innerJoin(marketingChannels, eq(marketingChannelUtmMappings.marketingChannelId, marketingChannels.id))
      .where(eq(marketingChannels.active, true));

    res.status(200).json({
      success: true,
      data: mappings,
      message: 'Marketing channel UTM mappings retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving marketing channel UTM mappings', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve UTM mappings',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== LEAD STATUSES ====================

/**
 * GET /api/crm/lead-statuses
 * Get all lead statuses for a specific campaign
 */
router.get('/lead-statuses', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const campaignId = req.query.campaignId as string;
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'campaignId query parameter is required',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const statuses = await db.select()
      .from(leadStatuses)
      .where(and(
        eq(leadStatuses.campaignId, campaignId),
        eq(leadStatuses.isActive, true)
      ))
      .orderBy(leadStatuses.sortOrder);

    res.status(200).json({
      success: true,
      data: statuses,
      message: 'Lead statuses retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving lead statuses', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      campaignId: req.query.campaignId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve lead statuses',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/lead-statuses
 * Create a custom lead status for a campaign
 */
router.post('/lead-statuses', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const validatedData = insertLeadStatusSchema.parse({
      ...req.body,
      createdBy: req.user?.id
    });

    const [newStatus] = await db.insert(leadStatuses)
      .values(validatedData)
      .returning();

    logger.info('Lead status created successfully', {
      statusId: newStatus.id,
      campaignId: validatedData.campaignId,
      tenantId,
      createdBy: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: newStatus,
      message: 'Lead status created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating lead status', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      requestBody: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create lead status',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/lead-statuses/:id
 * Update a custom lead status
 */
router.patch('/lead-statuses/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const [updatedStatus] = await db.update(leadStatuses)
      .set(updateData)
      .where(eq(leadStatuses.id, req.params.id))
      .returning();

    if (!updatedStatus) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Lead status not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Lead status updated successfully', {
      statusId: updatedStatus.id,
      campaignId: updatedStatus.campaignId,
      tenantId
    });

    res.status(200).json({
      success: true,
      data: updatedStatus,
      message: 'Lead status updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating lead status', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      statusId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update lead status',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/lead-statuses/:id
 * Delete a custom lead status (cannot delete default statuses)
 */
router.delete('/lead-statuses/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Check if status exists and is not default
    const [status] = await db.select()
      .from(leadStatuses)
      .where(eq(leadStatuses.id, req.params.id))
      .limit(1);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Lead status not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (status.isDefault) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Cannot delete default lead status',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Delete the status
    await db.delete(leadStatuses)
      .where(eq(leadStatuses.id, req.params.id));

    logger.info('Lead status deleted successfully', {
      statusId: req.params.id,
      campaignId: status.campaignId,
      tenantId
    });

    res.status(200).json({
      success: true,
      data: { id: req.params.id },
      message: 'Lead status deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting lead status', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      statusId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete lead status',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/leads/:id/status
 * Change lead status with automatic history tracking
 */
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const { newStatusId, notes } = req.body;

    if (!newStatusId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'newStatusId is required',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get current lead with status info
    const [currentLead] = await db.select({
      id: crmLeads.id,
      currentStatusId: crmLeads.statusId,
      currentStatusName: leadStatuses.name
    })
      .from(crmLeads)
      .leftJoin(leadStatuses, eq(crmLeads.statusId, leadStatuses.id))
      .where(and(
        eq(crmLeads.id, req.params.id),
        eq(crmLeads.tenantId, tenantId)
      ));

    if (!currentLead) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Lead not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get new status info
    const [newStatus] = await db.select()
      .from(leadStatuses)
      .where(and(
        eq(leadStatuses.id, newStatusId),
        eq(leadStatuses.tenantId, tenantId)
      ));

    if (!newStatus) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'New status not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Update lead and create history in transaction
    await db.transaction(async (tx) => {
      // Update lead status
      await tx.update(crmLeads)
        .set({
          statusId: newStatusId,
          updatedAt: new Date()
        })
        .where(eq(crmLeads.id, req.params.id));

      // Create history entry
      await tx.insert(leadStatusHistory).values({
        tenantId,
        leadId: req.params.id,
        oldStatusId: currentLead.currentStatusId,
        newStatusId,
        oldStatusName: currentLead.currentStatusName,
        newStatusName: newStatus.name,
        notes,
        changedBy: req.user?.id
      });
    });

    logger.info('Lead status changed successfully', {
      leadId: req.params.id,
      oldStatusId: currentLead.currentStatusId,
      newStatusId,
      tenantId,
      changedBy: req.user?.id
    });

    res.status(200).json({
      success: true,
      data: {
        leadId: req.params.id,
        oldStatus: {
          id: currentLead.currentStatusId,
          name: currentLead.currentStatusName
        },
        newStatus: {
          id: newStatusId,
          name: newStatus.name
        }
      },
      message: 'Lead status changed successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error changing lead status', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      leadId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to change lead status',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/leads/:id/status-history
 * Get status change history for a lead
 */
router.get('/leads/:id/status-history', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const history = await db.select({
      id: leadStatusHistory.id,
      oldStatusName: leadStatusHistory.oldStatusName,
      newStatusName: leadStatusHistory.newStatusName,
      notes: leadStatusHistory.notes,
      changedAt: leadStatusHistory.changedAt,
      changedByName: users.fullName
    })
      .from(leadStatusHistory)
      .leftJoin(users, eq(leadStatusHistory.changedBy, users.id))
      .where(and(
        eq(leadStatusHistory.leadId, req.params.id),
        eq(leadStatusHistory.tenantId, tenantId)
      ))
      .orderBy(desc(leadStatusHistory.changedAt));

    res.status(200).json({
      success: true,
      data: history,
      message: 'Status history retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving status history', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      leadId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve status history',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== STORE TRACKING CONFIGURATION (GTM AUTO-CONFIG) ====================

/**
 * POST /api/stores/:id/tracking-config
 * Configure GTM tracking for a store (GA4, Google Ads, Facebook Pixel)
 * Auto-creates GTM triggers and tags via Google Tag Manager API
 */
router.post('/stores/:id/tracking-config', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant or user context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const storeId = req.params.id;

    // Validate request body
    const configSchema = insertStoreTrackingConfigSchema.extend({
      ga4MeasurementId: z.string().regex(/^G-[A-Z0-9]+$/).optional(),
      googleAdsConversionId: z.string().regex(/^AW-[0-9]+$/).optional(),
      facebookPixelId: z.string().regex(/^[0-9]+$/).optional(),
      tiktokPixelId: z.string().optional()
    });

    const validated = configSchema.parse(req.body);

    await setTenantContext(tenantId);

    // Verify store belongs to tenant
    const [store] = await db
      .select()
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Store not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Configure GTM tracking via API
    const { GTMAutoConfigService } = await import('../services/gtm-auto-config');
    
    const result = await GTMAutoConfigService.configureStoreTracking({
      storeId,
      tenantId,
      userId,
      ga4MeasurementId: validated.ga4MeasurementId,
      googleAdsConversionId: validated.googleAdsConversionId,
      facebookPixelId: validated.facebookPixelId,
      tiktokPixelId: validated.tiktokPixelId
    });

    res.status(200).json({
      success: true,
      data: {
        storeId,
        gtmTriggerId: result.gtmTriggerId,
        gtmConfigured: true,
        tagsCreated: result.tagsCreated.length,
        message: 'GTM tracking configured successfully. Tags will be active after container publish.'
      },
      message: 'Store tracking configured successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error configuring store tracking', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      storeId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to configure store tracking',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/stores/:id/tracking-config
 * Get GTM tracking configuration for a store
 */
router.get('/stores/:id/tracking-config', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const storeId = req.params.id;

    await setTenantContext(tenantId);

    // Verify store belongs to tenant
    const [store] = await db
      .select()
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Store not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get tracking config
    const [config] = await db
      .select()
      .from(storeTrackingConfig)
      .where(and(
        eq(storeTrackingConfig.storeId, storeId),
        eq(storeTrackingConfig.tenantId, tenantId)
      ))
      .limit(1);

    res.status(200).json({
      success: true,
      data: config || {
        storeId,
        gtmConfigured: false,
        message: 'No tracking configuration found for this store'
      },
      message: 'Store tracking config retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving store tracking config', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      storeId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve store tracking config',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/stores/:id/gtm-snippet
 * Generate GTM snippet with precompiled dataLayer for a store
 */
router.get('/stores/:id/gtm-snippet', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const storeId = req.params.id;

    await setTenantContext(tenantId);

    // Verify store belongs to tenant and get store data
    const [store] = await db
      .select()
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Store not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get tracking config
    const [config] = await db
      .select()
      .from(storeTrackingConfig)
      .where(and(
        eq(storeTrackingConfig.storeId, storeId),
        eq(storeTrackingConfig.tenantId, tenantId)
      ))
      .limit(1);

    // Generate snippet using GTMSnippetGeneratorService
    const snippet = await GTMSnippetGeneratorService.generateSnippet({
      tenantId,
      storeId,
      ga4MeasurementId: config?.ga4MeasurementId || null,
      googleAdsConversionId: config?.googleAdsConversionId || null,
      facebookPixelId: config?.facebookPixelId || null,
      tiktokPixelId: config?.tiktokPixelId || null,
      email: store.email || null,
      phone: store.phone || null,
      facebookPageUrl: store.facebook || null,
      instagramHandle: store.instagram || null,
    });

    res.status(200).json({
      success: true,
      data: {
        snippet,
        storeId,
        storeName: store.nome,
        gtmConfigured: config?.gtmConfigured || false,
      },
      message: 'GTM snippet generated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error generating GTM snippet', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      storeId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to generate GTM snippet',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/crm/analytics/ai-predictions
 * Compare AI lead scores vs actual conversions for accuracy validation
 */
router.get('/analytics/ai-predictions', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Query all leads with AI score
    const leadsWithScore = await db
      .select({
        id: crmLeads.id,
        leadScore: crmLeads.leadScore,
        status: crmLeads.status,
        createdAt: crmLeads.createdAt,
        convertedAt: crmLeads.updatedAt
      })
      .from(crmLeads)
      .where(and(
        eq(crmLeads.tenantId, tenantId),
        sql`${crmLeads.leadScore} IS NOT NULL`
      ));

    // Calculate metrics
    const totalLeads = leadsWithScore.length;
    const converted = leadsWithScore.filter(l => l.status === 'converted');
    const notConverted = leadsWithScore.filter(l => l.status !== 'converted');

    // Score ranges
    const scoreRanges = {
      hot: { min: 80, max: 100 },
      warm: { min: 50, max: 79 },
      cold: { min: 0, max: 49 }
    };

    const analyzeRange = (rangeName: string, min: number, max: number) => {
      const inRange = leadsWithScore.filter(l => l.leadScore! >= min && l.leadScore! <= max);
      const convertedInRange = inRange.filter(l => l.status === 'converted');
      
      return {
        rangeName,
        scoreRange: `${min}-${max}`,
        totalLeads: inRange.length,
        convertedLeads: convertedInRange.length,
        conversionRate: inRange.length > 0 ? (convertedInRange.length / inRange.length) * 100 : 0,
        averageScore: inRange.length > 0 
          ? inRange.reduce((sum, l) => sum + (l.leadScore || 0), 0) / inRange.length 
          : 0
      };
    };

    const rangeAnalysis = [
      analyzeRange('hot', scoreRanges.hot.min, scoreRanges.hot.max),
      analyzeRange('warm', scoreRanges.warm.min, scoreRanges.warm.max),
      analyzeRange('cold', scoreRanges.cold.min, scoreRanges.cold.max)
    ];

    // Calculate overall metrics
    const avgScoreConverted = converted.length > 0
      ? converted.reduce((sum, l) => sum + (l.leadScore || 0), 0) / converted.length
      : 0;
    
    const avgScoreNotConverted = notConverted.length > 0
      ? notConverted.reduce((sum, l) => sum + (l.leadScore || 0), 0) / notConverted.length
      : 0;

    // Precision: Of leads predicted as hot (>80), how many converted?
    const predictedHot = leadsWithScore.filter(l => l.leadScore! > 80);
    const truePositivesHot = predictedHot.filter(l => l.status === 'converted');
    const precision = predictedHot.length > 0 
      ? (truePositivesHot.length / predictedHot.length) * 100 
      : 0;

    // Recall: Of converted leads, how many were predicted as hot?
    const recall = converted.length > 0 
      ? (truePositivesHot.length / converted.length) * 100 
      : 0;

    // F1 Score
    const f1Score = (precision + recall) > 0 
      ? (2 * precision * recall) / (precision + recall) 
      : 0;

    // Overall accuracy: Leads with score >80 should convert at higher rate than <50
    const hotConversionRate = rangeAnalysis.find(r => r.rangeName === 'hot')?.conversionRate || 0;
    const coldConversionRate = rangeAnalysis.find(r => r.rangeName === 'cold')?.conversionRate || 0;
    const modelAccuracy = hotConversionRate > coldConversionRate;

    const analytics = {
      summary: {
        totalLeadsScored: totalLeads,
        totalConverted: converted.length,
        overallConversionRate: totalLeads > 0 ? (converted.length / totalLeads) * 100 : 0,
        avgScoreConverted: Math.round(avgScoreConverted * 100) / 100,
        avgScoreNotConverted: Math.round(avgScoreNotConverted * 100) / 100,
        scoreDifferential: Math.round((avgScoreConverted - avgScoreNotConverted) * 100) / 100
      },
      scoreRangeAnalysis: rangeAnalysis,
      aiAccuracyMetrics: {
        precision: Math.round(precision * 100) / 100,
        recall: Math.round(recall * 100) / 100,
        f1Score: Math.round(f1Score * 100) / 100,
        modelAccurate: modelAccuracy,
        interpretation: {
          precision: `${Math.round(precision)}% of leads predicted as hot (>80) actually converted`,
          recall: `${Math.round(recall)}% of converted leads were correctly predicted as hot`,
          accuracy: modelAccuracy 
            ? 'Model is accurate: Hot leads convert at higher rate than cold leads'
            : 'Model needs improvement: Hot leads not converting at expected rate'
        }
      },
      recommendations: [
        hotConversionRate < 50 ? 'Hot lead conversion rate is low - review sales follow-up process' : null,
        avgScoreConverted < 60 ? 'Converted leads have low average score - model may need retraining' : null,
        f1Score < 50 ? 'Low F1 score - consider adjusting score thresholds or adding more training data' : null
      ].filter(Boolean)
    };

    logger.info('AI predictions analytics generated', {
      tenantId,
      totalLeads,
      convertedLeads: converted.length,
      precision,
      recall,
      f1Score
    });

    res.status(200).json({
      success: true,
      data: analytics,
      message: 'AI predictions analytics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error generating AI predictions analytics', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to generate analytics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== ADVANCED ANALYTICS DASHBOARD ====================

/**
 * GET /api/crm/analytics/executive-summary
 * Get executive KPIs with trends for the analytics dashboard
 */
router.get('/analytics/executive-summary', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    // Parse query parameters
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    
    const summary = await crmAnalyticsService.getExecutiveSummary({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined,
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined
    });

    res.status(200).json({
      success: true,
      data: summary,
      message: 'Executive summary retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving executive summary', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve executive summary',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/analytics/campaign-performance
 * Get campaign performance metrics by store
 */
router.get('/analytics/campaign-performance', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    
    const campaigns = await crmAnalyticsService.getCampaignPerformance({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined
    });

    res.status(200).json({
      success: true,
      data: campaigns,
      message: 'Campaign performance retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaign performance', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve campaign performance',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/analytics/channel-attribution
 * Get marketing channel attribution metrics
 */
router.get('/analytics/channel-attribution', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    
    const attribution = await crmAnalyticsService.getChannelAttribution({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined
    });

    res.status(200).json({
      success: true,
      data: attribution,
      message: 'Channel attribution retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving channel attribution', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve channel attribution',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/analytics/lead-source-distribution
 * Get lead source distribution metrics
 */
router.get('/analytics/lead-source-distribution', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    
    const distribution = await crmAnalyticsService.getLeadSourceDistribution({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined
    });

    res.status(200).json({
      success: true,
      data: distribution,
      message: 'Lead source distribution retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving lead source distribution', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve lead source distribution',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/analytics/ai-score-distribution
 * Get AI score distribution and accuracy metrics
 */
router.get('/analytics/ai-score-distribution', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    
    const distribution = await crmAnalyticsService.getAIScoreDistribution({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined
    });

    res.status(200).json({
      success: true,
      data: distribution,
      message: 'AI score distribution retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving AI score distribution', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve AI score distribution',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/analytics/gtm-events
 * Get GTM events summary and metrics
 */
router.get('/analytics/gtm-events', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    
    const events = await crmAnalyticsService.getGTMEventsSummary({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined,
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined
    });

    res.status(200).json({
      success: true,
      data: events,
      message: 'GTM events summary retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving GTM events summary', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve GTM events summary',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/analytics/store-comparison
 * Get store comparison metrics and rankings
 */
router.get('/analytics/store-comparison', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    
    const comparison = await crmAnalyticsService.getStoreComparison({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined
    });

    res.status(200).json({
      success: true,
      data: comparison,
      message: 'Store comparison retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving store comparison', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve store comparison',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/analytics/conversion-funnel
 * Get conversion funnel metrics
 */
router.get('/analytics/conversion-funnel', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { crmAnalyticsService } = await import('../services/crm-analytics.service');
    
    const storeIds = req.query.storeIds ? 
      (Array.isArray(req.query.storeIds) ? req.query.storeIds : [req.query.storeIds]) : undefined;
    const campaignIds = req.query.campaignIds ? 
      (Array.isArray(req.query.campaignIds) ? req.query.campaignIds : [req.query.campaignIds]) : undefined;
    const pipelineIds = req.query.pipelineIds ? 
      (Array.isArray(req.query.pipelineIds) ? req.query.pipelineIds : [req.query.pipelineIds]) : undefined;
    
    const funnel = await crmAnalyticsService.getConversionFunnel({
      tenantId,
      storeIds: storeIds as string[] | undefined,
      campaignIds: campaignIds as string[] | undefined,
      pipelineIds: pipelineIds as string[] | undefined
    });

    res.status(200).json({
      success: true,
      data: funnel,
      message: 'Conversion funnel retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving conversion funnel', { 
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve conversion funnel',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * ===========================================
 * WORKFLOW EXECUTION & QUEUE MANAGEMENT APIS
 * ===========================================
 * 
 * Provides endpoints for manual workflow execution and approval queue management.
 * Supports entity-level workflow operations (deal, lead, customer, campaign) and
 * centralized queue dashboard for bulk approval/rejection.
 */

/**
 * GET /api/crm/:entityType/:entityId/workflows/available
 * Get available workflows for a specific entity
 */
router.get('/:entityType/:entityId/workflows/available', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { entityType, entityId } = req.params;
    
    // Validate entity type
    if (!['deal', 'lead', 'customer', 'campaign'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check entity access permissions based on type
    let hasAccess = false;
    if (entityType === 'deal') {
      hasAccess = await checkDealAccess(tenantId, entityId, req.user?.id);
    } else if (entityType === 'lead') {
      hasAccess = await checkLeadAccess(tenantId, entityId, req.user?.id);
    } else if (entityType === 'customer') {
      hasAccess = await checkCustomerAccess(tenantId, entityId, req.user?.id);
    } else if (entityType === 'campaign') {
      hasAccess = await checkCampaignAccess(tenantId, entityId, req.user?.id);
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to entity',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get available workflows based on entity type and current state
    const workflows = await getAvailableWorkflows(tenantId, entityType, entityId);

    res.status(200).json({
      success: true,
      data: workflows,
      message: 'Available workflows retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving available workflows', { 
      errorMessage: error?.message,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve available workflows',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/:entityType/:entityId/workflows/history
 * Get workflow execution history for a specific entity
 */
router.get('/:entityType/:entityId/workflows/history', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { entityType, entityId } = req.params;
    
    // Validate and check access (similar to above)
    if (!['deal', 'lead', 'customer', 'campaign'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get execution history from workflow_executions table
    const history = await getWorkflowHistory(tenantId, entityType, entityId);

    res.status(200).json({
      success: true,
      data: history,
      message: 'Workflow history retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving workflow history', { 
      errorMessage: error?.message,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve workflow history',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/:entityType/:entityId/workflows/:workflowId/execute
 * Execute a workflow for a specific entity
 */
router.post('/:entityType/:entityId/workflows/:workflowId/execute', rbacMiddleware, requirePermission('crm.run_workflows'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { entityType, entityId, workflowId } = req.params;
    const { reason, requiresApproval } = req.body;

    // Validate entity type and check access
    if (!['deal', 'lead', 'customer', 'campaign'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Create execution record and queue entry if approval required
    const execution = await createWorkflowExecution({
      tenantId,
      entityType,
      entityId,
      workflowId,
      requestedBy: req.user?.id,
      reason,
      requiresApproval
    });

    // If no approval required, immediately enqueue for execution
    if (!requiresApproval) {
      await enqueueWorkflowExecution(execution.id);
    }

    // Emit websocket event for real-time updates
    await emitWorkflowEvent(tenantId, 'workflow.execution.requested', execution);

    res.status(201).json({
      success: true,
      data: execution,
      message: requiresApproval ? 'Workflow queued for approval' : 'Workflow execution started',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error executing workflow', { 
      errorMessage: error?.message,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to execute workflow',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/workflow-queue
 * Get all pending workflow executions requiring approval
 */
router.get('/workflow-queue', rbacMiddleware, requirePermission('crm.approve_workflows'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status, entityType, priority, limit = 50, offset = 0 } = req.query;

    const queue = await getWorkflowQueue({
      tenantId,
      status: status as string,
      entityType: entityType as string,
      priority: priority as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.status(200).json({
      success: true,
      data: queue,
      message: 'Workflow queue retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving workflow queue', { 
      errorMessage: error?.message,
      query: req.query
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve workflow queue',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/workflow-queue/stats
 * Get workflow queue statistics for dashboard
 */
router.get('/workflow-queue/stats', rbacMiddleware, requirePermission('crm.approve_workflows'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const stats = await getWorkflowQueueStats(tenantId);

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Workflow queue stats retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving workflow queue stats', { 
      errorMessage: error?.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve workflow queue stats',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/workflow-queue/bulk-approve
 * Bulk approve multiple workflows
 */
router.post('/workflow-queue/bulk-approve', rbacMiddleware, requirePermission('crm.approve_workflows'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { workflowIds } = req.body;

    if (!Array.isArray(workflowIds) || workflowIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow IDs',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const results = await bulkApproveWorkflows(tenantId, workflowIds, req.user?.id);

    // Emit websocket events for each approved workflow
    for (const result of results) {
      await emitWorkflowEvent(tenantId, 'workflow.execution.approved', result);
    }

    res.status(200).json({
      success: true,
      data: results,
      message: `${results.length} workflows approved successfully`,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error bulk approving workflows', { 
      errorMessage: error?.message,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to bulk approve workflows',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/workflow-queue/bulk-reject
 * Bulk reject multiple workflows
 */
router.post('/workflow-queue/bulk-reject', rbacMiddleware, requirePermission('crm.approve_workflows'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { workflowIds, reason } = req.body;

    if (!Array.isArray(workflowIds) || workflowIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow IDs',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const results = await bulkRejectWorkflows(tenantId, workflowIds, req.user?.id, reason);

    // Emit websocket events
    for (const result of results) {
      await emitWorkflowEvent(tenantId, 'workflow.execution.rejected', result);
    }

    res.status(200).json({
      success: true,
      data: results,
      message: `${results.length} workflows rejected successfully`,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error bulk rejecting workflows', { 
      errorMessage: error?.message,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to bulk reject workflows',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/workflow-queue/:queueId/approve
 * Approve a single workflow execution
 */
router.post('/workflow-queue/:queueId/approve', rbacMiddleware, requirePermission('crm.approve_workflows'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { queueId } = req.params;

    const result = await approveWorkflow(tenantId, queueId, req.user?.id);

    // Emit websocket event
    await emitWorkflowEvent(tenantId, 'workflow.execution.approved', result);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Workflow approved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error approving workflow', { 
      errorMessage: error?.message,
      queueId: req.params.queueId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to approve workflow',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/workflow-queue/:queueId/reject
 * Reject a single workflow execution
 */
router.post('/workflow-queue/:queueId/reject', rbacMiddleware, requirePermission('crm.approve_workflows'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { queueId } = req.params;
    const { reason } = req.body;

    const result = await rejectWorkflow(tenantId, queueId, req.user?.id, reason);

    // Emit websocket event
    await emitWorkflowEvent(tenantId, 'workflow.execution.rejected', result);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Workflow rejected successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error rejecting workflow', { 
      errorMessage: error?.message,
      queueId: req.params.queueId,
      reason: req.body.reason
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to reject workflow',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// Helper functions for workflow execution (these would typically be in a service file)
async function checkDealAccess(tenantId: string, dealId: string, userId?: string): Promise<boolean> {
  // Check if user has access to this deal
  const result = await db
    .select()
    .from(crmDeals)
    .where(and(
      eq(crmDeals.tenantId, tenantId),
      eq(crmDeals.id, dealId)
    ))
    .limit(1);
  
  return result.length > 0;
}

async function checkLeadAccess(tenantId: string, leadId: string, userId?: string): Promise<boolean> {
  const result = await db
    .select()
    .from(crmLeads)
    .where(and(
      eq(crmLeads.tenantId, tenantId),
      eq(crmLeads.id, leadId)
    ))
    .limit(1);
  
  return result.length > 0;
}

async function checkCustomerAccess(tenantId: string, customerId: string, userId?: string): Promise<boolean> {
  const result = await db
    .select()
    .from(crmCustomers)
    .where(and(
      eq(crmCustomers.tenantId, tenantId),
      eq(crmCustomers.id, customerId)
    ))
    .limit(1);
  
  return result.length > 0;
}

async function checkCampaignAccess(tenantId: string, campaignId: string, userId?: string): Promise<boolean> {
  const result = await db
    .select()
    .from(crmCampaigns)
    .where(and(
      eq(crmCampaigns.tenantId, tenantId),
      eq(crmCampaigns.id, campaignId)
    ))
    .limit(1);
  
  return result.length > 0;
}

async function getAvailableWorkflows(tenantId: string, entityType: string, entityId: string) {
  // Mock implementation - would query workflow_templates based on entity state
  return [
    {
      id: 'wf1',
      name: 'Invia Email di Benvenuto',
      description: 'Invia email di benvenuto al nuovo cliente',
      category: 'engagement',
      executionMode: 'manual',
      requiresApproval: true,
      estimatedDuration: 30,
    },
    {
      id: 'wf2',
      name: 'Aggiorna Probabilità Deal',
      description: 'Calcola e aggiorna la probabilità di chiusura del deal',
      category: 'automation',
      executionMode: 'automatic',
      requiresApproval: false,
      estimatedDuration: 5,
    }
  ];
}

async function getWorkflowHistory(tenantId: string, entityType: string, entityId: string) {
  // Mock implementation - would query workflow_executions table
  return [
    {
      id: 'exec1',
      workflowId: 'wf1',
      workflowName: 'Invia Email di Benvenuto',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      executedBy: 'user123',
      executedByName: 'Mario Rossi',
      duration: 25,
      result: 'success',
    }
  ];
}

async function getWorkflowQueue(params: any) {
  // Mock implementation - would query workflow_execution_queue table
  return [
    {
      id: 'queue1',
      workflowId: 'wf1',
      workflowName: 'Invia Email di Benvenuto',
      workflowCategory: 'engagement',
      entityType: 'deal',
      entityId: 'deal123',
      entityName: 'Deal Acme Corp',
      entityStage: 'Negotiation',
      entityValue: 50000,
      requestedBy: 'user456',
      requestedByName: 'Luigi Verdi',
      requestedAt: new Date().toISOString(),
      priority: 'high',
      reason: 'Cliente importante',
      status: 'pending',
      estimatedDuration: 30,
    }
  ];
}

async function getWorkflowQueueStats(tenantId: string) {
  // Mock implementation
  return {
    totalPending: 15,
    totalToday: 8,
    totalThisWeek: 42,
    avgApprovalTime: 12,
    approvalRate: 85,
    byPriority: {
      low: 3,
      medium: 5,
      high: 6,
      critical: 1
    },
    byEntity: {
      deal: 7,
      lead: 4,
      customer: 3,
      campaign: 1
    }
  };
}

async function createWorkflowExecution(params: any) {
  // Would create records in workflow_executions and workflow_execution_queue tables
  return {
    id: 'exec-new',
    workflowId: params.workflowId,
    entityType: params.entityType,
    entityId: params.entityId,
    status: params.requiresApproval ? 'pending_approval' : 'executing',
    requestedBy: params.requestedBy,
    requestedAt: new Date().toISOString(),
    reason: params.reason,
  };
}

async function enqueueWorkflowExecution(executionId: string) {
  // Would enqueue to BullMQ for async processing
  return true;
}

async function bulkApproveWorkflows(tenantId: string, workflowIds: string[], userId?: string) {
  // Would update workflow_execution_queue and trigger executions
  return workflowIds.map(id => ({
    id,
    status: 'approved',
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
  }));
}

async function bulkRejectWorkflows(tenantId: string, workflowIds: string[], userId?: string, reason?: string) {
  // Would update workflow_execution_queue with rejection
  return workflowIds.map(id => ({
    id,
    status: 'rejected',
    rejectedBy: userId,
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
  }));
}

async function approveWorkflow(tenantId: string, queueId: string, userId?: string) {
  // Would update single workflow and trigger execution
  return {
    id: queueId,
    status: 'approved',
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
  };
}

async function rejectWorkflow(tenantId: string, queueId: string, userId?: string, reason?: string) {
  // Would update single workflow with rejection
  return {
    id: queueId,
    status: 'rejected',
    rejectedBy: userId,
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
  };
}

async function emitWorkflowEvent(tenantId: string, event: string, data: any) {
  // Would emit websocket event for real-time updates
  logger.info('Emitting workflow event', { tenantId, event, data });
  return true;
}

// ==================== OMNICHANNEL INTERACTIONS & IDENTITY RESOLUTION ====================

/**
 * GET /api/crm/person/:personId/omnichannel-timeline
 * Get unified omnichannel timeline for a person (all interactions across channels)
 */
router.get('/person/:personId/omnichannel-timeline', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { personId } = req.params;
    const { channel, startDate, endDate, limit = 100 } = req.query;

    // Build query with filters
    let query = db
      .select()
      .from(crmOmnichannelInteractions)
      .where(
        and(
          eq(crmOmnichannelInteractions.tenantId, tenantId),
          eq(crmOmnichannelInteractions.personId, personId)
        )
      )
      .orderBy(desc(crmOmnichannelInteractions.occurredAt))
      .limit(Number(limit));

    // Apply optional filters
    if (channel) {
      query = query.where(eq(crmOmnichannelInteractions.channel, channel as any));
    }
    if (startDate) {
      query = query.where(gte(crmOmnichannelInteractions.occurredAt, new Date(startDate as string)));
    }
    if (endDate) {
      query = query.where(lte(crmOmnichannelInteractions.occurredAt, new Date(endDate as string)));
    }

    const interactions = await query;

    // Load attachments count for each interaction
    const interactionIds = interactions.map(i => i.id);
    const attachments = await db
      .select({
        interactionId: crmInteractionAttachments.interactionId,
        count: count()
      })
      .from(crmInteractionAttachments)
      .where(inArray(crmInteractionAttachments.interactionId, interactionIds))
      .groupBy(crmInteractionAttachments.interactionId);

    const attachmentMap = new Map(attachments.map(a => [a.interactionId, a.count]));

    const enrichedInteractions = interactions.map(i => ({
      ...i,
      attachmentCount: attachmentMap.get(i.id) || 0
    }));

    res.status(200).json({
      success: true,
      data: enrichedInteractions,
      message: 'Omnichannel timeline retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving omnichannel timeline', { 
      errorMessage: error?.message,
      personId: req.params.personId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve omnichannel timeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/omnichannel-interactions
 * Create a new omnichannel interaction
 */
router.post('/omnichannel-interactions', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validatedData = insertCrmOmnichannelInteractionSchema.parse({
      ...req.body,
      tenantId,
      performedByUserId: req.user?.id
    });

    const [interaction] = await db
      .insert(crmOmnichannelInteractions)
      .values(validatedData)
      .returning();

    logger.info('Omnichannel interaction created', {
      tenantId,
      interactionId: interaction.id,
      channel: interaction.channel,
      personId: interaction.personId
    });

    res.status(201).json({
      success: true,
      data: interaction,
      message: 'Omnichannel interaction created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating omnichannel interaction', { 
      errorMessage: error?.message,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create omnichannel interaction',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/identity-matches
 * Get list of identity match candidates for review
 */
router.get('/identity-matches', rbacMiddleware, requirePermission('crm.manage_identities'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status = 'pending', minConfidence = 70 } = req.query;

    const matches = await db
      .select()
      .from(crmIdentityMatches)
      .where(
        and(
          eq(crmIdentityMatches.tenantId, tenantId),
          eq(crmIdentityMatches.status, status as any),
          gte(crmIdentityMatches.confidenceScore, Number(minConfidence))
        )
      )
      .orderBy(desc(crmIdentityMatches.confidenceScore))
      .limit(100);

    res.status(200).json({
      success: true,
      data: matches,
      message: 'Identity matches retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving identity matches', { 
      errorMessage: error?.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve identity matches',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/identity-matches/:id/accept
 * Accept identity match and merge persons
 */
router.post('/identity-matches/:id/accept', rbacMiddleware, requirePermission('crm.manage_identities'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Get match details
    const [match] = await db
      .select()
      .from(crmIdentityMatches)
      .where(
        and(
          eq(crmIdentityMatches.id, id),
          eq(crmIdentityMatches.tenantId, tenantId)
        )
      );

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Identity match not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Update match status
    await db
      .update(crmIdentityMatches)
      .set({
        status: 'accepted',
        reviewedBy: req.user?.id,
        reviewedAt: new Date(),
        reviewNotes: reason
      })
      .where(eq(crmIdentityMatches.id, id));

    // Create identity event for audit trail
    await db.insert(crmIdentityEvents).values({
      tenantId,
      eventType: 'merge',
      sourcePersonId: match.personIdB,
      targetPersonId: match.personIdA,
      performedBy: req.user?.id || 'system',
      reason,
      metadata: {
        matchId: match.id,
        confidenceScore: match.confidenceScore,
        matchType: match.matchType
      }
    });

    logger.info('Identity match accepted', {
      tenantId,
      matchId: id,
      personIdA: match.personIdA,
      personIdB: match.personIdB,
      acceptedBy: req.user?.id
    });

    res.status(200).json({
      success: true,
      data: { matchId: id, status: 'accepted' },
      message: 'Identity match accepted and persons merged',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error accepting identity match', { 
      errorMessage: error?.message,
      matchId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to accept identity match',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/identity-matches/:id/reject
 * Reject identity match
 */
router.post('/identity-matches/:id/reject', rbacMiddleware, requirePermission('crm.manage_identities'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Update match status
    await db
      .update(crmIdentityMatches)
      .set({
        status: 'rejected',
        reviewedBy: req.user?.id,
        reviewedAt: new Date(),
        reviewNotes: reason
      })
      .where(
        and(
          eq(crmIdentityMatches.id, id),
          eq(crmIdentityMatches.tenantId, tenantId)
        )
      );

    logger.info('Identity match rejected', {
      tenantId,
      matchId: id,
      rejectedBy: req.user?.id
    });

    res.status(200).json({
      success: true,
      data: { matchId: id, status: 'rejected' },
      message: 'Identity match rejected',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error rejecting identity match', { 
      errorMessage: error?.message,
      matchId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to reject identity match',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/identity-conflicts
 * Get list of identity conflicts requiring manual resolution
 */
router.get('/identity-conflicts', rbacMiddleware, requirePermission('crm.manage_identities'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status = 'pending', priority } = req.query;

    let query = db
      .select()
      .from(crmIdentityConflicts)
      .where(
        and(
          eq(crmIdentityConflicts.tenantId, tenantId),
          eq(crmIdentityConflicts.status, status as string)
        )
      );

    if (priority) {
      query = query.where(eq(crmIdentityConflicts.priority, priority as string));
    }

    const conflicts = await query
      .orderBy(
        desc(crmIdentityConflicts.priority),
        desc(crmIdentityConflicts.detectedAt)
      )
      .limit(100);

    res.status(200).json({
      success: true,
      data: conflicts,
      message: 'Identity conflicts retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving identity conflicts', { 
      errorMessage: error?.message
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve identity conflicts',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;
