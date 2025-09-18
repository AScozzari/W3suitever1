import { useState } from 'react';
import { useHRRequests, HR_REQUEST_CATEGORIES, HR_REQUEST_TYPES, HR_REQUEST_STATUS_LABELS, HR_REQUEST_PRIORITY_LABELS } from '@/hooks/useHRRequests';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, Search, Filter, FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  Calendar, User, MessageSquare, Paperclip, Settings, RefreshCw,
  Umbrella, ClipboardList, Users, Phone, Building, Coffee, Home, Car, Briefcase,
  Heart, Shield, Calendar as CalendarIcon, Baby, School, Globe, Activity, MapPin
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import HRRequestWizard from '@/components/HR/HRRequestWizard';
import HRRequestDetails from '@/components/HR/HRRequestDetails';

// Glassmorphism WindTre Design Constants
const WINDTRE_COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF', 
    purpleLight: '#9747ff',
  }
};

// Request type icons mapping
const REQUEST_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
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

// Status color variants
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'destructive';
    case 'cancelled': return 'secondary';
    case 'draft': return 'outline';
    default: return 'secondary';
  }
};

// Priority color variants  
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 dark:text-red-400';
    case 'high': return 'text-orange-600 dark:text-orange-400';
    case 'normal': return 'text-green-600 dark:text-green-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
};

interface HRRequestCenterProps {}

