import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, User, Mail, Phone, Hash, Building, TrendingUp } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface CRMSearchBarProps {
  onSearch: (query: string) => void;
  onFilterClick?: () => void;
  onLeadSelect?: (leadId: string) => void;
  placeholder?: string;
  className?: string;
  enableAutocomplete?: boolean;
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  fiscalCode?: string;
  vatNumber?: string;
  gtmClientId?: string;
  leadScore: number;
  status: string;
}

export function CRMSearchBar({ 
  onSearch, 
  onFilterClick,
  onLeadSelect,
  placeholder = 'Cerca per nome, email, telefono, CF, P.IVA, GTM ID...',
  className = '',
  enableAutocomplete = true
}: CRMSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch search results with debounce
  const { data: searchResults } = useQuery<SearchResult[]>({
    queryKey: ['/api/crm/leads/search', searchQuery],
    enabled: enableAutocomplete && searchQuery.length >= 2,
  });

  const results = searchResults || [];

  // Debounce automatico per match real-time
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  // Apri dropdown quando ci sono risultati
  useEffect(() => {
    if (results.length > 0 && searchQuery.length >= 2) {
      setIsOpen(true);
    }
  }, [results, searchQuery]);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-windtre-orange/30 text-gray-900 font-semibold">{part}</mark> : 
        part
    );
  };

  const getMatchType = (result: SearchResult, query: string): string => {
    const q = query.toLowerCase();
    if (result.firstName?.toLowerCase().includes(q) || result.lastName?.toLowerCase().includes(q)) return 'Nome';
    if (result.email?.toLowerCase().includes(q)) return 'Email';
    if (result.phone?.includes(q)) return 'Telefono';
    if (result.fiscalCode?.toLowerCase().includes(q)) return 'Codice Fiscale';
    if (result.vatNumber?.includes(q)) return 'P.IVA';
    if (result.gtmClientId?.includes(q)) return 'GTM ID';
    if (result.companyName?.toLowerCase().includes(q)) return 'Azienda';
    return 'Match';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'hsl(var(--brand-purple))',
      qualified: 'hsl(220, 90%, 56%)',
      contacted: 'hsl(280, 65%, 60%)',
      converted: 'hsl(142, 76%, 36%)',
      lost: 'hsl(0, 84%, 60%)'
    };
    return colors[status] || 'hsl(var(--brand-orange))';
  };

  const handleSelectLead = (leadId: string) => {
    setIsOpen(false);
    setSearchQuery('');
    onLeadSelect?.(leadId);
  };

  return (
    <div 
      className={`sticky top-0 z-10 border-b px-6 py-3 ${className}`}
      style={{ 
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--glass-card-border)'
      }}
      ref={inputRef}
    >
      <div className="flex items-center gap-3">
        {/* Campo Ricerca con Autocomplete */}
        <div className="relative flex-1 max-w-2xl">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 z-10" 
            style={{ color: 'var(--text-tertiary)' }} 
          />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            style={{
              background: 'var(--glass-bg-light)',
              borderColor: 'var(--glass-card-border)',
              color: 'var(--text-primary)'
            }}
            data-testid="crm-search-input"
          />

          {/* Autocomplete Dropdown */}
          {enableAutocomplete && isOpen && results.length > 0 && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg overflow-hidden z-50"
              style={{ 
                background: 'var(--glass-card-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-card-border)'
              }}
            >
              <div className="max-h-[400px] overflow-y-auto">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectLead(result.id)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-100/50 transition-colors border-b border-gray-100/30 last:border-0"
                    data-testid={`search-result-${result.id}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Nome con highlight */}
                        <div className="font-medium text-gray-900 truncate">
                          {highlightMatch(`${result.firstName} ${result.lastName}`, searchQuery)}
                        </div>
                        
                        {/* Email/Phone con highlight */}
                        <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                          {result.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">
                                {highlightMatch(result.email, searchQuery)}
                              </span>
                            </div>
                          )}
                          {result.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{highlightMatch(result.phone, searchQuery)}</span>
                            </div>
                          )}
                        </div>

                        {/* Info aggiuntive (CF, P.IVA, Azienda, GTM) */}
                        <div className="flex items-center gap-2 mt-1">
                          {result.companyName && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              <Building className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">
                                {highlightMatch(result.companyName, searchQuery)}
                              </span>
                            </div>
                          )}
                          {result.fiscalCode && searchQuery.length >= 3 && result.fiscalCode.toLowerCase().includes(searchQuery.toLowerCase()) && (
                            <Badge variant="outline" className="text-xs">
                              CF: {highlightMatch(result.fiscalCode, searchQuery)}
                            </Badge>
                          )}
                          {result.vatNumber && searchQuery.length >= 3 && result.vatNumber.includes(searchQuery) && (
                            <Badge variant="outline" className="text-xs">
                              P.IVA: {highlightMatch(result.vatNumber, searchQuery)}
                            </Badge>
                          )}
                          {result.gtmClientId && searchQuery.length >= 3 && result.gtmClientId.includes(searchQuery) && (
                            <Badge variant="outline" className="text-xs" style={{ color: 'hsl(var(--brand-purple))' }}>
                              GTM: {highlightMatch(result.gtmClientId.substring(0, 12) + '...', searchQuery)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Score + Status */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" style={{ color: 'hsl(var(--brand-orange))' }} />
                          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--brand-orange))' }}>
                            {result.leadScore}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-xs font-medium"
                          style={{ 
                            borderColor: getStatusColor(result.status),
                            color: getStatusColor(result.status)
                          }}
                        >
                          {result.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Match Type Indicator */}
                    <div className="mt-1">
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-1.5 py-0.5"
                        style={{ background: 'hsl(var(--brand-orange))/10', color: 'hsl(var(--brand-orange))' }}
                      >
                        Match: {getMatchType(result, searchQuery)}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer con conteggio risultati */}
              <div 
                className="px-4 py-2 border-t text-xs text-center"
                style={{ 
                  borderColor: 'var(--glass-card-border)',
                  color: 'var(--text-tertiary)',
                  background: 'var(--glass-bg-light)'
                }}
              >
                {results.length} risultat{results.length === 1 ? 'o' : 'i'} trovat{results.length === 1 ? 'o' : 'i'}
              </div>
            </div>
          )}

          {/* No results message */}
          {enableAutocomplete && isOpen && searchQuery.length >= 2 && results.length === 0 && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 p-6 rounded-lg shadow-lg text-center"
              style={{ 
                background: 'var(--glass-card-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-card-border)'
              }}
            >
              <Search className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Nessun lead trovato per "<strong>{searchQuery}</strong>"
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Prova a cercare per nome, email, telefono, CF, P.IVA o GTM ID
              </p>
            </div>
          )}
        </div>

        {/* Bottone Filtri */}
        {onFilterClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterClick}
            style={{ 
              background: 'var(--glass-bg-light)',
              borderColor: 'var(--glass-card-border)'
            }}
            data-testid="crm-filters-button"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtri
          </Button>
        )}
      </div>
    </div>
  );
}
