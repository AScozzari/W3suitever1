import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface TimelineSegment {
  id: string;
  startTime: string;
  endTime: string;
  type: 'opening' | 'template' | 'gap' | 'resource' | 'shortage' | 'overflow';
  label?: string;
  color?: string;
  resourceName?: string;
  templateName?: string;
  requiredStaff?: number;
  assignedStaff?: number;
}

export interface TimelineLane {
  id: string;
  type: 'opening' | 'template' | 'gap' | 'resource' | 'shortage' | 'overflow';
  label: string;
  segments: TimelineSegment[];
}

interface TimelineBarProps {
  day: string;
  dayLabel: string;
  lanes: TimelineLane[];
  startHour?: number;
  endHour?: number;
  onSegmentClick?: (segment: TimelineSegment) => void;
  onDropResource?: (segment: TimelineSegment, resourceId: string) => void;
  className?: string;
}

const COLORS = {
  opening: '#ef4444',
  template: '#f97316',
  gap: '#eab308',
  resource: '#8b5cf6',
  shortage: '#6b7280',
  overflow: '#c026d3',
};

const COLOR_LABELS = {
  opening: 'Apertura negozio',
  template: 'Template turno',
  gap: 'Gap non coperto',
  resource: 'Risorsa assegnata',
  shortage: 'Mancanza copertura',
  overflow: 'Fuori orario negozio',
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

const minutesToPercent = (minutes: number, startHour: number, endHour: number): number => {
  const totalMinutes = (endHour - startHour) * 60;
  const offsetMinutes = minutes - startHour * 60;
  return Math.max(0, Math.min(100, (offsetMinutes / totalMinutes) * 100));
};

const LANE_HEIGHT = 44;
const HEADER_HEIGHT = 28;
const MIN_TOTAL_HEIGHT = 180;

export function TimelineBar({
  day,
  dayLabel,
  lanes,
  startHour = 6,
  endHour = 24,
  onSegmentClick,
  className
}: TimelineBarProps) {
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = startHour; h <= endHour; h += 2) {
      markers.push(h);
    }
    return markers;
  }, [startHour, endHour]);

  const totalHeight = useMemo(() => {
    const lanesHeight = lanes.length * LANE_HEIGHT + HEADER_HEIGHT;
    return Math.max(MIN_TOTAL_HEIGHT, lanesHeight);
  }, [lanes.length]);

  const renderSegment = (segment: TimelineSegment) => {
    const startMinutes = timeToMinutes(segment.startTime);
    const endMinutes = timeToMinutes(segment.endTime);
    const left = minutesToPercent(startMinutes, startHour, endHour);
    const width = minutesToPercent(endMinutes, startHour, endHour) - left;
    
    const bgColor = segment.color || COLORS[segment.type];
    
    return (
      <TooltipProvider key={segment.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute rounded-md cursor-pointer transition-all hover:opacity-90 hover:ring-2 hover:ring-white/60 shadow-sm",
                "flex items-center justify-center text-white font-semibold overflow-hidden"
              )}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 2)}%`,
                top: '4px',
                bottom: '4px',
                backgroundColor: bgColor,
              }}
              onClick={() => onSegmentClick?.(segment)}
              data-testid={`timeline-segment-${segment.id}`}
            >
              {width > 5 && (
                <span className="truncate px-2 text-[12px]">
                  {segment.resourceName || segment.label || `${segment.startTime.slice(0,5)}-${segment.endTime.slice(0,5)}`}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-gray-900 text-white border-gray-700">
            <div className="text-sm space-y-1.5 p-1">
              <p className="font-semibold text-base">{segment.label || segment.templateName || COLOR_LABELS[segment.type]}</p>
              <p className="text-gray-300 font-medium">{segment.startTime.slice(0,5)} - {segment.endTime.slice(0,5)}</p>
              {segment.resourceName && <p className="text-purple-300">Risorsa: {segment.resourceName}</p>}
              {segment.requiredStaff !== undefined && (
                <p className="text-orange-300">Staff: {segment.assignedStaff || 0}/{segment.requiredStaff}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderLane = (lane: TimelineLane, index: number) => {
    const laneColor = COLORS[lane.type];
    
    return (
      <div 
        key={lane.id}
        className="relative border-b border-gray-100 last:border-b-0"
        style={{ height: `${LANE_HEIGHT}px` }}
        data-testid={`timeline-lane-${lane.id}`}
      >
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
          style={{ backgroundColor: laneColor }}
        />
        
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-500 w-20 truncate z-10">
          {lane.label}
        </div>
        
        <div className="absolute left-24 right-2 top-0 bottom-0 relative">
          {lane.segments.map(seg => renderSegment(seg))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-4 shadow-sm", className)} data-testid={`timeline-day-${day}`}>
      <div className="flex items-start gap-4">
        <div className="w-28 pt-3 text-sm font-bold text-gray-800 shrink-0">
          {dayLabel}
        </div>
        
        <div className="flex-1 relative">
          <div 
            className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100"
            style={{ minHeight: `${totalHeight}px` }}
          >
            <div className="relative" style={{ height: `${HEADER_HEIGHT}px` }}>
              {hourMarkers.map(hour => {
                const left = minutesToPercent(hour * 60, startHour, endHour);
                return (
                  <div
                    key={hour}
                    className="absolute h-full"
                    style={{ left: `calc(96px + ${left}% * (100% - 96px - 8px) / 100)` }}
                  >
                    <span className="absolute top-1 -translate-x-1/2 text-[13px] font-bold text-gray-600 bg-gray-50 px-1">
                      {hour}:00
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="relative">
              {hourMarkers.map(hour => {
                const left = minutesToPercent(hour * 60, startHour, endHour);
                return (
                  <div
                    key={`grid-${hour}`}
                    className="absolute top-0 bottom-0 border-l border-gray-200/60"
                    style={{ 
                      left: `calc(96px + ${left}% * (100% - 96px - 8px) / 100)`,
                      height: `${lanes.length * LANE_HEIGHT}px`
                    }}
                  />
                );
              })}
              
              {lanes.map((lane, idx) => renderLane(lane, idx))}
              
              {lanes.length === 0 && (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
                  Nessun elemento da visualizzare
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TimelineLegend() {
  const legendItems = [
    { type: 'opening', label: 'Apertura negozio', color: COLORS.opening },
    { type: 'template', label: 'Template turno', color: COLORS.template },
    { type: 'gap', label: 'Gap non coperto', color: COLORS.gap },
    { type: 'overflow', label: 'Fuori orario', color: COLORS.overflow },
    { type: 'resource', label: 'Risorsa assegnata', color: COLORS.resource },
    { type: 'shortage', label: 'Mancanza copertura', color: COLORS.shortage },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Legenda Colori</h4>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {legendItems.map(item => (
          <div key={item.type} className="flex items-center gap-2">
            <div 
              className="w-5 h-5 rounded-md shadow-sm border border-black/10" 
              style={{ backgroundColor: item.color }} 
            />
            <span className="text-sm font-medium text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
