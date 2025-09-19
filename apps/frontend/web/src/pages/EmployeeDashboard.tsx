import { useState, useEffect } from 'react';
import { useTabRouter } from '@/hooks/useTabRouter';
import { useTenant } from '@/contexts/TenantContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Clock, FileText, GraduationCap,
  Download, Target, Sun,
  Home, Bell, Plus, User, CheckCircle, ClipboardList
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'wouter';
import ClockWidget from '@/components/TimeTracking/ClockWidget';
import HRRequestWizard from '@/components/HR/HRRequestWizard';
import PayslipManager from '@/components/Documents/PayslipManager';

// Tab configuration for Employee Dashboard
const EMPLOYEE_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    description: 'Dashboard personale e notifiche'
  },
  {
    id: 'time-attendance',
    label: 'Time & Attendance', 
    icon: Clock,
    description: 'Timbrature e calendario eventi'
  },
  {
    id: 'requests',
    label: 'My Requests',
    icon: ClipboardList,
    description: 'Richieste ferie e permessi'
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    description: 'Buste paga e documenti'
  },
  {
    id: 'performance',
    label: 'My Performance',
    icon: Target,
    description: 'Goals e recensioni personali'
  },
  {
    id: 'training',
    label: 'Training',
    icon: GraduationCap,
    description: 'Corsi e certificazioni'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Impostazioni personali'
  }
];

