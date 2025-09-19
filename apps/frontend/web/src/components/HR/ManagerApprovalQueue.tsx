import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, Filter, CheckCircle, XCircle, AlertTriangle, Clock, User, Calendar, 
  MessageSquare, MoreHorizontal, Eye, FileText, Umbrella, Heart, Shield, 
  Baby, Users, Activity, Home, Building, Globe, Briefcase, ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO, isWithinInterval, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useManagerApprovalQueue, 
  useApproveHRRequest, 
  useRejectHRRequest, 
  useBulkApproveHRRequests,
  useBulkRejectHRRequests,
  HR_REQUEST_TYPES, 
  HR_REQUEST_STATUS_LABELS, 
  HR_REQUEST_PRIORITY_LABELS,
  HRRequest,
  ManagerFilters
} from '@/hooks/useHRRequests';
import HRRequestDetails from './HRRequestDetails';
import ErrorBoundary, { SafeRender } from '@/components/ErrorBoundary';

// Request type icons
const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  vacation: Umbrella,
  sick: Heart,
  fmla: Shield,
  parental: Baby,
  bereavement: Heart,
  personal: User,
  religious: Globe,
  military: Shield,
  shift_swap: Users,
  time_change: Clock,
  flex_hours: Activity,
  wfh: Home,
  overtime: Clock,
  jury_duty: Building,
  medical_appt: Heart,
  emergency: AlertTriangle
};

// Priority colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
    case 'high': return 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30';
    default: return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30';
  }
};

// Days since submission color
const getDaysSinceColor = (days: number) => {
  if (days >= 7) return 'text-red-600 font-semibold';
  if (days >= 3) return 'text-orange-600';
  return 'text-gray-600';
};

// Form schemas
const approveSchema = z.object({
  comment: z.string().optional()
});

const rejectSchema = z.object({
  reason: z.string().min(1, 'Il motivo del rifiuto è obbligatorio').max(500, 'Massimo 500 caratteri'),
  comment: z.string().optional()
});

const bulkRejectSchema = z.object({
  reason: z.string().min(1, 'Il motivo del rifiuto è obbligatorio').max(500, 'Massimo 500 caratteri'),
  comment: z.string().optional()
});

type ApproveFormData = z.infer<typeof approveSchema>;
type RejectFormData = z.infer<typeof rejectSchema>;
type BulkRejectFormData = z.infer<typeof bulkRejectSchema>;

interface ManagerApprovalQueueProps {
  className?: string;
}

