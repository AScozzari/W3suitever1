import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, User, Calendar,
  FileText, Umbrella, Heart, Shield, Baby, Users, Activity, Home, Building,
  Globe, Briefcase, AlertTriangle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  useManagerApprovalQueue, 
  HR_REQUEST_TYPES, 
  HR_REQUEST_PRIORITY_LABELS,
  HRRequest,
  ManagerFilters
} from '@/hooks/useHRRequests';
import RequestDetailModal from './RequestDetailModal';
import ApprovalActionsForm from './ApprovalActionsForm';

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
    case 'urgent': 
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300';
    case 'high': 
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300';
    default: 
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300';
  }
};

// Days since submission color
const getDaysSinceColor = (days: number) => {
  if (days >= 7) return 'text-red-600 font-semibold';
  if (days >= 3) return 'text-orange-600';
  return 'text-gray-600';
};

interface RequestApprovalTableProps {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  onSelectionChange?: (requestIds: string[]) => void;
  selectedRequests?: string[];
  className?: string;
}

export default function RequestApprovalTable({ 
  status = 'pending', 
  onSelectionChange,
  selectedRequests = [],
  className 
}: RequestApprovalTableProps) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('');
  const [showRequestDetails, setShowRequestDetails] = useState<string>('');
  const [showApprovalActions, setShowApprovalActions] = useState<string>('');

  // Build filters
  const filters: ManagerFilters = useMemo(() => {
    const result: ManagerFilters = {
      manager: true,
    };
    
    if (status !== 'all') result.status = status;
    if (typeFilter) result.type = typeFilter;
    if (priorityFilter) result.priority = priorityFilter;
    if (dateRangeFilter === 'urgent') result.urgent = true;
    if (dateRangeFilter === 'longPending') result.longPending = true;
    
    return result;
  }, [status, typeFilter, priorityFilter, dateRangeFilter]);

  // Data queries
  const { data: requestsData, isLoading, error, refetch } = useManagerApprovalQueue(filters);
  const requests: HRRequest[] = requestsData?.requests || [];

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;
    
    const term = searchTerm.toLowerCase();
    return requests.filter((request) => {
      const requesterName = `${request.requester?.firstName || ''} ${request.requester?.lastName || ''}`.toLowerCase();
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
    const newSelection = checked ? filteredRequests.map(r => r.id) : [];
    onSelectionChange?.(newSelection);
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedRequests, requestId]
      : selectedRequests.filter(id => id !== requestId);
    onSelectionChange?.(newSelection);
  };

  // Utility functions
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

  const handleActionComplete = () => {
    refetch();
    setShowApprovalActions('');
  };

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-error-approval-table">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Errore nel caricamento delle richieste: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per dipendente, tipo richiesta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 glassmorphism-card border-0"
              data-testid="input-search-requests"
            />
          </div>
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48 glassmorphism-card border-0" data-testid="select-filter-type">
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
          <SelectTrigger className="w-full sm:w-32 glassmorphism-card border-0" data-testid="select-filter-status">
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
          <SelectTrigger className="w-full sm:w-40 glassmorphism-card border-0" data-testid="select-date-filter">
            <SelectValue placeholder="Tempo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="" data-testid="option-all-dates">Tutte</SelectItem>
            <SelectItem value="urgent" data-testid="option-urgent">Urgenti</SelectItem>
            <SelectItem value="longPending" data-testid="option-long-pending">In sospeso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card className="glassmorphism-card border-0">
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-white/10 backdrop-blur-sm">
                <TableRow className="border-b border-white/20">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="button-bulk-select"
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
                    <TableRow key={index} className="border-b border-white/10">
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
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-windtre-orange/10 p-4 rounded-full">
                          <CheckCircle className="h-12 w-12 text-windtre-orange" />
                        </div>
                        <div className="space-y-2">
                          <div className="text-lg font-medium">Nessuna richiesta trovata</div>
                          <div className="text-sm text-muted-foreground">
                            {status === 'pending' 
                              ? "Non ci sono richieste HR che necessitano della tua approvazione"
                              : `Non ci sono richieste con stato "${status}"`
                            }
                          </div>
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
                        className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                          isSelected ? 'bg-windtre-orange/10' : ''
                        }`}
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
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-windtre-orange to-windtre-purple flex items-center justify-center">
                              <span className="text-xs font-medium text-white">
                                {request.requester?.firstName?.charAt(0)}{request.requester?.lastName?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium" data-testid={`text-requester-${request.id}`}>
                                {request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {request.requester?.email || ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-windtre-orange" />
                            <span className="text-sm" data-testid={`text-type-${request.id}`}>
                              {HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate font-medium" data-testid={`text-title-${request.id}`}>
                            {request.title}
                          </div>
                          {request.description && (
                            <div className="text-xs text-muted-foreground max-w-xs truncate">
                              {request.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={getPriorityColor(request.priority)}
                            data-testid={`badge-priority-${request.id}`}
                          >
                            {HR_REQUEST_PRIORITY_LABELS[request.priority as keyof typeof HR_REQUEST_PRIORITY_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm" data-testid={`text-start-date-${request.id}`}>
                              {formatRequestDate(request.startDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`text-sm font-medium ${getDaysSinceColor(daysSince)}`}
                            data-testid={`text-days-since-${request.id}`}
                          >
                            {daysSince} giorni
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() => setShowApprovalActions(request.id)}
                                  data-testid={`button-approve-${request.id}`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() => setShowApprovalActions(request.id)}
                                  data-testid={`button-reject-${request.id}`}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 glassmorphism-card border-0"
                                  data-testid={`button-menu-${request.id}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glassmorphism-card border-0">
                                <DropdownMenuItem 
                                  onClick={() => setShowRequestDetails(request.id)}
                                  data-testid={`menu-view-details-${request.id}`}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizza Dettagli
                                </DropdownMenuItem>
                                <DropdownMenuItem data-testid={`menu-view-history-${request.id}`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Storico
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
        </CardContent>
      </Card>

      {/* Modals */}
      {showRequestDetails && (
        <RequestDetailModal
          requestId={showRequestDetails}
          open={!!showRequestDetails}
          onClose={() => setShowRequestDetails('')}
          data-testid={`modal-request-details-${showRequestDetails}`}
        />
      )}

      {showApprovalActions && (
        <ApprovalActionsForm
          requestId={showApprovalActions}
          open={!!showApprovalActions}
          onClose={() => setShowApprovalActions('')}
          onComplete={handleActionComplete}
          data-testid={`modal-approval-actions-${showApprovalActions}`}
        />
      )}
    </div>
  );
}