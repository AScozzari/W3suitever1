import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Zap, 
  Workflow,
  ChevronRight,
  RefreshCw,
  FileText,
  User,
  Calendar
} from 'lucide-react';

interface WorkflowExecutionPanelProps {
  entityType: 'deal' | 'lead' | 'customer';
  entityId: string;
  entityData?: {
    name?: string;
    stage?: string;
    pipeline?: string;
    value?: number;
    owner?: string;
  };
  onClose?: () => void;
  compact?: boolean;
}

interface AvailableWorkflow {
  id: string;
  workflowId: string;
  workflowName: string;
  description: string;
  category: string;
  executionMode: 'manual' | 'automatic';
  lastExecuted?: string;
  executionCount?: number;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  canExecute: boolean;
  requiredApproval?: boolean;
  approvalReason?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  output?: any;
  error?: string;
  executedBy: string;
  executedByName?: string;
}

export function WorkflowExecutionPanel({ 
  entityType, 
  entityId, 
  entityData,
  onClose,
  compact = false 
}: WorkflowExecutionPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [selectedWorkflow, setSelectedWorkflow] = useState<AvailableWorkflow | null>(null);
  const [executionNotes, setExecutionNotes] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch available workflows for this entity
  const { data: availableWorkflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: [`/api/crm/${entityType}s/${entityId}/available-workflows`],
    enabled: !!entityId,
  });

  // Fetch workflow execution history
  const { data: executionHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: [`/api/crm/${entityType}s/${entityId}/workflow-executions`],
    enabled: !!entityId,
  });

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: async (data: { workflowId: string; notes?: string }) => {
      return apiRequest(`/api/crm/${entityType}s/${entityId}/execute-workflow`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/${entityType}s/${entityId}/available-workflows`] });
      queryClient.invalidateQueries({ queryKey: [`/api/crm/${entityType}s/${entityId}/workflow-executions`] });
      setSelectedWorkflow(null);
      setExecutionNotes('');
      setConfirmDialogOpen(false);
      toast({
        title: '✅ Workflow Eseguito',
        description: 'Il workflow è stato avviato con successo',
        className: "bg-green-50 border-green-200",
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore Esecuzione',
        description: error.message || 'Impossibile eseguire il workflow',
        variant: 'destructive',
      });
    },
  });

  const handleExecuteWorkflow = (workflow: AvailableWorkflow) => {
    if (workflow.requiredApproval) {
      setSelectedWorkflow(workflow);
      setConfirmDialogOpen(true);
    } else {
      executeWorkflowMutation.mutate({ workflowId: workflow.workflowId });
    }
  };

  const handleConfirmExecution = () => {
    if (selectedWorkflow) {
      executeWorkflowMutation.mutate({
        workflowId: selectedWorkflow.workflowId,
        notes: executionNotes,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getExecutionModeIcon = (mode: string) => {
    return mode === 'automatic' ? 
      <Zap className="w-3 h-3" /> : 
      <Clock className="w-3 h-3" />;
  };

  if (workflowsLoading) {
    return <LoadingState message="Caricamento workflow disponibili..." />;
  }

  return (
    <>
      <div className={compact ? "space-y-4" : "h-full flex flex-col"}>
        {/* Header */}
        {!compact && (
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Workflow className="w-5 h-5 text-windtre-orange" />
              Gestione Workflow
            </h3>
            {entityData && (
              <div className="text-sm text-gray-500 mt-1">
                {entityData.name} • {entityData.stage} • €{entityData.value?.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'available' | 'history')} 
              className={compact ? "" : "flex-1 flex flex-col"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">
              Workflow Disponibili ({availableWorkflows.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Storico Esecuzioni ({executionHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Available Workflows Tab */}
          <TabsContent value="available" className={compact ? "space-y-3" : "flex-1 overflow-y-auto space-y-3"}>
            {availableWorkflows.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nessun workflow disponibile per questo {entityType === 'deal' ? 'deal' : 
                    entityType === 'lead' ? 'lead' : 'cliente'} in questo momento.
                </AlertDescription>
              </Alert>
            ) : (
              availableWorkflows.map((workflow: AvailableWorkflow) => (
                <Card key={workflow.id} className="p-4 windtre-glass-panel">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{workflow.workflowName}</h4>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {getExecutionModeIcon(workflow.executionMode)}
                          {workflow.executionMode === 'automatic' ? 'Automatico' : 'Manuale'}
                        </Badge>
                        {workflow.requiredApproval && (
                          <Badge variant="destructive" className="text-xs">
                            Richiede Approvazione
                          </Badge>
                        )}
                      </div>
                      
                      {workflow.description && (
                        <p className="text-sm text-gray-600">{workflow.description}</p>
                      )}
                      
                      {workflow.approvalReason && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {workflow.approvalReason}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {workflow.lastExecuted && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Ultimo: {new Date(workflow.lastExecuted).toLocaleDateString()}
                          </span>
                        )}
                        {workflow.executionCount !== undefined && (
                          <span>Eseguito {workflow.executionCount} volte</span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleExecuteWorkflow(workflow)}
                      disabled={!workflow.canExecute || executeWorkflowMutation.isPending}
                      className="bg-windtre-orange hover:bg-windtre-orange/90"
                      data-testid={`button-execute-workflow-${workflow.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Esegui
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Execution History Tab */}
          <TabsContent value="history" className={compact ? "space-y-3" : "flex-1 overflow-y-auto space-y-3"}>
            {historyLoading ? (
              <LoadingState message="Caricamento storico..." />
            ) : executionHistory.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nessun workflow è stato ancora eseguito per questo {entityType === 'deal' ? 'deal' : 
                    entityType === 'lead' ? 'lead' : 'cliente'}.
                </AlertDescription>
              </Alert>
            ) : (
              executionHistory.map((execution: WorkflowExecution) => (
                <Card key={execution.id} className="p-4 windtre-glass-panel">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(execution.status)}
                        <h4 className="font-semibold text-sm">{execution.workflowName}</h4>
                        <Badge 
                          variant={execution.status === 'completed' ? 'success' : 
                                 execution.status === 'failed' ? 'destructive' : 
                                 execution.status === 'running' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {execution.status === 'completed' ? 'Completato' :
                           execution.status === 'failed' ? 'Fallito' :
                           execution.status === 'running' ? 'In Esecuzione' : 'In Attesa'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {execution.executedByName || execution.executedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(execution.startedAt).toLocaleString()}
                      </span>
                      {execution.completedAt && (
                        <span>
                          Durata: {Math.round((new Date(execution.completedAt).getTime() - 
                                   new Date(execution.startedAt).getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                    
                    {execution.error && (
                      <Alert variant="destructive" className="mt-2">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {execution.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {execution.output && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(execution.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma Esecuzione Workflow</DialogTitle>
            <DialogDescription>
              Stai per eseguire il workflow "{selectedWorkflow?.workflowName}".
              {selectedWorkflow?.approvalReason && (
                <Alert className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedWorkflow.approvalReason}
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="execution-notes">Note (opzionale)</Label>
              <Textarea
                id="execution-notes"
                value={executionNotes}
                onChange={(e) => setExecutionNotes(e.target.value)}
                placeholder="Aggiungi note per questa esecuzione..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleConfirmExecution}
              disabled={executeWorkflowMutation.isPending}
              className="bg-windtre-orange hover:bg-windtre-orange/90"
            >
              {executeWorkflowMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Conferma ed Esegui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}