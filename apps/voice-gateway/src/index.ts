import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { VoiceGatewayServer } from './websocket-server';
import logger from './logger';

// Environment configuration  
const PORT = parseInt(process.env.VOICE_GATEWAY_PORT || '3005');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01';
const W3_API_URL = process.env.W3_API_URL || 'http://localhost:3004';
const W3_API_KEY = process.env.W3_VOICE_GATEWAY_API_KEY || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

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
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'w3-voice-gateway',
    version: '1.0.0',
    uptime: process.uptime(),
    activeSessions: voiceGateway ? voiceGateway.getActiveSessions() : 0,
    environment: NODE_ENV
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'W3 Voice Gateway',
    websocketPort: PORT,
    openaiModel: OPENAI_REALTIME_MODEL,
    w3ApiUrl: W3_API_URL,
    activeSessions: voiceGateway ? voiceGateway.getActiveSessions() : 0,
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
let voiceGateway: VoiceGatewayServer;

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
} catch (error: any) {
  logger.error('Failed to start Voice Gateway', { error: error.message });
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('[VoiceGateway] Received SIGINT, shutting down gracefully');
  voiceGateway.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('[VoiceGateway] Received SIGTERM, shutting down gracefully');
  voiceGateway.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('[VoiceGateway] Uncaught exception', { error: error.message, stack: error.stack });
  voiceGateway.close();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[VoiceGateway] Unhandled rejection', { reason, promise });
});

export default voiceGateway;
