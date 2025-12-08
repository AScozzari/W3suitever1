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
      {/* Main Control Panel - Clock + PDV + Sistema Timbratura */}
      <div className="mb-6">
        <MainControlPanel />
      </div>

      {/* Secondary Panels */}
      {/* Mobile Layout: Single Column Stack */}
      <div className="block lg:hidden space-y-4">
        <ActionButtonsPanel />
        <StoreDetailsPanel />
        <QuickStatsPanel />
      </div>

      {/* Desktop Layout: 3-Column Grid */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
        <ActionButtonsPanel />
        <StoreDetailsPanel />
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

  // ==================== MAIN CONTROL PANEL - Clock + PDV + Sistema Timbratura ====================
  function MainControlPanel() {
    return (
      <Card 
        className="glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg"
        data-testid="panel-main-control"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-orange-500" />
              <span className="text-xl">Sistema Timbratura Avanzato</span>
            </div>
            <Badge 
              variant={isActive ? "default" : "secondary"}
              className={cn(
                "transition-colors text-sm px-3 py-1",
                isActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-500"
              )}
              data-testid="badge-main-status"
            >
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Integrated Unified Flow */}
          <div className="space-y-6">
            
            {/* Step 1: Current Time & Session Status */}
            <div className="text-center bg-gradient-to-r from-orange-50 to-purple-50 p-6 rounded-xl border border-orange-200">
              <div className="text-6xl font-bold text-gray-900 mb-2" data-testid="text-main-clock">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-lg text-gray-700 mb-4">
                {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: it })}
              </div>
              
              {/* Active Session Info */}
              {isActive && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-orange-200">
                  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Tempo Lavoro</div>
                    <div className={cn("text-2xl font-bold", isOvertime ? "text-orange-600" : "text-green-600")}>
                      {formatTime(elapsedTime.totalSeconds)}
                    </div>
                  </div>
                  {context.isOnBreak && (
                    <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Tempo Pausa</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatTime(breakTime.totalSeconds)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Integrated PDV + System Selection */}
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                Configura Sistema di Timbratura
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PDV Selection Integrated */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Punto Vendita</span>
                  </div>
                  
                  {/* Current PDV Status */}
                  {context.selectedStore ? (
                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">PDV Configurato</span>
                        </div>
                        {autoDetected && (
                          <Badge variant="default" className="bg-green-600">Auto</Badge>
                        )}
                      </div>
                      <div className="font-medium text-green-900">{context.selectedStore.name}</div>
                      <div className="text-sm text-green-700">{context.selectedStore.address}</div>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">PDV Richiesto</span>
                      </div>
                      <div className="text-sm text-red-700">Seleziona un punto vendita per continuare</div>
                    </div>
                  )}

                  {/* Quick PDV Selection */}
                  {nearbyStores.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">PDV Disponibili</div>
                      {nearbyStores.slice(0, 2).map((store) => {
                        const isSelected = context.selectedStore?.id === store.id;
                        const distance = store.distance || 0;
                        const isWithinGeofence = distance <= 200;

                        return (
                          <button
                            key={store.id}
                            onClick={() => selectStore(store)}
                            className={cn(
                              "w-full p-3 rounded-lg border text-left transition-all",
                              isSelected 
                                ? "border-green-500 bg-green-50" 
                                : isWithinGeofence
                                  ? "border-blue-300 bg-blue-50 hover:bg-blue-100"
                                  : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                            )}
                            data-testid={`integrated-store-${store.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{store.name}</div>
                                <div className="text-xs text-gray-600">
                                  {distance > 0 ? `${(distance / 1000).toFixed(1)} km` : store.address}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isWithinGeofence && (
                                  <Badge variant="default" className="text-xs bg-green-600">In Zona</Badge>
                                )}
                                {isSelected && <CheckCircle className="h-5 w-5 text-green-500" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOverrideModalOpen(true)}
                        className="w-full mt-2"
                        data-testid="button-integrated-pdv-manage"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gestisci tutti i PDV
                      </Button>
                    </div>
                  )}
                </div>

                {/* System Type Selection Integrated */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-purple-500" />
                    <span className="font-semibold">Sistema Timbratura</span>
                  </div>

                  {/* Current System Status */}
                  {selectedStrategyType ? (
                    <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-800">
                          Sistema {selectedStrategyType.toUpperCase()} Attivo
                        </span>
                      </div>
                      {strategiesState.prepareResult?.success && (
                        <div className="text-sm text-purple-700">✓ Pronto per la timbratura</div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">Sistema Richiesto</span>
                      </div>
                      <div className="text-sm text-red-700">Seleziona un tipo di sistema per continuare</div>
                    </div>
                  )}

                  {/* System Selection Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {strategyConfigs.slice(0, 6).map((config) => (
                      <button
                        key={config.type}
                        onClick={() => handleStrategySelect(config.type)}
                        disabled={!config.available}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-lg border transition-all",
                          selectedStrategyType === config.type
                            ? "border-orange-500 bg-orange-50 text-orange-700 border-2"
                            : config.available
                              ? "border-gray-200 hover:border-gray-300 bg-white"
                              : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        )}
                        data-testid={`integrated-system-${config.type}`}
                      >
                        <config.icon className="h-6 w-6 mb-2" />
                        <span className="font-medium text-sm">{config.name}</span>
                        <span className="text-xs text-gray-500 text-center">{config.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Validation Status */}
            <div className="flex items-center justify-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border">
              {context.selectedStore && selectedStrategyType ? (
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-semibold">Sistema Pronto</div>
                    <div className="text-sm">
                      PDV: {context.selectedStore.name} • Sistema: {selectedStrategyType.toUpperCase()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-orange-700">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <div>
                    <div className="font-semibold">Configurazione Incompleta</div>
                    <div className="text-sm">
                      {!context.selectedStore && !selectedStrategyType 
                        ? "Seleziona PDV e Sistema di timbratura"
                        : !context.selectedStore 
                          ? "Seleziona un punto vendita"
                          : "Seleziona un sistema di timbratura"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strategy Interaction Panel */}
          {strategiesState.selectedStrategy && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Configurazione {selectedStrategyType?.toUpperCase()}
                </h3>
                
                {/* Strategy Interaction UI */}
                <div data-testid={`panel-strategy-${selectedStrategyType}`}>
                  {strategiesState.selectedStrategy.renderPanel({
                    isActive: true,
                    isLoading: strategiesState.isPreparing || strategiesState.isValidating,
                    context: context,
                    onAction: (action, data) => {
                      console.log(`Strategy action: ${action}`, data);
                    },
                    compact: true
                  })}
                </div>

                {/* Strategy Status Alerts */}
                {strategiesState.prepareResult && (
                  <div className="space-y-2">
                    {strategiesState.prepareResult.success ? (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Sistema {selectedStrategyType?.toUpperCase()} pronto per l'uso
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
                {strategiesState.validationResult && (
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
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ==================== ACTION BUTTONS PANEL ====================
  function ActionButtonsPanel() {
    return (
      <Card 
        className="glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg"
        data-testid="panel-actions"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span>Azioni Timbratura</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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

          {/* Validation Check */}
          {(!context.selectedStore || !selectedStrategyType) && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {!context.selectedStore && !selectedStrategyType 
                  ? "Seleziona un PDV e un sistema di timbratura"
                  : !context.selectedStore 
                    ? "Seleziona un punto vendita"
                    : "Seleziona un sistema di timbratura"}
              </AlertDescription>
            </Alert>
          )}

          {/* Primary Actions */}
          <div className="space-y-3">
            {!isActive ? (
              <Button
                onClick={handleClockIn}
                disabled={!canClockIn || fsmLoading || !context.selectedStore || !selectedStrategyType}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
                data-testid="button-clock-in"
              >
                {fsmLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-5 w-5 mr-2" />
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
                      className="w-full h-10"
                      data-testid="button-start-break"
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      Inizia Pausa
                    </Button>
                    <Button
                      onClick={handleClockOut}
                      disabled={!canClockOut || fsmLoading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg"
                      data-testid="button-clock-out"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Timbra Uscita
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => endBreak()}
                    disabled={!canEndBreak || fsmLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
                    data-testid="button-end-break"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Termina Pausa
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Current Status Summary */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="text-sm font-medium text-gray-700">Riepilogo Stato</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">PDV:</span>
                <span className="font-medium">
                  {context.selectedStore?.name || 'Non selezionato'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sistema:</span>
                <span className="font-medium">
                  {selectedStrategyType?.toUpperCase() || 'Non selezionato'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stato:</span>
                <span className={cn("font-medium", getStatusColor())}>
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ==================== STORE DETAILS PANEL ====================
  function StoreDetailsPanel() {
    return (
      <Card 
        className="glass-card border-0 backdrop-blur-md bg-white/10 border-white/20 shadow-lg"
        data-testid="panel-store-details"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <span>Dettagli Negozi</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideModalOpen(true)}
              data-testid="button-store-details-override"
            >
              <Settings className="h-4 w-4 mr-2" />
              Gestisci
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

          {/* Selected Store Extended Info */}
          {context.selectedStore && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">PDV Attivo</span>
                {autoDetected && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    Auto-rilevato
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm text-green-700">
                <div className="font-medium">{context.selectedStore.name}</div>
                <div className="text-xs">{context.selectedStore.address}</div>
                {strategiesState.selectedStrategy && (
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      <span className="text-xs">
                        Sistema {selectedStrategyType?.toUpperCase()} configurato
                      </span>
                    </div>
                  </div>
                )}
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
    // Safety check for timeEntries to prevent crashes
    const safeTimeEntries = timeEntries || [];
    
    const todayEntries = safeTimeEntries.filter(entry => {
      const entryDate = new Date(entry.clockIn);
      const today = new Date();
      return entryDate.toDateString() === today.toDateString();
    });

    const weekEntries = safeTimeEntries.filter(entry => {
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
              {safeTimeEntries.slice(0, 5).map((entry) => {
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

              {safeTimeEntries.length === 0 && (
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