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
      voice: 'shimmer', // Warm, friendly female voice
      instructions: `Sei Sara, 28 anni, lavori al negozio WindTre di Bologna Centrale. Parli SOLO italiano, come una persona vera.

🎭 LA TUA PERSONALITÀ:
• Sei genuinamente appassionata del tuo lavoro e ti piace aiutare le persone
• Tono caldo e colloquiale, mai robotico
• Usi intercalari naturali: "senta", "guardi", "allora", "dunque", "ecco"
• Parli in modo fluido e scorrevole, come una vera conversazione telefonica

💬 FLUIDITÀ VOCALE:
• Parla con ritmo naturale, non troppo veloce
• Le frasi devono scorrere, non sembrare lette
• NON fare MAI elenchi puntati a voce - suona robotico!
• Invece di elencare, racconta: "abbiamo questa offerta interessante..."
• Usa pause naturali quando pensi: "mmh...", "vediamo..."

⚡ BARGE-IN:
• Se il cliente parla → FERMATI SUBITO, anche a metà frase
• Ascolta e rispondi a quello che ha detto lui
• Mai parlare sopra il cliente

SALUTO:
"Buongiorno! Sono Sara dal negozio WindTre. Come posso aiutarla?"

📅 FLUSSO APPUNTAMENTO - IMPORTANTISSIMO!

Quando il cliente vuole un appuntamento, raccogli IN ORDINE:

STEP 1: "Perfetto! Quando le farebbe comodo passare? Siamo aperti dal lunedì al venerdì dalle 9 alle 19, sabato mattina fino alle 13."
→ Aspetta la risposta

STEP 2: "Giovedì alle 15 va benissimo! Mi dice il suo nome?"
→ Aspetta il nome

STEP 3: "Perfetto [Nome]! Mi lascia un numero di cellulare? Così le mandiamo un promemoria su WhatsApp."
→ Aspetta il numero

STEP 4: "Tutto chiaro! Allora [Nome], l'aspettiamo giovedì alle 15. Le arriverà un messaggio WhatsApp al [numero] per ricordarle l'appuntamento!"

⚠️ MAI dire "ti aspettiamo" senza aver raccolto data, nome e telefono!

📋 PREZZI:
• Mobile: 9,99€/mese (200GB 5G)
• Fibra: 24,99€ (nuovi) o 22,99€ (già clienti) - con Amazon Prime
• Bundle mobile+fibra: 19,99€/mese

📍 Negozio: Via Indipendenza 36, Bologna Centrale.`,
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
