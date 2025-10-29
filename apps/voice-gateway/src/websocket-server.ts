import WebSocket, { WebSocketServer } from 'ws';
import { OpenAIRealtimeClient } from './openai-client';
import { AudioProcessor } from './audio-processor';
import { executeFunctionTool, allFunctionTools } from './function-tools';
import logger from './logger';

export interface CallSession {
  callId: string;
  tenantId: string;
  storeId: string;
  did: string;
  callerNumber: string;
  aiAgentRef: string;
  freeswitchWs: WebSocket;
  openaiClient: OpenAIRealtimeClient;
  audioProcessor: AudioProcessor;
  startTime: Date;
  transcript: string[];
  actions: any[];
  status: 'active' | 'completed' | 'failed';
}

export class VoiceGatewayServer {
  private wss: WebSocketServer;
  private sessions: Map<string, CallSession> = new Map();
  private port: number;
  private openaiApiKey: string;
  private openaiModel: string;
  private w3ApiUrl: string;
  private w3ApiKey: string;

  constructor(config: {
    port: number;
    openaiApiKey: string;
    openaiModel: string;
    w3ApiUrl: string;
    w3ApiKey: string;
  }) {
    this.port = config.port;
    this.openaiApiKey = config.openaiApiKey;
    this.openaiModel = config.openaiModel;
    this.w3ApiUrl = config.w3ApiUrl;
    this.w3ApiKey = config.w3ApiKey;

    this.wss = new WebSocketServer({ port: this.port });
    this.setupWebSocketServer();

    logger.info('[VoiceGateway] WebSocket server initialized', { port: this.port });
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const callId = url.searchParams.get('callId') || `call-${Date.now()}`;
      const tenantId = url.searchParams.get('tenantId') || '';
      const storeId = url.searchParams.get('storeId') || '';
      const did = url.searchParams.get('did') || '';
      const callerNumber = url.searchParams.get('caller') || '';
      const aiAgentRef = url.searchParams.get('aiAgentRef') || 'customer-care-voice';

      logger.info('[VoiceGateway] New FreeSWITCH connection', {
        callId,
        tenantId,
        storeId,
        did,
        callerNumber,
        aiAgentRef
      });

      try {
        await this.handleNewCall(ws, {
          callId,
          tenantId,
          storeId,
          did,
          callerNumber,
          aiAgentRef
        });
      } catch (error: any) {
        logger.error('[VoiceGateway] Failed to initialize call session', {
          callId,
          error: error.message
        });
        ws.close();
      }
    });

    this.wss.on('error', (error) => {
      logger.error('[VoiceGateway] WebSocket server error', { error: error.message });
    });
  }

  private async handleNewCall(
    freeswitchWs: WebSocket,
    callInfo: {
      callId: string;
      tenantId: string;
      storeId: string;
      did: string;
      callerNumber: string;
      aiAgentRef: string;
    }
  ): Promise<void> {
    // Fetch AI agent instructions from W3 Suite API
    const agentInstructions = await this.fetchAgentInstructions(
      callInfo.tenantId,
      callInfo.aiAgentRef
    );

    // Initialize OpenAI Realtime client
    const openaiClient = new OpenAIRealtimeClient({
      apiKey: this.openaiApiKey,
      model: this.openaiModel,
      voice: 'alloy',
      instructions: agentInstructions,
      tools: allFunctionTools as any
    });

    await openaiClient.connect();

    // Initialize audio processor
    const audioProcessor = new AudioProcessor({
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm16'
    });

    // Create call session
    const session: CallSession = {
      callId: callInfo.callId,
      tenantId: callInfo.tenantId,
      storeId: callInfo.storeId,
      did: callInfo.did,
      callerNumber: callInfo.callerNumber,
      aiAgentRef: callInfo.aiAgentRef,
      freeswitchWs,
      openaiClient,
      audioProcessor,
      startTime: new Date(),
      transcript: [],
      actions: [],
      status: 'active'
    };

    this.sessions.set(callInfo.callId, session);

    // Setup FreeSWITCH WebSocket handlers
    this.setupFreeswitchHandlers(session);

    // Setup OpenAI client handlers
    this.setupOpenAIHandlers(session);

    logger.info('[VoiceGateway] Call session initialized', {
      callId: callInfo.callId,
      aiAgent: callInfo.aiAgentRef
    });
  }

  private setupFreeswitchHandlers(session: CallSession): void {
    session.freeswitchWs.on('message', (data: WebSocket.Data) => {
      try {
        // FreeSWITCH sends PCM16 audio as binary data
        if (Buffer.isBuffer(data)) {
          const processedAudio = session.audioProcessor.processIncomingAudio(data);
          
          if (session.audioProcessor.validateAudioFormat(processedAudio)) {
            session.openaiClient.sendAudioChunk(processedAudio);
          }
        } else {
          // Handle control messages from FreeSWITCH (JSON)
          const message = JSON.parse(data.toString());
          this.handleFreeswitchControlMessage(session, message);
        }
      } catch (error: any) {
        logger.error('[VoiceGateway] Error handling FreeSWITCH message', {
          callId: session.callId,
          error: error.message
        });
      }
    });

    session.freeswitchWs.on('close', () => {
      logger.info('[VoiceGateway] FreeSWITCH disconnected', { callId: session.callId });
      this.endCallSession(session.callId, 'freeswitch_disconnect');
    });

    session.freeswitchWs.on('error', (error) => {
      logger.error('[VoiceGateway] FreeSWITCH connection error', {
        callId: session.callId,
        error: error.message
      });
    });
  }

  private setupOpenAIHandlers(session: CallSession): void {
    session.openaiClient.onMessage(async (event: any) => {
      try {
        await this.handleOpenAIEvent(session, event);
      } catch (error: any) {
        logger.error('[VoiceGateway] Error handling OpenAI event', {
          callId: session.callId,
          eventType: event.type,
          error: error.message
        });
      }
    });

    session.openaiClient.onClose(() => {
      logger.info('[VoiceGateway] OpenAI disconnected', { callId: session.callId });
      this.endCallSession(session.callId, 'openai_disconnect');
    });

    session.openaiClient.onError((error: Error) => {
      logger.error('[VoiceGateway] OpenAI connection error', {
        callId: session.callId,
        error: error.message
      });
      this.handleOpenAIError(session, error);
    });
  }

  private async handleOpenAIEvent(session: CallSession, event: any): Promise<void> {
    logger.debug('[VoiceGateway] OpenAI event', {
      callId: session.callId,
      eventType: event.type
    });

    switch (event.type) {
      case 'session.created':
        logger.info('[VoiceGateway] OpenAI session created', { sessionId: event.session?.id });
        break;

      case 'conversation.item.created':
        if (event.item?.type === 'message' && event.item.role === 'user') {
          // User message (transcript)
          const transcript = event.item.content?.[0]?.transcript;
          if (transcript) {
            session.transcript.push(`[User]: ${transcript}`);
            logger.info('[VoiceGateway] User transcript', {
              callId: session.callId,
              text: transcript
            });
          }
        }
        break;

      case 'conversation.item.created':
        if (event.item?.type === 'message' && event.item.role === 'assistant') {
          // Assistant message (transcript)
          const transcript = event.item.content?.[0]?.transcript;
          if (transcript) {
            session.transcript.push(`[AI]: ${transcript}`);
          }
        }
        break;

      case 'response.audio.delta':
        // OpenAI sends audio chunks
        if (event.delta) {
          const audioBuffer = session.audioProcessor.base64ToBuffer(event.delta);
          const processedAudio = session.audioProcessor.processOutgoingAudio(audioBuffer);
          
          // Send audio to FreeSWITCH
          if (session.freeswitchWs.readyState === WebSocket.OPEN) {
            session.freeswitchWs.send(processedAudio);
          }
        }
        break;

      case 'response.function_call_arguments.done':
        // Function call from AI
        const functionName = event.name;
        const args = JSON.parse(event.arguments || '{}');
        
        logger.info('[VoiceGateway] Function call', {
          callId: session.callId,
          function: functionName,
          args
        });

        const result = await executeFunctionTool(functionName, args, {
          tenantId: session.tenantId,
          storeId: session.storeId,
          callId: session.callId,
          w3ApiUrl: this.w3ApiUrl,
          w3ApiKey: this.w3ApiKey
        });

        session.actions.push({
          timestamp: new Date(),
          function: functionName,
          args,
          result
        });

        // Handle special actions (e.g., transfer)
        if (result.action === 'transfer') {
          this.handleCallTransfer(session, result.extension, result.reason);
        }

        break;

      case 'error':
        logger.error('[VoiceGateway] OpenAI error event', {
          callId: session.callId,
          error: event.error
        });
        break;
    }
  }

  private handleFreeswitchControlMessage(session: CallSession, message: any): void {
    logger.debug('[VoiceGateway] FreeSWITCH control message', {
      callId: session.callId,
      message
    });

    // Handle FreeSWITCH control commands
    switch (message.type) {
      case 'dtmf':
        // DTMF tone received
        logger.info('[VoiceGateway] DTMF received', {
          callId: session.callId,
          digit: message.digit
        });
        break;

      case 'hangup':
        // Call hangup
        this.endCallSession(session.callId, 'hangup');
        break;
    }
  }

  private async handleCallTransfer(session: CallSession, extension: string, reason: string): Promise<void> {
    logger.info('[VoiceGateway] Initiating call transfer', {
      callId: session.callId,
      extension,
      reason
    });

    // Send transfer command to FreeSWITCH
    const transferCommand = {
      type: 'transfer',
      extension,
      reason
    };

    if (session.freeswitchWs.readyState === WebSocket.OPEN) {
      session.freeswitchWs.send(JSON.stringify(transferCommand));
    }

    // End AI session after transfer
    setTimeout(() => {
      this.endCallSession(session.callId, 'transferred');
    }, 2000);
  }

  private async handleOpenAIError(session: CallSession, error: Error): Promise<void> {
    logger.error('[VoiceGateway] OpenAI error - initiating fallback', {
      callId: session.callId,
      error: error.message
    });

    // Fallback: Transfer to human operator
    // Get fallback extension from W3 Suite API
    const fallbackExtension = await this.getFallbackExtension(session.tenantId, session.storeId);
    
    let fallbackAction = '';
    
    if (fallbackExtension) {
      fallbackAction = `Call transferred to extension ${fallbackExtension}`;
      await this.handleCallTransfer(session, fallbackExtension, 'AI agent error - automatic fallback');
    } else {
      // No fallback configured - end call gracefully
      fallbackAction = 'No fallback extension configured - call ended';
      logger.error('[VoiceGateway] No fallback extension configured', {
        callId: session.callId
      });
      this.endCallSession(session.callId, 'error_no_fallback');
    }

    // Send admin notification (non-blocking - log failures but continue)
    this.sendAdminNotification(session, error.message, 'openai_error', fallbackAction).catch(notifyError => {
      logger.error('[VoiceGateway] Admin notification failed but continuing with fallback', {
        callId: session.callId,
        notifyError: notifyError.message
      });
    });
  }

  private async sendAdminNotification(
    session: CallSession,
    errorMessage: string,
    errorType: string,
    fallbackAction: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.w3ApiUrl}/api/voip/admin/ai-error-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
          'x-api-key': this.w3ApiKey
        },
        body: JSON.stringify({
          callId: session.callId,
          did: session.did,
          callerNumber: session.callerNumber,
          errorMessage,
          errorType,
          fallbackAction
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      logger.info('[VoiceGateway] Admin notification sent successfully', {
        callId: session.callId,
        errorType,
        notificationCount: result.data?.notificationCount || 0
      });
    } catch (error: any) {
      logger.error('[VoiceGateway] CRITICAL: Failed to send admin notification', {
        callId: session.callId,
        errorType,
        errorMessage,
        error: error.message
      });
      throw error;
    }
  }

  private async endCallSession(callId: string, reason: string): Promise<void> {
    const session = this.sessions.get(callId);
    if (!session) return;

    logger.info('[VoiceGateway] Ending call session', { callId, reason });

    session.status = reason === 'error_no_fallback' ? 'failed' : 'completed';

    // Disconnect OpenAI client
    session.openaiClient.disconnect();

    // Close FreeSWITCH connection if still open
    if (session.freeswitchWs.readyState === WebSocket.OPEN) {
      session.freeswitchWs.close();
    }

    // Save session to database
    await this.saveSessionToDB(session, reason);

    // Remove session from active sessions
    this.sessions.delete(callId);

    logger.info('[VoiceGateway] Call session ended', {
      callId,
      duration: Date.now() - session.startTime.getTime(),
      transcriptLines: session.transcript.length,
      actionsCount: session.actions.length
    });
  }

  private async saveSessionToDB(session: CallSession, endReason: string): Promise<void> {
    try {
      const duration = Math.round((Date.now() - session.startTime.getTime()) / 1000);

      await fetch(`${this.w3ApiUrl}/api/voip/ai-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
          'x-api-key': this.w3ApiKey
        },
        body: JSON.stringify({
          callId: session.callId,
          tenantId: session.tenantId,
          storeId: session.storeId,
          aiAgentRef: session.aiAgentRef,
          did: session.did,
          callerNumber: session.callerNumber,
          startTs: session.startTime.toISOString(),
          endTs: new Date().toISOString(),
          durationSec: duration,
          transcript: session.transcript.join('\n'),
          actionsLog: session.actions,
          endReason,
          status: session.status
        })
      });

      logger.info('[VoiceGateway] Session saved to database', { callId: session.callId });
    } catch (error: any) {
      logger.error('[VoiceGateway] Failed to save session to database', {
        callId: session.callId,
        error: error.message
      });
    }
  }

  private async fetchAgentInstructions(tenantId: string, aiAgentRef: string): Promise<string> {
    try {
      const response = await fetch(`${this.w3ApiUrl}/api/ai/agents/${aiAgentRef}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-api-key': this.w3ApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.systemPrompt || 'You are a helpful customer service agent.';
    } catch (error: any) {
      logger.error('[VoiceGateway] Failed to fetch agent instructions', {
        tenantId,
        aiAgentRef,
        error: error.message
      });
      return 'You are a helpful customer service agent for W3 Suite.';
    }
  }

  private async getFallbackExtension(tenantId: string, storeId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.w3ApiUrl}/api/voip/ai-config/${storeId}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-api-key': this.w3ApiKey
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data?.configs?.[0]?.fallbackExtension || null;
    } catch (error: any) {
      logger.error('[VoiceGateway] Failed to fetch fallback extension', {
        tenantId,
        storeId,
        error: error.message
      });
      return null;
    }
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }

  close(): void {
    logger.info('[VoiceGateway] Shutting down server');
    this.wss.close();
  }
}
