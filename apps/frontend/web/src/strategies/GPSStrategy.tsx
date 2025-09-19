// GPS Strategy - Enterprise GPS-based time tracking with geofence validation
import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, AlertCircle, Loader2, Navigation, RefreshCw } from 'lucide-react';
import { BaseStrategy } from './BaseStrategy';
import { 
  StrategyValidationResult,
  StrategyPrepareResult,
  StrategyPanelProps,
  TimeAttendanceContext 
} from '@/types/timeAttendanceFSM';
import { ClockInData } from '@/services/timeTrackingService';
import { 
  geolocationManager, 
  requestLocationPermission, 
  GeoPosition 
} from '@/utils/geolocationManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface GPSMetadata {
  position?: GeoPosition;
  accuracy: number;
  isWithinGeofence: boolean;
  nearestStore?: {
    id: string;
    name: string;
    distance: number;
  };
  permissionGranted: boolean;
  lastUpdate: number;
}

export class GPSStrategy extends BaseStrategy {
  readonly type = 'gps' as const;
  readonly name = 'GPS Location';
  readonly description = 'Geofence validation with location accuracy';
  readonly priority = 1;
  readonly availability = {
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    requiresPermission: true,
    requiresHardware: false,
    requiresNetwork: false,
  };

  private watchId?: number;
  private lastPosition?: GeoPosition;
  private geofenceRadius = 200; // meters
  private requiredAccuracy = 50; // meters

  // ==================== CORE STRATEGY METHODS ====================

  async prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult> {
    this.log('info', 'Preparing GPS strategy');

    if (!this.isAvailable()) {
      return this.createPrepareError('GPS not available on this device');
    }

    try {
      // Request location permission
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return this.createPrepareError('Location permission denied');
      }

      // Initialize geolocation manager
      const initialized = await geolocationManager.initialize();
      if (!initialized) {
        return this.createPrepareError('Failed to initialize GPS');
      }

      // Get initial position
      const position = await geolocationManager.getCurrentPosition(true, 10000);
      if (position) {
        this.lastPosition = position;
        this.log('info', 'GPS initialized with position', position);
      }

      return this.createPrepareSuccess({
        hasPermission,
        position,
        accuracy: position?.accuracy || 0
      });
    } catch (error) {
      this.log('error', 'GPS preparation failed', error);
      return this.createPrepareError(`GPS preparation failed: ${error}`);
    }
  }

  async validate(context: TimeAttendanceContext): Promise<StrategyValidationResult> {
    this.log('info', 'Validating GPS strategy');

    if (!this.isAvailable()) {
      return this.createError('GPS not supported');
    }

    if (!context.selectedStore) {
      return this.createError('No store selected for geofence validation');
    }

    try {
      // Get current position
      const position = this.lastPosition || await geolocationManager.getCurrentPosition(true, 15000);
      if (!position) {
        return this.createError('Unable to determine current location');
      }

      // Check accuracy requirements
      if (position.accuracy > this.requiredAccuracy) {
        return this.createError(
          `GPS accuracy too low: ${position.accuracy.toFixed(0)}m (required: <${this.requiredAccuracy}m)`,
          'LOW_ACCURACY'
        );
      }

      // Validate geofence
      const store = context.selectedStore;
      const distance = geolocationManager.calculateDistance(
        position.lat,
        position.lng,
        store.latitude,
        store.longitude
      );

      const isWithinGeofence = distance <= this.geofenceRadius;

      if (!isWithinGeofence) {
        return {
          isValid: true, // Still valid, but requires override
          warnings: [`Outside geofence: ${distance.toFixed(0)}m from ${store.name}`],
          metadata: {
            distance,
            requiresOverride: true,
            position,
            store: {
              id: store.id,
              name: store.name,
              distance
            }
          }
        };
      }

      return this.createSuccess({
        position,
        accuracy: position.accuracy,
        isWithinGeofence: true,
        distance,
        store: {
          id: store.id,
          name: store.name,
          distance
        }
      });
    } catch (error) {
      this.log('error', 'GPS validation failed', error);
      return this.createError(`GPS validation failed: ${error}`);
    }
  }

  async augmentPayload(
    basePayload: Partial<ClockInData>, 
    context: TimeAttendanceContext
  ): Promise<ClockInData> {
    this.log('info', 'Augmenting payload with GPS data');

    const position = this.lastPosition || await geolocationManager.getCurrentPosition();
    const store = context.selectedStore;

    const augmentedPayload: ClockInData = {
      ...basePayload,
      storeId: basePayload.storeId!,
      trackingMethod: 'gps',
      geoLocation: position ? {
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        address: store ? `${store.address || ''}, ${store.city || ''}, ${store.province || ''}`.trim() : 'GPS Location'
      } : undefined,
      deviceInfo: {
        ...basePayload.deviceInfo,
        deviceType: 'web',
        gpsAccuracy: position?.accuracy,
        userAgent: navigator.userAgent,
      }
    };

    this.log('info', 'GPS payload augmented', { position, store });
    return augmentedPayload;
  }

  renderPanel(props: StrategyPanelProps): React.ReactElement {
    return <GPSPanel {...props} strategy={this} />;
  }

  // ==================== LIFECYCLE METHODS ====================

  async cleanup(): Promise<void> {
    if (this.watchId !== undefined) {
      geolocationManager.stopWatching();
      this.watchId = undefined;
    }
    this.log('info', 'GPS strategy cleaned up');
  }

  reset(): void {
    this.lastPosition = undefined;
    this.log('info', 'GPS strategy reset');
  }

  // ==================== CAPABILITY CHECKS ====================

  isAvailable(): boolean {
    return this.availability.supported;
  }

  getRequiredPermissions(): string[] {
    return ['geolocation'];
  }

  // ==================== GPS-SPECIFIC METHODS ====================

  async startWatching(callback: (position: GeoPosition) => void): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      this.watchId = geolocationManager.startWatching(
        (position) => {
          this.lastPosition = position;
          callback(position);
        },
        (error) => {
          this.log('error', 'GPS watch error', error);
        },
        true
      );
      this.log('info', 'GPS watching started');
    } catch (error) {
      this.log('error', 'Failed to start GPS watching', error);
    }
  }

  getLastPosition(): GeoPosition | undefined {
    return this.lastPosition;
  }

  getGeofenceRadius(): number {
    return this.geofenceRadius;
  }

  setGeofenceRadius(radius: number): void {
    this.geofenceRadius = Math.max(50, Math.min(1000, radius)); // 50m to 1km
    this.log('info', `Geofence radius set to ${this.geofenceRadius}m`);
  }
}

