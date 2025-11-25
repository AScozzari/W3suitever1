import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { db } from '../db/index.js';
import { windtreOffersRaw, windtreOfferChunks, type WindtreOfferRaw } from '../db/schema/brand-interface.js';
import { eq, inArray } from 'drizzle-orm';

interface ChunkResult {
  rawOfferId: string;
  chunkIndex: number;
  chunkText: string;
  metadata: Record<string, any>;
}

interface EmbeddingResult {
  success: boolean;
  chunksProcessed: number;
  embeddingsCreated: number;
  errors: string[];
}

export class WindtreChunkingEmbeddingService {
  private openai: OpenAI;
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private readonly MAX_CHUNK_SIZE = 512; // tokens (approx 2048 chars)
  private readonly CHUNK_OVERLAP = 50; // tokens overlap
  private readonly BATCH_SIZE = 100; // Process 100 embeddings per batch

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found. Install OpenAI integration via Replit.');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Extract clean text from HTML content
   */
  private extractTextFromHtml(html: string): { text: string; metadata: Record<string, any> } {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, iframe, noscript').remove();

    // Extract metadata from specific elements
    const metadata: Record<string, any> = {};

    // Try to extract offer-specific data
    const offerType = $('[data-offer-type]').attr('data-offer-type') || 
                      $('.offer-type').text().trim() ||
                      '';
    
    const price = $('[data-price]').attr('data-price') || 
                  $('.price, .prezzo').first().text().trim() ||
                  '';

    const category = $('[data-category]').attr('data-category') ||
                    $('.category, .categoria').first().text().trim() ||
                    '';

    metadata.offerType = offerType;
    metadata.price = price;
    metadata.category = category;

    // Extract main content
    const mainContent = $('main, article, .content, .main-content').text();
    const bodyContent = mainContent || $('body').text();

    // Clean up whitespace
    const cleanText = bodyContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    return { text: cleanText, metadata };
  }

  /**
   * Split text into chunks with overlap
   */
  private chunkText(text: string, maxChunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    
    // Approximate: 1 token ≈ 4 chars
    const maxChars = maxChunkSize * 4;
    const overlapChars = overlap * 4;

    let startPos = 0;
    
    while (startPos < text.length) {
      const endPos = Math.min(startPos + maxChars, text.length);
      let chunk = text.slice(startPos, endPos);

      // Try to break at sentence boundary
      if (endPos < text.length) {
        const lastPeriod = chunk.lastIndexOf('. ');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > maxChars / 2) {
          chunk = chunk.slice(0, breakPoint + 1);
        }
      }

      chunks.push(chunk.trim());

      // Move start position with overlap
      startPos = endPos - overlapChars;
      
      // Ensure we make progress
      if (startPos <= chunks[chunks.length - 1].length + (chunks.length > 1 ? chunks[chunks.length - 2].length : 0)) {
        startPos = endPos;
      }
    }

    return chunks.filter(chunk => chunk.length > 50); // Filter out too-small chunks
  }

  /**
   * Generate embedding for a single text chunk
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings in batches
   */
  private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Process a single raw offer: extract text, chunk, and generate embeddings
   */
  async processOffer(rawOffer: WindtreOfferRaw): Promise<ChunkResult[]> {
    try {
      // Extract text from HTML
      const { text, metadata } = this.extractTextFromHtml(rawOffer.htmlContent);

      // Add URL and title to metadata
      metadata.url = rawOffer.url;
      metadata.pageTitle = rawOffer.pageTitle;

      // Chunk text
      const textChunks = this.chunkText(text, this.MAX_CHUNK_SIZE, this.CHUNK_OVERLAP);

      // Create chunk results
      const chunkResults: ChunkResult[] = textChunks.map((chunk, index) => ({
        rawOfferId: rawOffer.id,
        chunkIndex: index,
        chunkText: chunk,
        metadata
      }));

      return chunkResults;
    } catch (error) {
      console.error(`Error processing offer ${rawOffer.id}:`, error);
      throw error;
    }
  }

  /**
   * Save chunks with embeddings to database
   */
  private async saveChunksWithEmbeddings(
    chunks: ChunkResult[],
    embeddings: number[][],
    brandTenantId: string
  ): Promise<void> {
    // Delete existing chunks for these raw offers
    const rawOfferIds = Array.from(new Set(chunks.map(c => c.rawOfferId)));
    if (rawOfferIds.length > 0) {
      await db
        .delete(windtreOfferChunks)
        .where(inArray(windtreOfferChunks.rawOfferId, rawOfferIds));
    }

    // Insert new chunks with embeddings
    const chunksToInsert = chunks.map((chunk, index) => ({
      rawOfferId: chunk.rawOfferId,
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.chunkText,
      embedding: embeddings[index],
      metadata: chunk.metadata,
      brandTenantId
    }));

    // Insert in batches
    for (let i = 0; i < chunksToInsert.length; i += this.BATCH_SIZE) {
      const batch = chunksToInsert.slice(i, i + this.BATCH_SIZE);
      await db.insert(windtreOfferChunks).values(batch);
    }
  }

  /**
   * Process all raw offers and generate embeddings
   */
  async processAllOffers(brandTenantId: string): Promise<EmbeddingResult> {
    const errors: string[] = [];
    let chunksProcessed = 0;
    let embeddingsCreated = 0;

    try {
      console.log('🚀 Starting chunking and embedding pipeline...');

      // Get all raw offers
      const rawOffers = await db
        .select()
        .from(windtreOffersRaw)
        .where(eq(windtreOffersRaw.brandTenantId, brandTenantId));

      console.log(`📄 Found ${rawOffers.length} raw offers to process`);

      if (rawOffers.length === 0) {
        return { success: true, chunksProcessed: 0, embeddingsCreated: 0, errors };
      }

      // Process each offer
      const allChunks: ChunkResult[] = [];

      for (const offer of rawOffers) {
        try {
          const chunks = await this.processOffer(offer);
          allChunks.push(...chunks);
          chunksProcessed += chunks.length;
          console.log(`✅ Processed ${offer.url}: ${chunks.length} chunks`);
        } catch (error) {
          const errorMsg = `Failed to process ${offer.url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`📦 Total chunks created: ${allChunks.length}`);

      // Generate embeddings in batches
      console.log('🔮 Generating embeddings...');
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < allChunks.length; i += this.BATCH_SIZE) {
        const batch = allChunks.slice(i, i + this.BATCH_SIZE);
        const texts = batch.map(chunk => chunk.chunkText);

        try {
          const embeddings = await this.generateEmbeddingsBatch(texts);
          allEmbeddings.push(...embeddings);
          embeddingsCreated += embeddings.length;

          console.log(`✅ Generated embeddings batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / this.BATCH_SIZE)}`);
        } catch (error) {
          const errorMsg = `Failed to generate embeddings for batch ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Save chunks with embeddings to database
      if (allEmbeddings.length > 0) {
        console.log('💾 Saving chunks with embeddings to database...');
        await this.saveChunksWithEmbeddings(allChunks, allEmbeddings, brandTenantId);
        console.log(`✅ Saved ${allEmbeddings.length} chunks with embeddings`);
      }

      return {
        success: errors.length === 0,
        chunksProcessed,
        embeddingsCreated,
        errors
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      console.error('❌ Embedding pipeline failed:', error);

      return {
        success: false,
        chunksProcessed,
        embeddingsCreated,
        errors
      };
    }
  }
}
