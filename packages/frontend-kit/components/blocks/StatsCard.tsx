import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  title: string;
  value: number | string;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient';
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  icon,
  variant = 'default',
  className = '',
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value > 0) {
      return <TrendingUp className="h-4 w-4" />;
    } else if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4" />;
    } else {
      return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    if (trend.value > 0) {
      return 'text-green-600 bg-green-100';
    } else if (trend.value < 0) {
      return 'text-red-600 bg-red-100';
    } else {
      return 'text-gray-600 bg-gray-100';
    }
  };

  const getCardStyles = () => {
    switch (variant) {
      case 'glass':
        return 'glass-card hover:shadow-glass-lg';
      case 'gradient':
        return 'bg-gradient-to-br from-primary/10 to-secondary/10 border-0';
      default:
        return 'bg-white border-gray-200 hover:shadow-md';
    }
  };

  return (
    <Card 
      className={cn(
        'transition-all duration-300',
        getCardStyles(),
        className
      )}
      data-testid="stats-card"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold" data-testid="stats-value">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          
          {description && (
            <p className="text-xs text-gray-500" data-testid="stats-description">
              {description}
            </p>
          )}
          
          {trend && (
            <div className="flex items-center gap-2" data-testid="stats-trend">
              <Badge 
                variant="secondary" 
                className={cn('flex items-center gap-1', getTrendColor())}
              >
                {getTrendIcon()}
                <span className="text-xs font-medium">
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </Badge>
              {trend.label && (
                <span className="text-xs text-gray-500">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Preset variants for common use cases
export const PrimaryStatsCard = (props: Omit<StatsCardProps, 'variant'>) => (
  <StatsCard {...props} variant="glass" className="border-primary/20" />
);

export const SecondaryStatsCard = (props: Omit<StatsCardProps, 'variant'>) => (
  <StatsCard {...props} variant="glass" className="border-secondary/20" />
);

export const GradientStatsCard = (props: Omit<StatsCardProps, 'variant'>) => (
  <StatsCard {...props} variant="gradient" />
);