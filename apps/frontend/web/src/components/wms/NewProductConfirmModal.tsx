import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
  const [selectedOption, setSelectedOption] = useState<'new' | 'version'>('version');

  const handleApply = () => {
    onConfirm(selectedOption === 'new');
  };

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
          
          <p className="text-sm text-muted-foreground mb-4">
            Scegli come procedere:
          </p>

          <RadioGroup 
            value={selectedOption} 
            onValueChange={(value) => setSelectedOption(value as 'new' | 'version')}
            className="space-y-3"
          >
            <div 
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedOption === 'new' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setSelectedOption('new')}
            >
              <RadioGroupItem value="new" id="new" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer font-medium">
                  <PackagePlus className="h-4 w-4 text-primary" />
                  Crea Nuovo Prodotto
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Prodotto separato con nuovo SKU, storico indipendente
                </p>
              </div>
            </div>

            <div 
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedOption === 'version' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setSelectedOption('version')}
            >
              <RadioGroupItem value="version" id="version" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="version" className="flex items-center gap-2 cursor-pointer font-medium">
                  <History className="h-4 w-4 text-primary" />
                  Storicizza (Versioning)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Mantiene lo storico collegato per report
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isPending}
            data-testid="button-cancel-identity"
          >
            Annulla
          </Button>
          <Button 
            onClick={handleApply}
            disabled={isPending}
            data-testid="button-apply-identity"
            style={{
              background: isPending ? 'hsl(var(--muted))' : 'hsl(var(--brand-orange))',
              color: 'white',
            }}
          >
            {isPending ? 'Applicazione...' : 'Applica'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
