// Shift Analytics Component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useShiftAnalytics } from '@/hooks/useHRAnalytics';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  Clock,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Activity,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ShiftAnalyticsProps {
  period: string;
  storeId?: string;
}

export default function ShiftAnalytics({ period, storeId }: ShiftAnalyticsProps) {
  const { data, isLoading, error } = useShiftAnalytics(period, storeId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Errore nel caricamento delle analisi turni. Riprova più tardi.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>Nessun dato disponibile per il periodo selezionato.</AlertDescription>
      </Alert>
    );
  }

  const shiftIcons = {
    morning: Sun,
    afternoon: Sunset,
    evening: Moon,
    night: Sunrise
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const pieData = Object.entries(data.shiftDistribution).map(([key, value], index) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: COLORS[index % COLORS.length]
  }));

  const coverageStatusColor = data.coverageRate > 90 ? 'text-green-600' : 
                              data.coverageRate > 70 ? 'text-yellow-600' : 
                              'text-red-600';

  return (
    <div className="space-y-6" data-testid="shift-analytics">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Copertura Turni</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={coverageStatusColor}>
                {data.coverageRate?.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.coveredShifts} su {data.totalShifts} turni
            </p>
            <Progress value={data.coverageRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turni Scoperti</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.openShifts}
            </div>
            <p className="text-xs text-muted-foreground">
              Richiedono assegnazione urgente
            </p>
            {data.openShifts > 0 && (
              <Badge variant="destructive" className="mt-2">
                Azione Richiesta
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durata Media</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.averageShiftDuration?.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Per turno
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficienza</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {((data.coveredShifts / (data.totalShifts || 1)) * 100).toFixed(1)}%
              </div>
              {data.understaffedShifts > 0 && (
                <Badge variant="warning" className="text-xs">
                  -{data.understaffedShifts} sottorg.
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione Turni per Fascia Oraria</CardTitle>
          <CardDescription>
            Analisi della distribuzione dei turni nelle diverse fasce orarie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {Object.entries(data.shiftDistribution).map(([shift, count]) => {
                const Icon = shiftIcons[shift];
                return (
                  <div key={shift} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="capitalize">{shift}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{count}</span>
                      <span className="text-sm text-muted-foreground">turni</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Copertura Giornaliera</CardTitle>
          <CardDescription>
            Analisi della copertura turni negli ultimi giorni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends?.dailyCoverage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: it })}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: it })}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="coverage" 
                stroke="#10b981" 
                name="Copertura %"
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="required" 
                stroke="#3b82f6" 
                name="Turni Richiesti"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Patterns */}
      {data.trends?.weeklyPatterns && (
        <Card>
          <CardHeader>
            <CardTitle>Pattern Settimanali</CardTitle>
            <CardDescription>
              Media della copertura per giorno della settimana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.trends.weeklyPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dayOfWeek" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="averageCoverage" 
                  fill="#3b82f6" 
                  name="Copertura Media %"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Peak Hours Analysis */}
      {data.peakHours && data.peakHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analisi Ore di Punta</CardTitle>
            <CardDescription>
              Identificazione delle fasce orarie con maggior necessità di personale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="coverage" 
                  stroke="#f59e0b" 
                  fill="#fbbf24" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Staffing Alerts */}
      {(data.understaffedShifts > 0 || data.overstaffedShifts > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Organico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.understaffedShifts > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{data.understaffedShifts} turni sotto-organico</strong> richiedono 
                  assegnazione di personale aggiuntivo
                </AlertDescription>
              </Alert>
            )}
            {data.overstaffedShifts > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>{data.overstaffedShifts} turni sovra-organico</strong> potrebbero 
                  beneficiare di una ridistribuzione del personale
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}