import WebSocket, { WebSocketServer } from 'ws';
import { OpenAIRealtimeClient } from './openai-client';
import logger from './logger';

export interface BrowserTestSession {
  sessionId: string;
  browserWs: WebSocket;
  openaiClient: OpenAIRealtimeClient;
  startTime: Date;
}

export class BrowserTestServer {
  private wss: WebSocketServer;
  private sessions: Map<string, BrowserTestSession> = new Map();
  private port: number;
  private openaiApiKey: string;
  private openaiModel: string;

  constructor(config: {
    port: number;
    openaiApiKey: string;
    openaiModel: string;
  }) {
    this.port = config.port;
    this.openaiApiKey = config.openaiApiKey;
    this.openaiModel = config.openaiModel;

    this.wss = new WebSocketServer({ port: this.port });
    this.setupWebSocketServer();

    logger.info('[BrowserTest] WebSocket server initialized', { port: this.port });
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      const sessionId = `browser-session-${Date.now()}`;

      logger.info('[BrowserTest] New browser connection', { sessionId });

      try {
        await this.handleNewSession(ws, sessionId);
      } catch (error: any) {
        logger.error('[BrowserTest] Failed to initialize session', {
          sessionId,
          error: error.message
        });
        ws.close();
      }
    });

    this.wss.on('error', (error) => {
      logger.error('[BrowserTest] WebSocket server error', { error: error.message });
    });
  }

  private async handleNewSession(browserWs: WebSocket, sessionId: string): Promise<void> {
    // Initialize OpenAI Realtime client with Italian WindTre sales agent
    const openaiClient = new OpenAIRealtimeClient({
      apiKey: this.openaiApiKey,
      model: this.openaiModel,
      voice: 'alloy', // Most expressive voice with natural intonation variation
      instructions: `Sei Sara, addetta vendite WindTre Bologna Centrale. Parli SOLO italiano perfetto.

🚨 REGOLA #1 ASSOLUTA - RISPOSTE BREVISSIME:
• MAX 5-10 PAROLE per risposta! MAI frasi lunghe!
• Rispondi SOLO alla domanda specifica, poi TACI!
• Se cliente parla mentre parli → STOP IMMEDIATO!

SALUTO INIZIALE (500ms dopo inizio):
"Pronto! Sono Sara da WindTre. Dimmi!"

COME RISPONDERE (ESEMPI ULTRA-BREVI):
Cliente: "Quanto costa?"
Sara: "9,99 al mese!" [STOP]

Cliente: "Ha vincoli?"
Sara: "No, nessuno!" [STOP]

Cliente: "La fibra è veloce?"
Sara: "Sì! Fino 2,5 Giga!" [STOP]

Cliente: "Che offerte avete?"
Sara: "Mobile, fibra o entrambi?" [STOP - fai domanda breve]

Cliente: "Vorrei il mobile"
Sara: "Ok! Quanti giga ti servono?" [STOP]

Cliente: "Tanti"
Sara: "200 giga in 5G a 9,99!" [STOP]

🎯 TECNICA:
• Frase BREVISSIMA (max 10 parole)
• Poi PAUSA → lascia parlare cliente
• NON spiegare tutto insieme!
• Se interrompe → STOP subito!

VOCE: Veloce, fluida, italiana naturale. NO sillabazione ("telefono" non "te-le-fo-no").

CATALOGO PREZZI (USA SOLO SE RICHIESTO):
Mobile: GO 5G 5,99€ (Iliad), Special 9,99€ (200GB), Passa WindTre 9,99€ (giga illimitati)
Fibra: 24,99€ nuovi, 22,99€ già clienti (2,5Gbit + Prime)
Convergenza: 19,99€ mobile+fibra+luce insieme

LOCATION: WindTre Bologna Centrale, Via Indipendenza 36`,
      tools: [] // No function tools for browser test
    });

    await openaiClient.connect();

    // Create session
    const session: BrowserTestSession = {
      sessionId,
      browserWs,
      openaiClient,
      startTime: new Date()
    };

    this.sessions.set(sessionId, session);

    // CRITICAL: Trigger immediate greeting from Sara (don't wait for user to speak)
    // Wait 500ms then force Sara to speak her greeting
    setTimeout(() => {
      logger.info('[BrowserTest] Triggering automatic greeting', { sessionId });
      openaiClient.createResponse();
    }, 500);

    // Forward messages from browser to OpenAI
    browserWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Log audio messages at debug level only
        if (message.type === 'input_audio_buffer.append') {
          logger.debug('[BrowserTest] Audio chunk from browser', {
            sessionId,
            audioLength: message.audio?.length || 0
          });
          // Send audio chunk using OpenAI client method
          const audioBase64 = message.audio;
          const audioBuffer = Buffer.from(audioBase64, 'base64');
          openaiClient.sendAudioChunk(audioBuffer);
        } else {
          logger.info('[BrowserTest] Message from browser', {
            sessionId,
            type: message.type
          });
          // For other messages, we need to send them directly via the internal WebSocket
          // This is a limitation - we'll handle it differently
        }
      } catch (error: any) {
        logger.error('[BrowserTest] Error processing browser message', {
          sessionId,
          error: error.message
        });
      }
    });

    // Forward messages from OpenAI to browser
    openaiClient.onMessage((data: any) => {
      try {
        // Log audio responses at debug level only
        if (data.type === 'response.audio.delta') {
          logger.debug('[BrowserTest] Audio chunk from OpenAI', {
            sessionId,
            deltaLength: data.delta?.length || 0
          });
        } else {
          logger.info('[BrowserTest] Message from OpenAI', {
            sessionId,
            type: data.type
          });
        }

        // Forward to browser
        if (browserWs.readyState === WebSocket.OPEN) {
          browserWs.send(JSON.stringify(data));
        }
      } catch (error: any) {
        logger.error('[BrowserTest] Error forwarding OpenAI message', {
          sessionId,
          error: error.message
        });
      }
    });

    // Handle disconnections
    browserWs.on('close', () => {
      logger.info('[BrowserTest] Browser disconnected', { sessionId });
      openaiClient.disconnect();
      this.sessions.delete(sessionId);
    });

    openaiClient.onClose(() => {
      logger.info('[BrowserTest] OpenAI disconnected', { sessionId });
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.close();
      }
      this.sessions.delete(sessionId);
    });

    // Handle errors
    browserWs.on('error', (error) => {
      logger.error('[BrowserTest] Browser WebSocket error', {
        sessionId,
        error: error.message
      });
    });

    openaiClient.onError((error: any) => {
      logger.error('[BrowserTest] OpenAI error', {
        sessionId,
        error: error.message
      });
    });

    logger.info('[BrowserTest] Session initialized successfully', { sessionId });
  }

  public getActiveSessions(): number {
    return this.sessions.size;
  }
}
