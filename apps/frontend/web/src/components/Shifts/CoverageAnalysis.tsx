import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, Users, Clock, Activity, Calendar } from 'lucide-react';
import { format, eachDayOfInterval, eachHourOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  date: string;
  startTime: string | Date;
  endTime: string | Date;
  requiredStaff: number;
  assignedUsers: string[];
}

interface Props {
  storeId: string;
  dateRange: { start: Date; end: Date };
  shifts: Shift[];
}

type ViewType = 'heatmap' | 'timeline' | 'metrics';

export default function CoverageAnalysis({
  storeId,
  dateRange,
  shifts
}: Props) {
  const [viewType, setViewType] = useState<ViewType>('heatmap');
  const [selectedMetric, setSelectedMetric] = useState<'coverage' | 'staff' | 'demand'>('coverage');
  
  // Calculate hourly coverage data
  const coverageData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const data = new Map<string, { required: number; assigned: number; coverage: number }>();
    
    // Initialize all cells
    days.forEach(day => {
      hours.forEach(hour => {
        const key = `${format(day, 'yyyy-MM-dd')}_${hour}`;
        data.set(key, { required: 0, assigned: 0, coverage: 100 });
      });
    });
    
    // Process shifts
    shifts.forEach(shift => {
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      const startHour = startTime.getHours();
      const endHour = endTime.getHours() || 24;
      
      for (let hour = startHour; hour < endHour; hour++) {
        const key = `${shift.date}_${hour}`;
        const existing = data.get(key) || { required: 0, assigned: 0, coverage: 100 };
        
        existing.required += shift.requiredStaff;
        existing.assigned += shift.assignedUsers.length;
        existing.coverage = existing.required > 0 
          ? (existing.assigned / existing.required) * 100 
          : 100;
        
        data.set(key, existing);
      }
    });
    
    return data;
  }, [shifts, dateRange]);
  
  // Calculate daily stats
  const dailyStats = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayShifts = shifts.filter(s => s.date === dateStr);
      
      const totalRequired = dayShifts.reduce((sum, s) => sum + s.requiredStaff, 0);
      const totalAssigned = dayShifts.reduce((sum, s) => sum + s.assignedUsers.length, 0);
      
      return {
        date: dateStr,
        day: format(day, 'EEE', { locale: it }),
        required: totalRequired,
        assigned: totalAssigned,
        coverage: totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 100,
        shifts: dayShifts.length
      };
    });
  }, [shifts, dateRange]);
  
  // Calculate peak hours
  const peakHours = useMemo(() => {
    const hourlyTotals = new Map<number, { required: number; assigned: number }>();
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyTotals.set(hour, { required: 0, assigned: 0 });
    }
    
    coverageData.forEach((value, key) => {
      const hour = parseInt(key.split('_')[1]);
      const existing = hourlyTotals.get(hour)!;
      existing.required += value.required;
      existing.assigned += value.assigned;
    });
    
    return Array.from(hourlyTotals.entries())
      .map(([hour, data]) => ({
        hour,
        required: data.required,
        assigned: data.assigned,
        coverage: data.required > 0 ? (data.assigned / data.required) * 100 : 100
      }))
      .sort((a, b) => b.required - a.required)
      .slice(0, 5);
  }, [coverageData]);
  
  // Get coverage color
  const getCoverageColor = (coverage: number) => {
    if (coverage >= 100) return 'bg-green-500';
    if (coverage >= 80) return 'bg-yellow-500';
    if (coverage >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getCoverageBackground = (coverage: number) => {
    if (coverage >= 100) return 'bg-green-100 dark:bg-green-900/30';
    if (coverage >= 80) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (coverage >= 60) return 'bg-orange-100 dark:bg-orange-900/30';
    if (coverage > 0) return 'bg-red-100 dark:bg-red-900/30';
    return '';
  };
  
  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRequired = shifts.reduce((sum, s) => sum + s.requiredStaff, 0);
    const totalAssigned = shifts.reduce((sum, s) => sum + s.assignedUsers.length, 0);
    const avgCoverage = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 100;
    
    const understaffedShifts = shifts.filter(s => s.assignedUsers.length < s.requiredStaff).length;
    const fullyStaffedShifts = shifts.filter(s => s.assignedUsers.length >= s.requiredStaff).length;
    
    return {
      avgCoverage: Math.round(avgCoverage),
      totalRequired,
      totalAssigned,
      understaffedShifts,
      fullyStaffedShifts,
      efficiency: Math.round((fullyStaffedShifts / (shifts.length || 1)) * 100)
    };
  }, [shifts]);
  
  const renderHeatmap = () => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const hours = Array.from({ length: 24 }, (_, i) => i).filter(h => h >= 6 && h <= 23);
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Hour headers */}
          <div className="grid grid-cols-19 gap-1 mb-1">
            <div className="text-xs font-medium p-2"></div>
            {hours.map(hour => (
              <div key={hour} className="text-xs text-center font-medium p-1">
                {hour.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
          
          {/* Day rows */}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            
            return (
              <div key={dateStr} className="grid grid-cols-19 gap-1 mb-1">
                <div className="text-xs font-medium p-2">
                  <div>{format(day, 'EEE', { locale: it })}</div>
                  <div className="text-muted-foreground">{format(day, 'dd')}</div>
                </div>
                
                {hours.map(hour => {
                  const key = `${dateStr}_${hour}`;
                  const data = coverageData.get(key);
                  
                  if (!data || data.required === 0) {
                    return (
                      <div
                        key={key}
                        className="h-12 rounded bg-gray-100 dark:bg-gray-800"
                        data-testid={`coverage-cell-${dateStr}-${hour}`}
                      />
                    );
                  }
                  
                  const coverage = data.coverage;
                  const opacity = selectedMetric === 'coverage' 
                    ? Math.min(100, Math.abs(100 - coverage)) / 100
                    : selectedMetric === 'staff'
                    ? data.assigned / 10
                    : data.required / 10;
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        "h-12 rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-110 hover:z-10 cursor-pointer",
                        getCoverageBackground(coverage)
                      )}
                      style={{
                        opacity: 0.3 + opacity * 0.7
                      }}
                      title={`${hour}:00 - Required: ${data.required}, Assigned: ${data.assigned}, Coverage: ${Math.round(coverage)}%`}
                      data-testid={`coverage-cell-${dateStr}-${hour}`}
                    >
                      {selectedMetric === 'coverage' && `${Math.round(coverage)}%`}
                      {selectedMetric === 'staff' && data.assigned}
                      {selectedMetric === 'demand' && data.required}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  const renderTimeline = () => {
    return (
      <div className="space-y-4">
        {dailyStats.map(stat => (
          <Card key={stat.date} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-medium">{stat.day}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(stat.date), 'dd MMM', { locale: it })}
                  </div>
                </div>
                
                <Badge variant="outline">
                  {stat.shifts} turni
                </Badge>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Staff</div>
                  <div className="font-medium">
                    {stat.assigned}/{stat.required}
                  </div>
                </div>
                
                <div className="w-32">
                  <Progress 
                    value={stat.coverage} 
                    className={cn(
                      "h-2",
                      stat.coverage >= 100 && "[&>div]:bg-green-500",
                      stat.coverage >= 80 && stat.coverage < 100 && "[&>div]:bg-yellow-500",
                      stat.coverage < 80 && "[&>div]:bg-red-500"
                    )}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-center">
                    {Math.round(stat.coverage)}% copertura
                  </div>
                </div>
                
                {stat.coverage < 100 && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderMetrics = () => {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Copertura Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.avgCoverage}%</div>
              <Progress value={summaryMetrics.avgCoverage} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Efficienza Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.efficiency}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summaryMetrics.fullyStaffedShifts}/{shifts.length} turni completi
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Staff Totale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryMetrics.totalAssigned}/{summaryMetrics.totalRequired}
              </div>
              {summaryMetrics.understaffedShifts > 0 && (
                <Badge variant="destructive" className="mt-1">
                  {summaryMetrics.understaffedShifts} turni scoperti
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ore di Punta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {peakHours.map(peak => (
                <div key={peak.hour} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      {peak.hour.toString().padStart(2, '0')}:00
                    </div>
                    <Badge variant="outline">
                      {peak.required} staff richiesti
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      {peak.assigned}/{peak.required} assegnati
                    </div>
                    <Progress 
                      value={peak.coverage} 
                      className="w-24 h-2"
                    />
                    <span className="text-sm font-medium w-12 text-right">
                      {Math.round(peak.coverage)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Recommendations */}
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              Raccomandazioni AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summaryMetrics.avgCoverage < 90 && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Aumenta staff nelle ore di punta</div>
                    <div className="text-muted-foreground">
                      Le ore 10:00-13:00 e 17:00-20:00 richiedono più personale
                    </div>
                  </div>
                </div>
              )}
              
              {summaryMetrics.understaffedShifts > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Riassegna staff da turni sovrastaffati</div>
                    <div className="text-muted-foreground">
                      Ottimizza distribuendo meglio il personale disponibile
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-purple-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">Considera template stagionali</div>
                  <div className="text-muted-foreground">
                    Usa template specifici per weekend e giorni festivi
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <TabsList>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="metrics">Metriche</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {viewType === 'heatmap' && (
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coverage">Copertura %</SelectItem>
              <SelectItem value="staff">Staff Assegnati</SelectItem>
              <SelectItem value="demand">Staff Richiesti</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {viewType === 'heatmap' && renderHeatmap()}
          {viewType === 'timeline' && renderTimeline()}
          {viewType === 'metrics' && renderMetrics()}
        </CardContent>
      </Card>
      
      {/* Legend */}
      {viewType === 'heatmap' && (
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-sm">Ottimale (100%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-sm">Accettabile (80-99%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span className="text-sm">Critico (60-79%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-sm">Sottostaffato (&lt;60%)</span>
          </div>
        </div>
      )}
    </div>
  );
}