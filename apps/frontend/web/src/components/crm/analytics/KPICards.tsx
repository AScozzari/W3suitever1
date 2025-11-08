import { TrendingUp, TrendingDown, DollarSign, Users, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPIData {
  totalLeads: number;
  activeDeals: number;
  conversionRate: number;
  avgJourneyDurationDays: number;
  totalRevenue: number;
  churnRate: number;
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
  );
}
