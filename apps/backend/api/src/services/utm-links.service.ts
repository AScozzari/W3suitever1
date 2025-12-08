/**
 * UTM Links Service
 * 
 * Handles generation, storage, and analytics for campaign UTM links.
 * Provides automatic link generation based on marketing channels and tracking functionality.
 */

import { db } from '../core/db';
import { crmCampaigns, crmCampaignUtmLinks, crmLeads } from '../db/schema/w3suite';
import { eq, and, sql, not, inArray } from 'drizzle-orm';
import { logger } from '../core/logger';

// Marketing channels configuration with UTM mappings
const MARKETING_CHANNELS = [
  { id: 'facebook_ads', name: 'Facebook Ads', utmSource: 'facebook', utmMedium: 'cpc', icon: '📘' },
  { id: 'instagram', name: 'Instagram Stories', utmSource: 'instagram', utmMedium: 'social', icon: '📷' },
  { id: 'google_ads', name: 'Google Ads', utmSource: 'google', utmMedium: 'cpc', icon: '🔍' },
  { id: 'email', name: 'Email Newsletter', utmSource: 'newsletter', utmMedium: 'email', icon: '📧' },
  { id: 'whatsapp', name: 'WhatsApp Business', utmSource: 'whatsapp', utmMedium: 'messaging', icon: '💬' },
  { id: 'linkedin', name: 'LinkedIn Ads', utmSource: 'linkedin', utmMedium: 'cpc', icon: '💼' },
  { id: 'tiktok', name: 'TikTok Ads', utmSource: 'tiktok', utmMedium: 'cpc', icon: '🎵' },
] as const;

export interface GenerateUTMLinksParams {
  tenantId: string;
  campaignId: string;
  landingPageUrl: string;
  utmCampaign: string;
  marketingChannels: string[]; // Channel IDs
}

export interface UTMLinkResult {
  id: string;
  channelId: string;
  channelName: string;
  generatedUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  isActive: boolean;
  createdAt: Date;
}

export interface TrackUTMLinkParams {
  tenantId: string;
  linkId: string;
  eventType: 'click' | 'conversion';
  uniqueIdentifier?: string; // For unique click tracking (session ID, user ID, etc.)
  revenue?: number; // For conversion tracking
}

