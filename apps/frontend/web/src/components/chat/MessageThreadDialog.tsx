import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AvatarWithPresence } from './PresenceIndicator';

interface ThreadMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName?: string;
  parentMessageId: string | null;
}

interface MessageThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentMessage: {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    userName?: string;
  } | null;
  channelId: string;
}

export function MessageThreadDialog({ open, onOpenChange, parentMessage, channelId }: MessageThreadDialogProps) {
  const [replyContent, setReplyContent] = useState('');
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading } = useQuery<ThreadMessage[]>({
    queryKey: ['/api/chat/messages', parentMessage?.id, 'thread'],
    queryFn: async () => {
      if (!parentMessage?.id) return [];
      const res = await apiRequest(`/api/chat/messages/${parentMessage.id}/thread`, { method: 'GET' });
      return res as ThreadMessage[];
    },
    enabled: open && !!parentMessage?.id
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          channelId,
          content,
          parentMessageId: parentMessage?.id
        })
      });
    },
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', parentMessage?.id, 'thread'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', channelId, 'messages'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim() && !replyMutation.isPending) {
      replyMutation.mutate(replyContent.trim());
    }
  };

  if (!parentMessage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-windtre-orange" />
            Thread
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-start gap-3">
              <AvatarWithPresence
                userId={parentMessage.userId}
                name={parentMessage.userName || 'Utente'}
                size="sm"
                showPresence={false}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{parentMessage.userName || 'Utente'}</span>
                  <span>{format(new Date(parentMessage.createdAt), 'dd MMM HH:mm', { locale: it })}</span>
                </div>
                <p className="text-sm text-gray-800 mt-1">{parentMessage.content}</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-windtre-orange" />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Nessuna risposta ancora
            </div>
          ) : (
            <div className="space-y-3 pl-4 border-l-2 border-gray-200">
              {replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-2">
                  <AvatarWithPresence
                    userId={reply.userId}
                    name={reply.userName || 'Utente'}
                    size="sm"
                    showPresence={false}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{reply.userName || 'Utente'}</span>
                      <span>{format(new Date(reply.createdAt), 'dd MMM HH:mm', { locale: it })}</span>
                    </div>
                    <p className="text-sm text-gray-800 mt-0.5">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 pt-3 border-t">
          <div className="flex gap-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Rispondi al thread..."
              className="min-h-[60px] resize-none text-sm"
              data-testid="input-thread-reply"
            />
            <Button
              type="submit"
              disabled={!replyContent.trim() || replyMutation.isPending}
              className="bg-windtre-orange hover:bg-windtre-orange-dark self-end"
              data-testid="button-send-thread-reply"
            >
              {replyMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
