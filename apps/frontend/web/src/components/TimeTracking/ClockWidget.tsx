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
import { TimeAttendanceState, TrackingMethod } from '@/types/timeAttendanceFSM';
import { ClockInData, NearbyStore } from '@/services/timeTrackingService';
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

// TrackingMethod is now imported from FSM types

const TRACKING_METHODS: {
  value: TrackingMethod;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'app', label: 'App', icon: <Smartphone className="w-4 h-4" />, color: 'blue' },
  { value: 'gps', label: 'GPS', icon: <MapPin className="w-4 h-4" />, color: 'green' },
  { value: 'badge', label: 'Badge', icon: <CreditCard className="w-4 h-4" />, color: 'purple' },
  { value: 'nfc', label: 'NFC', icon: <Wifi className="w-4 h-4" />, color: 'orange' },
  { value: 'biometric', label: 'Biometric', icon: <Fingerprint className="w-4 h-4" />, color: 'red' },
  { value: 'manual', label: 'Manual', icon: <User className="w-4 h-4" />, color: 'gray' },
];

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
  
  // Local UI state
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('app');
  
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

  // Auto-select tracking method and store when available
  useEffect(() => {
    if (trackingMethod && !fsm.context.selectedMethod) {
      fsm.selectMethod(trackingMethod);
    }
  }, [trackingMethod, fsm.context.selectedMethod]);
  
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

    try {
      // GPS location from store resolution system
      let geoLocation;
      if (trackingMethod === 'gps' && activeStore) {
        geoLocation = {
          lat: activeStore.latitude,
          lng: activeStore.longitude,
          accuracy: 20, // Estimated
          address: `${activeStore.address || ''}, ${activeStore.city || ''}, ${activeStore.province || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Posizione rilevata',
        };
      }

      const data: ClockInData = {
        storeId: activeStoreId,
        trackingMethod,
        geoLocation,
        deviceInfo: {
          deviceType: 'web',
          userAgent: navigator.userAgent,
        },
      };
      
      // NEW AUDIT FIELDS for geofencing compliance
      if (activeStore) {
        data.wasOverride = isOverriding;
        if (overrideReason) {
          data.overrideReason = overrideReason;
        }
      }

      // Use FSM clock in instead of direct service call
      await fsm.clockIn(data);
      
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

        {/* MIDDLE ROW: Tracking Methods - Responsive Horizontal Layout */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Metodo Timbratura
          </label>
          <div className="flex flex-wrap gap-2">
            {TRACKING_METHODS.slice(0, 4).map((method) => {
              const isSelected = trackingMethod === method.value;
              return (
                <Button
                  key={method.value}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTrackingMethod(method.value)}
                  disabled={fsm.isActive}
                  className={cn(
                    "h-9 px-3 text-xs flex-1 sm:flex-initial min-w-[80px]",
                    isSelected 
                      ? "bg-windtre-orange text-white border-windtre-orange" 
                      : "glass-light border-white/20 hover:bg-windtre-orange/10"
                  )}
                  data-testid={`method-${method.value}`}
                >
                  {method.icon}
                  <span className="ml-1">{method.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ROW: Action Buttons - Full Width */}
        <div className="flex-1 flex flex-col justify-end">
          {!fsm.isActive ? (
            <Button
              onClick={handleClockIn}
              disabled={fsm.isLoading || !fsm.canClockIn}
              className="w-full h-14 bg-gradient-to-r from-windtre-orange to-windtre-purple hover:from-orange-600 hover:to-purple-600 text-white font-bold text-lg shadow-lg"
              data-testid="button-clock-in"
            >
              {fsm.isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Registrazione in corso...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-3" />
                  REGISTRA ENTRATA
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
        <StoreSelector
          onStoreSelected={handleStoreSelected}
          disabled={fsm.isLoading || isResolvingStore}
          autoDetectEnabled={trackingMethod === 'gps'}
          compact
        />
      </div>
    </Card>
  );
}