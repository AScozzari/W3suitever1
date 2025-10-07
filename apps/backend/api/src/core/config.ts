/**
 * W3 Suite Core Configuration
 * Centralized configuration for authentication and system settings
 */

// Initialize JWT_SECRET with proper fallback and warnings
function initializeJwtSecret(): string {
  let secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('🚨 CRITICAL SECURITY: JWT_SECRET environment variable is not set. Using default for development only.');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ PRODUCTION DEPLOYMENT BLOCKED: JWT_SECRET must be set for production');
      console.error('💡 Set a strong JWT_SECRET environment variable with at least 32 characters');
      console.error('💥 FAILING FAST to prevent security breach');
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    
    // Only in development - use fallback secret
    secret = "w3suite-dev-secret-2025-fallback-insecure";
    process.env.JWT_SECRET = secret;
    
    console.log('⚠️  Using INSECURE development JWT secret for authentication');
    console.log('🔧 Set JWT_SECRET environment variable for secure authentication');
  } else {
    // Validate JWT secret strength
    if (secret.length < 32) {
      console.warn('⚠️  JWT_SECRET should be at least 32 characters for security');
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ PRODUCTION SECURITY ERROR: JWT_SECRET too short for production use');
        console.error('💥 FAILING FAST to prevent weak authentication');
        throw new Error('JWT_SECRET must be at least 32 characters in production');
      }
    }
    
    if (secret === "w3suite-dev-secret-2025" || secret === "w3suite-dev-secret-2025-fallback-insecure") {
      console.error('🚨 CRITICAL: Using default/fallback JWT_SECRET in production is FORBIDDEN');
      if (process.env.NODE_ENV === 'production') {
        console.error('💥 FAILING FAST to prevent security breach');
        throw new Error('Default JWT_SECRET values are not allowed in production');
      }
    }
    
    console.log('✅ JWT_SECRET properly configured');
  }

  return secret;
}

const JWT_SECRET: string = initializeJwtSecret();

// Export centralized configuration
export const config = {
  // Authentication & JWT
  JWT_SECRET,
  
  // Authentication Mode Configuration  
  // SECURITY FIX: Restore environment-driven authentication
  AUTH_MODE: process.env.AUTH_MODE || 'development',
  
  // OAuth2 Configuration
  OAUTH2_ISSUER: process.env.OAUTH2_ISSUER || 'https://auth.w3suite.com',
  
  // ==================== SESSION TIMEOUT CONFIGURATION ====================
  // 🔒 SECURITY POLICY: 15-minute idle timeout, 8-hour absolute timeout
  
  // Session timeouts (milliseconds)
  IDLE_TIMEOUT_MS: 15 * 60 * 1000,              // 15 minutes idle timeout
  ABSOLUTE_TIMEOUT_MS: 8 * 60 * 60 * 1000,      // 8 hours absolute timeout
  TOKEN_REFRESH_THRESHOLD_MS: 12 * 60 * 1000,   // Auto-refresh at 12 minutes
  
  // OAuth2 Token Expiry (seconds - used by OAuth2 server)
  ACCESS_TOKEN_EXPIRY_SEC: 15 * 60,             // 15 minutes for access tokens
  REFRESH_TOKEN_EXPIRY_SEC: 7 * 24 * 60 * 60,   // 7 days for refresh tokens
  
  // Development mode token expiry (seconds)
  DEV_TOKEN_EXPIRY_SEC: 15 * 60,                // 15 minutes in development
  
  // ==================== END SESSION CONFIGURATION ====================
  
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
console.log(`🔐 Auth Mode: ${config.AUTH_MODE}`);
console.log(`🔑 JWT Secret: ${JWT_SECRET ? 'SET' : 'NOT SET'}`);