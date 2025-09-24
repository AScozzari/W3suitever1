import { db, setTenantContext } from '../core/db.js';
import { vectorEmbeddings } from '../db/schema/w3suite.js';
import { aiCrossTenantEmbeddings, aiKnowledgeSources } from '../db/schema/brand-interface.js';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import OpenAI from 'openai';

export interface RAGSearchResult {
  id: string;
  agentId: string;
  sourceType: 'tenant_override' | 'cross_tenant';
  contentChunk: string;
  similarity: number;
  source: {
    filename?: string;
    sourceUrl?: string;
    origin: 'tenant' | 'brand';
    tenantId?: string;
  };
  metadata: Record<string, any>;
}

export interface RAGQueryOptions {
  limit?: number;
  similarityThreshold?: number;
  includeOverride?: boolean;
  includeCrossTenant?: boolean;
  sourceTypes?: string[];
}

/**
 * Enhanced RAG Service - Multi-Source Knowledge Retrieval
 * 
 * Legge da:
 * - Override Tables: w3suite.vectorEmbeddings (tenant + agent specific)
 * - Cross-Tenant Tables: brand_interface.aiCrossTenantEmbeddings (global Brand)
 * 
 * Funziona per ogni agente creato nel sistema.
 */
export class EnhancedRAGService {
  private openaiClient: OpenAI;
  
