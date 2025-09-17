// HR Analytics Service - Enterprise Analytics for HR Management
import { apiService } from './ApiService';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

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

class HRAnalyticsService {
  private api: ApiService;

  constructor() {
    this.api = ApiService.getInstance();
  }

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
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    const response = await this.api.get(`/api/hr/analytics/dashboard?${params}`);
    return response.data;
  }

  async getAttendanceAnalytics(period: string = 'month', storeId?: string): Promise<AttendanceAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      ...(storeId && { storeId })
    });

    const response = await this.api.get(`/api/hr/analytics/attendance?${params}`);
    return response.data;
  }

  async getLeaveAnalytics(period: string = 'month', departmentId?: string): Promise<LeaveAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      ...(departmentId && { departmentId })
    });

    const response = await this.api.get(`/api/hr/analytics/leave?${params}`);
    return response.data;
  }

  async getLaborCostAnalytics(period: string = 'month', filters?: PeriodFilters): Promise<LaborCostAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    const response = await this.api.get(`/api/hr/analytics/labor-cost?${params}`);
    return response.data;
  }

  async getShiftAnalytics(period: string = 'month', storeId?: string): Promise<ShiftAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      ...(storeId && { storeId })
    });

    const response = await this.api.get(`/api/hr/analytics/shifts?${params}`);
    return response.data;
  }

  async getEmployeeDemographics(filters?: PeriodFilters): Promise<EmployeeDemographics> {
    const params = new URLSearchParams({
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    const response = await this.api.get(`/api/hr/analytics/demographics?${params}`);
    return response.data;
  }

  async getComplianceMetrics(): Promise<ComplianceMetrics> {
    const response = await this.api.get('/api/hr/analytics/compliance');
    return response.data;
  }

  async exportDashboard(format: 'pdf' | 'excel' | 'csv', period: string, filters?: PeriodFilters): Promise<Blob> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const params = new URLSearchParams({
      format,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      ...(filters?.storeId && { storeId: filters.storeId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId })
    });

    const response = await this.api.get(`/api/hr/analytics/export?${params}`, {
      responseType: 'blob'
    });
    
    return response.data;
  }

  // Real-time metrics
  async getCurrentAttendance(storeId?: string): Promise<{ present: number; absent: number; late: number }> {
    const params = storeId ? `?storeId=${storeId}` : '';
    const response = await this.api.get(`/api/hr/analytics/attendance/current${params}`);
    return response.data;
  }

  async getActiveShifts(storeId?: string): Promise<number> {
    const params = storeId ? `?storeId=${storeId}` : '';
    const response = await this.api.get(`/api/hr/analytics/shifts/active${params}`);
    return response.data.count;
  }

  async getUpcomingEvents(days: number = 7): Promise<any[]> {
    const response = await this.api.get(`/api/hr/analytics/events/upcoming?days=${days}`);
    return response.data;
  }

  // Trend analysis
  async getHistoricalTrends(metric: string, period: string = 'year'): Promise<any> {
    const params = new URLSearchParams({ metric, period });
    const response = await this.api.get(`/api/hr/analytics/trends?${params}`);
    return response.data;
  }

  // Predictive analytics
  async getPredictions(type: 'attendance' | 'labor-cost' | 'turnover', horizon: number = 30): Promise<any> {
    const params = new URLSearchParams({ 
      type, 
      horizon: horizon.toString() 
    });
    const response = await this.api.get(`/api/hr/analytics/predictions?${params}`);
    return response.data;
  }

  // Anomaly detection
  async getAnomalies(type: 'attendance' | 'overtime' | 'costs'): Promise<any[]> {
    const response = await this.api.get(`/api/hr/analytics/anomalies?type=${type}`);
    return response.data;
  }

  // Benchmarking
  async getBenchmarks(metric: string): Promise<any> {
    const response = await this.api.get(`/api/hr/analytics/benchmarks?metric=${metric}`);
    return response.data;
  }

  // Custom reports
  async generateCustomReport(config: any): Promise<any> {
    const response = await this.api.post('/api/hr/analytics/custom-report', config);
    return response.data;
  }

  async getReportTemplates(): Promise<any[]> {
    const response = await this.api.get('/api/hr/analytics/report-templates');
    return response.data;
  }

  async saveReportTemplate(template: any): Promise<void> {
    await this.api.post('/api/hr/analytics/report-templates', template);
  }
}

export const hrAnalyticsService = new HRAnalyticsService();