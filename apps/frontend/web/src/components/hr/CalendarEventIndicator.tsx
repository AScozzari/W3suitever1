import { useState, useCallback } from 'react';
import { CALENDAR_EVENT_TYPES, type CalendarEventType } from '@/lib/calendar-event-types';

interface EventIndicatorProps {
  eventType: string;
  count: number;
  onClick: (eventType: string) => void;
}

interface TooltipState {
  visible: boolean;
  text: string;
  color: string;
  bgColor: string;
  borderColor: string;
  x: number;
  y: number;
}

export function CalendarEventIndicator({ eventType, count, onClick }: EventIndicatorProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const config = CALENDAR_EVENT_TYPES[eventType];
  
  if (!config || count === 0) return null;
  
  const Icon = config.icon;
  const tooltipText = count === 1 
    ? `1 ${config.label}` 
    : `${count} ${config.labelPlural}`;

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      text: tooltipText,
      color: config.color,
      bgColor: config.bgColor,
      borderColor: config.borderColor,
      x: rect.left + rect.width / 2,
      y: rect.top - 4
    });
  }, [tooltipText, config]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);
  
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(eventType);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div 
            className="rounded-md px-2 py-1 shadow-lg text-xs font-medium"
            style={{ 
              backgroundColor: tooltip.bgColor,
              color: tooltip.color,
              borderColor: tooltip.borderColor,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            {tooltip.text}
          </div>
        </div>
      )}
    </>
  );
}

interface DayCellIndicatorsProps {
  eventCounts: Record<string, number>;
  onEventTypeClick: (eventType: string) => void;
}

export function DayCellIndicators({ eventCounts, onEventTypeClick }: DayCellIndicatorsProps) {
  const [hiddenTooltip, setHiddenTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  
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
        <>
          <span 
            className="text-[9px] text-gray-500 font-medium cursor-default"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHiddenTooltip({
                x: rect.left + rect.width / 2,
                y: rect.top - 4,
                text: `${hiddenCount} altri tipi evento`
              });
            }}
            onMouseLeave={() => setHiddenTooltip(null)}
          >
            +{hiddenTotal}
          </span>
          {hiddenTooltip && (
            <div
              className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100"
              style={{
                left: `${hiddenTooltip.x}px`,
                top: `${hiddenTooltip.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="bg-gray-900 text-white rounded-md px-2 py-1 shadow-lg text-xs">
                {hiddenTooltip.text}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
