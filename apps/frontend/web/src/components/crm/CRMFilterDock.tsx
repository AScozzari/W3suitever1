import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Filter, X, RotateCcw } from 'lucide-react';

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
}

export function CRMFilterDock({ onFiltersChange, children }: CRMFilterDockProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<CRMFilters>({});

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length;

  const handleFilterChange = (key: keyof CRMFilters, value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onFiltersChange?.({});
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
        className="w-[400px] sm:w-[540px]"
        style={{ background: 'var(--glass-card-bg)' }}
      >
        <SheetHeader>
          <SheetTitle style={{ color: 'hsl(var(--brand-orange))' }}>
            Filtri CRM
          </SheetTitle>
          <SheetDescription>
            Filtra lead, deal e clienti per criteri specifici
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
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
