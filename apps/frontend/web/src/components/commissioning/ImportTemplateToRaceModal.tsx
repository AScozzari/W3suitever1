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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Check,
  ChevronRight,
  Loader2,
  Lock,
  Unlock,
  Building,
  Store,
  User,
  Layers,
  GaugeCircle,
  Award,
  BadgePercent,
  FileDown,
  Puzzle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InstanceClusterManager from './InstanceClusterManager';

interface ConfiguratorTemplate {
  id: string;
  tenantId: string | null;
  code: string;
  name: string;
  description: string | null;
  typeCode: string;
  typeName: string;
  primaryLayer: 'RS' | 'PDV' | 'USER';
  availableDriverIds: string[];
  thresholdMode: 'progressive' | 'regressive' | null;
  thresholdCount: number;
  status: string;
  palettiCount: number;
  capsCount: number;
  isBrandPushed: boolean;
}

interface ImportTemplateToRaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raceId: string;
  raceName: string;
  onSuccess?: () => void;
}

const typeIcons: Record<string, typeof GaugeCircle> = {
  soglie: GaugeCircle,
  gettone: Award,
  bonus_malus: BadgePercent,
};

const layerLabels: Record<string, { label: string; icon: typeof Building; color: string }> = {
  RS: { label: 'Ragione Sociale', icon: Building, color: 'bg-blue-100 text-blue-700' },
  PDV: { label: 'Punto Vendita', icon: Store, color: 'bg-green-100 text-green-700' },
  USER: { label: 'Utente', icon: User, color: 'bg-purple-100 text-purple-700' },
};

