// HR Storage Interface - Enterprise Calendar & HR Operations
import { db, setTenantContext } from "./db";
import { eq, and, or, between, inArray, gte, lte, desc, isNull, sql } from "drizzle-orm";
import {
  calendarEvents,
  universalRequests,
  shifts,
  shiftTemplates,
  shiftTimeSlots as shiftTimeSlotsTable,
  timeTracking,
  hrDocuments,
  expenseReports,
  users,
  userAssignments,
  stores,
  CalendarEvent,
  Shift,
  ShiftTemplate,
  ShiftTimeSlot,
  TimeTracking,
  InsertCalendarEvent,
  InsertShift,
  InsertShiftTemplate,
  InsertShiftTimeSlot,
  InsertTimeTracking,
} from "../db/schema/w3suite";

// Use alias for shift time slots to avoid any conflicts
const shiftTimeSlots = shiftTimeSlotsTable;

// Permission scopes for calendar events
export enum CalendarScope {
  OWN = 'own',
  TEAM = 'team',
  STORE = 'store',
  AREA = 'area',
  TENANT = 'tenant'
}

// Calendar permissions based on roles
export const CALENDAR_PERMISSIONS = {
  // Basic permissions for all authenticated users
  USER: {
    view: [CalendarScope.OWN],
    create: [CalendarScope.OWN],
    update: [CalendarScope.OWN],
    delete: [CalendarScope.OWN]
  },
  // Team leaders can manage team events
  TEAM_LEADER: {
    view: [CalendarScope.OWN, CalendarScope.TEAM],
    create: [CalendarScope.OWN, CalendarScope.TEAM],
    update: [CalendarScope.OWN, CalendarScope.TEAM],
    delete: [CalendarScope.OWN, CalendarScope.TEAM],
    approveLeave: true
  },
  // Store managers have store-wide permissions
  STORE_MANAGER: {
    view: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    create: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    update: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    delete: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    approveLeave: true,
    manageShifts: true
  },
  // Area managers can manage across stores
  AREA_MANAGER: {
    view: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    create: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    update: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    delete: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    approveLeave: true,
    manageShifts: true,
    viewHrSensitive: true
  },
  // HR has full access to HR-specific features
  HR_MANAGER: {
    view: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    create: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    update: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    delete: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    approveLeave: true,
    manageShifts: true,
    viewHrSensitive: true,
    manageTimeTracking: true,
    overrideApprovals: true
  },
  // Admin has unrestricted access
  ADMIN: {
    view: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    create: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    update: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    delete: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    approveLeave: true,
    manageShifts: true,
    viewHrSensitive: true,
    manageTimeTracking: true,
    overrideApprovals: true
  }
};

export interface IHRStorage {
  // Calendar Events
  getCalendarEvents(
    tenantId: string, 
    userId: string, 
    userRole: string, 
    filters?: CalendarEventFilters
  ): Promise<CalendarEvent[]>;
  
  getCalendarEventById(id: string, tenantId: string): Promise<CalendarEvent | null>;
  
  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent>;
  
  updateCalendarEvent(id: string, data: Partial<InsertCalendarEvent>, tenantId: string): Promise<CalendarEvent>;
  
  deleteCalendarEvent(id: string, tenantId: string): Promise<void>;
  
  // Leave Requests
  getLeaveRequests(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: LeaveRequestFilters
  ): Promise<LeaveRequest[]>;
  
  createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest>;
  
  approveLeaveRequest(id: string, approverId: string, comments?: string): Promise<LeaveRequest>;
  
  rejectLeaveRequest(id: string, approverId: string, reason: string): Promise<LeaveRequest>;
  
  // Shifts
  getShifts(tenantId: string, storeId: string, dateRange: DateRange): Promise<Shift[]>;
  
  createShift(data: InsertShift): Promise<Shift>;
  
  assignUserToShift(shiftId: string, userId: string): Promise<Shift>;
  
  removeUserFromShift(shiftId: string, userId: string): Promise<Shift>;
  
  // Time Tracking
  clockIn(data: InsertTimeTracking): Promise<TimeTracking>;
  
  clockOut(trackingId: string, tenantId: string, notes?: string): Promise<TimeTracking>;
  
  getTimeTrackingForUser(userId: string, dateRange: DateRange): Promise<TimeTracking[]>;
  
  // Permissions
  getUserCalendarPermissions(userId: string, userRole: string): CalendarPermissions;
  
  // Shift Templates
  getShiftTemplates(tenantId: string, isActive?: boolean): Promise<(ShiftTemplate & { timeSlots?: ShiftTimeSlot[] })[]>;
  createShiftTemplate(data: InsertShiftTemplate & { timeSlots?: Array<any> }): Promise<ShiftTemplate & { timeSlots?: ShiftTimeSlot[] }>;
  updateShiftTemplate(id: string, data: Partial<InsertShiftTemplate> & { timeSlots?: Array<any> }, tenantId: string): Promise<ShiftTemplate & { timeSlots?: ShiftTimeSlot[] }>;
  deleteShiftTemplate(id: string, tenantId: string): Promise<void>;
  applyShiftTemplate(templateId: string, storeId: string, startDate: Date, endDate: Date, tenantId: string): Promise<Shift[]>;
  
  // Shift Coverage Analysis
  getShiftCoverageAnalysis(tenantId: string, storeId: string, startDate: Date, endDate: Date): Promise<any>;
  detectShiftConflicts(tenantId: string, storeId: string, userId?: string): Promise<any[]>;
  autoScheduleShifts(tenantId: string, storeId: string, startDate: Date, endDate: Date, constraints?: any): Promise<any>;
  
  // Staff Availability
  getStaffAvailability(tenantId: string, storeId: string, date: Date): Promise<any[]>;
  updateStaffAvailability(userId: string, date: Date, available: boolean, reason?: string): Promise<void>;

  // ==================== TASK 7 ENTERPRISE FEATURES ====================
  
  // Bulk Assignments
  bulkAssignShifts(tenantId: string, assignments: Array<{shiftId: string, employeeIds: string[]}>): Promise<{
    totalAssignments: number;
    successful: number;
    failed: number;
    conflicts: any[];
  }>;
  
  bulkUnassignShifts(tenantId: string, assignments: Array<{shiftId: string, employeeIds: string[]}>): Promise<{
    totalUnassignments: number;
    successful: number;
    failed: number;
  }>;

  // Enhanced Conflict Validation
  validateShiftAssignments(tenantId: string, assignments: Array<{shiftId: string, employeeIds: string[]}>, options?: any): Promise<{
    results: any[];
    conflicts: any[];
    warnings: any[];
    recommendations: any[];
    isValid: boolean;
    totalChecked: number;
  }>;

  // Shift Patterns
  getShiftPatterns(tenantId: string, options?: {storeId?: string, isActive?: boolean}): Promise<any[]>;
  createShiftPattern(tenantId: string, patternData: any): Promise<any>;
  applyShiftPattern(tenantId: string, patternId: string, options: any): Promise<{
    shifts: any[];
    totalGenerated: number;
    conflicts: any[];
    summary: any;
  }>;

  // Timbrature Matching
  matchTimbratureWithShifts(tenantId: string, options: any): Promise<{
    results: any[];
    discrepancies: any[];
    unmatchedClockIns: any[];
    missedShifts: any[];
    totalShifts: number;
    matchedShifts: number;
    complianceRate: number;
    onTimeRate: number;
    summary: any;
  }>;
  
