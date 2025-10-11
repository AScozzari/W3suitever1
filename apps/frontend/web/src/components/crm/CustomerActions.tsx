import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  MoreVertical,
  Ban,
  Download,
  Mail,
  Phone,
  MessageSquare,
  UserX,
  FileText,
  Archive,
  Star,
  StarOff
} from 'lucide-react';

interface CustomerActionsProps {
  customerId: string;
  customer: any;
}

export function CustomerActions({ customerId, customer }: CustomerActionsProps) {
  const { toast } = useToast();
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);

  // Blacklist mutation
  const blacklistMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/crm/customers/${customerId}/blacklist`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers', customerId] });
      toast({
        title: 'Cliente in Blacklist',
        description: 'Il cliente è stato aggiunto alla blacklist',
      });
      setBlacklistDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile aggiungere alla blacklist',
      });
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/crm/customers/${customerId}/export`, {
        method: 'GET',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Export Completato',
        description: 'Dati cliente scaricati con successo',
      });
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      // Open email client
      window.location.href = `mailto:${customer.email}`;
      return Promise.resolve();
    },
  });

  // VIP status toggle
  const toggleVipMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/crm/customers/${customerId}/vip`, {
        method: 'POST',
        body: JSON.stringify({ isVip: !customer.isVip }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers', customerId] });
      toast({
        title: customer.isVip ? 'VIP Rimosso' : 'VIP Assegnato',
        description: customer.isVip ? 'Cliente rimosso dai VIP' : 'Cliente contrassegnato come VIP',
      });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" data-testid="button-customer-actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Communication Actions */}
          <DropdownMenuItem
            onClick={() => sendEmailMutation.mutate()}
            disabled={!customer.email}
            data-testid="action-send-email"
          >
            <Mail className="h-4 w-4 mr-2" />
            Invia Email
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.location.href = `tel:${customer.phone}`}
            disabled={!customer.phone}
            data-testid="action-call"
          >
            <Phone className="h-4 w-4 mr-2" />
            Chiama
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.open(`https://wa.me/${customer.phone?.replace(/\D/g, '')}`, '_blank')}
            disabled={!customer.phone}
            data-testid="action-whatsapp"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Data Actions */}
          <DropdownMenuItem
            onClick={() => exportDataMutation.mutate()}
            data-testid="action-export-data"
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta Dati (GDPR)
          </DropdownMenuItem>

          <DropdownMenuItem data-testid="action-generate-report">
            <FileText className="h-4 w-4 mr-2" />
            Genera Report Cliente
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Status Actions */}
          <DropdownMenuItem
            onClick={() => toggleVipMutation.mutate()}
            data-testid="action-toggle-vip"
          >
            {customer.isVip ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Rimuovi VIP
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" style={{ color: '#fbbf24' }} />
                Contrassegna VIP
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem data-testid="action-archive">
            <Archive className="h-4 w-4 mr-2" />
            Archivia Cliente
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Destructive Actions */}
          <DropdownMenuItem
            onClick={() => setBlacklistDialogOpen(true)}
            className="text-red-600"
            data-testid="action-blacklist"
          >
            <Ban className="h-4 w-4 mr-2" />
            Aggiungi a Blacklist
          </DropdownMenuItem>

          <DropdownMenuItem className="text-red-600" data-testid="action-delete">
            <UserX className="h-4 w-4 mr-2" />
            Elimina Cliente (GDPR)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Blacklist Confirmation Dialog */}
      <AlertDialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Blacklist</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler aggiungere <strong>{customer.firstName} {customer.lastName}</strong> alla blacklist?
              Questa azione impedirà future comunicazioni automatiche.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-blacklist">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blacklistMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-blacklist"
            >
              Aggiungi a Blacklist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
