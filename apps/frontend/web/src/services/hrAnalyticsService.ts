// HR Analytics Service - Enterprise Analytics for HR Management
import { apiRequest } from '../lib/queryClient';
import { format as formatDate, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { oauth2Client } from './OAuth2Client';

export interface DashboardMetrics {
  totalEmployees: number;
  activeShifts: number;
  pendingLeaveRequests: number;
  overtimeHours: number;
  attendanceRate: number;
  laborCostThisMonth: number;
  complianceScore: number;
  upcomingEvents: number;
  trends: {
    employeeGrowth: number;
    attendanceChange: number;
    laborCostChange: number;
    overtimeChange: number;
  };
}

export interface AttendanceAnalytics {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  attendanceRate: number;
  punctualityRate: number;
  averageWorkHours: number;
  overtimeHours: number;
  trends: {
    daily: { date: string; present: number; absent: number; late: number }[];
    weekly: { week: string; rate: number }[];
    departmental: { department: string; rate: number }[];
  };
}

export interface LeaveAnalytics {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  averageDaysPerRequest: number;
  mostCommonTypes: { type: string; count: number; percentage: number }[];
  balanceOverview: {
    totalAvailable: number;
    totalUsed: number;
    totalScheduled: number;
  };
  trends: {
    monthly: { month: string; requests: number; days: number }[];
    byType: { type: string; data: { month: string; count: number }[] }[];
    byDepartment: { department: string; requests: number; days: number }[];
  };
}

export interface LaborCostAnalytics {
  totalCost: number;
  regularHoursCost: number;
  overtimeCost: number;
  holidayCost: number;
  averageCostPerEmployee: number;
  costByDepartment: { department: string; cost: number; percentage: number }[];
  costByStore: { store: string; cost: number; percentage: number }[];
  trends: {
    monthly: { month: string; cost: number; hours: number }[];
    quarterly: { quarter: string; cost: number; variance: number }[];
    projected: { month: string; projectedCost: number; confidence: number }[];
  };
}

export interface ShiftAnalytics {
  totalShifts: number;
  coveredShifts: number;
  openShifts: number;
  coverageRate: number;
  averageShiftDuration: number;
  peakHours: { hour: number; coverage: number }[];
  understaffedShifts: number;
  overstaffedShifts: number;
  shiftDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  trends: {
    dailyCoverage: { date: string; coverage: number; required: number }[];
    weeklyPatterns: { dayOfWeek: string; averageCoverage: number }[];
    monthlyEfficiency: { month: string; efficiency: number }[];
  };
}

export interface EmployeeDemographics {
  totalEmployees: number;
  byGender: { gender: string; count: number; percentage: number }[];
  byAgeGroup: { group: string; count: number; percentage: number }[];
  byDepartment: { department: string; count: number; percentage: number }[];
  byContractType: { type: string; count: number; percentage: number }[];
  bySeniority: { range: string; count: number; percentage: number }[];
  averageAge: number;
  averageTenure: number;
  turnoverRate: number;
  diversityScore: number;
}

export interface ComplianceMetrics {
  overallScore: number;
  documentCompliance: {
    score: number;
    expiredDocuments: number;
    upcomingExpirations: number;
  };
  workingTimeCompliance: {
    score: number;
    violations: number;
    restPeriodViolations: number;
    overtimeViolations: number;
  };
  trainingCompliance: {
    score: number;
    expiredCertifications: number;
    upcomingTraining: number;
  };
  contractCompliance: {
    score: number;
    expiredContracts: number;
    renewalsPending: number;
  };
  issues: {
    critical: number;
    warning: number;
    info: number;
  };
}

interface PeriodFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  storeId?: string;
  departmentId?: string;
  teamId?: string;
}

// Helper per ottenere il tenant ID corrente
const getCurrentTenantId = () => {
  // Sempre usa l'UUID corretto per development
  return '00000000-0000-0000-0000-000000000001';
};

// Token validation helper function
function isValidToken(token: string | null): boolean {
  if (!token) return false;
  if (token === 'undefined' || token === 'null' || token === '') return false;
  // Basic JWT format validation: should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  // Each part should be base64-like (letters, numbers, -, _)
  const base64Pattern = /^[A-Za-z0-9\-_]+$/;
  return parts.every(part => part.length > 0 && base64Pattern.test(part));
}

