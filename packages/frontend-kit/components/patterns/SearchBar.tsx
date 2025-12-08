import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '../../hooks/useDebounce';

export interface SearchFilter {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'toggle';
  options?: Array<{ value: string; label: string }>;
  value?: any;
}

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string, filters?: Record<string, any>) => void;
  filters?: SearchFilter[];
  onFilterChange?: (filters: Record<string, any>) => void;
  suggestions?: string[];
  showClearButton?: boolean;
  showFilterButton?: boolean;
  variant?: 'default' | 'minimal' | 'expanded';
  className?: string;
}

export function SearchBar({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSearch,
  filters = [],
  onFilterChange,
  suggestions = [],
  showClearButton = true,
  showFilterButton = true,
  variant = 'default',
  className = '',
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const debouncedValue = useDebounce(value, 300);

  // Call onSearch when debounced value changes
  useEffect(() => {
    if (onSearch && debouncedValue) {
      onSearch(debouncedValue, activeFilters);
    }
  }, [debouncedValue, activeFilters, onSearch]);

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
    setShowSuggestions(true);
  };

  const handleClear = () => {
    handleValueChange('');
    setActiveFilters({});
    onFilterChange?.({});
    onSearch?.('', {});
  };

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    if (value === undefined || value === null || value === '') {
      delete newFilters[filterId];
    }
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleValueChange(suggestion);
    setShowSuggestions(false);
    onSearch?.(suggestion, activeFilters);
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  if (variant === 'minimal') {
    return (
      <div className={cn('relative', className)} data-testid="search-bar-minimal">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          className="pl-10 pr-10"
          data-testid="input-search"
        />
        {showClearButton && value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            data-testid="button-clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'expanded') {
    return (
      <div className={cn('space-y-4', className)} data-testid="search-bar-expanded">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            className="pl-10 pr-10 text-lg"
            data-testid="input-search"
          />
          {showClearButton && value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              data-testid="button-clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Inline Filters */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{filter.label}:</span>
                {filter.type === 'select' && (
                  <Select
                    value={activeFilters[filter.id] || ''}
                    onValueChange={(value) => handleFilterChange(filter.id, value)}
                  >
                    <SelectTrigger className="w-40" data-testid={`filter-${filter.id}`}>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(activeFilters).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="gap-1">
                  {filters.find((f) => f.id === key)?.label}: {value}
                  <button
                    onClick={() => handleFilterChange(key, undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('flex items-center gap-2', className)} data-testid="search-bar">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          className="pl-10 pr-10"
          data-testid="input-search"
        />
        {showClearButton && value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            data-testid="button-clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && value && (
          <div className="absolute top-full z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
            {suggestions
              .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
              .slice(0, 5)
              .map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  data-testid={`suggestion-${index}`}
                >
                  {suggestion}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Filter Button */}
      {showFilterButton && filters.length > 0 && (
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" data-testid="button-filters">
              {activeFilterCount > 0 ? (
                <div className="relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-white">
                    {activeFilterCount}
                  </span>
                </div>
              ) : (
                <Filter className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Filters</h4>
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-2">
                  <label className="text-sm font-medium">{filter.label}</label>
                  {filter.type === 'select' && (
                    <Select
                      value={activeFilters[filter.id] || ''}
                      onValueChange={(value) => handleFilterChange(filter.id, value)}
                    >
                      <SelectTrigger data-testid={`filter-${filter.id}`}>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveFilters({});
                    onFilterChange?.({});
                  }}
                  className="w-full"
                  data-testid="button-clear-filters"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}