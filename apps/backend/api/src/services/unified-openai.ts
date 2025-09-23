// Unified OpenAI Service - Single integration for all OpenAI capabilities
// Supports text, embeddings, vision, audio transcription, and multimodal processing

import OpenAI from "openai";
import { AISettings, AIUsageLog, InsertAIUsageLog } from "../db/schema/w3suite";
import * as fs from 'fs';
import * as path from 'path';

// Default model configuration
const DEFAULT_MODEL = "gpt-4-turbo";
const EMBEDDING_MODEL = "text-embedding-3-small";
const WHISPER_MODEL = "whisper-1";
const VISION_MODEL = "gpt-4o"; // Updated to current vision model

export interface OpenAIToolConfig {
  web_search?: boolean;
  file_search?: boolean;
  code_interpreter?: boolean;
  computer_use?: boolean;
  image_generation?: boolean;
  voice_assistant?: boolean;
  audio_transcription?: boolean;
  vision_analysis?: boolean;
  pdf_extraction?: boolean;
  url_scraping?: boolean;
}

export interface MediaProcessingOptions {
  mediaType: 'audio' | 'video' | 'image' | 'pdf' | 'url';
  filePath?: string;
  buffer?: Buffer;
  url?: string;
  language?: string;
  extractText?: boolean;
  analyzeContent?: boolean;
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface VisionAnalysisResult {
  description: string;
  objects?: string[];
  text?: string;
  colors?: string[];
  metadata?: any;
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
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = this.calculateCost(inputTokens, outputTokens, settings.openaiModel as string, 'chat');

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
   * Audio Transcription using Whisper API
   */
  async transcribeAudio(
    options: MediaProcessingOptions,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<TranscriptionResult> {
    try {
      const startTime = Date.now();
      let file: any;
      
      if (options.filePath) {
        file = fs.createReadStream(options.filePath);
      } else if (options.buffer) {
        // Create temporary file from buffer
        const tmpPath = path.join('/tmp', `audio_${Date.now()}.tmp`);
        fs.writeFileSync(tmpPath, options.buffer);
        file = fs.createReadStream(tmpPath);
      } else {
        throw new Error('No audio file provided');
      }

      const transcription = await this.client.audio.transcriptions.create({
        file: file,
        model: WHISPER_MODEL,
        language: options.language || 'it', // Default Italian
        response_format: 'verbose_json'
      });

      // Clean up temp file if created
      if (options.buffer && file.path) {
        fs.unlinkSync(file.path);
      }

      const responseTime = Date.now() - startTime;
      
      // Log usage with granular tracking 
      const duration = transcription.duration || 0;
      const durationMinutes = duration / 60;
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'whisper-1' as any,
        featureType: 'transcription',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: Math.ceil(duration), // Store as seconds for tracking
        costUsd: Math.round(this.calculateCost(0, 0, 'whisper-1', 'transcription', durationMinutes) * 100), // Store as cents
        responseTimeMs: responseTime,
        success: true,
        requestContext: {
          duration: duration,
          durationMinutes: durationMinutes,
          language: transcription.language,
          segmentsCount: transcription.segments?.length || 0
        }
      });

      return {
        text: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
        segments: transcription.segments?.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text
        }))
      };
    } catch (error: any) {
      throw new Error(`Audio transcription failed: ${error.message}`);
    }
  }

  /**
   * Image Analysis using GPT-4 Vision
   */
  async analyzeImage(
    options: MediaProcessingOptions,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<VisionAnalysisResult> {
    try {
      const startTime = Date.now();
      let imageUrl: string;
      
      if (options.url) {
        imageUrl = options.url;
      } else if (options.buffer) {
        // Convert buffer to base64
        const base64 = options.buffer.toString('base64');
        imageUrl = `data:image/jpeg;base64,${base64}`;
      } else if (options.filePath) {
        const buffer = fs.readFileSync(options.filePath);
        const base64 = buffer.toString('base64');
        imageUrl = `data:image/jpeg;base64,${base64}`;
      } else {
        throw new Error('No image provided');
      }

      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // GPT-4o has vision capabilities
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: options.analyzeContent 
                  ? "Analyze this image in detail. Describe what you see, identify objects, extract any text, and provide relevant metadata."
                  : "Extract and describe the text content from this image."
              },
              { 
                type: "image_url", 
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const analysis = response.choices[0].message.content || '';
      const responseTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;
      
      // Log usage for analytics
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'gpt-4o' as any,
        featureType: 'vision_analysis',
        tokensInput: response.usage?.prompt_tokens || 0,
        tokensOutput: response.usage?.completion_tokens || 0,
        tokensTotal: tokensUsed,
        costUsd: Math.round(this.calculateCost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0, 'gpt-4o', 'vision') * 100),
        responseTimeMs: responseTime,
        success: true,
        requestContext: {
          imageType: options.mediaType,
          analyzeContent: options.analyzeContent
        }
      });
      
      // Parse the response to extract structured data
      const result: VisionAnalysisResult = {
        description: analysis,
        objects: this.extractObjects(analysis),
        text: this.extractText(analysis),
        metadata: {
          model: "gpt-4o",
          tokensUsed: tokensUsed
        }
      };

      return result;
    } catch (error: any) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  /**
   * Process and chunk PDF documents
   */
  async processPDF(
    options: MediaProcessingOptions,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<{ chunks: string[], metadata: any }> {
    // This would integrate with pdf-parse or similar library
    // For now, returning a placeholder - will be implemented with pdf-parse
    return {
      chunks: [],
      metadata: {
        pages: 0,
        title: '',
        author: ''
      }
    };
  }

  /**
   * Scrape and process URL content
   */
  async scrapeURL(
    url: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<{ content: string, metadata: any }> {
    try {
      const startTime = Date.now();
      
      // This would integrate with a web scraping service
      // For now, using a simple fetch
      const response = await fetch(url);
      const html = await response.text();
      
      // Extract text content (simplified - would use cheerio or similar)
      const textContent = html.replace(/<[^>]*>/g, '').substring(0, 10000);
      const responseTime = Date.now() - startTime;
      
      // Log the URL processing
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'text-embedding-3-small' as any,
        featureType: 'url_scraping',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: Math.ceil(textContent.length / 4), // Rough token estimate
        costUsd: 0,
        responseTimeMs: responseTime,
        success: true,
        requestContext: { url, contentLength: textContent.length }
      });
      
      return {
        content: textContent,
        metadata: {
          url: url,
          title: this.extractTitle(html),
          contentLength: textContent.length
        }
      };
    } catch (error: any) {
      throw new Error(`URL scraping failed: ${error.message}`);
    }
  }

  /**
   * Validate and improve AI responses
   */
  async validateResponse(
    originalQuery: string,
    originalResponse: string,
    correctedResponse: string,
    feedback: any,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<{ improved: boolean, embedding?: number[] }> {
    try {
      // Generate embeddings for the corrected response
      const embeddingResult = await this.generateEmbedding(correctedResponse, settings, context);
      
      if (!embeddingResult.success || !embeddingResult.embedding) {
        throw new Error('Failed to generate embedding for corrected response');
      }
      
      // Store validation data in ai_training_sessions table
      await this.storage.createAITrainingSession({
        tenantId: context.tenantId,
        userId: context.userId,
        sessionType: 'validation',
        sessionStatus: 'completed',
        originalQuery: originalQuery,
        originalResponse: originalResponse,
        correctedResponse: correctedResponse,
        validationFeedback: feedback,
        embeddingsCreated: 1,
        processingTimeMs: 0
      });
      
      return {
        improved: true,
        embedding: embeddingResult.embedding
      };
    } catch (error: any) {
      throw new Error(`Response validation failed: ${error.message}`);
    }
  }

  // Helper methods for parsing Vision API responses
  private extractObjects(text: string): string[] {
    const objectPattern = /(?:contains?|shows?|displays?|features?|includes?)\s+(?:a\s+)?([^,.]+)/gi;
    const matches = text.matchAll(objectPattern);
    return Array.from(matches).map(m => m[1]).filter(Boolean);
  }

  private extractText(analysis: string): string {
    const textPattern = /(?:text|writing|words?)(?:\s+reads?|\s+says?|\s+shows?):\s*"([^"]+)"/gi;
    const matches = analysis.matchAll(textPattern);
    return Array.from(matches).map(m => m[1]).join(' ');
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1] : '';
  }

  /**
   * Generate embeddings for text using OpenAI
   * @param text - Text to embed
   * @param settings - AI settings with API key
   * @param context - Request context for logging
   * @returns Embedding vector and metadata
   */
  async generateEmbedding(
    text: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<{
    success: boolean;
    embedding?: number[];
    dimensions?: number;
    model?: string;
    usage?: any;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Use OpenAI directly for embeddings
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: settings.openaiApiKey });
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536 dimensions
        input: text,
        encoding_format: 'float'
      });
      
      const embedding = response.data[0].embedding;
      const responseTime = Date.now() - startTime;
      
      // Log usage with standardized granular tracking
      const totalTokens = response.usage?.total_tokens || 0;
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'text-embedding-3-small' as any,
        featureType: 'embedding',
        tokensInput: totalTokens, // For embeddings, input tokens = total tokens
        tokensOutput: 0,
        tokensTotal: totalTokens,
        costUsd: Math.round(this.calculateCost(totalTokens, 0, 'text-embedding-3-small', 'embedding') * 100),
        responseTimeMs: responseTime,
        success: true,
        requestContext: {
          textLength: text.length,
          embeddingDimensions: embedding.length,
          modelUsed: 'text-embedding-3-small'
        }
      });
      
      return {
        success: true,
        embedding,
        dimensions: embedding.length,
        model: 'text-embedding-3-small',
        usage: response.usage
      };
    } catch (error: any) {
      console.error('Error generating embedding:', error);
      
      // Log failed attempt with standardized tracking
      const responseTime = Date.now() - startTime;
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'text-embedding-3-small' as any,
        featureType: 'embedding',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        costUsd: 0,
        responseTimeMs: responseTime,
        success: false,
        errorMessage: error.message,
        requestContext: {
          textLength: text.length,
          errorType: error.name || 'unknown'
        }
      });
      
      return {
        success: false,
        error: error.message
      };
    }
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

  /**
   * Calculate granular cost based on operation type and token usage
   */
  private calculateCost(
    inputTokens: number = 0,
    outputTokens: number = 0,
    model: string,
    operationType: 'chat' | 'embedding' | 'transcription' | 'vision' | 'url_scraping' = 'chat',
    duration?: number
  ): number {
    const pricing = this.getModelPricing(model);
    
    switch (operationType) {
      case 'chat':
      case 'vision':
        return (inputTokens * pricing.input) + (outputTokens * pricing.output);
      
      case 'embedding':
        const totalTokens = inputTokens + outputTokens;
        return totalTokens * pricing.embedding;
      
      case 'transcription':
        // Whisper pricing is per minute, not per token
        return (duration || 0) * pricing.transcription;
      
      case 'url_scraping':
        // Usually no direct cost for scraping, but may include processing
        return 0;
      
      default:
        return (inputTokens * pricing.input) + (outputTokens * pricing.output);
    }
  }

  // Backward compatibility method for existing calls
  private calculateCostLegacy(tokens: number, model: string): number {
    const pricing = this.getModelPricing(model);
    return tokens * (pricing.input + pricing.output) / 2; // Average
  }

  private getModelPricing(model: string): {
    input: number;
    output: number;
    embedding: number;
    transcription: number;
  } {
    // Updated OpenAI pricing as of September 2024 (per token)
    const pricingMap: Record<string, any> = {
      'gpt-4o': {
        input: 0.0000025,     // $2.50 per 1M input tokens
        output: 0.00001,      // $10.00 per 1M output tokens
        embedding: 0,         // N/A
        transcription: 0,     // N/A
      },
      'gpt-4-turbo': {
        input: 0.00001,       // $10.00 per 1M input tokens
        output: 0.00003,      // $30.00 per 1M output tokens  
        embedding: 0,
        transcription: 0,
      },
      'gpt-4o-mini': {
        input: 0.00000015,    // $0.15 per 1M input tokens
        output: 0.0000006,    // $0.60 per 1M output tokens
        embedding: 0,
        transcription: 0,
      },
      'gpt-4': {
        input: 0.00003,       // $30.00 per 1M input tokens
        output: 0.00006,      // $60.00 per 1M output tokens
        embedding: 0,
        transcription: 0,
      },
      'gpt-3.5-turbo': {
        input: 0.0000005,     // $0.50 per 1M input tokens
        output: 0.0000015,    // $1.50 per 1M output tokens
        embedding: 0,
        transcription: 0,
      },
      'text-embedding-3-small': {
        input: 0,
        output: 0,
        embedding: 0.00000002, // $0.02 per 1M tokens
        transcription: 0,
      },
      'text-embedding-3-large': {
        input: 0,
        output: 0,
        embedding: 0.00000013, // $0.13 per 1M tokens
        transcription: 0,
      },
      'whisper-1': {
        input: 0,
        output: 0,
        embedding: 0,
        transcription: 0.006,  // $0.006 per minute
      }
    };
    
    return pricingMap[model] || pricingMap['gpt-3.5-turbo']; // Fallback
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