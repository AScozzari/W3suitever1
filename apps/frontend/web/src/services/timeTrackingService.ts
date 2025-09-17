// Time Tracking Service - Enterprise Time Management
import { apiRequest } from '@/lib/queryClient';
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

class TimeTrackingService {
  // ==================== CLOCK OPERATIONS ====================
  async clockIn(data: ClockInData): Promise<TimeTrackingEntry> {
    // Get device info automatically
    const deviceInfo = {
      ...data.deviceInfo,
      userAgent: navigator.userAgent,
      deviceType: this.detectDeviceType(),
    };

    const response = await apiRequest<TimeTrackingEntry>({
      url: '/api/hr/time-tracking/clock-in',
      method: 'POST',
      data: {
        ...data,
        deviceInfo,
        clockIn: new Date().toISOString(),
      },
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
    const response = await apiRequest<TimeTrackingEntry>({
      url: `/api/hr/time-tracking/${id}/clock-out`,
      method: 'POST',
      data: {
        ...data,
        clockOut: new Date().toISOString(),
      },
    });

    // Clear session from localStorage
    if (response) {
      localStorage.removeItem('w3_current_session');
    }

    return response;
  }

  async getCurrentSession(): Promise<CurrentSession | null> {
    try {
      const response = await apiRequest<CurrentSession>({
        url: '/api/hr/time-tracking/current',
        method: 'GET',
      });
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
    return await apiRequest<TimeTrackingEntry>({
      url: `/api/hr/time-tracking/${trackingId}/break/start`,
      method: 'POST',
      data: {
        breakStart: new Date().toISOString(),
      },
    });
  }

  async endBreak(trackingId: string): Promise<TimeTrackingEntry> {
    return await apiRequest<TimeTrackingEntry>({
      url: `/api/hr/time-tracking/${trackingId}/break/end`,
      method: 'POST',
      data: {
        breakEnd: new Date().toISOString(),
      },
    });
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

    return await apiRequest<TimeTrackingEntry[]>({
      url: `/api/hr/time-tracking/entries?${params.toString()}`,
      method: 'GET',
    });
  }

  async getEntryById(id: string): Promise<TimeTrackingEntry> {
    return await apiRequest<TimeTrackingEntry>({
      url: `/api/hr/time-tracking/entries/${id}`,
      method: 'GET',
    });
  }

  async updateEntry(
    id: string,
    data: Partial<InsertTimeTracking>
  ): Promise<TimeTrackingEntry> {
    return await apiRequest<TimeTrackingEntry>({
      url: `/api/hr/time-tracking/entries/${id}`,
      method: 'PUT',
      data,
    });
  }

  async disputeEntry(id: string, reason: string): Promise<TimeTrackingEntry> {
    return await apiRequest<TimeTrackingEntry>({
      url: `/api/hr/time-tracking/entries/${id}/dispute`,
      method: 'POST',
      data: { reason },
    });
  }

  async approveEntry(id: string, comments?: string): Promise<TimeTrackingEntry> {
    return await apiRequest<TimeTrackingEntry>({
      url: `/api/hr/time-tracking/entries/${id}/approve`,
      method: 'POST',
      data: { comments },
    });
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

    return await apiRequest<TimeTrackingReport>({
      url: `/api/hr/time-tracking/reports?${params.toString()}`,
      method: 'GET',
    });
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

    return await apiRequest<TimeTrackingReport[]>({
      url: `/api/hr/time-tracking/reports/team?${params.toString()}`,
      method: 'GET',
    });
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
    return await apiRequest({
      url: '/api/hr/time-tracking/validate/clock-in',
      method: 'POST',
      data: {
        storeId,
        geoLocation,
        timestamp: new Date().toISOString(),
      },
    });
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

    return await apiRequest<TimeTrackingEntry[]>({
      url: `/api/hr/time-tracking/conflicts?${params.toString()}`,
      method: 'GET',
    });
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