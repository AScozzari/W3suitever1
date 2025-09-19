import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, MapPin, Wifi, Smartphone, QrCode, CreditCard,
  CheckCircle, XCircle, AlertCircle, Loader2, 
  Activity, Coffee, LogIn, LogOut, Shield,
  Navigation, WifiOff, Signal, Battery, Camera,
  ChevronRight, RefreshCw, Settings, Globe,
  Fingerprint, Eye, EyeOff, Volume2, VolumeX, Sparkles,
  Play, Pause, StopCircle, Timer, MapPinIcon,
  Building, User, Calendar, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useClockIn, useClockOut, useCurrentSession } from '@/hooks/useTimeTracking';
import { geolocationManager } from '@/utils/geolocationManager';
import { timeTrackingService, NearbyStore } from '@/services/timeTrackingService';
import { useStoreResolution } from '@/hooks/useStoreResolution';
import StoreSelector from './StoreSelector';
import { cn } from '@/lib/utils';

// Tipi per i metodi di timbratura
type TrackingMethod = 'gps' | 'qr' | 'nfc' | 'web' | 'smart';

interface TimbratureTabProps {
  userId: string;
  storeId?: string; // Optional - will be determined by GPS resolution
  storeName?: string; // Optional - will be determined by GPS resolution
}

