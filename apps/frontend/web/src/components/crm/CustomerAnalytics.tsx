import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Users } from 'lucide-react';

interface CustomerAnalyticsProps {
  customerId: string;
}

export function CustomerAnalytics({ customerId }: CustomerAnalyticsProps) {
  // Fetch analytics data
  const { data: analyticsResponse, isLoading } = useQuery({
    queryKey: [`/api/crm/persons/${customerId}/analytics`],
    enabled: !!customerId,
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const analytics = analyticsResponse?.data;
  const kpi = analytics?.kpi || { lifetimeValue: 0, ltvTrend: 0, dealsClosed: 0, engagementScore: 0, referrals: 0 };
  const charts = analytics?.charts || { revenueData: [], interactionData: [], campaignData: [] };

  const revenueData = charts.revenueData;
  const interactionData = charts.interactionData;
  const campaignData = charts.campaignData;

  const COLORS = ['#FF6900', '#7B2CBF', '#3b82f6', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4" style={{ background: 'rgba(255, 105, 0, 0.05)', border: '1px solid rgba(255, 105, 0, 0.2)' }} data-testid="analytics-ltv">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Lifetime Value</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--brand-orange))' }}>
                €{kpi.lifetimeValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {kpi.ltvTrend >= 0 ? (
                  <TrendingUp className="h-3 w-3" style={{ color: '#22c55e' }} />
                ) : (
                  <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />
                )}
                <span className="text-xs" style={{ color: kpi.ltvTrend >= 0 ? '#22c55e' : '#ef4444' }}>
                  {kpi.ltvTrend >= 0 ? '+' : ''}{kpi.ltvTrend}%
                </span>
              </div>
            </div>
            <DollarSign className="h-8 w-8" style={{ color: 'hsl(var(--brand-orange))' }} />
          </div>
        </Card>

        <Card className="p-4" style={{ background: 'rgba(123, 44, 191, 0.05)', border: '1px solid rgba(123, 44, 191, 0.2)' }} data-testid="analytics-deals">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Deal Conclusi</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--brand-purple))' }}>
                {kpi.dealsClosed}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Target className="h-3 w-3" style={{ color: 'hsl(var(--brand-purple))' }} />
                <span className="text-xs" style={{ color: '#6b7280' }}>Vinti</span>
              </div>
            </div>
            <Target className="h-8 w-8" style={{ color: 'hsl(var(--brand-purple))' }} />
          </div>
        </Card>

        <Card className="p-4" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }} data-testid="analytics-engagement">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Engagement Score</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#3b82f6' }}>
                {kpi.engagementScore}/100
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Activity className="h-3 w-3" style={{ color: '#3b82f6' }} />
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  {kpi.engagementScore >= 70 ? 'Alto' : kpi.engagementScore >= 40 ? 'Medio' : 'Basso'}
                </span>
              </div>
            </div>
            <Activity className="h-8 w-8" style={{ color: '#3b82f6' }} />
          </div>
        </Card>

        <Card className="p-4" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }} data-testid="analytics-referrals">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Referral Generati</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>
                {kpi.referrals}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Users className="h-3 w-3" style={{ color: '#10b981' }} />
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  {kpi.referrals > 0 ? 'Advocacy' : 'Nessuno'}
                </span>
              </div>
            </div>
            <Users className="h-8 w-8" style={{ color: '#10b981' }} />
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6" data-testid="chart-revenue-trend">
          <h4 className="font-semibold mb-4" style={{ color: '#1a1a1a' }}>
            Andamento Fatturato (6 mesi)
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--brand-orange))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--brand-orange))', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6" data-testid="chart-interaction-channels">
          <h4 className="font-semibold mb-4" style={{ color: '#1a1a1a' }}>
            Canali di Interazione
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={interactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="channel" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--brand-purple))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6" data-testid="chart-campaign-distribution">
          <h4 className="font-semibold mb-4" style={{ color: '#1a1a1a' }}>
            Distribuzione Campagne
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={campaignData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {campaignData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6" data-testid="chart-product-adoption">
          <h4 className="font-semibold mb-4" style={{ color: '#1a1a1a' }}>
            Product Adoption
          </h4>
          <div className="space-y-4">
            {[
              { product: 'Fibra 1000', adoption: 85, color: '#FF6900' },
              { product: 'Mobile 5G', adoption: 65, color: '#7B2CBF' },
              { product: 'TV Premium', adoption: 45, color: '#3b82f6' },
              { product: 'Cloud Storage', adoption: 30, color: '#10b981' },
            ].map((item) => (
              <div key={item.product}>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: '#1a1a1a' }}>{item.product}</span>
                  <span style={{ color: '#6b7280' }}>{item.adoption}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: '#f3f4f6' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${item.adoption}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