class HRAnalyticsService {
  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case 'week':
        return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startMonth = currentQuarter * 3;
        return {
          startDate: new Date(now.getFullYear(), startMonth, 1),
          endDate: new Date(now.getFullYear(), startMonth + 3, 0)
        };
      case 'year':
        return { startDate: startOfYear(now), endDate: endOfYear(now) };
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  }

  async getDashboardMetrics(period: string = 'month', filters?: PeriodFilters): Promise<DashboardMetrics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: formatDate(startDate, 'yyyy-MM-dd'),
      endDate: formatDate(endDate, 'yyyy-MM-dd'),
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    return await apiRequest(`/api/hr/analytics/dashboard?${params}`);
  }

  async getAttendanceAnalytics(period: string = 'month', storeId?: string): Promise<AttendanceAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: formatDate(startDate, 'yyyy-MM-dd'),
      endDate: formatDate(endDate, 'yyyy-MM-dd'),
      ...(storeId && { storeId })
    });

    return await apiRequest(`/api/hr/analytics/attendance?${params}`);
  }

  async getLeaveAnalytics(period: string = 'month', departmentId?: string): Promise<LeaveAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: formatDate(startDate, 'yyyy-MM-dd'),
      endDate: formatDate(endDate, 'yyyy-MM-dd'),
      ...(departmentId && { departmentId })
    });

    return await apiRequest(`/api/hr/analytics/leave?${params}`);
  }

  async getLaborCostAnalytics(period: string = 'month', filters?: PeriodFilters): Promise<LaborCostAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: formatDate(startDate, 'yyyy-MM-dd'),
      endDate: formatDate(endDate, 'yyyy-MM-dd'),
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    return await apiRequest(`/api/hr/analytics/labor-cost?${params}`);
  }

  async getShiftAnalytics(period: string = 'month', storeId?: string): Promise<ShiftAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: formatDate(startDate, 'yyyy-MM-dd'),
      endDate: formatDate(endDate, 'yyyy-MM-dd'),
      ...(storeId && { storeId })
    });

    return await apiRequest(`/api/hr/analytics/shifts?${params}`);
  }

  async getEmployeeDemographics(filters?: PeriodFilters): Promise<EmployeeDemographics> {
    const params = new URLSearchParams({
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    return await apiRequest(`/api/hr/analytics/demographics?${params}`);
  }

  async getComplianceMetrics(): Promise<ComplianceMetrics> {
    return await apiRequest('/api/hr/analytics/compliance');
  }

  async exportDashboard(exportFormat: 'pdf' | 'excel' | 'csv', period: string, filters?: PeriodFilters): Promise<Blob> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      format: exportFormat,
      startDate: formatDate(startDate, 'yyyy-MM-dd'),
      endDate: formatDate(endDate, 'yyyy-MM-dd'),
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    // Use fetch directly for Blob response
    const tenantId = getCurrentTenantId();
    let headers: Record<string, string> = {
      'X-Tenant-ID': tenantId,
    };
    
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev');
    
    if (isDevelopment) {
      headers['X-Auth-Session'] = 'authenticated';
      headers['X-Demo-User'] = 'demo-user';
    } else {
      const token = await oauth2Client.getAccessToken();
      
      if (!isValidToken(token)) {
        if (!token || token === 'undefined' || token === 'null' || token === '') {
          await oauth2Client.logout();
          await oauth2Client.startAuthorizationFlow();
          throw new Error('Authentication required');
        }
        
        await oauth2Client.logout();
        await oauth2Client.startAuthorizationFlow();
        throw new Error('Invalid token format');
      }
      
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/hr/analytics/export?${params}`, {
      credentials: 'include',
      headers
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        await oauth2Client.logout();
        await oauth2Client.startAuthorizationFlow();
        throw new Error('401: Unauthorized');
      }
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Real-time metrics
  async getCurrentAttendance(storeId?: string): Promise<{ present: number; absent: number; late: number }> {
    const params = storeId ? `?storeId=${storeId}` : '';
    return await apiRequest(`/api/hr/analytics/attendance/current${params}`);
  }

  async getActiveShifts(storeId?: string): Promise<number> {
    const params = storeId ? `?storeId=${storeId}` : '';
    const response = await apiRequest(`/api/hr/analytics/shifts/active${params}`);
    return response.count;
  }

  async getUpcomingEvents(days: number = 7): Promise<any[]> {
    return await apiRequest(`/api/hr/analytics/events/upcoming?days=${days}`);
  }

  // Trend analysis
  async getHistoricalTrends(metric: string, period: string = 'year'): Promise<any> {
    const params = new URLSearchParams({ metric, period });
    return await apiRequest(`/api/hr/analytics/trends?${params}`);
  }

  // Predictive analytics
  async getPredictions(type: 'attendance' | 'labor-cost' | 'turnover', horizon: number = 30): Promise<any> {
    const params = new URLSearchParams({ 
      type, 
      horizon: horizon.toString() 
    });
    return await apiRequest(`/api/hr/analytics/predictions?${params}`);
  }

  // Anomaly detection
  async getAnomalies(type: 'attendance' | 'overtime' | 'costs'): Promise<any[]> {
    return await apiRequest(`/api/hr/analytics/anomalies?type=${type}`);
  }

  // Benchmarking
  async getBenchmarks(metric: string): Promise<any> {
    return await apiRequest(`/api/hr/analytics/benchmarks?metric=${metric}`);
  }

  // Custom reports
  async generateCustomReport(config: any): Promise<any> {
    return await apiRequest('/api/hr/analytics/custom-report', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getReportTemplates(): Promise<any[]> {
    return await apiRequest('/api/hr/analytics/report-templates');
  }

  async saveReportTemplate(template: any): Promise<void> {
    await apiRequest('/api/hr/analytics/report-templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }
}

export const hrAnalyticsService = new HRAnalyticsService();