import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
  const [selectedOption, setSelectedOption] = useState<'correction' | 'business_change'>('business_change');

  const handleApply = () => {
    onConfirm(selectedOption);
  };

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
          
          <p className="text-sm text-muted-foreground mb-4">
            Come vuoi gestire questa modifica?
          </p>

          <RadioGroup 
            value={selectedOption} 
            onValueChange={(value) => setSelectedOption(value as 'correction' | 'business_change')}
            className="space-y-3"
          >
            <div 
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedOption === 'correction' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setSelectedOption('correction')}
            >
              <RadioGroupItem value="correction" id="correction" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="correction" className="flex items-center gap-2 cursor-pointer font-medium">
                  <FileEdit className="h-4 w-4 text-primary" />
                  Correzione
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Corregge un errore, non crea storico
                </p>
              </div>
            </div>

            <div 
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedOption === 'business_change' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setSelectedOption('business_change')}
            >
              <RadioGroupItem value="business_change" id="business_change" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="business_change" className="flex items-center gap-2 cursor-pointer font-medium">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Variazione Commerciale
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Storicizza versione precedente per report
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
            data-testid="button-cancel-versioning"
          >
            Annulla
          </Button>
          <Button 
            onClick={handleApply}
            disabled={isPending}
            data-testid="button-apply-versioning"
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
