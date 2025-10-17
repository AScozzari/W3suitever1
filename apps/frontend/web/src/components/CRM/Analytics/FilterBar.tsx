/**
 * Filter Bar Component
 * 
 * Comprehensive filtering options for CRM Analytics Dashboard
 * Includes store selector, date range, campaigns, and more
 */

import { useState } from 'react';
import { CalendarIcon, Filter, RefreshCw, Download, Maximize2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StoreSelector } from './StoreSelector';

export interface AnalyticsFilters {
  storeIds: string[];
  dateRange: DateRange | undefined;
  campaignId?: string;
  pipelineId?: string;
  channelId?: string;
  preset?: string;
}

interface FilterBarProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onRefresh: () => void;
  onExport?: () => void;
  onToggleFullscreen?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Date range presets
const datePresets = [
  { label: 'Oggi', value: 'today', getDates: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Ultimi 7 giorni', value: '7days', getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Ultimi 30 giorni', value: '30days', getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Mese corrente', value: 'month', getDates: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Ultimo trimestre', value: 'quarter', getDates: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'Ultimo anno', value: 'year', getDates: () => ({ from: subDays(new Date(), 365), to: new Date() }) },
];

export function FilterBar({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  onToggleFullscreen,
  isLoading = false,
  className
}: FilterBarProps) {
  const [dateOpen, setDateOpen] = useState(false);

  const handleStoreChange = (storeIds: string[]) => {
    onFiltersChange({ ...filters, storeIds });
  };

  const handleDatePresetChange = (preset: string) => {
    const presetConfig = datePresets.find(p => p.value === preset);
    if (presetConfig) {
      const dates = presetConfig.getDates();
      onFiltersChange({ 
        ...filters, 
        dateRange: dates,
        preset
      });
      setDateOpen(false);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({ 
      ...filters, 
      dateRange: range,
      preset: undefined
    });
  };

  const formatDateRange = () => {
    if (!filters.dateRange) return "Seleziona periodo";
    
    const { from, to } = filters.dateRange;
    if (!from) return "Seleziona periodo";
    
    if (filters.preset) {
      const preset = datePresets.find(p => p.value === filters.preset);
      if (preset) return preset.label;
    }
    
    const fromStr = format(from, 'dd MMM', { locale: it });
    const toStr = to ? format(to, 'dd MMM yyyy', { locale: it }) : '';
    
    return to ? `${fromStr} - ${toStr}` : fromStr;
  };

  const clearFilters = () => {
    onFiltersChange({
      storeIds: [],
      dateRange: undefined,
      campaignId: undefined,
      pipelineId: undefined,
      channelId: undefined,
      preset: undefined
    });
  };

  const hasActiveFilters = filters.storeIds.length > 0 || 
    filters.dateRange || 
    filters.campaignId || 
    filters.pipelineId || 
    filters.channelId;

  return (
    <div className={cn(
      "flex flex-col gap-4 p-4",
      "bg-white/80 backdrop-blur-lg",
      "border border-[var(--brand-orange)]/10 rounded-xl",
      "shadow-sm",
      className
    )}>
      {/* Primary Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Store Selector */}
        <div className="flex-1 min-w-[250px]">
          <StoreSelector
            value={filters.storeIds}
            onChange={handleStoreChange}
            placeholder="Tutti gli store"
          />
        </div>

        {/* Date Range Picker */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[200px]",
                "bg-white/50 backdrop-blur-md",
                "border-[var(--brand-purple)]/20",
                "hover:bg-white/60",
                !filters.dateRange && "text-muted-foreground"
              )}
              data-testid="date-range-button"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-[var(--brand-purple)]" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              {/* Presets Sidebar */}
              <div className="border-r p-2 space-y-1">
                {datePresets.map(preset => (
                  <Button
                    key={preset.value}
                    variant={filters.preset === preset.value ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => handleDatePresetChange(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              
              {/* Calendar */}
              <div className="p-2">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.from}
                  selected={filters.dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                  locale={it}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Campaign Filter */}
        <Select 
          value={filters.campaignId || "all"} 
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            campaignId: value === "all" ? undefined : value 
          })}
        >
          <SelectTrigger className="w-[180px] bg-white/50 backdrop-blur-md border-[var(--brand-orange)]/20">
            <SelectValue placeholder="Tutte le campagne" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le campagne</SelectItem>
            <SelectItem value="black-friday-2024">Black Friday 2024</SelectItem>
            <SelectItem value="natale-2024">Natale 2024</SelectItem>
            <SelectItem value="summer-sale-2024">Summer Sale 2024</SelectItem>
          </SelectContent>
        </Select>

        {/* Channel Filter */}
        <Select 
          value={filters.channelId || "all"} 
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            channelId: value === "all" ? undefined : value 
          })}
        >
          <SelectTrigger className="w-[160px] bg-white/50 backdrop-blur-md border-[var(--brand-purple)]/20">
            <SelectValue placeholder="Tutti i canali" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i canali</SelectItem>
            <SelectItem value="google-ads">Google Ads</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="organic">Organico</SelectItem>
          </SelectContent>
        </Select>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <Filter className="mr-2 h-4 w-4" />
              Pulisci filtri
            </Button>
          )}

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              "hover:bg-[var(--brand-orange)]/10",
              isLoading && "animate-spin"
            )}
            data-testid="refresh-button"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {onExport && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onExport}
              className="hover:bg-[var(--brand-purple)]/10"
              data-testid="export-button"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="hover:bg-[var(--brand-orange)]/10"
              data-testid="fullscreen-button"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Filtri attivi:</span>
          {filters.storeIds.length > 0 && (
            <span className="px-2 py-1 bg-[var(--brand-orange)]/10 rounded-md">
              {filters.storeIds.length} store
            </span>
          )}
          {filters.dateRange && (
            <span className="px-2 py-1 bg-[var(--brand-purple)]/10 rounded-md">
              {formatDateRange()}
            </span>
          )}
          {filters.campaignId && (
            <span className="px-2 py-1 bg-[var(--brand-orange)]/10 rounded-md">
              Campagna filtrata
            </span>
          )}
          {filters.channelId && (
            <span className="px-2 py-1 bg-[var(--brand-purple)]/10 rounded-md">
              Canale filtrato
            </span>
          )}
        </div>
      )}
    </div>
  );
}