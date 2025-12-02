import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/tenant';
import { hrStorage } from '../core/hr-storage';
import { webSocketService } from '../core/websocket-service';
import { db } from '../core/db';
import { users, shiftTemplates, shiftTimeSlots, shiftTemplateVersions, shiftAssignments, shiftAttendance, attendanceAnomalies, shifts, universalRequests, resourceAvailability, stores } from '../db/schema/w3suite';
import { eq, and, gte, lte, inArray, sql, count, desc, isNull } from 'drizzle-orm';

const router = Router();

// ==================== SHIFT CONFLICT DETECTION ====================

// POST /api/hr/shifts/conflicts - Detect conflicts for shift assignments
router.post('/shifts/conflicts', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, startDate, endDate, userIds } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!storeId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Store ID, start date, and end date are required' });
    }

    // Convert dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Detect conflicts using existing storage function
    const conflicts = await hrStorage.detectShiftConflicts(tenantId, storeId);

    // Filter conflicts for specific users if provided
    const filteredConflicts = userIds 
      ? conflicts.filter(conflict => userIds.includes(conflict.userId))
      : conflicts;

    res.json(filteredConflicts);
  } catch (error) {
    console.error('Error detecting shift conflicts:', error);
    res.status(500).json({ error: 'Failed to detect shift conflicts' });
  }
});

// ==================== SHIFT ASSIGNMENTS QUERY ====================

// GET /api/hr/shift-assignments - Get shift assignments with employee/store info
router.get('/shift-assignments', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, startDate, endDate } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    console.log('[HR-SHIFT-ASSIGNMENTS] Query:', { tenantId, storeId, startDate, endDate });

    // Build conditions
    const conditions = [eq(shifts.tenantId, tenantId)];
    
    if (storeId) {
      conditions.push(eq(shifts.storeId, storeId as string));
    }
    if (startDate) {
      conditions.push(gte(shifts.date, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(shifts.date, endDate as string));
    }

    // Get shifts matching criteria - select only existing columns
    const shiftsData = await db.select({
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
      templateId: shifts.templateId,
      status: shifts.status,
    })
      .from(shifts)
      .where(and(...conditions));

    console.log('[HR-SHIFT-ASSIGNMENTS] Found shifts:', shiftsData.length);

    if (shiftsData.length === 0) {
      return res.json([]);
    }

    // Get shift IDs as strings for varchar comparison
    const shiftIds = shiftsData.map(s => String(s.id));

    // Get assignments with user and store info
    const assignmentsData = await db.select({
      id: shiftAssignments.id,
      shiftId: shiftAssignments.shiftId,
      employeeId: shiftAssignments.userId,
      timeSlotId: shiftAssignments.timeSlotId,
      status: shiftAssignments.status,
      assignedAt: shiftAssignments.assignedAt,
      shiftDate: shifts.date,
      shiftName: shifts.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      storeId: shifts.storeId,
      templateId: shifts.templateId,
      storeName: stores.nome,
      employeeFirstName: users.firstName,
      employeeLastName: users.lastName,
      employeeEmail: users.email,
    })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(sql`${shiftAssignments.shiftId}::uuid`, shifts.id))
      .leftJoin(users, eq(shiftAssignments.userId, users.id))
      .leftJoin(stores, eq(shifts.storeId, stores.id))
      .where(and(
        eq(shiftAssignments.tenantId, tenantId),
        inArray(shiftAssignments.shiftId, shiftIds)
      ));

    console.log('[HR-SHIFT-ASSIGNMENTS] Found assignments:', assignmentsData.length);

    // Format response with nested objects for frontend
    const formattedAssignments = assignmentsData.map(a => ({
      id: a.id,
      shiftId: a.shiftId,
      employeeId: a.employeeId,
      timeSlotId: a.timeSlotId,
      status: a.status,
      assignedAt: a.assignedAt,
      shiftDate: a.shiftDate,
      shiftName: a.shiftName,
      startTime: a.startTime,
      endTime: a.endTime,
      storeId: a.storeId,
      templateId: a.templateId,
      employee: {
        id: a.employeeId,
        firstName: a.employeeFirstName || 'Unknown',
        lastName: a.employeeLastName || 'User',
        email: a.employeeEmail,
      },
      store: {
        id: a.storeId,
        nome: a.storeName,
        name: a.storeName,
      },
    }));

    res.json(formattedAssignments);
  } catch (error) {
    console.error('Error fetching shift assignments:', error);
    res.status(500).json({ error: 'Failed to fetch shift assignments' });
  }
});

// ==================== SHIFT TEMPLATE APPLICATION ====================

// POST /api/hr/shifts/apply-template - Apply shift template to generate shifts
router.post('/shifts/apply-template', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { templateId, storeId, startDate, endDate, overwriteExisting = false } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!templateId || !storeId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Template ID, store ID, start date, and end date are required' });
    }

    // Convert dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Apply template using existing storage function
    const result = await hrStorage.applyShiftTemplate(tenantId, templateId, start, end, { 
      storeId, 
      overwriteExisting 
    });

    res.json(result);
  } catch (error) {
    console.error('Error applying shift template:', error);
    res.status(500).json({ error: 'Failed to apply shift template' });
  }
});

// ==================== SHIFT ASSIGNMENT ====================

// POST /api/hr/shifts/:id/assign - Assign user(s) to specific shift
router.post('/shifts/:id/assign', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: shiftId } = req.params;
    const { userId, employeeIds } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Support both single userId and multiple employeeIds
    const userIds = employeeIds || (userId ? [userId] : []);
    
    if (!shiftId || !userIds.length) {
      return res.status(400).json({ error: 'Shift ID and User ID(s) are required' });
    }

    // Fetch shift details to get date
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // ✅ TASK 12: Check resource_availability conflicts for each user
    const conflicts = [];
    for (const uid of userIds) {
      const availabilityConflicts = await db.select()
        .from(resourceAvailability)
        .where(and(
          eq(resourceAvailability.tenantId, tenantId),
          eq(resourceAvailability.userId, uid),
          eq(resourceAvailability.blocksShiftAssignment, true),
          lte(resourceAvailability.startDate, shift.date),
          gte(resourceAvailability.endDate, shift.date)
        ));
      
      if (availabilityConflicts.length > 0) {
        conflicts.push({
          userId: uid,
          reason: availabilityConflicts[0].reasonType || 'unavailable',
          description: availabilityConflicts[0].reasonDescription || 'User unavailable',
          startDate: availabilityConflicts[0].startDate,
          endDate: availabilityConflicts[0].endDate
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: 'Cannot assign shifts due to resource availability conflicts',
        conflicts
      });
    }

    // Handle multiple assignments
    const results = [];
    for (const uid of userIds) {
      const result = await hrStorage.assignUserToShift(shiftId, uid);
      results.push(result);
    }

    // Broadcast real-time update via WebSocket for each assignment
    try {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const uid = userIds[i];
        await webSocketService.broadcastShiftUpdate(tenantId, 'assignment_created', {
          assignmentId: result.id,
          shiftId,
          employeeId: result.employeeId || uid,
          assignment: result
        });
      }
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      assignments: results,
      totalAssigned: results.length
    });
  } catch (error) {
    console.error('Error assigning user to shift:', error);
    res.status(500).json({ error: 'Failed to assign user to shift' });
  }
});

// POST /api/hr/shifts/:id/unassign - Remove user(s) from specific shift
router.post('/shifts/:id/unassign', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: shiftId } = req.params;
    const { userId, employeeIds } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Support both single userId and multiple employeeIds
    const userIds = employeeIds || (userId ? [userId] : []);
    
    if (!shiftId || !userIds.length) {
      return res.status(400).json({ error: 'Shift ID and User ID(s) are required' });
    }

    // Handle multiple unassignments
    const results = [];
    for (const uid of userIds) {
      const result = await hrStorage.unassignUserFromShift(shiftId, uid);
      results.push(result);
    }

    // Broadcast real-time update via WebSocket for each unassignment
    try {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const uid = userIds[i];
        await webSocketService.broadcastShiftUpdate(tenantId, 'assignment_deleted', {
          assignmentId: result.id,
          shiftId,
          employeeId: result.employeeId || uid,
          assignment: result
        });
      }
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      assignments: results,
      totalUnassigned: results.length
    });
  } catch (error) {
    console.error('Error unassigning user from shift:', error);
    res.status(500).json({ error: 'Failed to unassign user from shift' });
  }
});

// ==================== BULK ASSIGNMENTS ====================

// POST /api/hr/shifts/bulk-assign - Bulk assign multiple users to multiple shifts
router.post('/shifts/bulk-assign', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { assignments } = req.body; // Array of { shiftId, employeeIds[] }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'Assignments array is required' });
    }

    // Validate assignment structure
    for (const assignment of assignments) {
      if (!assignment.shiftId || !assignment.employeeIds || !Array.isArray(assignment.employeeIds)) {
        return res.status(400).json({ 
          error: 'Each assignment must have shiftId and employeeIds array' 
        });
      }
    }

    // ✅ TASK 12: Check resource_availability conflicts for all assignments
    const shiftIds = assignments.map(a => a.shiftId);
    const shiftsData = await db.select().from(shifts).where(and(
      eq(shifts.tenantId, tenantId),
      // Use inArray for multiple shiftIds, otherwise use eq
      shiftIds.length > 1 ? inArray(shifts.id, shiftIds) : eq(shifts.id, shiftIds[0])
    ));

    const shiftsMap = new Map(shiftsData.map(s => [s.id, s]));
    const conflicts = [];

    for (const assignment of assignments) {
      const shift = shiftsMap.get(assignment.shiftId);
      if (!shift) {
        conflicts.push({
          shiftId: assignment.shiftId,
          error: 'Shift not found'
        });
        continue;
      }

      for (const uid of assignment.employeeIds) {
        const availabilityConflicts = await db.select()
          .from(resourceAvailability)
          .where(and(
            eq(resourceAvailability.tenantId, tenantId),
            eq(resourceAvailability.userId, uid),
            eq(resourceAvailability.blocksShiftAssignment, true),
            lte(resourceAvailability.startDate, shift.date),
            gte(resourceAvailability.endDate, shift.date)
          ));

        if (availabilityConflicts.length > 0) {
          conflicts.push({
            shiftId: assignment.shiftId,
            userId: uid,
            reason: availabilityConflicts[0].reasonType || 'unavailable',
            description: availabilityConflicts[0].reasonDescription || 'User unavailable',
            startDate: availabilityConflicts[0].startDate,
            endDate: availabilityConflicts[0].endDate
          });
        }
      }
    }

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: 'Cannot assign shifts due to resource availability conflicts',
        conflicts
      });
    }

    // Process bulk assignments using new storage function
    const result = await hrStorage.bulkAssignShifts(tenantId, assignments);

    // Broadcast real-time updates via WebSocket for successful assignments
    try {
      if (result.successful > 0) {
        await webSocketService.broadcastShiftUpdate(tenantId, 'assignment_created', {
          bulk: true,
          totalAssignments: result.totalAssignments,
          successfulAssignments: result.successful,
          failedAssignments: result.failed,
          conflicts: result.conflicts || []
        });
      }
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      totalAssignments: result.totalAssignments,
      successfulAssignments: result.successful,
      failedAssignments: result.failed,
      conflicts: result.conflicts || []
    });
  } catch (error) {
    console.error('Error processing bulk assignments:', error);
    res.status(500).json({ error: 'Failed to process bulk assignments' });
  }
});

