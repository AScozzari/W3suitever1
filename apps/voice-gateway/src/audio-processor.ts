import logger from './logger';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  encoding: string;
}

export class AudioProcessor {
  private config: AudioConfig;

  constructor(config: AudioConfig) {
    this.config = config;
  }

  /**
   * Process incoming audio from FreeSWITCH
   * FreeSWITCH sends PCM audio, we need to ensure it's in the correct format for OpenAI
   * OpenAI expects: PCM16, 16kHz, mono
   */
  processIncomingAudio(audioData: Buffer): Buffer {
    // TODO: If FreeSWITCH sends audio in different format, convert here
    // For now, assuming FreeSWITCH is configured to send PCM16@16kHz mono
    
    logger.debug('[AudioProcessor] Processing incoming audio', {
      size: audioData.length,
      sampleRate: this.config.sampleRate
    });

    return audioData;
  }

  /**
   * Process outgoing audio from OpenAI to FreeSWITCH
   * OpenAI sends PCM16@16kHz, FreeSWITCH expects the same
   */
  processOutgoingAudio(audioData: Buffer): Buffer {
    logger.debug('[AudioProcessor] Processing outgoing audio', {
      size: audioData.length
    });

    return audioData;
  }

  /**
   * Convert base64 encoded audio to Buffer
   */
  base64ToBuffer(base64: string): Buffer {
    return Buffer.from(base64, 'base64');
  }

  /**
   * Convert Buffer to base64
   */
  bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /**
   * Validate audio format
   */
  validateAudioFormat(audioData: Buffer): boolean {
    // Basic validation - check if buffer is not empty and has reasonable size
    if (!audioData || audioData.length === 0) {
      logger.warn('[AudioProcessor] Invalid audio data - empty buffer');
      return false;
    }

    // PCM16 audio should have even number of bytes (2 bytes per sample)
    if (audioData.length % 2 !== 0) {
      logger.warn('[AudioProcessor] Invalid audio data - odd number of bytes for PCM16');
      return false;
    }

    return true;
  }

  /**
   * Calculate audio duration in milliseconds
   */
  calculateDuration(audioData: Buffer): number {
    // PCM16: 2 bytes per sample
    const samples = audioData.length / 2;
    const duration = (samples / this.config.sampleRate) * 1000;
    return Math.round(duration);
  }
}
