import { db } from '../db/index.js';
import { ragAgents, ragDataSources, ragChunks, ragSyncJobs, ragEmbeddingsUsage } from '../db/schema/brand-interface.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
}

interface RagAgentConfig {
  agentId: string;
  agentName: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
  similarityThreshold?: number;
}

export class RagMultiAgentService {
  private brandTenantId: string;

  constructor(brandTenantId: string) {
    this.brandTenantId = brandTenantId;
  }

  async ensureRagAgent(config: RagAgentConfig): Promise<string> {
    const existing = await db
      .select()
      .from(ragAgents)
      .where(
        and(
          eq(ragAgents.agentId, config.agentId),
          eq(ragAgents.brandTenantId, this.brandTenantId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    const [agent] = await db
      .insert(ragAgents)
      .values({
        agentId: config.agentId,
        agentName: config.agentName,
        embeddingModel: config.embeddingModel || 'text-embedding-3-small',
        chunkSize: config.chunkSize || 512,
        chunkOverlap: config.chunkOverlap || 50,
        topK: config.topK || 5,
        similarityThreshold: config.similarityThreshold || 0.7,
        isActive: true,
        brandTenantId: this.brandTenantId,
        metadata: {}
      })
      .returning();

    console.log(`✅ RAG Agent created: ${config.agentId} (${agent.id})`);
    return agent.id;
  }

  async addWebUrlSource(
    agentId: string,
    url: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const ragAgent = await this.getRagAgentByAgentId(agentId);
    if (!ragAgent) {
      throw new Error(`RAG agent not found: ${agentId}`);
    }

    const checksum = crypto.createHash('sha256').update(url).digest('hex');

    const existing = await db
      .select()
      .from(ragDataSources)
      .where(
        and(
          eq(ragDataSources.ragAgentId, ragAgent.id),
          eq(ragDataSources.sourceChecksum, checksum)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`⚠️  URL already exists: ${url}`);
      return existing[0].id;
    }

    const [source] = await db
      .insert(ragDataSources)
      .values({
        ragAgentId: ragAgent.id,
        sourceType: 'web_url',
        sourceUrl: url,
        sourceChecksum: checksum,
        status: 'pending',
        metadata: metadata || {},
        brandTenantId: this.brandTenantId
      })
      .returning();

    console.log(`✅ Web URL source added: ${url} (${source.id})`);
    return source.id;
  }

  async addDocumentSource(
    agentId: string,
    fileName: string,
    fileSize: number,
    rawContent: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const ragAgent = await this.getRagAgentByAgentId(agentId);
    if (!ragAgent) {
      throw new Error(`RAG agent not found: ${agentId}`);
    }

    const checksum = crypto.createHash('sha256').update(rawContent).digest('hex');

    const [source] = await db
      .insert(ragDataSources)
      .values({
        ragAgentId: ragAgent.id,
        sourceType: fileName.endsWith('.pdf') ? 'pdf_upload' : 'doc_upload',
        fileName,
        fileSize,
        rawContent,
        sourceChecksum: checksum,
        status: 'pending',
        metadata: metadata || {},
        brandTenantId: this.brandTenantId
      })
      .returning();

    console.log(`✅ Document source added: ${fileName} (${source.id})`);
    return source.id;
  }

  async addManualTextSource(
    agentId: string,
    text: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const ragAgent = await this.getRagAgentByAgentId(agentId);
    if (!ragAgent) {
      throw new Error(`RAG agent not found: ${agentId}`);
    }

    const checksum = crypto.createHash('sha256').update(text).digest('hex');

    const [source] = await db
      .insert(ragDataSources)
      .values({
        ragAgentId: ragAgent.id,
        sourceType: 'manual_text',
        rawContent: text,
        sourceChecksum: checksum,
        status: 'pending',
        metadata: metadata || {},
        brandTenantId: this.brandTenantId
      })
      .returning();

    console.log(`✅ Manual text source added (${source.id})`);
    return source.id;
  }

  async processDataSource(dataSourceId: string): Promise<void> {
    const source = await db
      .select()
      .from(ragDataSources)
      .where(eq(ragDataSources.id, dataSourceId))
      .limit(1);

    if (source.length === 0) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    const dataSource = source[0];
    const ragAgent = await db
      .select()
      .from(ragAgents)
      .where(eq(ragAgents.id, dataSource.ragAgentId))
      .limit(1);

    if (ragAgent.length === 0) {
      throw new Error(`RAG agent not found: ${dataSource.ragAgentId}`);
    }

    const agent = ragAgent[0];

    const syncJob = await db
      .insert(ragSyncJobs)
      .values({
        ragAgentId: agent.id,
        dataSourceId: dataSource.id,
        jobType: 'single_source',
        status: 'running',
        startedAt: new Date(),
        brandTenantId: this.brandTenantId
      })
      .returning();

    try {
      await db
        .update(ragDataSources)
        .set({ status: 'processing' })
        .where(eq(ragDataSources.id, dataSourceId));

      let textContent = '';

      if (dataSource.sourceType === 'web_url') {
        textContent = await this.scrapeWebUrl(dataSource.sourceUrl!);
      } else {
        textContent = dataSource.rawContent || '';
      }

      const chunks = this.chunkText(textContent, {
        chunkSize: agent.chunkSize,
        chunkOverlap: agent.chunkOverlap
      });

      console.log(`📄 Created ${chunks.length} chunks for source ${dataSourceId}`);

      const embeddings = await this.generateEmbeddings(chunks, agent.embeddingModel);

      let tokensUsed = 0;
      for (const chunk of chunks) {
        tokensUsed += Math.ceil(chunk.length / 4);
      }

      for (let i = 0; i < chunks.length; i++) {
        await db.insert(ragChunks).values({
          ragAgentId: agent.id,
          dataSourceId: dataSource.id,
          chunkIndex: i,
          chunkText: chunks[i],
          embedding: JSON.stringify(embeddings[i]),
          metadata: {},
          brandTenantId: this.brandTenantId
        });
      }

      await db
        .insert(ragEmbeddingsUsage)
        .values({
          ragAgentId: agent.id,
          syncJobId: syncJob[0].id,
          embeddingModel: agent.embeddingModel,
          tokensUsed,
          chunksProcessed: chunks.length,
          estimatedCost: (tokensUsed / 1000000) * 0.02,
          brandTenantId: this.brandTenantId
        });

      await db
        .update(ragDataSources)
        .set({
          status: 'completed',
          chunksCount: chunks.length,
          lastSyncAt: new Date()
        })
        .where(eq(ragDataSources.id, dataSourceId));

      await db
        .update(ragSyncJobs)
        .set({
          status: 'completed',
          progress: 100,
          chunksCreated: chunks.length,
          tokensUsed,
          completedAt: new Date()
        })
        .where(eq(ragSyncJobs.id, syncJob[0].id));

      console.log(`✅ Processed source ${dataSourceId}: ${chunks.length} chunks`);
    } catch (error: any) {
      await db
        .update(ragDataSources)
        .set({
          status: 'failed',
          errorMessage: error.message
        })
        .where(eq(ragDataSources.id, dataSourceId));

      await db
        .update(ragSyncJobs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        })
        .where(eq(ragSyncJobs.id, syncJob[0].id));

      throw error;
    }
  }

  async searchSimilar(
    agentId: string,
    query: string,
    limit: number = 5
  ): Promise<Array<{ text: string; similarity: number; metadata: any }>> {
    const ragAgent = await this.getRagAgentByAgentId(agentId);
    if (!ragAgent) {
      throw new Error(`RAG agent not found: ${agentId}`);
    }

    const queryEmbedding = await this.generateEmbedding(query, ragAgent.embeddingModel);

    const results = await db.execute(sql`
      SELECT 
        id,
        chunk_text,
        metadata,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
      FROM brand_interface.rag_chunks
      WHERE rag_agent_id = ${ragAgent.id}
        AND brand_tenant_id = ${this.brandTenantId}
        AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${ragAgent.similarityThreshold}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${Math.min(limit, 20)}
    `);

    return results.rows.map((row: any) => ({
      text: row.chunk_text,
      similarity: parseFloat(row.similarity),
      metadata: row.metadata
    }));
  }

  async deleteDataSource(dataSourceId: string): Promise<void> {
    await db
      .delete(ragDataSources)
      .where(
        and(
          eq(ragDataSources.id, dataSourceId),
          eq(ragDataSources.brandTenantId, this.brandTenantId)
        )
      );

    console.log(`🗑️  Deleted data source: ${dataSourceId}`);
  }

  async listDataSources(agentId: string): Promise<any[]> {
    const ragAgent = await this.getRagAgentByAgentId(agentId);
    if (!ragAgent) {
      return [];
    }

    const sources = await db
      .select()
      .from(ragDataSources)
      .where(
        and(
          eq(ragDataSources.ragAgentId, ragAgent.id),
          eq(ragDataSources.brandTenantId, this.brandTenantId)
        )
      )
      .orderBy(desc(ragDataSources.createdAt));

    return sources;
  }

  async listChunks(
    agentId: string,
    dataSourceId?: string,
    limit: number = 50
  ): Promise<any[]> {
    const ragAgent = await this.getRagAgentByAgentId(agentId);
    if (!ragAgent) {
      return [];
    }

    const conditions = [
      eq(ragChunks.ragAgentId, ragAgent.id),
      eq(ragChunks.brandTenantId, this.brandTenantId)
    ];

    if (dataSourceId) {
      conditions.push(eq(ragChunks.dataSourceId, dataSourceId));
    }

    const chunks = await db
      .select()
      .from(ragChunks)
      .where(and(...conditions))
      .orderBy(ragChunks.chunkIndex)
      .limit(limit);

    return chunks;
  }

  async getAgentStats(agentId: string): Promise<any> {
    const ragAgent = await this.getRagAgentByAgentId(agentId);
    if (!ragAgent) {
      return null;
    }

    const sourcesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ragDataSources)
      .where(
        and(
          eq(ragDataSources.ragAgentId, ragAgent.id),
          eq(ragDataSources.brandTenantId, this.brandTenantId)
        )
      );

    const chunksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ragChunks)
      .where(
        and(
          eq(ragChunks.ragAgentId, ragAgent.id),
          eq(ragChunks.brandTenantId, this.brandTenantId)
        )
      );

    const totalUsage = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(tokens_used), 0)`,
        totalCost: sql<number>`COALESCE(SUM(estimated_cost), 0)`
      })
      .from(ragEmbeddingsUsage)
      .where(
        and(
          eq(ragEmbeddingsUsage.ragAgentId, ragAgent.id),
          eq(ragEmbeddingsUsage.brandTenantId, this.brandTenantId)
        )
      );

    return {
      agentId: ragAgent.agentId,
      agentName: ragAgent.agentName,
      sourcesCount: sourcesCount[0]?.count || 0,
      chunksCount: chunksCount[0]?.count || 0,
      totalTokensUsed: totalUsage[0]?.totalTokens || 0,
      totalCostCents: totalUsage[0]?.totalCost || 0,
      config: {
        embeddingModel: ragAgent.embeddingModel,
        chunkSize: ragAgent.chunkSize,
        chunkOverlap: ragAgent.chunkOverlap,
        topK: ragAgent.topK,
        similarityThreshold: ragAgent.similarityThreshold
      }
    };
  }

  private async getRagAgentByAgentId(agentId: string): Promise<any | null> {
    const agents = await db
      .select()
      .from(ragAgents)
      .where(
        and(
          eq(ragAgents.agentId, agentId),
          eq(ragAgents.brandTenantId, this.brandTenantId)
        )
      )
      .limit(1);

    return agents.length > 0 ? agents[0] : null;
  }

  private async scrapeWebUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }

  private chunkText(text: string, config: ChunkingConfig): string[] {
    const { chunkSize, chunkOverlap } = config;
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push(chunkWords.join(' '));
      i += chunkSize - chunkOverlap;

      if (i >= words.length) break;
    }

    return chunks;
  }

  private async generateEmbedding(text: string, model: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model,
      input: text
    });

    return response.data[0].embedding;
  }

  private async generateEmbeddings(texts: string[], model: string): Promise<number[][]> {
    const batchSize = 100;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await openai.embeddings.create({
        model,
        input: batch
      });

      embeddings.push(...response.data.map(d => d.embedding));
      console.log(`📊 Generated embeddings ${i + 1}-${Math.min(i + batch.length, texts.length)} of ${texts.length}`);
    }

    return embeddings;
  }
}
