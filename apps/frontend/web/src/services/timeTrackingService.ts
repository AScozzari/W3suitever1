// Time Tracking Service - Enterprise Time Management with End-to-End Encryption
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { TimeTracking, InsertTimeTracking } from '../../../../backend/api/src/db/schema/w3suite';
import { encryptionManager } from '@/utils/encryptionManager';

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

// Encrypted data interface for API communication
export interface EncryptedClockInData {
  storeId: string;
  trackingMethod: 'badge' | 'nfc' | 'app' | 'gps' | 'manual' | 'biometric';
  shiftId?: string;
  wasOverride?: boolean;
  overrideReason?: string;
  // Encrypted fields
  encryptedGeoLocation?: string;
  encryptedDeviceInfo?: string;
  encryptedNotes?: string;
  encryptionKeyId?: string;
  encryptionMetadata?: {
    geoLocationIv?: string;
    deviceInfoIv?: string;
    notesIv?: string;
    geoLocationTag?: string;
    deviceInfoTag?: string;
    notesTag?: string;
  };
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
  isDemoMode?: boolean;
  fallbackReason?: string;
}

export interface StoreResolutionResult {
  selectedStore: NearbyStore | null;
  nearbyStores: NearbyStore[];
  autoDetected: boolean;
  requiresManualSelection: boolean;
  error?: string;
}

class TimeTrackingService {
  // ==================== TENANT ID HELPER ====================
  private getCurrentTenantId(): string {
    // Fallback to localStorage or demo tenant during loading
    if (typeof window !== 'undefined') {
      const storedTenantId = window.localStorage.getItem('currentTenantId');
      if (storedTenantId) return storedTenantId;
    }
    // Demo tenant for development
    return '00000000-0000-0000-0000-000000000001';
  }

  // ==================== ENCRYPTION HELPERS ====================
  private async encryptSensitiveData(data: ClockInData): Promise<EncryptedClockInData> {
    const encryptedData: EncryptedClockInData = {
      storeId: data.storeId,
      trackingMethod: data.trackingMethod,
      shiftId: data.shiftId,
      wasOverride: data.wasOverride,
      overrideReason: data.overrideReason,
    };

    const encryptionMetadata: any = {};

    try {
      // Encrypt geoLocation if present
      if (data.geoLocation) {
        const tenantId = this.getCurrentTenantId();
        const encrypted = await encryptionManager.encryptSensitiveData(
          { geoLocation: data.geoLocation }, 
          tenantId
        );
        encryptedData.encryptedGeoLocation = encrypted.data;
        encryptedData.encryptionKeyId = encrypted.keyId;
        encryptionMetadata.geoLocationIv = encrypted.iv;
        encryptionMetadata.geoLocationTag = encrypted.tag;
      }

      // Encrypt deviceInfo if present
      if (data.deviceInfo) {
        const tenantId = this.getCurrentTenantId();
        const encrypted = await encryptionManager.encryptSensitiveData(
          { deviceInfo: data.deviceInfo }, 
          tenantId
        );
        encryptedData.encryptedDeviceInfo = encrypted.data;
        if (!encryptedData.encryptionKeyId) {
          encryptedData.encryptionKeyId = encrypted.keyId;
        }
        encryptionMetadata.deviceInfoIv = encrypted.iv;
        encryptionMetadata.deviceInfoTag = encrypted.tag;
      }

      // Encrypt notes if present
      if (data.notes) {
        const tenantId = this.getCurrentTenantId();
        const encrypted = await encryptionManager.encryptSensitiveData(
          { notes: data.notes }, 
          tenantId
        );
        encryptedData.encryptedNotes = encrypted.data;
        if (!encryptedData.encryptionKeyId) {
          encryptedData.encryptionKeyId = encrypted.keyId;
        }
        encryptionMetadata.notesIv = encrypted.iv;
        encryptionMetadata.notesTag = encrypted.tag;
      }

      if (Object.keys(encryptionMetadata).length > 0) {
        encryptedData.encryptionMetadata = encryptionMetadata;
      }

      console.log('🔒 [ENCRYPTION] Successfully encrypted sensitive time tracking data');
      return encryptedData;
    } catch (error) {
      console.error('🚨 [ENCRYPTION-ERROR] Failed to encrypt sensitive data:', error);
      
      // Security gate: Only allow plaintext fallback in demo mode
      if ((import.meta as any).env?.VITE_DEMO_MODE === 'true') {
        console.warn('⚠️ [DEMO-MODE] Using plaintext fallback - NOT for production!');
        return {
          ...encryptedData,
          // Include original data as fallback (only in demo mode)
          geoLocation: data.geoLocation,
          deviceInfo: data.deviceInfo,
          notes: data.notes,
        } as any;
      }
      
      // Production: Return typed error instead of plaintext
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown encryption error'}`);
    }
  }

