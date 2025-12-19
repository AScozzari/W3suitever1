import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Zap, Eye, Pencil, Trash2, RefreshCw, AlertCircle, Lock, Building2, Package,
  ChevronDown, ChevronRight, FolderTree, Tag, Radio
} from 'lucide-react';

interface Operator {
  id: string;
  code: string;
  name: string;
  colorHex?: string;
  isActive: boolean;
}

interface Driver {
  id: string;
  code: string;
  name: string;
  description?: string;
  allowedProductTypes: string[];
  operatorId?: string;
  isActive: boolean;
  source: 'brand' | 'tenant';
  brandDriverId?: string;
  isBrandSynced?: boolean;
}

interface Typology {
  id: string;
  name: string;
  description?: string;
  order: number;
  source: 'brand' | 'tenant';
}

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  productType: string;
  order: number;
  source: 'brand' | 'tenant';
  typologies: Typology[];
}

interface DriverHierarchy {
  driver: {
    id: string;
    name: string;
    code: string;
    source: string;
    allowedProductTypes: string[];
  };
  categories: Category[];
  meta: {
    totalCategories: number;
    totalTypologies: number;
  };
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
    operatorId: null as string | null,
    isActive: true,
  });
  const [linkedToOperator, setLinkedToOperator] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: drivers = [], isLoading, isError, error, refetch } = useQuery<Driver[]>({
    queryKey: ['/api/drivers', { includeInactive: 'true' }],
  });

  const { data: operatorsResponse } = useQuery<{ success: boolean; data: Operator[] }>({
    queryKey: ['/api/operators'],
  });
  const operators = operatorsResponse?.data || [];

  // Query per la gerarchia del driver selezionato (solo in modalità view)
  const driverIdForHierarchy = driverModal.data?.id;
  const { data: hierarchyData, isLoading: isLoadingHierarchy } = useQuery<{ success: boolean; data: DriverHierarchy }>({
    queryKey: [`/api/wms/drivers/${driverIdForHierarchy}/hierarchy`],
    enabled: driverModal.open && driverModal.mode === 'view' && !!driverIdForHierarchy,
  });

  const hierarchy = hierarchyData?.data;

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
    setFormData({ code: '', name: '', description: '', allowedProductTypes: [], operatorId: null, isActive: true });
    setLinkedToOperator(false);
    setDriverModal({ open: true, mode: 'create', data: null });
  };

  const handleOpenEdit = (driver: Driver) => {
    setFormData({
      code: driver.code,
      name: driver.name,
      description: driver.description || '',
      allowedProductTypes: driver.allowedProductTypes || [],
      operatorId: driver.operatorId || null,
      isActive: driver.isActive,
    });
    setLinkedToOperator(!!driver.operatorId);
    setDriverModal({ open: true, mode: 'edit', data: driver });
  };

  const handleOpenView = (driver: Driver) => {
    setFormData({
      code: driver.code,
      name: driver.name,
      description: driver.description || '',
      allowedProductTypes: driver.allowedProductTypes || [],
      operatorId: driver.operatorId || null,
      isActive: driver.isActive,
    });
    setLinkedToOperator(!!driver.operatorId);
    setDriverModal({ open: true, mode: 'view', data: driver });
  };

  const handleCloseModal = () => {
    setDriverModal({ open: false, mode: 'create', data: null });
    setFormData({ code: '', name: '', description: '', allowedProductTypes: [], operatorId: null, isActive: true });
    setLinkedToOperator(false);
    setExpandedCategories(new Set());
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
    if (linkedToOperator && !formData.operatorId) {
      toast({ title: 'Errore', description: 'Seleziona un operatore o deseleziona il collegamento', variant: 'destructive' });
      return;
    }

    // Prepare payload - ensure operatorId is null if not linked
    const payload = {
      ...formData,
      operatorId: linkedToOperator ? formData.operatorId : null,
    };

    if (driverModal.mode === 'create') {
      createMutation.mutate(payload);
    } else if (driverModal.mode === 'edit' && driverModal.data) {
      updateMutation.mutate({ id: driverModal.data.id, data: payload });
    }
  };

  const handleDelete = (driver: Driver) => {
    if (window.confirm(`Sei sicuro di voler eliminare il driver "${driver.name}"?`)) {
      deleteMutation.mutate(driver.id);
    }
  };

  const toggleProductType = (type: string) => {
    setFormData(prev => {
      const isRemoving = prev.allowedProductTypes.includes(type);
      const newTypes = isRemoving
        ? prev.allowedProductTypes.filter(t => t !== type)
        : [...prev.allowedProductTypes, type];
      
      // Reset operator linkage when CANVAS is removed
      if (type === 'CANVAS' && isRemoving) {
        setLinkedToOperator(false);
        return { ...prev, allowedProductTypes: newTypes, operatorId: null };
      }
      
      return { ...prev, allowedProductTypes: newTypes };
    });
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

            {/* Operator Linking Section - Only for CANVAS drivers */}
            {formData.allowedProductTypes.includes('CANVAS') && (
              <div className="p-4 rounded-lg border border-orange-200 bg-orange-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <Radio className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
                  <div>
                    <Label className="font-medium">Collegamento Operatore (Telco)</Label>
                    <p className="text-xs text-gray-500">Associa questo driver ad un operatore per i prodotti CANVAS</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox
                    id="linkedToOperator"
                    checked={linkedToOperator}
                    disabled={driverModal.mode === 'view'}
                    onCheckedChange={(checked) => {
                      setLinkedToOperator(checked === true);
                      if (!checked) {
                        setFormData(prev => ({ ...prev, operatorId: null }));
                      }
                    }}
                    data-testid="checkbox-linked-to-operator"
                  />
                  <Label htmlFor="linkedToOperator" className="text-sm cursor-pointer">
                    Questo driver è legato ad un operatore specifico
                  </Label>
                </div>

                {linkedToOperator && (
                  <div className="ml-6">
                    <Label className="mb-2 block text-sm">Seleziona Operatore *</Label>
                    <Select
                      value={formData.operatorId || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, operatorId: value || null }))}
                      disabled={driverModal.mode === 'view'}
                    >
                      <SelectTrigger className="w-full" data-testid="select-operator">
                        <SelectValue placeholder="Seleziona un operatore..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op.id} value={op.id} data-testid={`select-operator-${op.code}`}>
                            <div className="flex items-center gap-2">
                              {op.colorHex && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: op.colorHex }}
                                />
                              )}
                              <span>{op.name}</span>
                              <span className="text-gray-400 text-xs">({op.code})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      I prodotti CANVAS di questo driver saranno associati a questo operatore
                    </p>
                  </div>
                )}
              </div>
            )}

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

            {/* Sezione Gerarchia Ereditata (solo in view mode) */}
            {driverModal.mode === 'view' && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <FolderTree className="h-5 w-5 text-blue-600" />
                  <Label className="text-base font-semibold">Categorie & Tipologie Ereditate</Label>
                  {hierarchy?.meta && (
                    <Badge variant="secondary" className="ml-auto">
                      {hierarchy.meta.totalCategories} cat. / {hierarchy.meta.totalTypologies} tip.
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Gerarchia derivata automaticamente dai tipi prodotto selezionati
                </p>
                
                {isLoadingHierarchy ? (
                  <div className="flex items-center justify-center py-6">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Caricamento gerarchia...</span>
                  </div>
                ) : hierarchy?.categories && hierarchy.categories.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {hierarchy.categories.map(category => (
                      <Collapsible
                        key={category.id}
                        open={expandedCategories.has(category.id)}
                        onOpenChange={(open) => {
                          const newSet = new Set(expandedCategories);
                          if (open) {
                            newSet.add(category.id);
                          } else {
                            newSet.delete(category.id);
                          }
                          setExpandedCategories(newSet);
                        }}
                      >
                        <CollapsibleTrigger asChild>
                          <div 
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            data-testid={`category-${category.id}`}
                          >
                            {expandedCategories.has(category.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="font-medium text-sm">{category.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {PRODUCT_TYPES.find(pt => pt.value === category.productType)?.label || category.productType}
                            </Badge>
                            {category.source === 'brand' && (
                              <Lock className="h-3 w-3 text-gray-400" />
                            )}
                            <span className="text-xs text-gray-400">
                              {category.typologies.length} tip.
                            </span>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1">
                            {category.typologies.map(typology => (
                              <div 
                                key={typology.id}
                                className="flex items-center gap-2 p-2 rounded bg-white border border-gray-100"
                                data-testid={`typology-${typology.id}`}
                              >
                                <Tag className="h-3 w-3 text-orange-500" />
                                <span className="text-sm">{typology.name}</span>
                                {typology.source === 'brand' && (
                                  <Lock className="h-3 w-3 text-gray-400 ml-auto" />
                                )}
                              </div>
                            ))}
                            {category.typologies.length === 0 && (
                              <p className="text-xs text-gray-400 italic p-2">
                                Nessuna tipologia definita
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessuna categoria ereditata</p>
                    <p className="text-xs">I tipi prodotto selezionati non hanno categorie associate</p>
                  </div>
                )}
              </div>
            )}
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
