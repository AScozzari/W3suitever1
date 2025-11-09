import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, TrendingUp, Users, Target, Sparkles, BarChart2, Workflow as WorkflowIcon, GitBranch, Eye, Archive, Trash2, AlertTriangle, Edit, Save, X, Search, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useFunnelBuilder, type FunnelPipeline } from './hooks/useFunnelBuilder';
import { PipelineSettingsDialog } from '@/components/crm/PipelineSettingsDialog';
import { FunnelSettingsDialog } from '@/components/crm/FunnelSettingsDialog';
import { FunnelAnalytics } from '@/components/crm/FunnelAnalytics';

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
      console.log('[FUNNEL-CREATE] Sending data:', data);
      const response = await apiRequest('/api/crm/funnels', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('[FUNNEL-CREATE] Response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('[FUNNEL-CREATE] Success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/crm/funnels'] });
      toast({
        title: '✅ Funnel creato',
        description: `Il funnel "${data?.name || 'nuovo'}" è stato creato con successo`
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('[FUNNEL-CREATE] Error:', error);
      const errorMessage = error?.message || error?.error || 'Impossibile creare il funnel';
      toast({
        title: '❌ Errore creazione funnel',
        description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
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
function FunnelOverview({ funnels }: { funnels: Funnel[] | undefined }) {
  const { toast } = useToast();
  const [viewFunnel, setViewFunnel] = useState<Funnel | null>(null);
  const [deleteFunnel, setDeleteFunnel] = useState<Funnel | null>(null);
  const [settingsFunnel, setSettingsFunnel] = useState<Funnel | null>(null);

  const archiveMutation = useMutation({
    mutationFn: async (funnelId: string) => {
      return apiRequest(`/api/crm/funnels/${funnelId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/funnels'] });
      toast({
        title: '📦 Funnel archiviato',
        description: 'Il funnel è stato archiviato con successo'
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Errore',
        description: error?.message || 'Impossibile archiviare il funnel',
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (funnelId: string) => {
      return apiRequest(`/api/crm/funnels/${funnelId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/funnels'] });
      setDeleteFunnel(null);
      toast({
        title: '🗑️ Funnel eliminato',
        description: 'Il funnel è stato eliminato definitivamente'
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Errore',
        description: error?.message || 'Impossibile eliminare il funnel',
        variant: 'destructive'
      });
    }
  });

  const handleDeleteConfirm = async () => {
    if (!deleteFunnel) return;

    // Check if there are active deals
    const hasActiveDeals = deleteFunnel.totalLeads > 0;

    if (hasActiveDeals) {
      // Archive instead of delete
      archiveMutation.mutate(deleteFunnel.id);
      setDeleteFunnel(null);
    } else {
      // Delete permanently
      deleteMutation.mutate(deleteFunnel.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Funnel Overview</h2>
          <p className="text-sm text-gray-600 mt-1">
            Orchestrate multi-pipeline customer journeys with AI-powered insights
          </p>
        </div>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun funnel configurato</h3>
              <p className="text-gray-600">
                Vai alla tab "Builder" per creare il tuo primo funnel multi-pipeline
              </p>
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
                          <Badge variant="secondary">Archiviato</Badge>
                        )}
                      </div>
                      {funnel.description && (
                        <p className="text-sm text-gray-600 mt-1">{funnel.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4 text-sm mr-4">
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSettingsFunnel(funnel)}
                        data-testid={`button-settings-funnel-${funnel.id}`}
                        title="Impostazioni Workflow"
                      >
                        <Settings2 className="w-4 h-4 text-windtre-purple" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewFunnel(funnel)}
                        data-testid={`button-view-funnel-${funnel.id}`}
                        title="Visualizza dettagli"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {funnel.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveMutation.mutate(funnel.id)}
                          disabled={archiveMutation.isPending}
                          data-testid={`button-archive-funnel-${funnel.id}`}
                          title="Archivia funnel"
                        >
                          <Archive className="w-4 h-4 text-gray-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteFunnel(funnel)}
                        data-testid={`button-delete-funnel-${funnel.id}`}
                        title="Elimina funnel"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Pipeline Journey - Stage Flow</p>
                  <div className="space-y-3">
                    {funnel.pipelines && funnel.pipelines.length > 0 ? (
                      funnel.pipelines.map((pipeline, pipelineIdx) => (
                        <div key={pipeline.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-gray-600 uppercase">{pipeline.name}</p>
                            <Badge variant="outline" className="text-xs">{pipeline.domain}</Badge>
                          </div>
                          <div className="flex items-center gap-1 overflow-x-auto pb-2" data-testid={`pipeline-stages-${pipeline.id}`}>
                            {pipeline.stagesConfig
                              .sort((a, b) => a.order - b.order)
                              .map((stage, stageIdx) => (
                                <div key={`${pipeline.id}-${stage.order}`} className="flex items-center gap-1 flex-shrink-0">
                                  <div
                                    className="px-4 py-2 rounded-lg text-white text-xs font-medium min-w-[120px] text-center shadow-sm"
                                    style={{ 
                                      backgroundColor: stage.color || '#3b82f6',
                                      boxShadow: `0 2px 8px ${stage.color}33`
                                    }}
                                    data-testid={`stage-${pipeline.id}-${stage.order}`}
                                  >
                                    {stage.name}
                                  </div>
                                  {stageIdx < pipeline.stagesConfig.length - 1 && (
                                    <svg width="16" height="16" viewBox="0 0 16 16" className="flex-shrink-0">
                                      <path d="M 4 8 L 12 8 M 9 5 L 12 8 L 9 11" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                              ))}
                          </div>
                          {pipelineIdx < funnel.pipelines.length - 1 && (
                            <div className="flex items-center gap-2 py-2">
                              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300" />
                              <span className="text-xs text-gray-500 font-medium px-2">NEXT PIPELINE</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300" />
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

      {/* View Funnel Dialog */}
      <Dialog open={!!viewFunnel} onOpenChange={() => setViewFunnel(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${viewFunnel?.color}20` }}
              >
                <Target className="w-5 h-5" style={{ color: viewFunnel?.color }} />
              </div>
              {viewFunnel?.name}
            </DialogTitle>
            <DialogDescription>
              Dettagli completi del funnel e pipeline associate
            </DialogDescription>
          </DialogHeader>

          {viewFunnel && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Descrizione</p>
                  <p className="text-sm text-gray-900 mt-1">{viewFunnel.description || 'Nessuna descrizione'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-sm text-gray-900 mt-1">{viewFunnel.isActive ? 'Attivo' : 'Archiviato'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Leads Totali</p>
                  <p className="text-sm text-gray-900 mt-1">{viewFunnel.totalLeads}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-sm text-gray-900 mt-1">{viewFunnel.conversionRate}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Orchestration</p>
                  <p className="text-sm text-gray-900 mt-1">{viewFunnel.aiOrchestrationEnabled ? 'Abilitata' : 'Disabilitata'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Durata Media Journey</p>
                  <p className="text-sm text-gray-900 mt-1">{viewFunnel.avgJourneyDurationDays ? `${viewFunnel.avgJourneyDurationDays} giorni` : 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">Pipeline Associate ({viewFunnel.pipelines?.length || 0})</p>
                {viewFunnel.pipelines && viewFunnel.pipelines.length > 0 ? (
                  <div className="space-y-3">
                    {viewFunnel.pipelines.map(pipeline => (
                      <Card key={pipeline.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">{pipeline.name}</p>
                          <Badge variant="outline">{pipeline.domain}</Badge>
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto pb-2">
                          {pipeline.stagesConfig.sort((a, b) => a.order - b.order).map((stage, idx) => (
                            <div key={`${pipeline.id}-${stage.order}`} className="flex items-center gap-1">
                              <div
                                className="px-3 py-1.5 rounded text-white text-xs font-medium min-w-[100px] text-center"
                                style={{ backgroundColor: stage.color || '#3b82f6' }}
                              >
                                {stage.name}
                              </div>
                              {idx < pipeline.stagesConfig.length - 1 && (
                                <svg width="12" height="12" viewBox="0 0 16 16" className="flex-shrink-0">
                                  <path d="M 4 8 L 12 8 M 9 5 L 12 8 L 9 11" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nessuna pipeline associata</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewFunnel(null)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Funnel Settings Dialog */}
      {settingsFunnel && (
        <FunnelSettingsDialog
          open={!!settingsFunnel}
          onClose={() => setSettingsFunnel(null)}
          funnelId={settingsFunnel.id}
          funnelName={settingsFunnel.name}
        />
      )}

      {/* Delete/Archive Funnel Alert Dialog */}
      <AlertDialog open={!!deleteFunnel} onOpenChange={() => setDeleteFunnel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              {deleteFunnel && deleteFunnel.totalLeads > 0 
                ? 'Funnel con lead attive - Verrà archiviato'
                : 'Conferma eliminazione funnel'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteFunnel && deleteFunnel.totalLeads > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-orange-600">
                    ⚠️ Questo funnel ha {deleteFunnel.totalLeads} lead attive
                  </p>
                  <p>
                    Per proteggere i dati, il funnel verrà <strong>archiviato</strong> invece di essere eliminato.
                    Potrai riattivarlo in qualsiasi momento o eliminarlo quando non ci saranno più lead associate.
                  </p>
                </div>
              ) : (
                <p>
                  Sei sicuro di voler eliminare il funnel "<strong>{deleteFunnel?.name}</strong>"?
                  Questa azione è irreversibile e rimuoverà tutte le configurazioni associate.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteFunnel(null)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={deleteFunnel && deleteFunnel.totalLeads > 0 
                ? "bg-orange-600 hover:bg-orange-700" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {deleteFunnel && deleteFunnel.totalLeads > 0 ? '📦 Archivia' : '🗑️ Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// FunnelAnalytics component is now imported from @/components/crm/FunnelAnalytics
// The enterprise-grade analytics dashboard includes:
// - KPI overview cards
// - Stage performance table with bottleneck detection
// - Channel effectiveness heatmap
// - Time-to-close distribution
// - Drop-off waterfall analysis
// - Campaign attribution with ROI
// - AI impact comparison

// ========================================
// BUILDER TAB COMPONENTS
// ========================================

// Draggable Pipeline Card (for available pipelines list)
function DraggablePipelineCard({ pipeline, onEdit }: { pipeline: Pipeline; onEdit?: (pipeline: Pipeline) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pipeline.id,
    data: { type: 'pipeline', pipeline }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="windtre-glass-panel p-3 rounded-lg hover:shadow-md transition-shadow border-2 border-transparent hover:border-windtre-orange/30"
      data-testid={`draggable-pipeline-${pipeline.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div 
          className="flex-1 cursor-grab active:cursor-grabbing"
          {...listeners}
          {...attributes}
        >
          <p className="font-medium text-gray-900 text-sm">{pipeline.name}</p>
          <Badge variant="outline" className="text-xs mt-1">{pipeline.domain}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            {pipeline.stagesConfig.length} stages
          </Badge>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(pipeline);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              data-testid={`button-edit-pipeline-${pipeline.id}`}
              title="Modifica pipeline"
              className="h-9 w-9 p-0 cursor-pointer hover:bg-gray-100 shrink-0"
            >
              <Edit className="w-6 h-6 text-gray-600 hover:text-windtre-orange" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        {pipeline.stagesConfig.slice(0, 3).map(stage => (
          <div
            key={stage.order}
            className="w-6 h-6 rounded"
            style={{ backgroundColor: stage.color }}
            title={stage.name}
          />
        ))}
        {pipeline.stagesConfig.length > 3 && (
          <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600">
            +{pipeline.stagesConfig.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}

// Sortable Funnel Pipeline Card (for canvas)
function SortableFunnelPipelineCard({ 
  pipeline, 
  pipelineDetails, 
  isExpanded,
  onToggleExpand,
  onRemove 
}: { 
  pipeline: FunnelPipeline; 
  pipelineDetails?: Pipeline;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pipeline.pipelineId
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="windtre-glass-panel p-4 rounded-lg border-2 border-windtre-orange/30"
      data-testid={`canvas-pipeline-${pipeline.pipelineId}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded">
            <WorkflowIcon className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{pipeline.pipelineName}</p>
            <p className="text-xs text-gray-500">{pipeline.stagesCount} stages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pipelineDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              data-testid={`button-expand-stages-${pipeline.pipelineId}`}
              title={isExpanded ? 'Nascondi stage' : 'Mostra stage'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            data-testid={`button-remove-pipeline-${pipeline.pipelineId}`}
          >
            <X className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>

      {/* Collapsible Stages List */}
      {isExpanded && pipelineDetails && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs font-medium text-gray-600 uppercase mb-3">Pipeline Stages</p>
          <div className="space-y-2">
            {pipelineDetails.stagesConfig
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <div
                  key={stage.order}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/30"
                  data-testid={`stage-item-${stage.order}`}
                >
                  <div
                    className="w-8 h-8 rounded flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{stage.name}</p>
                    <p className="text-xs text-gray-500">{stage.category}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    #{stage.order + 1}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Funnel Builder - Drag & drop pipeline, configure triggers
function FunnelBuilder({ funnels, onCreateClick }: { funnels: Funnel[] | undefined; onCreateClick: () => void }) {
  const { toast } = useToast();
  const builder = useFunnelBuilder();
  const [searchQuery, setSearchQuery] = useState('');
  const [pipelineSearchQuery, setPipelineSearchQuery] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Initialize builder in create mode on mount (only once)
  useEffect(() => {
    if (!initializedRef.current) {
      builder.startCreate();
      initializedRef.current = true;
    }
  }, [builder]);

  // Fetch all available pipelines
  const { data: allPipelines } = useQuery<Pipeline[]>({
    queryKey: ['/api/crm/pipelines']
  });

  const handleEditFunnel = (funnel: Funnel) => {
    if (builder.state.isDirty) {
      setUnsavedChangesDialog(true);
      return;
    }

    const funnelPipelines: FunnelPipeline[] = funnel.pipelines.map((p, idx) => ({
      pipelineId: p.id,
      pipelineName: p.name,
      stageOrder: idx,
      stagesCount: p.stagesConfig.length,
      color: p.stagesConfig[0]?.color
    }));

    builder.loadFunnel({
      id: funnel.id,
      name: funnel.name,
      description: funnel.description || '',
      color: funnel.color,
      aiEnabled: funnel.aiOrchestrationEnabled,
      estimatedDuration: funnel.avgJourneyDurationDays || 30,
      pipelines: funnelPipelines
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  // Get the active pipeline being dragged
  const activePipeline = activeDragId 
    ? allPipelines?.find(p => p.id === activeDragId)
    : null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    // Check if dragging from pipeline list to canvas
    if (active.data.current?.type === 'pipeline' && over.id === 'canvas-dropzone') {
      const pipeline = active.data.current.pipeline as Pipeline;
      builder.addPipeline({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        stageOrder: builder.state.pipelines.length,
        stagesCount: pipeline.stagesConfig.length,
        color: pipeline.stagesConfig[0]?.color
      });
      return;
    }

    // Check if reordering within canvas
    if (active.id !== over.id && builder.state.pipelines.find(p => p.pipelineId === active.id)) {
      const oldIndex = builder.state.pipelines.findIndex(p => p.pipelineId === active.id);
      const newIndex = builder.state.pipelines.findIndex(p => p.pipelineId === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(builder.state.pipelines, oldIndex, newIndex);
        builder.reorderPipelines(reordered);
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // DEBUG: Log what we're about to save
      console.log('[FUNNEL-SAVE] Current builder state:', {
        mode: builder.state.mode,
        funnelId: builder.state.funnelId,
        pipelines: builder.state.pipelines,
        pipelineCount: builder.state.pipelines.length,
        pipelineIds: builder.state.pipelines.map(p => p.pipelineId)
      });

      const payload = {
        name: builder.state.funnelName,
        description: builder.state.description,
        color: builder.state.color,
        aiOrchestrationEnabled: builder.state.aiEnabled,
        expectedDurationDays: builder.state.estimatedDuration,
        pipelineIds: builder.state.pipelines.map(p => p.pipelineId),
        // Also include full pipeline objects for better backend sync
        pipelines: builder.state.pipelines
      };

      console.log('[FUNNEL-SAVE] Sending payload:', payload);

      if (builder.state.mode === 'create') {
        return apiRequest('/api/crm/funnels', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        const response = await apiRequest(`/api/crm/funnels/${builder.state.funnelId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        console.log('[FUNNEL-SAVE] Response:', response);
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/funnels'] });
      builder.clearDirty();
      toast({
        title: '✅ Funnel salvato',
        description: `Il funnel "${builder.state.funnelName}" è stato salvato con successo`
      });
      
      // Reset builder only in create mode, not in edit mode
      if (builder.state.mode === 'create') {
        builder.startCreate();
      }
    },
    onError: (error: any) => {
      toast({
        title: '❌ Errore',
        description: error?.message || 'Impossibile salvare il funnel',
        variant: 'destructive'
      });
    }
  });

  // Separate mutation for saving pipeline associations
  const savePipelinesMutation = useMutation({
    mutationFn: async () => {
      if (!builder.state.funnelId) {
        throw new Error('Funnel ID is required');
      }

      const payload = {
        pipelines: builder.state.pipelines.map(p => ({
          pipelineId: p.pipelineId,
          stageOrder: p.stageOrder
        }))
      };

      console.log('[FUNNEL-PIPELINES-SAVE] Saving associations:', payload);

      return apiRequest(`/api/crm/funnels/${builder.state.funnelId}/pipelines`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (data) => {
      console.log('[FUNNEL-PIPELINES-SAVE] Success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/crm/funnels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines'] });
      builder.clearDirty();
      toast({
        title: '✅ Pipeline salvate',
        description: `Associazioni pipeline aggiornate con successo`
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Errore',
        description: error?.message || 'Impossibile salvare le pipeline',
        variant: 'destructive'
      });
    }
  });

  const filteredFunnels = funnels?.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group pipelines: only show pipelines NOT in the funnel, with search filter
  const pipelinesInFunnel = new Set(builder.state.pipelines.map(p => p.pipelineId));
  const availablePipelines = allPipelines
    ?.filter(p => !pipelinesInFunnel.has(p.id))
    .filter(p => 
      pipelineSearchQuery === '' || 
      p.name.toLowerCase().includes(pipelineSearchQuery.toLowerCase()) ||
      p.domain.toLowerCase().includes(pipelineSearchQuery.toLowerCase())
    ) || [];

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Funnel Builder</h2>
            {builder.state.mode === 'create' ? (
              <Input
                placeholder="Enter funnel name..."
                value={builder.state.funnelName}
                onChange={(e) => builder.updateMetadata({ funnelName: e.target.value })}
                className="max-w-sm"
                data-testid="input-funnel-name"
              />
            ) : (
              <p className="text-sm text-gray-600">Editing: {builder.state.funnelName}</p>
            )}
          </div>
          <div className="flex gap-2">
            {builder.state.mode === 'create' && builder.state.pipelines.length > 0 && (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !builder.state.funnelName}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-create-funnel"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Creating...' : 'Create Funnel'}
              </Button>
            )}
            {builder.state.mode === 'edit' && builder.state.isDirty && (
              <>
                <Button
                  variant="outline"
                  onClick={() => builder.reset()}
                  data-testid="button-cancel-changes"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-save-funnel"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
            <Button 
              onClick={onCreateClick}
              data-testid="button-new-funnel-builder" 
              className="bg-windtre-orange hover:bg-windtre-orange/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Funnel
            </Button>
          </div>
        </div>

        {/* Three-Panel Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-300px)]">
          {/* LEFT: Funnel Library */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            <Card className="windtre-glass-panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Funnel Library</h3>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search funnels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-funnels"
                />
              </div>
              <div className="space-y-2">
                {filteredFunnels?.map(funnel => (
                  <div
                    key={funnel.id}
                    className={`windtre-glass-panel p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow border-2 ${
                      builder.state.funnelId === funnel.id
                        ? 'border-windtre-orange'
                        : 'border-transparent'
                    }`}
                    onClick={() => handleEditFunnel(funnel)}
                    data-testid={`funnel-library-item-${funnel.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: funnel.color }}
                        />
                        <p className="font-medium text-sm text-gray-900">{funnel.name}</p>
                      </div>
                      {funnel.aiOrchestrationEnabled && (
                        <Sparkles className="w-3 h-3 text-purple-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Badge variant="secondary" className="text-xs">
                        {funnel.pipelines.length} pipelines
                      </Badge>
                      <span>{funnel.totalLeads} leads</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* CENTER: Canvas */}
          <div className="col-span-6">
            <CanvasDropzone
              pipelines={builder.state.pipelines}
              allPipelines={allPipelines}
              expandedPipelines={expandedPipelines}
              onToggleExpand={(pipelineId) => {
                setExpandedPipelines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(pipelineId)) {
                    newSet.delete(pipelineId);
                  } else {
                    newSet.add(pipelineId);
                  }
                  return newSet;
                });
              }}
              onRemove={(pipelineId) => builder.removePipeline(pipelineId)}
            />
          </div>

          {/* RIGHT: Available Pipelines */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            <Card className="windtre-glass-panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <WorkflowIcon className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Available Pipelines</h3>
              </div>
              
              {/* Search Field */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search pipelines..."
                  value={pipelineSearchQuery}
                  onChange={(e) => setPipelineSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-pipelines"
                />
              </div>
              
              {availablePipelines.length > 0 ? (
                <div className="space-y-3">
                  {availablePipelines.map(pipeline => (
                    <DraggablePipelineCard 
                      key={pipeline.id} 
                      pipeline={pipeline}
                      onEdit={(p) => setEditingPipeline(p)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  {pipelineSearchQuery !== '' 
                    ? 'Nessuna pipeline trovata'
                    : allPipelines?.length === 0 
                      ? 'Nessuna pipeline disponibile' 
                      : 'Tutte le pipeline sono già nel funnel'}
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifiche non salvate</AlertDialogTitle>
            <AlertDialogDescription>
              Hai modifiche non salvate. Vuoi procedere senza salvare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              builder.reset();
              setUnsavedChangesDialog(false);
            }}>
              Procedi senza salvare
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drag Overlay - shows pipeline card during drag */}
      <DragOverlay>
        {activePipeline && (
          <div className="windtre-glass-panel p-3 rounded-lg shadow-2xl border-2 border-windtre-orange rotate-3 opacity-90">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900 text-sm">{activePipeline.name}</p>
                <Badge variant="outline" className="text-xs mt-1">{activePipeline.domain}</Badge>
              </div>
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                {activePipeline.stagesConfig.length} stages
              </Badge>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {activePipeline.stagesConfig.slice(0, 3).map(stage => (
                <div
                  key={stage.order}
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: stage.color }}
                  title={stage.name}
                />
              ))}
              {activePipeline.stagesConfig.length > 3 && (
                <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                  +{activePipeline.stagesConfig.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Pipeline Settings Dialog */}
      {editingPipeline && (
        <PipelineSettingsDialog
          open={!!editingPipeline}
          onClose={() => {
            setEditingPipeline(null);
            // Refresh pipelines list after edit
            queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines'] });
          }}
          pipelineId={editingPipeline.id}
        />
      )}
    </DndContext>
  );
}

// Canvas Dropzone Component
function CanvasDropzone({ 
  pipelines, 
  allPipelines,
  expandedPipelines,
  onToggleExpand,
  onRemove 
}: { 
  pipelines: FunnelPipeline[]; 
  allPipelines?: Pipeline[];
  expandedPipelines: Set<string>;
  onToggleExpand: (pipelineId: string) => void;
  onRemove: (pipelineId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-dropzone'
  });

  return (
    <Card
      ref={setNodeRef}
      className={`windtre-glass-panel p-6 h-full ${isOver ? 'border-4 border-windtre-orange border-dashed' : ''}`}
      data-testid="canvas-dropzone"
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Funnel Journey Canvas</h3>
      </div>

      {pipelines.length === 0 ? (
        <div className="h-full flex items-center justify-center text-center py-12">
          <div>
            <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Drag pipelines here to start building</p>
            <p className="text-sm text-gray-500">
              Drag & drop pipelines from the right panel to create your customer journey
            </p>
          </div>
        </div>
      ) : (
        <SortableContext items={pipelines.map(p => p.pipelineId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {pipelines.map(pipeline => {
              const pipelineDetails = allPipelines?.find(p => p.id === pipeline.pipelineId);
              return (
                <SortableFunnelPipelineCard
                  key={pipeline.pipelineId}
                  pipeline={pipeline}
                  pipelineDetails={pipelineDetails}
                  isExpanded={expandedPipelines.has(pipeline.pipelineId)}
                  onToggleExpand={() => onToggleExpand(pipeline.pipelineId)}
                  onRemove={() => onRemove(pipeline.pipelineId)}
                />
              );
            })}
          </div>
        </SortableContext>
      )}
    </Card>
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
          <FunnelOverview funnels={funnels} />
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
