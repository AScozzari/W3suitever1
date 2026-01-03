import { Check, CheckCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReadStatus } from '@/hooks/useChatFeatures';

interface ReadReceiptIndicatorProps {
  status: ReadStatus;
  showTooltip?: boolean;
}

export function ReadReceiptIndicator({ status, showTooltip = true }: ReadReceiptIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'sent': return 'Inviato';
      case 'delivered': return 'Consegnato';
      case 'read': return 'Letto';
      default: return '';
    }
  };

  const icon = getIcon();
  if (!icon) return null;

  if (!showTooltip) {
    return <span data-testid="read-receipt-indicator">{icon}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span data-testid="read-receipt-indicator" className="inline-flex">{icon}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getLabel()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
