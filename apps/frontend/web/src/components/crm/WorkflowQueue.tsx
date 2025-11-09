import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { 
  Workflow, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Users,
  Building2,
  UserCheck,
  Calendar,
  TrendingUp,
  Package,
  CheckSquare,
  Square
} from 'lucide-react';

interface PendingWorkflow {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowCategory: string;
  entityType: 'deal' | 'lead' | 'customer' | 'campaign';
  entityId: string;
  entityName: string;
  entityStage?: string;
  entityPipeline?: string;
  entityValue?: number;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  estimatedDuration?: number; // in seconds
  dependencies?: string[];
}

interface WorkflowStats {
  totalPending: number;
  totalToday: number;
  totalThisWeek: number;
  avgApprovalTime: number;
  approvalRate: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byEntity: {
    deal: number;
    lead: number;
    customer: number;
    campaign: number;
  };
}

export function WorkflowQueue() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState<'all' | 'deal' | 'lead' | 'customer' | 'campaign'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch pending workflows
  const { data: pendingWorkflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: ['/api/crm/workflow-queue'],
  });

  // Fetch workflow stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/crm/workflow-queue/stats'],
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (workflowIds: string[]) => {
      return apiRequest('/api/crm/workflow-queue/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ workflowIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue/stats'] });
      setSelectedWorkflows(new Set());
      setSelectAll(false);
      toast({
        title: '✅ Workflow Approvati',
        description: `${selectedWorkflows.size} workflow approvati con successo`,
        className: "bg-green-50 border-green-200",
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore Approvazione',
        description: error.message || 'Impossibile approvare i workflow',
        variant: 'destructive',
      });
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async (data: { workflowIds: string[]; reason: string }) => {
      return apiRequest('/api/crm/workflow-queue/bulk-reject', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue/stats'] });
      setSelectedWorkflows(new Set());
      setSelectAll(false);
      toast({
        title: 'Workflow Rifiutati',
        description: `${selectedWorkflows.size} workflow rifiutati`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore Rifiuto',
        description: error.message || 'Impossibile rifiutare i workflow',
        variant: 'destructive',
      });
    },
  });

  // Single workflow action mutations
  const approveWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      return apiRequest(`/api/crm/workflow-queue/${workflowId}/approve`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue/stats'] });
      toast({
        title: '✅ Workflow Approvato',
        description: 'Il workflow è stato approvato e verrà eseguito',
        className: "bg-green-50 border-green-200",
      });
    },
  });

  const rejectWorkflowMutation = useMutation({
    mutationFn: async (data: { workflowId: string; reason: string }) => {
      return apiRequest(`/api/crm/workflow-queue/${data.workflowId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: data.reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue/stats'] });
      toast({
        title: 'Workflow Rifiutato',
        description: 'Il workflow è stato rifiutato',
      });
    },
  });

  // Filter workflows based on search and filters
  const filteredWorkflows = useMemo(() => {
    let filtered = pendingWorkflows;

    // Filter by status tab
    if (activeTab === 'pending') {
      filtered = filtered.filter((w: PendingWorkflow) => w.status === 'pending');
    } else if (activeTab === 'approved') {
      filtered = filtered.filter((w: PendingWorkflow) => 
        w.status === 'approved' || w.status === 'executing' || w.status === 'completed'
      );
    } else if (activeTab === 'rejected') {
      filtered = filtered.filter((w: PendingWorkflow) => 
        w.status === 'rejected' || w.status === 'failed'
      );
    }

    // Filter by entity type
    if (filterEntity !== 'all') {
      filtered = filtered.filter((w: PendingWorkflow) => w.entityType === filterEntity);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter((w: PendingWorkflow) => w.priority === filterPriority);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((w: PendingWorkflow) => 
        w.workflowName.toLowerCase().includes(term) ||
        w.entityName.toLowerCase().includes(term) ||
        w.requestedByName.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [pendingWorkflows, activeTab, filterEntity, filterPriority, searchTerm]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedWorkflows(new Set());
    } else {
      const allIds = filteredWorkflows
        .filter((w: PendingWorkflow) => w.status === 'pending')
        .map((w: PendingWorkflow) => w.id);
      setSelectedWorkflows(new Set(allIds));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectWorkflow = (id: string) => {
    const newSelection = new Set(selectedWorkflows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedWorkflows(newSelection);
    
    // Update select all state
    const pendingFiltered = filteredWorkflows.filter((w: PendingWorkflow) => w.status === 'pending');
    setSelectAll(pendingFiltered.length > 0 && newSelection.size === pendingFiltered.length);
  };

  const handleBulkApprove = () => {
    if (selectedWorkflows.size > 0) {
      bulkApproveMutation.mutate(Array.from(selectedWorkflows));
    }
  };

  const handleBulkReject = () => {
    if (selectedWorkflows.size > 0) {
      // In a real app, you'd show a dialog to get the rejection reason
      bulkRejectMutation.mutate({
        workflowIds: Array.from(selectedWorkflows),
        reason: 'Rifiutato in batch dall\'operatore',
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={`${colors[priority as keyof typeof colors]} text-xs`}>
        {priority === 'critical' ? 'Critico' : 
         priority === 'high' ? 'Alto' :
         priority === 'medium' ? 'Medio' : 'Basso'}
      </Badge>
    );
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'deal':
        return <TrendingUp className="w-4 h-4" />;
      case 'lead':
        return <Users className="w-4 h-4" />;
      case 'customer':
        return <Building2 className="w-4 h-4" />;
      case 'campaign':
        return <Package className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'executing':
        return <RotateCcw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (workflowsLoading || statsLoading) {
    return <LoadingState message="Caricamento coda workflow..." />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4 windtre-glass-panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Attesa</p>
                <p className="text-2xl font-bold text-windtre-orange">{stats.totalPending}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
          
          <Card className="p-4 windtre-glass-panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Oggi</p>
                <p className="text-2xl font-bold">{stats.totalToday}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
          
          <Card className="p-4 windtre-glass-panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Questa Settimana</p>
                <p className="text-2xl font-bold">{stats.totalThisWeek}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
          
          <Card className="p-4 windtre-glass-panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tempo Medio Approvazione</p>
                <p className="text-2xl font-bold">{stats.avgApprovalTime}m</p>
              </div>
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
          
          <Card className="p-4 windtre-glass-panel">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasso Approvazione</p>
                <p className="text-2xl font-bold">{stats.approvalRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-4 windtre-glass-panel">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cerca workflow, entità o richiedente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-workflow-search"
            />
          </div>
          
          <Select value={filterEntity} onValueChange={(v: any) => setFilterEntity(v)}>
            <SelectTrigger className="w-40" data-testid="select-entity-filter">
              <SelectValue placeholder="Tipo Entità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le Entità</SelectItem>
              <SelectItem value="deal">Deal</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="customer">Clienti</SelectItem>
              <SelectItem value="campaign">Campagne</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterPriority} onValueChange={(v: any) => setFilterPriority(v)}>
            <SelectTrigger className="w-40" data-testid="select-priority-filter">
              <SelectValue placeholder="Priorità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le Priorità</SelectItem>
              <SelectItem value="critical">Critico</SelectItem>
              <SelectItem value="high">Alto</SelectItem>
              <SelectItem value="medium">Medio</SelectItem>
              <SelectItem value="low">Basso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Bulk Actions */}
        {selectedWorkflows.size > 0 && activeTab === 'pending' && (
          <div className="flex items-center justify-between mt-4 p-3 bg-windtre-orange/10 rounded-lg">
            <span className="text-sm font-medium">
              {selectedWorkflows.size} workflow selezionati
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedWorkflows(new Set());
                  setSelectAll(false);
                }}
                data-testid="button-clear-selection"
              >
                Deseleziona
              </Button>
              <Button
                size="sm"
                onClick={handleBulkReject}
                variant="destructive"
                disabled={bulkRejectMutation.isPending}
                data-testid="button-bulk-reject"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rifiuta Selezionati
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                className="bg-windtre-orange hover:bg-windtre-orange/90"
                disabled={bulkApproveMutation.isPending}
                data-testid="button-bulk-approve"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approva Selezionati
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Workflow List */}
      <Card className="flex-1 windtre-glass-panel overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              In Attesa ({filteredWorkflows.filter((w: PendingWorkflow) => w.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approvati ({filteredWorkflows.filter((w: PendingWorkflow) => 
                ['approved', 'executing', 'completed'].includes(w.status)).length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rifiutati ({filteredWorkflows.filter((w: PendingWorkflow) => 
                ['rejected', 'failed'].includes(w.status)).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {activeTab === 'pending' && (
                <div className="p-4 border-b bg-gray-50">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleziona tutti"
                    data-testid="checkbox-select-all"
                  />
                  <span className="ml-2 text-sm text-gray-600">Seleziona tutti</span>
                </div>
              )}
              
              <div className="space-y-3 p-4">
                {filteredWorkflows.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nessun workflow trovato con i criteri di ricerca attuali.
                    </AlertDescription>
                  </Alert>
                ) : (
                  filteredWorkflows.map((workflow: PendingWorkflow) => (
                    <Card key={workflow.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        {workflow.status === 'pending' && (
                          <Checkbox
                            checked={selectedWorkflows.has(workflow.id)}
                            onCheckedChange={() => handleSelectWorkflow(workflow.id)}
                            aria-label={`Seleziona ${workflow.workflowName}`}
                            data-testid={`checkbox-workflow-${workflow.id}`}
                          />
                        )}
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(workflow.status)}
                              <h4 className="font-semibold text-sm">{workflow.workflowName}</h4>
                              {getPriorityBadge(workflow.priority)}
                              <Badge variant="outline" className="text-xs">
                                {workflow.workflowCategory}
                              </Badge>
                            </div>
                            
                            {workflow.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectWorkflowMutation.mutate({
                                    workflowId: workflow.id,
                                    reason: 'Rifiutato dall\'operatore',
                                  })}
                                  disabled={rejectWorkflowMutation.isPending}
                                  data-testid={`button-reject-${workflow.id}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => approveWorkflowMutation.mutate(workflow.id)}
                                  className="bg-windtre-orange hover:bg-windtre-orange/90"
                                  disabled={approveWorkflowMutation.isPending}
                                  data-testid={`button-approve-${workflow.id}`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              {getEntityIcon(workflow.entityType)}
                              <span className="font-medium">{workflow.entityName}</span>
                              {workflow.entityStage && (
                                <span className="text-gray-400">• {workflow.entityStage}</span>
                              )}
                              {workflow.entityValue && (
                                <span className="text-gray-400">• €{workflow.entityValue.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          
                          {workflow.reason && (
                            <p className="text-sm text-gray-600 italic">{workflow.reason}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Richiesto da: {workflow.requestedByName}</span>
                            <span>Data: {new Date(workflow.requestedAt).toLocaleString()}</span>
                            {workflow.estimatedDuration && (
                              <span>Durata stimata: {workflow.estimatedDuration}s</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="approved" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 p-4">
                {filteredWorkflows.map((workflow: PendingWorkflow) => (
                  <Card key={workflow.id} className="p-4">
                    {/* Same card structure as pending tab but without checkboxes and actions */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(workflow.status)}
                        <h4 className="font-semibold text-sm">{workflow.workflowName}</h4>
                        <Badge 
                          variant={workflow.status === 'completed' ? 'success' : 'default'}
                          className="text-xs"
                        >
                          {workflow.status === 'completed' ? 'Completato' :
                           workflow.status === 'executing' ? 'In Esecuzione' : 'Approvato'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {workflow.entityType} • {workflow.entityName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Approvato da: {workflow.requestedByName} • {new Date(workflow.requestedAt).toLocaleString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rejected" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 p-4">
                {filteredWorkflows.map((workflow: PendingWorkflow) => (
                  <Card key={workflow.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(workflow.status)}
                        <h4 className="font-semibold text-sm">{workflow.workflowName}</h4>
                        <Badge variant="destructive" className="text-xs">
                          {workflow.status === 'failed' ? 'Fallito' : 'Rifiutato'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {workflow.entityType} • {workflow.entityName}
                      </div>
                      {workflow.reason && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {workflow.reason}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="text-xs text-gray-500">
                        Rifiutato da: {workflow.requestedByName} • {new Date(workflow.requestedAt).toLocaleString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}