export default function TimbratureTab({ userId, storeId: fallbackStoreId, storeName: fallbackStoreName }: TimbratureTabProps) {
  const { toast } = useToast();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const { session, isActive, elapsedMinutes, isOvertime, requiresBreak, refetch } = useCurrentSession();
  
  // Store Resolution Hook - NEW GPS SYSTEM
  const {
    selectedStore,
    autoDetected,
    isResolving: isResolvingStore,
    gpsError,
    gpsPosition
  } = useStoreResolution();
  
  // Stati principali - Horizontal Layout Optimized
  const [selectedMethod, setSelectedMethod] = useState<TrackingMethod>('gps');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [qrTimer, setQrTimer] = useState(30);
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [nfcReady, setNfcReady] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Store selection state - NEW SYSTEM
  const [selectedStoreForAction, setSelectedStoreForAction] = useState<NearbyStore | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  
  // Timers - Horizontal Layout Optimized
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for current time display - horizontal layout needs real-time updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Configurazione metodi disponibili con WindTre colors - HORIZONTAL GRID
  const trackingMethods = [
    {
      id: 'gps' as TrackingMethod,
      name: 'GPS',
      icon: MapPin,
      description: 'Posizione automatica',
      color: 'from-orange-500 to-orange-600',
      windtreColor: 'windtre-orange',
      available: true,
      priority: 1,
    },
    {
      id: 'qr' as TrackingMethod,
      name: 'QR Code',
      icon: QrCode,
      description: 'Scansiona QR',
      color: 'from-purple-500 to-purple-600',
      windtreColor: 'windtre-purple',
      available: true,
      priority: 2,
    },
    {
      id: 'nfc' as TrackingMethod,
      name: 'NFC',
      icon: CreditCard,
      description: 'Badge virtuale',
      color: 'from-blue-500 to-blue-600',
      windtreColor: 'windtre-purple',
      available: typeof (window as any).NDEFReader !== 'undefined',
      priority: 3,
    },
    {
      id: 'web' as TrackingMethod,
      name: 'Web',
      icon: Globe,
      description: 'Da browser',
      color: 'from-green-500 to-green-600',
      windtreColor: 'windtre-orange',
      available: true,
      priority: 4,
    },
    {
      id: 'smart' as TrackingMethod,
      name: 'Smart',
      icon: Sparkles,
      description: 'Auto-detect',
      color: 'from-pink-500 to-pink-600',
      windtreColor: 'windtre-purple',
      available: true,
      priority: 5,
    },
  ];

  // Inizializzazione - GPS now handled by useStoreResolution hook
  useEffect(() => {
    if (selectedMethod === 'qr') {
      generateQRCode();
    } else if (selectedMethod === 'smart') {
      detectSmartEnvironment();
    } else if (selectedMethod === 'nfc') {
      initializeNFC();
    }

    return () => {
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    };
  }, [selectedMethod]);

  // Session refresh interval - mount-only to prevent recreation on method change
  useEffect(() => {
    sessionIntervalRef.current = setInterval(() => {
      refetch();
    }, 30000);

    return () => {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
    };
  }, []); // Empty dependency array = mount-only

  // Store Selection Handler - NEW SYSTEM
  const handleStoreSelected = (store: NearbyStore | null, isOverride: boolean, overrideReason?: string) => {
    setSelectedStoreForAction(store);
    setIsOverriding(isOverride);
    setOverrideReason(overrideReason || '');
  };
  
  // QR Code Generation - Updated to use selected store
  const generateQRCode = () => {
    const activeStoreId = selectedStoreForAction?.id || selectedStore?.id || fallbackStoreId || 'UNKNOWN';
    const code = `W3-${activeStoreId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setQrCode(code);
    setQrTimer(30);

    // Rigenera ogni 30 secondi
    if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    qrIntervalRef.current = setInterval(() => {
      const newCode = `W3-${activeStoreId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setQrCode(newCode);
      setQrTimer(30);
    }, 30000);

    // Timer countdown - store in ref to prevent memory leaks
    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    qrCountdownRef.current = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Smart Detection
  const detectSmartEnvironment = async () => {
    try {
      // Smart detection: GPS + WiFi + NFC
      const checks = {
        gps: false,
        wifi: false,
        nfc: false
      };

      // Check GPS
      const position = await geolocationManager.getCurrentPosition();
      if (position) {
        checks.gps = true; // Simplified for horizontal layout
      }

      // Check WiFi networks from database configuration
      try {
        const activeStoreId = selectedStoreForAction?.id || selectedStore?.id || fallbackStoreId;
        if (activeStoreId) {
          const response = await fetch(`/api/stores/${activeStoreId}/location`);
          if (response.ok) {
            const storeData = await response.json();
            const configuredNetworks = storeData.wifiNetworks || [];
            
            if (configuredNetworks.length > 0) {
              setWifiNetworks(configuredNetworks.map((ssid: string) => ({
                ssid,
                signal: -45 - Math.random() * 20,
                connected: Math.random() > 0.5
              })));
              
              checks.wifi = true;
            }
          }
        }
      } catch (error) {
        console.error('WiFi check error:', error);
      }

      // Check NFC proximity (if available)
      if (typeof (window as any).NDEFReader !== 'undefined') {
        checks.nfc = nfcReady;
      }

      // At least one check must pass
      const isValid = checks.gps || checks.wifi || checks.nfc;
      
      if (isValid) {
        toast({
          title: 'Ambiente riconosciuto',
          description: `Rilevati: ${checks.gps ? 'GPS ✓' : ''} ${checks.wifi ? 'WiFi ✓' : ''} ${checks.nfc ? 'NFC ✓' : ''}`,
        });
      } else {
        toast({
          title: 'Ambiente non riconosciuto',
          description: 'Non sei nella zona autorizzata per la timbratura',
          variant: 'destructive',
        });
      }

      return isValid;
    } catch (error) {
      console.error('Smart detection error:', error);
      return false;
    }
  };

  // NFC Initialization
  const initializeNFC = async () => {
    if (typeof (window as any).NDEFReader !== 'undefined') {
      try {
        const ndef = new (window as any).NDEFReader();
        await ndef.scan();
        setNfcReady(true);
        
        ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
          handleNFCRead(serialNumber);
        });
      } catch (error) {
        console.error('NFC Error:', error);
        toast({
          title: 'NFC non disponibile',
          description: 'Il tuo dispositivo non supporta NFC',
          variant: 'destructive',
        });
      }
    }
  };

  // NFC Read Handler
  const handleNFCRead = (serialNumber: string) => {
    toast({
      title: 'Badge rilevato',
      description: `ID: ${serialNumber}`,
    });
    handleClockAction();
  };

  // Main Clock Action
  const handleClockAction = async () => {
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
      const trackingData: any = {
        storeId: activeStoreId,
        trackingMethod: selectedMethod,
        deviceInfo: {
          deviceType: 'web',
          userAgent: navigator.userAgent,
        },
      };
      
      // NEW AUDIT FIELDS for geofencing compliance
      if (activeStore) {
        trackingData.wasOverride = isOverriding;
        if (overrideReason) {
          trackingData.overrideReason = overrideReason;
        }
      }

      // Aggiungi dati specifici per metodo
      if (selectedMethod === 'gps' && activeStore) {
        trackingData.geoLocation = {
          lat: activeStore.latitude,
          lng: activeStore.longitude,
          accuracy: 20,
          address: `${activeStore.address || ''}, ${activeStore.city || ''}, ${activeStore.province || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Posizione rilevata',
        };
      } else if (selectedMethod === 'qr') {
        trackingData.qrCode = qrCode;
      } else if (selectedMethod === 'smart') {
        trackingData.wifiSSID = wifiNetworks.find(n => n.connected)?.ssid;
      }

      if (isActive && session?.id) {
        // Clock Out
        await clockOutMutation.mutateAsync({ id: session.id, data: trackingData });
        toast({
          title: 'Uscita registrata',
          description: `Timbratura uscita effettuata con ${selectedMethod.toUpperCase()} - ${activeStore?.name || fallbackStoreName || 'Store'}`,
        });
      } else {
        // Clock In
        await clockInMutation.mutateAsync(trackingData);
        toast({
          title: 'Entrata registrata',
          description: `Timbratura entrata effettuata con ${selectedMethod.toUpperCase()} - ${activeStore?.name || fallbackStoreName || 'Store'}`,
        });
      }

      // Reset override state after successful action
      setIsOverriding(false);
      setOverrideReason('');
      
      await refetch();
    } catch (error) {
      console.error('Clock action error:', error);
      toast({
        title: 'Errore timbratura',
        description: 'Si è verificato un errore durante la timbratura. Verifica la connessione e riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format elapsed time - Horizontal Layout Optimized
  const formatElapsedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Get status color based on current state
  const getStatusColor = () => {
    if (isActive) {
      if (isOvertime) return 'text-red-500';
      if (requiresBreak) return 'text-yellow-500';
      return 'text-green-500';
    }
    return 'text-gray-500';
  };

  // Get status text
  const getStatusText = () => {
    if (isActive) {
      if (isOvertime) return 'Straordinario';
      if (requiresBreak) return 'Pausa richiesta';
      return 'In turno';
    }
    return 'Fuori turno';
  };

  // Render tracking method details - COMPACT FOR HORIZONTAL LAYOUT
  const renderMethodDetails = () => {
    const method = trackingMethods.find(m => m.id === selectedMethod);
    if (!method) return null;

    const IconComponent = method.icon;

    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconComponent className="h-4 w-4 text-windtre-orange" />
            {method.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {selectedMethod === 'gps' && (
            <div className="space-y-2">
              {gpsPosition ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Posizione rilevata
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>📍 {selectedStore?.address || 'Indirizzo in rilevamento...'}</p>
                    <p>Precisione: {gpsPosition.accuracy.toFixed(0)}m</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Rilevamento GPS...
                </div>
              )}
            </div>
          )}
          
          {selectedMethod === 'qr' && (
            <div className="space-y-2">
              <div className="w-16 h-16 glass-light rounded-lg flex items-center justify-center">
                <QrCode className="h-8 w-8 text-windtre-purple/60" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-mono text-gray-600">{qrCode.substring(0, 12)}...</p>
                <p className="text-green-600">Rinnovo in {qrTimer}s</p>
              </div>
            </div>
          )}
          
          {selectedMethod === 'nfc' && (
            <div className="space-y-2">
              <div className="w-16 h-16 glass-light rounded-lg flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-windtre-purple/60" />
              </div>
              <div className="text-xs">
                {nfcReady ? (
                  <p className="text-green-600">NFC Ready</p>
                ) : (
                  <p className="text-orange-600">Inizializzazione...</p>
                )}
              </div>
            </div>
          )}
          
          {selectedMethod === 'smart' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>GPS</span>
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>WiFi</span>
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>NFC</span>
              </div>
              <p className="text-xs text-gray-600">Rilevamento multiplo attivo</p>
            </div>
          )}
          
          {selectedMethod === 'web' && (
            <div className="space-y-2">
              <div className="w-16 h-16 glass-light rounded-lg flex items-center justify-center">
                <Globe className="h-8 w-8 text-windtre-orange/60" />
              </div>
              <p className="text-xs text-gray-600">Timbratura da browser</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full" data-testid="timbrature-tab">
      {/* HORIZONTAL HEADER - STATUS BAR */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 glass-card rounded-lg">
          <div className="flex items-center gap-6">
            {/* Current Time */}
            <div className="text-center">
              <p className="text-xs text-gray-500">Ora corrente</p>
              <p className="text-lg font-mono font-bold">{format(currentTime, 'HH:mm:ss')}</p>
            </div>
            
            {/* Session Status */}
            <div className="text-center">
              <p className="text-xs text-gray-500">Stato</p>
              <div className="flex items-center gap-2">
                <Badge variant={isActive ? "default" : "secondary"} className={cn("text-xs", getStatusColor())}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>
            
            {/* Elapsed Time */}
            {isActive && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Tempo trascorso</p>
                <p className="text-lg font-mono font-bold text-windtre-orange">
                  {formatElapsedTime(elapsedMinutes)}
                </p>
              </div>
            )}
          </div>
          
          {/* Store Info */}
          <div className="text-right">
            <p className="text-xs text-gray-500">Store</p>
            <p className="text-sm font-medium">{selectedStore?.name || fallbackStoreName || 'Non selezionato'}</p>
          </div>
        </div>
      </div>

      {/* MAIN HORIZONTAL LAYOUT - 3 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[400px]">
        {/* LEFT COLUMN - TIMER & STATUS (30%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Store Selector */}
          <Card className="glass-card h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-windtre-orange" />
                Punto Vendita
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <StoreSelector
                onStoreSelected={handleStoreSelected}
                disabled={isLoading || isResolvingStore}
                autoDetectEnabled={selectedMethod === 'gps'}
                compact
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glass-card h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-windtre-purple" />
                Statistiche Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Oggi</span>
                <span className="text-sm font-medium">{isActive ? formatElapsedTime(elapsedMinutes) : '0:00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Settimana</span>
                <span className="text-sm font-medium">38:45</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Pause</span>
                <span className="text-sm font-medium">1:15</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER COLUMN - TRACKING METHODS GRID (45%) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-windtre-orange" />
                Metodi di Timbratura
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 h-full">
              {/* HORIZONTAL METHODS GRID - 2x3 */}
              <div className="grid grid-cols-2 gap-3 h-full">
                {trackingMethods.slice(0, 6).map((method) => {
                  const IconComponent = method.icon;
                  const isSelected = selectedMethod === method.id;
                  const isAvailable = method.available;
                  
                  return (
                    <Button
                      key={method.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "h-full flex-col gap-2 p-3",
                        isSelected 
                          ? "bg-gradient-to-br from-windtre-orange to-windtre-purple text-white border-windtre-orange" 
                          : "glass-card hover:glass-card-hover border-white/20",
                        !isAvailable && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => isAvailable && setSelectedMethod(method.id)}
                      disabled={!isAvailable}
                      data-testid={`method-${method.id}`}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-white/20" : "bg-windtre-orange/10"
                      )}>
                        <IconComponent className={cn(
                          "h-4 w-4",
                          isSelected ? "text-white" : "text-windtre-orange"
                        )} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className={cn(
                          "text-xs font-medium",
                          isSelected ? "text-white" : "text-gray-700"
                        )}>
                          {method.name}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isSelected ? "text-white/80" : "text-gray-500"
                        )}>
                          {method.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - ACTIONS & METHOD DETAILS (25%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Main Clock Action */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <Button
                onClick={handleClockAction}
                disabled={isLoading}
                className={cn(
                  "w-full h-16 text-lg font-bold rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                    : "bg-gradient-to-r from-windtre-orange to-windtre-purple hover:from-orange-600 hover:to-purple-600 text-white"
                )}
                data-testid="button-clock-action"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    {isActive ? (
                      <>
                        <LogOut className="h-5 w-5 mr-2" />
                        USCITA
                      </>
                    ) : (
                      <>
                        <LogIn className="h-5 w-5 mr-2" />
                        ENTRATA
                      </>
                    )}
                  </>
                )}
              </Button>
              
              {/* Break Button - if active */}
              {isActive && (
                <Button
                  variant="outline"
                  className="w-full mt-2 glass-button border-windtre-orange/20"
                  onClick={() => {/* Handle break logic */}}
                  data-testid="button-break"
                >
                  <Coffee className="h-4 w-4 mr-2" />
                  Pausa
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Method Details */}
          {renderMethodDetails()}
        </div>
      </div>

      {/* HORIZONTAL FOOTER - DAILY STATS */}
      <div className="mt-6">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-windtre-orange" />
                  <span className="text-xs font-medium text-gray-600">Ore Oggi</span>
                </div>
                <p className="text-lg font-bold text-windtre-orange" data-testid="text-daily-hours">
                  {isActive ? formatElapsedTime(elapsedMinutes) : '0:00'}
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600">Settimana</span>
                </div>
                <p className="text-lg font-bold text-green-600" data-testid="text-weekly-hours">38:45</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Coffee className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium text-gray-600">Pause</span>
                </div>
                <p className="text-lg font-bold text-yellow-600" data-testid="text-break-time">1:15</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <MapPinIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">Location</span>
                </div>
                <p className="text-sm font-bold text-blue-600 truncate" data-testid="text-current-location">
                  {selectedStore?.name || 'Non rilevato'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}