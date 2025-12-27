import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  "data-testid": testId,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === value);

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
      <PopoverContent className={cn("w-[400px] p-0", className)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {clearable && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange('');
                    setOpen(false);
                  }}
                  data-testid="supplier-option-clear"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-gray-500 italic">{clearLabel}</span>
                </CommandItem>
              )}
              {suppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={`${supplier.name} ${supplier.code || ""}`}
                  onSelect={() => {
                    onValueChange(supplier.id);
                    setOpen(false);
                  }}
                  data-testid={`supplier-option-${supplier.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === supplier.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{supplier.name}</span>
                    {supplier.code && (
                      <span className="text-xs text-gray-500">{supplier.code}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
