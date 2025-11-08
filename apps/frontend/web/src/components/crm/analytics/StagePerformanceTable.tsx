import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StagePerformanceData {
  pipelineId: string;
  pipelineName: string;
  stageOrder: number;
  stageName: string;
  stageCategory: string;
  dealCount: number;
  avgDays: number;
  conversionRate: number;
  dropOffRate: number;
  revenue: number;
  trend: number;
}

interface StagePerformanceTableProps {
  data: StagePerformanceData[];
  isLoading?: boolean;
}

export function StagePerformanceTable({ data, isLoading }: StagePerformanceTableProps) {
  // Identify bottlenecks (high drop-off or long duration)
  const avgDropOffRate = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, stage) => sum + stage.dropOffRate, 0) / data.length;
  }, [data]);

  const avgDays = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, stage) => sum + stage.avgDays, 0) / data.length;
  }, [data]);

  const isBottleneck = (stage: StagePerformanceData) => {
    return stage.dropOffRate > avgDropOffRate * 1.5 || stage.avgDays > avgDays * 2;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="windtre-glass-panel border border-white/20 rounded-lg p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-white/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="windtre-glass-panel border border-white/20 rounded-lg p-12 text-center">
        <p className="text-gray-500">Nessun dato disponibile per il periodo selezionato</p>
      </div>
    );
  }

  // Group by pipeline for better organization
  const groupedData = useMemo(() => {
    const groups: Record<string, StagePerformanceData[]> = {};
    data.forEach(stage => {
      if (!groups[stage.pipelineName]) {
        groups[stage.pipelineName] = [];
      }
      groups[stage.pipelineName].push(stage);
    });
    return groups;
  }, [data]);

  return (
    <div className="windtre-glass-panel border border-white/20 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/20 bg-white/10">
              <TableHead className="font-semibold">Pipeline</TableHead>
              <TableHead className="font-semibold">Stage</TableHead>
              <TableHead className="font-semibold text-right">Deals</TableHead>
              <TableHead className="font-semibold text-right">Media Giorni</TableHead>
              <TableHead className="font-semibold text-right">Conv. Rate</TableHead>
              <TableHead className="font-semibold text-right">Drop-off</TableHead>
              <TableHead className="font-semibold text-right">Revenue</TableHead>
              <TableHead className="font-semibold text-center">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedData).map(([pipelineName, stages]) => (
              stages.map((stage, index) => {
                const isCritical = isBottleneck(stage);
                return (
                  <TableRow
                    key={`${stage.pipelineId}-${stage.stageOrder}`}
                    className={cn(
                      'border-b border-white/10 transition-colors hover:bg-white/5',
                      isCritical && 'bg-red-50/30'
                    )}
                    data-testid={`row-stage-${stage.stageOrder}`}
                  >
                    <TableCell className="font-medium">
                      {index === 0 ? (
                        <div className="flex items-center gap-2">
                          <span>{pipelineName}</span>
                          <Badge variant="outline" className="text-xs">
                            {stages.length} stages
                          </Badge>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">#{stage.stageOrder}</span>
                        <span>{stage.stageName}</span>
                        {isCritical && (
                          <Badge variant="destructive" className="text-xs">
                            Bottleneck
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium" data-testid={`text-deal-count-${stage.stageOrder}`}>
                      {stage.dealCount}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        stage.avgDays > avgDays * 2 && 'text-red-600 font-semibold'
                      )}
                      data-testid={`text-avg-days-${stage.stageOrder}`}
                    >
                      {stage.avgDays.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={cn(
                            'font-medium',
                            stage.conversionRate >= 70 && 'text-green-600',
                            stage.conversionRate < 40 && 'text-orange-600'
                          )}
                        >
                          {stage.conversionRate}%
                        </span>
                        {stage.conversionRate >= 70 && (
                          <ArrowUp className="h-3 w-3 text-green-600" />
                        )}
                        {stage.conversionRate < 40 && (
                          <ArrowDown className="h-3 w-3 text-orange-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        stage.dropOffRate > avgDropOffRate * 1.5 && 'text-red-600'
                      )}
                      data-testid={`text-dropoff-${stage.stageOrder}`}
                    >
                      {stage.dropOffRate}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(stage.revenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrendIcon(stage.trend)}
                    </TableCell>
                  </TableRow>
                );
              })
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Footer */}
      <div className="border-t border-white/20 bg-white/5 p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Stages:</span>
            <span className="ml-2 font-semibold">{data.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Drop-off:</span>
            <span className="ml-2 font-semibold">{avgDropOffRate.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Duration:</span>
            <span className="ml-2 font-semibold">{avgDays.toFixed(1)} giorni</span>
          </div>
          <div>
            <span className="text-gray-600">Bottlenecks:</span>
            <span className="ml-2 font-semibold text-red-600">
              {data.filter(isBottleneck).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
