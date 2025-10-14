/**
 * AI Lead Routing Service
 * 
 * Analyzes customer interactions using GPT-4o to determine:
 * - Best driver (FISSO, MOBILE, ENERGIA, etc.)
 * - Target pipeline
 * - Recommended outbound channels
 * - Deal value estimation and priority
 */

import OpenAI from 'openai';
import { logger } from '../core/logger';
import { db, setTenantContext } from '../core/db';
import { drivers } from '../db/schema/public';
import { crmPipelines } from '../db/schema/w3suite';
import { aiAgentsRegistry } from '../db/schema/brand-interface';
import { eq, and, sql } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LeadRoutingInput {
  tenantId: string;
  leadId?: string;
  
  // Interaction context
  interactionType: string; // e.g., 'social_post_view', 'email_open', 'webinar', 'contact_form'
  interactionContent: string; // Content that AI will analyze
  
  // Lead information (optional)
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadCompany?: string;
  
  // Additional context
  acquisitionSourceId?: string;
}

export interface LeadRoutingOutput {
  // Driver recommendation
  recommendedDriver: string; // UUID
  driverConfidence: 'high' | 'medium' | 'low';
  driverReasoning: string;
  
  // Pipeline assignment
  targetPipelineId: string | null;
  campaignSuggestion: string | null;
  
  // Channel recommendation
  primaryOutboundChannel: 'EMAIL' | 'PHONE' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  secondaryOutboundChannel?: 'EMAIL' | 'PHONE' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  channelReasoning: string;
  
  // Value estimation
  estimatedValue: number | null;
  expectedCloseDate: string | null; // ISO date
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // AI metadata
  aiModel: string;
  responseTimeMs: number;
  tokenUsage: number;
  fullAiResponse: any;
  
  // Insights
  insights: {
    type: string;
    content: any;
  }[];
  nextAction: string;
  riskFactors: any[];
}

export class AILeadRoutingService {
  /**
   * Analyze interaction and route lead using AI
   */
  async routeLead(input: LeadRoutingInput): Promise<LeadRoutingOutput> {
    const startTime = Date.now();
    
    try {
      // 🔒 CRITICAL: Set tenant context for RLS before any w3suite table access
      await setTenantContext(input.tenantId);
      
      // 1. Fetch available drivers for this tenant
      const availableDrivers = await db.select({
        id: drivers.id,
        name: drivers.name,
        category: drivers.category,
      }).from(drivers);
      
      // 2. Fetch available pipelines for this tenant (RLS enforced)
      const availablePipelines = await db.select({
        id: crmPipelines.id,
        name: crmPipelines.name,
        driver: crmPipelines.driver,
      })
      .from(crmPipelines)
      .where(eq(crmPipelines.tenantId, input.tenantId));
      
      // 3. Get AI agent configuration from Brand Interface
      // Note: aiAgentsRegistry is in brand_interface schema (no RLS), but we scope to deployToAllTenants=true
      const agentConfig = await db.select()
        .from(aiAgentsRegistry)
        .where(and(
          eq(aiAgentsRegistry.agentId, 'lead-routing-assistant'),
          eq(aiAgentsRegistry.status, 'active'),
          eq(aiAgentsRegistry.deployToAllTenants, true) // Only get globally-deployed agents
        ))
        .limit(1);
      
      const agent = agentConfig[0];
      const baseConfig = agent?.baseConfiguration as any || {};
      
      const model = baseConfig.default_model || 'gpt-4o';
      const temperature = baseConfig.temperature || 0.2;
      const maxTokens = baseConfig.max_tokens || 1500;
      const systemPrompt = agent?.systemPrompt || this.getDefaultSystemPrompt();
      
      logger.info('AI Lead Routing Agent loaded', {
        agentId: agent?.agentId || 'default',
        model,
        temperature,
        maxTokens: maxTokens
      });
      
      // 4. Build AI prompt
      const userPrompt = this.buildUserPrompt(input, availableDrivers, availablePipelines);
      
      // 5. Call OpenAI API
      const completion = await openai.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      });
      
      const responseTimeMs = Date.now() - startTime;
      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
      
      // 6. Map AI response to output format
      const output: LeadRoutingOutput = {
        recommendedDriver: aiResponse.driver_id,
        driverConfidence: aiResponse.driver_confidence || 'medium',
        driverReasoning: aiResponse.driver_reasoning || '',
        
        targetPipelineId: aiResponse.pipeline_id || null,
        campaignSuggestion: aiResponse.campaign_suggestion || null,
        
        primaryOutboundChannel: aiResponse.primary_channel || 'EMAIL',
        secondaryOutboundChannel: aiResponse.secondary_channel,
        channelReasoning: aiResponse.channel_reasoning || '',
        
        estimatedValue: aiResponse.estimated_value || null,
        expectedCloseDate: aiResponse.expected_close_date || null,
        priority: aiResponse.priority || 'medium',
        
        aiModel: model,
        responseTimeMs,
        tokenUsage: completion.usage?.total_tokens || 0,
        fullAiResponse: aiResponse,
        
        insights: aiResponse.insights || [],
        nextAction: aiResponse.next_action || '',
        riskFactors: aiResponse.risk_factors || [],
      };
      
