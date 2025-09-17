// Leave Management Page - Main page for leave requests and management
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Plus, Download, Filter, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Layout from '@/components/Layout';
import { LeaveBalanceWidget } from '@/components/Leave/LeaveBalanceWidget';
import { LeaveRequestModal } from '@/components/Leave/LeaveRequestModal';
import { ApprovalQueue } from '@/components/Leave/ApprovalQueue';
import { LeaveCalendar } from '@/components/Leave/LeaveCalendar';
import { useLeaveRequests, useLeaveStatistics, useApprovalQueue, useDeleteLeaveRequest } from '@/hooks/useLeaveManagement';
import { useAuth } from '@/hooks/useAuth';
import { leaveService } from '@/services/leaveService';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeaveManagementPage() {
  const [currentModule, setCurrentModule] = useState('leave-management');
  const { user } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('my-requests');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Hooks
  const { data: requests = [], isLoading, filters, setFilters } = useLeaveRequests({
    userId: activeTab === 'my-requests' ? user?.id : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    leaveType: typeFilter !== 'all' ? typeFilter : undefined
  });
  
  const { data: statistics } = useLeaveStatistics();
  const { pendingCount, urgentCount } = useApprovalQueue();
  const deleteRequest = useDeleteLeaveRequest();
  
  const isManager = user?.role === 'TEAM_LEADER' || user?.role === 'HR_MANAGER' || user?.role === 'ADMIN';
  
  // Handlers
  const handleCreateRequest = () => {
    setSelectedRequest(null);
    setShowRequestModal(true);
  };
  
  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };
  
  const handleDeleteRequest = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa richiesta?')) {
      deleteRequest.mutate(id);
    }
  };
  
  const handleExport = () => {
    // Export to CSV
    const csv = [
      ['ID', 'Data Richiesta', 'Tipo', 'Data Inizio', 'Data Fine', 'Giorni', 'Stato', 'Note'],
      ...requests.map(r => [
        r.id,
        format(new Date(r.createdAt), 'dd/MM/yyyy'),
        leaveService.getLeaveTypeConfig(r.leaveType).label,
        format(new Date(r.startDate), 'dd/MM/yyyy'),
        format(new Date(r.endDate), 'dd/MM/yyyy'),
        r.totalDays,
        leaveService.getStatusConfig(r.status).label,
        r.notes || ''
      ])
    ];
    
    const csvContent = csv.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  // Statistics cards
  const statsCards = [
    {
      title: 'Richieste Totali',
      value: statistics?.totalRequests || 0,
      icon: CalendarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'In Attesa',
      value: statistics?.pendingRequests || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Approvate',
      value: statistics?.approvedRequests || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Rifiutate',
      value: statistics?.rejectedRequests || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];
  
  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="leave-management-page">
        {/* Header with Glassmorphism */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Gestione Ferie e Permessi
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Richiedi e gestisci le tue ferie e permessi aziendali
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleExport}
                className="bg-white/60 backdrop-blur border-white/30"
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
              <Button
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                onClick={handleCreateRequest}
                data-testid="button-new-request"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Richiesta
              </Button>
            </div>
          </div>
        </div>
      
        {/* Statistics Cards with Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title}
                className="bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200"
                data-testid={`stat-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-full",
                      stat.bgColor
                    )}>
                      <Icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      
        {/* Main Content with Glassmorphism */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Balance and Calendar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Balance Widget */}
            <Card className="bg-white/80 backdrop-blur-md border-white/20">
              <LeaveBalanceWidget />
            </Card>
            
            {/* Mini Calendar */}
            <Card className="bg-white/80 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Calendario Ferie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeaveCalendar compact />
              </CardContent>
            </Card>
          
            {/* Approval Queue for Managers */}
            {isManager && (
              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Da Approvare</span>
                    {urgentCount > 0 && (
                      <Badge variant="destructive">
                        {urgentCount} urgenti
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ApprovalQueue compact />
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Right Side - Requests List */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-md border-white/20">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Richieste Ferie</CardTitle>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="filter-status">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="draft">Bozza</SelectItem>
                      <SelectItem value="pending">In Attesa</SelectItem>
                      <SelectItem value="approved">Approvate</SelectItem>
                      <SelectItem value="rejected">Rifiutate</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="filter-type">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="vacation">Ferie</SelectItem>
                      <SelectItem value="sick">Malattia</SelectItem>
                      <SelectItem value="personal">Personale</SelectItem>
                      <SelectItem value="maternity">Maternità</SelectItem>
                      <SelectItem value="paternity">Paternità</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {isManager && (
                  <TabsList className="mb-4">
                    <TabsTrigger value="my-requests">Le Mie Richieste</TabsTrigger>
                    <TabsTrigger value="team-requests" className="relative">
                      Richieste Team
                      {pendingCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-2 h-5 px-1 text-xs"
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                )}
                
                <TabsContent value={activeTab === 'team-requests' ? 'team-requests' : 'my-requests'}>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nessuna richiesta trovata</p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={handleCreateRequest}
                      >
                        Crea la tua prima richiesta
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Periodo</TableHead>
                            <TableHead className="text-center">Giorni</TableHead>
                            <TableHead>Stato</TableHead>
                            {activeTab === 'team-requests' && (
                              <TableHead>Richiedente</TableHead>
                            )}
                            <TableHead>Data Richiesta</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map((request) => {
                            const typeConfig = leaveService.getLeaveTypeConfig(request.leaveType);
                            const statusConfig = leaveService.getStatusConfig(request.status);
                            
                            return (
                              <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>{typeConfig.icon}</span>
                                    <span className="font-medium">{typeConfig.label}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {leaveService.formatDateRange(request.startDate, request.endDate)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline">{request.totalDays}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    style={{
                                      backgroundColor: statusConfig.bgColor,
                                      color: statusConfig.color,
                                      borderColor: statusConfig.color
                                    }}
                                  >
                                    {statusConfig.icon} {statusConfig.label}
                                  </Badge>
                                </TableCell>
                                {activeTab === 'team-requests' && (
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {request.userAvatar && (
                                        <img
                                          src={request.userAvatar}
                                          alt={request.userName}
                                          className="h-6 w-6 rounded-full"
                                        />
                                      )}
                                      <span className="text-sm">{request.userName}</span>
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell>
                                  <span className="text-sm text-gray-500">
                                    {format(new Date(request.createdAt), 'dd MMM yyyy', { locale: it })}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    {request.status === 'draft' && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditRequest(request)}
                                          data-testid={`button-edit-${request.id}`}
                                        >
                                          Modifica
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600"
                                          onClick={() => handleDeleteRequest(request.id)}
                                          data-testid={`button-delete-${request.id}`}
                                        >
                                          Elimina
                                        </Button>
                                      </>
                                    )}
                                    {request.status === 'pending' && activeTab === 'my-requests' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-orange-600"
                                        data-testid={`button-cancel-${request.id}`}
                                      >
                                        Annulla
                                      </Button>
                                    )}
                                    {activeTab === 'team-requests' && request.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditRequest(request)}
                                        data-testid={`button-review-${request.id}`}
                                      >
                                        Esamina
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        </div>

        {/* Request Modal */}
        {showRequestModal && (
          <LeaveRequestModal
            request={selectedRequest}
            onClose={() => setShowRequestModal(false)}
          />
        )}
      </div>
    </Layout>
  );
}