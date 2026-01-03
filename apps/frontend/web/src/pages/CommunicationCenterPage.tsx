import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Rss, 
  Settings, 
  Plus, 
  Lock, 
  Users, 
  Archive, 
  Trash2,
  Hash,
  Pin,
  Search
} from 'lucide-react';
import { CreateChatDialog } from '@/components/chat/CreateChatDialog';
import { AvatarWithPresence } from '@/components/chat/PresenceIndicator';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { MessageList } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { ChannelMembersDialog } from '@/components/chat/ChannelMembersDialog';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EditChannelDialog } from '@/components/chat/EditChannelDialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  dmUser?: {
    id: string;
    email: string;
    name: string;
  } | null;
}

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ora';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours}h fa`;
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  
  return date.toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'short' 
  });
}

function truncateMessage(text: string, maxLength: number = 40): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function getBackgroundStyle(pattern: string = 'neutral'): React.CSSProperties {
  const patterns: Record<string, React.CSSProperties> = {
    'neutral': { backgroundColor: '#fafafa' },
    'dots': { 
      backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
      backgroundColor: '#fafafa',
      backgroundSize: '20px 20px'
    },
    'grid': {
      backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
      backgroundColor: '#fafafa',
      backgroundSize: '20px 20px'
    }
  };
  return patterns[pattern] || patterns['neutral'];
}

type ActiveTab = 'messenger' | 'feeds' | 'settings';

