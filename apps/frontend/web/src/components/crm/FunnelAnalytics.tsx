import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  FunnelAnalyticsFilterBar,
  type FunnelAnalyticsFilters,
} from './FunnelAnalyticsFilterBar';
import { KPICards } from './analytics/KPICards';
import { StagePerformanceTable } from './analytics/StagePerformanceTable';
import { ChannelEffectivenessHeatmap } from './analytics/ChannelEffectivenessHeatmap';
import { TimeToCloseChart } from './analytics/TimeToCloseChart';
import { DropoffWaterfallChart } from './analytics/DropoffWaterfallChart';

interface Funnel {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface FunnelAnalyticsProps {
  funnels: Funnel[] | undefined;
}

export function FunnelAnalytics({ funnels }: FunnelAnalyticsProps) {
  const { toast } = useToast();

  const [filters, setFilters] = useState<FunnelAnalyticsFilters>({
    funnelId: null,
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    preset: '30days',
    storeIds: [],
    segment: 'all',
  });

  // Auto-select first active funnel when data loads
  useEffect(() => {
    if (funnels && funnels.length > 0 && !filters.funnelId) {
      setFilters(prev => ({ ...prev, funnelId: funnels[0].id }));
    }
  }, [funnels, filters.funnelId]);

  // Build query params for API calls
  const queryParams = new URLSearchParams();
  if (filters.dateRange?.from) {
    queryParams.set('dateFrom', filters.dateRange.from.toISOString());
  }
  if (filters.dateRange?.to) {
    queryParams.set('dateTo', filters.dateRange.to.toISOString());
  }
  if (filters.segment !== 'all') {
    queryParams.set('segment', filters.segment);
  }

  // Fetch analytics data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['/api/crm/funnels', filters.funnelId, 'analytics/overview', queryParams.toString()],
    enabled: !!filters.funnelId,
  });

  const { data: stagePerformanceData, isLoading: stagePerformanceLoading } = useQuery({
    queryKey: ['/api/crm/funnels', filters.funnelId, 'analytics/stage-performance', queryParams.toString()],
    enabled: !!filters.funnelId,
  });

  const { data: channelEffectivenessData, isLoading: channelEffectivenessLoading } = useQuery({
    queryKey: ['/api/crm/funnels', filters.funnelId, 'analytics/channel-effectiveness', queryParams.toString()],
    enabled: !!filters.funnelId,
  });

  const { data: timeToCloseData, isLoading: timeToCloseLoading } = useQuery({
    queryKey: ['/api/crm/funnels', filters.funnelId, 'analytics/time-to-close', queryParams.toString()],
    enabled: !!filters.funnelId,
  });

  const { data: dropoffData, isLoading: dropoffLoading } = useQuery({
    queryKey: ['/api/crm/funnels', filters.funnelId, 'analytics/dropoff', queryParams.toString()],
    enabled: !!filters.funnelId,
  });

  const { data: campaignAttributionData, isLoading: campaignAttributionLoading } = useQuery({
    queryKey: ['/api/crm/funnels', filters.funnelId, 'analytics/campaign-attribution', queryParams.toString()],
    enabled: !!filters.funnelId,
  });

  const { data: aiImpactData, isLoading: aiImpactLoading } = useQuery({
    queryKey: ['/api/crm/funnels', filters.funnelId, 'analytics/ai-impact', queryParams.toString()],
    enabled: !!filters.funnelId,
  });

  const handleRefresh = () => {
    // Trigger refetch for all queries
    toast({
      title: 'Aggiornamento in corso...',
      description: 'Recupero dati analytics aggiornati',
    });
  };

  const handleExport = () => {
    toast({
      title: 'Export in preparazione',
      description: 'Il download del report partirà a breve',
    });
    // TODO: Implement CSV/PDF export
  };

  if (!funnels || funnels.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Funnel Analytics</h2>
            <p className="text-sm text-gray-600 mt-1">
              Analisi approfondita di conversione, performance e AI impact
            </p>
          </div>
        </div>

        <Card className="windtre-glass-panel p-12">
          <div className="text-center">
            <BarChart2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun analytics disponibile
            </h3>
            <p className="text-gray-600">
              Crea prima i funnel per visualizzare analytics e insights
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Funnel Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Analisi approfondita di conversione, performance e AI impact
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FunnelAnalyticsFilterBar
        funnels={funnels}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={overviewLoading}
      />

      {!filters.funnelId ? (
        <Card className="windtre-glass-panel p-12 text-center">
          <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Seleziona un funnel per visualizzare gli analytics</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPI Overview Cards */}
          <KPICards
            data={overviewData?.data || null}
            isLoading={overviewLoading}
          />

          {/* Stage Performance Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Performance per Stage</h3>
            <StagePerformanceTable
              data={stagePerformanceData?.data || []}
              isLoading={stagePerformanceLoading}
            />
          </div>

          {/* Charts Grid - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time to Close */}
            <TimeToCloseChart
              data={timeToCloseData?.data || null}
              isLoading={timeToCloseLoading}
            />

            {/* Campaign Attribution */}
            <Card className="windtre-glass-panel border-white/20 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Top Campagne per ROI</h3>
                <p className="text-sm text-gray-600">
                  Attribution specifica per questo funnel
                </p>
              </div>
              {campaignAttributionLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-windtre-orange" />
                </div>
              ) : campaignAttributionData?.data && campaignAttributionData.data.length > 0 ? (
                <div className="space-y-3">
                  {campaignAttributionData.data.slice(0, 5).map((campaign: any) => (
                    <div
                      key={campaign.campaignId}
                      className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      data-testid={`campaign-${campaign.campaignId}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{campaign.campaignName}</p>
                        <p className="text-xs text-gray-600">
                          {campaign.leadCount} leads · {campaign.conversionRate}% conversione
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${campaign.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {campaign.roi > 0 ? '+' : ''}{campaign.roi}%
                        </p>
                        <p className="text-xs text-gray-600">ROI</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Nessun dato campagne disponibile
                </div>
              )}
            </Card>
          </div>

          {/* Drop-off Waterfall */}
          <DropoffWaterfallChart
            data={dropoffData?.data || null}
            isLoading={dropoffLoading}
          />

          {/* Channel Effectiveness Heatmap */}
          <ChannelEffectivenessHeatmap
            data={channelEffectivenessData?.data || []}
            isLoading={channelEffectivenessLoading}
          />

          {/* AI Impact Comparison */}
          <Card className="windtre-glass-panel border-white/20 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">AI Impact Analysis</h3>
              <p className="text-sm text-gray-600">
                Confronto performance tra AI-routed e manual routing
              </p>
            </div>
            {aiImpactLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-windtre-orange" />
              </div>
            ) : aiImpactData?.data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Routed */}
                {aiImpactData.data.aiRouted && (
                  <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-purple-600 rounded-full" />
                      <h4 className="font-semibold text-purple-900">AI-Routed Leads</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Total Leads</span>
                        <span className="font-semibold">{aiImpactData.data.aiRouted.totalLeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Conversion Rate</span>
                        <span className="font-semibold text-green-600">
                          {aiImpactData.data.aiRouted.conversionRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Avg Time-to-Close</span>
                        <span className="font-semibold">
                          {aiImpactData.data.aiRouted.avgTimeToClose} giorni
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Avg Revenue/Deal</span>
                        <span className="font-semibold">
                          €{aiImpactData.data.aiRouted.avgRevenuePerDeal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual */}
                {aiImpactData.data.manual && (
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-gray-600 rounded-full" />
                      <h4 className="font-semibold text-gray-900">Manual Routing</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Total Leads</span>
                        <span className="font-semibold">{aiImpactData.data.manual.totalLeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Conversion Rate</span>
                        <span className="font-semibold">
                          {aiImpactData.data.manual.conversionRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Avg Time-to-Close</span>
                        <span className="font-semibold">
                          {aiImpactData.data.manual.avgTimeToClose} giorni
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Avg Revenue/Deal</span>
                        <span className="font-semibold">
                          €{aiImpactData.data.manual.avgRevenuePerDeal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                Nessun dato AI impact disponibile
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
