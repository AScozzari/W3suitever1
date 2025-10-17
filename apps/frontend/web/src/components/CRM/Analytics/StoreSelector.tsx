/**
 * Store Selector Component
 * 
 * Multi-select dropdown for store filtering with search and badges
 * Features glassmorphism design and color-coded store badges
 */

import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Store, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

export interface Store {
  id: string;
  name: string;
  city: string | null;
  isActive: boolean;
}

interface StoreSelectorProps {
  value: string[];
  onChange: (storeIds: string[]) => void;
  className?: string;
  placeholder?: string;
}

// Generate consistent color for each store
const getStoreColor = (storeName: string) => {
  const colors = [
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
  ];
  
  let hash = 0;
  for (let i = 0; i < storeName.length; i++) {
    hash = ((hash << 5) - hash) + storeName.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
};

export function StoreSelector({ 
  value = [], 
  onChange, 
  className,
  placeholder = "Seleziona store..."
}: StoreSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch stores
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['/api/stores'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter active stores
  const activeStores = useMemo(() => 
    stores.filter((store: Store) => store.isActive),
    [stores]
  );

  // Filter stores based on search
  const filteredStores = useMemo(() => {
    if (!searchQuery) return activeStores;
    
    const query = searchQuery.toLowerCase();
    return activeStores.filter((store: Store) =>
      store.name.toLowerCase().includes(query) ||
      (store.city && store.city.toLowerCase().includes(query))
    );
  }, [activeStores, searchQuery]);

  // Get selected store objects
  const selectedStores = useMemo(() => 
    activeStores.filter((store: Store) => value.includes(store.id)),
    [activeStores, value]
  );

  const handleSelectAll = () => {
    onChange(filteredStores.map((s: Store) => s.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleToggleStore = (storeId: string) => {
    const newValue = value.includes(storeId)
      ? value.filter(id => id !== storeId)
      : [...value, storeId];
    onChange(newValue);
  };

  const handleRemoveStore = (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(id => id !== storeId));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Selected Store Badges */}
      {selectedStores.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedStores.map((store: Store) => (
            <Badge
              key={store.id}
              variant="outline"
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-xs",
                getStoreColor(store.name)
              )}
            >
              <Store className="h-3 w-3" />
              {store.name}
              <button
                onClick={(e) => handleRemoveStore(store.id, e)}
                className="ml-1 hover:opacity-70 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "justify-between font-normal",
              "bg-white/50 backdrop-blur-md",
              "border-[var(--brand-orange)]/20",
              "hover:bg-white/60",
              "transition-all duration-200"
            )}
            data-testid="store-selector-button"
          >
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-[var(--brand-orange)]" />
              <span>
                {value.length === 0
                  ? placeholder
                  : value.length === 1
                  ? selectedStores[0]?.name
                  : `${value.length} store selezionati`}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0">
          <Command>
            <CommandInput 
              placeholder="Cerca store..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
            <CommandEmpty>
              {isLoading ? "Caricamento store..." : "Nessuno store trovato."}
            </CommandEmpty>
            
            {/* Quick Actions */}
            <CommandGroup>
              <CommandItem onSelect={handleSelectAll}>
                <Check 
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.length === filteredStores.length && value.length > 0
                      ? "opacity-100" 
                      : "opacity-0"
                  )} 
                />
                Seleziona tutti ({filteredStores.length})
              </CommandItem>
              {value.length > 0 && (
                <CommandItem onSelect={handleClearAll}>
                  <X className="mr-2 h-4 w-4" />
                  Deseleziona tutti
                </CommandItem>
              )}
            </CommandGroup>
            
            <CommandSeparator />
            
            {/* Store List */}
            <CommandGroup className="max-h-[300px] overflow-auto">
              {filteredStores.map((store: Store) => (
                <CommandItem
                  key={store.id}
                  value={store.id}
                  onSelect={() => handleToggleStore(store.id)}
                  className="flex items-center justify-between"
                  data-testid={`store-option-${store.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value.includes(store.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{store.name}</span>
                    {store.city && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {store.city}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}