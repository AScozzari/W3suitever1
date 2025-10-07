/**
 * Session Absolute Timeout Middleware
 * 🔒 SECURITY POLICY: Enforces 8-hour absolute session timeout
 * 
 * This middleware works in conjunction with Express session's 15-minute idle timeout
 * to provide dual-layer session security:
 * - Idle Timeout: 15 minutes of inactivity (handled by express-session rolling)
 * - Absolute Timeout: 8 hours maximum session duration (handled here)
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../core/config.js';

// Extend Express session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    createdAt?: number;  // Timestamp when session was created
    userId?: string;
    email?: string;
  }
}

/**
 * Middleware that enforces absolute session timeout
 * Should be applied after express-session middleware but before protected routes
 */
export function sessionAbsoluteTimeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip for public routes or if no session exists
  if (!req.session || !req.session.userId) {
    return next();
  }

  const now = Date.now();
  
  // Initialize session creation timestamp on first authenticated request
  if (!req.session.createdAt) {
    req.session.createdAt = now;
    console.log(`[SESSION-TIMEOUT] 🕐 New session started for user ${req.session.userId}`);
    return next();
  }

  // Check if session has exceeded absolute timeout (8 hours)
  const sessionAge = now - req.session.createdAt;
  const isExpired = sessionAge > config.ABSOLUTE_TIMEOUT_MS;

  if (isExpired) {
    const sessionAgeHours = Math.floor(sessionAge / (60 * 60 * 1000));
    const sessionAgeMinutes = Math.floor((sessionAge % (60 * 60 * 1000)) / (60 * 1000));
    
    console.warn(
      `[SESSION-TIMEOUT] ⏰ Absolute timeout exceeded for user ${req.session.userId} ` +
      `(session age: ${sessionAgeHours}h ${sessionAgeMinutes}m, limit: 8h)`
    );

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('[SESSION-TIMEOUT] ❌ Error destroying expired session:', err);
      }
    });

    // Return 401 Unauthorized with clear message
    return res.status(401).json({
      error: 'Session expired',
      message: 'Your session has exceeded the maximum duration of 8 hours. Please log in again.',
      code: 'ABSOLUTE_TIMEOUT_EXCEEDED'
    });
  }

  // Log session age periodically (every hour)
  const sessionAgeHours = Math.floor(sessionAge / (60 * 60 * 1000));
  const lastLoggedHour = Math.floor((req.session.createdAt || 0) / (60 * 60 * 1000));
  const currentHour = Math.floor(now / (60 * 60 * 1000));
  
  if (currentHour > lastLoggedHour && sessionAgeHours > 0) {
    const remainingHours = Math.floor((config.ABSOLUTE_TIMEOUT_MS - sessionAge) / (60 * 60 * 1000));
    console.log(
      `[SESSION-TIMEOUT] ⏱️  User ${req.session.userId} session active for ${sessionAgeHours}h ` +
      `(${remainingHours}h remaining)`
    );
  }

  // Session is valid, continue
  next();
}