      logger.info('AI Lead Routing completed', {
        leadId: input.leadId,
        driver: output.recommendedDriver,
        confidence: output.driverConfidence,
        responseTimeMs,
        tokenUsage: output.tokenUsage,
      });
      
      return output;
      
    } catch (error) {
      logger.error('AI Lead Routing failed', {
        error,
        leadId: input.leadId,
        interactionType: input.interactionType,
      });
      throw error;
    }
  }
  
  /**
   * Default system prompt for lead routing
   */
  private getDefaultSystemPrompt(): string {
    return `You are an expert lead routing AI for a telecommunications company (WindTre).

Your task is to analyze customer interactions and determine:
1. **Driver**: Which product/service category fits best (FISSO, MOBILE, ENERGIA, DEVICE, ACCESSORI, ASSICURAZIONE, PROTEZIONE, CUSTOMER_BASE)
2. **Pipeline**: Which sales pipeline should handle this lead
3. **Channels**: Best communication channels to reach the customer
4. **Value & Priority**: Deal value estimation and urgency

## Driver Categories:
- **FISSO**: Fixed-line internet, fiber optic (keywords: fibra, casa, wifi, adsl, connessione fissa)
- **MOBILE**: Mobile plans, SIM cards (keywords: mobile, sim, giga, minuti, ricarica)
- **ENERGIA**: Energy/utilities (keywords: luce, gas, energia, bolletta)
- **DEVICE**: Smartphones, tablets (keywords: smartphone, telefono, iPhone, Samsung, tablet)
- **ACCESSORI**: Accessories (keywords: cover, cuffie, caricatore, accessori)
- **ASSICURAZIONE**: Insurance products (keywords: assicurazione, protezione dispositivo)
- **PROTEZIONE**: Device protection (keywords: garanzia, copertura, protezione)
- **CUSTOMER_BASE**: Existing customers, upsell/cross-sell (keywords: cliente, upgrade, passa a)

## Channel Selection:
- **WHATSAPP**: Young audience (18-35), quick questions, mobile-first
- **EMAIL**: Detailed information, documents, formal communication
- **PHONE**: High-value deals, complex questions, urgent matters
- **SMS**: Reminders, confirmations, short updates
- **IN_APP**: App users, digital-native customers

## Response Format (JSON):
{
  "driver_id": "uuid-of-driver",
  "driver_confidence": "high|medium|low",
  "driver_reasoning": "Why this driver was selected",
  "pipeline_id": "uuid-of-pipeline",
  "campaign_suggestion": "Suggested campaign name",
  "primary_channel": "WHATSAPP|EMAIL|PHONE|SMS|IN_APP",
  "secondary_channel": "WHATSAPP|EMAIL|PHONE|SMS|IN_APP",
  "channel_reasoning": "Why these channels",
  "estimated_value": 500,
  "expected_close_date": "2025-11-15",
  "priority": "low|medium|high|urgent",
  "insights": [
    {"type": "customer_intent", "content": "Wants fiber internet for home"},
    {"type": "pain_points", "content": "Current provider too slow"}
  ],
  "next_action": "Send fiber plans comparison via WhatsApp",
  "risk_factors": [
    {"risk": "price_sensitive", "mitigation": "Offer promotional pricing"}
  ]
}`;
  }
  
  /**
   * Build user prompt with interaction context
   */
  private buildUserPrompt(
    input: LeadRoutingInput,
    drivers: any[],
    pipelines: any[]
  ): string {
    return `## Customer Interaction Analysis

**Interaction Type**: ${input.interactionType}

**Interaction Content**:
${input.interactionContent}

${input.leadName ? `**Lead Name**: ${input.leadName}` : ''}
${input.leadEmail ? `**Lead Email**: ${input.leadEmail}` : ''}
${input.leadPhone ? `**Lead Phone**: ${input.leadPhone}` : ''}
${input.leadCompany ? `**Lead Company**: ${input.leadCompany}` : ''}

---

## Available Drivers:
${drivers.map(d => `- **${d.name}** (${d.category}) - ID: ${d.id}`).join('\n')}

## Available Pipelines:
${pipelines.map(p => `- **${p.name}** (Driver: ${p.driver}) - ID: ${p.id}`).join('\n')}

---

Analyze this interaction and provide routing recommendations in JSON format.`;
  }
}
