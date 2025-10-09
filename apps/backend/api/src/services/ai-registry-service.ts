// AI Registry Service - Backward compatible wrapper for UnifiedOpenAIService
// Manages AI agent behaviors while maintaining full compatibility with existing code

import { UnifiedOpenAIService, OpenAIRequestContext, UnifiedOpenAIResponse } from './unified-openai';
import { AISettings, aiAgentTenantSettings } from '../db/schema/w3suite';
import { AgentProfile } from '../../../brand-api/src/db/schema/brand-interface';
import { db as brandDB, aiAgentsRegistry } from '../../../brand-api/src/db/index.js';
import { db } from '../core/db';
import { eq } from 'drizzle-orm';

// Extended context to support agent registry
export interface RegistryAwareContext extends OpenAIRequestContext {
  agentId?: string; // Optional - fallback to legacy behavior if not provided
}

export class AIRegistryService {
  private legacyService: UnifiedOpenAIService;
  private agentRegistry: Map<string, AgentProfile>;
  private brandDB: any; // Brand Interface database connection
  private w3suiteDB: any; // W3Suite database connection
  private registryLoaded: Promise<void> | null = null;

  constructor(storage: any, brandStorage?: any) {
    // ✅ MANTENIAMO: UnifiedOpenAIService esistente invariato
    this.legacyService = new UnifiedOpenAIService(storage);
    this.agentRegistry = new Map();
    this.w3suiteDB = storage;
    this.brandDB = brandStorage; // Se disponibile per query cross-schema
    
    // Lazy load: registry will be loaded on first use
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
    
    // Lazy load: load registry on first use if not already loaded
    if (!this.registryLoaded) {
      this.registryLoaded = this.loadAgentRegistry();
    }
    await this.registryLoaded;
    
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

    // Build enhanced settings with agent-specific system prompt
    // Priority: settings.systemPrompt (if provided) > agent.systemPrompt
    const enhancedSettings = {
      ...settings,
      systemPrompt: settings.systemPrompt ?? this.buildAgentSystemPrompt(agent)
    };

    // Use existing UnifiedOpenAIService with enhanced context and settings
    return this.legacyService.createUnifiedResponse(input, enhancedSettings, enhancedContext);
  }

  /**
   * Load agent registry from Brand Interface
   */
  private async loadAgentRegistry(): Promise<void> {
    try {
      console.log('🔄 Loading AI agents from brand_interface.ai_agents_registry...');
      
      // 🆕 REAL DATABASE QUERY: Fetch active agents from brand_interface schema
      const activeAgents = await brandDB.select()
        .from(aiAgentsRegistry)
        .where(eq(aiAgentsRegistry.status, 'active'));

      console.log(`📊 Found ${activeAgents.length} active agents in database`);

      // Load real agents into registry
      activeAgents.forEach((agent: any) => {
        // Convert database agent to AgentProfile format
        const agentProfile: AgentProfile = {
          id: agent.id,
          agentId: agent.agentId,
          name: agent.name,
          description: agent.description || '',
          systemPrompt: agent.systemPrompt,
          personality: agent.personality || {},
          moduleContext: agent.moduleContext,
          baseConfiguration: agent.baseConfiguration || {
            default_model: 'gpt-4-turbo',
            temperature: 0.7,
            max_tokens: 1000
          },
          version: agent.version,
          status: agent.status
        };
        
        this.agentRegistry.set(agent.agentId, agentProfile);
        console.log(`✅ Loaded agent: ${agent.agentId} (${agent.name})`);
      });

      console.log(`✅ AI Registry loaded with ${activeAgents.length} agents from database`);
      
    } catch (error) {
      console.error('❌ Failed to load agent registry from database:', error);
      console.log('🔄 Falling back to Tippy mock agent for backward compatibility...');
      
      // FALLBACK: Load only Tippy as backup to maintain backward compatibility
      const fallbackAgent: AgentProfile = {
        id: 'tippy-sales-id',
        agentId: 'tippy-sales',
        name: 'Tippy - Sales Assistant (Fallback)',
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
      };
      
      this.agentRegistry.set(fallbackAgent.agentId, fallbackAgent);
      console.log('✅ Fallback Tippy agent loaded for backward compatibility');
    }
  }

  /**
   * Build agent system prompt with personality
   */
  private buildAgentSystemPrompt(agent: AgentProfile): string {
    let systemPrompt = agent.systemPrompt;

    // Add personality context
    if (agent.personality.tone) {
      systemPrompt += ` Mantieni un tono ${agent.personality.tone}.`;
    }
    
    if (agent.personality.style) {
      systemPrompt += ` Usa uno stile ${agent.personality.style}.`;
    }

    if (agent.personality.expertise) {
      systemPrompt += ` Concentrati sulla tua expertise in ${agent.personality.expertise}.`;
    }
    
    return systemPrompt;
  }

  /**
   * Map agent module context to existing moduleContext enum
   */
  private mapAgentToModule(agentModule: string): string {
    const moduleMap: Record<string, string> = {
      'sales': 'sales',
      'hr': 'hr', 
      'finance': 'finance',
      'marketing': 'marketing',
      'support': 'support',
      'operations': 'operations', 
      'general': 'general'
    };

    return moduleMap[agentModule] || 'general';
  }

  /**
   * Get available agents for a tenant with isEnabled status from ai_agent_tenant_settings
   */
  async getAvailableAgents(tenantId: string): Promise<AgentProfile[]> {
    // Get active agents from registry
    const activeAgents = Array.from(this.agentRegistry.values()).filter(agent => agent.status === 'active');
    
    // Fetch tenant-specific settings for each agent
    const agentSettings = await db
      .select()
      .from(aiAgentTenantSettings)
      .where(eq(aiAgentTenantSettings.tenantId, tenantId));
    
    // Create a map for quick lookup
    const settingsMap = new Map(
      agentSettings.map(setting => [setting.agentId, setting.isEnabled])
    );
    
    // Enrich agents with isEnabled status (default to false - agents must be explicitly enabled)
    return activeAgents.map(agent => ({
      ...agent,
      isEnabled: settingsMap.get(agent.agentId) ?? false
    }));
  }

  /**
   * Compatibility method - delegate to legacy service  
   */
  async generateEmbedding(text: string, settings: any, context: any): Promise<any> {
    return this.legacyService.generateEmbedding(text, settings, context);
  }

  /**
   * Compatibility method - delegate chat assistant
   */
  async chatAssistant(message: string, settings: any, context: any, conversationHistory?: any[]): Promise<any> {
    return this.legacyService.chatAssistant(message, settings, context, conversationHistory);
  }

  /**
   * Compatibility method - delegate document analysis
   */
  async analyzeDocument(documentContent: string, analysisQuery: string, settings: any, context: any): Promise<any> {
    return this.legacyService.analyzeDocument(documentContent, analysisQuery, settings, context);
  }
}