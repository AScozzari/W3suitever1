import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronRight, Calendar as CalendarIcon, Filter, Save } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface CRMScopeBarProps {
  onScopeChange?: (scope: {
    storeId: string;
    campaignId: string;
    dateRange: { from: Date; to: Date };
  }) => void;
  className?: string;
}

export function CRMScopeBar({ onScopeChange, className = '' }: CRMScopeBarProps) {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  // Fetch retail stores (no warehouses/offices)
  const { data: stores } = useQuery({
    queryKey: ['/api/stores'],
    select: (data: any[]) => data.filter(store => 
      store.type === 'RETAIL' || store.type === 'STORE'
    ),
    initialData: [
      { id: 'all', name: 'Tutti gli store', type: 'RETAIL' },
      { id: '1', name: 'WindTre Store Milano Centro', type: 'RETAIL' },
      { id: '2', name: 'WindTre Store Roma Termini', type: 'RETAIL' }
    ]
  });

  // Fetch campaigns for selected store
  const { data: campaigns } = useQuery({
    queryKey: ['/api/crm/campaigns', selectedStore],
    initialData: [
      { id: 'all', name: 'Tutte le campagne' },
      { id: '1', name: 'Black Friday 2024', status: 'active' },
      { id: '2', name: 'Super Fibra Q1', status: 'active' },
      { id: '3', name: 'Mobile 5G Promo', status: 'active' }
    ]
  });

  const handleScopeChange = () => {
    onScopeChange?.({
      storeId: selectedStore,
      campaignId: selectedCampaign,
      dateRange
    });
  };

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
      <div className="flex items-center gap-2">
        {/* Store Selector */}
        <Select value={selectedStore} onValueChange={(value) => {
          setSelectedStore(value);
          handleScopeChange();
        }}>
          <SelectTrigger 
            className="w-[280px]"
            style={{ 
              background: 'var(--glass-bg-light)',
              borderColor: 'var(--glass-card-border)'
            }}
            data-testid="scope-store-select"
          >
            <SelectValue placeholder="Seleziona store" />
          </SelectTrigger>
          <SelectContent>
            {stores?.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />

        {/* Campaign Selector */}
        <Select value={selectedCampaign} onValueChange={(value) => {
          setSelectedCampaign(value);
          handleScopeChange();
        }}>
          <SelectTrigger 
            className="w-[240px]"
            style={{ 
              background: 'var(--glass-bg-light)',
              borderColor: 'var(--glass-card-border)'
            }}
            data-testid="scope-campaign-select"
          >
            <SelectValue placeholder="Seleziona campagna" />
          </SelectTrigger>
          <SelectContent>
            {campaigns?.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[280px] justify-start text-left font-normal"
              style={{ 
                background: 'var(--glass-bg-light)',
                borderColor: 'var(--glass-card-border)'
              }}
              data-testid="scope-daterange-picker"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd MMM', { locale: it })} -{' '}
                  {format(dateRange.to, 'dd MMM yyyy', { locale: it })}
                </>
              ) : (
                <span>Seleziona periodo</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                  handleScopeChange();
                }
              }}
              locale={it}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          {/* Save View Button */}
          <Button
            variant="ghost"
            size="sm"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="scope-save-view"
          >
            <Save className="mr-2 h-4 w-4" />
            Salva Vista
          </Button>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            style={{ 
              background: 'var(--glass-bg-light)',
              borderColor: 'var(--glass-card-border)'
            }}
            data-testid="scope-open-filters"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtri
          </Button>
        </div>
      </div>
    </div>
  );
}
