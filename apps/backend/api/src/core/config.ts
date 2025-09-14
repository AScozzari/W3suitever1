/**
 * W3 Suite Core Configuration
 * Centralized configuration for authentication and system settings
 */

// Initialize JWT_SECRET with proper fallback and warnings
function initializeJwtSecret(): string {
  let secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set. Using default for development only.');
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    
    // Only in development - use fallback secret
    secret = "w3suite-dev-secret-2025";
    process.env.JWT_SECRET = secret;
    
    console.log('🔑 Using development JWT secret for authentication');
  }

  return secret;
}

const JWT_SECRET: string = initializeJwtSecret();

// Export centralized configuration
export const config = {
  // Authentication & JWT
  JWT_SECRET,
  
  // OAuth2 Configuration
  OAUTH2_ISSUER: process.env.OAUTH2_ISSUER || 'https://auth.w3suite.com',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Tenant Configuration
  DEMO_TENANT_ID: '00000000-0000-0000-0000-000000000001',
} as const;

// Export JWT_SECRET for backward compatibility
export { JWT_SECRET };

// Log configuration status
console.log('✅ Core configuration initialized');
console.log(`🌍 Environment: ${config.NODE_ENV}`);
console.log(`🔑 JWT Secret: ${JWT_SECRET ? 'SET' : 'NOT SET'}`);