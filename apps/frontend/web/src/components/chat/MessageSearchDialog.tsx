import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Calendar, User, MessageCircle, X, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AvatarWithPresence } from './PresenceIndicator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SearchResult {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName?: string;
  channelId: string;
  channelName: string;
  channelType: 'dm' | 'team' | 'task_thread' | 'general';
  highlightedContent?: string;
}

interface MessageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult?: (channelId: string, messageId: string) => void;
}

export function MessageSearchDialog({ open, onOpenChange, onSelectResult }: MessageSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    channelId: ''
  });

  const { data: results = [], isLoading, isFetching } = useQuery<SearchResult[]>({
    queryKey: ['/api/chat/search', query, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);
      if (filters.channelId) params.set('channelId', filters.channelId);
      const res = await apiRequest(`/api/chat/search?${params.toString()}`, { method: 'GET' });
      return res as SearchResult[];
    },
    enabled: open && query.length >= 2,
    staleTime: 30000
  });

  const handleResultClick = (result: SearchResult) => {
    onSelectResult?.(result.channelId, result.id);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setFilters({ fromDate: '', toDate: '', channelId: '' });
  };

  const hasFilters = filters.fromDate || filters.toDate || filters.channelId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-windtre-orange" />
            Cerca nei Messaggi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca testo nei messaggi..."
              className="pl-9 pr-9"
              autoFocus
              data-testid="input-search-messages"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Filtri avanzati
                  {hasFilters && <span className="text-xs bg-windtre-orange text-white px-1.5 rounded-full">Attivi</span>}
                </span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Data inizio</Label>
                  <Input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                    className="h-8 text-sm"
                    data-testid="input-filter-from-date"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Data fine</Label>
                  <Input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters(f => ({ ...f, toDate: e.target.value }))}
                    className="h-8 text-sm"
                    data-testid="input-filter-to-date"
                  />
                </div>
              </div>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" /> Rimuovi filtri
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading || isFetching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-windtre-orange" />
              </div>
            ) : query.length < 2 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Digita almeno 2 caratteri per cercare</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nessun messaggio trovato</p>
                <p className="text-xs mt-1">Prova con termini diversi</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">{results.length} risultati</p>
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                    data-testid={`search-result-${result.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <AvatarWithPresence
                        userId={result.userId}
                        name={result.userName || 'Utente'}
                        size="sm"
                        showPresence={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <span className="font-medium text-gray-700">{result.userName || 'Utente'}</span>
                          <span>•</span>
                          <span>{result.channelName}</span>
                          <span>•</span>
                          <span>{format(new Date(result.createdAt), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {result.content}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-windtre-orange transition-colors shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
