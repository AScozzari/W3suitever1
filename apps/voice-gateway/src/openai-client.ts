import WebSocket from 'ws';
import logger from './logger';

export interface OpenAIRealtimeConfig {
  apiKey: string;
  model: string;
  voice?: string;
  instructions?: string;
  tools?: any[];
}

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null;
  private config: OpenAIRealtimeConfig;
  private sessionId: string | null = null;
  private isConnected: boolean = false;

  constructor(config: OpenAIRealtimeConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `wss://api.openai.com/v1/realtime?model=${this.config.model}`;
      
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.ws.on('open', () => {
        logger.info('[OpenAI-Client] WebSocket connection established');
        this.isConnected = true;
        
        // Send session configuration
        this.sendSessionUpdate();
        resolve();
      });

      this.ws.on('error', (error) => {
        logger.error('[OpenAI-Client] WebSocket error', { error: error.message });
        reject(error);
      });

      this.ws.on('close', () => {
        logger.info('[OpenAI-Client] WebSocket connection closed');
        this.isConnected = false;
      });
    });
  }

  private sendSessionUpdate(): void {
    if (!this.ws || !this.isConnected) return;

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.config.instructions || 'You are a helpful Italian customer service agent.',
        voice: this.config.voice || 'shimmer',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 400 // REDUCED for faster, more natural interruptions (like real conversation)
        },
        tools: this.config.tools || [],
        tool_choice: 'auto',
        temperature: 0.95, // INCREASED for maximum naturalness and variability
        max_response_output_tokens: 150 // LIMIT response length for brevity
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
    logger.info('[OpenAI-Client] Session configuration sent');
  }

  sendAudioChunk(audioData: Buffer): void {
    if (!this.ws || !this.isConnected) {
      logger.warn('[OpenAI-Client] Cannot send audio - not connected');
      return;
    }

    const event = {
      type: 'input_audio_buffer.append',
      audio: audioData.toString('base64')
    };

    this.ws.send(JSON.stringify(event));
  }

  commitAudioBuffer(): void {
    if (!this.ws || !this.isConnected) return;

    const event = {
      type: 'input_audio_buffer.commit'
    };

    this.ws.send(JSON.stringify(event));
    logger.debug('[OpenAI-Client] Audio buffer committed');
  }

  clearAudioBuffer(): void {
    if (!this.ws || !this.isConnected) return;

    const event = {
      type: 'input_audio_buffer.clear'
    };

    this.ws.send(JSON.stringify(event));
  }

  createResponse(): void {
    if (!this.ws || !this.isConnected) return;

    const event = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    };

    this.ws.send(JSON.stringify(event));
    logger.debug('[OpenAI-Client] Response creation requested');
  }

  onMessage(callback: (data: any) => void): void {
    if (!this.ws) return;

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const event = JSON.parse(data.toString());
        callback(event);
      } catch (error) {
        logger.error('[OpenAI-Client] Failed to parse message', { error });
      }
    });
  }

  onClose(callback: () => void): void {
    if (!this.ws) return;
    this.ws.on('close', callback);
  }

  onError(callback: (error: Error) => void): void {
    if (!this.ws) return;
    this.ws.on('error', callback);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      logger.info('[OpenAI-Client] Disconnected');
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isActive(): boolean {
    return this.isConnected;
  }
}
