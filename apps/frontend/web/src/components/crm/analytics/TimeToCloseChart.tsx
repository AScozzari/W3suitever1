import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TimeToCloseData {
  distribution: Array<{
    bucket: string;
    count: number;
    wonCount: number;
    avgDays: number;
    medianDays: number;
  }>;
  benchmark: {
    avgDays: number;
    medianDays: number;
  };
}

interface TimeToCloseChartProps {
  data: TimeToCloseData | null;
  isLoading?: boolean;
}

export function TimeToCloseChart({ data, isLoading }: TimeToCloseChartProps) {
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

  if (!data || data.distribution.length === 0) {
    return (
      <Card className="windtre-glass-panel border-white/20 p-12 text-center">
        <p className="text-gray-500">Nessun dato disponibile per time-to-close</p>
      </Card>
    );
  }

  const chartData = data.distribution.map(item => ({
    name: `${item.bucket} giorni`,
    deals: item.count,
    vinti: item.wonCount,
  }));

  return (
    <Card className="windtre-glass-panel border-white/20 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Distribuzione Time-to-Close</h3>
        <p className="text-sm text-gray-600">
          Tempo medio: <span className="font-semibold">{data.benchmark.avgDays.toFixed(1)}</span> giorni
          {' | '}
          Tempo mediano: <span className="font-semibold">{data.benchmark.medianDays.toFixed(1)}</span> giorni
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          <ReferenceLine
            y={data.benchmark.avgDays}
            stroke="#ff6900"
            strokeDasharray="5 5"
            label={{ value: 'Media', position: 'right', fill: '#ff6900', fontSize: 12 }}
          />
          <Bar 
            dataKey="deals" 
            fill="#8b5cf6" 
            name="Totale Deals"
            radius={[8, 8, 0, 0]}
          />
          <Bar 
            dataKey="vinti" 
            fill="#10b981" 
            name="Vinti"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Statistical Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/10 rounded-lg">
        <div>
          <p className="text-xs text-gray-600">Media Giorni</p>
          <p className="text-lg font-bold text-purple-600">{data.benchmark.avgDays.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Mediana Giorni</p>
          <p className="text-lg font-bold text-blue-600">{data.benchmark.medianDays.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Totale Deals</p>
          <p className="text-lg font-bold text-gray-700">
            {data.distribution.reduce((sum, d) => sum + d.count, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Deals Vinti</p>
          <p className="text-lg font-bold text-green-600">
            {data.distribution.reduce((sum, d) => sum + d.wonCount, 0)}
          </p>
        </div>
      </div>
    </Card>
  );
}
