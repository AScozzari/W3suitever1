import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, TrendingUp, Users, Target, Sparkles, BarChart2, Workflow as WorkflowIcon, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Pipeline {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  stagesConfig: Array<{ order: number; name: string; category: string; color: string }>;
  activeDeals: number;
  totalValue: number;
  conversionRate: number;
}

interface Funnel {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  isActive: boolean;
  aiOrchestrationEnabled: boolean;
  totalLeads: number;
  conversionRate: number;
  avgJourneyDurationDays: number | null;
  pipelines: Pipeline[];
}

// ========================================
// ZOD SCHEMA FOR FUNNEL CREATION
// ========================================

const createFunnelSchema = z.object({
  name: z.string().min(3, 'Il nome deve contenere almeno 3 caratteri').max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido').default('#3b82f6'),
  aiOrchestrationEnabled: z.boolean().default(false),
  expectedDurationDays: z.number().int().min(1).max(365).optional()
});

type CreateFunnelInput = z.infer<typeof createFunnelSchema>;

// ========================================
// CREATE FUNNEL DIALOG COMPONENT
// ========================================

function CreateFunnelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const form = useForm<CreateFunnelInput>({
    resolver: zodResolver(createFunnelSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      aiOrchestrationEnabled: false,
      expectedDurationDays: undefined
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFunnelInput) => {
      return apiRequest('/api/crm/funnels', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/funnels'] });
      toast({
        title: 'Funnel creato',
        description: 'Il funnel è stato creato con successo'
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare il funnel',
        variant: 'destructive'
      });
    }
  });

  const onSubmit = (data: CreateFunnelInput) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Funnel</DialogTitle>
          <DialogDescription>
            Crea un nuovo customer journey funnel per orchestrare pipeline multi-stage
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Funnel *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="es. Lead to Customer Journey" 
                      {...field} 
                      data-testid="input-funnel-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi il customer journey..." 
                      {...field} 
                      data-testid="input-funnel-description"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colore</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input 
                          type="color" 
                          {...field} 
                          className="w-16 h-10"
                          data-testid="input-funnel-color"
                        />
                        <Input 
                          type="text" 
                          {...field} 
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedDurationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durata Prevista (giorni)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ''}
                        data-testid="input-funnel-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="aiOrchestrationEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">AI Orchestration</FormLabel>
                    <FormDescription>
                      Abilita l'intelligenza artificiale per ottimizzare il customer journey
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-ai-orchestration"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-funnel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                className="bg-windtre-orange hover:bg-windtre-orange/90 text-white"
                disabled={createMutation.isPending}
                data-testid="button-submit-funnel"
              >
                {createMutation.isPending ? 'Creazione...' : 'Crea Funnel'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// SUB-COMPONENTS FOR FUNNEL VIEWS
// ========================================

// Funnel Overview - Lista funnel con metriche aggregate
function FunnelOverview({ funnels, onCreateClick }: { funnels: Funnel[] | undefined; onCreateClick: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Funnel Overview</h2>
          <p className="text-sm text-gray-600 mt-1">
            Orchestrate multi-pipeline customer journeys with AI-powered insights
          </p>
        </div>
        <Button 
          onClick={onCreateClick}
          data-testid="button-create-funnel" 
          className="bg-windtre-orange hover:bg-windtre-orange/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Funnel
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="windtre-glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Funnels</p>
              <p className="text-2xl font-bold text-gray-900 mt-1" data-testid="text-active-funnels">
                {funnels?.filter(f => f.isActive).length || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="windtre-glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 mt-1" data-testid="text-total-leads">
                {funnels?.reduce((sum, f) => sum + f.totalLeads, 0) || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="windtre-glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Conversion</p>
              <p className="text-2xl font-bold text-gray-900 mt-1" data-testid="text-avg-conversion">
                {funnels && funnels.length > 0
                  ? Math.round(funnels.reduce((sum, f) => sum + f.conversionRate, 0) / funnels.length)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="windtre-glass-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AI Orchestrated</p>
              <p className="text-2xl font-bold text-gray-900 mt-1" data-testid="text-ai-funnels">
                {funnels?.filter(f => f.aiOrchestrationEnabled).length || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {!funnels || funnels.length === 0 ? (
          <Card className="windtre-glass-panel p-12">
            <div className="text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No funnels yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first customer journey funnel to orchestrate multi-stage conversion paths
              </p>
              <Button 
                onClick={onCreateClick}
                data-testid="button-create-first-funnel" 
                className="bg-windtre-orange hover:bg-windtre-orange/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Funnel
              </Button>
            </div>
          </Card>
        ) : (
          funnels.map(funnel => (
            <Card
              key={funnel.id}
              className="windtre-glass-panel p-6 hover:shadow-lg transition-shadow"
              data-testid={`card-funnel-${funnel.id}`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${funnel.color}20` }}
                    >
                      <Target className="w-6 h-6" style={{ color: funnel.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-funnel-name-${funnel.id}`}>
                          {funnel.name}
                        </h3>
                        {funnel.aiOrchestrationEnabled && (
                          <Badge className="bg-purple-100 text-purple-700">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Enabled
                          </Badge>
                        )}
                        {!funnel.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {funnel.description && (
                        <p className="text-sm text-gray-600 mt-1">{funnel.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600">Leads</p>
                      <p className="font-semibold text-gray-900">{funnel.totalLeads}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Conversion</p>
                      <p className="font-semibold text-gray-900">{funnel.conversionRate}%</p>
                    </div>
                    {funnel.avgJourneyDurationDays && (
                      <div className="text-center">
                        <p className="text-gray-600">Avg Duration</p>
                        <p className="font-semibold text-gray-900">{funnel.avgJourneyDurationDays}d</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Pipeline Journey</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {funnel.pipelines && funnel.pipelines.length > 0 ? (
                      funnel.pipelines.map((pipeline, idx) => (
                        <div key={pipeline.id} className="flex items-center gap-2 flex-shrink-0">
                          <Card
                            className="windtre-glass-panel p-3 min-w-[200px]"
                            data-testid={`card-pipeline-${pipeline.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm text-gray-900">{pipeline.name}</p>
                              <Badge variant="outline" className="text-xs">{pipeline.domain}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <span>{pipeline.stagesConfig.length} stages</span>
                              <span>•</span>
                              <span>{pipeline.activeDeals} deals</span>
                            </div>
                          </Card>
                          {idx < funnel.pipelines.length - 1 && (
                            <div className="flex items-center">
                              <div className="w-8 h-0.5 bg-gray-300" />
                              <div className="w-2 h-2 bg-gray-300 rounded-full ml-[-4px]" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No pipelines assigned yet</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Funnel Analytics - Sankey diagram, drop-off rates, AI insights
function FunnelAnalytics({ funnels }: { funnels: Funnel[] | undefined }) {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);

  // Auto-select first active funnel when data loads
  useEffect(() => {
    if (funnels && funnels.length > 0 && !selectedFunnelId) {
      const activeFunnel = funnels.find(f => f.isActive) || funnels[0];
      setSelectedFunnelId(activeFunnel.id);
    }
  }, [funnels, selectedFunnelId]);

  const selectedFunnel = funnels?.find(f => f.id === selectedFunnelId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Funnel Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Deep insights into conversion flows and bottleneck detection
          </p>
        </div>
      </div>

      {!funnels || funnels.length === 0 ? (
        <Card className="windtre-glass-panel p-12">
          <div className="text-center">
            <BarChart2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No analytics available</h3>
            <p className="text-gray-600">
              Create funnels first to see analytics and insights
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Funnel Selector */}
          <div className="flex gap-2 flex-wrap">
            {funnels.map(funnel => (
              <Button
                key={funnel.id}
                variant={selectedFunnelId === funnel.id ? "default" : "outline"}
                onClick={() => setSelectedFunnelId(funnel.id)}
                data-testid={`button-select-funnel-${funnel.id}`}
                className={selectedFunnelId === funnel.id ? "bg-windtre-orange hover:bg-windtre-orange/90 text-white" : ""}
              >
                <Target className="w-4 h-4 mr-2" style={{ color: funnel.color }} />
                {funnel.name}
              </Button>
            ))}
          </div>

          {selectedFunnel && (
            <div className="grid grid-cols-2 gap-6">
              <Card className="windtre-glass-panel p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Sankey Diagram</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Sankey visualization coming soon</p>
                    <p className="text-xs text-gray-400 mt-1">Flow from {selectedFunnel.pipelines.length} pipelines</p>
                  </div>
                </div>
              </Card>

              <Card className="windtre-glass-panel p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Drop-off Rates</h3>
                <div className="space-y-3" data-testid="container-dropoff-rates">
                  {selectedFunnel.pipelines.map((pipeline, idx) => (
                    <div 
                      key={pipeline.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`dropoff-pipeline-${pipeline.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900" data-testid={`text-pipeline-name-${pipeline.id}`}>
                            {pipeline.name}
                          </p>
                          <p className="text-xs text-gray-500" data-testid={`text-pipeline-stages-${pipeline.id}`}>
                            {pipeline.stagesConfig.length} stages
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900" data-testid={`text-conversion-rate-${pipeline.id}`}>
                          {pipeline.conversionRate}%
                        </p>
                        <p className="text-xs text-gray-500">conversion</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="windtre-glass-panel p-6 col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">AI Insights</h3>
                  {selectedFunnel.aiOrchestrationEnabled && (
                    <Badge className="bg-purple-100 text-purple-700">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Enabled
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Bottleneck Detection</p>
                        <p className="text-sm text-blue-700 mt-1">
                          AI analysis will identify conversion bottlenecks across pipeline stages
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Optimization Suggestions</p>
                        <p className="text-sm text-green-700 mt-1">
                          Recommended actions to improve conversion rates (Coming soon)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Funnel Builder - Drag & drop pipeline, configure triggers
function FunnelBuilder({ funnels, onCreateClick }: { funnels: Funnel[] | undefined; onCreateClick: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Funnel Builder</h2>
          <p className="text-sm text-gray-600 mt-1">
            Design customer journeys with drag & drop pipeline orchestration
          </p>
        </div>
        <Button 
          onClick={onCreateClick}
          data-testid="button-new-funnel-builder" 
          className="bg-windtre-orange hover:bg-windtre-orange/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Funnel
        </Button>
      </div>

      <Card className="windtre-glass-panel p-12">
        <div className="text-center">
          <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Funnel Builder Coming Soon</h3>
          <p className="text-gray-600 mb-6">
            Drag & drop interface to build multi-pipeline funnels with AI orchestration
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <div className="p-4 bg-blue-50 rounded-lg">
              <WorkflowIcon className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-blue-900">Drag & Drop</p>
              <p className="text-xs text-blue-700 mt-1">Reorder pipeline stages visually</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <GitBranch className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-sm font-medium text-green-900">Triggers</p>
              <p className="text-xs text-green-700 mt-1">Configure automated transitions</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-purple-900">AI Rules</p>
              <p className="text-xs text-purple-700 mt-1">Intelligent routing & scoring</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ========================================
// MAIN FUNNEL CONTENT COMPONENT
// ========================================

export function FunnelContent() {
  const tenantId = useRequiredTenantId();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'builder'>('overview');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: funnels, isLoading } = useQuery<Funnel[]>({
    queryKey: ['/api/crm/funnels'],
    enabled: !!tenantId
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md bg-white/30">
          <TabsTrigger 
            value="overview" 
            data-testid="tab-funnel-overview"
            className={`
              data-[state=active]:bg-windtre-orange 
              ${activeTab === 'overview' ? 'text-white font-semibold' : 'text-gray-700'}
            `}
          >
            <Target className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            data-testid="tab-funnel-analytics"
            className={`
              data-[state=active]:bg-windtre-orange 
              ${activeTab === 'analytics' ? 'text-white font-semibold' : 'text-gray-700'}
            `}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="builder" 
            data-testid="tab-funnel-builder"
            className={`
              data-[state=active]:bg-windtre-orange 
              ${activeTab === 'builder' ? 'text-white font-semibold' : 'text-gray-700'}
            `}
          >
            <WorkflowIcon className="w-4 h-4 mr-2" />
            Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <FunnelOverview funnels={funnels} onCreateClick={() => setCreateDialogOpen(true)} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <FunnelAnalytics funnels={funnels} />
        </TabsContent>

        <TabsContent value="builder" className="mt-6">
          <FunnelBuilder funnels={funnels} onCreateClick={() => setCreateDialogOpen(true)} />
        </TabsContent>
      </Tabs>

      <CreateFunnelDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}

// Default export for backward compatibility
export default FunnelContent;
