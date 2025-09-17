// Leave Analytics - Comprehensive leave and time-off patterns visualization
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  Clock,
  Briefcase,
  Heart,
  Baby,
  Stethoscope,
  Palmtree,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface LeaveAnalyticsProps {
  data?: {
    summary: {
      totalRequests: number;
      approvedRequests: number;
      pendingRequests: number;
      rejectedRequests: number;
      totalDaysUsed: number;
      avgLeavePerEmployee: number;
      plannedVsUnplanned: {
        planned: number;
        unplanned: number;
      };
    };
    byType: Array<{
      type: string;
      count: number;
      days: number;
      percentage: number;
      icon: string;
    }>;
    monthlyTrend: Array<{
      month: string;
      vacation: number;
      sick: number;
      personal: number;
      other: number;
    }>;
    upcomingLeave: Array<{
      employeeId: string;
      employeeName: string;
      startDate: string;
      endDate: string;
      type: string;
      days: number;
    }>;
    leaveBalance: Array<{
      department: string;
      available: number;
      used: number;
      planned: number;
    }>;
    seasonalPattern: Array<{
      month: string;
      avgDays: number;
      peakWeek: number;
    }>;
    coverageGaps: Array<{
      date: string;
      department: string;
      staffRequired: number;
      staffAvailable: number;
      gap: number;
    }>;
  };
  period?: string;
  storeId?: string;
  compact?: boolean;
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  vacation: '#10b981',
  sick: '#ef4444',
  personal: '#3b82f6',
  maternity: '#ec4899',
  paternity: '#8b5cf6',
  bereavement: '#6b7280',
  unpaid: '#f59e0b',
  other: '#06b6d4',
};

const LEAVE_TYPE_ICONS: Record<string, React.ElementType> = {
  vacation: Palmtree,
  sick: Stethoscope,
  personal: Users,
  maternity: Baby,
  paternity: Baby,
  bereavement: Heart,
  unpaid: Briefcase,
  other: Calendar,
};

