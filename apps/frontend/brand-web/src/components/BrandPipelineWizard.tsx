import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
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
  Trash2,
  Check
} from 'lucide-react';

const pipelineDomains = ['sales', 'service', 'retention'] as const;
const stageCategories = ['starter', 'progress', 'pending', 'purchase', 'finalized', 'archive', 'ko'] as const;
const permissionModes = ['all', 'deal_managers', 'pipeline_admins', 'supervisor_only', 'custom', 'none'] as const;
const deletionModes = ['admins', 'supervisor_only', 'none'] as const;

const stageCategoryConfig: Record<typeof stageCategories[number], { label: string; color: string }> = {
  starter: { label: 'Iniziale', color: 'hsl(210, 100%, 60%)' },
  progress: { label: 'In Progress', color: 'hsl(200, 100%, 50%)' },
  pending: { label: 'In Attesa', color: 'hsl(40, 95%, 55%)' },
  purchase: { label: 'Acquisto', color: 'hsl(280, 65%, 60%)' },
  finalized: { label: 'Finalizzato', color: 'hsl(140, 60%, 50%)' },
  archive: { label: 'Archiviato', color: 'hsl(210, 15%, 50%)' },
  ko: { label: 'Perso/KO', color: 'hsl(0, 70%, 55%)' }
};

const pipelineTemplateSchema = z.object({
  name: z.string().min(1, "Nome template obbligatorio").max(255),
  description: z.string().optional().nullable().transform(val => val?.trim() || null),
  domain: z.enum(pipelineDomains),
  driverRef: z.string().optional().nullable().transform(val => val?.trim() || null),
  isActive: z.boolean().default(true),
  
  stagesConfig: z.array(z.object({
    order: z.number().int().min(0),
    name: z.string().min(1),
    category: z.enum(stageCategories),
    color: z.string().optional().nullable(),
    probability: z.number().int().min(0).max(100).optional().default(50),
  })).default([]),
  
  enabledChannels: z.array(z.string()).optional().default([]),
  workflowRefs: z.array(z.string()).optional().default([]),
  
  assignedTeamsPattern: z.string().optional().nullable().transform(val => val?.trim() || null),
  assignedUsersPattern: z.string().optional().nullable().transform(val => val?.trim() || null),
  pipelineAdminsPattern: z.string().optional().nullable().transform(val => val?.trim() || null),
  
  dealManagementMode: z.enum(permissionModes).default('all'),
  dealCreationMode: z.enum(permissionModes).default('all'),
  stateModificationMode: z.enum(permissionModes).default('all'),
  dealDeletionMode: z.enum(deletionModes).default('admins'),
  
  notifyOnStageChange: z.boolean().default(true),
  notifyOnDealRotten: z.boolean().default(true),
  notifyOnDealWon: z.boolean().default(true),
  notifyOnDealLost: z.boolean().default(true),
  
  stagePlaybooks: z.array(z.object({
    stageName: z.string(),
    allowedChannels: z.array(z.string()).optional(),
    maxAttemptsPerDay: z.number().int().min(0).optional().nullable(),
    slaHours: z.number().int().min(0).optional().nullable(),
    quietHoursStart: z.string().optional().nullable(),
    quietHoursEnd: z.string().optional().nullable(),
    nextBestActionJson: z.any().optional().nullable(),
    escalationPattern: z.string().optional().nullable(),
  })).optional().default([]),
});

type PipelineTemplateFormValues = z.infer<typeof pipelineTemplateSchema>;

interface BrandPipelineWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: any) => void;
  mode?: 'create' | 'edit';
  template?: any;
}

