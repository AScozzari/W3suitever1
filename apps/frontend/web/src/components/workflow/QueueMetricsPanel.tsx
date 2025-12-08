import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Loader2, Pause, Activity } from 'lucide-react';
import { useQueueMetrics } from '@/hooks/useAsyncWorkflows';

export function QueueMetricsPanel() {
  const { data: metrics, isLoading, error } = useQueueMetrics();

  if (error) {
    return (
      <Card className="windtre-glass-panel border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Activity className="h-5 w-5 text-windtre-orange" />
            Queue Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            ⚠️ Redis non disponibile. Le metriche della queue richiedono Redis.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="windtre-glass-panel border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Activity className="h-5 w-5 text-windtre-orange" />
          Queue Metrics
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto" />
        </CardTitle>
        <CardDescription>BullMQ workflow execution queue status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-windtre-orange" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Active Jobs */}
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg border border-white/40">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Loader2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600" data-testid="queue-active">
                  {metrics?.active || 0}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>

            {/* Waiting Jobs */}
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg border border-white/40">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600" data-testid="queue-waiting">
                  {metrics?.waiting || 0}
                </div>
                <div className="text-sm text-gray-600">Waiting</div>
              </div>
            </div>

            {/* Completed Jobs */}
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg border border-white/40">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600" data-testid="queue-completed">
                  {metrics?.completed || 0}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>

            {/* Failed Jobs */}
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg border border-white/40">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600" data-testid="queue-failed">
                  {metrics?.failed || 0}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>

            {/* Delayed Jobs */}
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg border border-white/40">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Pause className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600" data-testid="queue-delayed">
                  {metrics?.delayed || 0}
                </div>
                <div className="text-sm text-gray-600">Delayed</div>
              </div>
            </div>

            {/* Total Jobs */}
            <div className="flex items-start gap-3 p-4 bg-windtre-orange/10 rounded-lg border border-windtre-orange/40">
              <div className="p-2 bg-windtre-orange/20 rounded-lg">
                <Activity className="h-5 w-5 text-windtre-orange" />
              </div>
              <div>
                <div className="text-2xl font-bold text-windtre-orange" data-testid="queue-total">
                  {metrics?.total || 0}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
