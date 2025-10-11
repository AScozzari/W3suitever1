import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { CRMFilterDock } from '@/components/crm/CRMFilterDock';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Euro, Clock, User, MoreVertical, Plus } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Deal {
  id: string;
  title: string;
  value: number;
  stageId: string;
  probability: number;
  ownerName: string;
  ownerInitials: string;
  company?: string;
  daysInStage: number;
  tags: string[];
}

interface Stage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

interface Pipeline {
  id: string;
  name: string;
  driver: string;
}

const SortableCard = ({ deal }: { deal: Deal }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3"
      data-testid={`deal-card-${deal.id}`}
    >
      <Card
        className="p-4 cursor-grab active:cursor-grabbing border hover:shadow-md transition-shadow"
        style={{
          background: 'var(--glass-card-bg)',
          backdropFilter: 'blur(8px)',
          borderColor: 'var(--glass-card-border)',
        }}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm line-clamp-2" style={{ color: 'var(--text-primary)' }}>
              {deal.title}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Dettaglio</DropdownMenuItem>
                <DropdownMenuItem>Modifica</DropdownMenuItem>
                <DropdownMenuItem>Assegna a...</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {deal.company && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {deal.company}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
            <span className="font-bold text-sm" style={{ color: 'hsl(var(--brand-orange))' }}>
              €{(deal.value / 1000).toFixed(1)}k
            </span>
            <Badge variant="outline" className="ml-auto" style={{ fontSize: '10px' }}>
              {deal.probability}%
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs" style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
                  {deal.ownerInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {deal.ownerName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <Clock className="h-3 w-3" />
              {deal.daysInStage}g
            </div>
          </div>

          {deal.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {deal.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--glass-bg-light)', color: 'var(--text-tertiary)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const StageColumn = ({ stage }: { stage: Stage }) => {
  const { setNodeRef } = useSortable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-[320px]"
      data-testid={`stage-column-${stage.id}`}
    >
      <div className="mb-3 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: stage.color }}
          />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {stage.name}
          </h3>
          <Badge variant="outline" className="text-xs">
            {stage.deals.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`add-deal-${stage.id}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="px-3 pb-3">
          <SortableContext items={stage.deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {stage.deals.map((deal) => (
              <SortableCard key={deal.id} deal={deal} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>

      <div
        className="mt-2 px-3 py-2 text-sm font-medium text-center"
        style={{ color: 'var(--text-tertiary)' }}
      >
        €{(stage.deals.reduce((sum, d) => sum + d.value, 0) / 1000).toFixed(0)}k totale
      </div>
    </div>
  );
};

export default function PipelineBoardPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState('1');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  const [stages, setStages] = useState<Stage[]>([]);

  const { data: pipelinesResponse } = useQuery<Pipeline[]>({
    queryKey: ['/api/crm/pipelines'],
  });

  const pipelines = pipelinesResponse || [];

  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, newStageId }: { dealId: string; newStageId: string }) => {
      const response = await fetch(`/api/crm/deals/${dealId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: newStageId })
      });
      if (!response.ok) throw new Error('Spostamento fallito');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Deal spostato!', description: 'Lo stage è stato aggiornato' });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination stages
    const activeStageIndex = stages.findIndex(s => s.deals.some(d => d.id === activeId));
    const overStageIndex = stages.findIndex(s => s.id === overId || s.deals.some(d => d.id === overId));

    if (activeStageIndex !== -1 && overStageIndex !== -1) {
      const activeStage = stages[activeStageIndex];
      const overStage = stages[overStageIndex];
      const activeDealIndex = activeStage.deals.findIndex(d => d.id === activeId);
      const activeDeal = activeStage.deals[activeDealIndex];

      if (activeStageIndex === overStageIndex) {
        // Same stage - reorder
        const overDealIndex = overStage.deals.findIndex(d => d.id === overId);
        if (activeDealIndex !== overDealIndex) {
          const newDeals = arrayMove(activeStage.deals, activeDealIndex, overDealIndex);
          const newStages = [...stages];
          newStages[activeStageIndex] = { ...activeStage, deals: newDeals };
          setStages(newStages);
        }
      } else {
        // Different stage - move
        const newActiveDeals = activeStage.deals.filter(d => d.id !== activeId);
        const updatedDeal = { ...activeDeal, stageId: overStage.id };
        const newOverDeals = [...overStage.deals, updatedDeal];

        const newStages = [...stages];
        newStages[activeStageIndex] = { ...activeStage, deals: newActiveDeals };
        newStages[overStageIndex] = { ...overStage, deals: newOverDeals };
        setStages(newStages);

        // Call API
        moveDealMutation.mutate({ dealId: activeId, newStageId: overStage.id });
      }
    }

    setActiveId(null);
  };

  const activeDeal = activeId ? stages.flatMap(s => s.deals).find(d => d.id === activeId) : null;

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMSearchBar 
          onSearch={setSearchQuery}
          placeholder="Cerca deal..."
        />

        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="board" className="h-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="board" data-testid="tab-board">Kanban Board</TabsTrigger>
                <TabsTrigger value="list" data-testid="tab-list">Lista</TabsTrigger>
                <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3">
                <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                  <SelectTrigger className="w-[220px]" data-testid="select-pipeline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <CRMFilterDock />
              </div>
            </div>

            <TabsContent value="board" className="h-[calc(100%-60px)] mt-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 h-full overflow-x-auto pb-4">
                  <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {stages.map((stage) => (
                      <StageColumn key={stage.id} stage={stage} />
                    ))}
                  </SortableContext>
                </div>

                <DragOverlay>
                  {activeDeal ? <SortableCard deal={activeDeal} /> : null}
                </DragOverlay>
              </DndContext>
            </TabsContent>

            <TabsContent value="list" className="mt-0">
              <div className="text-center py-12">
                <p style={{ color: 'var(--text-tertiary)' }}>Lista deals in arrivo...</p>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <div className="text-center py-12">
                <p style={{ color: 'var(--text-tertiary)' }}>Analytics in arrivo...</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
