// Shift Planning Service - Complete shift management operations
import { apiRequest } from '@/lib/queryClient';
import { startOfWeek, endOfWeek, eachDayOfInterval, differenceInMinutes, addHours, isWithinInterval, format, parseISO } from 'date-fns';

// ==================== TYPES ====================

export interface Shift {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  code?: string;
  date: string;
  startTime: string | Date;
  endTime: string | Date;
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
}

export interface ShiftTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
  rules?: {
    daysOfWeek?: number[];
    weeksOfMonth?: number[];
    customPattern?: string;
    rotationDays?: number;
  };
  defaultStartTime: string;
  defaultEndTime: string;
  defaultRequiredStaff: number;
  defaultSkills?: string[];
  defaultBreakMinutes: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftDto {
  storeId: string;
  name: string;
  code?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  requiredStaff: number;
  assignedUsers?: string[];
  shiftType: 'morning' | 'afternoon' | 'night' | 'full_day' | 'split' | 'on_call';
  templateId?: string;
  skills?: string[];
  status?: 'draft' | 'published';
  notes?: string;
  color?: string;
}

export interface CreateShiftTemplateDto {
  name: string;
  description?: string;
  pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
  rules?: {
    daysOfWeek?: number[];
    weeksOfMonth?: number[];
    customPattern?: string;
    rotationDays?: number;
  };
  defaultStartTime: string;
  defaultEndTime: string;
  defaultRequiredStaff: number;
  defaultSkills?: string[];
  defaultBreakMinutes?: number;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
}

export interface ApplyTemplateDto {
  templateId: string;
  storeId: string;
  startDate: string;
  endDate: string;
  overwriteExisting?: boolean;
}

export interface ShiftConflict {
  type: 'double_booking' | 'overtime' | 'insufficient_rest' | 'during_leave' | 'missing_skills' | 'max_hours';
  shiftId?: string;
  userId: string;
  message: string;
  severity: 'warning' | 'error';
  details?: any;
}

export interface CoverageAnalysis {
  date: string;
  hour: number;
  requiredStaff: number;
  scheduledStaff: number;
  coverage: number; // percentage
  status: 'understaffed' | 'optimal' | 'overstaffed';
}

export interface AutoScheduleRequest {
  storeId: string;
  startDate: string;
  endDate: string;
  constraints?: {
    maxHoursPerWeek?: number;
    minRestHours?: number;
    maxConsecutiveDays?: number;
    requireSkills?: boolean;
    respectPreferences?: boolean;
    optimizeFor?: 'coverage' | 'cost' | 'fairness';
  };
}

export interface StaffAvailability {
  userId: string;
  date: string;
  available: boolean;
  reason?: 'leave' | 'training' | 'other_shift' | 'day_off';
  preferredShifts?: string[];
  maxHours?: number;
}

export interface ShiftStats {
  totalShifts: number;
  totalHours: number;
  averageStaffPerShift: number;
  coverageRate: number;
  overtimeHours: number;
  laborCost?: number;
}

// ==================== SERVICE CLASS ====================

class ShiftService {
  
  // ==================== SHIFTS CRUD ====================
  
  async getShifts(params?: {
    storeId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    status?: string;
    userId?: string;
  }): Promise<Shift[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.storeId) queryParams.append('storeId', params.storeId);
    if (params?.startDate) queryParams.append('startDate', typeof params.startDate === 'string' ? params.startDate : params.startDate.toISOString());
    if (params?.endDate) queryParams.append('endDate', typeof params.endDate === 'string' ? params.endDate : params.endDate.toISOString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userId) queryParams.append('userId', params.userId);
    
