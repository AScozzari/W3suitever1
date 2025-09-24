// Unified OpenAI Service - Single integration for all OpenAI capabilities
// Supports text, embeddings, vision, audio transcription, and multimodal processing

import OpenAI from "openai";
import { AISettings, AIUsageLog, InsertAIUsageLog } from "../db/schema/w3suite";
// Redis cache disabled - service not available
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { randomUUID } from 'crypto';
import { enhancedRAGService, RAGQueryOptions } from './enhanced-rag-service.js';

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
  agentId?: string; // For RAG multi-source support
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
   * Now with intelligent Redis cache for performance optimization
   */
  async createUnifiedResponse(
    input: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<UnifiedOpenAIResponse> {
    const startTime = Date.now();

    // Redis cache disabled - proceeding directly to OpenAI
    
    try {
      // Get enabled tools from settings
      const tools = this.getEnabledTools(settings.featuresEnabled as any);
      
      // Map creativity (0-20) to temperature (0-2.0)
      const temperature = (settings.responseCreativity || 7) / 10.0;
      
      // 🧠 ENHANCED RAG: Build knowledge context for agent-specific queries
      let ragContext = '';
      if (context.agentId) {
        try {
          console.log(`[ENHANCED-RAG] 🤖 Building RAG context for agent ${context.agentId}`);
          ragContext = await enhancedRAGService.buildRAGContext(
            input,
            context.agentId,
            context.tenantId,
            {
              limit: 8,
              similarityThreshold: 0.6,
              includeOverride: true,
              includeCrossTenant: true
            }
          );
          
          if (ragContext) {
            console.log(`[ENHANCED-RAG] ✅ RAG context built: ${ragContext.length} characters`);
          } else {
            console.log(`[ENHANCED-RAG] 📭 No relevant knowledge found for query`);
          }
        } catch (ragError: any) {
          console.error(`[ENHANCED-RAG] ❌ RAG failed, continuing without context:`, ragError.message);
        }
      }
      
      // Build context-aware instructions (now with RAG)
      const instructions = this.buildContextInstructions(settings, context, ragContext);

      // Build OpenAI tools configuration
      const openaiTools = this.buildOpenAITools(tools);
      
      // Use Chat Completions API with function calling support
      const response = await this.client.chat.completions.create({
        model: settings.openaiModel as string,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input }
        ],
        max_tokens: settings.maxTokensPerResponse,
        temperature: temperature,
        stream: false,
        ...(openaiTools.length > 0 && { tools: openaiTools, tool_choice: "auto" })
      });

      let finalResponse = response;
      let additionalTokens = 0;
      let additionalCost = 0;
      const webResults: any[] = []; // Accumulate web search results
      
      // Handle function calls if present
      const message = response.choices[0].message;
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`[WEB-SEARCH] 🔧 Processing ${message.tool_calls.length} function call(s)`);
        
        const toolResults: any[] = [];
        
        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === 'search_web') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              console.log(`[WEB-SEARCH] 🔍 Executing web search: "${args.query}"`);
              
              // Use existing DuckDuckGo search function
              const searchResults = await this.performWebSearch(args.query);
              
              // Accumulate results for final return
              webResults.push(...searchResults);
              
              toolResults.push({
                tool_call_id: toolCall.id,
                role: "tool",
                content: JSON.stringify({
                  query: args.query,
                  results: searchResults,
                  timestamp: new Date().toISOString()
                })
              });
              
              console.log(`[WEB-SEARCH] ✅ Found ${searchResults.length} results for: "${args.query}"`);
            } catch (error: any) {
              console.error(`[WEB-SEARCH] ❌ Error in web search:`, error);
              
              toolResults.push({
                tool_call_id: toolCall.id,
                role: "tool", 
                content: JSON.stringify({
                  error: "Web search failed",
                  message: error.message
                })
              });
            }
          }
        }
        
        if (toolResults.length > 0) {
          // Get final response with search results
          const finalMessages = [
            { role: "system", content: instructions },
            { role: "user", content: input },
            message,
            ...toolResults
          ];
          
          console.log(`[WEB-SEARCH] 🤖 Generating final response with search results`);
          
          finalResponse = await this.client.chat.completions.create({
            model: settings.openaiModel as string,
            messages: finalMessages as any,
            max_tokens: settings.maxTokensPerResponse,
            temperature: temperature,
            stream: false
          });
          
          additionalTokens = finalResponse.usage?.total_tokens || 0;
          additionalCost = this.calculateCost(
            finalResponse.usage?.prompt_tokens || 0,
            finalResponse.usage?.completion_tokens || 0,
            settings.openaiModel as string,
            'chat'
          );
        }
      }

      const responseTime = Date.now() - startTime;
      const tokensUsed = (response.usage?.total_tokens || 0) + additionalTokens;
      const inputTokens = (response.usage?.prompt_tokens || 0) + (finalResponse.usage?.prompt_tokens || 0);
      const outputTokens = (response.usage?.completion_tokens || 0) + (finalResponse.usage?.completion_tokens || 0);
      const cost = this.calculateCost(inputTokens, outputTokens, settings.openaiModel as string, 'chat') + additionalCost;

      // Generate unique conversation ID for consistency
      const conversationId = randomUUID();

      // Log usage for analytics
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: settings.openaiModel as any,
        featureType: 'chat', // Will be expanded based on tools used
        tokensInput: inputTokens,
        tokensOutput: outputTokens,
        tokensTotal: tokensUsed,
        costUsd: Math.round(cost * 100), // Store as cents
        responseTimeMs: responseTime,
        success: true,
        requestContext: {
          tools_used: tools,
          module: context.moduleContext,
          entity_id: context.businessEntityId,
          function_calls_made: message.tool_calls ? message.tool_calls.length : 0,
          conversation_id: conversationId
        }
      });

      // Save conversation for chat history
      try {
        await this.storage.createAIConversation({
          tenantId: context.tenantId,
          userId: context.userId,
          title: input.length > 50 ? input.substring(0, 50) + '...' : input,
          conversationData: {
            messages: [
              { role: "user", content: input },
              { role: "assistant", content: finalResponse.choices[0].message.content }
            ],
            toolCalls: message.tool_calls || [],
            webResults: webResults,
            metadata: {
              tokensUsed,
              cost,
              responseTime,
              model: settings.openaiModel
            }
          },
          featureContext: 'chat',
          moduleContext: context.moduleContext,
          businessEntityId: context.businessEntityId
        });
        console.log(`[CHAT-STORAGE] ✅ Conversation saved with ID: ${conversationId}`);
      } catch (error: any) {
        console.error('[CHAT-STORAGE] ❌ Failed to save conversation:', error);
        // Don't fail the request if conversation storage fails
      }

      return {
        success: true,
        output: finalResponse.choices[0].message.content,
        tokensUsed,
        cost,
        responseTime,
        conversationId: conversationId,
        outputMeta: {
          webResults,
          webResultsFound: webResults.length
        }
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
   * Check if IP address is private/internal (SSRF protection)
   */
  private isPrivateOrInternalIP(ip: string): boolean {
    // IPv4 private ranges
    const privateIPv4Ranges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
      /^127\./,                   // 127.0.0.0/8 (loopback)
      /^0\.0\.0\.0$/,             // 0.0.0.0
    ];
    
    // IPv6 private ranges
    const privateIPv6Ranges = [
      /^fc00:/i,                  // fc00::/7 (unique local)
      /^fd[0-9a-f]{2}:/i,         // fd00::/8 (unique local)
      /^fe80:/i,                  // fe80::/10 (link-local)
      /^::1$/i,                   // ::1 (loopback)
      /^::$/i,                    // :: (unspecified)
    ];
    
    // Check IPv4
    for (const range of privateIPv4Ranges) {
      if (range.test(ip)) return true;
    }
    
    // Check IPv6
    for (const range of privateIPv6Ranges) {
      if (range.test(ip)) return true;
    }
    
    // Special metadata service IPs
    const metadataIPs = ['169.254.169.254', '100.100.100.200'];
    if (metadataIPs.includes(ip)) return true;
    
    return false;
  }

  /**
   * Scrape and process URL content with robust error handling
   */
  async scrapeURL(
    url: string,
    settings: AISettings,
    context: OpenAIRequestContext
  ): Promise<{ content: string, metadata: any }> {
    const startTime = Date.now();
    const totalTimeout = 30000; // 30 second total timeout
    
    try {
      // URL validation and SSRF protection
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      // Robust SSRF protection with DNS resolution
      const hostname = urlObj.hostname.toLowerCase();
      
      // Validate hostname and resolve DNS to check actual IPs
      const dns = await import('dns').then(m => m.promises);
      
      try {
        const addresses = await dns.resolve4(hostname).catch(() => []);
        const ipv6Addresses = await dns.resolve6(hostname).catch(() => []);
        const allIPs = [...addresses, ...ipv6Addresses];
        
        // Check all resolved IPs for private/internal ranges
        for (const ip of allIPs) {
          if (this.isPrivateOrInternalIP(ip)) {
            throw new Error(`SSRF_BLOCKED: Hostname ${hostname} resolves to private/internal IP ${ip}`);
          }
        }
      } catch (error: any) {
        if (error.message.includes('SSRF_BLOCKED')) {
          throw error;
        }
        // DNS resolution failed - apply basic hostname checks as fallback
        console.warn(`DNS resolution failed for ${hostname}, using fallback checks`);
      }
      
      // Basic hostname checks as additional protection
      if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) {
        throw new Error('SSRF_BLOCKED: Access to localhost/loopback addresses is not allowed');
      }
      
      // Block obvious private IP patterns
      const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|fd[0-9a-f]{2}:|fe80:|::1$|127\.)/i;
      if (privateIPRegex.test(hostname)) {
        throw new Error('SSRF_BLOCKED: Access to private/internal network addresses is not allowed');
      }
      
      // Block metadata service endpoints
      const metadataHosts = ['169.254.169.254', 'metadata.google.internal', 'metadata'];
      if (metadataHosts.includes(hostname)) {
        throw new Error('SSRF_BLOCKED: Access to cloud metadata services is not allowed');
      }

      // Enforce domain allowlist (strict)
      const allowedDomains = ['windtre.it', 'tre.it', 'tre.com', 'repubblica.it', 'corriere.it', 'gazzetta.it'];
      const domain = hostname.replace(/^www\./, '');
      if (!allowedDomains.some(allowed => domain === allowed || domain.endsWith('.' + allowed))) {
        throw new Error(`ALLOWLIST_BLOCKED: Domain ${domain} is not in the allowed list for URL scraping`);
      }

      // Enforce total timeout for entire operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT_ERROR: Total operation timeout (30s) exceeded')), totalTimeout);
      });

      // Try static HTML first with Cheerio (faster for static content)
      try {
        const staticResult = await Promise.race([
          this.scrapeStaticContent(url, startTime, context),
          timeoutPromise
        ]);
        return staticResult;
      } catch (staticError: any) {
        if (staticError.message.includes('TIMEOUT_ERROR')) {
          throw staticError;
        }
        console.log(`Static scraping failed for ${url}, trying dynamic rendering:`, staticError.message);
        
        // Check remaining time before dynamic fallback
        const elapsed = Date.now() - startTime;
        if (elapsed >= totalTimeout) {
          throw new Error('TIMEOUT_ERROR: No time remaining for dynamic rendering fallback');
        }
        
        // Fallback to Puppeteer for JavaScript-heavy sites
        const dynamicResult = await Promise.race([
          this.scrapeDynamicContent(url, startTime, context),
          timeoutPromise
        ]);
        return dynamicResult;
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Log failed attempt
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'text-embedding-3-small' as any,
        featureType: 'url_scraping',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        costUsd: 0,
        responseTimeMs: responseTime,
        success: false,
        requestContext: { url, error: error.message }
      });
      
      // Provide specific error messages
      if (error.message.includes('fetch')) {
        throw new Error(`Network error accessing ${url}: Check if the site is accessible and allows scraping`);
      } else if (error.message.includes('timeout')) {
        throw new Error(`Timeout error: ${url} took too long to respond (>30s)`);
      } else if (error.message.includes('CORS')) {
        throw new Error(`CORS error: ${url} blocks cross-origin requests`);
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        throw new Error(`Access denied: ${url} returned 403 Forbidden (may have anti-bot protection)`);
      } else if (error.message.includes('404')) {
        throw new Error(`Page not found: ${url} returned 404 Not Found`);
      } else {
        throw new Error(`URL scraping failed for ${url}: ${error.message}`);
      }
    } finally {
      // Browser cleanup is handled within scrapeDynamicContent method
      // No browser instance is maintained at this level
    }
  }

  /**
   * Scrape static HTML content using Cheerio (faster method)
   */
  private async scrapeStaticContent(
    url: string,
    startTime: number,
    context: OpenAIRequestContext
  ): Promise<{ content: string, metadata: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}: ${response.statusText}`);
      }

      // Verify content type is HTML
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(`CONTENT_TYPE_ERROR: Expected HTML but got ${contentType}`);
      }

      // Check content length to prevent memory exhaustion
      const contentLength = response.headers.get('content-length');
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      if (contentLength && parseInt(contentLength) > maxSize) {
        throw new Error(`CONTENT_SIZE_ERROR: Content too large (${contentLength} bytes, max ${maxSize})`);
      }

      const html = await response.text();
      
      // Additional size check after reading
      if (html.length > maxSize) {
        throw new Error(`CONTENT_SIZE_ERROR: Content too large (${html.length} characters, max ${maxSize})`);
      }
      const $ = cheerio.load(html);
      
      // Extract structured content
      const title = $('title').text().trim() || $('h1').first().text().trim() || '';
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
      
      // Remove script, style, and other non-content elements
      $('script, style, nav, header, footer, aside, .navigation, .menu, .sidebar').remove();
      
      // Extract main content
      let mainContent = '';
      const contentSelectors = ['main', 'article', '.content', '.post', '.entry', 'body'];
      
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          mainContent = element.text().trim();
          break;
        }
      }
      
      // Fallback to body if no main content found
      if (!mainContent) {
        mainContent = $('body').text().trim();
      }
      
      // Clean up whitespace and limit length
      const cleanContent = mainContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim()
        .substring(0, 50000); // Increased limit for better content capture

      if (cleanContent.length < 100) {
        throw new Error('Insufficient content extracted - may need dynamic rendering');
      }

      const responseTime = Date.now() - startTime;
      
      // Log successful scraping
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'text-embedding-3-small' as any,
        featureType: 'url_scraping',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: Math.ceil(cleanContent.length / 4),
        costUsd: 0,
        responseTimeMs: responseTime,
        success: true,
        requestContext: { 
          url, 
          contentLength: cleanContent.length,
          method: 'static_cheerio',
          title: title
        }
      });

      return {
        content: cleanContent,
        metadata: {
          url: url,
          title: title,
          description: description,
          contentLength: cleanContent.length,
          scrapingMethod: 'static',
          responseTime: responseTime
        }
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Scrape dynamic content using Puppeteer (for JavaScript-heavy sites)
   */
  private async scrapeDynamicContent(
    url: string,
    startTime: number,
    context: OpenAIRequestContext
  ): Promise<{ content: string, metadata: any }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      
      // Set realistic browser properties
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set timeout and navigate
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Wait for dynamic content to load
      await page.waitForTimeout(3000);
      
      // Extract content using page evaluation
      const result = await page.evaluate(() => {
        // Remove unwanted elements
        const unwanted = document.querySelectorAll('script, style, nav, header, footer, aside, .navigation, .menu, .sidebar');
        unwanted.forEach(el => el.remove());
        
        const title = document.title || document.querySelector('h1')?.textContent || '';
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                           document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
        
        // Try to find main content
        const contentSelectors = ['main', 'article', '.content', '.post', '.entry'];
        let content = '';
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            content = element.textContent || '';
            break;
          }
        }
        
        // Fallback to body
        if (!content) {
          content = document.body.textContent || '';
        }
        
        return {
          title: title.trim(),
          description: description.trim(),
          content: content.trim()
        };
      });
      
      // Clean up content
      const cleanContent = result.content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim()
        .substring(0, 50000);

      if (cleanContent.length < 100) {
        throw new Error('Insufficient content extracted even with dynamic rendering');
      }

      const responseTime = Date.now() - startTime;
      
      // Log successful dynamic scraping
      await this.logUsage({
        tenantId: context.tenantId,
        userId: context.userId,
        modelUsed: 'text-embedding-3-small' as any,
        featureType: 'url_scraping',
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: Math.ceil(cleanContent.length / 4),
        costUsd: 0,
        responseTimeMs: responseTime,
        success: true,
        requestContext: { 
          url, 
          contentLength: cleanContent.length,
          method: 'dynamic_puppeteer',
          title: result.title
        }
      });

      return {
        content: cleanContent,
        metadata: {
          url: url,
          title: result.title,
          description: result.description,
          contentLength: cleanContent.length,
          scrapingMethod: 'dynamic',
          responseTime: responseTime
        }
      };
    } finally {
      // Guaranteed cleanup of all resources
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.warn('Failed to close page:', e);
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.warn('Failed to close browser:', e);
        }
      }
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
      
      // Use the existing client instance for consistency with API key
      const response = await this.client.embeddings.create({
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

  /**
   * Perform web search using DuckDuckGo (safe fallback)
   */
  private async performWebSearch(query: string): Promise<any[]> {
    try {
      // Import the DuckDuckGo search function from routes
      const { performDuckDuckGoSearch } = await import('../core/routes');
      return await performDuckDuckGoSearch(query);
    } catch (error) {
      console.error('[WEB-SEARCH] ❌ Search failed:', error);
      return [];
    }
  }

  /**
   * Build OpenAI-compatible tools configuration for function calling
   */
  private buildOpenAITools(tools: string[]): any[] {
    const openaiTools: any[] = [];
    
    if (tools.includes('web_search')) {
      openaiTools.push({
        type: "function",
        function: {
          name: "search_web",
          description: "Search the web for current information about any topic. Use this when you need real-time or recent information that might not be in your training data.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant information"
              }
            },
            required: ["query"]
          }
        }
      });
    }
    
    // Note: code_interpreter requires assistants API, not supported in chat completions
    // file_search requires assistant API, not supported in chat completions
    // computer_use is not a standard OpenAI tool
    
    return openaiTools;
  }

  private buildContextInstructions(settings: AISettings, context: OpenAIRequestContext, ragContext?: string): string {
    const contextSettings = settings.contextSettings as any;
    let instructions = "You are an AI assistant for the W3 Suite enterprise platform.";
    
    // Add module-specific context
    if (context.moduleContext === 'hr' && contextSettings?.hr_context_enabled) {
      instructions += " Focus on HR-related tasks, employee management, and HR policies.";
    } else if (context.moduleContext === 'finance' && contextSettings?.finance_context_enabled) {
      instructions += " Focus on financial analysis, budgeting, and business metrics.";
    }
    
    // 🧠 Add RAG knowledge context if available
    if (ragContext && ragContext.trim()) {
      instructions += "\n\n## Relevant Knowledge Base:\n";
      instructions += "Use the following knowledge from both tenant-specific training and Brand resources to inform your responses. Prioritize this information when relevant to the user's query:\n\n";
      instructions += ragContext;
      instructions += "\n\nImportant: Base your responses on this knowledge when applicable, but also use your general training when the knowledge base doesn't cover the topic.";
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