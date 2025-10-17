/**
 * AI Lead Scoring Service
 * 
 * Uses GPT-4o to calculate lead score (0-100) based on:
 * - UTM tracking data (source, medium, campaign)
 * - Engagement metrics (email opens, clicks, site visits)
 * - Company fit (industry, size, role)
 * - Site behavior (pages viewed, time spent)
 * - Social ads quality (Facebook/Instagram relevance)
 */

import OpenAI from 'openai';
import { logger } from '../core/logger';
import { db, setTenantContext } from '../core/db';
import { crmLeads, users, roles, userAssignments } from '../db/schema/w3suite';
import { db as brandDb, aiAgentsRegistry } from '../../../brand-api/src/db/index.js';
import { eq, and, inArray, or, isNull } from 'drizzle-orm';
import { notificationService } from '../core/notification-service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LeadScoringInput {
  leadId: string;
  tenantId: string;
}

export interface LeadScoringFactors {
  utm_score: number;
  engagement_score: number;
  fit_score: number;
  behavior_score: number;
  social_quality_score: number;
  bonus: number;
  penalty: number;
}

export interface LeadScoringOutput {
  score: number;
  confidence: number;
  factors: LeadScoringFactors;
  reasoning: string;
  category: 'cold' | 'warm' | 'hot' | 'very_hot';
  recommended_actions: string[];
  conversion_probability: string;
  estimated_value: string;
  
  // Metadata
  aiModel: string;
  responseTimeMs: number;
  tokenUsage: number;
}

