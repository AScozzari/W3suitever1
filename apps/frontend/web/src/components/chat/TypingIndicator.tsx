import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface TypingIndicatorProps {
  channelId: string;
  currentUserId: string;
}

export function TypingIndicator({ channelId, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Poll for typing indicators
  const { data } = useQuery<any[]>({
    queryKey: [`/api/chat/channels/${channelId}/typing`],
    enabled: !!channelId,
    refetchInterval: 2000,
    select: (data) => data?.filter((user: any) => user.userId !== currentUserId) || []
  });

  useEffect(() => {
    if (data) {
      setTypingUsers(data.map((u: any) => u.userId));
    }
  }, [data]);

  if (typingUsers.length === 0) return null;

  return (
    <div
      data-testid="typing-indicator"
      style={{
        padding: '8px 16px',
        fontSize: '12px',
        color: '#6b7280',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <div style={{
        display: 'flex',
        gap: '4px'
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#9ca3af',
          animation: 'bounce 1.4s infinite ease-in-out both',
          animationDelay: '-0.32s'
        }} />
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#9ca3af',
          animation: 'bounce 1.4s infinite ease-in-out both',
          animationDelay: '-0.16s'
        }} />
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#9ca3af',
          animation: 'bounce 1.4s infinite ease-in-out both'
        }} />
      </div>
      <span>
        {typingUsers.length === 1 ? 'Sta scrivendo...' : `${typingUsers.length} persone stanno scrivendo...`}
      </span>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
