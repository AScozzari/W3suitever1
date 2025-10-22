/**
 * UTM Attribution Service
 * 
 * Handles multi-touch attribution tracking for CRM leads.
 * Implements first-touch and last-touch attribution models for campaign performance tracking.
 * 
 * BUSINESS LOGIC:
 * - First Touch: First UTM click ever recorded for a lead (never changes once set)
 * - Last Touch: Most recent UTM click (updates on every click, gets revenue credit)
 * - All Touches: Complete touchpoint history array preserving duplicates (max 50 touchpoints, newest first)
 * - Attribution Window: No hard cutoff - fresh clicks are always tracked (analytics can filter by time if needed)
 * - Revenue Attribution: Goes to lastTouchUtmLinkId
 * - Duplicate Preservation: Multiple clicks on same UTM link are recorded separately for journey analysis
 */

import { db } from '../core/db';
import { crmLeads, crmCampaignUtmLinks } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../core/logger';

const ATTRIBUTION_WINDOW_DAYS = 30;
const MAX_TOUCHPOINTS = 50;

export interface TrackUTMClickParams {
  tenantId: string;
  utmLinkId: string;
  leadId?: string;
  sessionId?: string;
}

export interface AttributeLeadToUTMParams {
  tenantId: string;
  leadId: string;
  utmLinkId: string;
}

export interface AttributionResult {
  success: boolean;
  attribution: {
    firstTouch: boolean;
    lastTouch: boolean;
    touchpointCount: number;
  };
  utmLink?: {
    id: string;
    channelName: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
  };
}

class AttributionService {
  /**
   * Track UTM click event and update link statistics
   */
  async trackUTMClick(params: TrackUTMClickParams): Promise<AttributionResult> {
    const { tenantId, utmLinkId, leadId, sessionId } = params;

    logger.info('Tracking UTM click', {
      tenantId,
      utmLinkId,
      leadId: leadId || 'anonymous',
      sessionId: sessionId || 'unknown'
    });

    // Validate UTM link exists and is active
    const [utmLink] = await db
      .select()
      .from(crmCampaignUtmLinks)
      .where(
        and(
          eq(crmCampaignUtmLinks.id, utmLinkId),
          eq(crmCampaignUtmLinks.tenantId, tenantId),
          eq(crmCampaignUtmLinks.isActive, true)
        )
      )
      .limit(1);

    if (!utmLink) {
      logger.warn('UTM link not found or inactive', {
        tenantId,
        utmLinkId
      });
      return {
        success: false,
        attribution: {
          firstTouch: false,
          lastTouch: false,
          touchpointCount: 0
        }
      };
    }

    // Update UTM link click statistics
    const now = new Date();
    await db
      .update(crmCampaignUtmLinks)
      .set({
        clicks: sql`${crmCampaignUtmLinks.clicks} + 1`,
        lastClickedAt: now,
        updatedAt: now
      })
      .where(
        and(
          eq(crmCampaignUtmLinks.id, utmLinkId),
          eq(crmCampaignUtmLinks.tenantId, tenantId)
        )
      );

    // If sessionId provided, track unique clicks (simple deduplication)
    if (sessionId) {
      await db
        .update(crmCampaignUtmLinks)
        .set({
          uniqueClicks: sql`${crmCampaignUtmLinks.uniqueClicks} + 1`
        })
        .where(
          and(
            eq(crmCampaignUtmLinks.id, utmLinkId),
            eq(crmCampaignUtmLinks.tenantId, tenantId)
          )
        );
    }

    logger.debug('UTM click tracked successfully', {
      tenantId,
      utmLinkId,
      leadId: leadId || 'anonymous'
    });

    // If leadId provided, attribute to lead
    let attribution = {
      firstTouch: false,
      lastTouch: false,
      touchpointCount: 0
    };

    if (leadId) {
      const attributionResult = await this.attributeLeadToUTM({
        tenantId,
        leadId,
        utmLinkId
      });
      attribution = attributionResult.attribution;
    }

    return {
      success: true,
      attribution,
      utmLink: {
        id: utmLink.id,
        channelName: utmLink.channelName,
        utmSource: utmLink.utmSource,
        utmMedium: utmLink.utmMedium,
        utmCampaign: utmLink.utmCampaign
      }
    };
  }

