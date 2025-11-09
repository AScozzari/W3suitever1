import { TrendingUp, TrendingDown, DollarSign, Users, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ROISummary {
  currentRevenue: number;
  marketingSpend: number;
  margin: number;
  roiPercent: number;
  priorPeriodRevenue: number;
  revenueDelta: number;
}

interface KPIData {
  totalLeads: number;
  activeDeals: number;
  conversionRate: number;
  avgJourneyDurationDays: number;
  totalRevenue: number;
  churnRate: number;
  roiSummary?: ROISummary;
}

interface KPICardsProps {
  data: KPIData | null;
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function KPICards({ data, isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="windtre-glass-panel border-white/20 p-6">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-white/30 rounded w-2/3" />
              <div className="h-8 bg-white/30 rounded w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const kpis = [
    {
      label: 'Total Leads',
      value: data.totalLeads,
      icon: Users,
      trend: null,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      testId: 'kpi-total-leads',
    },
    {
      label: 'Deals Attivi',
      value: data.activeDeals,
      icon: TrendingUp,
      trend: null,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      testId: 'kpi-active-deals',
    },
    {
      label: 'Conversion Rate',
      value: `${data.conversionRate}%`,
      icon: data.conversionRate >= 50 ? TrendingUp : TrendingDown,
      trend: data.conversionRate >= 50 ? 'positive' : 'negative',
      color: data.conversionRate >= 50 ? 'text-green-600' : 'text-orange-600',
      bgColor: data.conversionRate >= 50 ? 'bg-green-50' : 'bg-orange-50',
      testId: 'kpi-conversion-rate',
    },
    {
      label: 'Media Giorni',
      value: data.avgJourneyDurationDays,
      icon: Clock,
      trend: null,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      testId: 'kpi-avg-duration',
    },
    {
      label: 'Revenue Totale',
      value: formatCurrency(data.totalRevenue),
      icon: DollarSign,
      trend: 'positive',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      testId: 'kpi-total-revenue',
    },
    {
      label: 'Churn Rate',
      value: `${data.churnRate}%`,
      icon: AlertTriangle,
      trend: data.churnRate > 30 ? 'negative' : null,
      color: data.churnRate > 30 ? 'text-red-600' : 'text-gray-600',
      bgColor: data.churnRate > 30 ? 'bg-red-50' : 'bg-gray-50',
      testId: 'kpi-churn-rate',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Standard KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="windtre-glass-panel border-white/20 p-6 hover:shadow-lg transition-shadow"
              data-testid={kpi.testId}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">{kpi.label}</p>
                  <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
                </div>
                <div className={cn('p-3 rounded-lg', kpi.bgColor)}>
                  <Icon className={cn('h-5 w-5', kpi.color)} />
                </div>
              </div>
              {kpi.trend && (
                <div className="mt-3 flex items-center gap-1">
                  {kpi.trend === 'positive' ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      kpi.trend === 'positive' ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {kpi.trend === 'positive' ? 'Performance positiva' : 'Attenzione richiesta'}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Enterprise ROI Rollup Card */}
      {data.roiSummary && (
        <Card 
          className="windtre-glass-panel border-2 border-windtre-orange/30 p-6 bg-gradient-to-br from-white/80 to-orange-50/50"
          data-testid="kpi-roi-summary"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">💰 ROI Summary Enterprise</h3>
              <p className="text-sm text-gray-600">Analisi completa Return on Investment</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-windtre-orange/10 rounded-lg">
              <span className="text-sm font-semibold text-windtre-orange">ROI</span>
              <span className={cn(
                "text-2xl font-bold",
                data.roiSummary.roiPercent > 0 ? "text-green-600" : "text-red-600"
              )}>
                {data.roiSummary.roiPercent > 0 ? '+' : ''}{data.roiSummary.roiPercent}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Revenue</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(data.roiSummary.currentRevenue)}
              </p>
            </div>
            <div className="text-center p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Marketing Spend</p>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(data.roiSummary.marketingSpend)}
              </p>
            </div>
            <div className="text-center p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Margin</p>
              <p className={cn(
                "text-lg font-bold",
                data.roiSummary.margin > 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(data.roiSummary.margin)}
              </p>
            </div>
            <div className="text-center p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Prior Period</p>
              <p className="text-lg font-bold text-gray-700">
                {formatCurrency(data.roiSummary.priorPeriodRevenue)}
              </p>
            </div>
            <div className="text-center p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Revenue Δ</p>
              <div className="flex items-center justify-center gap-1">
                {data.roiSummary.revenueDelta > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : data.roiSummary.revenueDelta < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : null}
                <p className={cn(
                  "text-lg font-bold",
                  data.roiSummary.revenueDelta > 0 ? "text-green-600" : 
                  data.roiSummary.revenueDelta < 0 ? "text-red-600" : "text-gray-700"
                )}>
                  {data.roiSummary.revenueDelta > 0 ? '+' : ''}{data.roiSummary.revenueDelta}%
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
