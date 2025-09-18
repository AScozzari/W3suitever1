// Geolocation Manager - Enterprise Location Services
export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface GeoAddress {
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  formatted?: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius: number; // meters
  type: 'store' | 'area' | 'custom';
}

export interface LocationValidation {
  isValid: boolean;
  isWithinGeofence: boolean;
  distance?: number;
  nearestZone?: GeofenceZone;
  message?: string;
}

class GeolocationManager {
  private watchId?: number;
  private lastPosition?: GeoPosition;
  private permissionStatus?: PermissionState;
  private geofences: Map<string, GeofenceZone> = new Map();

  // ==================== INITIALIZATION ====================
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Geolocation not supported');
      return false;
    }

    // Check permissions
    try {
      const status = await this.checkPermission();
      this.permissionStatus = status;
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check geolocation permission:', error);
      return false;
    }
  }

  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  async checkPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      // Fallback for browsers that don't support Permissions API
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      this.permissionStatus = result.state;
      
      // Listen for permission changes
      result.addEventListener('change', () => {
        this.permissionStatus = result.state;
      });
      
      return result.state;
    } catch (error) {
      console.error('Permission check failed:', error);
      return 'prompt';
    }
  }

  // ==================== POSITION TRACKING ====================
  async getCurrentPosition(
    highAccuracy: boolean = true,
    timeout: number = 10000
  ): Promise<GeoPosition | null> {
    if (!this.isSupported()) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPos = this.convertPosition(position);
          this.lastPosition = geoPos;
          resolve(geoPos);
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(this.handleError(error));
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: 30000, // 30 seconds cache
        }
      );
    });
  }

  startWatching(
    callback: (position: GeoPosition) => void,
    errorCallback?: (error: string) => void,
    highAccuracy: boolean = true
  ): number {
    if (!this.isSupported()) {
      throw new Error('Geolocation not supported');
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const geoPos = this.convertPosition(position);
        this.lastPosition = geoPos;
        callback(geoPos);
      },
      (error) => {
        const errorMsg = this.handleError(error);
        console.error('Watch position error:', errorMsg);
        if (errorCallback) {
          errorCallback(errorMsg);
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return this.watchId;
  }

  stopWatching(): void {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }
  }

  // ==================== GEOFENCING ====================
  addGeofence(zone: GeofenceZone): void {
    this.geofences.set(zone.id, zone);
  }

  removeGeofence(zoneId: string): void {
    this.geofences.delete(zoneId);
  }

  clearGeofences(): void {
    this.geofences.clear();
  }

  validateLocation(position: GeoPosition, zones?: GeofenceZone[]): LocationValidation {
    const checkZones = zones || Array.from(this.geofences.values());
    
    if (checkZones.length === 0) {
      return {
        isValid: true,
        isWithinGeofence: false,
        message: 'No geofences configured',
      };
    }

    let nearestZone: GeofenceZone | undefined;
    let minDistance = Infinity;

    for (const zone of checkZones) {
      const distance = this.calculateDistance(
        position.lat,
        position.lng,
        zone.center.lat,
        zone.center.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = zone;
      }

      if (distance <= zone.radius) {
        return {
          isValid: true,
          isWithinGeofence: true,
          distance,
          nearestZone: zone,
          message: `Within ${zone.name}`,
        };
      }
    }

    return {
      isValid: true,
      isWithinGeofence: false,
      distance: minDistance,
      nearestZone,
      message: nearestZone
        ? `${Math.round(minDistance)}m from ${nearestZone.name}`
        : 'Outside all zones',
    };
  }

  // ==================== ADDRESS RESOLUTION ====================
  async reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
    try {
      // Using Nominatim (OpenStreetMap) for free geocoding
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'W3Suite/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      return {
        street: data.address?.road,
        city: data.address?.city || data.address?.town || data.address?.village,
        region: data.address?.state,
        country: data.address?.country,
        postalCode: data.address?.postcode,
        formatted: data.display_name,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      
      // Fallback to IP-based location
      return await this.getAddressFromIP();
    }
  }

  async getAddressFromIP(): Promise<GeoAddress | null> {
    try {
      // Using ipapi for fallback IP geolocation
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error('IP geolocation failed');
      }

      const data = await response.json();
      
      return {
        city: data.city,
        region: data.region,
        country: data.country_name,
        postalCode: data.postal,
        formatted: `${data.city}, ${data.region}, ${data.country_name}`,
      };
    } catch (error) {
      console.error('IP geolocation error:', error);
      return null;
    }
  }

  // ==================== UTILITIES ====================
  private convertPosition(position: GeolocationPosition): GeoPosition {
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };
  }

  private handleError(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied';
      case error.POSITION_UNAVAILABLE:
        return 'Location unavailable';
      case error.TIMEOUT:
        return 'Location request timeout';
      default:
        return error.message || 'Unknown location error';
    }
  }

  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    // Haversine formula for distance calculation in meters
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  getLastPosition(): GeoPosition | undefined {
    return this.lastPosition;
  }

  getPermissionStatus(): PermissionState | undefined {
    return this.permissionStatus;
  }

  // ==================== MOCK METHODS FOR TESTING ====================
  async mockPosition(lat: number, lng: number, accuracy: number = 10): Promise<GeoPosition> {
    const position: GeoPosition = {
      lat,
      lng,
      accuracy,
      timestamp: Date.now(),
    };
    
    this.lastPosition = position;
    return position;
  }

  mockGeofenceValidation(isWithin: boolean, distance: number = 0): LocationValidation {
    return {
      isValid: true,
      isWithinGeofence: isWithin,
      distance,
      message: isWithin ? 'Within zone' : `${distance}m away`,
    };
  }
}

// Singleton instance
export const geolocationManager = new GeolocationManager();

// Privacy-aware wrapper
export async function requestLocationPermission(): Promise<boolean> {
  const manager = geolocationManager;
  
  // Check if already granted
  const status = await manager.checkPermission();
  if (status === 'granted') {
    return true;
  }
  
  // Request permission by trying to get position
  try {
    await manager.getCurrentPosition(false, 5000);
    return true;
  } catch (error) {
    console.error('Location permission denied:', error);
    return false;
  }
}

// Store locations for Italy (example data)
export const ITALY_STORE_ZONES: GeofenceZone[] = [
  {
    id: 'mi-duomo',
    name: 'Milano Duomo',
    center: { lat: 45.4642, lng: 9.1900 },
    radius: 200,
    type: 'store',
  },
  {
    id: 'rm-colosseo',
    name: 'Roma Colosseo',
    center: { lat: 41.8902, lng: 12.4922 },
    radius: 200,
    type: 'store',
  },
  {
    id: 'na-centro',
    name: 'Napoli Centro',
    center: { lat: 40.8518, lng: 14.2681 },
    radius: 200,
    type: 'store',
  },
];

// Helper to find nearest store
export function findNearestStore(
  position: GeoPosition,
  stores: GeofenceZone[] = ITALY_STORE_ZONES
): { store: GeofenceZone; distance: number } | null {
  if (stores.length === 0) return null;

  let nearest: GeofenceZone | null = null;
  let minDistance = Infinity;

  for (const store of stores) {
    const distance = new GeolocationManager().calculateDistance(
      position.lat,
      position.lng,
      store.center.lat,
      store.center.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = store;
    }
  }

  return nearest ? { store: nearest, distance: minDistance } : null;
}