  generateComplianceReport(tenantId: string, options: any): Promise<any>;
}

// Filter interfaces
export interface CalendarEventFilters {
  startDate?: Date | string;
  endDate?: Date | string;
  type?: string;
  visibility?: string;
  storeId?: string;
  teamId?: string;
  category?: string; // Nuovo filtro per calendario unificato (sales, finance, hr, crm, support, operations, marketing)
}

export interface LeaveRequestFilters {
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  leaveType?: string;
  approverId?: string;
}

export interface DateRange {
  start?: Date | string;
  end?: Date | string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface CalendarPermissions {
  canViewScopes: CalendarScope[];
  canCreateScopes: CalendarScope[];
  canUpdateScopes: CalendarScope[];
  canDeleteScopes: CalendarScope[];
  canApproveLeave: boolean;
  canManageShifts: boolean;
  canViewHrSensitive: boolean;
  canManageTimeTracking: boolean;
}

// Implementation
export class HRStorage implements IHRStorage {
  // Calendar Events
  async getCalendarEvents(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: CalendarEventFilters
  ): Promise<CalendarEvent[]> {
    const permissions = this.getUserCalendarPermissions(userId, userRole);
    
    // Get user's actual membership assignments to verify scope-based access
    const userAssignments = await this.getUserScopeAssignments(userId, tenantId);
    
    // Build visibility conditions based on permissions AND membership
    const visibilityConditions = [];
    
    // User can always see their own events
    visibilityConditions.push(eq(calendarEvents.ownerId, userId));
    
    // Add scope-based visibility with membership checks
    if (permissions.canViewScopes.includes(CalendarScope.TEAM)) {
      // Only see team events for teams user is actually assigned to
      const userTeamIds = userAssignments.teamIds || [];
      if (userTeamIds.length > 0) {
        visibilityConditions.push(
          and(
            eq(calendarEvents.visibility, 'team'),
            inArray(calendarEvents.teamId, userTeamIds)
          )
        );
      }
    }
    
    if (permissions.canViewScopes.includes(CalendarScope.STORE)) {
      // Only see store events for stores user is actually assigned to
      const userStoreIds = userAssignments.storeIds || [];
      if (userStoreIds.length > 0) {
        visibilityConditions.push(
          and(
            eq(calendarEvents.visibility, 'store'),
            inArray(calendarEvents.storeId, userStoreIds)
          )
        );
      }
    }
    
    if (permissions.canViewScopes.includes(CalendarScope.AREA)) {
      // Only see area events for areas user is actually assigned to
      const userAreaIds = userAssignments.areaIds || [];
      if (userAreaIds.length > 0) {
        visibilityConditions.push(
          and(
            eq(calendarEvents.visibility, 'area'),
            inArray(calendarEvents.areaId, userAreaIds)
          )
        );
      }
    }
    
    if (permissions.canViewScopes.includes(CalendarScope.TENANT)) {
      // Only HR_MANAGER and ADMIN can see tenant-wide events
      if (['HR_MANAGER', 'ADMIN'].includes(userRole)) {
        visibilityConditions.push(eq(calendarEvents.visibility, 'tenant'));
      }
    }
    
    // Build filter conditions
    const filterConditions = [
      eq(calendarEvents.tenantId, tenantId),
      or(...visibilityConditions)
    ];
    
    if (filters?.startDate && filters?.endDate) {
      filterConditions.push(
        or(
          between(calendarEvents.startDate, filters.startDate, filters.endDate),
          between(calendarEvents.endDate, filters.startDate, filters.endDate)
        )
      );
    }
    
    if (filters?.type) {
      filterConditions.push(eq(calendarEvents.type, filters.type as any));
    }
    
    if (filters?.storeId) {
      filterConditions.push(eq(calendarEvents.storeId, filters.storeId));
    }
    
    // Filtro per categoria (calendario unificato)
    if (filters?.category) {
      filterConditions.push(eq(calendarEvents.category, filters.category as any));
    }
    
    // Filter out HR-sensitive events if user doesn't have permission
    if (!permissions.canViewHrSensitive) {
      filterConditions.push(eq(calendarEvents.hrSensitive, false));
    }
    
    return await db.select()
      .from(calendarEvents)
      .where(and(...filterConditions))
      .orderBy(calendarEvents.startDate);
  }
  
  async getCalendarEventById(id: string, tenantId: string): Promise<CalendarEvent | null> {
    const result = await db.select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.tenantId, tenantId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  // Helper method to get user's actual scope assignments for membership verification
  private async getUserScopeAssignments(userId: string, tenantId: string): Promise<{
    teamIds: string[];
    storeIds: string[];
    areaIds: string[];
  }> {
    // Get user assignments from RBAC system
    const assignments = await db.select({
      scopeType: userAssignments.scopeType,
      scopeId: userAssignments.scopeId
    })
    .from(userAssignments)
    .innerJoin(users, eq(userAssignments.userId, users.id))
    .where(
      and(
        eq(userAssignments.userId, userId),
        eq(users.tenantId, tenantId)
      )
    );

    // Separate assignments by scope type
    const teamIds: string[] = [];
    const storeIds: string[] = [];
    const areaIds: string[] = [];

    for (const assignment of assignments) {
      if (assignment.scopeId) {
        switch (assignment.scopeType) {
          case 'store':
            storeIds.push(assignment.scopeId);
            break;
          // For now, treat team assignments as related to stores
          // In a more complex system, you might have a separate teams table
          case 'legal_entity':
            // Areas could be mapped to legal entities or have separate table
            areaIds.push(assignment.scopeId);
            break;
        }
      }
    }

    return { teamIds, storeIds, areaIds };
  }
  
  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const result = await db.insert(calendarEvents)
      .values(data)
      .returning();
    
    return result[0];
  }
  
