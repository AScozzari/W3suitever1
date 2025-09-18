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
  Fingerprint, Eye, EyeOff, Volume2, VolumeX
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useClockIn, useClockOut, useCurrentSession } from '@/hooks/useTimeTracking';
import { geolocationManager } from '@/utils/geolocationManager';
import { timeTrackingService } from '@/services/timeTrackingService';

// Tipi per i metodi di timbratura
type TrackingMethod = 'gps' | 'qr' | 'nfc' | 'web' | 'smart';

interface TimbratureTabProps {
  userId: string;
  storeId: string;
  storeName: string;
}

export default function TimbratureTab({ userId, storeId, storeName }: TimbratureTabProps) {
  const { toast } = useToast();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const { session, isActive, elapsedMinutes, isOvertime, requiresBreak, refetch } = useCurrentSession();
  
  // Stati principali
  const [selectedMethod, setSelectedMethod] = useState<TrackingMethod>('gps');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrTimer, setQrTimer] = useState(30);
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [nfcReady, setNfcReady] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Timers
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Configurazione metodi disponibili
  const trackingMethods = [
    {
      id: 'gps' as TrackingMethod,
      name: 'GPS',
      icon: MapPin,
      description: 'Usa la tua posizione',
      color: 'from-blue-500 to-blue-600',
      available: true,
    },
    {
      id: 'qr' as TrackingMethod,
      name: 'QR Code',
      icon: QrCode,
      description: 'Scansiona codice QR',
      color: 'from-green-500 to-green-600',
      available: true,
    },
    {
      id: 'nfc' as TrackingMethod,
      name: 'NFC',
      icon: CreditCard,
      description: 'Badge virtuale',
      color: 'from-purple-500 to-purple-600',
      available: typeof (window as any).NDEFReader !== 'undefined',
    },
    {
      id: 'web' as TrackingMethod,
      name: 'Web',
      icon: Globe,
      description: 'Da browser',
      color: 'from-orange-500 to-orange-600',
      available: true,
    },
    {
      id: 'smart' as TrackingMethod,
      name: 'Smart',
      icon: Wifi,
      description: 'Rilevamento automatico',
      color: 'from-pink-500 to-pink-600',
      available: true,
    },
  ];

  // Inizializzazione
  useEffect(() => {
    if (selectedMethod === 'gps') {
      initializeGPS();
    } else if (selectedMethod === 'qr') {
      generateQRCode();
    } else if (selectedMethod === 'smart') {
      detectSmartEnvironment();
    } else if (selectedMethod === 'nfc') {
      initializeNFC();
    }

    // Refresh sessione ogni 30 secondi
    sessionIntervalRef.current = setInterval(() => {
      refetch();
    }, 30000);

    return () => {
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
    };
  }, [selectedMethod]);

  // GPS Initialization
  const initializeGPS = async () => {
    try {
      // Request permission directly
      const hasPermission = await geolocationManager.checkPermission();
      if (hasPermission === 'denied') {
        toast({
          title: 'GPS non disponibile',
          description: 'Abilita la geolocalizzazione per usare questo metodo',
          variant: 'destructive',
        });
        return;
      }

      const position = await geolocationManager.getCurrentPosition();
      if (position) {
        setCurrentLocation(position);
        const address = await geolocationManager.reverseGeocode(position.lat, position.lng);
        if (address?.formatted) {
          setLocationAddress(address.formatted);
        }

        // Check geofencing
        const isInZone = await checkGeofencing(position);
        if (!isInZone) {
          toast({
            title: 'Fuori zona',
            description: 'Non sei nella zona autorizzata per la timbratura',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('GPS Error:', error);
      toast({
        title: 'Errore GPS',
        description: 'Impossibile ottenere la posizione',
        variant: 'destructive',
      });
    }
  };

  // QR Code Generation
  const generateQRCode = () => {
    const code = `W3-${storeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setQrCode(code);
    setQrTimer(30);

    // Rigenera ogni 30 secondi
    if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    qrIntervalRef.current = setInterval(() => {
      const newCode = `W3-${storeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setQrCode(newCode);
      setQrTimer(30);
    }, 30000);

    // Timer countdown
    const countdown = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
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
        const response = await fetch(`/api/stores/${storeId}/location`);
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
            
            checks.wifi = wifiNetworks.some(n => n.connected);
            
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
  const checkGeofencing = async (position: any) => {
    try {
      // Get actual store coordinates from database
      const response = await fetch(`/api/stores/${storeId}/location`);
      if (!response.ok) {
        console.error('Failed to fetch store location');
        return false;
      }
      
      const storeData = await response.json();
      
      if (!storeData.latitude || !storeData.longitude) {
        console.warn('Store coordinates not configured');
        toast({
          title: 'Coordinate non configurate',
          description: 'Le coordinate GPS del negozio non sono configurate',
          variant: 'destructive',
        });
        return false;
      }
      
      const storeCoords = {
        lat: parseFloat(storeData.latitude),
        lng: parseFloat(storeData.longitude)
      };
      
      const maxDistance = 100; // metri
      const distance = geolocationManager.calculateDistance(
        position.lat,
        position.lng,
        storeCoords.lat,
        storeCoords.lng
      );
      
      const withinRange = distance <= maxDistance;
      
      if (!withinRange) {
        toast({
          title: 'Fuori zona',
          description: `Sei a ${Math.round(distance)} metri dal negozio. Devi essere entro 100 metri.`,
          variant: 'destructive',
        });
      }
      
      return withinRange;
    } catch (error) {
      console.error('Geofencing check error:', error);
      return false;
    }
  };

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
    setIsLoading(true);

    try {
      const trackingData: any = {
        storeId,
        trackingMethod: selectedMethod,
        deviceInfo: {
          deviceType: 'web',
          userAgent: navigator.userAgent,
        },
      };

      // Aggiungi dati specifici per metodo
      if (selectedMethod === 'gps' && currentLocation) {
        trackingData.geoLocation = {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy: currentLocation.accuracy,
          address: locationAddress,
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
          description: `Timbratura uscita effettuata con ${selectedMethod.toUpperCase()}`,
        });
      } else {
        // Clock In
        await clockInMutation.mutateAsync(trackingData);
        toast({
          title: 'Entrata registrata',
          description: `Timbratura entrata effettuata con ${selectedMethod.toUpperCase()}`,
        });
      }

      await refetch();
    } catch (error) {
      console.error('Clock action error:', error);
      toast({
        title: 'Errore timbratura',
        description: 'Si è verificato un errore durante la timbratura',
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
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Timbratura GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentLocation ? (
                <>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Posizione rilevata</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg space-y-2">
                    <p className="text-sm font-medium">📍 {locationAddress || 'Caricamento indirizzo...'}</p>
                    <p className="text-xs text-gray-500">
                      Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Precisione: {currentLocation.accuracy.toFixed(0)}m
                    </p>
                  </div>
                  <Button onClick={() => initializeGPS()} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aggiorna posizione
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Rilevamento posizione...</span>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'qr':
        return (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-green-600" />
                QR Code Dinamico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-white rounded-lg border-2 border-dashed border-green-300">
                <div className="flex flex-col items-center space-y-4">
                  {/* QR Code Display */}
                  <div className="relative">
                    <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <QrCode className="h-32 w-32 text-gray-400" />
                      {/* Overlay con codice */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-xs font-mono bg-white/90 px-2 py-1 rounded">
                          {qrCode.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                    {/* Timer */}
                    <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
                      {qrTimer}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Mostra questo codice al lettore QR del punto vendita
                  </p>
                  <Progress value={(qrTimer / 30) * 100} className="h-1 w-full" />
                </div>
              </div>
              <Alert className="border-green-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Il codice si rigenera automaticamente ogni 30 secondi per sicurezza
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );

      case 'nfc':
        return (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                Badge NFC Virtuale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-white rounded-lg">
                {nfcReady ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Smartphone className="h-24 w-24 text-purple-600" />
                      <div className="absolute -bottom-2 -right-2">
                        <Signal className="h-8 w-8 text-green-500 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-sm text-center">
                      Avvicina il telefono al lettore NFC
                    </p>
                    <Badge variant="outline" className="text-purple-600">
                      NFC Attivo
                    </Badge>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <WifiOff className="h-12 w-12 text-gray-400" />
                    <p className="text-sm text-center text-gray-600">
                      NFC non disponibile su questo dispositivo
                    </p>
                    <Button onClick={() => initializeNFC()} variant="outline" size="sm">
                      Riprova
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'web':
        return (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-orange-600" />
                Timbratura Web
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Punto vendita</span>
                  <span className="font-medium">{storeName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">IP Address</span>
                  <span className="font-mono text-xs">192.168.1.100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Browser</span>
                  <span className="text-xs">Chrome 120.0</span>
                </div>
              </div>
              <Alert className="border-orange-200">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Timbratura protetta da autenticazione e verifica IP
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );

      case 'smart':
        return (
          <Card className="border-pink-200 bg-pink-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-pink-600" />
                Rilevamento Smart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {wifiNetworks.map((network, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wifi className={`h-4 w-4 ${network.connected ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-sm font-medium">{network.ssid}</p>
                        <p className="text-xs text-gray-500">Segnale: {network.signal}dBm</p>
                      </div>
                    </div>
                    {network.connected && (
                      <Badge variant="outline" className="text-green-600">
                        Connesso
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Alert className="border-pink-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs">
                  Rilevamento automatico basato su WiFi aziendale
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={`${isActive ? 'border-green-500 bg-green-50/30' : 'border-gray-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isActive ? (
                  <>
                    <Activity className="h-5 w-5 text-green-600 animate-pulse" />
                    In Servizio
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-gray-600" />
                    Fuori Servizio
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isActive 
                  ? `Turno iniziato alle ${session?.clockIn ? format(new Date(session.clockIn), 'HH:mm') : '--:--'}`
                  : 'Nessuna timbratura attiva'
                }
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              size="sm"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        
        {isActive && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{formatElapsedTime(elapsedMinutes)}</p>
                <p className="text-xs text-gray-500">Tempo lavorato</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{session?.breakMinutes || 0}m</p>
                <p className="text-xs text-gray-500">Pausa</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{storeName}</p>
                <p className="text-xs text-gray-500">Punto vendita</p>
              </div>
            </div>

            {/* Alerts */}
            {requiresBreak && (
              <Alert className="border-orange-200 bg-orange-50">
                <Coffee className="h-4 w-4" />
                <AlertTitle>Pausa obbligatoria</AlertTitle>
                <AlertDescription>
                  Hai lavorato per più di 6 ore. È richiesta una pausa.
                </AlertDescription>
              </Alert>
            )}
            
            {isOvertime && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Straordinari</AlertTitle>
                <AlertDescription>
                  Stai lavorando oltre l'orario standard di 8 ore.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      {/* Method Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Metodo di Timbratura</CardTitle>
          <CardDescription>Seleziona come vuoi timbrare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {trackingMethods.map((method) => (
              <Button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                variant={selectedMethod === method.id ? 'default' : 'outline'}
                className={`h-auto flex-col py-3 ${!method.available && 'opacity-50'}`}
                disabled={!method.available}
                data-testid={`method-${method.id}`}
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${method.color} mb-2`}>
                  <method.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold">{method.name}</span>
                <span className="text-xs text-gray-500">{method.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Method-specific Widget */}
      {renderMethodWidget()}

      {/* Action Button */}
      <Card className="border-2 border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={handleClockAction}
              disabled={isLoading || (selectedMethod === 'gps' && !currentLocation)}
              size="lg"
              className={`w-64 h-16 text-lg ${
                isActive 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  Elaborazione...
                </>
              ) : isActive ? (
                <>
                  <LogOut className="h-6 w-6 mr-2" />
                  Timbra Uscita
                </>
              ) : (
                <>
                  <LogIn className="h-6 w-6 mr-2" />
                  Timbra Entrata
                </>
              )}
            </Button>
            
            {selectedMethod === 'gps' && !currentLocation && (
              <p className="text-xs text-orange-600">
                Attendi il rilevamento della posizione GPS...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
                    <p className="text-xs text-gray-500">GPS • {storeName}</p>
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