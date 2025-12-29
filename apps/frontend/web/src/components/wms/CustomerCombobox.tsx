import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, User, Building2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface Customer {
  id: string;
  code?: string;
  name: string;
  surname?: string;
  legalName?: string;
  vatNumber?: string;
  fiscalCode?: string;
  phone?: string;
  email?: string;
  customerType?: 'B2C' | 'B2B' | string;
  address?: string;
  city?: string;
  province?: string;
  cap?: string;
}

interface CustomerComboboxProps {
  customers: Customer[];
  value: string;
  onValueChange: (value: string) => void;
  customerTypeFilter?: 'B2C' | 'B2B' | 'all';
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

export function CustomerCombobox({
  customers,
  value,
  onValueChange,
  customerTypeFilter = 'all',
  placeholder = "Cerca cliente...",
  searchPlaceholder = "Nome, cognome, CF, telefono, email, P.IVA...",
  emptyMessage = "Nessun cliente trovato.",
  disabled = false,
  className,
  triggerClassName,
  required = false,
  clearable = false,
  clearLabel = "Nessun cliente",
  portalContainer,
  side = "bottom",
  "data-testid": testId,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const selectedCustomer = customers.find((c) => c.id === value);

  const filteredByType = useMemo(() => {
    if (customerTypeFilter === 'all') return customers;
    return customers.filter(c => c.customerType?.toUpperCase() === customerTypeFilter.toUpperCase());
  }, [customers, customerTypeFilter]);

  const allOptions = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    
    const filtered = searchLower
      ? filteredByType.filter((c) => {
          const fullName = `${c.name || ''} ${c.surname || ''}`.toLowerCase();
          return (
            fullName.includes(searchLower) ||
            c.name?.toLowerCase().includes(searchLower) ||
            c.surname?.toLowerCase().includes(searchLower) ||
            c.legalName?.toLowerCase().includes(searchLower) ||
            c.fiscalCode?.toLowerCase().includes(searchLower) ||
            c.vatNumber?.toLowerCase().includes(searchLower) ||
            c.phone?.replace(/\s/g, '').includes(searchLower.replace(/\s/g, '')) ||
            c.email?.toLowerCase().includes(searchLower) ||
            c.code?.toLowerCase().includes(searchLower)
          );
        })
      : filteredByType;
    
    if (clearable) {
      return [{ id: '', name: clearLabel, isClear: true } as Customer & { isClear: boolean }, 
              ...filtered.map(c => ({ ...c, isClear: false }))];
    }
    return filtered.map(c => ({ ...c, isClear: false }));
  }, [filteredByType, search, clearable, clearLabel]);

  const handleSelect = useCallback((customerId: string) => {
    onValueChange(customerId);
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

  const getDisplayName = (customer: Customer) => {
    if (customer.legalName) return customer.legalName;
    if (customer.surname) return `${customer.name} ${customer.surname}`;
    return customer.name;
  };

  const isB2B = (customer: Customer) => customer.customerType?.toUpperCase() === 'B2B';

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
            {selectedCustomer ? (
              <>
                {isB2B(selectedCustomer) ? (
                  <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
                ) : (
                  <User className="h-4 w-4 shrink-0 text-green-500" />
                )}
                <span className="truncate">
                  {getDisplayName(selectedCustomer)}
                  {selectedCustomer.code && (
                    <span className="ml-1 text-xs text-gray-500">
                      ({selectedCustomer.code})
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4 shrink-0 opacity-50" />
                <span>{placeholder}</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-[450px] p-0 z-[9999]", className)} 
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
            data-testid="customer-search-input"
          />
        </div>
        <ScrollArea className="max-h-[350px]">
          <div 
            ref={listRef}
            role="listbox" 
            aria-activedescendant={allOptions[highlightedIndex] ? `customer-option-${highlightedIndex}` : undefined}
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
                const isClear = 'isClear' in option && option.isClear;
                
                return (
                  <button
                    type="button"
                    key={option.id || '__clear__'}
                    id={`customer-option-${index}`}
                    ref={(el) => {
                      if (el) optionRefs.current.set(index, el);
                      else optionRefs.current.delete(index);
                    }}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-start rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                      isHighlighted && "bg-gray-100 text-gray-900",
                      isSelected && "bg-orange-50",
                      !isHighlighted && !isSelected && "hover:bg-gray-100"
                    )}
                    data-testid={isClear ? "customer-option-clear" : `customer-option-${option.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 mt-0.5 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {isClear ? (
                      <span className="text-gray-500 italic">{option.name}</span>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isB2B(option) ? (
                            <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
                          ) : (
                            <User className="h-4 w-4 shrink-0 text-green-500" />
                          )}
                          <span className="font-medium truncate">{getDisplayName(option)}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs shrink-0",
                              isB2B(option) ? "border-blue-200 text-blue-700 bg-blue-50" : "border-green-200 text-green-700 bg-green-50"
                            )}
                          >
                            {isB2B(option) ? 'Business' : 'Privato'}
                          </Badge>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                          {option.fiscalCode && (
                            <span className="truncate">CF: {option.fiscalCode}</span>
                          )}
                          {option.vatNumber && (
                            <span className="truncate">P.IVA: {option.vatNumber}</span>
                          )}
                          {option.phone && (
                            <span className="truncate">Tel: {option.phone}</span>
                          )}
                          {option.email && (
                            <span className="truncate">Email: {option.email}</span>
                          )}
                          {option.city && (
                            <span className="truncate col-span-2">
                              {option.address && `${option.address}, `}{option.city} {option.province && `(${option.province})`}
                            </span>
                          )}
                        </div>
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
