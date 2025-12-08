import { useState } from 'react';
import { CalendarIcon, Download, Filter, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FunnelAnalyticsFilters {
  funnelId: string | null;
  dateRange: DateRange | undefined;
  preset: string;
  storeIds: string[];
  segment: 'all' | 'b2b' | 'b2c';
  dataMode: 'realtime' | 'historical';
}

interface FunnelAnalyticsFilterBarProps {
  funnels: Array<{ id: string; name: string; color: string }>;
  filters: FunnelAnalyticsFilters;
  onFiltersChange: (filters: FunnelAnalyticsFilters) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

const datePresets = [
  { label: '7 giorni', value: '7days', days: 7 },
  { label: '30 giorni', value: '30days', days: 30 },
  { label: '90 giorni', value: '90days', days: 90 },
  { label: 'Anno corrente', value: 'ytd', days: 0 },
  { label: 'Personalizzato', value: 'custom', days: 0 },
];

export function FunnelAnalyticsFilterBar({
  funnels,
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading = false,
}: FunnelAnalyticsFilterBarProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handlePresetChange = (preset: string) => {
    const presetConfig = datePresets.find(p => p.value === preset);
    if (!presetConfig) return;

    let dateRange: DateRange | undefined;

    if (preset === 'ytd') {
      const now = new Date();
      dateRange = {
        from: new Date(now.getFullYear(), 0, 1),
        to: now,
      };
    } else if (preset === 'custom') {
      dateRange = filters.dateRange;
    } else if (presetConfig.days > 0) {
      dateRange = {
        from: subDays(new Date(), presetConfig.days),
        to: new Date(),
      };
    }

    onFiltersChange({
      ...filters,
      preset,
      dateRange,
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
      preset: 'custom',
    });
  };

  const selectedFunnel = funnels.find(f => f.id === filters.funnelId);

  return (
    <div className="windtre-glass-panel border border-white/20 rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Funnel Selector */}
        <div className="flex-1 min-w-[250px]">
          <Select
            value={filters.funnelId || undefined}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, funnelId: value })
            }
          >
            <SelectTrigger
              className="w-full bg-white/50 border-white/30"
              data-testid="select-funnel"
            >
              <div className="flex items-center gap-2">
                {selectedFunnel && (
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: selectedFunnel.color }}
                  />
                )}
                <SelectValue placeholder="Seleziona funnel da analizzare" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {funnels.map((funnel) => (
                <SelectItem key={funnel.id} value={funnel.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: funnel.color }}
                    />
                    <span>{funnel.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Preset Selector */}
        <div className="min-w-[150px]">
          <Select value={filters.preset} onValueChange={handlePresetChange}>
            <SelectTrigger
              className="bg-white/50 border-white/30"
              data-testid="select-date-preset"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {datePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Picker */}
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'min-w-[240px] justify-start text-left font-normal bg-white/50 border-white/30',
                !filters.dateRange && 'text-muted-foreground'
              )}
              data-testid="button-date-range"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, 'dd MMM yyyy')} -{' '}
                    {format(filters.dateRange.to, 'dd MMM yyyy')}
                  </>
                ) : (
                  format(filters.dateRange.from, 'dd MMM yyyy')
                )
              ) : (
                <span>Seleziona date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Segment Filter */}
        <div className="min-w-[130px]">
          <Select
            value={filters.segment}
            onValueChange={(value: 'all' | 'b2b' | 'b2c') =>
              onFiltersChange({ ...filters, segment: value })
            }
          >
            <SelectTrigger
              className="bg-white/50 border-white/30"
              data-testid="select-segment"
            >
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="b2b">Solo B2B</SelectItem>
              <SelectItem value="b2c">Solo B2C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Mode Toggle */}
        <div className="min-w-[140px]">
          <Select
            value={filters.dataMode}
            onValueChange={(value: 'realtime' | 'historical') =>
              onFiltersChange({ ...filters, dataMode: value })
            }
          >
            <SelectTrigger
              className="bg-white/50 border-white/30"
              data-testid="select-data-mode"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">🔴 Real-time</SelectItem>
              <SelectItem value="historical">📊 Historical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 ml-auto">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="bg-white/50 border-white/30"
              data-testid="button-refresh"
            >
              <RefreshCw
                className={cn('h-4 w-4', isLoading && 'animate-spin')}
              />
            </Button>
          )}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isLoading || !filters.funnelId}
              className="bg-white/50 border-white/30"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {filters.funnelId && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
          <span className="text-xs text-gray-600">Filtri attivi:</span>
          <Badge variant="secondary" className="text-xs">
            {selectedFunnel?.name}
          </Badge>
          {filters.segment !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filters.segment === 'b2b' ? 'Solo B2B' : 'Solo B2C'}
            </Badge>
          )}
          {filters.dateRange?.from && filters.dateRange?.to && (
            <Badge variant="secondary" className="text-xs">
              {format(filters.dateRange.from, 'dd/MM/yy')} -{' '}
              {format(filters.dateRange.to, 'dd/MM/yy')}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