// POST /api/hr/shifts/bulk-unassign - Bulk unassign multiple users from multiple shifts
router.post('/shifts/bulk-unassign', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { assignments } = req.body; // Array of { shiftId, employeeIds[] }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'Assignments array is required' });
    }

    // Process bulk unassignments using new storage function
    const result = await hrStorage.bulkUnassignShifts(tenantId, assignments);

    // Broadcast real-time updates via WebSocket for successful unassignments
    try {
      if (result.successful > 0) {
        await webSocketService.broadcastShiftUpdate(tenantId, 'assignment_deleted', {
          bulk: true,
          totalUnassignments: result.totalUnassignments,
          successfulUnassignments: result.successful,
          failedUnassignments: result.failed
        });
      }
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      totalUnassignments: result.totalUnassignments,
      successfulUnassignments: result.successful,
      failedUnassignments: result.failed
    });
  } catch (error) {
    console.error('Error processing bulk unassignments:', error);
    res.status(500).json({ error: 'Failed to process bulk unassignments' });
  }
});

// ==================== BULK TEMPLATE TO STORE ====================

// POST /api/hr/shifts/bulk-template-assign - Bulk apply template to multiple stores for a period
router.post('/shifts/bulk-template-assign', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id;
    const { templateId, storeIds, startDate, endDate, periodType = 'week', excludeDates = [], overwriteExisting = false } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!templateId || !storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({ error: 'Template ID and store IDs array are required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Validate template exists and belongs to tenant
    const [template] = await db.select().from(shiftTemplates).where(and(
      eq(shiftTemplates.id, templateId),
      eq(shiftTemplates.tenantId, tenantId)
    )).limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // ✅ SECURITY: Validate all stores belong to tenant
    const validStores = await db.select({ id: stores.id }).from(stores).where(and(
      eq(stores.tenantId, tenantId),
      inArray(stores.id, storeIds)
    ));

    const validStoreIds = validStores.map(s => s.id);
    const invalidStoreIds = storeIds.filter((id: string) => !validStoreIds.includes(id));

    if (invalidStoreIds.length > 0) {
      return res.status(403).json({ 
        error: 'Some stores do not belong to this tenant',
        invalidStoreIds 
      });
    }

    // Generate dates for the period
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];
    
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (!excludeDates.includes(dateStr)) {
        dates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    // Create shifts for each store and date combination
    const createdShifts: any[] = [];
    const errors: any[] = [];

    for (const storeId of storeIds) {
      for (const date of dates) {
        try {
          // Check if shift already exists for this store/date/template
          const existingShift = await db.select().from(shifts).where(and(
            eq(shifts.tenantId, tenantId),
            eq(shifts.storeId, storeId),
            eq(shifts.date, date),
            eq(shifts.templateId, templateId)
          )).limit(1);

          if (existingShift.length > 0 && !overwriteExisting) {
            continue; // Skip existing shifts unless overwrite is enabled
          }

          // Create new shift
          const [newShift] = await db.insert(shifts).values({
            tenantId,
            storeId,
            templateId,
            date,
            status: 'active',
            startTime: template.defaultStartTime || '09:00',
            endTime: template.defaultEndTime || '18:00',
            breakMinutes: template.defaultBreakMinutes || 60,
            minStaff: template.minStaffRequired || 1,
            maxStaff: template.maxStaffAllowed || 10,
            createdBy: userId,
          }).returning();

          createdShifts.push(newShift);
        } catch (err: any) {
          errors.push({ storeId, date, error: err.message });
        }
      }
    }

    // Broadcast real-time update
    try {
      await webSocketService.broadcastShiftUpdate(tenantId, 'shifts_bulk_created', {
        templateId,
        storeIds,
        totalCreated: createdShifts.length,
        periodType,
        startDate,
        endDate
      });
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      createdCount: createdShifts.length,
      totalDates: dates.length,
      totalStores: storeIds.length,
      expectedCount: dates.length * storeIds.length,
      shifts: createdShifts,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error bulk assigning template:', error);
    res.status(500).json({ error: 'Failed to bulk assign template' });
  }
});

// POST /api/hr/shifts/bulk-planning - Bulk create shifts with assignments from planning workspace
router.post('/shifts/bulk-planning', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id;
    const { shifts: plannedShifts, storeId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    if (!plannedShifts || !Array.isArray(plannedShifts) || plannedShifts.length === 0) {
      return res.status(400).json({ error: 'Shifts array is required' });
    }

    const createdShifts: any[] = [];
    const createdAssignments: any[] = [];
    const errors: any[] = [];

    for (const plannedShift of plannedShifts) {
      try {
        const { templateId, date, startTime, endTime, slotId, assignments = [] } = plannedShift;

        const shiftDate = new Date(date);
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        const shiftStart = new Date(shiftDate);
        shiftStart.setHours(startHour, startMin, 0, 0);
        
        const shiftEnd = new Date(shiftDate);
        shiftEnd.setHours(endHour, endMin, 0, 0);

        const existingShift = await db.select()
          .from(shifts)
          .where(and(
            eq(shifts.tenantId, tenantId),
            eq(shifts.storeId, storeId),
            eq(shifts.date, date),
            eq(shifts.startTime, shiftStart),
            eq(shifts.endTime, shiftEnd)
          ))
          .limit(1);

        let shiftRecord;
        
        if (existingShift.length > 0) {
          shiftRecord = existingShift[0];
        } else {
          const templateData = await db.select()
            .from(shiftTemplates)
            .where(eq(shiftTemplates.id, templateId))
            .limit(1);
          
          const templateName = templateData[0]?.name || 'Turno Pianificato';

          const [newShift] = await db.insert(shifts).values({
            tenantId,
            storeId,
            name: `${templateName} - ${date}`,
            code: `SHIFT-${Date.now()}`,
            date,
            startTime: shiftStart,
            endTime: shiftEnd,
            breakMinutes: 0,
            requiredStaff: assignments.length || 1,
            minStaff: 1,
            maxStaff: 10,
            status: 'scheduled',
            shiftType: 'regular',
            templateId
          }).returning();

          shiftRecord = newShift;
          createdShifts.push(newShift);
        }

        for (const assignedUserId of assignments) {
          const existingAssignment = await db.select()
            .from(shiftAssignments)
            .where(and(
              eq(shiftAssignments.shiftId, shiftRecord.id),
              eq(shiftAssignments.userId, assignedUserId)
            ))
            .limit(1);

          if (existingAssignment.length === 0) {
            const [assignment] = await db.insert(shiftAssignments).values({
              tenantId,
              shiftId: shiftRecord.id,
              userId: assignedUserId,
              status: 'assigned',
              assignedBy: userId
            }).returning();

            createdAssignments.push(assignment);
          }
        }
      } catch (shiftError: any) {
        errors.push({
          shift: plannedShift,
          error: shiftError.message
        });
      }
    }

    try {
      await webSocketService.broadcastShiftUpdate(tenantId, 'shifts_bulk_planning_created', {
        storeId,
        totalShifts: createdShifts.length,
        totalAssignments: createdAssignments.length
      });
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      createdShiftsCount: createdShifts.length,
      createdAssignmentsCount: createdAssignments.length,
      totalPlanned: plannedShifts.length,
      shifts: createdShifts,
      assignments: createdAssignments,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk planning:', error);
    res.status(500).json({ error: 'Failed to create bulk planning' });
  }
});

// POST /api/hr/shift-assignments/bulk - Bulk assign resources to shifts for a period
router.post('/shift-assignments/bulk', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id;
    const { userIds, shiftIds, slotIds, startDate, endDate } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    if (!shiftIds || !Array.isArray(shiftIds) || shiftIds.length === 0) {
      return res.status(400).json({ error: 'Shift IDs array is required' });
    }

    // ✅ SECURITY: Validate all users belong to tenant
    const validUsers = await db.select({ id: users.id }).from(users).where(and(
      eq(users.tenantId, tenantId),
      inArray(users.id, userIds)
    ));

    const validUserIds = validUsers.map(u => u.id);
    const invalidUserIds = userIds.filter((id: string) => !validUserIds.includes(id));

    if (invalidUserIds.length > 0) {
      return res.status(403).json({
        error: 'Some users do not belong to this tenant',
        invalidUserIds
      });
    }

    // Fetch shifts for the period (with tenant validation)
    const targetShifts = await db.select().from(shifts).where(and(
      eq(shifts.tenantId, tenantId),
      inArray(shifts.id, shiftIds)
    ));

    if (targetShifts.length === 0) {
      return res.status(404).json({ error: 'No shifts found for the specified IDs' });
    }

    // Check resource availability conflicts
    const conflicts: any[] = [];
    for (const shift of targetShifts) {
      for (const uid of userIds) {
        const availabilityConflicts = await db.select()
          .from(resourceAvailability)
          .where(and(
            eq(resourceAvailability.tenantId, tenantId),
            eq(resourceAvailability.userId, uid),
            eq(resourceAvailability.blocksShiftAssignment, true),
            lte(resourceAvailability.startDate, shift.date),
            gte(resourceAvailability.endDate, shift.date)
          ));

        if (availabilityConflicts.length > 0) {
          conflicts.push({
            shiftId: shift.id,
            userId: uid,
            date: shift.date,
            reason: availabilityConflicts[0].reasonType || 'unavailable'
          });
        }
      }
    }

    // Create assignments for each user-shift combination (skip conflicts)
    const createdAssignments: any[] = [];
    const skippedDueToConflict: any[] = [];

    for (const shift of targetShifts) {
      for (const uid of userIds) {
        // Skip if there's a conflict
        const hasConflict = conflicts.some(c => c.shiftId === shift.id && c.userId === uid);
        if (hasConflict) {
          skippedDueToConflict.push({ shiftId: shift.id, userId: uid });
          continue;
        }

        try {
          // Check if assignment already exists
          const existingAssignment = await db.select().from(shiftAssignments).where(and(
            eq(shiftAssignments.tenantId, tenantId),
            eq(shiftAssignments.shiftId, shift.id),
            eq(shiftAssignments.userId, uid)
          )).limit(1);

          if (existingAssignment.length > 0) {
            continue; // Skip existing assignments
          }

          // Create new assignment
          const [newAssignment] = await db.insert(shiftAssignments).values({
            tenantId,
            shiftId: shift.id,
            userId: uid,
            timeSlotId: slotIds && slotIds.length > 0 ? slotIds[0] : null,
            status: 'assigned',
            assignedBy: userId,
            assignedAt: new Date(),
          }).returning();

          createdAssignments.push(newAssignment);
        } catch (err: any) {
          console.warn(`Failed to create assignment for shift ${shift.id}, user ${uid}:`, err.message);
        }
      }
    }

    // Broadcast real-time update
    try {
      await webSocketService.broadcastShiftUpdate(tenantId, 'assignments_bulk_created', {
        totalCreated: createdAssignments.length,
        userCount: userIds.length,
        shiftCount: shiftIds.length
      });
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      createdCount: createdAssignments.length,
      expectedCount: userIds.length * targetShifts.length,
      skippedDueToConflict: skippedDueToConflict.length,
      conflicts,
      assignments: createdAssignments
    });
  } catch (error) {
    console.error('Error bulk assigning resources:', error);
    res.status(500).json({ error: 'Failed to bulk assign resources' });
  }
});

// ==================== ENHANCED CONFLICT VALIDATION ====================

