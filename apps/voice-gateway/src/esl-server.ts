/**
 * ESL Server
 * 
 * FreeSWITCH Event Socket Layer (ESL) server for enterprise-grade VoIP integration.
 * Listens for incoming socket connections from FreeSWITCH and manages AI voice calls.
 * 
 * Architecture:
 * - FreeSWITCH executes: <action application="socket" data="REPLIT_IP:8081 async full"/>
 * - This server receives the connection and handles bidirectional audio
 * - Each connection spawns an ESLCallHandler for that specific call
 * 
 * IMPORTANT: Port 8081 is used (not 8084) because Replit only supports exposing
 * these external ports: 3000, 3001, 3002, 3003, 4200, 5000, 5173, 6000, 6800, 8000, 8008, 8081
 */

import * as esl from 'modesl';
import logger from './logger';
import { ESLCallHandler, ESLCallConfig } from './esl-call-handler';

export interface ESLServerConfig {
  port: number;
  host: string;
  openaiApiKey: string;
  openaiModel: string;
  w3ApiUrl: string;
  w3ApiKey: string;
}

export class VoiceGatewayESLServer {
  private server: any; // modesl.Server type
  private config: ESLServerConfig;
  private activeCallHandlers: Map<string, ESLCallHandler> = new Map();
  private isStarted: boolean = false;

  constructor(config: ESLServerConfig) {
    this.config = config;
    // Initialize server later in start() method
  }

  /**
   * Setup ESL server event handlers
   */
  private setupServerHandlers(): void {
    this.server.on('connection::ready', (conn: any, id: string) => {
      logger.info('[ESL-Server] New FreeSWITCH connection ready', { connectionId: id });
      
      this.handleNewConnection(conn);
    });

    this.server.on('connection::close', (conn: any, id: string) => {
      logger.info('[ESL-Server] FreeSWITCH connection closed', { connectionId: id });
    });

    this.server.on('error', (error: Error) => {
      logger.error('[ESL-Server] Server error', { error: error.message });
    });
  }

