import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

// UI Components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { Store, Calendar as CalendarIcon, AlertTriangle, X, Filter } from 'lucide-react';

// ==================== TYPES ====================

export interface ShiftFiltersState {
  storeId: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

interface Props {
  onChange: (filters: ShiftFiltersState) => void;
}

// ==================== MAIN COMPONENT ====================

export default function ShiftFilters({ onChange }: Props) {
  // Local state for filters
  const [storeId, setStoreId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Fetch stores for dropdown (using real API with auth)
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores']
    // Uses default queryFn with proper auth headers from queryClient
  });

  // Calculate if date range is valid (max 7 days)
  const dateRangeValid = startDate && endDate 
    ? differenceInDays(endDate, startDate) <= 6 
    : true;

  const dateRangeDays = startDate && endDate 
    ? differenceInDays(endDate, startDate) + 1 
    : 0;

  // Emit filter changes to parent
  useEffect(() => {
    onChange({ storeId, startDate, endDate });
  }, [storeId, startDate, endDate, onChange]);

  // Clear all filters
  const clearFilters = () => {
    setStoreId(null);
    setStartDate(null);
    setEndDate(null);
  };

  // Quick date range presets
  const setQuickRange = (days: number) => {
    const start = new Date();
    const end = addDays(start, days - 1);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="sticky top-0 z-10 backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-lg">Filtri Globali</h3>
          </div>
          {(storeId || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-2" />
              Pulisci Filtri
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Store Select */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Punto Vendita *
            </Label>
            <Select
              value={storeId || ''}
              onValueChange={setStoreId}
              disabled={storesLoading}
            >
              <SelectTrigger data-testid="select-filter-store">
                <SelectValue placeholder="Seleziona punto vendita" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map((store: any) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.nome || store.name} - {store.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Data Inizio
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-start-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd MMM yyyy', { locale: it }) : 'Seleziona data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date) => setStartDate(date || null)}
                  locale={it}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Data Fine
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-end-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd MMM yyyy', { locale: it }) : 'Seleziona data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => setEndDate(date || null)}
                  locale={it}
                  disabled={(date) => {
                    if (!startDate) return false;
                    return differenceInDays(date, startDate) > 6 || differenceInDays(date, startDate) < 0;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Quick Range Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Range rapidi:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(1)}
            data-testid="button-quick-1day"
          >
            Oggi
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(7)}
            data-testid="button-quick-7days"
          >
            7 Giorni
          </Button>
        </div>

        {/* Status Row: Validation + Conflicts */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date Range Validation */}
          {startDate && endDate && !dateRangeValid && (
            <Alert variant="destructive" className="flex-1">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Intervallo troppo lungo: {dateRangeDays} giorni. Massimo 7 giorni consentiti.
              </AlertDescription>
            </Alert>
          )}

          {startDate && endDate && dateRangeValid && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {dateRangeDays} {dateRangeDays === 1 ? 'giorno' : 'giorni'} selezionati
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
