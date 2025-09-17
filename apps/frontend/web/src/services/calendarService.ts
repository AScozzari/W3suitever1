// Calendar Service - API operations for calendar, shifts, leave requests
import { apiRequest } from '@/lib/queryClient';
import { CalendarScope, EventVisibility } from '@/hooks/useCalendarPermissions';

// Types
export interface CalendarEvent {
  id: string;
  tenantId: string;
  ownerId: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string | Date;
  endDate: string | Date;
  allDay: boolean;
  type: 'meeting' | 'shift' | 'time_off' | 'overtime' | 'training' | 'deadline' | 'other';
  visibility: EventVisibility;
  status: 'tentative' | 'confirmed' | 'cancelled';
  hrSensitive: boolean;
  teamId?: string;
  storeId?: string;
  areaId?: string;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: string;
    exceptions?: string[];
  };
  attendees?: Array<{
    userId: string;
    status: 'pending' | 'accepted' | 'declined' | 'tentative';
    responseTime?: string;
  }>;
  metadata?: Record<string, any>;
  color?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  // Frontend-specific fields
  ownerName?: string;
  ownerAvatar?: string;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  userId: string;
  storeId?: string;
  leaveType: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'other';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  notes?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvalChain: Array<{
    approverId: string;
    status: string;
    timestamp: string;
    comments?: string;
  }>;
  currentApprover?: string;
  coveredBy?: string;
  attachments?: Array<{
    fileName: string;
    path: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  processedAt?: string;
  // Frontend-specific
  userName?: string;
  userAvatar?: string;
  currentApproverName?: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  code?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  requiredStaff: number;
  assignedUsers: string[];
  shiftType: 'morning' | 'afternoon' | 'night' | 'full_day' | 'split' | 'on_call';
  templateId?: string;
  skills?: string[];
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Frontend-specific
  assignedUserDetails?: Array<{
    userId: string;
    name: string;
    avatar?: string;
  }>;
}

export interface TimeTracking {
  id: string;
  tenantId: string;
  userId: string;
  storeId: string;
  clockIn: string;
  clockOut?: string;
  breaks: Array<{
    start: string;
    end: string;
    duration: number;
  }>;
  trackingMethod: 'badge' | 'nfc' | 'app' | 'gps' | 'manual' | 'biometric';
  geoLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  };
  deviceInfo?: {
    deviceId: string;
    deviceType: string;
    ipAddress?: string;
    userAgent?: string;
  };
  shiftId?: string;
  totalMinutes?: number;
  breakMinutes?: number;
  overtimeMinutes?: number;
  holidayBonus: boolean;
  status: 'active' | 'completed' | 'edited' | 'disputed';
  notes?: string;
  editReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Filters
export interface CalendarEventFilters {
  startDate?: Date | string;
  endDate?: Date | string;
  type?: string[];
  visibility?: string[];
  storeId?: string;
  teamId?: string;
  ownerId?: string;
  includeRecurring?: boolean;
}

export interface LeaveRequestFilters {
  status?: string[];
  leaveType?: string[];
  startDate?: Date | string;
  endDate?: Date | string;
  userId?: string;
  approverId?: string;
  storeId?: string;
}

export interface ShiftFilters {
  startDate: Date | string;
  endDate: Date | string;
  storeId?: string;
  shiftType?: string[];
  status?: string[];
  userId?: string;
}

// Service class
class CalendarService {
  // Calendar Events
  async getEvents(filters?: CalendarEventFilters): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    
    if (filters?.startDate) {
      params.append('startDate', new Date(filters.startDate).toISOString());
    }
    if (filters?.endDate) {
      params.append('endDate', new Date(filters.endDate).toISOString());
    }
    if (filters?.type && filters.type.length > 0) {
      filters.type.forEach(t => params.append('type', t));
    }
    if (filters?.visibility && filters.visibility.length > 0) {
      filters.visibility.forEach(v => params.append('visibility', v));
    }
    if (filters?.storeId) {
      params.append('storeId', filters.storeId);
    }
    if (filters?.teamId) {
      params.append('teamId', filters.teamId);
    }
    if (filters?.ownerId) {
      params.append('ownerId', filters.ownerId);
    }
    
    const response = await apiRequest(`/api/hr/calendar/events?${params.toString()}`, {
      method: 'GET'
    });
    
