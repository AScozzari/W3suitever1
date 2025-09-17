// DashboardTemplate - Local template component for dashboard pages
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: ReactNode;
  color?: string;
}

interface DashboardTemplateProps {
  title: string;
  description?: string;
  metrics?: MetricCard[];
  loading?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const DashboardTemplate = ({
  title,
  description,
  metrics = [],
  loading = false,
  filters,
  actions,
  children,
  className
}: DashboardTemplateProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filters}
          {actions}
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: metrics.length || 4 }).map((_, i) => (
              <Card key={i} className="backdrop-blur-sm bg-background/50 border-border/50">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20 mt-2" />
                </CardContent>
              </Card>
            ))
          ) : (
            metrics.map((metric) => (
              <Card 
                key={metric.id} 
                className="backdrop-blur-sm bg-background/50 border-border/50 transition-all hover:bg-background/70"
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  {metric.icon && (
                    <div className="rounded-full p-2 bg-muted/20">
                      {metric.icon}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {metric.description}
                    </p>
                  )}
                  {metric.trend && (
                    <div className={cn(
                      "flex items-center mt-2 text-xs",
                      metric.trend.value > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      <span className="font-medium">{metric.trend.label}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Main Content */}
      {children}
    </div>
  );
};