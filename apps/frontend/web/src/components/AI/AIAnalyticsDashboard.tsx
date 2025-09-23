import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Clock, Activity, Zap, Brain,
  BarChart3, Eye, Calendar, Users, RefreshCw
} from 'lucide-react';

interface AIUsageLog {
  id: string;
  tenantId: string;
  userId: string;
  featureType: string;
  modelUsed: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  costUsd: number;
  responseTimeMs: number;
  success: boolean;
  requestTimestamp: string;
}

interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
}

interface TimeSeriesData {
  timestamp: string;
  requests: number;
  cost: number;
  tokens: number;
  responseTime: number;
}

interface FeatureBreakdown {
  name: string;
  value: number;
  color: string;
  icon: string;
}

export default function AIAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch usage statistics
  const { data: stats, isLoading: statsLoading } = useQuery<{success: boolean, data: AIUsageStats}>({
    queryKey: ['/api/ai/usage/stats'],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds if auto-refresh enabled
  });

  // Fetch usage logs  
  const { data: usageLogs, isLoading: logsLoading } = useQuery<{success: boolean, data: AIUsageLog[]}>({
    queryKey: ['/api/ai/usage/logs'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Process data for time series charts
  const generateTimeSeriesData = (): TimeSeriesData[] => {
    if (!usageLogs?.data) return [];

    const now = new Date();
    const hoursBack = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const intervalMinutes = timeRange === '1h' ? 5 : timeRange === '6h' ? 30 : timeRange === '24h' ? 60 : timeRange === '7d' ? 240 : 1440;

    const intervals = Array.from({ length: Math.floor((hoursBack * 60) / intervalMinutes) }, (_, i) => {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
      return {
        timestamp: timestamp.toISOString(),
        requests: 0,
        cost: 0,
        tokens: 0,
        responseTime: 0,
        responseTimeCount: 0
      };
    }).reverse();

    // Aggregate logs into intervals
    usageLogs.data.forEach(log => {
      const logTime = new Date(log.requestTimestamp);
      const intervalIndex = Math.floor((now.getTime() - logTime.getTime()) / (intervalMinutes * 60 * 1000));
      
      if (intervalIndex >= 0 && intervalIndex < intervals.length) {
        const interval = intervals[intervals.length - 1 - intervalIndex];
        interval.requests += 1;
        interval.cost += (log.costUsd || 0) / 100; // Convert cents to dollars
        interval.tokens += log.tokensTotal || 0;
        interval.responseTime += log.responseTimeMs || 0;
        interval.responseTimeCount += 1;
      }
    });

    // Calculate average response time
    return intervals.map(interval => ({
      ...interval,
      responseTime: interval.responseTimeCount > 0 ? interval.responseTime / interval.responseTimeCount : 0,
      timestamp: new Date(interval.timestamp).toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit',
        day: timeRange === '7d' || timeRange === '30d' ? '2-digit' : undefined,
        month: timeRange === '30d' ? '2-digit' : undefined
      })
    }));
  };

  // Process data for feature breakdown
  const generateFeatureBreakdown = (): FeatureBreakdown[] => {
    if (!usageLogs?.data) return [];

    const featureMap: Record<string, { requests: number, cost: number, color: string, icon: string }> = {
      'chat': { requests: 0, cost: 0, color: '#3B82F6', icon: '💬' },
      'embedding': { requests: 0, cost: 0, color: '#8B5CF6', icon: '🔍' },
      'transcription': { requests: 0, cost: 0, color: '#10B981', icon: '🎙️' },
      'vision_analysis': { requests: 0, cost: 0, color: '#F59E0B', icon: '👁️' },
      'url_scraping': { requests: 0, cost: 0, color: '#06B6D4', icon: '🌐' },
      'document_analysis': { requests: 0, cost: 0, color: '#EF4444', icon: '📄' },
      'web_search': { requests: 0, cost: 0, color: '#84CC16', icon: '🔎' }
    };

    usageLogs.data.forEach(log => {
      const feature = featureMap[log.featureType];
      if (feature) {
        feature.requests += 1;
        feature.cost += (log.costUsd || 0) / 100; // Convert cents to dollars
      }
    });

    return Object.entries(featureMap)
      .filter(([_, data]) => data.requests > 0)
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
        value: data.requests,
        cost: data.cost,
        color: data.color,
        icon: data.icon
      }));
  };

  const timeSeriesData = generateTimeSeriesData();
  const featureBreakdown = generateFeatureBreakdown();

  // Real-time KPI calculations
  const totalRequests = usageLogs?.data?.length || 0;
  const totalCostDollars = (usageLogs?.data?.reduce((sum, log) => sum + (log.costUsd || 0), 0) || 0) / 100;
  const totalTokens = usageLogs?.data?.reduce((sum, log) => sum + (log.tokensTotal || 0), 0) || 0;
  const avgResponseTime = usageLogs?.data?.length > 0 
    ? (usageLogs.data.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / usageLogs.data.length)
    : 0;

  // Success rate calculation
  const successRate = usageLogs?.data?.length > 0 
    ? (usageLogs.data.filter(log => log.success).length / usageLogs.data.length * 100)
    : 100;

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics AI Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitoraggio real-time delle performance AI</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 border-green-300 text-green-800' 
                  : 'bg-gray-100 border-gray-300 text-gray-700'
              }`}
              data-testid="button-auto-refresh"
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Time Range Selector */}
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
            data-testid="select-time-range"
          >
            <option value="1h">Ultima ora</option>
            <option value="6h">Ultime 6 ore</option>
            <option value="24h">Ultime 24 ore</option>
            <option value="7d">Ultimi 7 giorni</option>
            <option value="30d">Ultimi 30 giorni</option>
          </select>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Richieste Totali</p>
              <p className="text-2xl font-bold text-gray-900" data-testid="text-total-requests">{totalRequests.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT')}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Costo Totale</p>
              <p className="text-2xl font-bold text-green-600" data-testid="text-total-cost">${totalCostDollars.toFixed(4)}</p>
              <p className="text-xs text-gray-500 mt-1">Real-time</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Token Processati</p>
              <p className="text-2xl font-bold text-purple-600" data-testid="text-total-tokens">{totalTokens.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Cumulative</p>
            </div>
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Risposta</p>
              <p className="text-2xl font-bold text-orange-600" data-testid="text-avg-response-time">{avgResponseTime.toFixed(0)}ms</p>
              <p className="text-xs text-gray-500 mt-1">Media</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-emerald-600" data-testid="text-success-rate">{successRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">Affidabilità</p>
            </div>
            <Zap className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-[#FF6900]" />
            Richieste nel Tempo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => `Orario: ${value}`}
                formatter={(value: number) => [value, 'Richieste']}
              />
              <Area 
                type="monotone" 
                dataKey="requests" 
                stroke="#FF6900" 
                fill="#FF6900" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Costs Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Costi nel Tempo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => `Orario: ${value}`}
                formatter={(value: number) => [`$${value.toFixed(4)}`, 'Costo']}
              />
              <Line 
                type="monotone" 
                dataKey="cost" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-[#FF6900]" />
            Distribuzione per Funzionalità
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={featureBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {featureBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value, 'Richieste']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-600" />
            Tempi di Risposta
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => `Orario: ${value}`}
                formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Tempo Risposta']}
              />
              <Bar dataKey="responseTime" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2 text-[#FF6900]" />
          Dettaglio Funzionalità AI
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureBreakdown.map((feature, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="font-medium text-gray-900">{feature.name}</span>
                </div>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: feature.color }}></div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Richieste:</span>
                  <span className="font-medium" data-testid={`text-feature-requests-${feature.name.toLowerCase()}`}>{feature.value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo:</span>
                  <span className="font-medium text-green-600" data-testid={`text-feature-cost-${feature.name.toLowerCase()}`}>${feature.cost?.toFixed(4) || '0.0000'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {(statsLoading || logsLoading) && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#FF6900]" />
            <span className="text-sm text-gray-600">Aggiornamento dati...</span>
          </div>
        </div>
      )}
    </div>
  );
}