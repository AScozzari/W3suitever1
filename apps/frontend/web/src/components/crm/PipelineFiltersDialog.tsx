import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export interface PipelineFilters {
  stores: string[];
  drivers: string[];
  stato: 'attiva' | 'non_attiva' | 'tutte';
  valoreMin?: number;
  valoreMax?: number;
  conversionMin?: number;
  conversionMax?: number;
  dealsMin?: number;
  dealsMax?: number;
  avgDealMin?: number;
  avgDealMax?: number;
  dataCreazioneDa?: Date;
  dataCreazioneA?: Date;
  dataAggiornamentoDa?: Date;
  dataAggiornamentoA?: Date;
  ownerId?: string;
  teamId?: string;
}

interface PipelineFiltersDialogProps {
  open: boolean;
  onClose: () => void;
  filters: PipelineFilters;
  onApplyFilters: (filters: PipelineFilters) => void;
  defaultTab?: string;
}

export function PipelineFiltersDialog({ 
  open, 
  onClose, 
  filters, 
  onApplyFilters,
  defaultTab = 'base'
}: PipelineFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<PipelineFilters>(filters);
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

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const filteredStores = stores.filter((store: any) => 
    store.name?.toLowerCase().includes(storeSearch.toLowerCase()) ||
    store.code?.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const drivers = [
    { value: 'FISSO', label: 'FISSO' },
    { value: 'MOBILE', label: 'MOBILE' },
    { value: 'DEVICE', label: 'DEVICE' },
    { value: 'ACCESSORI', label: 'ACCESSORI' },
    { value: 'FIBRA', label: 'FIBRA' },
  ];

  const handleReset = () => {
    const resetFilters: PipelineFilters = {
      stores: [],
      drivers: [],
      stato: 'tutte',
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

  const toggleDriver = (driver: string) => {
    setLocalFilters(prev => ({
      ...prev,
      drivers: prev.drivers.includes(driver)
        ? prev.drivers.filter(d => d !== driver)
        : [...prev.drivers, driver]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[85vh]"
        style={{
          background: 'var(--glass-card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-card-border)',
          boxShadow: 'var(--shadow-glass-lg)'
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>
            Filtri Avanzati Pipeline
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--text-secondary)' }}>
            Applica filtri avanzati per affinare la ricerca delle pipeline
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="base" data-testid="tab-base">Base</TabsTrigger>
            <TabsTrigger value="metriche" data-testid="tab-metriche">Metriche</TabsTrigger>
            <TabsTrigger value="temporali" data-testid="tab-temporali">Temporali</TabsTrigger>
            <TabsTrigger value="organizzazione" data-testid="tab-organizzazione">Organizzazione</TabsTrigger>
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
                        <Label
                          htmlFor={`store-${store.id}`}
                          className="text-sm cursor-pointer"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {store.name} {store.code ? `(${store.code})` : ''}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Driver Multi-Select */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>Driver</Label>
              <div className="border rounded-lg p-3 space-y-2" style={{ background: 'var(--glass-bg-light)', border: '1px solid var(--glass-card-border)' }}>
                {drivers.map((driver) => (
                  <div key={driver.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`driver-${driver.value}`}
                      checked={localFilters.drivers.includes(driver.value)}
                      onCheckedChange={() => toggleDriver(driver.value)}
                      data-testid={`checkbox-driver-${driver.value.toLowerCase()}`}
                    />
                    <Label
                      htmlFor={`driver-${driver.value}`}
                      className="text-sm cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {driver.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Stato Toggle */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>Stato</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={localFilters.stato === 'tutte' ? 'default' : 'outline'}
                  onClick={() => setLocalFilters(prev => ({ ...prev, stato: 'tutte' }))}
                  className="flex-1"
                  style={localFilters.stato === 'tutte' ? { background: 'hsl(var(--brand-orange))' } : {}}
                  data-testid="button-stato-tutte"
                >
                  Tutte
                </Button>
                <Button
                  type="button"
                  variant={localFilters.stato === 'attiva' ? 'default' : 'outline'}
                  onClick={() => setLocalFilters(prev => ({ ...prev, stato: 'attiva' }))}
                  className="flex-1"
                  style={localFilters.stato === 'attiva' ? { background: 'hsl(var(--brand-orange))' } : {}}
                  data-testid="button-stato-attiva"
                >
                  Attiva
                </Button>
                <Button
                  type="button"
                  variant={localFilters.stato === 'non_attiva' ? 'default' : 'outline'}
                  onClick={() => setLocalFilters(prev => ({ ...prev, stato: 'non_attiva' }))}
                  className="flex-1"
                  style={localFilters.stato === 'non_attiva' ? { background: 'hsl(var(--brand-orange))' } : {}}
                  data-testid="button-stato-non-attiva"
                >
                  Non Attiva
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: METRICHE */}
          <TabsContent value="metriche" className="space-y-6 overflow-y-auto max-h-[400px] pr-2">
            {/* Valore Pipeline */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>
                Valore Pipeline: €{((localFilters.valoreMin || 0) / 1000000).toFixed(1)}M - €{((localFilters.valoreMax || 10000000) / 1000000).toFixed(1)}M
              </Label>
              <Slider
                min={0}
                max={10000000}
                step={100000}
                value={[localFilters.valoreMin || 0, localFilters.valoreMax || 10000000]}
                onValueChange={([min, max]) => setLocalFilters(prev => ({ ...prev, valoreMin: min, valoreMax: max }))}
                className="mt-2"
                data-testid="slider-valore-pipeline"
              />
            </div>

            {/* Conversion Rate */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>
                Conversion Rate: {localFilters.conversionMin || 0}% - {localFilters.conversionMax || 100}%
              </Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[localFilters.conversionMin || 0, localFilters.conversionMax || 100]}
                onValueChange={([min, max]) => setLocalFilters(prev => ({ ...prev, conversionMin: min, conversionMax: max }))}
                className="mt-2"
                data-testid="slider-conversion-rate"
              />
            </div>

            {/* Deal Attivi */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>
                Deal Attivi: {localFilters.dealsMin || 0} - {localFilters.dealsMax || 100}
              </Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[localFilters.dealsMin || 0, localFilters.dealsMax || 100]}
                onValueChange={([min, max]) => setLocalFilters(prev => ({ ...prev, dealsMin: min, dealsMax: max }))}
                className="mt-2"
                data-testid="slider-deals-attivi"
              />
            </div>

            {/* Avg Deal Value */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>
                Avg Deal Value: €{((localFilters.avgDealMin || 0) / 1000).toFixed(0)}k - €{((localFilters.avgDealMax || 500000) / 1000).toFixed(0)}k
              </Label>
              <Slider
                min={0}
                max={500000}
                step={10000}
                value={[localFilters.avgDealMin || 0, localFilters.avgDealMax || 500000]}
                onValueChange={([min, max]) => setLocalFilters(prev => ({ ...prev, avgDealMin: min, avgDealMax: max }))}
                className="mt-2"
                data-testid="slider-avg-deal-value"
              />
            </div>
          </TabsContent>

          {/* TAB 3: TEMPORALI */}
          <TabsContent value="temporali" className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {/* Data Creazione */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>Data Creazione</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal"
                      data-testid="button-data-creazione-da"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dataCreazioneDa ? format(localFilters.dataCreazioneDa, 'dd/MM/yyyy') : 'Da...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dataCreazioneDa}
                      onSelect={(date) => setLocalFilters(prev => ({ ...prev, dataCreazioneDa: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal"
                      data-testid="button-data-creazione-a"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dataCreazioneA ? format(localFilters.dataCreazioneA, 'dd/MM/yyyy') : 'A...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dataCreazioneA}
                      onSelect={(date) => setLocalFilters(prev => ({ ...prev, dataCreazioneA: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Ultimo Aggiornamento */}
            <div className="space-y-2">
              <Label style={{ color: 'var(--text-primary)' }}>Ultimo Aggiornamento</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal"
                      data-testid="button-data-aggiornamento-da"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dataAggiornamentoDa ? format(localFilters.dataAggiornamentoDa, 'dd/MM/yyyy') : 'Da...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dataAggiornamentoDa}
                      onSelect={(date) => setLocalFilters(prev => ({ ...prev, dataAggiornamentoDa: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal"
                      data-testid="button-data-aggiornamento-a"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dataAggiornamentoA ? format(localFilters.dataAggiornamentoA, 'dd/MM/yyyy') : 'A...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dataAggiornamentoA}
                      onSelect={(date) => setLocalFilters(prev => ({ ...prev, dataAggiornamentoA: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: ORGANIZZAZIONE */}
          <TabsContent value="organizzazione" className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {/* Responsabile/Owner */}
            <div className="space-y-2">
              <Label htmlFor="owner-select" style={{ color: 'var(--text-primary)' }}>Responsabile/Owner</Label>
              <Select
                value={localFilters.ownerId || ''}
                onValueChange={(value) => setLocalFilters(prev => ({ ...prev, ownerId: value || undefined }))}
              >
                <SelectTrigger
                  id="owner-select"
                  style={{
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)',
                  }}
                  data-testid="select-owner"
                >
                  <SelectValue placeholder="Seleziona responsabile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutti</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team */}
            <div className="space-y-2">
              <Label htmlFor="team-select" style={{ color: 'var(--text-primary)' }}>Team</Label>
              <Select
                value={localFilters.teamId || ''}
                onValueChange={(value) => setLocalFilters(prev => ({ ...prev, teamId: value || undefined }))}
              >
                <SelectTrigger
                  id="team-select"
                  style={{
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)',
                  }}
                  data-testid="select-team"
                >
                  <SelectValue placeholder="Seleziona team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutti i team</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            data-testid="button-reset-filters"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Tutto
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            data-testid="button-cancel-filters"
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            style={{ background: '#FF6900' }}
            className="text-white"
            data-testid="button-apply-filters"
          >
            Applica Filtri
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