// POST /api/hr/shifts/validate-assignments - Enhanced conflict validation for assignments
router.post('/shifts/validate-assignments', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { assignments, options = {} } = req.body; // Array of { shiftId, employeeIds[] }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Assignments array is required' });
    }

    // Enhanced validation using new storage function
    const validation = await hrStorage.validateShiftAssignments(tenantId, assignments, options);

    res.json({
      success: true,
      validationResults: validation.results,
      conflicts: validation.conflicts,
      warnings: validation.warnings,
      recommendations: validation.recommendations,
      isValid: validation.isValid,
      summary: {
        totalChecked: validation.totalChecked,
        conflictsFound: validation.conflicts.length,
        warningsFound: validation.warnings.length
      }
    });
  } catch (error) {
    console.error('Error validating assignments:', error);
    res.status(500).json({ error: 'Failed to validate assignments' });
  }
});

// ==================== SHIFT PATTERNS ====================

// GET /api/hr/shift-patterns - Get recurring shift patterns
router.get('/shift-patterns', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, isActive = true } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get shift patterns using new storage function
    const patterns = await hrStorage.getShiftPatterns(tenantId, { 
      storeId: storeId as string,
      isActive: isActive === 'true'
    });

    res.json(patterns);
  } catch (error) {
    console.error('Error fetching shift patterns:', error);
    res.status(500).json({ error: 'Failed to fetch shift patterns' });
  }
});

// POST /api/hr/shift-patterns - Create recurring shift pattern
router.post('/shift-patterns', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const patternData = {
      ...req.body,
      tenantId,
      createdBy: userId,
      createdAt: new Date()
    };

    // Create shift pattern using new storage function
    const pattern = await hrStorage.createShiftPattern(tenantId, patternData);

    res.json({
      success: true,
      pattern
    });
  } catch (error) {
    console.error('Error creating shift pattern:', error);
    res.status(500).json({ error: 'Failed to create shift pattern' });
  }
});

// POST /api/hr/shift-patterns/:id/apply - Apply shift pattern to generate shifts
router.post('/shift-patterns/:id/apply', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: patternId } = req.params;
    const { startDate, endDate, storeId, options = {} } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!patternId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Pattern ID, start date, and end date are required' });
    }

    // Apply pattern to generate shifts using new storage function
    const result = await hrStorage.applyShiftPattern(tenantId, patternId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      storeId,
      ...options
    });

    res.json({
      success: true,
      generatedShifts: result.shifts,
      totalGenerated: result.totalGenerated,
      conflicts: result.conflicts || [],
      summary: result.summary
    });
  } catch (error) {
    console.error('Error applying shift pattern:', error);
    res.status(500).json({ error: 'Failed to apply shift pattern' });
  }
});

// ==================== TIMBRATURE MATCHING ====================

// POST /api/hr/timbrature/match-shifts - Match clock-in records with planned shifts
router.post('/timbrature/match-shifts', requirePermission('hr.timbrature.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate, storeId, employeeId, options = {} } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Match timbrature with planned shifts using new storage function
    const matching = await hrStorage.matchTimbratureWithShifts(tenantId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      storeId,
      employeeId,
      ...options
    });

    res.json({
      success: true,
      matchingResults: matching.results,
      discrepancies: matching.discrepancies,
      unmatchedClockIns: matching.unmatchedClockIns,
      missedShifts: matching.missedShifts,
      compliance: {
        totalShifts: matching.totalShifts,
        matchedShifts: matching.matchedShifts,
        complianceRate: matching.complianceRate,
        onTimeRate: matching.onTimeRate
      },
      summary: matching.summary
    });
  } catch (error) {
    console.error('Error matching timbrature with shifts:', error);
    res.status(500).json({ error: 'Failed to match timbrature with shifts' });
  }
});

// GET /api/hr/timbrature/compliance-report - Get compliance report for attendance
router.get('/timbrature/compliance-report', requirePermission('hr.timbrature.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate, storeId, employeeId, reportType = 'detailed' } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Generate compliance report using new storage function
    const report = await hrStorage.generateComplianceReport(tenantId, {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      storeId: storeId as string,
      employeeId: employeeId as string,
      reportType: reportType as string
    });

    res.json({
      success: true,
      report,
      generatedAt: new Date(),
      period: {
        startDate: startDate as string,
        endDate: endDate as string
      }
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// ==================== EMPLOYEE MY-SHIFTS (MyPortal Integration) ====================

// GET /api/employee/my-shifts - Get shifts assigned to current employee (INVISIBLE INTEGRATION)
router.get('/employee/my-shifts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id;
    const { startDate, endDate, storeId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Get shifts assigned to the current employee
    await setTenantContext(tenantId);
    
    const conditions = [
      eq(shifts.tenantId, tenantId),
      // Only get shifts assigned to current user
      exists(
        db.select()
          .from(userAssignments)
          .where(and(
            eq(userAssignments.shiftId, shifts.id),
            eq(userAssignments.userId, userId),
            eq(userAssignments.tenantId, tenantId),
            eq(userAssignments.status, 'active')
          ))
      )
    ];

    // Optional date filtering
    if (startDate && endDate) {
      conditions.push(
        between(shifts.date, new Date(startDate as string), new Date(endDate as string))
      );
    }

    // Optional store filtering
    if (storeId) {
      conditions.push(eq(shifts.storeId, storeId as string));
    }

    // Query shifts with store information and assignment details
    const myShifts = await db.select({
      // Shift details
      id: shifts.id,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      title: shifts.title,
      description: shifts.description,
      breakMinutes: shifts.breakMinutes,
      requiredStaff: shifts.requiredStaff,
      // Store details
      storeId: shifts.storeId,
      storeName: stores.nome,
      storeAddress: stores.indirizzo,
      // Assignment details
      assignmentId: userAssignments.id,
      assignedAt: userAssignments.assignedAt,
      role: userAssignments.role,
      notes: userAssignments.notes,
      status: userAssignments.status
    })
    .from(shifts)
    .leftJoin(stores, eq(shifts.storeId, stores.id))
    .leftJoin(userAssignments, and(
      eq(userAssignments.shiftId, shifts.id),
      eq(userAssignments.userId, userId),
      eq(userAssignments.tenantId, tenantId)
    ))
    .where(and(...conditions))
    .orderBy(shifts.date, shifts.startTime);

    // Transform data for frontend consumption (MyPortal ShiftsCalendar format)
    const transformedShifts = myShifts.map(shift => ({
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      storeId: shift.storeId,
      storeName: shift.storeName || 'Store Non Specificato',
      storeAddress: shift.storeAddress,
      role: shift.role || 'Dipendente',
      status: shift.status === 'active' ? 'confirmed' : 'scheduled',
      title: shift.title,
      description: shift.description,
      notes: shift.notes,
      breakMinutes: shift.breakMinutes,
      assignedAt: shift.assignedAt,
      // Additional metadata for MyPortal
      assignmentId: shift.assignmentId,
      requiredStaff: shift.requiredStaff
    }));

    res.json({
      success: true,
      shifts: transformedShifts,
      total: transformedShifts.length,
      employee: {
        id: userId,
        tenantId
      },
      filters: {
        startDate: startDate as string,
        endDate: endDate as string,
        storeId: storeId as string
      }
    });
  } catch (error) {
    console.error('Error fetching employee shifts:', error);
    res.status(500).json({ error: 'Failed to fetch employee shifts' });
  }
});

// ==================== STAFF AVAILABILITY ====================

// GET /api/hr/staff/availability - Get staff availability for date range
router.get('/staff/availability', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, date } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!storeId || !date) {
      return res.status(400).json({ error: 'Store ID and date are required' });
    }

    const targetDate = new Date(date as string);

    // Get staff availability using existing storage function
    const availability = await hrStorage.getStaffAvailability(tenantId, storeId as string, targetDate);

    res.json(availability);
  } catch (error) {
    console.error('Error fetching staff availability:', error);
    res.status(500).json({ error: 'Failed to fetch staff availability' });
  }
});

// ==================== SHIFT TEMPLATES ====================

// GET /api/hr/shift-templates - Get shift templates for tenant
// Query params: storeId (optional) - filter templates by scope (global + store-specific)
router.get('/shift-templates', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const storeId = req.query.storeId as string | undefined;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get shift templates with optional storeId filter (global + store-specific)
    const templates = await hrStorage.getShiftTemplates(tenantId, undefined, storeId);

    res.json(templates);
  } catch (error) {
    console.error('Error fetching shift templates:', error);
    res.status(500).json({ error: 'Failed to fetch shift templates' });
  }
});

// POST /api/hr/shift-templates - Create new shift template
router.post('/shift-templates', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const templateData = {
      ...req.body,
      tenantId,
      createdBy: userId
    };

    // Create shift template using existing storage function
    const template = await hrStorage.createShiftTemplate(templateData);

    res.json(template);
  } catch (error) {
    console.error('Error creating shift template:', error);
    res.status(500).json({ error: 'Failed to create shift template' });
  }
});

// PUT /api/hr/shift-templates/:id - Update shift template
// Creates a new version when template is updated
// Past shifts keep original version, future shifts get updated version
router.put('/shift-templates/:id', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: templateId } = req.params;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { changeReason, ...bodyData } = req.body;
    
    const updateData = {
      ...bodyData,
      changedBy: userId, // For version tracking
      changeReason: changeReason || 'Template updated', // For version tracking
      updatedAt: new Date()
    };

    // Update shift template and create new version
    const template = await hrStorage.updateShiftTemplate(templateId, updateData, tenantId);

    res.json(template);
  } catch (error) {
    console.error('Error updating shift template:', error);
    res.status(500).json({ error: 'Failed to update shift template' });
  }
});

// DELETE /api/hr/shift-templates/:id - Archive shift template
router.delete('/shift-templates/:id', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: templateId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Archive template (set isActive to false) using existing storage function
    await hrStorage.archiveShiftTemplate(tenantId, templateId);

    res.json({ success: true, message: 'Shift template archived successfully' });
  } catch (error) {
    console.error('Error archiving shift template:', error);
    res.status(500).json({ error: 'Failed to archive shift template' });
  }
});

// GET /api/hr/shift-templates/:id/verify-coverage - Verify template coverage for store
router.get('/shift-templates/:id/verify-coverage', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: templateId } = req.params;
    const { storeId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    // Get template to check defaultRequiredStaff
    const template = await db.select()
      .from(shiftTemplates)
      .where(and(
        eq(shiftTemplates.id, templateId),
        eq(shiftTemplates.tenantId, tenantId)
      ))
      .limit(1);

    if (!template || template.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const requiredStaff = template[0].defaultRequiredStaff || 1;

    // Query available resources for store (users assigned to this store)
    const availableResources = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role
    })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.status, 'attivo'),
        eq(users.storeId, storeId as string)
      ));

    const availableCount = availableResources.length;
    const sufficient = availableCount >= requiredStaff;

    res.json({
      available: availableCount,
      required: requiredStaff,
      sufficient,
      resources: availableResources
    });
  } catch (error) {
    console.error('Error verifying template coverage:', error);
    res.status(500).json({ error: 'Failed to verify template coverage' });
  }
});

