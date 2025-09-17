import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, Clock, Calendar, TrendingUp, AlertTriangle, 
  CheckCircle, XCircle, UserCheck, Coffee, Home 
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
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
            HR Dashboard
          </h1>
          <p className="text-gray-600">Panoramica completa della gestione risorse umane</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur border-white/20 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Dipendenti Totali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>+3% questo mese</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-white/20 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Presenti Oggi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.presentToday}</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% presenza
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-white/20 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Ferie/Permesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.onLeave}</div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-gray-500">Autorizzati</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-white/20 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Richieste Pendenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingRequests}</div>
              <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Da approvare</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Presenze per Reparto */}
          <Card className="lg:col-span-2 bg-white/80 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Presenze per Reparto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayAttendance.map((dept) => (
                  <div key={dept.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{dept.name}</span>
                      <span className="text-gray-500">{dept.present}/{dept.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${dept.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Richieste Recenti */}
          <Card className="bg-white/80 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Richieste Recenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{request.name}</div>
                      <div className="text-xs text-gray-500">{request.type} - {request.days} giorni</div>
                    </div>
                    <div>
                      {request.status === 'pending' && (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <Clock className="h-3 w-3" />
                          In attesa
                        </span>
                      )}
                      {request.status === 'approved' && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Approvata
                        </span>
                      )}
                      {request.status === 'rejected' && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="h-3 w-3" />
                          Rifiutata
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
                Vedi Tutte le Richieste
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistiche Aggiuntive */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-900">{stats.overtimeHours}h</div>
                  <div className="text-sm text-blue-700">Straordinari questo mese</div>
                </div>
                <Clock className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-900">{stats.complianceScore}%</div>
                  <div className="text-sm text-green-700">Compliance Score</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-900">{stats.turnoverRate}%</div>
                  <div className="text-sm text-purple-700">Tasso di Turnover</div>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/80 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                <UserCheck className="h-6 w-6 text-green-600" />
                <span className="text-xs">Registra Presenza</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="text-xs">Richiedi Ferie</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                <Coffee className="h-6 w-6 text-orange-600" />
                <span className="text-xs">Pausa</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                <Home className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Smart Working</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}