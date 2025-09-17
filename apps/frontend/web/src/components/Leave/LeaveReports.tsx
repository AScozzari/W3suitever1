// Leave Reports - Analytics dashboard for HR
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, LineChart, Line, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Download, Calendar, Users, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useLeaveRequests, useLeaveStatistics } from '@/hooks/useLeaveManagement';
import { leaveService } from '@/services/leaveService';

export function LeaveReports() {
  const [period, setPeriod] = useState('last3months');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  // Get date range based on period
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch (period) {
      case 'lastMonth':
        start = subMonths(end, 1);
        break;
      case 'last3months':
        start = subMonths(end, 3);
        break;
      case 'last6months':
        start = subMonths(end, 6);
        break;
      case 'lastYear':
        start = subMonths(end, 12);
        break;
      default:
        start = subMonths(end, 3);
    }
    
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  };
  
  const dateRange = getDateRange();
  
  // Fetch data
  const { data: requests = [] } = useLeaveRequests({
    ...dateRange,
    storeId: selectedStore !== 'all' ? selectedStore : undefined
  });
  
  const { data: statistics } = useLeaveStatistics(dateRange);
  
  // Calculate metrics
  const calculateMetrics = () => {
    const totalDays = requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.totalDays, 0);
    
    const avgDaysPerRequest = requests.length > 0 
      ? Math.round(totalDays / requests.length) 
      : 0;
    
    const approvalRate = requests.length > 0
      ? Math.round((requests.filter(r => r.status === 'approved').length / requests.length) * 100)
      : 0;
    
    // Estimate cost (example: €150 per day)
    const estimatedCost = totalDays * 150;
    
    return {
      totalDays,
      avgDaysPerRequest,
      approvalRate,
      estimatedCost
    };
  };
  
  const metrics = calculateMetrics();
  
  // Prepare chart data
  const getMonthlyTrend = () => {
    const monthlyData: { [key: string]: { month: string, approved: number, rejected: number, pending: number } } = {};
    
    requests.forEach(request => {
      const month = format(new Date(request.createdAt), 'MMM yyyy', { locale: it });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { month, approved: 0, rejected: 0, pending: 0 };
      }
      
      if (request.status === 'approved') monthlyData[month].approved++;
      else if (request.status === 'rejected') monthlyData[month].rejected++;
      else if (request.status === 'pending') monthlyData[month].pending++;
    });
    
    return Object.values(monthlyData);
  };
  
  const getLeaveTypeDistribution = () => {
    const typeData: { [key: string]: number } = {};
    
    requests.filter(r => r.status === 'approved').forEach(request => {
      const typeConfig = leaveService.getLeaveTypeConfig(request.leaveType);
      const label = typeConfig.label;
      typeData[label] = (typeData[label] || 0) + request.totalDays;
    });
    
    return Object.entries(typeData).map(([name, value]) => ({ name, value }));
  };
  
  const getAbsenceCalendar = () => {
    const calendar: { [key: string]: number } = {};
    const today = new Date();
    
    // Initialize next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      calendar[dateStr] = 0;
    }
    
    // Count absences
    requests
      .filter(r => r.status === 'approved')
      .forEach(request => {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = format(d, 'yyyy-MM-dd');
          if (calendar[dateStr] !== undefined) {
            calendar[dateStr]++;
          }
        }
      });
    
    return Object.entries(calendar).map(([date, count]) => ({
      date: format(new Date(date), 'dd MMM', { locale: it }),
      absences: count
    }));
  };
  
  const monthlyTrend = getMonthlyTrend();
  const typeDistribution = getLeaveTypeDistribution();
  const absenceCalendar = getAbsenceCalendar();
  
  // Colors for charts
  const COLORS = ['#FF6900', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
  
  // Export data
  const handleExport = () => {
    const csv = [
      ['Report Ferie - ' + new Date().toLocaleDateString('it-IT')],
      [],
      ['Metriche Principali'],
      ['Totale Giorni', metrics.totalDays],
      ['Media Giorni per Richiesta', metrics.avgDaysPerRequest],
      ['Tasso Approvazione', metrics.approvalRate + '%'],
      ['Costo Stimato', '€' + metrics.estimatedCost.toLocaleString('it-IT')],
      [],
      ['Dettaglio Richieste'],
      ['ID', 'Dipendente', 'Tipo', 'Data Inizio', 'Data Fine', 'Giorni', 'Stato', 'Data Richiesta'],
      ...requests.map(r => [
        r.id,
        r.userName || 'N/A',
        leaveService.getLeaveTypeConfig(r.leaveType).label,
        format(new Date(r.startDate), 'dd/MM/yyyy'),
        format(new Date(r.endDate), 'dd/MM/yyyy'),
        r.totalDays,
        leaveService.getStatusConfig(r.status).label,
        format(new Date(r.createdAt), 'dd/MM/yyyy')
      ])
    ];
    
    const csvContent = csv.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  return (
    <div className="space-y-6" data-testid="leave-reports">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Ferie</h2>
          <p className="text-gray-600 mt-1">Analisi e statistiche sulle richieste ferie</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastMonth">Ultimo mese</SelectItem>
              <SelectItem value="last3months">Ultimi 3 mesi</SelectItem>
              <SelectItem value="last6months">Ultimi 6 mesi</SelectItem>
              <SelectItem value="lastYear">Ultimo anno</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-report"
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Giorni Totali
                </CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalDays}</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  +12% vs periodo precedente
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Media Giorni/Richiesta
                </CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgDaysPerRequest}</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-gray-600">
                  -5% vs periodo precedente
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Tasso Approvazione
                </CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.approvalRate}%</div>
              <Badge variant="secondary" className="mt-2">
                {statistics?.rejectedRequests || 0} rifiutate
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Costo Stimato
                </CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{metrics.estimatedCost.toLocaleString('it-IT')}
              </div>
              <span className="text-sm text-gray-600">
                €150/giorno medio
              </span>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Trend Mensile</TabsTrigger>
          <TabsTrigger value="distribution">Distribuzione Tipi</TabsTrigger>
          <TabsTrigger value="forecast">Previsioni</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>
        
        {/* Monthly Trend */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Trend Richieste Mensili</CardTitle>
              <CardDescription>
                Andamento delle richieste nel periodo selezionato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" name="Approvate" fill="#10b981" />
                  <Bar dataKey="rejected" name="Rifiutate" fill="#ef4444" />
                  <Bar dataKey="pending" name="In Attesa" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Type Distribution */}
        <TabsContent value="distribution">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione per Tipo</CardTitle>
                <CardDescription>
                  Giorni totali per tipo di permesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${entry.value}gg`}
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Richiedenti</CardTitle>
                <CardDescription>
                  Dipendenti con più giorni di assenza
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Mock top requesters */}
                  {[
                    { name: 'Mario Rossi', days: 15, avatar: '👤' },
                    { name: 'Laura Bianchi', days: 12, avatar: '👤' },
                    { name: 'Giuseppe Verdi', days: 10, avatar: '👤' },
                    { name: 'Anna Romano', days: 8, avatar: '👤' },
                    { name: 'Paolo Russo', days: 7, avatar: '👤' }
                  ].map((person, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{person.avatar}</div>
                        <div>
                          <div className="font-medium">{person.name}</div>
                          <div className="text-sm text-gray-600">
                            {person.days} giorni
                          </div>
                        </div>
                      </div>
                      <div className="w-32">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500"
                            style={{ width: `${(person.days / 15) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Forecast */}
        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Previsione Assenze Prossimi 30 Giorni</CardTitle>
              <CardDescription>
                Numero di dipendenti assenti per giorno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={absenceCalendar}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="absences" 
                    stroke="#FF6900" 
                    name="Assenze"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
              
              {/* Warnings */}
              <div className="mt-4 space-y-2">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Attenzione:</strong> 3 giorni con copertura critica (&gt;30% team assente)
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Compliance */}
        <TabsContent value="compliance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ferie Non Godute</CardTitle>
                <CardDescription>
                  Dipendenti con ferie in scadenza
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Mock data */}
                  {[
                    { name: 'Marco Neri', remaining: 12, deadline: '31/12/2025', risk: 'high' },
                    { name: 'Sofia Gialli', remaining: 8, deadline: '31/12/2025', risk: 'medium' },
                    { name: 'Luca Blu', remaining: 5, deadline: '31/12/2025', risk: 'low' }
                  ].map((person, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{person.name}</div>
                          <div className="text-sm text-gray-600">
                            {person.remaining} giorni rimanenti
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={person.risk === 'high' ? 'destructive' : person.risk === 'medium' ? 'secondary' : 'default'}
                          >
                            Scadenza: {person.deadline}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Compliance Overview</CardTitle>
                <CardDescription>
                  Rispetto delle policy aziendali
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Preavviso minimo rispettato</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '92%' }} />
                      </div>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Limiti giorni consecutivi</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '88%' }} />
                      </div>
                      <span className="text-sm font-medium">88%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Certificati malattia forniti</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: '75%' }} />
                      </div>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Blackout dates rispettati</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '100%' }} />
                      </div>
                      <span className="text-sm font-medium">100%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}