import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Shield, Zap, CheckCircle, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantCode?: string;
}

export default function LoginModal({ isOpen, onClose, tenantCode: propTenantCode }: LoginModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Mappa dei tenant disponibili
  const tenantInfo: Record<string, { name: string, color: string }> = {
    'staging': { name: 'Staging Environment - W3 Suite', color: '#7B2CBF' },
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

  // Impedisce scroll del body quando il modal è aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Chiude modal con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Inserisci email e password');
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
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('currentTenantId', tenantId);
        // Redirect alla dashboard dopo login
        window.location.href = `/${tenantFromPath}/dashboard`;
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

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '150px',
        height: '150px',
        background: 'hsla(25, 100%, 50%, 0.15)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '200px',
        height: '200px',
        background: 'hsla(260, 100%, 45%, 0.1)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        animation: 'float 8s ease-in-out infinite reverse'
      }} />

      {/* Modal Container */}
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '400px' : '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'hsla(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '32px',
        border: '1px solid hsla(255, 255, 255, 0.3)',
        boxShadow: '0 32px 80px rgba(0, 0, 0, 0.25), inset 0 1px 0 hsla(255, 255, 255, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'hsla(255, 255, 255, 0.3)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid hsla(255, 255, 255, 0.4)',
            borderRadius: '12px',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            width: '44px',
            height: '44px',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.background = 'hsla(0, 84%, 60%, 0.1)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#6b7280';
            e.currentTarget.style.background = 'hsla(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={18} />
        </button>

        {/* Inner Glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, hsla(255, 255, 255, 0.1) 0%, hsla(255, 255, 255, 0.05) 100%)',
          borderRadius: '32px',
          pointerEvents: 'none'
        }} />

        <div style={{ 
          position: 'relative', 
          zIndex: 2, 
          padding: isMobile ? '60px 24px 32px' : '80px 40px 48px'
        }}>
          {/* Header Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            {/* Logo */}
            <div style={{
              width: isMobile ? '70px' : '80px',
              height: isMobile ? '70px' : '80px',
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              position: 'relative',
              boxShadow: '0 16px 48px rgba(255, 105, 0, 0.3)',
              backdropFilter: 'blur(20px)'
            }}>
              <span style={{
                fontSize: isMobile ? '32px' : '36px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)'
              }}>W</span>
              {/* Glow Effect */}
              <div style={{
                position: 'absolute',
                inset: '-3px',
                background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                borderRadius: '23px',
                opacity: 0.3,
                filter: 'blur(16px)',
                zIndex: -1
              }} />
            </div>

            <h1 style={{
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px'
            }}>Accesso Sicuro</h1>
            <p style={{
              fontSize: isMobile ? '14px' : '16px',
              color: currentTenant.color,
              margin: '0 0 6px 0',
              fontWeight: 600
            }}>{currentTenant.name}</p>
            <p style={{
              fontSize: isMobile ? '12px' : '14px',
              color: '#6b7280',
              margin: '0 0 16px 0',
              fontWeight: 400
            }}>Inserisci le credenziali per continuare</p>
            
            {/* Status Indicator */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'hsla(142, 76%, 36%, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '4px 12px',
              borderRadius: '16px',
              border: '1px solid hsla(142, 76%, 36%, 0.2)',
              fontSize: '11px',
              color: '#059669',
              fontWeight: 500
            }}>
              <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
              Connessione Sicura
            </div>
          </div>

          {/* Login Form */}
          <div>
            {/* Email Field */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
                letterSpacing: '0.025em'
              }}>Nome Utente</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@w3suite.com"
                  style={{
                    width: '100%',
                    padding: isMobile ? '14px 16px' : '16px 20px',
                    background: 'hsla(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '2px solid hsla(255, 255, 255, 0.4)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                    letterSpacing: '0.025em'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FF6900';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.8)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'hsla(255, 255, 255, 0.4)';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.6)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
                letterSpacing: '0.025em'
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: isMobile ? '14px 50px 14px 16px' : '16px 60px 16px 20px',
                    background: 'hsla(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '2px solid hsla(255, 255, 255, 0.4)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                    letterSpacing: '0.1em'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FF6900';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.8)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'hsla(255, 255, 255, 0.4)';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.6)';
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
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#FF6900';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Security Features */}
            <div style={{
              background: 'hsla(142, 76%, 36%, 0.08)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid hsla(142, 76%, 36%, 0.2)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <Shield size={16} style={{ color: '#059669' }} />
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#059669'
                }}>Sicurezza Enterprise</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '11px',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={12} style={{ color: '#10b981' }} />
                  <span>SSL/TLS</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={12} style={{ color: '#10b981' }} />
                  <span>MFA Ready</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={12} style={{ color: '#f59e0b' }} />
                  <span>Session Safe</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={12} style={{ color: '#f59e0b' }} />
                  <span>Audit Log</span>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: isMobile ? '16px 20px' : '18px 24px',
                background: isLoading 
                  ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                  : 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                color: 'white',
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '20px',
                boxShadow: isLoading 
                  ? 'none' 
                  : '0 16px 48px rgba(255, 105, 0, 0.3), 0 6px 24px rgba(123, 44, 191, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.025em',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                  e.currentTarget.style.boxShadow = '0 24px 60px rgba(255, 105, 0, 0.4), 0 12px 36px rgba(123, 44, 191, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(255, 105, 0, 0.3), 0 6px 24px rgba(123, 44, 191, 0.2)';
                }
              }}
            >
              {/* Button Glow */}
              {!isLoading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                  borderRadius: '12px',
                  pointerEvents: 'none'
                }} />
              )}
              
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    Autenticazione...
                  </>
                ) : (
                  <>
                    Accedi al Workspace
                    <ArrowRight size={16} />
                  </>
                )}
              </div>
            </button>

            {/* Help Links */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: isMobile ? '16px' : '24px',
              flexWrap: 'wrap'
            }}>
              <button style={{ 
                background: 'transparent',
                border: 'none',
                color: '#FF6900', 
                fontSize: '12px', 
                fontWeight: 500,
                cursor: 'pointer',
                padding: '6px 0',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.color = '#e55800';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.textDecoration = 'none';
                e.currentTarget.style.color = '#FF6900';
              }}>
                Password dimenticata?
              </button>
              <button style={{ 
                background: 'transparent',
                border: 'none',
                color: '#6b7280', 
                fontSize: '12px', 
                fontWeight: 500,
                cursor: 'pointer',
                padding: '6px 0',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.textDecoration = 'none';
                e.currentTarget.style.color = '#6b7280';
              }}>
                Supporto IT
              </button>
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
          
          @media (max-width: 768px) {
            input:focus {
              font-size: 16px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}