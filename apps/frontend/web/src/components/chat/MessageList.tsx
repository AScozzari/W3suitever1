import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Loader2 } from 'lucide-react';
import { MessageActions } from './MessageActions';

interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  deletedAt: string | null;
  parentMessageId: string | null;
  mentionedUserIds: string[];
  attachments: any[];
  reactions: any;
}

interface MessageListProps {
  channelId: string;
  currentUserId: string;
}

function formatDateSeparator(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) {
    return 'Oggi';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Ieri';
  } else {
    return messageDate.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function MessageList({ channelId, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/chat/channels/${channelId}/messages`],
    enabled: !!channelId,
    refetchInterval: 3000
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <Loader2 size={32} className="animate-spin text-[#FF6900]" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#6b7280'
      }}>
        <MessageCircle size={48} style={{ 
          marginBottom: '16px',
          color: '#d1d5db'
        }} />
        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
          Nessun messaggio
        </p>
        <p style={{ fontSize: '14px', marginTop: '8px', color: '#9ca3af' }}>
          Invia il primo messaggio per iniziare la conversazione
        </p>
      </div>
    );
  }

  let lastDateSeparator = '';

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {messages.map((message, index) => {
        const messageDate = new Date(message.createdAt);
        const dateSeparator = formatDateSeparator(messageDate);
        const showDateSeparator = dateSeparator !== lastDateSeparator;
        
        if (showDateSeparator) {
          lastDateSeparator = dateSeparator;
        }

        const isMine = message.userId === currentUserId;
        const isDeleted = message.deletedAt !== null;

        return (
          <div key={message.id} data-testid={`message-${message.id}`}>
            {showDateSeparator && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                margin: '16px 0',
                color: '#9ca3af',
                fontSize: '12px',
                fontWeight: 500
              }}>
                <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                <span>{dateSeparator}</span>
                <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: isMine ? 'row-reverse' : 'row',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              {/* Avatar */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isMine 
                  ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                  : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0
              }}>
                {isMine ? 'TU' : 'U'}
              </div>

              {/* Message Bubble */}
              <div style={{
                maxWidth: '70%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: isMine 
                    ? 'rgba(255, 105, 0, 0.15)'
                    : '#f3f4f6',
                  backdropFilter: isMine ? 'blur(10px)' : 'none',
                  WebkitBackdropFilter: isMine ? 'blur(10px)' : 'none',
                  border: isMine ? '1px solid rgba(255, 105, 0, 0.3)' : 'none',
                  color: isMine ? '#1f2937' : '#1f2937',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  wordBreak: 'break-word'
                }}>
                  {isDeleted ? (
                    <em style={{ opacity: 0.7 }}>Messaggio eliminato</em>
                  ) : (
                    <>
                      {message.content}
                      {message.isEdited && (
                        <span style={{
                          fontSize: '11px',
                          opacity: 0.7,
                          marginLeft: '8px',
                          fontStyle: 'italic'
                        }}>
                          (modificato)
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: isMine ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: '#9ca3af'
                  }}>
                    {formatMessageTime(messageDate)}
                  </div>
                  {!isDeleted && (
                    <MessageActions
                      messageId={message.id}
                      channelId={message.channelId}
                      content={message.content}
                      isMine={isMine}
                      onEdit={() => {}}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}
