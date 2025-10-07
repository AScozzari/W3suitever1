import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { MessageCircle, Plus, Lock } from 'lucide-react';
import { CreateChatDialog } from '@/components/chat/CreateChatDialog';
import { MessageList } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { ChannelMembersDialog } from '@/components/chat/ChannelMembersDialog';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

interface ChatChannel {
  id: string;
  name: string;
  channelType: 'dm' | 'team' | 'task_thread' | 'general';
  visibility: 'public' | 'private';
  createdAt: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
  memberCount?: number;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
  } | null;
  metadata?: {
    avatarUrl?: string;
    headerColor?: string;
    backgroundPattern?: string;
  };
}

// Helper function to format relative timestamps
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 minute
  if (diffMins < 1) return 'Ora';
  
  // Less than 1 hour
  if (diffMins < 60) return `${diffMins} min fa`;
  
  // Less than 24 hours
  if (diffHours < 24) return `${diffHours}h fa`;
  
  // Yesterday
  if (diffDays === 1) return 'Ieri';
  
  // Within this week
  if (diffDays < 7) return `${diffDays} giorni fa`;
  
  // Older - show date
  return date.toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'short' 
  });
}

// Helper to truncate message preview
function truncateMessage(text: string, maxLength: number = 40): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Helper to get background style based on pattern
function getBackgroundStyle(pattern: string = 'neutral'): React.CSSProperties {
  const patterns: Record<string, React.CSSProperties> = {
    'neutral': { background: '#fafafa' },
    'dots': { 
      background: 'radial-gradient(circle, #d1d5db 1px, transparent 1px), #fafafa',
      backgroundSize: '20px 20px'
    },
    'grid': {
      background: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px), #fafafa',
      backgroundSize: '20px 20px'
    },
    'diagonal': {
      background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #f3f4f6 10px, #f3f4f6 20px), #fafafa'
    },
    'waves': {
      background: 'repeating-radial-gradient(circle at 0 0, transparent 0, #fafafa 10px, transparent 20px, #f9fafb 30px), #fafafa'
    },
    'bubbles': {
      background: 'radial-gradient(circle at 20% 50%, rgba(243, 244, 246, 0.5) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(229, 231, 235, 0.5) 0%, transparent 50%), #fafafa'
    }
  };
  
  return patterns[pattern] || patterns['neutral'];
}

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export default function ChatPage() {
  const [currentModule, setCurrentModule] = useState('chat');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  const { data: user } = useQuery<UserData | null>({ queryKey: ["/api/auth/session"] });

  // Query per ottenere lista chat channels
  const { data: channels = [], isLoading } = useQuery<ChatChannel[]>({
    queryKey: ['/api/chat/channels'],
    staleTime: 5000,
    refetchInterval: 10000
  });

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: '#ffffff',
        padding: '24px'
      }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageCircle size={20} style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0
              }}>
                Chat Interna
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Comunicazione real-time con il team
              </p>
            </div>
          </div>

          <button
            data-testid="button-create-chat"
            onClick={() => setCreateDialogOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Plus size={18} />
            Nuova Chat
          </button>
        </div>

        {/* Chat Layout Split */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '350px 1fr',
          gap: '24px',
          height: 'calc(100vh - 180px)',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {/* Sidebar - Lista Chat */}
          <div style={{
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Search Bar */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <input
                placeholder="Cerca chat..."
                data-testid="input-search-chat"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Chat List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px'
            }}>
              {isLoading ? (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  Caricamento chat...
                </div>
              ) : channels.length === 0 ? (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <MessageCircle size={48} style={{ 
                    margin: '0 auto 16px',
                    color: '#d1d5db'
                  }} />
                  <p style={{ fontSize: '14px', margin: 0 }}>
                    Nessuna chat disponibile
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                    Clicca "Nuova Chat" per iniziare
                  </p>
                </div>
              ) : (
                channels.map((channel) => (
                  <div
                    key={channel.id}
                    data-testid={`chat-item-${channel.id}`}
                    onClick={() => setSelectedChannelId(channel.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedChannelId === channel.id ? '#f9fafb' : 'transparent',
                      transition: 'background 0.15s ease',
                      marginBottom: '4px'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedChannelId !== channel.id) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedChannelId !== channel.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar - custom image or initials */}
                      {channel.metadata?.avatarUrl ? (
                        <img
                          src={channel.metadata.avatarUrl}
                          alt={channel.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #e5e7eb'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600
                        }}>
                          {channel.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px'
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#1f2937',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1
                          }}>
                            {channel.name}
                            {channel.visibility === 'private' && (
                              <Lock size={12} style={{ 
                                marginLeft: '4px',
                                display: 'inline',
                                verticalAlign: 'middle',
                                color: '#6b7280'
                              }} />
                            )}
                          </div>
                          {channel.lastMessageAt && (
                            <div style={{
                              fontSize: '11px',
                              color: '#9ca3af',
                              marginLeft: '8px',
                              flexShrink: 0
                            }}>
                              {formatRelativeTime(channel.lastMessageAt)}
                            </div>
                          )}
                        </div>
                        
                        {/* Member count for groups */}
                        {channel.channelType !== 'dm' && channel.memberCount && (
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginBottom: '2px'
                          }}>
                            {channel.memberCount} {channel.memberCount === 1 ? 'membro' : 'membri'}
                          </div>
                        )}
                        
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {channel.lastMessage 
                            ? truncateMessage(channel.lastMessage.content)
                            : (channel.channelType === 'dm' ? 'Nessun messaggio' : 'Nuovo gruppo')}
                        </div>
                      </div>

                      {/* Unread Badge */}
                      {(channel.unreadCount ?? 0) > 0 && (
                        <div style={{
                          minWidth: '20px',
                          height: '20px',
                          padding: '0 6px',
                          background: '#ef4444',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'white'
                        }}>
                          {channel.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Window */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            ...getBackgroundStyle(channels.find(c => c.id === selectedChannelId)?.metadata?.backgroundPattern || 'neutral')
          }}>
            {selectedChannelId ? (
              <>
                {/* Chat Header */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  background: channels.find(c => c.id === selectedChannelId)?.metadata?.headerColor || 'white',
                  color: '#ffffff',
                  transition: 'background 0.3s ease'
                }}>
                  <button
                    onClick={() => setMembersDialogOpen(true)}
                    data-testid="button-show-members"
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      margin: 0,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {channels.find(c => c.id === selectedChannelId)?.name || 'Chat'}
                  </button>
                </div>

                {/* Messages Area - con flex per posizionamento corretto */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {user?.id && (
                    <MessageList 
                      channelId={selectedChannelId} 
                      currentUserId={user.id} 
                    />
                  )}
                </div>

                {/* Typing Indicator */}
                {user?.id && (
                  <TypingIndicator 
                    channelId={selectedChannelId} 
                    currentUserId={user.id} 
                  />
                )}

                {/* Message Composer - sempre in fondo */}
                <MessageComposer channelId={selectedChannelId} />
              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6b7280'
              }}>
                <MessageCircle size={64} style={{ 
                  marginBottom: '16px',
                  color: '#d1d5db'
                }} />
                <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
                  Seleziona una chat per iniziare
                </p>
                <p style={{ fontSize: '14px', marginTop: '8px', color: '#9ca3af' }}>
                  Scegli una conversazione dalla lista
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Chat Dialog */}
        <CreateChatDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onChatCreated={(channelId) => {
            setSelectedChannelId(channelId);
          }}
        />

        {/* Channel Members Dialog */}
        {selectedChannelId && (
          <ChannelMembersDialog
            open={membersDialogOpen}
            onOpenChange={setMembersDialogOpen}
            channelId={selectedChannelId}
            channelName={channels.find(c => c.id === selectedChannelId)?.name || 'Chat'}
          />
        )}
      </div>
    </Layout>
  );
}