  private async decryptSensitiveData(encryptedEntry: any): Promise<any> {
    if (!encryptedEntry.encryptionKeyId) {
      return encryptedEntry; // No encryption metadata, return as is
    }

    try {
      const decrypted = { ...encryptedEntry };

      // Decrypt geoLocation if present
      if (encryptedEntry.encryptedGeoLocation && encryptedEntry.encryptionMetadata?.geoLocationIv) {
        const tenantId = this.getCurrentTenantId();
        const encryptedData = {
          data: encryptedEntry.encryptedGeoLocation,
          iv: encryptedEntry.encryptionMetadata.geoLocationIv,
          salt: '', // Will be handled by encryption manager
          tag: encryptedEntry.encryptionMetadata.geoLocationTag,
          version: 1,
          keyId: encryptedEntry.encryptionKeyId,
          timestamp: Date.now()
        };
        const decryptedData = await encryptionManager.decryptSensitiveData(encryptedData, tenantId);
        decrypted.geoLocation = decryptedData.geoLocation;
        delete decrypted.encryptedGeoLocation;
      }

      // Decrypt deviceInfo if present
      if (encryptedEntry.encryptedDeviceInfo && encryptedEntry.encryptionMetadata?.deviceInfoIv) {
        const tenantId = this.getCurrentTenantId();
        const encryptedData = {
          data: encryptedEntry.encryptedDeviceInfo,
          iv: encryptedEntry.encryptionMetadata.deviceInfoIv,
          salt: '', // Will be handled by encryption manager
          tag: encryptedEntry.encryptionMetadata.deviceInfoTag,
          version: 1,
          keyId: encryptedEntry.encryptionKeyId,
          timestamp: Date.now()
        };
        const decryptedData = await encryptionManager.decryptSensitiveData(encryptedData, tenantId);
        decrypted.deviceInfo = decryptedData.deviceInfo;
        delete decrypted.encryptedDeviceInfo;
      }

      // Decrypt notes if present
      if (encryptedEntry.encryptedNotes && encryptedEntry.encryptionMetadata?.notesIv) {
        const tenantId = this.getCurrentTenantId();
        const encryptedData = {
          data: encryptedEntry.encryptedNotes,
          iv: encryptedEntry.encryptionMetadata.notesIv,
          salt: '', // Will be handled by encryption manager
          tag: encryptedEntry.encryptionMetadata.notesTag,
          version: 1,
          keyId: encryptedEntry.encryptionKeyId,
          timestamp: Date.now()
        };
        const decryptedData = await encryptionManager.decryptSensitiveData(encryptedData, tenantId);
        decrypted.notes = decryptedData.notes;
        delete decrypted.encryptedNotes;
      }

      // Clean up encryption metadata
      delete decrypted.encryptionKeyId;
      delete decrypted.encryptionMetadata;

      console.log('🔓 [DECRYPTION] Successfully decrypted sensitive time tracking data');
      return decrypted;
    } catch (error) {
      console.error('🚨 [DECRYPTION-ERROR] Failed to decrypt sensitive data:', error);
      // Return original encrypted data if decryption fails
      return encryptedEntry;
    }
  }

  // ==================== CLOCK OPERATIONS ====================
  async clockIn(data: ClockInData): Promise<TimeTrackingEntry> {
    // Get device info automatically
    const deviceInfo = {
      ...data.deviceInfo,
      userAgent: navigator.userAgent,
      deviceType: this.detectDeviceType(),
    };

    // Prepare data with enhanced device info
    const enhancedData = {
      ...data,
      deviceInfo,
    };

    // Encrypt sensitive data before sending to API
    console.log('🔒 [CLOCK-IN] Encrypting sensitive data before API call');
    const encryptedData = await this.encryptSensitiveData(enhancedData);

    const response = await apiPost<TimeTrackingEntry>('/api/hr/time-tracking/clock-in', {
      ...encryptedData,
      clockIn: new Date().toISOString(),
    });

    // Decrypt response data for client use
    const decryptedResponse = await this.decryptSensitiveData(response);

    // Store session in localStorage for offline support
    if (decryptedResponse) {
      localStorage.setItem('w3_current_session', JSON.stringify({
        id: decryptedResponse.id,
        startTime: decryptedResponse.clockIn,
        storeId: decryptedResponse.storeId,
      }));
    }

    return decryptedResponse;
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