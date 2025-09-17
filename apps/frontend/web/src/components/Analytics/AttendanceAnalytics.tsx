// Attendance Analytics - Comprehensive attendance patterns and metrics visualization
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  UserX,
  Activity,
  Calendar,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface AttendanceAnalyticsProps {
  data?: {
    summary: {
      totalEmployees: number;
      presentToday: number;
      absentToday: number;
      lateArrivals: number;
      earlyDepartures: number;
      onLeave: number;
      attendanceRate: number;
      punctualityRate: number;
    };
    weeklyTrend: Array<{
      day: string;
      present: number;
      absent: number;
      late: number;
      rate: number;
    }>;
    hourlyPattern: Array<{
      hour: number;
      clockIns: number;
      clockOuts: number;
    }>;
    departmentStats: Array<{
      department: string;
      attendanceRate: number;
      avgHours: number;
      lateRate: number;
    }>;
    heatmapData: Array<{
      day: number;
      hour: number;
      value: number;
    }>;
    topAbsentees: Array<{
      employeeId: string;
      name: string;
      absences: number;
      rate: number;
    }>;
    patterns: {
      mondayAbsenceRate: number;
      fridayAbsenceRate: number;
      afterHolidayRate: number;
      beforeHolidayRate: number;
    };
  };
  period?: string;
  storeId?: string;
  compact?: boolean;
}

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  early: '#3b82f6',
  onLeave: '#8b5cf6',
};

