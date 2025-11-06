import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, PhoneOff, Volume2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogEntry = {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'ai' | 'user';
};

export default function AIVoiceTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    if (!audioContextRef.current) return;

    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift()!;
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      isPlayingRef.current = false;
      playAudioQueue(); // Play next in queue
    };
    
    source.start();
  };

  const connect = async () => {
    try {
      setStatus('connecting');
      addLog('🔌 Connessione al Voice Gateway...', 'info');

      // Request microphone access first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        audioStreamRef.current = stream;
        addLog('🎤 Microfono attivato', 'success');
      } catch (err: any) {
        addLog(`❌ Errore microfono: ${err.message}`, 'error');
        setStatus('disconnected');
        return;
      }

      // Initialize AudioContext with OpenAI sample rate (16kHz for gpt-4o-realtime)
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      addLog('🔊 Audio context inizializzato (16kHz)', 'success');

      // WebSocket URL - Use Nginx proxy path for browser test (works on both HTTP and HTTPS)
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host; // includes port if present
      const wsUrl = `${wsProtocol}//${wsHost}/ws/ai-voice-test`;
      addLog(`📡 Connessione WebSocket: ${wsUrl}`, 'info');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setIsConnected(true);
        addLog('✅ Connesso! Conversazione iniziata - Parla liberamente!', 'success');

        // Start streaming audio to WebSocket
        startAudioStreaming();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err: any) {
          addLog(`❌ Errore parsing: ${err.message}`, 'error');
        }
      };

      ws.onerror = () => {
        addLog('❌ Errore WebSocket', 'error');
        disconnect();
      };

      ws.onclose = () => {
        addLog('📞 Conversazione terminata', 'info');
        disconnect();
      };
    } catch (err: any) {
      addLog(`❌ Errore: ${err.message}`, 'error');
      setStatus('disconnected');
    }
  };

  const startAudioStreaming = () => {
    if (!audioContextRef.current || !audioStreamRef.current || !wsRef.current) return;

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(audioStreamRef.current);
    
    // Use ScriptProcessorNode for audio processing (deprecated but widely supported)
    // In production, use AudioWorklet instead
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert Float32Array to Int16Array (PCM16)
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

      // Send to WebSocket
      wsRef.current.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio,
        })
      );
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    addLog('🎙️ Streaming audio attivo - Parla quando vuoi!', 'success');
  };

  const disconnect = () => {
    // Stop audio streaming
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsConnected(false);
    setStatus('disconnected');
    addLog('📞 Disconnesso', 'info');
  };

  const handleWebSocketMessage = async (data: any) => {
    switch (data.type) {
      case 'session.created':
        addLog('📞 Sessione AI creata - Parla liberamente!', 'success');
        break;

      case 'response.audio_transcript.done':
        if (data.transcript) {
          addLog(`🤖 AI: "${data.transcript}"`, 'ai');
        }
        break;

      case 'response.audio.delta':
        // Decode and queue audio chunk (raw PCM16 from OpenAI)
        if (data.delta && audioContextRef.current) {
          try {
            addLog(`🔊 Audio chunk ricevuto (${data.delta.length} bytes base64)`, 'info');
            
            // Decode base64 to binary
            const audioData = atob(data.delta);
            const uint8Array = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              uint8Array[i] = audioData.charCodeAt(i);
            }

            // Convert PCM16 (Int16) to Float32 for Web Audio API
            const int16Array = new Int16Array(uint8Array.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
              // Normalize Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
              float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 32768 : 32767);
            }

            // Create AudioBuffer manually (OpenAI uses 16kHz mono PCM16)
            const audioBuffer = audioContextRef.current.createBuffer(
              1, // mono
              float32Array.length,
              16000 // 16kHz sample rate
            );
            audioBuffer.getChannelData(0).set(float32Array);
            
            audioQueueRef.current.push(audioBuffer);
            addLog(`✅ Audio decodificato: ${float32Array.length} samples`, 'success');
            playAudioQueue();
          } catch (err) {
            addLog(`❌ Errore decodifica audio: ${err}`, 'error');
            console.error('Error decoding audio:', err);
          }
        }
        break;

      case 'input_audio_buffer.speech_started':
        addLog('👂 AI sta ascoltando...', 'info');
        break;

      case 'input_audio_buffer.speech_stopped':
        addLog('⏸️ Pausa rilevata', 'info');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (data.transcript) {
          addLog(`👤 Tu: "${data.transcript}"`, 'user');
        }
        break;

      case 'response.done':
        addLog('✅ Risposta completata', 'info');
        break;

      case 'error':
        addLog(`❌ ${data.error?.message || 'Errore'}`, 'error');
        break;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return '🎙️ In Conversazione - Parla Liberamente';
      case 'connecting':
        return '🔌 Connessione...';
      default:
        return '⚫ Disconnesso';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-6 w-6" />
            Test AI Voice Agent
          </CardTitle>
          <CardDescription>
            Conversazione real-time con l'assistente vocale AI - Parla liberamente come in una telefonata
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status */}
          <div className={cn('rounded-lg p-4 text-center font-semibold text-white', getStatusColor())}>
            {getStatusText()}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!isConnected ? (
              <Button
                onClick={connect}
                className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700"
                data-testid="button-connect-voice"
              >
                <Phone className="h-5 w-5 mr-2" />
                Inizia Conversazione
              </Button>
            ) : (
              <Button
                onClick={disconnect}
                variant="destructive"
                className="flex-1 h-16 text-lg"
                data-testid="button-disconnect-voice"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                Termina Conversazione
              </Button>
            )}
          </div>

          {/* Live Indicator */}
          {isConnected && (
            <div className="flex items-center justify-center gap-3 p-4 bg-green-50 rounded-lg border-2 border-green-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <Mic className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-700">
                  Microfono Attivo - Parla quando vuoi
                </span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 text-blue-900">💬 Come Funziona:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Clicca <strong>"Inizia Conversazione"</strong></li>
                <li>Permetti l'accesso al microfono quando richiesto</li>
                <li><strong>Parla liberamente in italiano</strong> - non serve premere bottoni!</li>
                <li>L'AI ti risponderà automaticamente quando finisci di parlare</li>
                <li>La conversazione continua fino a quando clicchi <strong>"Termina"</strong></li>
              </ol>
              <p className="mt-3 text-xs text-blue-700 italic">
                ✨ Esperienza real-time come una vera telefonata - Voice Activity Detection automatico
              </p>
            </CardContent>
          </Card>

          {/* Logs */}
          <div className="space-y-2">
            <h3 className="font-semibold">📜 Log Conversazione:</h3>
            <div
              ref={logContainerRef}
              className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs space-y-1"
            >
              {logs.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  Nessun log ancora. Clicca "Inizia Conversazione" per cominciare.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      'border-l-4 pl-2 py-1',
                      log.type === 'success' && 'border-green-500 text-green-700',
                      log.type === 'error' && 'border-red-500 text-red-700',
                      log.type === 'ai' && 'border-purple-500 text-purple-700 font-bold',
                      log.type === 'user' && 'border-blue-500 text-blue-700',
                      log.type === 'info' && 'border-gray-400 text-gray-700'
                    )}
                  >
                    [{log.timestamp.toLocaleTimeString('it-IT')}] {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
