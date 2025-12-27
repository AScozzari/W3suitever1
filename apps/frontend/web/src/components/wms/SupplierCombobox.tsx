import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Building2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface SupplierComboboxProps {
  suppliers: Supplier[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  required?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  portalContainer?: HTMLElement | null;
  side?: "top" | "bottom" | "left" | "right";
  "data-testid"?: string;
}

export function SupplierCombobox({
  suppliers,
  value,
  onValueChange,
  placeholder = "Seleziona fornitore...",
  searchPlaceholder = "Cerca fornitore...",
  emptyMessage = "Nessun fornitore trovato.",
  disabled = false,
  className,
  triggerClassName,
  required = false,
  clearable = false,
  clearLabel = "Nessun fornitore",
  portalContainer,
  side = "bottom",
  "data-testid": testId,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const selectedSupplier = suppliers.find((s) => s.id === value);

  const allOptions = useMemo(() => {
    const filtered = search.trim()
      ? suppliers.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
        )
      : suppliers;
    
    if (clearable) {
      return [{ id: '', name: clearLabel, code: undefined, isClear: true }, ...filtered.map(s => ({ ...s, isClear: false }))];
    }
    return filtered.map(s => ({ ...s, isClear: false }));
  }, [suppliers, search, clearable, clearLabel]);

  const handleSelect = useCallback((supplierId: string) => {
    onValueChange(supplierId);
    setOpen(false);
    setSearch("");
    setHighlightedIndex(0);
  }, [onValueChange]);

  const scrollToHighlighted = useCallback((index: number) => {
    const optionEl = optionRefs.current.get(index);
    if (optionEl) {
      optionEl.scrollIntoView({ block: 'nearest' });
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = Math.min(prev + 1, allOptions.length - 1);
          scrollToHighlighted(next);
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = Math.max(prev - 1, 0);
          scrollToHighlighted(next);
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (allOptions[highlightedIndex]) {
          handleSelect(allOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        scrollToHighlighted(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(allOptions.length - 1);
        scrollToHighlighted(allOptions.length - 1);
        break;
    }
  }, [open, allOptions, highlightedIndex, handleSelect, scrollToHighlighted]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (open) {
      setHighlightedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName
          )}
          data-testid={testId}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 opacity-50" />
            {selectedSupplier ? (
              <span className="truncate">
                {selectedSupplier.name}
                {selectedSupplier.code && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({selectedSupplier.code})
                  </span>
                )}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-[400px] p-0 z-[9999]", className)} 
        align="start"
        side={side}
        sideOffset={8}
        container={portalContainer}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b px-3" data-cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="supplier-search-input"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          <div 
            ref={listRef}
            role="listbox" 
            aria-activedescendant={allOptions[highlightedIndex] ? `supplier-option-${highlightedIndex}` : undefined}
            className="p-1"
          >
            {allOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              allOptions.map((option, index) => {
                const isSelected = value === option.id;
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <button
                    type="button"
                    key={option.id || '__clear__'}
                    id={`supplier-option-${index}`}
                    ref={(el) => {
                      if (el) optionRefs.current.set(index, el);
                      else optionRefs.current.delete(index);
                    }}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      isHighlighted && "bg-gray-100 text-gray-900",
                      isSelected && "bg-orange-50",
                      !isHighlighted && !isSelected && "hover:bg-gray-100"
                    )}
                    data-testid={option.isClear ? "supplier-option-clear" : `supplier-option-${option.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.isClear ? (
                      <span className="text-gray-500 italic">{option.name}</span>
                    ) : (
                      <div className="flex flex-col text-left">
                        <span>{option.name}</span>
                        {option.code && (
                          <span className="text-xs text-gray-500">{option.code}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
