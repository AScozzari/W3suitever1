import { db, setTenantContext } from '../core/db.js';
import { vectorEmbeddings } from '../db/schema/w3suite.js';
import { aiCrossTenantEmbeddings, aiKnowledgeSources } from '../db/schema/brand-interface.js';
import { eq, and } from 'drizzle-orm';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export interface EmbeddingSource {
  agentId: string;
  tenantId?: string; // If null, saves to cross-tenant
  sourceType: 'document' | 'url' | 'text';
  content?: string;
  filename?: string;
  sourceUrl?: string;
  metadata?: Record<string, any>;
  origin: 'tenant' | 'brand';
}

export interface EmbeddingChunk {
  id: string;
  sourceId: string;
  agentId: string;
  contentChunk: string;
  embeddingVector: number[];
  chunkIndex: number;
  metadata: Record<string, any>;
}

export interface ProcessingResult {
  success: boolean;
  sourceId: string;
  chunksCreated: number;
  embeddingsGenerated: number;
  savedToTable: 'override' | 'cross_tenant';
  error?: string;
}

/**
 * Embedding Pipeline Service - Robust embedding processing
 * 
 * Logica di salvataggio:
 * - Se tenantId presente → salva in w3suite.vectorEmbeddings (override)
 * - Se tenantId null → salva in brand_interface.aiCrossTenantEmbeddings (global)
 * 
 * Funziona per ogni agente creato nel sistema.
 */
export class EmbeddingPipelineService {
  private openaiClient: OpenAI;
  
