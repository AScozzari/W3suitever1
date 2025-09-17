// Labor Cost Analytics - Comprehensive cost analysis and budget tracking
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ComposedChart,
  RadialBarChart,
  RadialBar,
  Treemap,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  Activity,
  Percent,
  Euro,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface LaborCostAnalyticsProps {
  data?: {
    summary: {
      totalCost: number;
      budgetedCost: number;
      variance: number;
      variancePercentage: number;
      regularCost: number;
      overtimeCost: number;
      avgCostPerHour: number;
      avgCostPerEmployee: number;
      productivity: number;
    };
    monthlyTrend: Array<{
      month: string;
      actual: number;
      budget: number;
      variance: number;
    }>;
    departmentCosts: Array<{
      department: string;
      cost: number;
      budget: number;
      variance: number;
      headcount: number;
      avgCost: number;
    }>;
    costBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    overtimeTrend: Array<{
      week: string;
      regularHours: number;
      overtimeHours: number;
      regularCost: number;
      overtimeCost: number;
    }>;
    productivityMetrics: Array<{
      department: string;
      costPerUnit: number;
      unitsPerHour: number;
      efficiency: number;
    }>;
    forecast: Array<{
      month: string;
      projected: number;
      optimistic: number;
      pessimistic: number;
    }>;
  };
  period?: string;
  storeId?: string;
  department?: string;
  compact?: boolean;
}

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  warning: '#f59e0b',
  primary: '#f97316',
  secondary: '#8b5cf6',
  tertiary: '#3b82f6',
};

const COST_CATEGORY_COLORS: Record<string, string> = {
  'Salari Base': '#3b82f6',
  'Straordinari': '#ef4444',
  'Bonus': '#10b981',
  'Contributi': '#f59e0b',
  'Benefits': '#8b5cf6',
  'Formazione': '#06b6d4',
  'Altri Costi': '#6b7280',
};

