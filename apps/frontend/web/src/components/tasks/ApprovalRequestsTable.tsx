import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MoreHorizontal, 
  Check, 
  X, 
  Eye, 
  Clock, 
  AlertTriangle,
  Workflow,
  User,
  Calendar,
  Building2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ApprovalRequest {
  id: string;
  tenantId: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'completed';
  createdAt: string;
  updatedAt: string;
  entityType: string;
  entityId: string;
  triggeredBy: string;
  triggeredByName?: string;
  currentStepData?: {
    department?: string;
    actionId?: string;
    actionName?: string;
    escalated?: boolean;
    observersCanApprove?: boolean;
    slaHours?: number;
  };
  workflowTemplateId?: string;
  workflowTemplateName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  approved: { label: 'Approvato', color: 'bg-green-100 text-green-800 border-green-300', icon: Check },
  rejected: { label: 'Rifiutato', color: 'bg-red-100 text-red-800 border-red-300', icon: X },
  escalated: { label: 'Escalato', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle },
  completed: { label: 'Completato', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Check },
};

const DEPARTMENT_LABELS: Record<string, string> = {
  hr: 'Risorse Umane',
  finance: 'Finanza',
  sales: 'Vendite',
  operations: 'Operazioni',
  support: 'Supporto',
  crm: 'CRM',
  marketing: 'Marketing',
  wms: 'Magazzino',
  general: 'Generale',
};

export function ApprovalRequestsTable() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requestsData, isLoading } = useQuery<{ success: boolean; data: ApprovalRequest[] }>({
    queryKey: ['/api/workflow-instances/approvals'],
  });
  
  const requests = requestsData?.data || [];

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest(`/api/workflow-instances/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-instances'] });
      setShowApproveDialog(false);
      setApprovalNotes('');
      setSelectedRequest(null);
      toast({ title: 'Richiesta approvata con successo' });
    },
    onError: () => {
      toast({ title: 'Errore durante l\'approvazione', variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest(`/api/workflow-instances/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-instances'] });
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedRequest(null);
      toast({ title: 'Richiesta rifiutata' });
    },
    onError: () => {
      toast({ title: 'Errore durante il rifiuto', variant: 'destructive' });
    }
  });

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.currentStepData?.actionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.entityType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.triggeredByName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleApprove = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const handleReject = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca richieste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-requests"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected', 'escalated'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              data-testid={`filter-status-${status}`}
            >
              {status === 'all' ? 'Tutte' : STATUS_CONFIG[status]?.label || status}
            </Button>
          ))}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Azione</TableHead>
              <TableHead className="font-semibold">Dipartimento</TableHead>
              <TableHead className="font-semibold">Richiesto da</TableHead>
              <TableHead className="font-semibold">Stato</TableHead>
              <TableHead className="font-semibold">Data</TableHead>
              <TableHead className="font-semibold">Workflow</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Nessuna richiesta trovata
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => {
                const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const department = request.currentStepData?.department || 'general';
                const isEscalated = request.currentStepData?.escalated;

                return (
                  <TableRow key={request.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {request.currentStepData?.actionName || request.currentStepData?.actionId || 'Richiesta'}
                        </span>
                        <span className="text-xs text-gray-500">{request.entityType}: {request.entityId.slice(0, 8)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        {DEPARTMENT_LABELS[department] || department}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{request.triggeredByName || 'Utente'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusConfig.color} border`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {isEscalated && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Escalato
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: it })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.workflowTemplateName ? (
                        <Badge variant="secondary" className="text-xs">
                          <Workflow className="h-3 w-3 mr-1" />
                          {request.workflowTemplateName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">Flusso default</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`menu-request-${request.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Dettagli
                          </DropdownMenuItem>
                          {request.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleApprove(request)} className="text-green-600">
                                <Check className="h-4 w-4 mr-2" />
                                Approva
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(request)} className="text-red-600">
                                <X className="h-4 w-4 mr-2" />
                                Rifiuta
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Approva Richiesta
            </DialogTitle>
            <DialogDescription>
              Stai approvando: {selectedRequest?.currentStepData?.actionName || 'Richiesta'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Note opzionali..."
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => selectedRequest && approveMutation.mutate({ id: selectedRequest.id, notes: approvalNotes })}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? 'Approvazione...' : 'Conferma Approvazione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              Rifiuta Richiesta
            </DialogTitle>
            <DialogDescription>
              Stai rifiutando: {selectedRequest?.currentStepData?.actionName || 'Richiesta'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo del rifiuto (obbligatorio)..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            required
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => selectedRequest && rejectionReason && rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason })}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              variant="destructive"
            >
              {rejectMutation.isPending ? 'Rifiuto...' : 'Conferma Rifiuto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
