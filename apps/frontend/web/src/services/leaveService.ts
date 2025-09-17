// Leave Service - API operations for leave management
import { apiRequest } from '@/lib/queryClient';

// Types
export interface LeaveBalance {
  id: string;
  tenantId: string;
  userId: string;
  year: number;
  vacationDaysEntitled: number;
  vacationDaysUsed: number;
  vacationDaysRemaining: number;
  sickDaysUsed: number;
  personalDaysUsed: number;
  overtimeHours: number;
  compTimeHours: number;
  adjustments: Array<{
    date: string;
    type: string;
    amount: number;
    reason: string;
    authorizedBy: string;
  }>;
  lastCalculatedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  // Frontend fields
  userName?: string;
  userAvatar?: string;
  storeName?: string;
  approverName?: string;
  coverageName?: string;
}

export interface LeavePolicies {
  vacationDaysPerYear: number;
  minimumAdvanceDays: number;
  maximumConsecutiveDays: number;
  blackoutDates: string[];
  carryoverDays: number;
  sickDaysRequireCertificate: number;
  publicHolidays: string[];
  approvalLevels?: Array<{
    level: number;
    role: string;
    daysThreshold?: number;
  }>;
  maxTeamAbsence?: number;
  notificationSettings?: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    reminderHours: number;
  };
}

export interface TeamCalendarEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  storeId?: string;
  storeName?: string;
}

export interface LeaveStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageProcessingDays: number;
  upcomingAbsences: number;
  currentAbsences: number;
  yearlyUtilization: number;
}

// Service class
class LeaveService {
  // Balance operations
  async getBalance(userId: string): Promise<LeaveBalance> {
    const response = await apiRequest<LeaveBalance>(`/api/hr/leave/balance/${userId}`);
    return response;
  }

