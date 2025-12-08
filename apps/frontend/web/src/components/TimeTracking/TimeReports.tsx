// Time Reports Component - Enterprise Analytics Dashboard
import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Calendar,
  Users,
  Download,
  Filter,
  AlertCircle,
  CheckCircle,
  Activity,
  Target,
  Award,
  Coffee,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeTrackingReport } from '@/services/timeTrackingService';

interface TimeReportsProps {
  userId?: string;
  storeId?: string;
  startDate: string;
  endDate: string;
  reports?: TimeTrackingReport[];
  teamReports?: TimeTrackingReport[];
  loading?: boolean;
  onExport?: (format: 'csv' | 'pdf') => void;
  className?: string;
}

// WindTre color palette for charts
const CHART_COLORS = {
  primary: '#FF6900',
  secondary: '#7B2CBF',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
};

const CHART_GRADIENT_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  '#ff8533',
  '#9747ff',
  '#14b8a6',
  '#f97316',
];

export default function TimeReports({
  userId,
  storeId,
  startDate,
  endDate,
  reports = [],
  teamReports = [],
  loading = false,
  onExport,
  className,
}: TimeReportsProps) {
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week');

  // Calculate statistics
  const stats = useMemo(() => {
    const data = viewMode === 'personal' ? reports : teamReports;
    
    const totalHours = data.reduce((sum, r) => sum + r.totalHours, 0);
    const regularHours = data.reduce((sum, r) => sum + r.regularHours, 0);
    const overtimeHours = data.reduce((sum, r) => sum + r.overtimeHours, 0);
    const holidayHours = data.reduce((sum, r) => sum + r.holidayHours, 0);
    const daysWorked = data.reduce((sum, r) => sum + r.daysWorked, 0);
    const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;
    const disputedCount = data.reduce((sum, r) => sum + r.disputedEntries, 0);

    // Calculate target achievement (assuming 40 hours/week target)
    const targetHours = daysWorked * 8;
    const achievement = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;

    return {
      totalHours,
      regularHours,
      overtimeHours,
      holidayHours,
      daysWorked,
      avgHoursPerDay,
      disputedCount,
      achievement,
      efficiency: regularHours > 0 ? ((regularHours - overtimeHours) / regularHours) * 100 : 0,
    };
  }, [reports, teamReports, viewMode]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const interval = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    });

    return interval.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayData = (viewMode === 'personal' ? reports : teamReports).filter(
        (r) => r.period === dayStr
      );

      return {
        date: format(day, 'dd MMM'),
        dayOfWeek: format(day, 'EEE', { locale: it }),
        regular: dayData.reduce((sum, r) => sum + r.regularHours, 0),
        overtime: dayData.reduce((sum, r) => sum + r.overtimeHours, 0),
        breaks: dayData.reduce((sum, r) => sum + (r.breakMinutes / 60), 0),
        total: dayData.reduce((sum, r) => sum + r.totalHours, 0),
      };
    });
  }, [startDate, endDate, reports, teamReports, viewMode]);

  // Prepare distribution data for pie chart
  const distributionData = [
    { name: 'Ore Regolari', value: stats.regularHours, color: CHART_COLORS.primary },
    { name: 'Straordinari', value: stats.overtimeHours, color: CHART_COLORS.warning },
    { name: 'Festivi', value: stats.holidayHours, color: CHART_COLORS.secondary },
  ].filter(d => d.value > 0);

  // Team comparison data
  const teamComparison = useMemo(() => {
    return teamReports
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10)
      .map((report, index) => ({
        name: report.userName,
        hours: report.totalHours,
        overtime: report.overtimeHours,
        efficiency: ((report.regularHours - report.overtimeHours) / report.regularHours) * 100,
        rank: index + 1,
      }));
  }, [teamReports]);

  if (loading) {
    return (
      <Card className={cn("p-6 bg-white/5 backdrop-blur-xl border-white/10", className)}>
        <div className="space-y-4">
          <div className="h-64 bg-white/5 rounded-lg animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)} data-testid="time-reports">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Presenze</h2>
          <p className="text-sm text-gray-400">
            {format(parseISO(startDate), 'd MMM', { locale: it })} -{' '}
            {format(parseISO(endDate), 'd MMM yyyy', { locale: it })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Settimana</SelectItem>
              <SelectItem value="month">Mese</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          {onExport && (
            <Button onClick={() => onExport('pdf')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hours */}
        <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Ore Totali</p>
              <p className="text-2xl font-bold mt-1">
                {stats.totalHours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.daysWorked} giorni lavorati
              </p>
            </div>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <Progress
            value={stats.achievement}
            className="mt-3 h-1"
          />
        </Card>

        {/* Overtime */}
        <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Straordinari</p>
              <p className="text-2xl font-bold mt-1 text-orange-400">
                {stats.overtimeHours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((stats.overtimeHours / stats.totalHours) * 100).toFixed(0)}% del totale
              </p>
            </div>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Average per Day */}
        <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Media Giornaliera</p>
              <p className="text-2xl font-bold mt-1">
                {stats.avgHoursPerDay.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Target: 8h/giorno
              </p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            {stats.avgHoursPerDay >= 8 ? (
              <CheckCircle className="w-3 h-3 text-green-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-orange-400" />
            )}
            <span className="text-xs">
              {stats.avgHoursPerDay >= 8 ? 'Obiettivo raggiunto' : 'Sotto obiettivo'}
            </span>
          </div>
        </Card>

        {/* Efficiency */}
        <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Efficienza</p>
              <p className="text-2xl font-bold mt-1 text-green-400">
                {stats.efficiency.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ore regolari vs totali
              </p>
            </div>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Target className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Trend Orario</TabsTrigger>
          <TabsTrigger value="distribution">Distribuzione</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="patterns">Pattern</TabsTrigger>
        </TabsList>

        {/* Trend Chart */}
        <TabsContent value="trend">
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Trend Settimanale</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={chartType === 'bar' ? 'default' : 'outline'}
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </Button>
                <Button
                  size="sm"
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  onClick={() => setChartType('line')}
                >
                  Line
                </Button>
                <Button
                  size="sm"
                  variant={chartType === 'area' ? 'default' : 'outline'}
                  onClick={() => setChartType('area')}
                >
                  Area
                </Button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="dayOfWeek" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid #333',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="regular" name="Regolari" fill={CHART_COLORS.primary} />
                  <Bar dataKey="overtime" name="Straordinari" fill={CHART_COLORS.warning} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="dayOfWeek" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid #333',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Ore Totali"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="overtime"
                    name="Straordinari"
                    stroke={CHART_COLORS.warning}
                    strokeWidth={2}
                  />
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="dayOfWeek" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid #333',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="regular"
                    name="Regolari"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="overtime"
                    name="Straordinari"
                    stroke={CHART_COLORS.warning}
                    fill={CHART_COLORS.warning}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* Distribution Chart */}
        <TabsContent value="distribution">
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <h3 className="text-lg font-semibold mb-4">Distribuzione Ore</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid #333',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-4">
                {distributionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.value.toFixed(1)}h</p>
                      <p className="text-xs text-gray-400">
                        {((item.value / stats.totalHours) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Team Comparison */}
        <TabsContent value="team">
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <h3 className="text-lg font-semibold mb-4">Confronto Team</h3>
            <div className="space-y-3">
              {teamComparison.map((member) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: member.rank * 0.05 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        member.rank <= 3
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gray-600'
                      )}
                    >
                      {member.rank}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-gray-400">
                        Efficienza: {member.efficiency.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{member.hours.toFixed(1)}h</p>
                      {member.overtime > 0 && (
                        <p className="text-xs text-orange-400">
                          +{member.overtime.toFixed(1)}h straord.
                        </p>
                      )}
                    </div>
                    {member.rank === 1 && <Award className="w-5 h-5 text-yellow-400" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Work Patterns */}
        <TabsContent value="patterns">
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <h3 className="text-lg font-semibold mb-4">Pattern Lavorativi</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Heatmap simulation */}
              <div>
                <h4 className="text-sm font-medium mb-3">Orari Preferiti</h4>
                <div className="grid grid-cols-7 gap-1">
                  {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
                    <div key={i} className="text-center">
                      <p className="text-xs text-gray-400 mb-1">{day}</p>
                      <div className="space-y-1">
                        {[6, 8, 10, 12, 14, 16, 18, 20].map((hour) => {
                          const intensity = Math.random();
                          return (
                            <div
                              key={hour}
                              className="w-full h-4 rounded"
                              style={{
                                backgroundColor: `rgba(255, 105, 0, ${intensity})`,
                              }}
                              title={`${hour}:00 - ${intensity > 0.5 ? 'Alto' : 'Basso'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pattern Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Orario Medio Entrata</span>
                  </div>
                  <span className="font-semibold">08:45</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className="text-sm">Orario Medio Uscita</span>
                  </div>
                  <span className="font-semibold">17:30</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Pausa Media</span>
                  </div>
                  <span className="font-semibold">45 min</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">Giorno più Produttivo</span>
                  </div>
                  <span className="font-semibold">Mercoledì</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts & Suggestions */}
      {stats.disputedCount > 0 && (
        <Card className="p-4 bg-red-500/10 backdrop-blur-xl border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="font-medium">Attenzione</p>
              <p className="text-sm text-gray-400">
                Ci sono {stats.disputedCount} timbrature in disputa da risolvere
              </p>
            </div>
            <Button size="sm" variant="outline">
              Visualizza
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}