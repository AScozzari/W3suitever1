import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileEdit, TrendingUp } from 'lucide-react';

interface VersioningConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: 'correction' | 'business_change') => void;
  changedFields: string[];
  isPending?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  monthlyFee: 'Canone Mensile',
  unitPrice: 'Prezzo Vendita',
  costPrice: 'Costo Base'
};

export function VersioningConfirmModal({ 
  open, 
  onClose, 
  onConfirm, 
  changedFields,
  isPending 
}: VersioningConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Modifica Commerciale Rilevata</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Hai modificato i seguenti campi commerciali:
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <ul className="list-disc list-inside text-sm text-muted-foreground mb-4">
            {changedFields.map(field => (
              <li key={field} className="font-medium text-foreground">
                {FIELD_LABELS[field] || field}
              </li>
            ))}
          </ul>
          
          <p className="text-sm text-muted-foreground">
            Come vuoi gestire questa modifica?
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            variant="outline" 
            onClick={() => onConfirm('correction')}
            disabled={isPending}
            className="w-full justify-start"
          >
            <FileEdit className="h-4 w-4 mr-2" />
            <div className="text-left">
              <div className="font-medium">Correzione</div>
              <div className="text-xs text-muted-foreground">
                Corregge un errore, non crea storico
              </div>
            </div>
          </Button>
          
          <Button 
            onClick={() => onConfirm('business_change')}
            disabled={isPending}
            className="w-full justify-start"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            <div className="text-left">
              <div className="font-medium">Variazione Commerciale</div>
              <div className="text-xs text-muted-foreground">
                Storicizza versione precedente per report
              </div>
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
