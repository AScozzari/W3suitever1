import { CALENDAR_EVENT_TYPES } from '@/lib/calendar-event-types';

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
    <div className="relative group/indicator inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(eventType);
        }}
        className="relative flex items-center justify-center p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        style={{ color: config.color }}
        data-testid={`event-indicator-${eventType}`}
        title={tooltipText}
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
      <div 
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md shadow-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover/indicator:opacity-100 group-hover/indicator:visible transition-all duration-150 z-50 pointer-events-none"
        style={{ 
          backgroundColor: config.bgColor,
          color: config.color,
          borderColor: config.borderColor,
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        {tooltipText}
      </div>
    </div>
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
        <div className="relative group/hidden inline-block">
          <span 
            className="text-[9px] text-gray-500 font-medium cursor-default"
            title={`${hiddenCount} altri tipi evento`}
          >
            +{hiddenTotal}
          </span>
          <div 
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white rounded-md px-2 py-1 shadow-lg text-xs whitespace-nowrap opacity-0 invisible group-hover/hidden:opacity-100 group-hover/hidden:visible transition-all duration-150 z-50 pointer-events-none"
          >
            {hiddenCount} altri tipi evento
          </div>
        </div>
      )}
    </div>
  );
}
