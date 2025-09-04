import { TrendingUp, TrendingDown, Users, Phone, Wifi, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  icon: React.ElementType;
  variant?: 'default' | 'orange' | 'purple' | 'success' | 'warning';
}

const StatCard = ({ title, value, description, trend, trendValue, icon: Icon, variant = 'default' }: StatCardProps) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  const getCardClasses = () => {
    switch (variant) {
      case 'orange':
        return 'glass-strong border-windtre-orange/20 hover:border-windtre-orange/40 hover:shadow-glow-orange';
      case 'purple':
        return 'glass-strong border-windtre-purple/20 hover:border-windtre-purple/40 hover:shadow-glow-purple';
      case 'success':
        return 'glass-strong border-success/20 hover:border-success/40';
      case 'warning':
        return 'glass-strong border-warning/20 hover:border-warning/40';
      default:
        return 'glass-strong hover:glass border-border/50';
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case 'orange':
        return 'text-windtre-orange bg-windtre-orange/10';
      case 'purple':
        return 'text-windtre-purple bg-windtre-purple/10';
      case 'success':
        return 'text-success bg-success/10';
      case 'warning':
        return 'text-warning bg-warning/10';
      default:
        return 'text-muted-foreground bg-muted/50';
    }
  };

  return (
    <Card className={cn('transition-all duration-300 hover:shadow-2xl cursor-pointer group', getCardClasses())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg transition-all duration-300', getIconClasses())}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="flex items-center gap-2">
          <CardDescription className="text-xs">{description}</CardDescription>
          {getTrendIcon()}
          <Badge
            variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {trendValue}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardStats = () => {
  const stats = [
    {
      title: 'Clienti Attivi',
      value: '12,483',
      description: 'Utenti registrati',
      trend: 'up' as const,
      trendValue: '+12.5%',
      icon: Users,
      variant: 'orange' as const,
    },
    {
      title: 'Linee Mobile',
      value: '8,927',
      description: 'Contratti attivi',
      trend: 'up' as const,
      trendValue: '+8.2%',
      icon: Phone,
      variant: 'purple' as const,
    },
    {
      title: 'Connessioni Fibra',
      value: '3,556',
      description: 'Installazioni attive',
      trend: 'stable' as const,
      trendValue: '+2.1%',
      icon: Wifi,
      variant: 'success' as const,
    },
    {
      title: 'Servizi Energia',
      value: '1,284',
      description: 'Forniture attive',
      trend: 'up' as const,
      trendValue: '+24.3%',
      icon: Zap,
      variant: 'warning' as const,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
};