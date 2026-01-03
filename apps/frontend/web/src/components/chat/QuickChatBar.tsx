import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, MessageCircle, X, User, Users, Send, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { AvatarWithPresence } from './PresenceIndicator';

interface QuickChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

interface QuickChatBarProps {
  onChatCreated?: (channelId: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuickChatBar({ onChatCreated, placeholder = "Cerca colleghi...", className = "" }: QuickChatBarProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<QuickChatUser[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: users = [], isLoading } = useQuery<QuickChatUser[]>({
    queryKey: ['/api/users', 'quick-chat', search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const res = await apiRequest(`/api/users?search=${encodeURIComponent(search)}&limit=10`, { method: 'GET' });
      const usersArray = Array.isArray(res) ? res : (res as any)?.data || [];
      return usersArray.filter((u: QuickChatUser) => u.id !== user?.id);
    },
    enabled: search.length >= 2
  });

  // DM mutation - chat diretto 1:1
  const createDmMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiRequest('/api/chat/channels/dm', {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      });
      return res as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      resetState();
      onChatCreated?.(data.id);
    }
  });

  // Group chat mutation - chat di gruppo
  const createGroupMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const res = await apiRequest('/api/chat/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: `Gruppo (${memberIds.length + 1})`,
          channelType: 'team',
          visibility: 'private',
          memberUserIds: memberIds
        })
      });
      return res as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      resetState();
      onChatCreated?.(data.id);
    }
  });

  const resetState = () => {
    setSearch('');
    setIsOpen(false);
    setSelectedUsers([]);
    setSelectedIndex(0);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [users]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      resetState();
      return;
    }

    if (!isOpen || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % users.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (users[selectedIndex]) {
          // Se nessuno selezionato, click singolo = DM diretto
          if (selectedUsers.length === 0) {
            createDmMutation.mutate(users[selectedIndex].id);
          } else {
            // Altrimenti aggiungi alla selezione
            toggleUserSelection(users[selectedIndex]);
          }
        }
        break;
    }
  };

  const toggleUserSelection = (userToToggle: QuickChatUser) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === userToToggle.id);
      if (exists) {
        return prev.filter(u => u.id !== userToToggle.id);
      }
      return [...prev, userToToggle];
    });
  };

  const isUserSelected = (userId: string) => selectedUsers.some(u => u.id === userId);

  const handleDirectChat = (userId: string, e: React.MouseEvent) => {
    // Solo se nessun utente selezionato, click = DM diretto
    if (selectedUsers.length === 0) {
      e.stopPropagation();
      createDmMutation.mutate(userId);
    }
  };

  const handleCreateGroupChat = () => {
    if (selectedUsers.length >= 1) {
      createGroupMutation.mutate(selectedUsers.map(u => u.id));
    }
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const isPending = createDmMutation.isPending || createGroupMutation.isPending;

  return (
    <div className={`relative ${className}`}>
      {/* Chips area - utenti selezionati */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedUsers.map(u => (
            <Badge 
              key={u.id} 
              variant="secondary" 
              className="flex items-center gap-1 pr-1 bg-windtre-orange/10 text-windtre-orange border-windtre-orange/30"
            >
              <span className="text-xs">{u.firstName} {u.lastName}</span>
              <button
                onClick={() => removeSelectedUser(u.id)}
                className="ml-1 hover:bg-windtre-orange/20 rounded-full p-0.5"
                data-testid={`remove-user-${u.id}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {/* Bottone crea gruppo */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleCreateGroupChat}
                  disabled={isPending}
                  className="h-6 px-2 bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                  data-testid="button-create-group-chat"
                >
                  {isPending ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  ) : (
                    <>
                      <Users className="h-3 w-3 mr-1" />
                      <Send className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Inizia chat di gruppo ({selectedUsers.length} membri)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => search.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedUsers.length > 0 ? "Aggiungi altri..." : placeholder}
          className="pl-9 pr-9 h-9 text-sm"
          data-testid="input-quick-chat"
        />
        {search && (
          <button
            onClick={() => {
              setSearch('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown risultati */}
      {isOpen && search.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-3 text-center text-gray-500 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-windtre-orange mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-3 text-center text-gray-500 text-sm">
              <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nessun risultato per "{search}"</p>
            </div>
          ) : (
            <div className="py-1">
              {/* Hint sul flusso */}
              <div className="px-3 py-1.5 text-xs text-gray-400 border-b bg-gray-50">
                {selectedUsers.length === 0 
                  ? "Click per chat diretta • Checkbox per gruppo"
                  : `${selectedUsers.length} selezionati • Aggiungi altri o avvia gruppo`
                }
              </div>
              
              {users.map((u, index) => {
                const isSelected = isUserSelected(u.id);
                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer ${
                      index === selectedIndex 
                        ? 'bg-windtre-orange/10' 
                        : 'hover:bg-gray-50'
                    } ${isSelected ? 'bg-green-50' : ''}`}
                    data-testid={`quick-chat-user-${u.id}`}
                  >
                    {/* Checkbox per multi-select */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleUserSelection(u)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 data-[state=checked]:bg-windtre-orange data-[state=checked]:border-windtre-orange"
                      data-testid={`checkbox-user-${u.id}`}
                    />
                    
                    {/* Click area per DM diretto */}
                    <button
                      onClick={(e) => handleDirectChat(u.id, e)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      disabled={selectedUsers.length > 0}
                    >
                      <AvatarWithPresence
                        userId={u.id}
                        name={`${u.firstName} ${u.lastName}`}
                        size="sm"
                        showPresence={true}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </button>
                    
                    {/* Icona stato */}
                    {isSelected ? (
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                    ) : selectedUsers.length === 0 ? (
                      <MessageCircle className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          
          {isPending && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-windtre-orange" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
