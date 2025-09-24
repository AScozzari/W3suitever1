// AI Registry Service - Backward compatible wrapper for UnifiedOpenAIService
// Manages AI agent behaviors while maintaining full compatibility with existing code

import { UnifiedOpenAIService, OpenAIRequestContext, UnifiedOpenAIResponse } from './unified-openai';
import { AISettings } from '../db/schema/w3suite';
import { AgentProfile } from '../../../brand-api/src/db/schema/brand-interface';

// Extended context to support agent registry
export interface RegistryAwareContext extends OpenAIRequestContext {
  agentId?: string; // Optional - fallback to legacy behavior if not provided
}

export class AIRegistryService {
  private legacyService: UnifiedOpenAIService;
  private agentRegistry: Map<string, AgentProfile>;
  private brandDB: any; // Brand Interface database connection
  private w3suiteDB: any; // W3Suite database connection

  constructor(storage: any, brandStorage?: any) {
    // ✅ MANTENIAMO: UnifiedOpenAIService esistente invariato
    this.legacyService = new UnifiedOpenAIService(storage);
    this.agentRegistry = new Map();
    this.w3suiteDB = storage;
    this.brandDB = brandStorage; // Se disponibile per query cross-schema
    
    // Load agent registry at startup
    this.loadAgentRegistry().catch(console.error);
  }

  /**
   * BACKWARD COMPATIBLE: Main entry point
   * If no agentId provided, uses legacy UnifiedOpenAIService identical behavior
   */
  async createUnifiedResponse(
    input: string,
    settings: AISettings,
    context: RegistryAwareContext
  ): Promise<UnifiedOpenAIResponse> {
    
    // ✅ BACKWARD COMPATIBLE: se non c'è agentId, comportamento legacy identico
    if (!context.agentId) {
      return this.legacyService.createUnifiedResponse(input, settings, context);
    }

    // 🆕 NEW: Se c'è agentId, usa registry-enhanced logic
    return this.processWithRegistryAgent(input, settings, context);
  }

  /**
   * Enhanced processing with agent registry
   */
  private async processWithRegistryAgent(
    input: string,
    settings: AISettings,
    context: RegistryAwareContext
  ): Promise<UnifiedOpenAIResponse> {
    
    const agent = this.agentRegistry.get(context.agentId!);
    
    // Fallback to legacy if agent not found
    if (!agent) {
      console.warn(`Agent ${context.agentId} not found in registry, falling back to legacy`);
      return this.legacyService.createUnifiedResponse(input, settings, context);
    }

    // Build enhanced context with agent personality
    const enhancedContext: OpenAIRequestContext = {
      ...context,
      moduleContext: this.mapAgentToModule(agent.moduleContext) as any
    };

    // Override system prompt with agent-specific instructions
    const enhancedInput = this.buildAgentEnhancedPrompt(input, agent);

    // Use existing UnifiedOpenAIService with enhanced context
    return this.legacyService.createUnifiedResponse(enhancedInput, settings, enhancedContext);
  }

  /**
   * Load agent registry from Brand Interface
   */
  private async loadAgentRegistry(): Promise<void> {
    try {
      // For now, mock data - will be replaced with actual DB query in FASE 2
      const mockAgents: AgentProfile[] = [
        {
          id: 'tippy-sales-id',
          agentId: 'tippy-sales',
          name: 'Tippy - Sales Assistant',
          description: 'Assistente vendite WindTre specializzato in supporto commerciale',
          systemPrompt: 'Sei Tippy, assistente AI specializzato nel supporto vendite WindTre. Aiuti con informazioni su offerte, piani tariffari, supporto commerciale e costruzione pitch per clienti business. Rispondi sempre in italiano con tono amichevole e professionale.',
          personality: {
            tone: 'friendly',
            style: 'professional',
            expertise: 'sales',
            brand: 'windtre'
          },
          moduleContext: 'sales',
          baseConfiguration: {
            default_model: 'gpt-4-turbo',
            temperature: 0.7,
            max_tokens: 1000,
            features: ['web_search', 'document_analysis']
          },
          version: 1,
          status: 'active'
        }
      ];

      // Load mock agents into registry
      mockAgents.forEach(agent => {
        this.agentRegistry.set(agent.agentId, agent);
      });

      console.log(`✅ AI Registry loaded with ${mockAgents.length} agents`);
      
    } catch (error) {
      console.error('Failed to load agent registry:', error);
      // Continue with empty registry - fallback to legacy behavior
    }
  }

  /**
   * Build agent-enhanced prompt with personality
   */
  private buildAgentEnhancedPrompt(input: string, agent: AgentProfile): string {
    let enhancedPrompt = agent.systemPrompt;

    // Add personality context
    if (agent.personality.tone) {
      enhancedPrompt += ` Mantieni un tono ${agent.personality.tone}.`;
    }
    
    if (agent.personality.style) {
      enhancedPrompt += ` Usa uno stile ${agent.personality.style}.`;
    }

    if (agent.personality.expertise) {
      enhancedPrompt += ` Concentrati sulla tua expertise in ${agent.personality.expertise}.`;
    }

    enhancedPrompt += `\n\nUser Question: ${input}`;
    
    return enhancedPrompt;
  }

  /**
   * Map agent module context to existing moduleContext enum
   */
  private mapAgentToModule(agentModule: string): string {
    const moduleMap: Record<string, string> = {
      'sales': 'general', // Map to existing enum
      'hr': 'hr',
      'finance': 'finance',
      'operations': 'general',
      'support': 'general',
      'general': 'general'
    };

    return moduleMap[agentModule] || 'general';
  }

  /**
   * Get available agents for a tenant
   */
  async getAvailableAgents(tenantId: string): Promise<AgentProfile[]> {
    // TODO: Filter based on tenant active_agents settings
    return Array.from(this.agentRegistry.values()).filter(agent => agent.status === 'active');
  }

  /**
   * Compatibility method - delegate to legacy service  
   */
  async generateEmbedding(...args: any[]): Promise<any> {
    return this.legacyService.generateEmbedding(...args);
  }

  /**
   * Compatibility method - delegate chat assistant
   */
  async chatAssistant(...args: any[]): Promise<any> {
    return this.legacyService.chatAssistant(...args);
  }

  /**
   * Compatibility method - delegate document analysis
   */
  async analyzeDocument(...args: any[]): Promise<any> {
    return this.legacyService.analyzeDocument(...args);
  }
}