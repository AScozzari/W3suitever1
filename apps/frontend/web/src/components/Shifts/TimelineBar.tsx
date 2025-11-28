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

interface TimelineBarProps {
  day: string;
  dayLabel: string;
  segments: TimelineSegment[];
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

const BAR_HEIGHT = 18;
const TRACK_HEIGHT = 22;
const TOTAL_HEIGHT = TRACK_HEIGHT * 3 + 28;

export function TimelineBar({
  day,
  dayLabel,
  segments,
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

  const groupedSegments = useMemo(() => {
    const groups: Record<string, TimelineSegment[]> = {
      opening: [],
      template: [],
      resource: [],
    };
    
    segments.forEach(seg => {
      if (seg.type === 'opening') groups.opening.push(seg);
      else if (seg.type === 'template' || seg.type === 'gap' || seg.type === 'overflow') groups.template.push(seg);
      else if (seg.type === 'resource' || seg.type === 'shortage') groups.resource.push(seg);
    });
    
    return groups;
  }, [segments]);

  const renderSegment = (segment: TimelineSegment, trackIndex: number) => {
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
                "flex items-center justify-center text-xs text-white font-semibold overflow-hidden"
              )}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 1.5)}%`,
                top: `${trackIndex * TRACK_HEIGHT + 2}px`,
                height: `${BAR_HEIGHT}px`,
                backgroundColor: bgColor,
              }}
              onClick={() => onSegmentClick?.(segment)}
              data-testid={`timeline-segment-${segment.id}`}
            >
              {width > 6 && (
                <span className="truncate px-1.5 text-[11px]">
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

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-4 shadow-sm", className)} data-testid={`timeline-day-${day}`}>
      <div className="flex items-center gap-4">
        <div className="w-32 text-sm font-semibold text-gray-800 shrink-0">
          {dayLabel}
        </div>
        
        <div className="flex-1 relative">
          <div className="bg-gray-50 rounded-lg relative overflow-hidden border border-gray-100" style={{ height: `${TOTAL_HEIGHT}px` }}>
            <div className="absolute inset-0 flex">
              {hourMarkers.map(hour => {
                const left = minutesToPercent(hour * 60, startHour, endHour);
                return (
                  <div
                    key={hour}
                    className="absolute h-full border-l border-gray-200/80"
                    style={{ left: `${left}%` }}
                  >
                    <span className="absolute top-1 -translate-x-1/2 text-[12px] font-semibold text-gray-500 bg-gray-50 px-0.5">
                      {hour}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="absolute inset-x-2 top-6" style={{ height: `${TRACK_HEIGHT}px` }}>
              {groupedSegments.opening.map(seg => renderSegment(seg, 0))}
            </div>
            
            <div className="absolute inset-x-2" style={{ height: `${TRACK_HEIGHT}px`, top: `${TRACK_HEIGHT + 8}px` }}>
              {groupedSegments.template.map(seg => renderSegment(seg, 0))}
            </div>
            
            <div className="absolute inset-x-2" style={{ height: `${TRACK_HEIGHT}px`, top: `${TRACK_HEIGHT * 2 + 10}px` }}>
              {groupedSegments.resource.map(seg => renderSegment(seg, 0))}
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