export default function CommunicationCenterPage() {
  const { toast } = useToast();
  const [currentModule, setCurrentModule] = useState('communication-center');
  const [activeTab, setActiveTab] = useState<ActiveTab>('messenger');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);

  const { data: sessionData } = useQuery<{ user: UserData } | null>({ 
    queryKey: ["/api/auth/session"] 
  });
  const user = sessionData?.user;

  const { data: channels = [], isLoading } = useQuery<ChatChannel[]>({
    queryKey: ['/api/chat/channels'],
    staleTime: 5000,
    refetchInterval: 10000,
    enabled: activeTab === 'messenger'
  });

  const archiveMutation = useMutation({
    mutationFn: async (channelId: string) => {
      return apiRequest(`/api/chat/channels/${channelId}/archive`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      toast({ title: 'Chat archiviata', description: 'La chat è stata archiviata con successo' });
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile archiviare la chat', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (channelId: string) => {
      return apiRequest(`/api/chat/channels/${channelId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      setSelectedChannelId(null);
      toast({ title: 'Chat eliminata', description: 'La chat è stata eliminata definitivamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile eliminare la chat', variant: 'destructive' });
    }
  });

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  const handleDeleteChat = (channelId: string) => {
    setChannelToDelete(channelId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (channelToDelete) {
      deleteMutation.mutate(channelToDelete);
      setDeleteDialogOpen(false);
      setChannelToDelete(null);
    }
  };

  const tabs = [
    { id: 'messenger' as const, label: 'Messenger', icon: MessageCircle },
    { id: 'feeds' as const, label: 'Feeds', icon: Rss },
    { id: 'settings' as const, label: 'Impostazioni', icon: Settings }
  ];

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="h-full flex flex-col">
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-windtre-orange" />
                  Communication Center
                </h1>
                <p className="text-gray-600 mt-1">Gestisci tutte le comunicazioni in un'unica piattaforma</p>
              </div>
              
              {activeTab === 'messenger' && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                  data-testid="button-new-chat"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Chat
                </Button>
              )}
            </div>
            
            <div className="flex gap-1 mt-4">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 overflow-hidden">
          {activeTab === 'messenger' && (
            <div className="h-full bg-white rounded-xl border shadow-sm overflow-hidden flex">
              <div className="w-80 border-r flex flex-col bg-gray-50/50">
                <div className="p-4 border-b bg-white">
                  <h3 className="font-semibold text-gray-900">Conversazioni</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{channels.length} chat attive</p>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-windtre-orange" />
                    </div>
                  ) : channels.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nessuna conversazione</p>
                      <p className="text-xs mt-1">Crea una nuova chat per iniziare</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {channels.map((channel) => (
                        <div
                          key={channel.id}
                          className={`p-3 cursor-pointer transition-colors relative ${
                            selectedChannelId === channel.id 
                              ? 'bg-windtre-orange/10 border-l-2 border-windtre-orange' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => setSelectedChannelId(channel.id)}
                          onMouseEnter={() => setHoveredChannelId(channel.id)}
                          onMouseLeave={() => setHoveredChannelId(null)}
                          data-testid={`channel-${channel.id}`}
                        >
                          <div className="flex items-start gap-3">
                            {channel.channelType === 'dm' && channel.dmUser?.id ? (
                              <AvatarWithPresence
                                userId={channel.dmUser.id}
                                name={channel.dmUser.name || 'Utente'}
                                size="md"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-windtre-orange to-orange-400 flex items-center justify-center text-white font-medium shrink-0">
                                {channel.name?.[0]?.toUpperCase() || '#'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {channel.visibility === 'private' && <Lock className="h-3 w-3 text-gray-400" />}
                                <span className="font-medium text-sm text-gray-900 truncate">
                                  {channel.channelType === 'dm' 
                                    ? channel.dmUser?.name || 'Utente'
                                    : channel.name
                                  }
                                </span>
                              </div>
                              {channel.lastMessage && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {truncateMessage(channel.lastMessage.content)}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {channel.lastMessageAt && (
                                  <span className="text-[0.65rem] text-gray-400">
                                    {formatRelativeTime(channel.lastMessageAt)}
                                  </span>
                                )}
                                {channel.unreadCount && channel.unreadCount > 0 && (
                                  <span className="bg-windtre-orange text-white text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium">
                                    {channel.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {hoveredChannelId === channel.id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(channel.id); }}
                                className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                                title="Archivia"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteChat(channel.id); }}
                                className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                                title="Elimina"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                {selectedChannel ? (
                  <>
                    <div className="h-14 px-4 border-b flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        {selectedChannel.channelType === 'dm' && selectedChannel.dmUser?.id ? (
                          <AvatarWithPresence
                            userId={selectedChannel.dmUser.id}
                            name={selectedChannel.dmUser.name || 'Utente'}
                            size="sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-windtre-orange to-orange-400 flex items-center justify-center text-white text-sm font-medium">
                            <Hash className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900">
                            {selectedChannel.channelType === 'dm' 
                              ? selectedChannel.dmUser?.name 
                              : selectedChannel.name
                            }
                          </h3>
                          <p className="text-xs text-gray-500">
                            {selectedChannel.memberCount || 0} membri
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMembersDialogOpen(true)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                          data-testid="button-show-members"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditDialogOpen(true)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                          data-testid="button-edit-channel"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Barra messaggi fissati */}
                    <PinnedMessagesBar channelId={selectedChannel.id} canUnpin={true} />
                    
                    <div 
                      className="flex-1 overflow-y-auto p-4"
                      style={getBackgroundStyle(selectedChannel.metadata?.backgroundPattern)}
                    >
                      <MessageList channelId={selectedChannel.id} currentUserId={user?.id || ''} />
                      <TypingIndicator channelId={selectedChannel.id} currentUserId={user?.id || ''} />
                    </div>
                    
                    <div className="border-t bg-white p-4">
                      <MessageComposer channelId={selectedChannel.id} />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">Seleziona una conversazione</p>
                      <p className="text-sm mt-1">o crea una nuova chat per iniziare</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'feeds' && (
            <div className="h-full bg-white rounded-xl border shadow-sm flex items-center justify-center">
              <div className="text-center text-gray-500 p-8">
                <Rss className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Feed in arrivo</p>
                <p className="text-sm mt-1">Questa funzionalità sarà disponibile presto</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="h-full bg-white rounded-xl border shadow-sm flex items-center justify-center">
              <div className="text-center text-gray-500 p-8">
                <Settings className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Impostazioni Comunicazione</p>
                <p className="text-sm mt-1">Configurazione notifiche e preferenze in arrivo</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateChatDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onChatCreated={(channelId: string) => {
          setSelectedChannelId(channelId);
          setCreateDialogOpen(false);
        }}
      />

      {selectedChannel && (
        <>
          <ChannelMembersDialog
            open={membersDialogOpen}
            onOpenChange={setMembersDialogOpen}
            channelId={selectedChannel.id}
            channelName={selectedChannel.name || ''}
          />
          <EditChannelDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            channelId={selectedChannel.id}
            currentName={selectedChannel.name || ''}
            currentMetadata={selectedChannel.metadata}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Tutti i messaggi e i file condivisi verranno eliminati definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