  constructor() {
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Processa sorgente e crea embeddings (entry point principale)
   */
  async processSource(source: EmbeddingSource): Promise<ProcessingResult> {
    console.log(`[EMBEDDING-PIPELINE] 🎯 Processing source for agent ${source.agentId}`);
    console.log(`[EMBEDDING-PIPELINE] 📊 Origin: ${source.origin}, Type: ${source.sourceType}`);

    try {
      // 1. Estrai contenuto dalla sorgente
      const content = await this.extractContent(source);
      if (!content || content.trim().length === 0) {
        throw new Error('No content extracted from source');
      }

      console.log(`[EMBEDDING-PIPELINE] 📄 Content extracted: ${content.length} characters`);

      // 2. Crea o ottieni knowledge source record
      const sourceId = await this.createKnowledgeSource(source);
      console.log(`[EMBEDDING-PIPELINE] 📋 Knowledge source created: ${sourceId}`);

      // 3. Chunking del contenuto
      const chunks = this.chunkText(content, source.agentId, sourceId);
      console.log(`[EMBEDDING-PIPELINE] ✂️ Text chunked: ${chunks.length} chunks`);

      // 4. Genera embeddings per ogni chunk
      const embeddingChunks = await this.generateEmbeddingChunks(chunks);
      console.log(`[EMBEDDING-PIPELINE] 🧠 Embeddings generated: ${embeddingChunks.length}`);

      // 5. Salva nei database appropriati
      const savedCount = await this.saveEmbeddings(embeddingChunks, source);
      console.log(`[EMBEDDING-PIPELINE] 💾 Embeddings saved: ${savedCount}`);

      return {
        success: true,
        sourceId,
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddingChunks.length,
        savedToTable: source.tenantId ? 'override' : 'cross_tenant'
      };

    } catch (error: any) {
      console.error(`[EMBEDDING-PIPELINE] ❌ Error processing source:`, error);
      return {
        success: false,
        sourceId: '',
        chunksCreated: 0,
        embeddingsGenerated: 0,
        savedToTable: source.tenantId ? 'override' : 'cross_tenant',
        error: error.message
      };
    }
  }

  /**
   * Estrae contenuto dalla sorgente
   */
  private async extractContent(source: EmbeddingSource): Promise<string> {
    switch (source.sourceType) {
      case 'text':
        return source.content || '';

      case 'url':
        if (!source.sourceUrl) throw new Error('Source URL required for URL type');
        return await this.extractFromUrl(source.sourceUrl);

      case 'document':
        if (!source.content) throw new Error('Content required for document type');
        return source.content;

      default:
        throw new Error(`Unsupported source type: ${source.sourceType}`);
    }
  }

  /**
   * Estrae contenuto da URL
   */
  private async extractFromUrl(url: string): Promise<string> {
    try {
      console.log(`[EMBEDDING-PIPELINE] 🌐 Fetching content from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'W3Suite-Agent/1.0 (Knowledge-Extraction-Bot)'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      const textContent = $('body').text().replace(/\s+/g, ' ').trim();
      
      console.log(`[EMBEDDING-PIPELINE] ✅ Extracted ${textContent.length} characters from URL`);
      return textContent;

    } catch (error: any) {
      console.error(`[EMBEDDING-PIPELINE] ❌ Error extracting from URL:`, error);
      throw new Error(`Failed to extract content from URL: ${error.message}`);
    }
  }

  /**
   * Chunking intelligente del testo
   */
  private chunkText(content: string, agentId: string, sourceId: string): Array<{
    id: string;
    sourceId: string;
    agentId: string;
    contentChunk: string;
    chunkIndex: number;
    metadata: Record<string, any>;
  }> {
    const maxChunkSize = 1000; // caratteri per chunk
    const overlapSize = 100; // overlap tra chunks
    const chunks = [];
    
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < content.length) {
      const endPosition = Math.min(currentPosition + maxChunkSize, content.length);
      let chunkContent = content.substring(currentPosition, endPosition);
      
      // Se non siamo alla fine, cerca di finire su una parola
      if (endPosition < content.length) {
        const lastSpaceIndex = chunkContent.lastIndexOf(' ');
        if (lastSpaceIndex > maxChunkSize * 0.8) { // almeno 80% del chunk
          chunkContent = chunkContent.substring(0, lastSpaceIndex);
        }
      }

      chunks.push({
        id: randomUUID(),
        sourceId,
        agentId,
        contentChunk: chunkContent.trim(),
        chunkIndex,
        metadata: {
          chunkSize: chunkContent.length,
          startPosition: currentPosition,
          endPosition: currentPosition + chunkContent.length
        }
      });

      // Avanza con overlap
      currentPosition += chunkContent.length - overlapSize;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Genera embeddings per i chunks
   */
  private async generateEmbeddingChunks(
    chunks: Array<{ id: string; sourceId: string; agentId: string; contentChunk: string; chunkIndex: number; metadata: Record<string, any> }>
  ): Promise<EmbeddingChunk[]> {
    const embeddingChunks: EmbeddingChunk[] = [];
    
    // Processa in batch per performance
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      try {
        console.log(`[EMBEDDING-PIPELINE] 🧠 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
        
        // Genera embeddings per il batch
        const inputs = batch.map(chunk => chunk.contentChunk.substring(0, 8000)); // Limit OpenAI input
        
        const response = await this.openaiClient.embeddings.create({
          model: 'text-embedding-3-small',
          input: inputs,
          encoding_format: 'float'
        });

        // Crea embedding chunks
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = response.data[j].embedding;
          
          embeddingChunks.push({
            id: chunk.id,
            sourceId: chunk.sourceId,
            agentId: chunk.agentId,
            contentChunk: chunk.contentChunk,
            embeddingVector: embedding,
            chunkIndex: chunk.chunkIndex,
            metadata: chunk.metadata
          });
        }

      } catch (error: any) {
        console.error(`[EMBEDDING-PIPELINE] ❌ Error generating embeddings for batch:`, error);
        throw new Error(`Embedding generation failed: ${error.message}`);
      }
    }

    return embeddingChunks;
  }

