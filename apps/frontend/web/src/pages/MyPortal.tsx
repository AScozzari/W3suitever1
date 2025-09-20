import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  FileText,
  Users,
  Bell,
  Settings,
  Home,
  TrendingUp,
  Briefcase,
  DollarSign,
  Heart,
  Plane,
  Receipt,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  CalendarDays,
  ClipboardList,
  Upload
} from 'lucide-react';

export default function MyPortal() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch current user data
  const { data: userData } = useQuery({
    queryKey: ['/api/users/me'],
    enabled: true
  });
  
  // Fetch employee balance (ferie, permessi, etc.)
  const { data: balanceData } = useQuery({
    queryKey: ['/api/hr/balances/me'],
    enabled: true
  });
  
  // Fetch my requests (universal system with serviceType='hr')
  const { data: myRequests } = useQuery({
    queryKey: ['/api/universal-requests', { serviceType: 'hr', requesterId: 'me' }],
    enabled: true
  });
  
  // Fetch team calendar
  const { data: teamCalendar } = useQuery({
    queryKey: ['/api/hr/team-calendar'],
    enabled: true
  });
  
  // Fetch current time tracking
  const { data: timeTracking } = useQuery({
    queryKey: ['/api/hr/time-tracking/current'],
    enabled: true
  });
  
  // Clock in/out mutation
  const clockMutation = useMutation({
    mutationFn: async (action: 'in' | 'out') => {
      return apiRequest('/api/hr/time-tracking/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, method: 'digital' })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/current'] });
      toast({
        title: 'Timbratura registrata',
        description: 'La tua timbratura è stata registrata con successo'
      });
    }
  });

  // Quick Actions
  const quickActions = [
    { 
      icon: Plane, 
      label: 'Richiedi Ferie', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      onClick: () => console.log('Open vacation request')
    },
    { 
      icon: Heart, 
      label: 'Segnala Malattia', 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      onClick: () => console.log('Open sick leave')
    },
    { 
      icon: Receipt, 
      label: 'Nota Spese', 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      onClick: () => console.log('Open expense report')
    },
    { 
      icon: FileText, 
      label: 'Carica Documento', 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      onClick: () => console.log('Upload document')
    }
  ];

  // Balance cards data
  const balanceCards = [
    {
      title: 'Ferie',
      value: balanceData?.vacation || 0,
      total: 22,
      unit: 'giorni',
      color: 'bg-blue-500'
    },
    {
      title: 'Permessi',
      value: balanceData?.permits || 0,
      total: 104,
      unit: 'ore',
      color: 'bg-green-500'
    },
    {
      title: 'ROL',
      value: balanceData?.rol || 0,
      total: 8,
      unit: 'giorni',
      color: 'bg-purple-500'
    },
    {
      title: 'Straordinari',
      value: balanceData?.overtime || 0,
      total: null,
      unit: 'ore',
      color: 'bg-orange-500'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-purple-50 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Benvenuto, {userData?.firstName || 'Utente'}!
              </h2>
              <p className="text-gray-600 mt-1">
                {userData?.role || 'Dipendente'} - {userData?.department || 'Team'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <div className="mt-2">
                {timeTracking?.clockedIn ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Clock className="w-3 h-3 mr-1" />
                    In servizio dalle {timeTracking.clockInTime}
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Non in servizio
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`${action.bgColor} p-6 rounded-xl hover:shadow-md transition-all duration-200 text-center group`}
              data-testid={`quick-action-${index}`}
            >
              <action.icon className={`w-8 h-8 ${action.color} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
              <span className={`text-sm font-medium ${action.color}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Balance Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">I Miei Saldi</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {balanceCards.map((card, index) => (
            <Card key={index} className="overflow-hidden">
              <div className={`h-2 ${card.color}`} />
              <CardContent className="p-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{card.value}</span>
                    <span className="text-sm text-gray-500">
                      {card.total && `/ ${card.total}`} {card.unit}
                    </span>
                  </div>
                  {card.total && (
                    <Progress 
                      value={(card.value / card.total) * 100} 
                      className="h-2"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Le Mie Richieste Recenti</span>
            <Button variant="ghost" size="sm">
              Vedi tutte
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {myRequests && myRequests.length > 0 ? (
              myRequests.slice(0, 5).map((request: any) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg">
                      {request.requestType === 'vacation' && <Plane className="w-4 h-4 text-blue-600" />}
                      {request.requestType === 'sick_leave' && <Heart className="w-4 h-4 text-red-600" />}
                      {request.requestType === 'permit' && <Clock className="w-4 h-4 text-orange-600" />}
                      {request.requestType === 'expense' && <Receipt className="w-4 h-4 text-green-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{request.title || request.requestType}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('it-IT')}
                        {request.startDate && ` • Dal ${new Date(request.startDate).toLocaleDateString('it-IT')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'approved' && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approvata
                      </Badge>
                    )}
                    {request.status === 'pending' && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Timer className="w-3 h-3 mr-1" />
                        In attesa
                      </Badge>
                    )}
                    {request.status === 'rejected' && (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rifiutata
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nessuna richiesta recente</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimeTracking = () => (
    <Card>
      <CardHeader>
        <CardTitle>Timbratura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="text-center py-8">
          {timeTracking?.clockedIn ? (
            <>
              <div className="w-24 h-24 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">In Servizio</h3>
              <p className="text-gray-600 mb-6">
                Entrata alle {timeTracking.clockInTime}
              </p>
              <Button 
                size="lg"
                variant="destructive"
                onClick={() => clockMutation.mutate('out')}
                disabled={clockMutation.isPending}
                data-testid="clock-out-btn"
              >
                <Clock className="w-5 h-5 mr-2" />
                Timbra Uscita
              </Button>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Non in Servizio</h3>
              <p className="text-gray-600 mb-6">
                Pronto per iniziare la giornata?
              </p>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-purple-600"
                onClick={() => clockMutation.mutate('in')}
                disabled={clockMutation.isPending}
                data-testid="clock-in-btn"
              >
                <Clock className="w-5 h-5 mr-2" />
                Timbra Entrata
              </Button>
            </>
          )}
        </div>

        {/* Today's Timeline */}
        <div>
          <h4 className="font-medium mb-4">Oggi</h4>
          <div className="space-y-2">
            {timeTracking?.todayEntries?.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${entry.type === 'in' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">{entry.time}</span>
                <span className="text-sm text-gray-600">
                  {entry.type === 'in' ? 'Entrata' : 'Uscita'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{entry.method}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Il Mio Portale</h1>
          <p className="text-gray-600 mt-1">Gestisci le tue informazioni e richieste HR</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Home className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="requests">
              <ClipboardList className="w-4 h-4 mr-2" />
              Richieste
            </TabsTrigger>
            <TabsTrigger value="timetracking">
              <Clock className="w-4 h-4 mr-2" />
              Presenze
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documenti
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Il Mio Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Le Mie Richieste</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gestione richieste in sviluppo...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetracking" className="mt-6">
            {renderTimeTracking()}
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>I Miei Documenti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Repository documenti in sviluppo...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Il Mio Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamCalendar?.teamMembers?.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.firstName} {member.lastName}</p>
                        <p className="text-sm text-gray-500">{member.role}</p>
                      </div>
                      <Badge variant={member.status === 'present' ? 'success' : 'secondary'}>
                        {member.status === 'present' ? 'Presente' : 'Assente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}