  /**
   * Handle new incoming connection from FreeSWITCH
   */
  private async handleNewConnection(conn: any): Promise<void> {
    try {
      // Get call UUID and basic info
      const callUUID = conn.getInfo().getHeader('Unique-ID') || conn.getInfo().getHeader('unique-id');
      const callerNumber = conn.getInfo().getHeader('Caller-Caller-ID-Number') || 'unknown';
      const did = conn.getInfo().getHeader('Caller-Destination-Number') || 'unknown';

      logger.info('[ESL-Server] Call info extracted', {
        callUUID,
        callerNumber,
        did
      });

      await this.initializeCall(conn, {
        callerNumber: callerNumber.trim(),
        did: did.trim()
      });

    } catch (error) {
      logger.error('[ESL-Server] Error handling new connection', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Hangup the call on error
      conn.execute('hangup', 'NORMAL_CLEARING');
    }
  }

  /**
   * Initialize call handler for the incoming call
   */
  private async initializeCall(conn: any, callInfo: { callerNumber: string; did: string }): Promise<void> {
    try {
      logger.info('[ESL-Server] Initializing call', {
        callerNumber: callInfo.callerNumber,
        did: callInfo.did
      });

      // TODO: Fetch tenant/store config based on DID
      // For now, using hardcoded values from environment
      const callConfig: ESLCallConfig = {
        tenantId: process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001',
        storeId: process.env.DEFAULT_STORE_ID || '50000000-0000-0000-0000-000000000010',
        did: callInfo.did,
        callerNumber: callInfo.callerNumber,
        aiAgentRef: process.env.DEFAULT_AI_AGENT_REF || 'customer-care-voice',
        openaiApiKey: this.config.openaiApiKey,
        openaiModel: this.config.openaiModel,
        w3ApiUrl: this.config.w3ApiUrl,
        w3ApiKey: this.config.w3ApiKey
      };

      // Create call handler
      const callHandler = new ESLCallHandler(conn, callConfig);
      
      // Initialize (fetch AI config, connect to OpenAI)
      await callHandler.initialize();
      
      // Store handler
      this.activeCallHandlers.set(callHandler.getCallId(), callHandler);

      // Answer the call
      conn.execute('answer', '', () => {
        logger.info('[ESL-Server] Call answered', { callId: callHandler.getCallId() });
        
        // Start capturing audio
        this.startAudioCapture(conn, callHandler);
      });

      // Setup hangup handler
      conn.on('esl::end', async () => {
        logger.info('[ESL-Server] Call ended', { callId: callHandler.getCallId() });
        
        await callHandler.cleanup();
        this.activeCallHandlers.delete(callHandler.getCallId());
      });

    } catch (error) {
      logger.error('[ESL-Server] Error initializing call', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Hangup on initialization error
      conn.execute('hangup', 'NORMAL_CLEARING');
    }
  }

  /**
   * Start capturing audio from the call
   * Uses FreeSWITCH's record_session or uuid_record to capture audio
   */
  private startAudioCapture(conn: any, callHandler: ESLCallHandler): void {
    try {
      const callId = callHandler.getCallId();
      const audioFile = `/tmp/${callId}_audio.raw`;

      logger.info('[ESL-Server] Starting audio capture', { callId, audioFile });

      // Start recording the call in RAW PCM16 format
      // Format: 16kHz, mono, PCM16 (matches OpenAI requirements)
      conn.execute('record_session', `${audioFile}`, () => {
        logger.info('[ESL-Server] Recording started', { callId });
      });

      // Setup periodic audio reading
      // We'll read chunks from the file and send to OpenAI
      const audioReadInterval = setInterval(async () => {
        if (!callHandler.isCallActive()) {
          clearInterval(audioReadInterval);
          return;
        }

        try {
          const fs = require('fs');
          
          // Check if file exists
          if (!fs.existsSync(audioFile)) {
            return;
          }

          // Read audio file in chunks
          const stats = fs.statSync(audioFile);
          const audioData = fs.readFileSync(audioFile);
          
          if (audioData.length > 0) {
            // Send audio to call handler
            callHandler.handleIncomingAudio(audioData);
            
            // Clear the file for next chunk
            fs.writeFileSync(audioFile, Buffer.alloc(0));
          }
        } catch (error) {
          logger.error('[ESL-Server] Error reading audio file', {
            callId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, 200); // Read every 200ms

      // Cleanup audio file on hangup
      conn.on('esl::end', () => {
        clearInterval(audioReadInterval);
        
        try {
          const fs = require('fs');
          if (fs.existsSync(audioFile)) {
            fs.unlinkSync(audioFile);
          }
        } catch (error) {
          logger.warn('[ESL-Server] Failed to cleanup audio file', { audioFile });
        }
      });

    } catch (error) {
      logger.error('[ESL-Server] Error starting audio capture', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Start the ESL server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.isStarted) {
          logger.warn('[ESL-Server] Server already started');
          resolve();
          return;
        }

        // Create modesl server with configuration
        this.server = new esl.Server(
          { 
            port: this.config.port, 
            host: this.config.host,
            myevents: true // Enable myevents for this connection
          },
          () => {
            logger.info('=====================================');
            logger.info('🎙️  W3 Voice Gateway ESL Server Started');
            logger.info('=====================================');
            logger.info(`ESL Port: ${this.config.port}`);
            logger.info(`Host: ${this.config.host}`);
            logger.info(`OpenAI Model: ${this.config.openaiModel}`);
            logger.info('=====================================');
            logger.info('📡 Waiting for FreeSWITCH connections...');
            logger.info('=====================================');
            
            this.isStarted = true;
            resolve();
          }
        );

        // Setup event handlers AFTER server creation
        this.setupServerHandlers();

        this.server.on('error', (error: Error) => {
          logger.error('[ESL-Server] Server error', { error: error.message });
          if (!this.isStarted) {
            reject(error);
          }
        });

      } catch (error) {
        logger.error('[ESL-Server] Error starting server', {
          error: error instanceof Error ? error.message : String(error)
        });
        reject(error);
      }
    });
  }

  /**
   * Stop the ESL server
   */
  async stop(): Promise<void> {
    try {
      logger.info('[ESL-Server] Stopping ESL server...');

      // Cleanup all active calls
      for (const [callId, handler] of this.activeCallHandlers.entries()) {
        await handler.cleanup();
      }
      this.activeCallHandlers.clear();

      // Close server (modesl doesn't have a built-in close method, it closes on process exit)
      this.isStarted = false;

      logger.info('[ESL-Server] Server stopped');
    } catch (error) {
      logger.error('[ESL-Server] Error stopping server', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get active call count
   */
  getActiveCallCount(): number {
    return this.activeCallHandlers.size;
  }

  /**
   * Get server stats
   */
  getStats(): {
    activeCalls: number;
    uptime: number;
  } {
    return {
      activeCalls: this.activeCallHandlers.size,
      uptime: process.uptime()
    };
  }
}
