import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Wifi, Zap } from 'lucide-react';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(255, 105, 0, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(123, 44, 191, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
        `,
        zIndex: -1
      }} />

      <div style={{
        position: 'relative',
        maxWidth: '440px',
        width: '100%',
        background: 'hsla(0, 0%, 100%, 0.35)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '48px 40px',
        border: '1px solid hsla(0, 0%, 100%, 0.18)',
        boxShadow: '0 32px 64px rgba(0, 0, 0, 0.12)',
      }}>
        {/* Header con Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(255, 105, 0, 0.25)'
            }}>
              <span style={{
                color: 'white',
                fontSize: '28px',
                fontWeight: 'bold'
              }}>W</span>
            </div>
          </div>
          
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px'
            }}>WindTre Suite</h1>
            <p style={{
              color: '#6b7280',
              fontSize: '16px',
              margin: 0,
              fontWeight: 500
            }}>Enterprise Platform</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div style={{ 
          textAlign: 'center',
          marginBottom: '40px' 
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '8px',
            margin: 0
          }}>Bentornato</h2>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            margin: '8px 0 0 0'
          }}>
            Accedi al tuo workspace aziendale
          </p>
        </div>

        {/* Form */}
        <div style={{ marginBottom: '24px' }}>
          {/* Username Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px'
            }}>
              Email o Username
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
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '12px',
                  color: '#1f2937',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF6900';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.4)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.1)';
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
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px'
            }}>
              Password
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
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '16px 56px 16px 48px',
                  background: 'hsla(0, 0%, 100%, 0.25)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  borderRadius: '12px',
                  color: '#1f2937',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF6900';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.4)';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 105, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.18)';
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
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
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease',
                  borderRadius: '6px'
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
              gap: '8px',
              color: '#6b7280',
              fontSize: '14px',
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
              Ricordami
            </label>
            <a
              href="#"
              style={{
                color: '#FF6900',
                fontSize: '14px',
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
            onClick={() => {
              if (username === 'admin' && password === 'admin') {
                window.location.href = '/';
              } else {
                alert('Usa admin / admin per accedere');
              }
            }}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              textAlign: 'center',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '24px',
              boxShadow: '0 8px 24px rgba(255, 105, 0, 0.25)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 105, 0, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 105, 0, 0.25)';
            }}
          >
            Accedi al Workspace
          </button>
        </div>

        {/* Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{ 
              color: '#FF6900', 
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Wifi size={24} />
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#374151'
            }}>
              Multi-Tenant
            </div>
          </div>
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.25)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{ 
              color: '#7B2CBF', 
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Zap size={24} />
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#374151'
            }}>
              AI Powered
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          paddingTop: '24px',
          borderTop: '1px solid hsla(0, 0%, 100%, 0.18)',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#9ca3af',
            fontSize: '13px',
            margin: '0 0 4px 0'
          }}>
            © 2025 WindTre Business Solutions
          </p>
          <p style={{
            color: '#d1d5db',
            fontSize: '12px',
            margin: 0,
            fontWeight: 500
          }}>
            Enterprise Resource Planning Platform
          </p>
        </div>
      </div>
    </div>
  );
}