// Clock Widget Component - Enterprise Time Tracking
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { timeTrackingService, ClockInData, NearbyStore } from '@/services/timeTrackingService';
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

type TrackingMethod = 'badge' | 'nfc' | 'app' | 'gps' | 'manual' | 'biometric';

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
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('app');
  const [isLoading, setIsLoading] = useState(false);
  // GPS states removed - now handled by useStoreResolution hook
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store Resolution Hook - NEW GPS SYSTEM
  const {
    selectedStore,
    autoDetected,
    isResolving: isResolvingStore,
    gpsError
  } = useStoreResolution();
  
  // Store selection state - NEW SYSTEM
  const [selectedStoreForAction, setSelectedStoreForAction] = useState<NearbyStore | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Check for active session on mount
  useEffect(() => {
    checkActiveSession();
  }, []);

  // Start timer when active
  useEffect(() => {
    if (isActive && !isOnBreak) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, isOnBreak]);

  // GPS location handling removed - now managed by useStoreResolution hook and StoreSelector component

  const checkActiveSession = async () => {
    try {
      const session = await timeTrackingService.getCurrentSession();
      if (session) {
        setIsActive(true);
        setSessionId(session.id);
        setElapsedTime(session.elapsedMinutes * 60);
        setIsOnBreak(!!session.currentBreak);
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
    }
  };

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
      toast({
        title: 'Store non selezionato',
        description: 'Seleziona un punto vendita prima di continuare',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

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

      const response = await timeTrackingService.clockIn(data);
      
      setSessionId(response.id);
      setIsActive(true);
      setElapsedTime(0);
      
      toast({
        title: "Timbratura Entrata",
        description: `Registrata con successo alle ${format(new Date(), 'HH:mm')} - ${activeStore?.name || fallbackStoreName || 'Store'}`,
      });
      
      // Reset override state after successful action
      setIsOverriding(false);
      setOverrideReason('');
      
      if (onClockIn) onClockIn();
    } catch (error) {
      toast({
        title: "Errore Timbratura",
        description: "Impossibile registrare l'entrata",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);

    try {
      await timeTrackingService.clockOut(sessionId);
      
      setIsActive(false);
      setSessionId(null);
      setElapsedTime(0);
      setIsOnBreak(false);
      
      toast({
        title: "Timbratura Uscita",
        description: `Registrata con successo alle ${format(new Date(), 'HH:mm')}`,
      });
      
      if (onClockOut) onClockOut();
    } catch (error) {
      toast({
        title: "Errore Timbratura",
        description: "Impossibile registrare l'uscita",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreak = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);

    try {
      if (!isOnBreak) {
        await timeTrackingService.startBreak(sessionId);
        setIsOnBreak(true);
        toast({
          title: "Pausa Iniziata",
          description: "La pausa è stata registrata",
          });
      } else {
        await timeTrackingService.endBreak(sessionId);
        setIsOnBreak(false);
        toast({
          title: "Pausa Terminata",
          description: "Sei tornato al lavoro",
          });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile gestire la pausa",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOvertime = elapsedTime > 8 * 3600; // 8 hours
  const requiresBreak = elapsedTime > 6 * 3600 && !isOnBreak; // 6 hours

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
              variant={isActive ? "destructive" : "default"}
              className={cn(
                "rounded-full w-12 h-12",
                isActive
                  ? "bg-gradient-to-r from-red-500 to-orange-500"
                  : "bg-gradient-to-r from-green-500 to-blue-500"
              )}
              onClick={isActive ? handleClockOut : handleClockIn}
              disabled={isLoading}
              data-testid="button-clock-compact"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isActive ? (
                <Power className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <div>
              <div className="text-sm font-medium">
                {isActive ? 'In Turno' : 'Fuori Turno'}
              </div>
              {isActive && (
                <div className="text-xs text-gray-400 font-mono">
                  {formatElapsedTime(elapsedTime)}
                </div>
              )}
            </div>
          </div>
          {isActive && (
            <Badge variant={isOnBreak ? "warning" : "default"}>
              {isOnBreak ? 'In Pausa' : 'Attivo'}
            </Badge>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "p-6 bg-white/5 backdrop-blur-xl border-white/10",
        className
      )}
      data-testid="clock-widget"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Timbratura
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {fallbackStoreName || 'Store'} • {userName || 'User'}
          </p>
        </div>
        <Badge
          variant={isActive ? (isOnBreak ? "warning" : "success") : "secondary"}
          className="text-xs"
        >
          {isActive ? (isOnBreak ? 'In Pausa' : 'In Turno') : 'Fuori Turno'}
        </Badge>
      </div>

      {/* Store Selector - NEW GPS SYSTEM */}
      <div className="mb-6">
        <StoreSelector
          onStoreSelected={handleStoreSelected}
          disabled={isLoading || isResolvingStore}
          autoDetectEnabled={trackingMethod === 'gps'}
        />
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <motion.div
          key={isActive ? 'active' : 'inactive'}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "text-5xl font-mono font-bold",
            isActive ? (isOvertime ? 'text-orange-400' : 'text-green-400') : 'text-gray-400'
          )}
          data-testid="timer-display"
        >
          {formatElapsedTime(elapsedTime)}
        </motion.div>
        {isActive && (
          <p className="text-sm text-gray-400 mt-2">
            Iniziato alle {format(new Date(Date.now() - elapsedTime * 1000), 'HH:mm')}
          </p>
        )}
        {requiresBreak && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-orange-400 mt-2 flex items-center justify-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            Pausa obbligatoria dopo 6 ore
          </motion.p>
        )}
      </div>

      {/* Tracking Method Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Metodo Timbratura</label>
        <div className="grid grid-cols-3 gap-2">
          {TRACKING_METHODS.map((method) => (
            <Button
              key={method.value}
              variant={trackingMethod === method.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTrackingMethod(method.value)}
              disabled={isActive}
              className="flex items-center gap-1"
              data-testid={`method-${method.value}`}
            >
              {method.icon}
              <span className="text-xs">{method.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Location Display */}
      {/* GPS location display removed - now handled by StoreSelector component */}

      {/* Main Clock Button */}
      <div className="flex gap-3">
        {!isActive ? (
          <Button
            onClick={handleClockIn}
            disabled={isLoading}
            className="flex-1 h-12 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            data-testid="button-clock-in"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Registrazione...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Timbra Entrata
              </>
            )}
          </Button>
        ) : (
          <>
            {!isOnBreak && (
              <Button
                onClick={handleBreak}
                disabled={isLoading}
                variant="outline"
                className="flex-1 h-12 border-orange-500/50 hover:bg-orange-500/10"
                data-testid="button-pause"
              >
                <Pause className="w-5 h-5 mr-2" />
                Pausa
              </Button>
            )}
            {isOnBreak && (
              <Button
                onClick={handleBreak}
                disabled={isLoading}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-green-500"
                data-testid="button-resume"
              >
                <Play className="w-5 h-5 mr-2" />
                Riprendi
              </Button>
            )}
            <Button
              onClick={handleClockOut}
              disabled={isLoading || isOnBreak}
              className="flex-1 h-12 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              data-testid="button-clock-out"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registrazione...
                </>
              ) : (
                <>
                  <Power className="w-5 h-5 mr-2" />
                  Timbra Uscita
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Status Indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center justify-center gap-2"
          >
            <Activity className="w-4 h-4 text-green-400 animate-pulse" />
            <span className="text-sm text-gray-400">Sessione Attiva</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}