  async updateBalance(
    userId: string, 
    adjustment: { type: string; amount: number; reason: string }
  ): Promise<LeaveBalance> {
    const response = await apiRequest<LeaveBalance>(`/api/hr/leave/balance/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(adjustment)
    });
    return response;
  }

  // Leave request operations
  async getRequests(filters?: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    leaveType?: string;
    storeId?: string;
  }): Promise<LeaveRequest[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const response = await apiRequest<LeaveRequest[]>(
      `/api/hr/leave/requests${params.toString() ? '?' + params.toString() : ''}`
    );
    return response;
  }

  async getRequestById(id: string): Promise<LeaveRequest> {
    const response = await apiRequest<LeaveRequest>(`/api/hr/leave/requests/${id}`);
    return response;
  }

  async createRequest(request: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await apiRequest<LeaveRequest>('/api/hr/leave/requests', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response;
  }

  async updateRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await apiRequest<LeaveRequest>(`/api/hr/leave/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return response;
  }

  async deleteRequest(id: string): Promise<void> {
    await apiRequest(`/api/hr/leave/requests/${id}`, {
      method: 'DELETE'
    });
  }

  async submitRequest(id: string): Promise<LeaveRequest> {
    const response = await apiRequest<LeaveRequest>(`/api/hr/leave/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'pending', submittedAt: new Date().toISOString() })
    });
    return response;
  }

  async approveRequest(id: string, comments?: string): Promise<LeaveRequest> {
    const response = await apiRequest<LeaveRequest>(`/api/hr/leave/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments })
    });
    return response;
  }

  async rejectRequest(id: string, reason: string): Promise<LeaveRequest> {
    const response = await apiRequest<LeaveRequest>(`/api/hr/leave/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    return response;
  }

  async cancelRequest(id: string): Promise<LeaveRequest> {
    const response = await apiRequest<LeaveRequest>(`/api/hr/leave/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' })
    });
    return response;
  }

  // Policies operations
  async getPolicies(): Promise<LeavePolicies> {
    const response = await apiRequest<LeavePolicies>('/api/hr/leave/policies');
    return response;
  }

  async updatePolicies(policies: Partial<LeavePolicies>): Promise<LeavePolicies> {
    const response = await apiRequest<LeavePolicies>('/api/hr/leave/policies', {
      method: 'PUT',
      body: JSON.stringify(policies)
    });
    return response;
  }

  // Team calendar operations
  async getTeamCalendar(filters?: {
    startDate?: string;
    endDate?: string;
    storeId?: string;
    teamId?: string;
  }): Promise<TeamCalendarEvent[]> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const response = await apiRequest<TeamCalendarEvent[]>(
      `/api/hr/leave/team-calendar${params.toString() ? '?' + params.toString() : ''}`
    );
    return response;
  }

  // Utility methods
  calculateBusinessDays(startDate: Date, endDate: Date, holidays: string[] = []): number {
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Skip weekends and holidays
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
        count++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  validateRequest(
    request: Partial<LeaveRequest>, 
    balance: LeaveBalance, 
    policies: LeavePolicies
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!request.startDate || !request.endDate) {
      errors.push('Date di inizio e fine sono richieste');
      return { valid: false, errors };
    }
    
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if dates are in the past
    if (startDate < today) {
      errors.push('La data di inizio non può essere nel passato');
    }
    
    // Check advance notice
    const daysInAdvance = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysInAdvance < policies.minimumAdvanceDays) {
      errors.push(`Richiesta con almeno ${policies.minimumAdvanceDays} giorni di anticipo`);
    }
    
    // Check consecutive days
    const businessDays = this.calculateBusinessDays(startDate, endDate, policies.publicHolidays);
    if (businessDays > policies.maximumConsecutiveDays) {
      errors.push(`Massimo ${policies.maximumConsecutiveDays} giorni consecutivi consentiti`);
    }
    
    // Check blackout dates
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (policies.blackoutDates.includes(dateStr)) {
        errors.push(`${dateStr} è un periodo di blackout`);
        break;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Check balance for vacation requests
    if (request.leaveType === 'vacation' && balance.vacationDaysRemaining < businessDays) {
      errors.push(`Saldo ferie insufficiente (disponibili: ${balance.vacationDaysRemaining} giorni)`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  getLeaveTypeConfig(type: string) {
    const configs = {
      vacation: {
        label: 'Ferie',
        color: 'hsl(142, 71%, 45%)', // Green
        icon: '🏖️',
        requiresBalance: true,
        requiresApproval: true
      },
      sick: {
        label: 'Malattia',
        color: 'hsl(48, 96%, 53%)', // Yellow
        icon: '🏥',
        requiresBalance: false,
        requiresApproval: false,
        requiresCertificate: true
      },
      personal: {
        label: 'Personale',
        color: 'hsl(217, 91%, 60%)', // Blue
        icon: '👤',
        requiresBalance: true,
        requiresApproval: true
      },
      maternity: {
        label: 'Maternità',
        color: 'hsl(293, 69%, 49%)', // Purple
        icon: '👶',
        requiresBalance: false,
        requiresApproval: true
      },
      paternity: {
        label: 'Paternità',
        color: 'hsl(293, 69%, 49%)', // Purple
        icon: '👨‍👧',
        requiresBalance: false,
        requiresApproval: true
      },
      bereavement: {
        label: 'Lutto',
        color: 'hsl(0, 0%, 45%)', // Gray
        icon: '🕊️',
        requiresBalance: false,
        requiresApproval: false
      },
      unpaid: {
        label: 'Non retribuito',
        color: 'hsl(24, 95%, 53%)', // Orange
        icon: '📋',
        requiresBalance: false,
        requiresApproval: true
      },
      other: {
        label: 'Altro',
        color: 'hsl(262, 83%, 58%)', // Indigo
        icon: '📝',
        requiresBalance: false,
        requiresApproval: true
      }
    };
    
    return configs[type] || configs.other;
  }

  getStatusConfig(status: string) {
    const configs = {
      draft: {
        label: 'Bozza',
        color: 'hsl(0, 0%, 64%)',
        bgColor: 'hsl(0, 0%, 96%)',
        icon: '📝'
      },
      pending: {
        label: 'In attesa',
        color: 'hsl(24, 95%, 53%)', // Orange WindTre
        bgColor: 'hsl(24, 95%, 95%)',
        icon: '⏳'
      },
      approved: {
        label: 'Approvata',
        color: 'hsl(142, 71%, 45%)',
        bgColor: 'hsl(142, 71%, 95%)',
        icon: '✅'
      },
      rejected: {
        label: 'Rifiutata',
        color: 'hsl(0, 84%, 60%)',
        bgColor: 'hsl(0, 84%, 95%)',
        icon: '❌'
      },
      cancelled: {
        label: 'Annullata',
        color: 'hsl(0, 0%, 45%)',
        bgColor: 'hsl(0, 0%, 95%)',
        icon: '🚫'
      }
    };
    
    return configs[status] || configs.draft;
  }

  formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short' 
    };
    
    if (start.getTime() === end.getTime()) {
      return start.toLocaleDateString('it-IT', { ...options, year: 'numeric' });
    }
    
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`;
      }
      return `${start.toLocaleDateString('it-IT', options)} - ${end.toLocaleDateString('it-IT', { ...options, year: 'numeric' })}`;
    }
    
    return `${start.toLocaleDateString('it-IT', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('it-IT', { ...options, year: 'numeric' })}`;
  }

  // Statistics
  async getStatistics(filters?: {
    startDate?: string;
    endDate?: string;
    storeId?: string;
  }): Promise<LeaveStatistics> {
    const requests = await this.getRequests(filters);
    const today = new Date();
    
    const statistics: LeaveStatistics = {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      approvedRequests: requests.filter(r => r.status === 'approved').length,
      rejectedRequests: requests.filter(r => r.status === 'rejected').length,
      averageProcessingDays: 0,
      upcomingAbsences: 0,
      currentAbsences: 0,
      yearlyUtilization: 0
    };
    
    // Calculate average processing days
    const processedRequests = requests.filter(r => r.processedAt && r.submittedAt);
    if (processedRequests.length > 0) {
      const totalDays = processedRequests.reduce((sum, r) => {
        const submitted = new Date(r.submittedAt!);
        const processed = new Date(r.processedAt!);
        return sum + Math.floor((processed.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      statistics.averageProcessingDays = Math.round(totalDays / processedRequests.length);
    }
    
    // Count upcoming and current absences
    const approvedRequests = requests.filter(r => r.status === 'approved');
    approvedRequests.forEach(request => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      
      if (startDate > today) {
        statistics.upcomingAbsences++;
      } else if (startDate <= today && endDate >= today) {
        statistics.currentAbsences++;
      }
    });
    
    return statistics;
  }
}

export const leaveService = new LeaveService();