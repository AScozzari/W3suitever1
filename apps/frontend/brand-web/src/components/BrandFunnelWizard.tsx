import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Download, Sparkles, BarChart3, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const funnelWizardSchema = z.object({
  // Funnel Identity (5 fields)
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional().nullable(),
  color: z.string().optional().default('#3b82f6'),
  icon: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  
  // Journey Configuration (2 fields)
  pipelineOrder: z.string().optional().transform(val => 
    val ? val.split(',').map(s => s.trim()).filter(Boolean) : []
  ),
  expectedDurationDays: z.string().optional().nullable().transform(val => 
    val ? parseInt(val, 10) : null
  ),
  
  // AI Journey Orchestration (4 fields)
  aiOrchestrationEnabled: z.boolean().default(false),
  aiJourneyInsights: z.string().optional().nullable().transform(val => {
    if (!val?.trim()) return null;
    try { return JSON.parse(val); } catch { return val; }
  }),
  aiNextBestActionRules: z.string().optional().nullable().transform(val => {
    if (!val?.trim()) return null;
    try { return JSON.parse(val); } catch { return val; }
  }),
  aiScoringWeights: z.string().optional().nullable().transform(val => {
    if (!val?.trim()) return null;
    try { return JSON.parse(val); } catch { return val; }
  }),
  
  // Analytics & Metrics (4 fields - readonly in UI)
  totalLeads: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  conversionRate: z.string().optional().transform(val => val ? parseFloat(val) : 0),
  avgJourneyDurationDays: z.string().optional().nullable().transform(val => 
    val ? parseFloat(val) : null
  ),
  dropoffRate: z.string().optional().nullable().transform(val => 
    val ? parseFloat(val) : null
  ),
});

type FunnelWizardForm = z.input<typeof funnelWizardSchema>;

interface BrandFunnelWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: any) => void;
}

