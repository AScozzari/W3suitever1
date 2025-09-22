/**
 * LEGACY ROUTES: Leave Requests Compatibility Layer
 * FASE 2.3: Backward compatibility endpoints for leaveRequests API
 * 
 * These routes maintain API compatibility while proxying to universalRequests
 * Includes deprecation warnings and migration guidance
 */

import { Router } from 'express';
import { z } from 'zod';
import { compatibilityLayer } from '../core/compatibility-layer';
import { validateRequestBody } from '../core/error-utils';

const router = Router();

// ==========================================
// LEGACY LEAVE REQUESTS SCHEMAS
// ==========================================

const createLeaveRequestSchema = z.object({
  leaveType: z.string(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  totalDays: z.number().positive(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  coveredBy: z.string().optional(),
  storeId: z.string().optional()
});

const updateLeaveRequestSchema = createLeaveRequestSchema.partial();

const leaveRequestFiltersSchema = z.object({
  status: z.string().optional(),
  leaveType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional()
});

// ==========================================
// DEPRECATION MIDDLEWARE
// ==========================================

const addDeprecationHeaders = (req: any, res: any, next: any) => {
  compatibilityLayer.addDeprecationHeaders(res, '/api/universal/requests?category=HR&type=leave');
  
  // Log usage for monitoring
  console.warn(`🚨 Legacy Leave API used: ${req.method} ${req.path} by tenant ${req.user?.tenantId}`);
  
  next();
};

// ==========================================
// LEGACY LEAVE REQUESTS ROUTES
// ==========================================

/**
 * GET /api/leave/requests (LEGACY)
 * Get leave requests with legacy format
 */
router.get('/', 
  addDeprecationHeaders,
  // Simple validation removed for compatibility
  async (req: any, res: any) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { status, leaveType, page = 1, limit = 50 } = req.query;
      
      // Get requests via compatibility layer
      const requests = await compatibilityLayer.getLegacyLeaveRequests(
        tenantId,
        userId, // Filter by current user for security
        { status, leaveType }
      );
      
      // Simple pagination (for compatibility)
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRequests = requests.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: {
          requests: paginatedRequests,
          total: requests.length,
          page,
          limit,
          hasMore: endIndex < requests.length
        },
        meta: {
          deprecated: true,
          deprecationNotice: 'This endpoint is deprecated. Use /api/universal/requests?category=HR&type=leave instead.',
          migrationGuide: 'https://docs.w3suite.com/migration/universal-requests'
        }
      });
      
    } catch (error) {
      console.error('Legacy Leave requests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Leave requests',
        deprecated: true
      });
    }
  }
);

/**
 * GET /api/leave/requests/:id (LEGACY)
 * Get single leave request by ID
 */
router.get('/:id',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;
      
      const request = await compatibilityLayer.getLegacyLeaveRequestById(tenantId, id);
      
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Leave request not found',
          deprecated: true
        });
      }
      
      res.json({
        success: true,
        data: request,
        meta: {
          deprecated: true,
          deprecationNotice: 'This endpoint is deprecated. Use /api/universal/requests/:id instead.'
        }
      });
      
    } catch (error) {
      console.error('Legacy Leave request by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Leave request',
        deprecated: true
      });
    }
  }
);

/**
 * POST /api/leave/requests (LEGACY)
 * Create new leave request
 */
router.post('/',
  addDeprecationHeaders,
  // Simple validation removed for compatibility
  async (req: any, res: any) => {
    try {
      const { tenantId, id: userId } = req.user;
      const requestData = {
        ...req.body,
        userId,
        tenantId
      };
      
      const created = await compatibilityLayer.createLegacyLeaveRequest(tenantId, requestData);
      
      res.status(201).json({
        success: true,
        data: created,
        meta: {
          deprecated: true,
          deprecationNotice: 'This endpoint is deprecated. Use POST /api/universal/requests instead.',
          created: true
        }
      });
      
    } catch (error) {
      console.error('Legacy Leave request creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create Leave request',
        deprecated: true
      });
    }
  }
);

/**
 * PUT /api/leave/requests/:id (LEGACY)
 * Update leave request - LIMITED COMPATIBILITY
 */
router.put('/:id',
  addDeprecationHeaders,
  // Simple validation removed for compatibility
  async (req: any, res: any) => {
    try {
      // For now, return deprecation notice
      res.status(422).json({
        success: false,
        error: 'Legacy update not supported',
        deprecated: true,
        message: 'Please use the Universal Requests API for updates: PUT /api/universal/requests/:id'
      });
      
    } catch (error) {
      console.error('Legacy Leave request update error:', error);
      res.status(500).json({
        success: false,
        error: 'Update operation not supported in legacy mode',
        deprecated: true
      });
    }
  }
);