// GET /api/hr/shift-templates/:id/versions - Get version history for a template
// Returns all versions of a template for audit trail and historical reference
router.get('/shift-templates/:id/versions', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: templateId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get all versions for this template, ordered by version number descending
    const versions = await db.select({
      id: shiftTemplateVersions.id,
      templateId: shiftTemplateVersions.templateId,
      versionNumber: shiftTemplateVersions.versionNumber,
      effectiveFrom: shiftTemplateVersions.effectiveFrom,
      effectiveUntil: shiftTemplateVersions.effectiveUntil,
      name: shiftTemplateVersions.name,
      description: shiftTemplateVersions.description,
      scope: shiftTemplateVersions.scope,
      storeId: shiftTemplateVersions.storeId,
      shiftType: shiftTemplateVersions.shiftType,
      globalClockInTolerance: shiftTemplateVersions.globalClockInTolerance,
      globalClockOutTolerance: shiftTemplateVersions.globalClockOutTolerance,
      globalBreakMinutes: shiftTemplateVersions.globalBreakMinutes,
      timeSlotsSnapshot: shiftTemplateVersions.timeSlotsSnapshot,
      changeReason: shiftTemplateVersions.changeReason,
      changedBy: shiftTemplateVersions.changedBy,
      createdAt: shiftTemplateVersions.createdAt
    })
      .from(shiftTemplateVersions)
      .where(and(
        eq(shiftTemplateVersions.templateId, templateId),
        eq(shiftTemplateVersions.tenantId, tenantId)
      ))
      .orderBy(desc(shiftTemplateVersions.versionNumber));

    // Mark which version is current (effectiveUntil is null)
    const versionsWithStatus = versions.map(v => ({
      ...v,
      isCurrent: v.effectiveUntil === null
    }));

    res.json(versionsWithStatus);
  } catch (error) {
    console.error('Error fetching template versions:', error);
    res.status(500).json({ error: 'Failed to fetch template versions' });
  }
});

// ==================== BASIC SHIFTS CRUD ====================

// GET /api/hr/shifts - Get shifts for tenant
router.get('/shifts', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, startDate, endDate } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get shifts using existing storage function
    const dateRange = {
      start: startDate ? new Date(startDate as string) : undefined,
      end: endDate ? new Date(endDate as string) : undefined
    };
    
    // Call getShifts with correct parameters: tenantId, storeId, dateRange
    const shifts = await hrStorage.getShifts(
      tenantId, 
      storeId as string, // Pass undefined if not provided
      dateRange
    );

    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// ==================== ATTENDANCE & CLOCK-IN ====================

// POST /api/hr/attendance/clock-in - Record employee clock-in with shift validation
router.post('/attendance/clock-in', requirePermission('hr.timbrature.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId, storeId, clockInTime, location } = req.body;
    
    if (!tenantId || !userId || !storeId) {
      return res.status(400).json({ error: 'Tenant ID, user ID, and store ID are required' });
    }

    const clockIn = clockInTime ? new Date(clockInTime) : new Date();
    
    // Find shift assignment for this user at clock-in time
    // Must filter by time window to get the correct shift
    const assignments = await db.query.shiftAssignments.findMany({
      where: and(
        eq(shiftAssignments.tenantId, tenantId),
        eq(shiftAssignments.userId, userId),
        eq(shiftAssignments.status, 'assigned')
      ),
      with: {
        shift: true
      }
    });
    
    // Find the shift that covers the clock-in time
    const assignment = assignments.find(a => {
      if (!a.shift) return false;
      const shiftStart = new Date(a.shift.startTime);
      const shiftEnd = new Date(a.shift.endTime);
      const tolerance = (a.shift.clockInToleranceMinutes || 15) * 60 * 1000; // Convert to ms
      
      // Check if clock-in is within shift window + tolerance
      return clockIn.getTime() >= (shiftStart.getTime() - tolerance) && 
             clockIn.getTime() <= shiftEnd.getTime();
    });

    if (!assignment || !assignment.shift) {
      // No shift assigned - create anomaly
      const anomaly = await db.insert(attendanceAnomalies).values({
        tenantId,
        userId,
        storeId,
        anomalyType: 'no_shift_assigned',
        severity: 'high',
        actualValue: JSON.stringify({ clockInTime: clockIn, storeId }),
        detectedAt: new Date(),
        detectionMethod: 'automatic',
        resolutionStatus: 'pending'
      }).returning();

      return res.status(400).json({
        success: false,
        error: 'No shift assigned for this time',
        anomaly: anomaly[0]
      });
    }

    const shift = assignment.shift;
    
    // Validate store match
    if (shift.storeId !== storeId) {
      const anomaly = await db.insert(attendanceAnomalies).values({
        tenantId,
        userId,
        shiftId: shift.id,
        storeId,
        attendanceId: null,
        anomalyType: 'wrong_store',
        severity: 'critical',
        expectedValue: JSON.stringify({ storeId: shift.storeId }),
        actualValue: JSON.stringify({ storeId }),
        detectedAt: new Date(),
        detectionMethod: 'automatic',
        resolutionStatus: 'pending'
      }).returning();

      return res.status(400).json({
        success: false,
        error: 'Store mismatch - clocking in at wrong location',
        anomaly: anomaly[0]
      });
    }

    // Calculate time deviation
    const expectedStart = new Date(shift.startTime);
    const deviationMs = clockIn.getTime() - expectedStart.getTime();
    const deviationMinutes = Math.round(deviationMs / 60000);
    
    const tolerance = shift.clockInToleranceMinutes || 15;
    const isOnTime = Math.abs(deviationMinutes) <= tolerance;
    
    // Create attendance record
    const attendance = await db.insert(shiftAttendance).values({
      tenantId,
      assignmentId: assignment.id,
      attendanceStatus: isOnTime ? 'present' : (deviationMinutes > 0 ? 'late' : 'early'),
      scheduledStartTime: expectedStart,
      scheduledEndTime: new Date(shift.endTime),
      actualStartTime: clockIn,
      startDeviationMinutes: deviationMinutes,
      scheduledMinutes: Math.round((new Date(shift.endTime).getTime() - expectedStart.getTime()) / 60000),
      isOnTime,
      isCompliantDuration: true,
      requiresApproval: !isOnTime,
      clockInLocation: location,
      isLocationCompliant: true,
      processingStatus: 'processed'
    }).returning();

    // If late or early beyond tolerance, create anomaly
    if (!isOnTime) {
      await db.insert(attendanceAnomalies).values({
        tenantId,
        attendanceId: attendance[0].id,
        userId,
        shiftId: shift.id,
        storeId,
        anomalyType: deviationMinutes > 0 ? 'late_clock_in' : 'early_clock_in',
        severity: Math.abs(deviationMinutes) > tolerance * 2 ? 'high' : 'medium',
        expectedValue: JSON.stringify({ time: expectedStart, toleranceMinutes: tolerance }),
        actualValue: JSON.stringify({ time: clockIn }),
        deviationMinutes: Math.abs(deviationMinutes),
        detectedAt: new Date(),
        detectionMethod: 'automatic',
        resolutionStatus: 'pending',
        notifiedSupervisor: false
      });
    }

    res.json({
      success: true,
      attendance: attendance[0],
      validation: {
        isOnTime,
        deviationMinutes,
        toleranceMinutes: tolerance,
        requiresApproval: !isOnTime
      },
      shift: {
        id: shift.id,
        name: shift.name,
        expectedStart: expectedStart,
        expectedEnd: shift.endTime
      }
    });
  } catch (error) {
    console.error('Error recording clock-in:', error);
    res.status(500).json({ error: 'Failed to record clock-in' });
  }
});

