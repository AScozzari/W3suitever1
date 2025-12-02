import { useMemo, useState } from 'react';
import { 
  Clock, 
  Users, 
  Store as StoreIcon, 
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TimeSlot {
  startTime: string;
  endTime: string;
  label?: string;
}

interface Resource {
  id: string;
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  status: 'past' | 'present' | 'future';
  storeName: string;
  storeId: string;
  title?: string;
  versionNumber?: number;
  templateVersion?: {
    versionNumber: number;
    name: string;
    timeSlotsSnapshot?: TimeSlot[];
  };
}

interface StoreInfo {
  id: string;
  name: string;
  code?: string;
  openingTime?: string;
  closingTime?: string;
  requiredStaff?: number;
}

interface StoreCoverageViewProps {
  selectedDate: Date;
  resources: Resource[];
  stores: StoreInfo[];
  selectedStoreId?: string | null;
  onStoreSelect?: (storeId: string) => void;
  onResourceClick?: (resource: Resource) => void;
  className?: string;
}

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const time = timeStr.includes('T') ? timeStr.split('T')[1]?.substring(0, 5) : timeStr.substring(0, 5);
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '--:--';
  if (timeStr.includes('T')) {
    return timeStr.split('T')[1]?.substring(0, 5) || timeStr;
  }
  return timeStr.substring(0, 5);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function getStatusColor(status: 'past' | 'present' | 'future') {
  switch (status) {
    case 'past':
      return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', label: 'Passato' };
    case 'present':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'In Corso' };
    case 'future':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Futuro' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', label: 'N/A' };
  }
}

