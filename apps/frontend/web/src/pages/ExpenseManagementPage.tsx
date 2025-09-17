// Expense Management Page
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useExpenseReports, useExpenseStats, useExpenseApprovals } from '@/hooks/useExpenseManagement';
import { expenseService } from '@/services/expenseService';
import { useAuth } from '@/hooks/useAuth';
import ExpenseReportForm from '@/components/Expenses/ExpenseReportForm';
import ExpenseApprovalQueue from '@/components/Expenses/ExpenseApprovalQueue';
import ExpenseAnalytics from '@/components/Expenses/ExpenseAnalytics';
import ExpensePolicies from '@/components/Expenses/ExpensePolicies';
import {
  Plus,
  Download,
  Filter,
  Search,
  FileText,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const ExpenseManagementPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    ...(selectedPeriod !== 'all' && {
      startDate: getPeriodDates(selectedPeriod).startDate,
      endDate: getPeriodDates(selectedPeriod).endDate
    })
  };

  const { reports, isLoading, createReport, deleteReport, submitReport } = useExpenseReports(filters);
  const { stats } = useExpenseStats();
  const { pendingApprovals } = useExpenseApprovals();

  // Filter reports based on search query
  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.title.toLowerCase().includes(query) ||
      report.reportNumber.toLowerCase().includes(query) ||
      report.description?.toLowerCase().includes(query)
    );
  });

  const canApprove = (user as any)?.role === 'HR_MANAGER' || (user as any)?.role === 'ADMIN' || (user as any)?.role === 'TEAM_LEADER';
  const canSetPolicies = (user as any)?.role === 'HR_MANAGER' || (user as any)?.role === 'ADMIN';

  function getPeriodDates(period: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (period) {
      case 'thisMonth':
        return { startDate: startOfMonth, endDate: now };
      case 'lastMonth':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), 0)
        };
      case 'thisYear':
        return { startDate: startOfYear, endDate: now };
      case 'last3Months':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
          endDate: now
        };
      default:
        return { startDate: null, endDate: null };
    }
  }

  const getStatusBadge = (status: string): any => {
    const statusConfig = {
      draft: { variant: 'secondary', label: 'Bozza', icon: FileText },
      submitted: { variant: 'warning', label: 'In Attesa', icon: Clock },
      approved: { variant: 'success', label: 'Approvata', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rifiutata', icon: XCircle },
      reimbursed: { variant: 'info', label: 'Rimborsata', icon: DollarSign }
    };

    const config = (statusConfig as any)[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleExport = () => {
    // Mock export functionality
    toast({
      title: 'Export avviato',
      description: 'Il report verrà scaricato a breve'
    });
  };

  const handleQuickSubmit = async (reportId: string) => {
    await submitReport.mutateAsync(reportId);
  };

  const handleQuickDelete = async (reportId: string) => {
    if (confirm('Sei sicuro di voler eliminare questa nota spese?')) {
      await deleteReport.mutateAsync(reportId);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="expense-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestione Note Spese</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci le tue note spese, carica scontrini e monitora i rimborsi
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary" data-testid="button-new-expense">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Nota Spese
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crea Nuova Nota Spese</DialogTitle>
              </DialogHeader>
              <ExpenseReportForm
                onSuccess={() => setShowCreateDialog(false)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending">
              {expenseService.formatCurrency(stats?.totalPending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingApprovals.length} report da approvare
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approvate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-approved">
              {expenseService.formatCurrency(stats?.totalApproved || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pronte per il rimborso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questo Mese</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-month">
              {expenseService.formatCurrency(stats?.totalThisMonth || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Spese del mese corrente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anno Corrente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-year">
              {expenseService.formatCurrency(stats?.totalThisYear || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Totale anno {new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="myExpenses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="myExpenses">Le Mie Spese</TabsTrigger>
          {canApprove && (
            <TabsTrigger value="approvals" className="relative">
              Approvazioni
              {pendingApprovals.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 absolute -top-1 -right-1">
                  {pendingApprovals.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {canSetPolicies && (
            <TabsTrigger value="policies">Policy</TabsTrigger>
          )}
        </TabsList>

        {/* My Expenses Tab */}
        <TabsContent value="myExpenses" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Cerca nota spese..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[180px]" data-testid="select-period">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="thisMonth">Questo Mese</SelectItem>
                    <SelectItem value="lastMonth">Mese Scorso</SelectItem>
                    <SelectItem value="last3Months">Ultimi 3 Mesi</SelectItem>
                    <SelectItem value="thisYear">Quest'Anno</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-status">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli Stati</SelectItem>
                    <SelectItem value="draft">Bozza</SelectItem>
                    <SelectItem value="submitted">In Attesa</SelectItem>
                    <SelectItem value="approved">Approvate</SelectItem>
                    <SelectItem value="rejected">Rifiutate</SelectItem>
                    <SelectItem value="reimbursed">Rimborsate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Expense Reports List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nessuna Nota Spese</h3>
                <p className="text-muted-foreground mb-4">
                  Non ci sono note spese per i criteri selezionati
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  data-testid="button-create-first"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea la tua prima nota spese
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReports.map(report => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold" data-testid={`report-title-${report.id}`}>
                            {report.title}
                          </h3>
                          {getStatusBadge(report.status)}
                          <span className="text-sm text-muted-foreground">
                            {report.reportNumber}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {report.description || 'Nessuna descrizione'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(report.periodStart), 'dd MMM yyyy', { locale: it })} -
                            {format(new Date(report.periodEnd), 'dd MMM yyyy', { locale: it })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            {report.items?.length || 0} voci
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold" data-testid={`report-amount-${report.id}`}>
                            {expenseService.formatCurrency(report.totalAmount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Totale
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedReport(report)}
                            data-testid={`button-view-${report.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedReport(report)}
                                data-testid={`button-edit-${report.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleQuickSubmit(report.id)}
                                data-testid={`button-submit-${report.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleQuickDelete(report.id)}
                                data-testid={`button-delete-${report.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        {canApprove && (
          <TabsContent value="approvals">
            <ExpenseApprovalQueue />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <ExpenseAnalytics />
        </TabsContent>

        {/* Policies Tab */}
        {canSetPolicies && (
          <TabsContent value="policies">
            <ExpensePolicies />
          </TabsContent>
        )}
      </Tabs>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedReport.status === 'draft' ? 'Modifica' : 'Visualizza'} Nota Spese
              </DialogTitle>
            </DialogHeader>
            <ExpenseReportForm
              report={selectedReport}
              onSuccess={() => setSelectedReport(null)}
              onCancel={() => setSelectedReport(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ExpenseManagementPage;