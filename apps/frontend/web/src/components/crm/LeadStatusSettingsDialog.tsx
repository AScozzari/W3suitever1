import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Settings2, 
  Plus, 
  Trash2, 
  Edit,
  Info
} from 'lucide-react';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { CreateLeadStatusDialog } from './CreateLeadStatusDialog';

interface LeadStatusSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

type LeadStatusCategory = 'new' | 'working' | 'qualified' | 'converted' | 'disqualified' | 'on_hold';

const statusCategoryConfig: Record<LeadStatusCategory, { label: string; color: string; description: string }> = {
  new: { 
    label: 'Nuovo Lead', 
    color: 'hsl(210, 100%, 60%)',
    description: 'Lead appena acquisiti, in attesa di prima lavorazione'
  },
  working: { 
    label: 'In Lavorazione', 
    color: 'hsl(200, 100%, 50%)',
    description: 'Lead in fase di qualificazione e nurturing'
  },
  qualified: { 
    label: 'Qualificato', 
    color: 'hsl(280, 65%, 60%)',
    description: 'Lead validati e pronti per conversione'
  },
  converted: { 
    label: 'Convertito', 
    color: 'hsl(140, 60%, 50%)',
    description: 'Lead trasformati in clienti o deal'
  },
  disqualified: { 
    label: 'Non Qualificato', 
    color: 'hsl(0, 70%, 55%)',
    description: 'Lead scartati per mancanza di requisiti'
  },
  on_hold: { 
    label: 'In Attesa', 
    color: 'hsl(40, 95%, 55%)',
    description: 'Lead temporaneamente sospesi o in pausa'
  }
};

export function LeadStatusSettingsDialog({ open, onClose, campaignId }: LeadStatusSettingsDialogProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);

  // Fetch lead statuses for this campaign
  const { data: statusesResponse, isLoading } = useQuery({
    queryKey: ['/api/crm/lead-statuses', campaignId],
    queryFn: () => apiRequest(`/api/crm/lead-statuses?campaignId=${campaignId}`),
    enabled: open && !!campaignId,
  });

  const statuses = statusesResponse?.data || [];

  // Group statuses by category
  const groupedStatuses = statuses.reduce((acc: any, status: any) => {
    if (!acc[status.category]) {
      acc[status.category] = [];
    }
    acc[status.category].push(status);
    return acc;
  }, {} as Record<LeadStatusCategory, any[]>);

  // Sort statuses within each category by sortOrder
  Object.keys(groupedStatuses).forEach(category => {
    groupedStatuses[category].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  });

  // Delete status mutation
  const deleteMutation = useMutation({
    mutationFn: async (statusId: string) => {
      return apiRequest(`/api/crm/lead-statuses/${statusId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/lead-statuses', campaignId] });
      toast({
        title: 'Stato eliminato',
        description: 'Lo stato è stato eliminato con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile eliminare lo stato',
        variant: 'destructive',
      });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ statusId, isActive }: { statusId: string; isActive: boolean }) => {
      return apiRequest(`/api/crm/lead-statuses/${statusId}`, {
        method: 'PATCH',
        body: { isActive },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/lead-statuses', campaignId] });
      toast({
        title: 'Stato aggiornato',
        description: 'Lo stato è stato aggiornato con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare lo stato',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (status: any) => {
    setEditingStatus(status);
    setCreateDialogOpen(true);
  };

  const handleDelete = (statusId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo stato?')) {
      deleteMutation.mutate(statusId);
    }
  };

  const handleToggleActive = (statusId: string, currentActive: boolean) => {
    toggleActiveMutation.mutate({ statusId, isActive: !currentActive });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <LoadingState message="Caricamento stati lead..." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Gestione Stati Lead
            </DialogTitle>
            <DialogDescription>
              Configura gli stati personalizzati per ogni categoria di lead. Ogni tenant può creare nomi custom mantenendo le categorie fisse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Info Panel */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Categorie Fisse</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Le 6 categorie (Nuovo, In Lavorazione, Qualificato, Convertito, Non Qualificato, In Attesa) sono fisse. 
                    Puoi personalizzare i nomi degli stati all'interno di ogni categoria.
                  </p>
                </div>
              </div>
            </Card>

            {/* Add New Status Button */}
            <Button 
              onClick={() => {
                setEditingStatus(null);
                setCreateDialogOpen(true);
              }}
              className="w-full"
              data-testid="button-add-status"
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Nuovo Stato
            </Button>

            {/* Statuses by Category */}
            <div className="space-y-4">
              {(Object.keys(statusCategoryConfig) as LeadStatusCategory[]).map(category => {
                const config = statusCategoryConfig[category];
                const categoryStatuses = groupedStatuses[category] || [];

                return (
                  <Card key={category} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.description}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {categoryStatuses.length} {categoryStatuses.length === 1 ? 'stato' : 'stati'}
                      </Badge>
                    </div>

                    {categoryStatuses.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-3 text-center border-t">
                        Nessuno stato configurato per questa categoria
                      </div>
                    ) : (
                      <div className="space-y-2 border-t pt-3">
                        {categoryStatuses.map((status: any) => (
                          <div
                            key={status.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            data-testid={`status-item-${status.id}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: status.color }}
                              />
                              <div>
                                <span className="font-medium">{status.displayName}</span>
                                {status.isDefault && (
                                  <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                                )}
                                {!status.isActive && (
                                  <Badge variant="outline" className="ml-2 text-xs">Disattivo</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground ml-auto mr-4">
                                Ordine: {status.sortOrder}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(status.id, status.isActive)}
                                data-testid={`button-toggle-${status.id}`}
                              >
                                {status.isActive ? 'Disattiva' : 'Attiva'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(status)}
                                data-testid={`button-edit-${status.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {!status.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(status.id)}
                                  data-testid={`button-delete-${status.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Status Dialog */}
      <CreateLeadStatusDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingStatus(null);
        }}
        campaignId={campaignId}
        editingStatus={editingStatus}
      />
    </>
  );
}
