import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, TrendingDown, 
  BarChart3, PieChart, Users, 
  Target, Euro, Calendar,
  ArrowUpRight, ArrowDownRight,
  Activity, Globe, Mail, Phone
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, 
  PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, FunnelChart, Funnel, LabelList
} from "recharts";
import { motion } from "framer-motion";
import { LoadingState } from "@w3suite/frontend-kit/components/blocks";

interface PipelineAnalyticsTabProps {
  pipelineId: string;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
}

interface ChannelStat {
  channel: string;
  count: number;
  percentage: number;
}

interface ChannelMatrix {
  inboundChannel: string;
  outboundChannel: string;
  wonCount: number;
  totalCount: number;
  winRate: number;
}

interface BestPair {
  pairName: string;
  inboundChannel: string;
  outboundChannel: string;
  wonCount: number;
  totalCount: number;
  conversionRate: number;
}

interface FunnelBySource {
  sourceChannel: string;
  stageCategory: string;
  dealCount: number;
  orderIndex: number;
}

interface OutboundEfficiency {
  channel: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  avgDealValue: number;
}

interface TimeToClose {
  pairName: string;
  inboundChannel: string;
  outboundChannel: string;
  dealCount: number;
  avgDaysToClose: number;
}

// 🎨 Design Tokens
const COLORS = {
  orange: 'hsl(var(--brand-orange))',
  purple: 'hsl(var(--brand-purple))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  tertiary: 'var(--text-tertiary)',
};

// 📊 Mock data for charts without backend endpoints (TODO: implement backend)
const conversionFunnelData = [
  { stage: 'Leads', count: 150, percentage: 100 },
  { stage: 'Qualified', count: 90, percentage: 60 },
  { stage: 'Proposal', count: 45, percentage: 30 },
  { stage: 'Negotiation', count: 20, percentage: 13 },
  { stage: 'Won', count: 10, percentage: 6.7 },
];

const winRateTrendData = [
  { month: 'Gen', winRate: 45, deals: 12 },
  { month: 'Feb', winRate: 52, deals: 15 },
  { month: 'Mar', winRate: 48, deals: 13 },
  { month: 'Apr', winRate: 61, deals: 18 },
  { month: 'Mag', winRate: 58, deals: 16 },
  { month: 'Giu', winRate: 65, deals: 20 },
];

const contactActivityData = [
  { type: 'Email', count: 245, avgResponse: '4h' },
  { type: 'Phone', count: 128, avgResponse: '2h' },
  { type: 'Meeting', count: 87, avgResponse: '1d' },
  { type: 'Demo', count: 42, avgResponse: '3d' },
];

