import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Clock, Calendar, TrendingUp, AlertTriangle, 
  CheckCircle, XCircle, UserCheck, Coffee, Home, Activity 
} from 'lucide-react';

export default function HRDashboardSimple() {
  const [currentModule] = useState('hr');

  // Dati statici per mostrare subito qualcosa
  const stats = {
    totalEmployees: 156,
    presentToday: 142,
    onLeave: 8,
    absent: 6,
    pendingRequests: 12,
    overtimeHours: 234,
    complianceScore: 94,
    turnoverRate: 5.2
  };

  const recentRequests = [
    { id: 1, name: 'Mario Rossi', type: 'Ferie', days: 5, status: 'pending' },
    { id: 2, name: 'Laura Bianchi', type: 'Permesso', days: 1, status: 'pending' },
    { id: 3, name: 'Giuseppe Verdi', type: 'Malattia', days: 3, status: 'approved' },
    { id: 4, name: 'Anna Ferrari', type: 'Ferie', days: 10, status: 'rejected' },
  ];

  const todayAttendance = [
    { name: 'Vendite', present: 45, total: 50, percentage: 90 },
    { name: 'Magazzino', present: 28, total: 30, percentage: 93 },
    { name: 'Amministrazione', present: 12, total: 12, percentage: 100 },
    { name: 'IT', present: 8, total: 10, percentage: 80 },
  ];

  return (
    <Layout currentModule={currentModule} setCurrentModule={() => {}}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="hr-dashboard-page">
        {/* Header with WindTre Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-white/20 hover:bg-white/60 transition-all duration-300"
          data-testid="dashboard-header"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                HR Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Panoramica completa della gestione risorse umane</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/30 backdrop-blur text-gray-700">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards with Enhanced Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 hover:shadow-lg transition-all duration-300 group" data-testid="kpi-total-employees">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                Dipendenti Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{stats.totalEmployees}</div>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>+3% questo mese</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 hover:shadow-lg transition-all duration-300 group" data-testid="kpi-present-today">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-gray-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Presenti Oggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.presentToday}</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% presenza
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 hover:shadow-lg transition-all duration-300 group" data-testid="kpi-on-leave">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                In Ferie/Permesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.onLeave}</div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-gray-500">Autorizzati</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 hover:shadow-lg transition-all duration-300 group" data-testid="kpi-pending-requests">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-gray-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Richieste Pendenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 group-hover:text-orange-500 transition-colors">{stats.pendingRequests}</div>
              <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Da approvare</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid with Enhanced Animations */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Presenze per Reparto */}
          <Card className="lg:col-span-2 bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300" data-testid="attendance-by-department">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Presenze per Reparto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayAttendance.map((dept, index) => (
                  <motion.div 
                    key={dept.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="space-y-2 p-3 rounded-lg bg-white/30 backdrop-blur border border-white/10 hover:bg-white/40 transition-all"
                    data-testid={`dept-${dept.name.toLowerCase()}`}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800">{dept.name}</span>
                      <span className="text-gray-600 font-semibold">{dept.present}/{dept.total}</span>
                    </div>
                    <div className="w-full bg-white/50 rounded-full h-3 backdrop-blur border border-white/20">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-purple-600 h-3 rounded-full transition-all duration-1000 shadow-sm"
                        style={{ width: `${dept.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {dept.percentage}% presenza
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Richieste Recenti */}
          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300" data-testid="recent-requests">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Richieste Recenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRequests.map((request, index) => (
                  <motion.div 
                    key={request.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center justify-between p-3 hover:bg-white/40 rounded-lg border border-white/10 backdrop-blur transition-all duration-200"
                    data-testid={`request-${request.id}`}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{request.name}</div>
                      <div className="text-xs text-gray-500">{request.type} - {request.days} giorni</div>
                    </div>
                    <div>
                      {request.status === 'pending' && (
                        <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                          <Clock className="h-3 w-3 mr-1" />
                          In attesa
                        </Badge>
                      )}
                      {request.status === 'approved' && (
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approvata
                        </Badge>
                      )}
                      {request.status === 'rejected' && (
                        <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rifiutata
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-view-all-requests"
              >
                Vedi Tutte le Richieste
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Statistiche Aggiuntive with Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300 group" data-testid="stat-overtime">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{stats.overtimeHours}h</div>
                  <div className="text-sm text-gray-600">Straordinari questo mese</div>
                </div>
                <div className="p-3 bg-blue-100/50 rounded-full backdrop-blur">
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300 group" data-testid="stat-compliance">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">{stats.complianceScore}%</div>
                  <div className="text-sm text-gray-600">Compliance Score</div>
                </div>
                <div className="p-3 bg-green-100/50 rounded-full backdrop-blur">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300 group" data-testid="stat-turnover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">{stats.turnoverRate}%</div>
                  <div className="text-sm text-gray-600">Tasso di Turnover</div>
                </div>
                <div className="p-3 bg-purple-100/50 rounded-full backdrop-blur">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions with Enhanced Styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300" data-testid="quick-actions">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center gap-2 h-auto py-4 bg-white/30 backdrop-blur border-white/20 hover:bg-white/50 hover:shadow-lg transition-all duration-300 group"
                  data-testid="action-register-attendance"
                >
                  <UserCheck className="h-6 w-6 text-green-600 group-hover:text-green-500 transition-colors" />
                  <span className="text-xs text-gray-700 group-hover:text-green-600 transition-colors">Registra Presenza</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center gap-2 h-auto py-4 bg-white/30 backdrop-blur border-white/20 hover:bg-white/50 hover:shadow-lg transition-all duration-300 group"
                  data-testid="action-request-leave"
                >
                  <Calendar className="h-6 w-6 text-blue-600 group-hover:text-blue-500 transition-colors" />
                  <span className="text-xs text-gray-700 group-hover:text-blue-600 transition-colors">Richiedi Ferie</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center gap-2 h-auto py-4 bg-white/30 backdrop-blur border-white/20 hover:bg-white/50 hover:shadow-lg transition-all duration-300 group"
                  data-testid="action-break"
                >
                  <Coffee className="h-6 w-6 text-orange-600 group-hover:text-orange-500 transition-colors" />
                  <span className="text-xs text-gray-700 group-hover:text-orange-600 transition-colors">Pausa</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center gap-2 h-auto py-4 bg-white/30 backdrop-blur border-white/20 hover:bg-white/50 hover:shadow-lg transition-all duration-300 group"
                  data-testid="action-smart-working"
                >
                  <Home className="h-6 w-6 text-purple-600 group-hover:text-purple-500 transition-colors" />
                  <span className="text-xs text-gray-700 group-hover:text-purple-600 transition-colors">Smart Working</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}