// HR Storage Interface - Enterprise Calendar & HR Operations
import { db } from "./db";
import { eq, and, or, between, inArray, gte, lte, desc, isNull, sql } from "drizzle-orm";
import {
  calendarEvents,
  leaveRequests,
  shifts,
  shiftTemplates,
  timeTracking,
  hrDocuments,
  expenseReports,
  hrAnnouncements,
  users,
  userAssignments,
  stores,
  CalendarEvent,
  LeaveRequest,
  Shift,
  ShiftTemplate,
  TimeTracking,
  InsertCalendarEvent,
  InsertLeaveRequest,
  InsertShift,
  InsertTimeTracking,
} from "../db/schema";

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
}

// Filter interfaces
export interface CalendarEventFilters {
  startDate?: Date | string;
  endDate?: Date | string;
  type?: string;
  visibility?: string;
  storeId?: string;
  teamId?: string;
}

export interface LeaveRequestFilters {
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  leaveType?: string;
  approverId?: string;
}

export interface DateRange {
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
    
    // Build visibility conditions based on permissions
    const visibilityConditions = [];
    
    // User can always see their own events
    visibilityConditions.push(eq(calendarEvents.ownerId, userId));
    
    // Add scope-based visibility
    if (permissions.canViewScopes.includes(CalendarScope.TEAM)) {
      visibilityConditions.push(eq(calendarEvents.visibility, 'team'));
    }
    if (permissions.canViewScopes.includes(CalendarScope.STORE)) {
      visibilityConditions.push(eq(calendarEvents.visibility, 'store'));
    }
    if (permissions.canViewScopes.includes(CalendarScope.AREA)) {
      visibilityConditions.push(eq(calendarEvents.visibility, 'area'));
    }
    if (permissions.canViewScopes.includes(CalendarScope.TENANT)) {
      visibilityConditions.push(eq(calendarEvents.visibility, 'tenant'));
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
    return await db.select()
      .from(shifts)
      .where(and(
        eq(shifts.tenantId, tenantId),
        eq(shifts.storeId, storeId),
        between(shifts.date, 
          dateRange.start.toISOString().split('T')[0], 
          dateRange.end.toISOString().split('T')[0]
        )
      ))
      .orderBy(shifts.date, shifts.startTime);
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
    const result = await db.insert(timeTracking)
      .values(data)
      .returning();
    
    return result[0];
  }
  
  async clockOut(trackingId: string, clockOut: Date, notes?: string): Promise<TimeTracking> {
    const tracking = await db.select()
      .from(timeTracking)
      .where(eq(timeTracking.id, trackingId))
      .limit(1);
    
    if (!tracking[0]) {
      throw new Error('Time tracking record not found');
    }
    
    const clockInTime = new Date(tracking[0].clockIn);
    const totalMinutes = Math.floor((clockOut.getTime() - clockInTime.getTime()) / 60000);
    const breakMinutes = tracking[0].breakMinutes || 0;
    
    const result = await db.update(timeTracking)
      .set({
        clockOut,
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
        between(timeTracking.clockIn, dateRange.start, dateRange.end)
      ))
      .orderBy(desc(timeTracking.clockIn));
  }
  
  // Permissions
  getUserCalendarPermissions(userId: string, userRole: string): CalendarPermissions {
    const rolePermissions = CALENDAR_PERMISSIONS[userRole] || CALENDAR_PERMISSIONS.USER;
    
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
}

// Export singleton instance
export const hrStorage = new HRStorage();