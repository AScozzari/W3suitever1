import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, PackagePlus, History } from 'lucide-react';

interface NewProductConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (createNew: boolean) => void;
  changedFields: string[];
  isPending?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  ean: 'EAN/Barcode',
  type: 'Tipo Prodotto'
};

export function NewProductConfirmModal({ 
  open, 
  onClose, 
  onConfirm, 
  changedFields,
  isPending 
}: NewProductConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <DialogTitle>Modifica Identificativi Prodotto</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Hai modificato i seguenti campi identificativi:
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
            Vuoi creare un <strong>nuovo prodotto</strong> o <strong>storicizzare</strong> quello esistente?
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={() => onConfirm(true)}
            disabled={isPending}
            className="w-full justify-start"
          >
            <PackagePlus className="h-4 w-4 mr-2" />
            <div className="text-left">
              <div className="font-medium">Crea Nuovo Prodotto</div>
              <div className="text-xs text-muted-foreground">
                Prodotto separato con nuovo SKU, storico indipendente
              </div>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => onConfirm(false)}
            disabled={isPending}
            className="w-full justify-start"
          >
            <History className="h-4 w-4 mr-2" />
            <div className="text-left">
              <div className="font-medium">Storicizza (Versioning)</div>
              <div className="text-xs text-muted-foreground">
                Mantiene lo storico collegato per report
              </div>
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
