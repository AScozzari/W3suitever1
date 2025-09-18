// HRFerie.tsx - Leave Management using DetailPageTemplate with Tabs
import { DetailPageTemplate, type TabItem } from '@w3suite/frontend-kit/templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarDays,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plane,
  FileText,
  BarChart3,
  Eye,
  Trash2,
  Edit,
  Users,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  useLeaveRequests, 
  useLeaveBalance,
  useCreateLeaveRequest,
  useUpdateLeaveRequest,
  useDeleteLeaveRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useTeamCalendar
} from '@/hooks/useLeaveManagement';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';

// WindTre Color System - CSS VARIABLES
const BRAND_COLORS = {
  orange: 'hsl(var(--brand-orange))',
  purple: 'hsl(var(--brand-purple))',
};

// Leave Request Form Schema
const leaveRequestSchema = z.object({
  leaveType: z.enum(['vacation', 'sick', 'personal', 'other'], {
    required_error: 'Tipo di ferie richiesto'
  }),
  startDate: z.string().min(1, 'Data inizio richiesta'),
  endDate: z.string().min(1, 'Data fine richiesta'),
  reason: z.string().min(5, 'Motivo deve contenere almeno 5 caratteri'),
  notes: z.string().optional()
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

export default function HRFerie() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Auth and permissions
  const { user } = useAuth();
  const isManager = user?.role === 'TEAM_LEADER' || user?.role === 'HR_MANAGER' || user?.role === 'ADMIN';

  // Hooks for data fetching
  const { data: balance, isLoading: balanceLoading } = useLeaveBalance(user?.id);
  const { data: requests = [], isLoading: requestsLoading } = useLeaveRequests({
    userId: user?.id
  });
  const { data: teamRequests = [] } = useLeaveRequests(isManager ? {} : undefined);
  const { data: teamCalendar = [] } = useTeamCalendar();
  
  // Mutations
  const createRequest = useCreateLeaveRequest();
  const updateRequest = useUpdateLeaveRequest();
  const deleteRequest = useDeleteLeaveRequest();
  const approveRequest = useApproveLeaveRequest();
  const rejectRequest = useRejectLeaveRequest();

  // Form handling
  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: 'vacation',
      startDate: '',
      endDate: '',
      reason: '',
      notes: ''
    }
  });

  // Handle form submission
  const handleCreateRequest = async (data: LeaveRequestFormData) => {
    try {
      await createRequest.mutateAsync({
        ...data,
        totalDays: calculateDays(data.startDate, data.endDate)
      });
      setShowRequestForm(false);
      form.reset();
    } catch (error) {
      console.error('Failed to create leave request:', error);
    }
  };

  // Calculate working days between dates
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Get leave dates for calendar marking
  const leaveDates = useMemo(() => {
    const dates: Date[] = [];
    [...requests, ...teamCalendar].forEach((request: any) => {
      if (request.status === 'approved' || request.status === 'pending') {
        const start = parseISO(request.startDate);
        const end = parseISO(request.endDate);
        
        // Add all dates in the range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d));
        }
      }
    });
    return dates;
  }, [requests, teamCalendar]);

  // Handle quick actions
  const handleApprove = async (requestId: string) => {
    try {
      await approveRequest.mutateAsync({ id: requestId });
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectRequest.mutateAsync({ 
        id: requestId, 
        reason: 'Richiesta rifiutata dal manager' 
      });
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa richiesta?')) {
      try {
        await deleteRequest.mutateAsync(requestId);
      } catch (error) {
        console.error('Failed to delete request:', error);
      }
    }
  };

  // Primary action for new request
  const primaryAction = {
    label: 'Nuova Richiesta',
    icon: <Plus className="h-4 w-4" />,
    onClick: () => setShowRequestForm(true),
    'data-testid': 'button-new-leave-request'
  };

  // Secondary actions
  const secondaryActions = [
    {
      label: 'Esporta',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => {
        console.log('Export leave data');
      },
      'data-testid': 'button-export-leaves'
    }
  ];

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'HR', href: '/hr' },
    { label: 'Ferie & Permessi', href: '/hr/ferie' }
  ];

  // Calendar Tab Content
  const calendarTab = (
    <div className="space-y-6">
      {/* Calendar with marked dates */}
      <Card className="glass-card" data-testid="card-leave-calendar">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
            Calendario Ferie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Calendar
                mode="multiple"
                selected={leaveDates}
                className="rounded-md border"
                data-testid="calendar-leave-dates"
                modifiers={{
                  approved: leaveDates.filter((date) => {
                    return requests.some((req: any) => {
                      const start = parseISO(req.startDate);
                      const end = parseISO(req.endDate);
                      return req.status === 'approved' && 
                             isWithinInterval(date, { start, end });
                    });
                  }),
                  pending: leaveDates.filter((date) => {
                    return requests.some((req: any) => {
                      const start = parseISO(req.startDate);
                      const end = parseISO(req.endDate);
                      return req.status === 'pending' && 
                             isWithinInterval(date, { start, end });
                    });
                  })
                }}
                modifiersStyles={{
                  approved: { 
                    backgroundColor: BRAND_COLORS.orange, 
                    color: 'white' 
                  },
                  pending: { 
                    backgroundColor: BRAND_COLORS.purple, 
                    color: 'white' 
                  }
                }}
              />
            </div>

            {/* Legend and upcoming leaves */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Legenda</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: BRAND_COLORS.orange }}
                    ></div>
                    <span className="text-sm">Ferie Approvate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: BRAND_COLORS.purple }}
                    ></div>
                    <span className="text-sm">Ferie in Attesa</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Prossime Ferie</h3>
                <div className="space-y-3" data-testid="list-upcoming-leaves">
                  {requests
                    .filter((req: any) => req.status === 'approved' && new Date(req.startDate) >= new Date())
                    .slice(0, 3)
                    .map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium" data-testid={`text-leave-dates-${request.id}`}>
                            {format(parseISO(request.startDate), 'dd MMM', { locale: it })} - 
                            {format(parseISO(request.endDate), 'dd MMM', { locale: it })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.leaveType} • {request.totalDays} giorni
                          </p>
                        </div>
                        <Badge variant="default" data-testid={`badge-leave-status-${request.id}`}>
                          Approvata
                        </Badge>
                      </div>
                    ))}
                  {requests.filter((req: any) => req.status === 'approved' && new Date(req.startDate) >= new Date()).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nessuna feria programmata
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Requests Tab Content
  const requestsTab = (
    <div className="space-y-6">
      {/* Request Form Modal */}
      {showRequestForm && (
        <Card className="glass-card" data-testid="card-request-form">
          <CardHeader>
            <CardTitle>Nuova Richiesta Ferie</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateRequest)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="leaveType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Richiesta</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-leave-type">
                              <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vacation">Ferie</SelectItem>
                            <SelectItem value="sick">Malattia</SelectItem>
                            <SelectItem value="personal">Permesso</SelectItem>
                            <SelectItem value="other">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Inizio</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Fine</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-end">
                    <div className="text-sm text-gray-500">
                      Giorni totali: {calculateDays(form.watch('startDate'), form.watch('endDate'))}
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrivi il motivo della richiesta..."
                          {...field}
                          data-testid="textarea-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Note aggiuntive..."
                          {...field}
                          data-testid="textarea-notes"
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
                    onClick={() => setShowRequestForm(false)}
                    data-testid="button-cancel-request"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRequest.isPending}
                    data-testid="button-submit-request"
                  >
                    {createRequest.isPending ? 'Invio...' : 'Invia Richiesta'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <Card className="glass-card" data-testid="card-requests-list">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: BRAND_COLORS.purple }} />
            Le Tue Richieste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" data-testid="list-leave-requests">
            {requestsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-orange-500 rounded-full mx-auto"></div>
                <p className="mt-2 text-gray-500">Caricamento richieste...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nessuna richiesta presente</p>
                <Button
                  onClick={() => setShowRequestForm(true)}
                  className="mt-4"
                  data-testid="button-create-first-request"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Prima Richiesta
                </Button>
              </div>
            ) : (
              requests.map((request: any) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'approved': return 'bg-green-100 text-green-800';
                    case 'rejected': return 'bg-red-100 text-red-800';
                    case 'pending': return 'bg-yellow-100 text-yellow-800';
                    default: return 'bg-gray-100 text-gray-800';
                  }
                };

                const getStatusIcon = (status: string) => {
                  switch (status) {
                    case 'approved': return <CheckCircle className="h-4 w-4" />;
                    case 'rejected': return <XCircle className="h-4 w-4" />;
                    case 'pending': return <AlertCircle className="h-4 w-4" />;
                    default: return <Clock className="h-4 w-4" />;
                  }
                };

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`card-request-${request.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium" data-testid={`text-request-period-${request.id}`}>
                          {format(parseISO(request.startDate), 'dd MMM yyyy', { locale: it })} - 
                          {format(parseISO(request.endDate), 'dd MMM yyyy', { locale: it })}
                        </h3>
                        <Badge 
                          variant="secondary"
                          className={getStatusColor(request.status)}
                          data-testid={`badge-request-status-${request.id}`}
                        >
                          {getStatusIcon(request.status)}
                          <span className="ml-1">
                            {request.status === 'approved' ? 'Approvata' :
                             request.status === 'rejected' ? 'Rifiutata' :
                             request.status === 'pending' ? 'In Attesa' : 'Sconosciuto'}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{request.leaveType === 'vacation' ? 'Ferie' : 
                               request.leaveType === 'sick' ? 'Malattia' :
                               request.leaveType === 'personal' ? 'Permesso' : 'Altro'}</span>
                        <span>{request.totalDays} giorni</span>
                        <span>{request.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        data-testid={`button-view-request-${request.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Open edit form
                              console.log('Edit request:', request.id);
                            }}
                            data-testid={`button-edit-request-${request.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(request.id)}
                            data-testid={`button-delete-request-${request.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Balance Tab Content
  const balanceTab = (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Leave Balance Card */}
        <Card className="glass-card" data-testid="card-leave-balance">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
              Saldo Ferie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <div className="space-y-2">
                <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-4 w-1/2 rounded"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Disponibili</span>
                  <span 
                    className="text-2xl font-bold"
                    style={{ color: BRAND_COLORS.orange }}
                    data-testid="text-days-available"
                  >
                    {balance?.vacationDaysRemaining || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Utilizzate</span>
                  <span className="text-xl font-semibold text-gray-600" data-testid="text-days-used">
                    {balance?.vacationDaysUsed || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Totali</span>
                  <span className="text-lg text-gray-800" data-testid="text-days-total">
                    {balance?.vacationDaysEntitled || 0}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${balance && balance.vacationDaysEntitled ? (balance.vacationDaysUsed / balance.vacationDaysEntitled) * 100 : 0}%`,
                      background: `linear-gradient(90deg, ${BRAND_COLORS.orange}, ${BRAND_COLORS.purple})`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sick Days Card */}
        <Card className="glass-card" data-testid="card-sick-balance">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" style={{ color: BRAND_COLORS.purple }} />
              Giorni Malattia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Utilizzati</span>
                <span 
                  className="text-2xl font-bold"
                  style={{ color: BRAND_COLORS.purple }}
                  data-testid="text-sick-days-used"
                >
                  {balance?.sickDaysUsed || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Quest'anno</span>
                <span className="text-sm text-gray-400">
                  {format(new Date(), 'yyyy')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card className="glass-card" data-testid="card-leave-stats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
              Statistiche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Richieste Totali</span>
                <span className="font-semibold" data-testid="text-total-requests">
                  {requests.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Approvate</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-green-600" data-testid="text-approved-requests">
                    {requests.filter((r: any) => r.status === 'approved').length}
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">In Attesa</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-yellow-600" data-testid="text-pending-requests">
                    {requests.filter((r: any) => r.status === 'pending').length}
                  </span>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Approval Tab Content (for managers)
  const approvalTab = isManager ? (
    <div className="space-y-6">
      <Card className="glass-card" data-testid="card-team-requests">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: BRAND_COLORS.purple }} />
            Richieste Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamRequests
              .filter((request: any) => request.status === 'pending')
              .map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`card-team-request-${request.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium" data-testid={`text-team-request-period-${request.id}`}>
                        {format(parseISO(request.startDate), 'dd MMM yyyy', { locale: it })} - 
                        {format(parseISO(request.endDate), 'dd MMM yyyy', { locale: it })}
                      </h3>
                      <Badge variant="secondary" data-testid={`badge-team-request-status-${request.id}`}>
                        In Attesa
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{request.employeeName || 'Dipendente'}</span>
                      <span>{request.leaveType}</span>
                      <span>{request.totalDays} giorni</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      className="text-green-600 hover:bg-green-50"
                      data-testid={`button-approve-request-${request.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approva
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                      className="text-red-600 hover:bg-red-50"
                      data-testid={`button-reject-request-${request.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rifiuta
                    </Button>
                  </div>
                </div>
              ))}

            {teamRequests.filter((request: any) => request.status === 'pending').length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500">Nessuna richiesta in attesa di approvazione</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null;

  // Configure tabs based on user role
  const tabs: TabItem[] = [
    {
      id: 'calendar',
      label: 'Calendario',
      icon: <CalendarDays className="h-4 w-4" />,
      content: calendarTab
    },
    {
      id: 'requests',
      label: 'Le Mie Richieste',
      icon: <FileText className="h-4 w-4" />,
      badge: requests.filter((r: any) => r.status === 'pending').length || undefined,
      content: requestsTab
    },
    {
      id: 'balance',
      label: 'Saldo',
      icon: <BarChart3 className="h-4 w-4" />,
      content: balanceTab
    }
  ];

  // Add approval tab for managers
  if (isManager && approvalTab) {
    tabs.push({
      id: 'approval',
      label: 'Approvazioni',
      icon: <Users className="h-4 w-4" />,
      badge: teamRequests.filter((r: any) => r.status === 'pending').length || undefined,
      content: approvalTab
    });
  }

  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div 
        className="glassmorphism-card p-6 space-y-6"
        style={{ 
          background: `linear-gradient(135deg, ${BRAND_COLORS.orange}10, ${BRAND_COLORS.purple}10)`,
          backdropFilter: 'blur(10px)'
        }}
      >
        <DetailPageTemplate
          variant="tabs"
          title="Ferie & Permessi"
          subtitle="Gestione completa richieste e calendario ferie"
          breadcrumbs={breadcrumbs}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
          tabs={tabs}
          defaultTab="calendar"
          onTabChange={setActiveTab}
          data-testid="page-hr-ferie"
        />
      </div>
    </Layout>
  );
}