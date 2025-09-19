// Clock Widget Component - Enterprise Time Tracking with FSM
import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  MapPin,
  Wifi,
  CreditCard,
  Smartphone,
  Fingerprint,
  User,
  Power,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTimeAttendanceFSM } from '@/hooks/useTimeAttendanceFSM';
import { TimeAttendanceState, TrackingMethod, StrategyType } from '@/types/timeAttendanceFSM';
import { ClockInData, NearbyStore } from '@/services/timeTrackingService';
import { useTimeAttendanceStrategies } from '@/hooks/useTimeAttendanceStrategies';
import { ALL_STRATEGIES, getAvailableStrategies } from '@/strategies';
import {
  geolocationManager,
  requestLocationPermission,
  GeoPosition,
} from '@/utils/geolocationManager';
import { useStoreResolution } from '@/hooks/useStoreResolution';
import StoreSelector from './StoreSelector';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ClockWidgetProps {
  storeId?: string; // Optional - will be determined by GPS resolution
  storeName?: string; // Optional - will be determined by GPS resolution
  userId: string;
  userName?: string;
  compact?: boolean;
  onClockIn?: () => void;
  onClockOut?: () => void;
  className?: string;
}

// Strategy Pattern - Dynamic tracking methods from available strategies

export default function ClockWidget({
  storeId: fallbackStoreId,
  storeName: fallbackStoreName,
  userId,
  userName,
  compact = false,
  onClockIn,
  onClockOut,
  className,
}: ClockWidgetProps) {
  // Initialize FSM Hook - centralized state management
  const fsm = useTimeAttendanceFSM(userId);
  
  // Strategy Manager Hook - NEW STRATEGY PATTERN INTEGRATION
  const [strategyState, strategyActions] = useTimeAttendanceStrategies({
    autoInitialize: true,
    context: fsm.context,
    onStrategyChange: (strategy) => {
      if (strategy) {
        console.log(`[ClockWidget] Strategy selected: ${strategy.type}`);
        // Map strategy type to FSM tracking method
        const trackingMethod = mapStrategyToTrackingMethod(strategy.type);
        fsm.selectMethod(trackingMethod);
      }
    },
    onError: (error) => {
      console.error('[ClockWidget] Strategy error:', error);
    }
  });
  
  // Local UI state - now using StrategyType instead of TrackingMethod
  const [selectedStrategyType, setSelectedStrategyType] = useState<StrategyType>('web');
  
  // Store Resolution Hook - GPS SYSTEM
  const {
    selectedStore,
    autoDetected,
    isResolving: isResolvingStore,
    gpsError,
    gpsPosition,
    hasGpsPermission
  } = useStoreResolution();
  
  // Calculate geolocation validation for FSM
  const isGeoLocationValid = !gpsError && selectedStore?.inGeofence === true && hasGpsPermission;
  
  // Store selection state for override scenarios
  const [selectedStoreForAction, setSelectedStoreForAction] = useState<NearbyStore | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Helper function to map strategy types to FSM tracking methods
  const mapStrategyToTrackingMethod = (strategyType: StrategyType): TrackingMethod => {
    switch (strategyType) {
      case 'gps': return 'gps';
      case 'nfc': return 'nfc';
      case 'badge': return 'badge';
      case 'qr': return 'app'; // QR maps to app method in FSM
      case 'smart': return 'app'; // Smart maps to app method in FSM
      case 'web': return 'app'; // Web maps to app method in FSM
      default: return 'app';
    }
  };

  // Helper function to get strategy icons
  const getStrategyIcon = (strategyType: StrategyType): React.ReactNode => {
    switch (strategyType) {
      case 'gps': return <MapPin className="w-4 h-4" />;
      case 'nfc': return <Wifi className="w-4 h-4" />;
      case 'badge': return <CreditCard className="w-4 h-4" />;
      case 'qr': return <CheckCircle className="w-4 h-4" />;
      case 'smart': return <Activity className="w-4 h-4" />;
      case 'web': return <Smartphone className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  // Auto-select strategy and prepare when available
  useEffect(() => {
    if (selectedStrategyType && !strategyState.selectedStrategy) {
      strategyActions.selectStrategy(selectedStrategyType);
    }
  }, [selectedStrategyType, strategyState.selectedStrategy]);

  // Auto-prepare strategy when store is selected
  useEffect(() => {
    if (strategyState.selectedStrategy && fsm.context.selectedStore && !strategyState.prepareResult) {
      strategyActions.prepareStrategy(fsm.context);
    }
  }, [strategyState.selectedStrategy, fsm.context.selectedStore, strategyState.prepareResult]);
  
  useEffect(() => {
    const storeToSelect = selectedStoreForAction || selectedStore;
    if (storeToSelect && !fsm.context.selectedStore) {
      fsm.selectStore(storeToSelect);
    }
  }, [selectedStoreForAction, selectedStore, fsm.context.selectedStore]);
  
  // Update FSM geolocation validation when it changes
  useEffect(() => {
    if (fsm.updateGeolocationValid) {
      fsm.updateGeolocationValid(isGeoLocationValid);
    }
  }, [isGeoLocationValid, fsm.updateGeolocationValid]);

  // Note: Session management is now handled by the FSM hook automatically

  // Store Selection Handler - NEW SYSTEM
  const handleStoreSelected = (store: NearbyStore | null, isOverride: boolean, overrideReason?: string) => {
    setSelectedStoreForAction(store);
    setIsOverriding(isOverride);
    setOverrideReason(overrideReason || '');
  };

  const handleClockIn = async () => {
    // Check if store is selected when GPS is being used
    const activeStore = selectedStoreForAction || selectedStore;
    const activeStoreId = activeStore?.id || fallbackStoreId;
    
    if (!activeStoreId) {
      return; // FSM will handle validation and error messages
    }

    if (!strategyState.selectedStrategy) {
      console.error('[ClockWidget] No strategy selected for clock in');
      return;
    }

    try {
      // STRATEGY PATTERN: Validate strategy before proceeding
      const validationResult = await strategyActions.validateStrategy(fsm.context);
      if (!validationResult.isValid) {
        console.error('[ClockWidget] Strategy validation failed:', validationResult.error);
        return;
      }

      // STRATEGY PATTERN: Create base payload for augmentation
      const basePayload: Partial<ClockInData> = {
        storeId: activeStoreId,
        deviceInfo: {
          deviceType: 'web',
          userAgent: navigator.userAgent,
        },
      };
      
      // Add legacy geolocation for GPS compatibility
      if (selectedStrategyType === 'gps' && activeStore) {
        basePayload.geoLocation = {
          lat: activeStore.latitude,
          lng: activeStore.longitude,
          accuracy: 20, // Estimated
          address: `${activeStore.address || ''}, ${activeStore.city || ''}, ${activeStore.province || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Posizione rilevata',
        };
      }
      
      // NEW AUDIT FIELDS for geofencing compliance
      if (activeStore) {
        basePayload.wasOverride = isOverriding;
        if (overrideReason) {
          basePayload.overrideReason = overrideReason;
        }
      }

      // STRATEGY PATTERN: Augment payload with strategy-specific data
      const augmentedPayload = await strategyActions.augmentPayload(basePayload, fsm.context);
      
      console.log(`[ClockWidget] Strategy-augmented payload:`, augmentedPayload);

      // Use FSM clock in with strategy-augmented payload
      await fsm.clockIn(augmentedPayload);
      
      // Reset override state after successful action
      setIsOverriding(false);
      setOverrideReason('');
      
      if (onClockIn) onClockIn();
    } catch (error) {
      console.error('Clock in error:', error);
      // FSM handles error states and notifications
    }
  };

  const handleClockOut = async () => {
    try {
      // Use FSM clock out instead of direct service call
      await fsm.clockOut();
      
      if (onClockOut) onClockOut();
    } catch (error) {
      console.error('Clock out error:', error);
      // FSM handles error states and notifications
    }
  };

  const handleBreak = async () => {
    try {
      if (!fsm.isOnBreak) {
        await fsm.startBreak();
      } else {
        await fsm.endBreak();
      }
    } catch (error) {
      console.error('Break operation error:', error);
      // FSM handles error states and notifications
    }
  };

  // Format elapsed time using FSM's elapsed time
  const formatElapsedTime = (timeObj: { hours: number; minutes: number; seconds: number }): string => {
    return `${timeObj.hours.toString().padStart(2, '0')}:${timeObj.minutes
      .toString()
      .padStart(2, '0')}:${timeObj.seconds.toString().padStart(2, '0')}`;
  };

  // Use FSM computed states instead of local calculations
  const isOvertime = fsm.isOvertime;
  const requiresBreak = fsm.needsBreak;

  if (compact) {
    return (
      <Card
        className={cn(
          "p-4 bg-white/5 backdrop-blur-xl border-white/10",
          className
        )}
        data-testid="clock-widget-compact"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant={fsm.isActive ? "destructive" : "default"}
              className={cn(
                "rounded-full w-12 h-12",
                fsm.isActive
                  ? "bg-gradient-to-r from-red-500 to-orange-500"
                  : "bg-gradient-to-r from-green-500 to-blue-500"
              )}
              onClick={fsm.isActive ? handleClockOut : handleClockIn}
              disabled={fsm.isLoading || (fsm.isActive ? !fsm.canClockOut : !fsm.canClockIn)}
              data-testid="button-clock-compact"
            >
              {fsm.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : fsm.isActive ? (
                <Power className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <div>
              <div className="text-sm font-medium">
                {fsm.isActive ? 'In Turno' : 'Fuori Turno'}
              </div>
              {fsm.isActive && (
                <div className="text-xs text-gray-400 font-mono">
                  {formatElapsedTime(fsm.elapsedTime)}
                </div>
              )}
            </div>
          </div>
          {fsm.isActive && (
            <Badge variant={fsm.isOnBreak ? "warning" : "default"}>
              {fsm.isOnBreak ? 'In Pausa' : 'Attivo'}
            </Badge>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "glass-card p-4 min-h-[200px]",
        className
      )}
      data-testid="clock-widget"
    >
      {/* MOBILE-FIRST RESPONSIVE FLEXBOX LAYOUT */}
      <div className="flex flex-col space-y-4 h-full">
        
        {/* TOP ROW: Timer Display + Status - Always Horizontal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* TIMER DISPLAY - Primary Focus */}
          <div className="flex-shrink-0">
            <motion.div
              key={fsm.isActive ? 'active' : 'inactive'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-mono font-bold leading-none",
                fsm.isActive ? (isOvertime ? 'text-red-500' : 'text-green-500') : 'text-gray-400'
              )}
              data-testid="timer-display"
            >
              {formatElapsedTime(fsm.elapsedTime)}
            </motion.div>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={fsm.isActive ? (fsm.isOnBreak ? "warning" : "default") : "secondary"}
                className="text-xs font-medium"
              >
                {fsm.isActive ? (fsm.isOnBreak ? 'In Pausa' : 'In Turno') : 'Fuori Turno'}
              </Badge>
              {fsm.isActive && (
                <Activity className="w-4 h-4 text-green-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* STORE INFO & STATUS */}
          <div className="flex-1 sm:flex-initial space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-windtre-orange" />
              <h3 className="text-sm font-semibold">Sistema Timbratura</h3>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {selectedStore?.name || fallbackStoreName || 'Store non selezionato'}
              </p>
              <p className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {userName || 'User'}
              </p>
              {fsm.isActive && fsm.context.startTime && (
                <p className="flex items-center gap-1 text-green-600">
                  <Clock className="w-3 h-3" />
                  Iniziato: {format(fsm.context.startTime, 'HH:mm')}
                </p>
              )}
            </div>
            {requiresBreak && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 text-xs text-orange-500 bg-orange-50 p-2 rounded-md"
              >
                <AlertCircle className="w-3 h-3" />
                <span>Pausa obbligatoria richiesta</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* MIDDLE ROW: Strategy Selection - Dynamic from Available Strategies */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Metodo Timbratura
          </label>
          <div className="flex flex-wrap gap-2">
            {strategyState.availableStrategies.slice(0, 6).map((strategy) => {
              const isSelected = selectedStrategyType === strategy.type;
              const isAvailable = strategy.isAvailable();
              
              return (
                <Button
                  key={strategy.type}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStrategyType(strategy.type)}
                  disabled={fsm.isActive || !isAvailable}
                  className={cn(
                    "h-9 px-3 text-xs flex-1 sm:flex-initial min-w-[80px]",
                    isSelected 
                      ? "bg-windtre-orange text-white border-windtre-orange" 
                      : "glass-light border-white/20 hover:bg-windtre-orange/10",
                    !isAvailable && "opacity-50 cursor-not-allowed"
                  )}
                  data-testid={`strategy-${strategy.type}`}
                >
                  {getStrategyIcon(strategy.type)}
                  <span className="ml-1">{strategy.name}</span>
                </Button>
              );
            })}
          </div>
          
          {/* Strategy Status Display */}
          {strategyState.selectedStrategy && (
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                {strategyState.isPreparing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Preparazione {strategyState.selectedStrategy.name}...</span>
                  </>
                ) : strategyState.prepareResult?.success ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{strategyState.selectedStrategy.name} pronto</span>
                  </>
                ) : strategyState.prepareResult?.error ? (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    <span>Errore: {strategyState.prepareResult.error}</span>
                  </>
                ) : null}
              </div>
              
              {strategyState.validationResult && !strategyState.validationResult.isValid && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>{strategyState.validationResult.error}</span>
                </div>
              )}
              
              {strategyState.validationResult?.warnings?.map((warning, index) => (
                <div key={index} className="flex items-center gap-1 text-orange-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM ROW: Action Buttons - Full Width */}
        <div className="flex-1 flex flex-col justify-end">
          {!fsm.isActive ? (
            <Button
              onClick={handleClockIn}
              disabled={
                fsm.isLoading || 
                !fsm.canClockIn || 
                !strategyState.selectedStrategy ||
                strategyState.isPreparing ||
                (strategyState.validationResult && !strategyState.validationResult.isValid)
              }
              className="w-full h-14 bg-gradient-to-r from-windtre-orange to-windtre-purple hover:from-orange-600 hover:to-purple-600 text-white font-bold text-lg shadow-lg"
              data-testid="button-clock-in"
            >
              {fsm.isLoading || strategyState.isPreparing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  {strategyState.isPreparing ? 'Preparazione...' : 'Registrazione in corso...'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-3" />
                  REGISTRA ENTRATA ({strategyState.selectedStrategy?.name || 'N/A'})
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleClockOut}
                disabled={fsm.isLoading || !fsm.canClockOut}
                className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-lg"
                data-testid="button-clock-out"
              >
                {fsm.isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <>
                    <Power className="w-4 h-4 mr-2" />
                    REGISTRA USCITA
                  </>
                )}
              </Button>
              
              <div className="flex gap-2">
                {!fsm.isOnBreak ? (
                  <Button
                    onClick={handleBreak}
                    disabled={fsm.isLoading || !fsm.canStartBreak}
                    variant="outline"
                    className="flex-1 h-10 border-orange-400/50 hover:bg-orange-400/10 text-orange-600"
                    data-testid="button-pause"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Inizia Pausa
                  </Button>
                ) : (
                  <Button
                    onClick={handleBreak}
                    disabled={fsm.isLoading || !fsm.canEndBreak}
                    className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-green-500 text-white"
                    data-testid="button-resume"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Termina Pausa
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STORE SELECTOR - Horizontal Integration with Error Boundary */}
      <div className="mt-6 pt-4 border-t border-white/10">
        {gpsError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md"
          >
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>GPS non disponibile: {gpsError}</span>
            </div>
          </motion.div>
        )}
        
        {/* STRATEGY PANEL - NEW FEATURE */}
        {strategyState.selectedStrategy && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3"
          >
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Configurazione {strategyState.selectedStrategy.name}
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              {strategyState.selectedStrategy.renderPanel({
                isActive: true,
                isLoading: fsm.isLoading || strategyState.isPreparing,
                context: fsm.context,
                onAction: (action, data) => {
                  console.log(`[ClockWidget] Strategy action:`, action, data);
                },
                compact: true
              })}
            </div>
          </motion.div>
        )}
        
        <StoreSelector
          onStoreSelected={handleStoreSelected}
          disabled={fsm.isLoading || isResolvingStore}
          autoDetectEnabled={selectedStrategyType === 'gps'}
          compact
        />
      </div>
    </Card>
  );
}