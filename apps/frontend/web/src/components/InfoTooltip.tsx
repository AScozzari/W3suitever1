import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoTooltipProps {
  title: string;
  description: string;
  examples?: string[];
  notes?: string;
}

/**
 * 💡 InfoTooltip Component
 * 
 * Tooltip informativo con glassmorphism WindTre per spiegare configurazioni
 * con descrizioni, esempi pratici e note importanti.
 */
export function InfoTooltip({ title, description, examples, notes }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-4 ml-1.5 rounded-full bg-gradient-to-r from-windtre-orange/20 to-windtre-purple/20 hover:from-windtre-orange/30 hover:to-windtre-purple/30 transition-all duration-200 cursor-help"
            onClick={(e) => e.preventDefault()}
          >
            <Info className="h-3 w-3 text-windtre-orange" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          align="start"
          className="max-w-sm backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border-2 border-white/40 shadow-2xl p-4"
          sideOffset={8}
        >
          <div className="space-y-3">
            {/* Title */}
            <h4 className="font-semibold text-sm bg-gradient-to-r from-windtre-orange to-windtre-purple bg-clip-text text-transparent">
              {title}
            </h4>
            
            {/* Description */}
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {description}
            </p>
            
            {/* Examples */}
            {examples && examples.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  💡 Esempi:
                </p>
                <ul className="space-y-1">
                  {examples.map((example, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-windtre-orange/30">
                      <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
                        {example}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Notes */}
            {notes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ <strong>Nota:</strong> {notes}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
