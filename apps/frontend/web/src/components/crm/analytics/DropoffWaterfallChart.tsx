import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface DropoffData {
  dropoffData: Array<{
    pipelineName: string;
    stageOrder: number;
    stageName: string;
    totalDeals: number;
    lostDeals: number;
    wonDeals: number;
    dropOffRate: number;
  }>;
  topDropoffs: Array<{
    pipelineName: string;
    stageOrder: number;
    stageName: string;
    totalDeals: number;
    lostDeals: number;
    wonDeals: number;
    dropOffRate: number;
  }>;
}

interface DropoffWaterfallChartProps {
  data: DropoffData | null;
  isLoading?: boolean;
}

export function DropoffWaterfallChart({ data, isLoading }: DropoffWaterfallChartProps) {
  if (isLoading) {
    return (
      <Card className="windtre-glass-panel border-white/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/30 rounded w-1/3" />
          <div className="h-80 bg-white/30 rounded" />
        </div>
      </Card>
    );
  }

  if (!data || data.dropoffData.length === 0) {
    return (
      <Card className="windtre-glass-panel border-white/20 p-12 text-center">
        <p className="text-gray-500">Nessun dato disponibile per drop-off analysis</p>
      </Card>
    );
  }

  const chartData = data.dropoffData.map(item => ({
    name: `${item.stageName}`,
    dropOffRate: item.dropOffRate,
    lostDeals: item.lostDeals,
    totalDeals: item.totalDeals,
    isTopDropoff: data.topDropoffs.some(
      top => top.stageName === item.stageName && top.pipelineName === item.pipelineName
    ),
  }));

  const getBarColor = (index: number) => {
    const item = chartData[index];
    if (item.isTopDropoff) return '#ef4444'; // red for top dropoffs
    if (item.dropOffRate > 30) return '#f97316'; // orange for high dropoff
    if (item.dropOffRate > 15) return '#eab308'; // yellow for moderate dropoff
    return '#8b5cf6'; // purple for normal
  };

  return (
    <Card className="windtre-glass-panel border-white/20 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Drop-off Waterfall Analysis</h3>
        <p className="text-sm text-gray-600">
          Analisi perdita deals per stage (evidenziati i top 3 bottleneck)
        </p>
      </div>

      {/* Top Dropoffs Alert */}
      {data.topDropoffs.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h4 className="font-semibold text-red-900">Top 3 Drop-off Points (Attenzione Richiesta)</h4>
          </div>
          <div className="space-y-2">
            {data.topDropoffs.map((dropoff, idx) => (
              <div key={`${dropoff.pipelineName}-${dropoff.stageName}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">#{idx + 1}</Badge>
                  <span className="font-medium">{dropoff.stageName}</span>
                  <span className="text-gray-600">({dropoff.pipelineName})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{dropoff.lostDeals}/{dropoff.totalDeals} persi</span>
                  <span className="font-bold text-red-600">{dropoff.dropOffRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            angle={-45}
            textAnchor="end"
            height={100}
            style={{ fontSize: '11px' }}
          />
          <YAxis 
            stroke="#6b7280"
            label={{ value: 'Drop-off Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: any, name: string, props: any) => {
              if (name === 'dropOffRate') {
                return [
                  <>
                    <div><strong>{value}%</strong> drop-off rate</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {props.payload.lostDeals} persi su {props.payload.totalDeals} totali
                    </div>
                  </>,
                  'Drop-off'
                ];
              }
              return [value, name];
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Bar 
            dataKey="dropOffRate" 
            name="Drop-off Rate (%)"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-white/10 rounded-lg">
        <div>
          <p className="text-xs text-gray-600">Media Drop-off</p>
          <p className="text-lg font-bold text-gray-700">
            {(data.dropoffData.reduce((sum, d) => sum + d.dropOffRate, 0) / data.dropoffData.length).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Totale Deals Persi</p>
          <p className="text-lg font-bold text-red-600">
            {data.dropoffData.reduce((sum, d) => sum + d.lostDeals, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Stages Analizzati</p>
          <p className="text-lg font-bold text-purple-600">
            {data.dropoffData.length}
          </p>
        </div>
      </div>
    </Card>
  );
}
