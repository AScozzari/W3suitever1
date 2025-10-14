import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Euro, User, TrendingUp, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface Deal {
  id: string;
  ownerUserId: string;
  estimatedValue?: number | null;
  probability?: number | null;
  agingDays?: number | null;
  stage: string;
  customerId?: string | null;
}

interface DealCardProps {
  deal: Deal;
}

// Helper: Format currency
const formatCurrency = (value?: number | null): string => {
  if (!value) return '€0';
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`;
  return `€${value.toFixed(0)}`;
};

// Helper: Get aging color
const getAgingColor = (days?: number | null): string => {
  if (!days) return 'hsl(var(--muted))';
  if (days < 30) return '#10b981';
  if (days < 60) return '#f59e0b';
  return '#ef4444';
};

export function DealCard({ deal }: DealCardProps) {
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

  const agingColor = getAgingColor(deal.agingDays);

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-testid={`kanban-deal-${deal.id}`}>
      <Card
        className="p-3 cursor-move hover:shadow-md transition-shadow glass-card border-l-4"
        style={{ borderLeftColor: agingColor }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ background: 'hsl(var(--brand-orange) / 0.2)', color: 'hsl(var(--brand-orange))' }}
            >
              {deal.ownerUserId.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {deal.customerId ? `Cliente ${deal.customerId.slice(0, 8)}` : `Deal ${deal.id.slice(0, 8)}`}
              </div>
            </div>
          </div>
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Euro className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold">{formatCurrency(deal.estimatedValue)}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {deal.probability || 0}%
          </Badge>
        </div>

        <div className="space-y-2">
          <Progress value={deal.probability || 0} className="h-1" />
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" style={{ color: agingColor }} />
            <span className="text-xs" style={{ color: agingColor }}>
              {deal.agingDays || 0} giorni
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
