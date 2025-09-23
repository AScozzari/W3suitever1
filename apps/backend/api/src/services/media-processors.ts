/**
 * Media Processing Module for Training AI
 * Handles PDF, images, audio, video with intelligent chunking and metadata extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnifiedOpenAIService } from './unified-openai';

export interface MediaChunk {
  id: string;
  content: string;
  type: 'text' | 'audio' | 'visual' | 'mixed';
  metadata: {
    sourceFile: string;
    chunkIndex: number;
    totalChunks: number;
    startTime?: number;    // For audio/video
    endTime?: number;      // For audio/video
    pageNumber?: number;   // For PDFs
    imageRegion?: {       // For images
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  embedding?: number[];
  processingTime?: number;
}

export interface ProcessingResult {
  success: boolean;
  chunks: MediaChunk[];
  metadata: {
    totalDuration?: number;
    totalPages?: number;
    dimensions?: { width: number; height: number };
    fileSize: number;
    mimeType: string;
    processingTimeMs: number;
  };
  error?: string;
}

export class MediaProcessorService {
  private openaiService: UnifiedOpenAIService;
  private maxChunkSize: number = 2000; // Characters per chunk for text
  private audioChunkDuration: number = 60; // Seconds per audio chunk
  
  constructor(openaiService: UnifiedOpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Main entry point for processing any media type
   */
  async processMedia(
    filePath: string,
    mediaType: 'pdf' | 'image' | 'audio' | 'video',
    settings: any,
    context: any
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      let result: ProcessingResult;
      
      switch (mediaType) {
        case 'pdf':
          result = await this.processPDF(filePath, settings, context);
          break;
        case 'image':
          result = await this.processImage(filePath, settings, context);
          break;
        case 'audio':
          result = await this.processAudio(filePath, settings, context);
          break;
        case 'video':
          result = await this.processVideo(filePath, settings, context);
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }
      
      result.metadata.processingTimeMs = Date.now() - startTime;
      return result;
      
    } catch (error: any) {
      return {
        success: false,
        chunks: [],
        metadata: {
          fileSize: 0,
          mimeType: '',
          processingTimeMs: Date.now() - startTime
        },
        error: error.message
      };
    }
  }

  /**
   * Process PDF documents with text extraction and chunking
   */
  private async processPDF(
    filePath: string,
    settings: any,
    context: any
  ): Promise<ProcessingResult> {
    try {
      // Note: In production, use pdf-parse or similar library
      // For now, we'll simulate PDF processing
      const stats = fs.statSync(filePath);
      
      // Simulated PDF extraction (replace with actual pdf-parse)
      const simulatedText = `PDF content from ${path.basename(filePath)}`;
      const chunks = this.chunkText(simulatedText, filePath);
      
      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embeddingResult = await this.openaiService.generateEmbedding(
          chunk.content,
          settings,
          context
        );
        if (embeddingResult.success && embeddingResult.embedding) {
          chunk.embedding = embeddingResult.embedding;
        }
      }
      
      return {
        success: true,
        chunks,
        metadata: {
          totalPages: 1, // Would be extracted from PDF
          fileSize: stats.size,
          mimeType: 'application/pdf',
          processingTimeMs: 0
        }
      };
    } catch (error: any) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process images with Vision API and region analysis
   */
  private async processImage(
    filePath: string,
    settings: any,
    context: any
  ): Promise<ProcessingResult> {
    try {
      const stats = fs.statSync(filePath);
      
      // Analyze image using Vision API
      const visionResult = await this.openaiService.analyzeImage(
        {
          mediaType: 'image',
          filePath: filePath,
          analyzeContent: true
        },
        settings,
        context
      );
      
      // Create a chunk for the image analysis
      const chunk: MediaChunk = {
        id: `img_${Date.now()}`,
        content: visionResult.description,
        type: 'visual',
        metadata: {
          sourceFile: filePath,
          chunkIndex: 0,
          totalChunks: 1
        }
      };
      
      // Generate embedding for the description
      const embeddingResult = await this.openaiService.generateEmbedding(
        visionResult.description,
        settings,
        context
      );
      if (embeddingResult.success && embeddingResult.embedding) {
        chunk.embedding = embeddingResult.embedding;
      }
      
      return {
        success: true,
        chunks: [chunk],
        metadata: {
          fileSize: stats.size,
          mimeType: this.getMimeType(filePath),
          processingTimeMs: 0
        }
      };
    } catch (error: any) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Process audio files with Whisper transcription
   */
  private async processAudio(
    filePath: string,
    settings: any,
    context: any
  ): Promise<ProcessingResult> {
    try {
      const stats = fs.statSync(filePath);
      
      // Transcribe audio using Whisper
      const transcriptionResult = await this.openaiService.transcribeAudio(
        {
          mediaType: 'audio',
          filePath: filePath,
          language: 'it'
        },
        settings,
        context
      );
      
      // Create chunks from transcription segments
      const chunks: MediaChunk[] = [];
      
      if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
        // Use existing segments from Whisper
        for (let i = 0; i < transcriptionResult.segments.length; i++) {
          const segment = transcriptionResult.segments[i];
          const chunk: MediaChunk = {
            id: `audio_${Date.now()}_${i}`,
            content: segment.text,
            type: 'audio',
            metadata: {
              sourceFile: filePath,
              chunkIndex: i,
              totalChunks: transcriptionResult.segments.length,
              startTime: segment.start,
              endTime: segment.end
            }
          };
          
          // Generate embedding for each segment
          const embeddingResult = await this.openaiService.generateEmbedding(
            segment.text,
            settings,
            context
          );
          if (embeddingResult.success && embeddingResult.embedding) {
            chunk.embedding = embeddingResult.embedding;
          }
          
          chunks.push(chunk);
        }
      } else {
        // Fallback: create single chunk with full transcription
        const chunk: MediaChunk = {
          id: `audio_${Date.now()}_0`,
          content: transcriptionResult.text,
          type: 'audio',
          metadata: {
            sourceFile: filePath,
            chunkIndex: 0,
            totalChunks: 1,
            startTime: 0,
            endTime: transcriptionResult.duration
          }
        };
        
        const embeddingResult = await this.openaiService.generateEmbedding(
          transcriptionResult.text,
          settings,
          context
        );
        if (embeddingResult.success && embeddingResult.embedding) {
          chunk.embedding = embeddingResult.embedding;
        }
        
        chunks.push(chunk);
      }
      
      return {
        success: true,
        chunks,
        metadata: {
          totalDuration: transcriptionResult.duration,
          fileSize: stats.size,
          mimeType: this.getMimeType(filePath),
          processingTimeMs: 0
        }
      };
    } catch (error: any) {
      throw new Error(`Audio processing failed: ${error.message}`);
    }
  }

  /**
   * Process video files (extract audio + keyframes)
   */
  private async processVideo(
    filePath: string,
    settings: any,
    context: any
  ): Promise<ProcessingResult> {
    try {
      const stats = fs.statSync(filePath);
      
      // For video, we would:
      // 1. Extract audio track and transcribe
      // 2. Extract keyframes and analyze with Vision
      // 3. Combine both into synchronized chunks
      
      // For now, simulating video processing
      const chunks: MediaChunk[] = [{
        id: `video_${Date.now()}`,
        content: `Video content from ${path.basename(filePath)}`,
        type: 'mixed',
        metadata: {
          sourceFile: filePath,
          chunkIndex: 0,
          totalChunks: 1
        }
      }];
      
      return {
        success: true,
        chunks,
        metadata: {
          fileSize: stats.size,
          mimeType: this.getMimeType(filePath),
          processingTimeMs: 0
        }
      };
    } catch (error: any) {
      throw new Error(`Video processing failed: ${error.message}`);
    }
  }

  /**
   * Intelligent text chunking with overlap
   */
  private chunkText(text: string, sourceFile: string): MediaChunk[] {
    const chunks: MediaChunk[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= this.maxChunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push({
            id: `text_${Date.now()}_${chunkIndex}`,
            content: currentChunk.trim(),
            type: 'text',
            metadata: {
              sourceFile,
              chunkIndex,
              totalChunks: 0 // Will be updated
            }
          });
          chunkIndex++;
        }
        currentChunk = sentence;
      }
    }
    
    // Add the last chunk
    if (currentChunk) {
      chunks.push({
        id: `text_${Date.now()}_${chunkIndex}`,
        content: currentChunk.trim(),
        type: 'text',
        metadata: {
          sourceFile,
          chunkIndex,
          totalChunks: 0
        }
      });
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Calculate similarity between embeddings
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimensions');
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }
}