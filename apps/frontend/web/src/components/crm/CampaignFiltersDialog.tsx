import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, CalendarIcon, RotateCcw, Shield, Building } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export interface CampaignFilters {
  stores: string[];
  drivers: string[];
  status: string[]; // 'active', 'paused', 'completed', 'draft'
  brandSourceType: string[]; // 'tenant_only', 'brand_derived'
  budgetMin?: number;
  budgetMax?: number;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
}

interface CampaignFiltersDialogProps {
  open: boolean;
  onClose: () => void;
  filters: CampaignFilters;
  onApplyFilters: (filters: CampaignFilters) => void;
  defaultTab?: string;
}

export function CampaignFiltersDialog({ 
  open, 
  onClose, 
  filters, 
  onApplyFilters,
  defaultTab = 'base'
}: CampaignFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<CampaignFilters>(filters);
  const [storeSearch, setStoreSearch] = useState('');
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['/api/public/drivers'],
    enabled: open,
  });

  const filteredStores = stores.filter((store: any) => 
    store.name?.toLowerCase().includes(storeSearch.toLowerCase()) ||
    store.code?.toLowerCase().includes(storeSearch.toLowerCase())
  );

  // WindTre Driver Colors (8 drivers del sistema)
  const DRIVER_COLORS: Record<string, string> = {
    'FISSO': 'hsl(24, 100%, 52%)',
    'MOBILE': 'hsl(271, 56%, 46%)',
    'DEVICE': 'hsl(200, 70%, 50%)',
    'ACCESSORI': 'hsl(142, 76%, 36%)',
    'ASSICURAZIONE': 'hsl(45, 100%, 51%)',
    'PROTEZIONE': 'hsl(0, 84%, 60%)',
    'ENERGIA': 'hsl(280, 65%, 60%)',
    'CUSTOMER_BASE': 'hsl(220, 90%, 56%)',
  };

  const campaignStatuses = [
    { value: 'active', label: 'Attiva', color: 'hsl(142, 76%, 36%)' },
    { value: 'paused', label: 'In Pausa', color: 'hsl(45, 100%, 51%)' },
    { value: 'completed', label: 'Completata', color: 'hsl(220, 90%, 56%)' },
    { value: 'draft', label: 'Bozza', color: 'hsl(0, 0%, 60%)' },
  ];

  const brandSourceTypes = [
    { value: 'tenant_only', label: '🏢 Tenant Only', color: 'hsl(var(--brand-orange))' },
    { value: 'brand_derived', label: '🔗 Brand HQ', color: 'hsl(var(--brand-purple))' },
  ];

  const handleReset = () => {
    const resetFilters: CampaignFilters = {
      stores: [],
      drivers: [],
      status: [],
      brandSourceType: [],
      budgetMin: undefined,
      budgetMax: undefined,
      startDateFrom: undefined,
      startDateTo: undefined,
      endDateFrom: undefined,
      endDateTo: undefined,
    };
    setLocalFilters(resetFilters);
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const toggleStore = (storeId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      stores: prev.stores.includes(storeId)
        ? prev.stores.filter(id => id !== storeId)
        : [...prev.stores, storeId]
    }));
  };

  const toggleDriver = (driverId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      drivers: prev.drivers.includes(driverId)
        ? prev.drivers.filter(id => id !== driverId)
        : [...prev.drivers, driverId]
    }));
  };

  const toggleStatus = (status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const toggleBrandSourceType = (type: string) => {
    setLocalFilters(prev => ({
      ...prev,
      brandSourceType: prev.brandSourceType.includes(type)
        ? prev.brandSourceType.filter(t => t !== type)
        : [...prev.brandSourceType, type]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[85vh]"
        style={{
          background: 'white',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl" style={{ color: '#1f2937' }}>
            Filtri Avanzati Campagne
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            Applica filtri avanzati per affinare la ricerca delle campagne
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="base" data-testid="tab-base">Base</TabsTrigger>
            <TabsTrigger value="budget" data-testid="tab-budget">Budget & Date</TabsTrigger>
            <TabsTrigger value="tipo" data-testid="tab-tipo">Tipo & Origine</TabsTrigger>
          </TabsList>

          {/* TAB 1: FILTRI BASE */}
          <TabsContent value="base" className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {/* Store Multi-Select */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>Store</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                <Input
                  placeholder="Cerca store..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="pl-10"
                  style={{
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)',
                  }}
                  data-testid="input-search-stores"
                />
              </div>
              <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto" style={{ background: 'var(--glass-bg-light)', border: '1px solid var(--glass-card-border)' }}>
                {filteredStores.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nessuno store trovato</p>
                ) : (
                  <div className="space-y-2">
                    {filteredStores.map((store: any) => (
                      <div key={store.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={localFilters.stores.includes(store.id)}
                          onCheckedChange={() => toggleStore(store.id)}
                          data-testid={`checkbox-store-${store.id}`}
                        />
                        <label
                          htmlFor={`store-${store.id}`}
                          className="text-sm cursor-pointer flex-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {store.name} {store.code && `(${store.code})`}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Driver Multi-Select */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>Driver Target</Label>
              <div className="grid grid-cols-2 gap-2">
                {drivers.map((driver: any) => {
                  const isChecked = localFilters.drivers.includes(driver.id);
                  const driverColor = DRIVER_COLORS[driver.name] || 'hsl(var(--brand-orange))';
                  
                  return (
                    <div
                      key={driver.id}
                      className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50"
                      style={{
                        borderColor: isChecked ? driverColor : 'var(--glass-card-border)',
                        borderWidth: isChecked ? '2px' : '1px'
                      }}
                      onClick={() => toggleDriver(driver.id)}
                    >
                      <Checkbox
                        checked={isChecked}
                        style={{ borderColor: driverColor }}
                        data-testid={`checkbox-driver-${driver.name.toLowerCase()}`}
                      />
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: driverColor }}
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {driver.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Multi-Select */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>Stato Campagna</Label>
              <div className="grid grid-cols-2 gap-2">
                {campaignStatuses.map((status) => {
                  const isChecked = localFilters.status.includes(status.value);
                  
                  return (
                    <div
                      key={status.value}
                      className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50"
                      style={{
                        borderColor: isChecked ? status.color : 'var(--glass-card-border)',
                        borderWidth: isChecked ? '2px' : '1px'
                      }}
                      onClick={() => toggleStatus(status.value)}
                    >
                      <Checkbox
                        checked={isChecked}
                        style={{ borderColor: status.color }}
                        data-testid={`checkbox-status-${status.value}`}
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: BUDGET & DATE */}
          <TabsContent value="budget" className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {/* Budget Range */}
            <div className="space-y-3">
              <Label style={{ color: 'var(--text-primary)' }}>Range Budget (€)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Minimo</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={localFilters.budgetMin || ''}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      budgetMin: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    data-testid="input-budget-min"
                  />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Massimo</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={localFilters.budgetMax || ''}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      budgetMax: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    data-testid="input-budget-max"
                  />
                </div>
              </div>
            </div>

            {/* Start Date Range */}
            <div className="space-y-3">
              <Label style={{ color: 'var(--text-primary)' }}>Data Inizio Campagna</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Da</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-start-date-from"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.startDateFrom ? format(localFilters.startDateFrom, 'dd MMM yyyy', { locale: it }) : 'Seleziona'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.startDateFrom}
                        onSelect={(date) => setLocalFilters(prev => ({ ...prev, startDateFrom: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>A</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-start-date-to"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.startDateTo ? format(localFilters.startDateTo, 'dd MMM yyyy', { locale: it }) : 'Seleziona'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.startDateTo}
                        onSelect={(date) => setLocalFilters(prev => ({ ...prev, startDateTo: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* End Date Range */}
            <div className="space-y-3">
              <Label style={{ color: 'var(--text-primary)' }}>Data Fine Campagna</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Da</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-end-date-from"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.endDateFrom ? format(localFilters.endDateFrom, 'dd MMM yyyy', { locale: it }) : 'Seleziona'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.endDateFrom}
                        onSelect={(date) => setLocalFilters(prev => ({ ...prev, endDateFrom: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>A</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-end-date-to"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.endDateTo ? format(localFilters.endDateTo, 'dd MMM yyyy', { locale: it }) : 'Seleziona'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.endDateTo}
                        onSelect={(date) => setLocalFilters(prev => ({ ...prev, endDateTo: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: TIPO & ORIGINE */}
          <TabsContent value="tipo" className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {/* Brand Source Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Shield className="h-4 w-4" />
                Tipo Sorgente Campagna
              </Label>
              <p className="text-xs text-gray-500 mb-3">
                Filtra per origine: campagne create direttamente dal tenant o derivate dal Brand HQ
              </p>
              <div className="space-y-2">
                {brandSourceTypes.map((type) => {
                  const isChecked = localFilters.brandSourceType.includes(type.value);
                  
                  return (
                    <div
                      key={type.value}
                      className="flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-gray-50"
                      style={{
                        borderColor: isChecked ? type.color : 'var(--glass-card-border)',
                        borderWidth: isChecked ? '2px' : '1px',
                        background: isChecked ? 'var(--glass-bg-light)' : 'transparent'
                      }}
                      onClick={() => toggleBrandSourceType(type.value)}
                    >
                      <Checkbox
                        checked={isChecked}
                        style={{ borderColor: type.color }}
                        data-testid={`checkbox-brand-type-${type.value}`}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {type.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {type.value === 'tenant_only' 
                            ? 'Campagne create e gestite direttamente dal tenant'
                            : 'Campagne derivate da template Brand HQ'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Nota:</strong> Le campagne Brand HQ sono sincronizzate centralmente e potrebbero avere 
                restrizioni di modifica. Le campagne Tenant sono completamente personalizzabili.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            data-testid="button-reset-filters"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleApply}
            style={{ background: 'hsl(var(--brand-orange))' }}
            className="text-white flex-1"
            data-testid="button-apply-filters"
          >
            Applica Filtri
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