  async updateCalendarEvent(id: string, data: Partial<InsertCalendarEvent>, tenantId: string): Promise<CalendarEvent> {
    const result = await db.update(calendarEvents)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.tenantId, tenantId)
      ))
      .returning();
    
    if (!result[0]) {
      throw new Error('Calendar event not found');
    }
    
    return result[0];
  }
  
  async deleteCalendarEvent(id: string, tenantId: string): Promise<void> {
    await db.delete(calendarEvents)
      .where(and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.tenantId, tenantId)
      ));
  }
  
  // Leave Requests
  async getLeaveRequests(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: LeaveRequestFilters
  ): Promise<LeaveRequest[]> {
    const permissions = this.getUserCalendarPermissions(userId, userRole);
    
    const conditions = [eq(leaveRequests.tenantId, tenantId)];
    
    // Non-approvers can only see their own requests
    if (!permissions.canApproveLeave) {
      conditions.push(eq(leaveRequests.userId, userId));
    } else if (filters?.approverId) {
      // Approvers can filter by requests assigned to them
      conditions.push(eq(leaveRequests.currentApprover, filters.approverId));
    }
    
    if (filters?.status) {
      conditions.push(eq(leaveRequests.status, filters.status as any));
    }
    
    if (filters?.leaveType) {
      conditions.push(eq(leaveRequests.leaveType, filters.leaveType as any));
    }
    
    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        or(
          between(leaveRequests.startDate, filters.startDate.toISOString().split('T')[0], filters.endDate.toISOString().split('T')[0]),
          between(leaveRequests.endDate, filters.startDate.toISOString().split('T')[0], filters.endDate.toISOString().split('T')[0])
        )
      );
    }
    
    return await db.select()
      .from(leaveRequests)
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.createdAt));
  }
  
  async createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest> {
    const result = await db.insert(leaveRequests)
      .values(data)
      .returning();
    
    return result[0];
  }
  
  async approveLeaveRequest(id: string, approverId: string, comments?: string): Promise<LeaveRequest> {
    const request = await db.select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1);
    
    if (!request[0]) {
      throw new Error('Leave request not found');
    }
    
    const approvalChain = request[0].approvalChain as any[] || [];
    approvalChain.push({
      approverId,
      status: 'approved',
      timestamp: new Date(),
      comments
    });
    
    const result = await db.update(leaveRequests)
      .set({
        status: 'approved',
        approvalChain,
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    
    return result[0];
  }
  
  async rejectLeaveRequest(id: string, approverId: string, reason: string): Promise<LeaveRequest> {
    const request = await db.select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1);
    
    if (!request[0]) {
      throw new Error('Leave request not found');
    }
    
    const approvalChain = request[0].approvalChain as any[] || [];
    approvalChain.push({
      approverId,
      status: 'rejected',
      timestamp: new Date(),
      comments: reason
    });
    
    const result = await db.update(leaveRequests)
      .set({
        status: 'rejected',
        approvalChain,
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    
    return result[0];
  }
  
  // Shifts
  async getShifts(tenantId: string, storeId: string, dateRange: DateRange): Promise<Shift[]> {
    console.log('[HR-STORAGE-DEBUG] getShifts called with:', {
      tenantId,
      storeId,
      dateRange
    });
    
    // Fix: Handle undefined dateRange values with sensible defaults
    const startDate = dateRange?.start || new Date();
    const endDate = dateRange?.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
    
    const conditions = [
      eq(shifts.tenantId, tenantId)
    ];
    
    // Only filter by storeId if provided and not empty
    if (storeId && storeId.trim() !== '') {
      conditions.push(eq(shifts.storeId, storeId));
    }
    
    // Only add date filtering if we have valid dates
    if (startDate || endDate) {
      conditions.push(
        between(shifts.date, 
          startDate.toISOString().split('T')[0], 
          endDate.toISOString().split('T')[0]
        )
      );
    }
    
    return await db.select({
      id: shifts.id,
      tenantId: shifts.tenantId,
      storeId: shifts.storeId,
      name: shifts.name,
      code: shifts.code,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      breakMinutes: shifts.breakMinutes,
      requiredStaff: shifts.requiredStaff,
      assignedUsers: shifts.assignedUsers,
      shiftType: shifts.shiftType,
      templateId: shifts.templateId,
      skills: shifts.skills,
      status: shifts.status,
      notes: shifts.notes,
      color: shifts.color,
      createdAt: shifts.createdAt,
      updatedAt: shifts.updatedAt,
      // Temporaneamente omesso created_by finché non risolvo database
      createdBy: sql<string>`'system'`
    })
      .from(shifts)
      .where(and(...conditions))
      .orderBy(shifts.date, shifts.startTime);
  }

  // ==================== EMPLOYEE SHIFT QUERIES ====================
  
  /**
   * Get shifts assigned to a specific employee
   * @param tenantId - Tenant identifier
   * @param userId - Employee user ID
   * @param dateRange - Optional date range filter (defaults to next 30 days)
   * @returns Array of shifts assigned to the employee
   */
  async getEmployeeShifts(tenantId: string, userId: string, dateRange?: DateRange): Promise<any[]> {
    console.log('[HR-STORAGE] 🎯 getEmployeeShifts called for user:', userId);
    
    // Default date range: today to +30 days
    const startDate = dateRange?.start || new Date();
    const endDate = dateRange?.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Query shifts where user is in assignedUsers array
    const results = await db.select({
      id: shifts.id,
      name: shifts.name,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      status: shifts.status,
      shiftType: shifts.shiftType,
      storeId: shifts.storeId,
      notes: shifts.notes,
      color: shifts.color
    })
      .from(shifts)
      .where(and(
        eq(shifts.tenantId, tenantId),
        sql`${shifts.assignedUsers} @> ${JSON.stringify([userId])}`, // PostgreSQL JSONB contains operator
        between(shifts.date, 
          startDate.toISOString().split('T')[0], 
          endDate.toISOString().split('T')[0]
        )
      ))
      .orderBy(shifts.date, shifts.startTime);
    
    // Transform to frontend format
    return results.map(shift => ({
      id: shift.id,
      title: shift.name,
      date: new Date(shift.date),
      startTime: shift.startTime.toISOString().slice(11, 16), // HH:MM format
      endTime: shift.endTime.toISOString().slice(11, 16),
      status: shift.status,
      type: shift.shiftType,
      storeId: shift.storeId,
      notes: shift.notes,
      color: shift.color
    }));
  }
  
  async createShift(data: InsertShift): Promise<Shift> {
    const result = await db.insert(shifts)
      .values(data)
      .returning();
    
    return result[0];
  }
  
  async assignUserToShift(shiftId: string, userId: string): Promise<Shift> {
    const shift = await db.select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    
    if (!shift[0]) {
      throw new Error('Shift not found');
    }
    
    const assignedUsers = shift[0].assignedUsers as string[] || [];
    if (!assignedUsers.includes(userId)) {
      assignedUsers.push(userId);
    }
    
    const result = await db.update(shifts)
      .set({
        assignedUsers,
        updatedAt: new Date()
      })
      .where(eq(shifts.id, shiftId))
      .returning();
    
    return result[0];
  }
  
  async removeUserFromShift(shiftId: string, userId: string): Promise<Shift> {
    const shift = await db.select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    
    if (!shift[0]) {
      throw new Error('Shift not found');
    }
    
    const assignedUsers = (shift[0].assignedUsers as string[] || []).filter(id => id !== userId);
    
    const result = await db.update(shifts)
      .set({
        assignedUsers,
        updatedAt: new Date()
      })
      .where(eq(shifts.id, shiftId))
      .returning();
    
    return result[0];
  }
  
  // Time Tracking
  async clockIn(data: InsertTimeTracking): Promise<TimeTracking> {
    // Check for active session to prevent double clock-in
    const activeSession = await this.getActiveSession(data.userId, data.tenantId);
    if (activeSession) {
      throw new Error(`Esiste già una sessione attiva dal ${activeSession.clockIn}. Effettua prima il clock-out.`);
    }
    
    const result = await db.insert(timeTracking)
      .values(data)
      .returning();
    
    return result[0];
  }
  
  // Get active time tracking session for user
  async getActiveSession(userId: string, tenantId: string): Promise<TimeTracking | null> {
    const [session] = await db
      .select()
      .from(timeTracking)
      .where(and(
        eq(timeTracking.userId, userId),
        eq(timeTracking.tenantId, tenantId),
        eq(timeTracking.status, 'active'),
        isNull(timeTracking.clockOut)
      ))
      .orderBy(desc(timeTracking.clockIn))
      .limit(1);
    
    return session || null;
  }
  
  async clockOut(trackingId: string, tenantId: string, notes?: string): Promise<TimeTracking> {
    const tracking = await db.select()
      .from(timeTracking)
      .where(eq(timeTracking.id, trackingId))
      .limit(1);
    
    if (!tracking[0]) {
      throw new Error('Time tracking record not found');
    }
    
    const clockInTime = new Date(tracking[0].clockIn);
    const clockOutTime = new Date();
    const totalMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
    const breakMinutes = tracking[0].breakMinutes || 0;
    
    const result = await db.update(timeTracking)
      .set({
        clockOut: clockOutTime,
        totalMinutes,
        status: 'completed',
        notes,
        updatedAt: new Date()
      })
      .where(eq(timeTracking.id, trackingId))
      .returning();
    
    return result[0];
  }
  
  async getTimeTrackingForUser(userId: string, dateRange: DateRange): Promise<TimeTracking[]> {
    return await db.select()
      .from(timeTracking)
      .where(and(
        eq(timeTracking.userId, userId),
        between(timeTracking.clockIn, (dateRange as any).start || new Date(), (dateRange as any).end || new Date())
      ))
      .orderBy(desc(timeTracking.clockIn));
  }
  
  // Permissions
  getUserCalendarPermissions(userId: string, userRole: string): CalendarPermissions {
    const rolePermissions = CALENDAR_PERMISSIONS[userRole as keyof typeof CALENDAR_PERMISSIONS] || CALENDAR_PERMISSIONS.USER;
    
    return {
      canViewScopes: rolePermissions.view || [CalendarScope.OWN],
      canCreateScopes: rolePermissions.create || [CalendarScope.OWN],
      canUpdateScopes: rolePermissions.update || [CalendarScope.OWN],
      canDeleteScopes: rolePermissions.delete || [CalendarScope.OWN],
      canApproveLeave: rolePermissions.approveLeave || false,
      canManageShifts: rolePermissions.manageShifts || false,
      canViewHrSensitive: rolePermissions.viewHrSensitive || false,
      canManageTimeTracking: rolePermissions.manageTimeTracking || false
    };
  }
  
  // ==================== SHIFT TEMPLATES ====================
  async getShiftTemplates(tenantId: string, isActive?: boolean): Promise<(ShiftTemplate & { timeSlots?: ShiftTimeSlot[] })[]> {
    const conditions = [eq(shiftTemplates.tenantId, tenantId)];
    if (isActive !== undefined) {
      conditions.push(eq(shiftTemplates.isActive, isActive));
    }
    
    // Get templates
    const templates = await db
      .select()
      .from(shiftTemplates)
      .where(and(...conditions));
    
    // Get time slots for each template
    const templatesWithSlots = await Promise.all(
      templates.map(async (template) => {
        const timeSlots = await db
          .select()
          .from(shiftTimeSlots)
          .where(eq(shiftTimeSlots.templateId, template.id))
          .orderBy(shiftTimeSlots.slotOrder);
        
        return {
          ...template,
          timeSlots
        };
      })
    );
    
    return templatesWithSlots;
  }
  
  async createShiftTemplate(data: InsertShiftTemplate & { timeSlots?: Array<any> }): Promise<ShiftTemplate & { timeSlots?: ShiftTimeSlot[] }> {
    return await db.transaction(async (tx) => {
      // Create the template
      const { timeSlots, ...templateData } = data;
      const [template] = await tx
        .insert(shiftTemplates)
        .values(templateData)
        .returning();
      
      // Create time slots if provided
      let createdTimeSlots: ShiftTimeSlot[] = [];
      if (timeSlots && timeSlots.length > 0) {
        const timeSlotData = timeSlots.map((slot, index) => ({
          templateId: template.id,
          tenantId: template.tenantId,
          name: slot.name || `Fascia ${index + 1}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          segmentType: slot.segmentType || 'continuous',
          block2StartTime: slot.block2StartTime || slot.block2Start || null,
          block2EndTime: slot.block2EndTime || slot.block2End || null,
          breakMinutes: slot.breakMinutes || 0,
          clockInTolerance: slot.clockInTolerance || 15,
          clockOutTolerance: slot.clockOutTolerance || 15,
          requiredStaff: slot.requiredStaff || 1,
          skills: slot.skills || [],
          isBreak: slot.isBreak || false,
          minStaff: slot.minStaff || null,
          maxStaff: slot.maxStaff || null,
          priority: slot.priority || 1,
          color: slot.color || null,
          notes: slot.notes || null,
          slotOrder: index + 1
        }));
        
        createdTimeSlots = await tx
          .insert(shiftTimeSlots)
          .values(timeSlotData)
          .returning();
      }
      
      return {
        ...template,
        timeSlots: createdTimeSlots
      };
    });
  }
  
  async updateShiftTemplate(id: string, data: Partial<InsertShiftTemplate> & { timeSlots?: Array<any> }, tenantId: string): Promise<ShiftTemplate & { timeSlots?: ShiftTimeSlot[] }> {
    return await db.transaction(async (tx) => {
      // Update the template
      const { timeSlots, ...templateData } = data;
      const [updated] = await tx
        .update(shiftTemplates)
        .set({ ...templateData, updatedAt: new Date() })
        .where(and(
          eq(shiftTemplates.id, id),
          eq(shiftTemplates.tenantId, tenantId)
        ))
        .returning();
      
      // Update time slots if provided
      let updatedTimeSlots: ShiftTimeSlot[] = [];
      if (timeSlots !== undefined) {
        // Delete existing time slots
        await tx
          .delete(shiftTimeSlots)
          .where(eq(shiftTimeSlots.templateId, id));
        
        // Create new time slots
        if (timeSlots.length > 0) {
          const timeSlotData = timeSlots.map((slot, index) => ({
            templateId: id,
            tenantId: updated.tenantId,
            name: slot.name || `Fascia ${index + 1}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            segmentType: slot.segmentType || 'continuous',
            block2StartTime: slot.block2StartTime || slot.block2Start || null,
            block2EndTime: slot.block2EndTime || slot.block2End || null,
            breakMinutes: slot.breakMinutes || 0,
            clockInTolerance: slot.clockInTolerance || 15,
            clockOutTolerance: slot.clockOutTolerance || 15,
            requiredStaff: slot.requiredStaff || 1,
            skills: slot.skills || [],
            isBreak: slot.isBreak || false,
            minStaff: slot.minStaff || null,
            maxStaff: slot.maxStaff || null,
            priority: slot.priority || 1,
            color: slot.color || null,
            notes: slot.notes || null,
            slotOrder: index + 1
          }));
          
          updatedTimeSlots = await tx
            .insert(shiftTimeSlots)
            .values(timeSlotData)
            .returning();
        }
      } else {
        // If timeSlots not provided, get existing ones
        updatedTimeSlots = await tx
          .select()
          .from(shiftTimeSlots)
          .where(eq(shiftTimeSlots.templateId, id))
          .orderBy(shiftTimeSlots.slotOrder);
      }
      
      return {
        ...updated,
        timeSlots: updatedTimeSlots
      };
    });
  }
  
  async deleteShiftTemplate(id: string, tenantId: string): Promise<void> {
    await db
      .delete(shiftTemplates)
      .where(and(
        eq(shiftTemplates.id, id),
        eq(shiftTemplates.tenantId, tenantId)
      ));
  }
  
  async applyShiftTemplate(templateId: string, storeId: string, startDate: Date, endDate: Date, tenantId: string): Promise<Shift[]> {
    // Get template
    const [template] = await db
      .select()
      .from(shiftTemplates)
      .where(and(
        eq(shiftTemplates.id, templateId),
        eq(shiftTemplates.tenantId, tenantId)
      ));
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Generate shifts from template
    const shiftsToCreate: InsertShift[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      let shouldCreate = false;
      const dayOfWeek = currentDate.getDay();
      
      // Check pattern
      if (template.pattern === 'daily') {
        shouldCreate = true;
      } else if (template.pattern === 'weekly' && (template.rules as any)?.daysOfWeek) {
        shouldCreate = (template.rules as any).daysOfWeek.includes(dayOfWeek);
      }
      
      if (shouldCreate) {
        const [startHour, startMinute] = (template.defaultStartTime || '09:00').split(':').map(Number);
        const [endHour, endMinute] = (template.defaultEndTime || '18:00').split(':').map(Number);
        
        const shiftStartTime = new Date(currentDate);
        shiftStartTime.setHours(startHour, startMinute, 0, 0);
        
        const shiftEndTime = new Date(currentDate);
        shiftEndTime.setHours(endHour, endMinute, 0, 0);
        
        // Handle overnight shifts
        if (endHour < startHour) {
          shiftEndTime.setDate(shiftEndTime.getDate() + 1);
        }
        
        shiftsToCreate.push({
          tenantId,
          storeId,
          name: template.name,
          date: currentDate.toISOString().split('T')[0],
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          requiredStaff: template.defaultRequiredStaff,
          breakMinutes: template.defaultBreakMinutes || 30,
          shiftType: startHour < 14 ? 'morning' : startHour < 22 ? 'afternoon' : 'night',
          templateId,
          skills: template.defaultSkills || [],
          status: 'draft',
          createdBy: '', // Will be set from context
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (shiftsToCreate.length > 0) {
      const created = await db
        .insert(shifts)
        .values(shiftsToCreate)
        .returning();
      
      return created;
    }
    
    return [];
  }
  
  // ==================== COVERAGE ANALYSIS ====================
  async getShiftCoverageAnalysis(tenantId: string, storeId: string, startDate: Date, endDate: Date): Promise<any> {
    // Get all shifts in date range
    const shiftList = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.tenantId, tenantId),
        eq(shifts.storeId, storeId),
        gte(shifts.date, startDate.toISOString().split('T')[0]),
        lte(shifts.date, endDate.toISOString().split('T')[0])
      ));
    
    // Calculate hourly coverage
    const coverageMap = new Map<string, { required: number; scheduled: number }>();
    
    shiftList.forEach(shift => {
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      const currentHour = new Date(startTime);
      
      while (currentHour < endTime) {
        const hourKey = `${shift.date}_${currentHour.getHours()}`;
        const existing = coverageMap.get(hourKey) || { required: 0, scheduled: 0 };
        
        existing.required += shift.requiredStaff;
        existing.scheduled += (shift.assignedUsers as string[]).length;
        
        coverageMap.set(hourKey, existing);
        currentHour.setHours(currentHour.getHours() + 1);
      }
    });
    
    // Convert to array with analysis
    const analysis = Array.from(coverageMap.entries()).map(([key, data]) => {
      const [date, hour] = key.split('_');
      const coverage = data.required > 0 ? (data.scheduled / data.required) * 100 : 100;
      
      return {
        date,
        hour: parseInt(hour),
        requiredStaff: data.required,
        scheduledStaff: data.scheduled,
        coverage,
        status: coverage < 80 ? 'understaffed' : coverage > 120 ? 'overstaffed' : 'optimal'
      };
    });
    
    return analysis;
  }
  
  async detectShiftConflicts(tenantId: string, storeId: string, userId?: string): Promise<any[]> {
    const conflicts = [];
    
    // Get shifts
    const shiftList = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.tenantId, tenantId),
        eq(shifts.storeId, storeId)
      ));
    
    // If userId specified, check user-specific conflicts
    if (userId) {
      const userShifts = shiftList.filter(shift => 
        (shift.assignedUsers as string[]).includes(userId)
      );
      
      // Check for double booking
      for (let i = 0; i < userShifts.length; i++) {
        for (let j = i + 1; j < userShifts.length; j++) {
          const shift1Start = new Date(userShifts[i].startTime);
          const shift1End = new Date(userShifts[i].endTime);
          const shift2Start = new Date(userShifts[j].startTime);
          const shift2End = new Date(userShifts[j].endTime);
          
          if (shift1Start < shift2End && shift1End > shift2Start) {
            conflicts.push({
              type: 'double_booking',
              userId,
              shiftIds: [userShifts[i].id, userShifts[j].id],
              message: `Doppio turno per utente ${userId}`,
              severity: 'error'
            });
          }
        }
      }
      
      // Check for insufficient rest (min 11 hours between shifts)
      const sortedShifts = userShifts.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      for (let i = 0; i < sortedShifts.length - 1; i++) {
        const endTime = new Date(sortedShifts[i].endTime);
        const nextStartTime = new Date(sortedShifts[i + 1].startTime);
        const restHours = (nextStartTime.getTime() - endTime.getTime()) / (1000 * 60 * 60);
        
        if (restHours < 11) {
          conflicts.push({
            type: 'insufficient_rest',
            userId,
            shiftIds: [sortedShifts[i].id, sortedShifts[i + 1].id],
            message: `Riposo insufficiente: ${restHours.toFixed(1)} ore`,
            severity: 'error'
          });
        }
      }
    }
    
    // Check for understaffing
    shiftList.forEach(shift => {
      const assigned = (shift.assignedUsers as string[]).length;
      if (assigned < shift.requiredStaff) {
        conflicts.push({
          type: 'understaffed',
          shiftId: shift.id,
          message: `Personale insufficiente: ${assigned}/${shift.requiredStaff}`,
          severity: 'warning'
        });
      }
    });
    
    return conflicts;
  }
  
  async autoScheduleShifts(tenantId: string, storeId: string, startDate: Date, endDate: Date, constraints?: any): Promise<any> {
    // Simplified auto-scheduling algorithm
    const result = {
      shifts: [],
      conflicts: [],
      stats: {
        totalShifts: 0,
        totalHours: 0,
        coverageRate: 0
      }
    };
    
    // Get existing shifts
    const existingShifts = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.tenantId, tenantId),
        eq(shifts.storeId, storeId),
        gte(shifts.date, startDate.toISOString().split('T')[0]),
        lte(shifts.date, endDate.toISOString().split('T')[0])
      ));
    
    // Get available staff
    const staff = await db
      .select()
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.storeId, storeId),
        eq(users.status, 'attivo')
      ));
    
    // Basic scheduling logic
    for (const shift of existingShifts) {
      if ((shift.assignedUsers as string[]).length < shift.requiredStaff) {
        // Find available staff for this shift
        const availableStaff = staff.filter(user => {
          // Check if user not already assigned
          return !(shift.assignedUsers as string[]).includes(user.id);
        });
        
        // Assign staff up to required amount
        const toAssign = Math.min(
          availableStaff.length,
          shift.requiredStaff - (shift.assignedUsers as string[]).length
        );
        
        for (let i = 0; i < toAssign; i++) {
          (shift.assignedUsers as string[]).push(availableStaff[i].id);
        }
        
        // Update shift in database
        await db
          .update(shifts)
          .set({ assignedUsers: shift.assignedUsers })
          .where(eq(shifts.id, shift.id));
        
        result.shifts.push(shift);
      }
    }
    
    result.stats.totalShifts = result.shifts.length;
    result.conflicts = await this.detectShiftConflicts(tenantId, storeId);
    
    return result;
  }
  
  // ==================== STAFF AVAILABILITY ====================
  async getStaffAvailability(tenantId: string, storeId: string, date: Date): Promise<any[]> {
    // Get all staff for the store
    const staff = await db
      .select()
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.storeId, storeId),
        eq(users.status, 'attivo')
      ));
    
    const availability = [];
    
    for (const user of staff) {
      // Check if user has leave on this date
      const hasLeave = await db
        .select()
        .from(leaveRequests)
        .where(and(
          eq(leaveRequests.userId, user.id),
          eq(leaveRequests.status, 'approved'),
          lte(leaveRequests.startDate, date.toISOString().split('T')[0]),
          gte(leaveRequests.endDate, date.toISOString().split('T')[0])
        ))
        .limit(1);
      
      // Check if user has shifts on this date
      const hasShift = await db
        .select()
        .from(shifts)
        .where(and(
          eq(shifts.date, date.toISOString().split('T')[0]),
          sql`${shifts.assignedUsers}::jsonb @> ${JSON.stringify([user.id])}::jsonb`
        ))
        .limit(1);
      
      availability.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        date: date.toISOString().split('T')[0],
        available: hasLeave.length === 0,
        reason: hasLeave.length > 0 ? 'leave' : hasShift.length > 0 ? 'other_shift' : undefined,
        currentShifts: hasShift.length
      });
    }
    
    return availability;
  }
  
  async updateStaffAvailability(userId: string, date: Date, available: boolean, reason?: string): Promise<void> {
    // This would typically update a separate availability table
    // For now, we'll just log the update
    console.log(`Updated availability for ${userId} on ${date}: ${available} (${reason})`);
  }

  // Missing Time Tracking Methods
  async getTimeTrackingById(id: string, tenantId: string): Promise<TimeTracking | null> {
    await setTenantContext(tenantId);
    
    const result = await db.select()
      .from(timeTracking)
      .where(and(
        eq(timeTracking.id, id),
        eq(timeTracking.tenantId, tenantId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  async updateTimeTracking(id: string, updates: Partial<InsertTimeTracking>, tenantId: string): Promise<TimeTracking> {
    await setTenantContext(tenantId);
    
    const result = await db.update(timeTracking)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(timeTracking.id, id),
        eq(timeTracking.tenantId, tenantId)
      ))
      .returning();
    
    return result[0];
  }

  async approveTimeTracking(id: string, approverId: string, notes: string | undefined, tenantId: string): Promise<TimeTracking> {
    await setTenantContext(tenantId);
    
    const result = await db.update(timeTracking)
      .set({
        status: 'completed',
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: notes ? `[APPROVED] ${notes}` : undefined,
        updatedAt: new Date()
      })
      .where(and(
        eq(timeTracking.id, id),
        eq(timeTracking.tenantId, tenantId)
      ))
      .returning();
    
    return result[0];
  }

  async disputeTimeTracking(id: string, reason: string, tenantId: string): Promise<TimeTracking> {
    await setTenantContext(tenantId);
    
    const result = await db.update(timeTracking)
      .set({
        status: 'disputed',
        notes: reason,
        updatedAt: new Date()
      })
      .where(and(
        eq(timeTracking.id, id),
        eq(timeTracking.tenantId, tenantId)
      ))
      .returning();
    
    return result[0];
  }

  async startBreak(timeTrackingId: string, tenantId: string): Promise<TimeTracking> {
    await setTenantContext(tenantId);
    
    // Validate entry exists and user owns it before starting break
    const entry = await this.getTimeTrackingById(timeTrackingId, tenantId);
    if (!entry || entry.isOnBreak) {
      throw new Error('Cannot start break: entry not found or already on break');
    }
    
    const result = await db.update(timeTracking)
      .set({
        isOnBreak: true,
        breakStartedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(timeTracking.id, timeTrackingId),
        eq(timeTracking.tenantId, tenantId)
      ))
      .returning();
    
    return result[0];
  }

  async endBreak(timeTrackingId: string, tenantId: string): Promise<TimeTracking> {
    await setTenantContext(tenantId);
    
    const entry = await this.getTimeTrackingById(timeTrackingId, tenantId);
    if (!entry || !entry.isOnBreak || !entry.breakStartedAt) {
      throw new Error('No active break found');
    }

    // Calculate break duration
    const breakDuration = Math.floor((Date.now() - new Date(entry.breakStartedAt).getTime()) / 60000); // in minutes
    const totalBreakTime = (entry.breakDuration || 0) + breakDuration;

    const result = await db.update(timeTracking)
      .set({
        isOnBreak: false,
        breakStartedAt: null,
        breakDuration: totalBreakTime,
        updatedAt: new Date()
      })
      .where(and(
        eq(timeTracking.id, timeTrackingId),
        eq(timeTracking.tenantId, tenantId)
      ))
      .returning();
    
    return result[0];
  }

  // ==================== TASK 7 ENTERPRISE FEATURES IMPLEMENTATION ====================

  // ==================== BULK ASSIGNMENTS ====================

  async bulkAssignShifts(tenantId: string, assignments: Array<{shiftId: string, employeeIds: string[]}>): Promise<{
    totalAssignments: number;
    successful: number;
    failed: number;
    conflicts: any[];
  }> {
    await setTenantContext(tenantId);
    
    let totalAssignments = 0;
    let successful = 0;
    let failed = 0;
    const conflicts: any[] = [];
    
    try {
      // Process each assignment batch
      for (const assignment of assignments) {
        const { shiftId, employeeIds } = assignment;
        totalAssignments += employeeIds.length;

        // Validate shift exists
        const shift = await db.select()
          .from(shifts)
          .where(and(
            eq(shifts.id, shiftId),
            eq(shifts.tenantId, tenantId)
          ))
          .limit(1);

        if (shift.length === 0) {
          failed += employeeIds.length;
          conflicts.push({
            type: 'shift_not_found',
            shiftId,
            employeeIds,
            message: `Shift ${shiftId} not found`
          });
          continue;
        }

        // Process each employee assignment
        for (const employeeId of employeeIds) {
          try {
            // Check for existing assignment
            const existingAssignment = await db.select()
              .from(userAssignments)
              .where(and(
                eq(userAssignments.userId, employeeId),
                eq(userAssignments.shiftId, shiftId),
                eq(userAssignments.tenantId, tenantId)
              ))
              .limit(1);

            if (existingAssignment.length > 0) {
              conflicts.push({
                type: 'already_assigned',
                shiftId,
                employeeId,
                message: `Employee ${employeeId} already assigned to shift ${shiftId}`
              });
              failed++;
              continue;
            }

            // Create assignment
            await db.insert(userAssignments).values({
              id: sql`gen_random_uuid()`,
              tenantId,
              userId: employeeId,
              shiftId,
              assignedAt: new Date(),
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            });

            successful++;
          } catch (error) {
            console.error(`Error assigning employee ${employeeId} to shift ${shiftId}:`, error);
            conflicts.push({
              type: 'assignment_error',
              shiftId,
              employeeId,
              message: `Failed to assign employee: ${error.message}`
            });
            failed++;
          }
        }
      }

      return {
        totalAssignments,
        successful,
        failed,
        conflicts
      };
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      throw error;
    }
  }

  async bulkUnassignShifts(tenantId: string, assignments: Array<{shiftId: string, employeeIds: string[]}>): Promise<{
    totalUnassignments: number;
    successful: number;
    failed: number;
  }> {
    await setTenantContext(tenantId);
    
    let totalUnassignments = 0;
    let successful = 0;
    let failed = 0;
    
    try {
      for (const assignment of assignments) {
        const { shiftId, employeeIds } = assignment;
        totalUnassignments += employeeIds.length;

        for (const employeeId of employeeIds) {
          try {
            const result = await db.delete(userAssignments)
              .where(and(
                eq(userAssignments.userId, employeeId),
                eq(userAssignments.shiftId, shiftId),
                eq(userAssignments.tenantId, tenantId)
              ));

            successful++;
          } catch (error) {
            console.error(`Error unassigning employee ${employeeId} from shift ${shiftId}:`, error);
            failed++;
          }
        }
      }

      return {
        totalUnassignments,
        successful,
        failed
      };
    } catch (error) {
      console.error('Error in bulk unassignment:', error);
      throw error;
    }
  }

  // ==================== ENHANCED CONFLICT VALIDATION ====================

  async validateShiftAssignments(tenantId: string, assignments: Array<{shiftId: string, employeeIds: string[]}>, options: any = {}): Promise<{
    results: any[];
    conflicts: any[];
    warnings: any[];
    recommendations: any[];
    isValid: boolean;
    totalChecked: number;
  }> {
    await setTenantContext(tenantId);
    
    const results: any[] = [];
    const conflicts: any[] = [];
    const warnings: any[] = [];
    const recommendations: any[] = [];
    let totalChecked = 0;

    try {
      for (const assignment of assignments) {
        const { shiftId, employeeIds } = assignment;
        totalChecked += employeeIds.length;

        // Get shift details
        const shift = await db.select()
          .from(shifts)
          .where(and(
            eq(shifts.id, shiftId),
            eq(shifts.tenantId, tenantId)
          ))
          .limit(1);

        if (shift.length === 0) {
          conflicts.push({
            type: 'shift_not_found',
            severity: 'high',
            shiftId,
            message: `Shift ${shiftId} not found`
          });
          continue;
        }

        const shiftData = shift[0];

        for (const employeeId of employeeIds) {
          const validationResult = {
            shiftId,
            employeeId,
            checks: [],
            passed: true
          };

          // Check 1: Employee exists
          const employee = await db.select()
            .from(users)
            .where(and(
              eq(users.id, employeeId),
              eq(users.tenantId, tenantId)
            ))
            .limit(1);

          if (employee.length === 0) {
            conflicts.push({
              type: 'employee_not_found',
              severity: 'high',
              shiftId,
              employeeId,
              message: `Employee ${employeeId} not found`
            });
            validationResult.passed = false;
            continue;
          }

          // Check 2: Time conflicts
          const overlappingShifts = await db.select()
            .from(shifts)
            .leftJoin(userAssignments, eq(shifts.id, userAssignments.shiftId))
            .where(and(
              eq(shifts.tenantId, tenantId),
              eq(userAssignments.userId, employeeId),
              eq(shifts.date, shiftData.date),
              or(
                and(
                  lte(shifts.startTime, shiftData.startTime),
                  gte(shifts.endTime, shiftData.startTime)
                ),
                and(
                  lte(shifts.startTime, shiftData.endTime),
                  gte(shifts.endTime, shiftData.endTime)
                )
              )
            ));

          if (overlappingShifts.length > 0) {
            conflicts.push({
              type: 'time_conflict',
              severity: 'high',
              shiftId,
              employeeId,
              conflictingShifts: overlappingShifts.map(s => s.shifts.id),
              message: `Time conflict with existing shifts`
            });
            validationResult.passed = false;
          }

          // Check 3: Weekly hour limits
          const weekStart = new Date(shiftData.date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const weeklyHours = await db.select()
            .from(shifts)
            .leftJoin(userAssignments, eq(shifts.id, userAssignments.shiftId))
            .where(and(
              eq(shifts.tenantId, tenantId),
              eq(userAssignments.userId, employeeId),
              between(shifts.date, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0])
            ));

          const currentWeeklyHours = weeklyHours.reduce((total, shift) => {
            const startTime = new Date(`1970-01-01T${shift.shifts.startTime}`);
            const endTime = new Date(`1970-01-01T${shift.shifts.endTime}`);
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            return total + hours;
          }, 0);

          const shiftHours = (() => {
            const startTime = new Date(`1970-01-01T${shiftData.startTime}`);
            const endTime = new Date(`1970-01-01T${shiftData.endTime}`);
            return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          })();

          if (currentWeeklyHours + shiftHours > 40) {
            warnings.push({
              type: 'weekly_limit_exceeded',
              severity: 'medium',
              shiftId,
              employeeId,
              currentHours: currentWeeklyHours,
              additionalHours: shiftHours,
              message: `Weekly hour limit may be exceeded`
            });
          }

          validationResult.checks.push({
            name: 'employee_exists',
            passed: employee.length > 0
          }, {
            name: 'no_time_conflicts',
            passed: overlappingShifts.length === 0
          }, {
            name: 'within_weekly_limits',
            passed: currentWeeklyHours + shiftHours <= 40
          });

          results.push(validationResult);
        }
      }

      // Generate recommendations
      if (conflicts.length > 0) {
        recommendations.push({
          type: 'resolve_conflicts',
          message: `${conflicts.length} conflicts found. Review and resolve before proceeding.`
        });
      }

      if (warnings.length > 0) {
        recommendations.push({
          type: 'review_warnings',
          message: `${warnings.length} warnings found. Consider reviewing workload distribution.`
        });
      }

      return {
        results,
        conflicts,
        warnings,
        recommendations,
        isValid: conflicts.length === 0,
        totalChecked
      };
    } catch (error) {
      console.error('Error validating assignments:', error);
      throw error;
    }
  }

  // ==================== SHIFT PATTERNS ====================

  async getShiftPatterns(tenantId: string, options: {storeId?: string, isActive?: boolean} = {}): Promise<any[]> {
    await setTenantContext(tenantId);
    
    // For now, return empty array since shift_patterns table doesn't exist yet
    // This would require a new database table for shift patterns
    console.log('[SHIFT_PATTERNS] Feature not yet implemented - requires shift_patterns table');
    return [];
  }

  async createShiftPattern(tenantId: string, patternData: any): Promise<any> {
    await setTenantContext(tenantId);
    
    // For now, return mock pattern since shift_patterns table doesn't exist yet
    console.log('[SHIFT_PATTERNS] Feature not yet implemented - requires shift_patterns table');
    return {
      id: sql`gen_random_uuid()`,
      ...patternData,
      tenantId,
      createdAt: new Date()
    };
  }

  async applyShiftPattern(tenantId: string, patternId: string, options: any): Promise<{
    shifts: any[];
    totalGenerated: number;
    conflicts: any[];
    summary: any;
  }> {
    await setTenantContext(tenantId);
    
    // For now, return empty result since shift_patterns table doesn't exist yet
    console.log('[SHIFT_PATTERNS] Feature not yet implemented - requires shift_patterns table');
    return {
      shifts: [],
      totalGenerated: 0,
      conflicts: [],
      summary: {
        message: 'Shift patterns feature requires additional database tables'
      }
    };
  }

  // ==================== TIMBRATURE MATCHING ====================

  async matchTimbratureWithShifts(tenantId: string, options: any): Promise<{
    results: any[];
    discrepancies: any[];
    unmatchedClockIns: any[];
    missedShifts: any[];
    totalShifts: number;
    matchedShifts: number;
    complianceRate: number;
    onTimeRate: number;
    summary: any;
  }> {
    await setTenantContext(tenantId);
    
    try {
      const { startDate, endDate, storeId, employeeId } = options;
      
      // Get planned shifts in date range
      const conditions = [
        eq(shifts.tenantId, tenantId),
        between(shifts.date, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
      ];

      if (storeId) {
        conditions.push(eq(shifts.storeId, storeId));
      }

      const plannedShifts = await db.select()
        .from(shifts)
        .leftJoin(userAssignments, eq(shifts.id, userAssignments.shiftId))
        .where(and(...conditions));

      // Get time tracking entries in same date range
      const timeEntries = await db.select()
        .from(timeTracking)
        .where(and(
          eq(timeTracking.tenantId, tenantId),
          between(timeTracking.clockInTime, startDate, endDate),
          employeeId ? eq(timeTracking.userId, employeeId) : sql`true`
        ));

      const results: any[] = [];
      const discrepancies: any[] = [];
      const unmatchedClockIns: any[] = [];
      const missedShifts: any[] = [];

      let totalShifts = plannedShifts.length;
      let matchedShifts = 0;
      let onTimeShifts = 0;

      // Match time entries with planned shifts
      for (const shiftRecord of plannedShifts) {
        const shift = shiftRecord.shifts;
        const assignment = shiftRecord.user_assignments;

        if (!assignment) continue; // Skip unassigned shifts

        const shiftDate = shift.date;
        const shiftStart = new Date(`${shiftDate}T${shift.startTime}`);
        const shiftEnd = new Date(`${shiftDate}T${shift.endTime}`);

        // Find matching time entries
        const matchingEntries = timeEntries.filter(entry => {
          const clockInDate = new Date(entry.clockInTime).toISOString().split('T')[0];
          return clockInDate === shiftDate && entry.userId === assignment.userId;
        });

        if (matchingEntries.length === 0) {
          missedShifts.push({
            shiftId: shift.id,
            employeeId: assignment.userId,
            shiftDate,
            shiftStart: shift.startTime,
            shiftEnd: shift.endTime,
            status: 'missed'
          });
        } else {
          matchedShifts++;
          const entry = matchingEntries[0];
          const clockInTime = new Date(entry.clockInTime);
          
          // Check if on time (within 15 minutes)
          const timeDifference = Math.abs(clockInTime.getTime() - shiftStart.getTime()) / (1000 * 60);
          const isOnTime = timeDifference <= 15;
          
          if (isOnTime) {
            onTimeShifts++;
          }

          const result = {
            shiftId: shift.id,
            employeeId: assignment.userId,
            timeTrackingId: entry.id,
            shiftStart: shift.startTime,
            shiftEnd: shift.endTime,
            clockInTime: entry.clockInTime,
            clockOutTime: entry.clockOutTime,
            isOnTime,
            timeDifference: Math.round(timeDifference),
            status: 'matched'
          };

          results.push(result);

          // Check for discrepancies
          if (!isOnTime) {
            discrepancies.push({
              type: 'late_arrival',
              ...result,
              message: `Employee arrived ${Math.round(timeDifference)} minutes ${clockInTime > shiftStart ? 'late' : 'early'}`
            });
          }

          if (entry.clockOutTime) {
            const clockOutTime = new Date(entry.clockOutTime);
            const endTimeDifference = Math.abs(clockOutTime.getTime() - shiftEnd.getTime()) / (1000 * 60);
            
            if (endTimeDifference > 15) {
              discrepancies.push({
                type: 'early_departure',
                ...result,
                message: `Employee left ${Math.round(endTimeDifference)} minutes ${clockOutTime < shiftEnd ? 'early' : 'late'}`
              });
            }
          }
        }
      }

      // Find unmatched clock-ins
      for (const entry of timeEntries) {
        const entryDate = new Date(entry.clockInTime).toISOString().split('T')[0];
        const hasMatchingShift = plannedShifts.some(shiftRecord => {
          const shift = shiftRecord.shifts;
          const assignment = shiftRecord.user_assignments;
          return assignment && 
                 shift.date === entryDate && 
                 assignment.userId === entry.userId;
        });

        if (!hasMatchingShift) {
          unmatchedClockIns.push({
            timeTrackingId: entry.id,
            employeeId: entry.userId,
            clockInTime: entry.clockInTime,
            clockOutTime: entry.clockOutTime,
            date: entryDate,
            status: 'unmatched'
          });
        }
      }

      const complianceRate = totalShifts > 0 ? (matchedShifts / totalShifts) * 100 : 0;
      const onTimeRate = matchedShifts > 0 ? (onTimeShifts / matchedShifts) * 100 : 0;

      return {
        results,
        discrepancies,
        unmatchedClockIns,
        missedShifts,
        totalShifts,
        matchedShifts,
        complianceRate: Math.round(complianceRate * 100) / 100,
        onTimeRate: Math.round(onTimeRate * 100) / 100,
        summary: {
          totalShifts,
          matchedShifts,
          missedShifts: missedShifts.length,
          discrepancies: discrepancies.length,
          unmatchedClockIns: unmatchedClockIns.length,
          complianceRate,
          onTimeRate
        }
      };
    } catch (error) {
      console.error('Error matching timbrature with shifts:', error);
      throw error;
    }
  }

  async generateComplianceReport(tenantId: string, options: any): Promise<any> {
    await setTenantContext(tenantId);
    
    try {
      const matchingResults = await this.matchTimbratureWithShifts(tenantId, options);
      
      const report = {
        reportType: options.reportType || 'detailed',
        period: {
          startDate: options.startDate,
          endDate: options.endDate
        },
        filters: {
          storeId: options.storeId,
          employeeId: options.employeeId
        },
        metrics: {
          totalShifts: matchingResults.totalShifts,
          matchedShifts: matchingResults.matchedShifts,
          missedShifts: matchingResults.missedShifts.length,
          complianceRate: matchingResults.complianceRate,
          onTimeRate: matchingResults.onTimeRate,
          discrepancyRate: matchingResults.totalShifts > 0 ? 
            (matchingResults.discrepancies.length / matchingResults.totalShifts) * 100 : 0
        },
        breakdown: {
          missedShifts: matchingResults.missedShifts,
          lateArrivals: matchingResults.discrepancies.filter(d => d.type === 'late_arrival'),
          earlyDepartures: matchingResults.discrepancies.filter(d => d.type === 'early_departure'),
          unmatchedClockIns: matchingResults.unmatchedClockIns
        },
        recommendations: []
      };

      // Generate recommendations based on compliance
      if (report.metrics.complianceRate < 90) {
        report.recommendations.push({
          type: 'attendance_improvement',
          priority: 'high',
          message: 'Attendance compliance is below 90%. Consider reviewing scheduling and communication.'
        });
      }

      if (report.metrics.onTimeRate < 85) {
        report.recommendations.push({
          type: 'punctuality_improvement',
          priority: 'medium',
          message: 'On-time rate is below 85%. Consider implementing punctuality incentives.'
        });
      }

      if (matchingResults.unmatchedClockIns.length > 0) {
        report.recommendations.push({
          type: 'unscheduled_work',
          priority: 'medium',
          message: `${matchingResults.unmatchedClockIns.length} unmatched clock-ins found. Review for unauthorized overtime.`
        });
      }

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hrStorage = new HRStorage();