// GET /api/hr/attendance/anomalies - Get attendance anomalies with filters
router.get('/attendance/anomalies', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, userId, status, severity, startDate, endDate } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [eq(attendanceAnomalies.tenantId, tenantId)];
    
    if (storeId) {
      conditions.push(eq(attendanceAnomalies.storeId, storeId as string));
    }
    if (userId) {
      conditions.push(eq(attendanceAnomalies.userId, userId as string));
    }
    if (status) {
      conditions.push(eq(attendanceAnomalies.resolutionStatus, status as string));
    }
    if (severity) {
      conditions.push(eq(attendanceAnomalies.severity, severity as string));
    }

    const anomalies = await db.query.attendanceAnomalies.findMany({
      where: and(...conditions),
      with: {
        user: {
          columns: { id: true, firstName: true, lastName: true, email: true }
        },
        store: {
          columns: { id: true, nome: true }
        },
        attendance: true
      },
      orderBy: (anomalies, { desc }) => [desc(anomalies.detectedAt)],
      limit: 100
    });

    const summary = {
      total: anomalies.length,
      bySeverity: {
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      },
      byStatus: {
        pending: anomalies.filter(a => a.resolutionStatus === 'pending').length,
        acknowledged: anomalies.filter(a => a.resolutionStatus === 'acknowledged').length,
        resolved: anomalies.filter(a => a.resolutionStatus === 'resolved').length
      },
      byType: anomalies.reduce((acc, a) => {
        acc[a.anomalyType] = (acc[a.anomalyType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({
      success: true,
      anomalies,
      summary
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// POST /api/hr/attendance/anomalies/:id/resolve - Resolve an anomaly with action
router.post('/attendance/anomalies/:id/resolve', requirePermission('hr.timbrature.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: anomalyId } = req.params;
    const { resolution, notes } = req.body;
    const resolvedBy = req.headers['x-user-id'] as string;
    
    if (!tenantId || !anomalyId) {
      return res.status(400).json({ error: 'Tenant ID and Anomaly ID are required' });
    }
    
    if (!resolution || !['justify', 'sanction', 'dismiss'].includes(resolution)) {
      return res.status(400).json({ error: 'Valid resolution type is required (justify, sanction, dismiss)' });
    }
    
    // Get current anomaly
    const existingAnomaly = await db.select()
      .from(attendanceAnomalies)
      .where(and(
        eq(attendanceAnomalies.id, anomalyId),
        eq(attendanceAnomalies.tenantId, tenantId)
      ))
      .limit(1);
    
    if (existingAnomaly.length === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    
    if (existingAnomaly[0].resolutionStatus === 'resolved') {
      return res.status(400).json({ error: 'Anomaly is already resolved' });
    }
    
    // Update anomaly with resolution
    const updated = await db.update(attendanceAnomalies)
      .set({
        resolutionStatus: 'resolved',
        resolutionNotes: notes || `Resolution type: ${resolution}`,
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || null
      })
      .where(and(
        eq(attendanceAnomalies.id, anomalyId),
        eq(attendanceAnomalies.tenantId, tenantId)
      ))
      .returning();
    
    // If resolution is 'sanction', log it for employee record
    if (resolution === 'sanction') {
      console.log(`[HR] Sanction applied to anomaly ${anomalyId} for user ${existingAnomaly[0].userId}`);
      // TODO: Create employee sanction record in future iteration
    }
    
    res.json({
      success: true,
      anomaly: updated[0],
      resolution,
      message: resolution === 'justify' ? 'Anomalia giustificata con successo' :
               resolution === 'sanction' ? 'Sanzione applicata con successo' :
               'Anomalia archiviata con successo'
    });
  } catch (error) {
    console.error('Error resolving anomaly:', error);
    res.status(500).json({ error: 'Failed to resolve anomaly' });
  }
});

// POST /api/hr/clock-entries/validate - Pre-validate clock entry before recording
// Returns potential anomalies without creating records
router.post('/clock-entries/validate', requirePermission('hr.timbrature.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId, storeId, clockTime, entryType = 'clock_in' } = req.body;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID are required' });
    }
    
    const clockTimestamp = clockTime ? new Date(clockTime) : new Date();
    const warnings: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      expectedValue?: any;
      actualValue?: any;
    }> = [];
    
    let isValid = true;
    let shiftInfo: any = null;
    
    // Find shift assignment for this user on this date
    const dateStr = clockTimestamp.toISOString().split('T')[0];
    const assignments = await db.select({
      id: shiftAssignments.id,
      shiftId: shiftAssignments.shiftId,
      status: shiftAssignments.status,
      shift: {
        id: shifts.id,
        storeId: shifts.storeId,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        name: shifts.name
      }
    })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(and(
        eq(shiftAssignments.tenantId, tenantId),
        eq(shiftAssignments.userId, userId),
        eq(shifts.date, dateStr),
        inArray(shiftAssignments.status, ['assigned', 'confirmed'])
      ));
    
    // 1. CHECK: No shift assigned
    if (assignments.length === 0) {
      warnings.push({
        type: 'no_shift_assigned',
        severity: 'high',
        message: 'Nessun turno assegnato per questa data. La timbratura verrà registrata come anomalia.',
        expectedValue: 'Turno assegnato',
        actualValue: 'Nessun turno'
      });
      isValid = false;
    } else {
      const assignment = assignments[0];
      shiftInfo = {
        shiftId: assignment.shift.id,
        shiftName: assignment.shift.name,
        storeId: assignment.shift.storeId,
        expectedStartTime: assignment.shift.startTime,
        expectedEndTime: assignment.shift.endTime
      };
      
      // 2. CHECK: Wrong store
      if (storeId && assignment.shift.storeId !== storeId) {
        warnings.push({
          type: 'wrong_store',
          severity: 'high',
          message: 'Stai timbrando in un PDV diverso da quello assegnato per il turno.',
          expectedValue: assignment.shift.storeId,
          actualValue: storeId
        });
        isValid = false;
      }
      
      // 3. CHECK: Clock-in timing (for clock_in type)
      if (entryType === 'clock_in' && assignment.shift.startTime) {
        const expectedStart = new Date(assignment.shift.startTime);
        const deviationMs = clockTimestamp.getTime() - expectedStart.getTime();
        const deviationMinutes = Math.round(deviationMs / 60000);
        const tolerance = 15; // Default tolerance
        
        if (Math.abs(deviationMinutes) > tolerance) {
          if (deviationMinutes > 0) {
            warnings.push({
              type: 'late_clock_in',
              severity: deviationMinutes > 30 ? 'high' : 'medium',
              message: `Ingresso in ritardo di ${deviationMinutes} minuti rispetto all'orario previsto.`,
              expectedValue: expectedStart.toISOString(),
              actualValue: clockTimestamp.toISOString()
            });
            if (deviationMinutes > 30) isValid = false;
          } else {
            warnings.push({
              type: 'early_clock_in',
              severity: 'low',
              message: `Ingresso anticipato di ${Math.abs(deviationMinutes)} minuti rispetto all'orario previsto.`,
              expectedValue: expectedStart.toISOString(),
              actualValue: clockTimestamp.toISOString()
            });
          }
        }
      }
      
      // 4. CHECK: Clock-out timing (for clock_out type)
      if (entryType === 'clock_out' && assignment.shift.endTime) {
        const expectedEnd = new Date(assignment.shift.endTime);
        const deviationMs = clockTimestamp.getTime() - expectedEnd.getTime();
        const deviationMinutes = Math.round(deviationMs / 60000);
        
        if (deviationMinutes < -30) {
          warnings.push({
            type: 'early_clock_out',
            severity: 'high',
            message: `Uscita anticipata di ${Math.abs(deviationMinutes)} minuti rispetto all'orario previsto.`,
            expectedValue: expectedEnd.toISOString(),
            actualValue: clockTimestamp.toISOString()
          });
          isValid = false;
        } else if (deviationMinutes > 120) {
          warnings.push({
            type: 'excessive_overtime',
            severity: 'medium',
            message: `Uscita con ${deviationMinutes} minuti di straordinario. Verificare con il responsabile.`,
            expectedValue: expectedEnd.toISOString(),
            actualValue: clockTimestamp.toISOString()
          });
        }
      }
    }
    
    // 5. CHECK: Double clock-in (check existing attendance for today)
    if (entryType === 'clock_in') {
      const existingAttendance = await db.select()
        .from(shiftAttendance)
        .where(and(
          eq(shiftAttendance.tenantId, tenantId),
          eq(shiftAttendance.userId, userId),
          eq(sql`DATE(${shiftAttendance.actualStartTime})`, dateStr),
          isNull(shiftAttendance.actualEndTime)
        ))
        .limit(1);
      
      if (existingAttendance.length > 0) {
        warnings.push({
          type: 'double_clock_in',
          severity: 'critical',
          message: 'Esiste già una timbratura di ingresso attiva per oggi senza uscita. Registra prima l\'uscita.',
          expectedValue: 'Nessuna timbratura attiva',
          actualValue: 'Timbratura attiva presente'
        });
        isValid = false;
      }
    }
    
    // 6. CHECK: Clock-out without clock-in
    if (entryType === 'clock_out') {
      const activeSession = await db.select()
        .from(shiftAttendance)
        .where(and(
          eq(shiftAttendance.tenantId, tenantId),
          eq(shiftAttendance.userId, userId),
          eq(sql`DATE(${shiftAttendance.actualStartTime})`, dateStr),
          isNull(shiftAttendance.actualEndTime)
        ))
        .limit(1);
      
      if (activeSession.length === 0) {
        warnings.push({
          type: 'clock_out_without_clock_in',
          severity: 'critical',
          message: 'Nessuna timbratura di ingresso attiva per oggi. Contattare il responsabile.',
          expectedValue: 'Timbratura ingresso attiva',
          actualValue: 'Nessuna timbratura'
        });
        isValid = false;
      }
    }
    
    // Determine overall validation status
    const validationStatus = isValid ? 'valid' : (
      warnings.some(w => w.severity === 'critical') ? 'blocked' :
      warnings.some(w => w.severity === 'high') ? 'warning_high' : 'warning'
    );
    
    res.json({
      success: true,
      isValid,
      validationStatus,
      clockTime: clockTimestamp.toISOString(),
      entryType,
      shiftInfo,
      warnings,
      summary: {
        totalWarnings: warnings.length,
        criticalCount: warnings.filter(w => w.severity === 'critical').length,
        highCount: warnings.filter(w => w.severity === 'high').length,
        canProceed: validationStatus !== 'blocked'
      }
    });
  } catch (error) {
    console.error('Error validating clock entry:', error);
    res.status(500).json({ error: 'Failed to validate clock entry' });
  }
});

// GET /api/hr/attendance/store-coverage - Get store coverage analysis
router.get('/attendance/store-coverage', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, date } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build WHERE clause for shifts
    const whereConditions = [
      eq(shifts.tenantId, tenantId),
      gte(shifts.startTime, startOfDay),
      lte(shifts.endTime, endOfDay)
    ];

    // Add store filter if not 'all'
    if (storeId && storeId !== 'all') {
      whereConditions.push(eq(shifts.storeId, storeId as string));
    }

    // Query shifts with assignment counts using raw SQL
    // WORKAROUND: Drizzle ORM has issues with UUID/VARCHAR joins in LEFT JOIN syntax
    // Using raw SQL query for reliability
    const storeFilter = (storeId && storeId !== 'all') ? `AND s.store_id = '${storeId}'` : '';
    
    const shiftsData = await db.execute(sql`
      SELECT 
        s.id,
        s.store_id as "storeId",
        s.name,
        s.start_time as "startTime",
        s.end_time as "endTime",
        s.required_staff as "requiredStaff",
        s.status,
        COUNT(sa.id)::integer as "assignedCount"
      FROM w3suite.shifts s
      LEFT JOIN w3suite.shift_assignments sa 
        ON sa.shift_id = s.id::text 
        AND sa.tenant_id = ${tenantId}
      WHERE s.tenant_id = ${tenantId}
        AND s.start_time >= ${startOfDay}
        AND s.end_time <= ${endOfDay}
        ${sql.raw(storeFilter)}
      GROUP BY s.id, s.store_id, s.name, s.start_time, s.end_time, s.required_staff, s.status
    `);

    // Calculate coverage metrics
    const coverage = shiftsData.map(shift => {
      const coverageRate = shift.requiredStaff > 0 
        ? (shift.assignedCount / shift.requiredStaff) * 100 
        : 0;
      
      return {
        shiftId: shift.id,
        storeId: shift.storeId,
        shiftName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        requiredStaff: shift.requiredStaff,
        assignedStaff: shift.assignedCount,
        coverageRate: Math.round(coverageRate),
        status: coverageRate >= 100 ? 'fully_staffed' : coverageRate >= 75 ? 'adequate' : 'critical'
      };
    });

    // Calculate summary statistics
    const totalShifts = coverage.length;
    const averageCoverageRate = totalShifts > 0
      ? Math.round(coverage.reduce((sum, s) => sum + s.coverageRate, 0) / totalShifts)
      : 0;
    const criticalShifts = coverage.filter(s => s.status === 'critical').length;
    const fullyStaffed = coverage.filter(s => s.status === 'fully_staffed').length;

    const summary = {
      totalShifts,
      averageCoverageRate,
      criticalShifts,
      fullyStaffed
    };

    res.json({
      success: true,
      date: targetDate,
      coverage,
      summary
    });
  } catch (error) {
    console.error('Error fetching store coverage:', error);
    res.status(500).json({ error: 'Failed to fetch store coverage' });
  }
});