export default function HRRequestCenter({}: HRRequestCenterProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    type: '',
    search: ''
  });

  // Fetch HR requests with filters
  const { data: requestsData, isLoading, error, refetch } = useHRRequests(filters);
  const requests = requestsData?.requests || [];
  const totalCount = requestsData?.total || 0;

  // Filter requests for different views
  const pendingRequests = requests.filter((r: any) => r.status === 'pending');
  const recentRequests = requests.slice(0, 5);

  // Quick stats
  const stats = {
    total: totalCount,
    pending: pendingRequests.length,
    approved: requests.filter((r: any) => r.status === 'approved').length,
    rejected: requests.filter((r: any) => r.status === 'rejected').length
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', category: '', type: '', search: '' });
  };

  return (
    <Layout currentModule="employee" setCurrentModule={() => {}}>
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-none">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Centro Richieste HR
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gestisci le tue richieste di ferie, permessi e modifiche orario
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => refetch()}
                  variant="outline" 
                  size="sm"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aggiorna
                </Button>
                <Dialog open={showWizard} onOpenChange={setShowWizard}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-lg"
                      data-testid="button-new-request"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuova Richiesta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Crea Nuova Richiesta HR</DialogTitle>
                    </DialogHeader>
                    <HRRequestWizard 
                      onSuccess={() => {
                        setShowWizard(false);
                        refetch();
                      }}
                      onCancel={() => setShowWizard(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">Totale Richieste</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
                    <FileText className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-700 dark:text-orange-300 font-medium">In Attesa</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pending}</p>
                  </div>
                  <div className="p-3 bg-orange-200 dark:bg-orange-800 rounded-full">
                    <Clock className="h-6 w-6 text-orange-700 dark:text-orange-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 dark:text-green-300 font-medium">Approvate</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.approved}</p>
                  </div>
                  <div className="p-3 bg-green-200 dark:bg-green-800 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-700 dark:text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-700 dark:text-red-300 font-medium">Rifiutate</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.rejected}</p>
                  </div>
                  <div className="p-3 bg-red-200 dark:bg-red-800 rounded-full">
                    <XCircle className="h-6 w-6 text-red-700 dark:text-red-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error State */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                Errore nel caricamento delle richieste. <Button variant="link" onClick={() => refetch()}>Riprova</Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 lg:grid-cols-3 h-auto w-full">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Panoramica
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Le Mie Richieste
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                In Attesa
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Requests */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle>Richieste Recenti</CardTitle>
                    <CardDescription>Le tue ultime 5 richieste</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : recentRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nessuna richiesta trovata</p>
                        <Button 
                          variant="link" 
                          onClick={() => setShowWizard(true)}
                          className="mt-2"
                        >
                          Crea la tua prima richiesta
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentRequests.map((request: any) => {
                          const IconComponent = REQUEST_TYPE_ICONS[request.type] || FileText;
                          return (
                            <div 
                              key={request.id}
                              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                              onClick={() => setSelectedRequest(request.id)}
                              data-testid={`request-item-${request.id}`}
                            >
                              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                                <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{request.title}</p>
                                <p className="text-sm text-gray-500">
                                  {HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <Badge variant={getStatusVariant(request.status) as any}>
                                  {HR_REQUEST_STATUS_LABELS[request.status as keyof typeof HR_REQUEST_STATUS_LABELS]}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                  {format(parseISO(request.createdAt), 'dd MMM', { locale: it })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle>Azioni Rapide</CardTitle>
                    <CardDescription>Crea nuove richieste comuni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { type: 'vacation', label: 'Ferie', icon: Umbrella, color: 'from-blue-500 to-blue-600' },
                        { type: 'sick', label: 'Malattia', icon: Heart, color: 'from-red-500 to-red-600' },
                        { type: 'wfh', label: 'Smart Working', icon: Home, color: 'from-green-500 to-green-600' },
                        { type: 'personal', label: 'Permesso', icon: User, color: 'from-purple-500 to-purple-600' }
                      ].map(({ type, label, icon: Icon, color }) => (
                        <Button
                          key={type}
                          variant="outline"
                          className={`h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br ${color} text-white border-0 hover:opacity-90 transition-opacity`}
                          onClick={() => setShowWizard(true)}
                          data-testid={`quick-action-${type}`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-sm font-medium">{label}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* All Requests Tab */}
            <TabsContent value="requests" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filtra Richieste</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          placeholder="Cerca richieste..."
                          value={filters.search}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="pl-10"
                          data-testid="input-search"
                        />
                      </div>
                    </div>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                      <SelectTrigger className="w-[150px]" data-testid="select-status">
                        <SelectValue placeholder="Stato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti gli stati</SelectItem>
                        {Object.entries(HR_REQUEST_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                      <SelectTrigger className="w-[150px]" data-testid="select-category">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutte le categorie</SelectItem>
                        {Object.entries(HR_REQUEST_CATEGORIES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                      Cancella Filtri
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Requests List */}
              <Card>
                <CardHeader>
                  <CardTitle>Tutte le Richieste</CardTitle>
                  <CardDescription>
                    {totalCount > 0 ? `${totalCount} richieste trovate` : 'Nessuna richiesta trovata'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Nessuna richiesta trovata</h3>
                      <p className="mb-4">Non hai ancora creato richieste HR con questi filtri</p>
                      <Button onClick={() => setShowWizard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Prima Richiesta
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request: any) => {
                        const IconComponent = REQUEST_TYPE_ICONS[request.type] || FileText;
                        return (
                          <div 
                            key={request.id}
                            className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                            onClick={() => setSelectedRequest(request.id)}
                            data-testid={`request-row-${request.id}`}
                          >
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium truncate">{request.title}</h4>
                                <span className={`text-sm ${getPriorityColor(request.priority)}`}>
                                  {HR_REQUEST_PRIORITY_LABELS[request.priority as keyof typeof HR_REQUEST_PRIORITY_LABELS]}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]} • 
                                {request.startDate && request.endDate && ` ${format(parseISO(request.startDate), 'dd/MM/yy')} - ${format(parseISO(request.endDate), 'dd/MM/yy')}`}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              {request.attachments?.length > 0 && (
                                <Paperclip className="h-4 w-4 text-gray-400" />
                              )}
                              <Badge variant={getStatusVariant(request.status) as any}>
                                {HR_REQUEST_STATUS_LABELS[request.status as keyof typeof HR_REQUEST_STATUS_LABELS]}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {format(parseISO(request.createdAt), 'dd MMM yyyy', { locale: it })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pending Requests Tab */}
            <TabsContent value="pending" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Richieste in Attesa</CardTitle>
                  <CardDescription>
                    {pendingRequests.length} richieste in attesa di approvazione
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Nessuna richiesta in attesa</h3>
                      <p>Tutte le tue richieste sono state processate</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map((request: any) => {
                        const IconComponent = REQUEST_TYPE_ICONS[request.type] || FileText;
                        return (
                          <div 
                            key={request.id}
                            className="flex items-center space-x-4 p-4 border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                            onClick={() => setSelectedRequest(request.id)}
                            data-testid={`pending-request-${request.id}`}
                          >
                            <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-full">
                              <IconComponent className="h-5 w-5 text-orange-700 dark:text-orange-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-orange-900 dark:text-orange-100">{request.title}</h4>
                              <p className="text-sm text-orange-700 dark:text-orange-300">
                                {HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]} • 
                                Inviata {format(parseISO(request.submittedAt || request.createdAt), 'dd MMM yyyy', { locale: it })}
                              </p>
                            </div>
                            <Badge className="bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200">
                              In Attesa
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Request Details Modal */}
          {selectedRequest && (
            <HRRequestDetails 
              requestId={selectedRequest}
              isOpen={!!selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onUpdate={() => refetch()}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}