// Time Tracking Service - Enterprise Time Management
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { TimeTracking, InsertTimeTracking } from '../../../../backend/api/src/db/schema/w3suite';

export interface TimeTrackingEntry extends TimeTracking {
  userName?: string;
  storeName?: string;
  shiftName?: string;
}

export interface ClockInData {
  storeId: string;
  trackingMethod: 'badge' | 'nfc' | 'app' | 'gps' | 'manual' | 'biometric';
  geoLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  };
  deviceInfo?: {
    deviceId?: string;
    deviceType?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  shiftId?: string;
  notes?: string;
  // Enhanced geofencing audit fields
  wasOverride?: boolean;
  overrideReason?: string;
}

export interface ClockOutData {
  notes?: string;
  geoLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  };
}

export interface TimeTrackingFilters {
  userId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'completed' | 'edited' | 'disputed';
  includeBreaks?: boolean;
}

export interface TimeTrackingReport {
  userId: string;
  userName: string;
  period: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  breakMinutes: number;
  daysWorked: number;
  averageHoursPerDay: number;
  entriesCount: number;
  disputedEntries: number;
}

export interface CurrentSession {
  id: string;
  clockIn: string;
  storeId: string;
  storeName: string;
  trackingMethod: string;
  elapsedMinutes: number;
  breakMinutes: number;
  currentBreak?: {
    start: string;
    duration: number;
  };
  isOvertime: boolean;
  requiresBreak: boolean;
}

// ==================== STORE GEOLOCATION INTERFACES ====================
export interface NearbyStore {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number; // meters
  inGeofence: boolean;
  confidence: number; // 0-100
  address?: string;
  city?: string;
  province?: string;
  radius: number;
  rank: number;
  isNearest: boolean;
  wifiNetworks?: any[];
}

export interface NearbyStoresResponse {
  stores: NearbyStore[];
  searchCenter: {
    lat: number;
    lng: number;
    radius: number;
  };
  totalFound: number;
  inGeofenceCount: number;
  message: string;
}

export interface StoreResolutionResult {
  selectedStore: NearbyStore | null;
  nearbyStores: NearbyStore[];
  autoDetected: boolean;
  requiresManualSelection: boolean;
  error?: string;
}

class TimeTrackingService {
  // ==================== CLOCK OPERATIONS ====================
  async clockIn(data: ClockInData): Promise<TimeTrackingEntry> {
    // Get device info automatically
    const deviceInfo = {
      ...data.deviceInfo,
      userAgent: navigator.userAgent,
      deviceType: this.detectDeviceType(),
    };

    const response = await apiPost<TimeTrackingEntry>('/api/hr/time-tracking/clock-in', {
      ...data,
      deviceInfo,
      clockIn: new Date().toISOString(),
    });

    // Store session in localStorage for offline support
    if (response) {
      localStorage.setItem('w3_current_session', JSON.stringify({
        id: response.id,
        startTime: response.clockIn,
        storeId: response.storeId,
      }));
    }

    return response;
  }

  async clockOut(id: string, data?: ClockOutData): Promise<TimeTrackingEntry> {
    const response = await apiPost<TimeTrackingEntry>(
      `/api/hr/time-tracking/${id}/clock-out`,
      {
        ...data,
        clockOut: new Date().toISOString(),
      }
    );

    // Clear session from localStorage
    if (response) {
      localStorage.removeItem('w3_current_session');
    }

    return response;
  }