export default function BrandFunnelWizard({ open, onClose, onSave }: BrandFunnelWizardProps) {
  const [activeTab, setActiveTab] = useState('info');

  const form = useForm<FunnelWizardForm>({
    resolver: zodResolver(funnelWizardSchema),
    defaultValues: {
      name: '',
      description: null,
      color: '#3b82f6',
      icon: null,
      isActive: true,
      pipelineOrder: '',
      expectedDurationDays: '',
      aiOrchestrationEnabled: false,
      aiJourneyInsights: '',
      aiNextBestActionRules: '',
      aiScoringWeights: '',
      totalLeads: '0',
      conversionRate: '0',
      avgJourneyDurationDays: '',
      dropoffRate: '',
    },
  });

  const buildNormalizedTemplate = (data: any) => ({
    type: 'funnel_template',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    template: {
      // Funnel Identity (5 fields)
      name: data.name,
      description: data.description || null,
      color: data.color || '#3b82f6',
      icon: data.icon || null,
      isActive: data.isActive ?? true,
      
      // Journey Configuration (2 fields)
      pipelineOrder: data.pipelineOrder || [],
      expectedDurationDays: data.expectedDurationDays ?? null,
      
      // AI Journey Orchestration (4 fields)
      aiOrchestrationEnabled: data.aiOrchestrationEnabled ?? false,
      aiJourneyInsights: data.aiJourneyInsights || null,
      aiNextBestActionRules: data.aiNextBestActionRules || null,
      aiScoringWeights: data.aiScoringWeights || null,
      
      // Analytics & Metrics (4 fields)
      totalLeads: data.totalLeads ?? 0,
      conversionRate: data.conversionRate ?? 0,
      avgJourneyDurationDays: data.avgJourneyDurationDays ?? null,
      dropoffRate: data.dropoffRate ?? null,
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    try {
      const normalizedTemplate = buildNormalizedTemplate(data);

      onSave(normalizedTemplate);
      
      toast({
        title: "Funnel Template Creato",
        description: `Template "${data.name}" pronto per deployment`,
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error('Funnel wizard submission error:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il template funnel",
        variant: "destructive",
      });
    }
  });

  const handleExportJSON = async () => {
    try {
      // Trigger validation and get transformed values
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validazione Fallita",
          description: "Correggi gli errori prima di esportare",
          variant: "destructive",
        });
        return;
      }

      // Get validated and transformed data
      const rawData = form.getValues();
      const schema = funnelWizardSchema;
      const parsedData = schema.parse(rawData);
      
      const normalizedTemplate = buildNormalizedTemplate(parsedData);

      const blob = new Blob([JSON.stringify(normalizedTemplate, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `funnel_${parsedData.name?.toLowerCase().replace(/\s+/g, '_') || 'template'}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Completato",
        description: `Template "${parsedData.name}" esportato con successo`,
      });
    } catch (error) {
      console.error('JSON export error:', error);
      toast({
        title: "Errore Export",
        description: "Impossibile esportare il template. Verifica i campi JSON.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-gradient-to-br from-white to-blue-50">
        <DialogHeader className="px-6 py-4 border-b bg-white/80 backdrop-blur-sm">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Crea Funnel Template
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Configura customer journey multi-pipeline per deployment centralizzato (15 campi)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid grid-cols-4 bg-white/60 backdrop-blur-sm">
              <TabsTrigger value="info" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Info Base
              </TabsTrigger>
              <TabsTrigger value="journey" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" />
                Journey
              </TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Orchestration
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="flex-1 overflow-y-auto space-y-6 py-6 px-6">
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Funnel Identity</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">Nome Funnel <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="es. B2B Enterprise Journey"
                      className="bg-white border-gray-300"
                      data-testid="input-funnel-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-700">Descrizione</Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Descrivi la customer journey e obiettivi strategici..."
                      className="bg-white border-gray-300 min-h-[100px]"
                      data-testid="textarea-funnel-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color" className="text-gray-700">Colore Funnel</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color"
                          type="color"
                          {...form.register('color')}
                          className="w-16 h-10 p-1 bg-white border-gray-300"
                          data-testid="input-funnel-color"
                        />
                        <Input
                          type="text"
                          {...form.register('color')}
                          placeholder="#3b82f6"
                          className="flex-1 bg-white border-gray-300"
                          data-testid="input-funnel-color-hex"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Colore visualizzazione funnel (default: blue-500)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="icon" className="text-gray-700">Icona Lucide</Label>
                      <Input
                        id="icon"
                        {...form.register('icon')}
                        placeholder="es. Zap, Target, TrendingUp"
                        className="bg-white border-gray-300"
                        data-testid="input-funnel-icon"
                      />
                      <p className="text-xs text-gray-500">Nome icona da lucide-react (opzionale)</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700">Funnel Attivo</Label>
                      <p className="text-sm text-gray-500">Abilita funnel per uso immediato</p>
                    </div>
                    <Switch
                      checked={form.watch('isActive')}
                      onCheckedChange={(val) => form.setValue('isActive', val)}
                      data-testid="switch-funnel-active"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="journey" className="flex-1 overflow-y-auto space-y-6 py-6 px-6">
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Journey Configuration</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pipeline-order" className="text-gray-700">Pipeline Order (IDs)</Label>
                    <Input
                      id="pipeline-order"
                      {...form.register('pipelineOrder')}
                      placeholder="es. {lead_gen_pipeline}, {qualification_pipeline}, {closing_pipeline}"
                      className="bg-white border-gray-300"
                      data-testid="input-pipeline-order"
                    />
                    <p className="text-xs text-gray-500">Placeholder IDs pipelines nell'ordine del journey (comma-separated)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected-duration" className="text-gray-700">Durata Attesa (giorni)</Label>
                    <Input
                      id="expected-duration"
                      type="number"
                      {...form.register('expectedDurationDays')}
                      placeholder="es. 90"
                      className="bg-white border-gray-300"
                      data-testid="input-expected-duration"
                    />
                    <p className="text-xs text-gray-500">Durata media attesa journey completo (opzionale)</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="flex-1 overflow-y-auto space-y-6 py-6 px-6">
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">AI Journey Orchestration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700">AI Orchestration Enabled</Label>
                      <p className="text-sm text-gray-500">Abilita routing AI tra pipeline del funnel</p>
                    </div>
                    <Switch
                      checked={form.watch('aiOrchestrationEnabled')}
                      onCheckedChange={(val) => form.setValue('aiOrchestrationEnabled', val)}
                      data-testid="switch-ai-orchestration"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-journey-insights" className="text-gray-700">AI Journey Insights (JSON)</Label>
                    <Textarea
                      id="ai-journey-insights"
                      {...form.register('aiJourneyInsights')}
                      placeholder='{"bottlenecks": ["stage_x"], "optimizations": ["reduce_qualification_time"]}'
                      className="bg-white border-gray-300 min-h-[80px] font-mono text-xs"
                      data-testid="textarea-ai-insights"
                    />
                    <p className="text-xs text-gray-500">AI-generated insights: bottlenecks, optimizations, predictions (opzionale)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-nba-rules" className="text-gray-700">AI Next Best Action Rules (JSON)</Label>
                    <Textarea
                      id="ai-nba-rules"
                      {...form.register('aiNextBestActionRules')}
                      placeholder='{"move_to_pipeline": "qualification", "trigger_workflow": "nurture_sequence"}'
                      className="bg-white border-gray-300 min-h-[80px] font-mono text-xs"
                      data-testid="textarea-ai-nba-rules"
                    />
                    <p className="text-xs text-gray-500">Regole AI routing tra pipeline (opzionale)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-scoring-weights" className="text-gray-700">AI Scoring Weights (JSON)</Label>
                    <Textarea
                      id="ai-scoring-weights"
                      {...form.register('aiScoringWeights')}
                      placeholder='{"engagement": 0.4, "firmographic": 0.3, "behavioral": 0.3}'
                      className="bg-white border-gray-300 min-h-[80px] font-mono text-xs"
                      data-testid="textarea-ai-scoring-weights"
                    />
                    <p className="text-xs text-gray-500">Pesi lead scoring contestuali al funnel (opzionale)</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="flex-1 overflow-y-auto space-y-6 py-6 px-6">
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Analytics & Metrics</h3>
                <p className="text-sm text-gray-500 mb-4">
                  ℹ️ Questi campi sono auto-calcolati dal sistema. Valori iniziali opzionali per seeding.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="total-leads" className="text-gray-700">Total Leads (Iniziale)</Label>
                      <Input
                        id="total-leads"
                        type="number"
                        {...form.register('totalLeads')}
                        placeholder="0"
                        className="bg-gray-50 border-gray-300"
                        data-testid="input-total-leads"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conversion-rate" className="text-gray-700">Conversion Rate (Iniziale %)</Label>
                      <Input
                        id="conversion-rate"
                        type="number"
                        step="0.01"
                        {...form.register('conversionRate')}
                        placeholder="0.00"
                        className="bg-gray-50 border-gray-300"
                        data-testid="input-conversion-rate"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="avg-journey-duration" className="text-gray-700">Avg Journey Duration (giorni)</Label>
                      <Input
                        id="avg-journey-duration"
                        type="number"
                        step="0.1"
                        {...form.register('avgJourneyDurationDays')}
                        placeholder="Calcolato automaticamente"
                        className="bg-gray-50 border-gray-300"
                        data-testid="input-avg-journey-duration"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dropoff-rate" className="text-gray-700">Dropoff Rate (%)</Label>
                      <Input
                        id="dropoff-rate"
                        type="number"
                        step="0.01"
                        {...form.register('dropoffRate')}
                        placeholder="Calcolato automaticamente"
                        className="bg-gray-50 border-gray-300"
                        data-testid="input-dropoff-rate"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="px-6 py-4 border-t bg-white/80 backdrop-blur-sm flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportJSON}
              data-testid="button-export-json"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                data-testid="button-save-funnel"
              >
                Salva Template Funnel
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
