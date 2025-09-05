import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Shield, Zap, CheckCircle } from 'lucide-react';

export default function ProfessionalLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [tenantCode, setTenantCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogin = async () => {
    if (!tenantCode || !email || !password) {
      alert('Inserisci codice organizzazione, email e password');
      return;
    }

    setIsLoading(true);
    
    try {
      // Mappa il codice tenant all'ID UUID
      const tenantMapping = {
        'DEMO001': '00000000-0000-0000-0000-000000000001',
        'ACME001': '11111111-1111-1111-1111-111111111111',
        'TECH002': '22222222-2222-2222-2222-222222222222'
      };
      
      const tenantId = tenantMapping[tenantCode] || '00000000-0000-0000-0000-000000000001';
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tenantCode: tenantCode,
          username: email.split('@')[0] || 'admin', 
          password: password 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Salva sia il token che il tenant ID
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('currentTenantId', tenantId);
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
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      {/* Background Pattern - Enhanced */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 80%, hsla(25, 100%, 50%, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 80% 20%, hsla(260, 100%, 45%, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 40% 40%, hsla(255, 255, 255, 0.25) 0%, transparent 50%)
        `,
        zIndex: -1
      }} />

      {/* Floating Elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '120px',
        height: '120px',
        background: 'hsla(25, 100%, 50%, 0.08)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '200px',
        height: '200px',
        background: 'hsla(260, 100%, 45%, 0.06)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        animation: 'float 8s ease-in-out infinite reverse'
      }} />

      {/* Main Login Container */}
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '380px' : '460px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          {/* Logo */}
          <div style={{
            width: isMobile ? '80px' : '100px',
            height: isMobile ? '80px' : '100px',
            background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(255, 105, 0, 0.25)',
            backdropFilter: 'blur(20px)'
          }}>
            <span style={{
              fontSize: isMobile ? '36px' : '42px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)'
            }}>W</span>
            {/* Glow Effect */}
            <div style={{
              position: 'absolute',
              inset: '-4px',
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              borderRadius: '28px',
              opacity: 0.3,
              filter: 'blur(20px)',
              zIndex: -1
            }} />
          </div>

          <h1 style={{
            fontSize: isMobile ? '28px' : '36px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px'
          }}>WindTre Suite</h1>
          <p style={{
            fontSize: isMobile ? '16px' : '18px',
            color: '#6b7280',
            margin: '0 0 8px 0',
            fontWeight: 400
          }}>Enterprise Management Platform</p>
          
          {/* Status Indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'hsla(142, 76%, 36%, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '6px 16px',
            borderRadius: '20px',
            border: '1px solid hsla(142, 76%, 36%, 0.2)',
            fontSize: '13px',
            color: '#059669',
            fontWeight: 500
          }}>
            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
            Sistema Operativo
          </div>
        </div>

        {/* Login Form Card - Enhanced Glassmorphism */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.25)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          borderRadius: '32px',
          padding: isMobile ? '32px 24px' : '48px 40px',
          border: '1px solid hsla(255, 255, 255, 0.3)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.12), inset 0 1px 0 hsla(255, 255, 255, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Inner Glow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, hsla(255, 255, 255, 0.1) 0%, hsla(255, 255, 255, 0.05) 100%)',
            borderRadius: '32px',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Tenant Code Field */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '12px',
                letterSpacing: '0.025em'
              }}>Codice Organizzazione</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  placeholder="es. DEMO001"
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px 20px' : '18px 24px',
                    background: 'hsla(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '2px solid hsla(255, 255, 255, 0.3)',
                    borderRadius: '16px',
                    fontSize: '16px',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#7B2CBF';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.6)';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(123, 44, 191, 0.15), 0 8px 32px rgba(123, 44, 191, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'hsla(255, 255, 255, 0.3)';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  Il codice della tua organizzazione ti è stato fornito dall'amministratore
                </p>
              </div>
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '12px',
                letterSpacing: '0.025em'
              }}>Email Aziendale</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@w3suite.com"
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px 20px' : '18px 24px',
                    background: 'hsla(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '2px solid hsla(255, 255, 255, 0.3)',
                    borderRadius: '16px',
                    fontSize: '16px',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                    letterSpacing: '0.025em'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FF6900';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.6)';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.15), 0 8px 32px rgba(255, 105, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'hsla(255, 255, 255, 0.3)';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '36px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '12px',
                letterSpacing: '0.025em'
              }}>Password Sicura</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px 60px 16px 20px' : '18px 70px 18px 24px',
                    background: 'hsla(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '2px solid hsla(255, 255, 255, 0.3)',
                    borderRadius: '16px',
                    fontSize: '16px',
                    color: '#1f2937',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                    fontWeight: 500,
                    letterSpacing: '0.1em'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FF6900';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.6)';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.15), 0 8px 32px rgba(255, 105, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'hsla(255, 255, 255, 0.3)';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.4)';
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
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'hsla(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid hsla(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    width: '44px',
                    height: '44px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#FF6900';
                    e.currentTarget.style.background = 'hsla(25, 100%, 50%, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.background = 'hsla(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
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
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '32px',
              border: '1px solid hsla(142, 76%, 36%, 0.2)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <Shield size={20} style={{ color: '#059669' }} />
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#059669'
                }}>Accesso Protetto</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '12px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={14} style={{ color: '#10b981' }} />
                  <span>Crittografia SSL/TLS</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={14} style={{ color: '#10b981' }} />
                  <span>Autenticazione MFA</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={14} style={{ color: '#f59e0b' }} />
                  <span>Session Management</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={14} style={{ color: '#f59e0b' }} />
                  <span>Audit Logging</span>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: isMobile ? '18px 24px' : '20px 32px',
                background: isLoading 
                  ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                  : 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                color: 'white',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '24px',
                boxShadow: isLoading 
                  ? 'none' 
                  : '0 20px 60px rgba(255, 105, 0, 0.3), 0 8px 32px rgba(123, 44, 191, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                letterSpacing: '0.025em',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 32px 80px rgba(255, 105, 0, 0.4), 0 16px 48px rgba(123, 44, 191, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(255, 105, 0, 0.3), 0 8px 32px rgba(123, 44, 191, 0.2)';
                }
              }}
              onTouchStart={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }
              }}
              onTouchEnd={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {/* Button Glow */}
              {!isLoading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)',
                  borderRadius: '16px',
                  pointerEvents: 'none'
                }} />
              )}
              
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isLoading ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
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
                    <ArrowRight size={20} />
                  </>
                )}
              </div>
            </button>

            {/* Help Links */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: isMobile ? '20px' : '32px',
              flexWrap: 'wrap'
            }}>
              <button style={{ 
                background: 'transparent',
                border: 'none',
                color: '#FF6900', 
                fontSize: '14px', 
                fontWeight: 500,
                cursor: 'pointer',
                padding: '8px 0',
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
                fontSize: '14px', 
                fontWeight: 500,
                cursor: 'pointer',
                padding: '8px 0',
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

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <p style={{ margin: '0 0 4px 0' }}>© 2025 WindTre Business Solutions</p>
          <p style={{ margin: 0 }}>Enterprise Resource Planning Platform v2.0</p>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
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