export default function AttendanceAnalytics({ data, period = 'month', compact = false }: AttendanceAnalyticsProps) {
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

  const { summary, weeklyTrend = [], hourlyPattern = [], departmentStats = [], heatmapData = [], topAbsentees = [], patterns } = data;

  // Create heatmap grid
  const heatmapGrid: Array<{ day: number; hour: number; value: number }> = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let day = 1; day <= 7; day++) {
      const dataPoint = heatmapData.find(d => d.day === day && d.hour === hour);
      heatmapGrid.push({
        day,
        hour,
        value: dataPoint?.value || 0,
      });
    }
  }

  const getHeatmapColor = (value: number) => {
    if (value === 0) return '#f3f4f6';
    if (value < 20) return '#fef3c7';
    if (value < 40) return '#fed7aa';
    if (value < 60) return '#fdba74';
    if (value < 80) return '#fb923c';
    return '#ea580c';
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analisi Presenze</CardTitle>
            <Badge variant="outline" className="text-xs">
              {period}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Compact view - key metrics and trend */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasso Presenza</p>
              <p className="text-2xl font-bold text-green-600" data-testid="attendance-rate-compact">
                {summary.attendanceRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Puntualità</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="punctuality-rate-compact">
                {summary.punctualityRate.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Mini trend chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Presenza']}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="text-xs text-gray-500">Totale</span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-employees">
                {summary.totalEmployees}
              </p>
              <p className="text-xs text-gray-500">Dipendenti</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <span className="text-xs text-green-600">Presenti</span>
              </div>
              <p className="text-2xl font-bold text-green-600" data-testid="present-today">
                {summary.presentToday}
              </p>
              <p className="text-xs text-gray-500">Oggi presenti</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <UserX className="h-5 w-5 text-red-500" />
                <span className="text-xs text-red-600">Assenti</span>
              </div>
              <p className="text-2xl font-bold text-red-600" data-testid="absent-today">
                {summary.absentToday}
              </p>
              <p className="text-xs text-gray-500">Oggi assenti</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-yellow-200 dark:border-yellow-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-xs text-yellow-600">Ritardi</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600" data-testid="late-arrivals">
                {summary.lateArrivals}
              </p>
              <p className="text-xs text-gray-500">Arrivi tardivi</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-blue-200 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-xs text-blue-600">Uscite</span>
              </div>
              <p className="text-2xl font-bold text-blue-600" data-testid="early-departures">
                {summary.earlyDepartures}
              </p>
              <p className="text-xs text-gray-500">Uscite anticipate</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-purple-200 dark:border-purple-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <span className="text-xs text-purple-600">Ferie</span>
              </div>
              <p className="text-2xl font-bold text-purple-600" data-testid="on-leave">
                {summary.onLeave}
              </p>
              <p className="text-xs text-gray-500">In ferie</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="patterns">Pattern</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="departments">Dipartimenti</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Attendance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Settimanale Presenze</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: 'none',
                          borderRadius: '4px',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="present"
                        stackId="1"
                        stroke={COLORS.present}
                        fill={COLORS.present}
                        name="Presenti"
                      />
                      <Area
                        type="monotone"
                        dataKey="absent"
                        stackId="1"
                        stroke={COLORS.absent}
                        fill={COLORS.absent}
                        name="Assenti"
                      />
                      <Area
                        type="monotone"
                        dataKey="late"
                        stackId="1"
                        stroke={COLORS.late}
                        fill={COLORS.late}
                        name="Ritardi"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Clock-in/out Pattern */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pattern Orario Entrate/Uscite</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyPattern}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: 'none',
                          borderRadius: '4px',
                        }}
                        labelFormatter={(hour) => `${hour}:00`}
                      />
                      <Legend />
                      <Bar dataKey="clockIns" fill={COLORS.present} name="Entrate" />
                      <Bar dataKey="clockOuts" fill={COLORS.early} name="Uscite" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Absence Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pattern Assenze</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Tasso Assenza Lunedì</p>
                      <p className="text-xs text-gray-500">Più alto della media</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">
                        {patterns?.mondayAbsenceRate?.toFixed(1) || 0}%
                      </p>
                      <TrendingUp className="inline h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Tasso Assenza Venerdì</p>
                      <p className="text-xs text-gray-500">Sopra la media</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">
                        {patterns?.fridayAbsenceRate?.toFixed(1) || 0}%
                      </p>
                      <TrendingUp className="inline h-4 w-4 text-orange-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Post-Festività</p>
                      <p className="text-xs text-gray-500">Giorno dopo festivi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-600">
                        {patterns?.afterHolidayRate?.toFixed(1) || 0}%
                      </p>
                      <AlertTriangle className="inline h-4 w-4 text-yellow-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Pre-Festività</p>
                      <p className="text-xs text-gray-500">Giorno prima festivi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {patterns?.beforeHolidayRate?.toFixed(1) || 0}%
                      </p>
                      <Activity className="inline h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Absentees */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Assenteisti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topAbsentees.slice(0, 5).map((employee, index) => (
                    <div
                      key={employee.employeeId}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          index === 0 ? "bg-red-100 text-red-600" :
                          index === 1 ? "bg-orange-100 text-orange-600" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{employee.name}</p>
                          <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{employee.absences} giorni</p>
                        <p className="text-xs text-red-600">{employee.rate.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Heatmap Presenze</CardTitle>
              <p className="text-sm text-gray-500">Densità presenze per ora e giorno della settimana</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Hour labels */}
                  <div className="flex items-center mb-2">
                    <div className="w-12"></div>
                    {[...Array(24)].map((_, hour) => (
                      <div key={hour} className="flex-1 text-xs text-center text-gray-500">
                        {hour}
                      </div>
                    ))}
                  </div>
                  
                  {/* Heatmap grid */}
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <div key={day} className="flex items-center mb-1">
                      <div className="w-12 text-xs font-medium text-gray-600">
                        {dayNames[day]}
                      </div>
                      {[...Array(24)].map((_, hour) => {
                        const value = heatmapGrid.find(
                          d => d.day === (day === 0 ? 7 : day) && d.hour === hour
                        )?.value || 0;
                        return (
                          <div
                            key={`${day}-${hour}`}
                            className="flex-1 h-6 mx-[1px] rounded-sm transition-all hover:scale-110"
                            style={{ backgroundColor: getHeatmapColor(value) }}
                            title={`${dayNames[day]} ${hour}:00 - ${value}%`}
                          />
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <span className="text-xs text-gray-500">Basso</span>
                    <div className="flex gap-1">
                      {[0, 20, 40, 60, 80, 100].map((v) => (
                        <div
                          key={v}
                          className="w-8 h-4 rounded-sm"
                          style={{ backgroundColor: getHeatmapColor(v) }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">Alto</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analisi per Dipartimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={departmentStats}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="department" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Tasso Presenza"
                      dataKey="attendanceRate"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Puntualità"
                      dataKey="lateRate"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '4px',
                      }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}