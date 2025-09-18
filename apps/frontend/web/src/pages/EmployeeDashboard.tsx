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
    { data: new Date(), entrata: '08:30', uscita: '17:30', ore: '8h 30m', pausa: '30m', stato: 'completo' },
    { data: addDays(new Date(), -1), entrata: '08:15', uscita: '18:45', ore: '9h 30m', pausa: '45m', stato: 'straordinario' },
    { data: addDays(new Date(), -2), entrata: '09:00', uscita: '17:15', ore: '7h 45m', pausa: '30m', stato: 'completo' },
    { data: addDays(new Date(), -3), entrata: '08:45', uscita: '17:30', ore: '8h 15m', pausa: '30m', stato: 'completo' },
    { data: addDays(new Date(), -4), entrata: '08:30', uscita: '17:00', ore: '8h 00m', pausa: '30m', stato: 'completo' }
  ]);

  // Mock data richieste ferie
  const [leaveRequests] = useState([
    { id: 1, tipo: 'Ferie', dal: '20/12/2024', al: '24/12/2024', giorni: 5, stato: 'approved', motivo: 'Vacanze natalizie' },
    { id: 2, tipo: 'Permesso', dal: '15/12/2024', al: '15/12/2024', giorni: 1, stato: 'pending', motivo: 'Visita medica' },
    { id: 3, tipo: 'Ferie', dal: '01/08/2024', al: '15/08/2024', giorni: 15, stato: 'approved', motivo: 'Vacanze estive' }
  ]);

  // Mock data turni
  const [shifts] = useState([
    { id: 1, data: format(new Date(), 'yyyy-MM-dd'), turno: 'Mattino', dalle: '08:00', alle: '16:00', store: 'Milano Centro', stato: 'attivo' },
    { id: 2, data: format(addDays(new Date(), 1), 'yyyy-MM-dd'), turno: 'Pomeriggio', dalle: '14:00', alle: '22:00', store: 'Milano Centro', stato: 'programmato' },
    { id: 3, data: format(addDays(new Date(), 2), 'yyyy-MM-dd'), turno: 'Mattino', dalle: '08:00', alle: '16:00', store: 'Milano Centro', stato: 'programmato' }
  ]);

  // Mock data documenti
  const [documents] = useState([
    { id: 1, nome: 'Busta Paga Novembre 2024', tipo: 'Busta paga', data: '30/11/2024', size: '245 KB' },
    { id: 2, nome: 'Contratto di Lavoro', tipo: 'Contratto', data: '15/03/2022', size: '1.2 MB' },
    { id: 3, nome: 'Policy Aziendale 2024', tipo: 'Policy', data: '01/01/2024', size: '890 KB' },
    { id: 4, nome: 'Certificato Sicurezza', tipo: 'Certificato', data: '20/01/2024', size: '156 KB' }
  ]);

  // Mock data spese
  const [expenses] = useState([
    { id: 1, data: '10/12/2024', descrizione: 'Pranzo cliente - Contratto Enterprise', importo: 45.50, categoria: 'Pasti', stato: 'approved' },
    { id: 2, data: '08/12/2024', descrizione: 'Taxi aeroporto', importo: 25.00, categoria: 'Trasporti', stato: 'pending' },
    { id: 3, data: '05/12/2024', descrizione: 'Hotel Milano - Fiera', importo: 120.00, categoria: 'Alloggio', stato: 'approved' }
  ]);

  // Mock data formazione
  const [training] = useState([
    {
      id: 1,
      titolo: 'Vendite Consultive Avanzate',
      descrizione: 'Tecniche avanzate di vendita e gestione clienti',
      progresso: 75,
      scadenza: '31/12/2024',
      durata: '8 ore',
      tipo: 'Obbligatorio',
      stato: 'in_progress'
    },
    {
      id: 2,
      titolo: 'Sicurezza sul Lavoro',
      descrizione: 'Corso di aggiornamento sicurezza',
      progresso: 100,
      scadenza: '15/01/2025',
      durata: '4 ore',
      tipo: 'Obbligatorio',
      stato: 'completed'
    },
    {
      id: 3,
      titolo: 'Leadership e Team Management',
      descrizione: 'Sviluppo competenze manageriali',
      progresso: 0,
      scadenza: '15/01/2025',
      durata: '4 ore',
      tipo: 'Obbligatorio',
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
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-none">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full">
            {/* Real-time Clock Widget */}
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(255,105,0,0.35)] border border-white/15 backdrop-blur-lg cursor-pointer">
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
                    className={`flex-1 bg-white/15 hover:bg-white/25 ring-1 ring-white/20 focus-visible:ring-2 focus-visible:ring-white/40 text-white transition-all duration-200`}
                    size="sm"
                    data-testid="button-clock-in"
                  >
                    {isClockedIn ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </Button>
                  {isClockedIn && (
                    <Button 
                      onClick={handleBreakAction}
                      variant="secondary" 
                      size="sm"
                      className="bg-white/15 hover:bg-white/25 ring-1 ring-white/20 text-white focus-visible:ring-2 focus-visible:ring-white/40 transition-all duration-200"
                      data-testid="button-break"
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
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-blue-300">
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
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-purple-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <CalendarIcon className="h-8 w-8 text-purple-500" />
                  <Badge variant="outline">Domani</Badge>
                </div>
                <div className="text-2xl font-bold mb-1">Turno</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {shifts[1].turno} • {shifts[1].dalle} - {shifts[1].alle}
                </div>
                <Button variant="link" className="p-0 h-auto text-purple-600">
                  Vedi calendario →
                </Button>
              </CardContent>
            </Card>

            {/* Tasks Pendenti */}
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-green-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Target className="h-8 w-8 text-green-500" />
                  <Badge variant="outline">4 attivi</Badge>
                </div>
                <div className="text-2xl font-bold mb-1">Obiettivi</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Performance Q4
                </div>
                <Progress value={85} className="h-2" />
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">
            <TabsList className="grid grid-cols-2 lg:grid-cols-6 h-auto w-full">
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
            <TabsContent value="overview" className="space-y-6 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                {/* Notifiche Recenti */}
                <Card className="lg:col-span-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-orange-300">
                  <CardHeader>
                    <CardTitle>Notifiche e Annunci</CardTitle>
                    <CardDescription>Aggiornamenti importanti dall'azienda</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {notifications.slice(0, 3).map((notif) => (
                        <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className={`p-2 rounded-full ${
                            notif.tipo === 'info' ? 'bg-blue-100' :
                            notif.tipo === 'success' ? 'bg-green-100' :
                            notif.tipo === 'alert' ? 'bg-orange-100' :
                            'bg-gray-100'
                          }`}>
                            {notif.tipo === 'info' && <Bell className="h-4 w-4 text-blue-600" />}
                            {notif.tipo === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {notif.tipo === 'alert' && <AlertCircle className="h-4 w-4 text-orange-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{notif.titolo}</h4>
                              <span className="text-xs text-gray-500">
                                {format(notif.data, 'dd/MM HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notif.messaggio}</p>
                            {!notif.letto && (
                              <Badge variant="secondary" className="mt-2">Nuovo</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Azioni Rapide - Professional Dashboard Tiles */}
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Azioni Rapide</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Operazioni frequenti per la gestione quotidiana</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { 
                        icon: FileText, 
                        label: 'Documenti', 
                        description: 'Buste paga e certificati',
                        color: 'from-blue-500 to-blue-600',
                        testId: 'documenti' 
                      },
                      { 
                        icon: Receipt, 
                        label: 'Spese', 
                        description: 'Note spese e rimborsi',
                        color: 'from-green-500 to-green-600',
                        testId: 'spese' 
                      },
                      { 
                        icon: GraduationCap, 
                        label: 'Formazione', 
                        description: 'Corsi e certificazioni',
                        color: 'from-purple-500 to-purple-600',
                        testId: 'formazione' 
                      },
                      { 
                        icon: Users, 
                        label: 'Team', 
                        description: 'Colleghi e organigramma',
                        color: 'from-orange-500 to-orange-600',
                        testId: 'team' 
                      },
                      { 
                        icon: HelpCircle, 
                        label: 'Supporto', 
                        description: 'Assistenza e FAQ',
                        color: 'from-red-500 to-red-600',
                        testId: 'supporto' 
                      },
                      { 
                        icon: Calendar, 
                        label: 'Calendario', 
                        description: 'Eventi e appuntamenti',
                        color: 'from-indigo-500 to-indigo-600',
                        testId: 'calendario' 
                      }
                    ].map(({ icon: Icon, label, description, color, testId }) => (
                      <Card 
                        key={testId}
                        className="group relative overflow-hidden border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                        data-testid={`card-quickaction-${testId}`}
                      >
                        <CardHeader className="pb-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200">
                            {label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {description}
                          </CardDescription>
                        </CardContent>
                        <CardFooter className="pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 group-hover:bg-gray-100/50 dark:group-hover:bg-gray-700/50"
                            data-testid={`button-quickaction-${testId}`}
                          >
                            Apri
                            <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Performance Goals */}
                <Card className="lg:col-span-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer hover:border-green-300">
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

            {/* Altri Tab */}
            <TabsContent value="timbrature" className="space-y-6 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                {/* Current Status Card */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Stato Timbratura Corrente</CardTitle>
                    <CardDescription>Situazione attuale del tuo orario di lavoro</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            </TabsContent>

            {/* Altri TabsContent per completezza */}
            <TabsContent value="ferie" className="space-y-6 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Saldo Ferie e Permessi</CardTitle>
                    <CardDescription>Panoramica delle tue ferie e permessi disponibili</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            <Clock className="h-8 w-8 text-green-500" />
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
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="turni" className="space-y-6 w-full">
              <Card>
                <CardHeader>
                  <CardTitle>I tuoi Turni</CardTitle>
                  <CardDescription>Visualizza e gestisci i tuoi turni di lavoro</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {shifts.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-sm font-medium">{format(new Date(shift.data), 'dd')}</p>
                            <p className="text-xs text-gray-500">{format(new Date(shift.data), 'MMM', { locale: it })}</p>
                          </div>
                          <Separator orientation="vertical" className="h-12" />
                          <div>
                            <p className="font-medium">{shift.turno}</p>
                            <p className="text-sm text-gray-600">{shift.dalle} - {shift.alle}</p>
                            <p className="text-xs text-gray-500">{shift.store}</p>
                          </div>
                        </div>
                        <Badge variant={shift.stato === 'attivo' ? 'default' : 'outline'}>
                          {shift.stato === 'attivo' ? 'In corso' : 'Programmato'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documenti" className="space-y-6 w-full">
              <Card>
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
              </Card>
            </TabsContent>

            <TabsContent value="formazione" className="space-y-6 w-full">
              <Card>
                <CardHeader>
                  <CardTitle>Corsi di Formazione</CardTitle>
                  <CardDescription>I tuoi percorsi di apprendimento e sviluppo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {training.map((course) => (
                      <div key={course.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{course.titolo}</h4>
                            <p className="text-sm text-gray-600">{course.descrizione}</p>
                          </div>
                          <Badge variant={getStatusVariant(course.stato)}>
                            {course.stato === 'completed' ? 'Completato' :
                             course.stato === 'in_progress' ? 'In Corso' :
                             course.stato === 'not_started' ? 'Da Iniziare' : course.stato}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span>{course.progresso}%</span>
                          </div>
                          <Progress value={course.progresso} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Durata: {course.durata}</span>
                            <span>Scadenza: {course.scadenza}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}