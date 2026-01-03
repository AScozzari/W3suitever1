import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AvatarWithPresence } from './PresenceIndicator';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface MentionAutocompleteProps {
  searchText: string;
  onSelect: (user: User) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function MentionAutocomplete({ 
  searchText, 
  onSelect, 
  onClose,
  position 
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users', 'search', searchText],
    queryFn: async () => {
      if (!searchText || searchText.length < 1) return [];
      const res = await fetch(`/api/users?search=${encodeURIComponent(searchText)}&limit=8`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: searchText.length >= 1,
    staleTime: 30000
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [users]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (users.length === 0) return;
      
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
            onSelect(users[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [users, selectedIndex, onSelect, onClose]);

  if (users.length === 0) return null;

  return (
    <div
      ref={listRef}
      data-testid="mention-autocomplete"
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] max-w-[280px] max-h-[240px] overflow-y-auto"
      style={{ 
        bottom: position.top,
        left: position.left
      }}
    >
      {users.map((user, index) => {
        const displayName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.email.split('@')[0];
        
        return (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            data-testid={`mention-user-${user.id}`}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
              index === selectedIndex 
                ? 'bg-windtre-orange/10 text-gray-900'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <AvatarWithPresence
              userId={user.id}
              name={displayName}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function highlightMentions(text: string, mentionedUserIds: string[]): JSX.Element {
  if (!mentionedUserIds || mentionedUserIds.length === 0) {
    return <>{text}</>;
  }

  const mentionRegex = /@(\w+)/g;
  const parts = text.split(mentionRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <span 
              key={index}
              className="text-windtre-orange font-medium bg-windtre-orange/10 px-1 rounded"
            >
              @{part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
