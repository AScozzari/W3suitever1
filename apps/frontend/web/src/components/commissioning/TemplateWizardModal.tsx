import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Layers,
  Building,
  Store,
  User,
  Plus,
  Trash2,
  GaugeCircle,
  BadgePercent,
  Award,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Scale,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfiguratorType {
  id: string;
  code: string;
  name: string;
  description: string;
  availableVariables: Array<{ code: string; name: string; type: string }>;
  uiComponent: string;
  calculationModes: string[];
  supportsMultipleThresholds: boolean;
}

interface CommissioningFunction {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ruleBundle: any;
}

interface Driver {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface TemplateWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, title: 'Tipo', description: 'Scegli il tipo di configuratore' },
  { id: 2, title: 'Configurazione', description: 'Layer, soglie e driver' },
  { id: 3, title: 'Paletti & CAP', description: 'Condizioni e limiti' },
  { id: 4, title: 'Riepilogo', description: 'Conferma e crea' },
];

const typeIcons: Record<string, typeof GaugeCircle> = {
  soglie: GaugeCircle,
  gettone: Award,
  bonus_malus: BadgePercent,
};

const layerOptions = [
  { value: 'RS', label: 'Ragione Sociale', icon: Building, description: 'Somma i valori di tutte le sedi della ragione sociale' },
  { value: 'PDV', label: 'Punto Vendita', icon: Store, description: 'Somma i valori per singolo punto vendita' },
  { value: 'USER', label: 'Utente', icon: User, description: 'Calcolo individuale per ogni utente' },
];

