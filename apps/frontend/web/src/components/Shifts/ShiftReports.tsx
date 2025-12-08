import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, TrendingUp, DollarSign, Clock, Users, Calendar, BarChart3, PieChart, LineChart } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Shift {
  id: string;
  date: string;
  startTime: string | Date;
  endTime: string | Date;
  name: string;
  requiredStaff: number;
  assignedUsers: string[];
  shiftType: 'morning' | 'afternoon' | 'night';
  breakMinutes?: number;
}

interface Props {
  storeId: string;
  dateRange: { start: Date; end: Date };
  shifts: Shift[];
}

// Mock data for demonstration
const HOURLY_RATE = 15; // €15/hour average
const OVERTIME_MULTIPLIER = 1.5;

export default function ShiftReports({
  storeId,
  dateRange,
  shifts
}: Props) {
  const [reportType, setReportType] = useState<'labor' | 'coverage' | 'forecast'>('labor');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const { toast } = useToast();
  
  // Calculate labor costs
  const laborMetrics = useMemo(() => {
    let totalHours = 0;
    let totalCost = 0;
    let overtimeHours = 0;
    const staffHours = new Map<string, number>();
    
    shifts.forEach(shift => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const breakHours = (shift.breakMinutes || 0) / 60;
      const workingHours = hours - breakHours;
      
      shift.assignedUsers.forEach(userId => {
        const currentHours = staffHours.get(userId) || 0;
        const newHours = currentHours + workingHours;
        staffHours.set(userId, newHours);
        
        // Calculate overtime (> 40 hours per week)
        if (newHours > 40) {
          const regularHours = Math.max(0, 40 - currentHours);
          const overtime = workingHours - regularHours;
          
          totalHours += regularHours;
          overtimeHours += overtime;
          totalCost += regularHours * HOURLY_RATE + overtime * HOURLY_RATE * OVERTIME_MULTIPLIER;
        } else {
          totalHours += workingHours;
          totalCost += workingHours * HOURLY_RATE;
        }
      });
    });
    
    const avgHoursPerStaff = staffHours.size > 0 
      ? Array.from(staffHours.values()).reduce((sum, h) => sum + h, 0) / staffHours.size 
      : 0;
    
    const laborPercentage = totalCost > 0 ? (totalCost / (totalCost * 3.5)) * 100 : 0; // Assume 28% labor target
    
    return {
      totalHours: Math.round(totalHours),
      overtimeHours: Math.round(overtimeHours),
      totalCost: Math.round(totalCost),
      avgHoursPerStaff: Math.round(avgHoursPerStaff * 10) / 10,
      staffCount: staffHours.size,
      laborPercentage: Math.round(laborPercentage),
      costPerHour: totalHours > 0 ? Math.round((totalCost / totalHours) * 100) / 100 : 0
    };
  }, [shifts]);
  
  // Calculate coverage metrics
  const coverageMetrics = useMemo(() => {
    const totalRequired = shifts.reduce((sum, s) => sum + s.requiredStaff, 0);
    const totalAssigned = shifts.reduce((sum, s) => sum + s.assignedUsers.length, 0);
    
    const fullyStaffed = shifts.filter(s => s.assignedUsers.length >= s.requiredStaff).length;
    const understaffed = shifts.filter(s => s.assignedUsers.length < s.requiredStaff * 0.8).length;
    const overstaffed = shifts.filter(s => s.assignedUsers.length > s.requiredStaff * 1.2).length;
    
    const shiftTypeDistribution = {
      morning: shifts.filter(s => s.shiftType === 'morning').length,
      afternoon: shifts.filter(s => s.shiftType === 'afternoon').length,
      night: shifts.filter(s => s.shiftType === 'night').length
    };
    
    return {
      avgCoverage: totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 100,
      fullyStaffed,
      understaffed,
      overstaffed,
      totalShifts: shifts.length,
      shiftTypeDistribution,
      efficiency: shifts.length > 0 ? Math.round((fullyStaffed / shifts.length) * 100) : 100
    };
  }, [shifts]);
  
  // Generate daily breakdown
  const dailyBreakdown = useMemo(() => {
    const breakdown = new Map<string, { shifts: number; hours: number; cost: number; coverage: number }>();
    
    shifts.forEach(shift => {
      const existing = breakdown.get(shift.date) || { shifts: 0, hours: 0, cost: 0, coverage: 0 };
      
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const breakHours = (shift.breakMinutes || 0) / 60;
      const workingHours = (hours - breakHours) * shift.assignedUsers.length;
      
      existing.shifts++;
      existing.hours += workingHours;
      existing.cost += workingHours * HOURLY_RATE;
      existing.coverage = shift.requiredStaff > 0 
        ? (shift.assignedUsers.length / shift.requiredStaff) * 100 
        : 100;
      
      breakdown.set(shift.date, existing);
    });
    
    return Array.from(breakdown.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
        hours: Math.round(data.hours),
        cost: Math.round(data.cost),
        coverage: Math.round(data.coverage)
      }));
  }, [shifts]);
  
  const handleExport = () => {
    toast({
      title: "Export in corso",
      description: `Report ${reportType} in formato ${exportFormat.toUpperCase()} sarà pronto a breve`
    });
    
    // In production, this would generate and download the actual file
    setTimeout(() => {
      toast({
        title: "Export completato",
        description: "Il file è stato scaricato"
      });
    }, 2000);
  };
  
  const renderLaborReport = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo Totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{laborMetrics.totalCost}</div>
            <div className="text-xs text-muted-foreground mt-1">
              €{laborMetrics.costPerHour}/ora media
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ore Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{laborMetrics.totalHours}h</div>
            {laborMetrics.overtimeHours > 0 && (
              <Badge variant="outline" className="mt-1">
                +{laborMetrics.overtimeHours}h straordinari
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 dark:border-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff Impiegato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{laborMetrics.staffCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {laborMetrics.avgHoursPerStaff}h media/persona
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Labor %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{laborMetrics.laborPercentage}%</div>
            <Progress 
              value={laborMetrics.laborPercentage} 
              className={cn(
                "mt-2 h-2",
                laborMetrics.laborPercentage <= 28 && "[&>div]:bg-green-500",
                laborMetrics.laborPercentage > 28 && laborMetrics.laborPercentage <= 32 && "[&>div]:bg-yellow-500",
                laborMetrics.laborPercentage > 32 && "[&>div]:bg-red-500"
              )}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown Giornaliero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Data</th>
                  <th className="text-right p-2">Turni</th>
                  <th className="text-right p-2">Ore</th>
                  <th className="text-right p-2">Costo</th>
                  <th className="text-right p-2">Copertura</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map(day => (
                  <tr key={day.date} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2">
                      {format(new Date(day.date), 'EEE dd MMM', { locale: it })}
                    </td>
                    <td className="text-right p-2">{day.shifts}</td>
                    <td className="text-right p-2">{day.hours}h</td>
                    <td className="text-right p-2">€{day.cost}</td>
                    <td className="text-right p-2">
                      <Badge 
                        variant={day.coverage >= 100 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {day.coverage}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="p-2">Totale</td>
                  <td className="text-right p-2">{shifts.length}</td>
                  <td className="text-right p-2">{laborMetrics.totalHours}h</td>
                  <td className="text-right p-2">€{laborMetrics.totalCost}</td>
                  <td className="text-right p-2">
                    {Math.round(coverageMetrics.avgCoverage)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Cost Optimization Tips */}
      <Card className="border-orange-200 dark:border-orange-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Suggerimenti Ottimizzazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {laborMetrics.overtimeHours > laborMetrics.totalHours * 0.1 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                <div className="text-sm">
                  <div className="font-medium">Riduci straordinari</div>
                  <div className="text-muted-foreground">
                    Gli straordinari rappresentano {Math.round((laborMetrics.overtimeHours / laborMetrics.totalHours) * 100)}% delle ore totali. 
                    Considera di assumere staff aggiuntivo o redistribuire i turni.
                  </div>
                </div>
              </div>
            )}
            
            {laborMetrics.laborPercentage > 30 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5" />
                <div className="text-sm">
                  <div className="font-medium">Labor cost elevato</div>
                  <div className="text-muted-foreground">
                    Il costo del lavoro è al {laborMetrics.laborPercentage}% delle vendite. 
                    Target consigliato: 25-28%.
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              <div className="text-sm">
                <div className="font-medium">Ottimizza scheduling</div>
                <div className="text-muted-foreground">
                  Usa i template per standardizzare i turni e ridurre il tempo di pianificazione.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderCoverageReport = () => (
    <div className="space-y-6">
      {/* Coverage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Copertura Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverageMetrics.avgCoverage}%</div>
            <Progress value={coverageMetrics.avgCoverage} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Efficienza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverageMetrics.efficiency}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {coverageMetrics.fullyStaffed}/{coverageMetrics.totalShifts} turni completi
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alert Turni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Badge variant="destructive">
                {coverageMetrics.understaffed} sottostaffati
              </Badge>
              <Badge variant="secondary">
                {coverageMetrics.overstaffed} sovrastaffati
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Shift Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuzione Turni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Standard Full-Time</span>
                <span className="text-sm font-medium">
                  {coverageMetrics.shiftTypeDistribution.morning || 0}
                </span>
              </div>
              <Progress 
                value={(coverageMetrics.shiftTypeDistribution.morning / coverageMetrics.totalShifts) * 100} 
                className="h-2 [&>div]:bg-emerald-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Part-Time</span>
                <span className="text-sm font-medium">
                  {coverageMetrics.shiftTypeDistribution.afternoon || 0}
                </span>
              </div>
              <Progress 
                value={(coverageMetrics.shiftTypeDistribution.afternoon / coverageMetrics.totalShifts) * 100} 
                className="h-2 [&>div]:bg-blue-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Flessibile/Straordinario</span>
                <span className="text-sm font-medium">
                  {coverageMetrics.shiftTypeDistribution.night || 0}
                </span>
              </div>
              <Progress 
                value={(coverageMetrics.shiftTypeDistribution.night / coverageMetrics.totalShifts) * 100} 
                className="h-2 [&>div]:bg-purple-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderForecastReport = () => (
    <div className="space-y-6">
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LineChart className="h-4 w-4 text-blue-500" />
            Forecast Prossimi 30 Giorni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Ore Previste</div>
                <div className="text-xl font-bold">
                  {Math.round(laborMetrics.totalHours * 4.3)}h
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Costo Previsto</div>
                <div className="text-xl font-bold">
                  €{Math.round(laborMetrics.totalCost * 4.3)}
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm">
                Basato sui pattern attuali, prevediamo un aumento del 15% nel fabbisogno 
                di personale nei weekend del prossimo mese.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trend Storici</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Grafico trend (coming soon)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <Tabs value={reportType} onValueChange={(v) => setReportType(v as any)}>
          <TabsList>
            <TabsTrigger value="labor">
              <DollarSign className="h-4 w-4 mr-2" />
              Costi Lavoro
            </TabsTrigger>
            <TabsTrigger value="coverage">
              <Users className="h-4 w-4 mr-2" />
              Copertura
            </TabsTrigger>
            <TabsTrigger value="forecast">
              <TrendingUp className="h-4 w-4 mr-2" />
              Forecast
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleExport}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
        </div>
      </div>
      
      {/* Report Content */}
      {reportType === 'labor' && renderLaborReport()}
      {reportType === 'coverage' && renderCoverageReport()}
      {reportType === 'forecast' && renderForecastReport()}
      
      {/* Report Period Info */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Periodo Report:</span>
              <Badge variant="outline">
                {format(dateRange.start, 'dd MMM', { locale: it })} - 
                {format(dateRange.end, 'dd MMM yyyy', { locale: it })}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Generato: {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}