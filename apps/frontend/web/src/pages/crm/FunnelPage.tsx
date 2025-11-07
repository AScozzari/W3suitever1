import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, Users, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { Skeleton } from '@/components/ui/skeleton';

interface Pipeline {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  stagesConfig: Array<{ order: number; name: string; category: string; color: string }>;
  activeDeals: number;
  totalValue: number;
  conversionRate: number;
}

interface Funnel {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  isActive: boolean;
  aiOrchestrationEnabled: boolean;
  totalLeads: number;
  conversionRate: number;
  avgJourneyDurationDays: number | null;
  pipelines: Pipeline[];
}

export default function FunnelPage() {
  const tenantId = useRequiredTenantId();
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);

  const { data: funnels, isLoading } = useQuery<Funnel[]>({
    queryKey: ['/api/crm/funnels'],
    enabled: !!tenantId
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Journey Funnels</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Orchestrate multi-pipeline customer journeys with AI-powered insights
            </p>
          </div>
          <Button data-testid="button-create-funnel" className="bg-[#FF6900] hover:bg-[#E65F00]">
            <Plus className="w-4 h-4 mr-2" />
            Create Funnel
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Funnels</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1" data-testid="text-active-funnels">
                  {funnels?.filter(f => f.isActive).length || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1" data-testid="text-total-leads">
                  {funnels?.reduce((sum, f) => sum + f.totalLeads, 0) || 0}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Conversion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1" data-testid="text-avg-conversion">
                  {funnels && funnels.length > 0
                    ? Math.round(funnels.reduce((sum, f) => sum + f.conversionRate, 0) / funnels.length)
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI Orchestrated</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1" data-testid="text-ai-funnels">
                  {funnels?.filter(f => f.aiOrchestrationEnabled).length || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {!funnels || funnels.length === 0 ? (
            <Card className="p-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <div className="text-center">
                <Target className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No funnels yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create your first customer journey funnel to orchestrate multi-stage conversion paths
                </p>
                <Button data-testid="button-create-first-funnel" className="bg-[#FF6900] hover:bg-[#E65F00]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Funnel
                </Button>
              </div>
            </Card>
          ) : (
            funnels.map(funnel => (
              <Card
                key={funnel.id}
                className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
                data-testid={`card-funnel-${funnel.id}`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${funnel.color}20` }}
                      >
                        <Target className="w-6 h-6" style={{ color: funnel.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid={`text-funnel-name-${funnel.id}`}>
                            {funnel.name}
                          </h3>
                          {funnel.aiOrchestrationEnabled && (
                            <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Enabled
                            </Badge>
                          )}
                          {!funnel.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {funnel.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{funnel.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Leads</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{funnel.totalLeads}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Conversion</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{funnel.conversionRate}%</p>
                      </div>
                      {funnel.avgJourneyDurationDays && (
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-gray-400">Avg Duration</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{funnel.avgJourneyDurationDays}d</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Pipeline Journey</p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {funnel.pipelines && funnel.pipelines.length > 0 ? (
                        funnel.pipelines.map((pipeline, idx) => (
                          <div key={pipeline.id} className="flex items-center gap-2 flex-shrink-0">
                            <Card
                              className="p-3 min-w-[200px] bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                              data-testid={`card-pipeline-${pipeline.id}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{pipeline.name}</p>
                                <Badge variant="outline" className="text-xs">{pipeline.domain}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                <span>{pipeline.stagesConfig.length} stages</span>
                                <span>•</span>
                                <span>{pipeline.activeDeals} deals</span>
                              </div>
                            </Card>
                            {idx < funnel.pipelines.length - 1 && (
                              <div className="flex items-center">
                                <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-700" />
                                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-700 rounded-full ml-[-4px]" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-500 italic">No pipelines assigned yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
