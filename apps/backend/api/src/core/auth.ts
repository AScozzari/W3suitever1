/**
 * Simple JWT Authentication System for W3 Suite
 * Replaces OAuth2 with direct JWT tokens
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from '../db/schema/w3suite';
import { eq } from 'drizzle-orm';

// JWT Configuration
const JWT_SECRET_ENV = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'w3suite-dev-secret-2025');
if (!JWT_SECRET_ENV) {
  throw new Error('JWT_SECRET environment variable is required in production');
}
// Ensure JWT_SECRET is always defined after the check
const JWT_SECRET: string = JWT_SECRET_ENV;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Type definitions
interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  type: 'access' | 'refresh';
}

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}

// Demo users database (in production, this would be in the database)
const DEMO_USERS = [
  {
    id: 'admin-user',
    email: 'admin',
    username: 'admin',
    password: 'admin123', // In production, this would be hashed
    tenantId: '00000000-0000-0000-0000-000000000001',
    roles: ['admin', 'super_admin'],
    firstName: 'Admin',
    lastName: 'User'
  },
  {
    id: 'demo-user-1',
    email: 'marco.rossi@w3demo.com',
    username: 'marco.rossi@w3demo.com',
    password: 'password123',
    tenantId: '00000000-0000-0000-0000-000000000001',
    roles: ['user'],
    firstName: 'Marco',
    lastName: 'Rossi'
  },
  {
    id: 'demo-user-2',
    email: 'giulia.bianchi@w3demo.com',
    username: 'giulia.bianchi@w3demo.com',
    password: 'password123',
    tenantId: '00000000-0000-0000-0000-000000000001',
    roles: ['user'],
    firstName: 'Giulia',
    lastName: 'Bianchi'
  }
];

/**
 * Find user by username/email and verify password
 */
async function findUserByCredentials(username: string, password: string) {
  // First try demo users
  const demoUser = DEMO_USERS.find(u => 
    u.username === username || u.email === username
  );
  
  if (demoUser && demoUser.password === password) {
    return {
      id: demoUser.id,
      email: demoUser.email,
      tenantId: demoUser.tenantId,
      roles: demoUser.roles,
      firstName: demoUser.firstName,
      lastName: demoUser.lastName
    };
  }
  
  // Try database (if available)
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, username))
      .limit(1);
    
    if (user) {
      // For demo, accept the demo passwords
      const validPassword = DEMO_USERS.find(u => u.email === user.email)?.password || 'password123';
      
      if (password === validPassword) {
        return {
          id: user.id,
          email: user.email || username,
          tenantId: user.tenantId || '00000000-0000-0000-0000-000000000001',
          roles: user.role ? [user.role] : ['user'],
          firstName: user.firstName || '',
          lastName: user.lastName || ''
        };
      }
    }
  } catch (error) {
    console.log('Database query failed, falling back to demo users');
  }
  
  return null;
}

/**
 * Generate JWT access token
 */
function generateAccessToken(user: any): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    roles: user.roles,
    type: 'access'
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'w3suite',
    subject: user.id
  });
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(user: any): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    roles: user.roles,
    type: 'refresh'
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'w3suite',
    subject: user.id
  });
}

/**
 * Login endpoint - authenticate and return JWT
 */
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Username and password are required'
      });
    }
    
    // Find and verify user
    const user = await findUserByCredentials(username, password);
    
    if (!user) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
    
    // Return access token and user info
    return res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
        firstName: user.firstName,
        lastName: user.lastName
      },
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'An error occurred during login'
    });
  }
}

/**
 * Refresh token endpoint - get new access token
 */
export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'no_refresh_token',
        message: 'No refresh token provided'
      });
    }
    
    // Verify refresh token
    let payload: JWTPayload;
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      payload = decoded as JWTPayload;
    } catch (error) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid or expired refresh token'
      });
    }
    
    // Check token type
    if (payload.type !== 'refresh') {
      return res.status(401).json({
        error: 'invalid_token_type',
        message: 'Invalid token type'
      });
    }
    
    // Generate new access token
    const user = {
      id: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles
    };
    
    const accessToken = generateAccessToken(user);
    
    // Return new access token
    return res.json({
      success: true,
      accessToken,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error: any) {
    console.error('Refresh error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'An error occurred during token refresh'
    });
  }
}

/**
 * Get current user endpoint
 */
export async function getMe(req: AuthRequest, res: Response) {
  try {
    // User is set by authenticateJWT middleware
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Not authenticated'
      });
    }
    
    // Return user info
    return res.json({
      id: req.user.userId,
      email: req.user.email,
      tenantId: req.user.tenantId,
      roles: req.user.roles
    });
  } catch (error: any) {
    console.error('GetMe error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'An error occurred while fetching user info'
    });
  }
}

/**
 * Logout endpoint - clear refresh token
 */
export async function logout(req: Request, res: Response) {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'An error occurred during logout'
    });
  }
}

/**
 * JWT Authentication Middleware
 */
export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Skip authentication for public endpoints
    const publicPaths = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];
    if (publicPaths.includes(req.path)) {
      return next();
    }
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({
        error: 'no_token',
        message: 'No authentication token provided'
      });
    }
    
    // Verify token
    let payload: JWTPayload;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      payload = decoded as JWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'token_expired',
          message: 'Token has expired'
        });
      }
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid token'
      });
    }
    
    // Check token type
    if (payload.type !== 'access') {
      return res.status(401).json({
        error: 'invalid_token_type',
        message: 'Invalid token type'
      });
    }
    
    // Set user on request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles
    };
    
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Authentication error'
    });
  }
}

/**
 * Optional JWT Authentication Middleware (doesn't fail if no token)
 */
export function optionalAuthenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const payload = decoded as JWTPayload;
      
      if (payload.type === 'access') {
        req.user = {
          userId: payload.userId,
          email: payload.email,
          tenantId: payload.tenantId,
          roles: payload.roles
        };
      }
    } catch (error) {
      // Ignore token errors for optional auth
      console.log('Optional auth: Invalid token, continuing without auth');
    }
    
    next();
  } catch (error: any) {
    console.error('Optional auth middleware error:', error);
    next();
  }
}