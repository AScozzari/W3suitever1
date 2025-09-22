// UnifiedClockingPanel.tsx - Singolo componente per tutto il sistema di timbratura
// Contiene: Clock in/out + PDV selection + Tipologia timbratura + Form dinamico

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
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
import { useStoreResolution } from '@/hooks/useStoreResolution';
import { StrategyType, TrackingMethod } from '@/types/timeAttendanceFSM';
import { NearbyStore } from '@/services/timeTrackingService';

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
  defaultStrategy = 'gps',
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

  // Store Resolution Hook
  const {
    selectedStore,
    nearbyStores,
    autoDetected,
    isResolving: isResolvingStore,
    gpsError,
    gpsPosition
  } = useStoreResolution();

  // Local state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedStrategyType, setSelectedStrategyType] = useState<StrategyType>(defaultStrategy);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Timer per clock corrente
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-select store quando rilevato
  useEffect(() => {
    if (selectedStore && autoDetected) {
      selectStore(selectedStore);
      setSelectedStoreId(selectedStore.id);
    }
  }, [selectedStore, autoDetected, selectStore]);

  // Filtra strategie abilitate da HR Management
  const availableStrategyConfigs = STRATEGY_CONFIGS.filter(config => 
    !enabledStrategies || enabledStrategies.includes(config.type)
  );

  // Configurazione strategia selezionata
  const activeStrategyConfig = STRATEGY_CONFIGS.find(s => s.type === selectedStrategyType);

  // Handler cambio strategia
  const handleStrategyChange = async (strategyType: StrategyType) => {
    setSelectedStrategyType(strategyType);
    const success = await strategiesActions.selectStrategy(strategyType);
    if (success && context) {
      await strategiesActions.prepareStrategy(context);
    }
  };

  // Handler cambio store
  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    const store = nearbyStores.find(s => s.id === storeId);
    if (store) {
      selectStore(store);
    }
  };

  // Handler Clock In
  const handleClockIn = async () => {
    if (!selectedStoreId || !selectedStrategyType) {
      toast({
        title: 'Dati Mancanti',
        description: 'Seleziona store e metodo timbratura',
        variant: 'destructive'
      });
      return;
    }

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

  // Handler Clock Out
  const handleClockOut = async () => {
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
                  <SelectContent>
                    {nearbyStores.map((store) => (
                      <SelectItem key={store.id} value={store.id} data-testid={`option-store-${store.id}`}>
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <div className="font-medium">{store.name}</div>
                            <div className="text-xs text-gray-500">{store.address}</div>
                          </div>
                          {store.distance && store.distance <= 200 && (
                            <Badge variant="default" className="ml-2 text-xs bg-green-600">GPS</Badge>
                          )}
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

                <Select value={selectedStrategyType} onValueChange={handleStrategyChange}>
                  <SelectTrigger className="w-full" data-testid="select-strategy">
                    <SelectValue placeholder="Seleziona metodo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStrategyConfigs.map((config) => {
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
                    })}
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
        </div>
      </CardContent>
    </Card>
  );
}