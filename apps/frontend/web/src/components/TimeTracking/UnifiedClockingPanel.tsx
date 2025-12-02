// UnifiedClockingPanel.tsx - Singolo componente per tutto il sistema di timbratura
// Contiene: Clock in/out + PDV selection + Tipologia timbratura + Form dinamico

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, MapPin, Wifi, Smartphone, QrCode, CreditCard,
  CheckCircle, XCircle, AlertCircle, Loader2, 
  LogIn, LogOut, Coffee, Pause, Play,
  Building, Target, Sparkles, Globe, 
  Navigation, Shield, Camera, Hash, Keyboard
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Hooks e services
import { useTimeAttendanceFSM } from '@/hooks/useTimeAttendanceFSM';
import { useTimeAttendanceStrategies } from '@/hooks/useTimeAttendanceStrategies';
import { StrategyType, TrackingMethod } from '@/types/timeAttendanceFSM';
import { NearbyStore } from '@/services/timeTrackingService';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Strategy imports
import { 
  getAvailableStrategies, 
  ALL_STRATEGIES,
  getStrategyByType 
} from '@/strategies';

interface UnifiedClockingPanelProps {
  userId: string;
  onClockIn?: () => void;
  onClockOut?: () => void;
  // Configurazione da HR Management
  enabledStrategies?: StrategyType[];
  defaultStrategy?: StrategyType;
  className?: string;
}

// Configurazione completa dei 6 tipi di timbratura
const STRATEGY_CONFIGS = [
  {
    type: 'gps' as StrategyType,
    name: 'GPS Geofence',
    icon: MapPin,
    description: 'Rilevamento automatico posizione',
    color: 'from-orange-500 to-orange-600',
    bgClass: 'bg-gradient-to-br from-orange-50 to-orange-100',
    features: ['Auto-location', 'Geofence validation', 'Maps integration'],
    requirements: 'Richiede permessi GPS e posizione attiva'
  },
  {
    type: 'nfc' as StrategyType,
    name: 'NFC Badge',
    icon: Wifi,
    description: 'Badge contactless NFC',
    color: 'from-blue-500 to-blue-600',
    bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100',
    features: ['Contactless', 'Instant read', 'Secure'],
    requirements: 'Badge NFC e device compatibile'
  },
  {
    type: 'qr' as StrategyType,
    name: 'QR Scanner',
    icon: QrCode,
    description: 'Scanner QR dinamico con timer',
    color: 'from-purple-500 to-purple-600',
    bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100',
    features: ['Dynamic QR', 'Timer validation', 'Camera access'],
    requirements: 'Fotocamera device o QR fisso'
  },
  {
    type: 'smart' as StrategyType,
    name: 'Smart Detection',
    icon: Sparkles,
    description: 'Auto-detection intelligente',
    color: 'from-pink-500 to-pink-600',
    bgClass: 'bg-gradient-to-br from-pink-50 to-pink-100',
    features: ['AI detection', 'Multi-strategy', 'Adaptive'],
    requirements: 'Combinazione automatica metodi disponibili'
  },
  {
    type: 'web' as StrategyType,
    name: 'Web Fingerprint',
    icon: Globe,
    description: 'Fingerprint browser sicuro',
    color: 'from-green-500 to-green-600',
    bgClass: 'bg-gradient-to-br from-green-50 to-green-100',
    features: ['Browser ID', 'Cookies', 'Device signature'],
    requirements: 'Browser cookies e localStorage abilitati'
  },
  {
    type: 'badge' as StrategyType,
    name: 'Badge Manual',
    icon: Keyboard,
    description: 'Input manuale badge ID',
    color: 'from-gray-500 to-gray-600',
    bgClass: 'bg-gradient-to-br from-gray-50 to-gray-100',
    features: ['Manual input', 'Badge ID', 'Keyboard wedge'],
    requirements: 'Badge ID valido e input manuale'
  },
];