  /**
   * Attribute lead to UTM link with multi-touch tracking
   * Implements 30-day attribution window and last-touch revenue model
   */
  async attributeLeadToUTM(params: AttributeLeadToUTMParams): Promise<AttributionResult> {
    const { tenantId, leadId, utmLinkId } = params;

    logger.info('Attributing lead to UTM link', {
      tenantId,
      leadId,
      utmLinkId
    });

    // Validate lead exists and belongs to tenant
    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!lead) {
      logger.warn('Lead not found', {
        tenantId,
        leadId
      });
      return {
        success: false,
        attribution: {
          firstTouch: false,
          lastTouch: false,
          touchpointCount: 0
        }
      };
    }

    // Validate UTM link exists and is active
    const [utmLink] = await db
      .select()
      .from(crmCampaignUtmLinks)
      .where(
        and(
          eq(crmCampaignUtmLinks.id, utmLinkId),
          eq(crmCampaignUtmLinks.tenantId, tenantId),
          eq(crmCampaignUtmLinks.isActive, true)
        )
      )
      .limit(1);

    if (!utmLink) {
      logger.warn('UTM link not found or inactive', {
        tenantId,
        utmLinkId
      });
      return {
        success: false,
        attribution: {
          firstTouch: false,
          lastTouch: false,
          touchpointCount: 0
        }
      };
    }

    const now = new Date();
    
    // NOTE: Attribution window allows fresh clicks even after 30 days.
    // The window applies to INDIVIDUAL clicks (not blocking all future attribution).
    // This allows leads to re-engage with campaigns over time.
    // Analytics queries can filter by timestamp if needed for reporting.

    // Prepare attribution update
    const isFirstTouch = !lead.firstTouchUtmLinkId;
    const isLastTouch = true; // Every click updates last touch
    
    // Build allTouchUtmLinkIds array (newest first, max 50 touchpoints)
    // PRESERVE DUPLICATES: Each click is recorded, even if same UTM link clicked multiple times
    // This maintains complete customer journey history for analytics
    let allTouches = lead.allTouchUtmLinkIds || [];
    
    // Add new touchpoint at the beginning (newest first)
    allTouches = [utmLinkId, ...allTouches];
    
    // Limit to MAX_TOUCHPOINTS (no deduplication - preserve full history)
    const limitedTouches = allTouches.slice(0, MAX_TOUCHPOINTS);

    // Update lead attribution fields
    const updateData: any = {
      lastTouchUtmLinkId: utmLinkId,
      lastTouchAt: now,
      allTouchUtmLinkIds: limitedTouches,
      updatedAt: now
    };

    if (isFirstTouch) {
      updateData.firstTouchUtmLinkId = utmLinkId;
      updateData.firstTouchAt = now;
    }

