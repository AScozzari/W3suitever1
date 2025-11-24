import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { User, Euro, TrendingUp } from 'lucide-react';
import { DealCard } from './DealCard';
import { KanbanColumn } from './KanbanColumn';

interface Deal {
  id: string;
  tenantId: string;
  storeId: string;
  ownerUserId: string;
  pipelineId: string;
  stage: string;
  status: 'open' | 'won' | 'lost';
  leadId?: string | null;
  sourceChannel?: string | null;
  personId: string;
  customerId?: string | null;
  estimatedValue?: number | null;
  probability?: number | null;
  agingDays?: number | null;
  wonAt?: string | null;
  
  // Outbound channel tracking
  preferredContactChannel?: string | null;
  lastContactChannel?: string | null;
  lastContactDate?: string | null;
  
  // Real names from JOINs
  ownerName?: string | null;
  customerName?: string | null;
  customerType?: 'b2b' | 'b2c' | null;
  
  createdAt: string;
  updatedAt: string;
}

interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  category: 'starter' | 'progress' | 'pending' | 'purchase' | 'finalized' | 'ko' | 'archive';
  orderIndex: number;
  color?: string | null;
  isActive: boolean;
}

interface DealsKanbanProps {
  pipelineId: string;
}

// Category color mapping
const categoryColors: Record<string, string> = {
  starter: '#10b981',
  progress: '#3b82f6',
  pending: '#f59e0b',
  purchase: '#8b5cf6',
  finalized: '#22c55e',
  ko: '#ef4444',
  archive: '#6b7280',
};

export default function DealsKanban({ pipelineId }: DealsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pipeline stages
  const { data: stagesData } = useQuery<PipelineStage[]>({
    queryKey: [`/api/crm/pipelines/${pipelineId}/stages`],
  });

  // Fetch deals
  const { data: dealsData, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`],
  });

  const stages = stagesData || [];
  const deals = dealsData || [];

  // Move deal mutation
  const moveDealMutation = useMutation({
    retry: false, // Disable automatic retry to prevent double requests
    mutationFn: async ({ dealId, targetStage }: { dealId: string; targetStage: string }) => {
      return apiRequest(`/api/crm/deals/${dealId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ targetStage }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`] });
      toast({
        title: 'Deal spostato',
        description: 'Il deal è stato spostato con successo',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Errore durante lo spostamento del deal';
      toast({
        title: 'Operazione non consentita',
        description: message,
        variant: 'destructive',
      });
      // Invalidate to reset UI state
      queryClient.invalidateQueries({ queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`] });
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dealId = active.id as string;
    const targetStage = over.id as string;

    // Find source stage
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;

    // Find target stage category
    const targetStageData = stages.find((s) => s.name === targetStage);
    if (!targetStageData) return;

    // Check workflow rules (will be handled by backend)
    moveDealMutation.mutate({ dealId, targetStage });
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Group deals by stage
  const dealsByStage: Record<string, Deal[]> = {};
  stages.forEach((stage) => {
    dealsByStage[stage.name] = deals.filter((deal) => deal.stage === stage.name);
  });

  const activeDeal = deals.find((d) => d.id === activeId);

  if (dealsLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Caricamento deals...</div>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            id={stage.name}
            title={stage.name}
            category={stage.category}
            count={dealsByStage[stage.name]?.length || 0}
            color={categoryColors[stage.category]}
          >
            <div className="space-y-2">
              {dealsByStage[stage.name]?.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
              {(!dealsByStage[stage.name] || dealsByStage[stage.name].length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-8">Nessun deal</div>
              )}
            </div>
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeDeal && (
          <div className="rotate-3 opacity-90">
            <DealCard deal={activeDeal} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
