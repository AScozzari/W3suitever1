import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  KanbanBoard, 
  type KanbanTask, 
  type Column 
} from '@/components/tasks/KanbanBoard';
import {
  Target,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Deal {
  id: string;
  pipelineId: string;
  pipelineName: string;
  leadId: string | null;
  personId: string;
  personName: string;
  title: string;
  description: string | null;
  value: number;
  probability: number;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  stage: string;
  stageOrder: number;
  status: 'open' | 'won' | 'lost';
  lostReason: string | null;
  priority: 'low' | 'medium' | 'high';
  nextActionAt: string | null;
  createdAt: string;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
}

// Define deal-specific kanban columns
const DEAL_COLUMNS: Column[] = [
  {
    id: 'qualification',
    title: 'Qualifica',
    status: 'qualification',
    icon: AlertCircle,
    color: 'text-blue-700',
    bgColor: 'bg-gradient-to-br from-blue-100 to-cyan-100',
    gradient: 'from-blue-400 to-cyan-400',
    badgeColor: 'bg-blue-600 text-white',
  },
  {
    id: 'proposal',
    title: 'Proposta',
    status: 'proposal',
    icon: Clock,
    color: 'text-purple-700',
    bgColor: 'bg-gradient-to-br from-purple-100 to-pink-100',
    gradient: 'from-purple-400 to-pink-400',
    badgeColor: 'bg-purple-600 text-white',
  },
  {
    id: 'negotiation',
    title: 'Negoziazione',
    status: 'negotiation',
    icon: TrendingUp,
    color: 'text-orange-700',
    bgColor: 'bg-gradient-to-br from-orange-100 to-amber-100',
    gradient: 'from-orange-400 to-amber-400',
    badgeColor: 'bg-orange-600 text-white',
  },
  {
    id: 'closing',
    title: 'Chiusura',
    status: 'closing',
    icon: Target,
    color: 'text-yellow-700',
    bgColor: 'bg-gradient-to-br from-yellow-100 to-amber-100',
    gradient: 'from-yellow-400 to-amber-400',
    badgeColor: 'bg-yellow-600 text-white',
  },
  {
    id: 'won',
    title: 'Vinto',
    status: 'won',
    icon: CheckCircle2,
    color: 'text-green-700',
    bgColor: 'bg-gradient-to-br from-green-100 to-emerald-100',
    gradient: 'from-green-400 to-emerald-400',
    badgeColor: 'bg-green-600 text-white',
  },
  {
    id: 'lost',
    title: 'Perso',
    status: 'lost',
    icon: XCircle,
    color: 'text-red-700',
    bgColor: 'bg-gradient-to-br from-red-100 to-rose-100',
    gradient: 'from-red-400 to-rose-400',
    badgeColor: 'bg-red-600 text-white',
  },
];

export default function DealsKanbanPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const { toast } = useToast();

  // Fetch pipelines
  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ['/api/crm/pipelines'],
    initialData: [
      { id: '1', name: 'Vendite Standard', isDefault: true },
      { id: '2', name: 'Enterprise', isDefault: false }
    ]
  });

  // Fetch deals
  const { data: deals, isLoading, error } = useQuery<Deal[]>({
    queryKey: ['/api/crm/deals', selectedPipeline],
    queryFn: async () => {
      const params = selectedPipeline !== 'all' ? `?pipelineId=${selectedPipeline}` : '';
      return [];
    },
    // Fallback to demo data
    initialData: [
      {
        id: '1',
        pipelineId: '1',
        pipelineName: 'Vendite Standard',
        leadId: '1',
        personId: '1',
        personName: 'Mario Rossi',
        title: 'Contratto Enterprise ACME Corp',
        description: 'Opportunità per contratto enterprise completo',
        value: 50000,
        probability: 75,
        expectedCloseDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        actualCloseDate: null,
        stage: 'negotiation',
        stageOrder: 3,
        status: 'open',
        lostReason: null,
        priority: 'high',
        nextActionAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        pipelineId: '1',
        pipelineName: 'Vendite Standard',
        leadId: '2',
        personId: '2',
        personName: 'Laura Bianchi',
        title: 'TechCorp - Pacchetto Business',
        description: 'Pacchetto business per PMI',
        value: 35000,
        probability: 60,
        expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        actualCloseDate: null,
        stage: 'proposal',
        stageOrder: 2,
        status: 'open',
        lostReason: null,
        priority: 'medium',
        nextActionAt: new Date(Date.now() + 5 * 86400000).toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        pipelineId: '2',
        pipelineName: 'Enterprise',
        leadId: null,
        personId: '3',
        personName: 'Giuseppe Verdi',
        title: 'Deal Enterprise Multinazionale',
        description: 'Grande opportunità enterprise',
        value: 150000,
        probability: 85,
        expectedCloseDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        actualCloseDate: null,
        stage: 'closing',
        stageOrder: 4,
        status: 'open',
        lostReason: null,
        priority: 'high',
        nextActionAt: new Date(Date.now() + 1 * 86400000).toISOString(),
        createdAt: new Date().toISOString()
      }
    ]
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      return await apiRequest(`/api/crm/deals/${dealId}`, 'PATCH', { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
      toast({
        title: 'Deal aggiornato',
        description: 'Lo stage del deal è stato aggiornato',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare il deal',
        variant: 'destructive',
      });
    }
  });

  // Transform deals to kanban tasks
  const kanbanTasks: KanbanTask[] = deals?.map(deal => ({
    id: deal.id,
    title: deal.title,
    description: `${deal.personName} • €${deal.value.toLocaleString('it-IT')} • ${deal.probability}% probabilità`,
    status: deal.stage,
    priority: deal.priority,
    dueDate: deal.expectedCloseDate,
    createdAt: deal.createdAt,
    tags: [
      deal.pipelineName,
      deal.status === 'won' ? '🏆 Vinto' : deal.status === 'lost' ? '❌ Perso' : '🎯 Aperto'
    ]
  })) || [];

  const handleStageChange = (taskId: string, newStatus: string) => {
    updateStageMutation.mutate({ dealId: taskId, stage: newStatus });
  };

  // Calculate stats
  const totalValue = deals?.reduce((sum, deal) => sum + deal.value, 0) || 0;
  const weightedValue = deals?.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0) || 0;
  const openDeals = deals?.filter(d => d.status === 'open').length || 0;

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <LoadingState />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <ErrorState message="Errore nel caricamento dei deal" />
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-6" data-testid="crm-deals-kanban">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Pipeline Deals
            </h1>
            <p className="text-gray-600 mt-1">
              Gestione visuale opportunità - {openDeals} deal aperti
            </p>
          </div>

          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="w-64" data-testid="select-pipeline">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtra per pipeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le pipeline</SelectItem>
              {pipelines?.map(pipeline => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                  {pipeline.isDefault && ' (Default)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Valore Totale Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700" data-testid="stat-total-value">
                €{totalValue.toLocaleString('it-IT')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Valore Ponderato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700" data-testid="stat-weighted-value">
                €{Math.round(weightedValue).toLocaleString('it-IT')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Basato su probabilità</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                Deal Aperti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700" data-testid="stat-open-deals">
                {openDeals}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          tasks={kanbanTasks}
          columns={DEAL_COLUMNS}
          onStatusChange={handleStageChange}
          className="min-h-[600px]"
        />
      </div>
    </Layout>
  );
}
