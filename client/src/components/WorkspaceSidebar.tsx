import { useState } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WorkspaceSidebarProps {
  collapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
}

const tasks = [
  { 
    id: 1, 
    title: 'Follow-up cliente Premium', 
    description: 'Chiamare Mario Rossi per rinnovo contratto Enterprise',
    priority: 'high',
    time: '15:00'
  },
  { 
    id: 2, 
    title: 'Preparare documentazione', 
    description: 'Contratto fibra ottica per Laura Bianchi',
    priority: 'medium',
    time: '16:00'
  },
  { 
    id: 3, 
    title: 'Verifica pagamento', 
    description: 'Contratto fattura cliente Giuseppe Verdi',
    priority: 'low',
    time: '17:30'
  },
  { 
    id: 4, 
    title: 'Attivazione servizi', 
    description: 'Nuovo contratto mobile SG - fibra',
    priority: 'high',
    time: '18:00'
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-destructive text-destructive-foreground';
    case 'medium': return 'bg-warning text-warning-foreground';
    case 'low': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Bassa';
    default: return 'Normale';
  }
};

export const WorkspaceSidebar = ({ collapsed, onCollapseChange }: WorkspaceSidebarProps) => {
  return (
    <aside className={cn(
      "fixed right-0 top-16 h-[calc(100vh-4rem)] transition-all duration-300 z-40 glass-strong border-l border-border/50 overflow-y-auto",
      collapsed ? "w-16" : "w-80"
    )}>
      {/* Toggle Button */}
      <div className="absolute -left-3 top-6 z-50">
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 rounded-full glass-strong border-border/50 p-0"
          onClick={() => onCollapseChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold text-windtre-purple">Workspace</h2>
            <p className="text-sm text-muted-foreground">La mie attività</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 glass rounded-lg">
            <Button variant="default" size="sm" className="flex-1 bg-windtre-orange text-white">
              <CheckSquare className="h-4 w-4 mr-2" />
              Tasks
            </Button>
            <Button variant="ghost" size="sm" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Calendario
            </Button>
            <Button variant="ghost" size="sm" className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              Leads
            </Button>
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">La mie attività</h3>
              <Badge variant="secondary" className="text-xs">4 attive</Badge>
            </div>
            
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card key={task.id} className="glass border-border/50 hover:glass-strong transition-all duration-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium leading-tight">
                        {task.title}
                      </CardTitle>
                      <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{task.time}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            <h3 className="font-medium">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="glass rounded-lg p-3">
                <div className="text-lg font-bold text-windtre-orange">24</div>
                <div className="text-xs text-muted-foreground">Task oggi</div>
              </div>
              <div className="glass rounded-lg p-3">
                <div className="text-lg font-bold text-windtre-purple">12</div>
                <div className="text-xs text-muted-foreground">Completate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="p-4 flex flex-col items-center gap-4">
          <Button variant="ghost" size="sm">
            <CheckSquare className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Calendar className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <TrendingUp className="h-5 w-5" />
          </Button>
        </div>
      )}
    </aside>
  );
};