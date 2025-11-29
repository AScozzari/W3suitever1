import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CALENDAR_EVENT_TYPES, type CalendarEventType } from '@/lib/calendar-event-types';

interface EventIndicatorProps {
  eventType: string;
  count: number;
  onClick: (eventType: string) => void;
}

export function CalendarEventIndicator({ eventType, count, onClick }: EventIndicatorProps) {
  const config = CALENDAR_EVENT_TYPES[eventType];
  
  if (!config || count === 0) return null;
  
  const Icon = config.icon;
  const tooltipText = count === 1 
    ? `1 ${config.label}` 
    : `${count} ${config.labelPlural}`;
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(eventType);
            }}
            className="relative flex items-center justify-center p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer group"
            style={{ color: config.color }}
            data-testid={`event-indicator-${eventType}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {count > 0 && (
              <span 
                className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold rounded-full text-white"
                style={{ backgroundColor: config.color }}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="text-xs px-2 py-1"
          style={{ 
            backgroundColor: config.bgColor,
            color: config.color,
            borderColor: config.borderColor,
          }}
        >
          <span className="font-medium">{tooltipText}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface DayCellIndicatorsProps {
  eventCounts: Record<string, number>;
  onEventTypeClick: (eventType: string) => void;
}

export function DayCellIndicators({ eventCounts, onEventTypeClick }: DayCellIndicatorsProps) {
  const activeTypes = Object.entries(eventCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (activeTypes.length === 0) return null;
  
  const visibleTypes = activeTypes.slice(0, 4);
  const hiddenCount = activeTypes.length - 4;
  const hiddenTotal = activeTypes.slice(4).reduce((sum, [, count]) => sum + count, 0);
  
  return (
    <div className="flex items-center gap-1 flex-wrap justify-center">
      {visibleTypes.map(([eventType, count]) => (
        <CalendarEventIndicator
          key={eventType}
          eventType={eventType}
          count={count}
          onClick={onEventTypeClick}
        />
      ))}
      {hiddenCount > 0 && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[9px] text-gray-500 font-medium cursor-default">
                +{hiddenTotal}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span>{hiddenCount} altri tipi evento</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