  constructor() {
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Query semantica multi-source per agente specifico
   */
  async queryKnowledge(
    query: string,
    agentId: string,
    tenantId: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGSearchResult[]> {
    const {
      limit = 10,
      similarityThreshold = 0.7,
      includeOverride = true,
      includeCrossTenant = true,
      sourceTypes = ['document', 'url']
    } = options;

    console.log(`[ENHANCED-RAG] 🧠 Query knowledge for agent ${agentId}, tenant ${tenantId}`);
    console.log(`[ENHANCED-RAG] 📋 Options:`, { limit, similarityThreshold, includeOverride, includeCrossTenant });

    try {
      // 1. Genera embedding per la query
      const queryEmbedding = await this.generateQueryEmbedding(query);
      console.log(`[ENHANCED-RAG] ✅ Generated query embedding (${queryEmbedding.length} dimensions)`);

      // 2. Cerca in parallelo nelle due fonti
      const [overrideResults, crossTenantResults] = await Promise.all([
        includeOverride ? this.searchOverrideEmbeddings(queryEmbedding, agentId, tenantId, limit / 2) : [],
        includeCrossTenant ? this.searchCrossTenantEmbeddings(queryEmbedding, agentId, limit / 2) : []
      ]);

      console.log(`[ENHANCED-RAG] 📊 Results: ${overrideResults.length} override + ${crossTenantResults.length} cross-tenant`);

      // 3. Merge e ranking risultati
      const allResults = [...overrideResults, ...crossTenantResults];
      
      // 4. Filtra per similarity threshold e ordina
      const filteredResults = allResults
        .filter(result => result.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log(`[ENHANCED-RAG] ✅ Final results: ${filteredResults.length} chunks above threshold ${similarityThreshold}`);
      
      return filteredResults;
    } catch (error) {
      console.error(`[ENHANCED-RAG] ❌ Error querying knowledge:`, error);
      throw error;
    }
  }

  /**
   * Genera embedding per query di ricerca
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query.substring(0, 8000), // Limit input length
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error(`[ENHANCED-RAG] ❌ Error generating query embedding:`, error);
      throw new Error(`Failed to generate query embedding: ${error.message}`);
    }
  }

  /**
   * Cerca in override embeddings (tenant + agent specific)
   */
  private async searchOverrideEmbeddings(
    queryEmbedding: number[],
    agentId: string,
    tenantId: string,
    limit: number
  ): Promise<RAGSearchResult[]> {
    try {
      // Set tenant context per RLS
      await setTenantContext(tenantId);
      
      // Query override embeddings filtrate per agentId
      const embeddings = await db
        .select({
          id: vectorEmbeddings.id,
          tenantId: vectorEmbeddings.tenantId,
          contentChunk: vectorEmbeddings.contentChunk,
          embeddingVector: vectorEmbeddings.embeddingVector,
          sourceType: vectorEmbeddings.sourceType,
          sourceUrl: vectorEmbeddings.sourceUrl,
          metadata: vectorEmbeddings.metadata,
          tags: vectorEmbeddings.tags
        })
        .from(vectorEmbeddings)
        .where(
          and(
            eq(vectorEmbeddings.tenantId, tenantId),
            eq(vectorEmbeddings.status, 'active'),
            sql`${vectorEmbeddings.metadata}->>'agentId' = ${agentId}`
          )
        )
        .limit(limit * 2) // Get more for similarity filtering
        .orderBy(desc(vectorEmbeddings.createdAt));

      console.log(`[ENHANCED-RAG] 📋 Found ${embeddings.length} override embeddings for agent ${agentId}`);

      // Calcola similarity per ogni embedding
      const results: RAGSearchResult[] = [];
      for (const embedding of embeddings) {
        try {
          const embeddingArray = JSON.parse(embedding.embeddingVector || '[]');
          const similarity = this.calculateCosineSimilarity(queryEmbedding, embeddingArray);
          
          results.push({
            id: embedding.id,
            agentId,
            sourceType: 'tenant_override',
            contentChunk: embedding.contentChunk || '',
            similarity,
            source: {
              sourceUrl: embedding.sourceUrl,
              origin: 'tenant',
              tenantId: embedding.tenantId
            },
            metadata: embedding.metadata || {}
          });
        } catch (parseError) {
          console.warn(`[ENHANCED-RAG] ⚠️ Failed to parse embedding ${embedding.id}:`, parseError);
        }
      }

      return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    } catch (error) {
      console.error(`[ENHANCED-RAG] ❌ Error searching override embeddings:`, error);
      return [];
    }
  }

  /**
   * Cerca in cross-tenant embeddings (Brand global)
   */
  private async searchCrossTenantEmbeddings(
    queryEmbedding: number[],
    agentId: string,
    limit: number
  ): Promise<RAGSearchResult[]> {
    try {
      // Query cross-tenant embeddings - NO tenant context (global)
      const embeddings = await db
        .select({
          id: aiCrossTenantEmbeddings.id,
          sourceId: aiCrossTenantEmbeddings.sourceId,
          agentId: aiCrossTenantEmbeddings.agentId,
          contentChunk: aiCrossTenantEmbeddings.contentChunk,
          embeddingVector: aiCrossTenantEmbeddings.embeddingVector,
          chunkMetadata: aiCrossTenantEmbeddings.chunkMetadata,
          tags: aiCrossTenantEmbeddings.tags,
          status: aiCrossTenantEmbeddings.status
        })
        .from(aiCrossTenantEmbeddings)
        .where(
          and(
            eq(aiCrossTenantEmbeddings.agentId, agentId),
            eq(aiCrossTenantEmbeddings.status, 'active')
          )
        )
        .limit(limit * 2) // Get more for similarity filtering
        .orderBy(desc(aiCrossTenantEmbeddings.createdAt));

      console.log(`[ENHANCED-RAG] 🌐 Found ${embeddings.length} cross-tenant embeddings for agent ${agentId}`);

      // Get source info per ogni embedding
      const sourceIds = embeddings.map(e => e.sourceId).filter(Boolean);
      const sources = sourceIds.length > 0 ? await db
        .select({
          id: aiKnowledgeSources.id,
          filename: aiKnowledgeSources.filename,
          sourceUrl: aiKnowledgeSources.sourceUrl,
          sourceType: aiKnowledgeSources.sourceType,
          origin: aiKnowledgeSources.origin
        })
        .from(aiKnowledgeSources)
        .where(inArray(aiKnowledgeSources.id, sourceIds)) : [];

      const sourceMap = new Map(sources.map(s => [s.id, s]));

      // Calcola similarity per ogni embedding
      const results: RAGSearchResult[] = [];
      for (const embedding of embeddings) {
        try {
          const embeddingArray = JSON.parse(embedding.embeddingVector || '[]');
          const similarity = this.calculateCosineSimilarity(queryEmbedding, embeddingArray);
          const source = sourceMap.get(embedding.sourceId);
          
          results.push({
            id: embedding.id,
            agentId: embedding.agentId,
            sourceType: 'cross_tenant',
            contentChunk: embedding.contentChunk || '',
            similarity,
            source: {
              filename: source?.filename,
              sourceUrl: source?.sourceUrl,
              origin: 'brand'
            },
            metadata: embedding.chunkMetadata || {}
          });
        } catch (parseError) {
          console.warn(`[ENHANCED-RAG] ⚠️ Failed to parse cross-tenant embedding ${embedding.id}:`, parseError);
        }
      }

      return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    } catch (error) {
      console.error(`[ENHANCED-RAG] ❌ Error searching cross-tenant embeddings:`, error);
      return [];
    }
  }

  /**
   * Calcola cosine similarity tra due vettori
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      console.warn(`[ENHANCED-RAG] ⚠️ Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return isNaN(similarity) ? 0 : similarity;
  }

  /**
   * Aggrega knowledge per contesto RAG
   */
  async buildRAGContext(
    query: string,
    agentId: string,
    tenantId: string,
    options: RAGQueryOptions = {}
  ): Promise<string> {
    const results = await this.queryKnowledge(query, agentId, tenantId, options);
    
    if (results.length === 0) {
      console.log(`[ENHANCED-RAG] 📭 No relevant knowledge found for query`);
      return '';
    }

    // Costruisci contesto strutturato
    const contextParts = results.map((result, index) => {
      const sourceInfo = result.source.filename || result.source.sourceUrl || 'Unknown source';
      const originLabel = result.sourceType === 'tenant_override' ? 'Tenant Training' : 'Brand Knowledge';
      
      return `[${originLabel} ${index + 1}] (${sourceInfo}, similarity: ${result.similarity.toFixed(3)}):\n${result.contentChunk}`;
    });

    const context = contextParts.join('\n\n');
    console.log(`[ENHANCED-RAG] ✅ Built RAG context: ${context.length} characters from ${results.length} sources`);
    
    return context;
  }

  /**
   * Get knowledge statistics per agente
   */
  async getKnowledgeStats(agentId: string, tenantId: string): Promise<{
    overrideCount: number;
    crossTenantCount: number;
    totalSources: number;
  }> {
    try {
      await setTenantContext(tenantId);
      
      // Count override embeddings
      const [overrideCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vectorEmbeddings)
        .where(
          and(
            eq(vectorEmbeddings.tenantId, tenantId),
            sql`${vectorEmbeddings.metadata}->>'agentId' = ${agentId}`
          )
        );

      // Count cross-tenant embeddings
      const [crossTenantCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiCrossTenantEmbeddings)
        .where(eq(aiCrossTenantEmbeddings.agentId, agentId));

      return {
        overrideCount: overrideCount.count || 0,
        crossTenantCount: crossTenantCount.count || 0,
        totalSources: (overrideCount.count || 0) + (crossTenantCount.count || 0)
      };
    } catch (error) {
      console.error(`[ENHANCED-RAG] ❌ Error getting knowledge stats:`, error);
      return { overrideCount: 0, crossTenantCount: 0, totalSources: 0 };
    }
  }
}

// Export singleton instance
export const enhancedRAGService = new EnhancedRAGService();