function StoreHeaderCard({ 
  store, 
  resourceCount, 
  selectedDate,
  coverageStatus
}: { 
  store: StoreInfo; 
  resourceCount: number;
  selectedDate: Date;
  coverageStatus: 'good' | 'warning' | 'critical';
}) {
  const today = new Date();
  const isPast = selectedDate < new Date(today.toDateString());
  const isToday = selectedDate.toDateString() === today.toDateString();
  
  return (
    <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-lg text-slate-800">{store.name}</h3>
              {store.code && (
                <Badge variant="outline" className="text-xs font-mono">
                  {store.code}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium">
                  {store.openingTime || '09:00'} - {store.closingTime || '20:00'}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>
                  {selectedDate.toLocaleDateString('it-IT', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right space-y-2">
            <Badge 
              className={cn(
                "text-sm px-3 py-1",
                isPast ? "bg-slate-100 text-slate-600" :
                isToday ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              )}
            >
              {isPast ? 'Passato' : isToday ? 'Oggi' : 'Futuro'}
            </Badge>
            
            <div className="flex items-center gap-2 justify-end">
              <Users className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-lg">
                {resourceCount}
              </span>
              <span className="text-sm text-slate-500">
                {resourceCount === 1 ? 'risorsa' : 'risorse'}
              </span>
            </div>
            
            {store.requiredStaff && (
              <div className="text-xs text-slate-500">
                Target: {store.requiredStaff} risorse
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CoverageTimeline({ 
  resources, 
  openingTime = '09:00', 
  closingTime = '20:00',
  onResourceClick
}: { 
  resources: Resource[];
  openingTime?: string;
  closingTime?: string;
  onResourceClick?: (resource: Resource) => void;
}) {
  const startMinutes = parseTime(openingTime);
  const endMinutes = parseTime(closingTime);
  const totalMinutes = endMinutes - startMinutes;
  
  const hours = useMemo(() => {
    const result = [];
    for (let h = Math.floor(startMinutes / 60); h <= Math.ceil(endMinutes / 60); h++) {
      result.push(h);
    }
    return result;
  }, [startMinutes, endMinutes]);
  
  const groupedByTimeSlot = useMemo(() => {
    const groups = new Map<string, Resource[]>();
    resources.forEach(r => {
      const key = `${formatTime(r.startTime)}-${formatTime(r.endTime)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(r);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      const aStart = parseTime(a[1][0].startTime);
      const bStart = parseTime(b[1][0].startTime);
      return aStart - bStart;
    });
  }, [resources]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-orange-500" />
        <h4 className="font-semibold text-slate-800">Timeline Copertura</h4>
      </div>
      
      <div className="relative bg-slate-50 rounded-lg p-4 overflow-hidden">
        <div className="flex border-b border-slate-200 pb-2 mb-3">
          {hours.map((hour, idx) => (
            <div 
              key={hour} 
              className="flex-1 text-center text-xs font-medium text-slate-500"
              style={{ minWidth: '40px' }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        
        <div className="relative min-h-[120px]" style={{ height: `${Math.max(120, groupedByTimeSlot.length * 50)}px` }}>
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #3b82f6 0px, #3b82f6 1px, transparent 1px, transparent calc(100% / ' + hours.length + '))',
            }}
          />
          
          {groupedByTimeSlot.map(([slotKey, slotResources], slotIdx) => {
            const firstResource = slotResources[0];
            const slotStart = parseTime(firstResource.startTime);
            const slotEnd = parseTime(firstResource.endTime);
            const leftPercent = ((slotStart - startMinutes) / totalMinutes) * 100;
            const widthPercent = ((slotEnd - slotStart) / totalMinutes) * 100;
            
            const statusColor = getStatusColor(firstResource.status);
            
            return (
              <div
                key={slotKey}
                className="absolute flex flex-col"
                style={{
                  left: `${Math.max(0, leftPercent)}%`,
                  width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                  top: `${slotIdx * 50}px`,
                }}
              >
                <div 
                  className={cn(
                    "rounded-lg p-2 border shadow-sm",
                    statusColor.bg,
                    statusColor.border
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-slate-700">
                      {formatTime(firstResource.startTime)} - {formatTime(firstResource.endTime)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] h-5", statusColor.bg, statusColor.text)}
                    >
                      {statusColor.label}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {slotResources.map(resource => (
                      <TooltipProvider key={resource.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onResourceClick?.(resource)}
                              className="flex items-center gap-1 bg-white rounded-full px-2 py-0.5 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                              data-testid={`timeline-resource-${resource.id}`}
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                                  {getInitials(resource.employeeName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-slate-700 truncate max-w-[80px]">
                                {resource.employeeName.split(' ')[0]}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="text-xs space-y-1">
                              <p className="font-medium">{resource.employeeName}</p>
                              <p className="text-slate-400">
                                {formatTime(resource.startTime)} - {formatTime(resource.endTime)}
                              </p>
                              {resource.versionNumber && (
                                <p className="text-slate-400">Versione: v{resource.versionNumber}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          
          {resources.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nessun turno pianificato</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
          <span>Passato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-50 border border-amber-300" />
          <span>In Corso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-50 border border-blue-300" />
          <span>Futuro</span>
        </div>
      </div>
    </div>
  );
}

function ResourceAssignmentsList({ 
  resources,
  onResourceClick 
}: { 
  resources: Resource[];
  onResourceClick?: (resource: Resource) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => {
      const aStart = parseTime(a.startTime);
      const bStart = parseTime(b.startTime);
      return aStart - bStart;
    });
  }, [resources]);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <h4 className="font-semibold text-slate-800">Risorse Assegnate</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {resources.length} {resources.length === 1 ? 'risorsa' : 'risorse'}
        </Badge>
      </div>
      
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-2 pr-2">
          {sortedResources.map(resource => {
            const statusColor = getStatusColor(resource.status);
            const isExpanded = expandedId === resource.id;
            
            return (
              <Card 
                key={resource.id} 
                className={cn(
                  "border-l-4 transition-all hover:shadow-md cursor-pointer",
                  resource.status === 'past' ? 'border-l-slate-400' :
                  resource.status === 'present' ? 'border-l-amber-500' :
                  'border-l-blue-500'
                )}
                onClick={() => onResourceClick?.(resource)}
                data-testid={`resource-card-${resource.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                          {getInitials(resource.employeeName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {resource.employeeName}
                          </span>
                          {resource.versionNumber && resource.status === 'past' && (
                            <Badge variant="outline" className="text-[10px] h-4 bg-slate-50">
                              v{resource.versionNumber}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-medium">
                              {formatTime(resource.startTime)} - {formatTime(resource.endTime)}
                            </span>
                          </div>
                          {resource.title && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>{resource.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={cn(
                          "text-xs",
                          statusColor.bg,
                          statusColor.text,
                          'border',
                          statusColor.border
                        )}
                      >
                        {statusColor.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : resource.id);
                        }}
                        data-testid={`btn-expand-${resource.id}`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4 text-orange-500" />
                          <span className="text-slate-600">{resource.storeName}</span>
                        </div>
                        {resource.templateVersion && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-500" />
                            <span className="text-slate-600">
                              Template: {resource.templateVersion.name || 'N/A'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {resource.templateVersion?.timeSlotsSnapshot && 
                       resource.templateVersion.timeSlotsSnapshot.length > 1 && (
                        <div className="bg-slate-50 rounded-lg p-2 mt-2">
                          <p className="text-xs font-medium text-slate-500 mb-1">
                            Fasce Template (v{resource.versionNumber}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {resource.templateVersion.timeSlotsSnapshot.map((slot, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">
                                {slot.label || `Fascia ${idx + 1}`}: {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {resources.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessuna risorsa assegnata</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function StoreCoverageView({
  selectedDate,
  resources,
  stores,
  selectedStoreId,
  onStoreSelect,
  onResourceClick,
  className
}: StoreCoverageViewProps) {
  const storeResources = useMemo(() => {
    if (!selectedStoreId) return resources;
    return resources.filter(r => r.storeId === selectedStoreId);
  }, [resources, selectedStoreId]);
  
  const selectedStore = useMemo(() => {
    if (!selectedStoreId) {
      return stores[0] || { id: 'all', name: 'Tutti i Negozi', openingTime: '09:00', closingTime: '20:00' };
    }
    return stores.find(s => s.id === selectedStoreId) || stores[0];
  }, [stores, selectedStoreId]);
  
  const coverageStatus = useMemo(() => {
    if (!selectedStore?.requiredStaff) return 'good';
    if (storeResources.length >= selectedStore.requiredStaff) return 'good';
    if (storeResources.length >= selectedStore.requiredStaff * 0.7) return 'warning';
    return 'critical';
  }, [storeResources.length, selectedStore?.requiredStaff]);
  
  return (
    <div className={cn("space-y-4", className)}>
      {stores.length > 1 && (
        <div className="bg-slate-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Seleziona Punto Vendita
          </h4>
          <div className="flex flex-wrap gap-2">
            {stores.map(store => (
              <Button
                key={store.id}
                size="sm"
                variant={selectedStoreId === store.id ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => onStoreSelect?.(store.id)}
                data-testid={`btn-select-store-${store.id}`}
              >
                <StoreIcon className="w-3.5 h-3.5 mr-1.5" />
                {store.name}
                <Badge 
                  variant="secondary" 
                  className="ml-2 h-5 text-[10px]"
                >
                  {resources.filter(r => r.storeId === store.id).length}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {selectedStore && (
        <StoreHeaderCard 
          store={selectedStore}
          resourceCount={storeResources.length}
          selectedDate={selectedDate}
          coverageStatus={coverageStatus}
        />
      )}
      
      <CoverageTimeline 
        resources={storeResources}
        openingTime={selectedStore?.openingTime || '09:00'}
        closingTime={selectedStore?.closingTime || '20:00'}
        onResourceClick={onResourceClick}
      />
      
      <Separator />
      
      <ResourceAssignmentsList 
        resources={storeResources}
        onResourceClick={onResourceClick}
      />
    </div>
  );
}
