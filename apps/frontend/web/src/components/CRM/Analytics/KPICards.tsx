/**
 * KPI Cards Component
 * 
 * Executive summary cards with animated trends and glassmorphism design
 * Shows key performance indicators with real-time updates
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target, 
  Brain,
  ShoppingBag,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import CountUp from 'react-countup';

export interface KPIData {
  totalRevenue: number;
  revenueTrend: number;
  totalLeads: number;
  leadsTrend: number;
  conversionRate: number;
  conversionTrend: number;
  avgDealSize: number;
  dealSizeTrend: number;
  aiScoreAccuracy: number;
  accuracyTrend: number;
  activeCustomers: number;
  customersTrend: number;
}

interface KPICardsProps {
  data?: KPIData;
  isLoading?: boolean;
  className?: string;
}

interface KPICardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  format?: 'currency' | 'number' | 'percentage';
  color?: 'orange' | 'purple' | 'blue' | 'green' | 'yellow' | 'pink';
  isLoading?: boolean;
}

// React CountUp wrapper for better animations
const AnimatedNumber = ({ 
  value, 
  format = 'number' 
}: { 
  value: number; 
  format?: 'currency' | 'number' | 'percentage' 
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('it-IT').format(Math.round(val));
    }
  };

  if (format === 'currency') {
    return (
      <CountUp
        end={value}
        duration={1.5}
        separator="."
        decimal=","
        prefix="€ "
        preserveValue
        formattingFn={(val) => formatValue(val)}
      />
    );
  }

  if (format === 'percentage') {
    return (
      <CountUp
        end={value}
        duration={1.5}
        decimals={1}
        decimal=","
        suffix="%"
        preserveValue
      />
    );
  }

  return (
    <CountUp
      end={value}
      duration={1.5}
      separator="."
      preserveValue
    />
  );
};

function KPICard({ 
  title, 
  value, 
  trend, 
  icon, 
  format = 'number', 
  color = 'orange',
  isLoading 
}: KPICardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [value]);

  const colorClasses = {
    orange: 'from-[var(--brand-orange)]/10 to-[var(--brand-orange)]/5 border-[var(--brand-orange)]/20',
    purple: 'from-[var(--brand-purple)]/10 to-[var(--brand-purple)]/5 border-[var(--brand-purple)]/20',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    green: 'from-green-500/10 to-green-500/5 border-green-500/20',
    yellow: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20',
    pink: 'from-pink-500/10 to-pink-500/5 border-pink-500/20',
  };

  const iconColorClasses = {
    orange: 'text-[var(--brand-orange)]',
    purple: 'text-[var(--brand-purple)]',
    blue: 'text-blue-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    pink: 'text-pink-500',
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-lg border-gray-200/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      "bg-gradient-to-br",
      colorClasses[color],
      "backdrop-blur-lg border",
      "hover:shadow-lg hover:scale-[1.02]",
      isAnimating && "animate-pulse"
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-full bg-white/50",
          iconColorClasses[color]
        )}>
          {icon}
        </div>
      </CardHeader>

      <CardContent className="relative">
        <div className="text-2xl font-bold mb-2">
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} format={format} />
          ) : (
            value
          )}
        </div>

        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isPositiveTrend && "text-green-600",
            isNegativeTrend && "text-red-600",
            !isPositiveTrend && !isNegativeTrend && "text-gray-500"
          )}>
            {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
            {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
            <span>
              {isPositiveTrend && '+'}
              {trend.toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1">vs periodo precedente</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KPICards({ data, isLoading = false, className }: KPICardsProps) {
  const cards = [
    {
      title: "Fatturato Totale",
      value: data?.totalRevenue || 0,
      trend: data?.revenueTrend,
      icon: <DollarSign className="h-4 w-4" />,
      format: 'currency' as const,
      color: 'orange' as const,
    },
    {
      title: "Lead Totali",
      value: data?.totalLeads || 0,
      trend: data?.leadsTrend,
      icon: <Users className="h-4 w-4" />,
      format: 'number' as const,
      color: 'purple' as const,
    },
    {
      title: "Tasso Conversione",
      value: data?.conversionRate || 0,
      trend: data?.conversionTrend,
      icon: <Target className="h-4 w-4" />,
      format: 'percentage' as const,
      color: 'blue' as const,
    },
    {
      title: "Deal Size Medio",
      value: data?.avgDealSize || 0,
      trend: data?.dealSizeTrend,
      icon: <ShoppingBag className="h-4 w-4" />,
      format: 'currency' as const,
      color: 'green' as const,
    },
    {
      title: "Accuratezza AI",
      value: data?.aiScoreAccuracy || 0,
      trend: data?.accuracyTrend,
      icon: <Brain className="h-4 w-4" />,
      format: 'percentage' as const,
      color: 'yellow' as const,
    },
    {
      title: "Clienti Attivi",
      value: data?.activeCustomers || 0,
      trend: data?.customersTrend,
      icon: <Activity className="h-4 w-4" />,
      format: 'number' as const,
      color: 'pink' as const,
    },
  ];

  return (
    <div className={cn(
      "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
      className
    )}>
      {cards.map((card, index) => (
        <KPICard
          key={card.title}
          {...card}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}

// Export for individual use
export { KPICard };