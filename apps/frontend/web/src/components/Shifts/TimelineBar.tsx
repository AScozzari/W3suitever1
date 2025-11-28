import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface TimelineSegment {
  id: string;
  startTime: string;
  endTime: string;
  type: 'opening' | 'template' | 'gap' | 'resource' | 'shortage';
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
      else if (seg.type === 'template' || seg.type === 'gap') groups.template.push(seg);
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
                "absolute h-6 rounded cursor-pointer transition-all hover:opacity-80 hover:ring-2 hover:ring-white/50",
                "flex items-center justify-center text-[10px] text-white font-medium overflow-hidden"
              )}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 1)}%`,
                top: `${trackIndex * 28 + 4}px`,
                backgroundColor: bgColor,
              }}
              onClick={() => onSegmentClick?.(segment)}
              data-testid={`timeline-segment-${segment.id}`}
            >
              {width > 8 && (
                <span className="truncate px-1">
                  {segment.resourceName || segment.label || `${segment.startTime}-${segment.endTime}`}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-xs space-y-1">
              <p className="font-medium">{segment.label || segment.templateName || segment.type}</p>
              <p>{segment.startTime} - {segment.endTime}</p>
              {segment.resourceName && <p>Risorsa: {segment.resourceName}</p>}
              {segment.requiredStaff !== undefined && (
                <p>Staff: {segment.assignedStaff || 0}/{segment.requiredStaff}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn("bg-white rounded-lg border p-3", className)} data-testid={`timeline-day-${day}`}>
      <div className="flex items-center gap-3">
        <div className="w-28 text-sm font-medium text-gray-700 shrink-0">
          {dayLabel}
        </div>
        
        <div className="flex-1 relative">
          <div className="h-[90px] bg-gray-50 rounded relative overflow-hidden">
            <div className="absolute inset-0 flex">
              {hourMarkers.map(hour => {
                const left = minutesToPercent(hour * 60, startHour, endHour);
                return (
                  <div
                    key={hour}
                    className="absolute h-full border-l border-gray-200"
                    style={{ left: `${left}%` }}
                  >
                    <span className="absolute -top-0.5 -left-2 text-[9px] text-gray-400">
                      {hour}:00
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="absolute inset-x-0 top-4" style={{ height: '28px' }}>
              {groupedSegments.opening.map(seg => renderSegment(seg, 0))}
            </div>
            
            <div className="absolute inset-x-0 top-4" style={{ height: '28px', marginTop: '28px' }}>
              {groupedSegments.template.map(seg => renderSegment(seg, 0))}
            </div>
            
            <div className="absolute inset-x-0 top-4" style={{ height: '28px', marginTop: '56px' }}>
              {groupedSegments.resource.map(seg => renderSegment(seg, 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TimelineLegend() {
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.opening }} />
        <span>Apertura negozio</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.template }} />
        <span>Template turno</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.gap }} />
        <span>Gap non coperto</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.resource }} />
        <span>Risorsa assegnata</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.shortage }} />
        <span>Mancanza copertura</span>
      </div>
    </div>
  );
}