export default function LaborCostAnalytics({ 
  data, 
  period = 'month', 
  storeId, 
  department,
  compact = false 
}: LaborCostAnalyticsProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Nessun dato disponibile per il periodo selezionato
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    summary,
    monthlyTrend = [],
    departmentCosts = [],
    costBreakdown = [],
    overtimeTrend = [],
    productivityMetrics = [],
    forecast = []
  } = data;

  const isOverBudget = summary.variance > 0;
  const varianceColor = isOverBudget ? COLORS.negative : COLORS.positive;
  const overtimePercentage = summary.totalCost > 0 
    ? ((summary.overtimeCost / summary.totalCost) * 100).toFixed(1)
    : '0';

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analisi Costi Personale</CardTitle>
            <Badge variant="outline" className="text-xs">
              {period}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Compact metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Costo Totale</p>
              <p className="text-2xl font-bold" data-testid="total-cost-compact">
                €{(summary.totalCost / 1000).toFixed(0)}k
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Variance</p>
              <p className={cn("text-2xl font-bold", isOverBudget ? "text-red-600" : "text-green-600")} data-testid="variance-compact">
                {isOverBudget ? '+' : ''}{summary.variancePercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Mini chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend.slice(-6)}>
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.2}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#6b7280"
                  strokeDasharray="3 3"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  formatter={(value: any) => [`€${value.toLocaleString('it-IT')}`, '']}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Euro className="h-5 w-5 text-gray-500" />
              <span className="text-xs text-gray-500">Totale</span>
            </div>
            <p className="text-2xl font-bold" data-testid="total-labor-cost">
              €{summary.totalCost.toLocaleString('it-IT')}
            </p>
            <p className="text-xs text-gray-500">Costo totale</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          isOverBudget ? "border-red-200 dark:border-red-900" : "border-green-200 dark:border-green-900"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5" style={{ color: varianceColor }} />
              <Badge variant={isOverBudget ? "destructive" : "success"} className="text-xs">
                {isOverBudget ? 'Over' : 'Under'}
              </Badge>
            </div>
            <p className={cn("text-2xl font-bold")} style={{ color: varianceColor }} data-testid="budget-variance">
              {isOverBudget ? '+' : '-'}€{Math.abs(summary.variance).toLocaleString('it-IT')}
            </p>
            <p className="text-xs text-gray-500">{summary.variancePercentage.toFixed(1)}% budget</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-orange-600">Straordinari</span>
            </div>
            <p className="text-2xl font-bold text-orange-600" data-testid="overtime-cost">
              €{summary.overtimeCost.toLocaleString('it-IT')}
            </p>
            <p className="text-xs text-gray-500">{overtimePercentage}% del totale</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-xs text-blue-600">€/Ora</span>
            </div>
            <p className="text-2xl font-bold text-blue-600" data-testid="cost-per-hour">
              €{summary.avgCostPerHour.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">Costo orario medio</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-xs text-purple-600">€/Dipendente</span>
            </div>
            <p className="text-2xl font-bold text-purple-600" data-testid="cost-per-employee">
              €{summary.avgCostPerEmployee.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">Media dipendente</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 dark:border-teal-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Percent className="h-5 w-5 text-teal-500" />
              <span className="text-xs text-teal-600">Produttività</span>
            </div>
            <p className="text-2xl font-bold text-teal-600" data-testid="productivity-score">
              {summary.productivity.toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500">Efficienza</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="departments">Dipartimenti</TabsTrigger>
          <TabsTrigger value="overtime">Straordinari</TabsTrigger>
          <TabsTrigger value="productivity">Produttività</TabsTrigger>
          <TabsTrigger value="forecast">Previsioni</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trend Costi vs Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '4px',
                      }}
                      formatter={(value: any) => `€${value.toLocaleString('it-IT')}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="actual"
                      fill="#f97316"
                      name="Costo Attuale"
                    />
                    <Line
                      type="monotone"
                      dataKey="budget"
                      stroke="#6b7280"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Budget"
                      dot={{ fill: '#6b7280' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="variance"
                      fill="#ef4444"
                      fillOpacity={0.3}
                      stroke="none"
                      name="Variance"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Categories Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuzione Costi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={(entry) => `${entry.percentage}%`}
                      >
                        {costBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COST_CATEGORY_COLORS[entry.category] || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `€${value.toLocaleString('it-IT')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {costBreakdown.map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COST_CATEGORY_COLORS[item.category] }}
                        />
                        <span className="text-sm">{item.category}</span>
                      </div>
                      <span className="text-sm font-medium">
                        €{(item.amount / 1000).toFixed(0)}k
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Treemap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proporzione Costi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={costBreakdown}
                      dataKey="amount"
                      stroke="#fff"
                      fill="#f97316"
                    >
                      <Tooltip formatter={(value: any) => `€${value.toLocaleString('it-IT')}`} />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Costi per Dipartimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentCosts.map((dept) => {
                  const isOverBudget = dept.variance > 0;
                  const variancePercentage = dept.budget > 0 
                    ? ((Math.abs(dept.variance) / dept.budget) * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <div
                      key={dept.department}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{dept.department}</p>
                          <p className="text-sm text-gray-500">
                            {dept.headcount} dipendenti • €{dept.avgCost.toFixed(0)}/dipendente
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            €{dept.cost.toLocaleString('it-IT')}
                          </p>
                          <Badge 
                            variant={isOverBudget ? "destructive" : "success"}
                            className="text-xs"
                          >
                            {isOverBudget ? '+' : '-'}{variancePercentage}%
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>0</span>
                          <span>Budget: €{dept.budget.toLocaleString('it-IT')}</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              isOverBudget ? "bg-red-500" : "bg-green-500"
                            )}
                            style={{ 
                              width: `${Math.min((dept.cost / dept.budget) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overtime Tab */}
        <TabsContent value="overtime">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analisi Straordinari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={overtimeTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis yAxisId="hours" orientation="left" />
                    <YAxis yAxisId="cost" orientation="right" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '4px',
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="hours"
                      dataKey="regularHours"
                      stackId="a"
                      fill="#10b981"
                      name="Ore Regolari"
                    />
                    <Bar
                      yAxisId="hours"
                      dataKey="overtimeHours"
                      stackId="a"
                      fill="#ef4444"
                      name="Ore Straordinario"
                    />
                    <Line
                      yAxisId="cost"
                      type="monotone"
                      dataKey="overtimeCost"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Costo Straordinari"
                      dot={{ fill: '#f59e0b' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Overtime summary */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <Card className="border-red-200 dark:border-red-900">
                  <CardContent className="p-3">
                    <p className="text-sm text-gray-600">Costo Totale Straordinari</p>
                    <p className="text-xl font-bold text-red-600">
                      €{summary.overtimeCost.toLocaleString('it-IT')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 dark:border-orange-900">
                  <CardContent className="p-3">
                    <p className="text-sm text-gray-600">% sul Totale</p>
                    <p className="text-xl font-bold text-orange-600">
                      {overtimePercentage}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-sm text-gray-600">Costo/Ora Extra</p>
                    <p className="text-xl font-bold">
                      €{(summary.avgCostPerHour * 1.5).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metriche Produttività</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" data={productivityMetrics}>
                    <RadialBar
                      minAngle={15}
                      background
                      clockWise
                      dataKey="efficiency"
                      fill="#f97316"
                    />
                    <Legend />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              {/* Productivity details */}
              <div className="space-y-3 mt-6">
                {productivityMetrics.map((metric) => (
                  <div
                    key={metric.department}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{metric.department}</p>
                      <p className="text-sm text-gray-500">
                        €{metric.costPerUnit.toFixed(2)}/unità • {metric.unitsPerHour.toFixed(1)} unità/ora
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {metric.efficiency.toFixed(0)}%
                      </p>
                      <Badge 
                        variant={metric.efficiency >= 80 ? "success" : metric.efficiency >= 60 ? "warning" : "destructive"}
                        className="text-xs"
                      >
                        {metric.efficiency >= 80 ? 'Ottima' : metric.efficiency >= 60 ? 'Buona' : 'Bassa'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Previsioni Costi</CardTitle>
              <p className="text-sm text-gray-500">Proiezioni prossimi 6 mesi</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '4px',
                      }}
                      formatter={(value: any) => `€${value.toLocaleString('it-IT')}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="pessimistic"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.2}
                      name="Pessimistico"
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stackId="2"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.4}
                      name="Probabile"
                    />
                    <Area
                      type="monotone"
                      dataKey="optimistic"
                      stackId="3"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                      name="Ottimistico"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast summary */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <Card className="border-green-200 dark:border-green-900">
                  <CardContent className="p-3">
                    <p className="text-sm text-gray-600">Scenario Ottimistico</p>
                    <p className="text-xl font-bold text-green-600">
                      -5% rispetto al budget
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 dark:border-orange-900">
                  <CardContent className="p-3">
                    <p className="text-sm text-gray-600">Scenario Probabile</p>
                    <p className="text-xl font-bold text-orange-600">
                      +2% rispetto al budget
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-900">
                  <CardContent className="p-3">
                    <p className="text-sm text-gray-600">Scenario Pessimistico</p>
                    <p className="text-xl font-bold text-red-600">
                      +8% rispetto al budget
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}