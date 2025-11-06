import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { VoiceGatewayServer } from './websocket-server';
import { BrowserTestServer } from './browser-test-server';
import { HttpStreamingManager, createHttpStreamingRouter } from './http-streaming';
import { VoiceGatewayESLServer } from './esl-server';
import logger from './logger';

// Environment configuration  
const PORT = parseInt(process.env.VOICE_GATEWAY_PORT || '3005');
const BROWSER_TEST_PORT = parseInt(process.env.BROWSER_TEST_PORT || '3006');
const ESL_PORT = parseInt(process.env.ESL_PORT || '8081'); // Changed to 8081 - Replit supported port
const ESL_HOST = process.env.ESL_HOST || '0.0.0.0';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01';
const W3_API_URL = process.env.W3_API_URL || 'http://localhost:3004';
const W3_API_KEY = process.env.W3_VOICE_GATEWAY_API_KEY || '';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_ESL = process.env.ENABLE_ESL === 'true' || true; // ESL enabled by default

// Validate required configuration
if (!OPENAI_API_KEY) {
  logger.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

if (!W3_API_KEY) {
  logger.error('W3_VOICE_GATEWAY_API_KEY environment variable is required');
  logger.error('Set a secure random key for production deployment');
  process.exit(1);
}

// Create Express app for HTTP health checks
const app = express();

app.use(cors());
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for audio data

// Initialize HTTP Streaming Manager
let httpStreamingManager: HttpStreamingManager;
let voiceGateway: VoiceGatewayServer;
let browserTestServer: BrowserTestServer;
let eslServer: VoiceGatewayESLServer;

try {
  httpStreamingManager = new HttpStreamingManager({
    openaiApiKey: OPENAI_API_KEY,
    openaiModel: OPENAI_REALTIME_MODEL,
    w3ApiUrl: W3_API_URL,
    w3ApiKey: W3_API_KEY
  });

  // Add HTTP streaming routes
  const streamingRouter = createHttpStreamingRouter(httpStreamingManager);
  app.use(streamingRouter);
  
  logger.info('[VoiceGateway] HTTP Streaming manager initialized');
} catch (error: any) {
  logger.error('Failed to initialize HTTP Streaming manager', { error: error.message });
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'w3-voice-gateway',
    version: '1.0.0',
    uptime: process.uptime(),
    activeSessions: (voiceGateway ? voiceGateway.getActiveSessions() : 0) + 
                    (httpStreamingManager ? httpStreamingManager.getActiveSessions() : 0) +
                    (browserTestServer ? browserTestServer.getActiveSessions() : 0) +
                    (eslServer ? eslServer.getActiveCallCount() : 0),
    httpStreamingSessions: httpStreamingManager ? httpStreamingManager.getActiveSessions() : 0,
    websocketSessions: voiceGateway ? voiceGateway.getActiveSessions() : 0,
    browserTestSessions: browserTestServer ? browserTestServer.getActiveSessions() : 0,
    eslCalls: eslServer ? eslServer.getActiveCallCount() : 0,
    eslEnabled: ENABLE_ESL,
    environment: NODE_ENV
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'W3 Voice Gateway',
    websocketPort: PORT,
    browserTestPort: BROWSER_TEST_PORT,
    httpPort: HTTP_PORT,
    eslPort: ESL_PORT,
    eslEnabled: ENABLE_ESL,
    openaiModel: OPENAI_REALTIME_MODEL,
    w3ApiUrl: W3_API_URL,
    activeSessions: (voiceGateway ? voiceGateway.getActiveSessions() : 0) + 
                    (httpStreamingManager ? httpStreamingManager.getActiveSessions() : 0) +
                    (browserTestServer ? browserTestServer.getActiveSessions() : 0) +
                    (eslServer ? eslServer.getActiveCallCount() : 0),
    httpStreamingSessions: httpStreamingManager ? httpStreamingManager.getActiveSessions() : 0,
    websocketSessions: voiceGateway ? voiceGateway.getActiveSessions() : 0,
    browserTestSessions: browserTestServer ? browserTestServer.getActiveSessions() : 0,
    eslCalls: eslServer ? eslServer.getActiveCallCount() : 0,
    environment: NODE_ENV
  });
});

// Start HTTP server for health checks
const HTTP_PORT = PORT + 100; // HTTP on 3105 if WS is on 3005
app.listen(HTTP_PORT, () => {
  logger.info(`[VoiceGateway] HTTP server running on port ${HTTP_PORT}`);
  logger.info(`[VoiceGateway] Health check: http://localhost:${HTTP_PORT}/health`);
});

