import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Euro, User, TrendingUp, GripVertical, MoreVertical, Workflow, Edit, Trash2, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Deal {
  id: string;
  ownerUserId: string;
  estimatedValue?: number | null;
  probability?: number | null;
  agingDays?: number | null;
  stage: string;
  customerId?: string | null;
  sourceChannel?: string | null;
  preferredContactChannel?: string | null;
  ownerName?: string | null;
  customerName?: string | null;
  customerType?: 'b2b' | 'b2c' | null;
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

// Helper: Translate inbound channel to Italian
const translateInboundChannel = (channel?: string | null): string => {
  const translations: Record<string, string> = {
    'landing_page': 'Landing',
    'form_web': 'Form Web',
    'whatsapp_inbound': 'WhatsApp',
    'cold_call': 'Cold Call',
    'linkedin_campaign': 'LinkedIn',
    'partner_referral': 'Partner',
    'social': 'Social',
    'event': 'Evento'
  };
  return channel ? translations[channel] || channel : '';
};

// Helper: Translate outbound channel to Italian
const translateOutboundChannel = (channel?: string | null): string => {
  const translations: Record<string, string> = {
    'email': 'Email',
    'telegram': 'Telegram',
    'whatsapp': 'WhatsApp',
    'phone': 'Telefono',
    'linkedin': 'LinkedIn',
    'social_dm': 'Social DM',
    'sms': 'SMS'
  };
  return channel ? translations[channel] || channel : '';
};

export function DealCard({ deal }: DealCardProps) {
  const [workflowDrawerOpen, setWorkflowDrawerOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: deal.id });

  // Mutation: Duplicate deal
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      // Use dedicated backend duplicate endpoint (handles all fields server-side)
      return await apiRequest(`/api/crm/deals/${deal.id}/duplicate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
      toast({
        title: 'Deal duplicato',
        description: 'Il deal è stato duplicato con successo.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile duplicare il deal.',
      });
    },
  });

  // Mutation: Delete deal
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/crm/deals/${deal.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
      toast({
        title: 'Deal eliminato',
        description: 'Il deal è stato eliminato con successo.',
      });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile eliminare il deal.',
      });
    },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const agingColor = getAgingColor(deal.agingDays);

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-testid={`kanban-deal-${deal.id}`}>
      <Card
        className="p-3 hover:shadow-md transition-shadow glass-card border-l-4"
        style={{ borderLeftColor: agingColor }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ background: 'hsl(var(--brand-orange) / 0.2)', color: 'hsl(var(--brand-orange))' }}
              title={deal.ownerName || 'Owner'}
            >
              {deal.ownerName ? deal.ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : deal.ownerUserId.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={deal.customerName || deal.customerType || undefined}>
                {deal.customerName || (deal.customerId ? `Cliente ${deal.customerId.slice(0, 8)}` : `Deal ${deal.id.slice(0, 8)}`)}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {deal.ownerName || `Owner: ${deal.ownerUserId.slice(0, 8)}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-deal-menu-${deal.id}`}
                >
                  <MoreVertical className="h-4 w-4 text-foreground opacity-70 hover:opacity-100" />
                  <span className="sr-only">Apri menu</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setWorkflowDrawerOpen(true);
                  }}
                  data-testid={`menu-workflow-${deal.id}`}
                >
                  <Workflow className="mr-2 h-4 w-4 text-windtre-orange" />
                  Esegui Workflow
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    toast({
                      title: 'Funzionalità in arrivo',
                      description: 'La modifica della deal sarà disponibile a breve.',
                    });
                  }}
                  data-testid={`menu-edit-${deal.id}`}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica Deal
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateMutation.mutate();
                  }}
                  disabled={duplicateMutation.isPending}
                  data-testid={`menu-duplicate-${deal.id}`}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplica Deal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="text-red-600"
                  data-testid={`menu-delete-${deal.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina Deal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              data-testid={`drag-handle-${deal.id}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
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
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" style={{ color: agingColor }} />
              <span className="text-xs" style={{ color: agingColor }}>
                {deal.agingDays || 0} giorni
              </span>
            </div>
          </div>
          
          {/* Channel badges */}
          {(deal.sourceChannel || deal.preferredContactChannel) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {deal.sourceChannel && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-4 border-green-600/30 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20"
                  data-testid={`badge-inbound-${deal.id}`}
                >
                  ↓ {translateInboundChannel(deal.sourceChannel)}
                </Badge>
              )}
              {deal.preferredContactChannel && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-4 border-blue-600/30 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20"
                  data-testid={`badge-outbound-${deal.id}`}
                >
                  ↑ {translateOutboundChannel(deal.preferredContactChannel)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Workflow Execution Drawer */}
      <Sheet open={workflowDrawerOpen} onOpenChange={setWorkflowDrawerOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-windtre-orange" />
              Gestione Workflow - Deal
            </SheetTitle>
            <SheetDescription>
              Esegui workflow manuali o visualizza lo storico delle esecuzioni per questo deal
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            <WorkflowExecutionPanel
              entityType="deal"
              entityId={deal.id}
              entityData={{
                name: deal.customerName || `Deal ${deal.id.slice(0, 8)}`,
                stage: deal.stage,
                value: deal.estimatedValue || 0,
                owner: deal.ownerName || deal.ownerUserId,
              }}
              compact={false}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo deal? Questa azione non può essere annullata.
              {deal.customerName && (
                <div className="mt-2 font-medium">
                  Deal: {deal.customerName} - {formatCurrency(deal.estimatedValue)}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
