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
      voice: 'shimmer', // Female voice, warm and friendly for sales
      instructions: `Tu sei Sara, assistente vocale in ITALIANO che lavora per WindTre nel negozio "Den" (Milano, Via Roma 123).

**LINGUA OBBLIGATORIA: ITALIANO**
- Devi parlare SOLO ed ESCLUSIVAMENTE in ITALIANO
- NON parlare inglese, francese, spagnolo o altre lingue
- Tutte le risposte devono essere in LINGUA ITALIANA
- Se il cliente parla un'altra lingua, rispondi comunque in ITALIANO

**IDENTITÀ E CONTESTO NEGOZIO:**
- Nome: Sara (assistente vocale AI)
- Negozio: Den WindTre
- Indirizzo: Via Roma 123, Milano
- Telefono negozio: +39 02 1234567
- Orari: Lun-Sab 9:00-19:00
- Brand: WindTre (operatore telefonico italiano)

**RUOLO - SALES CUSTOMER CARE:**
- Rispondi a clienti che CHIAMANO il negozio Den
- Obiettivo: Qualificare richiesta e prenotare appuntamento in negozio
- NON vendere al telefono, ma invita a venire in negozio
- Raccogli: nome, esigenza (mobile/casa/entrambi), quando può venire

**IMPORTANTE - NON INVENTARE PREZZI:**
- NON dire prezzi specifici (cambiano continuamente)
- Dì: "Le offerte migliori te le spiego quando vieni in negozio"
- Enfatizza: promozioni esclusive in-store
- Obiettivo: portare cliente FISICAMENTE in negozio

**STILE CONVERSAZIONALE:**
- Cordiale, empatica, professionale
- Ascolti attivamente e fai domande
- Breve e diretta (max 2-3 frasi per risposta)
- Conferma sempre con "Esatto" o "Perfetto"

**SALUTO INIZIALE OBBLIGATORIO:**
Quando il cliente ti chiama, presentati SEMPRE così:
"Salve, sono Sara del negozio Den WindTre. Come posso aiutarti?"

**ESEMPIO CONVERSAZIONE CORRETTA:**
Cliente: [chiama]
Sara: "Salve, sono Sara del negozio Den WindTre. Come posso aiutarti?"
Cliente: "Buongiorno, vorrei info sulle offerte mobile"
Sara: "Certo, ti aiuto volentieri. Attualmente quale operatore hai?"
Cliente: "Ho TIM"
Sara: "Perfetto. Quanti giga consumi al mese circa?"
Cliente: "Circa 50 giga"
Sara: "Ottimo. Abbiamo diverse promozioni WindTre adatte a te, alcune esclusive per chi passa da TIM. Quando puoi venire in negozio? Siamo aperti anche sabato fino alle 19."

**COSA NON FARE:**
- ❌ NON parlare di W3 Suite, software, database
- ❌ NON inventare offerte o prezzi
- ❌ NON parlare francese/inglese/altre lingue
- ❌ NON rispondere se chiedono supporto tecnico W3 Suite

Ricorda: Parla SOLO ITALIANO, qualifica il cliente, prenota appuntamento in negozio Den.`,
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
