import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HeatmapData {
  stageName: string;
  channel: string;
  interactionCount: number;
  conversions: number;
  conversionRate: number;
}

interface ChannelEffectivenessHeatmapProps {
  data: HeatmapData[];
  isLoading?: boolean;
}

export function ChannelEffectivenessHeatmap({ data, isLoading }: ChannelEffectivenessHeatmapProps) {
  // Extract unique stages and channels
  const stages = useMemo(() => {
    return Array.from(new Set(data.map(d => d.stageName))).sort();
  }, [data]);

  const channels = useMemo(() => {
    return Array.from(new Set(data.map(d => d.channel))).sort();
  }, [data]);

  // Create matrix for heatmap
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, HeatmapData | null>> = {};
    stages.forEach(stage => {
      m[stage] = {};
      channels.forEach(channel => {
        const cell = data.find(d => d.stageName === stage && d.channel === channel);
        m[stage][channel] = cell || null;
      });
    });
    return m;
  }, [data, stages, channels]);

  const getHeatColor = (conversionRate: number | null) => {
    if (conversionRate === null) return 'bg-gray-100';
    if (conversionRate >= 70) return 'bg-green-500';
    if (conversionRate >= 50) return 'bg-green-300';
    if (conversionRate >= 30) return 'bg-yellow-300';
    if (conversionRate >= 10) return 'bg-orange-300';
    return 'bg-red-300';
  };

  if (isLoading) {
    return (
      <Card className="windtre-glass-panel border-white/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/30 rounded w-1/3" />
          <div className="h-64 bg-white/30 rounded" />
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="windtre-glass-panel border-white/20 p-12 text-center">
        <p className="text-gray-500">Nessun dato disponibile per la channel effectiveness</p>
      </Card>
    );
  }

  return (
    <Card className="windtre-glass-panel border-white/20 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Channel Effectiveness per Stage</h3>
        <p className="text-sm text-gray-600">
          Tasso di conversione per canale in ogni stage (verde = alto, rosso = basso)
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header with channel names */}
          <div className="flex mb-2">
            <div className="w-40 flex-shrink-0" />
            {channels.map(channel => (
              <div
                key={channel}
                className="w-24 text-center text-xs font-semibold text-gray-700 px-2"
              >
                {channel}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {stages.map(stage => (
            <div key={stage} className="flex mb-1">
              <div className="w-40 flex-shrink-0 flex items-center">
                <span className="text-sm font-medium text-gray-700 truncate pr-2">
                  {stage}
                </span>
              </div>
              {channels.map(channel => {
                const cell = matrix[stage][channel];
                return (
                  <div
                    key={`${stage}-${channel}`}
                    className={cn(
                      'w-24 h-16 border border-white/30 flex flex-col items-center justify-center text-xs transition-all hover:scale-105 hover:z-10 hover:shadow-lg cursor-pointer',
                      getHeatColor(cell?.conversionRate ?? null)
                    )}
                    data-testid={`heatmap-cell-${stage}-${channel}`}
                    title={
                      cell
                        ? `${stage} - ${channel}\nInterazioni: ${cell.interactionCount}\nConversioni: ${cell.conversions}\nTasso: ${cell.conversionRate}%`
                        : 'Nessun dato'
                    }
                  >
                    {cell && (
                      <>
                        <span className="font-bold text-gray-900">
                          {cell.conversionRate}%
                        </span>
                        <span className="text-xs text-gray-700">
                          {cell.interactionCount} int.
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs">
        <span className="text-gray-600">Conversion Rate:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-300 border border-gray-300" />
          <span>&lt;10%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-300 border border-gray-300" />
          <span>10-30%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-300 border border-gray-300" />
          <span>30-50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-300 border border-gray-300" />
          <span>50-70%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 border border-gray-300" />
          <span>&gt;70%</span>
        </div>
      </div>
    </Card>
  );
}
