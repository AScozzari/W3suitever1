/**
 * CRM Analytics Dashboard
 * 
 * Enterprise-level analytics with comprehensive visualizations
 * Features store-level filtering, real-time updates, and advanced charts
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { FilterBar, AnalyticsFilters } from '@/components/CRM/Analytics/FilterBar';
import { KPICards } from '@/components/CRM/Analytics/KPICards';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Brain,
  Megaphone,
  ShoppingBag,
  Activity,
  Layers,
  Globe,
  Zap,
  LayoutDashboard,
  UserPlus,
  CheckSquare
} from 'lucide-react';
import { Link } from 'wouter';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';

// WindTre brand colors
const COLORS = {
  orange: 'hsl(var(--brand-orange))',
  purple: 'hsl(var(--brand-purple))',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  pink: '#EC4899',
  indigo: '#6366F1',
  gray: '#6B7280'
};

const CHART_COLORS = [
  COLORS.orange,
  COLORS.purple,
  COLORS.blue,
  COLORS.green,
  COLORS.yellow,
  COLORS.pink,
  COLORS.indigo
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

// Main content component (used by both standalone page and CRMPage tabs)
export function AnalyticsContent() {
  const { buildUrl } = useTenantNavigation();
  
  // Filter state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    storeIds: [],
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    },
    preset: '30days'
  });

  // Build query params object for TanStack Query
  const queryParams: Record<string, any> = {};
  if (filters.storeIds.length > 0) {
    queryParams.storeIds = filters.storeIds.join(',');
  }
  if (filters.dateRange?.from) {
    queryParams.dateFrom = filters.dateRange.from.toISOString();
  }
  if (filters.dateRange?.to) {
    queryParams.dateTo = filters.dateRange.to.toISOString();
  }

  // Fetch data with React Query - using default queryFn with auth headers
  const { data: executiveSummary = {}, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['/api/crm/analytics/executive-summary', queryParams]
  }) as { data: any; isLoading: boolean; refetch: any };

  const { data: campaignPerformance = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['/api/crm/analytics/campaign-performance', queryParams]
  }) as { data: any[]; isLoading: boolean };

  const { data: channelAttribution = [], isLoading: isLoadingChannels } = useQuery({
    queryKey: ['/api/crm/analytics/channel-attribution', queryParams]
  }) as { data: any[]; isLoading: boolean };

  const { data: aiScoreDistribution = [], isLoading: isLoadingAI } = useQuery({
    queryKey: ['/api/crm/analytics/ai-score-distribution', queryParams]
  }) as { data: any[]; isLoading: boolean };

  const { data: gtmEvents = { byHour: [] }, isLoading: isLoadingGTM } = useQuery({
    queryKey: ['/api/crm/analytics/gtm-events', queryParams]
  }) as { data: any; isLoading: boolean };

  const { data: storeComparison = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ['/api/crm/analytics/store-comparison', queryParams]
  }) as { data: any[]; isLoading: boolean };

  const { data: conversionFunnel = [], isLoading: isLoadingFunnel } = useQuery({
    queryKey: ['/api/crm/analytics/conversion-funnel', queryParams]
  }) as { data: any[]; isLoading: boolean };

  const handleRefresh = () => {
    refetchSummary();
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export data');
  };

  return (
      <div className="flex flex-col h-full">
        {/* WindTre Glassmorphism Header */}
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-windtre-orange" />
                  CRM Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Insights avanzati e performance multi-store</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 mb-6">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={handleRefresh}
            onExport={handleExport}
            isLoading={isLoadingSummary}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 pb-6 overflow-auto space-y-6">
          {/* KPI Cards */}
          <KPICards 
            data={executiveSummary} 
            isLoading={isLoadingSummary} 
          />

          {/* Analytics Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="marketing" className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Marketing
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="gtm" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                GTM & Social
              </TabsTrigger>
              <TabsTrigger value="stores" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Store Analysis
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-6 md:grid-cols-2"
              >
                {/* Conversion Funnel */}
                <motion.div variants={cardVariants}>
                  <Card className="glass-card h-[400px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-[var(--brand-orange)]" />
                        Conversion Funnel
                      </CardTitle>
                      <CardDescription>Dal visitatore al cliente</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {conversionFunnel && conversionFunnel.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <FunnelChart>
                            <Tooltip />
                            <Funnel
                              dataKey="value"
                              data={conversionFunnel}
                              isAnimationActive
                            >
                              <LabelList position="center" fill="#fff" />
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                          Nessun dato disponibile
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Campaign Performance */}
                <motion.div variants={cardVariants}>
                  <Card className="glass-card h-[400px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-[var(--brand-purple)]" />
                        Campaign Performance
                      </CardTitle>
                      <CardDescription>ROI per campagna attiva</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {campaignPerformance && campaignPerformance.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={campaignPerformance.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis 
                              dataKey="campaignName" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              fontSize={12}
                            />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="roi" fill={COLORS.orange} radius={[8, 8, 0, 0]} />
                            <Bar dataKey="conversionRate" fill={COLORS.purple} radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                          Nessun dato disponibile
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Store Comparison Table */}
              <motion.div variants={cardVariants}>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-[var(--brand-orange)]" />
                      Top Performing Stores
                    </CardTitle>
                    <CardDescription>Ranking store per performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2 font-medium text-sm text-muted-foreground">Rank</th>
                            <th className="pb-2 font-medium text-sm text-muted-foreground">Store</th>
                            <th className="pb-2 font-medium text-sm text-muted-foreground">Città</th>
                            <th className="pb-2 font-medium text-sm text-muted-foreground">Revenue</th>
                            <th className="pb-2 font-medium text-sm text-muted-foreground">Leads</th>
                            <th className="pb-2 font-medium text-sm text-muted-foreground">Conv. Rate</th>
                            <th className="pb-2 font-medium text-sm text-muted-foreground">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storeComparison?.slice(0, 5).map((store: any) => (
                            <tr key={store.storeId} className="border-b">
                              <td className="py-3">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                  store.rank === 1 && "bg-yellow-100 text-yellow-800",
                                  store.rank === 2 && "bg-gray-100 text-gray-800",
                                  store.rank === 3 && "bg-orange-100 text-orange-800",
                                  store.rank > 3 && "bg-gray-50 text-gray-600"
                                )}>
                                  {store.rank}
                                </span>
                              </td>
                              <td className="py-3 font-medium">{store.storeName}</td>
                              <td className="py-3 text-muted-foreground">{store.city}</td>
                              <td className="py-3">€{(store.metrics.revenue / 1000).toFixed(0)}k</td>
                              <td className="py-3">{store.metrics.leads}</td>
                              <td className="py-3">
                                <span className="text-green-600 font-medium">
                                  {store.metrics.conversionRate}%
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{store.metrics.performanceScore}</span>
                                  <Activity className="h-4 w-4 text-[var(--brand-orange)]" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Marketing Tab */}
            <TabsContent value="marketing" className="space-y-6">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-6 md:grid-cols-2"
              >
                {/* Channel Attribution */}
                <motion.div variants={cardVariants}>
                  <Card className="glass-card h-[400px]">
                    <CardHeader>
                      <CardTitle>Channel Attribution</CardTitle>
                      <CardDescription>Performance per canale marketing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={channelAttribution || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ channel, conversionRate }) => `${channel}: ${conversionRate.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                          >
                            {(channelAttribution || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* UTM Performance */}
                <motion.div variants={cardVariants}>
                  <Card className="glass-card h-[400px]">
                    <CardHeader>
                      <CardTitle>UTM Campaign Tracking</CardTitle>
                      <CardDescription>Click e conversioni per source/medium</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {channelAttribution && channelAttribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <RadarChart data={channelAttribution}>
                            <PolarGrid strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="source" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} />
                            <Radar name="Leads" dataKey="leads" stroke={COLORS.orange} fill={COLORS.orange} fillOpacity={0.6} />
                            <Radar name="Customers" dataKey="customers" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.6} />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                          Nessun dato disponibile
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="ai" className="space-y-6">
              <motion.div variants={cardVariants}>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-[var(--brand-purple)]" />
                      AI Score Distribution
                    </CardTitle>
                    <CardDescription>Accuratezza predittiva del modello AI</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {aiScoreDistribution && aiScoreDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aiScoreDistribution}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="scoreRange" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill={COLORS.purple} name="Lead Totali" />
                          <Bar dataKey="converted" fill={COLORS.green} name="Convertiti" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Nessun dato disponibile
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* GTM & Social Tab */}
            <TabsContent value="gtm" className="space-y-6">
              <motion.div variants={cardVariants}>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-[var(--brand-orange)]" />
                      GTM Events Timeline
                    </CardTitle>
                    <CardDescription>Eventi tracciati per ora del giorno</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gtmEvents?.byHour && gtmEvents.byHour.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={gtmEvents.byHour}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="events" 
                            stroke={COLORS.orange}
                            fill={COLORS.orange}
                            fillOpacity={0.3}
                            name="Eventi"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="conversions" 
                            stroke={COLORS.green}
                            fill={COLORS.green}
                            fillOpacity={0.3}
                            name="Conversioni"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Nessun dato disponibile
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Stores Analysis Tab */}
            <TabsContent value="stores" className="space-y-6">
              <motion.div variants={cardVariants}>
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Store Performance Comparison</CardTitle>
                    <CardDescription>Metriche comparative tra punti vendita</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {storeComparison && storeComparison.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={storeComparison}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="storeName" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="metrics.revenue" 
                            stroke={COLORS.orange}
                            strokeWidth={2}
                            name="Revenue (€)"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="metrics.conversionRate" 
                            stroke={COLORS.purple}
                            strokeWidth={2}
                            name="Conv. Rate (%)"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="metrics.leads" 
                            stroke={COLORS.blue}
                            strokeWidth={2}
                            name="Leads"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        Nessun dato disponibile
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
  );
}

// Standalone page wrapper with Layout (for direct route access)
export default function AnalyticsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  
  return (
    <Layout currentModule={currentModule} setCurrentModule={() => {}}>
      <CRMCommandPalette />
      <AnalyticsContent />
    </Layout>
  );
}