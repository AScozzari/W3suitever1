// TimeAttendancePage - Enterprise 4-Panel Time Attendance Interface
// Replaces TimbratureTab with modern architecture and WindTre glassmorphism design

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, MapPin, Wifi, Smartphone, QrCode, CreditCard,
  CheckCircle, XCircle, AlertCircle, Loader2, 
  Activity, Coffee, LogIn, LogOut, Shield,
  Navigation, WifiOff, Signal, Battery, Camera,
  ChevronRight, RefreshCw, Settings, Globe,
  Fingerprint, Eye, EyeOff, Volume2, VolumeX, Sparkles,
  Play, Pause, StopCircle, Timer, MapPinIcon,
  Building, User, Calendar, TrendingUp, History,
  FileText, AlertTriangle, Target, Clock3, BarChart3,
  Users, MessageSquare, Edit3, BookOpen, Star,
  Zap, Brain, Mouse, Keyboard
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Hooks
import { useTimeAttendanceFSM } from '@/hooks/useTimeAttendanceFSM';
import { useTimeAttendanceStrategies } from '@/hooks/useTimeAttendanceStrategies';
import { useStoreResolution } from '@/hooks/useStoreResolution';
import { useTimeEntries } from '@/hooks/useTimeTracking';

// Types
import { StrategyType, TrackingMethod } from '@/types/timeAttendanceFSM';
import { NearbyStore } from '@/services/timeTrackingService';

// Strategies
import { getAvailableStrategies, ALL_STRATEGIES } from '@/strategies';

interface TimeAttendancePageProps {
  userId: string;
}

