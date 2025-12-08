import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Navigation,
  Store,
  Clock,
  Wifi,
  Building
} from 'lucide-react';
import { useStoreResolution } from '@/hooks/useStoreResolution';
import { NearbyStore } from '@/services/timeTrackingService';

interface StoreSelectorProps {
  onStoreSelected: (store: NearbyStore | null, isOverride: boolean, overrideReason?: string) => void;
  disabled?: boolean;
  autoDetectEnabled?: boolean;
}

export default function StoreSelector({ 
  onStoreSelected, 
  disabled = false,
  autoDetectEnabled = true
}: StoreSelectorProps) {
  const [overrideReason, setOverrideReason] = useState('');
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  const {
    // State
    nearbyStores,
    selectedStore,
    autoDetected,
    isResolving,
    hasGpsPermission,
    gpsPosition,
    gpsError,
    requiresManualSelection,
    isOverriding,
    hasCachedLocation,
    
    // Actions
    requestGpsPermission,
    getCurrentPosition,
    autoSelectStore,
    selectStoreManually,
    enableOverride,
    cancelOverride,
    loadCachedLocation,
    reset
  } = useStoreResolution();

  // ==================== HANDLERS ====================
  const handleEnableGPS = useCallback(async () => {
    try {
      const hasPermission = await requestGpsPermission();
      if (hasPermission) {
        await getCurrentPosition();
        await autoSelectStore();
      }
    } catch (error) {
      console.error('GPS initialization failed:', error);
    }
  }, [requestGpsPermission, getCurrentPosition, autoSelectStore]);

  const handleRefreshLocation = useCallback(async () => {
    try {
      await getCurrentPosition();
      await autoSelectStore();
    } catch (error) {
      console.error('Location refresh failed:', error);
    }
  }, [getCurrentPosition, autoSelectStore]);

  const handleManualSelection = useCallback((storeId: string) => {
    const store = nearbyStores.find(s => s.id === storeId);
    if (store) {
      selectStoreManually(store);
      setSelectedStoreId(storeId);
      setShowManualSelect(false);
      
      // Check if this selection requires override
      if (store.distance > store.radius) {
        enableOverride('');
      } else {
        onStoreSelected(store, false);
      }
    }
  }, [nearbyStores, selectStoreManually, enableOverride, onStoreSelected]);

  const handleOverrideConfirm = useCallback(() => {
    if (selectedStore && overrideReason.trim()) {
      onStoreSelected(selectedStore, true, overrideReason);
    }
  }, [selectedStore, overrideReason, onStoreSelected]);

  const handleCancelOverride = useCallback(() => {
    cancelOverride();
    setOverrideReason('');
    setSelectedStoreId('');
  }, [cancelOverride]);

  const handleChangeStore = useCallback(() => {
    setShowManualSelect(true);
    setSelectedStoreId('');
  }, []);

  // ==================== RENDER HELPERS ====================
  const renderGPSStatus = () => {
    if (!autoDetectEnabled) return null;

    if (gpsError) {
      return (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-orange-800 dark:text-orange-200">
                {gpsError}
              </span>
              {!hasGpsPermission && (
                <Button 
                  size="sm" 
                  onClick={handleEnableGPS}
                  disabled={disabled || isResolving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  Abilita GPS
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (isResolving) {
      return (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            🛰️ Rilevamento posizione GPS in corso...
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  const renderAutoDetected = () => {
    if (!selectedStore || !autoDetected) return null;

    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-green-800 dark:text-green-200 font-medium">
                📍 Rilevato: {selectedStore.name}
              </span>
              <span className="text-green-600 dark:text-green-400 ml-2">
                ({selectedStore.distance}m)
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleChangeStore}
              disabled={disabled}
              className="border-green-300 hover:border-green-400"
            >
              Cambia
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const renderOverrideWarning = () => {
    if (!isOverriding || !selectedStore) return null;

    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription>
          <div className="space-y-3">
            <div className="text-yellow-800 dark:text-yellow-200">
              ⚠️ Sei a {selectedStore.distance}m dal punto vendita "{selectedStore.name}" 
              (limite: {selectedStore.radius}m)
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="override-reason" className="text-yellow-800 dark:text-yellow-200">
                Motivo autorizzazione:
              </Label>
              <Input
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Inserisci motivo (es: cliente, emergenza, trasferimento...)"
                disabled={disabled}
                className="border-yellow-300 focus:border-yellow-400"
                data-testid="input-override-reason"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleOverrideConfirm}
                disabled={disabled || !overrideReason.trim()}
                className="bg-yellow-600 hover:bg-yellow-700"
                data-testid="button-confirm-override"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Autorizza
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelOverride}
                disabled={disabled}
                className="border-yellow-300 hover:border-yellow-400"
                data-testid="button-cancel-override"
              >
                Annulla
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // DEMO STORES FALLBACK - Always available when nearbyStores is empty
  const getDemoStoresForSelection = () => {
    return [
      {
        id: 'demo-store-milano',
        name: 'Store Milano Centro (Demo)',
        latitude: 45.4642,
        longitude: 9.1900,
        distance: 75,
        inGeofence: true,
        confidence: 90,
        address: 'Via del Corso 1, Milano',
        city: 'Milano',
        province: 'MI',
        radius: 200,
        rank: 1,
        isNearest: true,
        wifiNetworks: ['StoreWiFi_Milano']
      },
      {
        id: 'demo-store-roma',
        name: 'Store Roma Termini (Demo)',
        latitude: 41.9028,
        longitude: 12.4964,
        distance: 120,
        inGeofence: false,
        confidence: 80,
        address: 'Via Nazionale 50, Roma',
        city: 'Roma',
        province: 'RM',
        radius: 250,
        rank: 2,
        isNearest: false,
        wifiNetworks: ['StoreWiFi_Roma']
      },
      {
        id: 'demo-store-napoli',
        name: 'Store Napoli Centro (Demo)',
        latitude: 40.8518,
        longitude: 14.2681,
        distance: 250,
        inGeofence: false,
        confidence: 70,
        address: 'Via Toledo 100, Napoli',
        city: 'Napoli',
        province: 'NA',
        radius: 300,
        rank: 3,
        isNearest: false,
        wifiNetworks: ['StoreWiFi_Napoli']
      }
    ];
  };

  const renderManualSelector = () => {
    if (!showManualSelect && selectedStore && !requiresManualSelection) {
      return null;
    }

    // Use nearby stores if available, otherwise fallback to demo stores
    const availableStores = nearbyStores.length > 0 ? nearbyStores : getDemoStoresForSelection();
    const isDemoMode = nearbyStores.length === 0;
    
    // Categorize stores
    const storesInGeofence = availableStores.filter(store => store.inGeofence);
    const storesNearby = availableStores.filter(store => !store.inGeofence);

    // Show database offline message when using demo stores
    if (isDemoMode) {
      return (
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <Wifi className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="text-blue-800 dark:text-blue-200 font-medium">
                  🎭 Modalità Demo Attiva
                </div>
                <div className="text-blue-700 dark:text-blue-300 text-sm">
                  Database offline - seleziona da punti vendita dimostrativi per continuare.
                  I dati verranno sincronizzati quando il sistema sarà di nuovo online.
                </div>
              </div>
            </AlertDescription>
          </Alert>
          
          <Card className="border-blue-200 dark:border-blue-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Selezione Punto Vendita (Demo)
              </CardTitle>
              <CardDescription>
                Sistema offline - seleziona uno dei punti vendita dimostrativi
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-store-select">Punti vendita disponibili:</Label>
                <Select 
                  value={selectedStoreId} 
                  onValueChange={handleManualSelection}
                  disabled={disabled}
                >
                  <SelectTrigger 
                    id="demo-store-select"
                    className="w-full border-blue-300"
                    data-testid="select-demo-store"
                  >
                    <SelectValue placeholder="Scegli un punto vendita demo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {storesInGeofence.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
                          📍 Nelle vicinanze (Demo)
                        </div>
                        {storesInGeofence.map((store) => (
                          <SelectItem 
                            key={store.id} 
                            value={store.id}
                            data-testid={`option-demo-store-${store.id}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{store.name}</span>
                              <div className="flex items-center gap-2 text-xs text-green-600">
                                <MapPin className="w-3 h-3" />
                                {store.distance}m
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  Demo
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                        {storesNearby.length > 0 && <Separator />}
                      </>
                    )}

                    {storesNearby.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400">
                          🏢 Punti vendita demo
                        </div>
                        {storesNearby.map((store) => (
                          <SelectItem 
                            key={store.id} 
                            value={store.id}
                            data-testid={`option-demo-store-${store.id}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{store.name}</span>
                              <div className="flex items-center gap-2 text-xs text-blue-600">
                                <MapPin className="w-3 h-3" />
                                {store.distance}m
                                <Badge variant="outline" className="border-blue-300">
                                  Demo
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                ℹ️ Le timbrature effettuate in modalità demo verranno salvate localmente e sincronizzate automaticamente quando il sistema tornerà online.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="w-5 h-5" />
            Selezione Punto Vendita
          </CardTitle>
          {gpsPosition && (
            <CardDescription>
              Posizione attuale: {gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}
              {gpsPosition.accuracy && (
                <span className="ml-2 text-xs">
                  (±{Math.round(gpsPosition.accuracy)}m)
                </span>
              )}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-select">Seleziona punto vendita:</Label>
            <Select 
              value={selectedStoreId} 
              onValueChange={handleManualSelection}
              disabled={disabled}
            >
              <SelectTrigger 
                id="store-select"
                className="w-full"
                data-testid="select-store"
              >
                <SelectValue placeholder="Scegli un punto vendita..." />
              </SelectTrigger>
              <SelectContent>
                {availableStores.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                    Nessun punto vendita disponibile
                  </div>
                ) : (
                  <>
                    {storesInGeofence.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
                          📍 Nelle vicinanze
                        </div>
                        {storesInGeofence.map((store) => (
                          <SelectItem 
                            key={store.id} 
                            value={store.id}
                            data-testid={`option-store-${store.id}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{store.name}</span>
                              <div className="flex items-center gap-2 text-xs text-green-600">
                                <MapPin className="w-3 h-3" />
                                {store.distance}m
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  {store.confidence}%
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                        {storesNearby.length > 0 && <Separator />}
                      </>
                    )}

                    {storesNearby.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-orange-700 dark:text-orange-400">
                          🏢 Altri punti vendita
                        </div>
                        {storesNearby.map((store) => (
                          <SelectItem 
                            key={store.id} 
                            value={store.id}
                            data-testid={`option-store-${store.id}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{store.name}</span>
                              <div className="flex items-center gap-2 text-xs text-orange-600">
                                <MapPin className="w-3 h-3" />
                                {store.distance}m
                                <Badge variant="outline" className="border-orange-300">
                                  {store.confidence}%
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {hasGpsPermission && gpsPosition && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshLocation}
                disabled={disabled || isResolving}
                data-testid="button-refresh-location"
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${isResolving ? 'animate-spin' : ''}`} />
                Aggiorna posizione
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ==================== MAIN RENDER ====================
  if (!autoDetectEnabled) {
    return renderManualSelector();
  }

  return (
    <div className="space-y-4" data-testid="store-selector">
      {renderGPSStatus()}
      {renderAutoDetected()}
      {renderOverrideWarning()}
      {renderManualSelector()}
      
      {hasCachedLocation && !gpsPosition && !hasGpsPermission && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCachedLocation}
            disabled={disabled}
            data-testid="button-load-cached"
          >
            <Clock className="w-3 h-3 mr-2" />
            Usa ultima posizione nota
          </Button>
        </div>
      )}
    </div>
  );
}