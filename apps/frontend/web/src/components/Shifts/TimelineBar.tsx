import { useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  onDropResource?: (templateId: string, slotId: string, day: string) => void;
  isDragging?: boolean;
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

const LANE_HEIGHT = 52;
const MIN_TOTAL_HEIGHT = 180;

export function TimelineBar({
  day,
  dayLabel,
  lanes,
  startHour = 6,
  endHour = 24,
  onSegmentClick,
  onDropResource,
  isDragging = false,
  className
}: TimelineBarProps) {
  const [hoveredLane, setHoveredLane] = useState<string | null>(null);
  
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = startHour; h <= endHour; h += 2) {
      markers.push(h);
    }
    return markers;
  }, [startHour, endHour]);

  const totalHeight = useMemo(() => {
    const lanesHeight = lanes.length * LANE_HEIGHT + 36;
    return Math.max(MIN_TOTAL_HEIGHT, lanesHeight);
  }, [lanes.length]);

  const renderSegment = (segment: TimelineSegment, laneType: string) => {
    const startMinutes = timeToMinutes(segment.startTime);
    const endMinutes = timeToMinutes(segment.endTime);
    const left = minutesToPercent(startMinutes, startHour, endHour);
    const width = minutesToPercent(endMinutes, startHour, endHour) - left;
    
    const bgColor = segment.color || COLORS[segment.type];
    
    const isShortage = segment.type === 'shortage';
    const isResource = segment.type === 'resource';
    
    return (
      <TooltipProvider key={segment.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute rounded-lg cursor-pointer transition-all duration-200",
                "flex items-center justify-center overflow-hidden",
                isShortage && "border-2 border-dashed border-gray-400 bg-gray-100",
                isResource && "shadow-lg ring-2 ring-white/50",
                !isShortage && !isResource && "shadow-md",
                "hover:scale-[1.02] hover:shadow-lg hover:z-10"
              )}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 3)}%`,
                top: '8px',
                bottom: '8px',
                backgroundColor: isShortage ? 'transparent' : bgColor,
              }}
              onClick={() => onSegmentClick?.(segment)}
              data-testid={`timeline-segment-${segment.id}`}
            >
              {width > 6 && (
                <span className={cn(
                  "truncate px-2 text-[11px] font-semibold",
                  isShortage ? "text-gray-600" : "text-white"
                )}>
                  {isResource && <User className="w-3 h-3 inline mr-1" />}
                  {isShortage && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                  {segment.resourceName || segment.label || `${segment.startTime}-${segment.endTime}`}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-gray-900 text-white border-gray-700 z-50">
            <div className="text-sm space-y-1.5 p-1">
              <p className="font-semibold text-base">{segment.label || segment.templateName || COLOR_LABELS[segment.type]}</p>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-3 h-3" />
                <span>{segment.startTime} - {segment.endTime}</span>
              </div>
              {segment.resourceName && (
                <div className="flex items-center gap-2 text-purple-300">
                  <User className="w-3 h-3" />
                  <span>{segment.resourceName}</span>
                </div>
              )}
              {segment.requiredStaff !== undefined && (
                <div className="flex items-center gap-2 text-orange-300">
                  <Users className="w-3 h-3" />
                  <span>Staff: {segment.assignedStaff || 0}/{segment.requiredStaff}</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderLane = (lane: TimelineLane, index: number) => {
    const laneColor = COLORS[lane.type];
    const isDropTarget = lane.type === 'template' || lane.type === 'shortage';
    const isHovered = hoveredLane === lane.id;
    
    return (
      <div 
        key={lane.id}
        className={cn(
          "flex items-stretch border-b border-gray-100 last:border-b-0 transition-all duration-200",
          isDragging && isDropTarget && "bg-primary/5",
          isHovered && isDragging && isDropTarget && "bg-primary/10 ring-2 ring-primary ring-inset"
        )}
        style={{ height: `${LANE_HEIGHT}px` }}
        data-testid={`timeline-lane-${lane.id}`}
        onDragOver={(e) => {
          if (isDropTarget) {
            e.preventDefault();
            setHoveredLane(lane.id);
          }
        }}
        onDragLeave={() => setHoveredLane(null)}
        onDrop={(e) => {
          e.preventDefault();
          setHoveredLane(null);
          if (isDropTarget && lane.templateId && lane.slotId) {
            onDropResource?.(lane.templateId, lane.slotId, day);
          }
        }}
      >
        <div 
          className="w-1.5 shrink-0 rounded-l"
          style={{ backgroundColor: laneColor }}
        />
        
        <div className="w-28 shrink-0 flex items-center px-3">
          <div className="flex items-center gap-2 min-w-0">
            {lane.type === 'resource' && (
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-purple-600" />
              </div>
            )}
            <span className={cn(
              "text-[11px] font-medium truncate",
              lane.type === 'resource' ? "text-purple-700" : "text-gray-600"
            )}>
              {lane.label}
            </span>
          </div>
        </div>
        
        <div className="flex-1 relative">
          {lane.segments.map(seg => renderSegment(seg, lane.type))}
          
          {isDragging && isDropTarget && (
            <div className="absolute inset-2 border-2 border-dashed border-primary/40 rounded-lg flex items-center justify-center pointer-events-none">
              {isHovered && (
                <span className="text-xs font-medium text-primary bg-white/90 px-2 py-1 rounded">
                  Rilascia qui
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-xl border-2 transition-all duration-200",
        isDragging ? "border-primary/30 shadow-lg" : "border-gray-100 shadow-sm",
        className
      )} 
      data-testid={`timeline-day-${day}`}
    >
      <div className="flex items-stretch">
        <div className="w-28 p-4 flex flex-col justify-center border-r border-gray-100 bg-gray-50/50 rounded-l-xl">
          <p className="text-sm font-bold text-gray-800 leading-tight">
            {dayLabel}
          </p>
          {lanes.length > 0 && (
            <Badge variant="outline" className="mt-2 text-[10px] w-fit">
              {lanes.filter(l => l.type === 'template').length} fasce
            </Badge>
          )}
        </div>
        
        <div className="flex-1 p-2">
          <div 
            className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100"
            style={{ minHeight: `${totalHeight}px` }}
          >
            <div className="flex items-center border-b border-gray-200 h-9 bg-white/50">
              <div className="w-1.5 shrink-0" />
              <div className="w-28 shrink-0" />
              <div className="flex-1 relative h-full">
                {hourMarkers.map(hour => {
                  const left = minutesToPercent(hour * 60, startHour, endHour);
                  return (
                    <div
                      key={hour}
                      className="absolute h-full flex items-center"
                      style={{ left: `${left}%` }}
                    >
                      <span className="text-[11px] font-bold text-gray-500 -translate-x-1/2 bg-white/80 px-1.5 py-0.5 rounded">
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
                          left: `calc(118px + ${left}% * (100% - 118px) / 100%)`,
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
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <div className="text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Seleziona template per vedere la timeline</p>
                  </div>
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
    { type: 'opening', label: 'Apertura negozio', color: COLORS.opening, icon: '🏪' },
    { type: 'template', label: 'Template turno', color: COLORS.template, icon: '📋' },
    { type: 'gap', label: 'Gap non coperto', color: COLORS.gap, icon: '⚠️' },
    { type: 'overflow', label: 'Fuori orario', color: COLORS.overflow, icon: '🚫' },
    { type: 'resource', label: 'Risorsa assegnata', color: COLORS.resource, icon: '👤' },
    { type: 'shortage', label: 'Mancanza staff', color: COLORS.shortage, icon: '❓' },
  ];

  return (
    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-xs">🎨</span>
        Legenda Colori
      </h4>
      <div className="flex flex-wrap items-center gap-4">
        {legendItems.map(item => (
          <div key={item.type} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
            <div 
              className="w-4 h-4 rounded-md shadow-sm" 
              style={{ backgroundColor: item.color }} 
            />
            <span className="text-xs font-medium text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
