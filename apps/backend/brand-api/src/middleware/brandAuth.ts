import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

export interface BrandUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  workspace?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      brandUser?: BrandUser;
    }
  }
}

/**
 * Brand Authentication Middleware
 * Validates JWT tokens for Brand Interface users
 */
export const brandAuthMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    const tokenFromCookie = req.cookies?.['brand-auth-token'];
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authentication token provided' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Validate Brand user scope
    if (decoded.scope !== 'brand-admin') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Brand Interface access required' 
      });
    }

    // Create Brand user object
    const brandUser: BrandUser = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'admin',
      permissions: decoded.permissions || ['*'],
      workspace: decoded.workspace
    };

    // Attach to request
    req.brandUser = brandUser;
    
    next();
  } catch (error) {
    console.error('Brand authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication token is malformed' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Authentication token has expired' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal authentication error' 
    });
  }
};

/**
 * Check if user has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.brandUser;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin has all permissions
    if (user.permissions.includes('*')) {
      return next();
    }
    
    // Check specific permission
    if (!user.permissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission 
      });
    }
    
    next();
  };
};

/**
 * Check if user has access to specific workspace
 */
export const requireWorkspace = (workspace: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.brandUser;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin has all workspace access
    if (user.permissions.includes('*')) {
      return next();
    }
    
    // Check workspace access
    if (user.workspace && user.workspace !== workspace) {
      return res.status(403).json({ 
        error: 'Workspace access denied',
        required: workspace,
        current: user.workspace 
      });
    }
    
    next();
  };
};