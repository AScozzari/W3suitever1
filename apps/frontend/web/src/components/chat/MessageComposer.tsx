import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Send, Smile, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MessageComposerProps {
  channelId: string;
}

export function MessageComposer({ channelId }: MessageComposerProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emoji comuni
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '🤙',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '🔥', '✨', '💯', '💥', '💫', '🎉', '🎊', '🎈', '🎁', '🏆'
  ];

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
    if (!trimmedMessage && !selectedFile) return;
    
    // TODO: Implement file upload with message
    if (selectedFile) {
      toast({
        title: 'Info',
        description: 'Upload file in sviluppo - per ora solo testo',
      });
      return;
    }
    
    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = message.substring(0, cursorPos);
    const textAfter = message.substring(cursorPos);
    
    setMessage(textBefore + emoji + textAfter);
    setEmojiPickerOpen(false);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = cursorPos + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Errore',
        description: 'Il file non può superare 10MB',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      {selectedFile && (
        <div style={{
          marginBottom: '12px',
          padding: '8px 12px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Paperclip size={16} style={{ color: '#FF6900' }} />
            <span style={{
              fontSize: '14px',
              color: '#374151',
              fontWeight: 500
            }}>
              {selectedFile.name}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            data-testid="button-remove-file"
            onClick={handleRemoveFile}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#9ca3af',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#9ca3af';
            }}
            title="Rimuovi file"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
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
                  title="Aggiungi emoji"
                >
                  <Smile size={18} />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[280px] p-2"
                align="end"
                side="top"
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: '4px'
                }}>
                  {commonEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      data-testid={`emoji-${index}`}
                      onClick={() => handleEmojiSelect(emoji)}
                      style={{
                        padding: '6px',
                        fontSize: '20px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <input
              ref={fileInputRef}
              type="file"
              data-testid="input-file-upload"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <button
              data-testid="button-attach"
              disabled={isSending}
              onClick={() => fileInputRef.current?.click()}
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
              title="Allega file"
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
