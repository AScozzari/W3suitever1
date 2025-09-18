import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, Calendar as CalendarIcon, FileText, DollarSign, GraduationCap, Receipt,
  MapPin, Coffee, Play, Pause, CheckCircle, XCircle, AlertCircle, Users,
  Download, Upload, Target, Award, TrendingUp, Sun, Moon, Sunrise, Sunset,
  Home, Briefcase, Heart, Umbrella, Plane, Baby, School, HeartHandshake,
  Bell, ChevronRight, MoreVertical, Star, Activity, BarChart3, User,
  Settings, HelpCircle, LogOut, Shield, Zap, Gift, Wallet, Building, Plus
} from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, isToday, isSameDay, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';

export default function EmployeeDashboard() {
  // Stati principali
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [breakTime, setBreakTime] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock data per l'utente
  const userData = {
    nome: 'Marco',
    cognome: 'Rossi',
    ruolo: 'Senior Account Manager',
    reparto: 'Vendite Enterprise',
    matricola: 'W3-2024-0156',
    foto: null,
    email: 'marco.rossi@w3suite.com',
    telefono: '+39 335 123 4567',
    dataAssunzione: '15/03/2022',
    manager: 'Laura Bianchi'
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

  // Mock data timbrature
  const [timbrature] = useState([
    { data: new Date(), entrata: '09:00', uscita: '18:30', ore: '9h 30m', pausa: '1h', stato: 'completo' },
    { data: addDays(new Date(), -1), entrata: '08:45', uscita: '17:45', ore: '9h', pausa: '1h', stato: 'completo' },
    { data: addDays(new Date(), -2), entrata: '09:15', uscita: '19:00', ore: '9h 45m', pausa: '1h', stato: 'straordinario' },
    { data: addDays(new Date(), -3), entrata: '09:00', uscita: '18:00', ore: '9h', pausa: '1h', stato: 'completo' },
    { data: addDays(new Date(), -4), entrata: '08:30', uscita: '17:30', ore: '9h', pausa: '1h', stato: 'completo' }
  ]);

  // Mock data richieste ferie
  const [leaveRequests] = useState([
    {
      id: 1,
      tipo: 'Ferie',
      dal: '20/12/2024',
      al: '24/12/2024',
      giorni: 3,
      stato: 'approved',
      motivo: 'Vacanze natalizie',
      approvatore: 'Laura Bianchi'
    },
    {
      id: 2,
      tipo: 'Permesso ROL',
      dal: '15/01/2025',
      al: '15/01/2025',
      giorni: 1,
      stato: 'pending',
      motivo: 'Visita medica',
      approvatore: '-'
    },
    {
      id: 3,
      tipo: 'Ferie',
      dal: '10/08/2024',
      al: '20/08/2024',
      giorni: 10,
      stato: 'approved',
      motivo: 'Ferie estive',
      approvatore: 'Laura Bianchi'
    }
  ]);

  // Mock data turni
  const [shifts] = useState([
    { data: new Date(), turno: 'Mattino', dalle: '09:00', alle: '18:00', reparto: 'Vendite' },
    { data: addDays(new Date(), 1), turno: 'Mattino', dalle: '09:00', alle: '18:00', reparto: 'Vendite' },
    { data: addDays(new Date(), 2), turno: 'Pomeriggio', dalle: '14:00', alle: '22:00', reparto: 'Vendite' },
    { data: addDays(new Date(), 3), turno: 'Mattino', dalle: '09:00', alle: '18:00', reparto: 'Vendite' },
    { data: addDays(new Date(), 4), turno: 'Riposo', dalle: '-', alle: '-', reparto: '-' }
  ]);

  // Mock data documenti
  const [documents] = useState([
    { id: 1, tipo: 'Busta paga', nome: 'Cedolino Novembre 2024', data: '30/11/2024', size: '245 KB' },
    { id: 2, tipo: 'Busta paga', nome: 'Cedolino Ottobre 2024', data: '31/10/2024', size: '243 KB' },
    { id: 3, tipo: 'Contratto', nome: 'Contratto di lavoro', data: '15/03/2022', size: '1.2 MB' },
    { id: 4, tipo: 'Policy', nome: 'Regolamento aziendale 2024', data: '01/01/2024', size: '856 KB' },
    { id: 5, tipo: 'Certificato', nome: 'CUD 2023', data: '28/02/2024', size: '156 KB' },
    { id: 6, tipo: 'Benefit', nome: 'Piano Welfare 2025', data: '01/12/2024', size: '445 KB' }
  ]);

  // Mock data spese
  const [expenses] = useState([
    { id: 1, data: '05/12/2024', tipo: 'Trasporto', descrizione: 'Taxi cliente Milano', importo: 45.00, stato: 'pending' },
    { id: 2, data: '01/12/2024', tipo: 'Pranzo', descrizione: 'Pranzo di lavoro', importo: 85.50, stato: 'approved' },
    { id: 3, data: '28/11/2024', tipo: 'Hotel', descrizione: 'Pernottamento Roma', importo: 120.00, stato: 'approved' },
    { id: 4, data: '25/11/2024', tipo: 'Trasporto', descrizione: 'Treno Milano-Roma', importo: 89.90, stato: 'approved' }
  ]);

  // Mock data training
  const [trainings] = useState([
    {
      id: 1,
      titolo: 'Sales Excellence 2025',
      tipo: 'Obbligatorio',
      progresso: 75,
      scadenza: '31/12/2024',
      durata: '8 ore',
      stato: 'in_progress'
    },
    {
      id: 2,
      titolo: 'GDPR e Privacy',
      tipo: 'Obbligatorio',
      progresso: 100,
      scadenza: '30/06/2024',
      durata: '2 ore',
      stato: 'completed'
    },
    {
      id: 3,
      titolo: 'Leadership Skills',
      tipo: 'Facoltativo',
      progresso: 30,
      scadenza: '31/03/2025',
      durata: '12 ore',
      stato: 'in_progress'
    },
    {
      id: 4,
      titolo: 'Sicurezza sul lavoro',
      tipo: 'Obbligatorio',
      progresso: 0,
      scadenza: '15/01/2025',
      durata: '4 ore',
      stato: 'not_started'
    }
  ]);

  // Mock data team calendar
  const [teamAbsences] = useState([
    { nome: 'Giulia Verdi', tipo: 'Ferie', dal: '18/12', al: '22/12' },
    { nome: 'Andrea Bianchi', tipo: 'Malattia', dal: '10/12', al: '11/12' },
    { nome: 'Sofia Romano', tipo: 'Permesso', dal: '15/12', al: '15/12' },
    { nome: 'Luca Esposito', tipo: 'Ferie', dal: '23/12', al: '31/12' }
  ]);

  // Mock data performance goals
  const [goals] = useState([
    { id: 1, titolo: 'Fatturato Q4', target: '€150.000', attuale: '€112.500', progresso: 75 },
    { id: 2, titolo: 'Nuovi clienti', target: '15', attuale: '12', progresso: 80 },
    { id: 3, titolo: 'Retention rate', target: '95%', attuale: '92%', progresso: 97 },
    { id: 4, titolo: 'Upselling', target: '€50.000', attuale: '€45.000', progresso: 90 }
  ]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate worked time
  const calculateWorkedTime = () => {
    if (!isClockedIn || !clockInTime) return '00:00:00';
    const diff = differenceInMinutes(currentTime, clockInTime) - breakTime;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    const seconds = currentTime.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle clock in/out
  const handleClockAction = () => {
    if (!isClockedIn) {
      setIsClockedIn(true);
      setClockInTime(new Date());
    } else {
      setIsClockedIn(false);
      setClockInTime(null);
      setBreakTime(0);
      setIsOnBreak(false);
    }
  };

  // Handle break
  const handleBreakAction = () => {
    setIsOnBreak(!isOnBreak);
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  // Get status badge variant
  const getStatusVariant = (stato: string) => {
    switch (stato) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'not_started': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Layout currentModule="employee" setCurrentModule={() => {}}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userData.foto || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-600 text-white text-xl">
                    {userData.nome[0]}{userData.cognome[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {getGreeting()}, {userData.nome}! 👋
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {userData.ruolo} • {userData.reparto}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
                </Button>
                <Button variant="outline" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Real-time Clock Widget */}
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Clock className="h-8 w-8 text-white/80" />
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {isClockedIn ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </div>
                <div className="text-3xl font-bold mb-2">
                  {format(currentTime, 'HH:mm:ss')}
                </div>
                <div className="text-sm text-white/80 mb-4">
                  {format(currentTime, 'EEEE d MMMM yyyy', { locale: it })}
                </div>
                {isClockedIn && (
                  <div className="text-sm font-medium">
                    Tempo lavorato: {calculateWorkedTime()}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={handleClockAction}
                    className={`flex-1 ${isClockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                    size="sm"
                  >
                    {isClockedIn ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </Button>
                  {isClockedIn && (
                    <Button 
                      onClick={handleBreakAction}
                      variant="secondary" 
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white"
                    >
                      <Coffee className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isClockedIn && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-white/80">
                    <MapPin className="h-3 w-3" />
                    Milano, Sede Centrale
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ferie Disponibili */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Umbrella className="h-8 w-8 text-blue-500" />
                  <Badge variant="outline">{leaveBalance.ferieRimanenti} giorni</Badge>
                </div>
                <div className="text-2xl font-bold mb-1">Ferie</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {leaveBalance.ferieUsate}/{leaveBalance.ferieAnno} utilizzati
                </div>
                <Progress value={(leaveBalance.ferieUsate / leaveBalance.ferieAnno) * 100} className="h-2" />
              </CardContent>
            </Card>

            {/* Prossimo Turno */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <CalendarIcon className="h-8 w-8 text-purple-500" />
                  <Badge variant="outline">Domani</Badge>
                </div>
                <div className="text-2xl font-bold mb-1">Turno</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {shifts[1].turno} • {shifts[1].dalle} - {shifts[1].alle}
                </div>
                <Button variant="link" className="p-0 mt-2 text-purple-600">
                  Vedi calendario →
                </Button>
              </CardContent>
            </Card>

            {/* Tasks Pendenti */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Target className="h-8 w-8 text-green-500" />
                  <Badge variant="outline" className="bg-green-50 text-green-700">4 attivi</Badge>
                </div>
                <div className="text-2xl font-bold mb-1">Obiettivi</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Performance Q4
                </div>
                <Progress value={85} className="h-2 mt-4" />
                <div className="text-xs text-gray-500 mt-1">85% completamento</div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications Alert */}
          {notifications.filter(n => !n.letto).length > 0 && (
            <Alert className="mb-8 border-orange-200 bg-orange-50">
              <Bell className="h-4 w-4 text-orange-600" />
              <AlertTitle>Notifiche non lette</AlertTitle>
              <AlertDescription>
                Hai {notifications.filter(n => !n.letto).length} notifiche da leggere
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 lg:grid-cols-6 h-auto">
              <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="timbrature" className="flex items-center gap-1 text-xs sm:text-sm">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Timbrature</span>
              </TabsTrigger>
              <TabsTrigger value="ferie" className="flex items-center gap-1 text-xs sm:text-sm">
                <Umbrella className="h-4 w-4" />
                <span className="hidden sm:inline">Ferie</span>
              </TabsTrigger>
              <TabsTrigger value="turni" className="flex items-center gap-1 text-xs sm:text-sm">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Turni</span>
              </TabsTrigger>
              <TabsTrigger value="documenti" className="flex items-center gap-1 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documenti</span>
              </TabsTrigger>
              <TabsTrigger value="formazione" className="flex items-center gap-1 text-xs sm:text-sm">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Formazione</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Notifiche Recenti */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Notifiche e Annunci</CardTitle>
                    <CardDescription>Aggiornamenti importanti dall'azienda</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {notifications.map((notifica) => (
                          <div key={notifica.id} className={`p-4 rounded-lg border ${notifica.letto ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${
                                notifica.tipo === 'success' ? 'bg-green-100' :
                                notifica.tipo === 'alert' ? 'bg-orange-100' :
                                'bg-blue-100'
                              }`}>
                                {notifica.tipo === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                                 notifica.tipo === 'alert' ? <AlertCircle className="h-4 w-4 text-orange-600" /> :
                                 <Bell className="h-4 w-4 text-blue-600" />}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{notifica.titolo}</h4>
                                <p className="text-sm text-gray-600 mt-1">{notifica.messaggio}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {format(notifica.data, 'dd/MM/yyyy HH:mm')}
                                </p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Azioni Rapide</CardTitle>
                    <CardDescription>Accedi velocemente alle funzioni più usate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-20 flex-col gap-2">
                        <Umbrella className="h-5 w-5" />
                        <span className="text-xs">Richiedi Ferie</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2">
                        <FileText className="h-5 w-5" />
                        <span className="text-xs">Busta Paga</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2">
                        <Receipt className="h-5 w-5" />
                        <span className="text-xs">Nota Spese</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2">
                        <GraduationCap className="h-5 w-5" />
                        <span className="text-xs">Corsi</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2">
                        <Users className="h-5 w-5" />
                        <span className="text-xs">Team</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2">
                        <HelpCircle className="h-5 w-5" />
                        <span className="text-xs">Supporto</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Goals */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Obiettivi di Performance Q4</CardTitle>
                    <CardDescription>Il tuo progresso verso gli obiettivi trimestrali</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {goals.map((goal) => (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{goal.titolo}</span>
                            <Badge variant={goal.progresso >= 90 ? 'success' : goal.progresso >= 70 ? 'warning' : 'secondary'}>
                              {goal.progresso}%
                            </Badge>
                          </div>
                          <Progress value={goal.progresso} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{goal.attuale}</span>
                            <span>{goal.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Timbrature Tab */}
            <TabsContent value="timbrature" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Status Card */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Stato Timbratura Corrente</CardTitle>
                    <CardDescription>Sessione di lavoro attuale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className={`p-3 rounded-full ${isClockedIn ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {isClockedIn ? <Play className="h-5 w-5 text-green-600" /> : <Pause className="h-5 w-5 text-gray-600" />}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Stato</p>
                          <p className="font-semibold">{isClockedIn ? 'In servizio' : 'Fuori servizio'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="p-3 rounded-full bg-blue-100">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Entrata</p>
                          <p className="font-semibold">{clockInTime ? format(clockInTime, 'HH:mm') : '--:--'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="p-3 rounded-full bg-purple-100">
                          <Activity className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Ore lavorate</p>
                          <p className="font-semibold">{calculateWorkedTime()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="p-3 rounded-full bg-orange-100">
                          <Coffee className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pausa</p>
                          <p className="font-semibold">{breakTime} min</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Storico Timbrature */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Storico Timbrature</CardTitle>
                    <CardDescription>Ultime timbrature registrate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {timbrature.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-500">{format(t.data, 'EEE', { locale: it }).toUpperCase()}</p>
                              <p className="text-lg font-bold">{format(t.data, 'dd')}</p>
                              <p className="text-xs text-gray-500">{format(t.data, 'MMM', { locale: it })}</p>
                            </div>
                            <Separator orientation="vertical" className="h-12" />
                            <div>
                              <div className="flex items-center gap-2">
                                <Sunrise className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{t.entrata}</span>
                                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
                                <Sunset className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{t.uscita}</span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span>Totale: {t.ore}</span>
                                <span>Pausa: {t.pausa}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={
                            t.stato === 'straordinario' ? 'warning' :
                            t.stato === 'completo' ? 'success' : 'default'
                          }>
                            {t.stato === 'straordinario' ? 'Straordinario' : 'Regolare'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Esporta Report Mensile
                    </Button>
                  </CardFooter>
                </Card>

                {/* GPS Location */}
                <Card>
                  <CardHeader>
                    <CardTitle>Posizione GPS</CardTitle>
                    <CardDescription>Verifica posizione timbratura</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 opacity-50" />
                      <div className="relative z-10 text-center">
                        <MapPin className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                        <p className="font-semibold">Milano, Sede Centrale</p>
                        <p className="text-sm text-gray-600 mt-1">Via Lorenteggio 240</p>
                        <p className="text-xs text-gray-500 mt-2">45.4612° N, 9.1474° E</p>
                        <Badge className="mt-3" variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Posizione verificata
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Ferie Tab */}
            <TabsContent value="ferie" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leave Balance Cards */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Umbrella className="h-8 w-8 text-blue-500" />
                        <Badge variant="outline">Annuali</Badge>
                      </div>
                      <p className="text-2xl font-bold">{leaveBalance.ferieRimanenti}</p>
                      <p className="text-sm text-gray-600">giorni di ferie</p>
                      <Progress value={(leaveBalance.ferieUsate / leaveBalance.ferieAnno) * 100} className="h-1 mt-3" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="h-8 w-8 text-purple-500" />
                        <Badge variant="outline">ROL</Badge>
                      </div>
                      <p className="text-2xl font-bold">{leaveBalance.permessiRimanenti}</p>
                      <p className="text-sm text-gray-600">ore permessi</p>
                      <Progress value={(leaveBalance.permessiUsati / leaveBalance.permessiROL) * 100} className="h-1 mt-3" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Heart className="h-8 w-8 text-red-500" />
                        <Badge variant="outline">2024</Badge>
                      </div>
                      <p className="text-2xl font-bold">{leaveBalance.malattia}</p>
                      <p className="text-sm text-gray-600">giorni malattia</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Baby className="h-8 w-8 text-green-500" />
                        <Badge variant="outline">Extra</Badge>
                      </div>
                      <p className="text-2xl font-bold">{leaveBalance.congedi}</p>
                      <p className="text-sm text-gray-600">congedi parentali</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Leave Requests */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Richieste Ferie e Permessi</CardTitle>
                    <CardDescription>Storico e stato delle tue richieste</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaveRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusVariant(request.stato)}>
                                  {request.stato === 'approved' ? 'Approvata' :
                                   request.stato === 'pending' ? 'In attesa' : 'Rifiutata'}
                                </Badge>
                                <span className="font-medium">{request.tipo}</span>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <p>Dal {request.dal} al {request.al} ({request.giorni} giorni)</p>
                                <p className="mt-1">Motivo: {request.motivo}</p>
                                {request.approvatore !== '-' && (
                                  <p className="mt-1">Approvato da: {request.approvatore}</p>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuova Richiesta
                    </Button>
                  </CardFooter>
                </Card>

                {/* Team Calendar */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Calendar</CardTitle>
                    <CardDescription>Assenze del tuo team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {teamAbsences.map((absence, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{absence.nome.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{absence.nome}</p>
                              <p className="text-xs text-gray-600">{absence.dal} - {absence.al}</p>
                            </div>
                          </div>
                          <Badge variant={
                            absence.tipo === 'Malattia' ? 'destructive' :
                            absence.tipo === 'Ferie' ? 'success' : 'warning'
                          } className="text-xs">
                            {absence.tipo}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Turni Tab */}
            <TabsContent value="turni" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Calendar View */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Calendario Turni</CardTitle>
                    <CardDescription>Vista mensile dei tuoi turni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>

                {/* Shift Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Prossimi Turni</CardTitle>
                    <CardDescription>I tuoi turni per i prossimi giorni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {shifts.map((shift, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${isToday(shift.data) ? 'bg-blue-50 border-blue-200' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {format(shift.data, 'EEEE d MMMM', { locale: it })}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {shift.turno === 'Riposo' ? (
                                  <Badge variant="secondary">Riposo</Badge>
                                ) : (
                                  <>
                                    <Badge variant={shift.turno === 'Mattino' ? 'success' : 'warning'}>
                                      {shift.turno}
                                    </Badge>
                                    <span className="text-sm text-gray-600">
                                      {shift.dalle} - {shift.alle}
                                    </span>
                                  </>
                                )}
                              </div>
                              {shift.reparto !== '-' && (
                                <p className="text-xs text-gray-500 mt-1">{shift.reparto}</p>
                              )}
                            </div>
                            {isToday(shift.data) && (
                              <Badge variant="default" className="bg-blue-500">Oggi</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button variant="outline" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Richiedi Cambio Turno
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Imposta Disponibilità
                    </Button>
                  </CardFooter>
                </Card>

                {/* Overtime Tracking */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Riepilogo Straordinari</CardTitle>
                    <CardDescription>Ore di straordinario accumulate questo mese</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-orange-600">12.5</p>
                        <p className="text-sm text-gray-600">Ore questo mese</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-purple-600">€ 375</p>
                        <p className="text-sm text-gray-600">Valore stimato</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">45.5</p>
                        <p className="text-sm text-gray-600">Ore anno 2024</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Documenti Tab */}
            <TabsContent value="documenti" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Payslips */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Documenti e Buste Paga</CardTitle>
                    <CardDescription>Accedi ai tuoi documenti aziendali</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              doc.tipo === 'Busta paga' ? 'bg-green-100' :
                              doc.tipo === 'Contratto' ? 'bg-blue-100' :
                              doc.tipo === 'Policy' ? 'bg-purple-100' :
                              doc.tipo === 'Certificato' ? 'bg-orange-100' :
                              'bg-gray-100'
                            }`}>
                              <FileText className={`h-5 w-5 ${
                                doc.tipo === 'Busta paga' ? 'text-green-600' :
                                doc.tipo === 'Contratto' ? 'text-blue-600' :
                                doc.tipo === 'Policy' ? 'text-purple-600' :
                                doc.tipo === 'Certificato' ? 'text-orange-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{doc.nome}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{doc.tipo}</span>
                                <span>•</span>
                                <span>{doc.data}</span>
                                <span>•</span>
                                <span>{doc.size}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      Vedi tutti i documenti
                    </Button>
                  </CardFooter>
                </Card>

                {/* Benefits Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>I tuoi Benefit</CardTitle>
                    <CardDescription>Piano welfare e vantaggi aziendali</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Assicurazione Sanitaria</span>
                        </div>
                        <p className="text-sm text-gray-600">Copertura completa per te e famiglia</p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">Buoni Pasto</span>
                        </div>
                        <p className="text-sm text-gray-600">€ 8,00 per giorno lavorativo</p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Gift className="h-5 w-5 text-orange-600" />
                          <span className="font-medium">Flexible Benefit</span>
                        </div>
                        <p className="text-sm text-gray-600">€ 2.000 annui disponibili</p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">Convenzioni</span>
                        </div>
                        <p className="text-sm text-gray-600">Sconti e agevolazioni partner</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white">
                      Gestisci Benefit
                    </Button>
                  </CardFooter>
                </Card>

                {/* Expense Reports */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Note Spese Recenti</CardTitle>
                    <CardDescription>Le tue richieste di rimborso spese</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 text-sm font-medium text-gray-600">Data</th>
                            <th className="text-left py-2 text-sm font-medium text-gray-600">Tipo</th>
                            <th className="text-left py-2 text-sm font-medium text-gray-600">Descrizione</th>
                            <th className="text-right py-2 text-sm font-medium text-gray-600">Importo</th>
                            <th className="text-center py-2 text-sm font-medium text-gray-600">Stato</th>
                            <th className="text-right py-2 text-sm font-medium text-gray-600">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((expense) => (
                            <tr key={expense.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 text-sm">{expense.data}</td>
                              <td className="py-3 text-sm">{expense.tipo}</td>
                              <td className="py-3 text-sm">{expense.descrizione}</td>
                              <td className="py-3 text-sm text-right font-medium">€ {expense.importo.toFixed(2)}</td>
                              <td className="py-3 text-center">
                                <Badge variant={getStatusVariant(expense.stato)}>
                                  {expense.stato === 'approved' ? 'Approvato' : 
                                   expense.stato === 'pending' ? 'In attesa' : 'Rifiutato'}
                                </Badge>
                              </td>
                              <td className="py-3 text-right">
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="mr-2">
                      <Upload className="h-4 w-4 mr-2" />
                      Carica Ricevute
                    </Button>
                    <Button className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuova Nota Spese
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            {/* Formazione Tab */}
            <TabsContent value="formazione" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Training Courses */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Corsi di Formazione</CardTitle>
                    <CardDescription>I tuoi percorsi formativi assegnati</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {trainings.map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{course.titolo}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge variant={course.tipo === 'Obbligatorio' ? 'destructive' : 'secondary'}>
                                  {course.tipo}
                                </Badge>
                                <span className="text-sm text-gray-600">Durata: {course.durata}</span>
                                <span className="text-sm text-gray-600">Scadenza: {course.scadenza}</span>
                              </div>
                            </div>
                            <Button variant={course.progresso === 100 ? 'ghost' : 'default'} size="sm">
                              {course.progresso === 100 ? <Award className="h-4 w-4" /> : 'Continua'}
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span className="font-medium">{course.progresso}%</span>
                            </div>
                            <Progress value={course.progresso} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Certifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Certificazioni</CardTitle>
                    <CardDescription>Le tue certificazioni professionali</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <Shield className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Sicurezza Base</p>
                            <p className="text-xs text-gray-600">Valida fino: 31/12/2024</p>
                          </div>
                          <Badge variant="success">Attiva</Badge>
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-full">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">GDPR Advanced</p>
                            <p className="text-xs text-gray-600">Scade: 15/01/2025</p>
                          </div>
                          <Badge variant="warning">In scadenza</Badge>
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Award className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Sales Master</p>
                            <p className="text-xs text-gray-600">Conseguita: 10/06/2024</p>
                          </div>
                          <Badge variant="default">Permanente</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <Star className="h-4 w-4 mr-2" />
                      Vedi tutte le certificazioni
                    </Button>
                  </CardFooter>
                </Card>

                {/* Skills & Development */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Piano di Sviluppo Personale</CardTitle>
                    <CardDescription>Il tuo percorso di crescita professionale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Competenze da Sviluppare</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">Negoziazione avanzata</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">Project management</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">Data analysis</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Prossimi Step Carriera</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Team Leader (2025)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Sales Manager (2026)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Director (2028)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}