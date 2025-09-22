/**
 * LEGACY ROUTES: HR Requests Compatibility Layer
 * FASE 2.3: Backward compatibility endpoints for hrRequests API
 * 
 * These routes maintain API compatibility while proxying to universalRequests
 * Includes deprecation warnings and migration guidance
 */

import { Router } from 'express';
import { z } from 'zod';
import { compatibilityLayer } from '../core/compatibility-layer';
const router = Router();

// ==========================================
// DEPRECATION MIDDLEWARE
// ==========================================

const addDeprecationHeaders = (req: any, res: any, next: any) => {
  compatibilityLayer.addDeprecationHeaders(res, '/api/universal/requests');
  
  // Log usage for monitoring
  console.warn(`🚨 Legacy HR API used: ${req.method} ${req.path} by tenant ${req.user?.tenantId}`);
  
  next();
};

// ==========================================
// LEGACY HR REQUESTS ROUTES
// ==========================================

/**
 * GET /api/hr/requests (LEGACY)
 * Get HR requests with legacy format
 */
router.get('/', 
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { status, category, type, page = 1, limit = 50 } = req.query;
      
      // Get requests via compatibility layer
      const requests = await compatibilityLayer.getLegacyHrRequests(
        tenantId,
        userId, // Filter by current user for security
        { status, category, type }
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
          deprecationNotice: 'This endpoint is deprecated. Use /api/universal/requests instead.',
          migrationGuide: 'https://docs.w3suite.com/migration/universal-requests'
        }
      });
      
    } catch (error) {
      console.error('Legacy HR requests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch HR requests',
        deprecated: true
      });
    }
  }
);

/**
 * GET /api/hr/requests/:id (LEGACY)
 * Get single HR request by ID
 */
router.get('/:id',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;
      
      const request = await compatibilityLayer.getLegacyHrRequestById(tenantId, id);
      
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'HR request not found',
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
      console.error('Legacy HR request by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch HR request',
        deprecated: true
      });
    }
  }
);

/**
 * POST /api/hr/requests (LEGACY)
 * Create new HR request
 */
router.post('/',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      const { tenantId, id: userId } = req.user;
      const requestData = {
        ...req.body,
        requesterId: userId,
        tenantId
      };
      
      const created = await compatibilityLayer.createLegacyHrRequest(tenantId, requestData);
      
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
      console.error('Legacy HR request creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create HR request',
        deprecated: true
      });
    }
  }
);

/**
 * PUT /api/hr/requests/:id (LEGACY)
 * Update HR request - LIMITED COMPATIBILITY
 */
router.put('/:id',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      // For now, return deprecation notice
      // Full update implementation would require more complex mapping
      res.status(422).json({
        success: false,
        error: 'Legacy update not supported',
        deprecated: true,
        message: 'Please use the Universal Requests API for updates: PUT /api/universal/requests/:id'
      });
      
    } catch (error) {
      console.error('Legacy HR request update error:', error);
      res.status(500).json({
        success: false,
        error: 'Update operation not supported in legacy mode',
        deprecated: true
      });
    }
  }
);

/**
 * DELETE /api/hr/requests/:id (LEGACY)
 * Delete HR request - LIMITED COMPATIBILITY
 */
router.delete('/:id',
  addDeprecationHeaders,
  async (req: any, res: any) => {
    try {
      // For now, return deprecation notice
      res.status(422).json({
        success: false,
        error: 'Legacy delete not supported',
        deprecated: true,
        message: 'Please use the Universal Requests API for deletion: DELETE /api/universal/requests/:id'
      });
      
    } catch (error) {
      console.error('Legacy HR request delete error:', error);
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
 * POST /api/hr/requests/:id/approve (LEGACY)
 * Approve HR request
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
      console.error('Legacy HR request approval error:', error);
      res.status(500).json({
        success: false,
        error: 'Approval operation not supported in legacy mode',
        deprecated: true
      });
    }
  }
);

/**
 * POST /api/hr/requests/:id/reject (LEGACY)
 * Reject HR request
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
      console.error('Legacy HR request rejection error:', error);
      res.status(500).json({
        success: false,
        error: 'Rejection operation not supported in legacy mode',
        deprecated: true
      });
    }
  }
);

// ==========================================
// MIGRATION GUIDANCE ENDPOINT
// ==========================================

/**
 * GET /api/hr/requests/migration-guide
 * Provide migration guidance
 */
router.get('/migration-guide',
  async (req: any, res: any) => {
    res.json({
      deprecated: true,
      migration: {
        from: 'HR Requests API',
        to: 'Universal Requests API',
        endpoints: {
          'GET /api/hr/requests': 'GET /api/universal/requests?category=HR',
          'GET /api/hr/requests/:id': 'GET /api/universal/requests/:id',
          'POST /api/hr/requests': 'POST /api/universal/requests',
          'PUT /api/hr/requests/:id': 'PUT /api/universal/requests/:id',
          'DELETE /api/hr/requests/:id': 'DELETE /api/universal/requests/:id'
        },
        benefits: [
          'Unified API across all request types',
          'Enhanced workflow integration',
          'Better performance and security',
          'Advanced filtering and search',
          'Real-time notifications'
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