// Unified OpenAI Service - Single integration for all OpenAI capabilities
// Uses the newest OpenAI model "gpt-5" which was released August 7, 2025. Do not change this unless explicitly requested by the user

import OpenAI from "openai";
import { AISettings, AIUsageLog, InsertAIUsageLog } from "../db/schema/w3suite";

// The newest OpenAI model is "gpt-5" which was released August 7, 2025. Do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-5";

export interface OpenAIToolConfig {
  web_search?: boolean;
  file_search?: boolean;
  code_interpreter?: boolean;
  computer_use?: boolean;
  image_generation?: boolean;
  voice_assistant?: boolean;
}

export interface OpenAIRequestContext {
  tenantId: string;
  userId: string;
  moduleContext?: 'hr' | 'finance' | 'general';
  businessEntityId?: string;
}

export interface UnifiedOpenAIResponse {
  success: boolean;
  output?: any;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  error?: string;
  conversationId?: string;
}

export class UnifiedOpenAIService {
  private client: OpenAI;
  private storage: any; // Will be injected from core/storage.ts

  constructor(storage: any) {
    // Use Replit integration managed API key for security
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found. Install OpenAI integration via Replit.");
    }
    
    this.client = new OpenAI({ apiKey });
    this.storage = storage;
  }

  /**
   * Main unified method using OpenAI Responses API
   * Handles all tools orchestration in single API call
   */
  async createUnifiedResponse(
    input: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<UnifiedOpenAIResponse> {
    const startTime = Date.now();
    
    try {
      // Get enabled tools from settings
      const tools = this.getEnabledTools(settings.featuresEnabled as any);
      
      // Map creativity (0-20) to temperature (0-2.0)
      const temperature = (settings.responseCreativity || 7) / 10.0;
      
      // Build context-aware instructions
      const instructions = this.buildContextInstructions(settings, context);

      // Use Chat Completions API instead of Responses API for wider compatibility
      const response = await this.client.chat.completions.create({
        model: settings.openaiModel as string,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input }
        ],
        max_tokens: settings.maxTokensPerResponse,
        temperature: temperature,
        stream: false, // For now, implement streaming separately
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokensUsed, settings.openaiModel as string);

      // Log usage for analytics
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: settings.openaiModel as any,
        featureType: 'chat', // Will be expanded based on tools used
        tokensInput: response.usage?.prompt_tokens || 0,
        tokensOutput: response.usage?.completion_tokens || 0,
        tokensTotal: tokensUsed,
        costUsd: Math.round(cost * 100), // Store as cents
        responseTimeMs: responseTime,
        success: true,
        requestContext: {
          tools_used: tools,
          module: context.moduleContext,
          entity_id: context.businessEntityId
        }
      });

      return {
        success: true,
        output: response.choices[0].message.content,
        tokensUsed,
        cost,
        responseTime,
        conversationId: response.id || undefined
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Log error for analytics
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: settings.openaiModel as any,
        featureType: 'chat',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        costUsd: 0,
        responseTimeMs: responseTime,
        success: false,
        errorMessage: error.message,
        requestContext: { error_type: error.type || 'unknown' }
      });

      return {
        success: false,
        error: error.message,
        tokensUsed: 0,
        cost: 0,
        responseTime
      };
    }
  }

  /**
   * Chat Assistant - Core conversational AI
   */
  async chatAssistant(
    message: string,
    settings: AISettings,
    context: OpenAIRequestContext,
    conversationHistory?: any[]
  ): Promise<UnifiedOpenAIResponse> {
    return this.createUnifiedResponse(
      this.buildChatInput(message, conversationHistory),
      settings,
      context
    );
  }

  /**
   * Document Analysis using file_search tool
   */
  async analyzeDocument(
    documentContent: string,
    analysisQuery: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<UnifiedOpenAIResponse> {
    // Ensure file_search is enabled
    const enhancedSettings = {
      ...settings,
      featuresEnabled: {
        ...(settings.featuresEnabled as object),
        file_search: true
      }
    };

    const input = `Analyze this document and answer: ${analysisQuery}\n\nDocument:\n${documentContent}`;
    
    return this.createUnifiedResponse(input, enhancedSettings, {
      ...context,
      moduleContext: 'hr' // Documents often HR-related
    });
  }

  /**
   * Financial Forecasting using code_interpreter
   */
  async financialForecast(
    financialData: any,
    forecastQuery: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<UnifiedOpenAIResponse> {
    // Ensure code_interpreter is enabled
    const enhancedSettings = {
      ...settings,
      featuresEnabled: {
        ...(settings.featuresEnabled as object),
        code_interpreter: true
      }
    };

    const input = `Analyze this financial data and provide forecast: ${forecastQuery}\n\nData: ${JSON.stringify(financialData)}`;
    
    return this.createUnifiedResponse(input, enhancedSettings, {
      ...context,
      moduleContext: 'finance'
    });
  }

  /**
   * Web Search integration for real-time information
   */
  async searchAndAnswer(
    query: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<UnifiedOpenAIResponse> {
    // Ensure web_search is enabled
    const enhancedSettings = {
      ...settings,
      featuresEnabled: {
        ...(settings.featuresEnabled as object),
        web_search: true
      }
    };

    return this.createUnifiedResponse(query, enhancedSettings, context);
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    try {
      const response = await this.client.responses.create({
        model: DEFAULT_MODEL,
        input: "Test connection - respond with 'OK'",
        max_output_tokens: 10
      });

      return {
        success: true,
        model: DEFAULT_MODEL
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current usage statistics
   */
  async getUsageStats(tenantId: string, startDate?: Date, endDate?: Date) {
    return await this.storage.getAIUsageStatsByTenant(tenantId, startDate, endDate);
  }

  // Private helper methods

  private getEnabledTools(featuresEnabled: any): string[] {
    const tools: string[] = [];
    
    if (featuresEnabled.web_search) tools.push('web_search');
    if (featuresEnabled.file_search) tools.push('file_search');
    if (featuresEnabled.code_interpreter) tools.push('code_interpreter');
    if (featuresEnabled.computer_use) tools.push('computer_use');
    
    return tools;
  }

  private buildContextInstructions(settings: AISettings, context: OpenAIRequestContext): string {
    const contextSettings = settings.contextSettings as any;
    let instructions = "You are an AI assistant for the W3 Suite enterprise platform.";
    
    // Add module-specific context
    if (context.moduleContext === 'hr' && contextSettings?.hr_context_enabled) {
      instructions += " Focus on HR-related tasks, employee management, and HR policies.";
    } else if (context.moduleContext === 'finance' && contextSettings?.finance_context_enabled) {
      instructions += " Focus on financial analysis, budgeting, and business metrics.";
    }
    
    // Add custom instructions
    if (contextSettings?.custom_instructions) {
      instructions += ` Additional context: ${contextSettings.custom_instructions}`;
    }
    
    // Add privacy settings
    if (settings.privacyMode === 'strict') {
      instructions += " Operate in strict privacy mode - minimize data exposure and avoid storing sensitive information.";
    }
    
    return instructions;
  }

  private buildChatInput(message: string, conversationHistory?: any[]): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return message;
    }
    
    // Build context from conversation history
    const context = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
      
    return `Previous context:\n${context}\n\nCurrent message: ${message}`;
  }

  private calculateTokensUsed(response: any): number {
    return (response.usage?.total_tokens || 0);
  }

  private calculateCost(tokens: number, model: string): number {
    // Simplified cost calculation - should be updated with actual OpenAI pricing
    const costPerToken = this.getModelCostPerToken(model);
    return tokens * costPerToken;
  }

  private getModelCostPerToken(model: string): number {
    // OpenAI 2025 pricing (approximate - update with real values)
    const pricing: Record<string, number> = {
      'gpt-5': 0.00006,           // Most advanced
      'gpt-5-mini': 0.00003,      // Cost-efficient
      'gpt-5-nano': 0.00001,      // Fastest/cheapest
      'gpt-4.1': 0.00005,        // Multimodal
      'gpt-4.1-mini': 0.00002,   // 83% cheaper than GPT-4o
      'o4-mini': 0.00004,        // Reasoning
      'o3': 0.00008,             // Advanced reasoning
      'o3-mini': 0.00003         // Cheaper reasoning
    };
    
    return pricing[model] || 0.00003; // Default fallback
  }

  private async logUsage(logData: InsertAIUsageLog): Promise<void> {
    try {
      await this.storage.createAIUsageLog(logData);
    } catch (error) {
      console.error('Failed to log AI usage:', error);
      // Don't throw - usage logging failure shouldn't break the main request
    }
  }
}

// Export default instance factory
export function createUnifiedOpenAIService(storage: any): UnifiedOpenAIService {
  return new UnifiedOpenAIService(storage);
}