    return response;
  }
  
  async getEventById(id: string): Promise<CalendarEvent> {
    const response = await apiRequest(`/api/hr/calendar/events/${id}`, {
      method: 'GET'
    });
    
    return response;
  }
  
  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await apiRequest('/api/hr/calendar/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    
    return response;
  }
  
  async updateEvent(id: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await apiRequest(`/api/hr/calendar/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    
    return response;
  }
  
  async deleteEvent(id: string): Promise<void> {
    await apiRequest(`/api/hr/calendar/events/${id}`, {
      method: 'DELETE'
    });
  }
  
  // Leave Requests
  async getLeaveRequests(filters?: LeaveRequestFilters): Promise<LeaveRequest[]> {
    const params = new URLSearchParams();
    
    if (filters?.status && filters.status.length > 0) {
      filters.status.forEach(s => params.append('status', s));
    }
    if (filters?.leaveType && filters.leaveType.length > 0) {
      filters.leaveType.forEach(t => params.append('leaveType', t));
    }
    if (filters?.startDate) {
      params.append('startDate', new Date(filters.startDate).toISOString());
    }
    if (filters?.endDate) {
      params.append('endDate', new Date(filters.endDate).toISOString());
    }
    if (filters?.userId) {
      params.append('userId', filters.userId);
    }
    if (filters?.approverId) {
      params.append('approverId', filters.approverId);
    }
    if (filters?.storeId) {
      params.append('storeId', filters.storeId);
    }
    
    const response = await apiRequest(`/api/hr/leave-requests?${params.toString()}`, {
      method: 'GET'
    });
    
    return response;
  }
  
  async createLeaveRequest(request: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await apiRequest('/api/hr/leave-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    return response;
  }
  
  async approveLeaveRequest(id: string, comments?: string): Promise<LeaveRequest> {
    const response = await apiRequest(`/api/hr/leave-requests/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comments })
    });
    
    return response;
  }
  
  async rejectLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
    const response = await apiRequest(`/api/hr/leave-requests/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    
    return response;
  }
  
  async getPendingApprovalsCount(): Promise<{ count: number }> {
    const response = await apiRequest('/api/hr/leave-requests/pending-count', {
      method: 'GET'
    });
    
    return response;
  }
  
  // Shifts
  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    const params = new URLSearchParams();
    
    params.append('startDate', new Date(filters.startDate).toISOString());
    params.append('endDate', new Date(filters.endDate).toISOString());
    
    if (filters.storeId) {
      params.append('storeId', filters.storeId);
    }
    if (filters.shiftType && filters.shiftType.length > 0) {
      filters.shiftType.forEach(t => params.append('shiftType', t));
    }
    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(s => params.append('status', s));
    }
    if (filters.userId) {
      params.append('userId', filters.userId);
    }
    
    const response = await apiRequest(`/api/hr/shifts?${params.toString()}`, {
      method: 'GET'
    });
    
    return response;
  }
  
  async createShift(shift: Partial<Shift>): Promise<Shift> {
    const response = await apiRequest('/api/hr/shifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shift)
    });
    
    return response;
  }
  
  async updateShift(id: string, shift: Partial<Shift>): Promise<Shift> {
    const response = await apiRequest(`/api/hr/shifts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shift)
    });
    
    return response;
  }
  
  async assignUserToShift(shiftId: string, userId: string): Promise<Shift> {
    const response = await apiRequest(`/api/hr/shifts/${shiftId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    return response;
  }
  
  async removeUserFromShift(shiftId: string, userId: string): Promise<Shift> {
    const response = await apiRequest(`/api/hr/shifts/${shiftId}/unassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    return response;
  }
  
  // Time Tracking
  async clockIn(data: {
    storeId: string;
    trackingMethod: string;
    geoLocation?: any;
    deviceInfo?: any;
    shiftId?: string;
  }): Promise<TimeTracking> {
    const response = await apiRequest('/api/hr/time-tracking/clock-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    return response;
  }
  
  async clockOut(trackingId: string, notes?: string): Promise<TimeTracking> {
    const response = await apiRequest(`/api/hr/time-tracking/${trackingId}/clock-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes })
    });
    
    return response;
  }
  
  async getTimeTrackingHistory(
    userId?: string,
    startDate?: Date | string,
    endDate?: Date | string
  ): Promise<TimeTracking[]> {
    const params = new URLSearchParams();
    
    if (userId) {
      params.append('userId', userId);
    }
    if (startDate) {
      params.append('startDate', new Date(startDate).toISOString());
    }
    if (endDate) {
      params.append('endDate', new Date(endDate).toISOString());
    }
    
    const response = await apiRequest(`/api/hr/time-tracking?${params.toString()}`, {
      method: 'GET'
    });
    
    return response;
  }
  
  // Permissions
  async getUserPermissions(): Promise<any> {
    const response = await apiRequest('/api/hr/calendar/permissions', {
      method: 'GET'
    });
    
    return response;
  }
}

// Export singleton instance
export const calendarService = new CalendarService();