export default function ImportTemplateToRaceModal({
  open,
  onOpenChange,
  raceId,
  raceName,
  onSuccess,
}: ImportTemplateToRaceModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'configure' | 'clusters'>('select');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<ConfiguratorTemplate[]>({
    queryKey: ['/api/commissioning/configurator-templates'],
    enabled: open,
  });

  const activeTemplates = templates.filter(t => t.status === 'active' || t.isBrandPushed);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const createInstanceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/commissioning/configurator-instances', {
        method: 'POST',
        body: JSON.stringify({
          raceId,
          templateId: selectedTemplateId,
          name: instanceName || selectedTemplate?.name,
          status: 'active',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCreatedInstanceId(data.id);
      setStep('clusters');
      toast({ title: 'Istanza creata', description: 'Ora puoi configurare i cluster.' });
    },
    onError: (err: any) => {
      toast({ title: 'Errore', description: err.message || 'Impossibile creare l\'istanza.', variant: 'destructive' });
    },
  });

  const handleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/commissioning/configurator-instances'] });
    queryClient.invalidateQueries({ queryKey: ['/api/commissioning/races'] });
    onOpenChange(false);
    toast({ title: 'Configuratore importato', description: 'Il configuratore è stato aggiunto alla gara con successo.' });
    onSuccess?.();
    handleReset();
  };

  const handleReset = () => {
    setStep('select');
    setSelectedTemplateId(null);
    setInstanceName('');
    setCreatedInstanceId(null);
  };

  useEffect(() => {
    if (!open) handleReset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-windtre-orange" />
            Importa Configuratore nella Gara
          </DialogTitle>
          <DialogDescription>
            Gara: <span className="font-medium text-gray-900">{raceName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-4 border-b">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            step === 'select' ? 'bg-windtre-orange text-white' : 
            step !== 'select' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {step !== 'select' ? <Check className="h-4 w-4" /> : <span className="font-medium">1</span>}
            <span className="hidden sm:inline">Seleziona</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            step === 'configure' ? 'bg-windtre-orange text-white' : 
            step === 'clusters' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {step === 'clusters' ? <Check className="h-4 w-4" /> : <span className="font-medium">2</span>}
            <span className="hidden sm:inline">Configura</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            step === 'clusters' ? 'bg-windtre-orange text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            <span className="font-medium">3</span>
            <span className="hidden sm:inline">Cluster</span>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="py-4 space-y-4">
            {step === 'select' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Seleziona un template configuratore da importare nella gara.
                  I template con l'icona <Lock className="inline h-3 w-3" /> sono brand-pushed (sola lettura).
                </p>
                
                {templatesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : activeTemplates.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Puzzle className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-500 text-center">
                        Nessun template attivo disponibile.<br />
                        Crea un template nelle Impostazioni del Commissioning.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {activeTemplates.map((template) => {
                      const TypeIcon = typeIcons[template.typeCode] || Layers;
                      const layer = layerLabels[template.primaryLayer];
                      const LayerIcon = layer?.icon || User;
                      const isSelected = selectedTemplateId === template.id;
                      
                      return (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-all ${
                            isSelected 
                              ? 'ring-2 ring-windtre-orange bg-orange-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedTemplateId(template.id)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-windtre-orange text-white' : 'bg-gray-100'}`}>
                                <TypeIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {template.isBrandPushed ? (
                                    <Lock className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Unlock className="h-4 w-4 text-green-500" />
                                  )}
                                  <CardTitle className="text-base">{template.name}</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-mono">{template.code}</CardDescription>
                              </div>
                              {isSelected && <Check className="h-5 w-5 text-windtre-orange" />}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs">
                                {template.typeName || template.typeCode}
                              </Badge>
                              <Badge className={`${layer?.color || 'bg-gray-100'} border-0 text-xs flex items-center gap-1`}>
                                <LayerIcon className="h-3 w-3" />
                                {layer?.label || template.primaryLayer}
                              </Badge>
                              {template.palettiCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {template.palettiCount} Paletti
                                </Badge>
                              )}
                              {template.capsCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {template.capsCount} CAP
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 'configure' && selectedTemplate && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Template Selezionato</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-windtre-orange text-white">
                        {(() => {
                          const Icon = typeIcons[selectedTemplate.typeCode] || Layers;
                          return <Icon className="h-5 w-5" />;
                        })()}
                      </div>
                      <div>
                        <div className="font-medium">{selectedTemplate.name}</div>
                        <div className="text-sm text-gray-500">{selectedTemplate.typeName || selectedTemplate.typeCode}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="instanceName">Nome Istanza (opzionale)</Label>
                  <Input
                    id="instanceName"
                    placeholder={`es. ${selectedTemplate.name} - ${raceName}`}
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Se non specificato, verrà usato il nome del template
                  </p>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Layers className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900">Configurazione Ereditata</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          L'istanza erediterà la configurazione base dal template:
                        </p>
                        <ul className="text-sm text-blue-600 mt-2 space-y-1">
                          <li>• Layer principale: {layerLabels[selectedTemplate.primaryLayer]?.label}</li>
                          {selectedTemplate.thresholdMode && (
                            <li>• Modalità soglie: {selectedTemplate.thresholdMode === 'progressive' ? 'Progressive' : 'Regressive'}</li>
                          )}
                          <li>• {selectedTemplate.palettiCount} paletti configurati</li>
                          <li>• {selectedTemplate.capsCount} CAP configurati</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 'clusters' && createdInstanceId && (
              <div className="space-y-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Check className="h-6 w-6 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">Istanza Creata!</h4>
                        <p className="text-sm text-green-700">
                          Ora configura i cluster per definire chi partecipa alla gara.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                <InstanceClusterManager
                  instanceId={createdInstanceId}
                  availableDriverIds={selectedTemplate?.availableDriverIds}
                  primaryLayer={selectedTemplate?.primaryLayer}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          {step === 'select' && (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button 
                onClick={() => setStep('configure')} 
                disabled={!selectedTemplateId}
              >
                Avanti
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 'configure' && (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setStep('select')}>
                Indietro
              </Button>
              <Button 
                onClick={() => createInstanceMutation.mutate()}
                disabled={createInstanceMutation.isPending}
              >
                {createInstanceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crea Istanza
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 'clusters' && (
            <div className="flex justify-end w-full">
              <Button 
                onClick={handleComplete}
                className="bg-windtre-orange hover:bg-windtre-orange/90"
              >
                <Check className="h-4 w-4 mr-1" />
                Completa Importazione
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
