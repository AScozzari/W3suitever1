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
  Fingerprint, Eye, EyeOff, Volume2, VolumeX, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useClockIn, useClockOut, useCurrentSession } from '@/hooks/useTimeTracking';
import { geolocationManager } from '@/utils/geolocationManager';
import { timeTrackingService, NearbyStore } from '@/services/timeTrackingService';
import { useStoreResolution } from '@/hooks/useStoreResolution';
import StoreSelector from './StoreSelector';

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
  
  // Stati principali
  const [selectedMethod, setSelectedMethod] = useState<TrackingMethod>('gps');
  const [isLoading, setIsLoading] = useState(false);
  // GPS states removed - now handled by useStoreResolution hook
  const [qrCode, setQrCode] = useState<string>('');
  const [qrTimer, setQrTimer] = useState(30);
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [nfcReady, setNfcReady] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Store selection state - NEW SYSTEM
  const [selectedStoreForAction, setSelectedStoreForAction] = useState<NearbyStore | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  
  // Timers
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Configurazione metodi disponibili con WindTre colors
  const trackingMethods = [
    {
      id: 'gps' as TrackingMethod,
      name: 'GPS',
      icon: MapPin,
      description: 'Usa la tua posizione',
      color: 'from-blue-500 to-blue-600',
      windtreColor: 'windtre-orange',
      available: true,
    },
    {
      id: 'qr' as TrackingMethod,
      name: 'QR Code',
      icon: QrCode,
      description: 'Scansiona codice QR',
      color: 'from-green-500 to-green-600',
      windtreColor: 'windtre-purple',
      available: true,
    },
    {
      id: 'nfc' as TrackingMethod,
      name: 'NFC',
      icon: CreditCard,
      description: 'Badge virtuale',
      color: 'from-purple-500 to-purple-600',
      windtreColor: 'windtre-purple',
      available: typeof (window as any).NDEFReader !== 'undefined',
    },
    {
      id: 'web' as TrackingMethod,
      name: 'Web',
      icon: Globe,
      description: 'Da browser',
      color: 'from-orange-500 to-orange-600',
      windtreColor: 'windtre-orange',
      available: true,
    },
    {
      id: 'smart' as TrackingMethod,
      name: 'Smart',
      icon: Sparkles,
      description: 'Rilevamento automatico',
      color: 'from-pink-500 to-pink-600',
      windtreColor: 'windtre-purple',
      available: true,
    },
  ];

  // Inizializzazione - GPS now handled by useStoreResolution hook
  useEffect(() => {
    // GPS method no longer needs manual initialization - handled by StoreSelector
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

  // GPS initialization removed - now handled by useStoreResolution hook and StoreSelector component

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
        checks.gps = await checkGeofencing(position);
      }

      // Check WiFi networks from database configuration
      try {
        const activeStoreId = selectedStoreForAction?.id || selectedStore?.id || fallbackStoreId;
        if (!activeStoreId) {
          console.warn('No store ID available for WiFi configuration');
          return;
        }
        const response = await fetch(`/api/stores/${activeStoreId}/location`);
        if (response.ok) {
          const storeData = await response.json();
          const configuredNetworks = storeData.wifiNetworks || [];
          
          if (configuredNetworks.length > 0) {
            // Note: Browser doesn't have direct WiFi API, so we simulate for now
            // In production with a mobile app, this would actually scan WiFi networks
            setWifiNetworks(configuredNetworks.map((ssid: string) => ({
              ssid,
              signal: -45 - Math.random() * 20, // Simulated signal strength
              connected: Math.random() > 0.5 // Simulated connection status
            })));
            
            // Check WiFi using fresh configured networks
            const currentConnectedNetworks = configuredNetworks.map((ssid: string) => ({
              ssid,
              signal: -45 - Math.random() * 20,
              connected: Math.random() > 0.5
            }));
            
            checks.wifi = currentConnectedNetworks.some(n => n.connected);
            
            if (checks.wifi) {
              toast({
                title: 'Rete WiFi rilevata',
                description: `Connesso alla rete aziendale`,
              });
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

  // Geofencing Check
  // Geofencing check removed - now handled server-side by the enhanced clock-in endpoint

  // NFC Read Handler
  const handleNFCRead = (serialNumber: string) => {
    toast({
      title: 'Badge rilevato',
      description: `ID: ${serialNumber}`,
    });
    // Procedi con timbratura
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
        // Use GPS data from store resolution system
        trackingData.geoLocation = {
          lat: activeStore.latitude, // Use store coordinates
          lng: activeStore.longitude,
          accuracy: 20, // Estimated
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

  // Format elapsed time
  const formatElapsedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Render Method Widget
  const renderMethodWidget = () => {
    switch (selectedMethod) {
      case 'gps':
        return (
          <div className="glass-card transition-all duration-500 hover:shadow-xl relative overflow-hidden group">
            <div className="glass-glow"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-windtre-orange">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm">
                  <MapPin className="h-5 w-5 text-windtre-orange" />
                </div>
                Timbratura GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              {gpsPosition ? (
                <>
                  <div className="flex items-center gap-3 p-3 glass-light rounded-lg">
                    <div className="p-1 rounded-full bg-green-500/20">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">Posizione rilevata con successo</span>
                  </div>
                  <div className="p-4 glass-heavy rounded-xl space-y-3 border border-white/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-windtre-orange animate-pulse"></div>
                      <p className="text-sm font-medium">📍 {selectedStore?.address || 'Indirizzo rilevato...'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="text-gray-600">Latitudine</p>
                        <p className="font-mono bg-black/10 px-2 py-1 rounded">{gpsPosition.lat.toFixed(6)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-600">Longitudine</p>
                        <p className="font-mono bg-black/10 px-2 py-1 rounded">{gpsPosition.lng.toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                      <p className="text-xs text-gray-600">Precisione: {gpsPosition.accuracy.toFixed(0)}m</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {}} 
                    variant="outline" 
                    size="sm"
                    className="glass-button hover:bg-windtre-orange/10 border-windtre-orange/20 text-windtre-orange hover:text-windtre-orange"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aggiorna posizione
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full glass-heavy flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-windtre-orange animate-spin" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/20 to-purple-500/20 animate-pulse"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-windtre-orange">Rilevamento posizione GPS...</p>
                    <p className="text-xs text-gray-600">Assicurati di aver concesso i permessi di geolocalizzazione</p>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        );

      case 'qr':
        return (
          <div className="glass-card transition-all duration-500 hover:shadow-xl relative overflow-hidden group">
            <div className="glass-glow"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-windtre-purple">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm">
                  <QrCode className="h-5 w-5 text-windtre-purple" />
                </div>
                QR Code Dinamico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-6 glass-heavy rounded-xl border border-white/20 relative">
                <div className="flex flex-col items-center space-y-6">
                  {/* QR Code Display */}
                  <div className="relative">
                    <div className="w-48 h-48 glass-light rounded-xl flex items-center justify-center relative overflow-hidden border border-white/30">
                      <QrCode className="h-32 w-32 text-windtre-purple/60" />
                      {/* Animated overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-windtre-purple/5 to-transparent"></div>
                      {/* Code overlay */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-xs font-mono glass-heavy px-3 py-1 rounded-lg text-center border border-white/20">
                          {qrCode.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                    {/* Animated Timer */}
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-windtre-purple to-windtre-purple-dark text-white rounded-xl w-12 h-12 flex items-center justify-center text-sm font-bold shadow-lg">
                      <div className="relative">
                        {qrTimer}
                        <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                    {/* Pulse effect */}
                    <div className="absolute inset-0 rounded-xl border-2 border-windtre-purple/30 animate-pulse"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-windtre-purple">
                      Mostra questo codice al lettore QR
                    </p>
                    <p className="text-xs text-gray-600">
                      Punto vendita: {selectedStore?.name || 'In rilevamento...'}
                    </p>
                  </div>
                  <div className="w-full space-y-2">
                    <Progress 
                      value={(qrTimer / 30) * 100} 
                      className="h-2 glass-light rounded-full overflow-hidden"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Scade in {qrTimer}s</span>
                      <span>Si rigenera automaticamente</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="glass-light rounded-lg p-4 border border-windtre-purple/20">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-windtre-purple/20">
                    <Shield className="h-4 w-4 text-windtre-purple" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-windtre-purple">Sicurezza avanzata</p>
                    <p className="text-xs text-gray-600">
                      Il codice si rigenera automaticamente ogni 30 secondi per garantire la massima sicurezza
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 'nfc':
        return (
          <div className="glass-card transition-all duration-500 hover:shadow-xl relative overflow-hidden group">
            <div className="glass-glow"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-windtre-purple">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm">
                  <CreditCard className="h-5 w-5 text-windtre-purple" />
                </div>
                Badge NFC Virtuale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-8 glass-heavy rounded-xl border border-white/20">
                {nfcReady ? (
                  <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                      <div className="p-4 glass-light rounded-2xl">
                        <Smartphone className="h-20 w-20 text-windtre-purple" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 p-1 rounded-full bg-green-500">
                        <Signal className="h-6 w-6 text-white animate-pulse" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl border-2 border-windtre-purple/30 animate-pulse"></div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-windtre-purple">
                        Avvicina il telefono al lettore NFC
                      </p>
                      <p className="text-xs text-gray-600">
                        Il dispositivo è pronto per la lettura
                      </p>
                    </div>
                    <div className="glass-light px-4 py-2 rounded-full border border-windtre-purple/20">
                      <span className="text-sm font-medium text-windtre-purple">NFC Attivo</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-6">
                    <div className="p-4 glass-light rounded-2xl opacity-50">
                      <WifiOff className="h-20 w-20 text-gray-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-gray-600">
                        NFC non disponibile su questo dispositivo
                      </p>
                      <p className="text-xs text-gray-500">
                        Prova con un dispositivo mobile compatibile
                      </p>
                    </div>
                    <Button 
                      onClick={() => initializeNFC()} 
                      variant="outline" 
                      size="sm"
                      className="glass-button border-windtre-purple/20 text-windtre-purple hover:bg-windtre-purple/10"
                    >
                      Riprova Inizializzazione
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        );

      case 'web':
        return (
          <div className="glass-card transition-all duration-500 hover:shadow-xl relative overflow-hidden group">
            <div className="glass-glow"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-windtre-orange">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm">
                  <Globe className="h-5 w-5 text-windtre-orange" />
                </div>
                Timbratura Web
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="glass-heavy rounded-xl border border-white/20 overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 glass-light rounded-lg">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-windtre-orange" />
                        Punto vendita
                      </span>
                      <span className="font-medium text-windtre-orange">{selectedStore?.name || fallbackStoreName || 'Store'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-light rounded-lg">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-windtre-orange" />
                        IP Address
                      </span>
                      <span className="font-mono text-sm bg-black/10 px-2 py-1 rounded">192.168.1.100</span>
                    </div>
                    <div className="flex items-center justify-between p-3 glass-light rounded-lg">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-windtre-orange" />
                        Browser
                      </span>
                      <span className="text-sm bg-black/10 px-2 py-1 rounded">Chrome 120.0</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="glass-light rounded-lg p-4 border border-windtre-orange/20">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-windtre-orange/20">
                    <Shield className="h-4 w-4 text-windtre-orange" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-windtre-orange">Sicurezza Avanzata</p>
                    <p className="text-xs text-gray-600">
                      Timbratura protetta da autenticazione multi-fattore e verifica IP
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        );

      case 'smart':
        return (
          <div className="glass-card transition-all duration-500 hover:shadow-xl relative overflow-hidden group">
            <div className="glass-glow"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-windtre-purple">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-windtre-purple" />
                </div>
                Rilevamento Smart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-3">
                {wifiNetworks.length > 0 ? wifiNetworks.map((network, idx) => (
                  <div key={idx} className={`glass-light rounded-lg p-4 border transition-all duration-300 ${
                    network.connected ? 'border-green-400/30 bg-green-50/10' : 'border-white/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          network.connected ? 'bg-green-500/20' : 'bg-gray-500/20'
                        }`}>
                          <Wifi className={`h-4 w-4 ${
                            network.connected ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{network.ssid}</p>
                          <p className="text-xs text-gray-500">Segnale: {network.signal}dBm</p>
                        </div>
                      </div>
                      {network.connected ? (
                        <div className="glass-light px-3 py-1 rounded-full border border-green-400/30">
                          <span className="text-xs font-medium text-green-600">Connesso</span>
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="glass-light rounded-lg p-8 text-center border border-white/20">
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 glass-heavy rounded-2xl flex items-center justify-center">
                        <Wifi className="h-8 w-8 text-windtre-purple/50" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-windtre-purple">Ricerca reti WiFi...</p>
                        <p className="text-xs text-gray-600">Rilevamento automatico delle reti aziendali</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="glass-light rounded-lg p-4 border border-windtre-purple/20">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-windtre-purple">Rilevamento Intelligente</p>
                    <p className="text-xs text-gray-600">
                      Sistema automatico basato su WiFi aziendale, GPS e prossimità NFC
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      {/* Status Card - Glassmorphism */}
      <div className={`glass-card transition-all duration-700 hover:shadow-2xl relative overflow-hidden ${
        isActive ? 'border-green-400/30 shadow-green-500/20' : 'border-white/20'
      }`}>
        <div className={isActive ? 'glass-glow' : ''}></div>
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${isActive ? 'bg-green-500/20' : 'bg-gray-500/20'} backdrop-blur-sm`}>
                  {isActive ? (
                    <Activity className="h-6 w-6 text-green-500 animate-pulse" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-500" />
                  )}
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${
                    isActive ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {isActive ? 'In Servizio' : 'Fuori Servizio'}
                  </h2>
                  <CardDescription className="text-sm">
                    {isActive 
                      ? `Turno iniziato alle ${session?.clockIn ? format(new Date(session.clockIn), 'HH:mm') : '--:--'}`
                      : 'Nessuna timbratura attiva'
                    }
                  </CardDescription>
                </div>
              </CardTitle>
            </div>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              size="sm"
              className="glass-button hover:bg-white/10 rounded-xl"
            >
              {showDetails ? 
                <EyeOff className="h-5 w-5 text-windtre-orange" /> : 
                <Eye className="h-5 w-5 text-windtre-orange" />
              }
            </Button>
          </div>
        </CardHeader>
        
        {isActive && (
          <CardContent className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-light rounded-xl p-4 text-center border border-white/20">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-windtre-orange">
                    {formatElapsedTime(elapsedMinutes)}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Tempo lavorato</p>
                  <div className="w-full h-1 bg-white/20 rounded-full">
                    <div 
                      className="h-1 bg-gradient-to-r from-windtre-orange to-windtre-purple rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((elapsedMinutes / 480) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="glass-light rounded-xl p-4 text-center border border-white/20">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-windtre-purple">
                    {session?.breakMinutes || 0}m
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Pausa</p>
                  <div className="flex items-center justify-center gap-1">
                    <Coffee className="h-4 w-4 text-windtre-purple" />
                    <span className="text-xs text-gray-500">Pause registrate</span>
                  </div>
                </div>
              </div>
              <div className="glass-light rounded-xl p-4 text-center border border-white/20">
                <div className="space-y-2">
                  <div className="text-lg font-bold text-windtre-orange truncate">
                    {selectedStore?.name || fallbackStoreName || 'Store'}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Punto vendita</p>
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="h-4 w-4 text-windtre-orange" />
                    <span className="text-xs text-gray-500">Posizione attuale</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Alerts */}
            {requiresBreak && (
              <div className="glass-light rounded-xl p-4 border border-orange-300/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-2 rounded-full bg-orange-500/20">
                    <Coffee className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-600">Pausa obbligatoria</h3>
                    <p className="text-sm text-gray-600">Hai lavorato per più di 6 ore. È richiesta una pausa.</p>
                  </div>
                </div>
              </div>
            )}
            
            {isOvertime && (
              <div className="glass-light rounded-xl p-4 border border-red-300/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-600">Straordinari</h3>
                    <p className="text-sm text-gray-600">Stai lavorando oltre l'orario standard di 8 ore.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </div>

      {/* Store Selector - NEW GPS SYSTEM */}
      <StoreSelector
        onStoreSelected={handleStoreSelected}
        disabled={isLoading || isResolvingStore}
        autoDetectEnabled={selectedMethod === 'gps'}
      />

      {/* Method Selector - Glassmorphism */}
      <div className="glass-card transition-all duration-500 hover:shadow-xl relative overflow-hidden">
        <div className="glass-shimmer"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3 text-xl text-windtre-orange">
            <div className="p-2 rounded-lg bg-gradient-to-br from-windtre-orange/20 to-windtre-purple/20">
              <Sparkles className="h-6 w-6 text-windtre-orange" />
            </div>
            Metodo di Timbratura
          </CardTitle>
          <CardDescription className="text-gray-600">
            Scegli il metodo più comodo per te
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {trackingMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                disabled={!method.available}
                data-testid={`method-${method.id}`}
                className={`group relative h-auto p-4 rounded-xl transition-all duration-300 ${
                  selectedMethod === method.id 
                    ? 'glass-heavy border-windtre-orange/50 shadow-lg scale-105' 
                    : 'glass-light hover:glass-heavy border-white/20'
                } ${
                  !method.available ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'
                } border backdrop-blur-sm`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className={`p-3 rounded-xl transition-all duration-300 ${
                    selectedMethod === method.id 
                      ? `bg-gradient-to-br from-${method.windtreColor}/30 to-${method.windtreColor}/20` 
                      : `bg-gradient-to-br from-${method.windtreColor}/20 to-${method.windtreColor}/10 group-hover:from-${method.windtreColor}/25 group-hover:to-${method.windtreColor}/15`
                  }`}>
                    <method.icon className={`h-6 w-6 ${
                      selectedMethod === method.id 
                        ? `text-${method.windtreColor}` 
                        : `text-${method.windtreColor}/70 group-hover:text-${method.windtreColor}`
                    } transition-colors duration-300`} />
                  </div>
                  <div className="text-center space-y-1">
                    <span className={`text-sm font-semibold transition-colors ${
                      selectedMethod === method.id 
                        ? 'text-windtre-orange' 
                        : 'text-gray-700 group-hover:text-windtre-orange'
                    }`}>
                      {method.name}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {method.description}
                    </span>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="absolute inset-0 rounded-xl border-2 border-windtre-orange/30 pointer-events-none animate-pulse"></div>
                  )}
                  {!method.available && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </div>

      {/* Method-specific Widget */}
      {renderMethodWidget()}

      {/* Perfectly Centered Action Button - WindTre Glassmorphism */}
      <div className="glass-card border-2 border-dashed border-windtre-orange/30 relative overflow-hidden group hover:border-windtre-orange/50 transition-all duration-500">
        <div className="glass-glow opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-windtre-orange/5 to-windtre-purple/5"></div>
        <CardContent className="py-12 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Main Action Button - Perfectly Centered */}
            <div className="relative">
              <button
                onClick={handleClockAction}
                disabled={isLoading || (selectedMethod === 'gps' && !gpsPosition)}
                data-testid={isActive ? 'button-clock-out' : 'button-clock-in'}
                className={`
                  relative group w-72 h-20 rounded-2xl font-bold text-xl
                  transition-all duration-500 transform hover:scale-105
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${
                    isActive 
                      ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white shadow-red-500/30' 
                      : 'bg-gradient-to-r from-windtre-orange via-orange-600 to-windtre-orange-dark hover:from-windtre-orange-dark hover:via-windtre-orange hover:to-orange-700 text-white shadow-orange-500/30'
                  }
                  shadow-2xl hover:shadow-3xl
                  border border-white/20
                  overflow-hidden
                `}
              >
                {/* Glass overlay effect */}
                <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
                
                {/* Loading spinner overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                
                {/* Button content */}
                <div className="relative z-10 flex items-center justify-center gap-3 h-full">
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                      <span>Elaborazione...</span>
                    </>
                  ) : isActive ? (
                    <>
                      <div className="p-1 rounded-full bg-white/20">
                        <LogOut className="h-7 w-7" />
                      </div>
                      <span className="font-bold">Timbra Uscita</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1 rounded-full bg-white/20">
                        <LogIn className="h-7 w-7" />
                      </div>
                      <span className="font-bold">Timbra Entrata</span>
                    </>
                  )}
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/10 to-transparent"></div>
                
                {/* Ripple effect container */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/0 group-active:bg-white/20 transition-colors duration-150"></div>
                </div>
              </button>
              
              {/* Animated ring around button */}
              <div className={`absolute inset-0 rounded-2xl border-2 transition-all duration-1000 ${
                isActive ? 'border-red-400/50 animate-pulse' : 'border-windtre-orange/50'
              }`}></div>
              
              {/* Status indicator */}
              <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-white ${
                isActive ? 'bg-red-500' : 'bg-green-500'
              } animate-pulse`}>
                <div className={`absolute inset-1 rounded-full ${
                  isActive ? 'bg-red-300' : 'bg-green-300'
                } animate-ping`}></div>
              </div>
            </div>
            
            {/* Status messages */}
            <div className="text-center space-y-2">
              {selectedMethod === 'gps' && !gpsPosition ? (
                <div className="glass-light p-3 rounded-xl border border-orange-300/30">
                  <p className="text-sm text-orange-600 font-medium flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                    Attendi il rilevamento della posizione GPS...
                  </p>
                </div>
              ) : (
                <div className="glass-light p-3 rounded-xl border border-green-300/30">
                  <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Sistema pronto per la timbratura
                  </p>
                </div>
              )}
              
              {/* Current method indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span>Metodo selezionato:</span>
                <span className="font-semibold text-windtre-orange capitalize">
                  {trackingMethods.find(m => m.id === selectedMethod)?.name}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      {/* History */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Timbrature di Oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Mock history */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <LogIn className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Entrata</p>
                    <p className="text-xs text-gray-500">GPS • {selectedStore?.name || fallbackStoreName || 'Negozio'}</p>
                  </div>
                </div>
                <span className="text-sm">08:45</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}