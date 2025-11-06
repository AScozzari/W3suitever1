/**
 * ESL Call Handler
 * 
 * Manages bidirectional audio streaming between FreeSWITCH (via ESL) and OpenAI Voice Gateway.
 * Each incoming ESL connection from FreeSWITCH gets its own call handler instance.
 */

import { Connection } from 'modesl';
import logger from './logger';
import { OpenAIRealtimeClient } from './openai-client';
import { AudioProcessor } from './audio-processor';
import { allFunctionTools } from './function-tools';

export interface ESLCallConfig {
  tenantId: string;
  storeId: string;
  did: string;
  callerNumber: string;
  aiAgentRef: string;
  openaiApiKey: string;
  openaiModel: string;
  w3ApiUrl: string;
  w3ApiKey: string;
}

export class ESLCallHandler {
  private conn: Connection;
  private config: ESLCallConfig;
  private callId: string;
  private openaiClient: OpenAIRealtimeClient | null = null;
  private audioProcessor: AudioProcessor | null = null;
  private isActive: boolean = false;
  private audioBuffer: Buffer[] = [];
  private responseBuffer: Buffer[] = [];
  private lastCommitTime: Date = new Date();

  constructor(conn: Connection, config: ESLCallConfig) {
    this.conn = conn;
    this.config = config;
    this.callId = this.generateCallId();

    logger.info('[ESL-CallHandler] Handler created', {
      callId: this.callId,
      tenantId: config.tenantId,
      aiAgentRef: config.aiAgentRef
    });
  }

