// QuickActions.tsx - Reusable Quick Actions Component with WindTre Glassmorphism

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, Plus, Send, Calendar, FileText, Receipt, Clock, Users, Briefcase, Target, TrendingUp, DollarSign, FileCheck, UserPlus, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  onClick: () => void;
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3 | 4;
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
}

export default function QuickActions({
  actions,
  title = 'Azioni Rapide',
  columns = 2,
  variant = 'compact',
  className
}: QuickActionsProps) {
  
  const getGridCols = () => {
    switch(columns) {
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-2';
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("space-y-3", className)}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                variant="outline"
                size="sm"
                className="gap-2"
                style={{
                  borderColor: action.color ? `${action.color}40` : undefined,
                  color: action.color || undefined
                }}
                data-testid={`quick-action-${action.id}`}
              >
                <Icon className="h-4 w-4" />
                {action.title}
                {action.badge && (
                  <Badge variant={action.badgeVariant || 'secondary'} className="ml-2">
                    {action.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className={cn("glass-card hover:shadow-xl transition-all duration-300", className)}>
        <CardContent className="p-6">
          {title && (
            <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
          )}
          <div className={cn("grid gap-4", getGridCols())}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.id}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={action.onClick}
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                  data-testid={`quick-action-${action.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div 
                        className="p-2 rounded-lg group-hover:scale-110 transition-transform"
                        style={{
                          background: action.color ? `${action.color}20` : 'rgba(255, 105, 0, 0.1)',
                        }}
                      >
                        <Icon 
                          className="h-5 w-5"
                          style={{ color: action.color || '#FF6900' }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                            {action.title}
                          </h4>
                          {action.badge && (
                            <Badge variant={action.badgeVariant || 'secondary'} className="ml-2">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default compact variant
  return (
    <Card className={cn("glass-card hover:shadow-xl transition-all duration-300", className)}>
      <CardContent className="p-6">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        )}
        <div className={cn("grid gap-3", getGridCols())}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                variant="outline"
                className="h-auto p-4 justify-start gap-3 hover:shadow-md transition-all duration-300 group"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: action.color ? `1px solid ${action.color}30` : '1px solid rgba(255, 255, 255, 0.3)',
                }}
                data-testid={`quick-action-${action.id}`}
              >
                <div 
                  className="p-2 rounded-lg group-hover:scale-110 transition-transform"
                  style={{
                    background: action.color ? `${action.color}20` : 'rgba(255, 105, 0, 0.1)',
                  }}
                >
                  <Icon 
                    className="h-5 w-5"
                    style={{ color: action.color || '#FF6900' }}
                  />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                      {action.title}
                    </span>
                    {action.badge && (
                      <Badge variant={action.badgeVariant || 'secondary'}>
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {action.description}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-configured Quick Actions for common use cases
export const HR_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'leave-request',
    title: 'Richiedi Ferie',
    description: 'Invia richiesta ferie o permesso',
    icon: Calendar,
    color: '#FF6900',
    onClick: () => {}
  },
  {
    id: 'expense-report',
    title: 'Nota Spese',
    description: 'Compila nota spese',
    icon: Receipt,
    color: '#7B2CBF',
    onClick: () => {}
  },
  {
    id: 'timesheet',
    title: 'Timbratura',
    description: 'Registra ore lavorate',
    icon: Clock,
    color: '#10B981',
    onClick: () => {}
  },
  {
    id: 'documents',
    title: 'Documenti',
    description: 'Scarica buste paga',
    icon: FileText,
    color: '#3B82F6',
    onClick: () => {}
  }
];

export const MANAGER_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'approve-requests',
    title: 'Approva Richieste',
    description: 'Gestisci richieste pendenti',
    icon: CheckCircle,
    color: '#10B981',
    badge: '3',
    badgeVariant: 'destructive',
    onClick: () => {}
  },
  {
    id: 'add-employee',
    title: 'Nuovo Dipendente',
    description: 'Aggiungi risorsa al team',
    icon: UserPlus,
    color: '#FF6900',
    onClick: () => {}
  },
  {
    id: 'team-schedule',
    title: 'Pianifica Team',
    description: 'Gestisci turni e assenze',
    icon: Users,
    color: '#7B2CBF',
    onClick: () => {}
  },
  {
    id: 'performance-review',
    title: 'Valutazioni',
    description: 'Avvia review performance',
    icon: Target,
    color: '#F59E0B',
    onClick: () => {}
  }
];

export const FINANCE_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'payroll-run',
    title: 'Elabora Buste Paga',
    description: 'Avvia processo payroll',
    icon: DollarSign,
    color: '#10B981',
    onClick: () => {}
  },
  {
    id: 'expense-approval',
    title: 'Approva Spese',
    description: 'Valida note spese',
    icon: FileCheck,
    color: '#FF6900',
    badge: '12',
    onClick: () => {}
  },
  {
    id: 'budget-report',
    title: 'Report Budget',
    description: 'Analisi costi reparto',
    icon: TrendingUp,
    color: '#7B2CBF',
    onClick: () => {}
  },
  {
    id: 'invoice-management',
    title: 'Gestione Fatture',
    description: 'Controlla fatture fornitori',
    icon: Briefcase,
    color: '#3B82F6',
    onClick: () => {}
  }
];