// ==================== GPS PANEL COMPONENT ====================

interface GPSPanelProps extends StrategyPanelProps {
  strategy: GPSStrategy;
}

function GPSPanel({ isActive, isLoading, context, onAction, compact, strategy }: GPSPanelProps) {
  const [position, setPosition] = useState<GeoPosition | undefined>(strategy.getLastPosition());
  const [accuracy, setAccuracy] = useState<number>(0);
  const [distance, setDistance] = useState<number | undefined>();
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isActive) {
      strategy.startWatching((newPosition) => {
        setPosition(newPosition);
        setAccuracy(newPosition.accuracy);
        
        // Calculate distance to selected store
        if (context.selectedStore) {
          const dist = geolocationManager.calculateDistance(
            newPosition.lat,
            newPosition.lng,
            context.selectedStore.latitude,
            context.selectedStore.longitude
          );
          setDistance(dist);
          setIsWithinGeofence(dist <= strategy.getGeofenceRadius());
        }
      });
    }

    return () => {
      strategy.cleanup();
    };
  }, [isActive, context.selectedStore]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const newPosition = await geolocationManager.getCurrentPosition(true, 10000);
      if (newPosition) {
        setPosition(newPosition);
        setAccuracy(newPosition.accuracy);
        onAction?.('gps_refreshed', newPosition);
      }
    } catch (error) {
      console.error('GPS refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (compact) {
    return (
      <div className="space-y-2" data-testid="gps-panel-compact">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">GPS</span>
          {position && (
            <Badge variant={isWithinGeofence ? "default" : "destructive"} className="text-xs">
              {isWithinGeofence ? 'In zona' : distance ? formatDistance(distance) : 'Fuori zona'}
            </Badge>
          )}
        </div>
        
        {position ? (
          <div className="text-xs text-gray-600 space-y-1">
            <p>📍 Precisione: {accuracy.toFixed(0)}m</p>
            {context.selectedStore && (
              <p>🏪 {context.selectedStore.name}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-orange-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Rilevamento GPS...
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="h-full" data-testid="gps-panel-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-500" />
            GPS Location
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            data-testid="button-gps-refresh"
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Position Status */}
        {position ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Posizione acquisita</span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Precisione:</span>
                <Badge variant={accuracy <= 50 ? "default" : "destructive"}>
                  {accuracy.toFixed(0)}m
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Latitudine:</span>
                <span className="font-mono">{position.lat.toFixed(6)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Longitudine:</span>
                <span className="font-mono">{position.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Acquisizione posizione GPS...
          </div>
        )}

        {/* Geofence Status */}
        {context.selectedStore && position && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-4 w-4 text-blue-500" />
              <span>Geofence</span>
            </div>
            
            {distance !== undefined && (
              <Alert variant={isWithinGeofence ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {isWithinGeofence ? (
                    `Dentro la zona autorizzata (${formatDistance(distance)})`
                  ) : (
                    `Fuori dalla zona autorizzata (${formatDistance(distance)} da ${context.selectedStore.name})`
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Store Information */}
        {context.selectedStore && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">Store selezionato:</div>
            <div className="text-sm font-medium">{context.selectedStore.name}</div>
            <div className="text-xs text-gray-500">
              {context.selectedStore.address}, {context.selectedStore.city}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export singleton instance
export const gpsStrategy = new GPSStrategy();