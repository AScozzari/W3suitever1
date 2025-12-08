import { PageHeader, PageHeaderProps } from '../components/blocks/PageHeader';
import { StatsCard } from '../components/blocks/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { cn } from '../lib/utils';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign,
  AlertCircle,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

export interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
}

export interface ChartData {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: Date | string;
  icon?: React.ReactNode;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
}

export interface DashboardTemplateProps {
  // Page Header
  title: string;
  subtitle?: string;
  breadcrumbs?: PageHeaderProps['breadcrumbs'];
  
  // Metrics Section
  metrics?: MetricCard[];
  metricsLoading?: boolean;
  
  // Charts Section
  charts?: ChartData[];
  chartsLayout?: 'grid' | 'stack' | 'custom';
  chartsLoading?: boolean;
  
  // Activity/Recent Items
  activityTitle?: string;
  activityItems?: ActivityItem[];
  activityLoading?: boolean;
  showActivityViewAll?: boolean;
  onActivityViewAll?: () => void;
  
  // Quick Actions
  quickActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  }>;
  
  // Filters
  showFilters?: boolean;
  filterOptions?: React.ReactNode;
  
  // States
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: Error | string | null;
  lastUpdated?: Date | string;
  
  // Actions
  onRefresh?: () => void;
  onExport?: () => void;
  primaryAction?: PageHeaderProps['primaryAction'];
  
  // Layout
  variant?: 'default' | 'compact' | 'sidebar';
  className?: string;
  children?: React.ReactNode;
}

export function DashboardTemplate({
  title,
  subtitle,
  breadcrumbs,
  metrics = [],
  metricsLoading = false,
  charts = [],
  chartsLayout = 'grid',
  chartsLoading = false,
  activityTitle = 'Recent Activity',
  activityItems = [],
  activityLoading = false,
  showActivityViewAll = false,
  onActivityViewAll,
  quickActions = [],
  showFilters = false,
  filterOptions,
  isLoading = false,
  isRefreshing = false,
  error = null,
  lastUpdated,
  onRefresh,
  onExport,
  primaryAction,
  variant = 'default',
  className = '',
  children,
}: DashboardTemplateProps) {
  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / 1000 / 60),
      'minutes'
    );
  };

  const getChartsGridClass = () => {
    switch (chartsLayout) {
      case 'grid':
        return 'grid gap-6 md:grid-cols-2';
      case 'stack':
        return 'space-y-6';
      case 'custom':
        return '';
      default:
        return 'grid gap-6 md:grid-cols-2';
    }
  };

  const dashboardContent = (
    <div className="space-y-8">
      {/* Error State */}
      {error && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading dashboard</AlertTitle>
          <AlertDescription>
            {typeof error === 'string' ? error : error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters Bar */}
      {showFilters && filterOptions && (
        <Card className="glass-card" data-testid="dashboard-filters">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              {filterOptions}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="metrics-grid">
          {metricsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            metrics.map((metric) => (
              <StatsCard
                key={metric.id}
                title={metric.title}
                value={metric.value}
                description={metric.description}
                trend={metric.trend}
                icon={metric.icon}
                variant="glass"
                data-testid={`metric-card-${metric.id}`}
              />
            ))
          )}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card className="glass-card" data-testid="quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  data-testid={`button-quick-${index}`}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {charts.length > 0 && (
        <div className={getChartsGridClass()} data-testid="charts-section">
          {chartsLoading ? (
            <>
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </>
          ) : (
            charts.map((chart) => (
              <Card key={chart.id} className="glass-card" data-testid={`chart-${chart.id}`}>
                <CardHeader>
                  <CardTitle>{chart.title}</CardTitle>
                  {chart.description && (
                    <CardDescription>{chart.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>{chart.component}</CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Activity/Recent Items */}
      {(activityItems.length > 0 || activityLoading) && (
        <Card className="glass-card" data-testid="activity-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{activityTitle}</CardTitle>
              </div>
              {showActivityViewAll && onActivityViewAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onActivityViewAll}
                  data-testid="button-view-all"
                >
                  View All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {activityItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                    data-testid={`activity-item-${item.id}`}
                  >
                    {item.icon && (
                      <div className="mt-1 text-gray-400">{item.icon}</div>
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.badge && (
                          <Badge variant={item.badge.variant || 'default'}>
                            {item.badge.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <p className="text-xs text-gray-400">
                        {formatTimestamp(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom Content */}
      {children}
    </div>
  );

  const sidebarContent = variant === 'sidebar' && (
    <aside className="w-64 space-y-4">
      {/* Summary Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {lastUpdated && (
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span>{formatTimestamp(lastUpdated)}</span>
              </div>
            )}
            {metrics.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Metrics</span>
                <span>{metrics.length}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {metrics.slice(0, 3).map((metric) => (
        <Card key={metric.id} className="glass-card">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{metric.title}</p>
              <p className="text-lg font-semibold">{metric.value}</p>
              {metric.trend && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">
                    {metric.trend.value}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </aside>
  );

  return (
    <div className={cn('space-y-6', className)} data-testid="dashboard-template">
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        primaryAction={primaryAction}
        secondaryActions={[
          ...(onExport ? [{
            label: 'Export',
            icon: <Download className="h-4 w-4" />,
            onClick: onExport,
            variant: 'outline' as const
          }] : []),
          ...(onRefresh ? [{
            label: isRefreshing ? 'Refreshing...' : 'Refresh',
            icon: <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />,
            onClick: onRefresh,
            variant: 'outline' as const,
            disabled: isRefreshing
          }] : [])
        ].filter(Boolean)}
      />

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : variant === 'sidebar' ? (
        <div className="flex gap-6">
          {sidebarContent}
          <div className="flex-1">{dashboardContent}</div>
        </div>
      ) : (
        dashboardContent
      )}
    </div>
  );
}

// Preset dashboard variants
export const SimpleDashboard = (props: Omit<DashboardTemplateProps, 'variant'>) => (
  <DashboardTemplate {...props} variant="default" />
);

export const CompactDashboard = (props: Omit<DashboardTemplateProps, 'variant'>) => (
  <DashboardTemplate {...props} variant="compact" />
);

export const SidebarDashboard = (props: Omit<DashboardTemplateProps, 'variant'>) => (
  <DashboardTemplate {...props} variant="sidebar" />
);