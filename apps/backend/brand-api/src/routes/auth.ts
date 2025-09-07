import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

// Seed super admin user (for development)
const SUPER_ADMIN = {
  id: 'brand-super-admin',
  email: 'admin@w3suite.com',
  name: 'Super Administrator', 
  role: 'super-admin',
  passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // "admin123"
};

/**
 * POST /api/brand/auth/login
 * Brand Interface login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email and password are required' 
      });
    }

    // For now, use seed super admin
    // TODO: Replace with actual user lookup from brand_users table
    if (email !== SUPER_ADMIN.email) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'User not found' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, SUPER_ADMIN.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Incorrect password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign({
      sub: SUPER_ADMIN.id,
      email: SUPER_ADMIN.email,
      name: SUPER_ADMIN.name,
      role: SUPER_ADMIN.role,
      scope: 'brand-admin',
      permissions: ['*'], // All permissions
      workspace: 'marketing', // Default workspace
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }, JWT_SECRET);

    // Set secure cookie
    res.cookie('brand-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user info (no token in response for security)
    res.json({
      user: {
        id: SUPER_ADMIN.id,
        email: SUPER_ADMIN.email,
        name: SUPER_ADMIN.name,
        role: SUPER_ADMIN.role,
        permissions: ['*'],
        workspace: 'marketing'
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Brand login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'Internal server error' 
    });
  }
});

/**
 * POST /api/brand/auth/logout
 * Brand Interface logout
 */
router.post('/logout', (req, res) => {
  // Clear auth cookie
  res.clearCookie('brand-auth-token');
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/brand/auth/me
 * Get current brand user info
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.['brand-auth-token'];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'No authentication token found' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    res.json({
      user: {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        permissions: decoded.permissions,
        workspace: decoded.workspace
      }
    });

  } catch (error) {
    console.error('Brand auth check error:', error);
    res.status(401).json({ 
      error: 'Invalid token',
      message: 'Authentication failed' 
    });
  }
});

export { router as authRoutes };