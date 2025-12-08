import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  StickyNote,
  Plus,
  Trash2,
  Edit,
  Calendar,
  User,
  Tag,
  Search
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isPinned: boolean;
}

interface CustomerNotesTabProps {
  customerId: string;
}

export function CustomerNotesTab({ customerId }: CustomerNotesTabProps) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [newNote, setNewNote] = useState({ title: '', content: '', tags: '' });

  // Fetch notes
  const { data: response, isLoading } = useQuery({
    queryKey: [`/api/crm/customers/${customerId}/notes`],
    enabled: !!customerId,
  });

  const notes = response?.data || [];

  const allTags = Array.from(new Set(notes.flatMap((note: Note) => note.tags || [])));
  
  const filteredNotes = notes
    .filter((note: Note) => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === 'all' || (note.tags || []).includes(selectedTag);
      return matchesSearch && matchesTag;
    });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; tags: string[] }) => {
      return apiRequest(`/api/crm/customers/${customerId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/customers/${customerId}/notes`] });
      toast({
        title: 'Nota creata',
        description: 'La nota è stata creata con successo',
      });
      setIsCreateOpen(false);
      setNewNote({ title: '', content: '', tags: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile creare la nota',
        variant: 'destructive',
      });
    }
  });

  // Update mutation (for pinning)
  const updateMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      return apiRequest(`/api/crm/customers/${customerId}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPinned }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/customers/${customerId}/notes`] });
      toast({
        title: 'Nota aggiornata',
        description: 'La nota è stata aggiornata con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare la nota',
        variant: 'destructive',
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest(`/api/crm/customers/${customerId}/notes/${noteId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/customers/${customerId}/notes`] });
      toast({
        title: 'Nota eliminata',
        description: 'La nota è stata eliminata con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile eliminare la nota',
        variant: 'destructive',
      });
    }
  });

  const handleCreateNote = () => {
    if (!newNote.title || !newNote.content) {
      toast({
        title: 'Campi obbligatori',
        description: 'Titolo e contenuto sono obbligatori',
        variant: 'destructive',
      });
      return;
    }

    const tags = newNote.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    createMutation.mutate({
      title: newNote.title,
      content: newNote.content,
      tags
    });
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      'Vendite': 'hsl(var(--brand-orange))',
      'Follow-up': 'hsl(142, 76%, 36%)',
      'Supporto': 'hsl(220, 90%, 56%)',
      'Qualità': 'hsl(var(--brand-purple))',
      'Strategia': 'hsl(25, 95%, 53%)',
      'Opportunità': 'hsl(48, 96%, 53%)'
    };
    return colors[tag] || 'hsl(0, 0%, 50%)';
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Caricamento note...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <StickyNote className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
              Note Cliente
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredNotes.length} nota{filteredNotes.length !== 1 ? 'e' : ''} trovata{filteredNotes.length !== 1 ? 'e' : ''}
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="button-create-note"
                className="gap-2"
                style={{ backgroundColor: 'hsl(var(--brand-purple))' }}
              >
                <Plus className="h-4 w-4" />
                Nuova Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crea nuova nota</DialogTitle>
                <DialogDescription>
                  Aggiungi una nota per questo cliente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Titolo</label>
                  <Input 
                    placeholder="Titolo della nota..."
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    data-testid="input-note-title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Contenuto</label>
                  <Textarea 
                    placeholder="Scrivi qui il contenuto della nota..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    rows={6}
                    data-testid="textarea-note-content"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tag (separati da virgola)</label>
                  <Input 
                    placeholder="es: Vendite, Follow-up, Supporto"
                    value={newNote.tags}
                    onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                    data-testid="input-note-tags"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
                  Annulla
                </Button>
                <Button 
                  data-testid="button-save-note"
                  style={{ backgroundColor: 'hsl(var(--brand-purple))' }}
                  onClick={handleCreateNote}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Salvataggio...' : 'Salva Nota'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca nelle note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-notes"
            />
          </div>
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-[180px]" data-testid="select-tag-filter">
              <SelectValue placeholder="Filtra per tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tag</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nessuna nota trovata</p>
            </div>
          ) : (
            filteredNotes.map((note: Note) => (
              <Card 
                key={note.id}
                className="p-4 hover:shadow-md transition-shadow"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderLeft: note.isPinned ? '4px solid hsl(var(--brand-orange))' : undefined
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                          {note.title}
                          {note.isPinned && (
                            <Badge variant="outline" className="text-xs">
                              Fissata
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => updateMutation.mutate({ noteId: note.id, isPinned: !note.isPinned })}
                          disabled={updateMutation.isPending}
                          title={note.isPinned ? 'Rimuovi pin' : 'Fissa in alto'}
                          data-testid={`button-pin-${note.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteMutation.mutate(note.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        {(note.tags || []).map(tag => (
                          <Badge 
                            key={tag}
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: getTagColor(tag), color: getTagColor(tag) }}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500 ml-auto">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {note.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(note.createdAt).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
