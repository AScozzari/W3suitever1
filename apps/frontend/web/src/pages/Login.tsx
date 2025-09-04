import { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Shield, Zap, Users } from 'lucide-react';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (username === 'admin' && password === 'admin') {
      setIsLoading(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } else {
      alert('Usa "admin" / "admin" per accedere');
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
      {/* Background Pattern - identico al dashboard */}
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

      <div style={{
        position: 'relative',
        maxWidth: '480px',
        width: '100%',
        background: 'hsla(0, 0%, 100%, 0.35)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '48px 40px',
        border: '1px solid hsla(0, 0%, 100%, 0.18)',
        boxShadow: '0 32px 64px rgba(0, 0, 0, 0.12)',
      }}>
        {/* Header con Logo WindTre */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(255, 105, 0, 0.3)'
            }}>
              <span style={{
                color: 'white',
                fontSize: '32px',
                fontWeight: 'bold'
              }}>W</span>
            </div>
          </div>
          
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 12px 0',
              letterSpacing: '-1px'
            }}>WindTre Suite</h1>
            <p style={{
              color: '#6b7280',
              fontSize: '18px',
              margin: 0,
              fontWeight: 500
            }}>Enterprise Platform</p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              background: 'hsla(0, 0%, 100%, 0.25)',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid hsla(0, 0%, 100%, 0.18)'
            }}>
              <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>Sistema Attivo</span>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div style={{ 
          textAlign: 'center',
          marginBottom: '40px',
          background: 'hsla(0, 0%, 100%, 0.25)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid hsla(0, 0%, 100%, 0.18)'
        }}>
          <h2 style={{
            fontSize: '26px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px',
            margin: 0
          }}>Accesso Sicuro</h2>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            margin: '8px 0 0 0'
          }}>
            Inserisci le credenziali per accedere al tuo workspace aziendale
          </p>
        </div>

        {/* Form */}
        <div style={{ marginBottom: '32px' }}>
          {/* Username Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: '#374151',
              fontSize: '15px',
              fontWeight: 600,
              marginBottom: '12px'
            }}>
              Email o Username
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                zIndex: 10
              }}>
                <User size={20} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci il tuo username"
                style={{
                  width: '100%',
                  padding: '18px 20px 18px 56px',
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '14px',
                  color: '#1f2937',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF6900';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.18)';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              color: '#374151',
              fontSize: '15px',
              fontWeight: 600,
              marginBottom: '12px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                zIndex: 10
              }}>
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la tua password"
                style={{
                  width: '100%',
                  padding: '18px 56px 18px 56px',
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '14px',
                  color: '#1f2937',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF6900';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.18)';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.25)';
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
                  right: '20px',
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
                  borderRadius: '8px'
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
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember & Forgot */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#6b7280',
              fontSize: '15px',
              cursor: 'pointer',
              fontWeight: 500
            }}>
              <input
                type="checkbox"
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#FF6900',
                  borderRadius: '6px'
                }}
              />
              Ricordami per 30 giorni
            </label>
            <a
              href="#"
              style={{
                color: '#FF6900',
                fontSize: '15px',
                textDecoration: 'none',
                fontWeight: 500
              }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Password dimenticata?
            </a>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: isLoading 
                ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                : 'linear-gradient(135deg, #FF6900, #ff8533)',
              color: 'white',
              fontSize: '17px',
              fontWeight: 600,
              textAlign: 'center',
              borderRadius: '14px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '32px',
              boxShadow: isLoading 
                ? 'none' 
                : '0 12px 32px rgba(255, 105, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 105, 0, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 105, 0, 0.3)';
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
                Accesso in corso...
              </>
            ) : (
              <>
                Accedi al Workspace
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            padding: '20px 16px',
            textAlign: 'center',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{ 
              color: '#FF6900', 
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Shield size={28} />
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151'
            }}>
              Enterprise Security
            </div>
          </div>
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            padding: '20px 16px',
            textAlign: 'center',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{ 
              color: '#7B2CBF', 
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Zap size={28} />
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151'
            }}>
              AI Powered
            </div>
          </div>
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            padding: '20px 16px',
            textAlign: 'center',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{ 
              color: '#10b981', 
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Users size={28} />
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151'
            }}>
              Multi-Tenant
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          paddingTop: '32px',
          borderTop: '1px solid hsla(0, 0%, 100%, 0.18)',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#9ca3af',
            fontSize: '14px',
            margin: '0 0 8px 0'
          }}>
            © 2025 WindTre Business Solutions
          </p>
          <p style={{
            color: '#d1d5db',
            fontSize: '13px',
            margin: 0,
            fontWeight: 500
          }}>
            Enterprise Resource Planning Platform
          </p>
          <div style={{
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'center',
            gap: '24px'
          }}>
            <a href="#" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>Termini</a>
            <a href="#" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>Supporto</a>
          </div>
        </div>

        {/* CSS Animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}