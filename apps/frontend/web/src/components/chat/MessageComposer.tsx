import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Send, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageComposerProps {
  channelId: string;
}

export function MessageComposer({ channelId }: MessageComposerProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/chat/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', channelId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile inviare il messaggio',
        variant: 'destructive'
      });
    }
  });

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const isSending = sendMessageMutation.isPending;
  const canSend = message.trim().length > 0 && !isSending;

  return (
    <div style={{
      padding: '16px',
      borderTop: '1px solid #e5e7eb',
      background: 'white'
    }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div style={{
          flex: 1,
          position: 'relative'
        }}>
          <textarea
            ref={textareaRef}
            data-testid="textarea-message-composer"
            placeholder="Scrivi un messaggio..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            style={{
              width: '100%',
              padding: '12px 48px 12px 12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              minHeight: '48px',
              maxHeight: '120px',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#FF6900';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
            }}
          />

          <div style={{
            position: 'absolute',
            right: '8px',
            bottom: '12px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              data-testid="button-emoji"
              disabled={isSending}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6b7280',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#FF6900';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              title="Aggiungi emoji (prossimamente)"
            >
              <Smile size={18} />
            </button>

            <button
              data-testid="button-attach"
              disabled={isSending}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6b7280',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#FF6900';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              title="Allega file (prossimamente)"
            >
              <Paperclip size={18} />
            </button>
          </div>
        </div>

        <Button
          data-testid="button-send-message"
          onClick={handleSend}
          disabled={!canSend}
          className="bg-[#FF6900] hover:bg-[#ff8533] disabled:bg-gray-300 disabled:cursor-not-allowed"
          style={{
            minWidth: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isSending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Send size={18} />
          )}
        </Button>
      </div>

      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#9ca3af'
      }}>
        <strong>Invio</strong> per inviare • <strong>Shift + Invio</strong> per nuova riga
      </div>
    </div>
  );
}
