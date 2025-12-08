import { useState } from 'react';
import { Edit2, Trash2, MoreVertical } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface MessageActionsProps {
  messageId: string;
  channelId: string;
  content: string;
  isMine: boolean;
  onEdit: (newContent: string) => void;
}

export function MessageActions({ messageId, channelId, content, isMine, onEdit }: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const editMutation = useMutation({
    mutationFn: async (newContent: string) => {
      return apiRequest(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: newContent })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', channelId, 'messages'] });
      setIsEditing(false);
      onEdit(editContent);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/chat/messages/${messageId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', channelId, 'messages'] });
    }
  });

  if (!isMine) return null;

  if (isEditing) {
    return (
      <div style={{
        padding: '8px',
        background: '#f9fafb',
        borderRadius: '8px',
        marginTop: '8px'
      }}>
        <input
          type="text"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          data-testid="input-edit-message"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '8px'
          }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setIsEditing(false)}
            data-testid="button-cancel-edit"
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: 'white',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
          <button
            onClick={() => editMutation.mutate(editContent)}
            disabled={editMutation.isPending || !editContent.trim()}
            data-testid="button-save-edit"
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              background: '#FF6900',
              color: 'white',
              fontSize: '13px',
              cursor: editMutation.isPending ? 'wait' : 'pointer',
              opacity: !editContent.trim() ? 0.5 : 1
            }}
          >
            Salva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        data-testid="button-message-actions"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          color: '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <MoreVertical size={16} />
      </button>

      {showMenu && (
        <>
          <div
            onClick={() => setShowMenu(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10
            }}
          />
          <div
            data-testid="message-actions-menu"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              minWidth: '150px',
              zIndex: 20,
              overflow: 'hidden'
            }}
          >
            <button
              onClick={() => {
                setIsEditing(true);
                setShowMenu(false);
              }}
              data-testid="button-edit-message"
              style={{
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#1f2937',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Edit2 size={16} />
              Modifica
            </button>
            <button
              onClick={() => {
                if (confirm('Eliminare questo messaggio?')) {
                  deleteMutation.mutate();
                }
                setShowMenu(false);
              }}
              data-testid="button-delete-message"
              style={{
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#ef4444',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={16} />
              Elimina
            </button>
          </div>
        </>
      )}
    </div>
  );
}
