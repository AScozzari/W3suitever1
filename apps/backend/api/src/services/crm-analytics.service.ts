/**
 * CRM Analytics Service
 * 
 * Enterprise-grade analytics aggregations for CRM data with store-level filtering.
 * Provides comprehensive metrics for marketing attribution, pipeline velocity, AI accuracy, and more.
 */

import { db, setTenantContext } from '../core/db';
import { 
  crmCampaigns, 
  crmLeads, 
  crmDeals,
  crmCustomers,
  crmCampaignUtmLinks,
  gtmEventLog,
  leadAiInsights,
  crmLeadNotifications,
  stores,
  storeTrackingConfig
} from '../db/schema/w3suite';
import { eq, and, sql, gte, lte, inArray, isNotNull, desc, asc } from 'drizzle-orm';
import { logger } from '../core/logger';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface AnalyticsFilters {
  tenantId: string;
  storeIds?: string[];
  dateRange?: DateRange;
  campaignIds?: string[];
  pipelineId?: string;
  driverIds?: string[];
}

export interface ExecutiveSummary {
  totalRevenue: number;
  revenueTrend: number;
  totalLeads: number;
  leadsTrend: number;
  conversionRate: number;
  conversionTrend: number;
  avgDealSize: number;
  dealSizeTrend: number;
  aiScoreAccuracy: number;
  accuracyTrend: number;
  activeCustomers: number;
  customersTrend: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  storeId: string | null;
  storeName: string | null;
  status: string;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  roi: number;
  costPerLead: number;
  avgLeadScore: number;
  topChannel: string;
  startDate: Date;
  endDate: Date | null;
}

export interface ChannelAttribution {
  channel: string;
  source: string;
  medium: string;
  campaigns: number;
  leads: number;
  qualifiedLeads: number;
  customers: number;
  revenue: number;
  conversionRate: number;
  avgTimeToConvert: number;
  touchpoints: number;
}

export interface PipelineVelocity {
  pipelineId: string;
  pipelineName: string;
  storeId: string | null;
  avgDaysInPipeline: number;
  avgDaysPerStage: Record<string, number>;
  conversionRates: Record<string, number>;
  bottlenecks: string[];
  velocity: number; // deals per day
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  activeDeals: number;
}

export interface AIScoreDistribution {
  scoreRange: string;
  count: number;
  converted: number;
  conversionRate: number;
  avgRevenue: number;
  accuracy: number;
}

export interface GTMEventsSummary {
  totalEvents: number;
  successRate: number;
  topEvents: Array<{
    eventName: string;
    count: number;
    successRate: number;
  }>;
  byHour: Array<{
    hour: number;
    events: number;
    conversions: number;
  }>;
  enhancedConversionRate: number;
}

export interface StoreComparison {
  storeId: string;
  storeName: string;
  city: string | null;
  metrics: {
    revenue: number;
    leads: number;
    conversionRate: number;
    avgDealSize: number;
    topChannel: string;
    teamSize: number;
    performanceScore: number;
  };
  rank: number;
}