export default function TemplateWizardModal({ open, onOpenChange, onSuccess }: TemplateWizardModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [template, setTemplate] = useState({
    code: '',
    name: '',
    description: '',
    typeCode: '',
    primaryLayer: 'USER' as 'RS' | 'PDV' | 'USER',
    availableDriverIds: [] as string[],
    thresholdMode: 'progressive' as 'progressive' | 'regressive',
    thresholdCount: 3,
  });
  
  const [paletti, setPaletti] = useState<Array<{
    functionId: string;
    layerOverride?: string;
    description: string;
  }>>([]);
  
  const [caps, setCaps] = useState<Array<{
    functionId: string;
    layerOverride?: string;
    behavior: 'block' | 'scale';
    limitValue?: number;
    description: string;
  }>>([]);

  const { data: types = [] } = useQuery<ConfiguratorType[]>({
    queryKey: ['/api/commissioning/configurator-types'],
  });

  const { data: functions = [] } = useQuery<CommissioningFunction[]>({
    queryKey: ['/api/commissioning/functions'],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['/api/commissioning/drivers'],
  });

  const selectedType = types.find(t => t.code === template.typeCode);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/commissioning/configurator-templates', {
        method: 'POST',
        body: JSON.stringify(template),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const templateId = data.id;
      
      const validPaletti = paletti.filter(p => p.functionId);
      const errors: string[] = [];
      
      for (const p of validPaletti) {
        try {
          await apiRequest(`/api/commissioning/configurator-templates/${templateId}/paletti`, {
            method: 'POST',
            body: JSON.stringify(p),
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e: any) {
          errors.push(`Paletto: ${e.message || 'errore sconosciuto'}`);
        }
      }
      
      const validCaps = caps.filter(c => c.functionId);
      for (const c of validCaps) {
        try {
          await apiRequest(`/api/commissioning/configurator-templates/${templateId}/caps`, {
            method: 'POST',
            body: JSON.stringify(c),
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e: any) {
          errors.push(`CAP: ${e.message || 'errore sconosciuto'}`);
        }
      }
      
      if (errors.length > 0) {
        console.warn('Errori durante creazione paletti/CAP:', errors);
      }
      
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/configurator-templates'] });
      toast({ title: 'Template creato', description: 'Il template configuratore è stato creato con successo.' });
      handleReset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({ title: 'Errore', description: err.message || 'Impossibile creare il template.', variant: 'destructive' });
    },
  });

  const handleReset = () => {
    setCurrentStep(1);
    setTemplate({
      code: '',
      name: '',
      description: '',
      typeCode: '',
      primaryLayer: 'USER',
      availableDriverIds: [],
      thresholdMode: 'progressive',
      thresholdCount: 3,
    });
    setPaletti([]);
    setCaps([]);
  };

  useEffect(() => {
    if (!open) handleReset();
  }, [open]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return template.typeCode !== '';
      case 2:
        return template.code !== '' && template.name !== '';
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const addPaletto = () => {
    setPaletti([...paletti, { functionId: '', description: '' }]);
  };

  const removePaletto = (index: number) => {
    setPaletti(paletti.filter((_, i) => i !== index));
  };

  const updatePaletto = (index: number, field: string, value: any) => {
    const updated = [...paletti];
    (updated[index] as any)[field] = value;
    setPaletti(updated);
  };

  const addCap = () => {
    setCaps([...caps, { functionId: '', behavior: 'block', description: '' }]);
  };

  const removeCap = (index: number) => {
    setCaps(caps.filter((_, i) => i !== index));
  };

  const updateCap = (index: number, field: string, value: any) => {
    const updated = [...caps];
    (updated[index] as any)[field] = value;
    setCaps(updated);
  };

  const toggleDriver = (driverId: string) => {
    if (template.availableDriverIds.includes(driverId)) {
      setTemplate({
        ...template,
        availableDriverIds: template.availableDriverIds.filter(id => id !== driverId),
      });
    } else {
      setTemplate({
        ...template,
        availableDriverIds: [...template.availableDriverIds, driverId],
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nuovo Template Configuratore</DialogTitle>
          <DialogDescription>
            Crea un template riutilizzabile per le tue gare commissioning
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                currentStep === step.id 
                  ? 'bg-windtre-orange text-white' 
                  : currentStep > step.id 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
              }`}>
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="font-medium">{step.id}</span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-1 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="py-4 space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Seleziona il tipo di configuratore da utilizzare come base per il template.</p>
                <div className="grid gap-3">
                  {types.map(type => {
                    const Icon = typeIcons[type.code] || Layers;
                    const isSelected = template.typeCode === type.code;
                    return (
                      <Card 
                        key={type.code}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'ring-2 ring-windtre-orange bg-orange-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setTemplate({ ...template, typeCode: type.code })}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-windtre-orange text-white' : 'bg-gray-100'}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{type.name}</CardTitle>
                              <CardDescription className="text-sm">{type.description}</CardDescription>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-windtre-orange ml-auto" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-1">
                            {type.availableVariables?.map(v => (
                              <Badge key={v.code} variant="secondary" className="text-xs">
                                {v.name}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Codice *</Label>
                    <Input
                      id="code"
                      placeholder="es. bonus_vendite_q1"
                      value={template.code}
                      onChange={(e) => setTemplate({ 
                        ...template, 
                        code: e.target.value.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '') 
                      })}
                    />
                    <p className="text-xs text-gray-500">Identificativo univoco, solo lettere minuscole e underscore</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      placeholder="es. Bonus Vendite Q1"
                      value={template.name}
                      onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrizione del template..."
                    value={template.description}
                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Layer Principale</Label>
                  <p className="text-xs text-gray-500">Definisce il livello di aggregazione per il calcolo delle commissioni</p>
                  <div className="grid gap-2">
                    {layerOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = template.primaryLayer === option.value;
                      return (
                        <div
                          key={option.value}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'border-windtre-orange bg-orange-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setTemplate({ ...template, primaryLayer: option.value as any })}
                        >
                          <Icon className={`h-5 w-5 ${isSelected ? 'text-windtre-orange' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.description}</div>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-windtre-orange" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedType?.supportsMultipleThresholds && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Modalità Soglie</Label>
                      <Select 
                        value={template.thresholdMode} 
                        onValueChange={(v: 'progressive' | 'regressive') => setTemplate({ ...template, thresholdMode: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="progressive">Progressive (somma per fascia)</SelectItem>
                          <SelectItem value="regressive">Regressive (tutto al max)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Numero Soglie</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={template.thresholdCount}
                        onChange={(e) => setTemplate({ ...template, thresholdCount: parseInt(e.target.value) || 3 })}
                      />
                    </div>
                  </div>
                )}

                {drivers.length > 0 && (
                  <div className="space-y-3">
                    <Label>Driver Disponibili</Label>
                    <p className="text-xs text-gray-500">Seleziona i driver che potranno essere attivati per i cluster di questo template</p>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {drivers.map(driver => (
                        <div
                          key={driver.id}
                          className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                            template.availableDriverIds.includes(driver.id) 
                              ? 'border-windtre-orange bg-orange-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleDriver(driver.id)}
                        >
                          <Checkbox 
                            checked={template.availableDriverIds.includes(driver.id)}
                            onCheckedChange={() => toggleDriver(driver.id)}
                          />
                          <div className="text-sm truncate">{driver.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        Paletti (Sblocchi)
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">Condizioni che devono essere TRUE per sbloccare soglie/bonus</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={addPaletto}>
                      <Plus className="h-4 w-4 mr-1" /> Aggiungi
                    </Button>
                  </div>
                  
                  {paletti.length === 0 ? (
                    <div className="text-center py-6 border rounded-lg bg-gray-50 text-gray-500 text-sm">
                      Nessun paletto configurato. I template senza paletti sono sempre sbloccati.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paletti.map((p, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-green-50">
                          <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <Select 
                            value={p.functionId} 
                            onValueChange={(v) => updatePaletto(index, 'functionId', v)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Seleziona funzione" />
                            </SelectTrigger>
                            <SelectContent>
                              {functions.map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Descrizione opzionale"
                            value={p.description}
                            onChange={(e) => updatePaletto(index, 'description', e.target.value)}
                            className="w-48"
                          />
                          <Button variant="ghost" size="sm" onClick={() => removePaletto(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        CAP (Limiti)
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">Condizioni che limitano il counting quando TRUE</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={addCap}>
                      <Plus className="h-4 w-4 mr-1" /> Aggiungi
                    </Button>
                  </div>
                  
                  {caps.length === 0 ? (
                    <div className="text-center py-6 border rounded-lg bg-gray-50 text-gray-500 text-sm">
                      Nessun CAP configurato. I template senza CAP non hanno limiti di counting.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {caps.map((c, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-amber-50">
                          {c.behavior === 'block' ? (
                            <Lock className="h-4 w-4 text-red-600 flex-shrink-0" />
                          ) : (
                            <Scale className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          )}
                          <Select 
                            value={c.functionId} 
                            onValueChange={(v) => updateCap(index, 'functionId', v)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Seleziona funzione" />
                            </SelectTrigger>
                            <SelectContent>
                              {functions.map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={c.behavior} 
                            onValueChange={(v: 'block' | 'scale') => updateCap(index, 'behavior', v)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="block">Blocca</SelectItem>
                              <SelectItem value="scale">Scala</SelectItem>
                            </SelectContent>
                          </Select>
                          {c.behavior === 'scale' && (
                            <Input
                              type="number"
                              placeholder="Limite"
                              value={c.limitValue || ''}
                              onChange={(e) => updateCap(index, 'limitValue', parseFloat(e.target.value) || undefined)}
                              className="w-24"
                            />
                          )}
                          <Button variant="ghost" size="sm" onClick={() => removeCap(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Riepilogo Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Codice:</span>
                        <span className="ml-2 font-mono">{template.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Nome:</span>
                        <span className="ml-2 font-medium">{template.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <Badge variant="outline" className="ml-2">{selectedType?.name || template.typeCode}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">Layer:</span>
                        <Badge className="ml-2 bg-blue-100 text-blue-700 border-0">
                          {layerOptions.find(l => l.value === template.primaryLayer)?.label}
                        </Badge>
                      </div>
                      {selectedType?.supportsMultipleThresholds && (
                        <>
                          <div>
                            <span className="text-gray-500">Soglie:</span>
                            <span className="ml-2">{template.thresholdMode === 'progressive' ? 'Progressive' : 'Regressive'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">N. Soglie:</span>
                            <span className="ml-2">{template.thresholdCount}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {template.availableDriverIds.length > 0 && (
                      <div>
                        <span className="text-gray-500 text-sm">Driver disponibili:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.availableDriverIds.map(id => {
                            const driver = drivers.find(d => d.id === id);
                            return driver ? (
                              <Badge key={id} variant="secondary" className="text-xs">{driver.name}</Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-4 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{paletti.filter(p => p.functionId).length} Paletti</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">{caps.filter(c => c.functionId).length} CAP</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <p className="text-sm text-gray-600 text-center">
                  Clicca "Crea Template" per salvare. Potrai modificare paletti e CAP successivamente.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => currentStep === 1 ? onOpenChange(false) : setCurrentStep(currentStep - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {currentStep === 1 ? 'Annulla' : 'Indietro'}
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()}>
                Avanti
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={createMutation.isPending}
                className="bg-windtre-orange hover:bg-windtre-orange/90"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crea Template
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
