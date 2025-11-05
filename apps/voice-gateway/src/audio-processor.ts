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
   * FreeSWITCH may send WAV files with 44-byte header - OpenAI needs RAW PCM16
   * OpenAI expects: PCM16, 16kHz, mono, NO HEADER
   */
  processIncomingAudio(audioData: Buffer): Buffer {
    // Check if this is a WAV file (starts with "RIFF")
    if (audioData.length > 44 && 
        audioData[0] === 0x52 && // 'R'
        audioData[1] === 0x49 && // 'I'
        audioData[2] === 0x46 && // 'F'
        audioData[3] === 0x46) { // 'F'
      
      logger.debug('[AudioProcessor] WAV header detected, stripping 44 bytes', {
        originalSize: audioData.length,
        rawSize: audioData.length - 44
      });
      
      // Strip WAV header (first 44 bytes) to get RAW PCM
      return audioData.subarray(44);
    }
    
    logger.debug('[AudioProcessor] Processing RAW PCM audio', {
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
