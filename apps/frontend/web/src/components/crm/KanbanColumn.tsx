import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface KanbanColumnProps {
  id: string;
  title: string;
  category: 'starter' | 'progress' | 'pending' | 'purchase' | 'finalized' | 'ko' | 'archive';
  count: number;
  color: string;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, category, count, color, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-[420px] transition-all duration-200',
        isOver && 'scale-105'
      )}
      data-testid={`kanban-column-${id}`}
    >
      <Card
        className={cn(
          'h-full glass-card border-0',
          isOver && 'ring-2 ring-offset-2'
        )}
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: color }}
              />
              <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
            </div>
            <Badge
              variant="secondary"
              className="font-medium"
              style={{ background: `${color}20`, color }}
            >
              {count}
            </Badge>
          </div>
        </div>

        <div
          className={cn(
            'p-4 h-[calc(100vh-340px)] overflow-y-auto transition-colors',
            isOver && 'bg-muted/30'
          )}
        >
          {children}
        </div>
      </Card>
    </div>
  );
}
