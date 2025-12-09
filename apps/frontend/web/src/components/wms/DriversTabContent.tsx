import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Zap, Eye, Pencil, Trash2, RefreshCw, AlertCircle, Lock, Building2, Package
} from 'lucide-react';

interface Driver {
  id: string;
  code: string;
  name: string;
  description?: string;
  allowedProductTypes: string[];
  isActive: boolean;
  source: 'brand' | 'tenant';
  brandDriverId?: string;
  isBrandSynced?: boolean;
}

const PRODUCT_TYPES = [
  { value: 'PHYSICAL', label: 'Fisico', description: 'Prodotti tangibili con gestione magazzino' },
  { value: 'VIRTUAL', label: 'Virtuale', description: 'Prodotti digitali senza gestione fisica' },
  { value: 'CANVAS', label: 'Canvas', description: 'Prodotti configurabili/bundle' },
  { value: 'SERVICE', label: 'Servizio', description: 'Servizi senza gestione inventario' },
];

export default function DriversTabContent() {
  const { toast } = useToast();
  const [driverModal, setDriverModal] = useState<{ open: boolean; mode: 'create' | 'edit' | 'view'; data: Driver | null }>({ 
    open: false, 
    mode: 'create', 
    data: null 
  });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    allowedProductTypes: [] as string[],
    isActive: true,
  });

  const { data: drivers = [], isLoading, isError, error, refetch } = useQuery<Driver[]>({
    queryKey: ['/api/drivers', { includeInactive: 'true' }],
  });

  const brandDrivers = drivers.filter(d => d.source === 'brand');
  const tenantDrivers = drivers.filter(d => d.source === 'tenant');

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/drivers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({ title: 'Driver creato', description: 'Il driver è stato creato con successo' });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile creare il driver', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest(`/api/drivers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({ title: 'Driver aggiornato', description: 'Il driver è stato aggiornato con successo' });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile aggiornare il driver', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/drivers/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({ title: 'Driver eliminato', description: 'Il driver è stato eliminato con successo' });
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile eliminare il driver', variant: 'destructive' });
    },
  });

  const handleOpenCreate = () => {
    setFormData({ code: '', name: '', description: '', allowedProductTypes: [], isActive: true });
    setDriverModal({ open: true, mode: 'create', data: null });
  };

  const handleOpenEdit = (driver: Driver) => {
    setFormData({
      code: driver.code,
      name: driver.name,
      description: driver.description || '',
      allowedProductTypes: driver.allowedProductTypes || [],
      isActive: driver.isActive,
    });
    setDriverModal({ open: true, mode: 'edit', data: driver });
  };

  const handleOpenView = (driver: Driver) => {
    setFormData({
      code: driver.code,
      name: driver.name,
      description: driver.description || '',
      allowedProductTypes: driver.allowedProductTypes || [],
      isActive: driver.isActive,
    });
    setDriverModal({ open: true, mode: 'view', data: driver });
  };

  const handleCloseModal = () => {
    setDriverModal({ open: false, mode: 'create', data: null });
    setFormData({ code: '', name: '', description: '', allowedProductTypes: [], isActive: true });
  };

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({ title: 'Errore', description: 'Codice e nome sono obbligatori', variant: 'destructive' });
      return;
    }
    if (formData.allowedProductTypes.length === 0) {
      toast({ title: 'Errore', description: 'Seleziona almeno un tipo prodotto', variant: 'destructive' });
      return;
    }

    if (driverModal.mode === 'create') {
      createMutation.mutate(formData);
    } else if (driverModal.mode === 'edit' && driverModal.data) {
      updateMutation.mutate({ id: driverModal.data.id, data: formData });
    }
  };

  const handleDelete = (driver: Driver) => {
    if (window.confirm(`Sei sicuro di voler eliminare il driver "${driver.name}"?`)) {
      deleteMutation.mutate(driver.id);
    }
  };

  const toggleProductType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      allowedProductTypes: prev.allowedProductTypes.includes(type)
        ? prev.allowedProductTypes.filter(t => t !== type)
        : [...prev.allowedProductTypes, type]
    }));
  };

  const renderDriverTable = (driversList: Driver[], isBrandSection: boolean) => (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      border: '1px solid #e5e7eb'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice</th>
            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome</th>
            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Tipi Prodotto</th>
            <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
            <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {driversList.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                {isBrandSection ? 'Nessun driver brand disponibile' : 'Nessun driver personalizzato. Clicca "Nuovo Driver" per crearne uno.'}
              </td>
            </tr>
          ) : (
            driversList.map((driver, index) => (
              <tr
                key={driver.id}
                data-testid={`row-driver-${driver.id}`}
                style={{
                  background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                    {driver.code}
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>{driver.name}</td>
                <td style={{ padding: '16px' }}>
                  <div className="flex flex-wrap gap-1">
                    {(driver.allowedProductTypes || []).map(type => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {PRODUCT_TYPES.find(pt => pt.value === type)?.label || type}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <Badge variant={driver.isActive ? 'default' : 'secondary'} className={driver.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {driver.isActive ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </td>
                <td style={{ padding: '16px' }}>
                  <div className="flex justify-center gap-2">
                    {isBrandSection ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenView(driver)}
                        data-testid={`button-view-driver-${driver.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(driver)}
                          data-testid={`button-edit-driver-${driver.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(driver)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-driver-${driver.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        <p className="mt-4 text-gray-600">Caricamento drivers...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
        <p className="mt-4 text-red-600">Errore nel caricamento dei drivers</p>
        <p className="text-sm text-gray-500">{error?.message}</p>
        <Button onClick={() => refetch()} className="mt-4" variant="outline">
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="drivers-content">
      {/* Brand Drivers Section (Read-only) */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Driver Brand
              <Lock className="h-4 w-4 text-gray-400" />
            </h3>
            <p className="text-sm text-gray-500">Driver sincronizzati dal brand (sola lettura)</p>
          </div>
          <Badge variant="secondary" className="ml-auto">{brandDrivers.length} driver</Badge>
        </div>
        {renderDriverTable(brandDrivers, true)}
      </div>

      {/* Tenant Drivers Section (CRUD) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Driver Personalizzati</h3>
              <p className="text-sm text-gray-500">Driver creati dal tuo negozio</p>
            </div>
            <Badge variant="secondary">{tenantDrivers.length} driver</Badge>
          </div>
          <Button
            onClick={handleOpenCreate}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
            }}
            className="gap-2"
            data-testid="button-create-driver"
          >
            <Plus className="h-4 w-4" />
            Nuovo Driver
          </Button>
        </div>
        {renderDriverTable(tenantDrivers, false)}
      </div>

      {/* Driver Modal */}
      <Dialog open={driverModal.open} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg" style={{ background: 'white' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
              {driverModal.mode === 'create' ? 'Nuovo Driver' : driverModal.mode === 'edit' ? 'Modifica Driver' : 'Dettagli Driver'}
              {driverModal.mode === 'view' && driverModal.data?.source === 'brand' && (
                <Badge variant="secondary" className="ml-2">
                  <Lock className="h-3 w-3 mr-1" /> Brand
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {driverModal.mode === 'view' 
                ? 'Visualizza i dettagli del driver brand' 
                : driverModal.mode === 'edit' 
                  ? 'Modifica le informazioni del driver' 
                  : 'Compila i campi per creare un nuovo driver'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Codice *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="es. MOBILE"
                  disabled={driverModal.mode === 'view'}
                  data-testid="input-driver-code"
                />
              </div>
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="es. Mobile"
                  disabled={driverModal.mode === 'view'}
                  data-testid="input-driver-name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrizione opzionale"
                disabled={driverModal.mode === 'view'}
                data-testid="input-driver-description"
              />
            </div>

            <div>
              <Label className="mb-3 block">Tipi Prodotto Consentiti *</Label>
              <div className="grid grid-cols-2 gap-3">
                {PRODUCT_TYPES.map(type => (
                  <div
                    key={type.value}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.allowedProductTypes.includes(type.value)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${driverModal.mode === 'view' ? 'cursor-default' : ''}`}
                    onClick={() => driverModal.mode !== 'view' && toggleProductType(type.value)}
                    data-testid={`checkbox-product-type-${type.value}`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.allowedProductTypes.includes(type.value)}
                        disabled={driverModal.mode === 'view'}
                      />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">{type.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <Label htmlFor="isActive">Driver Attivo</Label>
                <p className="text-xs text-gray-500">I driver inattivi non saranno disponibili per la selezione</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                disabled={driverModal.mode === 'view'}
                data-testid="switch-driver-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} data-testid="button-cancel-driver">
              {driverModal.mode === 'view' ? 'Chiudi' : 'Annulla'}
            </Button>
            {driverModal.mode !== 'view' && (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ background: 'hsl(var(--brand-orange))' }}
                data-testid="button-save-driver"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
