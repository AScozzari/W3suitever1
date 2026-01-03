import { useState } from 'react';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  useSavedReplies, 
  useCreateSavedReply, 
  useDeleteSavedReply,
  useIncrementSavedReplyUsage
} from '@/hooks/useChatFeatures';
import { useToast } from '@/hooks/use-toast';

interface SavedRepliesPickerProps {
  onSelect: (content: string) => void;
}

export function SavedRepliesPicker({ onSelect }: SavedRepliesPickerProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newReply, setNewReply] = useState({ title: '', content: '', shortcut: '' });
  
  const { toast } = useToast();
  const { data: savedReplies = [] } = useSavedReplies();
  const createMutation = useCreateSavedReply();
  const deleteMutation = useDeleteSavedReply();
  const usageMutation = useIncrementSavedReplyUsage();

  const filteredReplies = savedReplies.filter(reply =>
    reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reply.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (reply.shortcut && reply.shortcut.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (reply: typeof savedReplies[0]) => {
    onSelect(reply.content);
    usageMutation.mutate(reply.id);
    setOpen(false);
    toast({ title: 'Risposta inserita', description: reply.title });
  };

  const handleCreate = () => {
    if (!newReply.title || !newReply.content) {
      toast({ title: 'Errore', description: 'Titolo e contenuto sono obbligatori', variant: 'destructive' });
      return;
    }
    
    createMutation.mutate(newReply, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setNewReply({ title: '', content: '', shortcut: '' });
        toast({ title: 'Risposta salvata', description: 'La risposta è stata salvata con successo' });
      },
      onError: () => {
        toast({ title: 'Errore', description: 'Impossibile salvare la risposta', variant: 'destructive' });
      }
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Risposta eliminata' });
      }
    });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            data-testid="button-saved-replies"
            title="Risposte salvate"
          >
            <FileText size={18} className="text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="end" 
          className="w-80 p-0"
          data-testid="saved-replies-picker"
        >
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Risposte Salvate</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setCreateDialogOpen(true)}
                data-testid="button-create-saved-reply"
              >
                <Plus size={14} className="mr-1" />
                Nuova
              </Button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cerca risposte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
                data-testid="input-search-saved-replies"
              />
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {filteredReplies.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {savedReplies.length === 0 
                  ? 'Nessuna risposta salvata'
                  : 'Nessun risultato'
                }
              </div>
            ) : (
              filteredReplies.map((reply) => (
                <div
                  key={reply.id}
                  onClick={() => handleSelect(reply)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 group"
                  data-testid={`saved-reply-${reply.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {reply.title}
                        </span>
                        {reply.shortcut && (
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                            /{reply.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {reply.content}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1">
                        Usato {reply.usageCount} volte
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(reply.id, e)}
                    >
                      <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova Risposta Salvata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={newReply.title}
                onChange={(e) => setNewReply(prev => ({ ...prev, title: e.target.value }))}
                placeholder="es. Saluto cliente"
                data-testid="input-reply-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Contenuto *</Label>
              <Textarea
                id="content"
                value={newReply.content}
                onChange={(e) => setNewReply(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Scrivi il testo della risposta..."
                rows={4}
                data-testid="input-reply-content"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortcut">Scorciatoia (opzionale)</Label>
              <Input
                id="shortcut"
                value={newReply.shortcut}
                onChange={(e) => setNewReply(prev => ({ ...prev, shortcut: e.target.value }))}
                placeholder="es. saluto"
                data-testid="input-reply-shortcut"
              />
              <p className="text-xs text-gray-500">
                Digita /{newReply.shortcut || 'scorciatoia'} per inserire velocemente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-windtre-orange hover:bg-windtre-orange-dark"
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
