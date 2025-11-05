import { Router } from 'express';
import logger from './logger';
import { OpenAIRealtimeClient } from './openai-client';
import { AudioProcessor } from './audio-processor';
import { allFunctionTools } from './function-tools';

interface StreamingSession {
  callId: string;
  sessionId: string;
  tenantId: string;
  storeId: string;
  did: string;
  callerNumber: string;
  aiAgentRef: string;
  openaiClient: OpenAIRealtimeClient;
  audioProcessor: AudioProcessor;
  audioBuffer: Buffer[];
  responseBuffer: Buffer[];
  transcript: string[];
  actions: any[];
  status: 'active' | 'ending' | 'ended';
  createdAt: Date;
  lastActivity: Date;
  audioChunkCount: number;
  lastCommitTime: Date;
}

export class HttpStreamingManager {
  private sessions: Map<string, StreamingSession> = new Map();
  private openaiApiKey: string;
  private openaiModel: string;
  private w3ApiUrl: string;
  private w3ApiKey: string;

  constructor(config: {
    openaiApiKey: string;
    openaiModel: string;
    w3ApiUrl: string;
    w3ApiKey: string;
  }) {
    this.openaiApiKey = config.openaiApiKey;
    this.openaiModel = config.openaiModel;
    this.w3ApiUrl = config.w3ApiUrl;
    this.w3ApiKey = config.w3ApiKey;

    // Cleanup old sessions periodically (every 5 minutes)
    setInterval(() => this.cleanupStaleSessions(), 5 * 60 * 1000);
  }

  async createSession(params: {
    callId: string;
    tenantId: string;
    storeId: string;
    did: string;
    callerNumber: string;
    aiAgentRef: string;
  }): Promise<{ sessionId: string; status: string }> {
    const { callId, tenantId, storeId, did, callerNumber, aiAgentRef } = params;

    // Check if session already exists
    if (this.sessions.has(callId)) {
      logger.warn('[HTTP Streaming] Session already exists', { callId });
      return {
        sessionId: callId,
        status: 'existing'
      };
    }

    // Fetch AI agent instructions
    const agentInstructions = await this.fetchAgentInstructions(tenantId, aiAgentRef);

    // Create OpenAI client
    const openaiClient = new OpenAIRealtimeClient({
      apiKey: this.openaiApiKey,
      model: this.openaiModel,
      instructions: agentInstructions,
      tools: allFunctionTools as any
    });

    // Connect to OpenAI
    await openaiClient.connect();

    // Create audio processor
    const audioProcessor = new AudioProcessor({
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm16'
    });

    // Create session
    const session: StreamingSession = {
      callId,
      sessionId: callId,
      tenantId,
      storeId,
      did,
      callerNumber,
      aiAgentRef,
      openaiClient,
      audioProcessor,
      audioBuffer: [],
      responseBuffer: [],
      transcript: [],
      actions: [],
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
      audioChunkCount: 0,
      lastCommitTime: new Date()
    };

    // Setup OpenAI handlers
    this.setupOpenAIHandlers(session);

    this.sessions.set(callId, session);

    logger.info('[HTTP Streaming] Session created', {
      callId,
      tenantId,
      aiAgentRef
    });

    return {
      sessionId: callId,
      status: 'created'
    };
  }

  async streamAudio(callId: string, audioData: string): Promise<{ status: string }> {
    const session = this.sessions.get(callId);
    if (!session) {
      logger.error('[HTTP Streaming] Session not found', { callId });
      return { status: 'session_not_found' };
    }

    if (session.status !== 'active') {
      logger.warn('[HTTP Streaming] Session not active', { callId, status: session.status });
      return { status: 'session_not_active' };
    }

    // Update last activity
    session.lastActivity = new Date();

    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Process and validate audio
    const processedAudio = session.audioProcessor.processIncomingAudio(audioBuffer);
    
    if (!session.audioProcessor.validateAudioFormat(processedAudio)) {
      logger.warn('[HTTP Streaming] Invalid audio format', { callId });
      return { status: 'invalid_audio' };
    }

    // Send audio directly to OpenAI - server_vad handles detection automatically
    session.openaiClient.sendAudioChunk(processedAudio);

    logger.debug('[HTTP Streaming] Audio streamed to OpenAI', {
      callId,
      audioSize: processedAudio.length
    });

    return { status: 'streamed' };
  }

