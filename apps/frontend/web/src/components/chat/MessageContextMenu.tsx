import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Reply, 
  Pin, 
  PinOff, 
  Copy, 
  Edit, 
  Trash2, 
  Forward, 
  Smile,
  MessageCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  isPinned?: boolean;
}

interface MessageContextMenuProps {
  children: React.ReactNode;
  message: Message;
  currentUserId: string;
  onReply?: () => void;
  onThread?: () => void;
  onReaction?: (emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function MessageContextMenu({ 
  children, 
  message, 
  currentUserId, 
  onReply,
  onThread,
  onReaction
}: MessageContextMenuProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isOwner = message.userId === currentUserId;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    toast({ title: 'Copiato negli appunti' });
  };

  const pinMutation = useMutation({
    mutationFn: async () => {
      if (message.isPinned) {
        return await apiRequest(`/api/chat/channels/${message.channelId}/pinned/${message.id}`, {
          method: 'DELETE'
        });
      } else {
        return await apiRequest(`/api/chat/channels/${message.channelId}/pinned`, {
          method: 'POST',
          body: JSON.stringify({ messageId: message.id })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', message.channelId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', message.channelId, 'pinned'] });
      toast({ title: message.isPinned ? 'Messaggio rimosso dai fissati' : 'Messaggio fissato' });
    }
  });

  const editMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/chat/messages/${message.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', message.channelId, 'messages'] });
      setEditDialogOpen(false);
      toast({ title: 'Messaggio modificato' });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile modificare il messaggio',
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/chat/messages/${message.id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', message.channelId, 'messages'] });
      setDeleteDialogOpen(false);
      toast({ title: 'Messaggio eliminato' });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il messaggio',
        variant: 'destructive'
      });
    }
  });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <div className="flex gap-1 p-1 border-b mb-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReaction?.(emoji)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                data-testid={`reaction-${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {onReply && (
            <ContextMenuItem onClick={onReply}>
              <Reply className="h-4 w-4 mr-2" />
              Rispondi
            </ContextMenuItem>
          )}
          
          {onThread && (
            <ContextMenuItem onClick={onThread}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Apri thread
            </ContextMenuItem>
          )}

          <ContextMenuItem onClick={() => pinMutation.mutate()}>
            {message.isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Rimuovi dai fissati
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Fissa messaggio
              </>
            )}
          </ContextMenuItem>

          <ContextMenuItem onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copia testo
          </ContextMenuItem>

          {isOwner && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => {
                setEditContent(message.content);
                setEditDialogOpen(true);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica messaggio</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-edit-message"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => editMutation.mutate(editContent.trim())}
              disabled={!editContent.trim() || editMutation.isPending}
              className="bg-windtre-orange hover:bg-windtre-orange-dark"
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                'Salva'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo messaggio?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Il messaggio verrà eliminato permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
