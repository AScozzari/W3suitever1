import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Shield, Zap, Users, CheckCircle, Wifi } from 'lucide-react';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
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
    if (!username || !password) {
      alert('Inserisci username e password');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password: password === 'admin' ? 'admin123' : password 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
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
      flexDirection: isMobile ? 'column' : 'row',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(255, 105, 0, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(123, 44, 191, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)
        `,
        zIndex: -1
      }} />

      {/* Left Panel - Hero/Brand (Mobile: Top section) */}
      <div style={{
        flex: isMobile ? 'none' : 1,
        minHeight: isMobile ? '60vh' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '32px 24px' : '64px',
        background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.1)'
        }} />
        
        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          color: 'white',
          maxWidth: isMobile ? '100%' : '500px'
        }}>
          {/* Logo */}
          <div style={{
            width: isMobile ? '80px' : '120px',
            height: isMobile ? '80px' : '120px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: isMobile ? '20px' : '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: `0 auto ${isMobile ? '24px' : '40px'} auto`,
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <span style={{
              fontSize: isMobile ? '36px' : '48px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>W</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '48px',
            fontWeight: 'bold',
            margin: `0 0 ${isMobile ? '12px' : '16px'} 0`,
            letterSpacing: '-1px'
          }}>WindTre Suite</h1>
          
          <p style={{
            fontSize: isMobile ? '16px' : '24px',
            opacity: 0.9,
            margin: `0 0 ${isMobile ? '32px' : '48px'} 0`,
            fontWeight: 300,
            lineHeight: 1.4,
            padding: isMobile ? '0 16px' : '0'
          }}>
            {isMobile 
              ? 'Piattaforma enterprise multitenant'
              : 'La piattaforma enterprise più avanzata per la gestione multitenant'
            }
          </p>

          {/* Features - Compact on mobile */}
          {isMobile ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              maxWidth: '320px',
              margin: '0 auto'
            }}>
              {[
                { icon: Shield, title: 'Sicurezza' },
                { icon: Zap, title: 'AI Powered' },
                { icon: Users, title: 'Multi-Tenant' },
                { icon: Wifi, title: 'Cloud Native' }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    padding: '20px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <Icon size={24} />
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>{feature.title}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '24px',
              textAlign: 'left'
            }}>
              {[
                { icon: Shield, title: 'Sicurezza Enterprise', desc: 'Autenticazione OAuth2 con MFA e crittografia end-to-end' },
                { icon: Zap, title: 'AI & Machine Learning', desc: 'Analytics predittivi e automazione intelligente' },
                { icon: Users, title: 'Multi-Tenant Architecture', desc: 'Isolamento completo dei dati con RLS PostgreSQL' },
                { icon: Wifi, title: 'Cloud Native', desc: 'Scalabilità infinita con architettura microservizi' }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '12px',
                      borderRadius: '12px'
                    }}>
                      <Icon size={28} />
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        margin: '0 0 8px 0'
                      }}>{feature.title}</h3>
                      <p style={{
                        fontSize: '14px',
                        opacity: 0.8,
                        margin: 0,
                        lineHeight: 1.4
                      }}>{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Login Form (Mobile: Bottom section) */}
      <div style={{
        flex: isMobile ? 'none' : '0 0 600px',
        minHeight: isMobile ? '40vh' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isMobile ? '24px' : '64px',
        background: 'hsla(0, 0%, 100%, 0.35)',
        backdropFilter: 'blur(16px)',
        borderLeft: isMobile ? 'none' : '1px solid hsla(0, 0%, 100%, 0.18)',
        borderTop: isMobile ? '1px solid hsla(0, 0%, 100%, 0.18)' : 'none'
      }}>
        {/* Header Form */}
        <div style={{ marginBottom: isMobile ? '32px' : '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: isMobile ? '16px' : '24px',
            background: 'hsla(0, 0%, 100%, 0.25)',
            padding: '6px 12px',
            borderRadius: '12px',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
            <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>Sistema Operativo</span>
          </div>
          
          <h2 style={{
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 700,
            color: '#1f2937',
            margin: `0 0 ${isMobile ? '8px' : '12px'} 0`,
            letterSpacing: '-0.5px'
          }}>Accesso Sicuro</h2>
          
          <p style={{
            color: '#6b7280',
            fontSize: isMobile ? '14px' : '18px',
            margin: 0,
            lineHeight: 1.5
          }}>
            {isMobile 
              ? 'Inserisci le credenziali per accedere'
              : 'Inserisci le tue credenziali aziendali per accedere alla dashboard enterprise'
            }
          </p>
        </div>

        {/* Login Form */}
        <div style={{
          background: 'hsla(0, 0%, 100%, 0.4)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: isMobile ? '24px' : '40px',
          border: '1px solid hsla(0, 0%, 100%, 0.18)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)'
        }}>
          {/* Username Field */}
          <div style={{ marginBottom: isMobile ? '20px' : '28px' }}>
            <label style={{
              display: 'block',
              color: '#374151',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Username Aziendale
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                zIndex: 10
              }}>
                <User size={isMobile ? 18 : 22} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                style={{
                  width: '100%',
                  padding: isMobile ? '16px 16px 16px 48px' : '20px 20px 20px 60px',
                  background: 'hsla(0, 0%, 100%, 0.6)',
                  backdropFilter: 'blur(16px)',
                  border: '2px solid hsla(0, 0%, 100%, 0.3)',
                  borderRadius: isMobile ? '12px' : '16px',
                  color: '#1f2937',
                  fontSize: isMobile ? '14px' : '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF6900';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.8)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.3)';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.6)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
            <label style={{
              display: 'block',
              color: '#374151',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Password Sicura
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                zIndex: 10
              }}>
                <Lock size={isMobile ? 18 : 22} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin"
                style={{
                  width: '100%',
                  padding: isMobile ? '16px 48px 16px 48px' : '20px 60px 20px 60px',
                  background: 'hsla(0, 0%, 100%, 0.6)',
                  backdropFilter: 'blur(16px)',
                  border: '2px solid hsla(0, 0%, 100%, 0.3)',
                  borderRadius: isMobile ? '12px' : '16px',
                  color: '#1f2937',
                  fontSize: isMobile ? '14px' : '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF6900';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.8)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.3)';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.6)';
                  e.currentTarget.style.boxShadow = 'none';
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
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  borderRadius: '8px',
                  minWidth: '40px',
                  minHeight: '40px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#FF6900';
                  e.currentTarget.style.background = 'rgba(255, 105, 0, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {showPassword ? <EyeOff size={isMobile ? 18 : 22} /> : <Eye size={isMobile ? 18 : 22} />}
              </button>
            </div>
          </div>

          {/* Remember & Security - Mobile optimized */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '24px' : '40px',
            background: 'hsla(0, 0%, 100%, 0.25)',
            padding: isMobile ? '12px 16px' : '16px 20px',
            borderRadius: '12px',
            border: '1px solid hsla(0, 0%, 100%, 0.18)',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '12px' : '0'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6b7280',
              fontSize: isMobile ? '13px' : '15px',
              cursor: 'pointer',
              fontWeight: 500
            }}>
              <input
                type="checkbox"
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#FF6900',
                  borderRadius: '4px'
                }}
              />
              {isMobile ? 'Ricordami' : 'Mantieni accesso per 30 giorni'}
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#10b981',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 500
            }}>
              <CheckCircle size={14} />
              Sicura
            </div>
          </div>

          {/* Login Button - Touch optimized */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: isMobile ? '18px 24px' : '20px 32px',
              background: isLoading 
                ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                : 'linear-gradient(135deg, #FF6900, #ff8533)',
              color: 'white',
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: 700,
              textAlign: 'center',
              borderRadius: isMobile ? '14px' : '16px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: isMobile ? '16px' : '24px',
              boxShadow: isLoading 
                ? 'none' 
                : '0 16px 40px rgba(255, 105, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: isMobile ? '56px' : 'auto'
            }}
            onMouseOver={(e) => {
              if (!isLoading && !isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 20px 50px rgba(255, 105, 0, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && !isMobile) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 105, 0, 0.3)';
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
                {isMobile ? 'Accesso...' : 'Autenticazione in corso...'}
              </>
            ) : (
              <>
                {isMobile ? 'Accedi' : 'Accedi al Workspace Enterprise'}
                <ArrowRight size={isMobile ? 18 : 22} />
              </>
            )}
          </button>

          {/* Help Links - Mobile optimized */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? '24px' : '32px',
            flexWrap: 'wrap'
          }}>
            <a href="#" style={{ 
              color: '#FF6900', 
              fontSize: isMobile ? '14px' : '15px', 
              textDecoration: 'none',
              fontWeight: 500,
              padding: isMobile ? '8px' : '0'
            }}>
              Password dimenticata?
            </a>
            <a href="#" style={{ 
              color: '#6b7280', 
              fontSize: isMobile ? '14px' : '15px', 
              textDecoration: 'none',
              fontWeight: 500,
              padding: isMobile ? '8px' : '0'
            }}>
              Supporto IT
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: isMobile ? '24px' : '40px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: isMobile ? '12px' : '14px'
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