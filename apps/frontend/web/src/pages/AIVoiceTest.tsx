import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogEntry = {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'ai' | 'user';
};

export default function AIVoiceTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const connect = async () => {
    try {
      setStatus('connecting');
      addLog('Connessione al Voice Gateway...', 'info');

      // WebSocket URL
      const wsUrl = `ws://${window.location.hostname}:3005`;
      addLog(`WebSocket: ${wsUrl}`, 'info');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus('connected');
        setIsConnected(true);
        addLog('✅ Connesso al Voice Gateway!', 'success');

        // Request microphone access
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 16000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });

          audioStreamRef.current = stream;
          addLog('🎤 Microfono attivato', 'success');
        } catch (err: any) {
          addLog(`❌ Errore microfono: ${err.message}`, 'error');
        }
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
        setStatus('disconnected');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        setIsConnected(false);
        addLog('Disconnesso', 'info');
      };
    } catch (err: any) {
      addLog(`❌ Errore: ${err.message}`, 'error');
      setStatus('disconnected');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    setIsConnected(false);
    setStatus('disconnected');
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'session.created':
        addLog('📞 Sessione AI creata', 'success');
        break;

      case 'response.audio_transcript.done':
        if (data.transcript) {
          addLog(`🤖 AI: "${data.transcript}"`, 'ai');
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

      case 'error':
        addLog(`❌ ${data.error?.message || 'Errore'}`, 'error');
        break;
    }
  };

  const startRecording = async () => {
    if (!audioStreamRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('❌ Connessione non pronta', 'error');
      return;
    }

    setStatus('speaking');
    setIsRecording(true);
    addLog('🎙️ Inizio registrazione...', 'info');

    audioChunksRef.current = [];

    const mediaRecorder = new MediaRecorder(audioStreamRef.current, {
      mimeType: 'audio/webm',
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(100);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setStatus('connected');
    setIsRecording(false);
    addLog('⏹️ Fine registrazione', 'info');

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      try {
        // Convert to PCM16
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const pcmData = audioBuffer.getChannelData(0);
        const pcm16 = new Int16Array(pcmData.length);

        for (let i = 0; i < pcmData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(pcmData[i] * 32768)));
        }

        // Convert to base64
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

        // Send to WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio,
            })
          );

          addLog(`📤 Audio inviato (${(base64Audio.length / 1024).toFixed(1)} KB)`, 'success');
        }
      } catch (err: any) {
        addLog(`❌ Errore conversione audio: ${err.message}`, 'error');
      }
    };
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'speaking':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connesso - Pronto';
      case 'connecting':
        return 'Connessione...';
      case 'speaking':
        return 'Sto Ascoltando...';
      default:
        return 'Disconnesso';
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
            Testa l'assistente vocale AI in tempo reale - OpenAI Realtime API
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status */}
          <div className={cn('rounded-lg p-4 text-center font-semibold text-white', getStatusColor())}>
            {getStatusText()}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              onClick={connect}
              disabled={isConnected}
              className="flex-1"
              data-testid="button-connect-voice"
            >
              <Phone className="h-4 w-4 mr-2" />
              Connetti
            </Button>

            <Button
              onClick={disconnect}
              disabled={!isConnected}
              variant="destructive"
              className="flex-1"
              data-testid="button-disconnect-voice"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Disconnetti
            </Button>
          </div>

          {/* Talk Button */}
          <Button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            disabled={!isConnected}
            className={cn(
              'w-full h-20 text-lg',
              isRecording && 'bg-red-500 hover:bg-red-600 animate-pulse'
            )}
            data-testid="button-talk-voice"
          >
            {isRecording ? (
              <>
                <MicOff className="h-6 w-6 mr-2" />
                STO ASCOLTANDO...
              </>
            ) : (
              <>
                <Mic className="h-6 w-6 mr-2" />
                Tieni Premuto per Parlare
              </>
            )}
          </Button>

          {/* Instructions */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">📋 Come Usare:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Clicca "Connetti" per collegarti al Voice Gateway</li>
                <li>Permetti l'accesso al microfono quando richiesto</li>
                <li>Tieni premuto "Parla" e parla in italiano</li>
                <li>Rilascia per ascoltare la risposta dell'AI</li>
              </ol>
            </CardContent>
          </Card>

          {/* Logs */}
          <div className="space-y-2">
            <h3 className="font-semibold">📜 Log:</h3>
            <div
              ref={logContainerRef}
              className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs space-y-1"
            >
              {logs.map((log, i) => (
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
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
