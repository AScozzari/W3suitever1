import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Clock, Users, AlertTriangle } from 'lucide-react';

export interface TimelineSegment {
  id: string;
  startTime: string;
  endTime: string;
  type: 'opening' | 'template' | 'gap' | 'resource' | 'shortage' | 'overflow';
  label?: string;
  color?: string;
  resourceName?: string;
  templateName?: string;
  templateId?: string;
  slotId?: string;
  requiredStaff?: number;
  assignedStaff?: number;
}

export interface TimelineLane {
  id: string;
  type: 'opening' | 'template' | 'gap' | 'resource' | 'shortage' | 'overflow';
  label: string;
  segments: TimelineSegment[];
  templateId?: string;
  slotId?: string;
  isDropTarget?: boolean;
}

interface TimelineBarProps {
  day: string;
  dayLabel: string;
  lanes: TimelineLane[];
  startHour?: number;
  endHour?: number;
  onSegmentClick?: (segment: TimelineSegment) => void;
  className?: string;
}

const COLORS = {
  opening: '#ef4444',
  template: '#f97316',
  gap: '#eab308',
  resource: '#22c55e',
  shortage: '#6b7280',
  overflow: '#7c3aed',
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
  if (!time || typeof time !== 'string') return 0;
  const parts = time.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

const minutesToPercent = (minutes: number, startHour: number, endHour: number): number => {
  const totalMinutes = (endHour - startHour) * 60;
  const offsetMinutes = minutes - startHour * 60;
  return Math.max(0, Math.min(100, (offsetMinutes / totalMinutes) * 100));
};

const LANE_HEIGHT = 44;
const MIN_TOTAL_HEIGHT = 140;

interface TooltipState {
  segment: TimelineSegment | null;
  x: number;
  y: number;
}

export function TimelineBar({
  day,
  dayLabel,
  lanes,
  startHour = 6,
  endHour = 24,
  onSegmentClick,
  className
}: TimelineBarProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({ segment: null, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = startHour; h <= endHour; h += 2) {
      markers.push(h);
    }
    return markers;
  }, [startHour, endHour]);

  const totalHeight = useMemo(() => {
    const lanesHeight = lanes.length * LANE_HEIGHT + 32;
    return Math.max(MIN_TOTAL_HEIGHT, lanesHeight);
  }, [lanes.length]);

  const handleMouseEnter = useCallback((segment: TimelineSegment, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      segment,
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip({ segment: null, x: 0, y: 0 });
  }, []);

  useEffect(() => {
    return () => {
      setTooltip({ segment: null, x: 0, y: 0 });
    };
  }, []);

  const renderSegment = (segment: TimelineSegment, laneType: string) => {
    const startMinutes = timeToMinutes(segment.startTime);
    const endMinutes = timeToMinutes(segment.endTime);
    const left = minutesToPercent(startMinutes, startHour, endHour);
    const width = minutesToPercent(endMinutes, startHour, endHour) - left;
    
    const bgColor = segment.color || COLORS[segment.type];
    
    const isShortage = segment.type === 'shortage';
    const isResource = segment.type === 'resource';
    
    return (
      <div
        key={segment.id}
        className={cn(
          "absolute rounded-md transition-all duration-200 cursor-pointer",
          "flex items-center justify-center overflow-hidden",
          isShortage && "border-2 border-dashed border-gray-400 bg-gray-100",
          isResource && "shadow-md ring-1 ring-white/50",
          !isShortage && !isResource && "shadow-sm",
          "hover:brightness-110 hover:scale-[1.02]"
        )}
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 3)}%`,
          top: '6px',
          bottom: '6px',
          backgroundColor: isShortage ? 'transparent' : bgColor,
        }}
        onClick={() => onSegmentClick?.(segment)}
        onMouseEnter={(e) => handleMouseEnter(segment, e)}
        onMouseLeave={handleMouseLeave}
        data-testid={`timeline-segment-${segment.id}`}
      >
        {width > 6 && (
          <span className={cn(
            "truncate px-1.5 text-[10px] font-medium",
            isShortage ? "text-gray-600" : "text-white"
          )}>
            {isResource && <User className="w-2.5 h-2.5 inline mr-0.5" />}
            {isShortage && <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />}
            {segment.resourceName || segment.label || `${segment.startTime}-${segment.endTime}`}
          </span>
        )}
      </div>
    );
  };

  const renderLane = (lane: TimelineLane, index: number) => {
    const laneColor = COLORS[lane.type];
    
    return (
      <div 
        key={lane.id}
        className="flex items-stretch border-b border-gray-100 last:border-b-0"
        style={{ height: `${LANE_HEIGHT}px` }}
        data-testid={`timeline-lane-${lane.id}`}
      >
        <div 
          className="w-1 shrink-0 rounded-l"
          style={{ backgroundColor: laneColor }}
        />
        
        <div className="w-24 shrink-0 flex items-center px-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {lane.type === 'resource' && (
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <User className="w-2.5 h-2.5 text-green-600" />
              </div>
            )}
            <span className={cn(
              "text-[10px] font-medium truncate",
              lane.type === 'resource' ? "text-green-700" : "text-gray-600"
            )}>
              {lane.label}
            </span>
          </div>
        </div>
        
        <div className="flex-1 relative">
          {lane.segments.map(seg => renderSegment(seg, lane.type))}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={cn("bg-white rounded-lg border border-gray-200 shadow-sm relative", className)} 
      data-testid={`timeline-day-${day}`}
    >
      <div className="flex items-stretch">
        <div className="w-20 p-3 flex flex-col justify-center border-r border-gray-100 bg-gray-50/50 rounded-l-lg">
          <p className="text-xs font-bold text-gray-800 leading-tight">
            {dayLabel}
          </p>
          {lanes.length > 0 && (
            <Badge variant="outline" className="mt-1 text-[9px] w-fit h-4 px-1">
              {lanes.filter(l => l.type === 'template').length} fasce
            </Badge>
          )}
        </div>
        
        <div className="flex-1 p-1.5">
          <div 
            className="bg-gray-50 rounded-md overflow-hidden border border-gray-100"
            style={{ minHeight: `${totalHeight}px` }}
          >
            <div className="flex items-center border-b border-gray-200 h-7 bg-white/50">
              <div className="w-1 shrink-0" />
              <div className="w-24 shrink-0" />
              <div className="flex-1 relative h-full">
                {hourMarkers.map(hour => {
                  const left = minutesToPercent(hour * 60, startHour, endHour);
                  return (
                    <div
                      key={hour}
                      className="absolute h-full flex items-center"
                      style={{ left: `${left}%` }}
                    >
                      <span className="text-[9px] font-semibold text-gray-500 -translate-x-1/2 bg-white/80 px-1 rounded">
                        {hour}:00
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="relative">
              {lanes.map((lane, idx) => (
                <div key={lane.id} className="relative">
                  {hourMarkers.map(hour => {
                    const left = minutesToPercent(hour * 60, startHour, endHour);
                    return (
                      <div
                        key={`grid-${hour}-${lane.id}`}
                        className="absolute border-l border-gray-200/40"
                        style={{ 
                          left: `calc(100px + ${left}% * (100% - 100px) / 100%)`,
                          top: 0,
                          height: `${LANE_HEIGHT}px`
                        }}
                      />
                    );
                  })}
                  {renderLane(lane, idx)}
                </div>
              ))}
              
              {lanes.length === 0 && (
                <div className="flex items-center justify-center h-24 text-gray-400">
                  <div className="text-center">
                    <Clock className="w-6 h-6 mx-auto mb-1 opacity-30" />
                    <p className="text-xs">Nessun template selezionato</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {tooltip.segment && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-gray-900 text-white rounded-md px-3 py-2 shadow-xl border border-gray-700">
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                {tooltip.segment.label || tooltip.segment.templateName || COLOR_LABELS[tooltip.segment.type]}
              </p>
              <div className="flex items-center gap-1.5 text-gray-300">
                <Clock className="w-3 h-3" />
                <span>{tooltip.segment.startTime} - {tooltip.segment.endTime}</span>
              </div>
              {tooltip.segment.resourceName && (
                <div className="flex items-center gap-1.5 text-green-300">
                  <User className="w-3 h-3" />
                  <span>{tooltip.segment.resourceName}</span>
                </div>
              )}
              {tooltip.segment.requiredStaff !== undefined && (
                <div className="flex items-center gap-1.5 text-orange-300">
                  <Users className="w-3 h-3" />
                  <span>Staff: {tooltip.segment.assignedStaff || 0}/{tooltip.segment.requiredStaff}</span>
                </div>
              )}
            </div>
            <div 
              className="absolute left-1/2 -bottom-1 w-2 h-2 bg-gray-900 border-r border-b border-gray-700 transform -translate-x-1/2 rotate-45"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelineLegend() {
  const legendItems = [
    { type: 'opening', label: 'Apertura', color: COLORS.opening },
    { type: 'template', label: 'Template', color: COLORS.template },
    { type: 'gap', label: 'Gap', color: COLORS.gap },
    { type: 'overflow', label: 'Overflow', color: COLORS.overflow },
    { type: 'resource', label: 'Risorsa', color: COLORS.resource },
    { type: 'shortage', label: 'Mancanza', color: COLORS.shortage },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {legendItems.map(item => (
          <div key={item.type} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: item.color }} 
            />
            <span className="text-[10px] font-medium text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
