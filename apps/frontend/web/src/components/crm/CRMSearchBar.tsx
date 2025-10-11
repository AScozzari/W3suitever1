import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

interface CRMSearchBarProps {
  onSearch: (query: string) => void;
  onFilterClick?: () => void;
  placeholder?: string;
  className?: string;
}

export function CRMSearchBar({ 
  onSearch, 
  onFilterClick,
  placeholder = 'Cerca...',
  className = '' 
}: CRMSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce automatico per match real-time
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  return (
    <div 
      className={`sticky top-0 z-10 border-b px-6 py-3 ${className}`}
      style={{ 
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--glass-card-border)'
      }}
    >
      <div className="flex items-center gap-3">
        {/* Campo Ricerca con match automatico */}
        <div className="relative flex-1 max-w-md">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
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
