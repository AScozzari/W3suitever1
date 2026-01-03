import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, MessageCircle, X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

export function QuickChatBar({ onChatCreated, placeholder = "Cerca un collega per chattare...", className = "" }: QuickChatBarProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: users = [], isLoading } = useQuery<QuickChatUser[]>({
    queryKey: ['/api/users', 'quick-chat', search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const res = await apiRequest(`/api/users?search=${encodeURIComponent(search)}&limit=8`, { method: 'GET' });
      return (res as QuickChatUser[]).filter(u => u.id !== user?.id);
    },
    enabled: search.length >= 2
  });

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
      setSearch('');
      setIsOpen(false);
      onChatCreated?.(data.id);
    }
  });

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
          createDmMutation.mutate(users[selectedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  const handleUserSelect = (userId: string) => {
    createDmMutation.mutate(userId);
  };

  return (
    <div className={`relative ${className}`}>
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
          placeholder={placeholder}
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
              {users.map((u, index) => (
                <button
                  key={u.id}
                  onClick={() => handleUserSelect(u.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    index === selectedIndex 
                      ? 'bg-windtre-orange/10' 
                      : 'hover:bg-gray-50'
                  }`}
                  data-testid={`quick-chat-user-${u.id}`}
                >
                  <AvatarWithPresence
                    userId={u.id}
                    name={`${u.firstName} ${u.lastName}`}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <MessageCircle className="h-4 w-4 text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
          
          {createDmMutation.isPending && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-windtre-orange" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