// Initialize Voice Gateway WebSocket server
try {
  voiceGateway = new VoiceGatewayServer({
    port: PORT,
    openaiApiKey: OPENAI_API_KEY,
    openaiModel: OPENAI_REALTIME_MODEL,
    w3ApiUrl: W3_API_URL,
    w3ApiKey: W3_API_KEY
  });

  logger.info('=====================================');
  logger.info('🎙️  W3 Voice Gateway Started');
  logger.info('=====================================');
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`WebSocket Port: ${PORT}`);
  logger.info(`HTTP Port: ${HTTP_PORT}`);
  logger.info(`OpenAI Model: ${OPENAI_REALTIME_MODEL}`);
  logger.info(`W3 API: ${W3_API_URL}`);
  logger.info('=====================================');
  logger.info('📡 WebSocket endpoint: ws://localhost:' + PORT);
  logger.info('🏥 Health check: http://localhost:' + HTTP_PORT + '/health');
  logger.info('=====================================');
  logger.info('📞 HTTP Streaming Endpoints:');
  logger.info('  POST   /api/voice/session/create');
  logger.info('  POST   /api/voice/stream/:callId');
  logger.info('  GET    /api/voice/stream/:callId/response');
  logger.info('  POST   /api/voice/session/:callId/end');
  logger.info('=====================================');
} catch (error: any) {
  logger.error('Failed to start Voice Gateway', { error: error.message });
  process.exit(1);
}

// Initialize Browser Test Server (for AI Voice Test page)
try {
  browserTestServer = new BrowserTestServer({
    port: BROWSER_TEST_PORT,
    openaiApiKey: OPENAI_API_KEY,
    openaiModel: OPENAI_REALTIME_MODEL
  });

  logger.info('=====================================');
  logger.info('🧪 Browser Test Server Started');
  logger.info('=====================================');
  logger.info(`Browser Test Port: ${BROWSER_TEST_PORT}`);
  logger.info('📡 WebSocket endpoint: ws://localhost:' + BROWSER_TEST_PORT);
  logger.info('🌐 Access via: /ws/ai-voice-test (Nginx proxy)');
  logger.info('=====================================');
} catch (error: any) {
  logger.error('Failed to start Browser Test Server', { error: error.message });
  logger.warn('Continuing without browser test support');
}

// Initialize ESL Server (Enterprise FreeSWITCH Integration)
if (ENABLE_ESL) {
  try {
    eslServer = new VoiceGatewayESLServer({
      port: ESL_PORT,
      host: ESL_HOST,
      openaiApiKey: OPENAI_API_KEY,
      openaiModel: OPENAI_REALTIME_MODEL,
      w3ApiUrl: W3_API_URL,
      w3ApiKey: W3_API_KEY
    });

    eslServer.start().then(async () => {
      logger.info('[VoiceGateway] ESL server started successfully');
      
      // Start LocalTunnel to expose ESL port publicly (FREE - no registration needed!)
      try {
        logger.info('[VoiceGateway] Starting LocalTunnel for ESL port...');
        const { startLocalTunnel } = await import('../localtunnel');
        // Start in background - don't await to prevent blocking
        startLocalTunnel().catch((err) => {
          logger.error('[VoiceGateway] LocalTunnel startup failed', { error: err.message });
        });
      } catch (tunnelError: any) {
        logger.error('[VoiceGateway] Failed to start LocalTunnel', { error: tunnelError.message });
        logger.warn('[VoiceGateway] ESL server running but NOT publicly accessible');
        logger.warn('[VoiceGateway] FreeSWITCH connections will only work from localhost');
      }
    }).catch((error: any) => {
      logger.error('[VoiceGateway] Failed to start ESL server', { error: error.message });
      logger.warn('[VoiceGateway] Continuing without ESL support');
    });
  } catch (error: any) {
    logger.error('[VoiceGateway] ESL server initialization failed', { error: error.message });
    logger.warn('[VoiceGateway] Continuing without ESL support');
  }
} else {
  logger.info('[VoiceGateway] ESL server disabled (set ENABLE_ESL=true to enable)');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('[VoiceGateway] Received SIGINT, shutting down gracefully');
  if (voiceGateway) voiceGateway.close();
  if (eslServer) {
    await eslServer.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('[VoiceGateway] Received SIGTERM, shutting down gracefully');
  if (voiceGateway) voiceGateway.close();
  if (eslServer) {
    await eslServer.stop();
  }
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  logger.error('[VoiceGateway] Uncaught exception', { error: error.message, stack: error.stack });
  if (voiceGateway) voiceGateway.close();
  if (eslServer) {
    await eslServer.stop();
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[VoiceGateway] Unhandled rejection', { reason, promise });
});

export default voiceGateway;