  async getCurrentSession(): Promise<CurrentSession | null> {
    try {
      const response = await apiGet<CurrentSession>('/api/hr/time-tracking/current');
      return response;
    } catch (error) {
      // Try to get from localStorage if API fails
      const cached = localStorage.getItem('w3_current_session');
      if (cached) {
        const session = JSON.parse(cached);
        const elapsed = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 60000);
        return {
          id: session.id,
          clockIn: session.startTime,
          storeId: session.storeId,
          storeName: 'Store', // Would need to fetch
          trackingMethod: 'app',
          elapsedMinutes: elapsed,
          breakMinutes: 0,
          isOvertime: elapsed > 480, // 8 hours
          requiresBreak: elapsed > 360, // 6 hours
        };
      }
      return null;
    }
  }

  // ==================== BREAK MANAGEMENT ====================
  async startBreak(trackingId: string): Promise<TimeTrackingEntry> {
    return await apiPost<TimeTrackingEntry>(
      `/api/hr/time-tracking/${trackingId}/break/start`,
      {
        breakStart: new Date().toISOString(),
      }
    );
  }

  async endBreak(trackingId: string): Promise<TimeTrackingEntry> {
    return await apiPost<TimeTrackingEntry>(
      `/api/hr/time-tracking/${trackingId}/break/end`,
      {
        breakEnd: new Date().toISOString(),
      }
    );
  }

  // ==================== ENTRIES MANAGEMENT ====================
  async getEntries(filters?: TimeTrackingFilters): Promise<TimeTrackingEntry[]> {
    const params = new URLSearchParams();
    
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.storeId) params.append('storeId', filters.storeId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.includeBreaks !== undefined) {
      params.append('includeBreaks', String(filters.includeBreaks));
    }

    return await apiGet<TimeTrackingEntry[]>(
      `/api/hr/time-tracking/entries?${params.toString()}`
    );
  }

  async getEntryById(id: string): Promise<TimeTrackingEntry> {
    return await apiGet<TimeTrackingEntry>(
      `/api/hr/time-tracking/entries/${id}`
    );
  }

  async updateEntry(
    id: string,
    data: Partial<InsertTimeTracking>
  ): Promise<TimeTrackingEntry> {
    return await apiPut<TimeTrackingEntry>(
      `/api/hr/time-tracking/entries/${id}`,
      data
    );
  }

  async disputeEntry(id: string, reason: string): Promise<TimeTrackingEntry> {
    return await apiPost<TimeTrackingEntry>(
      `/api/hr/time-tracking/entries/${id}/dispute`,
      { reason }
    );
  }

  async approveEntry(id: string, comments?: string): Promise<TimeTrackingEntry> {
    return await apiPost<TimeTrackingEntry>(
      `/api/hr/time-tracking/entries/${id}/approve`,
      { comments }
    );
  }

  // ==================== REPORTS ====================
  async getReport(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeTrackingReport> {
    const params = new URLSearchParams({
      userId,
      startDate,
      endDate,
    });

    return await apiGet<TimeTrackingReport>(
      `/api/hr/time-tracking/reports?${params.toString()}`
    );
  }

  async getTeamReport(
    storeId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeTrackingReport[]> {
    const params = new URLSearchParams({
      storeId,
      startDate,
      endDate,
    });

    return await apiGet<TimeTrackingReport[]>(
      `/api/hr/time-tracking/reports/team?${params.toString()}`
    );
  }

  async exportEntries(
    filters: TimeTrackingFilters,
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    params.append('format', format);

    const response = await fetch(`/api/hr/time-tracking/export?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return await response.blob();
  }

  // ==================== VALIDATION ====================
  async validateClockIn(storeId: string, geoLocation?: { lat: number; lng: number }): Promise<{
    valid: boolean;
    reason?: string;
    suggestions?: string[];
  }> {
    return await apiPost<{ valid: boolean; reason?: string; suggestions?: string[] }>(
      '/api/hr/time-tracking/validate/clock-in',
      {
        storeId,
        geoLocation,
        timestamp: new Date().toISOString(),
      }
    );
  }

  async checkConflicts(
    userId: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<TimeTrackingEntry[]> {
    const params = new URLSearchParams({
      userId,
      startTime,
      endTime,
    });
    
    if (excludeId) {
      params.append('excludeId', excludeId);
    }

    return await apiGet<TimeTrackingEntry[]>(
      `/api/hr/time-tracking/conflicts?${params.toString()}`
    );
  }

  // ==================== STORE GEOLOCATION SERVICES ====================
  async getNearbyStores(
    lat: number, 
    lng: number, 
    radius: number = 200
  ): Promise<NearbyStoresResponse> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString()
    });

    const response = await apiGet<NearbyStoresResponse>(
      `/api/stores/nearby?${params.toString()}`
    );

    // Cache the successful GPS location for future use
    if (response.stores.length > 0) {
      localStorage.setItem('w3_last_gps_location', JSON.stringify({
        lat,
        lng,
        timestamp: Date.now(),
        stores: response.stores
      }));
    }

    return response;
  }

  async resolveStoreSelection(
    lat: number,
    lng: number,
    gpsAccuracy: number = 20,
    radius: number = 200
  ): Promise<StoreResolutionResult> {
    try {
      const nearbyResponse = await this.getNearbyStores(lat, lng, radius);
      const storesInGeofence = nearbyResponse.stores.filter(store => store.inGeofence);
      
      let selectedStore: NearbyStore | null = null;
      let autoDetected = false;
      let requiresManualSelection = false;

      // Business Logic: Auto-select rules
      if (storesInGeofence.length === 1 && gpsAccuracy < 100) {
        // Single store in geofence with good GPS accuracy = auto-select
        selectedStore = storesInGeofence[0];
        autoDetected = true;
      } else if (storesInGeofence.length > 1) {
        // Multiple stores in geofence = manual selection required
        requiresManualSelection = true;
      } else if (nearbyResponse.stores.length > 0) {
        // No stores in geofence but stores nearby = manual selection required
        requiresManualSelection = true;
      } else {
        // No stores found = manual fallback
        requiresManualSelection = true;
      }

      return {
        selectedStore,
        nearbyStores: nearbyResponse.stores,
        autoDetected,
        requiresManualSelection
      };

    } catch (error) {
      console.error('Store resolution error:', error);
      return {
        selectedStore: null,
        nearbyStores: [],
        autoDetected: false,
        requiresManualSelection: true,
        error: error instanceof Error ? error.message : 'Store resolution failed'
      };
    }
  }

  getCachedLastLocation(): { lat: number; lng: number; stores: NearbyStore[] } | null {
    try {
      const cached = localStorage.getItem('w3_last_gps_location');
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      // Check if cache is less than 24 hours old
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return {
          lat: data.lat,
          lng: data.lng,
          stores: data.stores
        };
      }
    } catch (error) {
      console.warn('Failed to load cached location:', error);
    }
    return null;
  }

  clearLocationCache(): void {
    localStorage.removeItem('w3_last_gps_location');
  }

  // ==================== UTILITIES ====================
  private detectDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/Mobi|Android/i.test(userAgent)) {
      return 'mobile';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  calculateDuration(clockIn: string | Date, clockOut?: string | Date | null): number {
    const start = new Date(clockIn).getTime();
    const end = clockOut ? new Date(clockOut).getTime() : Date.now();
    return Math.floor((end - start) / 60000); // Minutes
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }

  isOvertime(minutes: number, regularHours: number = 8): boolean {
    return minutes > regularHours * 60;
  }

  requiresBreak(minutes: number): boolean {
    return minutes > 360; // 6 hours
  }

  getShiftAlignment(
    clockIn: string,
    shiftStart: string,
    tolerance: number = 15
  ): 'early' | 'on-time' | 'late' {
    const clockInTime = new Date(clockIn).getTime();
    const shiftTime = new Date(shiftStart).getTime();
    const diff = (clockInTime - shiftTime) / 60000; // Minutes

    if (diff < -tolerance) return 'early';
    if (diff > tolerance) return 'late';
    return 'on-time';
  }
}

export const timeTrackingService = new TimeTrackingService();