// GET /api/hr/coverage/monthly - Get monthly coverage data with day×hour heatmap
router.get('/coverage/monthly', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { month, year, storeId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Parse month/year or use current
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    // Calculate start and end of month
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Build store filter
    const storeFilter = (storeId && storeId !== 'all') ? `AND s.store_id = '${storeId}'` : '';
    
    // Query all shifts for the month with assignment counts
    const shiftsData = await db.execute(sql`
      SELECT 
        s.id,
        s.store_id as "storeId",
        st.nome as "storeName",
        s.name,
        s.start_time as "startTime",
        s.end_time as "endTime",
        s.required_staff as "requiredStaff",
        s.status,
        COUNT(sa.id)::integer as "assignedCount"
      FROM w3suite.shifts s
      LEFT JOIN w3suite.stores st ON st.id = s.store_id AND st.tenant_id = ${tenantId}
      LEFT JOIN w3suite.shift_assignments sa 
        ON sa.shift_id = s.id::text 
        AND sa.tenant_id = ${tenantId}
        AND sa.status NOT IN ('cancelled', 'override')
      WHERE s.tenant_id = ${tenantId}
        AND s.start_time >= ${startOfMonth}
        AND s.end_time <= ${endOfMonth}
        ${sql.raw(storeFilter)}
      GROUP BY s.id, s.store_id, st.nome, s.name, s.start_time, s.end_time, s.required_staff, s.status
      ORDER BY s.start_time
    `);

    // Build day×hour heatmap matrix (days × 24 hours)
    const heatmapMatrix: { day: number; hour: number; coverage: number; shifts: number; details: any[] }[][] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData: { day: number; hour: number; coverage: number; shifts: number; details: any[] }[] = [];
      for (let hour = 0; hour < 24; hour++) {
        dayData.push({ day, hour, coverage: 0, shifts: 0, details: [] });
      }
      heatmapMatrix.push(dayData);
    }

    // Process each shift
    const allShifts: any[] = [];
    (shiftsData as any[]).forEach((shift: any) => {
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      const coverageRate = shift.requiredStaff > 0 
        ? (shift.assignedCount / shift.requiredStaff) * 100 
        : 0;
      
      const shiftInfo = {
        shiftId: shift.id,
        storeId: shift.storeId,
        storeName: shift.storeName || 'N/A',
        shiftName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        requiredStaff: shift.requiredStaff,
        assignedStaff: shift.assignedCount,
        coverageRate: Math.round(coverageRate),
        status: coverageRate >= 100 ? 'fully_staffed' : coverageRate >= 75 ? 'adequate' : 'critical',
        date: startTime.toISOString().split('T')[0]
      };
      allShifts.push(shiftInfo);
      
      // Add to heatmap for each hour the shift covers
      const day = startTime.getDate();
      const startHour = startTime.getHours();
      const endHour = endTime.getHours() === 0 ? 24 : endTime.getHours();
      
      if (day >= 1 && day <= daysInMonth) {
        for (let hour = startHour; hour < endHour && hour < 24; hour++) {
          const cell = heatmapMatrix[day - 1][hour];
          cell.shifts++;
          cell.details.push({
            shiftName: shift.name,
            storeName: shift.storeName,
            coverageRate: Math.round(coverageRate)
          });
          // Average coverage for the cell
          const totalCoverage = cell.details.reduce((sum: number, d: any) => sum + d.coverageRate, 0);
          cell.coverage = Math.round(totalCoverage / cell.details.length);
        }
      }
    });

    // Flatten heatmap for easy consumption
    const heatmapFlat = heatmapMatrix.flatMap((dayRow, dayIndex) => 
      dayRow.map(cell => ({
        day: dayIndex + 1,
        hour: cell.hour,
        coverage: cell.coverage,
        shiftsCount: cell.shifts,
        hasData: cell.shifts > 0
      }))
    );

    // Aggregate by hour (for 24-hour summary view)
    const hourlyAggregate = Array.from({ length: 24 }, (_, hour) => {
      const cellsForHour = heatmapMatrix.map(dayRow => dayRow[hour]).filter(c => c.shifts > 0);
      const avgCoverage = cellsForHour.length > 0
        ? Math.round(cellsForHour.reduce((sum, c) => sum + c.coverage, 0) / cellsForHour.length)
        : 0;
      const totalShifts = cellsForHour.reduce((sum, c) => sum + c.shifts, 0);
      return { hour, coverage: avgCoverage, shifts: totalShifts };
    });

    // Calculate summary KPIs
    const totalShifts = allShifts.length;
    const averageCoverageRate = totalShifts > 0
      ? Math.round(allShifts.reduce((sum, s) => sum + s.coverageRate, 0) / totalShifts)
      : 0;
    const criticalShifts = allShifts.filter(s => s.status === 'critical').length;
    const fullyStaffed = allShifts.filter(s => s.status === 'fully_staffed').length;

    res.json({
      success: true,
      month: targetMonth,
      year: targetYear,
      daysInMonth,
      heatmap: heatmapFlat,
      hourlyAggregate,
      shifts: allShifts,
      summary: {
        totalShifts,
        averageCoverageRate,
        criticalShifts,
        fullyStaffed,
        adequateShifts: allShifts.filter(s => s.status === 'adequate').length
      }
    });
  } catch (error) {
    console.error('Error fetching monthly coverage:', error);
    res.status(500).json({ error: 'Failed to fetch monthly coverage' });
  }
});

// GET /api/hr/attendance/logs - Get attendance/timbrature records with filters
router.get('/attendance/logs', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, userId, date, status } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build filters
    const filters = [
      eq(shiftAttendance.tenantId, tenantId),
      gte(shiftAttendance.scheduledStartTime, startOfDay),
      lte(shiftAttendance.scheduledEndTime, endOfDay)
    ];

    if (storeId) filters.push(eq(shiftAttendance.storeId, storeId as string));
    if (userId) filters.push(eq(shiftAttendance.userId, userId as string));
    if (status) filters.push(eq(shiftAttendance.attendanceStatus, status as string));

    const records = await db.query.shiftAttendance.findMany({
      where: and(...filters),
      with: {
        user: {
          columns: { id: true, firstName: true, lastName: true }
        },
        store: {
          columns: { id: true, nome: true }
        }
      },
      orderBy: (shiftAttendance, { desc }) => [desc(shiftAttendance.scheduledStartTime)]
    });

    res.json({
      success: true,
      records,
      total: records.length
    });
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    res.status(500).json({ error: 'Failed to fetch attendance logs' });
  }
});

// ==================== HR REQUEST IMPACT ANALYSIS ====================

// GET /api/hr/requests/:id/impact - Calculate impact of HR request before approval
router.get('/requests/:id/impact', requirePermission('hr.requests.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    // Fetch the universal request
    const [request] = await db.select()
      .from(universalRequests)
      .where(and(
        eq(universalRequests.id, id),
        eq(universalRequests.tenantId, tenantId)
      ))
      .limit(1);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Only calculate impact for leave requests with dates
    if (request.department !== 'hr' || request.category !== 'leave' || !request.startDate || !request.endDate) {
      return res.json({
        success: true,
        hasImpact: false,
        message: 'Request type does not have shift impact'
      });
    }
    
    const startDateStr = new Date(request.startDate).toISOString().split('T')[0];
    const endDateStr = new Date(request.endDate).toISOString().split('T')[0];
    const requestData = request.requestData as any || {};
    
    // Get requester info
    const [requester] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName
    })
      .from(users)
      .where(eq(users.id, request.requesterId))
      .limit(1);
    
    // Find all conflicting shift assignments
    const conflictingAssignments = await db.select({
      assignmentId: shiftAssignments.id,
      shiftId: shifts.id,
      shiftDate: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      storeId: shifts.storeId,
      storeName: stores.nome,
      status: shiftAssignments.status
    })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .leftJoin(stores, eq(shifts.storeId, stores.id))
      .where(and(
        eq(shiftAssignments.tenantId, tenantId),
        eq(shiftAssignments.userId, request.requesterId),
        gte(shifts.date, startDateStr),
        lte(shifts.date, endDateStr),
        inArray(shiftAssignments.status, ['assigned', 'confirmed'])
      ))
      .orderBy(shifts.date, shifts.startTime);
    
    // Calculate coverage gaps per store/day
    const coverageGaps: Array<{
      storeId: string;
      storeName: string;
      date: string;
      startTime: string;
      endTime: string;
      hoursUncovered: number;
    }> = [];
    
    // Calculate total hours impacted
    let totalHoursImpacted = 0;
    
    conflictingAssignments.forEach(assignment => {
      if (assignment.startTime && assignment.endTime) {
        const start = parseInt(assignment.startTime.split(':')[0]) * 60 + parseInt(assignment.startTime.split(':')[1] || '0');
        const end = parseInt(assignment.endTime.split(':')[0]) * 60 + parseInt(assignment.endTime.split(':')[1] || '0');
        const hours = (end - start) / 60;
        totalHoursImpacted += hours;
        
        coverageGaps.push({
          storeId: assignment.storeId,
          storeName: assignment.storeName || 'Unknown',
          date: assignment.shiftDate,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          hoursUncovered: hours
        });
      }
    });
    
    // Determine impact severity
    let impactSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (conflictingAssignments.length === 0) {
      impactSeverity = 'none';
    } else if (conflictingAssignments.length <= 2) {
      impactSeverity = 'low';
    } else if (conflictingAssignments.length <= 5) {
      impactSeverity = 'medium';
    } else if (conflictingAssignments.length <= 10) {
      impactSeverity = 'high';
    } else {
      impactSeverity = 'critical';
    }
    
    // Generate summary message
    const leaveTypeLabels: Record<string, string> = {
      'vacation': 'Ferie',
      'sick_leave': 'Malattia',
      'personal_leave': 'Permesso personale',
      'training': 'Formazione'
    };
    const leaveTypeLabel = leaveTypeLabels[requestData.leaveType] || 'Richiesta HR';
    
    const requesterName = `${requester?.firstName || ''} ${requester?.lastName || ''}`.trim() || 'Dipendente';
    const impactSummary = conflictingAssignments.length === 0 
      ? `Nessun turno in conflitto con la richiesta di ${leaveTypeLabel}`
      : `Approvando questa richiesta, ${conflictingAssignments.length} turni di ${requesterName} saranno automaticamente messi in stato OVERRIDE. Totale ${totalHoursImpacted.toFixed(1)} ore impattate.`;
    
    res.json({
      success: true,
      hasImpact: conflictingAssignments.length > 0,
      requestId: id,
      requester: {
        id: requester?.id,
        name: requesterName
      },
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
        leaveType: requestData.leaveType || 'leave',
        leaveTypeLabel
      },
      impact: {
        totalAssignmentsAffected: conflictingAssignments.length,
        totalHoursImpacted: Math.round(totalHoursImpacted * 10) / 10,
        severity: impactSeverity,
        summary: impactSummary,
        assignments: conflictingAssignments.map(a => ({
          assignmentId: a.assignmentId,
          shiftId: a.shiftId,
          date: a.shiftDate,
          startTime: a.startTime,
          endTime: a.endTime,
          storeName: a.storeName,
          status: a.status
        })),
        coverageGaps
      }
    });
  } catch (error) {
    console.error('Error calculating request impact:', error);
    res.status(500).json({ error: 'Failed to calculate request impact' });
  }
});

// ==================== HR REQUEST APPROVAL INTEGRATION ====================