export default function UnifiedClockingPanel({ 
  userId, 
  onClockIn, 
  onClockOut,
  enabledStrategies,
  defaultStrategy, // ✅ PROGRESSIVE DISCLOSURE: No auto-selection, requires explicit PDV → method choice
  className 
}: UnifiedClockingPanelProps) {
  const { toast } = useToast();
  
  // FSM Hook - Core state management
  const {
    state: fsmState,
    context,
    isActive,
    canClockIn,
    canClockOut,
    canStartBreak,
    canEndBreak,
    needsBreak,
    isOvertime,
    elapsedTime,
    breakTime,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    selectMethod,
    selectStore,
    error: fsmError,
    clearError,
    isLoading: fsmLoading
  } = useTimeAttendanceFSM(userId);

  // Strategies Hook - Method management  
  const [strategiesState, strategiesActions] = useTimeAttendanceStrategies({
    context,
    onStrategyChange: (strategy) => {
      if (strategy) {
        selectMethod(strategy.type as TrackingMethod);
      }
    },
    onError: (error) => {
      toast({
        title: 'Errore Strategia',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Real Store Data Hook - Using default queryFn with correct headers
  const {
    data: storesData,
    isLoading: isLoadingStores,
    error: storesError
  } = useQuery({
    queryKey: ['/api/stores']
  });

  // 🔥 CRITICAL FIX: Declare state variables BEFORE using them in hooks
  const [selectedStoreId, setSelectedStoreId] = useState<string>(''); // ✅ FIX: Empty by default
  const [selectedStrategyType, setSelectedStrategyType] = useState<StrategyType | ''>(''); // ✅ FIX: Empty by default

  // ✅ NEW: Hook for loading timetracking methods available for selected PDV
  const {
    data: availableMethodsData,
    isLoading: isLoadingMethods,
    error: methodsError
  } = useQuery({
    queryKey: [`/api/stores/${selectedStoreId}/timetracking-methods`],
    enabled: !!selectedStoreId // Only run when PDV is selected
  });

  // Transform stores data into expected format
  const nearbyStores: NearbyStore[] = React.useMemo(() => {
    if (!storesData || !Array.isArray(storesData)) return [];
    return storesData.map((store: any) => {
      // Smart name resolution: usa address come nome se name/nomeNegozio sono null
      const address = store.address || store.indirizzo || 'Indirizzo non disponibile';
      const storeName = store.name || store.nomeNegozio || address || `Store ${store.id}`;
      
      return {
        id: store.id,
        name: storeName,
        address: address,
        latitude: store.latitude || 45.4642,
        longitude: store.longitude || 9.1900,
        distance: 100, // Default distance
        inGeofence: true,
        confidence: 95,
        city: store.city || store.citta || 'N/A',
        province: store.province || store.provincia || 'N/A',
        radius: 200,
        rank: 1,
        isNearest: true,
        wifiNetworks: []
      };
    });
  }, [storesData]);

  // Store selection state
  const [selectedStore, setSelectedStore] = React.useState<NearbyStore | null>(null);
  const [autoDetected] = React.useState(false);
  
  // GPS states - now dynamic and connected to strategies
  const [gpsError, setGpsError] = React.useState<string | null>(null);
  const [gpsPosition, setGpsPosition] = React.useState<any>(null);
  const [gpsStatus, setGpsStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Local state  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // ✅ PDV MISMATCH DETECTION: State for mismatch popup
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);
  const [pendingStoreSelection, setPendingStoreSelection] = useState<{ storeId: string; store: NearbyStore | null }>({ storeId: '', store: null });
  
  // ✅ CLOCK ENTRY VALIDATION: Pre-validation state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    expectedValue?: any;
    actualValue?: any;
  }>>([]);
  const [pendingClockAction, setPendingClockAction] = useState<'clock_in' | 'clock_out' | null>(null);
  
  // ✅ Pre-validation mutation for clock entries
  const validateClockMutation = useMutation({
    mutationFn: async (params: { userId: string; storeId: string; clockTime?: string; entryType: 'clock_in' | 'clock_out' }) => {
      return apiRequest('/api/hr/clock-entries/validate', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    }
  });
  
  // ✅ Query for today's shift assignment to detect PDV mismatch
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayShiftData, isLoading: isLoadingShift } = useQuery({
    queryKey: ['/api/hr/shift-assignments/my-assignments', { date: today }],
    enabled: !!userId
  });
  
  // ✅ Get assigned store info from today's shift
  const assignedShiftInfo = React.useMemo(() => {
    if (!todayShiftData) return null;
    
    // Handle both array and single object responses
    const assignments = Array.isArray(todayShiftData) ? todayShiftData : (todayShiftData as any)?.assignments || [];
    if (assignments.length === 0) return null;
    
    // Find assignment for today
    const todayAssignment = assignments.find((a: any) => a.shiftDate === today || a.date === today);
    if (!todayAssignment) return null;
    
    return {
      storeId: todayAssignment.storeId || todayAssignment.shift?.storeId,
      storeName: todayAssignment.storeName || todayAssignment.shift?.storeName || todayAssignment.store?.name || 'PDV Assegnato',
      startTime: todayAssignment.startTime || todayAssignment.shift?.startTime || '',
      endTime: todayAssignment.endTime || todayAssignment.shift?.endTime || ''
    };
  }, [todayShiftData, today]);

  // Timer per clock corrente
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ❌ REMOVED: Auto-select first store - now requires explicit user selection for progressive disclosure
  
  // ✅ NEW: Filter strategies based on PDV configuration + HR Management
  const availableStrategyConfigs = React.useMemo(() => {
    // First filter by HR Management permissions
    let configs = STRATEGY_CONFIGS.filter(config => 
      !enabledStrategies || enabledStrategies.includes(config.type)
    );
    
    // Then filter by PDV-specific configuration if available
    if (availableMethodsData?.methods && availableMethodsData.methods.length > 0) {
      const enabledMethods = availableMethodsData.methods
        .filter((method: any) => method.enabled)
        .map((method: any) => method.method);
      
      configs = configs.filter(config => enabledMethods.includes(config.type));
    }
    
    return configs;
  }, [enabledStrategies, availableMethodsData]);

  // Configurazione strategia selezionata
  const activeStrategyConfig = STRATEGY_CONFIGS.find(s => s.type === selectedStrategyType);

  // Handler cambio strategia
  const handleStrategyChange = async (strategyType: StrategyType) => {
    setSelectedStrategyType(strategyType);
    
    // Reset GPS states when changing strategy
    if (strategyType === 'gps') {
      setGpsStatus('loading');
      setGpsError(null);
      setGpsPosition(null);
    } else {
      setGpsStatus('idle');
      setGpsError(null);
    }
    
    const success = await strategiesActions.selectStrategy(strategyType);
    
    // ✅ FIX: For QR strategy, let the useEffect handle preparation when store is ready
    // This ensures context.selectedStore is populated before prepare() is called
    if (success && context && strategyType !== 'qr') {
      try {
        await strategiesActions.prepareStrategy(context);
        if (strategyType === 'gps' && strategiesState.prepareResult?.success) {
          setGpsStatus('success');
          // Extract GPS data from prepare result if available
          if (strategiesState.prepareResult.metadata?.position) {
            setGpsPosition(strategiesState.prepareResult.metadata.position);
          }
        }
      } catch (error: any) {
        if (strategyType === 'gps') {
          setGpsStatus('error');
          setGpsError(error.message || 'GPS preparation failed');
        }
      }
    }
  };

  // Handler cambio store - con mismatch detection
  const handleStoreChange = (storeId: string) => {
    const store = nearbyStores.find(s => s.id === storeId);
    
    // ✅ PDV MISMATCH CHECK: If user has a shift today and selects different PDV
    if (assignedShiftInfo && assignedShiftInfo.storeId && storeId !== assignedShiftInfo.storeId) {
      // Store pending selection and show mismatch dialog
      setPendingStoreSelection({ storeId, store: store || null });
      setMismatchDialogOpen(true);
      return;
    }
    
    // No mismatch, proceed normally
    setSelectedStoreId(storeId);
    if (store) {
      setSelectedStore(store);
      selectStore(store);
    }
  };
  
  // ✅ Handle mismatch confirmation
  const handleMismatchConfirm = () => {
    setSelectedStoreId(pendingStoreSelection.storeId);
    if (pendingStoreSelection.store) {
      setSelectedStore(pendingStoreSelection.store);
      selectStore(pendingStoreSelection.store);
    }
    setMismatchDialogOpen(false);
    setPendingStoreSelection({ storeId: '', store: null });
    
    toast({
      title: 'PDV Alternativo Selezionato',
      description: 'Stai timbrando in un PDV diverso da quello assegnato. Il responsabile sarà notificato.',
      variant: 'default'
    });
  };
  
  // ✅ Handle mismatch cancel - select assigned store instead
  const handleMismatchCancel = () => {
    setMismatchDialogOpen(false);
    setPendingStoreSelection({ storeId: '', store: null });
    
    // Auto-select assigned store
    if (assignedShiftInfo?.storeId) {
      const assignedStore = nearbyStores.find(s => s.id === assignedShiftInfo.storeId);
      setSelectedStoreId(assignedShiftInfo.storeId);
      if (assignedStore) {
        setSelectedStore(assignedStore);
        selectStore(assignedStore);
      }
    }
  };

  // ✅ Pre-validate clock entry and show warnings if any
  const preValidateClockEntry = async (entryType: 'clock_in' | 'clock_out') => {
    try {
      const result = await validateClockMutation.mutateAsync({
        userId,
        storeId: selectedStoreId,
        entryType
      });
      
      if (result.warnings && result.warnings.length > 0) {
        setValidationWarnings(result.warnings);
        setPendingClockAction(entryType);
        setValidationDialogOpen(true);
        return false; // Do not proceed, show dialog
      }
      
      return true; // No warnings, proceed
    } catch (error) {
      console.error('Pre-validation error:', error);
      // On validation error, allow to proceed but log
      return true;
    }
  };
  
  // ✅ Execute actual clock action after validation approval
  const executeClockAction = async (action: 'clock_in' | 'clock_out') => {
    if (action === 'clock_in') {
      await executeClockIn();
    } else {
      await executeClockOut();
    }
  };
  
  // ✅ Handle validation dialog confirmation
  const handleValidationConfirm = async () => {
    setValidationDialogOpen(false);
    if (pendingClockAction) {
      await executeClockAction(pendingClockAction);
    }
    setPendingClockAction(null);
    setValidationWarnings([]);
  };
  
  // ✅ Handle validation dialog cancel
  const handleValidationCancel = () => {
    setValidationDialogOpen(false);
    setPendingClockAction(null);
    setValidationWarnings([]);
  };
  
  // Handler Clock In - Now with pre-validation
  const handleClockIn = async () => {
    if (!selectedStoreId || !selectedStrategyType) {
      toast({
        title: 'Dati Mancanti',
        description: 'Seleziona store e metodo timbratura',
        variant: 'destructive'
      });
      return;
    }

    // ✅ Step 1: Pre-validate
    const canProceed = await preValidateClockEntry('clock_in');
    if (!canProceed) return; // Dialog will be shown
    
    // ✅ Step 2: Execute if no warnings
    await executeClockIn();
  };
  
  // ✅ Actual clock-in execution
  const executeClockIn = async () => {
    try {
      // Validazione strategia
      if (strategiesState.selectedStrategy) {
        const validation = await strategiesActions.validateStrategy(context);
        if (!validation.isValid) {
          toast({
            title: 'Validazione Fallita',
            description: validation.error || 'Strategia non valida',
            variant: 'destructive'
          });
          return;
        }
      }

      // Dati base clock in
      const baseClockInData = {
        storeId: selectedStoreId,
        userId,
        trackingMethod: selectedStrategyType as TrackingMethod,
        geoLocation: gpsPosition ? {
          lat: gpsPosition.lat,
          lng: gpsPosition.lng,
          accuracy: gpsPosition.accuracy,
          address: context.selectedStore?.address || 'Unknown Address'
        } : undefined,
        deviceInfo: {
          deviceType: 'web' as const,
          userAgent: navigator.userAgent,
        }
      };

      // Augment con dati strategia
      const clockInData = strategiesState.selectedStrategy 
        ? await strategiesActions.augmentPayload(baseClockInData, context)
        : baseClockInData;

      await clockIn(clockInData);
      
      toast({
        title: 'Entrata Registrata',
        description: `Timbratura ${activeStrategyConfig?.name} alle ${format(new Date(), 'HH:mm')}`,
        variant: 'default'
      });
      
      if (onClockIn) onClockIn();
    } catch (error) {
      console.error('Clock in failed:', error);
      toast({
        title: 'Errore Timbratura',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'destructive'
      });
    }
  };

  // Handler Clock Out - Now with pre-validation
  const handleClockOut = async () => {
    // ✅ Step 1: Pre-validate
    const canProceed = await preValidateClockEntry('clock_out');
    if (!canProceed) return; // Dialog will be shown
    
    // ✅ Step 2: Execute if no warnings
    await executeClockOut();
  };
  
  // ✅ Actual clock-out execution
  const executeClockOut = async () => {
    try {
      await clockOut();
      toast({
        title: 'Uscita Registrata',
        description: `Timbratura di uscita alle ${format(new Date(), 'HH:mm')}`,
        variant: 'default'
      });
      if (onClockOut) onClockOut();
    } catch (error) {
      console.error('Clock out failed:', error);
      toast({
        title: 'Errore Timbratura',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'destructive'
      });
    }
  };

  // Handler Break
  const handleBreak = async () => {
    try {
      if (!context.isOnBreak) {
        await startBreak();
      } else {
        await endBreak();
      }
    } catch (error) {
      console.error('Break operation error:', error);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={cn("glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg", className)} data-testid="unified-clocking-panel">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-orange-500" />
            <span className="text-xl">Sistema Timbratura Unificato</span>
          </div>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "transition-colors text-sm px-3 py-1",
              isActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-500"
            )}
            data-testid="status-badge"
          >
            {isActive ? (context.isOnBreak ? 'In Pausa' : 'In Servizio') : 'Fuori Servizio'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          
          {/* ============= CLOCK DISPLAY CENTRALE ============= */}
          <div className="text-center bg-gradient-to-r from-orange-50 to-purple-50 p-6 rounded-xl border border-orange-200" data-testid="clock-display">
            <div className="text-6xl font-bold text-gray-900 mb-2" data-testid="text-current-time">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-lg text-gray-700 mb-4" data-testid="text-current-date">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: it })}
            </div>
            
            {/* Session Info attiva */}
            {isActive && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-orange-200" data-testid="session-info">
                <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Tempo Lavoro</div>
                  <div className={cn("text-2xl font-bold", isOvertime ? "text-orange-600" : "text-green-600")} data-testid="text-work-time">
                    {formatTime(elapsedTime.totalSeconds)}
                  </div>
                </div>
                {context.isOnBreak && (
                  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Tempo Pausa</div>
                    <div className="text-2xl font-bold text-blue-600" data-testid="text-break-time">
                      {formatTime(breakTime.totalSeconds)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============= CONFIGURAZIONE UNIFICATA ============= */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-gray-200" data-testid="configuration-section">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              Configurazione Sistema
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ========== SELEZIONE PUNTO VENDITA ========== */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Punto Vendita *</span>
                </div>
                
                <Select value={selectedStoreId} onValueChange={handleStoreChange}>
                  <SelectTrigger className="w-full" data-testid="select-store">
                    <SelectValue placeholder="Seleziona punto vendita..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]" side="bottom" align="start">
                    {nearbyStores.map((store) => (
                      <SelectItem key={store.id} value={store.id} data-testid={`option-store-${store.id}`}>
                        <div className="flex items-center justify-between w-full">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{store.name}</div>
                            <div className="text-xs text-gray-500 truncate">{store.address}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status PDV */}
                {selectedStoreId ? (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200" data-testid="store-status-valid">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">PDV Configurato</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200" data-testid="store-status-invalid">
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">PDV Richiesto</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ========== SELEZIONE TIPO TIMBRATURA ========== */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-purple-500" />
                  <span className="font-semibold">Tipo Timbratura *</span>
                </div>

                <Select value={selectedStrategyType} onValueChange={handleStrategyChange} disabled={!selectedStoreId || isLoadingMethods}>
                  <SelectTrigger className="w-full" data-testid="select-strategy">
                    <SelectValue placeholder={!selectedStoreId ? "Prima seleziona un PDV" : isLoadingMethods ? "Caricamento sistemi..." : availableStrategyConfigs.length === 0 ? "Nessun sistema configurato" : "Seleziona metodo..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingMethods ? (
                      <div className="flex items-center justify-center p-4 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Caricamento sistemi...
                      </div>
                    ) : availableStrategyConfigs.length === 0 && selectedStoreId ? (
                      <div className="flex items-center justify-center p-4 text-gray-500">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Nessun sistema configurato per questo PDV
                      </div>
                    ) : (
                      availableStrategyConfigs.map((config) => {
                        const Icon = config.icon;
                      return (
                        <SelectItem key={config.type} value={config.type} data-testid={`option-strategy-${config.type}`}>
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{config.name}</div>
                              <div className="text-xs text-gray-500">{config.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })
                    )}
                  </SelectContent>
                </Select>

                {/* Status Strategia */}
                {activeStrategyConfig && (
                  <div className={cn("p-3 rounded-lg border", 
                    strategiesState.prepareResult?.success 
                      ? "bg-green-50 border-green-200" 
                      : "bg-yellow-50 border-yellow-200"
                  )} data-testid="strategy-status">
                    <div className="flex items-center gap-2 mb-2">
                      <activeStrategyConfig.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{activeStrategyConfig.name}</span>
                      {strategiesState.prepareResult?.success && (
                        <Badge variant="default" className="text-xs bg-green-600">Pronto</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {activeStrategyConfig.requirements}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============= FORM DINAMICO STRATEGIA ============= */}
          {strategiesState.selectedStrategy && activeStrategyConfig && (
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-gray-200" data-testid="strategy-form">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                Configurazione {activeStrategyConfig.name}
              </h3>
              
              {/* Renderizza pannello strategia dinamico */}
              <div className="min-h-[120px]" data-testid="strategy-panel">
                {strategiesState.selectedStrategy.renderPanel({
                  isActive: true,
                  isLoading: fsmLoading || strategiesState.isPreparing,
                  context: context,
                  onAction: (action, data) => {
                    console.log(`Strategy action:`, action, data);
                  },
                  compact: false
                })}
              </div>
            </div>
          )}

          {/* ============= BOTTONI AZIONE PRINCIPALI ============= */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-gray-200" data-testid="action-buttons">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              Azioni Timbratura
            </h3>

            {!isActive ? (
              <Button
                onClick={handleClockIn}
                disabled={
                  fsmLoading || 
                  !canClockIn || 
                  !selectedStoreId ||
                  !selectedStrategyType ||
                  strategiesState.isPreparing ||
                  (strategiesState.validationResult && !strategiesState.validationResult.isValid)
                }
                className="w-full h-16 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold text-xl shadow-lg"
                data-testid="button-clock-in"
              >
                {fsmLoading || strategiesState.isPreparing ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    {strategiesState.isPreparing ? 'Preparazione...' : 'Registrazione...'}
                  </>
                ) : (
                  <>
                    <LogIn className="w-6 h-6 mr-3" />
                    REGISTRA ENTRATA ({activeStrategyConfig?.name || 'N/A'})
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleClockOut}
                  disabled={fsmLoading || !canClockOut}
                  className="w-full h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg shadow-lg"
                  data-testid="button-clock-out"
                >
                  {fsmLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-5 h-5 mr-2" />
                      REGISTRA USCITA
                    </>
                  )}
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleBreak}
                    disabled={fsmLoading || (!canStartBreak && !canEndBreak)}
                    variant={context.isOnBreak ? "default" : "outline"}
                    className={cn(
                      "flex-1 h-12",
                      context.isOnBreak 
                        ? "bg-gradient-to-r from-blue-500 to-green-500 text-white" 
                        : "border-orange-400/50 hover:bg-orange-400/10 text-orange-600"
                    )}
                    data-testid="button-break"
                  >
                    {context.isOnBreak ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Termina Pausa
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Inizia Pausa
                      </>
                    )}
                  </Button>

                  {needsBreak && (
                    <Button
                      variant="outline"
                      className="px-4 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                      disabled
                      data-testid="break-indicator"
                    >
                      <Coffee className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ============= ERRORI E WARNINGS ============= */}
          {fsmError && (
            <Alert variant="destructive" data-testid="alert-fsm-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fsmError}</AlertDescription>
            </Alert>
          )}

          {gpsError && (
            <Alert variant="destructive" data-testid="alert-gps-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>GPS Error: {gpsError}</AlertDescription>
            </Alert>
          )}

          {strategiesState.validationResult && !strategiesState.validationResult.isValid && (
            <Alert variant="destructive" data-testid="alert-strategy-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{strategiesState.validationResult.error}</AlertDescription>
            </Alert>
          )}
          
          {/* ✅ MISMATCH INFO BADGE: Show when shift is assigned to different PDV */}
          {assignedShiftInfo && !isLoadingShift && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200" data-testid="assigned-shift-info">
              <div className="flex items-center gap-2 text-blue-800">
                <Building className="h-4 w-4" />
                <span className="text-sm">
                  <strong>Turno di oggi:</strong> {assignedShiftInfo.storeName} 
                  {assignedShiftInfo.startTime && ` (${assignedShiftInfo.startTime} - ${assignedShiftInfo.endTime})`}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* ✅ PDV MISMATCH DIALOG */}
      <Dialog open={mismatchDialogOpen} onOpenChange={setMismatchDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" data-testid="dialog-pdv-mismatch">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Attenzione: PDV Diverso
            </DialogTitle>
            <DialogDescription className="text-gray-700 pt-4">
              <div className="space-y-3">
                <p>
                  Stai selezionando un Punto Vendita diverso da quello assegnato per il turno di oggi.
                </p>
                
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">PDV Assegnato</div>
                    <div className="font-semibold text-green-700">{assignedShiftInfo?.storeName || 'N/A'}</div>
                    {assignedShiftInfo?.startTime && (
                      <div className="text-xs text-gray-600 mt-1">{assignedShiftInfo.startTime} - {assignedShiftInfo.endTime}</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">PDV Selezionato</div>
                    <div className="font-semibold text-orange-700">{pendingStoreSelection.store?.name || 'Diverso'}</div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  Se confermi, il sistema registrerà la timbratura nel PDV selezionato e il tuo responsabile riceverà una notifica.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleMismatchCancel}
              className="w-full sm:w-auto"
              data-testid="button-mismatch-cancel"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Usa PDV Assegnato
            </Button>
            <Button
              onClick={handleMismatchConfirm}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
              data-testid="button-mismatch-confirm"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Conferma PDV Diverso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ✅ CLOCK ENTRY VALIDATION DIALOG - Show anomaly warnings before clock action */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-clock-validation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Attenzione: Anomalie Rilevate
            </DialogTitle>
            <DialogDescription className="text-gray-700 pt-4">
              <div className="space-y-4">
                <p className="text-sm">
                  Il sistema ha rilevato le seguenti anomalie per questa timbratura:
                </p>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {validationWarnings.map((warning, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border flex items-start gap-3",
                        warning.severity === 'critical' && "bg-red-50 border-red-200",
                        warning.severity === 'high' && "bg-orange-50 border-orange-200",
                        warning.severity === 'medium' && "bg-amber-50 border-amber-200",
                        warning.severity === 'low' && "bg-blue-50 border-blue-200"
                      )}
                      data-testid={`warning-${warning.type}`}
                    >
                      <div className={cn(
                        "flex-shrink-0 p-1 rounded-full",
                        warning.severity === 'critical' && "bg-red-100 text-red-600",
                        warning.severity === 'high' && "bg-orange-100 text-orange-600",
                        warning.severity === 'medium' && "bg-amber-100 text-amber-600",
                        warning.severity === 'low' && "bg-blue-100 text-blue-600"
                      )}>
                        {warning.severity === 'critical' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={cn(
                          "text-sm font-medium",
                          warning.severity === 'critical' && "text-red-800",
                          warning.severity === 'high' && "text-orange-800",
                          warning.severity === 'medium' && "text-amber-800",
                          warning.severity === 'low' && "text-blue-800"
                        )}>
                          {warning.message}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "mt-1 text-xs",
                            warning.severity === 'critical' && "border-red-300 text-red-700",
                            warning.severity === 'high' && "border-orange-300 text-orange-700",
                            warning.severity === 'medium' && "border-amber-300 text-amber-700",
                            warning.severity === 'low' && "border-blue-300 text-blue-700"
                          )}
                        >
                          {warning.severity === 'critical' ? 'Critico' : 
                           warning.severity === 'high' ? 'Alto' :
                           warning.severity === 'medium' ? 'Medio' : 'Basso'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {validationWarnings.some(w => w.severity === 'critical') ? (
                  <Alert variant="destructive" className="mt-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Blocco:</strong> Non è possibile procedere con anomalie critiche. Contatta il responsabile.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-gray-600 mt-4">
                    Puoi comunque procedere con la timbratura. Le anomalie verranno segnalate al responsabile.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleValidationCancel}
              className="w-full sm:w-auto"
              data-testid="button-validation-cancel"
            >
              Annulla
            </Button>
            {!validationWarnings.some(w => w.severity === 'critical') && (
              <Button
                onClick={handleValidationConfirm}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600"
                data-testid="button-validation-confirm"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Procedi Comunque
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}