export default function LeaveAnalytics({ data, period = 'month', compact = false }: LeaveAnalyticsProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Nessun dato disponibile per il periodo selezionato
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    summary, 
    byType = [], 
    monthlyTrend = [], 
    upcomingLeave = [], 
    leaveBalance = [], 
    seasonalPattern = [],
    coverageGaps = []
  } = data;

  // Calculate approval rate
  const approvalRate = summary.totalRequests > 0 
    ? ((summary.approvedRequests / summary.totalRequests) * 100).toFixed(1)
    : '0';

  // Sort leave types by count
  const sortedByType = [...byType].sort((a, b) => b.count - a.count);

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analisi Ferie e Permessi</CardTitle>
            <Badge variant="outline" className="text-xs">
              {period}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Compact metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Giorni Utilizzati</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="leave-days-used">
                {summary.totalDaysUsed}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasso Approvazione</p>
              <p className="text-2xl font-bold text-green-600" data-testid="leave-approval-rate">
                {approvalRate}%
              </p>
            </div>
          </div>

          {/* Mini pie chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedByType.slice(0, 4)}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={50}
                  fill="#8884d8"
                >
                  {sortedByType.slice(0, 4).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={LEAVE_TYPE_COLORS[entry.type] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <Badge variant="outline" className="text-xs">Totale</Badge>
            </div>
            <p className="text-2xl font-bold" data-testid="total-leave-requests">
              {summary.totalRequests}
            </p>
            <p className="text-xs text-gray-500">Richieste</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <Badge variant="success" className="text-xs">Approvate</Badge>
            </div>
            <p className="text-2xl font-bold text-green-600" data-testid="approved-requests">
              {summary.approvedRequests}
            </p>
            <p className="text-xs text-gray-500">{approvalRate}% approval</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <Badge variant="warning" className="text-xs">In Attesa</Badge>
            </div>
            <p className="text-2xl font-bold text-yellow-600" data-testid="pending-requests">
              {summary.pendingRequests}
            </p>
            <p className="text-xs text-gray-500">Da approvare</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-xs text-blue-600">Media</span>
            </div>
            <p className="text-2xl font-bold text-blue-600" data-testid="avg-leave-days">
              {summary.avgLeavePerEmployee.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">Giorni/dipendente</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="h-5 w-5 text-purple-500" />
              <span className="text-xs text-purple-600">Pianificate</span>
            </div>
            <p className="text-2xl font-bold text-purple-600" data-testid="planned-leave">
              {summary.plannedVsUnplanned.planned}%
            </p>
            <p className="text-xs text-gray-500">vs non pianificate</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-xs text-red-600">Rifiutate</span>
            </div>
            <p className="text-2xl font-bold text-red-600" data-testid="rejected-requests">
              {summary.rejectedRequests}
            </p>
            <p className="text-xs text-gray-500">Non approvate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="distribution">Distribuzione</TabsTrigger>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="upcoming">Prossime</TabsTrigger>
          <TabsTrigger value="balance">Saldi</TabsTrigger>
          <TabsTrigger value="coverage">Copertura</TabsTrigger>
        </TabsList>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Types Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuzione per Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sortedByType}
                        dataKey="days"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={(entry) => `${entry.type}: ${entry.percentage}%`}
                      >
                        {sortedByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LEAVE_TYPE_COLORS[entry.type] || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend with icons */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {sortedByType.map((type) => {
                    const Icon = LEAVE_TYPE_ICONS[type.type] || Calendar;
                    return (
                      <div key={type.type} className="flex items-center gap-2">
                        <Icon 
                          className="h-4 w-4" 
                          style={{ color: LEAVE_TYPE_COLORS[type.type] }}
                        />
                        <span className="text-sm capitalize">{type.type}</span>
                        <span className="text-sm text-gray-500 ml-auto">
                          {type.count} ({type.days}g)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Planned vs Unplanned */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pianificate vs Non Pianificate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pianificate', value: summary.plannedVsUnplanned.planned },
                          { name: 'Non Pianificate', value: summary.plannedVsUnplanned.unplanned }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#82ca9d"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex justify-center gap-6 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {summary.plannedVsUnplanned.planned}%
                    </p>
                    <p className="text-sm text-gray-500">Pianificate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {summary.plannedVsUnplanned.unplanned}%
                    </p>
                    <p className="text-sm text-gray-500">Non Pianificate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Mensile per Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="vacation"
                        stackId="1"
                        stroke={LEAVE_TYPE_COLORS.vacation}
                        fill={LEAVE_TYPE_COLORS.vacation}
                        name="Ferie"
                      />
                      <Area
                        type="monotone"
                        dataKey="sick"
                        stackId="1"
                        stroke={LEAVE_TYPE_COLORS.sick}
                        fill={LEAVE_TYPE_COLORS.sick}
                        name="Malattia"
                      />
                      <Area
                        type="monotone"
                        dataKey="personal"
                        stackId="1"
                        stroke={LEAVE_TYPE_COLORS.personal}
                        fill={LEAVE_TYPE_COLORS.personal}
                        name="Personali"
                      />
                      <Area
                        type="monotone"
                        dataKey="other"
                        stackId="1"
                        stroke={LEAVE_TYPE_COLORS.other}
                        fill={LEAVE_TYPE_COLORS.other}
                        name="Altri"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Seasonal Pattern */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pattern Stagionale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seasonalPattern}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgDays"
                        stroke="#f97316"
                        strokeWidth={2}
                        name="Media Giorni"
                        dot={{ fill: '#f97316', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="peakWeek"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Settimana Picco"
                        dot={{ fill: '#8b5cf6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Upcoming Leave Tab */}
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prossime Ferie Programmate</CardTitle>
              <p className="text-sm text-gray-500">Prossimi 30 giorni</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingLeave.slice(0, 10).map((leave, index) => {
                  const Icon = LEAVE_TYPE_ICONS[leave.type] || Calendar;
                  const startDate = new Date(leave.startDate);
                  const endDate = new Date(leave.endDate);
                  const daysUntil = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <motion.div
                      key={`${leave.employeeId}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${LEAVE_TYPE_COLORS[leave.type]}20` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: LEAVE_TYPE_COLORS[leave.type] }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{leave.employeeName}</p>
                          <p className="text-xs text-gray-500">
                            {format(startDate, 'dd MMM', { locale: it })} - {format(endDate, 'dd MMM', { locale: it })}
                            {' '}({leave.days} giorni)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={daysUntil <= 7 ? "warning" : "outline"}
                          className="text-xs"
                        >
                          {daysUntil === 0 ? 'Oggi' :
                           daysUntil === 1 ? 'Domani' :
                           `Tra ${daysUntil} giorni`}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Tab */}
        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saldi Ferie per Dipartimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveBalance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="department" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="used" stackId="a" fill="#ef4444" name="Utilizzati" />
                    <Bar dataKey="planned" stackId="a" fill="#f59e0b" name="Pianificati" />
                    <Bar dataKey="available" stackId="a" fill="#10b981" name="Disponibili" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analisi Copertura</CardTitle>
              <p className="text-sm text-gray-500">Gap di copertura previsti</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coverageGaps.map((gap, index) => {
                  const gapPercentage = ((gap.gap / gap.staffRequired) * 100).toFixed(0);
                  const isC ritical = gap.gap > gap.staffRequired * 0.3;
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        isCritical 
                          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                          : "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(gap.date), 'dd MMM yyyy', { locale: it })} - {gap.department}
                          </p>
                          <p className="text-xs text-gray-500">
                            Richiesti: {gap.staffRequired} | Disponibili: {gap.staffAvailable}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={isCritical ? "destructive" : "warning"}
                            className="mb-1"
                          >
                            -{gap.gap} persone
                          </Badge>
                          <p className="text-xs text-gray-500">Gap {gapPercentage}%</p>
                        </div>
                      </div>
                      
                      {/* Visual gap indicator */}
                      <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            isCritical ? "bg-red-500" : "bg-yellow-500"
                          )}
                          style={{ width: `${100 - parseInt(gapPercentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}