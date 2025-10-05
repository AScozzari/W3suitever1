import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
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
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';

interface ExecutionTrend {
  date: string;
  completed: number;
  failed: number;
  running: number;
  total: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface PerformanceMetric {
  stepName: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  executions: number;
}

interface StepCompletionRate {
  stepId: string;
  stepName: string;
  completionRate: number;
  failureRate: number;
  totalExecutions: number;
}

const COLORS = {
  completed: 'hsl(142, 76%, 36%)',
  failed: 'hsl(0, 84%, 60%)',
  running: 'hsl(262, 83%, 58%)',
  pending: 'hsl(45, 93%, 47%)',
};

const CHART_COLORS = [
  '#FF6900',
  '#7B2CBF',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
];

export function WorkflowAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: executionTrends, isLoading: trendsLoading } = useQuery<ExecutionTrend[]>({
    queryKey: ['/api/workflows/analytics/trends', timeRange],
    refetchInterval: 30000,
  });

  const { data: statusDistribution, isLoading: statusLoading } = useQuery<StatusDistribution[]>({
    queryKey: ['/api/workflows/analytics/status-distribution'],
    refetchInterval: 30000,
  });

  const { data: performanceMetrics, isLoading: perfLoading } = useQuery<PerformanceMetric[]>({
    queryKey: ['/api/workflows/analytics/performance'],
    refetchInterval: 30000,
  });

  const { data: completionRates, isLoading: ratesLoading } = useQuery<StepCompletionRate[]>({
    queryKey: ['/api/workflows/analytics/completion-rates'],
    refetchInterval: 30000,
  });

  const overallStats = executionTrends?.reduce(
    (acc, day) => ({
      totalCompleted: acc.totalCompleted + day.completed,
      totalFailed: acc.totalFailed + day.failed,
      totalRunning: acc.totalRunning + day.running,
      total: acc.total + day.total,
    }),
    { totalCompleted: 0, totalFailed: 0, totalRunning: 0, total: 0 }
  );

  const successRate = overallStats
    ? ((overallStats.totalCompleted / overallStats.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] bg-clip-text text-transparent">
            Workflow Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitor execution trends, performance, and insights
          </p>
        </div>
        
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-[#FF6900] text-white shadow-lg'
                  : 'bg-white/90 backdrop-blur-xl border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              data-testid={`button-timerange-${range}`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-[#FF6900]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-executions">
              {overallStats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-success-rate">
              {successRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {overallStats?.totalCompleted || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-failed-count">
              {overallStats?.totalFailed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overallStats?.total
                ? ((overallStats.totalFailed / overallStats.total) * 100).toFixed(1)
                : '0.0'}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Clock className="h-4 w-4 text-[#7B2CBF]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#7B2CBF]" data-testid="text-running-count">
              {overallStats?.totalRunning || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="bg-white/90 backdrop-blur-xl border border-gray-200">
          <TabsTrigger value="trends" data-testid="tab-trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Execution Trends
          </TabsTrigger>
          <TabsTrigger value="status" data-testid="tab-status">
            <BarChart3 className="h-4 w-4 mr-2" />
            Status Distribution
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Clock className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="completion" data-testid="tab-completion">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completion Rates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
            <CardHeader>
              <CardTitle>Execution Trends Over Time</CardTitle>
              <CardDescription>
                Daily workflow execution statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-muted-foreground">Loading trends...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={executionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="1"
                      stroke={COLORS.completed}
                      fill={COLORS.completed}
                      name="Completed"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stackId="1"
                      stroke={COLORS.failed}
                      fill={COLORS.failed}
                      name="Failed"
                    />
                    <Area
                      type="monotone"
                      dataKey="running"
                      stackId="1"
                      stroke={COLORS.running}
                      fill={COLORS.running}
                      name="Running"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Breakdown by execution status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-muted-foreground">Loading distribution...</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.status}: ${entry.count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {statusDistribution?.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Detailed statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusDistribution?.map((item, index) => (
                    <div key={item.status} className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <div className="flex-1">
                        <div className="font-medium capitalize">{item.status}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.count} executions ({item.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
            <CardHeader>
              <CardTitle>Step Performance Metrics</CardTitle>
              <CardDescription>
                Average execution duration by step (milliseconds)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {perfLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-muted-foreground">Loading performance...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stepName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgDuration" fill="#FF6900" name="Avg Duration (ms)" />
                    <Bar dataKey="maxDuration" fill="#7B2CBF" name="Max Duration (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completion" className="space-y-4">
          <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
            <CardHeader>
              <CardTitle>Step Completion Rates</CardTitle>
              <CardDescription>
                Success vs failure rates by workflow step
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-muted-foreground">Loading completion rates...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={completionRates}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stepName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="completionRate"
                      fill={COLORS.completed}
                      name="Completion Rate (%)"
                    />
                    <Bar
                      dataKey="failureRate"
                      fill={COLORS.failed}
                      name="Failure Rate (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