export default function ManagerApprovalQueue({ className }: ManagerApprovalQueueProps) {
  // State
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('');
  const [showApprovalDialog, setShowApprovalDialog] = useState<string>('');
  const [showRejectionDialog, setShowRejectionDialog] = useState<string>('');
  const [showBulkApproval, setShowBulkApproval] = useState(false);
  const [showBulkRejection, setShowBulkRejection] = useState(false);
  const [showRequestDetails, setShowRequestDetails] = useState<string>('');

  // Build filters
  const filters: ManagerFilters = useMemo(() => {
    const result: ManagerFilters = {
      manager: true,
      status: 'pending',
    };
    
    if (typeFilter) result.type = typeFilter;
    if (priorityFilter) result.priority = priorityFilter;
    if (dateRangeFilter === 'urgent') result.urgent = true;
    if (dateRangeFilter === 'longPending') result.longPending = true;
    
    return result;
  }, [typeFilter, priorityFilter, dateRangeFilter]);

  // Data queries
  const { data: requestsData, isLoading, error, refetch } = useManagerApprovalQueue(filters);
  const requests: HRRequest[] = (requestsData as any)?.requests || [];

  // Mutations
  const approveMutation = useApproveHRRequest();
  const rejectMutation = useRejectHRRequest();
  const bulkApproveMutation = useBulkApproveHRRequests();
  const bulkRejectMutation = useBulkRejectHRRequests();

  // Forms
  const approveForm = useForm<ApproveFormData>({
    resolver: zodResolver(approveSchema),
    defaultValues: { comment: '' }
  });

  const rejectForm = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '', comment: '' }
  });

  const bulkRejectForm = useForm<BulkRejectFormData>({
    resolver: zodResolver(bulkRejectSchema),
    defaultValues: { reason: '', comment: '' }
  });

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;
    
    const term = searchTerm.toLowerCase();
    return requests.filter((request) => {
      const requesterName = `${request.requesterId || 'N/A'}`.toLowerCase();
      const title = request.title.toLowerCase();
      const type = HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]?.toLowerCase() || '';
      
      return (
        requesterName.includes(term) ||
        title.includes(term) ||
        type.includes(term)
      );
    });
  }, [requests, searchTerm]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectedRequests(checked ? filteredRequests.map(r => r.id) : []);
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests([...selectedRequests, requestId]);
    } else {
      setSelectedRequests(selectedRequests.filter(id => id !== requestId));
    }
  };

  // Action handlers
  const handleApprove = async (data: ApproveFormData) => {
    if (!showApprovalDialog) return;
    
    try {
      await approveMutation.mutateAsync({
        requestId: showApprovalDialog,
        comment: data.comment
      });
      setShowApprovalDialog('');
      approveForm.reset();
      refetch();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (data: RejectFormData) => {
    if (!showRejectionDialog) return;
    
    try {
      await rejectMutation.mutateAsync({
        requestId: showRejectionDialog,
        reason: data.reason,
        comment: data.comment
      });
      setShowRejectionDialog('');
      rejectForm.reset();
      refetch();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) return;
    
    try {
      await bulkApproveMutation.mutateAsync({
        requestIds: selectedRequests,
        comment: 'Approvazione multipla'
      });
      setSelectedRequests([]);
      setShowBulkApproval(false);
      refetch();
    } catch (error) {
      console.error('Error bulk approving requests:', error);
    }
  };

  const handleBulkReject = async (data: BulkRejectFormData) => {
    if (selectedRequests.length === 0) return;
    
    try {
      await bulkRejectMutation.mutateAsync({
        requestIds: selectedRequests,
        reason: data.reason,
        comment: data.comment
      });
      setSelectedRequests([]);
      setShowBulkRejection(false);
      bulkRejectForm.reset();
      refetch();
    } catch (error) {
      console.error('Error bulk rejecting requests:', error);
    }
  };

  // Calculate days since submission
  const getDaysSince = (submittedAt?: string) => {
    if (!submittedAt) return 0;
    const submitted = parseISO(submittedAt);
    const now = new Date();
    return Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatRequestDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: it });
    } catch {
      return '-';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-error-approval-queue">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Errore nel caricamento delle richieste in attesa di approvazione: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <div className={className}>
        <Card className="glassmorphism-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Coda Approvazioni
          </CardTitle>
          <CardDescription>
            Gestisci le richieste HR in attesa della tua approvazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per dipendente, tipo richiesta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-requests"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-type-filter">
                <SelectValue placeholder="Tipo richiesta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" data-testid="option-all-types">Tutti i tipi</SelectItem>
                {Object.entries(HR_REQUEST_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key} data-testid={`option-type-${key}`}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-32" data-testid="select-priority-filter">
                <SelectValue placeholder="Priorità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" data-testid="option-all-priorities">Tutte</SelectItem>
                {Object.entries(HR_REQUEST_PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} data-testid={`option-priority-${key}`}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-date-filter">
                <SelectValue placeholder="Tempo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" data-testid="option-all-dates">Tutte</SelectItem>
                <SelectItem value="urgent" data-testid="option-urgent">Urgenti</SelectItem>
                <SelectItem value="longPending" data-testid="option-long-pending">In sospeso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedRequests.length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-accent rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedRequests.length} richieste selezionate
              </span>
              <div className="flex gap-2">
                <Dialog open={showBulkApproval} onOpenChange={setShowBulkApproval}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-bulk-approve"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approva Tutto
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-bulk-approve">
                    <DialogHeader>
                      <DialogTitle>Approva Richieste</DialogTitle>
                      <DialogDescription>
                        Stai per approvare {selectedRequests.length} richieste. Questa azione non può essere annullata.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowBulkApproval(false)}
                        data-testid="button-cancel-bulk-approve"
                      >
                        Annulla
                      </Button>
                      <Button 
                        onClick={handleBulkApprove}
                        disabled={bulkApproveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-confirm-bulk-approve"
                      >
                        {bulkApproveMutation.isPending ? 'Approvando...' : 'Approva Tutto'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showBulkRejection} onOpenChange={setShowBulkRejection}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      data-testid="button-bulk-reject"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rifiuta Tutto
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-bulk-reject">
                    <DialogHeader>
                      <DialogTitle>Rifiuta Richieste</DialogTitle>
                      <DialogDescription>
                        Stai per rifiutare {selectedRequests.length} richieste. Inserisci il motivo del rifiuto.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...bulkRejectForm}>
                      <form onSubmit={bulkRejectForm.handleSubmit(handleBulkReject)} className="space-y-4">
                        <FormField
                          control={bulkRejectForm.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Motivo del rifiuto *</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Specifica il motivo del rifiuto..."
                                  {...field} 
                                  data-testid="textarea-bulk-reject-reason"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={bulkRejectForm.control}
                          name="comment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Commento aggiuntivo</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Commento opzionale..."
                                  {...field} 
                                  data-testid="textarea-bulk-reject-comment"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowBulkRejection(false)}
                            data-testid="button-cancel-bulk-reject"
                          >
                            Annulla
                          </Button>
                          <Button 
                            type="submit"
                            variant="destructive"
                            disabled={bulkRejectMutation.isPending}
                            data-testid="button-confirm-bulk-reject"
                          >
                            {bulkRejectMutation.isPending ? 'Rifiutando...' : 'Rifiuta Tutto'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          {/* Requests Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Dipendente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Priorità</TableHead>
                  <TableHead>Data Inizio</TableHead>
                  <TableHead>Giorni Attesa</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="h-12 w-12 text-muted-foreground" />
                        <div className="text-lg font-medium">Nessuna richiesta in attesa</div>
                        <div className="text-sm text-muted-foreground">
                          Non ci sono richieste HR che necessitano della tua approvazione
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const TypeIcon = TYPE_ICONS[request.type] || FileText;
                    const daysSince = getDaysSince(request.submittedAt);
                    const isSelected = selectedRequests.includes(request.id);
                    
                    return (
                      <TableRow 
                        key={request.id} 
                        className={isSelected ? 'bg-accent' : ''}
                        data-testid={`row-request-${request.id}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRequest(request.id, !!checked)}
                            data-testid={`checkbox-request-${request.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-requester-${request.id}`}>
                              {request.requesterId || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-type-${request.id}`}>
                              {HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-title-${request.id}`}>
                          {request.title}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={getPriorityColor(request.priority)}
                            data-testid={`badge-priority-${request.id}`}
                          >
                            {HR_REQUEST_PRIORITY_LABELS[request.priority as keyof typeof HR_REQUEST_PRIORITY_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-start-date-${request.id}`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatRequestDate(request.startDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span 
                            className={getDaysSinceColor(daysSince)}
                            data-testid={`text-days-since-${request.id}`}
                          >
                            {daysSince} {daysSince === 1 ? 'giorno' : 'giorni'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowRequestDetails(request.id)}
                              data-testid={`button-view-${request.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  data-testid={`button-actions-${request.id}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-green-700 hover:text-green-800"
                                  onClick={() => setShowApprovalDialog(request.id)}
                                  data-testid={`menu-approve-${request.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approva
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-700 hover:text-red-800"
                                  onClick={() => setShowRejectionDialog(request.id)}
                                  data-testid={`menu-reject-${request.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rifiuta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Results Summary */}
          {!isLoading && filteredRequests.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Visualizzando {filteredRequests.length} di {requests.length} richieste
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={!!showApprovalDialog} onOpenChange={() => setShowApprovalDialog('')}>
        <DialogContent data-testid="dialog-approve-request">
          <DialogHeader>
            <DialogTitle>Approva Richiesta</DialogTitle>
            <DialogDescription>
              Conferma l'approvazione di questa richiesta HR
            </DialogDescription>
          </DialogHeader>
          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4">
              <FormField
                control={approveForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commento (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Aggiungi un commento all'approvazione..."
                        {...field} 
                        data-testid="textarea-approve-comment"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowApprovalDialog('')}
                  data-testid="button-cancel-approve"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-confirm-approve"
                >
                  {approveMutation.isPending ? 'Approvando...' : 'Approva'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={!!showRejectionDialog} onOpenChange={() => setShowRejectionDialog('')}>
        <DialogContent data-testid="dialog-reject-request">
          <DialogHeader>
            <DialogTitle>Rifiuta Richiesta</DialogTitle>
            <DialogDescription>
              Specifica il motivo del rifiuto di questa richiesta HR
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectForm}>
            <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4">
              <FormField
                control={rejectForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo del rifiuto *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Specifica perché stai rifiutando questa richiesta..."
                        {...field} 
                        data-testid="textarea-reject-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={rejectForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commento aggiuntivo</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Commento opzionale..."
                        {...field} 
                        data-testid="textarea-reject-comment"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRejectionDialog('')}
                  data-testid="button-cancel-reject"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  variant="destructive"
                  disabled={rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {rejectMutation.isPending ? 'Rifiutando...' : 'Rifiuta'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      {showRequestDetails && (
        <HRRequestDetails
          requestId={showRequestDetails}
          isOpen={!!showRequestDetails}
          onClose={() => setShowRequestDetails('')}
          onUpdate={refetch}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}