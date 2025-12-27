import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Building2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
  "data-testid": testId,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedSupplier = suppliers.find((s) => s.id === value);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const term = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.code && s.code.toLowerCase().includes(term))
    );
  }, [suppliers, search]);

  const handleSelect = (supplierId: string) => {
    onValueChange(supplierId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
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
        className={cn("w-[400px] p-0", className)} 
        align="start"
        container={portalContainer}
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="supplier-search-input"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {clearable && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 transition-colors",
                  !value && "bg-orange-50"
                )}
                data-testid="supplier-option-clear"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-gray-500 italic">{clearLabel}</span>
              </button>
            )}
            {filteredSuppliers.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <button
                  type="button"
                  key={supplier.id}
                  onClick={() => handleSelect(supplier.id)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 transition-colors",
                    value === supplier.id && "bg-orange-50"
                  )}
                  data-testid={`supplier-option-${supplier.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === supplier.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col text-left">
                    <span>{supplier.name}</span>
                    {supplier.code && (
                      <span className="text-xs text-gray-500">{supplier.code}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
