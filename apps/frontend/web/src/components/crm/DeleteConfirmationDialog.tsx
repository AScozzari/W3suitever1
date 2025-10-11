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
import { Trash2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  isPending?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Conferma eliminazione',
  description,
  itemName,
  isPending = false,
}: DeleteConfirmationDialogProps) {
  const defaultDescription = itemName
    ? `Sei sicuro di voler eliminare "${itemName}"? Questa azione non può essere annullata.`
    : 'Sei sicuro di voler eliminare questo elemento? Questa azione non può essere annullata.';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        style={{ background: 'var(--glass-card-bg)', borderColor: 'var(--glass-card-border)' }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2 rounded-lg"
              style={{ background: 'hsl(0, 84%, 60%, 0.1)' }}
            >
              <Trash2 className="h-5 w-5" style={{ color: 'hsl(0, 84%, 60%)' }} />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            data-testid="button-cancel-delete"
            disabled={isPending}
          >
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-confirm-delete"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? 'Eliminazione...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
