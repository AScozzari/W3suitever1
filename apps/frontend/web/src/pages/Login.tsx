import { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock } from 'lucide-react';

interface LoginProps {
  tenantCode?: string;
}

export default function Login({ tenantCode: propTenantCode }: LoginProps = {}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Mappa dei tenant disponibili
  const tenantInfo: Record<string, { name: string, color: string }> = {
    'staging': { name: 'Staging Environment', color: '#7B2CBF' },
    'demo': { name: 'Demo Organization', color: '#FF6900' },
    'acme': { name: 'Acme Corporation', color: '#0066CC' },
    'tech': { name: 'Tech Solutions Ltd', color: '#10B981' }
  };
  
  const currentTenant = tenantInfo[propTenantCode || 'staging'] || tenantInfo['staging'];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Inserisci nome utente e password');
      return;
    }
    
    const tenantFromPath = propTenantCode || 'staging';
    setIsLoading(true);
    
    try {
      const tenantMapping: Record<string, string> = {
        'staging': '00000000-0000-0000-0000-000000000001',
        'demo': '99999999-9999-9999-9999-999999999999',
        'acme': '11111111-1111-1111-1111-111111111111',
        'tech': '22222222-2222-2222-2222-222222222222'
      };
      
      const tenantId = tenantMapping[tenantFromPath] || '00000000-0000-0000-0000-000000000001';
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tenantCode: tenantFromPath,
          username: email.split('@')[0] || 'admin', 
          password: password 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // OAuth2 response structure - handle both access_token (OAuth2) and token (legacy)
        localStorage.setItem('auth_token', data.access_token || data.token);
        localStorage.setItem('currentTenantId', tenantId);
        console.log('OAuth2 login successful:', {
          tokenType: data.token_type,
          expiresIn: data.expires_in,
          scope: data.scope,
          user: data.user
        });
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || 'Credenziali non valide');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Errore durante il login. Riprova.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 25%, 97%), hsl(210, 30%, 95%))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: '120px',
        height: '120px',
        background: 'hsla(210, 100%, 85%, 0.3)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        animation: 'float 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '100px',
        height: '100px',
        background: 'hsla(220, 60%, 90%, 0.4)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        animation: 'float 10s ease-in-out infinite reverse'
      }} />

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px) saturate(120%)',
        WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        position: 'relative'
      }}>
        {/* Inner glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)',
          borderRadius: '20px',
          pointerEvents: 'none'
        }} />
        <div style={{ 
          padding: isMobile ? '32px 24px' : '48px 40px',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            {/* Logo */}
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              W3
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 8px 0'
            }}>Accedi a W3 Suite</h1>
            
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 4px 0'
            }}>{currentTenant.name}</p>
            
            <p style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: 0
            }}>Inserisci le tue credenziali per continuare</p>
          </div>

          {/* Form */}
          <div style={{ marginBottom: '24px' }}>
            {/* Username Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px'
              }}>Nome Utente</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 44px',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px'
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 44px',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
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
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: isLoading 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 105, 0, 0.3), 0 4px 15px rgba(123, 44, 191, 0.2)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Accesso in corso...
                </>
              ) : (
                'Accedi'
              )}
            </button>
          </div>

          {/* Footer Links */}
          <div style={{
            textAlign: 'center',
            borderTop: '1px solid #f3f4f6',
            paddingTop: '20px'
          }}>
            <a href="#" style={{
              color: '#6b7280',
              fontSize: '12px',
              textDecoration: 'none',
              marginRight: '16px'
            }}>Password dimenticata?</a>
            <a href="#" style={{
              color: '#6b7280',
              fontSize: '12px',
              textDecoration: 'none'
            }}>Supporto</a>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}