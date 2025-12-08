import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Plus, 
  Save,
  Info,
  ListOrdered,
  Workflow,
  Zap,
  Bell,
  Shield,
  AlertTriangle,
  Trash2
} from 'lucide-react';

interface CreatePipelineDialogProps {
  open: boolean;
  onClose: () => void;
}

type StageCategory = 'starter' | 'progress' | 'pending' | 'purchase' | 'finalized' | 'archive' | 'ko';

const stageCategoryConfig: Record<StageCategory, { label: string; color: string }> = {
  starter: { label: 'Iniziale', color: 'hsl(210, 100%, 60%)' },
  progress: { label: 'In Progress', color: 'hsl(200, 100%, 50%)' },
  pending: { label: 'In Attesa', color: 'hsl(40, 95%, 55%)' },
  purchase: { label: 'Acquisto', color: 'hsl(280, 65%, 60%)' },
  finalized: { label: 'Finalizzato', color: 'hsl(140, 60%, 50%)' },
  archive: { label: 'Archiviato', color: 'hsl(210, 15%, 50%)' },
  ko: { label: 'Perso/KO', color: 'hsl(0, 70%, 55%)' }
};

export function CreatePipelineDialog({ open, onClose }: CreatePipelineDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  
  // General settings state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [driverId, setDriverId] = useState<string>('');
  const [autoAssign, setAutoAssign] = useState(false);

  // Stage form state
  const [stages, setStages] = useState<Array<{name: string; category: StageCategory; order: number; probability: number}>>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageCategory, setNewStageCategory] = useState<StageCategory>('starter');
  const [newStageOrder, setNewStageOrder] = useState('');
  const [newStageProbability, setNewStageProbability] = useState('50');

  // Automation settings
  const [autoMoveEnabled, setAutoMoveEnabled] = useState(false);
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(true);
  const [duplicateCheckEnabled, setDuplicateCheckEnabled] = useState(true);

  // Notification settings
  const [notifyOnStageChange, setNotifyOnStageChange] = useState(true);
  const [notifyOnDealRotten, setNotifyOnDealRotten] = useState(true);
  const [notifyOnDealWon, setNotifyOnDealWon] = useState(true);
  const [notifyOnDealLost, setNotifyOnDealLost] = useState(true);

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['/api/drivers'],
    enabled: open,
  });

  const createPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error('Il nome della pipeline è obbligatorio');
      }
      if (!driverId) {
        throw new Error('Seleziona un driver per la pipeline');
      }

      return apiRequest('/api/crm/pipelines', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          domain: 'crm',
          driverId,
          isActive: true,
          autoAssign,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines'] });
      toast({
        title: 'Pipeline creata',
        description: `La pipeline "${name}" è stata creata con successo`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare la pipeline',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setDriverId('');
    setAutoAssign(false);
    setStages([]);
    setActiveTab('general');
    onClose();
  };

  const handleSubmit = () => {
    createPipelineMutation.mutate();
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci un nome per lo stato',
        variant: 'destructive',
      });
      return;
    }
    setStages([...stages, {
      name: newStageName,
      category: newStageCategory,
      order: parseInt(newStageOrder) || stages.length,
      probability: parseInt(newStageProbability) || 50
    }]);
    setNewStageName('');
    setNewStageCategory('starter');
    setNewStageOrder('');
    setNewStageProbability('50');
  };

  const handleDeleteStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          background: 'white',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}>
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <div style={{ color: '#1f2937' }}>Nuova Pipeline</div>
              <div className="text-sm font-normal text-gray-500 mt-1">
                Configura impostazioni generali, stage, workflow e notifiche per questa pipeline CRM
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Crea una nuova pipeline CRM con impostazioni complete
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-7 bg-gray-50 p-1 rounded-lg">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-general"
            >
              <Info className="h-4 w-4 mr-2" />
              Generale
            </TabsTrigger>
            <TabsTrigger 
              value="stages" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-stages"
            >
              <ListOrdered className="h-4 w-4 mr-2" />
              Stati
            </TabsTrigger>
            <TabsTrigger 
              value="workflows" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-workflows"
            >
              <Workflow className="h-4 w-4 mr-2" />
              Workflow
            </TabsTrigger>
            <TabsTrigger 
              value="automation" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-automation"
            >
              <Zap className="h-4 w-4 mr-2" />
              Automazioni
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-notifications"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger 
              value="permissions" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-permissions"
            >
              <Shield className="h-4 w-4 mr-2" />
              Permessi
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-advanced"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Avanzate
            </TabsTrigger>
          </TabsList>

          {/* TAB: GENERALE */}
          <TabsContent value="general" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Informazioni Base</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pipeline-name" className="text-gray-700">Nome Pipeline *</Label>
                  <Input
                    id="pipeline-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="es. Pipeline Vendite Fibra"
                    className="bg-white border-gray-300"
                    data-testid="input-pipeline-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pipeline-description" className="text-gray-700">Descrizione</Label>
                  <Textarea
                    id="pipeline-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrivi lo scopo e l'utilizzo di questa pipeline..."
                    rows={3}
                    className="bg-white border-gray-300"
                    data-testid="input-pipeline-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pipeline-driver" className="text-gray-700">Driver Tecnologico</Label>
                  <Select value={driverId} onValueChange={setDriverId} disabled={driversLoading}>
                    <SelectTrigger id="pipeline-driver" className="bg-white border-gray-300" data-testid="select-driver">
                      <SelectValue placeholder={driversLoading ? "Caricamento..." : "Seleziona driver"} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver: any) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Assegnazione Automatica</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-gray-700">Auto-assegnazione lead</Label>
                  <p className="text-sm text-gray-500">
                    Assegna automaticamente i nuovi lead agli agenti disponibili
                  </p>
                </div>
                <Switch
                  checked={autoAssign}
                  onCheckedChange={setAutoAssign}
                  data-testid="switch-auto-assign"
                />
              </div>
            </Card>
          </TabsContent>

          {/* TAB: STATI */}
          <TabsContent value="stages" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Crea Nuovo Stato</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="stage-name" className="text-gray-700">Nome Stato *</Label>
                  <Input
                    id="stage-name"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="es. Contatto Iniziale"
                    className="bg-white border-gray-300"
                    data-testid="input-stage-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-category" className="text-gray-700">Categoria *</Label>
                  <Select value={newStageCategory} onValueChange={(val) => setNewStageCategory(val as StageCategory)}>
                    <SelectTrigger id="stage-category" className="bg-white border-gray-300" data-testid="select-stage-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(stageCategoryConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: config.color }} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-order" className="text-gray-700">Ordine</Label>
                  <Input
                    id="stage-order"
                    type="number"
                    value={newStageOrder}
                    onChange={(e) => setNewStageOrder(e.target.value)}
                    placeholder="0"
                    className="bg-white border-gray-300"
                    data-testid="input-stage-order"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-probability" className="text-gray-700">Probabilità (%)</Label>
                  <Input
                    id="stage-probability"
                    type="number"
                    min="0"
                    max="100"
                    value={newStageProbability}
                    onChange={(e) => setNewStageProbability(e.target.value)}
                    placeholder="50"
                    className="bg-white border-gray-300"
                    data-testid="input-stage-probability"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddStage}
                style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                data-testid="button-create-stage"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Stato
              </Button>
            </Card>

            {stages.length > 0 && (
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Stati Configurati</h3>
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded" style={{ background: stageCategoryConfig[stage.category].color }} />
                        <span className="font-medium text-gray-900">{stage.name}</span>
                        <span className="text-sm text-gray-500">({stageCategoryConfig[stage.category].label})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStage(index)}
                        data-testid={`button-delete-stage-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB: WORKFLOW */}
          <TabsContent value="workflows" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Workflow Assegnati</h3>
              <p className="text-sm text-gray-500">
                I workflow possono essere assegnati dopo la creazione della pipeline
              </p>
            </Card>
          </TabsContent>

          {/* TAB: AUTOMAZIONI */}
          <TabsContent value="automation" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Automazioni Pipeline</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Movimento automatico</Label>
                    <p className="text-sm text-gray-500">Sposta automaticamente i deal in base alle azioni</p>
                  </div>
                  <Switch
                    checked={autoMoveEnabled}
                    onCheckedChange={setAutoMoveEnabled}
                    data-testid="switch-auto-move"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Notifiche automatiche</Label>
                    <p className="text-sm text-gray-500">Invia notifiche automatiche agli assegnatari</p>
                  </div>
                  <Switch
                    checked={autoNotifyEnabled}
                    onCheckedChange={setAutoNotifyEnabled}
                    data-testid="switch-auto-notify"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Controllo duplicati</Label>
                    <p className="text-sm text-gray-500">Verifica automaticamente i duplicati</p>
                  </div>
                  <Switch
                    checked={duplicateCheckEnabled}
                    onCheckedChange={setDuplicateCheckEnabled}
                    data-testid="switch-duplicate-check"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB: NOTIFICHE */}
          <TabsContent value="notifications" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Notifiche Pipeline</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Cambio stato</Label>
                    <p className="text-sm text-gray-500">Notifica quando un deal cambia stato</p>
                  </div>
                  <Switch
                    checked={notifyOnStageChange}
                    onCheckedChange={setNotifyOnStageChange}
                    data-testid="switch-notify-stage-change"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Deal rotten</Label>
                    <p className="text-sm text-gray-500">Notifica per deal inattivi da troppo tempo</p>
                  </div>
                  <Switch
                    checked={notifyOnDealRotten}
                    onCheckedChange={setNotifyOnDealRotten}
                    data-testid="switch-notify-rotten"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Deal vinto</Label>
                    <p className="text-sm text-gray-500">Notifica quando un deal viene vinto</p>
                  </div>
                  <Switch
                    checked={notifyOnDealWon}
                    onCheckedChange={setNotifyOnDealWon}
                    data-testid="switch-notify-won"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Deal perso</Label>
                    <p className="text-sm text-gray-500">Notifica quando un deal viene perso</p>
                  </div>
                  <Switch
                    checked={notifyOnDealLost}
                    onCheckedChange={setNotifyOnDealLost}
                    data-testid="switch-notify-lost"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB: PERMESSI */}
          <TabsContent value="permissions" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Permessi e Accessi</h3>
              <p className="text-sm text-gray-500">
                I permessi possono essere configurati dopo la creazione della pipeline
              </p>
            </Card>
          </TabsContent>

          {/* TAB: AVANZATE */}
          <TabsContent value="advanced" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Impostazioni Avanzate</h3>
              <p className="text-sm text-gray-500">
                Le impostazioni avanzate possono essere configurate dopo la creazione della pipeline
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createPipelineMutation.isPending}
            data-testid="button-cancel-pipeline"
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createPipelineMutation.isPending || !name.trim() || !driverId}
            style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
            data-testid="button-submit-pipeline"
          >
            <Save className="h-4 w-4 mr-2" />
            Crea Pipeline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
