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
import { crmLeads } from '../db/schema/w3suite';
import { aiAgentsRegistry } from '../../../brand-api/src/db/index.js';
import { eq, and } from 'drizzle-orm';

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
      
      // 1. Fetch lead data from database
      const leadData = await db.select()
        .from(crmLeads)
        .where(and(
          eq(crmLeads.id, input.leadId),
          eq(crmLeads.tenantId, input.tenantId)
        ))
        .limit(1);
      
      if (!leadData || leadData.length === 0) {
        throw new Error(`Lead ${input.leadId} not found for tenant ${input.tenantId}`);
      }
      
      const lead = leadData[0];
      
      // 2. Get AI agent configuration from Brand Interface
      const agentConfig = await db.select()
        .from(aiAgentsRegistry)
        .where(and(
          eq(aiAgentsRegistry.agentId, 'lead-scoring-assistant'),
          eq(aiAgentsRegistry.status, 'active'),
          eq(aiAgentsRegistry.deployToAllTenants, true)
        ))
        .limit(1);
      
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
          company: lead.company || '',
          role: lead.jobTitle || 'Unknown',
          sector: lead.industry || 'Unknown',
          source: lead.source || 'Unknown',
          utmSource: lead.utmSource || null,
          utmMedium: lead.utmMedium || null,
          utmCampaign: lead.utmCampaign || null,
          notes: lead.notes || ''
        },
        engagementMetrics: {
          // Using existing engagementScore as proxy for overall engagement
          engagementScore: lead.engagementScore || 0,
          // Derived metrics (TODO: Add detailed tracking fields to schema)
          estimatedSiteVisits: lead.engagementScore ? Math.floor(lead.engagementScore / 10) : 1,
          estimatedTimeOnSite: lead.engagementScore ? lead.engagementScore * 30 : 0, // seconds
          estimatedPagesViewed: lead.engagementScore ? Math.ceil(lead.engagementScore / 20) : 1,
          // Placeholder - will be populated when tracking is implemented
          emailOpens: 0,
          emailClicks: 0,
          formsSubmitted: lead.source === 'web_form' ? 1 : 0,
          resourcesDownloaded: 0
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
      
      // 6. Return structured output
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