class UTMLinksService {
  /**
   * Generate or update UTM links for a campaign based on active marketing channels
   */
  async generateLinksForCampaign(params: GenerateUTMLinksParams): Promise<UTMLinkResult[]> {
    const { tenantId, campaignId, landingPageUrl, utmCampaign, marketingChannels } = params;

    logger.info('Generating UTM links for campaign', {
      campaignId,
      tenantId,
      channelCount: marketingChannels.length
    });

    const results: UTMLinkResult[] = [];

    for (const channelId of marketingChannels) {
      const channelConfig = MARKETING_CHANNELS.find(c => c.id === channelId);
      if (!channelConfig) {
        logger.warn('Unknown marketing channel', { channelId, campaignId });
        continue;
      }

      // Build UTM URL
      const params = new URLSearchParams({
        utm_source: channelConfig.utmSource,
        utm_medium: channelConfig.utmMedium,
        utm_campaign: utmCampaign,
      });

      const generatedUrl = `${landingPageUrl}?${params.toString()}`;

      // Upsert link (create or update if exists)
      const [link] = await db
        .insert(crmCampaignUtmLinks)
        .values({
          tenantId,
          campaignId,
          channelId: channelConfig.id,
          channelName: channelConfig.name,
          generatedUrl,
          utmSource: channelConfig.utmSource,
          utmMedium: channelConfig.utmMedium,
          utmCampaign,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [crmCampaignUtmLinks.campaignId, crmCampaignUtmLinks.channelId],
          set: {
            generatedUrl,
            utmCampaign,
            updatedAt: new Date(),
            isActive: true,
          }
        })
        .returning();

      results.push({
        id: link.id,
        channelId: link.channelId,
        channelName: link.channelName,
        generatedUrl: link.generatedUrl,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
        clicks: link.clicks || 0,
        uniqueClicks: link.uniqueClicks || 0,
        conversions: link.conversions || 0,
        revenue: link.revenue || 0,
        isActive: link.isActive,
        createdAt: link.createdAt,
      });

      logger.debug('UTM link generated', {
        campaignId,
        channelId: channelConfig.id,
        url: generatedUrl
      });
    }

    // Deactivate links for channels that were removed
    // 🔒 SECURITY: Use parameterized query to prevent SQL injection
    const activeChannelIds = marketingChannels;
    
    if (activeChannelIds.length > 0) {
      // Deactivate links NOT in the active channel list (parameterized)
      await db
        .update(crmCampaignUtmLinks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(crmCampaignUtmLinks.campaignId, campaignId),
            eq(crmCampaignUtmLinks.tenantId, tenantId),
            not(inArray(crmCampaignUtmLinks.channelId, activeChannelIds))
          )
        );
    } else {
      // No active channels - deactivate all links for this campaign
      await db
        .update(crmCampaignUtmLinks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(crmCampaignUtmLinks.campaignId, campaignId),
            eq(crmCampaignUtmLinks.tenantId, tenantId)
          )
        );
    }

    logger.info('UTM links generation completed', {
      campaignId,
      tenantId,
      generatedCount: results.length
    });

    return results;
  }

  /**
   * Get all UTM links for a campaign
   */
  async getLinksForCampaign(tenantId: string, campaignId: string): Promise<UTMLinkResult[]> {
    const links = await db
      .select()
      .from(crmCampaignUtmLinks)
      .where(
        and(
          eq(crmCampaignUtmLinks.campaignId, campaignId),
          eq(crmCampaignUtmLinks.tenantId, tenantId)
        )
      )
      .orderBy(crmCampaignUtmLinks.createdAt);

    return links.map(link => ({
      id: link.id,
      channelId: link.channelId,
      channelName: link.channelName,
      generatedUrl: link.generatedUrl,
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      clicks: link.clicks || 0,
      uniqueClicks: link.uniqueClicks || 0,
      conversions: link.conversions || 0,
      revenue: link.revenue || 0,
      isActive: link.isActive,
      createdAt: link.createdAt,
    }));
  }

  /**
   * Track UTM link event (click or conversion)
   */
  async trackLinkEvent(params: TrackUTMLinkParams): Promise<void> {
    const { tenantId, linkId, eventType, uniqueIdentifier, revenue } = params;

    logger.info('Tracking UTM link event', {
      linkId,
      eventType,
      tenantId
    });

    const now = new Date();

    if (eventType === 'click') {
      // Increment clicks
      await db
        .update(crmCampaignUtmLinks)
        .set({
          clicks: sql`${crmCampaignUtmLinks.clicks} + 1`,
          lastClickedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(crmCampaignUtmLinks.id, linkId),
            eq(crmCampaignUtmLinks.tenantId, tenantId)
          )
        );

      // TODO: Track unique clicks with session/user identifier
      // For now, we just increment clicks
      if (uniqueIdentifier) {
        // Future: Check if uniqueIdentifier was seen before, if not, increment uniqueClicks
        await db
          .update(crmCampaignUtmLinks)
          .set({
            uniqueClicks: sql`${crmCampaignUtmLinks.uniqueClicks} + 1`,
          })
          .where(
            and(
              eq(crmCampaignUtmLinks.id, linkId),
              eq(crmCampaignUtmLinks.tenantId, tenantId)
            )
          );
      }
    } else if (eventType === 'conversion') {
      // Increment conversions and revenue
      const updateData: any = {
        conversions: sql`${crmCampaignUtmLinks.conversions} + 1`,
        lastConversionAt: now,
        updatedAt: now,
      };

      if (revenue !== undefined) {
        updateData.revenue = sql`${crmCampaignUtmLinks.revenue} + ${revenue}`;
      }

      await db
        .update(crmCampaignUtmLinks)
        .set(updateData)
        .where(
          and(
            eq(crmCampaignUtmLinks.id, linkId),
            eq(crmCampaignUtmLinks.tenantId, tenantId)
          )
        );
    }

    logger.debug('UTM link event tracked', {
      linkId,
      eventType,
      tenantId
    });
  }

  /**
   * Get analytics for a campaign's UTM links
   */
  async getCampaignUTMAnalytics(tenantId: string, campaignId: string) {
    // Get link statistics
    const linksStats = await db
      .select({
        channelId: crmCampaignUtmLinks.channelId,
        channelName: crmCampaignUtmLinks.channelName,
        clicks: crmCampaignUtmLinks.clicks,
        uniqueClicks: crmCampaignUtmLinks.uniqueClicks,
        conversions: crmCampaignUtmLinks.conversions,
        revenue: crmCampaignUtmLinks.revenue,
      })
      .from(crmCampaignUtmLinks)
      .where(
        and(
          eq(crmCampaignUtmLinks.campaignId, campaignId),
          eq(crmCampaignUtmLinks.tenantId, tenantId),
          eq(crmCampaignUtmLinks.isActive, true)
        )
      );

    // Get lead attribution by UTM source/medium
    const leadsByUTM = await db
      .select({
        utmSource: crmLeads.utmSource,
        utmMedium: crmLeads.utmMedium,
        count: sql<number>`count(*)::int`,
        avgLeadScore: sql<number>`avg(${crmLeads.leadScore})::numeric`,
      })
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.campaignId, campaignId),
          eq(crmLeads.tenantId, tenantId)
        )
      )
      .groupBy(crmLeads.utmSource, crmLeads.utmMedium);

    // Calculate totals
    const totalClicks = linksStats.reduce((sum, l) => sum + (l.clicks || 0), 0);
    const totalUniqueClicks = linksStats.reduce((sum, l) => sum + (l.uniqueClicks || 0), 0);
    const totalConversions = linksStats.reduce((sum, l) => sum + (l.conversions || 0), 0);
    const totalRevenue = linksStats.reduce((sum, l) => sum + (l.revenue || 0), 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      summary: {
        totalClicks,
        totalUniqueClicks,
        totalConversions,
        totalRevenue,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      },
      byChannel: linksStats.map(stat => ({
        ...stat,
        conversionRate: (stat.clicks || 0) > 0 
          ? parseFloat((((stat.conversions || 0) / stat.clicks) * 100).toFixed(2))
          : 0,
      })),
      leadsByUTM: leadsByUTM.map(stat => ({
        utmSource: stat.utmSource || 'unknown',
        utmMedium: stat.utmMedium || 'unknown',
        leadCount: stat.count,
        avgLeadScore: parseFloat((stat.avgLeadScore || 0).toFixed(2)),
      })),
    };
  }
}

export const utmLinksService = new UTMLinksService();