export default function EmployeeDashboard() {
  // Tab Router Hook - seguendo pattern Settings
  const { activeTab, setTab, getTabUrl } = useTabRouter({
    defaultTab: 'overview'
  });

  // Use proper tenant context instead of URL parsing
  const { currentTenant } = useTenant();
  
  // Modal states with proper types - discriminated union to eliminate any
  type ModalState = 
    | { open: false; data: null }
    | { open: true; data: Record<string, unknown> };
  const [hrRequestModal, setHrRequestModal] = useState<ModalState>({ open: false, data: null });
  const [documentViewerModal, setDocumentViewerModal] = useState<ModalState>({ open: false, data: null });
  const [profileEditModal, setProfileEditModal] = useState<ModalState>({ open: false, data: null });
  
  // Stati principali
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [breakTime, setBreakTime] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Mock data per l'utente - Employee-centric
  const userData = {
    id: 'emp-001',
    nome: 'Marco',
    cognome: 'Rossi', 
    email: 'marco.rossi@windtre.it',
    telefono: '+39 335 123 4567',
    ruolo: 'Senior Account Manager',
    reparto: 'Vendite Enterprise',
    matricola: 'W3-2024-0156',
    foto: null,
    dataAssunzione: '15/03/2022',
    manager: 'Laura Bianchi',
    store: 'Milano Centro'
  };

  // Stati ferie e permessi
  const leaveBalance = {
    ferieAnno: 26,
    ferieUsate: 8,
    ferieRimanenti: 18,
    permessiROL: 32,
    permessiUsati: 12,
    permessiRimanenti: 20,
    malattia: 5,
    congedi: 0
  };

  // Mock data notifiche
  const [notifications] = useState([
    {
      id: 1,
      tipo: 'info',
      titolo: 'Nuovo benefit disponibile',
      messaggio: 'È ora disponibile il nuovo piano welfare 2025. Scopri tutti i vantaggi!',
      data: new Date(),
      letto: false
    },
    {
      id: 2,
      tipo: 'success',
      titolo: 'Ferie approvate',
      messaggio: 'La tua richiesta di ferie dal 20 al 24 dicembre è stata approvata.',
      data: addDays(new Date(), -1),
      letto: false
    },
    {
      id: 3,
      tipo: 'alert',
      titolo: 'Scadenza certificazione',
      messaggio: 'La certificazione "Sicurezza sul lavoro" scade tra 15 giorni. Rinnovala ora.',
      data: addDays(new Date(), -2),
      letto: true
    }
  ]);

  // Mock data richieste
  const [myRequests] = useState([
    { 
      id: 1, 
      categoria: 'leave',
      tipo: 'Ferie', 
      dal: '20/12/2024', 
      al: '24/12/2024', 
      giorni: 5, 
      stato: 'approved', 
      motivo: 'Vacanze natalizie',
      dataRichiesta: '10/11/2024'
    },
    { 
      id: 2, 
      categoria: 'wellness_health',
      tipo: 'Permesso', 
      dal: '15/12/2024', 
      al: '15/12/2024', 
      giorni: 1, 
      stato: 'pending', 
      motivo: 'Visita medica',
      dataRichiesta: '12/12/2024'
    },
    { 
      id: 3, 
      categoria: 'leave', 
      tipo: 'Ferie', 
      dal: '01/08/2024', 
      al: '15/08/2024', 
      giorni: 15, 
      stato: 'approved', 
      motivo: 'Vacanze estive',
      dataRichiesta: '15/06/2024'
    }
  ]);

  // Mock data performance
  const [performance] = useState([
    {
      id: 1,
      titolo: 'Obiettivi Q4 2024',
      progress: 85,
      scadenza: '31/12/2024',
      stato: 'in_progress',
      dettagli: 'Target vendite: 95.000€ (81.750€ raggiunti)'
    },
    {
      id: 2,
      titolo: 'Certificazione Sicurezza',
      progress: 100,
      scadenza: '15/01/2025',
      stato: 'completed',
      dettagli: 'Corso completato con valutazione A+'
    },
    {
      id: 3,
      titolo: 'Customer Satisfaction',
      progress: 92,
      scadenza: 'Ongoing',
      stato: 'excellent',
      dettagli: 'Media feedback clienti: 4.6/5.0'
    }
  ]);

  // Mock data training
  const [training] = useState([
    {
      id: 1,
      titolo: 'Advanced Sales Techniques',
      provider: 'WindTre Academy',
      progress: 65,
      scadenza: '20/01/2025',
      stato: 'in_progress',
      crediti: 25,
      tipo: 'Obbligatorio'
    },
    {
      id: 2,
      titolo: 'Digital Marketing Fundamentals',
      provider: 'LinkedIn Learning',
      progress: 100,
      scadenza: 'Completato',
      stato: 'completed',
      crediti: 15,
      tipo: 'Volontario',
      certificato: 'cert_001.pdf'
    },
    {
      id: 3,
      titolo: 'Leadership Skills',
      provider: 'WindTre Academy',
      progress: 0,
      scadenza: '30/03/2025',
      stato: 'assigned',
      crediti: 40,
      tipo: 'Sviluppo Carriera'
    }
  ]);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time utility
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm:ss');
  };

  // Handle HR Request
  const handleHRRequestSuccess = () => {
    setHrRequestModal({ open: false, data: null });
    // Refresh requests data
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get priority color
  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'Obbligatorio': return 'bg-red-100 text-red-800';
      case 'Sviluppo Carriera': return 'bg-blue-100 text-blue-800';
      case 'Volontario': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-indigo-50">
        {/* Header - Pattern Settings */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">Employee Dashboard</h1>
                <p className="text-gray-600 mt-1" data-testid="text-user-welcome">
                  Benvenuto, {userData.nome} {userData.cognome} • {userData.ruolo}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500" data-testid="label-current-time">Ora corrente</p>
                  <p className="text-xl font-mono font-bold text-gray-900" data-testid="text-current-time">
                    {formatTime(currentTime)}
                  </p>
                </div>
                <Avatar className="h-12 w-12" data-testid="avatar-user">
                  <AvatarImage src={userData.foto || undefined} alt={`${userData.nome} ${userData.cognome}`} />
                  <AvatarFallback className="bg-gradient-to-r from-orange-500 to-purple-500 text-white" data-testid="avatar-fallback">
                    {userData.nome[0]}{userData.cognome[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Navigation - Glassmorphism WindTre - Pattern Settings */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg p-2">
              <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                {EMPLOYEE_TABS.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={getTabUrl(tab.id)}
                      onClick={() => setTab(tab.id)}
                      className={`
                        flex-shrink-0 flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm
                        transition-all duration-200 hover:transform hover:translate-y-[-2px]
                        ${isActive
                          ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                        }
                      `}
                      data-testid={`tab-${tab.id}`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Area - Pattern Settings */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6" data-testid="section-overview">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Welcome Card */}
                  <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-orange-500" />
                        Benvenuto, {userData.nome}!
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg" data-testid="card-leave-balance">
                          <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                          <p className="text-sm text-green-700 font-medium" data-testid="label-leave-remaining">Ferie Rimanenti</p>
                          <p className="text-xl font-bold text-green-800" data-testid="text-leave-remaining">{leaveBalance.ferieRimanenti}</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg" data-testid="card-rol-balance">
                          <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm text-blue-700 font-medium" data-testid="label-rol-remaining">Permessi ROL</p>
                          <p className="text-xl font-bold text-blue-800" data-testid="text-rol-remaining">{leaveBalance.permessiRimanenti}</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg" data-testid="card-performance">
                          <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                          <p className="text-sm text-purple-700 font-medium" data-testid="label-performance">Performance</p>
                          <p className="text-xl font-bold text-purple-800" data-testid="text-performance-score">85%</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg" data-testid="card-training">
                          <GraduationCap className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                          <p className="text-sm text-orange-700 font-medium" data-testid="label-training">Formazione</p>
                          <p className="text-xl font-bold text-orange-800" data-testid="text-training-progress">2/3</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle data-testid="section-quick-actions">Azioni Rapide</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        onClick={() => setTab('requests')}
                        className="w-full justify-start bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                        data-testid="button-quick-request"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuova Richiesta
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setTab('documents')}
                        className="w-full justify-start"
                        data-testid="button-quick-documents"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Scarica Buste Paga
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setTab('time-attendance')}
                        className="w-full justify-start"
                        data-testid="button-quick-timesheet"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Timbrature
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Notifications */}
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="section-notifications">
                      <Bell className="h-5 w-5 text-orange-500" />
                      Notifiche Recenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {notifications.slice(0, 3).map((notification) => (
                        <Alert key={notification.id} className="border-l-4 border-l-orange-500" data-testid={`item-notification-${notification.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <AlertTitle className="text-sm font-medium" data-testid={`text-notification-title-${notification.id}`}>
                                {notification.titolo}
                              </AlertTitle>
                              <AlertDescription className="text-xs text-gray-600 mt-1" data-testid={`text-notification-message-${notification.id}`}>
                                {notification.messaggio}
                              </AlertDescription>
                            </div>
                            <Badge variant={notification.letto ? 'secondary' : 'default'} className="ml-2" data-testid={`badge-notification-status-${notification.id}`}>
                              {notification.letto ? 'Letto' : 'Nuovo'}
                            </Badge>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'time-attendance' && (
              <div className="space-y-6" data-testid="section-time-attendance">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Clock Widget */}
                  <div className="lg:col-span-1">
                    <ClockWidget
                      userId={userData.id}
                      userName={`${userData.nome} ${userData.cognome}`}
                      storeId="store-001"
                      storeName={userData.store}
                      className="bg-white/80 backdrop-blur-sm border border-white/20"
                    />
                  </div>

                  {/* Time Summary */}
                  <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle data-testid="section-time-summary">Riepilogo Orari</CardTitle>
                      <CardDescription>Settimana corrente</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Ore Lavorate</span>
                          <span className="font-semibold">38h 45m</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Straordinari</span>
                          <span className="font-semibold text-orange-600">2h 15m</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Pause</span>
                          <span className="font-semibold">4h 30m</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center text-lg">
                          <span className="font-medium">Totale Settimana</span>
                          <span className="font-bold text-purple-600">41h 00m</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Time Entries */}
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle data-testid="section-recent-timesheet">Timbrature Recenti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Data</th>
                            <th className="text-left py-2">Entrata</th>
                            <th className="text-left py-2">Uscita</th>
                            <th className="text-left py-2">Ore Totali</th>
                            <th className="text-left py-2">Stato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { data: 'Oggi', entrata: '08:30', uscita: '-', ore: '7h 30m', stato: 'attivo' },
                            { data: 'Ieri', entrata: '08:15', uscita: '18:45', ore: '9h 30m', stato: 'completo' },
                            { data: '18/12', entrata: '09:00', uscita: '17:15', ore: '7h 45m', stato: 'completo' },
                            { data: '17/12', entrata: '08:45', uscita: '17:30', ore: '8h 15m', stato: 'completo' },
                            { data: '16/12', entrata: '08:30', uscita: '17:00', ore: '8h 00m', stato: 'completo' }
                          ].map((entry, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50/50" data-testid={`row-timesheet-${index}`}>
                              <td className="py-2" data-testid={`cell-date-${index}`}>{entry.data}</td>
                              <td className="py-2" data-testid={`cell-entry-${index}`}>{entry.entrata}</td>
                              <td className="py-2" data-testid={`cell-exit-${index}`}>{entry.uscita}</td>
                              <td className="py-2" data-testid={`cell-hours-${index}`}>{entry.ore}</td>
                              <td className="py-2">
                                <Badge variant={entry.stato === 'attivo' ? 'default' : 'secondary'} data-testid={`badge-status-${index}`}>
                                  {entry.stato}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-6" data-testid="section-requests">
                {/* New Request Button */}
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Crea Nuova Richiesta</h3>
                        <p className="text-gray-600">Ferie, permessi, formazione e molto altro</p>
                      </div>
                      <Dialog open={hrRequestModal.open} onOpenChange={(open) => setHrRequestModal({ open, data: null })}>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                            data-testid="button-open-modal"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuova Richiesta
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-hr-request">
                          <HRRequestWizard
                            onSuccess={handleHRRequestSuccess}
                            onCancel={() => setHrRequestModal({ open: false, data: null })}
                            data-testid="wizard-hr-request"
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* My Requests */}
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle data-testid="section-my-requests">Le Mie Richieste</CardTitle>
                    <CardDescription>Storico delle richieste inviate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {myRequests.map((request) => (
                        <div 
                          key={request.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50/50 transition-colors"
                          data-testid={`item-request-${request.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="text-xs" data-testid={`badge-category-${request.id}`}>
                                {request.categoria}
                              </Badge>
                              <h4 className="font-medium" data-testid={`text-request-type-${request.id}`}>{request.tipo}</h4>
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(request.stato)}`} data-testid={`status-indicator-${request.id}`}></div>
                            </div>
                            <p className="text-sm text-gray-600" data-testid={`text-request-dates-${request.id}`}>
                              {request.dal} {request.al !== request.dal && `- ${request.al}`} 
                              {request.giorni > 1 && ` (${request.giorni} giorni)`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1" data-testid={`text-request-submitted-${request.id}`}>
                              Richiesta inviata il {request.dataRichiesta}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              request.stato === 'approved' ? 'default' :
                              request.stato === 'pending' ? 'secondary' :
                              'destructive'
                            } data-testid={`badge-request-status-${request.id}`}>
                              {request.stato === 'approved' ? 'Approvata' :
                               request.stato === 'pending' ? 'In Attesa' :
                               'Rifiutata'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6" data-testid="section-documents">
                <PayslipManager data-testid="component-payslip-manager" />
                
                {/* Other Documents */}
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle>Altri Documenti</CardTitle>
                    <CardDescription>Contratti, certificati e documenti personali</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { nome: 'Contratto di Lavoro', tipo: 'Contratto', data: '15/03/2022', size: '1.2 MB' },
                        { nome: 'Policy Aziendale 2024', tipo: 'Policy', data: '01/01/2024', size: '890 KB' },
                        { nome: 'Certificato Sicurezza', tipo: 'Certificato', data: '20/01/2024', size: '156 KB' },
                        { nome: 'Piano Welfare 2024', tipo: 'Benefit', data: '01/12/2023', size: '2.1 MB' }
                      ].map((doc, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-purple-600" />
                            <div>
                              <h4 className="font-medium">{doc.nome}</h4>
                              <p className="text-sm text-gray-600">{doc.tipo} • {doc.size}</p>
                              <p className="text-xs text-gray-500">Caricato il {doc.data}</p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-download-doc-${index}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6" data-testid="section-performance">
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle>I Miei Obiettivi</CardTitle>
                    <CardDescription>Performance personale e goals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {performance.map((goal) => (
                        <div key={goal.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{goal.titolo}</h4>
                            <Badge variant={goal.stato === 'completed' ? 'default' : 'secondary'}>
                              {goal.stato === 'completed' ? 'Completato' :
                               goal.stato === 'excellent' ? 'Eccellente' : 'In Corso'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>
                          <p className="text-sm text-gray-600 mt-3">{goal.dettagli}</p>
                          <p className="text-xs text-gray-500 mt-2">Scadenza: {goal.scadenza}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-6" data-testid="section-training">
                <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle>I Miei Corsi</CardTitle>
                    <CardDescription>Formazione assegnata e volontaria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {training.map((course) => (
                        <div key={course.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium">{course.titolo}</h4>
                                <Badge variant="outline" className={getPriorityColor(course.tipo)}>
                                  {course.tipo}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{course.provider}</p>
                            </div>
                            <div className="text-right">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(course.stato)} mb-1`}></div>
                              <p className="text-xs text-gray-500">{course.crediti} crediti</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span>Completamento</span>
                              <span>{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {course.stato === 'completed' ? 'Completato' : `Scadenza: ${course.scadenza}`}
                            </p>
                            <div className="flex gap-2">
                              {course.certificato && (
                                <Button variant="outline" size="sm" data-testid={`button-certificate-${course.id}`}>
                                  <Download className="h-3 w-3 mr-1" />
                                  Certificato
                                </Button>
                              )}
                              {course.stato !== 'completed' && (
                                <Button size="sm" data-testid={`button-continue-${course.id}`}>
                                  {course.progress === 0 ? 'Inizia' : 'Continua'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6" data-testid="section-profile">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Info */}
                  <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Informazioni Personali
                        <Button variant="outline" size="sm" data-testid="button-edit-profile">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Modifica
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={userData.foto || undefined} />
                          <AvatarFallback className="bg-gradient-to-r from-orange-500 to-purple-500 text-white text-xl">
                            {userData.nome[0]}{userData.cognome[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{userData.nome} {userData.cognome}</h3>
                          <p className="text-gray-600">{userData.ruolo}</p>
                          <p className="text-sm text-gray-500">Matricola: {userData.matricola}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{userData.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{userData.telefono}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{userData.reparto}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{userData.store}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Dal {userData.dataAssunzione}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Settings */}
                  <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle>Impostazioni Account</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Notifiche Email</Label>
                            <p className="text-xs text-gray-500">Ricevi aggiornamenti via email</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Notifiche Push</Label>
                            <p className="text-xs text-gray-500">Notifiche sul dispositivo</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Modalità Scura</Label>
                            <p className="text-xs text-gray-500">Tema dell'interfaccia</p>
                          </div>
                          <input type="checkbox" className="rounded" />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Lingua</Label>
                          <select className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="it">Italiano</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Fuso Orario</Label>
                          <select className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="Europe/Rome">Europe/Rome</option>
                            <option value="Europe/London">Europe/London</option>
                          </select>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="pt-4">
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
                          <Save className="h-4 w-4 mr-2" />
                          Salva Impostazioni
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}