/**
 * DELETE /api/leave/requests/:id (LEGACY)
 * Delete leave request - LIMITED COMPATIBILITY
 */
router.delete('/:id',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      res.status(422).json({
        success: false,
        error: 'Legacy delete not supported',
        deprecated: true,
        message: 'Please use the Universal Requests API for deletion: DELETE /api/universal/requests/:id'
      });
      
    } catch (error) {
      console.error('Legacy Leave request delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Delete operation not supported in legacy mode',
        deprecated: true
      });
    }
  }
);

// ==========================================
// LEGACY APPROVAL ENDPOINTS
// ==========================================

/**
 * POST /api/leave/requests/:id/approve (LEGACY)
 * Approve leave request
 */
router.post('/:id/approve',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      res.status(422).json({
        success: false,
        error: 'Legacy approval not supported',
        deprecated: true,
        message: 'Please use the Universal Requests API for approvals: POST /api/universal/requests/:id/approve'
      });
      
    } catch (error) {
      console.error('Legacy Leave request approval error:', error);
      res.status(500).json({
        success: false,
        error: 'Approval operation not supported in legacy mode',
        deprecated: true
      });
    }
  }
);

/**
 * POST /api/leave/requests/:id/reject (LEGACY)
 * Reject leave request
 */
router.post('/:id/reject',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      res.status(422).json({
        success: false,
        error: 'Legacy rejection not supported',
        deprecated: true,
        message: 'Please use the Universal Requests API for rejections: POST /api/universal/requests/:id/reject'
      });
      
    } catch (error) {
      console.error('Legacy Leave request rejection error:', error);
      res.status(500).json({
        success: false,
        error: 'Rejection operation not supported in legacy mode',
        deprecated: true
      });
    }
  }
);

// ==========================================
// LEAVE-SPECIFIC ENDPOINTS
// ==========================================

/**
 * GET /api/leave/calendar (LEGACY)
 * Get leave calendar view
 */
router.get('/calendar',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.user;
      
      // Get all approved/pending leave requests for calendar view
      const requests = await compatibilityLayer.getLegacyLeaveRequests(
        tenantId,
        undefined, // All users for calendar view
        { status: 'approved' }
      );
      
      // Transform to calendar format
      const calendarEvents = requests.map(req => ({
        id: req.id,
        title: `${req.leaveType} - ${req.userId}`,
        start: req.startDate,
        end: req.endDate,
        type: 'leave',
        status: req.status,
        user: req.userId
      }));
      
      res.json({
        success: true,
        data: calendarEvents,
        meta: {
          deprecated: true,
          deprecationNotice: 'This endpoint is deprecated. Use /api/hr/calendar/events instead.'
        }
      });
      
    } catch (error) {
      console.error('Legacy Leave calendar error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leave calendar',
        deprecated: true
      });
    }
  }
);

// ==========================================
// MIGRATION GUIDANCE ENDPOINT
// ==========================================

/**
 * GET /api/leave/requests/migration-guide
 * Provide migration guidance
 */
router.get('/migration-guide',
  async (req: any, res: any) => {
    res.json({
      deprecated: true,
      migration: {
        from: 'Leave Requests API',
        to: 'Universal Requests API',
        endpoints: {
          'GET /api/leave/requests': 'GET /api/universal/requests?category=HR&type=leave',
          'GET /api/leave/requests/:id': 'GET /api/universal/requests/:id',
          'POST /api/leave/requests': 'POST /api/universal/requests',
          'PUT /api/leave/requests/:id': 'PUT /api/universal/requests/:id',
          'DELETE /api/leave/requests/:id': 'DELETE /api/universal/requests/:id',
          'GET /api/leave/calendar': 'GET /api/hr/calendar/events'
        },
        dataMapping: {
          leaveType: 'requestSubtype',
          userId: 'requesterId',
          reason: 'description',
          notes: 'requestData.notes',
          totalDays: 'requestData.totalDays',
          coveredBy: 'requestData.coveredBy'
        },
        benefits: [
          'Unified API across all request types',
          'Enhanced workflow integration', 
          'Better performance and security',
          'Advanced filtering and search',
          'Calendar integration'
        ],
        timeline: {
          deprecationDate: '2025-09-22',
          endOfLifeDate: '2025-12-31',
          status: 'COMPATIBILITY_MODE'
        }
      }
    });
  }
);

export default router;