  /**
   * Crea record knowledge source
   */
  private async createKnowledgeSource(source: EmbeddingSource): Promise<string> {
    if (source.origin === 'brand') {
      // Cross-tenant: salva in brand_interface.aiKnowledgeSources
      const sourceId = randomUUID();
      
      await db.insert(aiKnowledgeSources).values({
        id: sourceId,
        agentId: source.agentId,
        filename: source.filename,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        origin: 'brand',
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return sourceId;
    } else {
      // Tenant override: crea un source ID di riferimento (non serve table separata)
      return randomUUID();
    }
  }

  /**
   * Salva embeddings nelle tabelle appropriate
   */
  private async saveEmbeddings(
    embeddingChunks: EmbeddingChunk[],
    source: EmbeddingSource
  ): Promise<number> {
    if (source.tenantId) {
      // Salva in override table (w3suite.vectorEmbeddings)
      return await this.saveToOverrideTable(embeddingChunks, source);
    } else {
      // Salva in cross-tenant table (brand_interface.aiCrossTenantEmbeddings)
      return await this.saveToCrossTenantTable(embeddingChunks, source);
    }
  }

  /**
   * Salva in override table (tenant + agent specific)
   */
  private async saveToOverrideTable(
    embeddingChunks: EmbeddingChunk[],
    source: EmbeddingSource
  ): Promise<number> {
    if (!source.tenantId) throw new Error('TenantId required for override table');

    console.log(`[EMBEDDING-PIPELINE] 💾 Saving ${embeddingChunks.length} chunks to override table`);
    
    // Set tenant context per RLS
    await setTenantContext(source.tenantId);

    for (const chunk of embeddingChunks) {
      await db.insert(vectorEmbeddings).values({
        id: chunk.id,
        tenantId: source.tenantId,
        contentChunk: chunk.contentChunk,
        embeddingVector: JSON.stringify(chunk.embeddingVector),
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        metadata: {
          ...chunk.metadata,
          agentId: source.agentId,
          chunkIndex: chunk.chunkIndex,
          origin: 'tenant'
        },
        tags: source.agentId ? [source.agentId] : [],
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`[EMBEDDING-PIPELINE] ✅ Saved ${embeddingChunks.length} chunks to override table`);
    return embeddingChunks.length;
  }

  /**
   * Salva in cross-tenant table (Brand global)
   */
  private async saveToCrossTenantTable(
    embeddingChunks: EmbeddingChunk[],
    source: EmbeddingSource
  ): Promise<number> {
    console.log(`[EMBEDDING-PIPELINE] 💾 Saving ${embeddingChunks.length} chunks to cross-tenant table`);

    for (const chunk of embeddingChunks) {
      await db.insert(aiCrossTenantEmbeddings).values({
        id: chunk.id,
        sourceId: chunk.sourceId,
        agentId: source.agentId,
        contentChunk: chunk.contentChunk,
        embeddingVector: JSON.stringify(chunk.embeddingVector),
        chunkIndex: chunk.chunkIndex,
        chunkMetadata: chunk.metadata,
        tags: source.agentId ? [source.agentId] : [],
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`[EMBEDDING-PIPELINE] ✅ Saved ${embeddingChunks.length} chunks to cross-tenant table`);
    return embeddingChunks.length;
  }

  /**
   * Rimuovi embeddings per agente/source
   */
  async removeEmbeddings(agentId: string, tenantId?: string, sourceId?: string): Promise<number> {
    try {
      let removedCount = 0;

      if (tenantId) {
        // Rimuovi da override table
        await setTenantContext(tenantId);
        
        if (sourceId) {
          // Rimuovi source specifico
          const result = await db.update(vectorEmbeddings)
            .set({ status: 'deleted', updatedAt: new Date() })
            .where(
              and(
                eq(vectorEmbeddings.tenantId, tenantId),
                eq(vectorEmbeddings.sourceUrl, sourceId)
              )
            );
          removedCount += 1; // Approximation
        } else {
          // Rimuovi tutto per agente
          const result = await db.update(vectorEmbeddings)
            .set({ status: 'deleted', updatedAt: new Date() })
            .where(eq(vectorEmbeddings.tenantId, tenantId));
          removedCount += 1; // Approximation
        }
      } else {
        // Rimuovi da cross-tenant table
        if (sourceId) {
          const result = await brandDB.update(aiCrossTenantEmbeddings)
            .set({ status: 'deleted', updatedAt: new Date() })
            .where(
              and(
                eq(aiCrossTenantEmbeddings.agentId, agentId),
                eq(aiCrossTenantEmbeddings.sourceId, sourceId)
              )
            );
          removedCount += 1;
        } else {
          const result = await brandDB.update(aiCrossTenantEmbeddings)
            .set({ status: 'deleted', updatedAt: new Date() })
            .where(eq(aiCrossTenantEmbeddings.agentId, agentId));
          removedCount += 1;
        }
      }

      console.log(`[EMBEDDING-PIPELINE] 🗑️ Removed ${removedCount} embedding sources`);
      return removedCount;

    } catch (error: any) {
      console.error(`[EMBEDDING-PIPELINE] ❌ Error removing embeddings:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const embeddingPipelineService = new EmbeddingPipelineService();