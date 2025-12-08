import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
  addMonths,
  differenceInDays,
  isSameDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Euro } from 'lucide-react';

interface Deal {
  id: string;
  ownerUserId: string;
  estimatedValue?: number | null;
  probability?: number | null;
  wonAt?: string | null;
  createdAt: string;
  stage: string;
  customerId?: string | null;
}

interface DealsGanttProps {
  pipelineId: string;
}

type ZoomLevel = 'week' | 'month' | 'quarter';

// Helper: Format currency
const formatCurrency = (value?: number | null): string => {
  if (!value) return '€0';
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`;
  return `€${value.toFixed(0)}`;
};

// Helper: Get bar color based on value
const getValueColor = (value?: number | null): string => {
  if (!value) return 'bg-gray-400';
  if (value >= 100000) return 'bg-gradient-to-r from-green-500 to-emerald-600';
  if (value >= 50000) return 'bg-gradient-to-r from-blue-500 to-cyan-600';
  if (value >= 10000) return 'bg-gradient-to-r from-purple-500 to-violet-600';
  return 'bg-gradient-to-r from-orange-400 to-amber-500';
};

export default function DealsGantt({ pipelineId }: DealsGanttProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');

  // Fetch deals
  const { data: dealsData, isLoading } = useQuery<Deal[]>({
    queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`],
  });

  const deals = dealsData || [];

  const { timelineUnits, visibleDeals, unitWidth } = useMemo(() => {
    let start: Date;
    let end: Date;
    let units: Date[];
    let width: number;

    if (zoomLevel === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
      units = eachDayOfInterval({ start, end });
      width = 80;
    } else if (zoomLevel === 'month') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
      units = eachDayOfInterval({ start, end });
      width = 48;
    } else {
      start = startOfQuarter(currentDate);
      end = endOfQuarter(currentDate);
      units = eachWeekOfInterval({ start, end });
      width = 60;
    }

    const dealsWithDates = deals.map((deal) => ({
      ...deal,
      startDate: new Date(deal.createdAt),
      endDate: deal.wonAt ? new Date(deal.wonAt) : addDays(new Date(deal.createdAt), 30),
    }));

    return {
      timelineUnits: units,
      visibleDeals: dealsWithDates,
      unitWidth: width,
    };
  }, [deals, currentDate, zoomLevel]);

  const getDealPosition = (deal: typeof visibleDeals[0]) => {
    const timelineStart = timelineUnits[0];
    const startDay = differenceInDays(deal.startDate, timelineStart);
    const duration = differenceInDays(deal.endDate, deal.startDate) + 1;

    return {
      left: Math.max(0, startDay),
      width: duration,
      isVisible: startDay < timelineUnits.length && startDay + duration > 0,
    };
  };

  const handlePrev = () => {
    if (zoomLevel === 'week') {
      setCurrentDate((prev) => addDays(prev, -7));
    } else if (zoomLevel === 'month') {
      setCurrentDate((prev) => addMonths(prev, -1));
    } else {
      setCurrentDate((prev) => addMonths(prev, -3));
    }
  };

  const handleNext = () => {
    if (zoomLevel === 'week') {
      setCurrentDate((prev) => addDays(prev, 7));
    } else if (zoomLevel === 'month') {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else {
      setCurrentDate((prev) => addMonths(prev, 3));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Caricamento deals...</div>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Timeline Deals</h2>
          <p className="text-sm text-muted-foreground">Visualizza la distribuzione temporale delle opportunità</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Zoom Level */}
          <Select value={zoomLevel} onValueChange={(v) => setZoomLevel(v as ZoomLevel)}>
            <SelectTrigger className="w-[140px]" data-testid="select-zoom-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Settimana</SelectItem>
              <SelectItem value="month">Mese</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>

          {/* Navigation */}
          <Button variant="outline" size="sm" onClick={handlePrev} data-testid="button-prev-period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
            Oggi
          </Button>
          <div className="px-4 py-2 glass-card border-0 rounded-lg font-bold text-sm">
            {zoomLevel === 'week' && format(currentDate, 'wo \'settimana\' yyyy', { locale: it })}
            {zoomLevel === 'month' && format(currentDate, 'MMMM yyyy', { locale: it })}
            {zoomLevel === 'quarter' && `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`}
          </div>
          <Button variant="outline" size="sm" onClick={handleNext} data-testid="button-next-period">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card className="flex-1 border-0 glass-card overflow-hidden flex flex-col">
        {/* Timeline Header */}
        <div className="flex border-b border-border/50">
          <div className="w-64 p-3 font-semibold text-sm border-r border-border/50 flex-shrink-0">Deal</div>
          <div className="flex-1 flex overflow-x-auto">
            {timelineUnits.map((unit, index) => {
              const isToday =
                zoomLevel === 'week' || zoomLevel === 'month' ? isSameDay(unit, today) : false;
              const isWeekend =
                zoomLevel === 'week' || zoomLevel === 'month'
                  ? unit.getDay() === 0 || unit.getDay() === 6
                  : false;

              return (
                <div
                  key={index}
                  className={cn(
                    'flex-shrink-0 p-2 text-center border-r border-border/50',
                    isWeekend && 'bg-muted/30',
                    isToday && 'bg-windtre-orange/10 border-windtre-orange'
                  )}
                  style={{ width: `${unitWidth}px` }}
                  data-testid={`gantt-unit-${index}`}
                >
                  <div className={cn('text-xs font-medium', isToday && 'text-windtre-orange')}>
                    {zoomLevel === 'quarter'
                      ? format(unit, 'wo', { locale: it })
                      : format(unit, 'EEE', { locale: it })}
                  </div>
                  <div className={cn('text-xs', isToday && 'text-windtre-orange font-bold')}>
                    {zoomLevel === 'quarter' ? '' : format(unit, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Rows */}
        <div className="flex-1 overflow-y-auto">
          {visibleDeals.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nessun deal in questa timeline
            </div>
          ) : (
            visibleDeals.map((deal) => {
              const position = getDealPosition(deal);
              if (!position.isVisible) return null;

              const barColor = getValueColor(deal.estimatedValue);

              return (
                <div
                  key={deal.id}
                  className="flex border-b border-border/50 hover:bg-muted/30 group transition-all"
                  data-testid={`gantt-row-${deal.id}`}
                >
                  <div className="w-64 p-3 border-r border-border/50 flex-shrink-0 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {deal.customerId ? `Cliente ${deal.customerId.slice(0, 8)}` : `Deal ${deal.id.slice(0, 8)}`}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(deal.estimatedValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 relative" style={{ height: '60px' }}>
                    {/* Grid background */}
                    <div className="absolute inset-0 flex">
                      {timelineUnits.map((_, index) => (
                        <div
                          key={index}
                          className="flex-shrink-0 border-r border-border/50"
                          style={{ width: `${unitWidth}px` }}
                        />
                      ))}
                    </div>

                    {/* Deal bar */}
                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer',
                        'transition-all group-hover:shadow-lg border-2 border-windtre-orange/20',
                        barColor
                      )}
                      style={{
                        left: `${position.left * unitWidth}px`,
                        width: `${position.width * unitWidth}px`,
                        minWidth: `${unitWidth}px`,
                      }}
                      data-testid={`gantt-bar-${deal.id}`}
                    >
                      <div className="px-2 py-1 text-xs text-white font-medium truncate">
                        {formatCurrency(deal.estimatedValue)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded"></div>
          <span className="text-muted-foreground">&gt;€100k</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded"></div>
          <span className="text-muted-foreground">€50k-€100k</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded"></div>
          <span className="text-muted-foreground">€10k-€50k</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-amber-500 rounded"></div>
          <span className="text-muted-foreground">&lt;€10k</span>
        </div>
      </div>
    </div>
  );
}
