import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { BusinessHoursEditor, BusinessHours } from './BusinessHoursEditor';
import { Bot, CheckCircle2, AlertCircle, Clock, PhoneForwarded, Loader2 } from 'lucide-react';

interface TrunkAIConfigDialogProps {
  trunk: any | null;
  extensions: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const aiConfigSchema = z.object({
  aiAgentEnabled: z.boolean(),
  aiAgentRef: z.string().nullable(),
  aiTimePolicy: z.any().nullable(),
  aiFailoverExtension: z.string().nullable()
});

type AIConfigValues = z.infer<typeof aiConfigSchema>;

export function TrunkAIConfigDialog({ trunk, extensions, open, onOpenChange }: TrunkAIConfigDialogProps) {
  const { toast } = useToast();
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);

  // Fetch AI agents from Brand Interface registry (future enhancement)
  const { data: aiAgents = [] } = useQuery<any[]>({
    queryKey: ['/api/brand-interface/ai-agents'],
    enabled: open,
    // Fallback: hardcoded for now until Brand Interface integration
    initialData: [
      { id: 'customer-care-voice', name: 'Customer Care Voice Assistant', moduleContext: 'support' }
    ]
  });

  const form = useForm<AIConfigValues>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      aiAgentEnabled: trunk?.aiAgentEnabled || false,
      aiAgentRef: trunk?.aiAgentRef || null,
      aiTimePolicy: trunk?.aiTimePolicy || null,
      aiFailoverExtension: trunk?.aiFailoverExtension || null
    }
  });

  useEffect(() => {
    if (trunk) {
      form.reset({
        aiAgentEnabled: trunk.aiAgentEnabled || false,
        aiAgentRef: trunk.aiAgentRef || null,
        aiTimePolicy: trunk.aiTimePolicy || null,
        aiFailoverExtension: trunk.aiFailoverExtension || null
      });
      setBusinessHours(trunk.aiTimePolicy);
    }
  }, [trunk, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: AIConfigValues) => {
      return apiRequest('PATCH', `/api/voip/trunks/${trunk.id}/ai-config`, data);
    },
    onSuccess: (response) => {
      const syncStatus = response?.data?.edgvoipSync;
      
      if (syncStatus?.success) {
        toast({
          title: "✅ Configurazione salvata",
          description: "AI config sincronizzata con edgvoip con successo",
        });
      } else {
        toast({
          title: "⚠️ Salvato localmente",
          description: `Configurazione salvata ma sync edgvoip fallito: ${syncStatus?.error || 'Unknown error'}`,
          variant: "destructive"
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/voip/trunks'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare configurazione AI",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: AIConfigValues) => {
    updateMutation.mutate({
      ...data,
      aiTimePolicy: businessHours
    });
  };

  const formatSyncTime = (timestamp: string | null) => {
    if (!timestamp) return 'Mai sincronizzato';
    const date = new Date(timestamp);
    return new Intl.RelativeTimeFormat('it', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60)),
      'minutes'
    );
  };

  if (!trunk) return null;

  const aiEnabled = form.watch('aiAgentEnabled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configurazione AI Voice Agent
          </DialogTitle>
          <DialogDescription>
            Trunk: {trunk.name} • Store: {trunk.storeName || 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Sync Status */}
            {trunk.edgvoipAiSyncStatus && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Stato Sincronizzazione edgvoip</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {trunk.edgvoipAiSyncStatus === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : trunk.edgvoipAiSyncStatus === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm">
                        {trunk.edgvoipAiSyncStatus === 'success' && 'Sincronizzato'}
                        {trunk.edgvoipAiSyncStatus === 'error' && 'Errore sync'}
                        {trunk.edgvoipAiSyncStatus === 'pending' && 'In attesa...'}
                        {trunk.edgvoipAiSyncStatus === 'none' && 'Non sincronizzato'}
                      </span>
                    </div>
                    {trunk.edgvoipAiSyncedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatSyncTime(trunk.edgvoipAiSyncedAt)}
                      </span>
                    )}
                  </div>
                  {trunk.edgvoipAiSyncError && (
                    <p className="text-xs text-red-600 mt-2">{trunk.edgvoipAiSyncError}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Enable AI */}
            <FormField
              control={form.control}
              name="aiAgentEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Abilita AI Customer Care
                    </FormLabel>
                    <FormDescription>
                      Attiva l'assistente vocale AI per questo trunk
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-enable-ai"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {aiEnabled && (
              <>
                {/* AI Agent Selection */}
                <FormField
                  control={form.control}
                  name="aiAgentRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Agent</FormLabel>
                      <FormDescription>
                        Seleziona l'assistente AI dal registro Brand Interface
                      </FormDescription>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ai-agent">
                            <SelectValue placeholder="Seleziona AI Agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aiAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Business Hours Editor */}
                <div>
                  <Label className="text-base mb-4 block">Orari di Attività</Label>
                  <BusinessHoursEditor
                    value={businessHours}
                    onChange={setBusinessHours}
                  />
                </div>

                {/* Failover Extension */}
                <FormField
                  control={form.control}
                  name="aiFailoverExtension"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <PhoneForwarded className="h-4 w-4" />
                        Interno di Fallback
                      </FormLabel>
                      <FormDescription>
                        Interno da chiamare quando AI non disponibile o fuori orario
                      </FormDescription>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-failover-extension">
                            <SelectValue placeholder="Seleziona interno" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {extensions.map((ext) => (
                            <SelectItem key={ext.extension.id} value={ext.extension.extension}>
                              {ext.extension.extension} - {ext.userName || 'N/A'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-ai-config"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando e sincronizzando...
                  </>
                ) : (
                  'Salva Configurazione'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