class CRMAnalyticsService {
  /**
   * Get executive summary KPIs with trends
   */
  async getExecutiveSummary(filters: AnalyticsFilters): Promise<ExecutiveSummary> {
    await setTenantContext(filters.tenantId);
    
    const dateFilter = filters.dateRange ? 
      and(
        gte(crmLeads.createdAt, filters.dateRange.from),
        lte(crmLeads.createdAt, filters.dateRange.to)
      ) : sql`true`;
    
    const storeFilter = filters.storeIds?.length ? 
      inArray(crmLeads.storeId, filters.storeIds) : sql`true`;
    
    // Get current period metrics
    const currentMetrics = await db
      .select({
        totalLeads: sql<number>`COUNT(DISTINCT ${crmLeads.id})`,
        qualifiedLeads: sql<number>`COUNT(DISTINCT CASE WHEN ${crmLeads.status} = 'qualified' THEN ${crmLeads.id} END)`,
        convertedLeads: sql<number>`COUNT(DISTINCT CASE WHEN ${crmLeads.status} = 'converted' THEN ${crmLeads.id} END)`,
        avgLeadScore: sql<number>`COALESCE(AVG(${crmLeads.leadScore}), 0)`,
      })
      .from(crmLeads)
      .where(and(
        eq(crmLeads.tenantId, filters.tenantId),
        dateFilter,
        storeFilter
      ));

    // Get deal metrics - use UPPERCASE SQL functions per PostgreSQL standard
    const dealMetrics = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${crmDeals.dealValue}), 0)`,
        avgDealSize: sql<number>`COALESCE(AVG(${crmDeals.dealValue}), 0)`,
        wonDeals: sql<number>`COUNT(CASE WHEN ${crmDeals.status} = 'won' THEN 1 END)`,
      })
      .from(crmDeals)
      .where(and(
        eq(crmDeals.tenantId, filters.tenantId),
        filters.storeIds?.length ? inArray(crmDeals.storeId, filters.storeIds) : sql`true`
      ));

    // Get customer count
    const customerCount = await db
      .select({
        activeCustomers: sql<number>`COUNT(DISTINCT ${crmCustomers.id})`,
      })
      .from(crmCustomers)
      .where(and(
        eq(crmCustomers.tenantId, filters.tenantId),
        eq(crmCustomers.status, 'active')
      ));

    // Calculate AI accuracy
    const aiAccuracy = await this.calculateAIAccuracy(filters);

    // Calculate trends (mock for now - would compare with previous period)
    const trends = {
      revenueTrend: 12.5,
      leadsTrend: 8.3,
      conversionTrend: -2.1,
      dealSizeTrend: 5.7,
      accuracyTrend: 3.2,
      customersTrend: 15.8
    };

    const metrics = currentMetrics[0];
    const deals = dealMetrics[0];
    const customers = customerCount[0];
    
    const conversionRate = metrics.totalLeads > 0 ? 
      (metrics.convertedLeads / metrics.totalLeads) * 100 : 0;

    return {
      totalRevenue: Number(deals.totalRevenue) || 0,
      revenueTrend: trends.revenueTrend,
      totalLeads: metrics.totalLeads,
      leadsTrend: trends.leadsTrend,
      conversionRate: Math.round(conversionRate * 10) / 10,
      conversionTrend: trends.conversionTrend,
      avgDealSize: Number(deals.avgDealSize) || 0,
      dealSizeTrend: trends.dealSizeTrend,
      aiScoreAccuracy: aiAccuracy,
      accuracyTrend: trends.accuracyTrend,
      activeCustomers: customers.activeCustomers,
      customersTrend: trends.customersTrend
    };
  }

  /**
   * Get campaign performance metrics by store
   */
  async getCampaignPerformance(filters: AnalyticsFilters): Promise<CampaignPerformance[]> {
    await setTenantContext(filters.tenantId);
    
    const storeFilter = filters.storeIds?.length ? 
      inArray(crmCampaigns.storeId, filters.storeIds) : sql`true`;
    
    const campaigns = await db
      .select({
        campaignId: crmCampaigns.id,
        campaignName: crmCampaigns.name,
        storeId: crmCampaigns.storeId,
        storeName: stores.name,
        status: crmCampaigns.status,
        budget: crmCampaigns.budget,
        startDate: crmCampaigns.startDate,
        endDate: crmCampaigns.endDate,
        ga4MeasurementId: crmCampaigns.ga4MeasurementId,
        totalLeads: sql<number>`COUNT(DISTINCT ${crmLeads.id})`,
        qualifiedLeads: sql<number>`COUNT(DISTINCT CASE WHEN ${crmLeads.status} = 'qualified' THEN ${crmLeads.id} END)`,
        convertedLeads: sql<number>`COUNT(DISTINCT CASE WHEN ${crmLeads.status} = 'converted' THEN ${crmLeads.id} END)`,
        avgLeadScore: sql<number>`COALESCE(AVG(${crmLeads.leadScore}), 0)`,
      })
      .from(crmCampaigns)
      .leftJoin(stores, eq(crmCampaigns.storeId, stores.id))
      .leftJoin(crmLeads, eq(crmLeads.campaignId, crmCampaigns.id))
      .where(and(
        eq(crmCampaigns.tenantId, filters.tenantId),
        storeFilter
      ))
      .groupBy(
        crmCampaigns.id,
        crmCampaigns.name,
        crmCampaigns.storeId,
        stores.name,
        crmCampaigns.status,
        crmCampaigns.budget,
        crmCampaigns.startDate,
        crmCampaigns.endDate,
        crmCampaigns.ga4MeasurementId
      );

    // Return empty array if no campaigns
    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    // Calculate additional metrics
    return campaigns.map(campaign => {
      const conversionRate = campaign.totalLeads > 0 ? 
        (campaign.convertedLeads / campaign.totalLeads) * 100 : 0;
      
      const budgetValue = Number(campaign.budget) || 0;
      const costPerLead = budgetValue > 0 && campaign.totalLeads > 0 ? 
        budgetValue / campaign.totalLeads : 0;
      
      // Mock revenue calculation (would need to join with deals)
      const revenue = campaign.convertedLeads * 2500;
      const roi = budgetValue > 0 ? (revenue - budgetValue) / budgetValue * 100 : 0;
      
      return {
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        storeId: campaign.storeId,
        storeName: campaign.storeName,
        status: campaign.status,
        totalLeads: campaign.totalLeads,
        qualifiedLeads: campaign.qualifiedLeads,
        convertedLeads: campaign.convertedLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalRevenue: revenue,
        roi: Math.round(roi),
        costPerLead: Math.round(costPerLead),
        avgLeadScore: Math.round(Number(campaign.avgLeadScore) || 0),
        topChannel: campaign.ga4MeasurementId ? 'Google Ads' : 'Organic',
        startDate: campaign.startDate,
        endDate: campaign.endDate
      };
    });
  }

  /**
   * Get channel attribution metrics
   */
  async getChannelAttribution(filters: AnalyticsFilters): Promise<ChannelAttribution[]> {
    await setTenantContext(filters.tenantId);
    
    // Get UTM link performance
    const utmMetrics = await db
      .select({
        channelId: crmCampaignUtmLinks.channelId,
        channelName: crmCampaignUtmLinks.channelName,
        utmSource: crmCampaignUtmLinks.utmSource,
        utmMedium: crmCampaignUtmLinks.utmMedium,
        clicks: sql<number>`SUM(${crmCampaignUtmLinks.clicks})`,
        uniqueClicks: sql<number>`SUM(${crmCampaignUtmLinks.uniqueClicks})`,
        conversions: sql<number>`SUM(${crmCampaignUtmLinks.conversions})`,
        revenue: sql<number>`SUM(${crmCampaignUtmLinks.revenue})`,
      })
      .from(crmCampaignUtmLinks)
      .where(and(
        eq(crmCampaignUtmLinks.tenantId, filters.tenantId),
        eq(crmCampaignUtmLinks.isActive, true)
      ))
      .groupBy(
        crmCampaignUtmLinks.channelId,
        crmCampaignUtmLinks.channelName,
        crmCampaignUtmLinks.utmSource,
        crmCampaignUtmLinks.utmMedium
      );

    // Map to channel attribution format
    return utmMetrics.map(metric => ({
      channel: metric.channelName,
      source: metric.utmSource,
      medium: metric.utmMedium,
      campaigns: 1, // Would need to count distinct campaigns
      leads: metric.uniqueClicks,
      qualifiedLeads: Math.round(metric.uniqueClicks * 0.3), // Mock qualification rate
      customers: metric.conversions,
      revenue: Number(metric.revenue),
      conversionRate: metric.uniqueClicks > 0 ? 
        (metric.conversions / metric.uniqueClicks) * 100 : 0,
      avgTimeToConvert: 7.5, // Mock data - would calculate from timestamps
      touchpoints: metric.clicks
    }));
  }

  /**
   * Get AI score distribution and accuracy
   */
  async getAIScoreDistribution(filters: AnalyticsFilters): Promise<AIScoreDistribution[]> {
    await setTenantContext(filters.tenantId);
    
    const storeFilter = filters.storeIds?.length ? 
      inArray(crmLeads.storeId, filters.storeIds) : sql`true`;
    
    const distribution = await db
      .select({
        scoreRange: sql<string>`
          case 
            when ${crmLeads.leadScore} >= 80 THEN '80-100 (Hot)'
            when ${crmLeads.leadScore} >= 60 THEN '60-79 (Warm)'
            when ${crmLeads.leadScore} >= 40 THEN '40-59 (Cool)'
            when ${crmLeads.leadScore} >= 20 THEN '20-39 (Cold)'
            else '0-19 (Ice)'
          end
        `,
        count: sql<number>`COUNT()`,
        converted: sql<number>`COUNT(CASE WHEN ${crmLeads.status} = 'converted' THEN 1END)`,
      })
      .from(crmLeads)
      .where(and(
        eq(crmLeads.tenantId, filters.tenantId),
        isNotNull(crmLeads.leadScore),
        storeFilter
      ))
      .groupBy(sql`
        case 
          when ${crmLeads.leadScore} >= 80 THEN '80-100 (Hot)'
          when ${crmLeads.leadScore} >= 60 THEN '60-79 (Warm)'
          when ${crmLeads.leadScore} >= 40 THEN '40-59 (Cool)'
          when ${crmLeads.leadScore} >= 20 THEN '20-39 (Cold)'
          else '0-19 (Ice)'
        end
      `);

    return distribution.map(range => {
      const conversionRate = range.count > 0 ? 
        (range.converted / range.count) * 100 : 0;
      
      // Calculate accuracy based on expected vs actual conversion
      let expectedRate = 0;
      if (range.scoreRange.includes('80-100')) expectedRate = 80;
      else if (range.scoreRange.includes('60-79')) expectedRate = 60;
      else if (range.scoreRange.includes('40-59')) expectedRate = 40;
      else if (range.scoreRange.includes('20-39')) expectedRate = 20;
      else expectedRate = 5;
      
      const accuracy = 100 - Math.abs(expectedRate - conversionRate);
      
      return {
        scoreRange: range.scoreRange,
        count: range.count,
        converted: range.converted,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgRevenue: range.converted > 0 ? range.converted * 2500 : 0, // Mock revenue
        accuracy: Math.round(accuracy)
      };
    });
  }

  /**
   * Get GTM events summary
   */
  async getGTMEventsSummary(filters: AnalyticsFilters): Promise<GTMEventsSummary> {
    await setTenantContext(filters.tenantId);
    
    const dateFilter = filters.dateRange ? 
      and(
        gte(gtmEventLog.createdAt, filters.dateRange.from),
        lte(gtmEventLog.createdAt, filters.dateRange.to)
      ) : sql`true`;
    
    const storeFilter = filters.storeIds?.length ? 
      inArray(gtmEventLog.storeId, filters.storeIds) : sql`true`;
    
    // Get overall metrics
    const summary = await db
      .select({
        totalEvents: sql<number>`COUNT()`,
        successfulEvents: sql<number>`COUNT(CASE WHEN ${gtmEventLog.success} = true THEN 1END)`,
        enhancedEvents: sql<number>`COUNT(CASE WHEN ${gtmEventLog.enhancedConversionData} is not null THEN 1END)`,
      })
      .from(gtmEventLog)
      .where(and(
        eq(gtmEventLog.tenantId, filters.tenantId),
        dateFilter,
        storeFilter
      ));

    // Get top events
    const topEvents = await db
      .select({
        eventName: gtmEventLog.eventName,
        count: sql<number>`COUNT()`,
        successCount: sql<number>`COUNT(CASE WHEN ${gtmEventLog.success} = true THEN 1END)`,
      })
      .from(gtmEventLog)
      .where(and(
        eq(gtmEventLog.tenantId, filters.tenantId),
        dateFilter,
        storeFilter
      ))
      .groupBy(gtmEventLog.eventName)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // Get hourly distribution
    const hourlyData = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${gtmEventLog.createdAt})`,
        events: sql<number>`COUNT()`,
        conversions: sql<number>`COUNT(CASE WHEN ${gtmEventLog.eventType} = 'lead_converted' THEN 1END)`,
      })
      .from(gtmEventLog)
      .where(and(
        eq(gtmEventLog.tenantId, filters.tenantId),
        dateFilter,
        storeFilter
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${gtmEventLog.createdAt})`)
      .orderBy(asc(sql`EXTRACT(HOUR FROM ${gtmEventLog.createdAt})`));

    const metrics = summary[0];
    const successRate = metrics.totalEvents > 0 ? 
      (metrics.successfulEvents / metrics.totalEvents) * 100 : 0;
    const enhancedRate = metrics.totalEvents > 0 ? 
      (metrics.enhancedEvents / metrics.totalEvents) * 100 : 0;

    return {
      totalEvents: metrics.totalEvents,
      successRate: Math.round(successRate * 10) / 10,
      topEvents: topEvents.map(event => ({
        eventName: event.eventName,
        count: event.count,
        successRate: event.count > 0 ? 
          Math.round((event.successCount / event.count) * 1000) / 10 : 0
      })),
      byHour: hourlyData.map(hour => ({
        hour: hour.hour,
        events: hour.events,
        conversions: hour.conversions
      })),
      enhancedConversionRate: Math.round(enhancedRate * 10) / 10
    };
  }

  /**
   * Get store comparison metrics
   */
  async getStoreComparison(filters: AnalyticsFilters): Promise<StoreComparison[]> {
    await setTenantContext(filters.tenantId);
    
    const storeFilter = filters.storeIds?.length ? 
      inArray(stores.id, filters.storeIds) : sql`true`;
    
    const storeMetrics = await db
      .select({
        storeId: stores.id,
        storeName: stores.name,
        city: stores.city,
        totalLeads: sql<number>`COUNT(DISTINCT ${crmLeads.id})`,
        convertedLeads: sql<number>`count(distinct case when ${crmLeads.status} = 'converted' THEN ${crmLeads.id}END)`,
      })
      .from(stores)
      .leftJoin(crmLeads, eq(crmLeads.storeId, stores.id))
      .where(and(
        eq(stores.tenantId, filters.tenantId),
        storeFilter
      ))
      .groupBy(stores.id, stores.name, stores.city);

    // Return empty array if no stores
    if (!storeMetrics || storeMetrics.length === 0) {
      return [];
    }

    // Calculate metrics and rank stores with null-safety
    const storesWithMetrics = storeMetrics.map(store => {
      const conversionRate = store.totalLeads > 0 ? 
        (store.convertedLeads / store.totalLeads) * 100 : 0;
      
      const revenue = store.convertedLeads * 2500; // Mock revenue
      const avgDealSize = store.convertedLeads > 0 ? revenue / store.convertedLeads : 0;
      const performanceScore = conversionRate * 0.5 + (revenue / 10000) * 0.5; // Weighted score
      
      return {
        storeId: store.storeId,
        storeName: store.storeName,
        city: store.city,
        metrics: {
          revenue,
          leads: store.totalLeads,
          conversionRate: Math.round(conversionRate * 10) / 10,
          avgDealSize: Math.round(avgDealSize),
          topChannel: 'Google Ads', // Would need real channel data
          teamSize: Math.floor(Math.random() * 10) + 5, // Mock team size
          performanceScore: Math.round(performanceScore)
        },
        rank: 0
      };
    });

    // Sort by performance and assign ranks
    storesWithMetrics.sort((a, b) => b.metrics.performanceScore - a.metrics.performanceScore);
    storesWithMetrics.forEach((store, index) => {
      store.rank = index + 1;
    });

    return storesWithMetrics;
  }

  /**
   * Calculate overall AI scoring accuracy
   */
  private async calculateAIAccuracy(filters: AnalyticsFilters): Promise<number> {
    await setTenantContext(filters.tenantId);
    
    const storeFilter = filters.storeIds?.length ? 
      inArray(crmLeads.storeId, filters.storeIds) : sql`true`;
    
    const accuracy = await db
      .select({
        totalPredictions: sql<number>`COUNT()`,
        correctPredictions: sql<number>`
          count(case 
            when ${crmLeads.leadScore} >= 70 and ${crmLeads.status} = 'converted' THEN 1
            when ${crmLeads.leadScore} < 70 and ${crmLeads.status} != 'converted' THEN 1
         END)
        `,
      })
      .from(crmLeads)
      .where(and(
        eq(crmLeads.tenantId, filters.tenantId),
        isNotNull(crmLeads.leadScore),
        storeFilter
      ));

    const result = accuracy[0];
    const accuracyRate = result.totalPredictions > 0 ? 
      (result.correctPredictions / result.totalPredictions) * 100 : 0;
    
    return Math.round(accuracyRate * 10) / 10;
  }

  /**
   * Get conversion funnel metrics
   */
  async getConversionFunnel(filters: AnalyticsFilters) {
    await setTenantContext(filters.tenantId);
    
    const storeFilter = filters.storeIds?.length ? 
      inArray(crmLeads.storeId, filters.storeIds) : sql`true`;
    
    const funnel = await db
      .select({
        visitors: sql<number>`1000`, // Mock visitor data
        leads: sql<number>`count(distinct ${crmLeads.id})`,
        qualified: sql<number>`count(distinct case when ${crmLeads.status} = 'qualified' THEN ${crmLeads.id}END)`,
        opportunities: sql<number>`count(distinct case when ${crmLeads.status} in ('qualified', 'converted') THEN ${crmLeads.id}END)`,
        customers: sql<number>`count(distinct case when ${crmLeads.status} = 'converted' THEN ${crmLeads.id}END)`,
      })
      .from(crmLeads)
      .where(and(
        eq(crmLeads.tenantId, filters.tenantId),
        storeFilter
      ));

    const data = funnel[0];
    return [
      { stage: 'Visitors', value: data.visitors, percentage: 100 },
      { stage: 'Leads', value: data.leads, percentage: (data.leads / data.visitors) * 100 },
      { stage: 'Qualified', value: data.qualified, percentage: (data.qualified / data.visitors) * 100 },
      { stage: 'Opportunities', value: data.opportunities, percentage: (data.opportunities / data.visitors) * 100 },
      { stage: 'Customers', value: data.customers, percentage: (data.customers / data.visitors) * 100 },
    ];
  }
}

export const crmAnalyticsService = new CRMAnalyticsService();