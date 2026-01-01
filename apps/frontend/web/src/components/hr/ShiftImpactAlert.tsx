import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Calendar, Clock, ChevronDown, ChevronUp, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';

interface ShiftImpact {
  shiftId: string;
  shiftName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  storeId: string;
  storeName: string;
  assignmentId: string;
  hoursImpacted: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ImpactAnalysisResult {
  hasImpact: boolean;
  totalShiftsImpacted: number;
  totalHoursImpacted: number;
  impacts: ShiftImpact[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  warnings: string[];
  derivedStore?: {
    storeId: string | null;
    storeName: string | null;
    source: 'timbratura' | 'turno' | 'user' | 'none';
  };
}

interface ShiftImpactAlertProps {
  startDate: Date | null;
  endDate: Date | null;
  requesterId?: string;
  tenantSlug: string;
  onImpactChange?: (hasImpact: boolean, data: ImpactAnalysisResult | null) => void;
}

const severityColors = {
  none: 'bg-green-100 text-green-800 border-green-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

const severityBadgeColors = {
  none: 'bg-green-500',
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const severityLabels = {
  none: 'Nessun impatto',
  low: 'Impatto basso',
  medium: 'Impatto medio',
  high: 'Impatto alto',
  critical: 'Impatto critico'
};

export function ShiftImpactAlert({ 
  startDate, 
  endDate, 
  requesterId,
  tenantSlug,
  onImpactChange 
}: ShiftImpactAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const shouldFetch = !!startDate;

  const { data, isLoading, error } = useQuery<ImpactAnalysisResult>({
    queryKey: ['/api/workflows/requests/preview-impacts', startDate?.toISOString(), endDate?.toISOString(), requesterId],
    queryFn: async () => {
      const response = await apiRequest('/api/workflows/requests/preview-impacts', {
        method: 'POST',
        body: JSON.stringify({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString() || startDate?.toISOString(),
          requesterId
        })
      });
      return response.data;
    },
    enabled: shouldFetch,
    staleTime: 30000
  });

  useEffect(() => {
    if (data && onImpactChange) {
      onImpactChange(data.hasImpact, data);
    }
  }, [data, onImpactChange]);

  if (!shouldFetch) return null;
  
  if (isLoading) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Clock className="h-4 w-4 animate-pulse" />
        <AlertTitle>Analisi impatti in corso...</AlertTitle>
        <AlertDescription>
          Verifica dei turni nel periodo selezionato
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Impossibile verificare gli impatti sui turni
        </AlertDescription>
      </Alert>
    );
  }

  const analysis = data;
  if (!analysis) return null;

  if (!analysis.hasImpact) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Nessun conflitto</AlertTitle>
        <AlertDescription className="text-green-700">
          {analysis.summary}
          {analysis.derivedStore?.storeName && (
            <span className="block mt-1 text-sm">
              <MapPin className="inline h-3 w-3 mr-1" />
              Negozio: {analysis.derivedStore.storeName}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${severityColors[analysis.severity]}`} data-testid="shift-impact-alert">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">Attenzione: Turni Impattati</h4>
                <Badge className={severityBadgeColors[analysis.severity]}>
                  {severityLabels[analysis.severity]}
                </Badge>
              </div>
              <p className="text-sm mt-1">{analysis.summary}</p>
              
              {analysis.warnings.length > 0 && (
                <ul className="list-disc list-inside mt-2 text-sm">
                  {analysis.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" data-testid="btn-toggle-impacts">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-4">
          <ScrollArea className="max-h-60">
            <div className="space-y-2">
              {analysis.impacts.map((impact, index) => (
                <Card key={impact.shiftId || index} className="bg-white/50">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{impact.shiftName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(impact.shiftDate), 'EEEE d MMMM yyyy', { locale: it })}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(impact.startTime), 'HH:mm')} - {format(new Date(impact.endTime), 'HH:mm')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {impact.storeName}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {impact.hoursImpacted}h
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
            <span>Totale ore da coprire:</span>
            <Badge variant="secondary" className="text-lg">
              {analysis.totalHoursImpacted} ore
            </Badge>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
