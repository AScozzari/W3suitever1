import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Users,
  Trophy
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
  };
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
  completionTrend: Record<string, number>;
  topAssignees: Array<{
    userId: string;
    userName: string;
    taskCount: number;
  }>;
}

const STATUS_COLORS = {
  todo: '#9CA3AF',
  in_progress: '#3B82F6',
  review: '#A855F7',
  done: '#10B981',
  archived: '#6B7280',
};

const PRIORITY_COLORS = {
  low: '#9CA3AF',
  medium: '#F59E0B',
  high: '#EF4444',
};

export function TaskAnalytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/tasks/analytics'],
  });

  if (isLoading) {
    return <LoadingState variant="spinner" message="Caricamento analytics..." />;
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Nessun dato disponibile
      </div>
    );
  }

  const statusData = Object.entries(analytics.statusDistribution).map(([key, value]) => ({
    name: key === 'todo' ? 'Da fare' : key === 'in_progress' ? 'In corso' : key === 'review' ? 'In revisione' : key === 'done' ? 'Completato' : 'Archiviato',
    value,
    color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] || '#9CA3AF',
  }));

  const trendData = Object.entries(analytics.completionTrend)
    .slice(-14)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
      completed: count,
    }));

  const departmentData = Object.entries(analytics.departmentDistribution)
    .map(([dept, count]) => ({
      department: dept.toUpperCase(),
      tasks: count,
    }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 7);

  const completionRate = analytics.overview.totalTasks > 0
    ? Math.round((analytics.overview.completedTasks / analytics.overview.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Task Analytics</h2>
        <p className="text-sm text-gray-600">
          Dashboard con metriche e statistiche dettagliate
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg hover:shadow-xl transition-shadow" data-testid="metric-total">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Totale Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalTasks}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completionRate}% completato
            </Badge>
          </div>
        </Card>

        <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg hover:shadow-xl transition-shadow" data-testid="metric-completed">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completati</p>
              <p className="text-3xl font-bold text-green-600">{analytics.overview.completedTasks}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg hover:shadow-xl transition-shadow" data-testid="metric-progress">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">In Corso</p>
              <p className="text-3xl font-bold text-blue-600">{analytics.overview.inProgressTasks}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg hover:shadow-xl transition-shadow" data-testid="metric-overdue">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Scaduti</p>
              <p className="text-3xl font-bold text-red-600">{analytics.overview.overdueTasks}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-md">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Distribuzione per Stato
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Assegnatari
          </h3>
          <div className="space-y-3">
            {analytics.topAssignees.slice(0, 5).map((assignee, index) => (
              <div
                key={assignee.userId}
                className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                data-testid={`assignee-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                    #{index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{assignee.userName}</span>
                </div>
                <Badge variant="secondary">
                  {assignee.taskCount} task{assignee.taskCount !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Trend Completamento (Ultimi 14 giorni)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#10B981"
              strokeWidth={2}
              name="Completati"
              dot={{ fill: '#10B981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {departmentData.length > 0 && (
        <Card className="p-6 bg-white/95 backdrop-blur-xl border-2 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            Distribuzione per Dipartimento
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tasks" fill="#3B82F6" name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
