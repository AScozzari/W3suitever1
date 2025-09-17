import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Users,
  Clock,
  MapPin,
  Settings,
  Plus,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import Layout from '@/components/Layout';
import Calendar from '@/components/Calendar/Calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function CalendarPage() {
  const [currentModule, setCurrentModule] = useState('calendar');
  const { data: user } = useQuery({ queryKey: ["/api/auth/session"] });
  const { data: stores } = useQuery({ queryKey: ["/api/stores"] });
  const { toast } = useToast();

  // State for calendar management
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [activeTab, setActiveTab] = useState<'calendar' | 'events' | 'settings'>('calendar');

  // Mock stats for calendar overview
  const calendarStats = [
    {
      title: 'Eventi Oggi',
      value: '8',
      icon: CalendarIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '+2 da ieri'
    },
    {
      title: 'Riunioni Settimana',
      value: '24',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+12%'
    },
    {
      title: 'Turni Pianificati',
      value: '156',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '98% copertura'
    },
    {
      title: 'Store Attivi',
      value: stores?.length?.toString() || '18',
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: 'Multi-location'
    }
  ];

  const handleExportCalendar = () => {
    toast({
      title: "Export avviato",
      description: "Il calendario verrà esportato in formato PDF"
    });
  };

  const handleRefreshCalendar = () => {
    toast({
      title: "Calendario aggiornato",
      description: "Eventi e turni sono stati sincronizzati"
    });
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6" data-testid="calendar-page">
        {/* Header Section with Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Calendario Aziendale
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Gestisci eventi, turni, ferie e riunioni del team multi-store
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Store Selector */}
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-48 bg-white/60 backdrop-blur border-white/30" data-testid="select-store">
                  <SelectValue placeholder="Seleziona store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli store</SelectItem>
                  {stores?.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Selector */}
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-32 bg-white/60 backdrop-blur border-white/30" data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensile</SelectItem>
                  <SelectItem value="week">Settimanale</SelectItem>
                  <SelectItem value="day">Giornaliero</SelectItem>
                </SelectContent>
              </Select>

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshCalendar}
                className="bg-white/60 backdrop-blur border-white/30"
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCalendar}
                className="bg-white/60 backdrop-blur border-white/30"
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>

              <Button
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                data-testid="button-new-event"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Evento
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards with Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {calendarStats.map((stat, index) => {
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
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stat.change}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Main Calendar Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="calendar" data-testid="tab-calendar">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Calendario
                </TabsTrigger>
                <TabsTrigger value="events" data-testid="tab-events">
                  <Users className="h-4 w-4 mr-2" />
                  Eventi
                </TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Impostazioni
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardContent className="p-6">
                  <Calendar 
                    selectedStore={selectedStore === 'all' ? stores?.[0] : stores?.find(s => s.id === selectedStore)}
                    compactMode={false}
                    viewMode={viewMode}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gestione Eventi
                  </CardTitle>
                  <CardDescription>
                    Visualizza e gestisci tutti gli eventi aziendali
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Gestione Eventi in Sviluppo
                    </h3>
                    <p className="text-gray-500 mb-4">
                      La sezione eventi sarà disponibile nella prossima release
                    </p>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      Coming Soon
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Impostazioni Calendario
                  </CardTitle>
                  <CardDescription>
                    Configura le preferenze del calendario aziendale
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Visualizzazione</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                          <span className="text-sm">Vista di default</span>
                          <Badge variant="outline">{viewMode}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                          <span className="text-sm">Inizio settimana</span>
                          <Badge variant="outline">Lunedì</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                          <span className="text-sm">Fuso orario</span>
                          <Badge variant="outline">Europe/Rome</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Notifiche</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                          <span className="text-sm">Email eventi</span>
                          <Badge className="bg-green-100 text-green-700">Attivo</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                          <span className="text-sm">Push notifications</span>
                          <Badge className="bg-green-100 text-green-700">Attivo</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                          <span className="text-sm">Promemoria</span>
                          <Badge variant="outline">15 min prima</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
}