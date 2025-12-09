import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export function VersioningInfoTooltip() {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className="inline-flex items-center justify-center rounded-full w-5 h-5 bg-muted hover:bg-muted/80 transition-colors"
            data-testid="versioning-info-tooltip"
          >
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs p-3">
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold">Versioning vs Nuovo Prodotto</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>Modifiche a prezzi/canone creano una nuova <strong>versione</strong> dello stesso prodotto</li>
              <li>Lo storico rimane collegato per report e analisi</li>
              <li>Se cambi SKU, EAN o Tipo puoi scegliere se creare un <strong>nuovo prodotto</strong> o storicizzare</li>
              <li>Un nuovo prodotto avrà codici separati e non condivide lo storico</li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