export default function TimeAttendancePage({ userId }: TimeAttendancePageProps) {
  const { toast } = useToast();
  
  // FSM Hook - Core state management
  const {
    state: fsmState,
    context,
    isActive,
    isIdle,
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

  // Store Resolution Hook - GPS and nearby stores
  const {
    selectedStore,
    nearbyStores,
    autoDetected,
    isResolving: isResolvingStore,
    gpsError,
    gpsPosition
  } = useStoreResolution();

  // Time tracking data
  const { data: timeEntries, isLoading: entriesLoading } = useTimeEntries({ userId });

  // Local state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedStrategyType, setSelectedStrategyType] = useState<StrategyType | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedOverrideStore, setSelectedOverrideStore] = useState<NearbyStore | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-select store when detected
  useEffect(() => {
    if (selectedStore && autoDetected) {
      selectStore(selectedStore);
    }
  }, [selectedStore, autoDetected, selectStore]);

  // Available strategies
  const availableStrategies = getAvailableStrategies();

  // Strategy method configurations with WindTre colors
  const strategyConfigs = [
    {
      type: 'gps' as StrategyType,
      name: 'GPS',
      icon: MapPin,
      description: 'Geofence automatico',
      color: 'from-orange-500 to-orange-600',
      bgClass: 'bg-gradient-to-br from-orange-50 to-orange-100',
      available: true,
    },
    {
      type: 'nfc' as StrategyType,
      name: 'NFC',
      icon: CreditCard,
      description: 'Badge contactless',
      color: 'from-purple-500 to-purple-600',
      bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100',
      available: typeof (window as any).NDEFReader !== 'undefined',
    },
    {
      type: 'qr' as StrategyType,
      name: 'QR Code',
      icon: QrCode,
      description: 'Scanner QR dinamico',
      color: 'from-purple-500 to-purple-600',
      bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100',
      available: true,
    },
    {
      type: 'smart' as StrategyType,
      name: 'Smart',
      icon: Sparkles,
      description: 'Auto-detection',
      color: 'from-pink-500 to-pink-600',
      bgClass: 'bg-gradient-to-br from-pink-50 to-pink-100',
      available: true,
    },
    {
      type: 'web' as StrategyType,
      name: 'Web',
      icon: Globe,
      description: 'Browser fingerprint',
      color: 'from-green-500 to-green-600',
      bgClass: 'bg-gradient-to-br from-green-50 to-green-100',
      available: true,
    },
    {
      type: 'badge' as StrategyType,
      name: 'Badge',
      icon: Keyboard,
      description: 'Input manuale',
      color: 'from-blue-500 to-blue-600',
      bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100',
      available: true,
    },
  ];

  // Event handlers
  const handleStrategySelect = async (strategyType: StrategyType) => {
    setSelectedStrategyType(strategyType);
    const success = await strategiesActions.selectStrategy(strategyType);
    if (success) {
      // Prepare the strategy
      if (context) {
        await strategiesActions.prepareStrategy(context);
      }
    }
  };

  const handleClockIn = async () => {
    if (!context.selectedStore || !context.selectedMethod) {
      toast({
        title: 'Dati Mancanti',
        description: 'Seleziona un metodo e un negozio prima di timbrare',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Validate strategy if one is selected
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

      // Create base clock in data
      const baseClockInData = {
        storeId: context.selectedStore.id,
        userId,
        trackingMethod: context.selectedMethod,
        geoLocation: gpsPosition ? {
          lat: gpsPosition.lat,
          lng: gpsPosition.lng,
          accuracy: gpsPosition.accuracy,
          address: context.selectedStore.address || 'Unknown Address'
        } : undefined,
        deviceInfo: {
          deviceType: 'web' as const,
          userAgent: navigator.userAgent,
        }
      };

      // Augment with strategy data if available
      const clockInData = strategiesState.selectedStrategy 
        ? await strategiesActions.augmentPayload(baseClockInData, context)
        : { ...baseClockInData, storeId: context.selectedStore.id };

      await clockIn(clockInData);
      
      toast({
        title: 'Entrata Registrata',
        description: `Timbratura di entrata alle ${format(new Date(), 'HH:mm')}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Clock in failed:', error);
      toast({
        title: 'Errore Timbratura',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'destructive'
      });
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
      toast({
        title: 'Uscita Registrata',
        description: `Timbratura di uscita alle ${format(new Date(), 'HH:mm')}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Clock out failed:', error);
      toast({
        title: 'Errore Timbratura',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'destructive'
      });
    }
  };

  const handleStoreOverride = async () => {
    if (!selectedOverrideStore || !overrideReason.trim()) {
      toast({
        title: 'Dati Incompleti',
        description: 'Seleziona un negozio e fornisci una motivazione',
        variant: 'destructive'
      });
      return;
    }

    selectStore(selectedOverrideStore);
    setOverrideModalOpen(false);
    setOverrideReason('');
    setSelectedOverrideStore(null);

    toast({
      title: 'Override Applicato',
      description: `Negozio ${selectedOverrideStore.name} selezionato manualmente`,
      variant: 'default'
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (isActive) return 'text-green-600';
    if (fsmError) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (fsmLoading) return 'Elaborazione...';
    if (isActive && context.isOnBreak) return 'In Pausa';
    if (isActive) return 'In Servizio';
    if (fsmError) return 'Errore';
    return 'Fuori Servizio';
  };

  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50 p-4">
      {/* Mobile Layout: Single Column Stack */}
      <div className="block lg:hidden space-y-4">
        <StatusPanel />
        <MethodSelectorPanel />
        <StoreCompliancePanel />
        <QuickStatsPanel />
      </div>

      {/* Desktop Layout: 2x2 Grid */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 lg:h-[calc(100vh-2rem)]">
        <StatusPanel />
        <MethodSelectorPanel />
        <StoreCompliancePanel />
        <QuickStatsPanel />
      </div>

      {/* Store Override Modal */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent data-testid="modal-store-override">
          <DialogHeader>
            <DialogTitle>Override Negozio</DialogTitle>
            <DialogDescription>
              Seleziona manualmente un negozio e fornisci una motivazione per l'override
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="store-select">Negozio</Label>
              <div className="space-y-2 mt-2">
                {nearbyStores.map((store) => (
                  <div
                    key={store.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedOverrideStore?.id === store.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setSelectedOverrideStore(store)}
                    data-testid={`option-store-${store.id}`}
                  >
                    <div className="font-medium">{store.name}</div>
                    <div className="text-sm text-gray-500">{store.address}</div>
                    {store.distance && (
                      <div className="text-xs text-gray-400">
                        {(store.distance / 1000).toFixed(1)} km di distanza
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="override-reason">Motivazione *</Label>
              <Textarea
                id="override-reason"
                placeholder="Inserisci il motivo dell'override (es. problema GPS, emergenza, ecc.)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-2"
                data-testid="input-override-reason"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOverrideModalOpen(false)}
              data-testid="button-cancel-override"
            >
              Annulla
            </Button>
            <Button 
              onClick={handleStoreOverride}
              disabled={!selectedOverrideStore || !overrideReason.trim()}
              data-testid="button-confirm-override"
            >
              Applica Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ==================== STATUS PANEL (TOP-LEFT) ====================
  function StatusPanel() {
    return (
      <Card 
        className="glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg"
        data-testid="panel-status"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span>Status Timbratura</span>
            </div>
            <Badge 
              variant={isActive ? "default" : "secondary"}
              className={cn(
                "transition-colors",
                isActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-500"
              )}
              data-testid="badge-status"
            >
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Time Display */}
          <div className="text-center space-y-2">
            <div 
              className="text-4xl font-bold text-gray-900"
              data-testid="text-current-time"
            >
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm text-gray-600">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: it })}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="space-y-3">
            {/* Selected Store */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Negozio:</span>
              <span className="text-sm font-medium" data-testid="text-selected-store">
                {context.selectedStore?.name || 'Nessuno selezionato'}
              </span>
            </div>

            {/* Selected Method */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Metodo:</span>
              <span className="text-sm font-medium" data-testid="text-selected-method">
                {selectedStrategyType?.toUpperCase() || 'Nessuno'}
              </span>
            </div>

            {/* Session Time */}
            {isActive && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tempo lavoro:</span>
                <span 
                  className={cn("text-sm font-medium", isOvertime ? "text-orange-600" : "text-green-600")}
                  data-testid="text-elapsed-time"
                >
                  {formatTime(elapsedTime.totalSeconds)}
                </span>
              </div>
            )}

            {/* Break Time */}
            {context.isOnBreak && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tempo pausa:</span>
                <span className="text-sm font-medium text-blue-600" data-testid="text-break-time">
                  {formatTime(breakTime.totalSeconds)}
                </span>
              </div>
            )}
          </div>

          {/* Alerts */}
          {needsBreak && !context.isOnBreak && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                È richiesta una pausa dopo 6 ore di lavoro
              </AlertDescription>
            </Alert>
          )}

          {isOvertime && (
            <Alert className="border-orange-200 bg-orange-50">
              <Clock3 className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Straordinario in corso (oltre 8 ore)
              </AlertDescription>
            </Alert>
          )}

          {fsmError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{fsmError}</AlertDescription>
            </Alert>
          )}

          {/* Primary Actions */}
          <div className="space-y-3">
            {!isActive ? (
              <Button
                onClick={handleClockIn}
                disabled={!canClockIn || fsmLoading || !context.selectedStore}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-clock-in"
              >
                {fsmLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Timbra Entrata
              </Button>
            ) : (
              <div className="space-y-2">
                {!context.isOnBreak ? (
                  <>
                    <Button
                      onClick={() => startBreak()}
                      disabled={!canStartBreak || fsmLoading}
                      variant="outline"
                      className="w-full"
                      data-testid="button-start-break"
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      Inizia Pausa
                    </Button>
                    <Button
                      onClick={handleClockOut}
                      disabled={!canClockOut || fsmLoading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      data-testid="button-clock-out"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Timbra Uscita
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => endBreak()}
                    disabled={!canEndBreak || fsmLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-end-break"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Termina Pausa
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ==================== METHOD SELECTOR + DYNAMIC PANELS (TOP-RIGHT) ====================
  function MethodSelectorPanel() {
    return (
      <Card 
        className="glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg"
        data-testid="panel-method-selector"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            <span>Metodo Timbratura</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Method Selection Tabs */}
          <Tabs 
            value={selectedStrategyType || ''} 
            onValueChange={(value) => handleStrategySelect(value as StrategyType)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1 bg-white/50">
              {strategyConfigs.map((config) => (
                <TabsTrigger
                  key={config.type}
                  value={config.type}
                  disabled={!config.available}
                  className={cn(
                    "flex flex-col items-center p-3 h-auto text-xs transition-all",
                    "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                    !config.available && "opacity-50"
                  )}
                  data-testid={`tab-strategy-${config.type}`}
                >
                  <config.icon className="h-4 w-4 mb-1" />
                  <span>{config.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Dynamic Strategy Panels */}
            {strategyConfigs.map((config) => (
              <TabsContent key={config.type} value={config.type} className="mt-4">
                <div className="space-y-4">
                  {/* Strategy Info */}
                  <div className={cn("p-4 rounded-lg", config.bgClass)}>
                    <div className="flex items-center gap-2 mb-2">
                      <config.icon className="h-5 w-5" />
                      <span className="font-medium">{config.name}</span>
                      <Badge variant="secondary">{config.description}</Badge>
                    </div>
                  </div>

                  {/* Strategy Panel */}
                  {strategiesState.selectedStrategy?.type === config.type && (
                    <div data-testid={`panel-strategy-${config.type}`}>
                      {strategiesState.selectedStrategy.renderPanel({
                        isActive: true,
                        isLoading: strategiesState.isPreparing || strategiesState.isValidating,
                        context: context,
                        onAction: (action, data) => {
                          console.log(`Strategy action: ${action}`, data);
                        },
                        compact: false
                      })}
                    </div>
                  )}

                  {/* Strategy Status */}
                  {strategiesState.selectedStrategy?.type === config.type && strategiesState.prepareResult && (
                    <div className="space-y-2">
                      {strategiesState.prepareResult.success ? (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Strategia {config.name} pronta per l'uso
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            {strategiesState.prepareResult.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Validation Results */}
                  {strategiesState.selectedStrategy?.type === config.type && strategiesState.validationResult && (
                    <div className="space-y-2">
                      {strategiesState.validationResult.isValid ? (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Validazione completata con successo
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            {strategiesState.validationResult.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Warnings */}
                      {strategiesState.validationResult.warnings?.map((warning, index) => (
                        <Alert key={index} className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            {warning}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // ==================== STORE COMPLIANCE PANEL (BOTTOM-LEFT) ====================
  function StoreCompliancePanel() {
    return (
      <Card 
        className="glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg"
        data-testid="panel-store-compliance"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <span>Negozi & Compliance</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideModalOpen(true)}
              data-testid="button-store-override"
            >
              <Settings className="h-4 w-4 mr-2" />
              Override
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* GPS Status */}
          {gpsPosition ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-green-500" />
                <span>GPS Attivo</span>
                <Badge variant="default" className="text-xs">
                  {gpsPosition.accuracy.toFixed(0)}m
                </Badge>
              </div>
              <div className="text-xs text-gray-600 font-mono">
                {gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <WifiOff className="h-4 w-4" />
              <span>GPS Non Disponibile</span>
            </div>
          )}

          {/* Selected Store Info */}
          {context.selectedStore && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Negozio Selezionato</span>
                {autoDetected && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    Auto-rilevato
                  </Badge>
                )}
              </div>
              <div className="text-sm text-green-700">
                <div className="font-medium">{context.selectedStore.name}</div>
                <div className="text-xs">{context.selectedStore.address}</div>
              </div>
            </div>
          )}

          {/* Nearby Stores List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Negozi Vicini</span>
              {isResolvingStore && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {nearbyStores.length > 0 ? (
                nearbyStores.map((store) => {
                  const isSelected = context.selectedStore?.id === store.id;
                  const distance = store.distance || 0;
                  const isWithinGeofence = distance <= 200; // 200m geofence

                  return (
                    <div
                      key={store.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        isSelected 
                          ? "border-green-500 bg-green-50" 
                          : isWithinGeofence
                            ? "border-blue-200 bg-blue-50 hover:border-blue-300"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      )}
                      onClick={() => selectStore(store)}
                      data-testid={`store-item-${store.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{store.name}</div>
                          <div className="text-xs text-gray-600">{store.address}</div>
                          {distance > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {(distance / 1000).toFixed(1)} km di distanza
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isWithinGeofence ? (
                            <Badge variant="default" className="text-xs bg-green-600">
                              In zona
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Fuori zona
                            </Badge>
                          )}
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  Nessun negozio trovato nelle vicinanze
                </div>
              )}
            </div>
          </div>

          {/* GPS Error */}
          {gpsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{gpsError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // ==================== QUICK STATS & HISTORY (BOTTOM-RIGHT) ====================
  function QuickStatsPanel() {
    const todayEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockIn);
      const today = new Date();
      return entryDate.toDateString() === today.toDateString();
    });

    const weekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockIn);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    });

    const todayHours = todayEntries.reduce((total, entry) => {
      if (entry.clockOut) {
        const start = new Date(entry.clockIn);
        const end = new Date(entry.clockOut);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      return total;
    }, 0);

    const weekHours = weekEntries.reduce((total, entry) => {
      if (entry.clockOut) {
        const start = new Date(entry.clockIn);
        const end = new Date(entry.clockOut);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      return total;
    }, 0);

    return (
      <Card 
        className="glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg"
        data-testid="panel-quick-stats"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            <span>Statistiche & Cronologia</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-today-hours">
                {todayHours.toFixed(1)}h
              </div>
              <div className="text-xs text-blue-700">Oggi</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600" data-testid="stat-week-hours">
                {weekHours.toFixed(1)}h
              </div>
              <div className="text-xs text-green-700">Settimana</div>
            </div>
          </div>

          {/* Today's Break Time */}
          {context.isOnBreak && (
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-lg font-bold text-yellow-600">
                {formatTime(breakTime.totalSeconds)}
              </div>
              <div className="text-xs text-yellow-700">Pausa Corrente</div>
            </div>
          )}

          {/* Recent Entries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ultime Timbrature</span>
              <History className="h-4 w-4 text-gray-400" />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {timeEntries.slice(0, 5).map((entry) => {
                const clockInTime = new Date(entry.clockIn);
                const clockOutTime = entry.clockOut ? new Date(entry.clockOut) : null;
                const duration = clockOutTime 
                  ? (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
                  : null;

                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-gray-50 rounded-lg border"
                    data-testid={`entry-${entry.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {format(clockInTime, 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-gray-600">
                          {format(clockInTime, 'HH:mm')} - {clockOutTime ? format(clockOutTime, 'HH:mm') : 'In corso'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.storeName || 'Store sconosciuto'}
                        </div>
                      </div>
                      <div className="text-right">
                        {duration ? (
                          <div className="text-sm font-medium">
                            {duration.toFixed(1)}h
                          </div>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            Attivo
                          </Badge>
                        )}
                        <div className="text-xs text-gray-500 capitalize">
                          {entry.trackingMethod}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {timeEntries.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  Nessuna timbratura registrata
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Azioni Rapide</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                data-testid="button-add-note"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Nota
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                data-testid="button-dispute"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Disputa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}