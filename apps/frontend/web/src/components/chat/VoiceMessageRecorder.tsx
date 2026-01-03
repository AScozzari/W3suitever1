import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mic, Square, Play, Pause, Trash2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VoiceMessageRecorderProps {
  channelId: string;
  onClose: () => void;
  onSent?: () => void;
}

export function VoiceMessageRecorder({ channelId, onClose, onSent }: VoiceMessageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Impossibile accedere al microfono',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error('Nessuna registrazione');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('channelId', channelId);
      formData.append('duration', String(duration));
      
      const response = await fetch('/api/chat/voice-messages', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Errore invio messaggio vocale' }));
        throw new Error(errorData.message || 'Errore invio messaggio vocale');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', channelId, 'messages'] });
      toast({ title: 'Messaggio vocale inviato' });
      onSent?.();
      onClose();
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile inviare il messaggio vocale',
        variant: 'destructive'
      });
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {!audioBlob ? (
        <>
          {isRecording ? (
            <>
              <div className="flex items-center gap-2 flex-1">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">
                  Registrazione: {formatDuration(duration)}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopRecording}
                data-testid="button-stop-recording"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-500 flex-1">
                Premi per registrare un messaggio vocale
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={startRecording}
                className="text-red-600 border-red-200 hover:bg-red-50"
                data-testid="button-start-recording"
              >
                <Mic className="h-4 w-4 mr-1" />
                Registra
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={playAudio}
            className="shrink-0"
            data-testid="button-play-recording"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-windtre-orange transition-all"
                style={{ width: isPlaying ? '100%' : '0%' }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1">{formatDuration(duration)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={discardRecording}
            className="text-gray-500 hover:text-red-600"
            data-testid="button-discard-recording"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            className="bg-windtre-orange hover:bg-windtre-orange-dark"
            data-testid="button-send-voice-message"
          >
            {sendMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Invia
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

export function VoiceMessagePlayer({ audioUrl, duration }: { audioUrl: string; duration?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg min-w-[200px]">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => {
          const audio = e.target as HTMLAudioElement;
          setProgress((audio.currentTime / audio.duration) * 100);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />
      
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-windtre-orange text-white flex items-center justify-center shrink-0"
        data-testid="button-play-voice"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      <div className="flex-1">
        <div className="h-1.5 bg-gray-300 rounded-full overflow-hidden">
          <div 
            className="h-full bg-windtre-orange transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {duration && (
        <span className="text-xs text-gray-500 shrink-0">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}