  async getResponse(callId: string, timeout: number = 5000): Promise<{
    audio?: string;
    transcript?: string;
    hasMore: boolean;
  }> {
    const session = this.sessions.get(callId);
    if (!session) {
      logger.error('[HTTP Streaming] Session not found for response', { callId });
      return { hasMore: false };
    }

    // Wait for response with timeout
    const startTime = Date.now();
    while (session.responseBuffer.length === 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (session.responseBuffer.length > 0) {
      // Combine all response buffers
      const combinedBuffer = Buffer.concat(session.responseBuffer);
      session.responseBuffer = []; // Clear buffer

      // Convert to base64
      const audioBase64 = combinedBuffer.toString('base64');

      // Get latest transcript if any
      const latestTranscript = session.transcript.length > 0 
        ? session.transcript[session.transcript.length - 1] 
        : undefined;

      return {
        audio: audioBase64,
        transcript: latestTranscript,
        hasMore: true
      };
    }

    return { hasMore: session.status === 'active' };
  }

  async endSession(callId: string): Promise<{ status: string; summary?: any }> {
    const session = this.sessions.get(callId);
    if (!session) {
      logger.warn('[HTTP Streaming] Session not found for ending', { callId });
      return { status: 'not_found' };
    }

    session.status = 'ending';

    // Disconnect OpenAI
    if (session.openaiClient) {
      session.openaiClient.disconnect();
    }

    // Prepare summary
    const summary = {
      callId: session.callId,
      duration: Date.now() - session.createdAt.getTime(),
      transcript: session.transcript,
      actions: session.actions
    };

    // Remove session
    this.sessions.delete(callId);

    logger.info('[HTTP Streaming] Session ended', {
      callId,
      duration: summary.duration
    });

    return {
      status: 'ended',
      summary
    };
  }

  private setupOpenAIHandlers(session: StreamingSession): void {
    session.openaiClient.onMessage(async (event: any) => {
      try {
        await this.handleOpenAIEvent(session, event);
      } catch (error: any) {
        logger.error('[HTTP Streaming] Error handling OpenAI event', {
          callId: session.callId,
          eventType: event.type,
          error: error.message
        });
      }
    });

    session.openaiClient.onClose(() => {
      logger.info('[HTTP Streaming] OpenAI disconnected', { callId: session.callId });
      session.status = 'ended';
    });

    session.openaiClient.onError((error: Error) => {
      logger.error('[HTTP Streaming] OpenAI connection error', {
        callId: session.callId,
        error: error.message
      });
    });
  }

  private async handleOpenAIEvent(session: StreamingSession, event: any): Promise<void> {
    logger.debug('[HTTP Streaming] OpenAI event', {
      callId: session.callId,
      eventType: event.type
    });

    switch (event.type) {
      case 'session.created':
        logger.info('[HTTP Streaming] OpenAI session created', { 
          callId: session.callId,
          openaiSessionId: event.session?.id 
        });
        break;

      case 'session.updated':
        logger.info('[HTTP Streaming] OpenAI session updated', {
          callId: session.callId,
          session: event.session
        });
        break;

      case 'input_audio_buffer.committed':
        logger.info('[HTTP Streaming] ✅ Audio buffer committed to OpenAI', {
          callId: session.callId,
          itemId: event.item_id
        });
        break;

      case 'input_audio_buffer.speech_started':
        logger.info('[HTTP Streaming] 🎤 Speech detected - user started speaking', {
          callId: session.callId,
          audioStartMs: event.audio_start_ms
        });
        break;

      case 'input_audio_buffer.speech_stopped':
        logger.info('[HTTP Streaming] 🛑 Speech stopped - user finished speaking', {
          callId: session.callId,
          audioEndMs: event.audio_end_ms,
          itemId: event.item_id
        });
        break;

      case 'conversation.item.created':
        logger.info('[HTTP Streaming] Conversation item created', {
          callId: session.callId,
          itemType: event.item?.type,
          role: event.item?.role
        });
        
        if (event.item?.type === 'message') {
          const transcript = event.item.content?.[0]?.transcript;
          if (transcript) {
            const prefix = event.item.role === 'user' ? '[User]' : '[AI]';
            session.transcript.push(`${prefix}: ${transcript}`);
            logger.info('[HTTP Streaming] Transcript', {
              callId: session.callId,
              role: event.item.role,
              text: transcript
            });
          }
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        logger.info('[HTTP Streaming] 📝 User speech transcribed', {
          callId: session.callId,
          transcript: event.transcript
        });
        session.transcript.push(`[User]: ${event.transcript}`);
        break;

      case 'response.created':
        logger.info('[HTTP Streaming] 🤖 OpenAI started generating response', {
          callId: session.callId,
          responseId: event.response?.id
        });
        break;

      case 'response.audio_transcript.delta':
        logger.debug('[HTTP Streaming] AI speech transcription delta', {
          callId: session.callId,
          delta: event.delta
        });
        break;

      case 'response.audio.delta':
        // OpenAI sends audio chunks - add to response buffer
        if (event.delta) {
          const audioBuffer = session.audioProcessor.base64ToBuffer(event.delta);
          const processedAudio = session.audioProcessor.processOutgoingAudio(audioBuffer);
          session.responseBuffer.push(processedAudio);
          logger.debug('[HTTP Streaming] 🔊 Audio chunk received from OpenAI', {
            callId: session.callId,
            audioSize: processedAudio.length
          });
        }
        break;

      case 'response.audio.done':
        logger.info('[HTTP Streaming] ✅ AI audio generation complete', {
          callId: session.callId,
          responseId: event.response_id,
          totalBuffers: session.responseBuffer.length
        });
        break;

      case 'response.done':
        logger.info('[HTTP Streaming] ✅ AI response complete', {
          callId: session.callId,
          responseId: event.response?.id,
          status: event.response?.status
        });
        break;

      case 'response.function_call_arguments.done':
        // Function call from AI
        const functionName = event.name;
        const args = JSON.parse(event.arguments || '{}');
        
        logger.info('[HTTP Streaming] Function call', {
          callId: session.callId,
          function: functionName,
          args
        });

        // Store action
        session.actions.push({
          timestamp: new Date(),
          function: functionName,
          args
        });
        break;

      case 'error':
        logger.error('[HTTP Streaming] ❌ OpenAI error event', {
          callId: session.callId,
          error: event.error
        });
        break;

      default:
        // Log unknown events for debugging
        logger.debug('[HTTP Streaming] Unknown OpenAI event', {
          callId: session.callId,
          eventType: event.type,
          event
        });
    }
  }

  private async fetchAgentInstructions(tenantId: string, aiAgentRef: string): Promise<string> {
    try {
      const response = await fetch(`${this.w3ApiUrl}/api/ai/agents/${aiAgentRef}`, {
        headers: {
          'x-tenant-id': tenantId,
          'x-api-key': this.w3ApiKey,
          'X-Auth-Session': 'authenticated', // Required for dev mode
          'X-Demo-User': 'voice-gateway'    // Identify as Voice Gateway
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.systemPrompt || 'You are a helpful customer service agent.';
    } catch (error: any) {
      logger.error('[HTTP Streaming] Failed to fetch agent instructions', {
        tenantId,
        aiAgentRef,
        error: error.message
      });
      return 'You are a helpful customer service agent for W3 Suite.';
    }
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes

    for (const [callId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();
      if (age > timeout) {
        logger.info('[HTTP Streaming] Cleaning up stale session', { callId, age });
        this.endSession(callId);
      }
    }
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }

  getSessionInfo(callId: string): any {
    const session = this.sessions.get(callId);
    if (!session) return null;

    return {
      callId: session.callId,
      status: session.status,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      transcriptCount: session.transcript.length,
      actionsCount: session.actions.length
    };
  }

  getAllSessions(): any[] {
    return Array.from(this.sessions.keys()).map(callId => this.getSessionInfo(callId));
  }
}

// Create Express router for HTTP streaming endpoints
export function createHttpStreamingRouter(manager: HttpStreamingManager): Router {
  const router = Router();

  // Authentication middleware - verify API key for protected routes
  const authenticateRequest = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    
    // In production, use a secure API key from environment
    const expectedApiKey = process.env.W3_VOICE_GATEWAY_API_KEY || 'dev-api-key';
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }
    
    if (apiKey !== expectedApiKey && apiKey !== `Bearer ${expectedApiKey}`) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
    
    next();
  };

  // Create a new streaming session (protected with API key)
  router.post('/api/voice/session/create', authenticateRequest, async (req, res) => {
    try {
      const { callId, tenantId, storeId, did, callerNumber, aiAgentRef } = req.body;

      if (!callId || !tenantId || !aiAgentRef) {
        return res.status(400).json({ 
          error: 'Missing required parameters: callId, tenantId, aiAgentRef' 
        });
      }

      const result = await manager.createSession({
        callId,
        tenantId,
        storeId: storeId || '',
        did: did || '',
        callerNumber: callerNumber || '',
        aiAgentRef
      });

      res.json(result);
    } catch (error: any) {
      logger.error('[HTTP API] Failed to create session', { error: error.message });
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // Stream audio chunk to a session (protected with API key)
  router.post('/api/voice/stream/:callId', authenticateRequest, async (req, res) => {
    try {
      const { callId } = req.params;
      const { audio } = req.body;

      if (!audio) {
        return res.status(400).json({ error: 'Missing audio data' });
      }

      const result = await manager.streamAudio(callId, audio);
      res.json(result);
    } catch (error: any) {
      logger.error('[HTTP API] Failed to stream audio', { error: error.message });
      res.status(500).json({ error: 'Failed to stream audio' });
    }
  });

  // Get response audio from a session (protected with API key)
  router.get('/api/voice/stream/:callId/response', authenticateRequest, async (req, res) => {
    try {
      const { callId } = req.params;
      const timeout = parseInt(req.query.timeout as string) || 5000;

      const result = await manager.getResponse(callId, timeout);
      res.json(result);
    } catch (error: any) {
      logger.error('[HTTP API] Failed to get response', { error: error.message });
      res.status(500).json({ error: 'Failed to get response' });
    }
  });

  // End a streaming session (protected with API key)
  router.post('/api/voice/session/:callId/end', authenticateRequest, async (req, res) => {
    try {
      const { callId } = req.params;
      const result = await manager.endSession(callId);
      res.json(result);
    } catch (error: any) {
      logger.error('[HTTP API] Failed to end session', { error: error.message });
      res.status(500).json({ error: 'Failed to end session' });
    }
  });

  // Get session info (protected with API key)
  router.get('/api/voice/session/:callId', authenticateRequest, (req, res) => {
    const { callId } = req.params;
    const info = manager.getSessionInfo(callId);
    
    if (!info) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(info);
  });

  // Get all active sessions (protected with API key)
  router.get('/api/voice/sessions', authenticateRequest, (req, res) => {
    const sessions = manager.getAllSessions();
    res.json({ sessions, count: sessions.length });
  });

  return router;
}