    return apiRequest(`/api/hr/shifts?${queryParams.toString()}`);
  }
  
  async getShiftById(id: string): Promise<Shift> {
    return apiRequest(`/api/hr/shifts/${id}`);
  }
  
  async createShift(shift: CreateShiftDto): Promise<Shift> {
    return apiRequest('/api/hr/shifts', {
      method: 'POST',
      body: JSON.stringify(shift),
    });
  }
  
  async updateShift(id: string, shift: Partial<CreateShiftDto>): Promise<Shift> {
    return apiRequest(`/api/hr/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(shift),
    });
  }
  
  async deleteShift(id: string): Promise<void> {
    return apiRequest(`/api/hr/shifts/${id}`, {
      method: 'DELETE',
    });
  }
  
  async bulkCreateShifts(shifts: CreateShiftDto[]): Promise<Shift[]> {
    return apiRequest('/api/hr/shifts/bulk', {
      method: 'POST',
      body: JSON.stringify({ shifts }),
    });
  }
  
  // ==================== TEMPLATES ====================
  
  async getShiftTemplates(params?: {
    isActive?: boolean;
    pattern?: string;
  }): Promise<ShiftTemplate[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.pattern) queryParams.append('pattern', params.pattern);
    
    return apiRequest(`/api/hr/shift-templates?${queryParams.toString()}`);
  }
  
  async getShiftTemplateById(id: string): Promise<ShiftTemplate> {
    return apiRequest(`/api/hr/shift-templates/${id}`);
  }
  
  async createShiftTemplate(template: CreateShiftTemplateDto): Promise<ShiftTemplate> {
    return apiRequest('/api/hr/shift-templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }
  
  async updateShiftTemplate(id: string, template: Partial<CreateShiftTemplateDto>): Promise<ShiftTemplate> {
    return apiRequest(`/api/hr/shift-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }
  
  async deleteShiftTemplate(id: string): Promise<void> {
    return apiRequest(`/api/hr/shift-templates/${id}`, {
      method: 'DELETE',
    });
  }
  
  async applyTemplate(request: ApplyTemplateDto): Promise<Shift[]> {
    return apiRequest('/api/hr/shifts/apply-template', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
  
  // ==================== STAFF ASSIGNMENT ====================
  
  async assignUserToShift(shiftId: string, userId: string): Promise<Shift> {
    return apiRequest(`/api/hr/shifts/${shiftId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }
  
  async removeUserFromShift(shiftId: string, userId: string): Promise<Shift> {
    return apiRequest(`/api/hr/shifts/${shiftId}/unassign`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }
  
  async getStaffAvailability(params: {
    storeId: string;
    startDate: string;
    endDate: string;
  }): Promise<StaffAvailability[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('storeId', params.storeId);
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    
    return apiRequest(`/api/hr/shifts/staff-availability?${queryParams.toString()}`);
  }
  
  // ==================== ANALYSIS & OPTIMIZATION ====================
  
  async getCoverageAnalysis(params: {
    storeId: string;
    startDate: string;
    endDate: string;
  }): Promise<CoverageAnalysis[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('storeId', params.storeId);
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    
    return apiRequest(`/api/hr/shifts/coverage-analysis?${queryParams.toString()}`);
  }
  
  async autoSchedule(request: AutoScheduleRequest): Promise<{
    shifts: Shift[];
    conflicts: ShiftConflict[];
    stats: ShiftStats;
  }> {
    return apiRequest('/api/hr/shifts/auto-schedule', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
  
  async detectConflicts(params: {
    storeId: string;
    startDate: string;
    endDate: string;
    userId?: string;
  }): Promise<ShiftConflict[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('storeId', params.storeId);
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.userId) queryParams.append('userId', params.userId);
    
    return apiRequest(`/api/hr/shifts/conflicts?${queryParams.toString()}`);
  }
  
  async getShiftStats(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<ShiftStats> {
    const queryParams = new URLSearchParams();
    if (params.storeId) queryParams.append('storeId', params.storeId);
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    
    return apiRequest(`/api/hr/shifts/stats?${queryParams.toString()}`);
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Calculate total hours for a shift including breaks
   */
  calculateShiftHours(shift: Shift): number {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const totalMinutes = differenceInMinutes(end, start);
    const workingMinutes = totalMinutes - (shift.breakMinutes || 0);
    return workingMinutes / 60;
  }
  
  /**
   * Check if two shifts overlap
   */
  checkShiftOverlap(shift1: Shift, shift2: Shift): boolean {
    const start1 = new Date(shift1.startTime);
    const end1 = new Date(shift1.endTime);
    const start2 = new Date(shift2.startTime);
    const end2 = new Date(shift2.endTime);
    
    return (start1 < end2 && end1 > start2);
  }
  
  /**
   * Get shift color based on type
   */
  getShiftColor(shiftType: string): string {
    const colors = {
      morning: '#FF6900',
      afternoon: '#3b82f6',
      night: '#7B2CBF',
      full_day: '#10b981',
      split: '#f59e0b',
      on_call: '#6b7280',
    };
    return colors[shiftType] || '#6b7280';
  }
  
  /**
   * Format shift time display
   */
  formatShiftTime(shift: Shift): string {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  }
  
  /**
   * Calculate coverage percentage
   */
  calculateCoverage(requiredStaff: number, scheduledStaff: number): number {
    if (requiredStaff === 0) return 100;
    return Math.round((scheduledStaff / requiredStaff) * 100);
  }
  
  /**
   * Get coverage status based on percentage
   */
  getCoverageStatus(coverage: number): 'understaffed' | 'optimal' | 'overstaffed' {
    if (coverage < 80) return 'understaffed';
    if (coverage > 120) return 'overstaffed';
    return 'optimal';
  }
  
  /**
   * Generate shifts from template
   */
  generateShiftsFromTemplate(
    template: ShiftTemplate, 
    storeId: string,
    startDate: Date, 
    endDate: Date
  ): CreateShiftDto[] {
    const shifts: CreateShiftDto[] = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    days.forEach(date => {
      const dayOfWeek = date.getDay();
      
      // Check if this day should have a shift based on template pattern
      let shouldCreate = false;
      
      if (template.pattern === 'daily') {
        shouldCreate = true;
      } else if (template.pattern === 'weekly' && template.rules?.daysOfWeek) {
        shouldCreate = template.rules.daysOfWeek.includes(dayOfWeek);
      } else if (template.pattern === 'monthly' && template.rules?.weeksOfMonth) {
        const weekOfMonth = Math.ceil(date.getDate() / 7);
        shouldCreate = template.rules.weeksOfMonth.includes(weekOfMonth) && 
                      (template.rules.daysOfWeek ? template.rules.daysOfWeek.includes(dayOfWeek) : true);
      }
      
      if (shouldCreate) {
        // Create shift from template
        const [startHour, startMinute] = template.defaultStartTime.split(':').map(Number);
        const [endHour, endMinute] = template.defaultEndTime.split(':').map(Number);
        
        const startTime = new Date(date);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(date);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        // Handle shifts that end next day
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
        
        shifts.push({
          storeId,
          name: template.name,
          date: format(date, 'yyyy-MM-dd'),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          breakMinutes: template.defaultBreakMinutes || 30,
          requiredStaff: template.defaultRequiredStaff,
          shiftType: this.determineShiftType(startHour),
          templateId: template.id,
          skills: template.defaultSkills,
          status: 'draft',
          color: this.getShiftColor(this.determineShiftType(startHour)),
        });
      }
    });
    
    return shifts;
  }
  
  /**
   * Determine shift type based on start hour
   */
  private determineShiftType(hour: number): 'morning' | 'afternoon' | 'night' {
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
  }
  
  /**
   * Validate business rules for shifts
   */
  validateShiftRules(shifts: Shift[], userId: string): ShiftConflict[] {
    const conflicts: ShiftConflict[] = [];
    
    // Group shifts by date
    const shiftsByDate = shifts.reduce((acc, shift) => {
      const date = format(new Date(shift.date), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      if (shift.assignedUsers.includes(userId)) {
        acc[date].push(shift);
      }
      return acc;
    }, {} as Record<string, Shift[]>);
    
    // Check for double booking
    Object.entries(shiftsByDate).forEach(([date, dayShifts]) => {
      if (dayShifts.length > 1) {
        // Check for overlaps
        for (let i = 0; i < dayShifts.length - 1; i++) {
          for (let j = i + 1; j < dayShifts.length; j++) {
            if (this.checkShiftOverlap(dayShifts[i], dayShifts[j])) {
              conflicts.push({
                type: 'double_booking',
                userId,
                shiftId: dayShifts[j].id,
                message: `Turno sovrapposto il ${date}`,
                severity: 'error',
              });
            }
          }
        }
      }
      
      // Check minimum rest time (11 hours between shifts)
      if (dayShifts.length > 0) {
        const sortedShifts = dayShifts.sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        for (let i = 0; i < sortedShifts.length - 1; i++) {
          const endTime = new Date(sortedShifts[i].endTime);
          const nextStartTime = new Date(sortedShifts[i + 1].startTime);
          const restHours = differenceInMinutes(nextStartTime, endTime) / 60;
          
          if (restHours < 11) {
            conflicts.push({
              type: 'insufficient_rest',
              userId,
              shiftId: sortedShifts[i + 1].id,
              message: `Riposo insufficiente (${Math.floor(restHours)}h) tra turni`,
              severity: 'error',
              details: { restHours },
            });
          }
        }
      }
    });
    
    // Check weekly hours (max 48)
    const weeklyHours = this.calculateWeeklyHours(shifts, userId);
    Object.entries(weeklyHours).forEach(([week, hours]) => {
      if (hours > 48) {
        conflicts.push({
          type: 'max_hours',
          userId,
          message: `Superamento ore settimanali (${hours}h) nella settimana ${week}`,
          severity: 'error',
          details: { hours, week },
        });
      } else if (hours > 40) {
        conflicts.push({
          type: 'overtime',
          userId,
          message: `Straordinari (${hours - 40}h) nella settimana ${week}`,
          severity: 'warning',
          details: { overtime: hours - 40, week },
        });
      }
    });
    
    return conflicts;
  }
  
  /**
   * Calculate weekly hours for a user
   */
  private calculateWeeklyHours(shifts: Shift[], userId: string): Record<string, number> {
    const weeklyHours: Record<string, number> = {};
    
    shifts
      .filter(shift => shift.assignedUsers.includes(userId))
      .forEach(shift => {
        const weekStart = format(startOfWeek(new Date(shift.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const hours = this.calculateShiftHours(shift);
        
        if (!weeklyHours[weekStart]) {
          weeklyHours[weekStart] = 0;
        }
        weeklyHours[weekStart] += hours;
      });
    
    return weeklyHours;
  }
}

// Export singleton instance
export const shiftService = new ShiftService();