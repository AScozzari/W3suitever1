/**
 * AI Lead Routing Service
 *
 * Analyzes customer interactions using GPT-4o to determine:
 * - Best driver (FISSO, MOBILE, ENERGIA, etc.)
 * - Target pipeline
 * - Recommended outbound channels
 * - Deal value estimation and priority
 */
export interface LeadRoutingInput {
    tenantId: string;
    leadId?: string;
    interactionType: string;
    interactionContent: string;
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    leadCompany?: string;
    acquisitionSourceId?: string;
}
export interface LeadRoutingOutput {
    recommendedDriver: string;
    driverConfidence: 'high' | 'medium' | 'low';
    driverReasoning: string;
    targetPipelineId: string | null;
    campaignSuggestion: string | null;
    primaryOutboundChannel: 'EMAIL' | 'PHONE' | 'SMS' | 'WHATSAPP' | 'IN_APP';
    secondaryOutboundChannel?: 'EMAIL' | 'PHONE' | 'SMS' | 'WHATSAPP' | 'IN_APP';
    channelReasoning: string;
    estimatedValue: number | null;
    expectedCloseDate: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    aiModel: string;
    responseTimeMs: number;
    tokenUsage: number;
    fullAiResponse: any;
    insights: {
        type: string;
        content: any;
    }[];
    nextAction: string;
    riskFactors: any[];
}
export declare class AILeadRoutingService {
    /**
     * Analyze interaction and route lead using AI
     */
    routeLead(input: LeadRoutingInput): Promise<LeadRoutingOutput>;
    /**
     * Default system prompt for lead routing
     */
    private getDefaultSystemPrompt;
    /**
     * Build user prompt with interaction context
     */
    private buildUserPrompt;
}
//# sourceMappingURL=ai-lead-routing.service.d.ts.map