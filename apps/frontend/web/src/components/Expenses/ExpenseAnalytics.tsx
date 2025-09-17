// Expense Analytics Component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExpenseStats } from '@/hooks/useExpenseManagement';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  Receipt,
  PieChart as PieChartIcon
} from 'lucide-react';

interface ExpenseAnalyticsProps {
  period?: string;
  departmentId?: string;
}

export default function ExpenseAnalytics({ period = 'month', departmentId }: ExpenseAnalyticsProps) {
  const { stats, analytics } = useExpenseStats();
  const isLoading = false;
  const error = null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Errore nel caricamento delle analisi spese. Riprova più tardi.
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>Nessun dato disponibile per il periodo selezionato.</AlertDescription>
      </Alert>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const categoryData = analytics?.topCategories?.map((cat: any, index: number) => ({
    name: cat.category,
    amount: cat.amount,
    percentage: cat.count,
    color: COLORS[index % COLORS.length]
  })) || [];

  const trendsData = analytics?.monthlyTrend?.map((item: any) => ({
    month: item.month,
    amount: item.amount,
    approved: item.amount * 0.9
  })) || [];

  return (
    <div className="space-y-6" data-testid="expense-analytics">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Spese</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              € {(stats.totalPending + stats.totalApproved + stats.totalReimbursed).toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalThisMonth > 0 ? 'Questo mese' : 'Nessuna'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media per Report</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              € {(stats.totalThisMonth / Math.max(1, stats.averageProcessingTime)).toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.averageProcessingTime || 0} giorni medi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            {stats.totalThisMonth > stats.totalPending ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.totalThisMonth > stats.totalPending ? 'text-green-600' : 'text-red-600'
            )}>
              {stats.totalThisMonth > stats.totalPending ? '+' : '-'}{Math.abs((stats.totalThisMonth - stats.totalPending) / Math.max(1, stats.totalPending) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Rispetto al periodo precedente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Categoria</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {analytics?.topCategories?.[0]?.category || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              € {analytics?.topCategories?.[0]?.amount?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Spese per Categoria</CardTitle>
          <CardDescription>
            Distribuzione delle spese per categoria nel periodo selezionato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              {categoryData.map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">€ {cat.amount.toFixed(2)}</span>
                    <Badge variant="secondary">{cat.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Mensile</CardTitle>
          <CardDescription>
            Andamento delle spese negli ultimi mesi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                name="Spese Totali"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="approved" 
                stroke="#10b981" 
                name="Approvate"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>


    </div>
  );
}