export class LeadScoringAIService {
  /**
   * Calculate lead score using AI agent
   */
  async calculateLeadScore(input: LeadScoringInput): Promise<LeadScoringOutput> {
    const startTime = Date.now();
    
    try {
      // 🔒 CRITICAL: Set tenant context for RLS before any w3suite table access
      await setTenantContext(input.tenantId);
      
      logger.info('🔍 Step 1: Fetching lead data', {
        leadId: input.leadId,
        tenantId: input.tenantId
      });
      
      // 1. Fetch lead data from database
      const leadQuery = db.select()
        .from(crmLeads)
        .where(and(
          eq(crmLeads.id, input.leadId),
          eq(crmLeads.tenantId, input.tenantId)
        ))
        .limit(1);
      
      // DEBUG: Log the lead query SQL
      try {
        const leadSql = leadQuery.toSQL();
        logger.info('🔍 Lead Query SQL Debug', {
          sql: leadSql.sql,
          params: leadSql.params
        });
      } catch (sqlError: any) {
        logger.error('Failed to generate lead SQL', { error: sqlError.message });
      }
      
      const leadData = await leadQuery;
      
      if (!leadData || leadData.length === 0) {
        throw new Error(`Lead ${input.leadId} not found for tenant ${input.tenantId}`);
      }
      
      const lead = leadData[0];
      
      logger.info('🔍 Step 2: Lead data fetched successfully', {
        leadId: lead.id,
        email: lead.email
      });
      
      // 2. Get AI agent configuration from Brand Interface
      // Note: targetTenants IS NULL means agent is deployed to all tenants
      const agentQuery = brandDb.select()
        .from(aiAgentsRegistry)
        .where(and(
          eq(aiAgentsRegistry.agentId, 'lead-scoring-assistant'),
          eq(aiAgentsRegistry.status, 'active'),
          isNull(aiAgentsRegistry.targetTenants)
        ))
        .limit(1);
      
      // DEBUG: Log the generated SQL
      const sqlDebug = agentQuery.toSQL();
      logger.info('🔍 AI Agent Query SQL Debug', {
        sql: sqlDebug.sql,
        params: sqlDebug.params,
        leadId: input.leadId
      });
      
      const agentConfig = await agentQuery;
      
      const agent = agentConfig[0];
      const baseConfig = agent?.baseConfiguration as any || {};
      
      const model = baseConfig.default_model || 'gpt-4o';
      const temperature = baseConfig.temperature || 0.1;
      const maxTokens = baseConfig.max_tokens || 2000;
      const systemPrompt = agent?.systemPrompt || this.getDefaultSystemPrompt();
      
      logger.info('AI Lead Scoring Agent loaded', {
        agentId: agent?.agentId || 'default',
        model,
        temperature,
        leadId: input.leadId,
        tenantId: input.tenantId
      });
      
      // 3. Build input context for AI
      // Note: Using available fields from schema. Future enhancement: add detailed engagement tracking
      const leadContext = {
        leadData: {
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          email: lead.email || '',
          phone: lead.phone || '',
          company: lead.companyName || '',
          role: lead.jobTitle || 'Unknown',
          companyRole: lead.companyRole || null,
          sector: lead.companySector || 'Unknown',
          source: lead.leadSource || 'Unknown',
          utmSource: lead.utmSource || null,
          utmMedium: lead.utmMedium || null,
          utmCampaign: lead.utmCampaign || null,
          notes: lead.notes || ''
        },
        companyDetails: {
          companySize: lead.companySize || null,
          employeeCount: lead.employeeCount || null,
          annualRevenue: lead.annualRevenue || null,
          companySector: lead.companySector || null
        },
        purchaseIntent: {
          budgetRange: lead.budgetRange || null,
          purchaseTimeframe: lead.purchaseTimeframe || null,
          productInterest: lead.productInterest || null,
          painPoints: lead.painPoints || null
        },
        engagementMetrics: {
          // Using existing engagementScore as proxy for overall engagement
          engagementScore: lead.engagementScore || 0,
          // GTM events tracking
          pageViewsCount: lead.pageViewsCount || 0,
          documentsDownloaded: lead.documentsDownloaded || 0,
          videosWatched: lead.videosWatched || 0,
          sessionDuration: lead.sessionDuration || 0,
          emailOpensCount: lead.emailsOpenedCount || 0,
          emailClicksCount: lead.emailsClickedCount || 0,
          formsSubmitted: lead.formsSubmitted || (lead.leadSource === 'web_form' ? 1 : 0),
          gtmEvents: lead.gtmEvents ? (typeof lead.gtmEvents === 'string' ? JSON.parse(lead.gtmEvents) : lead.gtmEvents) : []
        },
        socialMetrics: {
          // TODO: Add social metrics tracking fields to schema
          facebookRelevanceScore: null,
          instagramEngagementRate: null,
          linkedinFormQuality: null
        },
        context: {
          tenantId: input.tenantId,
          existingCustomer: false, // TODO: Check if lead is from existing customer
          previousInteractions: 0 // TODO: Count previous interactions
        }
      };
      
      const userPrompt = `Analizza questo lead e calcola il lead score 0-100:

${JSON.stringify(leadContext, null, 2)}

Rispondi con JSON valido seguendo esattamente il formato richiesto.`;
      
      // 4. Call OpenAI with agent's system prompt
      const completion = await openai.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });
      
      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from AI agent');
      }
      
      // 5. Parse AI response
      const aiResponse = JSON.parse(responseContent);
      
      const responseTimeMs = Date.now() - startTime;
      const tokenUsage = completion.usage?.total_tokens || 0;
      
      logger.info('AI Lead Scoring completed', {
        leadId: input.leadId,
        score: aiResponse.score,
        category: aiResponse.category,
        responseTimeMs,
        tokenUsage
      });
      
      // 6. Auto-notify team if hot lead detected (score >= 80)
      if (aiResponse.score >= 80) {
        try {
          // Find sales managers and team leaders
          const salesRoles = await db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(
              and(
                eq(roles.tenantId, input.tenantId),
                or(
                  eq(roles.name, 'sales_manager'),
                  eq(roles.name, 'team_leader')
                )
              )
            );

          if (salesRoles.length > 0) {
            const roleIds = salesRoles.map(r => r.id);
            
            // Get users with these roles
            const salesUsers = await db
              .select({ 
                userId: userAssignments.userId,
                firstName: users.firstName,
                lastName: users.lastName
              })
              .from(userAssignments)
              .innerJoin(users, eq(users.id, userAssignments.userId))
              .where(
                and(
                  inArray(userAssignments.roleId, roleIds),
                  eq(users.tenantId, input.tenantId)
                )
              );

            // Send notification to each sales user
            for (const salesUser of salesUsers) {
              await notificationService.sendDirectNotification(
                input.tenantId,
                salesUser.userId,
                '🔥 Hot Lead Detected',
                `Lead "${lead.firstName} ${lead.lastName}" scored ${aiResponse.score}/100. ${aiResponse.reasoning}`,
                {
                  priority: 'high',
                  url: `/crm/leads/${input.leadId}`
                }
              );
            }

            logger.info('Hot lead notifications sent', {
              leadId: input.leadId,
              score: aiResponse.score,
              recipientCount: salesUsers.length
            });
          }
        } catch (notifyError) {
          logger.error('Failed to send hot lead notifications', {
            error: notifyError,
            leadId: input.leadId,
            score: aiResponse.score
          });
          // Don't throw - notification failure shouldn't break scoring
        }
      }
      
      // 7. Return structured output
      return {
        score: aiResponse.score || 0,
        confidence: aiResponse.confidence || 0,
        factors: aiResponse.factors || {
          utm_score: 0,
          engagement_score: 0,
          fit_score: 0,
          behavior_score: 0,
          social_quality_score: 0,
          bonus: 0,
          penalty: 0
        },
        reasoning: aiResponse.reasoning || '',
        category: aiResponse.category || 'cold',
        recommended_actions: aiResponse.recommended_actions || [],
        conversion_probability: aiResponse.conversion_probability || '0%',
        estimated_value: aiResponse.estimated_value || '€0',
        aiModel: model,
        responseTimeMs,
        tokenUsage
      };
      
    } catch (error) {
      logger.error('AI Lead Scoring failed', {
        error,
        leadId: input.leadId,
        tenantId: input.tenantId
      });
      
      // Fallback: return default low score
      return {
        score: 0,
        confidence: 0,
        factors: {
          utm_score: 0,
          engagement_score: 0,
          fit_score: 0,
          behavior_score: 0,
          social_quality_score: 0,
          bonus: 0,
          penalty: 0
        },
        reasoning: `AI scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category: 'cold',
        recommended_actions: ['Review lead data manually'],
        conversion_probability: '0%',
        estimated_value: '€0',
        aiModel: 'gpt-4o',
        responseTimeMs: Date.now() - startTime,
        tokenUsage: 0
      };
    }
  }
  
  /**
   * Fallback system prompt if agent not found in registry
   */
  private getDefaultSystemPrompt(): string {
    return `Sei un esperto di lead scoring predittivo.
    
Analizza i dati del lead e calcola uno score 0-100 basato su:
- Canale UTM (source, medium, campaign)
- Engagement (email opens, clicks, visite)
- Fit aziendale (settore, dimensione, ruolo)
- Comportamento sito (tempo, pagine viste)

Rispondi con JSON:
{
  "score": 0-100,
  "confidence": 0-100,
  "factors": { ... },
  "reasoning": "...",
  "category": "cold|warm|hot|very_hot",
  "recommended_actions": [],
  "conversion_probability": "X%",
  "estimated_value": "€X"
}`;
  }
}

export const leadScoringService = new LeadScoringAIService();
