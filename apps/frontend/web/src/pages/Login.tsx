import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/AuthService';

interface LoginProps {
  tenantCode?: string;
}

/**
 * W3 Suite JWT Login Component
 * Direct authentication with JWT tokens
 */
export default function Login({ tenantCode: propTenantCode }: LoginProps = {}) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tenant information
  const tenantInfo: Record<string, { name: string, color: string }> = {
    'w3suite': { name: 'W3 Suite Enterprise', color: '#FF6900' },
    'staging': { name: 'W3 Suite Staging', color: '#FF6900' },
    'demo': { name: 'Demo Organization', color: '#FF6900' },
    'acme': { name: 'Acme Corporation', color: '#0066CC' },
    'tech': { name: 'Tech Solutions Ltd', color: '#10B981' }
  };
  
  const currentTenant = tenantInfo[propTenantCode || 'w3suite'] || tenantInfo['w3suite'];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Direct JWT login
      const response = await authService.login(username, password);
      
      if (response.success) {
        // Store user info for quick access
        localStorage.setItem('user_info', JSON.stringify(response.user));
        
        // Redirect to dashboard after successful login
        const tenantCode = propTenantCode || 'w3suite';
        window.location.href = `/${tenantCode}/dashboard`;
      } else {
        setError('Login failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid username or password');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      
      {/* Main Login Container */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {/* Header Section */}
        <div style={{ 
          padding: '32px',
          textAlign: 'center',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#FF6900',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            W3 Suite
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 12px 0'
          }}>
            Enterprise Multi-Tenant Platform
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: '32px' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '24px' }}>
            {/* Username Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>Username</label>
              <div style={{
                position: 'relative',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #d1d5db'
              }}>
                <User style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#111827'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>Password</label>
              <div style={{
                position: 'relative',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #d1d5db'
              }}>
                <Lock style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#9ca3af'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#111827'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '18px', height: '18px', color: '#9ca3af' }} />
                  ) : (
                    <Eye style={{ width: '18px', height: '18px', color: '#9ca3af' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isLoading ? '#94a3b8' : '#FF6900',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>

          {/* Demo Credentials */}
          <div style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            marginTop: '20px'
          }}>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              marginBottom: '8px',
              fontWeight: '600'
            }}>Demo Credentials:</p>
            <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '18px' }}>
              <div>Admin: <span style={{ fontFamily: 'monospace', color: '#374151' }}>admin / admin123</span></div>
              <div>User: <span style={{ fontFamily: 'monospace', color: '#374151' }}>marco.rossi@w3demo.com / password123</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '32px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          © 2025 W3 Suite. All rights reserved.
        </p>
      </div>
    </div>
  );
}