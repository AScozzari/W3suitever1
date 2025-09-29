import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/tenant';
import { hrStorage } from '../core/hr-storage';

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

// POST /api/hr/shifts/:id/assign - Assign user to specific shift
router.post('/shifts/:id/assign', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: shiftId } = req.params;
    const { userId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!shiftId || !userId) {
      return res.status(400).json({ error: 'Shift ID and User ID are required' });
    }

    // Assign user to shift using existing storage function
    const result = await hrStorage.assignUserToShift(tenantId, shiftId, userId);

    res.json({
      success: true,
      assignment: result
    });
  } catch (error) {
    console.error('Error assigning user to shift:', error);
    res.status(500).json({ error: 'Failed to assign user to shift' });
  }
});

// POST /api/hr/shifts/:id/unassign - Remove user from specific shift
router.post('/shifts/:id/unassign', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: shiftId } = req.params;
    const { userId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!shiftId || !userId) {
      return res.status(400).json({ error: 'Shift ID and User ID are required' });
    }

    // Remove user from shift using existing storage function
    const result = await hrStorage.unassignUserFromShift(tenantId, shiftId, userId);

    res.json({
      success: true,
      assignment: result
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

    // Process bulk assignments using new storage function
    const result = await hrStorage.bulkAssignShifts(tenantId, assignments);

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
router.get('/shift-templates', requirePermission('hr.shifts.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get shift templates using existing storage function
    const templates = await hrStorage.getShiftTemplates(tenantId);

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
router.put('/shift-templates/:id', requirePermission('hr.shifts.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id: templateId } = req.params;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const updateData = {
      ...req.body,
      updatedBy: userId,
      updatedAt: new Date()
    };

    // Update shift template using existing storage function
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

export default router;