// POST /api/hr/requests/:id/approve - Approve HR request and create resource availability block
router.post('/requests/:id/approve', requirePermission('hr.requests.approve'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { comments } = req.body;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID are required' });
    }
    
    // Fetch the universal request
    const [request] = await db.select()
      .from(universalRequests)
      .where(and(
        eq(universalRequests.id, id),
        eq(universalRequests.tenantId, tenantId)
      ))
      .limit(1);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.status === 'approved') {
      return res.status(400).json({ error: 'Request already approved' });
    }
    
    // Update approval chain
    const approvalChain = (request.approvalChain as any[]) || [];
    approvalChain.push({
      approverId: userId,
      status: 'approved',
      timestamp: new Date(),
      comments
    });
    
    // Update universal request to approved
    await db.update(universalRequests)
      .set({
        status: 'approved',
        approvalChain,
        completedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId
      })
      .where(eq(universalRequests.id, id));
    
    // If HR leave request with dates, create resource_availability block
    let overriddenAssignmentsCount = 0;
    
    if (request.department === 'hr' && request.category === 'leave' && request.startDate && request.endDate) {
      const requestData = request.requestData as any || {};
      const startDateStr = new Date(request.startDate).toISOString().split('T')[0];
      const endDateStr = new Date(request.endDate).toISOString().split('T')[0];
      
      await db.insert(resourceAvailability).values({
        tenantId,
        userId: request.requesterId,
        startDate: startDateStr,
        endDate: endDateStr,
        availabilityStatus: requestData.leaveType || 'vacation',
        reasonType: 'approved_leave',
        reasonDescription: request.description || '',
        leaveRequestId: request.id,
        isFullDay: requestData.isFullDay ?? true,
        startTime: requestData.startTime ? new Date(requestData.startTime) : null,
        endTime: requestData.endTime ? new Date(requestData.endTime) : null,
        approvalStatus: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        blocksShiftAssignment: true, // ✅ Task 12: Block shift assignments
        showInSchedule: true,
        notes: comments || request.notes || '',
        createdBy: userId
      });
      
      // ==================== AUTOMATIC OVERRIDE SYSTEM ====================
      // Find and override all shift assignments for the user during the leave period
      const leaveTypeLabels: Record<string, string> = {
        'vacation': 'Ferie approvate',
        'sick_leave': 'Malattia',
        'personal_leave': 'Permesso personale',
        'training': 'Formazione'
      };
      const overrideReason = leaveTypeLabels[requestData.leaveType] || 'Richiesta HR approvata';
      
      // Get all shifts in the period for this user
      const conflictingShifts = await db.select({
        shiftId: shifts.id,
        shiftDate: shifts.date,
        assignmentId: shiftAssignments.id,
        assignmentStatus: shiftAssignments.status
      })
        .from(shiftAssignments)
        .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
        .where(and(
          eq(shiftAssignments.tenantId, tenantId),
          eq(shiftAssignments.userId, request.requesterId),
          gte(shifts.date, startDateStr),
          lte(shifts.date, endDateStr),
          // Only override active assignments (not already completed/cancelled)
          inArray(shiftAssignments.status, ['assigned', 'confirmed'])
        ));
      
      if (conflictingShifts.length > 0) {
        // Update all conflicting assignments to override status
        const assignmentIds = conflictingShifts.map(s => s.assignmentId);
        
        await db.update(shiftAssignments)
          .set({
            status: 'override',
            overrideReason,
            overrideRequestId: request.id,
            overrideAt: new Date(),
            overrideBy: userId,
            conflictReasons: [{ 
              type: requestData.leaveType || 'leave', 
              severity: 'block', 
              message: overrideReason,
              period: `${startDateStr} - ${endDateStr}`
            }],
            updatedAt: new Date()
          })
          .where(inArray(shiftAssignments.id, assignmentIds));
        
        overriddenAssignmentsCount = conflictingShifts.length;
        
        console.log(`[HR-APPROVAL] Overridden ${overriddenAssignmentsCount} shift assignments for user ${request.requesterId} due to approved leave request ${request.id}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Request approved successfully',
      requestId: id,
      overriddenAssignments: overriddenAssignmentsCount
    });
  } catch (error) {
    console.error('Error approving HR request:', error);
    res.status(500).json({ error: 'Failed to approve HR request' });
  }
});

// ==================== RESOURCE AVAILABILITY FOR PLANNING ====================

// GET /api/hr/resources/availability - Get blocking availability for resources in a period
router.get('/resources/availability', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { resourceIds, startDate, endDate, storeId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Parse resource IDs if provided
    const resourceIdList = resourceIds ? (resourceIds as string).split(',') : null;

    // Build query for blocking availability
    const availabilityQuery = db.select({
      id: resourceAvailability.id,
      userId: resourceAvailability.userId,
      startDate: resourceAvailability.startDate,
      endDate: resourceAvailability.endDate,
      availabilityStatus: resourceAvailability.availabilityStatus,
      reasonType: resourceAvailability.reasonType,
      reasonDescription: resourceAvailability.reasonDescription,
      leaveRequestId: resourceAvailability.leaveRequestId,
      isFullDay: resourceAvailability.isFullDay,
      blocksShiftAssignment: resourceAvailability.blocksShiftAssignment,
      approvalStatus: resourceAvailability.approvalStatus
    })
      .from(resourceAvailability)
      .where(and(
        eq(resourceAvailability.tenantId, tenantId),
        eq(resourceAvailability.blocksShiftAssignment, true),
        eq(resourceAvailability.approvalStatus, 'approved'),
        lte(resourceAvailability.startDate, endDate as string),
        gte(resourceAvailability.endDate, startDate as string),
        ...(resourceIdList ? [inArray(resourceAvailability.userId, resourceIdList)] : [])
      ));

    const availability = await availabilityQuery;

    // Group by resource for easier frontend consumption
    const byResource: Record<string, typeof availability> = {};
    availability.forEach(a => {
      if (!byResource[a.userId]) {
        byResource[a.userId] = [];
      }
      byResource[a.userId].push(a);
    });

    // Create status labels for UI
    const statusLabels: Record<string, string> = {
      'vacation': 'Ferie',
      'sick_leave': 'Malattia',
      'personal_leave': 'Permesso',
      'training': 'Formazione',
      'unavailable': 'Non disponibile',
      'restricted': 'Restrizioni'
    };

    // Generate summary for each resource
    const resourceSummary = Object.entries(byResource).map(([userId, items]) => ({
      userId,
      totalBlocks: items.length,
      periods: items.map(item => ({
        id: item.id,
        type: item.availabilityStatus,
        label: statusLabels[item.availabilityStatus] || item.availabilityStatus,
        startDate: item.startDate,
        endDate: item.endDate,
        isFullDay: item.isFullDay,
        reason: item.reasonDescription
      }))
    }));

    res.json({
      success: true,
      availability: resourceSummary,
      totalResourcesWithBlocks: resourceSummary.length,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching resource availability:', error);
    res.status(500).json({ error: 'Failed to fetch resource availability' });
  }
});

// ==================== PLANNING WORKSPACE ====================

// GET /api/hr/shifts/planning - Get existing planning with assignments for store/period
router.get('/shifts/planning', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { storeId, startDate, endDate } = req.query;
    
    console.log('[PLANNING-API] ========== LOADING EXISTING PLANNING ==========');
    console.log('[PLANNING-API] Headers:', { tenantId: req.headers['x-tenant-id'] });
    console.log('[PLANNING-API] Query params:', { storeId, startDate, endDate });
    
    if (!tenantId) {
      console.log('[PLANNING-API] ERROR: Missing tenant ID');
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!storeId || !startDate || !endDate) {
      console.log('[PLANNING-API] ERROR: Missing required params');
      return res.status(400).json({ error: 'Store ID, start date, and end date are required' });
    }

    // Get shifts for the period
    console.log('[PLANNING-API] Executing shifts query for store:', storeId);
    
    const shiftsData = await db.select()
      .from(shifts)
      .where(and(
        eq(shifts.tenantId, tenantId),
        eq(shifts.storeId, storeId as string),
        gte(shifts.date, startDate as string),
        lte(shifts.date, endDate as string)
      ));

    console.log('[PLANNING-API] Found shifts:', shiftsData.length);
    if (shiftsData.length > 0) {
      console.log('[PLANNING-API] First shift:', JSON.stringify(shiftsData[0]));
    }

    if (shiftsData.length === 0) {
      console.log('[PLANNING-API] No shifts found - returning empty planning');
      return res.json({
        exists: false,
        shifts: [],
        assignments: [],
        templates: []
      });
    }

    // Get shift IDs as strings for varchar comparison
    const shiftIds = shiftsData.map(s => String(s.id));
    console.log('[PLANNING-API] Shift IDs:', shiftIds);

    // Get assignments for these shifts with user info
    // Note: shiftAssignments.shiftId is varchar, so we compare as strings
    const assignmentsData = await db.select({
      id: shiftAssignments.id,
      shiftId: shiftAssignments.shiftId,
      userId: shiftAssignments.userId,
      timeSlotId: shiftAssignments.timeSlotId,
      status: shiftAssignments.status,
      assignedAt: shiftAssignments.assignedAt,
      userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      userEmail: users.email,
      userRole: users.role
    })
      .from(shiftAssignments)
      .leftJoin(users, eq(shiftAssignments.userId, users.id))
      .where(and(
        eq(shiftAssignments.tenantId, tenantId),
        inArray(shiftAssignments.shiftId, shiftIds)
      ));
    
    console.log('[PLANNING-API] Found assignments:', assignmentsData.length);

    // Get unique template IDs
    const templateIds = [...new Set(shiftsData.map(s => s.templateId).filter(Boolean))];
    
    // Get template info with time slots
    let templatesData: any[] = [];
    if (templateIds.length > 0) {
      const templates = await db.select()
        .from(shiftTemplates)
        .where(and(
          eq(shiftTemplates.tenantId, tenantId),
          inArray(shiftTemplates.id, templateIds as string[])
        ));
      
      // Get time slots for all templates
      const timeSlots = await db.select()
        .from(shiftTimeSlots)
        .where(and(
          eq(shiftTimeSlots.tenantId, tenantId),
          inArray(shiftTimeSlots.templateId, templateIds as string[])
        ))
        .orderBy(shiftTimeSlots.slotOrder);
      
      // Map time slots to templates
      templatesData = templates.map(t => ({
        ...t,
        timeSlots: timeSlots
          .filter(ts => ts.templateId === t.id)
          .map(ts => ({
            id: ts.id,
            name: ts.name,
            startTime: ts.startTime,
            endTime: ts.endTime,
            requiredStaff: ts.requiredStaff,
            color: ts.color
          }))
      }));
      
      console.log('[PLANNING-API] Templates with time slots:', templatesData.map(t => ({ 
        id: t.id, 
        name: t.name, 
        slotsCount: t.timeSlots?.length || 0 
      })));
    }

    res.json({
      exists: true,
      shifts: shiftsData,
      assignments: assignmentsData,
      templates: templatesData
    });
  } catch (error) {
    console.error('Error fetching shift planning:', error);
    res.status(500).json({ error: 'Failed to fetch shift planning' });
  }
});

// POST /api/hr/shifts/check-cross-store-conflicts - Check conflicts across all stores for a resource
router.post('/shifts/check-cross-store-conflicts', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId, date, startTime, endTime, excludeShiftId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!userId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'User ID, date, start time, and end time are required' });
    }

    // Parse times to minutes for comparison
    const parseTime = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    const reqStart = parseTime(startTime);
    const reqEnd = parseTime(endTime);

    // Find all shifts for this user on this date across ALL stores
    const userAssignments = await db.select({
      assignmentId: shiftAssignments.id,
      shiftId: shifts.id,
      storeId: shifts.storeId,
      storeName: stores.name,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      templateId: shifts.templateId
    })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .leftJoin(stores, eq(shifts.storeId, stores.id))
      .where(and(
        eq(shiftAssignments.tenantId, tenantId),
        eq(shiftAssignments.userId, userId),
        eq(shifts.date, date),
        excludeShiftId ? sql`${shifts.id} != ${excludeShiftId}` : sql`1=1`
      ));

    // Check for overlaps
    const conflicts: any[] = [];
    
    for (const assignment of userAssignments) {
      const shiftStart = assignment.startTime instanceof Date 
        ? assignment.startTime.getHours() * 60 + assignment.startTime.getMinutes()
        : parseTime(assignment.startTime as any);
      const shiftEnd = assignment.endTime instanceof Date
        ? assignment.endTime.getHours() * 60 + assignment.endTime.getMinutes()
        : parseTime(assignment.endTime as any);
      
      // Check overlap: (start1 < end2) && (end1 > start2)
      const hasOverlap = reqStart < shiftEnd && reqEnd > shiftStart;
      
      if (hasOverlap) {
        conflicts.push({
          shiftId: assignment.shiftId,
          storeId: assignment.storeId,
          storeName: assignment.storeName,
          date: assignment.date,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          overlapType: 'time_overlap',
          message: `Risorsa già assegnata a ${assignment.storeName} dalle ${shiftStart / 60 | 0}:${String(shiftStart % 60).padStart(2, '0')} alle ${shiftEnd / 60 | 0}:${String(shiftEnd % 60).padStart(2, '0')}`
        });
      }
    }

    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
      checkedAssignments: userAssignments.length
    });
  } catch (error) {
    console.error('Error checking cross-store conflicts:', error);
    res.status(500).json({ error: 'Failed to check cross-store conflicts' });
  }
});

// PUT /api/hr/shifts/assignments/:id - Update an existing assignment
router.put('/shifts/assignments/:id', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { userId, status, notes } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Verify assignment exists and belongs to tenant
    const [existing] = await db.select()
      .from(shiftAssignments)
      .where(and(
        eq(shiftAssignments.id, id),
        eq(shiftAssignments.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Update assignment
    const updateData: any = { updatedAt: new Date() };
    if (userId !== undefined) updateData.userId = userId;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db.update(shiftAssignments)
      .set(updateData)
      .where(eq(shiftAssignments.id, id))
      .returning();

    // Broadcast real-time update
    try {
      await webSocketService.broadcastShiftUpdate(tenantId, 'assignment_updated', {
        assignmentId: id,
        shiftId: updated.shiftId,
        changes: updateData
      });
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      assignment: updated
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// DELETE /api/hr/shifts/assignments/:id - Delete an assignment
router.delete('/shifts/assignments/:id', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Verify assignment exists and belongs to tenant
    const [existing] = await db.select()
      .from(shiftAssignments)
      .where(and(
        eq(shiftAssignments.id, id),
        eq(shiftAssignments.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Delete assignment
    await db.delete(shiftAssignments)
      .where(eq(shiftAssignments.id, id));

    // Broadcast real-time update
    try {
      await webSocketService.broadcastShiftUpdate(tenantId, 'assignment_deleted', {
        assignmentId: id,
        shiftId: existing.shiftId
      });
    } catch (wsError) {
      console.warn('WebSocket broadcast failed (non-blocking):', wsError);
    }

    res.json({
      success: true,
      deletedId: id
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// ============================================================================
// STORE & RESOURCE PLANNING CONTEXT ENDPOINTS
// ============================================================================

// GET /api/hr/stores/:id/planning-summary - Get store planning summary for date range
router.get('/stores/:id/planning-summary', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: storeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!tenantId || !storeId) {
      return res.status(400).json({ error: 'Tenant ID and Store ID are required' });
    }

    console.log('[HR-STORE-PLANNING] Query:', { tenantId, storeId, startDate, endDate });

    // Get all shifts for the store in the date range
    const shiftsQuery = db.select({
      id: shifts.id,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      requiredResources: shifts.requiredResources,
      templateId: shifts.templateId,
    })
    .from(shifts)
    .where(and(
      eq(shifts.tenantId, tenantId),
      eq(shifts.storeId, storeId)
    ))
    .orderBy(shifts.date, shifts.startTime);

    // Get all assignments for the store in the date range
    const assignmentsQuery = db.select({
      id: shiftAssignments.id,
      shiftId: shiftAssignments.shiftId,
      employeeId: shiftAssignments.employeeId,
      startTime: shiftAssignments.startTime,
      endTime: shiftAssignments.endTime,
      status: shiftAssignments.status,
      employeeName: users.fullName,
      employeeRole: users.role,
    })
    .from(shiftAssignments)
    .leftJoin(users, eq(shiftAssignments.employeeId, users.id))
    .leftJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
    .where(and(
      eq(shiftAssignments.tenantId, tenantId),
      eq(shifts.storeId, storeId)
    ))
    .orderBy(shiftAssignments.startTime);

    const [shiftsData, assignmentsData] = await Promise.all([shiftsQuery, assignmentsQuery]);

    // Calculate coverage metrics
    const totalShifts = shiftsData.length;
    const assignedShifts = new Set(assignmentsData.map(a => a.shiftId)).size;
    const totalRequiredResources = shiftsData.reduce((sum, s) => sum + (s.requiredResources || 1), 0);
    const totalAssignedResources = assignmentsData.length;
    const coveragePercentage = totalRequiredResources > 0 
      ? Math.round((totalAssignedResources / totalRequiredResources) * 100) 
      : 0;

    // Group by date for daily breakdown
    const dailyBreakdown = shiftsData.reduce((acc: any, shift) => {
      const dateKey = typeof shift.date === 'string' ? shift.date.split('T')[0] : shift.date;
      if (!acc[dateKey]) {
        acc[dateKey] = { 
          shifts: [], 
          assignments: [],
          requiredResources: 0,
          assignedResources: 0 
        };
      }
      acc[dateKey].shifts.push(shift);
      acc[dateKey].requiredResources += (shift.requiredResources || 1);
      return acc;
    }, {});

    // Add assignments to daily breakdown
    assignmentsData.forEach((assignment: any) => {
      const shift = shiftsData.find(s => s.id === assignment.shiftId);
      if (shift) {
        const dateKey = typeof shift.date === 'string' ? shift.date.split('T')[0] : shift.date;
        if (dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey].assignments.push(assignment);
          dailyBreakdown[dateKey].assignedResources++;
        }
      }
    });

    // Calculate gaps (shifts missing resources)
    const gaps = shiftsData.filter(shift => {
      const shiftAssignmentCount = assignmentsData.filter(a => a.shiftId === shift.id).length;
      return shiftAssignmentCount < (shift.requiredResources || 1);
    }).map(shift => ({
      shiftId: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      required: shift.requiredResources || 1,
      assigned: assignmentsData.filter(a => a.shiftId === shift.id).length,
      missing: (shift.requiredResources || 1) - assignmentsData.filter(a => a.shiftId === shift.id).length
    }));

    res.json({
      success: true,
      summary: {
        storeId,
        totalShifts,
        assignedShifts,
        totalRequiredResources,
        totalAssignedResources,
        coveragePercentage,
        gaps: gaps.length,
        gapDetails: gaps.slice(0, 10), // Top 10 gaps
      },
      dailyBreakdown,
      assignments: assignmentsData,
    });

  } catch (error) {
    console.error('Error getting store planning summary:', error);
    res.status(500).json({ error: 'Failed to get store planning summary' });
  }
});

// GET /api/hr/employees/:id/availability - Get employee availability for date range
router.get('/employees/:id/availability', requirePermission('hr.employees.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: employeeId } = req.params;
    const { startDate, endDate, weekStart, monthStart } = req.query;

    if (!tenantId || !employeeId) {
      return res.status(400).json({ error: 'Tenant ID and Employee ID are required' });
    }

    console.log('[HR-EMPLOYEE-AVAILABILITY] Query:', { tenantId, employeeId, startDate, endDate });

    // Get employee info
    const [employee] = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      storeId: users.storeId,
    })
    .from(users)
    .where(and(
      eq(users.id, employeeId),
      eq(users.tenantId, tenantId)
    ))
    .limit(1);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get all assignments for the employee
    const assignmentsQuery = db.select({
      id: shiftAssignments.id,
      shiftId: shiftAssignments.shiftId,
      startTime: shiftAssignments.startTime,
      endTime: shiftAssignments.endTime,
      status: shiftAssignments.status,
      shiftDate: shifts.date,
      storeId: shifts.storeId,
      storeName: stores.name,
    })
    .from(shiftAssignments)
    .leftJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
    .leftJoin(stores, eq(shifts.storeId, stores.id))
    .where(and(
      eq(shiftAssignments.tenantId, tenantId),
      eq(shiftAssignments.employeeId, employeeId)
    ))
    .orderBy(shifts.date, shiftAssignments.startTime);

    const assignmentsData = await assignmentsQuery;

    // Calculate hours worked
    const calculateHours = (assignments: any[]) => {
      return assignments.reduce((total, a) => {
        if (a.startTime && a.endTime) {
          const [startH, startM] = a.startTime.split(':').map(Number);
          const [endH, endM] = a.endTime.split(':').map(Number);
          const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
          return total + (hours > 0 ? hours : hours + 24); // Handle overnight shifts
        }
        return total;
      }, 0);
    };

    // Get current week assignments
    const now = new Date();
    const weekStartDate = weekStart ? new Date(weekStart as string) : new Date(now.setDate(now.getDate() - now.getDay() + 1));
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const weekAssignments = assignmentsData.filter(a => {
      const assignmentDate = new Date(a.shiftDate);
      return assignmentDate >= weekStartDate && assignmentDate <= weekEndDate;
    });

    // Get current month assignments
    const monthStartDate = monthStart ? new Date(monthStart as string) : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthAssignments = assignmentsData.filter(a => {
      const assignmentDate = new Date(a.shiftDate);
      return assignmentDate >= monthStartDate && assignmentDate <= monthEndDate;
    });

    // Get stores where employee has worked (cross-store history)
    const storeHistory = assignmentsData.reduce((acc: any, a) => {
      if (a.storeId && !acc[a.storeId]) {
        acc[a.storeId] = {
          storeId: a.storeId,
          storeName: a.storeName,
          shiftsCount: 0,
          lastWorked: a.shiftDate,
        };
      }
      if (a.storeId) {
        acc[a.storeId].shiftsCount++;
        if (new Date(a.shiftDate) > new Date(acc[a.storeId].lastWorked)) {
          acc[a.storeId].lastWorked = a.shiftDate;
        }
      }
      return acc;
    }, {});

    // Detect conflicts (same day, overlapping times)
    const conflicts: any[] = [];
    const assignmentsByDate = assignmentsData.reduce((acc: any, a) => {
      const dateKey = typeof a.shiftDate === 'string' ? a.shiftDate.split('T')[0] : a.shiftDate;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(a);
      return acc;
    }, {});

    Object.values(assignmentsByDate).forEach((dayAssignments: any) => {
      if (dayAssignments.length > 1) {
        for (let i = 0; i < dayAssignments.length; i++) {
          for (let j = i + 1; j < dayAssignments.length; j++) {
            const a1 = dayAssignments[i];
            const a2 = dayAssignments[j];
            // Check time overlap
            if (a1.startTime < a2.endTime && a2.startTime < a1.endTime) {
              conflicts.push({
                date: a1.shiftDate,
                assignment1: { id: a1.id, store: a1.storeName, time: `${a1.startTime}-${a1.endTime}` },
                assignment2: { id: a2.id, store: a2.storeName, time: `${a2.startTime}-${a2.endTime}` },
              });
            }
          }
        }
      }
    });

    // Busy days (days with assignments)
    const busyDays = [...new Set(assignmentsData.map(a => 
      typeof a.shiftDate === 'string' ? a.shiftDate.split('T')[0] : a.shiftDate
    ))];

    res.json({
      success: true,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        primaryStoreId: employee.storeId,
      },
      hours: {
        weeklyHours: Math.round(calculateHours(weekAssignments) * 10) / 10,
        monthlyHours: Math.round(calculateHours(monthAssignments) * 10) / 10,
        weekRange: { start: weekStartDate.toISOString().split('T')[0], end: weekEndDate.toISOString().split('T')[0] },
        monthRange: { start: monthStartDate.toISOString().split('T')[0], end: monthEndDate.toISOString().split('T')[0] },
      },
      assignments: {
        total: assignmentsData.length,
        thisWeek: weekAssignments.length,
        thisMonth: monthAssignments.length,
        list: assignmentsData.slice(0, 50), // Last 50 assignments
      },
      storeHistory: Object.values(storeHistory),
      conflicts,
      busyDays,
    });

  } catch (error) {
    console.error('Error getting employee availability:', error);
    res.status(500).json({ error: 'Failed to get employee availability' });
  }
});

export default router;