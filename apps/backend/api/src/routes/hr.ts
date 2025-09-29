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
    const template = await hrStorage.createShiftTemplate(tenantId, templateData);

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
    const template = await hrStorage.updateShiftTemplate(tenantId, templateId, updateData);

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