function TabIndicator({ activeTab, tabs }: { activeTab: string; tabs: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab;
        const isComplete = tabs.indexOf(activeTab) > idx;
        
        return (
          <div key={tab} className="flex items-center gap-2">
            <div 
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${isActive ? 'bg-[hsl(var(--brand-orange))] text-white scale-110' : ''}
                ${isComplete ? 'bg-green-500 text-white' : ''}
                ${!isActive && !isComplete ? 'bg-gray-200 text-gray-600' : ''}
              `}
            >
              {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            {idx < tabs.length - 1 && (
              <div className={`w-12 h-0.5 ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BrandPipelineWizard({ open, onClose, onSave, mode = 'create', template }: BrandPipelineWizardProps) {
  const [activeTab, setActiveTab] = useState('general');
  const tabs = ['general', 'stages', 'workflows', 'automation', 'notifications', 'permissions', 'advanced'];
  
  const form = useForm<PipelineTemplateFormValues>({
    resolver: zodResolver(pipelineTemplateSchema),
    defaultValues: {
      name: '',
      description: null,
      domain: 'sales',
      driverRef: null,
      isActive: true,
      stagesConfig: [],
      enabledChannels: [],
      workflowRefs: [],
      assignedTeamsPattern: null,
      assignedUsersPattern: null,
      pipelineAdminsPattern: null,
      dealManagementMode: 'all',
      dealCreationMode: 'all',
      stateModificationMode: 'all',
      dealDeletionMode: 'admins',
      notifyOnStageChange: true,
      notifyOnDealRotten: true,
      notifyOnDealWon: true,
      notifyOnDealLost: true,
      stagePlaybooks: [],
    },
  });

  const [newStageName, setNewStageName] = useState('');
  const [newStageCategory, setNewStageCategory] = useState<typeof stageCategories[number]>('starter');
  const [newStageOrder, setNewStageOrder] = useState('');
  const [newStageProbability, setNewStageProbability] = useState('50');

  const [newPlaybookStageName, setNewPlaybookStageName] = useState('');
  const [newPlaybookChannels, setNewPlaybookChannels] = useState<string[]>([]);
  const [newPlaybookMaxAttempts, setNewPlaybookMaxAttempts] = useState('');
  const [newPlaybookSlaHours, setNewPlaybookSlaHours] = useState('');
  const [newPlaybookQuietStart, setNewPlaybookQuietStart] = useState('');
  const [newPlaybookQuietEnd, setNewPlaybookQuietEnd] = useState('');
  const [newPlaybookEscalation, setNewPlaybookEscalation] = useState('');

  useEffect(() => {
    if (mode === 'edit' && template) {
      form.reset(template);
    }
  }, [mode, template, form]);

  const handleClose = () => {
    form.reset();
    setActiveTab('general');
    setNewStageName('');
    setNewStageCategory('starter');
    setNewStageOrder('');
    setNewStageProbability('50');
    setNewPlaybookStageName('');
    setNewPlaybookChannels([]);
    setNewPlaybookMaxAttempts('');
    setNewPlaybookSlaHours('');
    setNewPlaybookQuietStart('');
    setNewPlaybookQuietEnd('');
    setNewPlaybookEscalation('');
    onClose();
  };

  const handleSubmit = form.handleSubmit((data) => {
    const jsonTemplate = {
      type: 'pipeline_template',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      template: {
        ...data,
      }
    };
    
    onSave(jsonTemplate);
    handleClose();
  });

  const currentStages = form.watch('stagesConfig') || [];

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    
    const newStage = {
      order: parseInt(newStageOrder) || currentStages.length,
      name: newStageName,
      category: newStageCategory,
      color: stageCategoryConfig[newStageCategory].color,
      probability: parseInt(newStageProbability) || 50,
    };
    
    form.setValue('stagesConfig', [...currentStages, newStage]);
    setNewStageName('');
    setNewStageCategory('starter');
    setNewStageOrder('');
    setNewStageProbability('50');
  };

  const handleDeleteStage = (index: number) => {
    form.setValue('stagesConfig', currentStages.filter((_, i) => i !== index));
  };

  const currentPlaybooks = form.watch('stagePlaybooks') || [];

  const handleAddPlaybook = () => {
    if (!newPlaybookStageName.trim()) return;
    
    const newPlaybook = {
      stageName: newPlaybookStageName,
      allowedChannels: newPlaybookChannels.length > 0 ? newPlaybookChannels : undefined,
      maxAttemptsPerDay: newPlaybookMaxAttempts ? parseInt(newPlaybookMaxAttempts) : null,
      slaHours: newPlaybookSlaHours ? parseInt(newPlaybookSlaHours) : null,
      quietHoursStart: newPlaybookQuietStart || null,
      quietHoursEnd: newPlaybookQuietEnd || null,
      nextBestActionJson: null,
      escalationPattern: newPlaybookEscalation || null,
    };
    
    form.setValue('stagePlaybooks', [...currentPlaybooks, newPlaybook]);
    setNewPlaybookStageName('');
    setNewPlaybookChannels([]);
    setNewPlaybookMaxAttempts('');
    setNewPlaybookSlaHours('');
    setNewPlaybookQuietStart('');
    setNewPlaybookQuietEnd('');
    setNewPlaybookEscalation('');
  };

  const handleDeletePlaybook = (index: number) => {
    form.setValue('stagePlaybooks', currentPlaybooks.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
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
              <div style={{ color: '#1f2937' }}>
                {mode === 'create' ? 'Nuovo Template Pipeline' : 'Modifica Template Pipeline'}
              </div>
              <div className="text-sm font-normal text-gray-500 mt-1">
                Configura template pipeline per deployment multi-tenant (41 campi configurabili)
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Wizard creazione template pipeline CRM per Brand Interface
          </DialogDescription>
        </DialogHeader>

        <TabIndicator activeTab={activeTab} tabs={tabs} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-7 bg-gray-50 p-1 rounded-lg">
            <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-general">
              <Info className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Generale</span>
            </TabsTrigger>
            <TabsTrigger value="stages" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-stages">
              <ListOrdered className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Stati</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-workflows">
              <Workflow className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Workflow</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-automation">
              <Zap className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Automazioni</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-notifications">
              <Bell className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Notifiche</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-permissions">
              <Shield className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Permessi</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-advanced">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Avanzate</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Informazioni Base</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pipeline-name" className="text-gray-700">
                    Nome Template Pipeline <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pipeline-name"
                    {...form.register('name')}
                    placeholder="es. Pipeline Vendite Enterprise"
                    className="bg-white border-gray-300"
                    data-testid="input-pipeline-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pipeline-description" className="text-gray-700">Descrizione Template</Label>
                  <Textarea
                    id="pipeline-description"
                    {...form.register('description')}
                    placeholder="Descrivi lo scopo di questo template pipeline..."
                    rows={3}
                    className="bg-white border-gray-300"
                    data-testid="input-pipeline-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pipeline-domain" className="text-gray-700">
                    Dominio Pipeline <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={form.watch('domain')} 
                    onValueChange={(val) => form.setValue('domain', val as typeof pipelineDomains[number])}
                  >
                    <SelectTrigger id="pipeline-domain" className="bg-white border-gray-300" data-testid="select-domain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales (Vendite)</SelectItem>
                      <SelectItem value="service">Service (Assistenza)</SelectItem>
                      <SelectItem value="retention">Retention (Fidelizzazione)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driver-ref" className="text-gray-700">Driver Tecnologico Ref</Label>
                  <Input
                    id="driver-ref"
                    {...form.register('driverRef')}
                    placeholder="es. driver_fibra_enterprise o {default_driver}"
                    className="bg-white border-gray-300"
                    data-testid="input-driver-ref"
                  />
                  <p className="text-xs text-gray-500">
                    Placeholder pattern: <code className="bg-gray-100 px-1 rounded">{'{default_driver}'}</code> or specific driver ref
                  </p>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Pipeline Attiva di Default</Label>
                    <p className="text-sm text-gray-500">Template pipeline sarà attivo al deployment</p>
                  </div>
                  <Switch
                    checked={form.watch('isActive')}
                    onCheckedChange={(checked) => form.setValue('isActive', checked)}
                    data-testid="switch-is-active"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stages" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Configura Stati Pipeline</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="stage-name" className="text-gray-700">Nome Stato <span className="text-red-500">*</span></Label>
                  <Input
                    id="stage-name"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="es. Primo Contatto"
                    className="bg-white border-gray-300"
                    data-testid="input-stage-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-category" className="text-gray-700">Categoria <span className="text-red-500">*</span></Label>
                  <Select value={newStageCategory} onValueChange={(val) => setNewStageCategory(val as typeof stageCategories[number])}>
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
                    placeholder={currentStages.length.toString()}
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
                type="button"
                onClick={handleAddStage}
                style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                data-testid="button-add-stage"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Stato
              </Button>
            </Card>

            {currentStages.length > 0 && (
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Stati Configurati ({currentStages.length})</h3>
                <div className="space-y-2">
                  {currentStages.map((stage, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded" style={{ background: stage.color || stageCategoryConfig[stage.category].color }} />
                        <span className="font-medium text-gray-900">{stage.name}</span>
                        <span className="text-sm text-gray-500">({stageCategoryConfig[stage.category].label})</span>
                        <span className="text-xs text-gray-400">Order: {stage.order} | Prob: {stage.probability}%</span>
                      </div>
                      <Button
                        type="button"
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

          <TabsContent value="workflows" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Workflow References</h3>
              <p className="text-sm text-gray-500 mb-4">
                Workflow IDs saranno mappati ai workflow brand al deployment. Usa pattern placeholder per riferimenti dinamici.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workflow-refs" className="text-gray-700">Workflow Refs (comma-separated)</Label>
                  <Input
                    id="workflow-refs"
                    placeholder="es. workflow_lead_scoring, workflow_auto_assignment"
                    className="bg-white border-gray-300"
                    onChange={(e) => {
                      const refs = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                      form.setValue('workflowRefs', refs);
                    }}
                    data-testid="input-workflow-refs"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Canali Abilitati</h3>
              <div className="space-y-2">
                <Label className="text-gray-700">Seleziona Canali Disponibili</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['email', 'sms', 'whatsapp', 'phone', 'webchat'].map((channel) => (
                    <label key={channel} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form.watch('enabledChannels') || []).includes(channel)}
                        onChange={(e) => {
                          const current = form.watch('enabledChannels') || [];
                          if (e.target.checked) {
                            form.setValue('enabledChannels', [...current, channel]);
                          } else {
                            form.setValue('enabledChannels', current.filter(c => c !== channel));
                          }
                        }}
                        className="rounded"
                        data-testid={`checkbox-channel-${channel}`}
                      />
                      <span className="text-sm capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="automation" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Impostazioni Automazione</h3>
              <p className="text-sm text-gray-500">
                Automazioni pipeline saranno configurabili post-deployment dai tenant
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Preferenze Notifiche</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Notifica Cambio Stato</Label>
                    <p className="text-sm text-gray-500">Notifica quando deal cambia stato</p>
                  </div>
                  <Switch
                    checked={form.watch('notifyOnStageChange')}
                    onCheckedChange={(val) => form.setValue('notifyOnStageChange', val)}
                    data-testid="switch-notify-stage-change"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Notifica Deal Rotten</Label>
                    <p className="text-sm text-gray-500">Notifica per deal inattivi troppo tempo</p>
                  </div>
                  <Switch
                    checked={form.watch('notifyOnDealRotten')}
                    onCheckedChange={(val) => form.setValue('notifyOnDealRotten', val)}
                    data-testid="switch-notify-rotten"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Notifica Deal Vinto</Label>
                    <p className="text-sm text-gray-500">Notifica quando deal viene vinto</p>
                  </div>
                  <Switch
                    checked={form.watch('notifyOnDealWon')}
                    onCheckedChange={(val) => form.setValue('notifyOnDealWon', val)}
                    data-testid="switch-notify-won"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-gray-700">Notifica Deal Perso</Label>
                    <p className="text-sm text-gray-500">Notifica quando deal viene perso</p>
                  </div>
                  <Switch
                    checked={form.watch('notifyOnDealLost')}
                    onCheckedChange={(val) => form.setValue('notifyOnDealLost', val)}
                    data-testid="switch-notify-lost"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Team Assignment Patterns</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teams-pattern" className="text-gray-700">Assigned Teams Pattern</Label>
                  <Input
                    id="teams-pattern"
                    {...form.register('assignedTeamsPattern')}
                    placeholder="es. {crm_team}, {sales_team}"
                    className="bg-white border-gray-300"
                    data-testid="input-teams-pattern"
                  />
                  <p className="text-xs text-gray-500">Pattern placeholder per team assignment dinamico</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="users-pattern" className="text-gray-700">Assigned Users Pattern</Label>
                  <Input
                    id="users-pattern"
                    {...form.register('assignedUsersPattern')}
                    placeholder="es. {pipeline_owner}"
                    className="bg-white border-gray-300"
                    data-testid="input-users-pattern"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admins-pattern" className="text-gray-700">Pipeline Admins Pattern</Label>
                  <Input
                    id="admins-pattern"
                    {...form.register('pipelineAdminsPattern')}
                    placeholder="es. {admin_role}"
                    className="bg-white border-gray-300"
                    data-testid="input-admins-pattern"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Permission Modes</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deal-management-mode" className="text-gray-700">Deal Management Mode</Label>
                  <Select 
                    value={form.watch('dealManagementMode')} 
                    onValueChange={(val) => form.setValue('dealManagementMode', val as typeof permissionModes[number])}
                  >
                    <SelectTrigger id="deal-management-mode" className="bg-white border-gray-300" data-testid="select-deal-management-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionModes.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal-creation-mode" className="text-gray-700">Deal Creation Mode</Label>
                  <Select 
                    value={form.watch('dealCreationMode')} 
                    onValueChange={(val) => form.setValue('dealCreationMode', val as typeof permissionModes[number])}
                  >
                    <SelectTrigger id="deal-creation-mode" className="bg-white border-gray-300" data-testid="select-deal-creation-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionModes.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state-modification-mode" className="text-gray-700">State Modification Mode</Label>
                  <Select 
                    value={form.watch('stateModificationMode')} 
                    onValueChange={(val) => form.setValue('stateModificationMode', val as typeof permissionModes[number])}
                  >
                    <SelectTrigger id="state-modification-mode" className="bg-white border-gray-300" data-testid="select-state-modification-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionModes.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal-deletion-mode" className="text-gray-700">Deal Deletion Mode</Label>
                  <Select 
                    value={form.watch('dealDeletionMode')} 
                    onValueChange={(val) => form.setValue('dealDeletionMode', val as typeof deletionModes[number])}
                  >
                    <SelectTrigger id="deal-deletion-mode" className="bg-white border-gray-300" data-testid="select-deal-deletion-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {deletionModes.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Configura Stage Playbooks</h3>
              <p className="text-sm text-gray-500 mb-4">
                Definisci regole di contatto specifiche per ogni stage della pipeline (8 campi configurabili)
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="playbook-stage" className="text-gray-700">Nome Stage <span className="text-red-500">*</span></Label>
                  <Input
                    id="playbook-stage"
                    value={newPlaybookStageName}
                    onChange={(e) => setNewPlaybookStageName(e.target.value)}
                    placeholder="es. Primo Contatto"
                    className="bg-white border-gray-300"
                    data-testid="input-playbook-stage"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Canali Permessi</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['email', 'sms', 'whatsapp', 'phone'].map((channel) => (
                      <label key={channel} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={newPlaybookChannels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPlaybookChannels([...newPlaybookChannels, channel]);
                            } else {
                              setNewPlaybookChannels(newPlaybookChannels.filter(c => c !== channel));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playbook-max-attempts" className="text-gray-700">Max Tentativi/Giorno</Label>
                  <Input
                    id="playbook-max-attempts"
                    type="number"
                    value={newPlaybookMaxAttempts}
                    onChange={(e) => setNewPlaybookMaxAttempts(e.target.value)}
                    placeholder="es. 3"
                    className="bg-white border-gray-300"
                    data-testid="input-playbook-max-attempts"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playbook-sla" className="text-gray-700">SLA Hours</Label>
                  <Input
                    id="playbook-sla"
                    type="number"
                    value={newPlaybookSlaHours}
                    onChange={(e) => setNewPlaybookSlaHours(e.target.value)}
                    placeholder="es. 24"
                    className="bg-white border-gray-300"
                    data-testid="input-playbook-sla"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playbook-quiet-start" className="text-gray-700">Quiet Hours Start (HH:MM)</Label>
                  <Input
                    id="playbook-quiet-start"
                    value={newPlaybookQuietStart}
                    onChange={(e) => setNewPlaybookQuietStart(e.target.value)}
                    placeholder="20:00"
                    className="bg-white border-gray-300"
                    data-testid="input-playbook-quiet-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playbook-quiet-end" className="text-gray-700">Quiet Hours End (HH:MM)</Label>
                  <Input
                    id="playbook-quiet-end"
                    value={newPlaybookQuietEnd}
                    onChange={(e) => setNewPlaybookQuietEnd(e.target.value)}
                    placeholder="08:00"
                    className="bg-white border-gray-300"
                    data-testid="input-playbook-quiet-end"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="playbook-escalation" className="text-gray-700">Escalation Pattern</Label>
                  <Input
                    id="playbook-escalation"
                    value={newPlaybookEscalation}
                    onChange={(e) => setNewPlaybookEscalation(e.target.value)}
                    placeholder="es. {supervisor_team} or escalation_workflow_ref"
                    className="bg-white border-gray-300"
                    data-testid="input-playbook-escalation"
                  />
                  <p className="text-xs text-gray-500">Pattern placeholder per escalation dinamica</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAddPlaybook}
                style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                data-testid="button-add-playbook"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Playbook
              </Button>
            </Card>

            {currentPlaybooks.length > 0 && (
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Playbooks Configurati ({currentPlaybooks.length})</h3>
                <div className="space-y-2">
                  {currentPlaybooks.map((playbook, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">{playbook.stageName}</div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {playbook.allowedChannels && playbook.allowedChannels.length > 0 && (
                            <div>Canali: {playbook.allowedChannels.join(', ')}</div>
                          )}
                          {playbook.maxAttemptsPerDay && <div>Max: {playbook.maxAttemptsPerDay}/giorno</div>}
                          {playbook.slaHours && <div>SLA: {playbook.slaHours}h</div>}
                          {playbook.quietHoursStart && playbook.quietHoursEnd && (
                            <div>Quiet: {playbook.quietHoursStart} - {playbook.quietHoursEnd}</div>
                          )}
                          {playbook.escalationPattern && <div>Escalation: {playbook.escalationPattern}</div>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePlaybook(index)}
                        data-testid={`button-delete-playbook-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center gap-3 pt-4 border-t">
          <div className="text-sm text-gray-500">
            Tab {tabs.indexOf(activeTab) + 1} di {tabs.length}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
              data-testid="button-submit"
            >
              <Save className="h-4 w-4 mr-2" />
              Salva Template Pipeline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