  private generateCallId(): string {
    return `esl-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Initialize the call - Fetch AI instructions, setup OpenAI connection
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[ESL-CallHandler] Initializing call', { callId: this.callId });

      // Fetch AI agent instructions from Brand API
      const agentInstructions = await this.fetchAgentInstructions();

      // Create OpenAI client
      this.openaiClient = new OpenAIRealtimeClient({
        apiKey: this.config.openaiApiKey,
        model: this.config.openaiModel,
        instructions: agentInstructions,
        tools: allFunctionTools as any
      });

      // Connect to OpenAI
      await this.openaiClient.connect();

      // Setup OpenAI event handlers
      this.setupOpenAIHandlers();

      // Create audio processor
      this.audioProcessor = new AudioProcessor({
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm16'
      });

      this.isActive = true;

      logger.info('[ESL-CallHandler] Initialization complete', { callId: this.callId });
    } catch (error) {
      logger.error('[ESL-CallHandler] Initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        callId: this.callId
      });
      throw error;
    }
  }

  /**
   * Fetch AI agent instructions from Brand API
   */
  private async fetchAgentInstructions(): Promise<string> {
    try {
      const response = await fetch(
        `${this.config.w3ApiUrl}/brand-api/ai-agents/${this.config.aiAgentRef}`,
        {
          headers: {
            'X-API-Key': this.config.w3ApiKey,
            'X-Tenant-ID': this.config.tenantId
          }
        }
      );

      if (!response.ok) {
        logger.warn('[ESL-CallHandler] Failed to fetch agent instructions, using default', {
          status: response.status,
          aiAgentRef: this.config.aiAgentRef
        });
        return 'Sei un assistente vocale di W3 Suite. Rispondi sempre in italiano in modo professionale e cortese.';
      }

      const data = await response.json();
      return data.data?.systemPrompt || 'Sei un assistente vocale di W3 Suite. Rispondi sempre in italiano in modo professionale e cortese.';
    } catch (error) {
      logger.error('[ESL-CallHandler] Error fetching agent instructions', { error });
      return 'Sei un assistente vocale di W3 Suite. Rispondi sempre in italiano in modo professionale e cortese.';
    }
  }

  /**
   * Setup OpenAI event handlers for audio responses and transcription
   */
  private setupOpenAIHandlers(): void {
    if (!this.openaiClient) return;

    this.openaiClient.onMessage((event: any) => {
      try {
        switch (event.type) {
          case 'response.audio.delta':
            // AI is speaking - collect audio chunks
            if (event.delta) {
              const audioBuffer = Buffer.from(event.delta, 'base64');
              this.responseBuffer.push(audioBuffer);
              logger.debug('[ESL-CallHandler] AI audio delta received', {
                callId: this.callId,
                bytes: audioBuffer.length
              });
            }
            break;

          case 'response.audio.done':
            // AI finished speaking - play collected audio
            this.playAIResponse();
            break;

          case 'response.done':
            logger.info('[ESL-CallHandler] AI response complete', { callId: this.callId });
            break;

          case 'input_audio_buffer.speech_started':
            logger.debug('[ESL-CallHandler] User started speaking', { callId: this.callId });
            break;

          case 'input_audio_buffer.speech_stopped':
            logger.debug('[ESL-CallHandler] User stopped speaking', { callId: this.callId });
            break;

          case 'conversation.item.input_audio_transcription.completed':
            if (event.transcript) {
              logger.info('[ESL-CallHandler] User transcript', {
                callId: this.callId,
                transcript: event.transcript
              });
            }
            break;

          case 'error':
            logger.error('[ESL-CallHandler] OpenAI error', {
              callId: this.callId,
              error: event.error
            });
            break;
        }
      } catch (error) {
        logger.error('[ESL-CallHandler] Error processing OpenAI event', {
          callId: this.callId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * Handle incoming audio from FreeSWITCH
   */
  handleIncomingAudio(audioData: Buffer): void {
    if (!this.isActive || !this.openaiClient) {
      logger.warn('[ESL-CallHandler] Cannot process audio - handler not active', {
        callId: this.callId
      });
      return;
    }

    try {
      // Send audio to OpenAI
      this.openaiClient.sendAudioChunk(audioData);
      this.audioBuffer.push(audioData);

      // Auto-commit buffer every 1 second
      const now = new Date();
      if (now.getTime() - this.lastCommitTime.getTime() > 1000) {
        this.openaiClient.commitAudioBuffer();
        this.lastCommitTime = now;
      }

      logger.debug('[ESL-CallHandler] Audio sent to OpenAI', {
        callId: this.callId,
        bytes: audioData.length
      });
    } catch (error) {
      logger.error('[ESL-CallHandler] Error handling incoming audio', {
        callId: this.callId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Play AI response audio back to FreeSWITCH caller
   */
  private async playAIResponse(): Promise<void> {
    if (this.responseBuffer.length === 0) {
      logger.warn('[ESL-CallHandler] No audio to play', { callId: this.callId });
      return;
    }

    try {
      // Concatenate all audio chunks
      const fullAudio = Buffer.concat(this.responseBuffer);
      this.responseBuffer = []; // Clear buffer

      logger.info('[ESL-CallHandler] Playing AI response', {
        callId: this.callId,
        bytes: fullAudio.length
      });

      // Write audio to FreeSWITCH via ESL
      // NOTE: This requires configuring FreeSWITCH to receive audio via ESL
      // For production, we'll use FreeSWITCH's mod_shout or file playback
      const tempFile = `/tmp/ai_response_${this.callId}_${Date.now()}.wav`;
      
      // Convert PCM to WAV and write to temp file
      // Then use FreeSWITCH playback command
      await this.writePCMToWAV(fullAudio, tempFile);
      
      // Execute playback via ESL
      this.conn.execute('playback', tempFile, () => {
        logger.info('[ESL-CallHandler] AI audio playback complete', { callId: this.callId });
        
        // Cleanup temp file
        setTimeout(() => {
          try {
            require('fs').unlinkSync(tempFile);
          } catch (err) {
            logger.warn('[ESL-CallHandler] Failed to cleanup temp file', { tempFile });
          }
        }, 1000);
      });
    } catch (error) {
      logger.error('[ESL-CallHandler] Error playing AI response', {
        callId: this.callId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Convert PCM16 raw audio to WAV format
   */
  private async writePCMToWAV(pcmData: Buffer, outputPath: string): Promise<void> {
    const fs = require('fs');
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    // Create WAV header
    const header = Buffer.alloc(44);
    
    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    
    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    
    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    // Write header + PCM data
    fs.writeFileSync(outputPath, Buffer.concat([header, pcmData]));
  }

  /**
   * End the call and cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('[ESL-CallHandler] Cleaning up call', { callId: this.callId });

      this.isActive = false;

      // Disconnect OpenAI
      if (this.openaiClient) {
        this.openaiClient.disconnect();
        this.openaiClient = null;
      }

      // Clear buffers
      this.audioBuffer = [];
      this.responseBuffer = [];

      logger.info('[ESL-CallHandler] Cleanup complete', { callId: this.callId });
    } catch (error) {
      logger.error('[ESL-CallHandler] Error during cleanup', {
        callId: this.callId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  getCallId(): string {
    return this.callId;
  }

  isCallActive(): boolean {
    return this.isActive;
  }
}