const leadProfileData = [
  { segment: 'Enterprise', count: 45, value: 2500000 },
  { segment: 'Mid-Market', count: 78, value: 1800000 },
  { segment: 'SMB', count: 120, value: 900000 },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function PipelineAnalyticsTab({ pipelineId }: PipelineAnalyticsTabProps) {
  // ✅ REAL DATA: Category stats (stage distribution)
  const { data: categoryStats, isLoading: categoryLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/category-stats`],
    select: (response: any) => response.data as CategoryStat[]
  });

  // ✅ REAL DATA: Channel stats (acquisition sources)
  const { data: channelStats, isLoading: channelLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/channel-stats`],
    select: (response: any) => response.data as ChannelStat[]
  });

  // ✅ NEW ANALYTICS: Channel Attribution Matrix
  const { data: channelMatrix, isLoading: matrixLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/channel-matrix`],
    select: (response: any) => response.data as ChannelMatrix[]
  });

  // ✅ NEW ANALYTICS: Best Performing Pairs
  const { data: bestPairs, isLoading: pairsLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/best-pairs`],
    select: (response: any) => response.data as BestPair[]
  });

  // ✅ NEW ANALYTICS: Funnel by Source
  const { data: funnelBySource, isLoading: funnelLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/funnel-by-source`],
    select: (response: any) => response.data as FunnelBySource[]
  });

  // ✅ NEW ANALYTICS: Outbound Efficiency
  const { data: outboundEfficiency, isLoading: efficiencyLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/outbound-efficiency`],
    select: (response: any) => response.data as OutboundEfficiency[]
  });

  // ✅ NEW ANALYTICS: Time to Close
  const { data: timeToClose, isLoading: timeLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/time-to-close`],
    select: (response: any) => response.data as TimeToClose[]
  });

  // Transform channel stats to chart format
  const channelPerformanceData = channelStats?.map(stat => ({
    channel: stat.channel,
    deals: stat.count,
    value: stat.count * 50000, // Estimated value based on count
    conversion: stat.percentage
  })) || [];

  if (categoryLoading || channelLoading || matrixLoading || pairsLoading || funnelLoading || efficiencyLoading || timeLoading) {
    return <LoadingState />;
  }
  return (
    <div className="space-y-6">
      {/* Overview Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Conversion Rate"
          value="6.7%"
          change="+2.3%"
          trending="up"
          icon={TrendingUp}
          color={COLORS.success}
        />
        <MetricCard
          title="Avg Deal Size"
          value="€42k"
          change="+12%"
          trending="up"
          icon={Euro}
          color={COLORS.orange}
        />
        <MetricCard
          title="Avg Sales Cycle"
          value="45 days"
          change="-8 days"
          trending="up"
          icon={Calendar}
          color={COLORS.purple}
        />
        <MetricCard
          title="Active Deals"
          value="78"
          change="+15"
          trending="up"
          icon={Users}
          color={COLORS.primary}
        />
      </div>

      {/* Charts Row 1: Best Pairs + Channel Matrix Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ✅ Best Performing Channel Pairs */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                  🏆 Top Inbound × Outbound Pairs
                </h3>
                <p className="text-sm" style={{ color: COLORS.tertiary }}>
                  Best channel combinations by win rate
                </p>
              </div>
              <Target className="h-5 w-5" style={{ color: COLORS.orange }} />
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={bestPairs || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-card-border)" />
                <XAxis type="number" stroke={COLORS.secondary} />
                <YAxis dataKey="pairName" type="category" stroke={COLORS.secondary} width={180} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--glass-card-bg)', 
                    border: '1px solid var(--glass-card-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="conversionRate" fill={COLORS.orange} radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="conversionRate" position="right" formatter={(value: number) => `${value}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* ✅ Channel Attribution Matrix Heatmap */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                  📊 Attribution Matrix
                </h3>
                <p className="text-sm" style={{ color: COLORS.tertiary }}>
                  Win rate by inbound × outbound channels
                </p>
              </div>
              <Activity className="h-5 w-5" style={{ color: COLORS.success }} />
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {channelMatrix?.map((item, idx) => (
                <motion.div
                  key={`${item.inboundChannel}-${item.outboundChannel}`}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + idx * 0.03 }}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ background: 'var(--glass-bg-heavy)' }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: COLORS.primary }}>
                      {item.inboundChannel} → {item.outboundChannel}
                    </div>
                    <div className="text-xs" style={{ color: COLORS.tertiary }}>
                      {item.wonCount}/{item.totalCount} deals won
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: item.winRate >= 50 ? COLORS.success : COLORS.orange }}>
                      {item.winRate}%
                    </div>
                  </div>
                </motion.div>
              ))}
              {(!channelMatrix || channelMatrix.length === 0) && (
                <div className="text-center py-8" style={{ color: COLORS.tertiary }}>
                  No channel combinations data available
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2: Channel Performance */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
        <Card 
          className="glass-card p-6 border-0"
          style={{ 
            background: 'var(--glass-card-bg)',
            border: '1px solid var(--glass-card-border)',
            boxShadow: 'var(--shadow-glass)'
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                Channel Performance
              </h3>
              <p className="text-sm" style={{ color: COLORS.tertiary }}>
                Deal value and conversion by acquisition source
              </p>
            </div>
            <BarChart3 className="h-5 w-5" style={{ color: COLORS.purple }} />
          </div>
          
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={channelPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-card-border)" />
              <XAxis dataKey="channel" stroke={COLORS.secondary} angle={-15} textAnchor="end" height={80} />
              <YAxis yAxisId="left" stroke={COLORS.orange} />
              <YAxis yAxisId="right" orientation="right" stroke={COLORS.purple} />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--glass-card-bg)', 
                  border: '1px solid var(--glass-card-border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="value" fill={COLORS.orange} radius={[8, 8, 0, 0]} name="Deal Value (€)" />
              <Bar yAxisId="right" dataKey="conversion" fill={COLORS.purple} radius={[8, 8, 0, 0]} name="Conversion %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Charts Row 3: Outbound Efficiency + Time to Close */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ✅ Outbound Channel Efficiency */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                  📞 Outbound Channel Efficiency
                </h3>
                <p className="text-sm" style={{ color: COLORS.tertiary }}>
                  Performance by contact method
                </p>
              </div>
              <Mail className="h-5 w-5" style={{ color: COLORS.orange }} />
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={outboundEfficiency || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-card-border)" />
                <XAxis dataKey="channel" stroke={COLORS.secondary} angle={-15} textAnchor="end" height={80} />
                <YAxis stroke={COLORS.secondary} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--glass-card-bg)', 
                    border: '1px solid var(--glass-card-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="winRate" fill={COLORS.purple} radius={[8, 8, 0, 0]} name="Win Rate %">
                  <LabelList dataKey="winRate" position="top" formatter={(value: number) => `${value}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* ✅ Time to Close Analysis */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
          <Card 
            className="glass-card p-6 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                  ⏱️ Time to Close
                </h3>
                <p className="text-sm" style={{ color: COLORS.tertiary }}>
                  Average days by channel pair
                </p>
              </div>
              <Calendar className="h-5 w-5" style={{ color: COLORS.success }} />
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {timeToClose?.map((item, idx) => (
                <motion.div
                  key={item.pairName}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ background: 'var(--glass-bg-heavy)' }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: COLORS.primary }}>
                      {item.pairName}
                    </div>
                    <div className="text-xs" style={{ color: COLORS.tertiary }}>
                      {item.dealCount} deals closed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: COLORS.success }}>
                      {item.avgDaysToClose} days
                    </div>
                  </div>
                </motion.div>
              ))}
              {(!timeToClose || timeToClose.length === 0) && (
                <div className="text-center py-8" style={{ color: COLORS.tertiary }}>
                  No time to close data available
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Export Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" data-testid="button-export-pdf">
          Download PDF Report
        </Button>
        <Button style={{ background: COLORS.orange }} data-testid="button-export-csv">
          Export CSV
        </Button>
      </div>
    </div>
  );
}

// 📊 Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trending: 'up' | 'down';
  icon: any;
  color: string;
}

function MetricCard({ title, value, change, trending, icon: Icon, color }: MetricCardProps) {
  const TrendIcon = trending === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor = trending === 'up' ? COLORS.success : COLORS.danger;

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Card 
        className="glass-card p-4 border-0"
        style={{ 
          background: 'var(--glass-card-bg)',
          border: '1px solid var(--glass-card-border)',
          boxShadow: 'var(--shadow-glass)'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: COLORS.tertiary }}>
            {title}
          </span>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
          {value}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <TrendIcon className="h-3 w-3" style={{ color: trendColor }} />
          <span style={{ color: trendColor }}>{change}</span>
        </div>
      </Card>
    </motion.div>
  );
}
