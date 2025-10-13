import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, RotateCcw, Calendar as CalendarIcon, Store } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface CRMFilterDockProps {
  onFiltersChange?: (filters: CRMFilters) => void;
  children?: React.ReactNode;
}

export interface CRMFilters {
  status?: string;
  driver?: string;
  channel?: string;
  owner?: string;
  pipeline?: string;
  stage?: string;
  storeId?: string;
  dateRange?: string;
  dateFrom?: Date;
  dateTo?: Date;
  leadScoreMin?: number;
  leadScoreMax?: number;
  lifecycleStage?: string;
}

export function CRMFilterDock({ onFiltersChange, children }: CRMFilterDockProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<CRMFilters>({
    leadScoreMin: 0,
    leadScoreMax: 100
  });
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Fetch stores for store filter
  const { data: storesResponse } = useQuery<any[]>({
    queryKey: ['/api/stores'],
  });

  const stores = storesResponse || [];

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (!value || value === 'all') return false;
    if (key === 'leadScoreMin' && value === 0) return false;
    if (key === 'leadScoreMax' && value === 100) return false;
    return true;
  }).length;

  const handleFilterChange = (key: keyof CRMFilters, value: any) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleDateRangeChange = (range: string) => {
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined = today;

    switch (range) {
      case 'today':
        from = today;
        break;
      case '7days':
        from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        // User will pick dates manually
        from = dateFrom;
        to = dateTo;
        break;
      default:
        from = undefined;
        to = undefined;
    }

    setDateFrom(from);
    setDateTo(to);
    
    const newFilters = { 
      ...filters, 
      dateRange: range === 'all' ? undefined : range,
      dateFrom: from,
      dateTo: to
    };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleLeadScoreChange = (values: number[]) => {
    const newFilters = { 
      ...filters, 
      leadScoreMin: values[0],
      leadScoreMax: values[1]
    };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      leadScoreMin: 0,
      leadScoreMax: 100
    };
    setFilters(resetFilters);
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange?.(resetFilters);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button 
            variant="outline" 
            size="sm"
            className="relative"
            data-testid="filter-dock-trigger"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtri
            {activeFiltersCount > 0 && (
              <Badge 
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                style={{ background: 'hsl(var(--brand-orange))' }}
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[540px] overflow-y-auto"
        style={{ background: 'var(--glass-card-bg)' }}
      >
        <SheetHeader>
          <SheetTitle style={{ color: 'hsl(var(--brand-orange))' }}>
            Filtri CRM Avanzati
          </SheetTitle>
          <SheetDescription>
            Filtra lead con criteri enterprise (Store, Periodo, Score, Lifecycle)
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-20">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Stato</Label>
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(v) => handleFilterChange('status', v)}
            >
              <SelectTrigger data-testid="filter-status">
                <SelectValue placeholder="Tutti gli stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="new">Nuovo</SelectItem>
                <SelectItem value="qualified">Qualificato</SelectItem>
                <SelectItem value="contacted">Contattato</SelectItem>
                <SelectItem value="converted">Convertito</SelectItem>
                <SelectItem value="lost">Perso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* 🏪 STORE FILTER - Multi-PDV */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Store className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
              Store di Origine
            </Label>
            <Select 
              value={filters.storeId || 'all'} 
              onValueChange={(v) => handleFilterChange('storeId', v)}
            >
              <SelectTrigger data-testid="filter-store">
                <SelectValue placeholder="Tutti i PDV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i PDV</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} ({store.city || 'N/A'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Filtra per PDV che ha generato il lead
            </p>
          </div>

          <Separator />

          {/* 📅 PERIODO FILTER - Date Range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
              Periodo
            </Label>
            <Select 
              value={filters.dateRange || 'all'} 
              onValueChange={handleDateRangeChange}
            >
              <SelectTrigger data-testid="filter-date-range">
                <SelectValue placeholder="Tutto il periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutto il periodo</SelectItem>
                <SelectItem value="today">Oggi</SelectItem>
                <SelectItem value="7days">Ultimi 7 giorni</SelectItem>
                <SelectItem value="30days">Ultimo mese</SelectItem>
                <SelectItem value="custom">Personalizzato</SelectItem>
              </SelectContent>
            </Select>

            {filters.dateRange === 'custom' && (
              <div className="flex gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1 justify-start text-left font-normal"
                      data-testid="date-from-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: it }) : 'Da'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date);
                        handleFilterChange('dateFrom', date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1 justify-start text-left font-normal"
                      data-testid="date-to-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: it }) : 'A'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date);
                        handleFilterChange('dateTo', date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <Separator />

          {/* 📊 LEAD SCORE FILTER - Range Slider */}
          <div className="space-y-2">
            <Label>Lead Score</Label>
            <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <span>{filters.leadScoreMin || 0}</span>
              <span>{filters.leadScoreMax || 100}</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[filters.leadScoreMin || 0, filters.leadScoreMax || 100]}
              onValueChange={handleLeadScoreChange}
              className="mt-2"
              data-testid="filter-lead-score"
            />
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Filtra per punteggio lead (0-100)
            </p>
          </div>

          <Separator />

          {/* 🎯 LIFECYCLE STAGE FILTER */}
          <div className="space-y-2">
            <Label>Lifecycle Stage</Label>
            <Select 
              value={filters.lifecycleStage || 'all'} 
              onValueChange={(v) => handleFilterChange('lifecycleStage', v)}
            >
              <SelectTrigger data-testid="filter-lifecycle">
                <SelectValue placeholder="Tutti gli stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stage</SelectItem>
                <SelectItem value="Subscriber">Subscriber</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="MQL">MQL (Marketing Qualified)</SelectItem>
                <SelectItem value="SQL">SQL (Sales Qualified)</SelectItem>
                <SelectItem value="Opportunity">Opportunity</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Driver Filter */}
          <div className="space-y-2">
            <Label>Driver Prodotto</Label>
            <Select 
              value={filters.driver || 'all'} 
              onValueChange={(v) => handleFilterChange('driver', v)}
            >
              <SelectTrigger data-testid="filter-driver">
                <SelectValue placeholder="Tutti i driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i driver</SelectItem>
                <SelectItem value="FISSO">FISSO (Fibra/ADSL)</SelectItem>
                <SelectItem value="MOBILE">MOBILE (5G/4G)</SelectItem>
                <SelectItem value="DEVICE">DEVICE (Smartphone)</SelectItem>
                <SelectItem value="ACCESSORI">ACCESSORI (Modem/Cuffie)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Channel Filter */}
          <div className="space-y-2">
            <Label>Canale</Label>
            <Select 
              value={filters.channel || 'all'} 
              onValueChange={(v) => handleFilterChange('channel', v)}
            >
              <SelectTrigger data-testid="filter-channel">
                <SelectValue placeholder="Tutti i canali" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i canali</SelectItem>
                <SelectItem value="WALK_IN">Walk-in (Negozio)</SelectItem>
                <SelectItem value="WEB">Web/Online</SelectItem>
                <SelectItem value="PHONE">Telefono</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SOCIAL">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Pipeline Filter */}
          <div className="space-y-2">
            <Label>Pipeline</Label>
            <Select 
              value={filters.pipeline || 'all'} 
              onValueChange={(v) => handleFilterChange('pipeline', v)}
            >
              <SelectTrigger data-testid="filter-pipeline">
                <SelectValue placeholder="Tutte le pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le pipeline</SelectItem>
                <SelectItem value="1">Pipeline Fisso</SelectItem>
                <SelectItem value="2">Pipeline Mobile</SelectItem>
                <SelectItem value="3">Pipeline Device</SelectItem>
                <SelectItem value="4">Pipeline Accessori</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Stage Filter */}
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select 
              value={filters.stage || 'all'} 
              onValueChange={(v) => handleFilterChange('stage', v)}
            >
              <SelectTrigger data-testid="filter-stage">
                <SelectValue placeholder="Tutti gli stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stage</SelectItem>
                <SelectItem value="lead">Lead (Nuovo)</SelectItem>
                <SelectItem value="qualification">Qualificazione</SelectItem>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="negotiation">Negoziazione</SelectItem>
                <SelectItem value="closing">Chiusura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Owner Filter - RBAC: mostra solo utente corrente */}
          <div className="space-y-2">
            <Label>Proprietario</Label>
            <Select 
              value={filters.owner || 'me'} 
              onValueChange={(v) => handleFilterChange('owner', v)}
              disabled
            >
              <SelectTrigger data-testid="filter-owner">
                <SelectValue placeholder="Le mie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Le mie (RBAC locked)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Per policy RBAC vedi solo le tue lead/deal proprietarie
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 border-t p-4 flex items-center gap-2"
          style={{ 
            background: 'var(--glass-card-bg)',
            borderColor: 'var(--glass-card-border)'
          }}
        >
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            data-testid="filter-reset"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={() => setOpen(false)}
            className="flex-1"
            style={{ background: 'hsl(var(--brand-orange))' }}
            data-testid="filter-apply"
          >
            Applica Filtri
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
