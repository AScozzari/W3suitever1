// KPI Cards Grid - Key Performance Indicators for HR Analytics
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  Award,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface KPIMetric {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ElementType;
  color: string;
  sparklineData?: Array<{ value: number }>;
  unit?: string;
  target?: number;
  status?: 'success' | 'warning' | 'critical' | 'neutral';
}

interface KPICardsGridProps {
  metrics?: {
    attendanceRate: number;
    overtimeHours: number;
    laborCost: number;
    absenteeismRate: number;
    turnoverRate: number;
    avgHoursPerEmployee: number;
    pendingApprovals: number;
    complianceScore: number;
    headcount: number;
    newHires: number;
    terminations: number;
    trainingCompliance: number;
    trends?: {
      attendance: Array<{ date: string; value: number }>;
      costs: Array<{ date: string; value: number }>;
      overtime: Array<{ date: string; value: number }>;
    };
  };
  isLoading?: boolean;
  period?: string;
}

export default function KPICardsGrid({ metrics, isLoading, period = 'month' }: KPICardsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards: KPIMetric[] = [
    {
      title: "Tasso Presenza",
      value: `${metrics?.attendanceRate?.toFixed(1) || 0}%`,
      change: metrics?.attendanceRate ? metrics.attendanceRate - 95 : 0,
      changeType: metrics?.attendanceRate > 95 ? 'increase' : 'decrease',
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      sparklineData: metrics?.trends?.attendance?.slice(-7).map(d => ({ value: d.value })),
      target: 95,
      status: metrics?.attendanceRate >= 95 ? 'success' : metrics?.attendanceRate >= 90 ? 'warning' : 'critical',
    },
    {
      title: "Ore Straordinario",
      value: metrics?.overtimeHours?.toFixed(0) || '0',
      change: 12.5,
      changeType: 'increase',
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      sparklineData: metrics?.trends?.overtime?.slice(-7).map(d => ({ value: d.value })),
      unit: 'ore',
      status: metrics?.overtimeHours > 200 ? 'warning' : 'neutral',
    },
    {
      title: "Costo Personale",
      value: `€${(metrics?.laborCost || 0).toLocaleString('it-IT')}`,
      change: -3.2,
      changeType: 'decrease',
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      sparklineData: metrics?.trends?.costs?.slice(-7).map(d => ({ value: d.value })),
      status: 'neutral',
    },
    {
      title: "Tasso Assenteismo",
      value: `${metrics?.absenteeismRate?.toFixed(1) || 0}%`,
      change: metrics?.absenteeismRate ? metrics.absenteeismRate - 3 : 0,
      changeType: metrics?.absenteeismRate > 3 ? 'increase' : 'decrease',
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      target: 3,
      status: metrics?.absenteeismRate <= 3 ? 'success' : metrics?.absenteeismRate <= 5 ? 'warning' : 'critical',
    },
    {
      title: "Turnover Rate",
      value: `${metrics?.turnoverRate?.toFixed(1) || 0}%`,
      change: -0.5,
      changeType: 'decrease',
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      target: 10,
      status: metrics?.turnoverRate <= 10 ? 'success' : metrics?.turnoverRate <= 15 ? 'warning' : 'critical',
    },
    {
      title: "Media Ore/Dipendente",
      value: metrics?.avgHoursPerEmployee?.toFixed(1) || '0',
      change: 2.3,
      changeType: 'increase',
      icon: Activity,
      color: "text-indigo-600 dark:text-indigo-400",
      unit: 'ore/settimana',
      status: 'neutral',
    },
    {
      title: "Approvazioni Pendenti",
      value: metrics?.pendingApprovals || 0,
      change: metrics?.pendingApprovals > 5 ? 100 : 0,
      changeType: metrics?.pendingApprovals > 5 ? 'increase' : 'decrease',
      icon: Calendar,
      color: "text-yellow-600 dark:text-yellow-400",
      status: metrics?.pendingApprovals === 0 ? 'success' : metrics?.pendingApprovals <= 5 ? 'warning' : 'critical',
    },
    {
      title: "Compliance Score",
      value: `${metrics?.complianceScore?.toFixed(0) || 0}%`,
      change: metrics?.complianceScore ? metrics.complianceScore - 90 : 0,
      changeType: metrics?.complianceScore >= 90 ? 'increase' : 'decrease',
      icon: CheckCircle,
      color: "text-teal-600 dark:text-teal-400",
      target: 90,
      status: metrics?.complianceScore >= 90 ? 'success' : metrics?.complianceScore >= 80 ? 'warning' : 'critical',
    },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getChangeIcon = (changeType: string, change: number) => {
    if (Math.abs(change) < 0.01) return null;
    return changeType === 'increase' ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200 group">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-orange-500/5 dark:to-orange-500/10" />
              
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {kpi.title}
                  </CardTitle>
                  <Icon className={cn("h-5 w-5", kpi.color)} />
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid={`kpi-value-${kpi.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {kpi.value}
                    </span>
                    {kpi.unit && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                        {kpi.unit}
                      </span>
                    )}
                  </div>
                  {kpi.status && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getStatusColor(kpi.status))}
                      data-testid={`kpi-status-${kpi.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {kpi.status === 'success' ? 'OK' :
                       kpi.status === 'warning' ? 'Attenzione' :
                       kpi.status === 'critical' ? 'Critico' : 'Info'}
                    </Badge>
                  )}
                </div>

                {/* Change indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    kpi.changeType === 'increase' && kpi.change > 0 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {getChangeIcon(kpi.changeType, kpi.change)}
                    <span>{Math.abs(kpi.change).toFixed(1)}%</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    vs periodo precedente
                  </span>
                </div>

                {/* Target indicator */}
                {kpi.target && (
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Target: {kpi.target}{kpi.unit === '%' ? '%' : ''}
                    </span>
                  </div>
                )}

                {/* Sparkline */}
                {kpi.sparklineData && kpi.sparklineData.length > 0 && (
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={kpi.sparklineData}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={kpi.changeType === 'increase' ? '#10b981' : '#ef4444'}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px'
                          }}
                          labelStyle={{ display: 'none' }}
                          formatter={(value: any) => [`${value}`, '']}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>

              {/* Hover effect line */}
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </Card>
          </motion.div>
        );
      })}

      {/* Additional summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="lg:col-span-4"
      >
        <Card className="bg-gradient-to-r from-orange-50 to-purple-50 dark:from-orange-950/20 dark:to-purple-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="kpi-headcount">
                  {metrics?.headcount || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Organico Totale</p>
              </div>
              <div className="text-center">
                <Award className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="kpi-new-hires">
                  +{metrics?.newHires || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Nuove Assunzioni</p>
              </div>
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600 dark:text-red-400" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="kpi-terminations">
                  -{metrics?.terminations || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cessazioni</p>
              </div>
              <div className="text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-teal-600 dark:text-teal-400" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="kpi-training">
                  {metrics?.trainingCompliance || 0}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Training Compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}