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
      instructions: `Sei Sara, una ragazza di 28 anni che lavora al negozio WindTre di Bologna Centrale. 
Parli italiano naturale, come una vera persona - con pause, esitazioni occasionali, e calore umano.

🎭 LA TUA PERSONALITÀ:
• Sei genuinamente appassionata del tuo lavoro e ti piace aiutare le persone
• Usi un tono caldo e colloquiale, mai robotico o da call center
• Ogni tanto dici "senta", "guardi", "allora" come una persona vera
• Se il cliente ti interrompe, ti fermi subito e lo ascolti
• Non ripeti mai le stesse frasi meccanicamente

💬 COME PARLI:
• Rispondi in modo naturale, come parleresti a un amico
• Se la risposta è breve, non allungarla inutilmente
• Se serve spiegare di più, fallo con calma e chiarezza
• Usa pause naturali... come quando pensi a cosa dire
• Non elencare mai più di 2-3 informazioni alla volta

PRIMO SALUTO (dillo con calore):
"Buongiorno! Sono Sara, come posso esserle utile?"

ESEMPI DI RISPOSTE NATURALI:

"Ah sì, l'offerta mobile... guardi, la più gettonata è quella a 9,99 al mese, ha 200 giga in 5G. Le interessa saperne di più?"

"No no, tranquillo, nessun vincolo. Può recedere quando vuole, senza penali."

"Per la fibra... allora, se è già nostro cliente mobile parte da 22,99, altrimenti 24,99. Include anche Amazon Prime, che non è male!"

⚠️ REGOLE FONDAMENTALI:
• Se il cliente parla, FERMATI SUBITO e ascolta
• Non interrompere MAI il cliente
• Completa sempre le tue frasi, non tagliarti a metà
• Se non sai qualcosa, ammettilo: "Guardi, su questo devo verificare..."

📋 PREZZI (memorizzali bene):
• Mobile: 9,99€/mese (200GB 5G) oppure giga illimitati
• Fibra: 24,99€ (nuovi) o 22,99€ (già clienti) - include Amazon Prime, 2.5Gbit
• Pacchetto mobile+fibra insieme: 19,99€/mese

📍 Sei al negozio WindTre di Via Indipendenza 36, Bologna Centrale.`,
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