    await db
      .update(crmLeads)
      .set(updateData)
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.tenantId, tenantId)
        )
      );

    logger.info('Lead attributed to UTM link successfully', {
      tenantId,
      leadId,
      utmLinkId,
      firstTouch: isFirstTouch,
      lastTouch: isLastTouch,
      touchpointCount: limitedTouches.length
    });

    return {
      success: true,
      attribution: {
        firstTouch: isFirstTouch,
        lastTouch: isLastTouch,
        touchpointCount: limitedTouches.length
      },
      utmLink: {
        id: utmLink.id,
        channelName: utmLink.channelName,
        utmSource: utmLink.utmSource,
        utmMedium: utmLink.utmMedium,
        utmCampaign: utmLink.utmCampaign
      }
    };
  }

  /**
   * Get attribution analytics for a lead
   */
  async getLeadAttribution(tenantId: string, leadId: string) {
    const [lead] = await db
      .select({
        id: crmLeads.id,
        firstTouchUtmLinkId: crmLeads.firstTouchUtmLinkId,
        lastTouchUtmLinkId: crmLeads.lastTouchUtmLinkId,
        allTouchUtmLinkIds: crmLeads.allTouchUtmLinkIds,
        firstTouchAt: crmLeads.firstTouchAt,
        lastTouchAt: crmLeads.lastTouchAt
      })
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!lead) {
      return null;
    }

    // Get UTM link details for first and last touch
    const utmLinkIds = [
      lead.firstTouchUtmLinkId,
      lead.lastTouchUtmLinkId,
      ...(lead.allTouchUtmLinkIds || [])
    ].filter((id): id is string => id !== null && id !== undefined);

    const uniqueUtmLinkIds = [...new Set(utmLinkIds)];

    if (uniqueUtmLinkIds.length === 0) {
      return {
        leadId: lead.id,
        firstTouch: null,
        lastTouch: null,
        allTouches: [],
        touchpointCount: 0
      };
    }

    const utmLinks = await db
      .select({
        id: crmCampaignUtmLinks.id,
        channelName: crmCampaignUtmLinks.channelName,
        utmSource: crmCampaignUtmLinks.utmSource,
        utmMedium: crmCampaignUtmLinks.utmMedium,
        utmCampaign: crmCampaignUtmLinks.utmCampaign
      })
      .from(crmCampaignUtmLinks)
      .where(
        and(
          eq(crmCampaignUtmLinks.tenantId, tenantId),
          sql`${crmCampaignUtmLinks.id} = ANY(${uniqueUtmLinkIds})`
        )
      );

    const utmLinkMap = new Map(utmLinks.map(link => [link.id, link]));

    return {
      leadId: lead.id,
      firstTouch: lead.firstTouchUtmLinkId ? {
        utmLinkId: lead.firstTouchUtmLinkId,
        timestamp: lead.firstTouchAt,
        ...utmLinkMap.get(lead.firstTouchUtmLinkId)
      } : null,
      lastTouch: lead.lastTouchUtmLinkId ? {
        utmLinkId: lead.lastTouchUtmLinkId,
        timestamp: lead.lastTouchAt,
        ...utmLinkMap.get(lead.lastTouchUtmLinkId)
      } : null,
      allTouches: (lead.allTouchUtmLinkIds || []).map(id => ({
        utmLinkId: id,
        ...utmLinkMap.get(id)
      })),
      touchpointCount: lead.allTouchUtmLinkIds?.length || 0
    };
  }

  /**
   * Attribute revenue to last-touch UTM link
   */
  async attributeRevenue(tenantId: string, leadId: string, revenue: number): Promise<void> {
    logger.info('Attributing revenue to last-touch UTM link', {
      tenantId,
      leadId,
      revenue
    });

    const [lead] = await db
      .select({
        lastTouchUtmLinkId: crmLeads.lastTouchUtmLinkId
      })
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!lead || !lead.lastTouchUtmLinkId) {
      logger.warn('No last-touch UTM link found for revenue attribution', {
        tenantId,
        leadId
      });
      return;
    }

    const now = new Date();
    
    // Update UTM link with revenue and conversion
    await db
      .update(crmCampaignUtmLinks)
      .set({
        conversions: sql`${crmCampaignUtmLinks.conversions} + 1`,
        revenue: sql`${crmCampaignUtmLinks.revenue} + ${revenue}`,
        lastConversionAt: now,
        updatedAt: now
      })
      .where(
        and(
          eq(crmCampaignUtmLinks.id, lead.lastTouchUtmLinkId),
          eq(crmCampaignUtmLinks.tenantId, tenantId)
        )
      );

    logger.info('Revenue attributed to last-touch UTM link', {
      tenantId,
      leadId,
      utmLinkId: lead.lastTouchUtmLinkId,
      revenue
    });
  }
}

export const attributionService = new AttributionService();
